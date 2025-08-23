/**
 * Neural Learning Development - WebSocket Hub Failure Predictor
 * Predicts connection failures before they occur using pattern recognition
 */

class FailurePredictor {
  constructor() {
    this.failureSignatures = new Map();
    this.predictiveModels = new Map();
    this.realTimeMetrics = new Map();
    this.predictionHistory = [];
    this.alertThresholds = {
      critical: 0.8,
      warning: 0.6,
      info: 0.4
    };
    this.windowSize = 50; // Number of recent observations to consider
  }

  /**
   * Learn from failure events
   */
  learnFromFailure(failureData) {
    const signature = this.extractFailureSignature(failureData);
    const timestamp = Date.now();
    
    // Store failure signature
    const signatureKey = this.createSignatureKey(signature);
    if (!this.failureSignatures.has(signatureKey)) {
      this.failureSignatures.set(signatureKey, {
        pattern: signature,
        occurrences: 0,
        firstSeen: timestamp,
        lastSeen: timestamp,
        preconditions: [],
        followupFailures: 0
      });
    }

    const failureRecord = this.failureSignatures.get(signatureKey);
    failureRecord.occurrences++;
    failureRecord.lastSeen = timestamp;
    
    // Store preconditions that led to this failure
    failureRecord.preconditions.push({
      timestamp: failureData.timestamp,
      metrics: failureData.preconditionMetrics,
      timeToFailure: failureData.timestamp - failureData.preconditionTimestamp
    });

    // Update predictive models
    this.updatePredictiveModel(signature, failureData);
    
    // Check for failure cascades
    this.analyzeFailureCascade(failureData);

    return this.generateFailureInsights(signatureKey);
  }

  /**
   * Extract failure signature from failure data
   */
  extractFailureSignature(failureData) {
    return {
      errorType: failureData.errorType,
      errorCode: failureData.errorCode,
      component: failureData.component,
      loadLevel: this.categorizeLoad(failureData.connectionCount),
      timeCategory: this.getTimeCategory(failureData.timestamp),
      instanceHealth: failureData.instanceHealth,
      networkCondition: this.categorizeNetworkCondition(failureData.networkMetrics),
      resourceUsage: this.categorizeResourceUsage(failureData.resourceMetrics)
    };
  }

  /**
   * Update predictive model for failure type
   */
  updatePredictiveModel(signature, failureData) {
    const modelKey = `${signature.errorType}_${signature.component}`;
    
    if (!this.predictiveModels.has(modelKey)) {
      this.predictiveModels.set(modelKey, {
        type: signature.errorType,
        component: signature.component,
        features: {},
        weights: {},
        accuracy: 0,
        predictions: 0,
        correctPredictions: 0
      });
    }

    const model = this.predictiveModels.get(modelKey);
    
    // Extract features that preceded the failure
    const features = this.extractPredictiveFeatures(failureData);
    
    // Update feature importance
    Object.keys(features).forEach(feature => {
      if (!model.features[feature]) {
        model.features[feature] = { values: [], importance: 0 };
      }
      model.features[feature].values.push(features[feature]);
      
      // Keep only recent values
      if (model.features[feature].values.length > this.windowSize) {
        model.features[feature].values.shift();
      }
      
      // Calculate feature importance based on variance in failure cases
      model.features[feature].importance = this.calculateFeatureImportance(
        model.features[feature].values
      );
    });

    // Update model weights using simple gradient descent
    this.updateModelWeights(model, features, 1.0); // 1.0 = failure occurred
  }

