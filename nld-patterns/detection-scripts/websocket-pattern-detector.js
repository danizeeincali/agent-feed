#!/usr/bin/env node

/**
 * NLD WebSocket Pattern Detection Script
 * Automatically detects WebSocket failure patterns in real-time
 * Integrates with claude-flow for neural training data export
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class WebSocketPatternDetector extends EventEmitter {
  constructor(options = {}) {
    super();
    this.patterns = this.loadPatterns();
    this.successPatterns = this.loadSuccessPatterns(); 
    this.detectionHistory = [];
    this.metricsBuffer = new Map();
    this.logWatcher = null;
    this.realTimeMetrics = {
      connectionCount: 0,
      apiCallCount: 0,
      disconnectionEvents: 0,
      cleanupEvents: 0,
      reconnectionAttempts: 0
    };
    
    this.detectionRules = {
      'WS-001': this.detectPrematureCleanup.bind(this),
      'WS-002': this.detectPollingStorm.bind(this), 
      'WS-003': this.detectAPICloseKillsWebSocket.bind(this)
    };
    
    this.successValidators = {
      'WS-SUCCESS-001': this.validatePersistentConnection.bind(this),
      'WS-SUCCESS-002': this.validateProperCleanup.bind(this), 
      'WS-SUCCESS-003': this.validateGracefulReconnection.bind(this)
    };

    this.config = {
      logFile: options.logFile || '/workspaces/agent-feed/logs/combined.log',
      outputDir: options.outputDir || '/workspaces/agent-feed/nld-patterns',
      realTimeMode: options.realTimeMode || true,
      neuralTrainingExport: options.neuralTrainingExport || true,
      ...options
    };
  }

  loadPatterns() {
    const patternsPath = path.join(__dirname, '../websocket-failures/pattern-database.json');
    try {
      return JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
    } catch (error) {
      console.error('Failed to load failure patterns:', error.message);
      return { patterns: {} };
    }
  }

  loadSuccessPatterns() {
    const successPath = path.join(__dirname, '../success-patterns/stable-websocket-patterns.json');
    try {
      return JSON.parse(fs.readFileSync(successPath, 'utf8'));
    } catch (error) {
      console.error('Failed to load success patterns:', error.message);
      return { success_patterns: {} };
    }
  }

  startRealTimeDetection() {
    console.log('🔍 Starting real-time WebSocket pattern detection...');
    
    if (this.config.realTimeMode) {
      this.startLogWatching();
      this.startMetricsCollection();
    }

    // Set up periodic pattern analysis
    setInterval(() => {
      this.analyzePatterns();
      this.exportNeuralTrainingData();
    }, 5000); // Check every 5 seconds

    return this;
  }

  startLogWatching() {
    if (!fs.existsSync(this.config.logFile)) {
      console.warn(`Log file not found: ${this.config.logFile}`);
      return;
    }

    // Watch log file for changes
    fs.watchFile(this.config.logFile, { interval: 1000 }, () => {
      this.processNewLogEntries();
    });
  }

  processNewLogEntries() {
    try {
      const logContent = fs.readFileSync(this.config.logFile, 'utf8');
      const lines = logContent.split('\n').slice(-100); // Last 100 lines
      
      lines.forEach(line => {
        if (line.trim()) {
          this.processLogLine(line);
        }
      });
    } catch (error) {
      console.error('Error processing log entries:', error.message);
    }
  }

  processLogLine(line) {
    // Update real-time metrics based on log content
    if (line.includes('🚑 Removing dead connection')) {
      this.realTimeMetrics.disconnectionEvents++;
      this.emit('pattern-detected', {
        type: 'premature-cleanup',
        severity: 'HIGH',
        timestamp: new Date(),
        logLine: line
      });
    }

    if (line.includes('/api/claude/instances')) {
      this.realTimeMetrics.apiCallCount++;
    }

    if (line.includes('WebSocket connections: 0')) {
      this.emit('pattern-detected', {
        type: 'connection-drop',
        severity: 'CRITICAL',
        timestamp: new Date(),
        logLine: line
      });
    }

    // Check for polling storm indicators
    if (line.includes('Too Many Requests') || line.includes('Rate limit exceeded')) {
      this.emit('pattern-detected', {
        type: 'polling-storm', 
        severity: 'HIGH',
        timestamp: new Date(),
        logLine: line
      });
    }
  }

  detectPrematureCleanup(metrics) {
    const pattern = this.patterns.patterns['websocket-premature-cleanup'];
    const detection = {
      patternId: 'WS-001',
      detected: false,
      confidence: 0,
      evidence: [],
      timestamp: new Date()
    };

    // Check for cleanup events following API completion
    if (metrics.disconnectionEvents > 0 && metrics.apiCallCount > 0) {
      detection.detected = true;
      detection.confidence = 0.8;
      detection.evidence.push('Disconnection events correlate with API calls');
    }

    // Check for signature log messages
    if (this.hasLogSignature(pattern.detection_patterns.log_signatures)) {
      detection.detected = true;
      detection.confidence = Math.min(detection.confidence + 0.3, 1.0);
      detection.evidence.push('Log signatures match premature cleanup pattern');
    }

    return detection;
  }

  detectPollingStorm(metrics) {
    const detection = {
      patternId: 'WS-002',
      detected: false,
      confidence: 0,
      evidence: [],
      timestamp: new Date()
    };

    // Check for excessive API call rate
    const apiCallRate = metrics.apiCallCount / 60; // calls per minute
    if (apiCallRate > 100) { // More than 100 calls per minute
      detection.detected = true;
      detection.confidence = 0.9;
      detection.evidence.push(`Excessive API call rate: ${apiCallRate.toFixed(1)} calls/min`);
    }

    // Check for reconnection attempts without backoff
    if (metrics.reconnectionAttempts > 10) {
      detection.detected = true;
      detection.confidence = Math.min(detection.confidence + 0.4, 1.0);
      detection.evidence.push('Excessive reconnection attempts detected');
    }

    return detection;
  }

  detectAPICloseKillsWebSocket(metrics) {
    const detection = {
      patternId: 'WS-003', 
      detected: false,
      confidence: 0,
      evidence: [],
      timestamp: new Date()
    };

    // Check for connection drops following API completion
    if (metrics.connectionCount === 0 && metrics.apiCallCount > 0 && metrics.cleanupEvents > 0) {
      detection.detected = true;
      detection.confidence = 0.95;
      detection.evidence.push('WebSocket connections dropped to zero after API completion');
    }

    return detection;
  }

  validatePersistentConnection(metrics) {
    const validation = {
      patternId: 'WS-SUCCESS-001',
      validated: false,
      score: 0,
      evidence: [],
      timestamp: new Date()
    };

    // Connection survives API calls
    if (metrics.connectionCount > 0 && metrics.apiCallCount > 0 && metrics.disconnectionEvents === 0) {
      validation.validated = true;
      validation.score = 1.0;
      validation.evidence.push('Connection persisted through API operations');
    }

    return validation;
  }

  validateProperCleanup(metrics) {
    const validation = {
      patternId: 'WS-SUCCESS-002',
      validated: false,
      score: 0,
      evidence: [],
      timestamp: new Date()
    };

    // No premature cleanup events
    if (metrics.cleanupEvents === 0 || (metrics.cleanupEvents > 0 && metrics.disconnectionEvents === metrics.cleanupEvents)) {
      validation.validated = true;
      validation.score = 0.9;
      validation.evidence.push('No premature cleanup events detected');
    }

    return validation;
  }

  validateGracefulReconnection(metrics) {
    const validation = {
      patternId: 'WS-SUCCESS-003',
      validated: false,
      score: 0,
      evidence: [],
      timestamp: new Date()
    };

    // Check reconnection behavior
    if (metrics.reconnectionAttempts > 0 && metrics.reconnectionAttempts < 10) {
      validation.validated = true;
      validation.score = 0.8;
      validation.evidence.push('Reconnection attempts within reasonable limits');
    }

    return validation;
  }

  hasLogSignature(signatures) {
    // This would check recent log entries for specific signatures
    // Implementation depends on log buffer management
    return false; // Placeholder
  }

  startMetricsCollection() {
    // Simulate real-time metrics collection
    // In production, this would integrate with actual WebSocket server
    setInterval(() => {
      // Update metrics from actual system state
      this.updateRealTimeMetrics();
    }, 1000);
  }

  updateRealTimeMetrics() {
    // Placeholder for real metrics collection
    // This would integrate with the actual WebSocket server
  }

  analyzePatterns() {
    const analysis = {
      timestamp: new Date(),
      detectedFailures: [],
      validatedSuccesses: [],
      recommendations: []
    };

    // Run failure detection
    Object.keys(this.detectionRules).forEach(patternId => {
      const detection = this.detectionRules[patternId](this.realTimeMetrics);
      if (detection.detected) {
        analysis.detectedFailures.push(detection);
        this.emit('failure-detected', detection);
      }
    });

    // Run success validation  
    Object.keys(this.successValidators).forEach(patternId => {
      const validation = this.successValidators[patternId](this.realTimeMetrics);
      if (validation.validated) {
        analysis.validatedSuccesses.push(validation);
        this.emit('success-validated', validation);
      }
    });

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    this.detectionHistory.push(analysis);
    return analysis;
  }

  generateRecommendations(analysis) {
    const recommendations = [];

    analysis.detectedFailures.forEach(failure => {
      const pattern = this.patterns.patterns[Object.keys(this.patterns.patterns).find(key => 
        this.patterns.patterns[key].id === failure.patternId
      )];
      
      if (pattern) {
        recommendations.push({
          type: 'fix',
          priority: pattern.severity,
          description: pattern.fix_strategy,
          preventionRules: pattern.prevention_rules
        });
      }
    });

    return recommendations;
  }

  exportNeuralTrainingData() {
    if (!this.config.neuralTrainingExport) return;

    const trainingData = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      detection_history: this.detectionHistory.slice(-100), // Last 100 analyses
      feature_vectors: this.extractFeatureVectors(),
      labels: this.generateTrainingLabels(),
      metadata: {
        total_detections: this.detectionHistory.length,
        pattern_distribution: this.calculatePatternDistribution(),
        success_rate: this.calculateSuccessRate()
      }
    };

    const exportPath = path.join(this.config.outputDir, 'neural-training', 'websocket-pattern-training-data.json');
    fs.mkdirSync(path.dirname(exportPath), { recursive: true });
    fs.writeFileSync(exportPath, JSON.stringify(trainingData, null, 2));

    // Also export for claude-flow integration
    this.exportForClaudeFlow(trainingData);
  }

  extractFeatureVectors() {
    return this.detectionHistory.map(analysis => ({
      timestamp: analysis.timestamp,
      connection_count: this.realTimeMetrics.connectionCount,
      api_call_count: this.realTimeMetrics.apiCallCount,
      disconnection_events: this.realTimeMetrics.disconnectionEvents,
      cleanup_events: this.realTimeMetrics.cleanupEvents,
      reconnection_attempts: this.realTimeMetrics.reconnectionAttempts,
      failure_count: analysis.detectedFailures.length,
      success_count: analysis.validatedSuccesses.length
    }));
  }

  generateTrainingLabels() {
    return this.detectionHistory.map(analysis => ({
      timestamp: analysis.timestamp,
      has_failure: analysis.detectedFailures.length > 0,
      failure_types: analysis.detectedFailures.map(f => f.patternId),
      success_types: analysis.validatedSuccesses.map(s => s.patternId),
      overall_health: analysis.detectedFailures.length === 0 ? 'HEALTHY' : 'UNHEALTHY'
    }));
  }

  calculatePatternDistribution() {
    const distribution = {};
    this.detectionHistory.forEach(analysis => {
      analysis.detectedFailures.forEach(failure => {
        distribution[failure.patternId] = (distribution[failure.patternId] || 0) + 1;
      });
    });
    return distribution;
  }

  calculateSuccessRate() {
    if (this.detectionHistory.length === 0) return 0;
    
    const successfulAnalyses = this.detectionHistory.filter(analysis => 
      analysis.detectedFailures.length === 0 && analysis.validatedSuccesses.length > 0
    );
    
    return successfulAnalyses.length / this.detectionHistory.length;
  }

  exportForClaudeFlow(trainingData) {
    const claudeFlowData = {
      agent_type: "websocket-pattern-detector",
      training_mode: "failure_pattern_detection",
      data: trainingData,
      neural_patterns: {
        input_features: ["connection_count", "api_call_count", "disconnection_events"],
        output_labels: ["failure_type", "severity", "confidence"],
        training_algorithm: "pattern_classification"
      }
    };

    const claudeFlowPath = path.join(this.config.outputDir, 'claude-flow-export', 'websocket-training.json');
    fs.mkdirSync(path.dirname(claudeFlowPath), { recursive: true });
    fs.writeFileSync(claudeFlowPath, JSON.stringify(claudeFlowData, null, 2));
  }

  // Public API methods
  getDetectionSummary() {
    return {
      totalDetections: this.detectionHistory.length,
      recentFailures: this.detectionHistory.slice(-10).filter(a => a.detectedFailures.length > 0),
      successRate: this.calculateSuccessRate(),
      patternDistribution: this.calculatePatternDistribution(),
      currentMetrics: this.realTimeMetrics
    };
  }

  getCurrentMetrics() {
    return { ...this.realTimeMetrics };
  }

  getRecommendations() {
    const recent = this.detectionHistory.slice(-5);
    const allRecommendations = recent.flatMap(analysis => analysis.recommendations);
    
    // Deduplicate and prioritize
    const unique = allRecommendations.filter((rec, index, arr) => 
      arr.findIndex(r => r.description === rec.description) === index
    );

    return unique.sort((a, b) => {
      const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
}

// CLI Interface
if (require.main === module) {
  const detector = new WebSocketPatternDetector({
    realTimeMode: true,
    neuralTrainingExport: true
  });

  detector.on('failure-detected', (detection) => {
    console.log(`🚨 Pattern Detected: ${detection.type} (Confidence: ${detection.confidence})`);
    console.log(`   Evidence: ${detection.evidence.join(', ')}`);
  });

  detector.on('success-validated', (validation) => {
    console.log(`✅ Success Pattern: ${validation.patternId} (Score: ${validation.score})`);
  });

  detector.startRealTimeDetection();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down WebSocket pattern detector...');
    detector.exportNeuralTrainingData();
    process.exit(0);
  });
}

module.exports = WebSocketPatternDetector;