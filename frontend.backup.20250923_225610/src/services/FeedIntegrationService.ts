/**
 * FeedIntegrationService - Always-On Worker Instance Management for Feed System
 * 
 * This service manages the integration between the Claude management system and
 * the feed processing system, ensuring always-on worker instances are available
 * and optimized for continuous feed processing operations.
 * 
 * Key Features:
 * - Always-on worker instance lifecycle management
 * - Feed-optimized Claude instance configuration
 * - Automatic failover and recovery
 * - Performance monitoring for feed processing
 * - Integration with ClaudeServiceManager
 */

import { ClaudeServiceManager, ClaudeServiceInstance, createProductionClaudeServiceManager } from './ClaudeServiceManager';

export interface FeedWorkerConfig {
  workingDirectory: string;
  maxConcurrentFeeds: number;
  feedProcessingTimeout: number;
  healthCheckInterval: number;
  autoRestartOnFailure: boolean;
  restartThreshold: number;
}

export interface FeedProcessingMetrics {
  totalFeedsProcessed: number;
  successfulFeeds: number;
  failedFeeds: number;
  averageProcessingTime: number;
  currentLoad: number;
  workerUptime: number;
  lastProcessedFeed?: Date;
  errorRate: number;
}

export interface FeedWorkerStatus {
  instanceId: string;
  status: 'ready' | 'processing' | 'error' | 'restarting';
  currentFeeds: number;
  maxFeeds: number;
  metrics: FeedProcessingMetrics;
  lastHealthCheck: Date;
  errorCount: number;
}

export class FeedIntegrationService {
  private static instance: FeedIntegrationService;
  private serviceManager: ClaudeServiceManager;
  private config: FeedWorkerConfig;
  private workerInstance: ClaudeServiceInstance | null = null;
  private metrics: FeedProcessingMetrics;
  private monitoringTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;
  private eventListeners: Map<string, Set<Function>> = new Map();

  private constructor(config: FeedWorkerConfig, apiUrl: string = 'http://localhost:3333') {
    this.config = config;
    this.serviceManager = createProductionClaudeServiceManager(apiUrl);
    this.metrics = {
      totalFeedsProcessed: 0,
      successfulFeeds: 0,
      failedFeeds: 0,
      averageProcessingTime: 0,
      currentLoad: 0,
      workerUptime: 0,
      errorRate: 0
    };
    
    this.startMonitoring();
    this.setupServiceManagerListeners();
  }

  static getInstance(config?: FeedWorkerConfig, apiUrl?: string): FeedIntegrationService {
    if (!FeedIntegrationService.instance) {
      if (!config) {
        throw new Error('FeedIntegrationService requires initial configuration');
      }
      FeedIntegrationService.instance = new FeedIntegrationService(config, apiUrl);
    }
    return FeedIntegrationService.instance;
  }

