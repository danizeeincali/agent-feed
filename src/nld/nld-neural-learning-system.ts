/**
 * NLD Neural Learning System
 * Automatically learns from failure patterns and improves prevention strategies
 */

import { mcp__claude_flow__neural_patterns, mcp__claude_flow__neural_train, mcp__claude_flow__memory_usage } from '../utils/mcp-tools';

export interface FailureRecord {
  id: string;
  timestamp: number;
  type: 'websocket' | 'sse' | 'polling' | 'connection' | 'state_sync' | 'browser_compat';
  subtype: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: {
    browser: string;
    browserVersion: string;
    platform: string;
    transport: string;
    url: string;
    error: string;
    userAgent: string;
    connectionState: string;
    networkCondition?: string;
    previousFailures?: number;
  };
  solution: {
    strategy: string;
    successful: boolean;
    timeToResolve: number;
    fallbackUsed: boolean;
    manualIntervention: boolean;
  };
  prevention: {
    wasPreventable: boolean;
    preventionAttempted: boolean;
    preventionStrategy?: string;
    preventionEffective: boolean;
  };
  userImpact: {
    severity: 'none' | 'low' | 'medium' | 'high' | 'severe';
    duration: number;
    affectedFeatures: string[];
    userExperience: 'seamless' | 'minor_disruption' | 'major_disruption' | 'service_unavailable';
  };
  learningOutcome: {
    patternIdentified: boolean;
    newPreventionRule: boolean;
    confidenceScore: number;
    recommendedActions: string[];
  };
}

export interface LearningPattern {
  id: string;
  name: string;
  type: string;
  frequency: number;
  successRate: number;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'matches';
    value: any;
  }>;
  preventionStrategy: string;
  confidence: number;
  lastUpdated: number;
  effectiveness: {
    prevented: number;
    failed: number;
    falsePositives: number;
  };
}

export interface NeuralModel {
  id: string;
  type: 'classification' | 'prediction' | 'optimization';
  version: number;
  trainingData: FailureRecord[];
  accuracy: number;
  lastTrained: number;
  features: string[];
  hyperparameters: Record<string, any>;
  performance: {
    precision: number;
    recall: number;
    f1Score: number;
    auc: number;
  };
}

export class NLDNeuralLearningSystem {
  private failureRecords: Map<string, FailureRecord> = new Map();
  private learningPatterns: Map<string, LearningPattern> = new Map();
  private neuralModels: Map<string, NeuralModel> = new Map();
  private trainingQueue: FailureRecord[] = [];
  private isTraining = false;
  private learningMetrics = {
    totalRecords: 0,
    patternCount: 0,
    preventionSuccessRate: 0,
    falsePositiveRate: 0,
    modelAccuracy: 0,
    lastTrainingTime: 0
  };

  constructor() {
    this.initializeModels();
    this.startLearningCycle();
  }

  /**
   * Initialize neural models for different failure types
   */
  private initializeModels(): void {
    const models: Partial<NeuralModel>[] = [
      {
        id: 'connection_failure_predictor',
        type: 'prediction',
        version: 1,
        features: ['browser', 'browserVersion', 'platform', 'transport', 'networkCondition', 'previousFailures'],
        hyperparameters: { learning_rate: 0.001, batch_size: 32, epochs: 100 }
      },
      {
        id: 'failure_pattern_classifier',
        type: 'classification',
        version: 1,
        features: ['error', 'connectionState', 'transport', 'browser', 'userAgent'],
        hyperparameters: { learning_rate: 0.01, batch_size: 16, epochs: 50 }
      },
      {
        id: 'prevention_optimizer',
        type: 'optimization',
        version: 1,
        features: ['preventionStrategy', 'severity', 'userImpact', 'timeToResolve'],
        hyperparameters: { learning_rate: 0.005, batch_size: 24, epochs: 75 }
      }
    ];

    models.forEach(modelData => {
      const model: NeuralModel = {
        id: modelData.id!,
        type: modelData.type!,
        version: modelData.version!,
        trainingData: [],
        accuracy: 0,
        lastTrained: 0,
        features: modelData.features!,
        hyperparameters: modelData.hyperparameters!,
        performance: {
          precision: 0,
          recall: 0,
          f1Score: 0,
          auc: 0
        }
      };

      this.neuralModels.set(model.id, model);
    });
  }

