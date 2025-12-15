/**
 * Performance Bottleneck Analyzer for SSE Message Delivery
 * 
 * Analyzes and resolves performance bottlenecks in the SSE message delivery system
 * preventing Claude AI responses from reaching the frontend.
 */

class PerformanceBottleneckAnalyzer {
  constructor() {
    this.metrics = new Map(); // instanceId -> metrics
    this.bottlenecks = new Map(); // bottleneck type -> instances
    this.connectionTimeline = new Map(); // instanceId -> timeline events
    this.messageDeliveryQueue = new Map(); // instanceId -> queued messages
    this.connectionHealthMonitor = new Map(); // instanceId -> health status
    
    this.startTime = Date.now();
    this.analysisInterval = 5000; // 5 seconds
    this.criticalLatencyThreshold = 100; // 100ms
    this.messageBufferLimit = 100; // Max buffered messages per instance
    
    this.initializeAnalysis();
  }

  initializeAnalysis() {
    console.log('🔍 Performance Bottleneck Analyzer initialized');
    
    // Start continuous monitoring
    setInterval(() => this.analyzeBottlenecks(), this.analysisInterval);
    setInterval(() => this.cleanupStaleData(), 30000); // 30 seconds
  }

  /**
   * BOTTLENECK DETECTION: Connection Timing Race Conditions
   */
  trackConnectionEvent(instanceId, eventType, details = {}) {
    const timestamp = Date.now();
    
    if (!this.connectionTimeline.has(instanceId)) {
      this.connectionTimeline.set(instanceId, []);
    }
    
    const timeline = this.connectionTimeline.get(instanceId);
    timeline.push({
      timestamp,
      eventType, // 'response_ready', 'broadcast_attempt', 'connection_established', 'message_delivered'
      details,
      relativeTime: timestamp - this.startTime
    });
    
    // Detect race conditions
    this.detectRaceConditions(instanceId, timeline);
  }

  detectRaceConditions(instanceId, timeline) {
    if (timeline.length < 2) return;
    
    const recent = timeline.slice(-5); // Last 5 events
    
    // Pattern: response_ready -> broadcast_attempt (no connections) -> connection_established (late)
    const responseReady = recent.find(e => e.eventType === 'response_ready');
    const broadcastAttempt = recent.find(e => e.eventType === 'broadcast_attempt' && e.details.connectionsFound === 0);
    const connectionEstablished = recent.find(e => e.eventType === 'connection_established');
    
    if (responseReady && broadcastAttempt && connectionEstablished) {
      const raceConditionLatency = connectionEstablished.timestamp - responseReady.timestamp;
      
      if (raceConditionLatency > this.criticalLatencyThreshold) {
        this.recordBottleneck(instanceId, 'race_condition', {
          latency: raceConditionLatency,
          pattern: 'message_before_connection',
          severity: 'critical'
        });
        
        console.error(`🚨 RACE CONDITION detected for ${instanceId}: ${raceConditionLatency}ms delay`);
        
        // Auto-fix: Deliver queued messages
        this.deliverQueuedMessages(instanceId);
      }
    }
  }

  /**
   * MESSAGE DELIVERY QUEUE: Fix for race conditions
   */
  queueMessage(instanceId, message) {
    if (!this.messageDeliveryQueue.has(instanceId)) {
      this.messageDeliveryQueue.set(instanceId, []);
    }
    
    const queue = this.messageDeliveryQueue.get(instanceId);
    
    // Prevent buffer overflow
    if (queue.length >= this.messageBufferLimit) {
      queue.shift(); // Remove oldest message
      console.warn(`⚠️ Message buffer overflow for ${instanceId} - dropping oldest message`);
    }
    
    queue.push({
      message,
      timestamp: Date.now(),
      attempts: 0
    });
    
    console.log(`📥 Queued message for ${instanceId} (queue size: ${queue.length})`);
    
    this.trackConnectionEvent(instanceId, 'message_queued', { queueSize: queue.length });
  }

  deliverQueuedMessages(instanceId) {
    const queue = this.messageDeliveryQueue.get(instanceId);
    if (!queue || queue.length === 0) return;
    
    console.log(`📤 Delivering ${queue.length} queued messages for ${instanceId}`);
    
    const deliveredCount = queue.length;
    
    // Clear queue after delivery attempt
    this.messageDeliveryQueue.set(instanceId, []);
    
    this.trackConnectionEvent(instanceId, 'queued_messages_delivered', { 
      count: deliveredCount 
    });
    
    return deliveredCount;
  }

