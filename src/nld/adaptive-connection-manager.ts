/**
 * NLD Adaptive Connection Manager
 * Implements intelligent connection strategies based on learned patterns
 */

import { EventEmitter } from 'events';
import { ConnectionFailureDetector, ConnectionFailureContext, ConnectionStrategy } from './connection-failure-detector';
import { ConnectionLearningDatabase } from './learning-database';

export interface AdaptiveConnectionConfig {
  endpoints: string[];
  protocols: ('websocket' | 'sse' | 'polling' | 'http')[];
  fallbackChain: string[];
  learningEnabled: boolean;
  neuralModeEnabled: boolean;
  circuitBreakerEnabled: boolean;
}

export interface ConnectionHealth {
  isHealthy: boolean;
  latency: number;
  successRate: number;
  lastSuccess: number;
  failureCount: number;
  circuitState: 'closed' | 'open' | 'half-open';
}

export interface ConnectionAttemptResult {
  success: boolean;
  duration: number;
  error?: any;
  strategy: ConnectionStrategy;
  fallbacksUsed: string[];
  learningApplied: boolean;
}

export class AdaptiveConnectionManager extends EventEmitter {
  private failureDetector: ConnectionFailureDetector;
  private learningDatabase: ConnectionLearningDatabase;
  private activeConnections: Map<string, any> = new Map();
  private connectionHealth: Map<string, ConnectionHealth> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private config: AdaptiveConnectionConfig;

  constructor(config: AdaptiveConnectionConfig) {
    super();
    this.config = config;
    this.failureDetector = new ConnectionFailureDetector();
    this.learningDatabase = new ConnectionLearningDatabase();
    this.setupEventHandlers();
    this.initializeCircuitBreakers();
  }

