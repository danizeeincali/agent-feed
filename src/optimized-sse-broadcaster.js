/**
 * Optimized SSE Broadcaster with Race Condition Fix
 * 
 * Resolves the critical performance bottleneck where Claude AI responses
 * are lost due to timing issues between message generation and frontend connection.
 */

import { PerformanceBottleneckAnalyzer } from './performance-bottleneck-analyzer.js';

class OptimizedSSEBroadcaster {
  constructor() {
    // UNIFIED CONNECTION MANAGEMENT (fixes dual-pool sync issues)
    this.connections = new Map(); // instanceId -> Set of connections
    this.generalConnections = new Set(); // Global status connections
    
    // MESSAGE DELIVERY SYSTEM (fixes race conditions)
    this.messageQueue = new Map(); // instanceId -> Array of queued messages
    this.connectionCallbacks = new Map(); // instanceId -> Array of callbacks waiting for connection
    
    // PERFORMANCE OPTIMIZATION
    this.serializationCache = new Map(); // message hash -> serialized data
    this.batchTimer = new Map(); // instanceId -> timer for batched broadcasts
    
    // MONITORING AND ANALYTICS
    this.analyzer = new PerformanceBottleneckAnalyzer();
    this.metrics = {
      totalBroadcasts: 0,
      successfulDeliveries: 0,
      queuedMessages: 0,
      raceConditionsFixed: 0,
      averageLatency: 0
    };
    
    // CONFIGURATION
    this.maxQueueSize = 100;
    this.batchDelay = 10; // ms
    this.connectionTimeout = 30000; // 30 seconds
    this.serializationCacheSize = 1000;
    
    this.initializeOptimizations();
  }

  initializeOptimizations() {
    // Cleanup interval for stale data
    setInterval(() => this.cleanup(), 60000); // 1 minute
    
    // Performance metrics logging
    setInterval(() => this.logPerformanceMetrics(), 30000); // 30 seconds
    
    console.log('🚀 Optimized SSE Broadcaster initialized');
  }

