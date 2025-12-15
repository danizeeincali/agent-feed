/**
 * Claude Instance WebSocket Handler
 * Provides real-time communication with dedicated Claude instances
 */

import { WebSocket } from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import ClaudeProcessManager, { ClaudeMessage } from '../../services/ClaudeProcessManager';
import { logger } from '../../utils/logger';

interface ChatSession {
  id: string;
  instanceId: string;
  clientId: string;
  socket: any;
  startTime: Date;
  lastActivity: Date;
  messageCount: number;
  isActive: boolean;
}

interface ClientMessage {
  type: 'join_instance' | 'send_message' | 'get_status' | 'ping';
  instanceId?: string;
  content?: string;
  metadata?: Record<string, any>;
  messageId?: string;
}

interface ServerMessage {
  type: 'instance_joined' | 'message_response' | 'instance_status' | 'error' | 'pong';
  instanceId?: string;
  content?: string;
  messageId?: string;
  timestamp?: string;
  error?: string;
  status?: any;
  metadata?: Record<string, any>;
}

export class ClaudeInstanceWebSocketHandler {
  private io: SocketIOServer;
  private processManager: ClaudeProcessManager;
  private sessions: Map<string, ChatSession> = new Map();
  private clientSockets: Map<string, any> = new Map();
  private connectionCount = 0;
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: HttpServer, processManager: ClaudeProcessManager) {
    this.processManager = processManager;
    
    // Initialize Socket.IO server
    this.io = new SocketIOServer(server, {
      path: '/api/claude/instances/chat',
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.startHeartbeat();
    
    logger.info('Claude Instance WebSocket handler initialized');
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    // Listen for process manager events
    this.processManager.on('message', (message: ClaudeMessage) => {
      this.handleInstanceMessage(message);
    });

    this.processManager.on('statusChange', (status) => {
      this.broadcastInstanceStatus(status);
    });

    this.processManager.on('error', ({ instanceId, error }) => {
      this.broadcastError(instanceId, error);
    });
  }

  private handleConnection(socket: any): void {
    const clientId = uuidv4();
    this.connectionCount++;
    
    logger.info(`WebSocket client connected: ${clientId} (total: ${this.connectionCount})`);
    
    this.clientSockets.set(clientId, socket);
    
    // Send connection acknowledgment
    socket.emit('connected', {
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString(),
      serverInfo: {
        supportedCommands: ['join_instance', 'send_message', 'get_status', 'ping'],
        maxMessageSize: 10000,
        heartbeatInterval: 30000
      }
    });

    // Handle client messages
    socket.on('message', (data: ClientMessage) => {
      this.handleClientMessage(clientId, socket, data);
    });

    // Handle instance join
    socket.on('join_instance', (data: { instanceId: string }) => {
      this.handleJoinInstance(clientId, socket, data.instanceId);
    });

    // Handle message sending
    socket.on('send_message', (data: { instanceId: string; content: string; metadata?: any }) => {
      this.handleSendMessage(clientId, socket, data);
    });

    // Handle status requests
    socket.on('get_status', (data: { instanceId: string }) => {
      this.handleGetStatus(clientId, socket, data.instanceId);
    });

    // Handle ping/pong for connection keep-alive
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(clientId, reason);
    });

    // Handle connection errors
    socket.on('error', (error) => {
      logger.error(`WebSocket error for client ${clientId}:`, error);
    });
  }

  private handleClientMessage(clientId: string, socket: any, message: ClientMessage): void {
    try {
      logger.debug(`Received message from client ${clientId}:`, { type: message.type });

      switch (message.type) {
        case 'join_instance':
          if (message.instanceId) {
            this.handleJoinInstance(clientId, socket, message.instanceId);
          } else {
            this.sendError(socket, 'Missing instanceId for join_instance');
          }
          break;

        case 'send_message':
          if (message.instanceId && message.content) {
            this.handleSendMessage(clientId, socket, {
              instanceId: message.instanceId,
              content: message.content,
              metadata: message.metadata
            });
          } else {
            this.sendError(socket, 'Missing instanceId or content for send_message');
          }
          break;

        case 'get_status':
          if (message.instanceId) {
            this.handleGetStatus(clientId, socket, message.instanceId);
          } else {
            this.sendError(socket, 'Missing instanceId for get_status');
          }
          break;

        case 'ping':
          socket.emit('pong', { 
            type: 'pong',
            timestamp: new Date().toISOString() 
          });
          break;

        default:
          this.sendError(socket, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error(`Error handling client message from ${clientId}:`, error);
      this.sendError(socket, 'Internal server error processing message');
    }
  }

  private async handleJoinInstance(clientId: string, socket: any, instanceId: string): Promise<void> {
    try {
      // Check if instance exists
      const instance = this.processManager.getInstance(instanceId);
      if (!instance) {
        this.sendError(socket, `Instance ${instanceId} not found`);
        return;
      }

      // Create or update session
      const sessionId = uuidv4();
      const session: ChatSession = {
        id: sessionId,
        instanceId,
        clientId,
        socket,
        startTime: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        isActive: true
      };

      this.sessions.set(sessionId, session);

      // Join socket to instance room
      socket.join(`instance_${instanceId}`);

      // Send confirmation
      socket.emit('instance_joined', {
        type: 'instance_joined',
        instanceId,
        sessionId,
        instanceStatus: instance,
        timestamp: new Date().toISOString()
      });

      logger.info(`Client ${clientId} joined instance ${instanceId} with session ${sessionId}`);
    } catch (error) {
      logger.error(`Error joining instance ${instanceId} for client ${clientId}:`, error);
      this.sendError(socket, 'Failed to join instance');
    }
  }

  private async handleSendMessage(
    clientId: string, 
    socket: any, 
    data: { instanceId: string; content: string; metadata?: any }
  ): Promise<void> {
    try {
      const { instanceId, content, metadata } = data;
      
      // Validate message length
      if (content.length > 10000) {
        this.sendError(socket, 'Message too long (max 10000 characters)');
        return;
      }

      // Check if instance exists and is running
      const instance = this.processManager.getInstance(instanceId);
      if (!instance) {
        this.sendError(socket, `Instance ${instanceId} not found`);
        return;
      }

      if (instance.status !== 'running') {
        this.sendError(socket, `Instance ${instanceId} is not running (status: ${instance.status})`);
        return;
      }

      // Send message to Claude instance
      const messageId = uuidv4();
      await this.processManager.sendMessage(instanceId, content, {
        ...metadata,
        clientId,
        messageId,
        timestamp: new Date().toISOString()
      });

      // Update session activity
      this.updateSessionActivity(clientId, instanceId);

      // Send acknowledgment
      socket.emit('message_sent', {
        type: 'message_sent',
        instanceId,
        messageId,
        timestamp: new Date().toISOString()
      });

      logger.debug(`Message sent from client ${clientId} to instance ${instanceId}`);
    } catch (error) {
      logger.error(`Error sending message from client ${clientId}:`, error);
      this.sendError(socket, 'Failed to send message');
    }
  }

  private handleGetStatus(clientId: string, socket: any, instanceId: string): void {
    try {
      const instance = this.processManager.getInstance(instanceId);
      
      if (!instance) {
        this.sendError(socket, `Instance ${instanceId} not found`);
        return;
      }

      socket.emit('instance_status', {
        type: 'instance_status',
        instanceId,
        status: instance,
        timestamp: new Date().toISOString()
      });

      logger.debug(`Status sent for instance ${instanceId} to client ${clientId}`);
    } catch (error) {
      logger.error(`Error getting status for instance ${instanceId}:`, error);
      this.sendError(socket, 'Failed to get instance status');
    }
  }

  private handleInstanceMessage(message: ClaudeMessage): void {
    try {
      // Broadcast message to all clients connected to this instance
      this.io.to(`instance_${message.instanceId}`).emit('claude_message', {
        type: 'claude_message',
        instanceId: message.instanceId,
        message: {
          id: message.id,
          type: message.type,
          content: message.content,
          timestamp: message.timestamp,
          metadata: message.metadata
        }
      });

      logger.debug(`Broadcasted message from instance ${message.instanceId} to connected clients`);
    } catch (error) {
      logger.error('Error broadcasting instance message:', error);
    }
  }

  private broadcastInstanceStatus(status: any): void {
    try {
      this.io.to(`instance_${status.id}`).emit('instance_status_update', {
        type: 'instance_status_update',
        instanceId: status.id,
        status,
        timestamp: new Date().toISOString()
      });

      logger.debug(`Broadcasted status update for instance ${status.id}`);
    } catch (error) {
      logger.error('Error broadcasting instance status:', error);
    }
  }

  private broadcastError(instanceId: string, error: Error): void {
    try {
      this.io.to(`instance_${instanceId}`).emit('instance_error', {
        type: 'instance_error',
        instanceId,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      logger.debug(`Broadcasted error for instance ${instanceId}: ${error.message}`);
    } catch (error) {
      logger.error('Error broadcasting instance error:', error);
    }
  }

  private sendError(socket: any, message: string): void {
    socket.emit('error', {
      type: 'error',
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  private updateSessionActivity(clientId: string, instanceId: string): void {
    for (const [sessionId, session] of this.sessions) {
      if (session.clientId === clientId && session.instanceId === instanceId) {
        session.lastActivity = new Date();
        session.messageCount++;
        break;
      }
    }
  }

  private handleDisconnection(clientId: string, reason: string): void {
    this.connectionCount--;
    this.clientSockets.delete(clientId);

    // Clean up sessions
    const sessionsToRemove: string[] = [];
    for (const [sessionId, session] of this.sessions) {
      if (session.clientId === clientId) {
        session.isActive = false;
        sessionsToRemove.push(sessionId);
      }
    }

    sessionsToRemove.forEach(sessionId => {
      this.sessions.delete(sessionId);
    });

    logger.info(`WebSocket client disconnected: ${clientId} (reason: ${reason}, remaining: ${this.connectionCount})`);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      
      // Clean up inactive sessions
      const inactiveSessions: string[] = [];
      for (const [sessionId, session] of this.sessions) {
        const inactiveTime = now.getTime() - session.lastActivity.getTime();
        if (inactiveTime > 300000) { // 5 minutes
          inactiveSessions.push(sessionId);
        }
      }

      inactiveSessions.forEach(sessionId => {
        const session = this.sessions.get(sessionId);
        if (session) {
          logger.info(`Cleaning up inactive session: ${sessionId}`);
          this.sessions.delete(sessionId);
        }
      });

      // Send heartbeat to all connected clients
      this.io.emit('heartbeat', {
        type: 'heartbeat',
        timestamp: now.toISOString(),
        stats: {
          connectedClients: this.connectionCount,
          activeSessions: this.sessions.size,
          totalInstances: this.processManager.getInstances().length
        }
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Get current WebSocket statistics
   */
  getStats() {
    const activeSessionsByInstance = new Map<string, number>();
    for (const session of this.sessions.values()) {
      const count = activeSessionsByInstance.get(session.instanceId) || 0;
      activeSessionsByInstance.set(session.instanceId, count + 1);
    }

    return {
      connectedClients: this.connectionCount,
      activeSessions: this.sessions.size,
      sessionsByInstance: Object.fromEntries(activeSessionsByInstance),
      totalMessages: Array.from(this.sessions.values()).reduce((sum, session) => sum + session.messageCount, 0)
    };
  }

  /**
   * Shutdown WebSocket handler
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    this.io.close();
    
    // Clear sessions
    this.sessions.clear();
    this.clientSockets.clear();

    logger.info('Claude Instance WebSocket handler shutdown complete');
  }
}

export default ClaudeInstanceWebSocketHandler;