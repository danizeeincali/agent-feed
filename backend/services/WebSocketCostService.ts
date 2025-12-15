/**
 * WebSocket Service for Real-time Cost Updates
 *
 * Provides WebSocket support for live cost tracking updates,
 * real-time metrics, and alert notifications
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { CostTracker, StepUsage } from './CostTracker';
import { CostMonitoringService, AlertEvent, MetricsSnapshot } from './CostMonitoringService';

export interface WebSocketClient {
  id: string;
  ws: WebSocket;
  userId: string;
  sessionId?: string;
  subscriptions: Set<string>;
  lastActivity: Date;
  metadata?: Record<string, any>;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp: string;
  clientId?: string;
}

export interface WebSocketConfig {
  port: number;
  heartbeatInterval: number;
  maxConnections: number;
  authTimeout: number;
  maxSubscriptions: number;
}

export class WebSocketCostService extends EventEmitter {
  private server: WebSocket.Server;
  private clients: Map<string, WebSocketClient> = new Map();
  private costTracker: CostTracker;
  private monitoringService: CostMonitoringService;
  private config: WebSocketConfig;
  private heartbeatInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;

  constructor(
    costTracker: CostTracker,
    monitoringService: CostMonitoringService,
    config: Partial<WebSocketConfig> = {}
  ) {
    super();

    this.costTracker = costTracker;
    this.monitoringService = monitoringService;
    this.config = {
      port: 8081,
      heartbeatInterval: 30000, // 30 seconds
      maxConnections: 1000,
      authTimeout: 10000, // 10 seconds
      maxSubscriptions: 10,
      ...config
    };

    this.setupWebSocketServer();
    this.setupEventListeners();
    this.startBackgroundTasks();
  }

  private setupWebSocketServer(): void {
    this.server = new WebSocket.Server({
      port: this.config.port,
      perMessageDeflate: false,
      clientTracking: true
    });

    this.server.on('connection', (ws, req) => {
      this.handleNewConnection(ws, req);
    });

    this.server.on('error', (error) => {
      console.error('WebSocket server error:', error);
      this.emit('error', error);
    });

    console.log(`WebSocket cost service started on port ${this.config.port}`);
  }

  private handleNewConnection(ws: WebSocket, req: any): void {
    const clientId = uuidv4();
    const client: WebSocketClient = {
      id: clientId,
      ws,
      userId: '', // Will be set during authentication
      subscriptions: new Set(),
      lastActivity: new Date()
    };

    // Check connection limits
    if (this.clients.size >= this.config.maxConnections) {
      ws.close(1008, 'Server at capacity');
      return;
    }

    this.clients.set(clientId, client);

    // Set authentication timeout
    const authTimeout = setTimeout(() => {
      if (!client.userId) {
        ws.close(1008, 'Authentication timeout');
        this.clients.delete(clientId);
      }
    }, this.config.authTimeout);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        this.handleMessage(clientId, message);
        client.lastActivity = new Date();
      } catch (error) {
        this.sendError(clientId, 'Invalid message format');
      }
    });

    ws.on('close', (code, reason) => {
      clearTimeout(authTimeout);
      this.handleClientDisconnect(clientId, code, reason);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket client error (${clientId}):`, error);
      this.handleClientDisconnect(clientId);
    });

    // Send welcome message
    this.sendMessage(clientId, {
      type: 'welcome',
      data: {
        clientId,
        serverTime: new Date().toISOString(),
        config: {
          heartbeatInterval: this.config.heartbeatInterval,
          maxSubscriptions: this.config.maxSubscriptions
        }
      }
    });

    this.emit('clientConnected', { clientId, ip: req.socket.remoteAddress });
  }

  private handleMessage(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'authenticate':
        this.handleAuthentication(clientId, message.data);
        break;

      case 'subscribe':
        this.handleSubscription(clientId, message.data);
        break;

      case 'unsubscribe':
        this.handleUnsubscription(clientId, message.data);
        break;

      case 'ping':
        this.sendMessage(clientId, { type: 'pong', data: { timestamp: new Date().toISOString() } });
        break;

      case 'getMetrics':
        this.handleGetMetrics(clientId);
        break;

      case 'getSessionCost':
        this.handleGetSessionCost(clientId, message.data?.sessionId);
        break;

      case 'getAlerts':
        this.handleGetAlerts(clientId);
        break;

      default:
        this.sendError(clientId, `Unknown message type: ${message.type}`);
    }
  }

  private handleAuthentication(clientId: string, authData: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // In a real implementation, validate the token/credentials
    const { token, userId } = authData;

    if (!token || !userId) {
      this.sendError(clientId, 'Invalid authentication data');
      client.ws.close(1008, 'Authentication failed');
      return;
    }

    // Simplified authentication - in production, verify JWT or API key
    client.userId = userId;
    client.metadata = { authenticatedAt: new Date(), token };

    this.sendMessage(clientId, {
      type: 'authenticated',
      data: {
        userId,
        permissions: ['cost_tracking', 'metrics', 'alerts'],
        timestamp: new Date().toISOString()
      }
    });

    this.emit('clientAuthenticated', { clientId, userId });
  }

  private handleSubscription(clientId: string, subData: any): void {
    const client = this.clients.get(clientId);
    if (!client || !client.userId) {
      this.sendError(clientId, 'Authentication required');
      return;
    }

    const { type, target } = subData;

    if (client.subscriptions.size >= this.config.maxSubscriptions) {
      this.sendError(clientId, 'Maximum subscriptions reached');
      return;
    }

    const subscription = `${type}:${target || 'global'}`;

    if (client.subscriptions.has(subscription)) {
      this.sendError(clientId, 'Already subscribed');
      return;
    }

    // Validate subscription type
    const validTypes = ['session', 'user', 'metrics', 'alerts', 'system'];
    if (!validTypes.includes(type)) {
      this.sendError(clientId, 'Invalid subscription type');
      return;
    }

    // Check permissions for subscription
    if (type === 'user' && target !== client.userId) {
      // Users can only subscribe to their own data unless they're admin
      this.sendError(clientId, 'Access denied');
      return;
    }

    client.subscriptions.add(subscription);

    // If subscribing to a session, store session ID
    if (type === 'session') {
      client.sessionId = target;
    }

    this.sendMessage(clientId, {
      type: 'subscribed',
      data: {
        subscription,
        timestamp: new Date().toISOString()
      }
    });

    // Send current data for the subscription
    this.sendInitialData(clientId, type, target);

    this.emit('clientSubscribed', { clientId, subscription });
  }

  private handleUnsubscription(clientId: string, subData: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { type, target } = subData;
    const subscription = `${type}:${target || 'global'}`;

    if (client.subscriptions.has(subscription)) {
      client.subscriptions.delete(subscription);

      this.sendMessage(clientId, {
        type: 'unsubscribed',
        data: {
          subscription,
          timestamp: new Date().toISOString()
        }
      });

      this.emit('clientUnsubscribed', { clientId, subscription });
    }
  }

  private handleGetMetrics(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client || !client.userId) return;

    const currentMetrics = this.monitoringService.getCurrentMetrics();
    const realTimeMetrics = this.costTracker.getRealTimeMetrics();

    this.sendMessage(clientId, {
      type: 'metrics',
      data: {
        current: currentMetrics,
        realTime: realTimeMetrics,
        timestamp: new Date().toISOString()
      }
    });
  }

  private handleGetSessionCost(clientId: string, sessionId: string): void {
    const client = this.clients.get(clientId);
    if (!client || !client.userId || !sessionId) return;

    const sessionCost = this.costTracker.getSessionCost(sessionId);

    if (!sessionCost) {
      this.sendError(clientId, 'Session not found');
      return;
    }

    // Check access permissions
    if (sessionCost.userId !== client.userId) {
      this.sendError(clientId, 'Access denied');
      return;
    }

    this.sendMessage(clientId, {
      type: 'sessionCost',
      data: {
        sessionId,
        cost: sessionCost,
        timestamp: new Date().toISOString()
      }
    });
  }

  private handleGetAlerts(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client || !client.userId) return;

    const activeAlerts = this.monitoringService.getActiveAlerts();

    // Filter alerts by user (non-admin users only see their own alerts)
    const userAlerts = activeAlerts.filter(alert =>
      !alert.userId || alert.userId === client.userId
    );

    this.sendMessage(clientId, {
      type: 'alerts',
      data: {
        alerts: userAlerts,
        count: userAlerts.length,
        timestamp: new Date().toISOString()
      }
    });
  }

  private sendInitialData(clientId: string, type: string, target?: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (type) {
      case 'metrics':
        this.handleGetMetrics(clientId);
        break;

      case 'alerts':
        this.handleGetAlerts(clientId);
        break;

      case 'session':
        if (target) {
          this.handleGetSessionCost(clientId, target);
        }
        break;

      case 'system':
        this.sendMessage(clientId, {
          type: 'systemStatus',
          data: {
            status: 'operational',
            activeConnections: this.clients.size,
            timestamp: new Date().toISOString()
          }
        });
        break;
    }
  }

  private handleClientDisconnect(clientId: string, code?: number, reason?: Buffer): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      this.emit('clientDisconnected', {
        clientId,
        userId: client.userId,
        code,
        reason: reason?.toString(),
        duration: Date.now() - client.lastActivity.getTime()
      });
    }
  }

  private sendMessage(clientId: string, message: Omit<WebSocketMessage, 'timestamp'>): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) return;

    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: new Date().toISOString()
    };

    try {
      client.ws.send(JSON.stringify(fullMessage));
    } catch (error) {
      console.error(`Failed to send message to client ${clientId}:`, error);
      this.handleClientDisconnect(clientId);
    }
  }

  private sendError(clientId: string, message: string): void {
    this.sendMessage(clientId, {
      type: 'error',
      data: { message, timestamp: new Date().toISOString() }
    });
  }

  private broadcastToSubscribers(subscription: string, message: Omit<WebSocketMessage, 'timestamp'>): void {
    for (const [clientId, client] of this.clients.entries()) {
      if (client.subscriptions.has(subscription)) {
        this.sendMessage(clientId, message);
      }
    }
  }

  private setupEventListeners(): void {
    // Listen for step tracking events
    this.costTracker.on('stepTracked', (stepUsage: StepUsage) => {
      // Broadcast to session subscribers
      this.broadcastToSubscribers(`session:${stepUsage.sessionId}`, {
        type: 'stepTracked',
        data: stepUsage
      });

      // Broadcast to user subscribers
      this.broadcastToSubscribers(`user:${stepUsage.userId}`, {
        type: 'stepTracked',
        data: stepUsage
      });
    });

    // Listen for cost updates
    this.costTracker.on('costUpdated', (costUpdate) => {
      this.broadcastToSubscribers(`session:${costUpdate.sessionId}`, {
        type: 'costUpdated',
        data: costUpdate
      });
    });

    // Listen for session events
    this.costTracker.on('sessionStarted', (session) => {
      this.broadcastToSubscribers(`user:${session.userId}`, {
        type: 'sessionStarted',
        data: session
      });
    });

    this.costTracker.on('sessionEnded', (sessionInfo) => {
      this.broadcastToSubscribers(`session:${sessionInfo.sessionId}`, {
        type: 'sessionEnded',
        data: sessionInfo
      });
    });

    // Listen for alerts
    this.monitoringService.on('alert', (alert: AlertEvent) => {
      // Broadcast to global alert subscribers
      this.broadcastToSubscribers('alerts:global', {
        type: 'alert',
        data: alert
      });

      // Broadcast to user-specific subscribers
      if (alert.userId) {
        this.broadcastToSubscribers(`user:${alert.userId}`, {
          type: 'alert',
          data: alert
        });
      }

      // Broadcast to session-specific subscribers
      if (alert.sessionId) {
        this.broadcastToSubscribers(`session:${alert.sessionId}`, {
          type: 'alert',
          data: alert
        });
      }
    });

    // Listen for metrics updates
    this.monitoringService.on('metricsUpdate', (metrics: MetricsSnapshot) => {
      this.broadcastToSubscribers('metrics:global', {
        type: 'metricsUpdate',
        data: metrics
      });
    });
  }

  private startBackgroundTasks(): void {
    // Send heartbeat to all connected clients
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();

      for (const [clientId, client] of this.clients.entries()) {
        if (client.ws.readyState === WebSocket.OPEN) {
          // Check if client is still responsive
          const lastActivity = now.getTime() - client.lastActivity.getTime();
          if (lastActivity > this.config.heartbeatInterval * 3) {
            // Client hasn't responded in 3 heartbeat intervals
            client.ws.close(1000, 'Inactive client');
            continue;
          }

          this.sendMessage(clientId, {
            type: 'heartbeat',
            data: { serverTime: now.toISOString() }
          });
        } else {
          this.handleClientDisconnect(clientId);
        }
      }
    }, this.config.heartbeatInterval);

    // Send periodic metrics updates
    this.metricsInterval = setInterval(() => {
      const realTimeMetrics = this.costTracker.getRealTimeMetrics();
      this.broadcastToSubscribers('system:global', {
        type: 'systemMetrics',
        data: {
          ...realTimeMetrics,
          activeConnections: this.clients.size
        }
      });
    }, 60000); // Every minute
  }

  // Public API methods

  public getConnectedClients(): Array<{
    id: string;
    userId: string;
    sessionId?: string;
    subscriptions: string[];
    lastActivity: Date;
  }> {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      userId: client.userId,
      sessionId: client.sessionId,
      subscriptions: Array.from(client.subscriptions),
      lastActivity: client.lastActivity
    }));
  }

  public disconnectClient(clientId: string, reason = 'Server request'): boolean {
    const client = this.clients.get(clientId);
    if (client) {
      client.ws.close(1000, reason);
      return true;
    }
    return false;
  }

  public broadcastSystemMessage(message: string, severity: 'info' | 'warning' | 'error' = 'info'): void {
    this.broadcastToSubscribers('system:global', {
      type: 'systemMessage',
      data: { message, severity, timestamp: new Date().toISOString() }
    });
  }

  public getServerStats(): {
    activeConnections: number;
    totalSubscriptions: number;
    serverUptime: number;
    messagesPerSecond: number;
  } {
    const totalSubscriptions = Array.from(this.clients.values())
      .reduce((sum, client) => sum + client.subscriptions.size, 0);

    return {
      activeConnections: this.clients.size,
      totalSubscriptions,
      serverUptime: process.uptime() * 1000,
      messagesPerSecond: 0 // Would track this in a real implementation
    };
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      // Clear intervals
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
      }

      // Close all client connections
      for (const client of this.clients.values()) {
        client.ws.close(1000, 'Server shutdown');
      }

      this.clients.clear();

      // Close the server
      this.server.close(() => {
        this.removeAllListeners();
        resolve();
      });
    });
  }
}