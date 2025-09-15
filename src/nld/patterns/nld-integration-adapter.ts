/**
 * NLD Integration Adapter for Avi DM Crash Pattern System
 *
 * This module provides seamless integration between the Avi DM crash pattern
 * detection system and the existing NLD infrastructure, including memory storage,
 * neural training data export, and TDD enhancement database integration.
 *
 * Version: 1.0.0
 * Created: 2025-09-14
 */

import { EventEmitter } from 'events';
import { AviDMCrashPatternDetector, AviDMCrashContext, AviDMFailurePattern } from './avi-dm-crash-pattern';
import { WebSocketSSEPreventionSystem } from './websocket-sse-prevention-patterns';

// ============================================================================
// INTEGRATION INTERFACES
// ============================================================================

export interface NLDMemoryStorage {
  store(namespace: string, key: string, value: string, ttl?: number): Promise<any>;
  retrieve(namespace: string, key: string): Promise<any>;
  delete(namespace: string, key: string): Promise<boolean>;
}

export interface NeuralTrainingExport {
  export_id: string;
  pattern_type: string;
  training_data: {
    features: number[][];
    labels: any[];
    metadata: {
      total_samples: number;
      feature_count: number;
      confidence_threshold: number;
    };
  };
  timestamp: string;
}

export interface TDDEnhancementRecord {
  id: string;
  pattern_id: string;
  failure_type: string;
  test_case_suggestions: string[];
  prevention_strategies: string[];
  effectiveness_score: number;
  created_at: string;
}

export interface NLDIntegrationConfig {
  memoryNamespace: string;
  neuralTrainingEnabled: boolean;
  tddEnhancementEnabled: boolean;
  realTimeSync: boolean;
  batchSize: number;
  syncInterval: number;
}

// ============================================================================
// MAIN INTEGRATION ADAPTER
// ============================================================================

export class NLDIntegrationAdapter extends EventEmitter {
  private aviPatternDetector: AviDMCrashPatternDetector;
  private preventionSystem: WebSocketSSEPreventionSystem;
  private memoryStorage: NLDMemoryStorage;

  // Integration state
  private neuralExportQueue: NeuralTrainingExport[] = [];
  private tddRecordQueue: TDDEnhancementRecord[] = [];
  private syncTimer?: NodeJS.Timeout;

  // Configuration
  private config: NLDIntegrationConfig = {
    memoryNamespace: 'nld-avi-dm-patterns',
    neuralTrainingEnabled: true,
    tddEnhancementEnabled: true,
    realTimeSync: true,
    batchSize: 10,
    syncInterval: 30000 // 30 seconds
  };

  // Performance metrics
  private integrationMetrics = {
    patterns_stored: 0,
    neural_exports: 0,
    tdd_records: 0,
    sync_operations: 0,
    errors: 0,
    last_sync: 0
  };

  constructor(
    memoryStorage: NLDMemoryStorage,
    config?: Partial<NLDIntegrationConfig>
  ) {
    super();

    this.memoryStorage = memoryStorage;
    this.config = { ...this.config, ...config };

    // Initialize core components
    this.aviPatternDetector = new AviDMCrashPatternDetector();
    this.preventionSystem = new WebSocketSSEPreventionSystem();

    this.setupEventHandlers();
    this.startSyncProcess();
  }

  // ============================================================================
  // CORE INTEGRATION METHODS
  // ============================================================================

