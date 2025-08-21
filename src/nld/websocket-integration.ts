/**
 * NLD WebSocket Integration
 * Integrates NLD connection learning with existing WebSocket systems
 */

import { EventEmitter } from 'events';
import { WebSocketService } from '../../frontend/src/services/websocket';
import { ConnectionFailureDetector, ConnectionFailureContext } from './connection-failure-detector';
import { AdaptiveConnectionManager } from './adaptive-connection-manager';
import { ClaudeFlowIntegration } from './claude-flow-integration';
import { NLDPerformanceMonitor } from './performance-monitor';
import { TroubleshootingEngine } from './troubleshooting-engine';

export interface NLDWebSocketConfig {
  enableLearning: boolean;
  enableAdaptiveRetry: boolean;
  enablePerformanceMonitoring: boolean;
  enableTroubleshooting: boolean;
  fallbackTransports: string[];
  circuitBreakerThreshold: number;
  neuralTrainingEnabled: boolean;
}

export interface EnhancedWebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  nld_metadata?: {
    connection_attempt: number;
    strategy_used: string;
    learning_applied: boolean;
    performance_metrics: any;
  };
}

export class NLDWebSocketIntegration extends EventEmitter {
  private originalWebSocketService: WebSocketService;
  private failureDetector: ConnectionFailureDetector;
  private adaptiveManager: AdaptiveConnectionManager;
  private claudeFlowIntegration: ClaudeFlowIntegration;
  private performanceMonitor: NLDPerformanceMonitor;
  private troubleshootingEngine: TroubleshootingEngine;
  private config: NLDWebSocketConfig;
  private connectionAttempts: Map<string, number> = new Map();
  private lastConnectionContext: ConnectionFailureContext | null = null;

  constructor(
    webSocketService: WebSocketService,
    config: NLDWebSocketConfig
  ) {
    super();
    this.originalWebSocketService = webSocketService;
    this.config = config;
    this.initializeNLDComponents();
    this.enhanceWebSocketService();
    this.setupEventHandlers();
  }

  /**
   * Initialize NLD components
   */
  private initializeNLDComponents(): void {
    // Initialize failure detector
    this.failureDetector = new ConnectionFailureDetector();

    // Initialize adaptive connection manager
    this.adaptiveManager = new AdaptiveConnectionManager({
      endpoints: ['ws://localhost:8000/ws'],
      protocols: ['websocket', 'sse', 'polling'],
      fallbackChain: this.config.fallbackTransports,
      learningEnabled: this.config.enableLearning,
      neuralModeEnabled: this.config.neuralTrainingEnabled,
      circuitBreakerEnabled: true
    });

    // Initialize Claude Flow integration
    this.claudeFlowIntegration = new ClaudeFlowIntegration({
      mcpServerUrl: 'ws://localhost:3001/mcp',
      neuralTrainingEnabled: this.config.neuralTrainingEnabled,
      memoryNamespace: 'nld_websocket',
      taskOrchestrationEnabled: true,
      performanceTrackingEnabled: this.config.enablePerformanceMonitoring
    });

    // Initialize performance monitor
    if (this.config.enablePerformanceMonitoring) {
      this.performanceMonitor = new NLDPerformanceMonitor({
        metricsRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
        monitoringIntervalMs: 10000, // 10 seconds
        reportingIntervalMs: 300000, // 5 minutes
        alertingEnabled: true
      });
      this.performanceMonitor.startMonitoring();
    }

    // Initialize troubleshooting engine
    if (this.config.enableTroubleshooting) {
      this.troubleshootingEngine = new TroubleshootingEngine(
        this.adaptiveManager['learningDatabase']
      );
    }
  }

