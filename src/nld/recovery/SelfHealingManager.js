/**
 * Self-Healing Manager for Link Preview Service
 * Implements automated failure recovery and adaptive rate limiting
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

export class SelfHealingManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      dataPath: config.dataPath || '/workspaces/agent-feed/.claude-flow/nld',
      maxRetryAttempts: config.maxRetryAttempts || 3,
      baseRetryDelay: config.baseRetryDelay || 1000,
      maxRetryDelay: config.maxRetryDelay || 30000,
      circuitBreakerThreshold: config.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: config.circuitBreakerTimeout || 60000,
      adaptiveRateLimitWindow: config.adaptiveRateLimitWindow || 60000,
      ...config
    };

    // Circuit breakers per platform
    this.circuitBreakers = new Map();
    
    // Rate limiters per platform
    this.rateLimiters = new Map();
    
    // Recovery strategies
    this.recoveryStrategies = new Map();
    
    // Adaptive configurations
    this.adaptiveConfigs = new Map();
    
    // Health monitoring
    this.healthMetrics = {
      totalRecoveries: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      circuitBreakerTrips: 0,
      adaptiveAdjustments: 0
    };

    this.initialize();
  }

  async initialize() {
    try {
      await this.loadRecoveryStrategies();
      await this.setupDefaultCircuitBreakers();
      await this.setupDefaultRateLimiters();
      
      console.log('🔧 Self-Healing Manager initialized');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Self-Healing Manager initialization failed:', error);
      this.emit('error', error);
    }
  }

  /**
   * Attempt recovery from a failure
   */
  async attemptRecovery(failureData) {
    try {
      const platform = failureData.platform;
      const errorType = failureData.error.type;
      const recoveryId = this.generateRecoveryId();
      
      console.log(`🔄 Attempting recovery for ${platform} - ${errorType} (ID: ${recoveryId})`);
      
      // Check circuit breaker state
      const circuitBreaker = this.getCircuitBreaker(platform);
      if (circuitBreaker.state === 'OPEN') {
        console.log(`⚡ Circuit breaker OPEN for ${platform} - recovery blocked`);
        return this.createRecoveryResult(recoveryId, false, 'circuit-breaker-open', null);
      }

      // Get recovery strategy
      const strategy = this.getRecoveryStrategy(platform, errorType);
      if (!strategy) {
        console.log(`❌ No recovery strategy for ${platform} - ${errorType}`);
        return this.createRecoveryResult(recoveryId, false, 'no-strategy', null);
      }

      // Execute recovery
      const recoveryResult = await this.executeRecoveryStrategy(strategy, failureData);
      
      // Update metrics and circuit breaker
      this.updateRecoveryMetrics(recoveryResult.success);
      this.updateCircuitBreaker(platform, recoveryResult.success);
      
      // Adaptive learning
      this.updateAdaptiveConfig(platform, errorType, recoveryResult);
      
      this.emit('recoveryAttempt', {
        recoveryId,
        platform,
        errorType,
        strategy: strategy.name,
        success: recoveryResult.success,
        result: recoveryResult
      });

      return recoveryResult;
    } catch (error) {
      console.error('❌ Recovery attempt failed:', error);
      this.updateRecoveryMetrics(false);
      return this.createRecoveryResult(null, false, 'recovery-error', error.message);
    }
  }

  /**
   * Get or create circuit breaker for platform
   */
  getCircuitBreaker(platform) {
    if (!this.circuitBreakers.has(platform)) {
      this.circuitBreakers.set(platform, {
        state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
        failureCount: 0,
        lastFailureTime: null,
        nextRetryTime: null,
        threshold: this.config.circuitBreakerThreshold,
        timeout: this.config.circuitBreakerTimeout
      });
    }
    
    const breaker = this.circuitBreakers.get(platform);
    
    // Check if we should transition from OPEN to HALF_OPEN
    if (breaker.state === 'OPEN' && 
        breaker.nextRetryTime && 
        Date.now() > breaker.nextRetryTime) {
      breaker.state = 'HALF_OPEN';
      console.log(`⚡ Circuit breaker for ${platform} transitioned to HALF_OPEN`);
    }
    
    return breaker;
  }

  /**
   * Update circuit breaker state based on operation result
   */
  updateCircuitBreaker(platform, success) {
    const breaker = this.getCircuitBreaker(platform);
    
    if (success) {
      // Reset on success
      breaker.failureCount = 0;
      if (breaker.state === 'HALF_OPEN') {
        breaker.state = 'CLOSED';
        console.log(`⚡ Circuit breaker for ${platform} closed after successful recovery`);
      }
    } else {
      // Increment failure count
      breaker.failureCount++;
      breaker.lastFailureTime = Date.now();
      
      // Open circuit breaker if threshold exceeded
      if (breaker.failureCount >= breaker.threshold && breaker.state === 'CLOSED') {
        breaker.state = 'OPEN';
        breaker.nextRetryTime = Date.now() + breaker.timeout;
        this.healthMetrics.circuitBreakerTrips++;
        
        console.log(`⚡ Circuit breaker OPENED for ${platform} after ${breaker.failureCount} failures`);
        this.emit('circuitBreakerTripped', { platform, failureCount: breaker.failureCount });
      }
    }
  }

  /**
   * Get adaptive rate limiter for platform
   */
  getRateLimiter(platform) {
    if (!this.rateLimiters.has(platform)) {
      this.rateLimiters.set(platform, {
        requests: [],
        maxRequests: this.getInitialRateLimit(platform),
        windowMs: this.config.adaptiveRateLimitWindow,
        currentLevel: 'normal', // normal, reduced, minimal
        lastAdjustment: Date.now(),
        consecutiveFailures: 0
      });
    }
    
    return this.rateLimiters.get(platform);
  }

  /**
   * Check if request is allowed by rate limiter
   */
  isRequestAllowed(platform) {
    const limiter = this.getRateLimiter(platform);
    const now = Date.now();
    
    // Remove old requests outside the window
    limiter.requests = limiter.requests.filter(
      timestamp => now - timestamp < limiter.windowMs
    );
    
    // Check if under limit
    const allowed = limiter.requests.length < limiter.maxRequests;
    
    if (allowed) {
      limiter.requests.push(now);
    }
    
    return allowed;
  }

  /**
   * Adapt rate limits based on failure patterns
   */
  adaptRateLimit(platform, failureData) {
    const limiter = this.getRateLimiter(platform);
    const isRateLimitFailure = failureData.context.rateLimited || 
                              failureData.error.message?.includes('429') ||
                              failureData.error.message?.includes('rate limit');
    
    if (isRateLimitFailure) {
      limiter.consecutiveFailures++;
      
      // Reduce rate limits
      if (limiter.currentLevel === 'normal' && limiter.consecutiveFailures >= 2) {
        limiter.maxRequests = Math.ceil(limiter.maxRequests * 0.5);
        limiter.currentLevel = 'reduced';
        console.log(`📉 Reduced rate limit for ${platform} to ${limiter.maxRequests} req/min`);
      } else if (limiter.currentLevel === 'reduced' && limiter.consecutiveFailures >= 4) {
        limiter.maxRequests = Math.ceil(limiter.maxRequests * 0.3);
        limiter.currentLevel = 'minimal';
        console.log(`📉 Minimal rate limit for ${platform}: ${limiter.maxRequests} req/min`);
      }
      
      limiter.lastAdjustment = Date.now();
      this.healthMetrics.adaptiveAdjustments++;
      
      this.emit('rateLimitAdjusted', {
        platform,
        newLimit: limiter.maxRequests,
        level: limiter.currentLevel,
        reason: 'rate-limit-failure'
      });
    } else {
      // Gradual recovery of rate limits
      limiter.consecutiveFailures = Math.max(0, limiter.consecutiveFailures - 1);
      this.considerRateLimitRecovery(platform);
    }
  }

  /**
   * Consider gradually increasing rate limits after successful requests
   */
  considerRateLimitRecovery(platform) {
    const limiter = this.getRateLimiter(platform);
    const timeSinceLastAdjustment = Date.now() - limiter.lastAdjustment;
    const recoveryInterval = 5 * 60 * 1000; // 5 minutes
    
    if (timeSinceLastAdjustment > recoveryInterval && 
        limiter.consecutiveFailures === 0 && 
        limiter.currentLevel !== 'normal') {
      
      const originalLimit = this.getInitialRateLimit(platform);
      
      if (limiter.currentLevel === 'minimal') {
        limiter.maxRequests = Math.min(limiter.maxRequests * 2, originalLimit * 0.5);
        limiter.currentLevel = 'reduced';
        console.log(`📈 Increased rate limit for ${platform} to ${limiter.maxRequests} req/min (reduced)`);
      } else if (limiter.currentLevel === 'reduced') {
        limiter.maxRequests = Math.min(limiter.maxRequests * 1.5, originalLimit);
        if (limiter.maxRequests >= originalLimit) {
          limiter.currentLevel = 'normal';
          console.log(`📈 Restored normal rate limit for ${platform}: ${limiter.maxRequests} req/min`);
        } else {
          console.log(`📈 Increased rate limit for ${platform} to ${limiter.maxRequests} req/min (reduced)`);
        }
      }
      
      limiter.lastAdjustment = Date.now();
      
      this.emit('rateLimitRecovered', {
        platform,
        newLimit: limiter.maxRequests,
        level: limiter.currentLevel
      });
    }
  }

  /**
   * Get recovery strategy for platform and error type
   */
  getRecoveryStrategy(platform, errorType) {
    const key = `${platform}-${errorType}`;
    let strategy = this.recoveryStrategies.get(key);
    
    if (!strategy) {
      // Try platform-wide strategy
      strategy = this.recoveryStrategies.get(platform);
    }
    
    if (!strategy) {
      // Try error-type strategy
      strategy = this.recoveryStrategies.get(errorType);
    }
    
    if (!strategy) {
      // Default strategy
      strategy = this.recoveryStrategies.get('default');
    }
    
    return strategy;
  }

  /**
   * Execute recovery strategy
   */
  async executeRecoveryStrategy(strategy, failureData) {
    const startTime = Date.now();
    
    try {
      let result = null;
      
      switch (strategy.type) {
        case 'retry-with-backoff':
          result = await this.retryWithBackoff(strategy, failureData);
          break;
          
        case 'alternative-endpoint':
          result = await this.tryAlternativeEndpoint(strategy, failureData);
          break;
          
        case 'fallback-method':
          result = await this.useFallbackMethod(strategy, failureData);
          break;
          
        case 'wait-and-retry':
          result = await this.waitAndRetry(strategy, failureData);
          break;
          
        case 'proxy-rotation':
          result = await this.rotateProxy(strategy, failureData);
          break;
          
        default:
          throw new Error(`Unknown recovery strategy: ${strategy.type}`);
      }
      
      const duration = Date.now() - startTime;
      
      return {
        success: result.success,
        strategy: strategy.name,
        duration,
        result: result.data,
        attempts: result.attempts || 1,
        error: result.error || null
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        strategy: strategy.name,
        duration,
        result: null,
        attempts: 1,
        error: error.message
      };
    }
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff(strategy, failureData) {
    let attempts = 0;
    let delay = this.config.baseRetryDelay;
    
    while (attempts < strategy.maxAttempts) {
      attempts++;
      
      if (attempts > 1) {
        console.log(`⏳ Waiting ${delay}ms before retry attempt ${attempts}`);
        await this.sleep(delay);
        delay = Math.min(delay * 2, this.config.maxRetryDelay);
      }
      
      try {
        // Simulate retry request (in real implementation, would call the actual service)
        const result = await this.simulateRequest(failureData.url, {
          attempt: attempts,
          strategy: 'retry'
        });
        
        return { success: true, data: result, attempts };
        
      } catch (error) {
        console.log(`🔄 Retry attempt ${attempts} failed: ${error.message}`);
        
        if (attempts >= strategy.maxAttempts) {
          return { success: false, error: error.message, attempts };
        }
      }
    }
  }

  /**
   * Try alternative endpoint
   */
  async tryAlternativeEndpoint(strategy, failureData) {
    for (const endpoint of strategy.endpoints) {
      try {
        console.log(`🔄 Trying alternative endpoint: ${endpoint.name}`);
        
        const result = await this.simulateRequest(failureData.url, {
          endpoint: endpoint.url,
          strategy: 'alternative'
        });
        
        return { success: true, data: result, attempts: 1 };
        
      } catch (error) {
        console.log(`❌ Alternative endpoint failed: ${error.message}`);
        continue;
      }
    }
    
    return { success: false, error: 'All alternative endpoints failed', attempts: strategy.endpoints.length };
  }

  /**
   * Use fallback extraction method
   */
  async useFallbackMethod(strategy, failureData) {
    try {
      console.log(`🔄 Using fallback method: ${strategy.fallbackMethod}`);
      
      const result = await this.simulateRequest(failureData.url, {
        method: strategy.fallbackMethod,
        strategy: 'fallback'
      });
      
      return { success: true, data: result, attempts: 1 };
      
    } catch (error) {
      return { success: false, error: error.message, attempts: 1 };
    }
  }

  /**
   * Wait and retry after delay
   */
  async waitAndRetry(strategy, failureData) {
    console.log(`⏳ Waiting ${strategy.waitTime}ms before retry`);
    await this.sleep(strategy.waitTime);
    
    return this.retryWithBackoff({ maxAttempts: 1 }, failureData);
  }

  /**
   * Rotate proxy/user agent
   */
  async rotateProxy(strategy, failureData) {
    try {
      console.log(`🔄 Rotating to different proxy/user agent`);
      
      const result = await this.simulateRequest(failureData.url, {
        proxy: strategy.nextProxy,
        userAgent: strategy.nextUserAgent,
        strategy: 'proxy-rotation'
      });
      
      return { success: true, data: result, attempts: 1 };
      
    } catch (error) {
      return { success: false, error: error.message, attempts: 1 };
    }
  }

  /**
   * Update adaptive configuration based on recovery results
   */
  updateAdaptiveConfig(platform, errorType, recoveryResult) {
    const key = `${platform}-${errorType}`;
    const config = this.adaptiveConfigs.get(key) || {
      successfulStrategies: new Map(),
      failedStrategies: new Map(),
      bestStrategy: null,
      lastUpdate: Date.now()
    };
    
    const strategyName = recoveryResult.strategy;
    
    if (recoveryResult.success) {
      const current = config.successfulStrategies.get(strategyName) || 0;
      config.successfulStrategies.set(strategyName, current + 1);
    } else {
      const current = config.failedStrategies.get(strategyName) || 0;
      config.failedStrategies.set(strategyName, current + 1);
    }
    
    // Determine best strategy
    let bestStrategy = null;
    let bestScore = 0;
    
    for (const [strategy, successes] of config.successfulStrategies) {
      const failures = config.failedStrategies.get(strategy) || 0;
      const total = successes + failures;
      const successRate = total > 0 ? successes / total : 0;
      
      if (successRate > bestScore && total >= 2) {
        bestScore = successRate;
        bestStrategy = strategy;
      }
    }
    
    config.bestStrategy = bestStrategy;
    config.lastUpdate = Date.now();
    
    this.adaptiveConfigs.set(key, config);
    
    console.log(`🧠 Updated adaptive config for ${key}: best strategy = ${bestStrategy} (${bestScore.toFixed(2)} success rate)`);
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const circuitBreakers = Array.from(this.circuitBreakers.entries()).map(([platform, breaker]) => ({
      platform,
      state: breaker.state,
      failureCount: breaker.failureCount,
      isHealthy: breaker.state === 'CLOSED'
    }));
    
    const rateLimiters = Array.from(this.rateLimiters.entries()).map(([platform, limiter]) => ({
      platform,
      currentLevel: limiter.currentLevel,
      maxRequests: limiter.maxRequests,
      currentRequests: limiter.requests.length,
      isThrottled: limiter.currentLevel !== 'normal'
    }));
    
    return {
      overall: this.calculateOverallHealth(),
      metrics: this.healthMetrics,
      circuitBreakers,
      rateLimiters,
      adaptiveConfigs: Array.from(this.adaptiveConfigs.keys()),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Export healing data for neural training
   */
  async exportHealingData() {
    const exportData = {
      metadata: {
        exportTimestamp: new Date().toISOString(),
        totalRecoveries: this.healthMetrics.totalRecoveries
      },
      circuitBreakers: Array.from(this.circuitBreakers.entries()),
      rateLimiters: Array.from(this.rateLimiters.entries()),
      adaptiveConfigs: Array.from(this.adaptiveConfigs.entries()),
      healthMetrics: this.healthMetrics,
      recoveryStrategies: Array.from(this.recoveryStrategies.entries())
    };
    
    const exportPath = path.join(
      this.config.dataPath,
      'exports',
      `healing-data-${Date.now()}.json`
    );
    
    await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
    return exportPath;
  }

  // Utility methods
  async loadRecoveryStrategies() {
    // Default recovery strategies
    this.recoveryStrategies.set('default', {
      name: 'Default Retry',
      type: 'retry-with-backoff',
      maxAttempts: 3
    });
    
    this.recoveryStrategies.set('youtube.com-rate-limit', {
      name: 'YouTube Rate Limit Recovery',
      type: 'wait-and-retry',
      waitTime: 30000
    });
    
    this.recoveryStrategies.set('network', {
      name: 'Network Error Recovery',
      type: 'retry-with-backoff',
      maxAttempts: 5
    });
    
    this.recoveryStrategies.set('timeout', {
      name: 'Timeout Recovery',
      type: 'retry-with-backoff',
      maxAttempts: 3
    });
    
    this.recoveryStrategies.set('auth', {
      name: 'Authentication Recovery',
      type: 'alternative-endpoint',
      endpoints: [
        { name: 'Fallback API', url: 'fallback-api-endpoint' }
      ]
    });
  }

  async setupDefaultCircuitBreakers() {
    const platforms = ['youtube.com', 'twitter.com', 'facebook.com', 'instagram.com'];
    platforms.forEach(platform => {
      this.getCircuitBreaker(platform); // Initialize with defaults
    });
  }

  async setupDefaultRateLimiters() {
    const platforms = ['youtube.com', 'twitter.com', 'facebook.com', 'instagram.com'];
    platforms.forEach(platform => {
      this.getRateLimiter(platform); // Initialize with defaults
    });
  }

  getInitialRateLimit(platform) {
    const limits = {
      'youtube.com': 60,
      'twitter.com': 30,
      'facebook.com': 20,
      'instagram.com': 20,
      'default': 40
    };
    return limits[platform] || limits['default'];
  }

  generateRecoveryId() {
    return `recovery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  createRecoveryResult(id, success, reason, error) {
    return {
      recoveryId: id,
      success,
      reason,
      error,
      timestamp: new Date().toISOString()
    };
  }

  updateRecoveryMetrics(success) {
    this.healthMetrics.totalRecoveries++;
    if (success) {
      this.healthMetrics.successfulRecoveries++;
    } else {
      this.healthMetrics.failedRecoveries++;
    }
  }

  calculateOverallHealth() {
    const openBreakers = Array.from(this.circuitBreakers.values())
      .filter(breaker => breaker.state === 'OPEN').length;
    const throttledLimiters = Array.from(this.rateLimiters.values())
      .filter(limiter => limiter.currentLevel !== 'normal').length;
    
    if (openBreakers === 0 && throttledLimiters === 0) return 'healthy';
    if (openBreakers <= 1 && throttledLimiters <= 2) return 'degraded';
    return 'unhealthy';
  }

  async simulateRequest(url, options) {
    // Simulate request - in real implementation would call actual service
    await this.sleep(Math.random() * 1000);
    
    if (Math.random() < 0.7) { // 70% success rate
      return {
        title: 'Recovered Preview',
        description: 'Successfully recovered using strategy: ' + options.strategy,
        image: 'recovered-image-url'
      };
    } else {
      throw new Error('Simulated recovery failure');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default SelfHealingManager;