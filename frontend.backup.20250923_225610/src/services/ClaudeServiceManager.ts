/**
 * ClaudeServiceManager - Production-Ready Global Claude Instance Management
 * 
 * This service provides API-only management of Claude instances across the application.
 * It operates independently of WebSocket connections and focuses on global state management,
 * monitoring, and coordination of multiple Claude instances.
 * 
 * Key Features:
 * - API-only operations (no WebSocket dependencies)
 * - Global state management across all instances
 * - Production directory (/prod) integration
 * - Always-on worker instance management
 * - Feed integration ready
 * - Performance optimized for background operations
 */

export interface ClaudeServiceConfig {
  apiUrl: string;
  productionDirectory: string;
  maxInstances: number;
  healthCheckInterval: number;
  workerInstanceId?: string;
}

export interface ClaudeServiceInstance {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  type: 'interactive' | 'worker' | 'feed' | 'background';
  workingDirectory: string;
  pid?: number;
  startTime?: Date;
  lastActivity?: Date;
  isAlwaysOn: boolean;
  memoryUsage?: number;
  cpuUsage?: number;
  uptime?: number;
  restartCount: number;
  configuration: {
    skipPermissions: boolean;
    resumeSession: boolean;
    autoRestart: boolean;
    restartInterval?: number;
  };
}

export interface ClaudeServiceMetrics {
  totalInstances: number;
  runningInstances: number;
  workerInstances: number;
  feedInstances: number;
  systemLoad: number;
  memoryUsage: number;
  uptime: number;
  restartEvents: number;
  lastHealthCheck: Date;
}

export interface ClaudeServiceError extends Error {
  instanceId?: string;
  errorCode: string;
  timestamp: Date;
  context?: any;
}

export class ClaudeServiceManager {
  private static instance: ClaudeServiceManager;
  private config: ClaudeServiceConfig;
  private instances: Map<string, ClaudeServiceInstance> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;
  private metrics: ClaudeServiceMetrics;
  private eventListeners: Map<string, Set<Function>> = new Map();

  private constructor(config: ClaudeServiceConfig) {
    this.config = config;
    this.metrics = {
      totalInstances: 0,
      runningInstances: 0,
      workerInstances: 0,
      feedInstances: 0,
      systemLoad: 0,
      memoryUsage: 0,
      uptime: 0,
      restartEvents: 0,
      lastHealthCheck: new Date()
    };
    this.startHealthChecking();
  }

  static getInstance(config?: ClaudeServiceConfig): ClaudeServiceManager {
    if (!ClaudeServiceManager.instance) {
      if (!config) {
        throw new Error('ClaudeServiceManager requires initial configuration');
      }
      ClaudeServiceManager.instance = new ClaudeServiceManager(config);
    }
    return ClaudeServiceManager.instance;
  }