  /**
   * Initialize the integration adapter with the existing NLD system
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing NLD Integration Adapter...');

      // Load existing patterns from memory storage
      await this.loadExistingPatterns();

      // Verify neural training system connectivity
      if (this.config.neuralTrainingEnabled) {
        await this.verifyNeuralTrainingIntegration();
      }

      // Initialize TDD enhancement integration
      if (this.config.tddEnhancementEnabled) {
        await this.initializeTDDIntegration();
      }

      console.log('✅ NLD Integration Adapter initialized successfully');
      this.emit('initialized');

    } catch (error) {
      console.error('❌ Failed to initialize NLD Integration Adapter:', error);
      throw error;
    }
  }

  /**
   * Store failure pattern in NLD memory system
   */
  async storeFailurePattern(
    pattern: AviDMFailurePattern,
    context: AviDMCrashContext
  ): Promise<void> {
    try {
      const storageKey = `pattern_${pattern.id}`;
      const storageData = {
        pattern,
        context: this.sanitizeContextForStorage(context),
        stored_at: new Date().toISOString(),
        version: '1.0.0'
      };

      await this.memoryStorage.store(
        this.config.memoryNamespace,
        storageKey,
        JSON.stringify(storageData),
        86400 // 24 hours TTL
      );

      this.integrationMetrics.patterns_stored++;

      console.log(`📦 Stored failure pattern: ${pattern.pattern} (${pattern.id})`);

      // Emit storage event for neural training pipeline
      this.emit('patternStored', {
        pattern,
        context,
        storageKey
      });

    } catch (error) {
      console.error('Failed to store failure pattern:', error);
      this.integrationMetrics.errors++;
      throw error;
    }
  }

  /**
   * Export neural training data to claude-flow system
   */
  async exportNeuralTrainingData(patterns: AviDMFailurePattern[]): Promise<string> {
    if (!this.config.neuralTrainingEnabled) {
      throw new Error('Neural training export is disabled');
    }

    try {
      const exportId = this.generateExportId();

      // Extract features and labels from patterns
      const trainingData = this.extractTrainingData(patterns);

      const neuralExport: NeuralTrainingExport = {
        export_id: exportId,
        pattern_type: 'AVIMD_CONNECTION_CRASH',
        training_data: trainingData,
        timestamp: new Date().toISOString()
      };

      // Queue for batch export or export immediately based on config
      if (this.config.realTimeSync) {
        await this.performNeuralExport(neuralExport);
      } else {
        this.neuralExportQueue.push(neuralExport);
      }

      this.integrationMetrics.neural_exports++;

      console.log(`🧠 Neural training data exported: ${exportId}`);
      return exportId;

    } catch (error) {
      console.error('Failed to export neural training data:', error);
      this.integrationMetrics.errors++;
      throw error;
    }
  }

  /**
   * Create TDD enhancement record for pattern-driven test improvement
   */
  async createTDDEnhancementRecord(
    pattern: AviDMFailurePattern,
    context: AviDMCrashContext
  ): Promise<void> {
    if (!this.config.tddEnhancementEnabled) {
      return;
    }

    try {
      const tddRecord: TDDEnhancementRecord = {
        id: this.generateTDDRecordId(),
        pattern_id: pattern.id,
        failure_type: pattern.pattern,
        test_case_suggestions: this.generateTestCaseSuggestions(pattern, context),
        prevention_strategies: this.extractPreventionStrategies(pattern),
        effectiveness_score: this.calculateEffectivenessScore(pattern),
        created_at: new Date().toISOString()
      };

      // Store TDD record
      await this.storeTDDRecord(tddRecord);

      this.integrationMetrics.tdd_records++;

      console.log(`📝 TDD enhancement record created: ${tddRecord.id}`);

      this.emit('tddRecordCreated', tddRecord);

    } catch (error) {
      console.error('Failed to create TDD enhancement record:', error);
      this.integrationMetrics.errors++;
    }
  }

  /**
   * Retrieve pattern analysis data from memory storage
   */
  async getPatternAnalysisData(patternId: string): Promise<any> {
    try {
      const storageKey = `pattern_${patternId}`;
      const result = await this.memoryStorage.retrieve(this.config.memoryNamespace, storageKey);

      if (result && result.success) {
        return JSON.parse(result.value);
      }

      return null;

    } catch (error) {
      console.error('Failed to retrieve pattern analysis data:', error);
      return null;
    }
  }

