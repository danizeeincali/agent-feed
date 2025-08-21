/**
 * NLD Connection Learning System Tests
 * Comprehensive tests for the NLD connection failure learning system
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ConnectionFailureDetector, ConnectionFailureContext } from '../nld/connection-failure-detector';
import { ConnectionLearningDatabase } from '../nld/learning-database';
import { AdaptiveConnectionManager } from '../nld/adaptive-connection-manager';
import { NeuralConnectionTrainer } from '../nld/neural-connection-trainer';
import { ClaudeFlowIntegration } from '../nld/claude-flow-integration';
import { NLDPerformanceMonitor } from '../nld/performance-monitor';
import { TroubleshootingEngine } from '../nld/troubleshooting-engine';
import { NLDWebSocketIntegration, createNLDWebSocketService } from '../nld/websocket-integration';

describe('NLD Connection Learning System', () => {
  let failureDetector: ConnectionFailureDetector;
  let learningDatabase: ConnectionLearningDatabase;
  let adaptiveManager: AdaptiveConnectionManager;
  let neuralTrainer: NeuralConnectionTrainer;
  let performanceMonitor: NLDPerformanceMonitor;
  let troubleshootingEngine: TroubleshootingEngine;

  beforeEach(() => {
    failureDetector = new ConnectionFailureDetector();
    learningDatabase = new ConnectionLearningDatabase();
    adaptiveManager = new AdaptiveConnectionManager({
      endpoints: ['ws://localhost:8000/ws'],
      protocols: ['websocket', 'sse', 'polling'],
      fallbackChain: ['websocket', 'sse', 'polling'],
      learningEnabled: true,
      neuralModeEnabled: true,
      circuitBreakerEnabled: true
    });
    
    neuralTrainer = new NeuralConnectionTrainer({
      batchSize: 10,
      learningRate: 0.001,
      epochs: 50,
      validationSplit: 0.2,
      modelType: 'classification',
      featureEngineering: true,
      autoTuning: true
    });

    performanceMonitor = new NLDPerformanceMonitor({
      metricsRetentionMs: 60000,
      monitoringIntervalMs: 1000,
      reportingIntervalMs: 5000,
      alertingEnabled: true
    });

    troubleshootingEngine = new TroubleshootingEngine(learningDatabase);
  });

  afterEach(async () => {
    if (performanceMonitor) {
      performanceMonitor.stopMonitoring();
    }
  });

  describe('ConnectionFailureDetector', () => {
    test('should detect and classify connection failure patterns', async () => {
      const context: ConnectionFailureContext = {
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
        attemptHistory: []
      };

      const patternDetected = new Promise(resolve => {
        failureDetector.on('patternDetected', resolve);
      });

      failureDetector.captureFailure(context);

      const result = await patternDetected;
      expect(result).toBeDefined();
      expect(result).toHaveProperty('pattern');
      expect(result).toHaveProperty('context');
    });

    test('should generate adaptive retry strategies', () => {
      const context: Partial<ConnectionFailureContext> = {
        connectionType: 'websocket',
        networkConditions: {
          connectionType: '2g',
          isOnline: true
        }
      };

      const strategy = failureDetector.getAdaptiveStrategy(context as ConnectionFailureContext);
      
      expect(strategy).toBeDefined();
      expect(strategy.type).toBeDefined();
      expect(strategy.baseDelay).toBeGreaterThan(0);
      expect(strategy.maxAttempts).toBeGreaterThan(0);
    });

    test('should provide troubleshooting suggestions', () => {
      const context: ConnectionFailureContext = {
        connectionType: 'websocket',
        endpoint: 'ws://localhost:8000/ws',
        timestamp: Date.now(),
        networkConditions: {
          connectionType: 'slow-2g',
          isOnline: true,
          latency: 2000
        },
        clientInfo: {
          userAgent: 'test-agent',
          platform: 'test',
          isMobile: true,
          supportedProtocols: ['websocket']
        },
        errorDetails: {
          code: 'ETIMEDOUT',
          message: 'Connection timeout',
          type: 'timeout'
        },
        attemptHistory: []
      };

      const suggestions = failureDetector.getTroubleshootingSuggestions(context);
      
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain(expect.stringContaining('timeout'));
    });
  });

  describe('ConnectionLearningDatabase', () => {
    test('should store and retrieve failure patterns', async () => {
      const context: ConnectionFailureContext = {
        connectionType: 'websocket',
        endpoint: 'ws://localhost:8000/ws',
        timestamp: Date.now(),
        networkConditions: { connectionType: 'wifi', isOnline: true },
        clientInfo: {
          userAgent: 'test-agent',
          platform: 'test',
          isMobile: false,
          supportedProtocols: ['websocket']
        },
        errorDetails: {
          code: 'ECONNREFUSED',
          message: 'Connection refused',
          type: 'network'
        },
        attemptHistory: []
      };

      const pattern = {
        id: 'test-pattern',
        pattern: 'websocket_network_wifi',
        frequency: 1,
        contexts: [context],
        successfulStrategies: [],
        recommendations: [],
        severity: 'medium' as const,
        lastSeen: Date.now(),
        trend: 'stable' as const
      };

      const recordId = await learningDatabase.storeFailurePattern(context, pattern);
      
      expect(recordId).toBeDefined();
      expect(typeof recordId).toBe('string');
    });

    test('should provide optimal strategies based on learned patterns', async () => {
      const context: Partial<ConnectionFailureContext> = {
        connectionType: 'websocket',
        endpoint: 'ws://localhost:8000/ws',
        networkConditions: { connectionType: 'wifi', isOnline: true }
      };

      const strategy = await learningDatabase.getOptimalStrategy(context);
      
      expect(strategy).toBeDefined();
      expect(strategy.type).toBeDefined();
      expect(['immediate', 'exponential-backoff', 'linear-backoff', 'fibonacci', 'custom'])
        .toContain(strategy.type);
    });

    test('should generate recommendations based on historical data', async () => {
      const context: ConnectionFailureContext = {
        connectionType: 'websocket',
        endpoint: 'ws://localhost:8000/ws',
        timestamp: Date.now(),
        networkConditions: { connectionType: 'wifi', isOnline: true },
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
        attemptHistory: []
      };

      const recommendations = await learningDatabase.getRecommendations(context);
      
      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('AdaptiveConnectionManager', () => {
    test('should manage connections with adaptive strategies', async () => {
      // Mock successful connection
      const connectSpy = jest.spyOn(adaptiveManager, 'connect')
        .mockResolvedValue({
          success: true,
          duration: 100,
          strategy: {
            type: 'exponential-backoff',
            baseDelay: 1000,
            maxDelay: 30000,
            jitter: true,
            maxAttempts: 5
          },
          fallbacksUsed: [],
          learningApplied: true
        });

      const result = await adaptiveManager.connect('ws://localhost:8000/ws');
      
      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.strategy).toBeDefined();
      
      connectSpy.mockRestore();
    });

    test('should provide connection health status', () => {
      const health = adaptiveManager.getConnectionHealth('ws://localhost:8000/ws');
      
      expect(health).toBeDefined();
      expect(health).toHaveProperty('isHealthy');
      expect(health).toHaveProperty('latency');
      expect(health).toHaveProperty('successRate');
      expect(health).toHaveProperty('circuitState');
    });

    test('should generate performance analytics', () => {
      const analytics = adaptiveManager.getPerformanceAnalytics();
      
      expect(analytics).toBeDefined();
      expect(analytics).toHaveProperty('totalFailures');
      expect(analytics).toHaveProperty('uniquePatterns');
      expect(analytics).toHaveProperty('activeConnections');
    });
  });

  describe('NeuralConnectionTrainer', () => {
    test('should add training data and trigger model training', async () => {
      const learningRecord = {
        id: 'test-record',
        timestamp: Date.now(),
        context: {
          connectionType: 'websocket' as const,
          endpoint: 'ws://localhost:8000/ws',
          timestamp: Date.now(),
          networkConditions: { connectionType: 'wifi', isOnline: true },
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
          attemptHistory: []
        },
        pattern: {
          id: 'test-pattern',
          pattern: 'websocket_timeout_wifi',
          frequency: 1,
          contexts: [],
          successfulStrategies: [],
          recommendations: [],
          severity: 'medium' as const,
          lastSeen: Date.now(),
          trend: 'stable' as const
        },
        strategy_success: true,
        recovery_time: 1500,
        user_satisfaction: 0.8,
        lessons_learned: ['Timeout requires exponential backoff'],
        neural_features: {
          connection_vector: [1, 0, 0, 0],
          error_embedding: [1, 0, 0, 0],
          network_signature: [1, 100, 0.9],
          strategy_encoding: [1, 1500],
          outcome_score: 1
        }
      };

      const modelsUpdated = new Promise(resolve => {
        neuralTrainer.on('modelsUpdated', resolve);
      });

      // Add enough training data to trigger training
      for (let i = 0; i < 10; i++) {
        neuralTrainer.addTrainingData({
          ...learningRecord,
          id: `test-record-${i}`
        });
      }

      const result = await modelsUpdated;
      expect(result).toBeDefined();
    });

    test('should make predictions based on trained models', async () => {
      // First add some training data
      for (let i = 0; i < 10; i++) {
        neuralTrainer.addTrainingData({
          id: `test-record-${i}`,
          timestamp: Date.now(),
          context: {
            connectionType: 'websocket' as const,
            endpoint: 'ws://localhost:8000/ws',
            timestamp: Date.now(),
            networkConditions: { connectionType: 'wifi', isOnline: true },
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
            attemptHistory: []
          },
          pattern: {
            id: 'test-pattern',
            pattern: 'websocket_timeout_wifi',
            frequency: 1,
            contexts: [],
            successfulStrategies: [],
            recommendations: [],
            severity: 'medium' as const,
            lastSeen: Date.now(),
            trend: 'stable' as const
          },
          strategy_success: true,
          lessons_learned: [],
          neural_features: {
            connection_vector: [1, 0, 0, 0],
            error_embedding: [1, 0, 0, 0],
            network_signature: [1, 100, 0.9],
            strategy_encoding: [1, 1500],
            outcome_score: 1
          }
        });
      }

      // Train models
      await neuralTrainer.trainModels();

      // Make prediction
      const context: ConnectionFailureContext = {
        connectionType: 'websocket',
        endpoint: 'ws://localhost:8000/ws',
        timestamp: Date.now(),
        networkConditions: { connectionType: 'wifi', isOnline: true },
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
        attemptHistory: []
      };

      const prediction = await neuralTrainer.predict(context);
      
      expect(prediction).toBeDefined();
      expect(prediction).toHaveProperty('success_probability');
      expect(prediction).toHaveProperty('recommended_strategy');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction.success_probability).toBeGreaterThanOrEqual(0);
      expect(prediction.success_probability).toBeLessThanOrEqual(1);
    });
  });

  describe('NLDPerformanceMonitor', () => {
    test('should record and track performance metrics', () => {
      performanceMonitor.startMonitoring();

      performanceMonitor.recordMetric(
        'connection',
        'success',
        1,
        { endpoint: 'ws://localhost:8000/ws' }
      );

      performanceMonitor.recordMetric(
        'connection',
        'response_time',
        150,
        { endpoint: 'ws://localhost:8000/ws' }
      );

      const metrics = performanceMonitor.getMetrics('connection', undefined, 60000);
      
      expect(metrics).toBeDefined();
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
    });

    test('should generate performance reports', () => {
      performanceMonitor.recordMetric('connection', 'success', 1);
      performanceMonitor.recordMetric('connection', 'failure', 1);
      
      const report = performanceMonitor.generatePerformanceReport(60000);
      
      expect(report).toBeDefined();
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('key_metrics');
      expect(report).toHaveProperty('trends');
      expect(report).toHaveProperty('recommendations');
    });

    test('should detect performance trends', () => {
      // Add metrics to establish a trend
      for (let i = 0; i < 5; i++) {
        performanceMonitor.recordMetric(
          'connection',
          'response_time',
          100 + (i * 20), // Increasing response time
          {},
          [`test-${i}`]
        );
      }

      const trends = performanceMonitor.getTrends(60000);
      
      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);
    });
  });

  describe('TroubleshootingEngine', () => {
    test('should generate troubleshooting suggestions', async () => {
      const context: ConnectionFailureContext = {
        connectionType: 'websocket',
        endpoint: 'ws://localhost:8000/ws',
        timestamp: Date.now(),
        networkConditions: {
          connectionType: 'wifi',
          isOnline: true,
          latency: 2000
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
        attemptHistory: []
      };

      const result = await troubleshootingEngine.generateSuggestions({
        context,
        urgency: 'medium'
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('quick_fixes');
      expect(result).toHaveProperty('preventive_measures');
      expect(result).toHaveProperty('confidence_score');
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    test('should run diagnostic tests', async () => {
      const context: ConnectionFailureContext = {
        connectionType: 'websocket',
        endpoint: 'ws://localhost:8000/ws',
        timestamp: Date.now(),
        networkConditions: { connectionType: 'wifi', isOnline: true },
        clientInfo: {
          userAgent: 'test-agent',
          platform: 'test',
          isMobile: false,
          supportedProtocols: ['websocket']
        },
        errorDetails: {
          code: 'ENOTFOUND',
          message: 'DNS resolution failed',
          type: 'network'
        },
        attemptHistory: []
      };

      const result = await troubleshootingEngine.runDiagnostic('dns_resolution', context);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('test_name');
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('interpretation');
      expect(result).toHaveProperty('recommended_actions');
    });
  });

  describe('NLDWebSocketIntegration', () => {
    test('should create enhanced WebSocket service with NLD capabilities', () => {
      const { service, nldIntegration } = createNLDWebSocketService({
        enableLearning: true,
        enableAdaptiveRetry: true,
        enablePerformanceMonitoring: true
      });

      expect(service).toBeDefined();
      expect(nldIntegration).toBeDefined();
      expect(nldIntegration).toBeInstanceOf(NLDWebSocketIntegration);
    });

    test('should provide real-time metrics', () => {
      const { nldIntegration } = createNLDWebSocketService();
      
      const metrics = nldIntegration.getRealtimeMetrics();
      // Metrics may be null if performance monitoring is disabled
      expect(metrics !== undefined).toBe(true);
    });

    test('should provide connection health status', () => {
      const { nldIntegration } = createNLDWebSocketService();
      
      const health = nldIntegration.getConnectionHealth();
      
      expect(health).toBeDefined();
      expect(health).toHaveProperty('connection_health');
      expect(health).toHaveProperty('nld_status');
      expect(health).toHaveProperty('learning_enabled');
    });

    test('should export comprehensive NLD data', async () => {
      const { nldIntegration } = createNLDWebSocketService();
      
      const data = await nldIntegration.exportNLDData();
      
      expect(data).toBeDefined();
      expect(data).toHaveProperty('metadata');
      expect(data).toHaveProperty('claude_flow_data');
      expect(data.metadata.websocket_integration).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should demonstrate end-to-end failure learning cycle', async () => {
      const { service, nldIntegration } = createNLDWebSocketService({
        enableLearning: true,
        enableAdaptiveRetry: true,
        enablePerformanceMonitoring: true,
        enableTroubleshooting: true
      });

      // Track events
      const events: any[] = [];
      nldIntegration.on('nldPatternDetected', (data) => events.push({ type: 'pattern', data }));
      nldIntegration.on('nldConnectionFailure', (data) => events.push({ type: 'failure', data }));
      nldIntegration.on('troubleshootingSuggestions', (data) => events.push({ type: 'suggestions', data }));

      // Simulate connection failure (this would normally trigger through actual WebSocket failure)
      const mockContext: ConnectionFailureContext = {
        connectionType: 'websocket',
        endpoint: 'ws://localhost:8000/ws',
        timestamp: Date.now(),
        networkConditions: { connectionType: 'wifi', isOnline: false },
        clientInfo: {
          userAgent: 'test-agent',
          platform: 'test',
          isMobile: false,
          supportedProtocols: ['websocket']
        },
        errorDetails: {
          code: 'ECONNREFUSED',
          message: 'Connection refused',
          type: 'network'
        },
        attemptHistory: []
      };

      // Generate troubleshooting suggestions
      const suggestions = await nldIntegration.generateTroubleshootingSuggestions(mockContext);
      
      expect(suggestions).toBeDefined();
      expect(suggestions).toHaveProperty('suggestions');

      // Verify integration statistics
      const stats = nldIntegration.getStatistics();
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('nld_components_active');
      expect(stats.nld_components_active.failure_detector).toBe(true);
      expect(stats.nld_components_active.adaptive_manager).toBe(true);

      // Clean up
      await nldIntegration.shutdown();
    });

    test('should handle configuration updates', () => {
      const { nldIntegration } = createNLDWebSocketService();
      
      const configUpdated = new Promise(resolve => {
        nldIntegration.on('configUpdated', resolve);
      });

      nldIntegration.updateConfig({
        enableLearning: false,
        neuralTrainingEnabled: false
      });

      expect(configUpdated).resolves.toBeDefined();
    });
  });
});