/**
 * Failure Pattern Detection and Monitoring System
 * Automatically detects and captures failure patterns in real-time
 */

const EventEmitter = require('events');
const NeuralLearningDatabase = require('../core/nld-database');

class FailurePatternDetector extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.nld = new NeuralLearningDatabase(config.nld);
    this.monitoringActive = false;
    this.detectionThresholds = {
      terminalHang: 5000,        // 5 seconds without response
      protocolMismatch: 3,       // 3 consecutive parse failures
      connectionTimeout: 10000,  // 10 seconds connection timeout
      instanceFailure: 2000     // 2 seconds for instance creation
    };
    
    // Active monitoring state
    this.activeConnections = new Map();
    this.failureCounters = new Map();
    this.detectionHistory = [];
    
    // Pattern triggers
    this.triggerPhrases = [
      'didn\'t work', 'that worked', 'failed', 'broken', 
      'working now', 'hang', 'freeze', 'timeout', 'error'
    ];
  }

  async initialize() {
    await this.nld.initialize();
    this.monitoringActive = true;
    console.log('[NLD-Monitor] Failure detection system active');
    
    // Set up periodic monitoring
    this.startPeriodicMonitoring();
  }

  /**
   * Monitor Claude instance creation attempts
   */
  monitorInstanceCreation(instanceData) {
    const sessionId = instanceData.sessionId || 'unknown';
    const startTime = Date.now();
    
    const timeout = setTimeout(() => {
      this.captureFailure({
        type: 'INSTANCE_CREATION_TIMEOUT',
        category: 'ARCHITECTURE_TRANSITION',
        context: {
          sessionId,
          timeout: this.detectionThresholds.instanceFailure,
          instanceData
        },
        severity: 'HIGH'
      });
    }, this.detectionThresholds.instanceFailure);
    
    this.activeConnections.set(sessionId, {
      type: 'instance_creation',
      startTime,
      timeout,
      data: instanceData
    });
    
    return sessionId;
  }

  /**
   * Monitor terminal communication
   */
  monitorTerminalCommunication(connectionId, messageData) {
    const connection = this.activeConnections.get(connectionId) || {
      type: 'terminal',
      messages: [],
      parseFailures: 0,
      lastActivity: Date.now()
    };
    
    connection.messages.push({
      timestamp: Date.now(),
      data: messageData,
      type: this.classifyMessage(messageData)
    });
    
    // Detect protocol mismatch patterns
    if (this.detectProtocolMismatch(messageData)) {
      connection.parseFailures++;
      
      if (connection.parseFailures >= this.detectionThresholds.protocolMismatch) {
        this.captureFailure({
          type: 'PROTOCOL_MISMATCH',
          category: 'COMMUNICATION_PROTOCOL',
          context: {
            connectionId,
            parseFailures: connection.parseFailures,
            recentMessages: connection.messages.slice(-5),
            detectedPattern: 'Socket.IO vs WebSocket incompatibility'
          },
          severity: 'CRITICAL'
        });
      }
    }
    
    // Detect terminal hang patterns
    const timeSinceActivity = Date.now() - connection.lastActivity;
    if (timeSinceActivity > this.detectionThresholds.terminalHang) {
      this.captureFailure({
        type: 'TERMINAL_HANG',
        category: 'TERMINAL_HANG',
        context: {
          connectionId,
          hangDuration: timeSinceActivity,
          lastMessage: connection.messages[connection.messages.length - 1]
        },
        severity: 'HIGH'
      });
    }
    
    connection.lastActivity = Date.now();
    this.activeConnections.set(connectionId, connection);
  }

  /**
   * Monitor for user feedback indicating success/failure mismatch
   */
  monitorUserFeedback(userInput, context = {}) {
    const input = userInput.toLowerCase();
    const triggerDetected = this.triggerPhrases.find(phrase => input.includes(phrase));
    
    if (triggerDetected) {
      const isSuccessIndication = ['worked', 'working now', 'fixed'].some(term => input.includes(term));
      const isFailureIndication = ['didn\'t work', 'failed', 'broken', 'hang'].some(term => input.includes(term));
      
      if (isFailureIndication) {
        this.captureFailure({
          type: 'USER_REPORTED_FAILURE',
          category: 'USER_INTERACTION',
          context: {
            userFeedback: userInput,
            triggerPhrase: triggerDetected,
            sessionContext: context,
            timestamp: Date.now()
          },
          severity: 'MEDIUM',
          userReported: true
        });
      } else if (isSuccessIndication) {
        this.captureSuccess({
          type: 'USER_CONFIRMED_SUCCESS',
          context: {
            userFeedback: userInput,
            triggerPhrase: triggerDetected,
            sessionContext: context
          }
        });
      }
    }
  }

  /**
   * Monitor resource allocation issues
   */
  monitorResourceAllocation(resourceData) {
    const thresholds = {
      memory: 0.9,    // 90% memory usage
      cpu: 0.95,      // 95% CPU usage
      connections: 100 // 100 concurrent connections
    };
    
    if (resourceData.memoryUsage > thresholds.memory) {
      this.captureFailure({
        type: 'MEMORY_EXHAUSTION',
        category: 'RESOURCE_ALLOCATION',
        context: {
          memoryUsage: resourceData.memoryUsage,
          threshold: thresholds.memory,
          totalMemory: resourceData.totalMemory
        },
        severity: 'HIGH'
      });
    }
    
    if (resourceData.activeConnections > thresholds.connections) {
      this.captureFailure({
        type: 'CONNECTION_LIMIT_EXCEEDED',
        category: 'RESOURCE_ALLOCATION',
        context: {
          activeConnections: resourceData.activeConnections,
          threshold: thresholds.connections
        },
        severity: 'MEDIUM'
      });
    }
  }

  /**
   * Capture failure pattern and store in NLD
   */
  async captureFailure(failureData) {
    const enrichedFailure = {
      ...failureData,
      timestamp: Date.now(),
      detectionSource: 'automated',
      environmentContext: await this.gatherEnvironmentContext(),
      predictionAccuracy: await this.validatePrediction(failureData)
    };
    
    console.log(`[NLD-Monitor] Failure detected: ${failureData.type}`);
    
    try {
      const patternId = await this.nld.storeFailurePattern(enrichedFailure);
      
      this.detectionHistory.push({
        patternId,
        type: failureData.type,
        timestamp: enrichedFailure.timestamp
      });
      
      this.emit('failureDetected', { patternId, failure: enrichedFailure });
      
      // Generate immediate recommendations if critical
      if (failureData.severity === 'CRITICAL') {
        const suggestions = await this.nld.generateFixSuggestions(enrichedFailure);
        this.emit('criticalFailure', { failure: enrichedFailure, suggestions });
      }
      
      return patternId;
    } catch (error) {
      console.error('[NLD-Monitor] Failed to capture failure pattern:', error);
    }
  }

  /**
   * Capture successful resolution patterns
   */
  async captureSuccess(successData) {
    console.log(`[NLD-Monitor] Success pattern captured: ${successData.type}`);
    
    // Update effectiveness of recent failure patterns
    const recentFailures = this.detectionHistory
      .filter(h => Date.now() - h.timestamp < 300000) // Last 5 minutes
      .slice(-3); // Last 3 failures
    
    for (const failure of recentFailures) {
      // Update pattern effectiveness in NLD
      await this.updatePatternEffectiveness(failure.patternId, 0.8);
    }
    
    this.emit('successCaptured', successData);
  }

  /**
   * Classify message types for pattern detection
   */
  classifyMessage(messageData) {
    const data = typeof messageData === 'string' ? messageData : JSON.stringify(messageData);
    const lowercaseData = data.toLowerCase();
    
    if (lowercaseData.includes('42[')) return 'SOCKET_IO_ENGINE';
    if (lowercaseData.includes('websocket')) return 'WEBSOCKET_NATIVE';
    if (lowercaseData.includes('json')) return 'JSON_MESSAGE';
    if (lowercaseData.includes('init')) return 'INITIALIZATION';
    if (lowercaseData.includes('input')) return 'USER_INPUT';
    if (lowercaseData.includes('resize')) return 'TERMINAL_RESIZE';
    
    return 'UNKNOWN';
  }

  /**
   * Detect protocol mismatch patterns
   */
  detectProtocolMismatch(messageData) {
    const data = typeof messageData === 'string' ? messageData : JSON.stringify(messageData);
    
    // Socket.IO Engine.IO format patterns
    const engineIOPatterns = [
      /^4\d\[/, // Socket.IO message format
      /^40$/,   // Socket.IO connect
      /^3probe/, // Socket.IO probe
    ];
    
    // Check if message looks like Engine.IO but fails JSON parsing
    const hasEngineIOFormat = engineIOPatterns.some(pattern => pattern.test(data));
    
    if (hasEngineIOFormat) {
      try {
        JSON.parse(data);
        return false; // Valid JSON, no mismatch
      } catch {
        return true; // Engine.IO format but not valid JSON - mismatch detected
      }
    }
    
    return false;
  }

  /**
   * Gather current environment context
   */
  async gatherEnvironmentContext() {
    return {
      timestamp: Date.now(),
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      activeConnections: this.activeConnections.size,
      pid: process.pid
    };
  }

  /**
   * Validate prediction accuracy
   */
  async validatePrediction(failureData) {
    try {
      const scenario = {
        type: failureData.type,
        context: failureData.context
      };
      
      const predictedProbability = await this.nld.predictFailureProbability(scenario);
      return predictedProbability;
    } catch {
      return 0.5; // Default uncertainty
    }
  }

  /**
   * Update pattern effectiveness based on outcomes
   */
  async updatePatternEffectiveness(patternId, effectiveness) {
    // This would integrate with the NLD to update pattern effectiveness
    console.log(`[NLD-Monitor] Updating pattern ${patternId} effectiveness: ${effectiveness}`);
  }

  /**
   * Start periodic monitoring tasks
   */
  startPeriodicMonitoring() {
    // Check for stale connections every 30 seconds
    setInterval(() => {
      this.checkStaleConnections();
    }, 30000);
    
    // Generate monitoring report every 5 minutes
    setInterval(() => {
      this.generateMonitoringReport();
    }, 300000);
    
    // Cleanup old detection history every hour
    setInterval(() => {
      this.cleanupDetectionHistory();
    }, 3600000);
  }

  /**
   * Check for stale/hanging connections
   */
  checkStaleConnections() {
    const now = Date.now();
    const staleThreshold = 60000; // 1 minute
    
    for (const [connectionId, connection] of this.activeConnections) {
      const timeSinceActivity = now - (connection.lastActivity || connection.startTime || now);
      
      if (timeSinceActivity > staleThreshold) {
        this.captureFailure({
          type: 'STALE_CONNECTION',
          category: 'CONNECTION_MANAGEMENT',
          context: {
            connectionId,
            staleTime: timeSinceActivity,
            connectionType: connection.type
          },
          severity: 'MEDIUM'
        });
        
        // Cleanup stale connection
        if (connection.timeout) {
          clearTimeout(connection.timeout);
        }
        this.activeConnections.delete(connectionId);
      }
    }
  }

  /**
   * Generate periodic monitoring report
   */
  async generateMonitoringReport() {
    const report = {
      timestamp: new Date().toISOString(),
      activeConnections: this.activeConnections.size,
      recentDetections: this.detectionHistory.slice(-10),
      failureCategories: this.categorizeRecentFailures(),
      systemHealth: await this.assessSystemHealth()
    };
    
    console.log('[NLD-Monitor] Monitoring report:', {
      activeConnections: report.activeConnections,
      recentFailures: report.recentDetections.length
    });
    
    this.emit('monitoringReport', report);
  }

  /**
   * Categorize recent failures for analysis
   */
  categorizeRecentFailures() {
    const recent = this.detectionHistory.filter(h => Date.now() - h.timestamp < 3600000); // Last hour
    const categories = {};
    
    for (const failure of recent) {
      categories[failure.type] = (categories[failure.type] || 0) + 1;
    }
    
    return categories;
  }

  /**
   * Assess overall system health
   */
  async assessSystemHealth() {
    const recentFailures = this.detectionHistory.filter(h => Date.now() - h.timestamp < 3600000);
    const criticalFailures = recentFailures.filter(h => h.severity === 'CRITICAL');
    
    let healthScore = 100;
    
    // Deduct points for failures
    healthScore -= recentFailures.length * 2;
    healthScore -= criticalFailures.length * 10;
    
    // Deduct points for stale connections
    healthScore -= this.activeConnections.size * 0.1;
    
    return {
      score: Math.max(0, Math.min(100, healthScore)),
      status: healthScore > 80 ? 'HEALTHY' : healthScore > 50 ? 'DEGRADED' : 'CRITICAL',
      recentFailures: recentFailures.length,
      criticalFailures: criticalFailures.length
    };
  }

  /**
   * Cleanup old detection history
   */
  cleanupDetectionHistory() {
    const cutoff = Date.now() - 86400000; // 24 hours
    this.detectionHistory = this.detectionHistory.filter(h => h.timestamp > cutoff);
    console.log(`[NLD-Monitor] Cleaned up detection history, ${this.detectionHistory.length} records remaining`);
  }

  /**
   * Get real-time monitoring statistics
   */
  getMonitoringStats() {
    const recent = this.detectionHistory.filter(h => Date.now() - h.timestamp < 3600000);
    
    return {
      isActive: this.monitoringActive,
      activeConnections: this.activeConnections.size,
      recentFailures: recent.length,
      totalDetections: this.detectionHistory.length,
      categories: this.categorizeRecentFailures(),
      uptime: Date.now() - (this.startTime || Date.now())
    };
  }

  /**
   * Shutdown monitoring gracefully
   */
  async shutdown() {
    this.monitoringActive = false;
    
    // Clear all timeouts
    for (const connection of this.activeConnections.values()) {
      if (connection.timeout) {
        clearTimeout(connection.timeout);
      }
    }
    
    this.activeConnections.clear();
    console.log('[NLD-Monitor] Failure detection system shutdown');
  }
}

module.exports = FailurePatternDetector;