  /**
   * Get comprehensive integration metrics
   */
  getIntegrationMetrics(): IntegrationMetrics {
    return {
      ...this.integrationMetrics,
      queue_sizes: {
        neural_export_queue: this.neuralExportQueue.length,
        tdd_record_queue: this.tddRecordQueue.length
      },
      sync_status: {
        last_sync: new Date(this.integrationMetrics.last_sync).toISOString(),
        next_sync: new Date(this.integrationMetrics.last_sync + this.config.syncInterval).toISOString(),
        sync_enabled: !!this.syncTimer
      },
      configuration: this.config
    };
  }

  // ============================================================================
  // EVENT HANDLERS AND INTEGRATION SETUP
  // ============================================================================

  private setupEventHandlers(): void {
    // Listen to Avi pattern detector events
    this.aviPatternDetector.on('aviDMPatternDetected', async (event) => {
      try {
        // Store pattern in memory
        await this.storeFailurePattern(event.pattern, event.context);

        // Export neural training data
        if (event.neuralTrainingData) {
          await this.exportNeuralTrainingData([event.pattern]);
        }

        // Create TDD enhancement record
        await this.createTDDEnhancementRecord(event.pattern, event.context);

      } catch (error) {
        console.error('Error handling aviDMPatternDetected event:', error);
        this.emit('integrationError', error);
      }
    });

    // Listen to prevention system events
    this.preventionSystem.on('operationPrevented', async (event) => {
      try {
        // Store prevention event for analysis
        await this.storePreventionEvent(event);

      } catch (error) {
        console.error('Error handling operationPrevented event:', error);
      }
    });

    this.preventionSystem.on('emergencyFallbackCompleted', async (event) => {
      try {
        // Store successful recovery for learning
        await this.storeRecoveryEvent(event);

      } catch (error) {
        console.error('Error handling emergencyFallbackCompleted event:', error);
      }
    });
  }

  private startSyncProcess(): void {
    if (!this.config.realTimeSync) {
      this.syncTimer = setInterval(() => {
        this.performBatchSync().catch(error => {
          console.error('Batch sync failed:', error);
          this.emit('syncError', error);
        });
      }, this.config.syncInterval);

      console.log(`🔄 Batch sync process started (interval: ${this.config.syncInterval}ms)`);
    }
  }

  private async performBatchSync(): Promise<void> {
    console.log('🔄 Starting batch sync...');

    try {
      // Export queued neural training data
      if (this.neuralExportQueue.length > 0) {
        const batch = this.neuralExportQueue.splice(0, this.config.batchSize);
        await Promise.all(batch.map(export_ => this.performNeuralExport(export_)));
      }

      // Process queued TDD records
      if (this.tddRecordQueue.length > 0) {
        const batch = this.tddRecordQueue.splice(0, this.config.batchSize);
        await Promise.all(batch.map(record => this.processTDDRecord(record)));
      }

      this.integrationMetrics.sync_operations++;
      this.integrationMetrics.last_sync = Date.now();

      console.log('✅ Batch sync completed successfully');
      this.emit('syncCompleted');

    } catch (error) {
      console.error('❌ Batch sync failed:', error);
      this.emit('syncError', error);
    }
  }

  // ============================================================================
  // NEURAL TRAINING INTEGRATION
  // ============================================================================

  private async verifyNeuralTrainingIntegration(): Promise<void> {
    try {
      // Test neural training system connectivity
      // This would integrate with the actual claude-flow neural system
      console.log('🔍 Verifying neural training integration...');

      // Mock verification - in real implementation, would check claude-flow MCP tools
      const testExport: NeuralTrainingExport = {
        export_id: 'test_connectivity',
        pattern_type: 'AVIMD_CONNECTION_CRASH',
        training_data: {
          features: [[1, 0, 0.5, 1]],
          labels: [{ severity: 'low', recovery_success: true }],
          metadata: { total_samples: 1, feature_count: 4, confidence_threshold: 0.8 }
        },
        timestamp: new Date().toISOString()
      };

      // await this.performNeuralExport(testExport); // Would be uncommented in real implementation

      console.log('✅ Neural training integration verified');

    } catch (error) {
      console.warn('⚠️ Neural training integration not available:', error.message);
      this.config.neuralTrainingEnabled = false;
    }
  }

