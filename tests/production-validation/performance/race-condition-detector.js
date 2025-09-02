/**
 * Race Condition Detection System
 * Identifies race conditions in concurrent operations
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');

class RaceConditionDetector extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      concurrencyLevel: config.concurrencyLevel || 10,
      operationTimeout: config.operationTimeout || 5000,
      detectionSensitivity: config.detectionSensitivity || 0.1, // 10ms threshold
      maxRetries: config.maxRetries || 3,
      wsUrl: config.wsUrl || 'ws://localhost:3001',
      ...config
    };
    
    this.raceConditions = [];
    this.operationResults = [];
    this.timingAnalysis = [];
  }

  async detectRaceConditions() {
    const testId = `race-detection-${Date.now()}`;
    console.log(`⚡ Starting race condition detection: ${testId}`);
    
    const results = {
      testId,
      timestamp: new Date().toISOString(),
      success: true,
      scenarios: []
    };

    try {
      // Scenario 1: Concurrent Connection Attempts
      const connectionRaces = await this.detectConnectionRaces();
      results.scenarios.push({ name: 'concurrent_connections', ...connectionRaces });

      // Scenario 2: Simultaneous Message Sending
      const messageRaces = await this.detectMessageRaces();
      results.scenarios.push({ name: 'simultaneous_messaging', ...messageRaces });

      // Scenario 3: Connection State Race Conditions
      const stateRaces = await this.detectStateRaces();
      results.scenarios.push({ name: 'state_transitions', ...stateRaces });

      // Scenario 4: Resource Access Race Conditions
      const resourceRaces = await this.detectResourceRaces();
      results.scenarios.push({ name: 'resource_access', ...resourceRaces });

      // Scenario 5: Cleanup Race Conditions
      const cleanupRaces = await this.detectCleanupRaces();
      results.scenarios.push({ name: 'cleanup_operations', ...cleanupRaces });

      results.success = results.scenarios.every(scenario => !scenario.raceDetected);
      results.totalRaceConditions = this.raceConditions.length;
      results.raceConditions = this.raceConditions;

      return results;

    } catch (error) {
      console.error(`❌ Race condition detection failed: ${error.message}`);
      return {
        ...results,
        success: false,
        error: error.message
      };
    }
  }

  async detectConnectionRaces() {
    console.log('🔌 Testing concurrent connection race conditions...');
    
    const connections = [];
    const timings = [];
    const startTime = Date.now();

    // Create multiple simultaneous connections
    const promises = Array.from({ length: this.config.concurrencyLevel }, (_, index) => {
      return this.createTimedConnection(`conn-${index}`, timings);
    });

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();

    // Analyze timing patterns for race conditions
    const connectionTimes = timings.map(t => t.connectionTime).filter(t => t !== null);
    const raceAnalysis = this.analyzeTimingPatterns(connectionTimes, 'connection');

    const successful = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length;

    // Check for unexpected connection failures that might indicate races
    const unexpectedFailures = results.filter(r => 
      r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
    );

    if (unexpectedFailures.length > this.config.concurrencyLevel * 0.1) { // More than 10% failure
      this.recordRaceCondition('connection_establishment', {
        failureRate: (unexpectedFailures.length / this.config.concurrencyLevel) * 100,
        failures: unexpectedFailures.map(f => f.reason || f.value.error),
        timingPattern: raceAnalysis
      });
    }

    return {
      raceDetected: raceAnalysis.raceConditionLikely,
      successful,
      failed: this.config.concurrencyLevel - successful,
      timingAnalysis: raceAnalysis,
      duration: endTime - startTime
    };
  }

  async createTimedConnection(connectionId, timings) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const ws = new WebSocket(this.config.wsUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        timings.push({
          connectionId,
          connectionTime: null,
          timedOut: true,
          duration: Date.now() - startTime
        });
        resolve({ success: false, error: 'Connection timeout' });
      }, this.config.operationTimeout);

      ws.on('open', () => {
        clearTimeout(timeout);
        const connectionTime = Date.now() - startTime;
        
        timings.push({
          connectionId,
          connectionTime,
          timedOut: false,
          duration: connectionTime
        });

        ws.close();
        resolve({ success: true, connectionId, connectionTime });
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        timings.push({
          connectionId,
          connectionTime: null,
          timedOut: false,
          error: error.message,
          duration: Date.now() - startTime
        });
        resolve({ success: false, error: error.message });
      });
    });
  }

  async detectMessageRaces() {
    console.log('💬 Testing simultaneous message race conditions...');
    
    const ws = new WebSocket(this.config.wsUrl);
    const messageResults = [];
    const messageTimes = [];

    return new Promise((resolve) => {
      ws.on('open', () => {
        const messagePromises = [];
        const startTime = Date.now();

        // Send multiple messages simultaneously
        for (let i = 0; i < this.config.concurrencyLevel; i++) {
          const promise = this.sendTimedMessage(ws, i, messageTimes);
          messagePromises.push(promise);
        }

        Promise.allSettled(messagePromises).then(results => {
          // Analyze message delivery patterns
          const deliveryTimes = messageTimes.map(t => t.deliveryTime).filter(t => t !== null);
          const raceAnalysis = this.analyzeTimingPatterns(deliveryTimes, 'message_delivery');

          // Check for message ordering issues
          const orderingIssues = this.detectMessageOrderingIssues(messageTimes);

          ws.close();
          
          resolve({
            raceDetected: raceAnalysis.raceConditionLikely || orderingIssues.length > 0,
            messagesSuccessful: results.filter(r => r.status === 'fulfilled').length,
            messagesFailed: results.filter(r => r.status === 'rejected').length,
            orderingIssues,
            timingAnalysis: raceAnalysis,
            duration: Date.now() - startTime
          });
        });
      });

      ws.on('error', (error) => {
        resolve({
          raceDetected: false,
          error: error.message
        });
      });
    });
  }

  async sendTimedMessage(ws, messageIndex, timings) {
    return new Promise((resolve) => {
      const sendTime = Date.now();
      const message = {
        type: 'race_test',
        index: messageIndex,
        timestamp: sendTime
      };

      // Add response listener
      const responseHandler = (data) => {
        try {
          const response = JSON.parse(data);
          if (response.index === messageIndex) {
            const deliveryTime = Date.now() - sendTime;
            timings.push({
              messageIndex,
              sendTime,
              deliveryTime,
              responseReceived: true
            });
            ws.removeListener('message', responseHandler);
            resolve({ success: true, messageIndex, deliveryTime });
          }
        } catch (error) {
          // Ignore parsing errors for this specific message
        }
      };

      ws.on('message', responseHandler);

      // Send message
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        timings.push({
          messageIndex,
          sendTime,
          deliveryTime: null,
          error: error.message
        });
        resolve({ success: false, error: error.message });
      }

      // Timeout handler
      setTimeout(() => {
        ws.removeListener('message', responseHandler);
        if (!timings.find(t => t.messageIndex === messageIndex)) {
          timings.push({
            messageIndex,
            sendTime,
            deliveryTime: null,
            timedOut: true
          });
        }
        resolve({ success: false, error: 'Response timeout' });
      }, this.config.operationTimeout);
    });
  }

  detectMessageOrderingIssues(messageTimes) {
    const issues = [];
    
    // Sort by send time and check if responses came back in order
    const sortedBySend = messageTimes
      .filter(t => t.deliveryTime !== null)
      .sort((a, b) => a.sendTime - b.sendTime);

    for (let i = 1; i < sortedBySend.length; i++) {
      const current = sortedBySend[i];
      const previous = sortedBySend[i - 1];
      
      // If earlier sent message has longer delivery time, it might be out of order
      if (current.deliveryTime < previous.deliveryTime - this.config.detectionSensitivity * 1000) {
        issues.push({
          type: 'out_of_order_delivery',
          earlierMessage: previous.messageIndex,
          laterMessage: current.messageIndex,
          timeDifference: previous.deliveryTime - current.deliveryTime
        });
      }
    }

    return issues;
  }

  async detectStateRaces() {
    console.log('🔄 Testing state transition race conditions...');
    
    const stateTransitions = [];
    const connections = [];

    // Create multiple connections that will transition states simultaneously
    const promises = Array.from({ length: Math.min(5, this.config.concurrencyLevel) }, (_, index) => {
      return this.testConcurrentStateTransitions(`state-${index}`, stateTransitions);
    });

    const results = await Promise.allSettled(promises);
    
    // Analyze state transition patterns
    const raceAnalysis = this.analyzeStateTransitionRaces(stateTransitions);
    
    return {
      raceDetected: raceAnalysis.raceConditionLikely,
      stateTransitions: stateTransitions.length,
      conflicts: raceAnalysis.conflicts,
      timingAnalysis: raceAnalysis
    };
  }

  async testConcurrentStateTransitions(connectionId, stateTransitions) {
    return new Promise((resolve) => {
      const ws = new WebSocket(this.config.wsUrl);
      const states = [];
      
      // Track state changes
      const recordState = (state, event) => {
        const timestamp = Date.now();
        states.push({ connectionId, state, event, timestamp });
        stateTransitions.push({ connectionId, state, event, timestamp });
      };

      ws.on('connecting', () => recordState('connecting', 'connecting'));
      ws.on('open', () => {
        recordState('open', 'open');
        
        // Rapidly transition states
        setTimeout(() => ws.close(), 100);
      });
      ws.on('closing', () => recordState('closing', 'closing'));
      ws.on('close', () => {
        recordState('closed', 'close');
        resolve({ success: true, connectionId, states });
      });
      ws.on('error', (error) => {
        recordState('error', 'error');
        resolve({ success: false, connectionId, error: error.message });
      });
    });
  }

  analyzeStateTransitionRaces(transitions) {
    const conflicts = [];
    const groupedByTime = {};
    
    // Group transitions by time windows
    transitions.forEach(transition => {
      const timeWindow = Math.floor(transition.timestamp / 100) * 100; // 100ms windows
      if (!groupedByTime[timeWindow]) groupedByTime[timeWindow] = [];
      groupedByTime[timeWindow].push(transition);
    });

    // Look for simultaneous conflicting state transitions
    Object.entries(groupedByTime).forEach(([timeWindow, windowTransitions]) => {
      if (windowTransitions.length > 1) {
        const conflictingStates = windowTransitions.filter((t, i, arr) => 
          arr.some(other => other.connectionId === t.connectionId && other.state !== t.state)
        );
        
        if (conflictingStates.length > 0) {
          conflicts.push({
            timeWindow: parseInt(timeWindow),
            conflictingTransitions: conflictingStates
          });
        }
      }
    });

    return {
      raceConditionLikely: conflicts.length > 0,
      conflicts,
      simultaneousTransitions: Object.values(groupedByTime).filter(w => w.length > 1).length
    };
  }

  async detectResourceRaces() {
    console.log('📦 Testing resource access race conditions...');
    
    // Simulate concurrent access to shared resources
    const resourceAccess = [];
    const promises = [];

    for (let i = 0; i < this.config.concurrencyLevel; i++) {
      promises.push(this.testResourceAccess(`resource-${i}`, resourceAccess));
    }

    const results = await Promise.allSettled(promises);
    
    // Analyze resource access patterns
    const accessConflicts = this.analyzeResourceAccessPatterns(resourceAccess);
    
    return {
      raceDetected: accessConflicts.conflicts.length > 0,
      resourceAccesses: resourceAccess.length,
      conflicts: accessConflicts.conflicts,
      successRate: (results.filter(r => r.status === 'fulfilled').length / results.length) * 100
    };
  }

  async testResourceAccess(resourceId, accessLog) {
    return new Promise((resolve) => {
      const ws = new WebSocket(this.config.wsUrl);
      
      ws.on('open', () => {
        const accessStart = Date.now();
        
        // Request exclusive resource access
        ws.send(JSON.stringify({
          type: 'resource_request',
          resourceId: 'shared_resource_1',
          clientId: resourceId,
          timestamp: accessStart
        }));

        accessLog.push({
          resourceId,
          action: 'request',
          timestamp: accessStart
        });

        // Simulate resource usage
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'resource_release',
            resourceId: 'shared_resource_1',
            clientId: resourceId
          }));

          accessLog.push({
            resourceId,
            action: 'release',
            timestamp: Date.now()
          });

          ws.close();
          resolve({ success: true, resourceId });
        }, 500);
      });

      ws.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
    });
  }

  analyzeResourceAccessPatterns(accessLog) {
    const conflicts = [];
    const resourceRequests = accessLog.filter(a => a.action === 'request');
    const resourceReleases = accessLog.filter(a => a.action === 'release');

    // Check for overlapping access periods
    resourceRequests.forEach(request => {
      const correspondingRelease = resourceReleases.find(r => 
        r.resourceId === request.resourceId && r.timestamp > request.timestamp
      );

      if (correspondingRelease) {
        // Check if any other requests occurred during this access period
        const overlappingRequests = resourceRequests.filter(other => 
          other.resourceId !== request.resourceId &&
          other.timestamp >= request.timestamp &&
          other.timestamp <= correspondingRelease.timestamp
        );

        if (overlappingRequests.length > 0) {
          conflicts.push({
            originalRequest: request,
            overlappingRequests,
            potentialRaceCondition: true
          });
        }
      }
    });

    return { conflicts };
  }

  async detectCleanupRaces() {
    console.log('🧹 Testing cleanup race conditions...');
    
    const cleanupResults = [];
    const promises = [];

    // Create connections and immediately close them to test cleanup races
    for (let i = 0; i < this.config.concurrencyLevel; i++) {
      promises.push(this.testCleanupRace(`cleanup-${i}`, cleanupResults));
    }

    const results = await Promise.allSettled(promises);
    
    // Analyze cleanup timing
    const cleanupAnalysis = this.analyzeCleanupPatterns(cleanupResults);
    
    return {
      raceDetected: cleanupAnalysis.raceConditionLikely,
      cleanupOperations: cleanupResults.length,
      timingAnalysis: cleanupAnalysis
    };
  }

  async testCleanupRace(testId, cleanupResults) {
    return new Promise((resolve) => {
      const ws = new WebSocket(this.config.wsUrl);
      const startTime = Date.now();
      
      ws.on('open', () => {
        // Immediately close to test cleanup
        const closeTime = Date.now();
        ws.close();
        
        cleanupResults.push({
          testId,
          openTime: closeTime - startTime,
          closeInitiated: closeTime
        });
      });

      ws.on('close', () => {
        const closeCompleteTime = Date.now();
        const existing = cleanupResults.find(r => r.testId === testId);
        if (existing) {
          existing.closeCompleted = closeCompleteTime;
          existing.cleanupDuration = closeCompleteTime - existing.closeInitiated;
        }
        resolve({ success: true, testId });
      });

      ws.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
    });
  }

  analyzeCleanupPatterns(cleanupResults) {
    const cleanupTimes = cleanupResults
      .filter(r => r.cleanupDuration !== undefined)
      .map(r => r.cleanupDuration);

    if (cleanupTimes.length === 0) {
      return { raceConditionLikely: false, reason: 'no_cleanup_data' };
    }

    const raceAnalysis = this.analyzeTimingPatterns(cleanupTimes, 'cleanup');
    
    return {
      raceConditionLikely: raceAnalysis.raceConditionLikely,
      averageCleanupTime: cleanupTimes.reduce((a, b) => a + b, 0) / cleanupTimes.length,
      cleanupTimeVariance: raceAnalysis.variance
    };
  }

  analyzeTimingPatterns(timings, operation) {
    if (timings.length < 2) {
      return { raceConditionLikely: false, reason: 'insufficient_data' };
    }

    const sorted = timings.sort((a, b) => a - b);
    const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const variance = sorted.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / sorted.length;
    const stdDev = Math.sqrt(variance);
    
    // High variance might indicate race conditions
    const coefficientOfVariation = stdDev / mean;
    
    // Check for unusual timing patterns
    const outliers = sorted.filter(time => Math.abs(time - mean) > 2 * stdDev);
    const hasUnusualPattern = coefficientOfVariation > 0.5 || outliers.length > sorted.length * 0.1;

    if (hasUnusualPattern) {
      this.recordRaceCondition(`timing_anomaly_${operation}`, {
        mean,
        variance,
        standardDeviation: stdDev,
        coefficientOfVariation,
        outliers: outliers.length,
        pattern: 'high_variance_detected'
      });
    }

    return {
      raceConditionLikely: hasUnusualPattern,
      mean,
      variance,
      standardDeviation: stdDev,
      coefficientOfVariation,
      outliers: outliers.length
    };
  }

  recordRaceCondition(type, details) {
    const raceCondition = {
      type,
      timestamp: Date.now(),
      details,
      severity: this.calculateSeverity(type, details)
    };
    
    this.raceConditions.push(raceCondition);
    console.warn(`⚠️  Race condition detected: ${type}`, details);
    this.emit('raceCondition', raceCondition);
  }

  calculateSeverity(type, details) {
    // Basic severity calculation based on type and impact
    if (type.includes('connection') && details.failureRate > 50) return 'high';
    if (type.includes('message') && details.orderingIssues?.length > 5) return 'high';
    if (type.includes('state') && details.conflicts?.length > 0) return 'medium';
    if (type.includes('timing') && details.coefficientOfVariation > 1) return 'medium';
    return 'low';
  }

  getRaceConditionSummary() {
    const summary = {
      totalRaceConditions: this.raceConditions.length,
      bySeverity: this.raceConditions.reduce((acc, race) => {
        acc[race.severity] = (acc[race.severity] || 0) + 1;
        return acc;
      }, {}),
      byType: this.raceConditions.reduce((acc, race) => {
        acc[race.type] = (acc[race.type] || 0) + 1;
        return acc;
      }, {}),
      mostRecentRace: this.raceConditions.length > 0 
        ? this.raceConditions[this.raceConditions.length - 1] 
        : null
    };

    return summary;
  }

  generateRaceConditionReport() {
    return {
      summary: this.getRaceConditionSummary(),
      detailedResults: this.raceConditions,
      recommendations: this.generateRecommendations()
    };
  }

  generateRecommendations() {
    const recommendations = [];
    const summary = this.getRaceConditionSummary();

    if (summary.bySeverity.high > 0) {
      recommendations.push({
        priority: 'high',
        category: 'critical_race_conditions',
        message: 'High-severity race conditions detected requiring immediate attention',
        actions: [
          'Review connection establishment logic',
          'Implement proper synchronization mechanisms',
          'Add connection state locking',
          'Consider connection pooling'
        ]
      });
    }

    if (summary.byType.timing_anomaly_connection) {
      recommendations.push({
        priority: 'medium',
        category: 'connection_timing',
        message: 'Connection timing anomalies suggest potential race conditions',
        actions: [
          'Implement connection queuing',
          'Add retry mechanisms with backoff',
          'Review server-side connection handling'
        ]
      });
    }

    if (summary.byType.out_of_order_delivery) {
      recommendations.push({
        priority: 'medium',
        category: 'message_ordering',
        message: 'Message ordering issues detected',
        actions: [
          'Implement message sequencing',
          'Add message acknowledgments',
          'Review message handling pipeline'
        ]
      });
    }

    return recommendations;
  }
}

module.exports = { RaceConditionDetector };