  /**
   * Enhance the existing WebSocket service with NLD capabilities
   */
  private enhanceWebSocketService(): void {
    // Store original methods
    const originalConnect = this.originalWebSocketService.connect.bind(this.originalWebSocketService);
    const originalSend = this.originalWebSocketService.send.bind(this.originalWebSocketService);
    const originalDisconnect = this.originalWebSocketService.disconnect.bind(this.originalWebSocketService);

    // Enhanced connect method
    this.originalWebSocketService.connect = async (): Promise<void> => {
      const startTime = Date.now();
      const connectionId = this.generateConnectionId();
      
      try {
        if (this.config.enableAdaptiveRetry) {
          // Use adaptive connection manager
          const result = await this.adaptiveManager.connect(
            this.originalWebSocketService['url'] || 'ws://localhost:8000/ws',
            { connectionId, timeout: 10000 }
          );
          
          this.recordConnectionSuccess(connectionId, startTime, result);
          
        } else {
          // Use original connection method
          await originalConnect();
          this.recordConnectionSuccess(connectionId, startTime, { 
            success: true, 
            duration: Date.now() - startTime,
            strategy: { type: 'immediate', baseDelay: 0, maxDelay: 0, jitter: false, maxAttempts: 1 },
            fallbacksUsed: [],
            learningApplied: false
          });
        }

      } catch (error) {
        await this.handleConnectionFailure(connectionId, startTime, error);
        throw error;
      }
    };

    // Enhanced send method
    this.originalWebSocketService.send = (type: string, data: any): void => {
      const enhancedMessage: EnhancedWebSocketMessage = {
        type,
        data,
        timestamp: new Date().toISOString(),
        nld_metadata: {
          connection_attempt: this.connectionAttempts.get('current') || 1,
          strategy_used: 'standard',
          learning_applied: this.config.enableLearning,
          performance_metrics: this.getRealtimeMetrics()
        }
      };

      // Record message performance
      if (this.config.enablePerformanceMonitoring) {
        this.performanceMonitor.recordMetric(
          'connection',
          'message_sent',
          1,
          { type, data_size: JSON.stringify(data).length }
        );
      }

      originalSend(type, data);
      this.emit('messageSent', enhancedMessage);
    };

    // Enhanced disconnect method
    this.originalWebSocketService.disconnect = (): void => {
      // Record disconnection metrics
      if (this.config.enablePerformanceMonitoring) {
        this.performanceMonitor.recordMetric(
          'connection',
          'disconnection',
          1,
          { graceful: true }
        );
      }

      originalDisconnect();
      this.emit('disconnected', { timestamp: Date.now(), graceful: true });
    };
  }

  /**
   * Set up event handlers for NLD components
   */
  private setupEventHandlers(): void {
    // Failure detector events
    this.failureDetector.on('patternDetected', (data) => {
      this.emit('nldPatternDetected', data);
      
      if (this.config.enableTroubleshooting) {
        this.generateTroubleshootingSuggestions(data.context);
      }
    });

    // Adaptive manager events
    this.adaptiveManager.on('connectionSuccess', (data) => {
      this.emit('nldConnectionSuccess', data);
    });

    this.adaptiveManager.on('connectionFailure', (data) => {
      this.emit('nldConnectionFailure', data);
    });

    // Performance monitor events
    if (this.performanceMonitor) {
      this.performanceMonitor.on('alertGenerated', (alert) => {
        this.emit('nldAlert', alert);
      });

      this.performanceMonitor.on('reportGenerated', (report) => {
        this.emit('nldPerformanceReport', report);
      });
    }

    // Claude Flow integration events
    this.claudeFlowIntegration.on('neuralTrained', (data) => {
      this.emit('nldNeuralTrained', data);
    });

    this.claudeFlowIntegration.on('memoryStored', (data) => {
      this.emit('nldMemoryStored', data);
    });
  }

  /**
   * Get real-time connection metrics
   */
  getRealtimeMetrics(): any {
    if (!this.config.enablePerformanceMonitoring) return null;
    
    return this.performanceMonitor.getDashboardData();
  }

  /**
   * Get connection health status
   */
  getConnectionHealth(): any {
    const health = this.adaptiveManager.getConnectionHealth('ws://localhost:8000/ws');
    const performanceMetrics = this.config.enablePerformanceMonitoring 
      ? this.performanceMonitor.getDashboardData()
      : null;

    return {
      connection_health: health,
      performance_metrics: performanceMetrics,
      nld_status: this.claudeFlowIntegration.getNLDStatus(),
      learning_enabled: this.config.enableLearning,
      adaptive_retry_enabled: this.config.enableAdaptiveRetry
    };
  }