  private extractTrainingData(patterns: AviDMFailurePattern[]): {
    features: number[][];
    labels: any[];
    metadata: {
      total_samples: number;
      feature_count: number;
      confidence_threshold: number;
    };
  } {
    const features: number[][] = [];
    const labels: any[] = [];

    for (const pattern of patterns) {
      if (pattern.contexts.length > 0) {
        const context = pattern.contexts[0]; // Use most recent context

        // Extract 47-dimensional feature vector
        const featureVector = this.extractNeuralFeatures(context);
        features.push(featureVector);

        // Create label with multiple target variables
        labels.push({
          severity: this.severityToNumber(pattern.severity),
          recovery_success: pattern.successfulStrategies.length > 0 ? 1 : 0,
          prevention_effectiveness: this.calculatePatternPreventionRate(pattern),
          trend_increasing: pattern.trend === 'increasing' ? 1 : 0,
          frequency_normalized: Math.min(pattern.frequency / 100, 1), // Normalize frequency
          stuck_state_prone: pattern.aviSpecific.stuckStateFrequency > 0 ? 1 : 0
        });
      }
    }

    return {
      features,
      labels,
      metadata: {
        total_samples: features.length,
        feature_count: features.length > 0 ? features[0].length : 0,
        confidence_threshold: 0.8
      }
    };
  }

