/**
 * WebSocket Service - Real-time event broadcasting via Socket.IO
 *
 * Provides real-time updates for:
 * - Ticket status changes (pending, processing, completed, failed)
 * - Agent worker lifecycle events
 * - System health updates
 *
 * Event Format:
 * {
 *   "post_id": "post-123",
 *   "ticket_id": "ticket-456",
 *   "status": "processing",
 *   "agent_id": "link-logger-agent",
 *   "timestamp": "2025-10-23T23:30:00Z"
 * }
 */

import { Server } from 'socket.io';

class WebSocketService {
  constructor() {
    this.io = null;
    this.initialized = false;
  }

  /**
   * Initialize Socket.IO with HTTP server
   * @param {Object} httpServer - HTTP server instance
   * @param {Object} options - Socket.IO configuration options
   */
  initialize(httpServer, options = {}) {
    if (this.initialized) {
      console.warn('WebSocket service already initialized');
      return this.io;
    }

    const defaultOptions = {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      path: '/socket.io/',
      pingTimeout: 60000,
      pingInterval: 25000
    };

    this.io = new Server(httpServer, { ...defaultOptions, ...options });

    this.setupEventHandlers();
    this.initialized = true;

    console.log('WebSocket service initialized');
    return this.io;
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    if (!this.io) {
      throw new Error('Socket.IO not initialized');
    }

    this.io.on('connection', (socket) => {
      console.log(`WebSocket client connected: ${socket.id}`);

      // Handle client disconnect
      socket.on('disconnect', (reason) => {
        console.log(`WebSocket client disconnected: ${socket.id}, reason: ${reason}`);
      });

      // Handle subscription to specific post updates
      socket.on('subscribe:post', (postId) => {
        socket.join(`post:${postId}`);
        console.log(`Client ${socket.id} subscribed to post:${postId}`);
      });

      // Handle unsubscription from post updates
      socket.on('unsubscribe:post', (postId) => {
        socket.leave(`post:${postId}`);
        console.log(`Client ${socket.id} unsubscribed from post:${postId}`);
      });

      // Handle subscription to agent updates
      socket.on('subscribe:agent', (agentId) => {
        socket.join(`agent:${agentId}`);
        console.log(`Client ${socket.id} subscribed to agent:${agentId}`);
      });

      // Handle unsubscription from agent updates
      socket.on('unsubscribe:agent', (agentId) => {
        socket.leave(`agent:${agentId}`);
        console.log(`Client ${socket.id} unsubscribed from agent:${agentId}`);
      });

      // Send initial connection confirmation
      socket.emit('connected', {
        message: 'WebSocket connection established',
        timestamp: new Date().toISOString()
      });
    });

    // Handle server errors
    this.io.on('error', (error) => {
      console.error('Socket.IO error:', error);
    });
  }

  /**
   * Emit ticket status update event
   * @param {Object} payload - Event payload
   */
  emitTicketStatusUpdate(payload) {
    if (!this.io || !this.initialized) {
      console.warn('Cannot emit event: WebSocket service not initialized');
      return;
    }

    // Validate payload
    const validStatuses = ['pending', 'processing', 'completed', 'failed'];
    if (!validStatuses.includes(payload.status)) {
      console.error(`Invalid status: ${payload.status}. Must be one of: ${validStatuses.join(', ')}`);
      return;
    }

    // Ensure timestamp is in ISO format
    const event = {
      post_id: payload.post_id,
      ticket_id: payload.ticket_id,
      status: payload.status,
      agent_id: payload.agent_id,
      timestamp: payload.timestamp || new Date().toISOString(),
      error: payload.error || null
    };

    // Broadcast to all connected clients
    this.io.emit('ticket:status:update', event);

    // Broadcast to post-specific subscribers
    if (event.post_id) {
      this.io.to(`post:${event.post_id}`).emit('ticket:status:update', event);
    }

    // Broadcast to agent-specific subscribers
    if (event.agent_id) {
      this.io.to(`agent:${event.agent_id}`).emit('ticket:status:update', event);
    }

    console.log(`Emitted ticket:status:update - Ticket: ${event.ticket_id}, Status: ${event.status}`);
  }

  /**
   * Emit worker lifecycle event
   * @param {Object} payload - Worker event payload
   */
  emitWorkerEvent(payload) {
    if (!this.io || !this.initialized) {
      console.warn('Cannot emit event: WebSocket service not initialized');
      return;
    }

    const event = {
      worker_id: payload.worker_id,
      ticket_id: payload.ticket_id,
      event_type: payload.event_type, // 'started', 'completed', 'failed'
      timestamp: payload.timestamp || new Date().toISOString()
    };

    this.io.emit('worker:lifecycle', event);
    console.log(`Emitted worker:lifecycle - Worker: ${event.worker_id}, Event: ${event.event_type}`);
  }

  /**
   * Get Socket.IO instance
   * @returns {Object} Socket.IO server instance
   */
  getIO() {
    if (!this.io || !this.initialized) {
      throw new Error('WebSocket service not initialized. Call initialize() first.');
    }
    return this.io;
  }

  /**
   * Check if service is initialized
   * @returns {boolean} Initialization status
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection stats
   */
  getStats() {
    if (!this.io || !this.initialized) {
      return { connected: 0, rooms: 0 };
    }

    const sockets = this.io.sockets.sockets;
    const rooms = this.io.sockets.adapter.rooms;

    return {
      connected: sockets.size,
      rooms: rooms.size,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
export default websocketService;