  /**
   * RACE CONDITION FIX: Pre-connection message queuing
   */
  queueMessageForDelivery(instanceId, message) {
    if (!this.messageQueue.has(instanceId)) {
      this.messageQueue.set(instanceId, []);
    }
    
    const queue = this.messageQueue.get(instanceId);
    
    // Prevent queue overflow
    if (queue.length >= this.maxQueueSize) {
      const removed = queue.shift();
      console.warn(`⚠️ Queue overflow for ${instanceId}, dropped message:`, removed.type);
    }
    
    const queuedMessage = {
      message,
      timestamp: Date.now(),
      attempts: 0,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    queue.push(queuedMessage);
    this.metrics.queuedMessages++;
    
    console.log(`📥 Queued message for ${instanceId} (queue: ${queue.length})`);
    
    // Try immediate delivery if connections exist
    this.attemptImmediateDelivery(instanceId);
    
    return queuedMessage.id;
  }

  attemptImmediateDelivery(instanceId) {
    const connections = this.connections.get(instanceId);
    if (!connections || connections.size === 0) {
      return false; // No connections yet
    }
    
    const queue = this.messageQueue.get(instanceId);
    if (!queue || queue.length === 0) {
      return true; // No messages to deliver
    }
    
    console.log(`📤 Delivering ${queue.length} queued messages to ${connections.size} connections for ${instanceId}`);
    
    const deliveredMessages = [];
    const failedMessages = [];
    
    while (queue.length > 0) {
      const queuedMessage = queue.shift();
      const success = this.broadcastToConnections(instanceId, queuedMessage.message, false);
      
      if (success > 0) {
        deliveredMessages.push(queuedMessage.id);
        this.metrics.raceConditionsFixed++;
      } else {
        queuedMessage.attempts++;
        if (queuedMessage.attempts < 3) {
          queue.unshift(queuedMessage); // Retry later
        } else {
          failedMessages.push(queuedMessage.id);
        }
      }
    }
    
    if (deliveredMessages.length > 0) {
      console.log(`✅ Successfully delivered ${deliveredMessages.length} queued messages for ${instanceId}`);
    }
    
    if (failedMessages.length > 0) {
      console.error(`❌ Failed to deliver ${failedMessages.length} messages after 3 attempts for ${instanceId}`);
    }
    
    return deliveredMessages.length > 0;
  }

  /**
   * CONNECTION MANAGEMENT: Unified pool with automatic queue delivery
   */
  addConnection(instanceId, connection) {
    if (!this.connections.has(instanceId)) {
      this.connections.set(instanceId, new Set());
    }
    
    const connectionSet = this.connections.get(instanceId);
    connectionSet.add(connection);
    
    console.log(`🔌 Added connection for ${instanceId} (total: ${connectionSet.size})`);
    
    // Set up connection cleanup
    connection.on('close', () => {
      connectionSet.delete(connection);
      console.log(`🔌 Removed connection for ${instanceId} (remaining: ${connectionSet.size})`);
    });
    
    // CRITICAL FIX: Immediately deliver any queued messages
    setTimeout(() => {
      this.attemptImmediateDelivery(instanceId);
    }, 50); // Small delay to ensure connection is fully established
    
    // Track connection establishment for race condition detection
    this.analyzer.trackConnectionEvent(instanceId, 'connection_established', {
      connectionsCount: connectionSet.size
    });
    
    return connectionSet.size;
  }

  addGeneralConnection(connection) {
    this.generalConnections.add(connection);
    
    connection.on('close', () => {
      this.generalConnections.delete(connection);
    });
    
    console.log(`🔌 Added general connection (total: ${this.generalConnections.size})`);
    return this.generalConnections.size;
  }

  /**
   * OPTIMIZED BROADCAST WITH PERFORMANCE MONITORING
   */
  broadcastToConnections(instanceId, message, allowQueueing = true) {
    const startTime = performance.now();
    
    // Get connections
    const instanceConnections = this.connections.get(instanceId) || new Set();
    const allConnections = new Set([...instanceConnections, ...this.generalConnections]);
    
    // If no connections and queueing allowed, queue the message
    if (allConnections.size === 0 && allowQueueing) {
      this.queueMessageForDelivery(instanceId, message);
      return 0;
    }
    
    if (allConnections.size === 0) {
      console.warn(`⚠️ No connections available for ${instanceId} and queueing disabled`);
      return 0;
    }
    
    // OPTIMIZATION: Use serialization cache
    const messageHash = this.hashMessage(message);
    let serializedData = this.serializationCache.get(messageHash);
    
    if (!serializedData) {
      const serializationStart = performance.now();
      serializedData = `data: ${JSON.stringify(message)}\n\n`;
      const serializationTime = performance.now() - serializationStart;
      
      // Cache serialized data
      this.serializationCache.set(messageHash, serializedData);
      
      // Limit cache size
      if (this.serializationCache.size > this.serializationCacheSize) {
        const firstKey = this.serializationCache.keys().next().value;
        this.serializationCache.delete(firstKey);
      }
      
      console.log(`⚡ Serialized message in ${serializationTime.toFixed(2)}ms (cached)`);
    }
    
    // Broadcast to all connections
    let successfulBroadcasts = 0;
    const failedConnections = [];
    
    for (const connection of allConnections) {
      try {
        connection.write(serializedData);
        successfulBroadcasts++;
      } catch (error) {
        failedConnections.push(connection);
        console.error(`❌ Broadcast failed for connection:`, error.message);
      }
    }
    
    // Clean up failed connections
    for (const failedConnection of failedConnections) {
      instanceConnections.delete(failedConnection);
      this.generalConnections.delete(failedConnection);
    }
    
    const latency = performance.now() - startTime;
    
    // Update metrics
    this.metrics.totalBroadcasts++;
    if (successfulBroadcasts > 0) {
      this.metrics.successfulDeliveries++;
    }
    this.metrics.averageLatency = (this.metrics.averageLatency + latency) / 2;
    
    // Track performance with analyzer
    this.analyzer.recordBroadcastMetrics(instanceId, {
      totalConnections: allConnections.size,
      successfulConnections: successfulBroadcasts,
      serializationTime: 0, // Cached, so effectively 0
      latency,
      messageType: message.type
    });
    
    console.log(`📊 Broadcast complete: ${successfulBroadcasts}/${allConnections.size} successful (${latency.toFixed(2)}ms)`);
    
    return successfulBroadcasts;
  }

  /**
   * BATCHED BROADCASTING for high-frequency messages
   */
  scheduleBatchedBroadcast(instanceId, message) {
    if (!this.batchTimer.has(instanceId)) {
      // Start batch timer
      const timer = setTimeout(() => {
        this.flushBatchedMessages(instanceId);
      }, this.batchDelay);
      
      this.batchTimer.set(instanceId, {
        timer,
        messages: [message]
      });
    } else {
      // Add to existing batch
      const batch = this.batchTimer.get(instanceId);
      batch.messages.push(message);
    }
  }

  flushBatchedMessages(instanceId) {
    const batch = this.batchTimer.get(instanceId);
    if (!batch) return;
    
    this.batchTimer.delete(instanceId);
    
    // Combine messages into a single broadcast
    const combinedMessage = {
      type: 'batch',
      messages: batch.messages,
      count: batch.messages.length,
      timestamp: Date.now()
    };
    
    this.broadcastToConnections(instanceId, combinedMessage);
    
    console.log(`📦 Flushed batch of ${batch.messages.length} messages for ${instanceId}`);
  }

  /**
   * ENHANCED MESSAGE PROCESSING for Claude responses
   */
  broadcastClaudeResponse(instanceId, responseData, metadata = {}) {
    // Track response generation for race condition analysis
    this.analyzer.trackConnectionEvent(instanceId, 'response_ready', {
      responseLength: responseData.length,
      metadata
    });
    
    const message = {
      type: 'claude:response',
      data: responseData,
      instanceId,
      timestamp: Date.now(),
      metadata: {
        ...metadata,
        priority: 'high', // Claude responses are high priority
        retryable: true
      }
    };
    
    // Use immediate broadcast with queuing fallback
    const delivered = this.broadcastToConnections(instanceId, message, true);
    
    if (delivered === 0) {
      console.log(`🎯 Claude response queued for ${instanceId} - will deliver when frontend connects`);
    } else {
      console.log(`🎯 Claude response delivered immediately to ${delivered} connections for ${instanceId}`);
    }
    
    return delivered;
  }

  /**
   * UTILITY FUNCTIONS
   */
  hashMessage(message) {
    // Simple hash for message deduplication
    const str = JSON.stringify({
      type: message.type,
      data: message.data?.slice?.(0, 100) || message.data, // First 100 chars for content
      instanceId: message.instanceId
    });
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString();
  }

  getConnectionCount(instanceId) {
    const instanceConnections = this.connections.get(instanceId) || new Set();
    return {
      instance: instanceConnections.size,
      general: this.generalConnections.size,
      total: instanceConnections.size + this.generalConnections.size
    };
  }

  getQueueStatus(instanceId) {
    const queue = this.messageQueue.get(instanceId) || [];
    return {
      queueSize: queue.length,
      oldestMessage: queue[0]?.timestamp || null,
      newestMessage: queue[queue.length - 1]?.timestamp || null
    };
  }

  cleanup() {
    const now = Date.now();
    const staleThreshold = 300000; // 5 minutes
    
    // Clean up old queued messages
    for (const [instanceId, queue] of this.messageQueue) {
      const freshMessages = queue.filter(msg => 
        now - msg.timestamp < staleThreshold
      );
      
      if (freshMessages.length !== queue.length) {
        this.messageQueue.set(instanceId, freshMessages);
        console.log(`🧹 Cleaned ${queue.length - freshMessages.length} stale messages for ${instanceId}`);
      }
    }
    
    // Clean serialization cache
    this.serializationCache.clear();
    
    console.log('🧹 Broadcaster cleanup completed');
  }

  logPerformanceMetrics() {
    console.log('📊 SSE Broadcaster Performance Metrics:', {
      ...this.metrics,
      activeConnections: this.connections.size,
      generalConnections: this.generalConnections.size,
      totalQueued: Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
      cacheHitRate: this.serializationCache.size > 0 ? 
        ((this.metrics.totalBroadcasts - this.serializationCache.size) / this.metrics.totalBroadcasts * 100).toFixed(2) + '%' : '0%'
    });
  }

  // Export for integration with existing backend
  createLegacyBroadcastFunction() {
    return (instanceId, message) => {
      return this.broadcastToConnections(instanceId, message, true);
    };
  }

  // Export enhanced broadcast for Claude responses
  createClaudeBroadcastFunction() {
    return (instanceId, responseData, metadata) => {
      return this.broadcastClaudeResponse(instanceId, responseData, metadata);
    };
  }
}

export { OptimizedSSEBroadcaster };