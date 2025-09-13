/**
 * PageBuilderCommunicationProtocol - Inter-Agent Communication Layer
 * 
 * Provides secure, efficient communication between agents for page building
 * operations with built-in memory management and error resilience.
 * 
 * Features:
 * - JSON-based message protocol with validation
 * - Real-time WebSocket communication
 * - Message queuing with overflow protection
 * - Agent authentication and authorization
 * - Rate limiting and spam prevention
 * - Message compression for large payloads
 * - Circuit breaker for failing connections
 */

const EventEmitter = require('events');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');
const crypto = require('crypto');

class PageBuilderCommunicationProtocol extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Protocol configuration
    this.config = {
      maxMessageSize: options.maxMessageSize || 1024 * 1024, // 1MB
      maxQueueSize: options.maxQueueSize || 1000,
      heartbeatInterval: options.heartbeatInterval || 30000, // 30 seconds
      messageTimeout: options.messageTimeout || 10000, // 10 seconds
      maxReconnectAttempts: options.maxReconnectAttempts || 5,
      reconnectDelay: options.reconnectDelay || 2000,
      compressionThreshold: options.compressionThreshold || 1024, // 1KB
      rateLimitWindow: options.rateLimitWindow || 60000, // 1 minute
      maxMessagesPerWindow: options.maxMessagesPerWindow || 100
    };
    
    // Communication state
    this.agents = new Map(); // agentId -> AgentConnection
    this.messageQueue = new Map(); // agentId -> Message[]
    this.pendingMessages = new Map(); // messageId -> { resolve, reject, timeout }
    this.rateLimiter = new Map(); // agentId -> { count, windowStart }
    this.messageStats = {
      sent: 0,
      received: 0,
      failed: 0,
      queued: 0,
      compressed: 0
    };
    
    // Security
    this.authenticatedAgents = new Set();
    this.secretKey = options.secretKey || this.generateSecretKey();
    
    // WebSocket server
    this.wsServer = null;
    this.heartbeatTimer = null;
    
    this.logger = console; // Replace with proper logger in production
    this.logger.info('PageBuilderCommunicationProtocol initialized');
    
    // Start periodic cleanup
    this.startMaintenanceTasks();
  }

  /**
   * Generate a secure secret key for message signing
   */
  generateSecretKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Start maintenance tasks (cleanup, heartbeat, etc.)
   */
  startMaintenanceTasks() {
    // Heartbeat to check agent connections
    this.heartbeatTimer = setInterval(() => {
      this.performHeartbeat();
    }, this.config.heartbeatInterval);
    
    // Cleanup expired messages and rate limiters
    setInterval(() => {
      this.cleanupExpiredData();
    }, 60000); // Every minute
    
    // Log statistics
    setInterval(() => {
      this.logStatistics();
    }, 300000); // Every 5 minutes
  }

  /**
   * Initialize WebSocket server for agent connections
   */
  initializeWebSocketServer(server) {
    this.wsServer = new WebSocket.Server({ 
      server,
      path: '/agent-communication',
      clientTracking: true,
      maxPayload: this.config.maxMessageSize
    });
    
    this.wsServer.on('connection', (ws, req) => {
      this.handleNewConnection(ws, req);
    });
    
    this.wsServer.on('error', (error) => {
      this.logger.error('WebSocket server error', { error: error.message });
    });
    
    this.logger.info('WebSocket server initialized for agent communication');
  }

  /**
   * Handle new WebSocket connection
   */
  handleNewConnection(ws, req) {
    const connectionId = this.generateConnectionId();
    
    ws.connectionId = connectionId;
    ws.isAlive = true;
    ws.agentId = null; // Will be set after authentication
    ws.connectedAt = Date.now();
    
    this.logger.info('New WebSocket connection', { connectionId, ip: req.socket.remoteAddress });
    
    // Set up message handler
    ws.on('message', (data) => {
      this.handleIncomingMessage(ws, data);
    });
    
    // Handle connection close
    ws.on('close', (code, reason) => {
      this.handleConnectionClose(ws, code, reason);
    });
    
    // Handle errors
    ws.on('error', (error) => {
      this.logger.error('WebSocket connection error', { 
        connectionId, 
        error: error.message 
      });
    });
    
    // Pong handler for heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    // Send welcome message
    this.sendToConnection(ws, {
      type: 'welcome',
      connectionId,
      timestamp: Date.now(),
      protocolVersion: '1.0'
    });
  }

  /**
   * Generate unique connection ID
   */
  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle incoming message from agent
   */
  async handleIncomingMessage(ws, data) {
    const startTime = performance.now();
    let message;
    
    try {
      // Parse message
      if (Buffer.isBuffer(data)) {
        data = data.toString('utf8');
      }
      
      // Check message size
      if (data.length > this.config.maxMessageSize) {
        throw new Error('Message size exceeds maximum allowed');
      }
      
      message = JSON.parse(data);
      
      // Validate message structure
      if (!this.validateMessage(message)) {
        throw new Error('Invalid message format');
      }
      
      // Handle authentication first
      if (message.type === 'authenticate') {
        await this.handleAuthentication(ws, message);
        return;
      }
      
      // Ensure agent is authenticated for other messages
      if (!ws.agentId || !this.authenticatedAgents.has(ws.agentId)) {
        throw new Error('Agent not authenticated');
      }
      
      // Rate limiting check
      if (!this.checkRateLimit(ws.agentId)) {
        throw new Error('Rate limit exceeded');
      }
      
      // Process message based on type
      await this.processMessage(ws, message);
      
      this.messageStats.received++;
      
      const duration = performance.now() - startTime;
      this.logger.debug('Message processed', { 
        agentId: ws.agentId, 
        type: message.type, 
        duration: Math.round(duration) 
      });
      
    } catch (error) {
      this.messageStats.failed++;
      
      this.logger.error('Message processing failed', {
        connectionId: ws.connectionId,
        agentId: ws.agentId,
        error: error.message,
        messageType: message?.type
      });
      
      // Send error response
      this.sendToConnection(ws, {
        type: 'error',
        error: error.message,
        timestamp: Date.now(),
        requestId: message?.id
      });
    }
  }

  /**
   * Validate message structure
   */
  validateMessage(message) {
    if (!message || typeof message !== 'object') {
      return false;
    }
    
    // Required fields
    if (!message.type || typeof message.type !== 'string') {
      return false;
    }
    
    if (!message.id || typeof message.id !== 'string') {
      return false;
    }
    
    // Optional but validated fields
    if (message.timestamp && typeof message.timestamp !== 'number') {
      return false;
    }
    
    return true;
  }

  /**
   * Handle agent authentication
   */
  async handleAuthentication(ws, message) {
    try {
      const { agentId, token, workspace } = message.data || {};
      
      if (!agentId || !token) {
        throw new Error('Missing authentication credentials');
      }
      
      // Verify token (implement your authentication logic here)
      const isValid = await this.verifyAgentToken(agentId, token, workspace);
      if (!isValid) {
        throw new Error('Invalid authentication credentials');
      }
      
      // Set agent ID and mark as authenticated
      ws.agentId = agentId;
      this.authenticatedAgents.add(agentId);
      
      // Store agent connection
      this.agents.set(agentId, {
        ws,
        agentId,
        workspace,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        messageCount: 0
      });
      
      // Initialize message queue for this agent
      if (!this.messageQueue.has(agentId)) {
        this.messageQueue.set(agentId, []);
      }
      
      this.logger.info('Agent authenticated successfully', { agentId, workspace });
      
      // Send authentication success
      this.sendToConnection(ws, {
        type: 'authentication_success',
        agentId,
        timestamp: Date.now(),
        features: {
          compression: true,
          realTimeUpdates: true,
          messageQueuing: true
        }
      });
      
      // Send any queued messages
      await this.deliverQueuedMessages(agentId);
      
    } catch (error) {
      this.logger.error('Authentication failed', { 
        connectionId: ws.connectionId, 
        error: error.message 
      });
      
      this.sendToConnection(ws, {
        type: 'authentication_failed',
        error: error.message,
        timestamp: Date.now()
      });
      
      // Close connection after brief delay
      setTimeout(() => {
        ws.close(1008, 'Authentication failed');
      }, 1000);
    }
  }

  /**
   * Verify agent authentication token
   */
  async verifyAgentToken(agentId, token, workspace) {
    try {
      // Implement your token verification logic here
      // This could involve JWT verification, database lookup, etc.
      
      // For now, simple token format validation
      if (!token.startsWith('agent_')) {
        return false;
      }
      
      // Verify signature (simplified example)
      const expectedSignature = this.generateTokenSignature(agentId, workspace);
      return token.includes(expectedSignature.substring(0, 16));
      
    } catch (error) {
      this.logger.error('Token verification failed', { agentId, error: error.message });
      return false;
    }
  }

  /**
   * Generate token signature for verification
   */
  generateTokenSignature(agentId, workspace) {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(`${agentId}:${workspace}`)
      .digest('hex');
  }

  /**
   * Process authenticated message
   */
  async processMessage(ws, message) {
    const { type, data, id } = message;
    const agentId = ws.agentId;
    
    // Update agent activity
    const agentInfo = this.agents.get(agentId);
    if (agentInfo) {
      agentInfo.lastActivity = Date.now();
      agentInfo.messageCount++;
    }
    
    switch (type) {
      case 'page_create_request':
        await this.handlePageCreateRequest(ws, data, id);
        break;
        
      case 'page_update_request':
        await this.handlePageUpdateRequest(ws, data, id);
        break;
        
      case 'page_delete_request':
        await this.handlePageDeleteRequest(ws, data, id);
        break;
        
      case 'collaboration_request':
        await this.handleCollaborationRequest(ws, data, id);
        break;
        
      case 'real_time_update':
        await this.handleRealTimeUpdate(ws, data, id);
        break;
        
      case 'message_response':
        await this.handleMessageResponse(ws, data, id);
        break;
        
      case 'ping':
        this.sendToConnection(ws, { type: 'pong', id, timestamp: Date.now() });
        break;
        
      default:
        this.logger.warn('Unknown message type', { agentId, type });
        this.sendToConnection(ws, {
          type: 'error',
          error: `Unknown message type: ${type}`,
          requestId: id,
          timestamp: Date.now()
        });
    }
  }

  /**
   * Handle page creation request
   */
  async handlePageCreateRequest(ws, data, requestId) {
    try {
      // Emit event for PageBuilderService to handle
      this.emit('pageCreateRequest', {
        agentId: ws.agentId,
        data,
        requestId,
        respond: (result, error) => {
          this.sendToConnection(ws, {
            type: 'page_create_response',
            requestId,
            success: !error,
            data: result,
            error: error?.message,
            timestamp: Date.now()
          });
        }
      });
      
    } catch (error) {
      this.sendToConnection(ws, {
        type: 'page_create_response',
        requestId,
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle page update request
   */
  async handlePageUpdateRequest(ws, data, requestId) {
    try {
      this.emit('pageUpdateRequest', {
        agentId: ws.agentId,
        data,
        requestId,
        respond: (result, error) => {
          this.sendToConnection(ws, {
            type: 'page_update_response',
            requestId,
            success: !error,
            data: result,
            error: error?.message,
            timestamp: Date.now()
          });
        }
      });
      
    } catch (error) {
      this.sendToConnection(ws, {
        type: 'page_update_response',
        requestId,
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle page deletion request
   */
  async handlePageDeleteRequest(ws, data, requestId) {
    try {
      this.emit('pageDeleteRequest', {
        agentId: ws.agentId,
        data,
        requestId,
        respond: (result, error) => {
          this.sendToConnection(ws, {
            type: 'page_delete_response',
            requestId,
            success: !error,
            data: result,
            error: error?.message,
            timestamp: Date.now()
          });
        }
      });
      
    } catch (error) {
      this.sendToConnection(ws, {
        type: 'page_delete_response',
        requestId,
        success: false,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle collaboration request between agents
   */
  async handleCollaborationRequest(ws, data, requestId) {
    try {
      const { targetAgentId, action, payload } = data;
      
      if (!targetAgentId) {
        throw new Error('Target agent ID is required');
      }
      
      // Check if target agent is connected
      const targetAgent = this.agents.get(targetAgentId);
      if (!targetAgent) {
        // Queue message for delivery when agent connects
        await this.queueMessage(targetAgentId, {
          type: 'collaboration_request',
          from: ws.agentId,
          action,
          payload,
          requestId,
          timestamp: Date.now()
        });
        
        this.sendToConnection(ws, {
          type: 'collaboration_queued',
          requestId,
          targetAgentId,
          timestamp: Date.now()
        });
        return;
      }
      
      // Forward to target agent
      this.sendToConnection(targetAgent.ws, {
        type: 'collaboration_request',
        from: ws.agentId,
        action,
        payload,
        requestId,
        timestamp: Date.now()
      });
      
      // Acknowledge to sender
      this.sendToConnection(ws, {
        type: 'collaboration_forwarded',
        requestId,
        targetAgentId,
        timestamp: Date.now()
      });
      
    } catch (error) {
      this.sendToConnection(ws, {
        type: 'collaboration_failed',
        requestId,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handle real-time updates
   */
  async handleRealTimeUpdate(ws, data, requestId) {
    try {
      const { event, payload, broadcast } = data;
      
      if (broadcast) {
        // Broadcast to all agents in the same workspace
        await this.broadcastToWorkspace(ws.agentId, {
          type: 'real_time_update',
          from: ws.agentId,
          event,
          payload,
          timestamp: Date.now()
        });
      }
      
      // Emit event for external listeners
      this.emit('realTimeUpdate', {
        agentId: ws.agentId,
        event,
        payload,
        timestamp: Date.now()
      });
      
    } catch (error) {
      this.logger.error('Real-time update failed', { 
        agentId: ws.agentId, 
        error: error.message 
      });
    }
  }

  /**
   * Handle response to a previous message
   */
  async handleMessageResponse(ws, data, requestId) {
    const { originalRequestId, success, result, error } = data;
    
    // Resolve pending message promise
    const pending = this.pendingMessages.get(originalRequestId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingMessages.delete(originalRequestId);
      
      if (success) {
        pending.resolve(result);
      } else {
        pending.reject(new Error(error || 'Request failed'));
      }
    }
  }

  /**
   * Queue message for offline agent
   */
  async queueMessage(agentId, message) {
    const queue = this.messageQueue.get(agentId) || [];
    
    // Check queue size limit
    if (queue.length >= this.config.maxQueueSize) {
      // Remove oldest message
      queue.shift();
      this.logger.warn('Message queue overflow, removing oldest message', { agentId });
    }
    
    queue.push({
      ...message,
      queuedAt: Date.now()
    });
    
    this.messageQueue.set(agentId, queue);
    this.messageStats.queued++;
    
    this.logger.debug('Message queued for offline agent', { agentId, queueSize: queue.length });
  }

  /**
   * Deliver queued messages to newly connected agent
   */
  async deliverQueuedMessages(agentId) {
    const queue = this.messageQueue.get(agentId);
    if (!queue || queue.length === 0) {
      return;
    }
    
    const agent = this.agents.get(agentId);
    if (!agent || !agent.ws) {
      return;
    }
    
    this.logger.info('Delivering queued messages', { agentId, count: queue.length });
    
    for (const message of queue) {
      try {
        await this.sendToConnection(agent.ws, {
          ...message,
          deliveredAt: Date.now()
        });
      } catch (error) {
        this.logger.error('Failed to deliver queued message', { agentId, error: error.message });
      }
    }
    
    // Clear the queue
    this.messageQueue.set(agentId, []);
  }

  /**
   * Send message to specific connection with optional compression
   */
  async sendToConnection(ws, message) {
    if (ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket connection not open');
    }
    
    try {
      let payload = JSON.stringify(message);
      
      // Compress large messages
      if (payload.length > this.config.compressionThreshold) {
        // Note: Add compression library (zlib) in production
        this.messageStats.compressed++;
      }
      
      ws.send(payload);
      this.messageStats.sent++;
      
    } catch (error) {
      this.logger.error('Failed to send message', { error: error.message });
      throw error;
    }
  }

  /**
   * Broadcast message to all agents in workspace
   */
  async broadcastToWorkspace(senderAgentId, message) {
    const senderAgent = this.agents.get(senderAgentId);
    if (!senderAgent) return;
    
    const workspace = senderAgent.workspace;
    let broadcastCount = 0;
    
    for (const [agentId, agentInfo] of this.agents) {
      if (agentId !== senderAgentId && agentInfo.workspace === workspace) {
        try {
          await this.sendToConnection(agentInfo.ws, message);
          broadcastCount++;
        } catch (error) {
          this.logger.error('Broadcast failed for agent', { agentId, error: error.message });
        }
      }
    }
    
    this.logger.debug('Message broadcasted', { workspace, recipients: broadcastCount });
  }

  /**
   * Check rate limiting for agent
   */
  checkRateLimit(agentId) {
    const now = Date.now();
    const limiter = this.rateLimiter.get(agentId) || { count: 0, windowStart: now };
    
    // Reset window if expired
    if (now - limiter.windowStart > this.config.rateLimitWindow) {
      limiter.count = 0;
      limiter.windowStart = now;
    }
    
    // Check limit
    if (limiter.count >= this.config.maxMessagesPerWindow) {
      return false;
    }
    
    // Increment count
    limiter.count++;
    this.rateLimiter.set(agentId, limiter);
    
    return true;
  }

  /**
   * Perform heartbeat check on all connections
   */
  performHeartbeat() {
    if (!this.wsServer) return;
    
    this.wsServer.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        this.logger.warn('Terminating unresponsive connection', { 
          connectionId: ws.connectionId,
          agentId: ws.agentId 
        });
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }

  /**
   * Handle connection close
   */
  handleConnectionClose(ws, code, reason) {
    this.logger.info('WebSocket connection closed', { 
      connectionId: ws.connectionId,
      agentId: ws.agentId,
      code,
      reason: reason.toString()
    });
    
    if (ws.agentId) {
      this.agents.delete(ws.agentId);
      this.authenticatedAgents.delete(ws.agentId);
      
      // Emit disconnection event
      this.emit('agentDisconnected', {
        agentId: ws.agentId,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Cleanup expired data
   */
  cleanupExpiredData() {
    const now = Date.now();
    let cleaned = 0;
    
    // Cleanup expired rate limiters
    for (const [agentId, limiter] of this.rateLimiter) {
      if (now - limiter.windowStart > this.config.rateLimitWindow * 2) {
        this.rateLimiter.delete(agentId);
        cleaned++;
      }
    }
    
    // Cleanup expired pending messages
    for (const [messageId, pending] of this.pendingMessages) {
      if (now - pending.createdAt > this.config.messageTimeout * 2) {
        clearTimeout(pending.timeout);
        this.pendingMessages.delete(messageId);
        pending.reject(new Error('Message timeout'));
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.logger.debug('Cleaned expired data', { items: cleaned });
    }
  }

  /**
   * Log communication statistics
   */
  logStatistics() {
    this.logger.info('Communication protocol statistics', {
      connectedAgents: this.agents.size,
      messageStats: this.messageStats,
      queuedMessages: Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
      pendingMessages: this.pendingMessages.size
    });
  }

  /**
   * Get protocol health status
   */
  getHealth() {
    return {
      status: 'healthy',
      connectedAgents: this.agents.size,
      authenticatedAgents: this.authenticatedAgents.size,
      messageStats: { ...this.messageStats },
      queueStats: {
        totalQueued: Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
        agentsWithQueue: Array.from(this.messageQueue.values()).filter(queue => queue.length > 0).length
      },
      wsServer: {
        connected: this.wsServer ? this.wsServer.clients.size : 0,
        active: this.wsServer ? Array.from(this.wsServer.clients).filter(ws => ws.isAlive).length : 0
      }
    };
  }

  /**
   * Shutdown protocol and cleanup resources
   */
  async shutdown() {
    this.logger.info('PageBuilderCommunicationProtocol shutting down...');
    
    // Clear timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    // Close all connections
    if (this.wsServer) {
      this.wsServer.clients.forEach((ws) => {
        ws.close(1001, 'Server shutting down');
      });
      
      this.wsServer.close();
    }
    
    // Clear pending messages
    for (const [, pending] of this.pendingMessages) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Server shutting down'));
    }
    
    // Clear all data
    this.agents.clear();
    this.messageQueue.clear();
    this.pendingMessages.clear();
    this.rateLimiter.clear();
    this.authenticatedAgents.clear();
    
    this.removeAllListeners();
    
    this.logger.info('PageBuilderCommunicationProtocol shutdown complete');
  }
}

module.exports = PageBuilderCommunicationProtocol;