  /**
   * Initialize feed integration system
   */
  async initialize(): Promise<void> {
    try {
      console.log('[FeedIntegrationService] Initializing feed integration system');
      
      // Ensure worker instance is available
      this.workerInstance = await this.serviceManager.ensureWorkerInstance();
      
      // Verify worker is ready for feed processing
      await this.validateWorkerReadiness();
      
      // Start health monitoring
      this.startHealthChecking();
      
      this.emit('feed:integration:ready', {
        workerInstanceId: this.workerInstance.id,
        status: 'ready'
      });
      
      console.log('[FeedIntegrationService] Feed integration system ready');
    } catch (error) {
      console.error('[FeedIntegrationService] Failed to initialize:', error);
      throw new Error(`Feed integration initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current feed worker status
   */
  async getWorkerStatus(): Promise<FeedWorkerStatus | null> {
    if (!this.workerInstance) {
      return null;
    }

    try {
      // Fetch fresh instance data
      const currentInstance = await this.serviceManager.getInstance(this.workerInstance.id);
      if (currentInstance) {
        this.workerInstance = currentInstance;
      }

      return {
        instanceId: this.workerInstance.id,
        status: this.determineWorkerStatus(),
        currentFeeds: 0, // TODO: Implement feed tracking
        maxFeeds: this.config.maxConcurrentFeeds,
        metrics: this.metrics,
        lastHealthCheck: new Date(),
        errorCount: this.workerInstance.restartCount
      };
    } catch (error) {
      console.error('[FeedIntegrationService] Failed to get worker status:', error);
      return null;
    }
  }

  /**
   * Process feed through worker instance
   */
  async processFeed(feedData: {
    id: string;
    content: string;
    priority: 'low' | 'normal' | 'high';
    timeout?: number;
  }): Promise<{
    success: boolean;
    result?: any;
    error?: string;
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      if (!this.workerInstance || this.workerInstance.status !== 'running') {
        throw new Error('Worker instance not available');
      }

      // Check if worker can handle more feeds
      const workerStatus = await this.getWorkerStatus();
      if (!workerStatus || workerStatus.currentFeeds >= this.config.maxConcurrentFeeds) {
        throw new Error('Worker instance at capacity');
      }

      // Send feed processing request to worker
      const response = await fetch(`${this.serviceManager['config'].apiUrl}/api/v1/claude/instances/${this.workerInstance.id}/process-feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedId: feedData.id,
          content: feedData.content,
          priority: feedData.priority,
          timeout: feedData.timeout || this.config.feedProcessingTimeout
        })
      });

      const result = await response.json();
      const processingTime = Date.now() - startTime;

      if (result.success) {
        this.updateMetrics({
          success: true,
          processingTime
        });

        this.emit('feed:processed', {
          feedId: feedData.id,
          result: result.data,
          processingTime
        });

        return {
          success: true,
          result: result.data,
          processingTime
        };
      } else {
        this.updateMetrics({
          success: false,
          processingTime
        });

        return {
          success: false,
          error: result.error,
          processingTime
        };
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Feed processing failed';
      
      this.updateMetrics({
        success: false,
        processingTime
      });

      this.emit('feed:error', {
        feedId: feedData.id,
        error: errorMessage,
        processingTime
      });

      return {
        success: false,
        error: errorMessage,
        processingTime
      };
    }
  }

  /**
   * Ensure worker instance is healthy and ready
   */
  async ensureWorkerHealth(): Promise<boolean> {
    try {
      if (!this.workerInstance) {
        console.log('[FeedIntegrationService] No worker instance, creating new one');
        this.workerInstance = await this.serviceManager.ensureWorkerInstance();
      }

      // Check worker health
      const isHealthy = await this.checkWorkerHealth();
      if (!isHealthy) {
        console.log('[FeedIntegrationService] Worker unhealthy, attempting restart');
        await this.restartWorker();
      }

      return true;
    } catch (error) {
      console.error('[FeedIntegrationService] Failed to ensure worker health:', error);
      return false;
    }
  }

  /**
   * Get feed processing metrics
   */
  getFeedMetrics(): FeedProcessingMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset worker instance (emergency recovery)
   */
  async resetWorker(): Promise<void> {
    try {
      console.log('[FeedIntegrationService] Resetting worker instance');
      
      if (this.workerInstance) {
        await this.serviceManager.terminateInstance(this.workerInstance.id);
      }
      
      this.workerInstance = await this.serviceManager.createInstance({
        name: 'Feed Worker Instance (Reset)',
        type: 'worker',
        workingDirectory: this.config.workingDirectory,
        skipPermissions: true,
        autoRestart: true,
        isAlwaysOn: true
      });

      this.emit('feed:worker:reset', {
        newInstanceId: this.workerInstance.id
      });
      
      console.log('[FeedIntegrationService] Worker instance reset complete');
    } catch (error) {
      console.error('[FeedIntegrationService] Failed to reset worker:', error);
      throw error;
    }
  }

  /**
   * Event listener management
   */
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  off(event: string, listener: Function): void {
    this.eventListeners.get(event)?.delete(listener);
  }

  private emit(event: string, data: any): void {
    this.eventListeners.get(event)?.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Event listener error for ${event}:`, error);
      }
    });
  }

  /**
   * Determine worker status based on instance state
   */
  private determineWorkerStatus(): FeedWorkerStatus['status'] {
    if (!this.workerInstance) return 'error';
    
    switch (this.workerInstance.status) {
      case 'running': return 'ready';
      case 'starting': return 'processing';
      case 'error': return 'error';
      case 'stopped': return 'restarting';
      default: return 'error';
    }
  }

  /**
   * Validate worker instance is ready for feed processing
   */
  private async validateWorkerReadiness(): Promise<void> {
    if (!this.workerInstance) {
      throw new Error('No worker instance available');
    }

    // Check if worker is running in correct directory
    if (this.workerInstance.workingDirectory !== this.config.workingDirectory) {
      throw new Error(`Worker not in correct directory. Expected: ${this.config.workingDirectory}, Got: ${this.workerInstance.workingDirectory}`);
    }

    // Verify worker has required permissions
    if (!this.workerInstance.configuration.skipPermissions) {
      console.warn('[FeedIntegrationService] Worker instance may face permission issues');
    }
  }

  /**
   * Check worker health
   */
  private async checkWorkerHealth(): Promise<boolean> {
    if (!this.workerInstance) return false;

    try {
      const instance = await this.serviceManager.getInstance(this.workerInstance.id);
      return instance?.status === 'running';
    } catch (error) {
      console.error('[FeedIntegrationService] Health check failed:', error);
      return false;
    }
  }

  /**
   * Restart worker instance
   */
  private async restartWorker(): Promise<void> {
    if (!this.workerInstance) return;

    try {
      console.log('[FeedIntegrationService] Restarting worker instance');
      
      await this.serviceManager.terminateInstance(this.workerInstance.id);
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.workerInstance = await this.serviceManager.ensureWorkerInstance();
      
      this.emit('feed:worker:restarted', {
        instanceId: this.workerInstance.id
      });
    } catch (error) {
      console.error('[FeedIntegrationService] Failed to restart worker:', error);
      throw error;
    }
  }

  /**
   * Update processing metrics
   */
  private updateMetrics(result: { success: boolean; processingTime: number }): void {
    this.metrics.totalFeedsProcessed++;
    
    if (result.success) {
      this.metrics.successfulFeeds++;
    } else {
      this.metrics.failedFeeds++;
    }

    // Update average processing time
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.totalFeedsProcessed - 1) + result.processingTime) / 
      this.metrics.totalFeedsProcessed;

    // Calculate error rate
    this.metrics.errorRate = this.metrics.failedFeeds / this.metrics.totalFeedsProcessed;
    
    // Update last processed timestamp
    this.metrics.lastProcessedFeed = new Date();
  }

  /**
   * Setup service manager event listeners
   */
  private setupServiceManagerListeners(): void {
    this.serviceManager.on('instance:terminated', ({ instanceId }: { instanceId: string }) => {
      if (this.workerInstance && this.workerInstance.id === instanceId) {
        console.log('[FeedIntegrationService] Worker instance terminated, will recreate');
        this.workerInstance = null;
        this.handleWorkerLoss();
      }
    });

    this.serviceManager.on('health:check', (metrics) => {
      this.updateWorkerMetrics(metrics);
    });
  }

  /**
   * Handle worker instance loss
   */
  private async handleWorkerLoss(): Promise<void> {
    try {
      console.log('[FeedIntegrationService] Handling worker instance loss');
      
      // Attempt to recreate worker
      this.workerInstance = await this.serviceManager.ensureWorkerInstance();
      
      this.emit('feed:worker:recovered', {
        newInstanceId: this.workerInstance.id
      });
    } catch (error) {
      console.error('[FeedIntegrationService] Failed to recover worker instance:', error);
      this.emit('feed:worker:failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Update worker metrics from service manager
   */
  private updateWorkerMetrics(serviceMetrics: any): void {
    if (this.workerInstance) {
      this.metrics.workerUptime = Date.now() - (this.workerInstance.startTime?.getTime() || Date.now());
      this.metrics.currentLoad = this.workerInstance.cpuUsage || 0;
    }
  }

  /**
   * Start monitoring systems
   */
  private startMonitoring(): void {
    // Monitor worker health every 30 seconds
    this.monitoringTimer = setInterval(async () => {
      try {
        await this.ensureWorkerHealth();
      } catch (error) {
        console.error('[FeedIntegrationService] Monitoring error:', error);
      }
    }, 30000);
  }

  /**
   * Start health checking
   */
  private startHealthChecking(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        if (this.workerInstance) {
          const isHealthy = await this.checkWorkerHealth();
          
          this.emit('feed:health:check', {
            instanceId: this.workerInstance.id,
            isHealthy,
            metrics: this.metrics
          });
        }
      } catch (error) {
        console.error('[FeedIntegrationService] Health check error:', error);
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.eventListeners.clear();
  }
}

// Default configuration for production feed integration
export const createProductionFeedIntegration = (apiUrl: string = 'http://localhost:3333') => {
  return FeedIntegrationService.getInstance({
    workingDirectory: '/workspaces/agent-feed/prod',
    maxConcurrentFeeds: 5,
    feedProcessingTimeout: 300000, // 5 minutes
    healthCheckInterval: 30000, // 30 seconds
    autoRestartOnFailure: true,
    restartThreshold: 3
  }, apiUrl);
};