  /**
   * Establish connection with adaptive strategy
   */
  async connect(endpoint: string, options: any = {}): Promise<ConnectionAttemptResult> {
    const connectionId = this.generateConnectionId(endpoint);
    const startTime = Date.now();
    
    try {
      // Get optimal strategy based on learned patterns
      const strategy = await this.getOptimalStrategy(endpoint, options);
      
      // Check circuit breaker
      const circuitBreaker = this.circuitBreakers.get(endpoint);
      if (circuitBreaker && circuitBreaker.isOpen()) {
        throw new Error(`Circuit breaker open for ${endpoint}`);
      }

      // Attempt connection with adaptive strategy
      const result = await this.attemptConnectionWithStrategy(
        endpoint,
        strategy,
        options,
        connectionId
      );

      // Update learning data on success
      if (result.success) {
        await this.recordSuccess(endpoint, strategy, result.duration, connectionId);
        circuitBreaker?.recordSuccess();
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failure for learning
      await this.recordFailure(endpoint, error, duration, options, connectionId);
      
      // Update circuit breaker
      const circuitBreaker = this.circuitBreakers.get(endpoint);
      circuitBreaker?.recordFailure();

      // Attempt fallback if configured
      if (this.config.fallbackChain.length > 0) {
        return await this.attemptFallback(endpoint, error, options, connectionId);
      }

      throw error;
    }
  }

  /**
   * Get connection health status
   */
  getConnectionHealth(endpoint: string): ConnectionHealth {
    return this.connectionHealth.get(endpoint) || {
      isHealthy: false,
      latency: 0,
      successRate: 0,
      lastSuccess: 0,
      failureCount: 0,
      circuitState: 'closed'
    };
  }

  /**
   * Get intelligent troubleshooting suggestions
   */
  async getTroubleshootingSuggestions(endpoint: string, error?: any): Promise<string[]> {
    const context = await this.buildFailureContext(endpoint, error);
    return this.failureDetector.getTroubleshootingSuggestions(context);
  }

  /**
   * Get performance analytics
   */
  getPerformanceAnalytics(): any {
    const detectorMetrics = this.failureDetector.getPerformanceMetrics();
    const databaseMetrics = this.learningDatabase.getPerformanceAnalytics();
    
    return {
      ...detectorMetrics,
      ...databaseMetrics,
      activeConnections: this.activeConnections.size,
      healthyEndpoints: Array.from(this.connectionHealth.values())
        .filter(h => h.isHealthy).length,
      circuitBreakersOpen: Array.from(this.circuitBreakers.values())
        .filter(cb => cb.isOpen()).length
    };
  }

  /**
   * Train neural patterns from recent data
   */
  async trainNeuralPatterns(): Promise<void> {
    if (!this.config.neuralModeEnabled) return;

    const trainingData = await this.learningDatabase.exportNeuralTrainingData();
    
    this.emit('neuralTraining', {
      type: 'connection_patterns',
      data: trainingData
    });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AdaptiveConnectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  private async getOptimalStrategy(endpoint: string, options: any): Promise<ConnectionStrategy> {
    if (!this.config.learningEnabled) {
      return this.getDefaultStrategy();
    }

    const context = await this.buildConnectionContext(endpoint, options);
    return await this.learningDatabase.getOptimalStrategy(context);
  }

  private async attemptConnectionWithStrategy(
    endpoint: string,
    strategy: ConnectionStrategy,
    options: any,
    connectionId: string
  ): Promise<ConnectionAttemptResult> {
    const fallbacksUsed: string[] = [];
    let lastError: any;

    for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
      try {
        const startTime = Date.now();
        const connection = await this.establishConnection(endpoint, options, attempt);
        const duration = Date.now() - startTime;

        this.activeConnections.set(connectionId, connection);
        
        return {
          success: true,
          duration,
          strategy,
          fallbacksUsed,
          learningApplied: this.config.learningEnabled
        };

      } catch (error) {
        lastError = error;
        
        if (attempt < strategy.maxAttempts) {
          const delay = this.calculateDelay(strategy, attempt);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private async attemptFallback(
    endpoint: string,
    originalError: any,
    options: any,
    connectionId: string
  ): Promise<ConnectionAttemptResult> {
    const fallbacksUsed: string[] = [];
    
    for (const fallback of this.config.fallbackChain) {
      try {
        const startTime = Date.now();
        const connection = await this.establishFallbackConnection(fallback, endpoint, options);
        const duration = Date.now() - startTime;
        
        this.activeConnections.set(connectionId, connection);
        fallbacksUsed.push(fallback);
        
        return {
          success: true,
          duration,
          strategy: this.getDefaultStrategy(),
          fallbacksUsed,
          learningApplied: this.config.learningEnabled
        };

      } catch (fallbackError) {
        fallbacksUsed.push(fallback);
        console.warn(`Fallback ${fallback} failed:`, fallbackError);
      }
    }

    throw originalError;
  }

  private async establishConnection(endpoint: string, options: any, attempt: number): Promise<any> {
    // Implementation depends on connection type
    if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) {
      return this.establishWebSocketConnection(endpoint, options, attempt);
    } else if (options.protocol === 'sse') {
      return this.establishSSEConnection(endpoint, options, attempt);
    } else if (options.protocol === 'polling') {
      return this.establishPollingConnection(endpoint, options, attempt);
    } else {
      return this.establishHttpConnection(endpoint, options, attempt);
    }
  }

  private async establishWebSocketConnection(endpoint: string, options: any, attempt: number): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(endpoint);
      
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error(`WebSocket connection timeout on attempt ${attempt}`));
      }, options.timeout || 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        resolve(ws);
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }

  private async establishSSEConnection(endpoint: string, options: any, attempt: number): Promise<EventSource> {
    return new Promise((resolve, reject) => {
      const eventSource = new EventSource(endpoint);
      
      const timeout = setTimeout(() => {
        eventSource.close();
        reject(new Error(`SSE connection timeout on attempt ${attempt}`));
      }, options.timeout || 10000);

      eventSource.onopen = () => {
        clearTimeout(timeout);
        resolve(eventSource);
      };

      eventSource.onerror = (error) => {
        clearTimeout(timeout);
        eventSource.close();
        reject(error);
      };
    });
  }

  private async establishPollingConnection(endpoint: string, options: any, attempt: number): Promise<any> {
    // Implement polling connection
    return { type: 'polling', endpoint, active: true };
  }

  private async establishHttpConnection(endpoint: string, options: any, attempt: number): Promise<any> {
    const response = await fetch(endpoint, {
      ...options,
      timeout: options.timeout || 10000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  }

  private async establishFallbackConnection(fallback: string, endpoint: string, options: any): Promise<any> {
    const fallbackOptions = { ...options, protocol: fallback };
    return this.establishConnection(endpoint, fallbackOptions, 1);
  }

  private calculateDelay(strategy: ConnectionStrategy, attempt: number): number {
    let delay: number;
    
    switch (strategy.type) {
      case 'exponential-backoff':
        delay = strategy.baseDelay * Math.pow(2, attempt - 1);
        break;
      case 'linear-backoff':
        delay = strategy.baseDelay * attempt;
        break;
      case 'fibonacci':
        delay = strategy.baseDelay * this.fibonacci(attempt);
        break;
      default:
        delay = strategy.baseDelay;
    }

    delay = Math.min(delay, strategy.maxDelay);
    
    if (strategy.jitter) {
      delay += Math.random() * 1000;
    }
    
    return delay;
  }

  private fibonacci(n: number): number {
    if (n <= 1) return 1;
    return this.fibonacci(n - 1) + this.fibonacci(n - 2);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async recordSuccess(
    endpoint: string,
    strategy: ConnectionStrategy,
    duration: number,
    connectionId: string
  ): Promise<void> {
    // Update connection health
    const health = this.connectionHealth.get(endpoint) || this.createDefaultHealth();
    health.isHealthy = true;
    health.latency = (health.latency + duration) / 2;
    health.lastSuccess = Date.now();
    health.successRate = Math.min(1.0, health.successRate + 0.1);
    this.connectionHealth.set(endpoint, health);

    // Record in learning database
    if (this.config.learningEnabled) {
      await this.learningDatabase.storeSuccessfulRecovery(connectionId, strategy, duration);
    }

    this.emit('connectionSuccess', { endpoint, strategy, duration });
  }

  private async recordFailure(
    endpoint: string,
    error: any,
    duration: number,
    options: any,
    connectionId: string
  ): Promise<void> {
    // Update connection health
    const health = this.connectionHealth.get(endpoint) || this.createDefaultHealth();
    health.isHealthy = false;
    health.failureCount++;
    health.successRate = Math.max(0.0, health.successRate - 0.1);
    this.connectionHealth.set(endpoint, health);

    // Record in learning database
    if (this.config.learningEnabled) {
      const context = await this.buildFailureContext(endpoint, error, options);
      await this.failureDetector.captureFailure(context);
    }

    this.emit('connectionFailure', { endpoint, error, duration });
  }

  private async buildConnectionContext(endpoint: string, options: any): Promise<Partial<ConnectionFailureContext>> {
    return {
      connectionType: this.determineConnectionType(endpoint, options),
      endpoint,
      networkConditions: await this.getNetworkConditions(),
      clientInfo: this.getClientInfo()
    };
  }

  private async buildFailureContext(
    endpoint: string,
    error: any,
    options: any = {}
  ): Promise<ConnectionFailureContext> {
    return {
      connectionType: this.determineConnectionType(endpoint, options),
      endpoint,
      timestamp: Date.now(),
      networkConditions: await this.getNetworkConditions(),
      clientInfo: this.getClientInfo(),
      errorDetails: {
        code: error.code || 'unknown',
        message: error.message || 'Unknown error',
        type: this.classifyError(error),
        stack: error.stack
      },
      attemptHistory: []
    };
  }

  private determineConnectionType(endpoint: string, options: any): 'websocket' | 'http' | 'sse' | 'polling' {
    if (options.protocol) return options.protocol;
    if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) return 'websocket';
    return 'http';
  }

  private async getNetworkConditions(): Promise<any> {
    // Implementation would get actual network conditions
    return {
      connectionType: 'unknown',
      isOnline: navigator.onLine
    };
  }

  private getClientInfo(): any {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isMobile: /Mobile|Android|iOS/.test(navigator.userAgent),
      supportedProtocols: ['websocket', 'sse', 'polling', 'http']
    };
  }

  private classifyError(error: any): string {
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) return 'timeout';
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') return 'network';
    if (error.code === 401 || error.code === 403) return 'auth';
    if (error.code >= 500) return 'server';
    return 'unknown';
  }

  private createDefaultHealth(): ConnectionHealth {
    return {
      isHealthy: false,
      latency: 0,
      successRate: 0,
      lastSuccess: 0,
      failureCount: 0,
      circuitState: 'closed'
    };
  }

  private getDefaultStrategy(): ConnectionStrategy {
    return {
      type: 'exponential-backoff',
      baseDelay: 1000,
      maxDelay: 30000,
      jitter: true,
      maxAttempts: 5
    };
  }

  private generateConnectionId(endpoint: string): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${endpoint.replace(/[^\w]/g, '_')}`;
  }

  private setupEventHandlers(): void {
    this.failureDetector.on('patternDetected', (data) => {
      this.emit('patternDetected', data);
    });

    this.learningDatabase.on('patternStored', (data) => {
      this.emit('learningUpdated', data);
    });
  }

  private initializeCircuitBreakers(): void {
    this.config.endpoints.forEach(endpoint => {
      this.circuitBreakers.set(endpoint, new CircuitBreaker({
        failureThreshold: 5,
        recoveryTimeout: 60000
      }));
    });
  }
}

// Circuit breaker implementation
class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(private config: { failureThreshold: number; recoveryTimeout: number }) {}

  isOpen(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = 'half-open';
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }
}