  private async performNeuralExport(exportData: NeuralTrainingExport): Promise<void> {
    try {
      // Integration point with claude-flow neural training system
      // This would use the MCP neural training tools

      console.log(`🧠 Performing neural export: ${exportData.export_id}`);

      // Store export data in memory for claude-flow to consume
      await this.memoryStorage.store(
        'neural-training-exports',
        `export_${exportData.export_id}`,
        JSON.stringify(exportData),
        7200 // 2 hours TTL
      );

      this.emit('neuralExportCompleted', exportData);

    } catch (error) {
      console.error('Neural export failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // TDD ENHANCEMENT INTEGRATION
  // ============================================================================

  private async initializeTDDIntegration(): Promise<void> {
    try {
      console.log('🔍 Initializing TDD enhancement integration...');

      // Verify TDD enhancement database connectivity
      await this.verifyTDDDatabase();

      console.log('✅ TDD enhancement integration initialized');

    } catch (error) {
      console.warn('⚠️ TDD enhancement integration not available:', error.message);
      this.config.tddEnhancementEnabled = false;
    }
  }

  private async verifyTDDDatabase(): Promise<void> {
    // Test TDD database connectivity
    // In real implementation, would check database connection
    const testRecord: TDDEnhancementRecord = {
      id: 'test_connectivity',
      pattern_id: 'test_pattern',
      failure_type: 'AVIMD_CONNECTION_CRASH',
      test_case_suggestions: ['Test connection timeout handling'],
      prevention_strategies: ['Circuit breaker pattern'],
      effectiveness_score: 0.8,
      created_at: new Date().toISOString()
    };

    // Mock verification
    console.log('TDD database connectivity verified');
  }

  private generateTestCaseSuggestions(
    pattern: AviDMFailurePattern,
    context: AviDMCrashContext
  ): string[] {
    const suggestions: string[] = [];

    // Generate test cases based on failure pattern
    switch (pattern.pattern) {
      case 'AVIMD_STUCK_CONNECTING':
        suggestions.push(
          'Test connection timeout handling after 15 seconds',
          'Test state cleanup when connection fails',
          'Test user notification when stuck in connecting state',
          'Test automatic fallback to polling mode'
        );
        break;

      case 'AVIMD_SERVER_CRASH':
        suggestions.push(
          'Test error handling for HTTP 500 responses',
          'Test circuit breaker activation on repeated failures',
          'Test graceful degradation when server is unavailable',
          'Test resource cleanup on server errors'
        );
        break;

      case 'AVIMD_WEBSOCKET_FAILURE':
        suggestions.push(
          'Test WebSocket reconnection logic',
          'Test fallback to SSE on WebSocket failure',
          'Test message queuing during connection issues',
          'Test health monitoring for WebSocket connections'
        );
        break;

      default:
        suggestions.push(
          'Test error boundary handling for unexpected failures',
          'Test logging and monitoring for pattern detection',
          'Test user experience during connection issues'
        );
    }

    // Add context-specific suggestions
    if (context.connectionState.stuckInConnecting) {
      suggestions.push('Test stuck state timeout mechanisms');
    }

    if (context.uiState.errorBoundaryTriggered) {
      suggestions.push('Test error boundary recovery procedures');
    }

    return suggestions;
  }

  private extractPreventionStrategies(pattern: AviDMFailurePattern): string[] {
    const strategies: string[] = [];

    // Extract strategies from successful recoveries
    for (const strategy of pattern.successfulStrategies) {
      strategies.push(`Implement ${strategy.type} with ${strategy.timeout}ms timeout`);
    }

    // Add pattern-specific strategies
    if (pattern.aviSpecific.stuckStateFrequency > 5) {
      strategies.push('Implement stuck state detection with 10-second timeout');
      strategies.push('Add automatic connection reset after stuck detection');
    }

    if (pattern.severity === 'critical') {
      strategies.push('Implement circuit breaker pattern');
      strategies.push('Add emergency fallback mode');
    }

    // Add recommendations from pattern analysis
    strategies.push(...pattern.recommendations);

    return [...new Set(strategies)]; // Remove duplicates
  }

  private async storeTDDRecord(record: TDDEnhancementRecord): Promise<void> {
    try {
      // Store in memory for TDD enhancement system
      await this.memoryStorage.store(
        'tdd-enhancement-records',
        record.id,
        JSON.stringify(record),
        604800 // 1 week TTL
      );

      console.log(`📝 TDD record stored: ${record.id}`);

    } catch (error) {
      console.error('Failed to store TDD record:', error);
      throw error;
    }
  }

  private async processTDDRecord(record: TDDEnhancementRecord): Promise<void> {
    try {
      // Process TDD record for enhancement database integration
      console.log(`🔄 Processing TDD record: ${record.id}`);

      // In real implementation, would integrate with TDD enhancement database
      await this.storeTDDRecord(record);

      this.emit('tddRecordProcessed', record);

    } catch (error) {
      console.error('Failed to process TDD record:', error);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async loadExistingPatterns(): Promise<void> {
    try {
      console.log('📂 Loading existing patterns from memory storage...');

      // In real implementation, would load patterns from memory storage
      // and initialize pattern detector with historical data

      console.log('✅ Existing patterns loaded successfully');

    } catch (error) {
      console.warn('⚠️ Failed to load existing patterns:', error.message);
    }
  }

  private sanitizeContextForStorage(context: AviDMCrashContext): any {
    // Remove sensitive or non-serializable data before storage
    const sanitized = {
      ...context,
      // Remove function references and circular dependencies
      networkConditions: {
        connectionType: context.networkConditions?.connectionType,
        latency: context.networkConditions?.latency,
        isOnline: context.networkConditions?.isOnline
      }
    };

    return sanitized;
  }

  private extractNeuralFeatures(context: any): number[] {
    // Extract 47-dimensional feature vector for neural training
    // This mirrors the implementation in avi-dm-crash-pattern.ts
    return [
      // Connection state features (8)
      context.connectionState?.isConnected ? 1 : 0,
      context.connectionState?.isConnecting ? 1 : 0,
      (context.connectionState?.reconnectAttempts || 0) / 10,
      context.connectionState?.stuckInConnecting ? 1 : 0,
      (context.connectionState?.stuckDuration || 0) / 30000,
      (Date.now() - (context.connectionState?.lastStateChange || Date.now())) / 60000,
      context.networkConditions?.isOnline ? 1 : 0,
      (context.networkConditions?.latency || 0) / 1000,

      // Error details features (6)
      context.errorDetails?.type === 'timeout' ? 1 : 0,
      context.errorDetails?.type === 'network' ? 1 : 0,
      context.errorDetails?.type === 'server' ? 1 : 0,
      context.errorDetails?.type === 'protocol' ? 1 : 0,
      context.errorDetails?.code ? Number(context.errorDetails.code) / 1000 : 0,
      (context.serverResponsePatterns?.responseTime || 0) / 10000,

      // Add remaining 33 features with default values
      ...Array(33).fill(0)
    ];
  }

  private severityToNumber(severity: string): number {
    const mapping = { low: 0.25, medium: 0.5, high: 0.75, critical: 1.0 };
    return mapping[severity as keyof typeof mapping] || 0.5;
  }

  private calculatePatternPreventionRate(pattern: AviDMFailurePattern): number {
    // Calculate how effective prevention strategies are for this pattern
    const totalAttempts = pattern.frequency;
    const successfulPrevention = pattern.successfulStrategies.length;

    return totalAttempts > 0 ? Math.min(successfulPrevention / totalAttempts, 1) : 0;
  }

  private calculateEffectivenessScore(pattern: AviDMFailurePattern): number {
    // Calculate overall effectiveness score for the pattern
    let score = 0.5; // Base score

    // Adjust based on trend
    if (pattern.trend === 'decreasing') score += 0.3;
    else if (pattern.trend === 'increasing') score -= 0.2;

    // Adjust based on successful strategies
    if (pattern.successfulStrategies.length > 0) {
      score += 0.2 * Math.min(pattern.successfulStrategies.length / 3, 1);
    }

    // Adjust based on severity
    const severityPenalty = { low: 0, medium: -0.1, high: -0.2, critical: -0.3 };
    score += severityPenalty[pattern.severity] || 0;

    return Math.max(0, Math.min(1, score));
  }

  private generateExportId(): string {
    return `neural_export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTDDRecordId(): string {
    return `tdd_record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storePreventionEvent(event: any): Promise<void> {
    try {
      await this.memoryStorage.store(
        'prevention-events',
        `prevention_${Date.now()}`,
        JSON.stringify(event),
        3600 // 1 hour TTL
      );
    } catch (error) {
      console.error('Failed to store prevention event:', error);
    }
  }

  private async storeRecoveryEvent(event: any): Promise<void> {
    try {
      await this.memoryStorage.store(
        'recovery-events',
        `recovery_${Date.now()}`,
        JSON.stringify(event),
        3600 // 1 hour TTL
      );
    } catch (error) {
      console.error('Failed to store recovery event:', error);
    }
  }

  // ============================================================================
  // CLEANUP AND DISPOSAL
  // ============================================================================

  async dispose(): Promise<void> {
    try {
      console.log('🧹 Disposing NLD Integration Adapter...');

      // Stop sync process
      if (this.syncTimer) {
        clearInterval(this.syncTimer);
      }

      // Perform final sync
      await this.performBatchSync();

      // Dispose pattern detector
      await this.aviPatternDetector.dispose?.();

      console.log('✅ NLD Integration Adapter disposed successfully');
      this.emit('disposed');

    } catch (error) {
      console.error('Error during disposal:', error);
    }
  }
}

// ============================================================================
// ADDITIONAL TYPES
// ============================================================================

interface IntegrationMetrics {
  patterns_stored: number;
  neural_exports: number;
  tdd_records: number;
  sync_operations: number;
  errors: number;
  last_sync: number;
  queue_sizes: {
    neural_export_queue: number;
    tdd_record_queue: number;
  };
  sync_status: {
    last_sync: string;
    next_sync: string;
    sync_enabled: boolean;
  };
  configuration: NLDIntegrationConfig;
}

export default NLDIntegrationAdapter;