  /**
   * Extract features that can predict failures
   */
  extractPredictiveFeatures(data) {
    return {
      connectionCount: data.connectionCount || 0,
      messageRate: data.messageRate || 0,
      errorRate: data.recentErrorRate || 0,
      latency: data.avgLatency || 0,
      cpuUsage: data.resourceMetrics?.cpu || 0,
      memoryUsage: data.resourceMetrics?.memory || 0,
      networkLatency: data.networkMetrics?.latency || 0,
      networkPacketLoss: data.networkMetrics?.packetLoss || 0,
      queueSize: data.queueSize || 0,
      timesSinceLastFailure: data.timeSinceLastFailure || Infinity,
      consecutiveErrors: data.consecutiveErrors || 0
    };
  }

  /**
   * Predict failure probability based on current metrics
   */
  predictFailure(currentMetrics) {
    const features = this.extractPredictiveFeatures(currentMetrics);
    const predictions = {};
    let maxProbability = 0;
    let primaryThreat = null;

    // Generate predictions from all models
    for (const [modelKey, model] of this.predictiveModels) {
      const probability = this.calculateFailureProbability(model, features);
      predictions[modelKey] = {
        probability,
        confidence: this.calculatePredictionConfidence(model),
        timeToFailure: this.estimateTimeToFailure(model, features),
        criticalFeatures: this.identifyCriticalFeatures(model, features)
      };

      if (probability > maxProbability) {
        maxProbability = probability;
        primaryThreat = modelKey;
      }
    }

    // Store prediction for accuracy tracking
    this.predictionHistory.push({
      timestamp: Date.now(),
      predictions,
      maxProbability,
      primaryThreat,
      features
    });

    // Trim prediction history
    if (this.predictionHistory.length > 1000) {
      this.predictionHistory.shift();
    }

    return {
      overallRisk: maxProbability,
      primaryThreat,
      predictions,
      alertLevel: this.determineAlertLevel(maxProbability),
      recommendations: this.generatePreventiveRecommendations(predictions)
    };
  }

  /**
   * Calculate failure probability using model
   */
  calculateFailureProbability(model, features) {
    let score = 0;
    let totalWeight = 0;

    Object.keys(features).forEach(featureName => {
      if (model.features[featureName] && model.weights[featureName]) {
        const featureValue = features[featureName];
        const normalizedValue = this.normalizeFeatureValue(featureName, featureValue);
        score += normalizedValue * model.weights[featureName] * model.features[featureName].importance;
        totalWeight += Math.abs(model.weights[featureName]);
      }
    });

    // Apply sigmoid function to get probability
    const rawProbability = totalWeight > 0 ? score / totalWeight : 0;
    return this.sigmoid(rawProbability);
  }

  /**
   * Calculate prediction confidence
   */
  calculatePredictionConfidence(model) {
    if (model.predictions === 0) return 0;
    
    const accuracy = model.correctPredictions / model.predictions;
    const dataMaturity = Math.min(model.predictions / 100, 1.0);
    
    return accuracy * dataMaturity;
  }

  /**
   * Estimate time to failure
   */
  estimateTimeToFailure(model, features) {
    // Simple heuristic based on feature severity
    const criticalFeatures = this.identifyCriticalFeatures(model, features);
    const avgSeverity = criticalFeatures.reduce((sum, f) => sum + f.severity, 0) / criticalFeatures.length;
    
    if (avgSeverity > 0.8) return 60; // 1 minute
    if (avgSeverity > 0.6) return 300; // 5 minutes
    if (avgSeverity > 0.4) return 900; // 15 minutes
    return 3600; // 1 hour
  }

  /**
   * Identify critical features contributing to failure risk
   */
  identifyCriticalFeatures(model, features) {
    const criticalFeatures = [];
    
    Object.keys(features).forEach(featureName => {
      if (model.features[featureName]) {
        const normalizedValue = this.normalizeFeatureValue(featureName, features[featureName]);
        const importance = model.features[featureName].importance;
        const weight = model.weights[featureName] || 0;
        
        const severity = normalizedValue * importance * Math.abs(weight);
        
        if (severity > 0.3) {
          criticalFeatures.push({
            feature: featureName,
            value: features[featureName],
            normalizedValue,
            importance,
            severity
          });
        }
      }
    });

    return criticalFeatures.sort((a, b) => b.severity - a.severity);
  }

