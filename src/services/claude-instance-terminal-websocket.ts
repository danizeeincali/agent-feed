/**
 * Claude Instance Terminal WebSocket Service
 * 
 * Provides WebSocket bridge for streaming terminal output from Claude instances
 * to frontend clients. Integrates with claude-instance-manager PTY sessions.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { EventEmitter } from 'events';
import { claudeInstanceManager, TerminalSession as ClaudeTerminalSession } from '@/services/claude-instance-manager';
import { logger } from '@/utils/logger';

interface TerminalClient {
  socketId: string;
  instanceId: string;
  userId?: string;
  username?: string;
  connectedAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

interface ClientRateLimit {
  count: number;
  resetTime: number;
  windowStart: number;
}

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 500; // 500 requests per minute
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CLIENT_TIMEOUT = 300000; // 5 minutes

export class ClaudeInstanceTerminalWebSocket extends EventEmitter {
  private io: SocketIOServer;
  private clients = new Map<string, TerminalClient>();
  private rateLimits = new Map<string, ClientRateLimit>();
  private heartbeatInterval?: NodeJS.Timeout;
  private namespace: any;

  constructor(io: SocketIOServer) {
    super();
    this.io = io;
    this.initialize();
  }

  /**
   * Initialize the terminal WebSocket namespace
   */
  initialize(): void {
    console.log('🔧 Initializing ClaudeInstanceTerminalWebSocket...');
    
    // CONSOLIDATION FIX: Use /claude-terminal namespace to avoid conflicts
    this.namespace = this.io.of('/claude-terminal');
    console.log('✅ Created /claude-terminal namespace successfully (consolidated to avoid conflicts)');

    // Set up authentication middleware
    this.setupAuthentication();
    
    // Set up connection handlers
    this.setupConnectionHandlers();
    
    // Start heartbeat monitoring
    this.startHeartbeat();
    
    // Connect to Claude Instance Manager events
    this.connectInstanceManagerEvents();
    
    console.log('✅ ClaudeInstanceTerminalWebSocket initialization complete');
  }

  private setupAuthentication(): void {
    this.namespace.use(async (socket: Socket, next: Function) => {
      try {
        const auth = socket.handshake.auth;
        const userId = auth.userId || auth.user_id || 'anonymous';
        const username = auth.username || `User-${userId.slice(0, 8)}`;

        // Add user context to socket
        (socket as any).user = {
          id: userId,
          username: username
        };

        console.log('🔍 Terminal namespace authentication:', { 
          socketId: socket.id,
          userId,
          username 
        });

        next();
      } catch (error) {
        console.error('❌ Terminal authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupConnectionHandlers(): void {
    this.namespace.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: Socket): void {
    const user = (socket as any).user;
    console.log('🔌 Terminal client connected:', {
      socketId: socket.id,
      userId: user?.id,
      username: user?.username
    });

    // Set up socket event handlers
    this.setupSocketEvents(socket);

    // Send welcome message
    socket.emit('terminal:connected', {
      message: 'Connected to Claude Instance Terminal',
      timestamp: new Date().toISOString(),
      supportedEvents: [
        'connect_to_instance',
        'terminal_input', 
        'terminal_resize',
        'disconnect_from_instance',
        'list_instances'
      ]
    });
  }

  private setupSocketEvents(socket: Socket): void {
    const user = (socket as any).user;

    // Connect to Claude instance terminal
    socket.on('connect_to_instance', async (data: { instanceId: string }) => {
      try {
        if (!this.checkRateLimit(socket.id)) {
          socket.emit('terminal:error', { message: 'Rate limit exceeded' });
          return;
        }

        await this.connectClientToInstance(socket, data.instanceId);
      } catch (error) {
        logger.error('Failed to connect to instance', { error: error.message, socketId: socket.id });
        socket.emit('terminal:error', { message: error.message });
      }
    });

    // Handle terminal input
    socket.on('terminal_input', (data: { input: string }) => {
      try {
        if (!this.checkRateLimit(socket.id)) {
          socket.emit('terminal:error', { message: 'Rate limit exceeded' });
          return;
        }

        this.handleTerminalInput(socket, data.input);
      } catch (error) {
        logger.error('Terminal input failed', { error: error.message, socketId: socket.id });
        socket.emit('terminal:error', { message: 'Failed to process input' });
      }
    });

    // Handle terminal resize
    socket.on('terminal_resize', (data: { cols: number; rows: number }) => {
      try {
        if (!this.checkRateLimit(socket.id)) {
          socket.emit('terminal:error', { message: 'Rate limit exceeded' });
          return;
        }

        this.handleTerminalResize(socket, data.cols, data.rows);
      } catch (error) {
        logger.error('Terminal resize failed', { error: error.message, socketId: socket.id });
        socket.emit('terminal:error', { message: 'Failed to resize terminal' });
      }
    });

    // Disconnect from instance
    socket.on('disconnect_from_instance', () => {
      this.disconnectClientFromInstance(socket);
    });

    // List available instances
    socket.on('list_instances', () => {
      try {
        if (!this.checkRateLimit(socket.id)) {
          socket.emit('terminal:error', { message: 'Rate limit exceeded' });
          return;
        }

        this.sendInstanceList(socket);
      } catch (error) {
        logger.error('Failed to list instances', { error: error.message, socketId: socket.id });
        socket.emit('terminal:error', { message: 'Failed to list instances' });
      }
    });

    // Handle ping for connection health
    socket.on('ping', () => {
      const client = this.clients.get(socket.id);
      if (client) {
        client.lastActivity = new Date();
      }
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle disconnect
    socket.on('disconnect', (reason: string) => {
      this.handleClientDisconnect(socket, reason);
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      logger.error('Terminal socket error', { 
        socketId: socket.id,
        error: error.message,
        userId: user?.id 
      });
    });
  }

  private async connectClientToInstance(socket: Socket, instanceId: string): Promise<void> {
    const user = (socket as any).user;

    // Verify instance exists and is running
    const instance = claudeInstanceManager.getInstanceStatus(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    if (instance.status !== 'running') {
      throw new Error(`Instance ${instanceId} is not running (status: ${instance.status})`);
    }

    // Get terminal session
    const terminalSession = claudeInstanceManager.getTerminalSession(instanceId);
    if (!terminalSession) {
      throw new Error(`No terminal session found for instance ${instanceId}`);
    }

    // Add client to instance terminal
    claudeInstanceManager.addTerminalClient(instanceId, socket.id);

    // Create client record
    const client: TerminalClient = {
      socketId: socket.id,
      instanceId,
      userId: user?.id,
      username: user?.username,
      connectedAt: new Date(),
      lastActivity: new Date(),
      isActive: true
    };

    this.clients.set(socket.id, client);

    // Join instance room for broadcasts
    socket.join(`instance:${instanceId}`);

    // Send connection success and terminal history
    const history = claudeInstanceManager.getTerminalHistory(instanceId, 100);
    
    socket.emit('terminal:instance_connected', {
      instanceId,
      instanceName: instance.name,
      terminalSize: terminalSession.size,
      history: history,
      timestamp: new Date().toISOString()
    });

    // Send initial terminal data if available
    if (history.length > 0) {
      socket.emit('terminal:output', {
        data: history.join(''),
        isHistory: true,
        timestamp: new Date().toISOString()
      });
    }

    logger.info('Client connected to instance terminal', {
      socketId: socket.id,
      instanceId,
      userId: user?.id,
      instanceName: instance.name
    });

    this.emit('client:connected', { client, instance });
  }

  private handleTerminalInput(socket: Socket, input: string): void {
    const client = this.clients.get(socket.id);
    if (!client || !client.isActive) {
      socket.emit('terminal:error', { message: 'Not connected to any instance' });
      return;
    }

    // Validate input
    if (typeof input !== 'string' || input.length > 10000) {
      socket.emit('terminal:error', { message: 'Invalid input' });
      return;
    }

    // Write to instance terminal
    claudeInstanceManager.writeToTerminal(client.instanceId, input);
    client.lastActivity = new Date();

    logger.debug('Terminal input processed', {
      socketId: socket.id,
      instanceId: client.instanceId,
      inputLength: input.length
    });
  }

  private handleTerminalResize(socket: Socket, cols: number, rows: number): void {
    const client = this.clients.get(socket.id);
    if (!client || !client.isActive) {
      socket.emit('terminal:error', { message: 'Not connected to any instance' });
      return;
    }

    // Validate dimensions
    if (typeof cols !== 'number' || typeof rows !== 'number' || 
        cols < 10 || cols > 500 || rows < 5 || rows > 200) {
      socket.emit('terminal:error', { message: 'Invalid terminal dimensions' });
      return;
    }

    // Resize instance terminal
    claudeInstanceManager.resizeTerminal(client.instanceId, cols, rows);
    client.lastActivity = new Date();

    // Broadcast resize to other clients connected to same instance
    socket.to(`instance:${client.instanceId}`).emit('terminal:resized', { cols, rows });

    logger.debug('Terminal resized', {
      socketId: socket.id,
      instanceId: client.instanceId,
      cols,
      rows
    });
  }

  private disconnectClientFromInstance(socket: Socket): void {
    const client = this.clients.get(socket.id);
    if (!client) {
      return;
    }

    // Remove from instance terminal
    claudeInstanceManager.removeTerminalClient(client.instanceId, socket.id);

    // Leave instance room
    socket.leave(`instance:${client.instanceId}`);

    // Mark as inactive
    client.isActive = false;

    socket.emit('terminal:instance_disconnected', {
      instanceId: client.instanceId,
      message: 'Disconnected from instance terminal',
      timestamp: new Date().toISOString()
    });

    logger.info('Client disconnected from instance terminal', {
      socketId: socket.id,
      instanceId: client.instanceId
    });

    this.emit('client:disconnected', { client });
  }

  private sendInstanceList(socket: Socket): void {
    const instances = claudeInstanceManager.listInstances()
      .filter(instance => instance.status === 'running')
      .map(instance => ({
        id: instance.id,
        name: instance.name,
        type: instance.type,
        status: instance.status,
        pid: instance.pid,
        createdAt: instance.createdAt,
        hasTerminalSession: !!instance.terminalSessionId
      }));

    socket.emit('terminal:instances_list', {
      instances,
      total: instances.length,
      timestamp: new Date().toISOString()
    });
  }

  private handleClientDisconnect(socket: Socket, reason: string): void {
    const user = (socket as any).user;
    
    logger.info('Terminal client disconnected', {
      socketId: socket.id,
      reason,
      userId: user?.id
    });

    // Clean up client connection
    this.disconnectClientFromInstance(socket);
    this.clients.delete(socket.id);
    this.rateLimits.delete(socket.id);

    this.emit('client:disconnect', { socketId: socket.id, reason });
  }

  private connectInstanceManagerEvents(): void {
    // Listen for terminal data from instances
    claudeInstanceManager.on('terminalData', (instanceId: string, data: string) => {
      this.broadcastTerminalData(instanceId, data);
    });

    // Listen for instance status changes
    claudeInstanceManager.on('instanceStatusChanged', (instanceId: string, status: string) => {
      this.broadcastInstanceStatus(instanceId, status);
    });

    // Listen for instance destruction
    claudeInstanceManager.on('instanceDestroyed', (instanceId: string) => {
      this.handleInstanceDestroyed(instanceId);
    });

    // Listen for instance creation
    claudeInstanceManager.on('instanceCreated', (instance: any) => {
      this.broadcastInstanceCreated(instance);
    });

    console.log('✅ Connected to Claude Instance Manager events');
  }

  private broadcastTerminalData(instanceId: string, data: string): void {
    // Broadcast to all clients connected to this instance
    this.namespace.to(`instance:${instanceId}`).emit('terminal:output', {
      data,
      instanceId,
      timestamp: new Date().toISOString()
    });

    // Update last activity for connected clients
    for (const client of this.clients.values()) {
      if (client.instanceId === instanceId && client.isActive) {
        client.lastActivity = new Date();
      }
    }
  }

  private broadcastInstanceStatus(instanceId: string, status: string): void {
    this.namespace.to(`instance:${instanceId}`).emit('terminal:instance_status', {
      instanceId,
      status,
      timestamp: new Date().toISOString()
    });

    // If instance stopped, disconnect clients
    if (status === 'stopped' || status === 'error') {
      this.disconnectInstanceClients(instanceId);
    }
  }

  private broadcastInstanceCreated(instance: any): void {
    // Broadcast to all connected clients
    this.namespace.emit('terminal:instance_created', {
      instance: {
        id: instance.id,
        name: instance.name,
        type: instance.type,
        status: instance.status,
        pid: instance.pid,
        createdAt: instance.createdAt
      },
      timestamp: new Date().toISOString()
    });
  }

  private handleInstanceDestroyed(instanceId: string): void {
    // Notify connected clients
    this.namespace.to(`instance:${instanceId}`).emit('terminal:instance_destroyed', {
      instanceId,
      message: 'Instance has been destroyed',
      timestamp: new Date().toISOString()
    });

    // Disconnect all clients from this instance
    this.disconnectInstanceClients(instanceId);
  }

  private disconnectInstanceClients(instanceId: string): void {
    const clientsToDisconnect = Array.from(this.clients.values())
      .filter(client => client.instanceId === instanceId);

    for (const client of clientsToDisconnect) {
      const socket = this.namespace.sockets.get(client.socketId);
      if (socket) {
        this.disconnectClientFromInstance(socket);
      }
    }
  }

  private checkRateLimit(socketId: string): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(socketId);

    if (!limit || now > limit.resetTime) {
      this.rateLimits.set(socketId, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW,
        windowStart: now
      });
      return true;
    }

    if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
      return false;
    }

    limit.count++;
    return true;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, HEARTBEAT_INTERVAL);

    console.log('✅ Started terminal heartbeat monitoring');
  }

  private performHeartbeat(): void {
    const now = new Date();
    const timeoutThreshold = new Date(now.getTime() - CLIENT_TIMEOUT);

    // Check for inactive clients
    const inactiveClients: string[] = [];
    
    for (const [socketId, client] of this.clients.entries()) {
      if (client.lastActivity < timeoutThreshold) {
        inactiveClients.push(socketId);
      }
    }

    // Disconnect inactive clients
    for (const socketId of inactiveClients) {
      const socket = this.namespace.sockets.get(socketId);
      if (socket) {
        logger.info('Disconnecting inactive terminal client', { 
          socketId,
          lastActivity: this.clients.get(socketId)?.lastActivity 
        });
        socket.disconnect(true);
      }
    }

    // Broadcast heartbeat
    this.namespace.emit('terminal:heartbeat', {
      timestamp: now.toISOString(),
      connectedClients: this.clients.size,
      activeInstances: new Set(
        Array.from(this.clients.values()).map(c => c.instanceId)
      ).size
    });
  }

  /**
   * Get statistics about terminal connections
   */
  getStats(): any {
    return {
      connectedClients: this.clients.size,
      activeClients: Array.from(this.clients.values()).filter(c => c.isActive).length,
      instanceConnections: this.getInstanceConnections(),
      rateLimitedClients: this.rateLimits.size
    };
  }

  private getInstanceConnections(): Record<string, number> {
    const connections: Record<string, number> = {};
    
    for (const client of this.clients.values()) {
      if (client.isActive) {
        connections[client.instanceId] = (connections[client.instanceId] || 0) + 1;
      }
    }
    
    return connections;
  }

  /**
   * Shutdown the service
   */
  shutdown(): void {
    console.log('🛑 Shutting down ClaudeInstanceTerminalWebSocket...');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Disconnect all clients
    for (const client of this.clients.values()) {
      const socket = this.namespace.sockets.get(client.socketId);
      if (socket) {
        socket.disconnect(true);
      }
    }

    this.clients.clear();
    this.rateLimits.clear();

    console.log('✅ ClaudeInstanceTerminalWebSocket shutdown complete');
  }
}

export default ClaudeInstanceTerminalWebSocket;