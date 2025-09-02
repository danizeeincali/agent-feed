#!/usr/bin/env node

/**
 * NLD Success Metrics Tracking System
 * Monitors WebSocket stability success patterns and TDD effectiveness
 * Provides real-time metrics and historical analysis
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

class SuccessMetricsTracker extends EventEmitter {
  constructor(options = {}) {
    super();
    this.config = {
      outputDir: options.outputDir || '/workspaces/agent-feed/nld-patterns/metrics',
      metricsInterval: options.metricsInterval || 5000, // 5 seconds
      persistenceInterval: options.persistenceInterval || 60000, // 1 minute
      ...options
    };

    this.metrics = {
      // Connection Stability Metrics
      connection_stability: {
        total_connections_created: 0,
        connections_surviving_api_calls: 0,
        premature_disconnections: 0,
        explicit_client_disconnects: 0,
        average_connection_duration: 0,
        connection_success_rate: 1.0,
        longest_stable_connection: 0
      },

      // API Integration Metrics  
      api_integration: {
        total_api_calls: 0,
        api_calls_with_persistent_connection: 0,
        api_success_rate: 1.0,
        api_calls_causing_disconnection: 0,
        average_api_response_time: 0
      },

      // Reconnection Behavior Metrics
      reconnection: {
        reconnection_attempts: 0,
        successful_reconnections: 0,
        failed_reconnections: 0,
        average_reconnection_time: 0,
        exponential_backoff_compliance: 1.0,
        polling_storms_prevented: 0
      },

      // TDD Effectiveness Metrics
      tdd_effectiveness: {
        patterns_detected_by_tests: 0,
        test_driven_fixes_implemented: 0,
        regression_tests_created: 0,
        test_coverage_improvement: 0,
        fix_success_rate_with_tdd: 1.0,
        fix_success_rate_without_tdd: 0.8
      },

      // Pattern Detection Metrics
      pattern_detection: {
        total_pattern_detections: 0,
        true_positive_detections: 0,
        false_positive_detections: 0,
        patterns_leading_to_fixes: 0,
        detection_accuracy: 1.0,
        time_to_detection: 0
      },

      // System Health Metrics
      system_health: {
        uptime_percentage: 100.0,
        zero_connection_events: 0,
        dead_connection_cleanup_events: 0,
        server_error_rate: 0.0,
        memory_usage_stability: 1.0,
        cpu_usage_stability: 1.0
      }
    };

    this.historicalData = [];
    this.realTimeBuffer = [];
    this.startTime = Date.now();
    this.connectionStartTimes = new Map(); // Track individual connection lifetimes
    this.apiCallTimestamps = [];
    this.reconnectionTimestamps = [];
    
    this.metricsTimer = null;
    this.persistenceTimer = null;
  }

  startTracking() {
    console.log('📊 Starting WebSocket success metrics tracking...');
    
    // Start periodic metrics collection
    this.metricsTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);

    // Start periodic persistence
    this.persistenceTimer = setInterval(() => {
      this.persistMetrics();
    }, this.config.persistenceInterval);

    // Initialize output directory
    fs.mkdirSync(this.config.outputDir, { recursive: true });
    
    return this;
  }

  stopTracking() {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
      this.persistenceTimer = null;
    }

    // Final persistence
    this.persistMetrics();
    console.log('📊 Metrics tracking stopped');
  }

  // Connection Lifecycle Events
  recordConnectionCreated(connectionId) {
    this.metrics.connection_stability.total_connections_created++;
    this.connectionStartTimes.set(connectionId, Date.now());
    
    this.emit('metric-updated', {
      type: 'connection_created',
      connectionId: connectionId,
      timestamp: new Date()
    });
  }

  recordConnectionClosed(connectionId, reason = 'unknown') {
    const startTime = this.connectionStartTimes.get(connectionId);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.updateConnectionDurationMetrics(duration);
      this.connectionStartTimes.delete(connectionId);
    }

    if (reason === 'client_disconnect') {
      this.metrics.connection_stability.explicit_client_disconnects++;
    } else if (reason === 'premature_cleanup') {
      this.metrics.connection_stability.premature_disconnections++;
    }

    this.updateConnectionSuccessRate();
    
    this.emit('metric-updated', {
      type: 'connection_closed',
      connectionId: connectionId,
      reason: reason,
      timestamp: new Date()
    });
  }

  recordConnectionSurvivesAPICall(connectionId) {
    this.metrics.connection_stability.connections_surviving_api_calls++;
    this.updateConnectionSuccessRate();
    
    this.emit('metric-updated', {
      type: 'connection_survived_api',
      connectionId: connectionId,
      timestamp: new Date()
    });
  }

  // API Integration Events
  recordAPICall(success = true, responseTime = 0) {
    this.metrics.api_integration.total_api_calls++;
    this.apiCallTimestamps.push(Date.now());
    
    if (success) {
      this.metrics.api_integration.api_calls_with_persistent_connection++;
    } else {
      this.metrics.api_integration.api_calls_causing_disconnection++;
    }

    if (responseTime > 0) {
      this.updateAverageResponseTime(responseTime);
    }

    this.updateAPISuccessRate();
    
    this.emit('metric-updated', {
      type: 'api_call',
      success: success,
      responseTime: responseTime,
      timestamp: new Date()
    });
  }

  // Reconnection Events  
  recordReconnectionAttempt(successful = false, duration = 0, usedBackoff = false) {
    this.metrics.reconnection.reconnection_attempts++;
    this.reconnectionTimestamps.push(Date.now());
    
    if (successful) {
      this.metrics.reconnection.successful_reconnections++;
      if (duration > 0) {
        this.updateAverageReconnectionTime(duration);
      }
    } else {
      this.metrics.reconnection.failed_reconnections++;
    }

    if (usedBackoff) {
      this.updateExponentialBackoffCompliance();
    }

    this.emit('metric-updated', {
      type: 'reconnection_attempt',
      successful: successful,
      duration: duration,
      usedBackoff: usedBackoff,
      timestamp: new Date()
    });
  }

  recordPollingStormPrevented() {
    this.metrics.reconnection.polling_storms_prevented++;
    
    this.emit('metric-updated', {
      type: 'polling_storm_prevented',
      timestamp: new Date()
    });
  }

  // TDD Effectiveness Events
  recordPatternDetectedByTest(patternId) {
    this.metrics.tdd_effectiveness.patterns_detected_by_tests++;
    
    this.emit('metric-updated', {
      type: 'pattern_detected_by_test',
      patternId: patternId,
      timestamp: new Date()
    });
  }

  recordTDDFixImplemented(patternId, success = true) {
    this.metrics.tdd_effectiveness.test_driven_fixes_implemented++;
    
    if (success) {
      this.updateTDDSuccessRate(true);
    } else {
      this.updateTDDSuccessRate(false);
    }
    
    this.emit('metric-updated', {
      type: 'tdd_fix_implemented', 
      patternId: patternId,
      success: success,
      timestamp: new Date()
    });
  }

  recordRegressionTestCreated() {
    this.metrics.tdd_effectiveness.regression_tests_created++;
    
    this.emit('metric-updated', {
      type: 'regression_test_created',
      timestamp: new Date()
    });
  }

  // Pattern Detection Events
  recordPatternDetection(patternId, truePositive = true, detectionTime = 0) {
    this.metrics.pattern_detection.total_pattern_detections++;
    
    if (truePositive) {
      this.metrics.pattern_detection.true_positive_detections++;
    } else {
      this.metrics.pattern_detection.false_positive_detections++;
    }

    if (detectionTime > 0) {
      this.updateAverageDetectionTime(detectionTime);
    }

    this.updateDetectionAccuracy();
    
    this.emit('metric-updated', {
      type: 'pattern_detected',
      patternId: patternId,
      truePositive: truePositive,
      detectionTime: detectionTime,
      timestamp: new Date()
    });
  }

  recordPatternLeadingToFix(patternId) {
    this.metrics.pattern_detection.patterns_leading_to_fixes++;
    
    this.emit('metric-updated', {
      type: 'pattern_led_to_fix',
      patternId: patternId,
      timestamp: new Date()
    });
  }

  // System Health Events
  recordZeroConnectionEvent() {
    this.metrics.system_health.zero_connection_events++;
    
    this.emit('metric-updated', {
      type: 'zero_connections',
      timestamp: new Date()
    });
  }

  recordDeadConnectionCleanup() {
    this.metrics.system_health.dead_connection_cleanup_events++;
    
    this.emit('metric-updated', {
      type: 'dead_connection_cleanup',
      timestamp: new Date()
    });
  }

  recordServerError() {
    // Update server error rate
    const totalRequests = this.metrics.api_integration.total_api_calls || 1;
    const errorCount = this.metrics.system_health.server_error_rate * totalRequests + 1;
    this.metrics.system_health.server_error_rate = errorCount / totalRequests;
    
    this.emit('metric-updated', {
      type: 'server_error',
      timestamp: new Date()
    });
  }

  // Metrics Calculation Methods
  updateConnectionDurationMetrics(duration) {
    const current = this.metrics.connection_stability.average_connection_duration;
    const count = this.metrics.connection_stability.total_connections_created;
    
    this.metrics.connection_stability.average_connection_duration = 
      ((current * (count - 1)) + duration) / count;
    
    if (duration > this.metrics.connection_stability.longest_stable_connection) {
      this.metrics.connection_stability.longest_stable_connection = duration;
    }
  }

  updateConnectionSuccessRate() {
    const total = this.metrics.connection_stability.total_connections_created;
    const surviving = this.metrics.connection_stability.connections_surviving_api_calls;
    const premature = this.metrics.connection_stability.premature_disconnections;
    
    if (total > 0) {
      this.metrics.connection_stability.connection_success_rate = 
        Math.max(0, (total - premature) / total);
    }
  }

  updateAPISuccessRate() {
    const total = this.metrics.api_integration.total_api_calls;
    const persistent = this.metrics.api_integration.api_calls_with_persistent_connection;
    
    if (total > 0) {
      this.metrics.api_integration.api_success_rate = persistent / total;
    }
  }

  updateAverageResponseTime(responseTime) {
    const current = this.metrics.api_integration.average_api_response_time;
    const count = this.metrics.api_integration.total_api_calls;
    
    this.metrics.api_integration.average_api_response_time = 
      ((current * (count - 1)) + responseTime) / count;
  }

  updateAverageReconnectionTime(duration) {
    const current = this.metrics.reconnection.average_reconnection_time;
    const count = this.metrics.reconnection.successful_reconnections;
    
    this.metrics.reconnection.average_reconnection_time = 
      ((current * (count - 1)) + duration) / count;
  }

  updateExponentialBackoffCompliance() {
    const total = this.metrics.reconnection.reconnection_attempts;
    const compliant = total * this.metrics.reconnection.exponential_backoff_compliance + 1;
    
    this.metrics.reconnection.exponential_backoff_compliance = compliant / total;
  }

  updateTDDSuccessRate(success) {
    const totalFixes = this.metrics.tdd_effectiveness.test_driven_fixes_implemented;
    const currentSuccessRate = this.metrics.tdd_effectiveness.fix_success_rate_with_tdd;
    
    const currentSuccesses = Math.round(currentSuccessRate * (totalFixes - 1));
    const newSuccesses = currentSuccesses + (success ? 1 : 0);
    
    this.metrics.tdd_effectiveness.fix_success_rate_with_tdd = newSuccesses / totalFixes;
  }

  updateDetectionAccuracy() {
    const total = this.metrics.pattern_detection.total_pattern_detections;
    const truePositives = this.metrics.pattern_detection.true_positive_detections;
    
    if (total > 0) {
      this.metrics.pattern_detection.detection_accuracy = truePositives / total;
    }
  }

  updateAverageDetectionTime(detectionTime) {
    const current = this.metrics.pattern_detection.time_to_detection;
    const count = this.metrics.pattern_detection.total_pattern_detections;
    
    this.metrics.pattern_detection.time_to_detection = 
      ((current * (count - 1)) + detectionTime) / count;
  }

  // Data Collection and Persistence
  collectMetrics() {
    const snapshot = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      metrics: JSON.parse(JSON.stringify(this.metrics)),
      derived_metrics: this.calculateDerivedMetrics()
    };

    this.realTimeBuffer.push(snapshot);
    
    // Keep buffer size manageable
    if (this.realTimeBuffer.length > 1000) {
      this.realTimeBuffer.shift();
    }

    this.emit('metrics-collected', snapshot);
  }

  calculateDerivedMetrics() {
    const now = Date.now();
    
    return {
      // Connection Health Score (0-1)
      connection_health_score: this.calculateConnectionHealthScore(),
      
      // API Integration Score (0-1)
      api_integration_score: this.calculateAPIIntegrationScore(),
      
      // Pattern Detection Effectiveness (0-1)  
      pattern_detection_effectiveness: this.calculatePatternDetectionEffectiveness(),
      
      // TDD Adoption Success (0-1)
      tdd_adoption_success: this.calculateTDDAdoptionSuccess(),
      
      // Overall System Stability (0-1)
      overall_stability_score: this.calculateOverallStabilityScore(),
      
      // Recent Activity Metrics (last 5 minutes)
      recent_activity: {
        api_calls_last_5min: this.countRecentEvents(this.apiCallTimestamps, 5 * 60 * 1000),
        reconnections_last_5min: this.countRecentEvents(this.reconnectionTimestamps, 5 * 60 * 1000),
        active_connections: this.connectionStartTimes.size
      }
    };
  }

  calculateConnectionHealthScore() {
    const stability = this.metrics.connection_stability;
    const successRate = stability.connection_success_rate;
    const avgDuration = Math.min(stability.average_connection_duration / (60000 * 30), 1); // Normalize to 30 min max
    const prematureRatio = stability.total_connections_created > 0 ? 
      1 - (stability.premature_disconnections / stability.total_connections_created) : 1;
    
    return (successRate * 0.4 + avgDuration * 0.3 + prematureRatio * 0.3);
  }

  calculateAPIIntegrationScore() {
    const api = this.metrics.api_integration;
    const successRate = api.api_success_rate;
    const responseTimeScore = api.average_api_response_time > 0 ? 
      Math.max(0, 1 - (api.average_api_response_time / 10000)) : 1; // Normalize to 10s max
    
    return (successRate * 0.7 + responseTimeScore * 0.3);
  }

  calculatePatternDetectionEffectiveness() {
    const detection = this.metrics.pattern_detection;
    const accuracy = detection.detection_accuracy;
    const actionableRate = detection.total_pattern_detections > 0 ?
      detection.patterns_leading_to_fixes / detection.total_pattern_detections : 0;
    const timelinessScore = detection.time_to_detection > 0 ?
      Math.max(0, 1 - (detection.time_to_detection / 300000)) : 1; // Normalize to 5 min max
    
    return (accuracy * 0.4 + actionableRate * 0.4 + timelinessScore * 0.2);
  }

  calculateTDDAdoptionSuccess() {
    const tdd = this.metrics.tdd_effectiveness;
    const fixSuccessRate = tdd.fix_success_rate_with_tdd;
    const testCoverageScore = tdd.regression_tests_created / Math.max(1, tdd.test_driven_fixes_implemented);
    const adoptionRate = tdd.patterns_detected_by_tests / Math.max(1, this.metrics.pattern_detection.total_pattern_detections);
    
    return (fixSuccessRate * 0.5 + Math.min(testCoverageScore, 1) * 0.3 + adoptionRate * 0.2);
  }

  calculateOverallStabilityScore() {
    const health = this.calculateConnectionHealthScore();
    const integration = this.calculateAPIIntegrationScore(); 
    const detection = this.calculatePatternDetectionEffectiveness();
    const tdd = this.calculateTDDAdoptionSuccess();
    
    return (health * 0.3 + integration * 0.3 + detection * 0.2 + tdd * 0.2);
  }

  countRecentEvents(timestamps, windowMs) {
    const now = Date.now();
    return timestamps.filter(ts => now - ts < windowMs).length;
  }

  persistMetrics() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Save current metrics snapshot
    const metricsPath = path.join(this.config.outputDir, `metrics-${timestamp}.json`);
    fs.writeFileSync(metricsPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      derived_metrics: this.calculateDerivedMetrics(),
      real_time_buffer: this.realTimeBuffer.slice(-100) // Last 100 snapshots
    }, null, 2));

    // Update historical data
    this.historicalData.push({
      timestamp: new Date().toISOString(),
      snapshot: JSON.parse(JSON.stringify(this.metrics))
    });

    // Keep historical data manageable  
    if (this.historicalData.length > 1000) {
      this.historicalData.shift();
    }

    // Export for claude-flow integration
    this.exportForClaudeFlow();
  }

  exportForClaudeFlow() {
    const claudeFlowExport = {
      agent_type: "websocket-success-metrics-tracker",
      training_mode: "success_pattern_reinforcement",
      timestamp: new Date().toISOString(),
      success_metrics: this.metrics,
      derived_scores: this.calculateDerivedMetrics(),
      neural_features: {
        stability_features: [
          this.metrics.connection_stability.connection_success_rate,
          this.metrics.api_integration.api_success_rate,
          this.calculateConnectionHealthScore()
        ],
        performance_features: [
          this.metrics.api_integration.average_api_response_time,
          this.metrics.reconnection.average_reconnection_time,
          this.metrics.pattern_detection.time_to_detection
        ],
        behavioral_features: [
          this.metrics.reconnection.exponential_backoff_compliance,
          this.metrics.tdd_effectiveness.fix_success_rate_with_tdd,
          this.metrics.pattern_detection.detection_accuracy
        ]
      },
      success_labels: {
        overall_health: this.calculateOverallStabilityScore() > 0.8 ? 'HEALTHY' : 'NEEDS_IMPROVEMENT',
        connection_stability: this.calculateConnectionHealthScore() > 0.9 ? 'STABLE' : 'UNSTABLE',
        tdd_effectiveness: this.calculateTDDAdoptionSuccess() > 0.8 ? 'EFFECTIVE' : 'NEEDS_IMPROVEMENT'
      }
    };

    const exportPath = path.join(this.config.outputDir, 'claude-flow-export', 'success-metrics-training.json');
    fs.mkdirSync(path.dirname(exportPath), { recursive: true });
    fs.writeFileSync(exportPath, JSON.stringify(claudeFlowExport, null, 2));
  }

  // Public API methods
  getCurrentMetrics() {
    return {
      ...this.metrics,
      derived_metrics: this.calculateDerivedMetrics()
    };
  }

  getMetricsSummary() {
    const derived = this.calculateDerivedMetrics();
    
    return {
      uptime: Date.now() - this.startTime,
      overall_stability: derived.overall_stability_score,
      connection_health: derived.connection_health_score,
      api_integration: derived.api_integration_score,
      pattern_detection: derived.pattern_detection_effectiveness,
      tdd_success: derived.tdd_adoption_success,
      active_connections: this.connectionStartTimes.size,
      total_api_calls: this.metrics.api_integration.total_api_calls,
      recent_activity: derived.recent_activity
    };
  }

  getHistoricalTrends(hours = 24) {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    return this.historicalData.filter(record => 
      new Date(record.timestamp) > cutoff
    );
  }
}

// CLI Interface
if (require.main === module) {
  const tracker = new SuccessMetricsTracker();
  
  tracker.on('metrics-collected', (snapshot) => {
    const summary = tracker.getMetricsSummary();
    console.log(`📊 Stability Score: ${(summary.overall_stability * 100).toFixed(1)}% | ` +
               `Connections: ${summary.active_connections} | ` +
               `API Calls: ${summary.total_api_calls}`);
  });

  tracker.startTracking();

  // Example event simulation
  setTimeout(() => {
    tracker.recordConnectionCreated('conn-1');
    tracker.recordAPICall(true, 1200);
    tracker.recordConnectionSurvivesAPICall('conn-1');
  }, 2000);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down metrics tracker...');
    tracker.stopTracking();
    process.exit(0);
  });
}

module.exports = SuccessMetricsTracker;