  /**
   * Analyze failure cascades and patterns
   */
  analyzeFailureCascade(failureData) {
    const recentFailures = this.predictionHistory
      .filter(p => p.timestamp > Date.now() - (5 * 60 * 1000)) // Last 5 minutes
      .filter(p => p.maxProbability > 0.5);

    if (recentFailures.length > 3) {
      // Potential cascade detected
      this.handleFailureCascade(recentFailures, failureData);
    }
  }

  /**
   * Handle detected failure cascade
   */
  handleFailureCascade(recentFailures, currentFailure) {
    const cascadePattern = {
      timestamp: Date.now(),
      triggerFailure: currentFailure,
      precedingFailures: recentFailures,
      cascadeType: this.identifyCascadeType(recentFailures),
      severity: this.calculateCascadeSeverity(recentFailures)
    };

    // Store cascade pattern for future prediction
    this.storeCascadePattern(cascadePattern);
  }

  /**
   * Update prediction accuracy when actual outcome is known
   */
  updatePredictionAccuracy(predictionTimestamp, actualOutcome) {
    const prediction = this.predictionHistory.find(p => 
      Math.abs(p.timestamp - predictionTimestamp) < 60000 // Within 1 minute
    );

    if (prediction) {
      Object.keys(prediction.predictions).forEach(modelKey => {
        const model = this.predictiveModels.get(modelKey);
        if (model) {
          model.predictions++;
          
          const predicted = prediction.predictions[modelKey].probability > 0.5;
          const actual = actualOutcome.type === modelKey.split('_')[0];
          
          if (predicted === actual) {
            model.correctPredictions++;
          }
          
          model.accuracy = model.correctPredictions / model.predictions;
          
          // Update weights based on prediction accuracy
          this.adjustModelWeights(model, prediction.features, actual ? 1.0 : 0.0);
        }
      });
    }
  }

