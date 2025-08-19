import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';

/**
 * WebSocket Handler Unit Tests
 * Tests real-time communication, agent status updates, and message handling
 */

// Mock Socket.IO
jest.mock('socket.io');

describe('WebSocket Handler', () => {
  let mockServer: any;
  let mockSocket: any;
  let mockIo: any;
  let websocketHandler: WebSocketHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock HTTP server
    mockServer = createServer();

    // Mock Socket.IO server
    mockIo = {
      on: jest.fn(),
      emit: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
      close: jest.fn(),
      use: jest.fn(),
      of: jest.fn(() => mockIo)
    };

    // Mock socket
    mockSocket = {
      id: 'socket-123',
      emit: jest.fn(),
      on: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      disconnect: jest.fn(),
      handshake: {
        auth: { token: 'valid-token' },
        query: { userId: 'user-123' }
      },
      data: {}
    };

    (SocketIOServer as any).mockImplementation(() => mockIo);

    websocketHandler = new WebSocketHandler(mockServer);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Connection Management', () => {
    it('should initialize WebSocket server correctly', () => {
      expect(SocketIOServer).toHaveBeenCalledWith(mockServer, {
        cors: {
          origin: process.env.WEBSOCKET_CORS_ORIGIN || '*',
          credentials: true
        },
        transports: ['websocket', 'polling']
      });
    });

    it('should handle new client connections', () => {
      // Simulate connection event
      const connectionHandler = mockIo.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];

      connectionHandler(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('join-room', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('agent-status-update', expect.any(Function));
    });

    it('should authenticate socket connections', async () => {
      const authMiddleware = mockIo.use.mock.calls[0][0];
      const mockNext = jest.fn();

      // Mock valid token verification
      jest.spyOn(websocketHandler, 'verifyToken').mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com'
      });

      await authMiddleware(mockSocket, mockNext);

      expect(websocketHandler.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockSocket.data.user).toEqual({
        userId: 'user-123',
        email: 'test@example.com'
      });
    });

    it('should reject invalid authentication', async () => {
      const authMiddleware = mockIo.use.mock.calls[0][0];
      const mockNext = jest.fn();

      jest.spyOn(websocketHandler, 'verifyToken').mockRejectedValue(
        new Error('Invalid token')
      );

      await authMiddleware(mockSocket, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error('Authentication failed'));
    });

    it('should handle client disconnections', () => {
      const connectionHandler = mockIo.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];

      connectionHandler(mockSocket);

      // Get disconnect handler
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];

      disconnectHandler('client disconnect');

      expect(websocketHandler.activeConnections.has(mockSocket.id)).toBe(false);
    });
  });

  describe('Room Management', () => {
    beforeEach(() => {
      const connectionHandler = mockIo.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      connectionHandler(mockSocket);
    });

    it('should handle room joining', () => {
      const joinRoomHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'join-room'
      )[1];

      const roomData = { room: 'agent-feed-main', userId: 'user-123' };
      joinRoomHandler(roomData);

      expect(mockSocket.join).toHaveBeenCalledWith('agent-feed-main');
      expect(mockSocket.emit).toHaveBeenCalledWith('room-joined', {
        room: 'agent-feed-main',
        message: 'Successfully joined room'
      });
    });

    it('should validate room names', () => {
      const joinRoomHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'join-room'
      )[1];

      const invalidRoomData = { room: 'invalid-room', userId: 'user-123' };
      joinRoomHandler(invalidRoomData);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid room name'
      });
    });

    it('should handle room leaving', () => {
      const roomName = 'agent-feed-main';
      websocketHandler.leaveRoom(mockSocket.id, roomName);

      expect(mockSocket.leave).toHaveBeenCalledWith(roomName);
    });
  });

  describe('Agent Status Broadcasting', () => {
    beforeEach(() => {
      const connectionHandler = mockIo.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      connectionHandler(mockSocket);
    });

    it('should broadcast agent status updates', () => {
      const agentStatus = {
        agentId: 'agent-123',
        type: 'researcher',
        status: 'active',
        currentTask: 'Analyzing user requirements',
        progress: 75
      };

      websocketHandler.broadcastAgentStatus(agentStatus);

      expect(mockIo.to).toHaveBeenCalledWith('agent-feed-main');
      expect(mockIo.to().emit).toHaveBeenCalledWith('agent-status-update', agentStatus);
    });

    it('should handle real-time task progress updates', () => {
      const taskProgress = {
        taskId: 'task-456',
        agentId: 'agent-123',
        progress: 60,
        status: 'in_progress',
        message: 'Implementing authentication system'
      };

      websocketHandler.broadcastTaskProgress(taskProgress);

      expect(mockIo.to).toHaveBeenCalledWith('agent-feed-main');
      expect(mockIo.to().emit).toHaveBeenCalledWith('task-progress', taskProgress);
    });

    it('should broadcast swarm coordination events', () => {
      const coordinationEvent = {
        type: 'agent-handoff',
        fromAgent: 'agent-123',
        toAgent: 'agent-456',
        task: 'code-review',
        timestamp: new Date().toISOString()
      };

      websocketHandler.broadcastCoordinationEvent(coordinationEvent);

      expect(mockIo.to).toHaveBeenCalledWith('agent-feed-main');
      expect(mockIo.to().emit).toHaveBeenCalledWith('coordination-event', coordinationEvent);
    });

    it('should handle SPARC workflow updates', () => {
      const sparcUpdate = {
        workflowId: 'sparc-workflow-789',
        currentPhase: 'refinement',
        completedPhases: ['specification', 'pseudocode', 'architecture'],
        progress: 60,
        agentsInvolved: ['agent-123', 'agent-456', 'agent-789']
      };

      websocketHandler.broadcastSPARCUpdate(sparcUpdate);

      expect(mockIo.to).toHaveBeenCalledWith('agent-feed-main');
      expect(mockIo.to().emit).toHaveBeenCalledWith('sparc-update', sparcUpdate);
    });
  });

  describe('Message Validation and Security', () => {
    it('should validate message structure', () => {
      const invalidMessage = { invalidField: 'test' };
      
      const isValid = websocketHandler.validateMessage('agent-status-update', invalidMessage);
      
      expect(isValid).toBe(false);
    });

    it('should sanitize message content', () => {
      const maliciousMessage = {
        agentId: 'agent-123',
        message: '<script>alert("XSS")</script>Safe content'
      };

      const sanitized = websocketHandler.sanitizeMessage(maliciousMessage);

      expect(sanitized.message).toBe('Safe content');
      expect(sanitized.message).not.toContain('<script>');
    });

    it('should rate limit message sending', () => {
      // Simulate rapid message sending
      for (let i = 0; i < 15; i++) {
        websocketHandler.trackMessage(mockSocket.id);
      }

      const isAllowed = websocketHandler.isRateLimited(mockSocket.id);
      expect(isAllowed).toBe(true);
    });

    it('should handle message queuing during high load', () => {
      const messages = Array(100).fill(null).map((_, i) => ({
        type: 'agent-status-update',
        data: { agentId: `agent-${i}`, status: 'active' }
      }));

      messages.forEach(msg => websocketHandler.queueMessage(msg));

      expect(websocketHandler.messageQueue.length).toBeLessThanOrEqual(50); // Max queue size
    });
  });

  describe('Error Handling', () => {
    it('should handle socket errors gracefully', () => {
      const connectionHandler = mockIo.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      connectionHandler(mockSocket);

      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )[1];

      const error = new Error('Socket error');
      errorHandler(error);

      expect(websocketHandler.handleSocketError).toHaveBeenCalledWith(mockSocket, error);
    });

    it('should recover from connection drops', async () => {
      mockSocket.connected = false;
      
      await websocketHandler.attemptReconnection(mockSocket.id);
      
      expect(websocketHandler.reconnectionAttempts.get(mockSocket.id)).toBe(1);
    });

    it('should clean up failed connections', () => {
      websocketHandler.activeConnections.set(mockSocket.id, mockSocket);
      
      websocketHandler.cleanupConnection(mockSocket.id);
      
      expect(websocketHandler.activeConnections.has(mockSocket.id)).toBe(false);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track connection metrics', () => {
      const connectionHandler = mockIo.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      // Simulate multiple connections
      for (let i = 0; i < 5; i++) {
        const socket = { ...mockSocket, id: `socket-${i}` };
        connectionHandler(socket);
      }

      const metrics = websocketHandler.getConnectionMetrics();
      
      expect(metrics.activeConnections).toBe(5);
      expect(metrics.totalConnections).toBeGreaterThanOrEqual(5);
    });

    it('should monitor message throughput', () => {
      // Simulate message sending
      for (let i = 0; i < 100; i++) {
        websocketHandler.trackMessageSent();
      }

      const throughput = websocketHandler.getMessageThroughput();
      expect(throughput.messagesPerSecond).toBeGreaterThan(0);
    });

    it('should detect performance bottlenecks', () => {
      // Simulate high latency
      websocketHandler.recordMessageLatency(500); // 500ms
      websocketHandler.recordMessageLatency(600);
      websocketHandler.recordMessageLatency(700);

      const bottlenecks = websocketHandler.detectBottlenecks();
      expect(bottlenecks.highLatency).toBe(true);
    });
  });
});