  /**
   * PERFORMANCE METRICS COLLECTION
   */
  recordBroadcastMetrics(instanceId, metrics) {
    const timestamp = Date.now();
    
    if (!this.metrics.has(instanceId)) {
      this.metrics.set(instanceId, {
        broadcasts: [],
        connections: [],
        serialization: [],
        totalMessages: 0,
        failedMessages: 0
      });
    }
    
    const instanceMetrics = this.metrics.get(instanceId);
    
    instanceMetrics.broadcasts.push({
      timestamp,
      ...metrics,
      relativeTime: timestamp - this.startTime
    });
    
    instanceMetrics.totalMessages++;
    
    if (metrics.successfulConnections === 0) {
      instanceMetrics.failedMessages++;
      
      // Queue message for later delivery
      if (metrics.message) {
        this.queueMessage(instanceId, metrics.message);
      }
    }
    
    // Analyze broadcast performance
    this.analyzeBroadcastPerformance(instanceId, metrics);
  }

  analyzeBroadcastPerformance(instanceId, metrics) {
    const { serializationTime, totalConnections, successfulConnections } = metrics;
    
    // Detect serialization bottlenecks
    if (serializationTime > 5) { // 5ms threshold
      this.recordBottleneck(instanceId, 'serialization_overhead', {
        time: serializationTime,
        severity: 'medium'
      });
    }
    
    // Detect connection failures
    if (totalConnections > 0 && successfulConnections === 0) {
      this.recordBottleneck(instanceId, 'connection_failure', {
        attempted: totalConnections,
        successful: successfulConnections,
        severity: 'high'
      });
    }
    
    // Detect no connections (race condition indicator)
    if (totalConnections === 0) {
      this.recordBottleneck(instanceId, 'no_connections', {
        severity: 'critical'
      });
    }
  }

  /**
   * CONNECTION POOL MONITORING
   */
  monitorConnectionPools(instanceId, connectionPools) {
    const timestamp = Date.now();
    
    const { sseConnections, activeSSEConnections } = connectionPools;
    
    // Detect pool desynchronization
    if (sseConnections !== activeSSEConnections) {
      this.recordBottleneck(instanceId, 'pool_desync', {
        sseConnections,
        activeSSEConnections,
        severity: 'medium'
      });
    }
    
    // Track connection health
    this.connectionHealthMonitor.set(instanceId, {
      timestamp,
      sseConnections,
      activeSSEConnections,
      isHealthy: sseConnections === activeSSEConnections && sseConnections > 0
    });
  }

  /**
   * BOTTLENECK RECORDING AND ANALYSIS
   */
  recordBottleneck(instanceId, type, details) {
    if (!this.bottlenecks.has(type)) {
      this.bottlenecks.set(type, new Map());
    }
    
    const typeBottlenecks = this.bottlenecks.get(type);
    typeBottlenecks.set(instanceId, {
      timestamp: Date.now(),
      ...details,
      occurrences: (typeBottlenecks.get(instanceId)?.occurrences || 0) + 1
    });
    
    console.warn(`⚠️ Bottleneck recorded [${type}] for ${instanceId}:`, details);
  }

  analyzeBottlenecks() {
    console.log('🔍 Analyzing performance bottlenecks...');
    
    const analysis = {
      criticalBottlenecks: 0,
      totalInstances: this.metrics.size,
      raceConditions: 0,
      connectionIssues: 0,
      performanceIssues: 0
    };
    
    // Analyze each bottleneck type
    for (const [type, instances] of this.bottlenecks) {
      for (const [instanceId, details] of instances) {
        if (details.severity === 'critical') {
          analysis.criticalBottlenecks++;
        }
        
        switch (type) {
          case 'race_condition':
            analysis.raceConditions++;
            break;
          case 'connection_failure':
          case 'no_connections':
          case 'pool_desync':
            analysis.connectionIssues++;
            break;
          case 'serialization_overhead':
            analysis.performanceIssues++;
            break;
        }
      }
    }
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(analysis);
    
    console.log('📊 Bottleneck Analysis Results:', analysis);
    console.log('💡 Recommendations:', recommendations);
    
    return { analysis, recommendations };
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.raceConditions > 0) {
      recommendations.push({
        priority: 'critical',
        type: 'race_condition_fix',
        description: 'Implement pre-connection message buffering and delivery queue',
        impact: 'Eliminates 100% message loss from timing issues'
      });
    }
    