  /**
   * Generate preventive recommendations
   */
  generatePreventiveRecommendations(predictions) {
    const recommendations = [];
    
    Object.entries(predictions).forEach(([threat, data]) => {
      if (data.probability > this.alertThresholds.warning) {
        recommendations.push({
          threat,
          probability: data.probability,
          timeToFailure: data.timeToFailure,
          actions: this.getPreventiveActions(threat, data),
          priority: data.probability > this.alertThresholds.critical ? 'critical' : 'high'
        });
      }
    });

    return recommendations.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Get preventive actions for specific threat
   */
  getPreventiveActions(threat, predictionData) {
    const actions = [];
    const [errorType, component] = threat.split('_');
    
    switch (errorType) {
      case 'connection_timeout':
        actions.push('increase_connection_timeout');
        actions.push('check_network_latency');
        if (predictionData.timeToFailure < 300) {
          actions.push('scale_up_instances');
        }
        break;
        
      case 'memory_exhaustion':
        actions.push('trigger_garbage_collection');
        actions.push('scale_up_memory');
        actions.push('clear_message_queues');
        break;
        
      case 'high_latency':
        actions.push('redistribute_load');
        actions.push('optimize_routing');
        actions.push('check_database_performance');
        break;
        
      case 'websocket_disconnect':
        actions.push('implement_connection_pooling');
        actions.push('increase_heartbeat_frequency');
        actions.push('prepare_fallback_connections');
        break;
        
      default:
        actions.push('monitor_closely');
        actions.push('prepare_rollback');
    }

    // Add critical feature specific actions
    predictionData.criticalFeatures.forEach(feature => {
      if (feature.feature === 'cpuUsage' && feature.severity > 0.7) {
        actions.push('scale_cpu_resources');
      }
      if (feature.feature === 'queueSize' && feature.severity > 0.7) {
        actions.push('increase_processing_workers');
      }
    });

    return actions;
  }

  /**
   * Determine alert level based on probability
   */
  determineAlertLevel(probability) {
    if (probability >= this.alertThresholds.critical) return 'critical';
    if (probability >= this.alertThresholds.warning) return 'warning';
    if (probability >= this.alertThresholds.info) return 'info';
    return 'normal';
  }

  // Helper methods
  calculateFeatureImportance(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    
    return Math.min(Math.sqrt(variance) / (mean + 1), 1.0);
  }

  updateModelWeights(model, features, outcome) {
    const learningRate = 0.01;
    
    Object.keys(features).forEach(featureName => {
      if (!model.weights[featureName]) {
        model.weights[featureName] = Math.random() * 0.1;
      }
      
      const prediction = this.calculateFailureProbability(model, features);
      const error = outcome - prediction;
      
      model.weights[featureName] += learningRate * error * features[featureName];
    });
  }

  adjustModelWeights(model, features, actual) {
    const learningRate = 0.005;
    const predicted = this.calculateFailureProbability(model, features);
    const error = actual - predicted;
    
    Object.keys(features).forEach(featureName => {
      if (model.weights[featureName] !== undefined) {
        model.weights[featureName] += learningRate * error * features[featureName];
      }
    });
  }

  normalizeFeatureValue(featureName, value) {
    const normalizationRanges = {
      connectionCount: [0, 1000],
      messageRate: [0, 10000],
      errorRate: [0, 1],
      latency: [0, 5000],
      cpuUsage: [0, 100],
      memoryUsage: [0, 100],
      networkLatency: [0, 1000],
      networkPacketLoss: [0, 1],
      queueSize: [0, 10000]
    };

    const range = normalizationRanges[featureName] || [0, 1];
    return Math.min(Math.max((value - range[0]) / (range[1] - range[0]), 0), 1);
  }

  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  createSignatureKey(signature) {
    return JSON.stringify(signature, Object.keys(signature).sort());
  }

  categorizeLoad(count) {
    if (count < 10) return 'low';
    if (count < 50) return 'medium';
    if (count < 100) return 'high';
    return 'critical';
  }

  getTimeCategory(timestamp) {
    const hour = new Date(timestamp).getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  categorizeNetworkCondition(metrics) {
    if (!metrics) return 'unknown';
    
    const latency = metrics.latency || 0;
    const packetLoss = metrics.packetLoss || 0;
    
    if (latency > 1000 || packetLoss > 0.05) return 'poor';
    if (latency > 500 || packetLoss > 0.02) return 'degraded';
    if (latency > 200 || packetLoss > 0.01) return 'moderate';
    return 'good';
  }

  categorizeResourceUsage(metrics) {
    if (!metrics) return 'unknown';
    
    const cpu = metrics.cpu || 0;
    const memory = metrics.memory || 0;
    
    if (cpu > 90 || memory > 90) return 'critical';
    if (cpu > 75 || memory > 75) return 'high';
    if (cpu > 50 || memory > 50) return 'medium';
    return 'low';
  }

  /**
   * Export prediction models and patterns
   */
  exportPredictionData() {
    return {
      timestamp: Date.now(),
      failureSignatures: Array.from(this.failureSignatures.entries()),
      predictiveModels: Array.from(this.predictiveModels.entries()),
      predictionHistory: this.predictionHistory.slice(-500),
      metadata: {
        windowSize: this.windowSize,
        alertThresholds: this.alertThresholds,
        version: '1.0.0'
      }
    };
  }

  /**
   * Import prediction data
   */
  importPredictionData(data) {
    if (data.failureSignatures) {
      this.failureSignatures = new Map(data.failureSignatures);
    }
    if (data.predictiveModels) {
      this.predictiveModels = new Map(data.predictiveModels);
    }
    if (data.predictionHistory) {
      this.predictionHistory = data.predictionHistory;
    }
  }
}

module.exports = FailurePredictor;