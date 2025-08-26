/**
 * NLD Connection Recovery System
 * Implements circuit breaker pattern and automated recovery for connection failures
 * Based on failure patterns from NLD-BACKEND-CONN-20250826-001
 */

import { serviceHealthMonitor } from './service-health-monitor';

interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxAttempts: number;
}

enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing, rejecting requests
  HALF_OPEN = 'half_open' // Testing if service recovered
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenAttempts: number = 0;

  constructor(
    private serviceName: string,
    private config: CircuitBreakerConfig
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.halfOpenAttempts = 0;
        console.log(`🔄 Circuit breaker for ${this.serviceName} moving to HALF_OPEN`);
      } else {
        throw new Error(`Circuit breaker is OPEN for ${this.serviceName}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
  }

  private onSuccess(): void {
    this.failures = 0;
    this.halfOpenAttempts = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      console.log(`✅ Circuit breaker for ${this.serviceName} reset to CLOSED`);
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        this.state = CircuitState.OPEN;
        console.warn(`❌ Circuit breaker for ${this.serviceName} failed in HALF_OPEN, moving to OPEN`);
      }
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.warn(`⚡ Circuit breaker OPENED for ${this.serviceName} after ${this.failures} failures`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getMetrics(): any {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      halfOpenAttempts: this.halfOpenAttempts
    };
  }
}

class ConnectionRecoverySystem {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private retryConfigs: Map<string, RetryConfig> = new Map();
  private activeRecoveries: Map<string, Promise<any>> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs(): void {
    // Based on observed failure patterns from logs
    const services = [
      'backend-api',
      'websocket-server', 
      'redis',
      'secondary-backend-3002',
      'secondary-backend-3003'
    ];

    services.forEach(serviceName => {
      // Circuit breaker config based on failure analysis
      const circuitConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        recoveryTimeout: 30000, // 30 seconds
        monitoringPeriod: 10000, // 10 seconds
        halfOpenMaxAttempts: 3
      };

      // Retry config based on observed retry patterns
      const retryConfig: RetryConfig = {
        maxAttempts: serviceName === 'redis' ? 5 : 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: serviceName === 'redis' ? 2.0 : 1.5,
        jitter: true
      };

      this.circuitBreakers.set(serviceName, new CircuitBreaker(serviceName, circuitConfig));
      this.retryConfigs.set(serviceName, retryConfig);
    });
  }

  async executeWithRecovery<T>(
    serviceName: string,
    operation: () => Promise<T>,
    context?: { 
      operationType?: string;
      timeout?: number;
      skipCircuitBreaker?: boolean;
    }
  ): Promise<T> {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    const retryConfig = this.retryConfigs.get(serviceName);

    if (!circuitBreaker || !retryConfig) {
      throw new Error(`Service ${serviceName} not configured for recovery`);
    }

    // Check if recovery is already in progress
    if (this.activeRecoveries.has(serviceName)) {
      console.log(`⏳ Recovery already in progress for ${serviceName}, waiting...`);
      await this.activeRecoveries.get(serviceName);
    }

    const executeWithRetry = async (): Promise<T> => {
      let lastError: Error | undefined;
      
      for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
        try {
          // Add timeout to operation if specified
          const operationPromise = context?.timeout 
            ? Promise.race([
                operation(),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('Operation timeout')), context.timeout)
                )
              ])
            : operation();

          const result = await operationPromise;
          
          // Log successful recovery
          if (attempt > 1) {
            console.log(`✅ ${serviceName} recovered after ${attempt} attempts`);
            this.logRecoveryEvent(serviceName, attempt, 'success');
          }
          
          return result;

        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          console.warn(`⚠️ ${serviceName} attempt ${attempt}/${retryConfig.maxAttempts} failed:`, lastError.message);
          
          // Don't retry on certain errors
          if (this.isNonRetryableError(lastError)) {
            console.error(`❌ Non-retryable error for ${serviceName}:`, lastError.message);
            break;
          }

          // Calculate delay with jitter
          if (attempt < retryConfig.maxAttempts) {
            const baseDelay = Math.min(
              retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
              retryConfig.maxDelay
            );
            
            const delay = retryConfig.jitter 
              ? baseDelay * (0.5 + Math.random() * 0.5) 
              : baseDelay;
            
            console.log(`⏱️ Retrying ${serviceName} in ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All attempts failed
      this.logRecoveryEvent(serviceName, retryConfig.maxAttempts, 'failure', lastError?.message);
      throw lastError || new Error(`All ${retryConfig.maxAttempts} attempts failed for ${serviceName}`);
    };

    // Execute with circuit breaker protection unless skipped
    if (context?.skipCircuitBreaker) {
      return await executeWithRetry();
    } else {
      return await circuitBreaker.execute(executeWithRetry);
    }
  }

  private isNonRetryableError(error: Error): boolean {
    const nonRetryablePatterns = [
      'ENOTFOUND',      // DNS resolution failed
      'EACCES',         // Permission denied
      'EINVAL',         // Invalid argument
      '400',            // Bad Request
      '401',            // Unauthorized
      '403',            // Forbidden
      '404',            // Not Found
    ];

    return nonRetryablePatterns.some(pattern => 
      error.message.includes(pattern)
    );
  }

  async recoverService(serviceName: string): Promise<boolean> {
    // Prevent concurrent recovery attempts
    if (this.activeRecoveries.has(serviceName)) {
      console.log(`Recovery already in progress for ${serviceName}`);
      return await this.activeRecoveries.get(serviceName);
    }

    const recoveryPromise = this.performServiceRecovery(serviceName);
    this.activeRecoveries.set(serviceName, recoveryPromise);

    try {
      const result = await recoveryPromise;
      return result;
    } finally {
      this.activeRecoveries.delete(serviceName);
    }
  }

  private async performServiceRecovery(serviceName: string): Promise<boolean> {
    console.log(`🚀 Starting recovery for ${serviceName}`);

    // Step 1: Check current service health
    const healthCheck = await serviceHealthMonitor.checkServiceHealth(serviceName);
    if (healthCheck.success) {
      console.log(`✅ Service ${serviceName} is already healthy`);
      return true;
    }

    // Step 2: Attempt automated recovery based on service type
    const recoveryAttempted = await this.attemptAutomatedRecovery(serviceName);
    
    if (recoveryAttempted) {
      // Step 3: Wait for service to start up
      const isHealthy = await serviceHealthMonitor.waitForServiceStartup(serviceName, 60000);
      
      if (isHealthy) {
        console.log(`🎉 Successfully recovered ${serviceName}`);
        this.resetCircuitBreaker(serviceName);
        return true;
      }
    }

    // Step 4: Log failure and provide manual recovery instructions
    console.error(`❌ Failed to recover ${serviceName}, manual intervention required`);
    this.generateRecoveryInstructions(serviceName);
    return false;
  }

  private async attemptAutomatedRecovery(serviceName: string): Promise<boolean> {
    const recoveryStrategies: { [key: string]: () => Promise<boolean> } = {
      'redis': async () => {
        console.log('🔄 Attempting Redis recovery...');
        // In a real implementation, this would start Redis via Docker or process manager
        console.log('Would execute: docker start redis || docker run -d --name redis -p 6379:6379 redis:alpine');
        return false; // Simulated - would return true if command succeeded
      },
      
      'backend-api': async () => {
        console.log('🔄 Attempting backend API recovery...');
        // In a real implementation, this would restart the backend service
        console.log('Would execute: npm run dev:backend || pm2 restart backend-api');
        return false; // Simulated
      },
      
      'websocket-server': async () => {
        console.log('🔄 Attempting WebSocket server recovery...');
        // Usually same as backend-api in Socket.IO setup
        return await recoveryStrategies['backend-api']();
      }
    };

    const strategy = recoveryStrategies[serviceName];
    if (strategy) {
      return await strategy();
    }

    console.warn(`No automated recovery strategy for ${serviceName}`);
    return false;
  }

  private resetCircuitBreaker(serviceName: string): void {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      // Force circuit breaker to closed state
      (circuitBreaker as any).state = CircuitState.CLOSED;
      (circuitBreaker as any).failures = 0;
      console.log(`🔄 Reset circuit breaker for ${serviceName}`);
    }
  }

  private generateRecoveryInstructions(serviceName: string): void {
    const instructions: { [key: string]: string[] } = {
      'redis': [
        'Manual Redis recovery:',
        '1. Check if Redis is installed: redis-cli --version',
        '2. Start Redis: redis-server --port 6379',
        '3. OR use Docker: docker run -d --name redis -p 6379:6379 redis:alpine',
        '4. Verify: redis-cli ping'
      ],
      'backend-api': [
        'Manual Backend API recovery:',
        '1. Navigate to project root: cd /workspaces/agent-feed',
        '2. Check for backend code: ls backend/ || ls src/server/',
        '3. Install dependencies: npm install',
        '4. Start backend: npm run dev:backend || npm start',
        '5. Verify: curl http://localhost:3000/health'
      ]
    };

    const serviceInstructions = instructions[serviceName] || [
      `Manual recovery for ${serviceName}:`,
      '1. Check service logs for specific error messages',
      '2. Verify service configuration',
      '3. Restart the service manually',
      '4. Check firewall and network connectivity'
    ];

    console.log('📋 Recovery Instructions:');
    serviceInstructions.forEach(instruction => console.log(instruction));
  }

  private logRecoveryEvent(
    serviceName: string, 
    attempts: number, 
    outcome: 'success' | 'failure',
    errorMessage?: string
  ): void {
    const event = {
      timestamp: new Date().toISOString(),
      serviceName,
      attempts,
      outcome,
      errorMessage,
      circuitBreakerState: this.circuitBreakers.get(serviceName)?.getState()
    };

    // In a real implementation, this would be sent to logging/monitoring system
    console.log('📊 Recovery Event:', event);
  }

  // Get system-wide recovery status
  getRecoveryStatus(): any {
    const status = {
      timestamp: new Date().toISOString(),
      services: {} as any,
      activeRecoveries: Array.from(this.activeRecoveries.keys()),
      systemHealth: 'unknown' as 'healthy' | 'degraded' | 'unhealthy'
    };

    let healthyServices = 0;
    let totalServices = 0;

    this.circuitBreakers.forEach((circuitBreaker, serviceName) => {
      const serviceHealth = serviceHealthMonitor.getServiceStatus(serviceName);
      const cbMetrics = circuitBreaker.getMetrics();
      
      status.services[serviceName] = {
        health: serviceHealth?.status || 'unknown',
        circuitBreaker: cbMetrics,
        consecutiveFailures: serviceHealth?.consecutiveFailures || 0,
        lastCheck: serviceHealth?.lastCheck || null
      };

      totalServices++;
      if (serviceHealth?.status === 'healthy') {
        healthyServices++;
      }
    });

    // Determine overall system health
    const healthRatio = healthyServices / totalServices;
    if (healthRatio >= 0.8) {
      status.systemHealth = 'healthy';
    } else if (healthRatio >= 0.5) {
      status.systemHealth = 'degraded';
    } else {
      status.systemHealth = 'unhealthy';
    }

    return status;
  }

  // Export NLD training data
  exportNLDTrainingData(): any {
    return {
      timestamp: new Date().toISOString(),
      pattern_type: 'CONNECTION_RECOVERY',
      circuit_breakers: Array.from(this.circuitBreakers.entries()).map(([name, cb]) => ({
        service: name,
        metrics: cb.getMetrics()
      })),
      retry_configs: Array.from(this.retryConfigs.entries()),
      recovery_status: this.getRecoveryStatus(),
      health_monitor_data: serviceHealthMonitor.exportNLDData()
    };
  }
}

// Global recovery system instance
export const connectionRecoverySystem = new ConnectionRecoverySystem();

// Integration with existing WebSocket hook
export const createRecoveryWrapper = (serviceName: string) => {
  return {
    withRecovery: <T>(operation: () => Promise<T>, context?: any) => 
      connectionRecoverySystem.executeWithRecovery(serviceName, operation, context),
    
    recoverService: () => 
      connectionRecoverySystem.recoverService(serviceName),
    
    getStatus: () => 
      connectionRecoverySystem.getRecoveryStatus()
  };
};

// Auto-initialize in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).connectionRecoverySystem = connectionRecoverySystem;
  console.log('🛡️ Connection Recovery System initialized');
  console.log('Use window.connectionRecoverySystem for debugging');
}