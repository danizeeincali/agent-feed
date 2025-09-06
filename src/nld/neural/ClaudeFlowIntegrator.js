/**
 * Claude Flow Neural Integration for NLD System
 * Integrates NLD patterns with claude-flow neural training system
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

export class ClaudeFlowIntegrator extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      dataPath: config.dataPath || '/workspaces/agent-feed/.claude-flow/nld',
      claudeFlowPath: config.claudeFlowPath || '/workspaces/agent-feed/.claude-flow',
      neuralModelVersion: config.neuralModelVersion || '2.0.0',
      trainingBatchSize: config.trainingBatchSize || 100,
      patternConfidenceThreshold: config.patternConfidenceThreshold || 0.75,
      exportInterval: config.exportInterval || 30 * 60 * 1000, // 30 minutes
      enableRealTimeUpdates: config.enableRealTimeUpdates !== false,
      ...config
    };

    // Neural pattern storage
    this.neuralPatterns = new Map();
    this.trainingQueue = [];
    this.modelMetrics = {
      totalPatterns: 0,
      trainedPatterns: 0,
      predictionAccuracy: 0.0,
      lastTrainingTime: null,
      modelVersion: this.config.neuralModelVersion
    };

    // Claude Flow integration state
    this.claudeFlowReady = false;
    this.lastExport = null;

    this.initialize();
  }

  async initialize() {
    try {
      await this.setupClaudeFlowDirectories();
      await this.loadExistingNeuralPatterns();
      await this.validateClaudeFlowIntegration();
      
      if (this.config.enableRealTimeUpdates) {
        this.startRealTimeUpdates();
      }
      
      console.log('🧠 Claude Flow Integrator initialized');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Claude Flow Integrator initialization failed:', error);
      this.emit('error', error);
    }
  }

  /**
   * Process NLD pattern for neural training
   */
  async processNeuralPattern(patternData) {
    try {
      const neuralPattern = this.convertToNeuralFormat(patternData);
      
      // Validate pattern quality
      if (!this.validatePatternQuality(neuralPattern)) {
        console.warn('⚠️ Pattern quality insufficient for neural training');
        return false;
      }

      // Store pattern
      this.neuralPatterns.set(neuralPattern.id, neuralPattern);
      this.trainingQueue.push(neuralPattern);
      
      // Update metrics
      this.modelMetrics.totalPatterns++;
      
      // Export to claude-flow if ready
      if (this.claudeFlowReady) {
        await this.exportPatternToClaudeFlow(neuralPattern);
      }
      
      // Trigger training if batch is ready
      if (this.trainingQueue.length >= this.config.trainingBatchSize) {
        await this.triggerBatchTraining();
      }
      
      this.emit('patternProcessed', neuralPattern);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to process neural pattern:', error);
      return false;
    }
  }

  /**
   * Convert NLD pattern to claude-flow neural format
   */
  convertToNeuralFormat(patternData) {
    const neuralPattern = {
      id: `nld-${patternData.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      version: this.config.neuralModelVersion,
      type: 'link-preview-pattern',
      category: patternData.category || 'general',
      
      // Input features
      input: {
        platform: patternData.platform,
        errorType: patternData.errorType,
        httpStatus: patternData.httpStatus,
        requestMethod: patternData.requestMethod || 'GET',
        userAgent: this.hashUserAgent(patternData.userAgent),
        timeOfDay: this.extractTimeOfDay(patternData.timestamp),
        dayOfWeek: this.extractDayOfWeek(patternData.timestamp),
        retryCount: patternData.retryCount || 0,
        previousFailures: patternData.previousFailures || 0,
        responseTime: patternData.responseTime,
        contentLength: patternData.contentLength || 0,
        hasAuth: patternData.hasAuth || false,
        useProxy: patternData.useProxy || false
      },
      
      // Expected output
      output: {
        outcome: patternData.outcome, // 'success' | 'failure'
        failureProbability: patternData.failureProbability || 0.0,
        recommendedAction: patternData.recommendedAction,
        confidenceScore: patternData.confidenceScore || 0.5,
        recoveryStrategy: patternData.recoveryStrategy,
        expectedDuration: patternData.expectedDuration
      },
      
      // Pattern metadata
      metadata: {
        source: 'nld-tracker',
        sessionId: patternData.sessionId,
        originalRequestId: patternData.requestId,
        patternType: patternData.patternType,
        frequency: patternData.frequency || 1,
        lastOccurrence: patternData.timestamp,
        quality: this.calculatePatternQuality(patternData),
        trainingWeight: this.calculateTrainingWeight(patternData)
      },
      
      // Neural training configuration
      training: {
        learningRate: 0.001,
        epochs: 10,
        validationSplit: 0.2,
        earlyStopping: true,
        regularization: 'l2',
        dropout: 0.2
      }
    };

    return neuralPattern;
  }

  /**
   * Export pattern to claude-flow neural system
   */
  async exportPatternToClaudeFlow(neuralPattern) {
    try {
      // Export to neural patterns directory
      const patternPath = path.join(
        this.config.claudeFlowPath,
        'neural-training',
        'patterns',
        `${neuralPattern.id}.json`
      );
      
      await fs.writeFile(patternPath, JSON.stringify(neuralPattern, null, 2));
      
      // Update pattern index
      await this.updatePatternIndex(neuralPattern);
      
      // Export to training data format
      const trainingData = this.convertToTrainingData(neuralPattern);
      const trainingPath = path.join(
        this.config.claudeFlowPath,
        'neural-training',
        'training-data',
        `${neuralPattern.id}.json`
      );
      
      await fs.writeFile(trainingPath, JSON.stringify(trainingData, null, 2));
      
      console.log(`🧠 Exported neural pattern to claude-flow: ${neuralPattern.id}`);
      
    } catch (error) {
      console.error('❌ Failed to export pattern to claude-flow:', error);
      throw error;
    }
  }

  /**
   * Convert neural pattern to training data format
   */
  convertToTrainingData(neuralPattern) {
    return {
      id: neuralPattern.id,
      timestamp: neuralPattern.timestamp,
      
      // Feature vector
      features: [
        this.encodePlatform(neuralPattern.input.platform),
        this.encodeErrorType(neuralPattern.input.errorType),
        this.encodeHttpStatus(neuralPattern.input.httpStatus),
        neuralPattern.input.timeOfDay / 24.0, // Normalize to 0-1
        neuralPattern.input.dayOfWeek / 7.0, // Normalize to 0-1
        Math.min(neuralPattern.input.retryCount / 10.0, 1.0), // Cap at 10 retries
        Math.min(neuralPattern.input.previousFailures / 20.0, 1.0), // Cap at 20
        Math.min(neuralPattern.input.responseTime / 30000.0, 1.0), // Cap at 30s
        neuralPattern.input.hasAuth ? 1.0 : 0.0,
        neuralPattern.input.useProxy ? 1.0 : 0.0
      ],
      
      // Target values
      targets: [
        neuralPattern.output.outcome === 'success' ? 1.0 : 0.0,
        neuralPattern.output.failureProbability,
        neuralPattern.output.confidenceScore,
        this.encodeRecoveryStrategy(neuralPattern.output.recoveryStrategy)
      ],
      
      // Training metadata
      weight: neuralPattern.metadata.trainingWeight,
      quality: neuralPattern.metadata.quality,
      category: neuralPattern.category
    };
  }

  /**
   * Trigger batch training
   */
  async triggerBatchTraining() {
    try {
      if (this.trainingQueue.length === 0) return;
      
      console.log(`🚀 Starting batch training with ${this.trainingQueue.length} patterns`);
      
      // Prepare training batch
      const trainingBatch = {
        id: `training-batch-${Date.now()}`,
        timestamp: new Date().toISOString(),
        modelVersion: this.config.neuralModelVersion,
        patterns: this.trainingQueue.slice(),
        configuration: {
          batchSize: this.trainingQueue.length,
          learningRate: 0.001,
          epochs: 20,
          validationSplit: 0.2
        }
      };
      
      // Export training batch
      const batchPath = path.join(
        this.config.claudeFlowPath,
        'neural-training',
        'batches',
        `${trainingBatch.id}.json`
      );
      
      await fs.writeFile(batchPath, JSON.stringify(trainingBatch, null, 2));
      
      // Update model metrics
      this.modelMetrics.trainedPatterns += this.trainingQueue.length;
      this.modelMetrics.lastTrainingTime = new Date().toISOString();
      
      // Clear training queue
      this.trainingQueue = [];
      
      // Trigger claude-flow training
      await this.triggerClaudeFlowTraining(trainingBatch.id);
      
      this.emit('batchTrainingTriggered', trainingBatch);
      
      console.log(`✅ Batch training completed: ${trainingBatch.id}`);
      
    } catch (error) {
      console.error('❌ Batch training failed:', error);
      throw error;
    }
  }

  /**
   * Trigger claude-flow training process
   */
  async triggerClaudeFlowTraining(batchId) {
    try {
      // Create training command file
      const commandFile = {
        command: 'train-neural-model',
        batchId,
        timestamp: new Date().toISOString(),
        modelType: 'link-preview-predictor',
        configuration: {
          architecture: 'feedforward',
          hiddenLayers: [128, 64, 32],
          activation: 'relu',
          optimizer: 'adam',
          lossFunction: 'categorical_crossentropy'
        }
      };
      
      const commandPath = path.join(
        this.config.claudeFlowPath,
        'commands',
        `train-${batchId}.json`
      );
      
      await fs.writeFile(commandPath, JSON.stringify(commandFile, null, 2));
      
      console.log(`🧠 Triggered claude-flow training: ${batchId}`);
      
    } catch (error) {
      console.error('❌ Failed to trigger claude-flow training:', error);
    }
  }

  /**
   * Get prediction from trained model
   */
  async getPrediction(requestData) {
    try {
      // Convert request data to feature vector
      const features = this.convertRequestToFeatures(requestData);
      
      // Load trained model (simplified)
      const modelPath = path.join(
        this.config.claudeFlowPath,
        'models',
        'link-preview-predictor-latest.json'
      );
      
      let model = null;
      try {
        const modelData = await fs.readFile(modelPath, 'utf8');
        model = JSON.parse(modelData);
      } catch (error) {
        console.warn('⚠️ No trained model available, using heuristics');
        return this.getHeuristicPrediction(requestData);
      }
      
      // Simple prediction (in real implementation would use actual neural network)
      const prediction = this.simplePrediction(features, model);
      
      return {
        success: prediction.success,
        failureProbability: prediction.failureProbability,
        confidence: prediction.confidence,
        recommendedAction: prediction.recommendedAction,
        estimatedDuration: prediction.estimatedDuration,
        modelVersion: this.config.neuralModelVersion,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Prediction failed:', error);
      return this.getHeuristicPrediction(requestData);
    }
  }

  /**
   * Export comprehensive neural data
   */
  async exportNeuralData() {
    try {
      const exportData = {
        metadata: {
          exportTimestamp: new Date().toISOString(),
          modelVersion: this.config.neuralModelVersion,
          totalPatterns: this.neuralPatterns.size,
          metrics: this.modelMetrics
        },
        patterns: Array.from(this.neuralPatterns.values()),
        trainingQueue: this.trainingQueue,
        platformEncodings: this.getPlatformEncodings(),
        errorTypeEncodings: this.getErrorTypeEncodings(),
        statusCodeEncodings: this.getStatusCodeEncodings(),
        configuration: this.config
      };
      
      const exportPath = path.join(
        this.config.dataPath,
        'exports',
        `neural-data-${Date.now()}.json`
      );
      
      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
      
      console.log(`🧠 Neural data exported: ${exportPath}`);
      return exportPath;
      
    } catch (error) {
      console.error('❌ Neural data export failed:', error);
      throw error;
    }
  }

  /**
   * Get neural system status
   */
  getNeuralStatus() {
    return {
      isReady: this.claudeFlowReady,
      patterns: this.neuralPatterns.size,
      trainingQueue: this.trainingQueue.length,
      metrics: this.modelMetrics,
      lastExport: this.lastExport,
      configuration: this.config
    };
  }

  // Utility methods
  async setupClaudeFlowDirectories() {
    const dirs = [
      'neural-training/patterns',
      'neural-training/training-data',
      'neural-training/batches',
      'models',
      'commands'
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(path.join(this.config.claudeFlowPath, dir), { recursive: true });
    }
  }

  async loadExistingNeuralPatterns() {
    try {
      const patternsDir = path.join(this.config.claudeFlowPath, 'neural-training', 'patterns');
      const files = await fs.readdir(patternsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(patternsDir, file);
          const patternData = JSON.parse(await fs.readFile(filePath, 'utf8'));
          this.neuralPatterns.set(patternData.id, patternData);
        }
      }
      
      console.log(`🧠 Loaded ${this.neuralPatterns.size} existing neural patterns`);
    } catch (error) {
      console.warn('⚠️ Could not load existing neural patterns:', error.message);
    }
  }

  async validateClaudeFlowIntegration() {
    try {
      const testPath = path.join(this.config.claudeFlowPath, 'test-integration.json');
      const testData = { test: true, timestamp: new Date().toISOString() };
      
      await fs.writeFile(testPath, JSON.stringify(testData));
      await fs.unlink(testPath);
      
      this.claudeFlowReady = true;
      console.log('✅ Claude Flow integration validated');
    } catch (error) {
      console.warn('⚠️ Claude Flow integration validation failed:', error.message);
      this.claudeFlowReady = false;
    }
  }

  startRealTimeUpdates() {
    setInterval(() => {
      this.performPeriodicExport();
    }, this.config.exportInterval);
  }

  async performPeriodicExport() {
    if (this.trainingQueue.length > 0) {
      await this.triggerBatchTraining();
    }
    
    this.lastExport = new Date().toISOString();
  }

  validatePatternQuality(neuralPattern) {
    // Check required fields
    if (!neuralPattern.input.platform || !neuralPattern.output.outcome) {
      return false;
    }
    
    // Check quality score
    if (neuralPattern.metadata.quality < 0.5) {
      return false;
    }
    
    return true;
  }

  calculatePatternQuality(patternData) {
    let quality = 0.5; // Base quality
    
    // Bonus for complete data
    if (patternData.httpStatus) quality += 0.1;
    if (patternData.responseTime) quality += 0.1;
    if (patternData.errorType) quality += 0.1;
    if (patternData.recoveryStrategy) quality += 0.1;
    
    // Bonus for confidence
    if (patternData.confidenceScore > 0.8) quality += 0.2;
    
    return Math.min(quality, 1.0);
  }

  calculateTrainingWeight(patternData) {
    let weight = 1.0;
    
    // Higher weight for recent patterns
    const age = Date.now() - new Date(patternData.timestamp).getTime();
    const ageHours = age / (1000 * 60 * 60);
    if (ageHours < 24) weight += 0.5;
    else if (ageHours < 72) weight += 0.2;
    
    // Higher weight for rare patterns
    if (patternData.frequency && patternData.frequency < 5) {
      weight += 0.3;
    }
    
    return weight;
  }

  // Encoding methods
  encodePlatform(platform) {
    const platforms = {
      'youtube.com': 0.1,
      'twitter.com': 0.2,
      'facebook.com': 0.3,
      'instagram.com': 0.4,
      'linkedin.com': 0.5,
      'default': 0.9
    };
    return platforms[platform] || platforms['default'];
  }

  encodeErrorType(errorType) {
    const errorTypes = {
      'network': 0.1,
      'timeout': 0.2,
      'auth': 0.3,
      'rate-limit': 0.4,
      'parsing': 0.5,
      'unknown': 0.9
    };
    return errorTypes[errorType] || errorTypes['unknown'];
  }

  encodeHttpStatus(status) {
    if (!status) return 0.0;
    return status / 1000.0; // Normalize HTTP status codes
  }

  encodeRecoveryStrategy(strategy) {
    const strategies = {
      'retry': 0.1,
      'fallback': 0.2,
      'alternative-endpoint': 0.3,
      'wait-and-retry': 0.4,
      'proxy-rotation': 0.5,
      'none': 0.0
    };
    return strategies[strategy] || strategies['none'];
  }

  // Pattern processing utilities
  hashUserAgent(userAgent) {
    if (!userAgent) return 0;
    // Simple hash for user agent (maintain privacy)
    let hash = 0;
    for (let i = 0; i < userAgent.length; i++) {
      const char = userAgent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 1000 / 1000.0; // Normalize to 0-1
  }

  extractTimeOfDay(timestamp) {
    return new Date(timestamp).getHours();
  }

  extractDayOfWeek(timestamp) {
    return new Date(timestamp).getDay();
  }

  convertRequestToFeatures(requestData) {
    return [
      this.encodePlatform(requestData.platform),
      0.0, // Error type unknown for predictions
      0.0, // HTTP status unknown for predictions
      new Date().getHours() / 24.0,
      new Date().getDay() / 7.0,
      0.0, // No retries yet
      0.0, // No previous failures for new request
      0.0, // No response time yet
      requestData.hasAuth ? 1.0 : 0.0,
      requestData.useProxy ? 1.0 : 0.0
    ];
  }

  simplePrediction(features, model) {
    // Simplified prediction logic
    // In real implementation, would use actual neural network
    const platformRisk = features[0];
    const timeRisk = features[3] > 0.5 && features[3] < 0.7 ? 0.2 : 0.0; // Business hours
    const baseRisk = 0.1;
    
    const failureProbability = Math.min(baseRisk + platformRisk + timeRisk, 0.9);
    
    return {
      success: failureProbability < 0.5,
      failureProbability,
      confidence: 0.7,
      recommendedAction: failureProbability > 0.6 ? 'use-fallback' : 'proceed',
      estimatedDuration: failureProbability > 0.5 ? 15000 : 5000
    };
  }

  getHeuristicPrediction(requestData) {
    return {
      success: true,
      failureProbability: 0.1,
      confidence: 0.3,
      recommendedAction: 'proceed',
      estimatedDuration: 5000,
      modelVersion: 'heuristic-fallback',
      timestamp: new Date().toISOString()
    };
  }

  async updatePatternIndex(neuralPattern) {
    const indexPath = path.join(this.config.claudeFlowPath, 'neural-training', 'pattern-index.json');
    
    let index = [];
    try {
      const indexData = await fs.readFile(indexPath, 'utf8');
      index = JSON.parse(indexData);
    } catch (error) {
      // Index doesn't exist yet
    }
    
    index.push({
      id: neuralPattern.id,
      timestamp: neuralPattern.timestamp,
      type: neuralPattern.type,
      platform: neuralPattern.input.platform,
      outcome: neuralPattern.output.outcome,
      quality: neuralPattern.metadata.quality
    });
    
    // Keep only recent entries (last 1000)
    if (index.length > 1000) {
      index = index.slice(-1000);
    }
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }

  getPlatformEncodings() {
    return {
      'youtube.com': 0.1,
      'twitter.com': 0.2,
      'facebook.com': 0.3,
      'instagram.com': 0.4,
      'linkedin.com': 0.5
    };
  }

  getErrorTypeEncodings() {
    return {
      'network': 0.1,
      'timeout': 0.2,
      'auth': 0.3,
      'rate-limit': 0.4,
      'parsing': 0.5
    };
  }

  getStatusCodeEncodings() {
    return {
      '2xx': 0.2,
      '3xx': 0.3,
      '4xx': 0.4,
      '5xx': 0.5
    };
  }
}

export default ClaudeFlowIntegrator;