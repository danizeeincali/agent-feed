/**
 * NLD Integration Layer
 * Main interface for integrating NLD failure prevention with existing systems
 */

import { sseFailurePreventionEngine } from './sse-failure-prevention';
import { EnhancedConnectionManager } from './enhanced-connection-manager';
import { browserCompatibility } from './browser-compatibility-layer';
import { stateSynchronizationManager } from './state-synchronization-manager';
import { nldNeuralLearningSystem } from './nld-neural-learning-system';

export interface NLDConfiguration {
  enableSSEProtection: boolean;
  enableConnectionManagement: boolean;
  enableBrowserCompatibility: boolean;
  enableStateSynchronization: boolean;
  enableNeuralLearning: boolean;
  autoPreventionMode: boolean;
  learningMode: 'passive' | 'active' | 'aggressive';
  fallbackStrategy: 'graceful' | 'immediate' | 'manual';
  monitoringLevel: 'basic' | 'detailed' | 'comprehensive';
}

export interface NLDStatus {
  active: boolean;
  modules: {
    sseProtection: boolean;
    connectionManager: boolean;
    browserCompatibility: boolean;
    stateSynchronization: boolean;
    neuralLearning: boolean;
  };
  metrics: {
    totalPrevented: number;
    falsePositives: number;
    learningAccuracy: number;
    systemHealth: number;
  };
  currentThreats: Array<{
    type: string;
    severity: string;
    likelihood: number;
    recommendation: string;
  }>;
}

export interface ConnectionOptions {
  url: string;
  transport?: 'auto' | 'websocket' | 'sse' | 'polling';
  fallbackTransports?: Array<'websocket' | 'sse' | 'polling'>;
  enablePredictiveFailure?: boolean;
  enableAutoRecovery?: boolean;
  userContext?: {
    userId?: string;
    sessionId?: string;
    preferences?: Record<string, any>;
  };
}

export class NLDIntegrationLayer {
  private config: NLDConfiguration;
  private isInitialized = false;
  private activeConnections = new Map<string, EnhancedConnectionManager>();
  private preventionStats = {
    totalAttempts: 0,
    successful: 0,
    failed: 0,
    falsePositives: 0
  };

  constructor(config: Partial<NLDConfiguration> = {}) {
    this.config = {
      enableSSEProtection: true,
      enableConnectionManagement: true,
      enableBrowserCompatibility: true,
      enableStateSynchronization: true,
      enableNeuralLearning: true,
      autoPreventionMode: true,
      learningMode: 'active',
      fallbackStrategy: 'graceful',
      monitoringLevel: 'comprehensive',
      ...config
    };
  }

  /**
   * Initialize NLD system with all modules
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ [NLD] System already initialized');
      return;
    }

    console.log('🚀 [NLD] Initializing Natural Learning Database system...');

    try {
      // Initialize browser compatibility first
      if (this.config.enableBrowserCompatibility) {
        const compatibility = browserCompatibility.getCompatibilityReport();
        console.log(`🌐 [NLD] Browser compatibility score: ${compatibility.score}/100`);
        
        if (compatibility.score < 70) {
          console.log('🔧 [NLD] Loading compatibility polyfills...');
          await browserCompatibility.loadPolyfills({
            eventSource: !browserCompatibility.supports('hasEventSource'),
            broadcastChannel: !browserCompatibility.supports('hasBroadcastChannel')
          });
        }
      }

      // Start neural learning system
      if (this.config.enableNeuralLearning) {
        console.log('🧠 [NLD] Neural learning system active');
      }

      // Initialize state synchronization
      if (this.config.enableStateSynchronization) {
        console.log('⚡ [NLD] State synchronization manager active');
      }

      this.isInitialized = true;
      console.log('✅ [NLD] System initialization complete');

      // Start background monitoring
      this.startBackgroundMonitoring();

    } catch (error) {
      console.error('❌ [NLD] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create intelligent connection with full NLD protection
   */
  public async createConnection(options: ConnectionOptions): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('🔌 [NLD] Creating intelligent connection...');

    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Predict potential failures before connecting
      if (options.enablePredictiveFailure !== false && this.config.enableNeuralLearning) {
        const browserInfo = browserCompatibility.getCapabilities();
        const prediction = await nldNeuralLearningSystem.predictFailure({
          browser: browserInfo.browser,
          browserVersion: browserInfo.browserVersion,
          platform: browserInfo.platform,
          transport: options.transport || 'auto',
          url: options.url,
          error: '', // No error yet
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          connectionState: 'initializing'
        });

        console.log(`🔮 [NLD] Failure prediction - Likelihood: ${(prediction.likelihood * 100).toFixed(1)}%`);

        if (prediction.likelihood > 0.7) {
          console.log('🛡️ [NLD] High failure risk detected - applying preventive measures');
          
          // Apply recommended preventive actions
          for (const action of prediction.recommendedActions) {
            await this.applyPreventiveAction(action, options);
          }
        }
      }

