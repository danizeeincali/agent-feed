/**
 * NLD (Neuro Learning Development) Connection Learning System
 * Main export file for all NLD components
 */

// Core Components
export { 
  ConnectionFailureDetector,
  type ConnectionFailureContext,
  type NetworkConditions,
  type ClientInfo,
  type ErrorDetails,
  type ConnectionAttempt,
  type ConnectionStrategy,
  type RecoveryContext,
  type FailurePattern,
  type ConnectionMetrics
} from './connection-failure-detector';

export {
  ConnectionLearningDatabase,
  type NLTRecord,
  type ConnectionLearningRecord,
  type NeuralFeatures,
  type StrategyPerformance
} from './learning-database';

export {
  AdaptiveConnectionManager,
  type AdaptiveConnectionConfig,
  type ConnectionHealth,
  type ConnectionAttemptResult
} from './adaptive-connection-manager';

export {
  NeuralConnectionTrainer,
  type NeuralTrainingConfig,
  type TrainingDataPoint,
  type TrainingLabels,
  type TrainingMetadata,
  type ModelPerformance,
  type PredictionResult
} from './neural-connection-trainer';

export {
  ClaudeFlowIntegration,
  type ClaudeFlowConfig,
  type NeuralTrainingRequest,
  type TaskOrchestrationRequest
} from './claude-flow-integration';

export {
  NLDPerformanceMonitor,
  type PerformanceMetric,
  type PerformanceThreshold,
  type PerformanceAlert,
  type PerformanceTrend,
  type PerformanceReport
} from './performance-monitor';

export {
  TroubleshootingEngine,
  type TroubleshootingRequest,
  type TroubleshootingSuggestion,
  type TroubleshootingStep,
  type TroubleshootingResource,
  type TroubleshootingResult,
  type DiagnosticTest,
  type DiagnosticResult
} from './troubleshooting-engine';

export {
  NLDWebSocketIntegration,
  createNLDWebSocketService,
  integrateNLDWithWebSocket,
  type NLDWebSocketConfig,
  type EnhancedWebSocketMessage
} from './websocket-integration';

// Utility functions and constants
export const NLD_VERSION = '1.0.0';

export const DEFAULT_NLD_CONFIG: Partial<NLDWebSocketConfig> = {
  enableLearning: true,
  enableAdaptiveRetry: true,
  enablePerformanceMonitoring: true,
  enableTroubleshooting: true,
  fallbackTransports: ['sse', 'polling'],
  circuitBreakerThreshold: 5,
  neuralTrainingEnabled: true
};

export const DEFAULT_PERFORMANCE_MONITOR_CONFIG = {
  metricsRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
  monitoringIntervalMs: 10000, // 10 seconds
  reportingIntervalMs: 300000, // 5 minutes
  alertingEnabled: true
};

export const DEFAULT_NEURAL_TRAINING_CONFIG: NeuralTrainingConfig = {
  batchSize: 50,
  learningRate: 0.001,
  epochs: 100,
  validationSplit: 0.2,
  modelType: 'classification',
  featureEngineering: true,
  autoTuning: true
};

export const DEFAULT_CLAUDE_FLOW_CONFIG: ClaudeFlowConfig = {
  mcpServerUrl: 'ws://localhost:3004/mcp',
  neuralTrainingEnabled: true,
  memoryNamespace: 'nld_connection',
  taskOrchestrationEnabled: true,
  performanceTrackingEnabled: true
};

/**
 * Create a complete NLD system with all components
 */
export function createCompleteNLDSystem(config: {
  webSocketConfig?: Partial<NLDWebSocketConfig>;
  performanceConfig?: Partial<any>;
  neuralConfig?: Partial<NeuralTrainingConfig>;
  claudeFlowConfig?: Partial<ClaudeFlowConfig>;
} = {}) {
  const {
    webSocketConfig = {},
    performanceConfig = {},
    neuralConfig = {},
    claudeFlowConfig = {}
  } = config;

  // Create enhanced WebSocket service
  const { service, nldIntegration } = createNLDWebSocketService({
    ...DEFAULT_NLD_CONFIG,
    ...webSocketConfig
  });

  // Initialize performance monitor
  const performanceMonitor = new NLDPerformanceMonitor({
    ...DEFAULT_PERFORMANCE_MONITOR_CONFIG,
    ...performanceConfig
  });

  // Initialize neural trainer
  const neuralTrainer = new NeuralConnectionTrainer({
    ...DEFAULT_NEURAL_TRAINING_CONFIG,
    ...neuralConfig
  });

  // Initialize Claude Flow integration
  const claudeFlowIntegration = new ClaudeFlowIntegration({
    ...DEFAULT_CLAUDE_FLOW_CONFIG,
    ...claudeFlowConfig
  });

  // Initialize learning database
  const learningDatabase = new ConnectionLearningDatabase();

  // Initialize troubleshooting engine
  const troubleshootingEngine = new TroubleshootingEngine(learningDatabase);

  // Start monitoring
  performanceMonitor.startMonitoring();

  return {
    webSocketService: service,
    nldIntegration,
    performanceMonitor,
    neuralTrainer,
    claudeFlowIntegration,
    learningDatabase,
    troubleshootingEngine,
    
    // Utility methods
    async shutdown() {
      performanceMonitor.stopMonitoring();
      await nldIntegration.shutdown();
      await claudeFlowIntegration.shutdown();
    },

    getSystemStatus() {
      return {
        nld_integration: nldIntegration.getNLDStatus(),
        performance_metrics: performanceMonitor.getDashboardData(),
        connection_health: nldIntegration.getConnectionHealth(),
        system_statistics: nldIntegration.getStatistics()
      };
    },

    async exportAllData() {
      const nldData = await nldIntegration.exportNLDData();
      const neuralModels = await neuralTrainer.exportModels();
      const performanceReport = performanceMonitor.generatePerformanceReport();
      
      return {
        nld_data: nldData,
        neural_models: neuralModels,
        performance_report: performanceReport,
        exported_at: new Date().toISOString(),
        version: NLD_VERSION
      };
    }
  };
}