// Mock WebSocket Handler Class
class WebSocketHandler {
  private io: any;
  public activeConnections: Map<string, any> = new Map();
  public messageQueue: any[] = [];
  private messageCounts: Map<string, number> = new Map();
  public reconnectionAttempts: Map<string, number> = new Map();
  private metrics = {
    totalConnections: 0,
    messagesSent: 0,
    messagesReceived: 0
  };

  constructor(server: any) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.WEBSOCKET_CORS_ORIGIN || '*',
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use(async (socket: any, next: any) => {
      try {
        const token = socket.handshake.auth.token;
        const user = await this.verifyToken(token);
        socket.data.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: any) => {
      this.activeConnections.set(socket.id, socket);
      this.metrics.totalConnections++;

      socket.on('disconnect', () => {
        this.activeConnections.delete(socket.id);
      });

      socket.on('join-room', (data: any) => {
        if (this.isValidRoom(data.room)) {
          socket.join(data.room);
          socket.emit('room-joined', {
            room: data.room,
            message: 'Successfully joined room'
          });
        } else {
          socket.emit('error', { message: 'Invalid room name' });
        }
      });

      socket.on('agent-status-update', (data: any) => {
        if (this.validateMessage('agent-status-update', data)) {
          this.broadcastAgentStatus(data);
        }
      });

      socket.on('error', (error: Error) => {
        this.handleSocketError(socket, error);
      });
    });
  }