  /**
   * API-only instance creation with production directory support
   */
  async createInstance(options: {
    name?: string;
    type: ClaudeServiceInstance['type'];
    workingDirectory?: string;
    skipPermissions?: boolean;
    resumeSession?: boolean;
    autoRestart?: boolean;
    isAlwaysOn?: boolean;
  }): Promise<ClaudeServiceInstance> {
    const instanceId = `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Default to /prod directory for production instances
    const workingDirectory = options.workingDirectory || this.config.productionDirectory;
    
    const instanceConfig = {
      command: this.buildClaudeCommand(options),
      workingDirectory,
      instanceType: options.type,
      autoRestart: options.autoRestart || false,
      isAlwaysOn: options.isAlwaysOn || false
    };

    try {
      const response = await fetch(`${this.config.apiUrl}/api/claude/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instanceConfig)
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new ClaudeServiceError(
          data.error || 'Failed to create instance',
          'INSTANCE_CREATION_FAILED',
          new Date(),
          instanceId
        );
      }

      const instance: ClaudeServiceInstance = {
        id: data.instanceId || instanceId,
        name: options.name || `Claude ${options.type} Instance`,
        status: 'starting',
        type: options.type,
        workingDirectory,
        startTime: new Date(),
        lastActivity: new Date(),
        isAlwaysOn: options.isAlwaysOn || false,
        restartCount: 0,
        configuration: {
          skipPermissions: options.skipPermissions || false,
          resumeSession: options.resumeSession || false,
          autoRestart: options.autoRestart || false
        }
      };

      this.instances.set(instance.id, instance);
      this.updateMetrics();
      this.emit('instance:created', instance);

      return instance;
    } catch (error) {
      throw new ClaudeServiceError(
        `Failed to create instance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INSTANCE_CREATION_ERROR',
        new Date(),
        instanceId
      );
    }
  }

  /**
   * Get all instances with optional filtering
   */
  async getInstances(filter?: {
    type?: ClaudeServiceInstance['type'];
    status?: ClaudeServiceInstance['status'];
    isAlwaysOn?: boolean;
  }): Promise<ClaudeServiceInstance[]> {
    try {
      // Fetch fresh data from API
      const response = await fetch(`${this.config.apiUrl}/api/claude/instances`);
      const data = await response.json();
      
      if (data.success) {
        // Update local cache
        this.syncInstances(data.instances || []);
      }

      let instances = Array.from(this.instances.values());

      if (filter) {
        instances = instances.filter(instance => {
          if (filter.type && instance.type !== filter.type) return false;
          if (filter.status && instance.status !== filter.status) return false;
          if (filter.isAlwaysOn !== undefined && instance.isAlwaysOn !== filter.isAlwaysOn) return false;
          return true;
        });
      }

      return instances;
    } catch (error) {
      throw new ClaudeServiceError(
        `Failed to fetch instances: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INSTANCE_FETCH_ERROR',
        new Date()
      );
    }
  }

  /**
   * Get specific instance by ID
   */
  async getInstance(instanceId: string): Promise<ClaudeServiceInstance | null> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/claude/instances/${instanceId}`);
      const data = await response.json();
      
      if (data.success && data.instance) {
        // Update local cache
        this.instances.set(instanceId, data.instance);
        return data.instance;
      }
      
      return this.instances.get(instanceId) || null;
    } catch (error) {
      console.warn(`Failed to fetch instance ${instanceId}:`, error);
      return this.instances.get(instanceId) || null;
    }
  }

  /**
   * Terminate instance
   */
  async terminateInstance(instanceId: string): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/claude/instances/${instanceId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new ClaudeServiceError(
          data.error || 'Failed to terminate instance',
          'INSTANCE_TERMINATION_FAILED',
          new Date(),
          instanceId
        );
      }

      this.instances.delete(instanceId);
      this.updateMetrics();
      this.emit('instance:terminated', { instanceId });
    } catch (error) {
      throw new ClaudeServiceError(
        `Failed to terminate instance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INSTANCE_TERMINATION_ERROR',
        new Date(),
        instanceId
      );
    }
  }

  /**
   * Get always-on worker instance (for feed integration)
   */
  async getWorkerInstance(): Promise<ClaudeServiceInstance | null> {
    const workerInstances = await this.getInstances({ 
      type: 'worker', 
      isAlwaysOn: true,
      status: 'running' 
    });
    
    return workerInstances.length > 0 ? workerInstances[0] : null;
  }

  /**
   * Ensure worker instance is available (create if needed)
   */
  async ensureWorkerInstance(): Promise<ClaudeServiceInstance> {
    let workerInstance = await this.getWorkerInstance();
    
    if (!workerInstance) {
      console.log('[ClaudeServiceManager] Creating always-on worker instance');
      workerInstance = await this.createInstance({
        name: 'Feed Worker Instance',
        type: 'worker',
        workingDirectory: this.config.productionDirectory,
        skipPermissions: true,
        autoRestart: true,
        isAlwaysOn: true
      });
    }
    
    return workerInstance;
  }

  /**
   * Get system metrics
   */
  getMetrics(): ClaudeServiceMetrics {
    this.updateMetrics();
    return { ...this.metrics };
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
   * Build Claude command based on options
   */
  private buildClaudeCommand(options: {
    skipPermissions?: boolean;
    resumeSession?: boolean;
  }): string[] {
    const command = ['claude'];
    
    if (options.skipPermissions) {
      command.push('--dangerously-skip-permissions');
    }
    
    if (options.resumeSession) {
      command.push('--resume');
    }
    
    return command;
  }

  /**
   * Sync instances from API response
   */
  private syncInstances(apiInstances: any[]): void {
    const currentInstanceIds = new Set(this.instances.keys());
    
    apiInstances.forEach(apiInstance => {
      const instance: ClaudeServiceInstance = {
        id: apiInstance.id,
        name: apiInstance.name || `Claude Instance ${apiInstance.id.slice(0, 8)}`,
        status: apiInstance.status,
        type: apiInstance.type || 'interactive',
        workingDirectory: apiInstance.workingDirectory || this.config.productionDirectory,
        pid: apiInstance.pid,
        startTime: apiInstance.startTime ? new Date(apiInstance.startTime) : undefined,
        lastActivity: apiInstance.lastActivity ? new Date(apiInstance.lastActivity) : undefined,
        isAlwaysOn: apiInstance.isAlwaysOn || false,
        memoryUsage: apiInstance.memoryUsage,
        cpuUsage: apiInstance.cpuUsage,
        uptime: apiInstance.uptime,
        restartCount: apiInstance.restartCount || 0,
        configuration: {
          skipPermissions: apiInstance.skipPermissions || false,
          resumeSession: apiInstance.resumeSession || false,
          autoRestart: apiInstance.autoRestart || false,
          restartInterval: apiInstance.restartInterval
        }
      };
      
      this.instances.set(instance.id, instance);
      currentInstanceIds.delete(instance.id);
    });

    // Remove instances that no longer exist
    currentInstanceIds.forEach(instanceId => {
      this.instances.delete(instanceId);
    });

    this.updateMetrics();
  }

  /**
   * Update metrics based on current instances
   */
  private updateMetrics(): void {
    const instances = Array.from(this.instances.values());
    
    this.metrics = {
      totalInstances: instances.length,
      runningInstances: instances.filter(i => i.status === 'running').length,
      workerInstances: instances.filter(i => i.type === 'worker').length,
      feedInstances: instances.filter(i => i.type === 'feed').length,
      systemLoad: instances.reduce((acc, i) => acc + (i.cpuUsage || 0), 0) / instances.length || 0,
      memoryUsage: instances.reduce((acc, i) => acc + (i.memoryUsage || 0), 0),
      uptime: Date.now() - (instances[0]?.startTime?.getTime() || Date.now()),
      restartEvents: instances.reduce((acc, i) => acc + i.restartCount, 0),
      lastHealthCheck: new Date()
    };
  }

  /**
   * Start health checking
   */
  private startHealthChecking(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('[ClaudeServiceManager] Health check failed:', error);
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check on all instances
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const response = await fetch(`${this.config.apiUrl}/health`);
      const data = await response.json();
      
      if (data.success) {
        this.syncInstances(data.instances || []);
        this.emit('health:check', this.metrics);
      }
    } catch (error) {
      console.warn('[ClaudeServiceManager] Health check request failed:', error);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    this.eventListeners.clear();
    this.instances.clear();
  }
}

// Create ClaudeServiceError class
export class ClaudeServiceError extends Error {
  constructor(
    message: string,
    public errorCode: string,
    public timestamp: Date,
    public instanceId?: string,
    public context?: any
  ) {
    super(message);
    this.name = 'ClaudeServiceError';
  }
}

// Default configuration for production use
export const createProductionClaudeServiceManager = (apiUrl: string = 'http://localhost:3000') => {
  return ClaudeServiceManager.getInstance({
    apiUrl,
    productionDirectory: '/workspaces/agent-feed/prod',
    maxInstances: 10,
    healthCheckInterval: 30000, // 30 seconds
    workerInstanceId: undefined // Will be set when worker instance is created
  });
};