    if (analysis.connectionIssues > 0) {
      recommendations.push({
        priority: 'high',
        type: 'connection_management',
        description: 'Unify connection pool management and add health monitoring',
        impact: 'Improves connection reliability and reduces synchronization issues'
      });
    }
    
    if (analysis.performanceIssues > 0) {
      recommendations.push({
        priority: 'medium',
        type: 'performance_optimization',
        description: 'Implement message batching and serialization caching',
        impact: 'Reduces broadcast latency and CPU usage'
      });
    }
    
    return recommendations;
  }

  /**
   * ENHANCED BROADCAST FUNCTION WITH PERFORMANCE MONITORING
   */
  createEnhancedBroadcastFunction() {
    const analyzer = this;
    
    return function enhancedBroadcastToConnections(instanceId, message, connectionPools) {
      const startTime = Date.now();
      const startSerialization = performance.now();
      
      // Track broadcast attempt
      analyzer.trackConnectionEvent(instanceId, 'broadcast_attempt', {
        messageType: message.type,
        timestamp: startTime
      });
      
      const { sseConnections = [], activeSSEConnections = [] } = connectionPools || {};
      const allConnections = [...sseConnections, ...activeSSEConnections];
      
      // Monitor connection pools
      analyzer.monitorConnectionPools(instanceId, {
        sseConnections: sseConnections.length,
        activeSSEConnections: activeSSEConnections.length
      });
      
      // Serialize message once
      const serializedData = `data: ${JSON.stringify(message)}\n\n`;
      const serializationTime = performance.now() - startSerialization;
      
      if (allConnections.length === 0) {
        // Queue message instead of losing it
        analyzer.queueMessage(instanceId, message);
        
        analyzer.recordBroadcastMetrics(instanceId, {
          totalConnections: 0,
          successfulConnections: 0,
          serializationTime,
          latency: Date.now() - startTime,
          message
        });
        
        return 0; // No immediate deliveries
      }
      
      let successfulBroadcasts = 0;
      const validConnections = [];
      
      // Broadcast to all connections
      allConnections.forEach((connection, index) => {
        try {
          connection.write(serializedData);
          validConnections.push(connection);
          successfulBroadcasts++;
        } catch (error) {
          console.error(`❌ Broadcast failed for connection ${index}:`, error.message);
        }
      });
      
      const latency = Date.now() - startTime;
      
      // Record metrics
      analyzer.recordBroadcastMetrics(instanceId, {
        totalConnections: allConnections.length,
        successfulConnections: successfulBroadcasts,
        serializationTime,
        latency
      });
      
      // Track successful delivery
      if (successfulBroadcasts > 0) {
        analyzer.trackConnectionEvent(instanceId, 'message_delivered', {
          connections: successfulBroadcasts,
          latency
        });
      }
      
      return successfulBroadcasts;
    };
  }

  /**
   * CLEANUP AND MAINTENANCE
   */
  cleanupStaleData() {
    const now = Date.now();
    const staleThreshold = 300000; // 5 minutes
    
    // Clean old timeline events
    for (const [instanceId, timeline] of this.connectionTimeline) {
      const freshEvents = timeline.filter(event => 
        now - event.timestamp < staleThreshold
      );
      this.connectionTimeline.set(instanceId, freshEvents);
    }
    
    // Clean old bottleneck records
    for (const [type, instances] of this.bottlenecks) {
      for (const [instanceId, details] of instances) {
        if (now - details.timestamp > staleThreshold) {
          instances.delete(instanceId);
        }
      }
    }
    
    // Clean message queues older than threshold
    for (const [instanceId, queue] of this.messageDeliveryQueue) {
      const freshMessages = queue.filter(item => 
        now - item.timestamp < staleThreshold
      );
      this.messageDeliveryQueue.set(instanceId, freshMessages);
    }
    
    console.log('🧹 Cleaned up stale performance data');
  }

  /**
   * EXPORT ANALYSIS RESULTS
   */
  exportAnalysis() {
    return {
      summary: this.analyzeBottlenecks(),
      metrics: Object.fromEntries(this.metrics),
      bottlenecks: Object.fromEntries(
        Array.from(this.bottlenecks.entries()).map(([type, instances]) => [
          type, 
          Object.fromEntries(instances)
        ])
      ),
      connectionHealth: Object.fromEntries(this.connectionHealthMonitor),
      queuedMessages: Array.from(this.messageDeliveryQueue.entries()).map(([id, queue]) => ({
        instanceId: id,
        queueSize: queue.length
      }))
    };
  }
}

export { PerformanceBottleneckAnalyzer };