  /**
   * Generate troubleshooting suggestions for current issues
   */
  async generateTroubleshootingSuggestions(context?: ConnectionFailureContext): Promise<any> {
    if (!this.config.enableTroubleshooting || !this.troubleshootingEngine) {
      return { error: 'Troubleshooting not enabled' };
    }

    const troubleshootingContext = context || this.lastConnectionContext;
    if (!troubleshootingContext) {
      return { error: 'No connection context available' };
    }

    const suggestions = await this.troubleshootingEngine.generateSuggestions({
      context: troubleshootingContext,
      urgency: 'medium'
    });

    this.emit('troubleshootingSuggestions', suggestions);
    return suggestions;
  }

  /**
   * Train neural patterns from recent connection data
   */
  async trainNeuralPatterns(): Promise<void> {
    if (!this.config.neuralTrainingEnabled) {
      console.warn('Neural training not enabled');
      return;
    }

    await this.claudeFlowIntegration.trainNeuralPatterns();
    this.emit('neuralTrainingTriggered', { timestamp: Date.now() });
  }

  /**
   * Export NLD data for analysis
   */
  async exportNLDData(): Promise<any> {
    const claudeFlowData = await this.claudeFlowIntegration.exportNLDData();
    const performanceData = this.config.enablePerformanceMonitoring
      ? this.performanceMonitor.generatePerformanceReport()
      : null;

    return {
      metadata: {
        exported_at: new Date().toISOString(),
        websocket_integration: true,
        config: this.config
      },
      claude_flow_data: claudeFlowData,
      performance_data: performanceData,
      connection_attempts: Object.fromEntries(this.connectionAttempts),
      last_connection_context: this.lastConnectionContext
    };
  }

  /**
   * Update NLD configuration
   */
  updateConfig(newConfig: Partial<NLDWebSocketConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update component configurations
    this.adaptiveManager.updateConfig({
      learningEnabled: this.config.enableLearning,
      neuralModeEnabled: this.config.neuralTrainingEnabled,
      fallbackChain: this.config.fallbackTransports
    });

    this.claudeFlowIntegration.updateConfig({
      neuralTrainingEnabled: this.config.neuralTrainingEnabled,
      performanceTrackingEnabled: this.config.enablePerformanceMonitoring
    });

    this.emit('configUpdated', this.config);
  }

  /**
   * Get WebSocket integration statistics
   */
  getStatistics(): any {
    const adaptiveStats = this.adaptiveManager.getPerformanceAnalytics();
    const performanceStats = this.config.enablePerformanceMonitoring
      ? this.performanceMonitor.getDashboardData()
      : null;

    return {
      adaptive_connection_stats: adaptiveStats,
      performance_stats: performanceStats,
      total_connection_attempts: Array.from(this.connectionAttempts.values())
        .reduce((sum, attempts) => sum + attempts, 0),
      nld_components_active: {
        failure_detector: !!this.failureDetector,
        adaptive_manager: !!this.adaptiveManager,
        claude_flow_integration: !!this.claudeFlowIntegration,
        performance_monitor: !!this.performanceMonitor,
        troubleshooting_engine: !!this.troubleshootingEngine
      },
      config: this.config
    };
  }

  /**
   * Shutdown NLD integration
   */
  async shutdown(): Promise<void> {
    try {
      // Stop performance monitoring
      if (this.performanceMonitor) {
        this.performanceMonitor.stopMonitoring();
      }

      // Shutdown Claude Flow integration
      await this.claudeFlowIntegration.shutdown();

      // Clean up event listeners
      this.removeAllListeners();

      this.emit('nldShutdown', { timestamp: Date.now() });

    } catch (error) {
      console.error('Error during NLD WebSocket integration shutdown:', error);
      this.emit('nldShutdownError', error);
    }
  }

