/**
 * Cost Tracking Service Manager
 *
 * Orchestrates all cost tracking services and provides a unified interface
 */

import { EventEmitter } from 'events';
import { CostTracker, CostConfig } from './CostTracker';
import { CostMonitoringService } from './CostMonitoringService';
import { WebSocketCostService } from './WebSocketCostService';
import { ErrorHandlingService } from './ErrorHandlingService';
import { BillingService } from './BillingService';
import { CostDatabaseManager } from '../database/models/CostModel';

export interface CostTrackingConfig {
  database: {
    path: string;
  };
  costTracker: Partial<CostConfig>;
  monitoring: {
    alerting: {
      costThresholds: {
        warning: number;
        critical: number;
        emergency: number;
      };
      tokenThresholds: {
        warning: number;
        critical: number;
        emergency: number;
      };
    };
    notifications: {
      webhooks: string[];
      emailRecipients: string[];
    };
  };
  webSocket: {
    port: number;
    maxConnections: number;
  };
  errorHandling: {
    retryPolicy: {
      maxRetries: number;
      initialDelay: number;
    };
    circuitBreaker: {
      failureThreshold: number;
      resetTimeout: number;
    };
  };
  billing: {
    pricing: {
      inputTokenPrice: number;
      outputTokenPrice: number;
      cacheCreationPrice: number;
      cacheReadPrice: number;
    };
    cyclePeriod: 'monthly' | 'weekly' | 'daily';
  };
}

export class CostTrackingServiceManager extends EventEmitter {
  private config: CostTrackingConfig;
  private dbManager: CostDatabaseManager;
  private costTracker: CostTracker;
  private monitoringService: CostMonitoringService;
  private webSocketService: WebSocketCostService;
  private errorHandlingService: ErrorHandlingService;
  private billingService: BillingService;
  private isInitialized = false;

  constructor(config: Partial<CostTrackingConfig> = {}) {
    super();

    this.config = {
      database: {
        path: './cost_tracking.db'
      },
      costTracker: {
        inputTokenPrice: 3.00,
        outputTokenPrice: 15.00,
        cacheCreationPrice: 3.75,
        cacheReadPrice: 0.30,
        enableDeduplication: true,
        retentionDays: 90,
        maxRetryAttempts: 3
      },
      monitoring: {
        alerting: {
          costThresholds: {
            warning: 50.00,
            critical: 100.00,
            emergency: 200.00
          },
          tokenThresholds: {
            warning: 100000,
            critical: 500000,
            emergency: 1000000
          }
        },
        notifications: {
          webhooks: [],
          emailRecipients: []
        }
      },
      webSocket: {
        port: 8081,
        maxConnections: 1000
      },
      errorHandling: {
        retryPolicy: {
          maxRetries: 3,
          initialDelay: 1000
        },
        circuitBreaker: {
          failureThreshold: 5,
          resetTimeout: 60000
        }
      },
      billing: {
        pricing: {
          inputTokenPrice: 3.00,
          outputTokenPrice: 15.00,
          cacheCreationPrice: 3.75,
          cacheReadPrice: 0.30
        },
        cyclePeriod: 'monthly'
      },
      ...config
    };
  }

  /**
   * Initialize all services
   */
  public async initialize(): Promise<void> {
    try {
      console.log('Initializing Cost Tracking Service Manager...');

      // Initialize database manager
      this.dbManager = new CostDatabaseManager(this.config.database.path);

      // Initialize cost tracker
      this.costTracker = new CostTracker(this.config.database.path, this.config.costTracker);

      // Initialize error handling service
      this.errorHandlingService = new ErrorHandlingService(this.config.errorHandling);

      // Initialize monitoring service
      this.monitoringService = new CostMonitoringService(this.costTracker, this.config.monitoring);

      // Initialize WebSocket service
      this.webSocketService = new WebSocketCostService(
        this.costTracker,
        this.monitoringService,
        this.config.webSocket
      );

      // Initialize billing service
      this.billingService = new BillingService(
        this.costTracker,
        this.dbManager,
        { billing: this.config.billing, pricing: this.config.billing.pricing }
      );

      // Setup service event forwarding
      this.setupEventForwarding();

      this.isInitialized = true;
      this.emit('initialized');

      console.log('Cost Tracking Service Manager initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Cost Tracking Service Manager:', error);
      throw error;
    }
  }

