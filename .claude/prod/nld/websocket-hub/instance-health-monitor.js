/**
 * Neural Learning Development - Instance Health Monitoring Patterns
 * Monitors and learns from instance health patterns for proactive management
 */

class InstanceHealthMonitor {
  constructor() {
    this.healthPatterns = new Map();
    this.instanceMetrics = new Map();
    this.healthTrends = new Map();
    this.anomalyDetectors = new Map();
    this.healthHistory = [];
    this.predictiveModels = new Map();
    this.alertThresholds = new Map();
    this.maxHistorySize = 10000;
    this.learningRate = 0.1;
    
    this.initializeDefaultThresholds();
    this.initializeAnomalyDetectors();
  }

  /**
   * Initialize default health thresholds
   */
  initializeDefaultThresholds() {
    this.alertThresholds.set('cpu', { warning: 70, critical: 85 });
    this.alertThresholds.set('memory', { warning: 75, critical: 90 });
    this.alertThresholds.set('disk', { warning: 80, critical: 95 });
    this.alertThresholds.set('connections', { warning: 800, critical: 950 });
    this.alertThresholds.set('latency', { warning: 1000, critical: 2000 });
    this.alertThresholds.set('errorRate', { warning: 0.05, critical: 0.1 });
    this.alertThresholds.set('queueSize', { warning: 1000, critical: 5000 });
  }

  /**
   * Initialize anomaly detection models
   */
  initializeAnomalyDetectors() {
    // Moving average anomaly detector
    this.anomalyDetectors.set('moving_average', {
      windowSize: 20,
      threshold: 2.0, // Standard deviations
      detect: (values) => this.detectMovingAverageAnomaly(values)
    });

    // Trend-based anomaly detector
    this.anomalyDetectors.set('trend_based', {
      windowSize: 30,
      threshold: 0.3, // Rate of change threshold
      detect: (values) => this.detectTrendAnomaly(values)
    });

    // Seasonal anomaly detector
    this.anomalyDetectors.set('seasonal', {
      seasonLength: 24, // 24 hour cycle
      threshold: 1.5,
      detect: (values, timestamps) => this.detectSeasonalAnomaly(values, timestamps)
    });
  }

  /**
   * Monitor instance health and learn patterns
   */
  monitorInstanceHealth(instanceData) {
    const healthSnapshot = this.createHealthSnapshot(instanceData);
    const healthScore = this.calculateHealthScore(healthSnapshot);
    const patterns = this.analyzeHealthPatterns(healthSnapshot);
    
    // Store health data
    this.storeHealthData(healthSnapshot, healthScore);
    
    // Update patterns and trends
    this.updateHealthPatterns(patterns, healthSnapshot);
    this.updateHealthTrends(instanceData.instanceId, healthSnapshot);
    
    // Detect anomalies
    const anomalies = this.detectHealthAnomalies(instanceData.instanceId, healthSnapshot);
    
    // Predict future health issues
    const predictions = this.predictHealthIssues(instanceData.instanceId, healthSnapshot);
    
    // Generate alerts and recommendations
    const alerts = this.generateHealthAlerts(healthSnapshot, anomalies, predictions);
    const recommendations = this.generateHealthRecommendations(healthSnapshot, patterns, anomalies);

    return {
      healthSnapshot,
      healthScore,
      patterns,
      anomalies,
      predictions,
      alerts,
      recommendations,
      status: this.determineInstanceStatus(healthScore, anomalies, predictions)
    };
  }

  /**
   * Create health snapshot from instance data
   */
  createHealthSnapshot(data) {
    return {
      instanceId: data.instanceId,
      timestamp: Date.now(),
      metrics: {
        cpu: data.cpu || 0,
        memory: data.memory || 0,
        disk: data.disk || 0,
        networkIn: data.networkIn || 0,
        networkOut: data.networkOut || 0,
        connections: data.connections || 0,
        activeConnections: data.activeConnections || 0,
        queueSize: data.queueSize || 0,
        messageRate: data.messageRate || 0,
        errorRate: data.errorRate || 0,
        latency: data.latency || 0,
        throughput: data.throughput || 0
      },
      status: {
        uptime: data.uptime || 0,
        lastRestart: data.lastRestart || 0,
        version: data.version || 'unknown',
        region: data.region || 'unknown'
      },
      errors: data.errors || [],
      warnings: data.warnings || []
    };
  }