  private async recordConnectionSuccess(
    connectionId: string,
    startTime: number,
    result: any
  ): Promise<void> {
    const duration = Date.now() - startTime;
    
    // Update connection attempts
    const attempts = this.connectionAttempts.get(connectionId) || 0;
    this.connectionAttempts.set(connectionId, attempts + 1);
    this.connectionAttempts.set('current', attempts + 1);

    // Record performance metrics
    if (this.config.enablePerformanceMonitoring) {
      this.performanceMonitor.recordMetric(
        'connection',
        'success',
        1,
        { duration, strategy: result.strategy?.type, learning_applied: result.learningApplied }
      );
      
      this.performanceMonitor.recordMetric(
        'connection',
        'response_time',
        duration,
        { strategy: result.strategy?.type }
      );
    }

    this.emit('connectionSuccess', {
      connectionId,
      duration,
      result,
      timestamp: Date.now()
    });
  }

  private async handleConnectionFailure(
    connectionId: string,
    startTime: number,
    error: any
  ): Promise<void> {
    const duration = Date.now() - startTime;
    
    // Update connection attempts
    const attempts = this.connectionAttempts.get(connectionId) || 0;
    this.connectionAttempts.set(connectionId, attempts + 1);

    // Create failure context
    const context: ConnectionFailureContext = {
      connectionType: 'websocket',
      endpoint: this.originalWebSocketService['url'] || 'ws://localhost:8000/ws',
      timestamp: Date.now(),
      networkConditions: {
        connectionType: 'unknown',
        isOnline: navigator.onLine
      },
      clientInfo: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isMobile: /Mobile|Android|iOS/.test(navigator.userAgent),
        supportedProtocols: ['websocket', 'sse', 'polling']
      },
      errorDetails: {
        code: error.code || 'unknown',
        message: error.message || 'Unknown error',
        type: this.classifyError(error),
        stack: error.stack
      },
      attemptHistory: []
    };

    this.lastConnectionContext = context;

    // Record failure with detector
    if (this.config.enableLearning) {
      this.failureDetector.captureFailure(context);
    }

    // Record performance metrics
    if (this.config.enablePerformanceMonitoring) {
      this.performanceMonitor.recordMetric(
        'connection',
        'failure',
        1,
        { 
          duration, 
          error_type: context.errorDetails.type,
          attempts: attempts + 1
        }
      );
    }

    this.emit('connectionFailure', {
      connectionId,
      duration,
      error,
      context,
      attempts: attempts + 1,
      timestamp: Date.now()
    });
  }

  private classifyError(error: any): string {
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) return 'timeout';
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') return 'network';
    if (error.code === 1002 || error.code === 1003) return 'protocol';
    if (error.code === 401 || error.code === 403) return 'auth';
    if (error.code >= 500) return 'server';
    return 'unknown';
  }

  private generateConnectionId(): string {
    return `ws_conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Factory function to create enhanced WebSocket service with NLD integration
 */
export function createNLDWebSocketService(
  config: Partial<NLDWebSocketConfig> = {}
): { service: WebSocketService; nldIntegration: NLDWebSocketIntegration } {
  const defaultConfig: NLDWebSocketConfig = {
    enableLearning: true,
    enableAdaptiveRetry: true,
    enablePerformanceMonitoring: true,
    enableTroubleshooting: true,
    fallbackTransports: ['sse', 'polling'],
    circuitBreakerThreshold: 5,
    neuralTrainingEnabled: true
  };

  const finalConfig = { ...defaultConfig, ...config };
  
  // Import the existing WebSocket service
  const webSocketService = new WebSocketService();
  
  // Create NLD integration
  const nldIntegration = new NLDWebSocketIntegration(webSocketService, finalConfig);

  return {
    service: webSocketService,
    nldIntegration
  };
}

/**
 * Utility function to integrate NLD with existing WebSocket service
 */
export async function integrateNLDWithWebSocket(
  existingService: WebSocketService,
  config: Partial<NLDWebSocketConfig> = {}
): Promise<NLDWebSocketIntegration> {
  const defaultConfig: NLDWebSocketConfig = {
    enableLearning: true,
    enableAdaptiveRetry: true,
    enablePerformanceMonitoring: true,
    enableTroubleshooting: true,
    fallbackTransports: ['sse', 'polling'],
    circuitBreakerThreshold: 5,
    neuralTrainingEnabled: true
  };

  const finalConfig = { ...defaultConfig, ...config };
  
  const nldIntegration = new NLDWebSocketIntegration(existingService, finalConfig);
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return nldIntegration;
}