  /**
   * Setup event forwarding between services
   */
  private setupEventForwarding(): void {
    // Forward cost tracker events
    this.costTracker.on('stepTracked', (data) => this.emit('stepTracked', data));
    this.costTracker.on('sessionStarted', (data) => this.emit('sessionStarted', data));
    this.costTracker.on('sessionEnded', (data) => this.emit('sessionEnded', data));
    this.costTracker.on('costUpdated', (data) => this.emit('costUpdated', data));

    // Forward monitoring events
    this.monitoringService.on('alert', (data) => this.emit('alert', data));
    this.monitoringService.on('metricsUpdate', (data) => this.emit('metricsUpdate', data));

    // Forward WebSocket events
    this.webSocketService.on('clientConnected', (data) => this.emit('clientConnected', data));
    this.webSocketService.on('clientDisconnected', (data) => this.emit('clientDisconnected', data));

    // Forward error handling events
    this.errorHandlingService.on('operationError', (data) => this.emit('operationError', data));
    this.errorHandlingService.on('retrySuccess', (data) => this.emit('retrySuccess', data));
    this.errorHandlingService.on('circuitBreakerOpen', (data) => this.emit('circuitBreakerOpen', data));

    // Forward billing events
    this.billingService.on('chargeProcessed', (data) => this.emit('chargeProcessed', data));
    this.billingService.on('billingPeriodCreated', (data) => this.emit('billingPeriodCreated', data));
    this.billingService.on('invoiceGenerated', (data) => this.emit('invoiceGenerated', data));
  }

  /**
   * Get all service instances
   */
  public getServices() {
    this.ensureInitialized();
    return {
      costTracker: this.costTracker,
      monitoring: this.monitoringService,
      webSocket: this.webSocketService,
      errorHandling: this.errorHandlingService,
      billing: this.billingService,
      database: this.dbManager
    };
  }

  /**
   * Track step usage (main entry point)
   */
  public async trackStepUsage(stepUsage: any): Promise<boolean> {
    this.ensureInitialized();

    return await this.errorHandlingService.executeWithRetry(
      async () => {
        return await this.costTracker.trackStepUsage(stepUsage);
      },
      'trackStepUsage',
      {
        context: { stepId: stepUsage.stepId, sessionId: stepUsage.sessionId },
        userImpact: 'high'
      }
    );
  }

  /**
   * Start a new cost tracking session
   */
  public startSession(sessionId: string, userId: string, metadata?: Record<string, any>) {
    this.ensureInitialized();
    return this.costTracker.startSession(sessionId, userId, metadata);
  }

  /**
   * End a cost tracking session
   */
  public endSession(sessionId: string, status: 'completed' | 'failed' | 'cancelled' = 'completed') {
    this.ensureInitialized();
    return this.costTracker.endSession(sessionId, status);
  }

  /**
   * Get session cost details
   */
  public getSessionCost(sessionId: string) {
    this.ensureInitialized();
    return this.costTracker.getSessionCost(sessionId);
  }