  /**
   * Calculate overall health score
   */
  calculateHealthScore(snapshot) {
    const weights = {
      cpu: 0.2,
      memory: 0.2,
      disk: 0.1,
      connections: 0.15,
      latency: 0.15,
      errorRate: 0.1,
      queueSize: 0.1
    };

    let score = 1.0;
    const metrics = snapshot.metrics;

    // CPU score
    score -= this.calculateMetricPenalty('cpu', metrics.cpu) * weights.cpu;
    
    // Memory score
    score -= this.calculateMetricPenalty('memory', metrics.memory) * weights.memory;
    
    // Disk score
    score -= this.calculateMetricPenalty('disk', metrics.disk) * weights.disk;
    
    // Connection score
    const maxConnections = this.alertThresholds.get('connections').critical;
    score -= this.calculateMetricPenalty('connections', (metrics.connections / maxConnections) * 100) * weights.connections;
    
    // Latency score
    score -= this.calculateMetricPenalty('latency', metrics.latency) * weights.latency;
    
    // Error rate score
    score -= this.calculateMetricPenalty('errorRate', metrics.errorRate * 100) * weights.errorRate;
    
    // Queue size score
    const maxQueueSize = this.alertThresholds.get('queueSize').critical;
    score -= this.calculateMetricPenalty('queueSize', (metrics.queueSize / maxQueueSize) * 100) * weights.queueSize;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate penalty for a metric value
   */
  calculateMetricPenalty(metricName, value) {
    const thresholds = this.alertThresholds.get(metricName);
    if (!thresholds) return 0;

    if (metricName === 'latency') {
      // Latency is measured in ms, convert to percentage penalty
      if (value > thresholds.critical) return 1.0;
      if (value > thresholds.warning) return 0.5;
      return Math.min(0.3, value / thresholds.warning);
    }

    if (metricName === 'errorRate') {
      // Error rate is already a percentage
      if (value > thresholds.critical * 100) return 1.0;
      if (value > thresholds.warning * 100) return 0.5;
      return Math.min(0.3, value / (thresholds.warning * 100));
    }

    // Standard percentage-based metrics
    if (value > thresholds.critical) return 1.0;
    if (value > thresholds.warning) return 0.5;
    return Math.min(0.3, value / thresholds.warning);
  }

  /**
   * Analyze health patterns in the snapshot
   */
  analyzeHealthPatterns(snapshot) {
    return {
      loadProfile: this.categorizeLoadProfile(snapshot.metrics),
      resourceUsage: this.categorizeResourceUsage(snapshot.metrics),
      networkPattern: this.categorizeNetworkPattern(snapshot.metrics),
      errorPattern: this.categorizeErrorPattern(snapshot.metrics, snapshot.errors),
      timePattern: this.categorizeTimePattern(snapshot.timestamp),
      performanceProfile: this.categorizePerformanceProfile(snapshot.metrics)
    };
  }

  /**
   * Store health data for historical analysis
   */
  storeHealthData(snapshot, score) {
    this.healthHistory.push({
      instanceId: snapshot.instanceId,
      timestamp: snapshot.timestamp,
      healthScore: score,
      metrics: snapshot.metrics,
      patterns: this.analyzeHealthPatterns(snapshot)
    });

    // Trim history
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Update health patterns with new data
   */
  updateHealthPatterns(patterns, snapshot) {
    const patternKey = this.createPatternKey(patterns);
    
    if (!this.healthPatterns.has(patternKey)) {
      this.healthPatterns.set(patternKey, {
        pattern: patterns,
        occurrences: 0,
        avgHealthScore: 0,
        totalHealthScore: 0,
        instances: new Set(),
        metrics: {
          avgCpu: 0,
          avgMemory: 0,
          avgLatency: 0,
          avgErrorRate: 0
        },
        trends: {
          improving: 0,
          stable: 0,
          degrading: 0
        }
      });
    }

    const patternData = this.healthPatterns.get(patternKey);
    patternData.occurrences++;
    patternData.instances.add(snapshot.instanceId);
    
    const healthScore = this.calculateHealthScore(snapshot);
    patternData.totalHealthScore += healthScore;
    patternData.avgHealthScore = patternData.totalHealthScore / patternData.occurrences;
    
    // Update metric averages
    const metrics = patternData.metrics;
    const count = patternData.occurrences;
    metrics.avgCpu = (metrics.avgCpu * (count - 1) + snapshot.metrics.cpu) / count;
    metrics.avgMemory = (metrics.avgMemory * (count - 1) + snapshot.metrics.memory) / count;
    metrics.avgLatency = (metrics.avgLatency * (count - 1) + snapshot.metrics.latency) / count;
    metrics.avgErrorRate = (metrics.avgErrorRate * (count - 1) + snapshot.metrics.errorRate) / count;
  }

  /**
   * Update health trends for instance
   */
  updateHealthTrends(instanceId, snapshot) {
    if (!this.healthTrends.has(instanceId)) {
      this.healthTrends.set(instanceId, {
        instanceId,
        recentScores: [],
        recentMetrics: [],
        trend: 'stable',
        lastUpdate: Date.now()
      });
    }

    const trendData = this.healthTrends.get(instanceId);
    const healthScore = this.calculateHealthScore(snapshot);
    
    trendData.recentScores.push(healthScore);
    trendData.recentMetrics.push({
      timestamp: snapshot.timestamp,
      cpu: snapshot.metrics.cpu,
      memory: snapshot.metrics.memory,
      latency: snapshot.metrics.latency,
      errorRate: snapshot.metrics.errorRate
    });

    // Keep only recent data (last 100 points)
    if (trendData.recentScores.length > 100) {
      trendData.recentScores = trendData.recentScores.slice(-100);
      trendData.recentMetrics = trendData.recentMetrics.slice(-100);
    }

    // Calculate trend
    trendData.trend = this.calculateHealthTrend(trendData.recentScores);
    trendData.lastUpdate = Date.now();
  }

  /**
   * Detect health anomalies
   */
  detectHealthAnomalies(instanceId, snapshot) {
    const anomalies = [];
    const trendData = this.healthTrends.get(instanceId);
    
    if (!trendData || trendData.recentMetrics.length < 10) {
      return anomalies;
    }

    // Check each metric for anomalies
    const metrics = ['cpu', 'memory', 'latency', 'errorRate'];
    
    metrics.forEach(metric => {
      const values = trendData.recentMetrics.map(m => m[metric]);
      const currentValue = snapshot.metrics[metric];
      
      // Run each anomaly detector
      for (const [detectorName, detector] of this.anomalyDetectors) {
        const anomaly = detector.detect(values);
        if (anomaly.isAnomaly) {
          anomalies.push({
            type: 'metric_anomaly',
            detector: detectorName,
            metric,
            value: currentValue,
            anomalyScore: anomaly.score,
            description: `${metric} anomaly detected by ${detectorName}`,
            severity: this.categorizeAnomalySeverity(anomaly.score)
          });
        }
      }
    });

    // Check for pattern anomalies
    const patterns = this.analyzeHealthPatterns(snapshot);
    const patternAnomalies = this.detectPatternAnomalies(patterns, snapshot);
    anomalies.push(...patternAnomalies);

    return anomalies;
  }

  /**
   * Predict future health issues
   */
  predictHealthIssues(instanceId, snapshot) {
    const predictions = [];
    const trendData = this.healthTrends.get(instanceId);
    
    if (!trendData || trendData.recentMetrics.length < 20) {
      return predictions;
    }

    // Predict based on trends
    const metrics = ['cpu', 'memory', 'latency', 'errorRate'];
    
    metrics.forEach(metric => {
      const values = trendData.recentMetrics.map(m => m[metric]);
      const trend = this.calculateTrend(values);
      const currentValue = snapshot.metrics[metric];
      
      // Predict future values
      const prediction = this.predictMetricValue(metric, currentValue, trend);
      
      if (prediction.willExceedThreshold) {
        predictions.push({
          type: 'threshold_prediction',
          metric,
          currentValue,
          predictedValue: prediction.value,
          timeToThreshold: prediction.timeToThreshold,
          threshold: prediction.threshold,
          confidence: prediction.confidence,
          severity: this.categorizePredictionSeverity(prediction.timeToThreshold)
        });
      }
    });

    // Predict based on patterns
    const patternPredictions = this.predictBasedOnPatterns(instanceId, snapshot);
    predictions.push(...patternPredictions);

    return predictions;
  }

  /**
   * Generate health alerts
   */
  generateHealthAlerts(snapshot, anomalies, predictions) {
    const alerts = [];
    const metrics = snapshot.metrics;

    // Threshold-based alerts
    Object.entries(metrics).forEach(([metric, value]) => {
      const thresholds = this.alertThresholds.get(metric);
      if (!thresholds) return;

      let alertLevel = null;
      let adjustedValue = value;

      // Adjust value for different metric types
      if (metric === 'connections' || metric === 'queueSize') {
        const maxValue = thresholds.critical;
        adjustedValue = (value / maxValue) * 100;
      } else if (metric === 'errorRate') {
        adjustedValue = value * 100;
      }

      if (adjustedValue > thresholds.critical || 
          (metric === 'latency' && value > thresholds.critical)) {
        alertLevel = 'critical';
      } else if (adjustedValue > thresholds.warning || 
                 (metric === 'latency' && value > thresholds.warning)) {
        alertLevel = 'warning';
      }

      if (alertLevel) {
        alerts.push({
          type: 'threshold_alert',
          level: alertLevel,
          metric,
          value: value,
          threshold: alertLevel === 'critical' ? thresholds.critical : thresholds.warning,
          message: `${metric} ${alertLevel}: ${value} exceeds ${alertLevel} threshold`
        });
      }
    });

    // Anomaly-based alerts
    anomalies.forEach(anomaly => {
      if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
        alerts.push({
          type: 'anomaly_alert',
          level: anomaly.severity === 'critical' ? 'critical' : 'warning',
          detector: anomaly.detector,
          metric: anomaly.metric,
          anomalyScore: anomaly.anomalyScore,
          message: anomaly.description
        });
      }
    });

    // Prediction-based alerts
    predictions.forEach(prediction => {
      if (prediction.timeToThreshold < 300000) { // Less than 5 minutes
        alerts.push({
          type: 'prediction_alert',
          level: prediction.severity === 'critical' ? 'critical' : 'warning',
          metric: prediction.metric,
          timeToThreshold: prediction.timeToThreshold,
          predictedValue: prediction.predictedValue,
          message: `${prediction.metric} predicted to exceed threshold in ${Math.round(prediction.timeToThreshold / 60000)} minutes`
        });
      }
    });

    return alerts.sort((a, b) => {
      const levelOrder = { critical: 0, warning: 1, info: 2 };
      return levelOrder[a.level] - levelOrder[b.level];
    });
  }

  /**
   * Generate health recommendations
   */
  generateHealthRecommendations(snapshot, patterns, anomalies) {
    const recommendations = [];
    const metrics = snapshot.metrics;

    // Resource-based recommendations
    if (metrics.cpu > 80) {
      recommendations.push({
        type: 'resource_optimization',
        priority: 'high',
        action: 'scale_cpu_resources',
        description: 'High CPU usage detected',
        implementation: 'vertical_scaling'
      });
    }

    if (metrics.memory > 85) {
      recommendations.push({
        type: 'resource_optimization',
        priority: 'high',
        action: 'scale_memory_resources',
        description: 'High memory usage detected',
        implementation: 'memory_optimization'
      });
    }

    if (metrics.queueSize > 1000) {
      recommendations.push({
        type: 'performance_optimization',
        priority: 'medium',
        action: 'increase_processing_capacity',
        description: 'High queue size detected',
        implementation: 'horizontal_scaling'
      });
    }

    if (metrics.latency > 1000) {
      recommendations.push({
        type: 'performance_optimization',
        priority: 'high',
        action: 'optimize_response_time',
        description: 'High latency detected',
        implementation: 'performance_tuning'
      });
    }

    // Pattern-based recommendations
    if (patterns.loadProfile === 'high_load') {
      recommendations.push({
        type: 'capacity_planning',
        priority: 'medium',
        action: 'prepare_for_scale_out',
        description: 'High load pattern detected',
        implementation: 'auto_scaling'
      });
    }

    // Anomaly-based recommendations
    anomalies.forEach(anomaly => {
      if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
        recommendations.push({
          type: 'anomaly_response',
          priority: anomaly.severity === 'critical' ? 'critical' : 'high',
          action: 'investigate_anomaly',
          description: `Investigate ${anomaly.metric} anomaly`,
          implementation: 'monitoring_analysis'
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // Helper methods for categorization
  categorizeLoadProfile(metrics) {
    const loadScore = (metrics.cpu + metrics.memory) / 2;
    if (loadScore > 80) return 'high_load';
    if (loadScore > 60) return 'medium_load';
    return 'low_load';
  }

  categorizeResourceUsage(metrics) {
    const maxUsage = Math.max(metrics.cpu, metrics.memory, metrics.disk);
    if (maxUsage > 90) return 'critical_usage';
    if (maxUsage > 75) return 'high_usage';
    if (maxUsage > 50) return 'medium_usage';
    return 'low_usage';
  }

  categorizeNetworkPattern(metrics) {
    const totalNetwork = metrics.networkIn + metrics.networkOut;
    if (totalNetwork > 1000) return 'high_network';
    if (totalNetwork > 500) return 'medium_network';
    return 'low_network';
  }

  categorizeErrorPattern(metrics, errors) {
    if (metrics.errorRate > 0.1 || errors.length > 10) return 'high_errors';
    if (metrics.errorRate > 0.05 || errors.length > 5) return 'medium_errors';
    return 'low_errors';
  }

  categorizeTimePattern(timestamp) {
    const hour = new Date(timestamp).getHours();
    if (hour >= 9 && hour <= 17) return 'business_hours';
    if (hour >= 18 && hour <= 23) return 'evening';
    return 'off_hours';
  }

  categorizePerformanceProfile(metrics) {
    if (metrics.latency > 1000 || metrics.throughput < 10) return 'poor_performance';
    if (metrics.latency > 500 || metrics.throughput < 50) return 'degraded_performance';
    return 'good_performance';
  }

  // Anomaly detection implementations
  detectMovingAverageAnomaly(values) {
    const detector = this.anomalyDetectors.get('moving_average');
    const windowSize = Math.min(detector.windowSize, values.length);
    
    if (windowSize < 5) return { isAnomaly: false, score: 0 };

    const recentValues = values.slice(-windowSize);
    const mean = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    const variance = recentValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentValues.length;
    const stdDev = Math.sqrt(variance);
    
    const currentValue = values[values.length - 1];
    const deviations = Math.abs(currentValue - mean) / (stdDev + 0.001); // Avoid division by zero
    
    return {
      isAnomaly: deviations > detector.threshold,
      score: Math.min(1, deviations / detector.threshold)
    };
  }

  detectTrendAnomaly(values) {
    const detector = this.anomalyDetectors.get('trend_based');
    const windowSize = Math.min(detector.windowSize, values.length);
    
    if (windowSize < 10) return { isAnomaly: false, score: 0 };

    const recentValues = values.slice(-windowSize);
    const trend = this.calculateTrend(recentValues);
    const avgValue = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    
    // Normalize trend by average value to get rate of change
    const normalizedTrend = avgValue > 0 ? Math.abs(trend) / avgValue : Math.abs(trend);
    
    return {
      isAnomaly: normalizedTrend > detector.threshold,
      score: Math.min(1, normalizedTrend / detector.threshold)
    };
  }

  detectSeasonalAnomaly(values, timestamps) {
    // Simplified seasonal detection - would need more sophisticated implementation
    return { isAnomaly: false, score: 0 };
  }

  // Helper methods
  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (val * index), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  calculateHealthTrend(scores) {
    if (scores.length < 5) return 'stable';
    
    const trend = this.calculateTrend(scores);
    const recentAvg = scores.slice(-5).reduce((sum, score) => sum + score, 0) / 5;
    const overallAvg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    if (trend > 0.01 && recentAvg > overallAvg) return 'improving';
    if (trend < -0.01 && recentAvg < overallAvg) return 'degrading';
    return 'stable';
  }

  createPatternKey(patterns) {
    return JSON.stringify(patterns, Object.keys(patterns).sort());
  }

  determineInstanceStatus(healthScore, anomalies, predictions) {
    const criticalAnomalies = anomalies.filter(a => a.severity === 'critical').length;
    const criticalPredictions = predictions.filter(p => p.severity === 'critical').length;
    
    if (healthScore < 0.3 || criticalAnomalies > 0 || criticalPredictions > 0) {
      return 'critical';
    }
    
    if (healthScore < 0.6 || anomalies.length > 2 || predictions.length > 1) {
      return 'warning';
    }
    
    if (healthScore < 0.8 || anomalies.length > 0) {
      return 'monitoring';
    }
    
    return 'healthy';
  }

  categorizeAnomalySeverity(score) {
    if (score > 0.8) return 'critical';
    if (score > 0.6) return 'high';
    if (score > 0.4) return 'medium';
    return 'low';
  }

  categorizePredictionSeverity(timeToThreshold) {
    if (timeToThreshold < 60000) return 'critical'; // Less than 1 minute
    if (timeToThreshold < 300000) return 'high'; // Less than 5 minutes
    if (timeToThreshold < 900000) return 'medium'; // Less than 15 minutes
    return 'low';
  }

  predictMetricValue(metric, currentValue, trend) {
    const thresholds = this.alertThresholds.get(metric);
    if (!thresholds) return { willExceedThreshold: false };

    // Simple linear prediction (would use more sophisticated models in production)
    const timeStep = 60000; // 1 minute
    let predictedValue = currentValue + trend * timeStep;
    let timeToThreshold = null;
    let threshold = null;

    if (metric === 'latency') {
      threshold = thresholds.warning;
      if (trend > 0 && predictedValue > threshold) {
        timeToThreshold = (threshold - currentValue) / trend;
      }
    } else if (metric === 'errorRate') {
      threshold = thresholds.warning;
      if (trend > 0 && predictedValue > threshold) {
        timeToThreshold = (threshold - currentValue) / trend;
      }
    } else {
      // Percentage-based metrics
      threshold = thresholds.warning;
      if (trend > 0 && predictedValue > threshold) {
        timeToThreshold = (threshold - currentValue) / trend;
      }
    }

    return {
      willExceedThreshold: timeToThreshold !== null && timeToThreshold > 0,
      value: predictedValue,
      timeToThreshold: timeToThreshold || Infinity,
      threshold: threshold,
      confidence: Math.min(1, Math.abs(trend) / (currentValue + 1))
    };
  }

  detectPatternAnomalies(patterns, snapshot) {
    // Placeholder for pattern-based anomaly detection
    return [];
  }

  predictBasedOnPatterns(instanceId, snapshot) {
    // Placeholder for pattern-based predictions
    return [];
  }

  /**
   * Export health monitoring data
   */
  exportHealthData() {
    return {
      timestamp: Date.now(),
      healthPatterns: Array.from(this.healthPatterns.entries()),
      healthTrends: Array.from(this.healthTrends.entries()),
      alertThresholds: Array.from(this.alertThresholds.entries()),
      recentHistory: this.healthHistory.slice(-2000),
      metadata: {
        maxHistorySize: this.maxHistorySize,
        learningRate: this.learningRate,
        version: '1.0.0'
      }
    };
  }

  /**
   * Import health monitoring data
   */
  importHealthData(data) {
    if (data.healthPatterns) {
      this.healthPatterns = new Map(data.healthPatterns);
    }
    if (data.healthTrends) {
      this.healthTrends = new Map(data.healthTrends);
    }
    if (data.alertThresholds) {
      this.alertThresholds = new Map(data.alertThresholds);
    }
    if (data.recentHistory) {
      this.healthHistory = data.recentHistory;
    }
  }
}

module.exports = InstanceHealthMonitor;