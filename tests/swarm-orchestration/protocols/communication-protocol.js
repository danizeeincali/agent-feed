/**
 * Communication Protocol for Swarm Orchestration
 * 
 * Implements message passing, status broadcasting, coordination barriers,
 * and failure isolation mechanisms for agent-to-agent communication.
 */

const EventEmitter = require('events');
const { randomUUID } = require('crypto');

class CommunicationProtocol extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.nodeId = config.nodeId || randomUUID();
    this.channels = new Map();
    this.messageQueue = new Map(); // per-agent message queues
    this.routingTable = new Map();
    this.coordinationBarriers = new Map();
    this.heartbeats = new Map();
    
    // Protocol configuration
    this.protocolConfig = {
      messageTimeout: config.messageTimeout || 10000,
      heartbeatInterval: config.heartbeatInterval || 5000,
      maxQueueSize: config.maxQueueSize || 1000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      compressionThreshold: config.compressionThreshold || 1024
    };
    
    // Statistics
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      messagesDropped: 0,
      averageLatency: 0,
      failedDeliveries: 0
    };
  }

  /**
   * Initialize communication protocol
   */
  async initialize() {
    console.log(`📡 Initializing communication protocol for node ${this.nodeId}...`);
    
    try {
      // Initialize message channels
      await this._initializeChannels();
      
      // Start message processing
      this._startMessageProcessor();
      
      // Start heartbeat system
      this._startHeartbeatSystem();
      
      // Start status broadcasting
      this._startStatusBroadcasting();
      
      // Set up failure detection
      this._setupFailureDetection();
      
      console.log(`✅ Communication protocol initialized for node ${this.nodeId}`);
      this.emit('ready');
      
    } catch (error) {
      console.error(`❌ Failed to initialize communication protocol:`, error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Register agent with the communication protocol
   */
  async registerAgent(agentId, agentInfo) {
    console.log(`📝 Registering agent: ${agentId}`);
    
    // Create message queue for agent
    this.messageQueue.set(agentId, []);
    
    // Add to routing table
    this.routingTable.set(agentId, {
      id: agentId,
      nodeId: this.nodeId,
      info: agentInfo,
      status: 'active',
      lastSeen: Date.now(),
      metrics: {
        messagesSent: 0,
        messagesReceived: 0,
        averageLatency: 0
      }
    });
    
    // Initialize heartbeat tracking
    this.heartbeats.set(agentId, {
      lastHeartbeat: Date.now(),
      missed: 0,
      status: 'healthy'
    });
    
    console.log(`✅ Agent ${agentId} registered successfully`);
    this.emit('agent-registered', { agentId, agentInfo });
  }

  /**
   * Send message to specific agent
   */
  async sendMessage(fromAgent, toAgent, messageType, payload, options = {}) {
    const messageId = randomUUID();
    const timestamp = Date.now();
    
    const message = {
      id: messageId,
      from: fromAgent,
      to: toAgent,
      type: messageType,
      payload: payload,
      timestamp: timestamp,
      nodeId: this.nodeId,
      priority: options.priority || 'normal',
      requiresAck: options.requiresAck || false,
      timeout: options.timeout || this.protocolConfig.messageTimeout
    };
    
    console.log(`📤 Sending message ${messageId}: ${fromAgent} → ${toAgent} (${messageType})`);
    
    try {
      // Validate message
      this._validateMessage(message);
      
      // Apply compression if needed
      if (this._shouldCompress(message)) {
        message.compressed = true;
        message.payload = this._compressPayload(message.payload);
      }
      
      // Route message
      const success = await this._routeMessage(message, options);
      
      if (success) {
        this.stats.messagesSent++;
        this._updateAgentMetrics(fromAgent, 'sent');
        
        // Set up acknowledgment handling if required
        if (message.requiresAck) {
          return this._waitForAcknowledgment(messageId, message.timeout);
        }
        
        return true;
      } else {
        throw new Error('Failed to route message');
      }
      
    } catch (error) {
      console.error(`❌ Failed to send message ${messageId}:`, error);
      this.stats.failedDeliveries++;
      throw error;
    }
  }

  /**
   * Broadcast message to all agents
   */
  async broadcastMessage(fromAgent, messageType, payload, options = {}) {
    console.log(`📢 Broadcasting message from ${fromAgent}: ${messageType}`);
    
    const promises = [];
    
    for (const agentId of this.routingTable.keys()) {
      if (agentId !== fromAgent) {
        const promise = this.sendMessage(fromAgent, agentId, messageType, payload, {
          ...options,
          requiresAck: false // Broadcasts don't require individual acknowledgments
        }).catch(error => {
          console.warn(`Failed to broadcast to ${agentId}:`, error.message);
          return false;
        });
        
        promises.push(promise);
      }
    }
    
    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    
    console.log(`📢 Broadcast completed: ${successCount}/${promises.length} successful deliveries`);
    
    return {
      totalAgents: promises.length,
      successfulDeliveries: successCount,
      failedDeliveries: promises.length - successCount
    };
  }

  /**
   * Subscribe to message type
   */
  subscribeToMessages(agentId, messageType, handler) {
    const channelKey = `${agentId}:${messageType}`;
    
    if (!this.channels.has(channelKey)) {
      this.channels.set(channelKey, []);
    }
    
    this.channels.get(channelKey).push(handler);
    
    console.log(`📨 Agent ${agentId} subscribed to ${messageType} messages`);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.channels.get(channelKey);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Create coordination barrier
   */
  async createCoordinationBarrier(barrierId, participantIds, timeout = 30000) {
    console.log(`🚧 Creating coordination barrier: ${barrierId} for ${participantIds.length} participants`);
    
    const barrier = {
      id: barrierId,
      participants: new Set(participantIds),
      arrivals: new Set(),
      timeout: timeout,
      created: Date.now(),
      promise: null,
      resolve: null,
      reject: null
    };
    
    // Create promise for barrier completion
    barrier.promise = new Promise((resolve, reject) => {
      barrier.resolve = resolve;
      barrier.reject = reject;
      
      // Set timeout
      setTimeout(() => {
        if (barrier.arrivals.size < barrier.participants.size) {
          reject(new Error(`Coordination barrier ${barrierId} timed out`));
        }
      }, timeout);
    });
    
    this.coordinationBarriers.set(barrierId, barrier);
    
    return barrier.promise;
  }

  /**
   * Agent arrives at coordination barrier
   */
  async arriveAtBarrier(barrierId, agentId) {
    const barrier = this.coordinationBarriers.get(barrierId);
    
    if (!barrier) {
      throw new Error(`Coordination barrier ${barrierId} not found`);
    }
    
    if (!barrier.participants.has(agentId)) {
      throw new Error(`Agent ${agentId} is not a participant in barrier ${barrierId}`);
    }
    
    console.log(`🚧 Agent ${agentId} arrived at barrier ${barrierId}`);
    
    barrier.arrivals.add(agentId);
    
    // Check if all participants have arrived
    if (barrier.arrivals.size === barrier.participants.size) {
      console.log(`✅ All participants arrived at barrier ${barrierId}`);
      barrier.resolve({
        barrierId: barrierId,
        participants: Array.from(barrier.participants),
        completionTime: Date.now() - barrier.created
      });
      
      // Clean up barrier
      this.coordinationBarriers.delete(barrierId);
    }
    
    return barrier.promise;
  }

  /**
   * Send heartbeat for agent
   */
  sendHeartbeat(agentId, status, metrics = {}) {
    const heartbeat = {
      agentId: agentId,
      timestamp: Date.now(),
      status: status,
      metrics: metrics,
      nodeId: this.nodeId
    };
    
    // Update heartbeat tracking
    if (this.heartbeats.has(agentId)) {
      const heartbeatInfo = this.heartbeats.get(agentId);
      heartbeatInfo.lastHeartbeat = Date.now();
      heartbeatInfo.missed = 0;
      heartbeatInfo.status = 'healthy';
    }
    
    // Broadcast heartbeat to all other agents
    this.emit('heartbeat', heartbeat);
    
    return true;
  }

  /**
   * Get communication statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeAgents: this.routingTable.size,
      queuedMessages: Array.from(this.messageQueue.values())
        .reduce((total, queue) => total + queue.length, 0),
      activeBarriers: this.coordinationBarriers.size,
      healthyAgents: Array.from(this.heartbeats.values())
        .filter(hb => hb.status === 'healthy').length
    };
  }

  /**
   * Initialize message channels
   */
  async _initializeChannels() {
    console.log('📬 Initializing message channels...');
    
    // Set up standard channels
    const standardChannels = [
      'task-assignment',
      'task-completion', 
      'task-failure',
      'status-update',
      'metrics-update',
      'coordination',
      'heartbeat',
      'error'
    ];
    
    for (const channel of standardChannels) {
      this.channels.set(channel, []);
    }
  }

  /**
   * Start message processor
   */
  _startMessageProcessor() {
    console.log('⚙️ Starting message processor...');
    
    setInterval(() => {
      this._processMessageQueues();
    }, 100); // Process every 100ms
  }

  /**
   * Process message queues
   */
  async _processMessageQueues() {
    for (const [agentId, queue] of this.messageQueue.entries()) {
      if (queue.length > 0) {
        const message = queue.shift();
        await this._deliverMessage(message);
      }
    }
  }

  /**
   * Route message to destination
   */
  async _routeMessage(message, options) {
    const targetAgent = this.routingTable.get(message.to);
    
    if (!targetAgent) {
      console.warn(`⚠️ Target agent ${message.to} not found in routing table`);
      return false;
    }
    
    // Add to target agent's message queue
    const queue = this.messageQueue.get(message.to);
    
    if (queue.length >= this.protocolConfig.maxQueueSize) {
      console.warn(`⚠️ Message queue full for agent ${message.to}`);
      this.stats.messagesDropped++;
      return false;
    }
    
    queue.push(message);
    return true;
  }

  /**
   * Deliver message to agent
   */
  async _deliverMessage(message) {
    const startTime = Date.now();
    
    try {
      // Decompress if needed
      if (message.compressed) {
        message.payload = this._decompressPayload(message.payload);
      }
      
      // Find message handlers
      const channelKey = `${message.to}:${message.type}`;
      const handlers = this.channels.get(channelKey) || [];
      
      // Deliver to all handlers
      const deliveryPromises = handlers.map(handler => {
        try {
          return Promise.resolve(handler(message));
        } catch (error) {
          console.error(`Error in message handler:`, error);
          return Promise.reject(error);
        }
      });
      
      await Promise.allSettled(deliveryPromises);
      
      // Update statistics
      this.stats.messagesReceived++;
      this._updateAgentMetrics(message.to, 'received');
      
      const latency = Date.now() - message.timestamp;
      this._updateLatencyStats(latency);
      
      // Send acknowledgment if required
      if (message.requiresAck) {
        this._sendAcknowledgment(message);
      }
      
      console.log(`✅ Message ${message.id} delivered to ${message.to} (latency: ${latency}ms)`);
      
    } catch (error) {
      console.error(`❌ Failed to deliver message ${message.id}:`, error);
      this.stats.failedDeliveries++;
    }
  }

  /**
   * Start heartbeat system
   */
  _startHeartbeatSystem() {
    console.log('💓 Starting heartbeat system...');
    
    // Check for missed heartbeats
    setInterval(() => {
      this._checkHeartbeats();
    }, this.protocolConfig.heartbeatInterval);
  }

  /**
   * Check agent heartbeats
   */
  _checkHeartbeats() {
    const now = Date.now();
    const heartbeatTimeout = this.protocolConfig.heartbeatInterval * 3; // 3 missed heartbeats
    
    for (const [agentId, heartbeatInfo] of this.heartbeats.entries()) {
      const timeSinceLastHeartbeat = now - heartbeatInfo.lastHeartbeat;
      
      if (timeSinceLastHeartbeat > heartbeatTimeout) {
        heartbeatInfo.missed++;
        
        if (heartbeatInfo.status === 'healthy') {
          console.warn(`⚠️ Agent ${agentId} missed heartbeat`);
          heartbeatInfo.status = 'warning';
        }
        
        if (heartbeatInfo.missed >= 3) {
          console.error(`❌ Agent ${agentId} appears to be unresponsive`);
          heartbeatInfo.status = 'unresponsive';
          this._handleUnresponsiveAgent(agentId);
        }
      }
    }
  }

  /**
   * Start status broadcasting
   */
  _startStatusBroadcasting() {
    console.log('📡 Starting status broadcasting...');
    
    const interval = this.config.communication?.statusBroadcast?.interval || 5000;
    
    setInterval(() => {
      this._broadcastSystemStatus();
    }, interval);
  }

  /**
   * Broadcast system status
   */
  _broadcastSystemStatus() {
    const status = {
      nodeId: this.nodeId,
      timestamp: Date.now(),
      stats: this.getStats(),
      agentStates: this._getAgentStates()
    };
    
    this.emit('status-broadcast', status);
  }

  /**
   * Set up failure detection
   */
  _setupFailureDetection() {
    console.log('🔍 Setting up failure detection...');
    
    // Monitor for cascading failures
    this.on('agent-failure', (agentId) => {
      this._handleAgentFailure(agentId);
    });
    
    // Monitor for network partitions
    setInterval(() => {
      this._detectNetworkPartitions();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Handle unresponsive agent
   */
  _handleUnresponsiveAgent(agentId) {
    console.warn(`🚨 Handling unresponsive agent: ${agentId}`);
    
    // Mark agent as inactive in routing table
    const agentInfo = this.routingTable.get(agentId);
    if (agentInfo) {
      agentInfo.status = 'inactive';
    }
    
    // Emit failure event
    this.emit('agent-failure', agentId);
    
    // Clean up agent's message queue to prevent memory leaks
    this.messageQueue.delete(agentId);
    
    // Remove from active coordination barriers
    for (const [barrierId, barrier] of this.coordinationBarriers.entries()) {
      if (barrier.participants.has(agentId)) {
        barrier.participants.delete(agentId);
        
        // Check if barrier can still complete
        if (barrier.arrivals.size >= barrier.participants.size) {
          barrier.resolve({
            barrierId: barrierId,
            participants: Array.from(barrier.participants),
            completionTime: Date.now() - barrier.created,
            excludedAgents: [agentId]
          });
          
          this.coordinationBarriers.delete(barrierId);
        }
      }
    }
  }

  /**
   * Handle agent failure with isolation
   */
  _handleAgentFailure(agentId) {
    console.error(`💥 Agent failure detected: ${agentId}`);
    
    // Implement failure isolation
    this._isolateFailedAgent(agentId);
    
    // Notify other agents about the failure
    this.broadcastMessage('system', 'agent-failure-notification', {
      failedAgent: agentId,
      timestamp: Date.now(),
      isolationStatus: 'isolated'
    });
  }

  /**
   * Isolate failed agent to prevent cascade failures
   */
  _isolateFailedAgent(agentId) {
    console.log(`🔒 Isolating failed agent: ${agentId}`);
    
    // Remove from routing table
    this.routingTable.delete(agentId);
    
    // Clear message queue
    this.messageQueue.delete(agentId);
    
    // Remove heartbeat tracking
    this.heartbeats.delete(agentId);
    
    // Cancel any pending message acknowledgments
    this._cancelPendingAcks(agentId);
  }

  /**
   * Utility methods
   */
  _validateMessage(message) {
    if (!message.id || !message.from || !message.to || !message.type) {
      throw new Error('Invalid message format');
    }
  }

  _shouldCompress(message) {
    const payloadSize = JSON.stringify(message.payload).length;
    return payloadSize > this.protocolConfig.compressionThreshold;
  }

  _compressPayload(payload) {
    // Simple compression simulation
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  _decompressPayload(compressedPayload) {
    // Simple decompression simulation
    return JSON.parse(Buffer.from(compressedPayload, 'base64').toString());
  }

  _updateAgentMetrics(agentId, type) {
    const agentInfo = this.routingTable.get(agentId);
    if (agentInfo) {
      if (type === 'sent') {
        agentInfo.metrics.messagesSent++;
      } else if (type === 'received') {
        agentInfo.metrics.messagesReceived++;
      }
    }
  }

  _updateLatencyStats(latency) {
    this.stats.averageLatency = 
      (this.stats.averageLatency * (this.stats.messagesReceived - 1) + latency) / 
      this.stats.messagesReceived;
  }

  _sendAcknowledgment(message) {
    this.sendMessage('system', message.from, 'message-ack', {
      originalMessageId: message.id,
      timestamp: Date.now()
    });
  }

  _waitForAcknowledgment(messageId, timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Message ${messageId} acknowledgment timeout`));
      }, timeout);
      
      const ackHandler = (ackMessage) => {
        if (ackMessage.payload.originalMessageId === messageId) {
          clearTimeout(timeoutId);
          resolve(true);
        }
      };
      
      // Subscribe to acknowledgments temporarily
      const unsubscribe = this.subscribeToMessages('system', 'message-ack', ackHandler);
      
      // Clean up subscription after timeout or success
      setTimeout(() => unsubscribe(), timeout + 1000);
    });
  }

  _getAgentStates() {
    const states = {};
    
    for (const [agentId, routingInfo] of this.routingTable.entries()) {
      const heartbeatInfo = this.heartbeats.get(agentId);
      
      states[agentId] = {
        status: routingInfo.status,
        lastSeen: routingInfo.lastSeen,
        heartbeatStatus: heartbeatInfo?.status || 'unknown',
        queueLength: this.messageQueue.get(agentId)?.length || 0
      };
    }
    
    return states;
  }

  _detectNetworkPartitions() {
    // Simple partition detection based on heartbeat patterns
    const now = Date.now();
    const unhealthyAgents = Array.from(this.heartbeats.entries())
      .filter(([_, hb]) => now - hb.lastHeartbeat > 30000).length;
    
    if (unhealthyAgents > this.heartbeats.size * 0.5) {
      console.warn('🚨 Potential network partition detected');
      this.emit('network-partition-suspected', {
        unhealthyAgents: unhealthyAgents,
        totalAgents: this.heartbeats.size
      });
    }
  }

  _cancelPendingAcks(agentId) {
    // Cancel any pending acknowledgments for the failed agent
    // This would be implemented based on specific acknowledgment tracking
  }

  /**
   * Shutdown communication protocol
   */
  async shutdown() {
    console.log(`🔄 Shutting down communication protocol for node ${this.nodeId}...`);
    
    // Clear all intervals and timeouts
    // Note: In a real implementation, you'd track these and clear them
    
    // Clear data structures
    this.channels.clear();
    this.messageQueue.clear();
    this.routingTable.clear();
    this.coordinationBarriers.clear();
    this.heartbeats.clear();
    
    console.log(`✅ Communication protocol shutdown completed`);
  }
}

module.exports = CommunicationProtocol;