  /**
   * Get usage analytics
   */
  public getUsageAnalytics(params: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    granularity?: 'hour' | 'day' | 'week' | 'month';
  }) {
    this.ensureInitialized();
    return this.costTracker.getUsageAnalytics(params);
  }

  /**
   * Get current metrics
   */
  public getCurrentMetrics() {
    this.ensureInitialized();
    return this.monitoringService.getCurrentMetrics();
  }

  /**
   * Get real-time metrics
   */
  public getRealTimeMetrics() {
    this.ensureInitialized();
    return this.costTracker.getRealTimeMetrics();
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts() {
    this.ensureInitialized();
    return this.monitoringService.getActiveAlerts();
  }

  /**
   * Get connected WebSocket clients
   */
  public getConnectedClients() {
    this.ensureInitialized();
    return this.webSocketService.getConnectedClients();
  }

  /**
   * Get billing period for user
   */
  public getBillingPeriod(userId: string) {
    this.ensureInitialized();
    return this.billingService.getBillingPeriod(userId);
  }

  /**
   * Get billing statistics
   */
  public getBillingStats(userId?: string) {
    this.ensureInitialized();
    return this.billingService.getBillingStats(userId);
  }

  /**
   * Generate comprehensive health report
   */
  public getHealthStatus() {
    this.ensureInitialized();

    const costTrackerHealth = this.costTracker.getRealTimeMetrics();
    const monitoringHealth = this.monitoringService.getCurrentMetrics();
    const errorHandlingHealth = this.errorHandlingService.getHealthStatus();
    const billingHealth = this.billingService.getHealthStatus();
    const webSocketHealth = this.webSocketService.getServerStats();

    const overallStatus = this.determineOverallHealth([
      errorHandlingHealth.status,
      billingHealth.status
    ]);

    return {
      overall: overallStatus,
      services: {
        costTracker: {
          status: 'healthy',
          activeSessions: costTrackerHealth.activeSessions,
          totalActiveCost: costTrackerHealth.totalActiveCost,
          retryQueueSize: costTrackerHealth.retryQueueSize
        },
        monitoring: {
          status: 'healthy',
          activeAlerts: this.getActiveAlerts().length,
          lastUpdate: monitoringHealth?.timestamp
        },
        errorHandling: errorHandlingHealth,
        billing: billingHealth,
        webSocket: {
          status: 'healthy',
          activeConnections: webSocketHealth.activeConnections,
          totalSubscriptions: webSocketHealth.totalSubscriptions
        }
      },
      timestamp: new Date().toISOString()
    };
  }

  private determineOverallHealth(statuses: string[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (statuses.includes('unhealthy') || statuses.includes('critical')) {
      return 'unhealthy';
    }
    if (statuses.includes('degraded') || statuses.includes('warning')) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<CostTrackingConfig>): void {
    this.ensureInitialized();

    this.config = { ...this.config, ...newConfig };

    // Update individual service configurations
    if (newConfig.monitoring) {
      this.monitoringService.updateConfig(newConfig.monitoring);
    }

    if (newConfig.errorHandling) {
      this.errorHandlingService.updateConfig(newConfig.errorHandling);
    }

    if (newConfig.billing?.pricing) {
      this.billingService.updatePricing(newConfig.billing.pricing);
    }

    this.emit('configUpdated', this.config);
  }

  /**
   * Generate comprehensive report
   */
  public generateReport(timeRange: { start: Date; end: Date }, userId?: string) {
    this.ensureInitialized();

    const analytics = this.getUsageAnalytics({
      userId,
      startDate: timeRange.start,
      endDate: timeRange.end,
      granularity: 'day'
    });

    const billingStats = this.getBillingStats(userId);
    const currentMetrics = this.getCurrentMetrics();
    const health = this.getHealthStatus();

    return {
      timeRange,
      userId,
      summary: {
        totalCost: analytics.reduce((sum, item) => sum + (item.total_cost || 0), 0),
        totalTokens: analytics.reduce((sum, item) => sum + (item.total_input_tokens || 0) + (item.total_output_tokens || 0), 0),
        totalSteps: analytics.reduce((sum, item) => sum + (item.step_count || 0), 0),
        ...billingStats
      },
      analytics,
      metrics: currentMetrics,
      health,
      generatedAt: new Date(),
      generatedBy: 'CostTrackingServiceManager'
    };
  }

  /**
   * Broadcast system message to all WebSocket clients
   */
  public broadcastSystemMessage(message: string, severity: 'info' | 'warning' | 'error' = 'info'): void {
    this.ensureInitialized();
    this.webSocketService.broadcastSystemMessage(message, severity);
  }

  /**
   * Perform maintenance tasks
   */
  public async performMaintenance(): Promise<{
    cleanedUpRecords: number;
    vacuumCompleted: boolean;
    healthStatus: any;
  }> {
    this.ensureInitialized();

    console.log('Starting maintenance tasks...');

    // Database maintenance
    const beforeStats = this.dbManager.getStats();
    this.dbManager.cleanupOldData(this.config.costTracker.retentionDays || 90);
    this.dbManager.vacuum();
    this.dbManager.analyze();
    const afterStats = this.dbManager.getStats();

    const cleanedUpRecords = beforeStats.reduce((sum, stat) => sum + stat.row_count, 0) -
                            afterStats.reduce((sum, stat) => sum + stat.row_count, 0);

    // Get health status after maintenance
    const healthStatus = this.getHealthStatus();

    console.log('Maintenance tasks completed');

    return {
      cleanedUpRecords,
      vacuumCompleted: true,
      healthStatus
    };
  }

  /**
   * Export data for backup or analysis
   */
  public async exportData(options: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    format: 'json' | 'csv';
  }): Promise<string> {
    this.ensureInitialized();

    const analytics = this.getUsageAnalytics({
      userId: options.userId,
      startDate: options.startDate,
      endDate: options.endDate,
      granularity: 'hour'
    });

    if (options.format === 'csv') {
      const headers = 'Period,Step Count,Total Cost,Input Tokens,Output Tokens,Cache Creation Tokens,Cache Read Tokens';
      const rows = analytics.map(item =>
        `${item.period},${item.step_count},${item.total_cost},${item.total_input_tokens},${item.total_output_tokens},${item.total_cache_creation_tokens},${item.total_cache_read_tokens}`
      );
      return [headers, ...rows].join('\n');
    }

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      options,
      data: analytics
    }, null, 2);
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('CostTrackingServiceManager must be initialized before use');
    }
  }

  /**
   * Gracefully shutdown all services
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) return;

    console.log('Shutting down Cost Tracking Service Manager...');

    // Stop background tasks and close connections
    this.billingService.stop();
    this.errorHandlingService.stop();
    this.monitoringService.stop();

    // Close WebSocket server
    await this.webSocketService.close();

    // Close cost tracker
    this.costTracker.close();

    // Close database
    this.dbManager.close();

    this.removeAllListeners();
    this.isInitialized = false;

    console.log('Cost Tracking Service Manager shut down successfully');
  }
}

// Export singleton instance
let serviceManagerInstance: CostTrackingServiceManager | null = null;

export function getCostTrackingServiceManager(config?: Partial<CostTrackingConfig>): CostTrackingServiceManager {
  if (!serviceManagerInstance) {
    serviceManagerInstance = new CostTrackingServiceManager(config);
  }
  return serviceManagerInstance;
}

export function resetCostTrackingServiceManager(): void {
  if (serviceManagerInstance) {
    serviceManagerInstance.shutdown();
    serviceManagerInstance = null;
  }
}