/**
 * Quick setup function for basic NLD integration
 */
export function quickSetupNLD(options: {
  enableAll?: boolean;
  learningOnly?: boolean;
  monitoringOnly?: boolean;
} = {}) {
  const { enableAll = true, learningOnly = false, monitoringOnly = false } = options;

  let config: Partial<NLDWebSocketConfig>;

  if (learningOnly) {
    config = {
      enableLearning: true,
      enableAdaptiveRetry: false,
      enablePerformanceMonitoring: false,
      enableTroubleshooting: false,
      neuralTrainingEnabled: true
    };
  } else if (monitoringOnly) {
    config = {
      enableLearning: false,
      enableAdaptiveRetry: false,
      enablePerformanceMonitoring: true,
      enableTroubleshooting: true,
      neuralTrainingEnabled: false
    };
  } else {
    config = DEFAULT_NLD_CONFIG;
  }

  return createNLDWebSocketService(config);
}

/**
 * Utility function to check NLD system compatibility
 */
export function checkNLDCompatibility(): {
  compatible: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for required APIs
  if (typeof WebSocket === 'undefined') {
    issues.push('WebSocket API not available');
    recommendations.push('Ensure WebSocket support is available in your environment');
  }

  if (typeof EventSource === 'undefined') {
    issues.push('EventSource API not available');
    recommendations.push('Consider using a polyfill for EventSource support');
  }

  if (typeof navigator === 'undefined') {
    issues.push('Navigator API not available');
    recommendations.push('Some network detection features may not work');
  }

  // Check for Node.js specific features
  if (typeof process !== 'undefined') {
    if (!process.hrtime) {
      issues.push('High-resolution time measurement not available');
      recommendations.push('Performance timing may be less accurate');
    }
  }

  return {
    compatible: issues.length === 0,
    issues,
    recommendations
  };
}

/**
 * Development utilities
 */
export const NLDDevUtils = {
  /**
   * Create mock failure context for testing
   */
  createMockFailureContext(overrides: Partial<ConnectionFailureContext> = {}): ConnectionFailureContext {
    return {
      connectionType: 'websocket',
      endpoint: 'ws://localhost:8000/ws',
      timestamp: Date.now(),
      networkConditions: {
        connectionType: 'wifi',
        isOnline: true
      },
      clientInfo: {
        userAgent: 'test-agent',
        platform: 'test',
        isMobile: false,
        supportedProtocols: ['websocket']
      },
      errorDetails: {
        code: 'ETIMEDOUT',
        message: 'Connection timeout',
        type: 'timeout'
      },
      attemptHistory: [],
      ...overrides
    };
  },

  /**
   * Create mock connection strategy for testing
   */
  createMockStrategy(overrides: Partial<ConnectionStrategy> = {}): ConnectionStrategy {
    return {
      type: 'exponential-backoff',
      baseDelay: 1000,
      maxDelay: 30000,
      jitter: true,
      maxAttempts: 5,
      ...overrides
    };
  },

  /**
   * Simulate network conditions for testing
   */
  simulateNetworkConditions(type: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'ethernet'): NetworkConditions {
    const conditionsMap = {
      'slow-2g': { latency: 2000, bandwidth: 50 },
      '2g': { latency: 1000, bandwidth: 250 },
      '3g': { latency: 500, bandwidth: 750 },
      '4g': { latency: 100, bandwidth: 10000 },
      'wifi': { latency: 50, bandwidth: 50000 },
      'ethernet': { latency: 10, bandwidth: 100000 }
    };

    const conditions = conditionsMap[type];
    return {
      connectionType: type,
      isOnline: true,
      latency: conditions.latency,
      bandwidth: conditions.bandwidth,
      effectiveType: type
    };
  }
};

// Export version and metadata
export const NLD_METADATA = {
  version: NLD_VERSION,
  name: 'NLD Connection Learning System',
  description: 'Intelligent connection failure learning and optimization system',
  author: 'Claude Code',
  license: 'MIT',
  repository: 'https://github.com/ruvnet/claude-flow',
  documentation: '/docs/nld-connection-learning-system.md',
  components: [
    'ConnectionFailureDetector',
    'ConnectionLearningDatabase', 
    'AdaptiveConnectionManager',
    'NeuralConnectionTrainer',
    'ClaudeFlowIntegration',
    'NLDPerformanceMonitor',
    'TroubleshootingEngine',
    'NLDWebSocketIntegration'
  ],
  features: [
    'Automatic failure pattern detection',
    'Neural learning from connection data',
    'Adaptive retry strategies',
    'Intelligent troubleshooting',
    'Performance monitoring',
    'Claude-flow integration',
    'Real-time optimization',
    'Comprehensive analytics'
  ]
};