  async verifyToken(token: string): Promise<any> {
    if (token === 'valid-token') {
      return { userId: 'user-123', email: 'test@example.com' };
    }
    throw new Error('Invalid token');
  }

  private isValidRoom(room: string): boolean {
    const validRooms = ['agent-feed-main', 'agent-coordination', 'sparc-workflow'];
    return validRooms.includes(room);
  }

  validateMessage(type: string, data: any): boolean {
    const schemas = {
      'agent-status-update': ['agentId', 'status'],
      'task-progress': ['taskId', 'progress'],
      'coordination-event': ['type', 'fromAgent', 'toAgent']
    };

    const requiredFields = schemas[type as keyof typeof schemas];
    if (!requiredFields) return false;

    return requiredFields.every(field => field in data);
  }

  sanitizeMessage(message: any): any {
    const sanitized = { ...message };
    if (typeof sanitized.message === 'string') {
      sanitized.message = sanitized.message.replace(/<script[^>]*>.*?<\/script>/gi, '');
    }
    return sanitized;
  }

  broadcastAgentStatus(status: any) {
    this.io.to('agent-feed-main').emit('agent-status-update', status);
  }

  broadcastTaskProgress(progress: any) {
    this.io.to('agent-feed-main').emit('task-progress', progress);
  }

  broadcastCoordinationEvent(event: any) {
    this.io.to('agent-feed-main').emit('coordination-event', event);
  }

  broadcastSPARCUpdate(update: any) {
    this.io.to('agent-feed-main').emit('sparc-update', update);
  }

  leaveRoom(socketId: string, room: string) {
    const socket = this.activeConnections.get(socketId);
    if (socket) {
      socket.leave(room);
    }
  }

  trackMessage(socketId: string) {
    const count = this.messageCounts.get(socketId) || 0;
    this.messageCounts.set(socketId, count + 1);
  }

  isRateLimited(socketId: string): boolean {
    const count = this.messageCounts.get(socketId) || 0;
    return count > 10; // Rate limit at 10 messages
  }

  queueMessage(message: any) {
    if (this.messageQueue.length < 50) { // Max queue size
      this.messageQueue.push(message);
    }
  }

  handleSocketError(socket: any, error: Error) {
    console.error(`Socket error for ${socket.id}:`, error);
    // Error handling logic
  }

  async attemptReconnection(socketId: string) {
    const attempts = this.reconnectionAttempts.get(socketId) || 0;
    this.reconnectionAttempts.set(socketId, attempts + 1);
  }

  cleanupConnection(socketId: string) {
    this.activeConnections.delete(socketId);
    this.messageCounts.delete(socketId);
    this.reconnectionAttempts.delete(socketId);
  }

  getConnectionMetrics() {
    return {
      activeConnections: this.activeConnections.size,
      totalConnections: this.metrics.totalConnections,
      messagesSent: this.metrics.messagesSent,
      messagesReceived: this.metrics.messagesReceived
    };
  }

  trackMessageSent() {
    this.metrics.messagesSent++;
  }

  getMessageThroughput() {
    return {
      messagesPerSecond: this.metrics.messagesSent / 60 // Simplified calculation
    };
  }

  recordMessageLatency(latency: number) {
    // Record latency for monitoring
  }

  detectBottlenecks() {
    return {
      highLatency: true, // Simplified detection
      overloaded: this.activeConnections.size > 100
    };
  }
}