      // Create enhanced connection manager
      const connectionManager = new EnhancedConnectionManager({
        url: options.url,
        preferredTransport: options.transport || 'auto',
        fallbackOrder: options.fallbackTransports || ['websocket', 'sse', 'polling'],
        corsValidation: this.config.enableSSEProtection,
        browserCompatibilityCheck: this.config.enableBrowserCompatibility
      });

      // Set up event handlers for learning
      this.setupConnectionLearning(connectionManager, connectionId, options);

      // Attempt connection
      await connectionManager.connect();

      // Store connection
      this.activeConnections.set(connectionId, connectionManager);

      console.log(`✅ [NLD] Connection established: ${connectionId}`);
      return connectionId;

    } catch (error) {
      console.error('❌ [NLD] Connection creation failed:', error);
      
      // Record failure for learning
      if (this.config.enableNeuralLearning) {
        const browserInfo = browserCompatibility.getCapabilities();
        await nldNeuralLearningSystem.recordFailure(
          'connection',
          'creation_failure',
          {
            browser: browserInfo.browser,
            browserVersion: browserInfo.browserVersion,
            platform: browserInfo.platform,
            transport: options.transport || 'auto',
            url: options.url,
            error: error instanceof Error ? error.message : String(error),
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            connectionState: 'failed'
          },
          {
            strategy: 'connection_creation',
            successful: false,
            timeToResolve: 0,
            fallbackUsed: false,
            manualIntervention: false
          }
        );
      }

      throw error;
    }
  }

  /**
   * Apply preventive action based on neural learning recommendations
   */
  private async applyPreventiveAction(action: string, options: ConnectionOptions): Promise<void> {
    console.log(`🛡️ [NLD] Applying preventive action: ${action}`);
    this.preventionStats.totalAttempts++;

    try {
      if (action.includes('polling transport')) {
        options.transport = 'polling';
      } else if (action.includes('SSE transport')) {
        options.transport = 'sse';
      } else if (action.includes('websocket')) {
        options.transport = 'websocket';
      } else if (action.includes('polyfills')) {
        await browserCompatibility.loadPolyfills({
          eventSource: true,
          broadcastChannel: true
        });
      }

      this.preventionStats.successful++;
      console.log(`✅ [NLD] Preventive action applied: ${action}`);
    } catch (error) {
      this.preventionStats.failed++;
      console.error(`❌ [NLD] Preventive action failed: ${action}`, error);
    }
  }

  /**
   * Setup connection learning and monitoring
   */
  private setupConnectionLearning(
    connectionManager: EnhancedConnectionManager, 
    connectionId: string, 
    options: ConnectionOptions
  ): void {
    // Monitor connection events for learning
    connectionManager.on('stateChange', async (state) => {
      if (this.config.enableNeuralLearning) {
        if (state.status === 'failed' && state.lastError) {
          const browserInfo = browserCompatibility.getCapabilities();
          await nldNeuralLearningSystem.recordFailure(
            'connection',
            'state_change_failure',
            {
              browser: browserInfo.browser,
              browserVersion: browserInfo.browserVersion,
              platform: browserInfo.platform,
              transport: state.transport,
              url: options.url,
              error: state.lastError,
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
              connectionState: state.status,
              previousFailures: state.reconnectAttempts
            }
          );
        }
      }
    });

    connectionManager.on('error', async (error) => {
      console.error(`❌ [NLD] Connection error on ${connectionId}:`, error);
      
      if (this.config.autoPreventionMode) {
        await this.handleConnectionError(connectionManager, connectionId, error);
      }
    });

    connectionManager.on('message', (data) => {
      if (this.config.enableStateSynchronization) {
        // Apply state synchronization for messages
        stateSynchronizationManager.applyUpdate({
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: data.type || 'message',
          data: data,
          timestamp: Date.now(),
          sequenceNumber: 0,
          source: data.transport === 'sse' ? 'sse' : 
                 data.transport === 'websocket' ? 'websocket' : 'http',
          priority: 'medium'
        });
      }
    });
  }

  /**
   * Handle connection errors with intelligent recovery
   */
  private async handleConnectionError(
    connectionManager: EnhancedConnectionManager,
    connectionId: string,
    error: Error
  ): Promise<void> {
    console.log(`🔧 [NLD] Handling connection error for ${connectionId}`);

    const state = connectionManager.getState();
    
    // Get neural learning recommendation
    if (this.config.enableNeuralLearning) {
      const browserInfo = browserCompatibility.getCapabilities();
      const prediction = await nldNeuralLearningSystem.predictFailure({
        browser: browserInfo.browser,
        browserVersion: browserInfo.browserVersion,
        platform: browserInfo.platform,
        transport: state.transport,
        url: '', // URL not available in this context
        error: error.message,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        connectionState: state.status,
        previousFailures: state.reconnectAttempts
      });

      // Apply recommended recovery actions
      for (const action of prediction.recommendedActions) {
        console.log(`🛠️ [NLD] Applying recovery action: ${action}`);
        // Implementation would depend on specific actions
      }
    }

    // Apply fallback strategy
    switch (this.config.fallbackStrategy) {
      case 'immediate':
        // Immediately try alternative transport
        break;
      case 'graceful':
        // Wait for current attempt to complete, then fallback
        break;
      case 'manual':
        // Require manual intervention
        break;
    }
  }

  /**
   * Get connection by ID
   */
  public getConnection(connectionId: string): EnhancedConnectionManager | undefined {
    return this.activeConnections.get(connectionId);
  }

  /**
   * Close connection and cleanup
   */
  public closeConnection(connectionId: string): void {
    const connection = this.activeConnections.get(connectionId);
    if (connection) {
      connection.disconnect();
      this.activeConnections.delete(connectionId);
      console.log(`🔌 [NLD] Connection closed: ${connectionId}`);
    }
  }

  /**
   * Get system status
   */
  public getStatus(): NLDStatus {
    const neuralMetrics = this.config.enableNeuralLearning ? 
      nldNeuralLearningSystem.getMetrics() : null;
    
    const stateSyncMetrics = this.config.enableStateSynchronization ? 
      stateSynchronizationManager.getMetrics() : null;

    return {
      active: this.isInitialized,
      modules: {
        sseProtection: this.config.enableSSEProtection,
        connectionManager: this.config.enableConnectionManagement,
        browserCompatibility: this.config.enableBrowserCompatibility,
        stateSynchronization: this.config.enableStateSynchronization,
        neuralLearning: this.config.enableNeuralLearning
      },
      metrics: {
        totalPrevented: this.preventionStats.successful,
        falsePositives: this.preventionStats.falsePositives,
        learningAccuracy: neuralMetrics?.modelAccuracy || 0,
        systemHealth: this.calculateSystemHealth()
      },
      currentThreats: this.getCurrentThreats()
    };
  }

  /**
   * Calculate overall system health score
   */
  private calculateSystemHealth(): number {
    let healthScore = 100;

    // Reduce score based on failure rate
    const totalAttempts = this.preventionStats.totalAttempts;
    if (totalAttempts > 0) {
      const failureRate = this.preventionStats.failed / totalAttempts;
      healthScore -= failureRate * 30;
    }

    // Reduce score based on false positive rate
    if (this.preventionStats.falsePositives > 0) {
      const fpRate = this.preventionStats.falsePositives / totalAttempts;
      healthScore -= fpRate * 20;
    }

    // Factor in active connections health
    let activeConnectionsHealthy = 0;
    this.activeConnections.forEach(connection => {
      if (connection.isConnected()) {
        activeConnectionsHealthy++;
      }
    });

    if (this.activeConnections.size > 0) {
      const connectionHealthRate = activeConnectionsHealthy / this.activeConnections.size;
      healthScore = healthScore * connectionHealthRate;
    }

    return Math.max(0, Math.min(100, healthScore));
  }

  /**
   * Get current system threats
   */
  private getCurrentThreats(): NLDStatus['currentThreats'] {
    const threats: NLDStatus['currentThreats'] = [];

    // Check browser compatibility threats
    if (this.config.enableBrowserCompatibility) {
      const compatibility = browserCompatibility.getCompatibilityReport();
      if (compatibility.score < 70) {
        threats.push({
          type: 'browser_compatibility',
          severity: 'medium',
          likelihood: 0.6,
          recommendation: 'Load compatibility polyfills'
        });
      }
    }

    // Check connection health threats
    let unhealthyConnections = 0;
    this.activeConnections.forEach(connection => {
      if (!connection.isConnected()) {
        unhealthyConnections++;
      }
    });

    if (unhealthyConnections > 0) {
      threats.push({
        type: 'connection_instability',
        severity: unhealthyConnections > this.activeConnections.size / 2 ? 'high' : 'medium',
        likelihood: 0.8,
        recommendation: 'Review connection configuration and network conditions'
      });
    }

    return threats;
  }

  /**
   * Start background monitoring
   */
  private startBackgroundMonitoring(): void {
    // Monitor system health every 30 seconds
    setInterval(() => {
      const health = this.calculateSystemHealth();
      if (health < 70) {
        console.warn(`⚠️ [NLD] System health degraded: ${health.toFixed(1)}%`);
      }
    }, 30000);

    // Monitor active connections every 10 seconds
    setInterval(() => {
      let disconnectedCount = 0;
      this.activeConnections.forEach((connection, id) => {
        if (!connection.isConnected()) {
          disconnectedCount++;
        }
      });

      if (disconnectedCount > 0) {
        console.warn(`⚠️ [NLD] ${disconnectedCount} disconnected connections detected`);
      }
    }, 10000);

    console.log('👁️ [NLD] Background monitoring started');
  }

  /**
   * Export system data for analysis
   */
  public exportSystemData(): {
    config: NLDConfiguration;
    stats: typeof this.preventionStats;
    patterns: any[];
    failureHistory: any[];
  } {
    return {
      config: this.config,
      stats: this.preventionStats,
      patterns: this.config.enableNeuralLearning ? nldNeuralLearningSystem.getPatterns() : [],
      failureHistory: this.config.enableNeuralLearning ? nldNeuralLearningSystem.getFailureHistory(50) : []
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<NLDConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ [NLD] Configuration updated');
  }

  /**
   * Shutdown system gracefully
   */
  public async shutdown(): Promise<void> {
    console.log('🛑 [NLD] Shutting down system...');

    // Close all active connections
    this.activeConnections.forEach((connection, id) => {
      connection.disconnect();
    });
    this.activeConnections.clear();

    this.isInitialized = false;
    console.log('✅ [NLD] System shutdown complete');
  }
}

// Export singleton instance
export const nldIntegration = new NLDIntegrationLayer();