  /**
   * Record a failure for learning
   */
  public async recordFailure(
    type: FailureRecord['type'],
    subtype: string,
    context: FailureRecord['context'],
    solution?: Partial<FailureRecord['solution']>,
    prevention?: Partial<FailureRecord['prevention']>,
    userImpact?: Partial<FailureRecord['userImpact']>
  ): Promise<string> {
    const failureId = `failure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const record: FailureRecord = {
      id: failureId,
      timestamp: Date.now(),
      type,
      subtype,
      severity: this.calculateSeverity(context, userImpact),
      context,
      solution: {
        strategy: solution?.strategy || 'unknown',
        successful: solution?.successful ?? false,
        timeToResolve: solution?.timeToResolve || 0,
        fallbackUsed: solution?.fallbackUsed ?? false,
        manualIntervention: solution?.manualIntervention ?? false
      },
      prevention: {
        wasPreventable: prevention?.wasPreventable ?? true,
        preventionAttempted: prevention?.preventionAttempted ?? false,
        preventionStrategy: prevention?.preventionStrategy,
        preventionEffective: prevention?.preventionEffective ?? false
      },
      userImpact: {
        severity: userImpact?.severity || 'medium',
        duration: userImpact?.duration || 0,
        affectedFeatures: userImpact?.affectedFeatures || [],
        userExperience: userImpact?.userExperience || 'minor_disruption'
      },
      learningOutcome: {
        patternIdentified: false,
        newPreventionRule: false,
        confidenceScore: 0,
        recommendedActions: []
      }
    };

    // Store record
    this.failureRecords.set(failureId, record);
    this.trainingQueue.push(record);
    
    // Update metrics
    this.learningMetrics.totalRecords++;

    // Store in memory for persistence
    await mcp__claude_flow__memory_usage({
      action: 'store',
      namespace: 'nld-failures',
      key: failureId,
      value: JSON.stringify(record),
      ttl: 7200000 // 2 hours
    });

    // Trigger immediate pattern analysis
    await this.analyzeFailurePattern(record);

    console.log(`🧠 [NLD-Neural] Failure recorded: ${failureId} (${type}/${subtype})`);
    
    return failureId;
  }

  /**
   * Analyze failure pattern immediately
   */
  private async analyzeFailurePattern(record: FailureRecord): Promise<void> {
    console.log(`🔍 [NLD-Neural] Analyzing pattern for: ${record.id}`);

    // Check for existing patterns
    const matchingPatterns = this.findMatchingPatterns(record);
    
    if (matchingPatterns.length > 0) {
      // Update existing patterns
      for (const pattern of matchingPatterns) {
        pattern.frequency++;
        pattern.lastUpdated = Date.now();
        
        // Update effectiveness based on prevention outcome
        if (record.prevention.preventionAttempted) {
          if (record.prevention.preventionEffective) {
            pattern.effectiveness.prevented++;
          } else {
            pattern.effectiveness.failed++;
          }
        }

        // Recalculate success rate
        pattern.successRate = pattern.effectiveness.prevented / 
          (pattern.effectiveness.prevented + pattern.effectiveness.failed);
        
        // Update confidence
        pattern.confidence = Math.min(pattern.frequency / 10, 1) * pattern.successRate;
      }

      record.learningOutcome.patternIdentified = true;
      record.learningOutcome.confidenceScore = Math.max(...matchingPatterns.map(p => p.confidence));
    } else {
      // Create new pattern if frequency threshold met
      const similarFailures = this.findSimilarFailures(record);
      
      if (similarFailures.length >= 2) { // At least 3 similar failures total
        const newPattern = await this.createLearningPattern(record, similarFailures);
        this.learningPatterns.set(newPattern.id, newPattern);
        
        record.learningOutcome.newPreventionRule = true;
        record.learningOutcome.confidenceScore = newPattern.confidence;
        
        console.log(`🆕 [NLD-Neural] New pattern created: ${newPattern.name}`);
      }
    }

    // Generate recommendations
    record.learningOutcome.recommendedActions = this.generateRecommendations(record);

    // Train models if enough data
    if (this.trainingQueue.length >= 10) {
      this.scheduleTraining();
    }
  }

  /**
   * Find patterns that match the failure
   */
  private findMatchingPatterns(record: FailureRecord): LearningPattern[] {
    return Array.from(this.learningPatterns.values()).filter(pattern => {
      return pattern.conditions.every(condition => {
        const value = this.getRecordValue(record, condition.field);
        return this.evaluateCondition(value, condition.operator, condition.value);
      });
    });
  }

  /**
   * Find similar historical failures
   */
  private findSimilarFailures(record: FailureRecord): FailureRecord[] {
    return Array.from(this.failureRecords.values()).filter(other => {
      if (other.id === record.id) return false;
      
      return (
        other.type === record.type &&
        other.context.browser === record.context.browser &&
        other.context.transport === record.context.transport &&
        this.calculateSimilarity(record.context.error, other.context.error) > 0.7
      );
    });
  }

  /**
   * Create new learning pattern from failure records
   */
  private async createLearningPattern(
    seedRecord: FailureRecord, 
    similarRecords: FailureRecord[]
  ): Promise<LearningPattern> {
    const allRecords = [seedRecord, ...similarRecords];
    const patternId = `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract common conditions
    const conditions = this.extractCommonConditions(allRecords);
    
    // Determine prevention strategy
    const preventionStrategy = this.determineBestPreventionStrategy(allRecords);
    
    const pattern: LearningPattern = {
      id: patternId,
      name: `${seedRecord.type}_${seedRecord.subtype}_pattern`,
      type: seedRecord.type,
      frequency: allRecords.length,
      successRate: 0,
      conditions,
      preventionStrategy,
      confidence: allRecords.length / 10, // Base confidence on frequency
      lastUpdated: Date.now(),
      effectiveness: {
        prevented: 0,
        failed: 0,
        falsePositives: 0
      }
    };

    // Store pattern for neural training
    await mcp__claude_flow__neural_patterns({
      action: 'learn',
      operation: 'pattern_creation',
      outcome: JSON.stringify({
        patternId: pattern.id,
        type: pattern.type,
        conditions: pattern.conditions,
        strategy: pattern.preventionStrategy,
        confidence: pattern.confidence
      })
    });

    return pattern;
  }

  /**
   * Extract common conditions from failure records
   */
  private extractCommonConditions(records: FailureRecord[]): LearningPattern['conditions'] {
    const conditions: LearningPattern['conditions'] = [];
    
    // Check common browser
    const browsers = records.map(r => r.context.browser);
    if (new Set(browsers).size === 1) {
      conditions.push({
        field: 'context.browser',
        operator: 'equals',
        value: browsers[0]
      });
    }

    // Check common transport
    const transports = records.map(r => r.context.transport);
    if (new Set(transports).size === 1) {
      conditions.push({
        field: 'context.transport',
        operator: 'equals',
        value: transports[0]
      });
    }

    // Check common error patterns
    const errors = records.map(r => r.context.error);
    const commonErrorWords = this.findCommonWords(errors);
    if (commonErrorWords.length > 0) {
      conditions.push({
        field: 'context.error',
        operator: 'contains',
        value: commonErrorWords[0] // Most common word
      });
    }

    return conditions;
  }

  /**
   * Determine best prevention strategy from historical data
   */
  private determineBestPreventionStrategy(records: FailureRecord[]): string {
    const strategies = records
      .filter(r => r.solution.successful && r.prevention.preventionStrategy)
      .map(r => r.prevention.preventionStrategy!);
    
    if (strategies.length === 0) {
      return 'circuit_breaker_with_exponential_backoff';
    }

    // Return most successful strategy
    const strategyCount = new Map<string, number>();
    strategies.forEach(strategy => {
      strategyCount.set(strategy, (strategyCount.get(strategy) || 0) + 1);
    });

    return Array.from(strategyCount.entries())
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Generate recommendations based on failure analysis
   */
  private generateRecommendations(record: FailureRecord): string[] {
    const recommendations: string[] = [];

    // Browser-specific recommendations
    if (record.context.browser === 'Internet Explorer') {
      recommendations.push('Use polling transport for IE compatibility');
      recommendations.push('Load EventSource polyfill');
    }

    // Transport-specific recommendations
    if (record.context.transport === 'websocket' && record.context.error.includes('cors')) {
      recommendations.push('Switch to SSE transport for CORS issues');
      recommendations.push('Validate CORS headers before connection');
    }

    // Severity-based recommendations
    if (record.severity === 'critical') {
      recommendations.push('Implement immediate fallback mechanism');
      recommendations.push('Add user notification for service disruption');
    }

    // Pattern-based recommendations
    const patterns = this.findMatchingPatterns(record);
    patterns.forEach(pattern => {
      if (pattern.confidence > 0.8) {
        recommendations.push(`Apply proven strategy: ${pattern.preventionStrategy}`);
      }
    });

    return recommendations;
  }

  /**
   * Schedule neural model training
   */
  private scheduleTraining(): void {
    if (this.isTraining) return;

    setTimeout(() => {
      this.trainModels();
    }, 1000); // Train after 1 second delay
  }

  /**
   * Train all neural models with accumulated data
   */
  private async trainModels(): Promise<void> {
    if (this.isTraining || this.trainingQueue.length === 0) return;

    this.isTraining = true;
    console.log(`🏋️ [NLD-Neural] Starting training with ${this.trainingQueue.length} records`);

    try {
      for (const model of this.neuralModels.values()) {
        await this.trainModel(model);
      }

      // Clear training queue
      this.trainingQueue = [];
      this.learningMetrics.lastTrainingTime = Date.now();
      
      console.log('✅ [NLD-Neural] Training completed successfully');
    } catch (error) {
      console.error('❌ [NLD-Neural] Training failed:', error);
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Train individual model
   */
  private async trainModel(model: NeuralModel): Promise<void> {
    console.log(`🎯 [NLD-Neural] Training model: ${model.id}`);

    // Prepare training data
    const trainingData = this.prepareTrainingData(model);
    
    if (trainingData.length < 5) {
      console.log(`⏩ [NLD-Neural] Skipping ${model.id} - insufficient data`);
      return;
    }

    // Add new records to model's training data
    model.trainingData.push(...this.trainingQueue);
    
    // Keep only recent data (last 1000 records)
    if (model.trainingData.length > 1000) {
      model.trainingData = model.trainingData.slice(-1000);
    }

    try {
      // Train model using MCP neural training
      const trainingResult = await mcp__claude_flow__neural_train({
        pattern_type: model.type === 'classification' ? 'coordination' : 
                     model.type === 'prediction' ? 'prediction' : 'optimization',
        training_data: JSON.stringify(trainingData),
        epochs: model.hyperparameters.epochs || 50
      });

      if (trainingResult.success) {
        model.version++;
        model.lastTrained = Date.now();
        model.accuracy = this.calculateModelAccuracy(model);
        
        console.log(`✅ [NLD-Neural] Model ${model.id} trained - Accuracy: ${model.accuracy.toFixed(3)}`);
      }
    } catch (error) {
      console.error(`❌ [NLD-Neural] Failed to train ${model.id}:`, error);
    }
  }

  /**
   * Prepare training data for model
   */
  private prepareTrainingData(model: NeuralModel): any[] {
    return this.trainingQueue.map(record => {
      const features: any = {};
      
      model.features.forEach(feature => {
        features[feature] = this.getRecordValue(record, feature);
      });

      // Add label based on model type
      if (model.type === 'classification') {
        features.label = record.subtype;
      } else if (model.type === 'prediction') {
        features.label = record.solution.successful ? 1 : 0;
      } else if (model.type === 'optimization') {
        features.label = record.solution.timeToResolve;
      }

      return features;
    });
  }

  /**
   * Calculate model accuracy
   */
  private calculateModelAccuracy(model: NeuralModel): number {
    // Simplified accuracy calculation
    const successfulPredictions = model.trainingData.filter(record => 
      record.solution?.successful || false
    ).length;
    
    return model.trainingData.length > 0 ? 
      successfulPredictions / model.trainingData.length : 0;
  }

  /**
   * Predict failure likelihood
   */
  public async predictFailure(context: FailureRecord['context']): Promise<{
    likelihood: number;
    confidence: number;
    recommendedActions: string[];
    patterns: LearningPattern[];
  }> {
    const mockRecord: Partial<FailureRecord> = { context };
    const matchingPatterns = this.findMatchingPatterns(mockRecord as FailureRecord);
    
    let likelihood = 0;
    let confidence = 0;
    
    if (matchingPatterns.length > 0) {
      likelihood = 1 - (matchingPatterns.reduce((sum, p) => sum + p.successRate, 0) / matchingPatterns.length);
      confidence = matchingPatterns.reduce((sum, p) => sum + p.confidence, 0) / matchingPatterns.length;
    }

    // Use neural model for prediction if available
    const predictionModel = this.neuralModels.get('connection_failure_predictor');
    if (predictionModel && predictionModel.accuracy > 0.7) {
      try {
        const prediction = await mcp__claude_flow__neural_patterns({
          action: 'predict',
          operation: 'failure_prediction',
          metadata: { context }
        });
        
        if (prediction.success && prediction.prediction) {
          likelihood = Math.max(likelihood, prediction.prediction.likelihood || 0);
          confidence = Math.max(confidence, prediction.prediction.confidence || 0);
        }
      } catch (error) {
        console.warn('⚠️ [NLD-Neural] Prediction failed:', error);
      }
    }

    const recommendedActions = this.generatePreventiveActions(context, matchingPatterns);

    return {
      likelihood,
      confidence,
      recommendedActions,
      patterns: matchingPatterns
    };
  }

  /**
   * Generate preventive actions based on context and patterns
   */
  private generatePreventiveActions(
    context: FailureRecord['context'], 
    patterns: LearningPattern[]
  ): string[] {
    const actions: string[] = [];

    // Pattern-based actions
    patterns.forEach(pattern => {
      if (pattern.confidence > 0.7) {
        actions.push(`Apply ${pattern.preventionStrategy}`);
      }
    });

    // Context-based actions
    if (context.browser === 'Internet Explorer') {
      actions.push('Load compatibility polyfills');
    }

    if (context.transport === 'websocket' && context.previousFailures && context.previousFailures > 2) {
      actions.push('Switch to SSE transport');
    }

    return [...new Set(actions)]; // Remove duplicates
  }

  /**
   * Start continuous learning cycle
   */
  private startLearningCycle(): void {
    // Train models periodically
    setInterval(() => {
      if (this.trainingQueue.length > 0) {
        this.trainModels();
      }
    }, 300000); // Every 5 minutes

    // Update pattern effectiveness
    setInterval(() => {
      this.updatePatternEffectiveness();
    }, 60000); // Every minute

    // Clean old records
    setInterval(() => {
      this.cleanOldRecords();
    }, 3600000); // Every hour
  }

  /**
   * Update pattern effectiveness based on recent outcomes
   */
  private updatePatternEffectiveness(): void {
    this.learningPatterns.forEach(pattern => {
      // Recalculate success rate and confidence
      const total = pattern.effectiveness.prevented + pattern.effectiveness.failed;
      if (total > 0) {
        pattern.successRate = pattern.effectiveness.prevented / total;
        pattern.confidence = Math.min(pattern.frequency / 10, 1) * pattern.successRate;
      }
    });

    // Update learning metrics
    const totalPatterns = this.learningPatterns.size;
    const successfulPatterns = Array.from(this.learningPatterns.values())
      .filter(p => p.successRate > 0.8).length;
    
    this.learningMetrics.patternCount = totalPatterns;
    this.learningMetrics.preventionSuccessRate = totalPatterns > 0 ? 
      successfulPatterns / totalPatterns : 0;
  }

  /**
   * Clean old records to manage memory
   */
  private cleanOldRecords(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [id, record] of this.failureRecords.entries()) {
      if (record.timestamp < cutoffTime) {
        this.failureRecords.delete(id);
      }
    }

    console.log(`🧹 [NLD-Neural] Cleaned old records - Active: ${this.failureRecords.size}`);
  }

  /**
   * Helper methods
   */
  private calculateSeverity(
    context: FailureRecord['context'], 
    userImpact?: Partial<FailureRecord['userImpact']>
  ): FailureRecord['severity'] {
    if (userImpact?.userExperience === 'service_unavailable') return 'critical';
    if (context.error.includes('network') || context.error.includes('connection')) return 'high';
    if (userImpact?.userExperience === 'major_disruption') return 'high';
    if (userImpact?.userExperience === 'minor_disruption') return 'medium';
    return 'low';
  }

  private getRecordValue(record: FailureRecord, field: string): any {
    const parts = field.split('.');
    let value: any = record;
    
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }
    
    return value;
  }

  private evaluateCondition(value: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals': return value === expected;
      case 'contains': return String(value).toLowerCase().includes(String(expected).toLowerCase());
      case 'greater_than': return Number(value) > Number(expected);
      case 'less_than': return Number(value) < Number(expected);
      case 'in': return Array.isArray(expected) && expected.includes(value);
      case 'matches': return new RegExp(expected).test(String(value));
      default: return false;
    }
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation based on common words
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    const common = words1.filter(word => words2.includes(word));
    
    return common.length / Math.max(words1.length, words2.length);
  }

  private findCommonWords(strings: string[]): string[] {
    const wordCounts = new Map<string, number>();
    
    strings.forEach(str => {
      const words = str.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 3) { // Only meaningful words
          wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
      });
    });

    return Array.from(wordCounts.entries())
      .filter(([, count]) => count >= strings.length / 2) // At least half frequency
      .sort((a, b) => b[1] - a[1])
      .map(([word]) => word);
  }

  /**
   * Public API methods
   */
  public getMetrics(): typeof this.learningMetrics {
    return { ...this.learningMetrics };
  }

  public getPatterns(): LearningPattern[] {
    return Array.from(this.learningPatterns.values());
  }

  public getModel(id: string): NeuralModel | undefined {
    return this.neuralModels.get(id);
  }

  public getFailureHistory(limit = 100): FailureRecord[] {
    return Array.from(this.failureRecords.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

// Export singleton instance
export const nldNeuralLearningSystem = new NLDNeuralLearningSystem();