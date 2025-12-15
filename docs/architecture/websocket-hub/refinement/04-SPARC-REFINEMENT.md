# WebSocket Hub Architecture - SPARC Refinement

## Phase 4: Performance Optimization and Error Handling

This document details performance optimizations, error handling strategies, monitoring systems, and security hardening measures for the WebSocket Hub architecture.

## 4.1 Performance Optimization Strategies

### 4.1.1 Connection Pool Management
```typescript
class ConnectionPoolManager {
  private pools: Map<string, ConnectionPool> = new Map();
  private poolConfig: PoolConfiguration;

  constructor(config: PoolConfiguration) {
    this.poolConfig = {
      minConnections: config.minConnections || 5,
      maxConnections: config.maxConnections || 100,
      acquireTimeout: config.acquireTimeout || 30000,
      idleTimeout: config.idleTimeout || 300000,
      ...config
    };
  }

  async optimizePool(instanceId: string): Promise<void> {
    const pool = this.pools.get(instanceId);
    if (!pool) return;

    const metrics = await this.getPoolMetrics(instanceId);
    
    // Dynamic pool sizing based on load
    if (metrics.utilizationRate > 0.8) {
      await this.expandPool(instanceId, Math.min(
        pool.maxSize * 1.2,
        this.poolConfig.maxConnections
      ));
    } else if (metrics.utilizationRate < 0.3) {
      await this.shrinkPool(instanceId, Math.max(
        pool.size * 0.8,
        this.poolConfig.minConnections
      ));
    }

    // Connection health maintenance
    await this.validateConnections(instanceId);
    await this.replaceStaleConnections(instanceId);
  }

  private async validateConnections(instanceId: string): Promise<void> {
    const pool = this.pools.get(instanceId);
    if (!pool) return;

    const healthChecks = pool.connections.map(async (conn) => {
      try {
        const startTime = performance.now();
        await conn.ping();
        const latency = performance.now() - startTime;
        
        if (latency > this.poolConfig.maxLatency) {
          await this.replaceConnection(instanceId, conn);
        }
      } catch (error) {
        await this.replaceConnection(instanceId, conn);
      }
    });

    await Promise.all(healthChecks);
  }
}
```

### 4.1.2 Message Batching and Compression
```typescript
class MessageOptimizer {
  private batchConfig: BatchConfiguration;
  private compressionThreshold: number = 1024; // bytes

  constructor(config: BatchConfiguration) {
    this.batchConfig = config;
  }

  async optimizeMessage(message: Message): Promise<OptimizedMessage> {
    let optimized = message;

    // Apply compression for large messages
    if (this.calculateMessageSize(message) > this.compressionThreshold) {
      optimized = await this.compressMessage(optimized);
    }

    // Apply binary encoding for structured data
    if (message.type === 'structured_data') {
      optimized = await this.binaryEncodeMessage(optimized);
    }

    // Add caching headers for repeated content
    if (this.isRepeatableContent(message)) {
      optimized.headers = {
        ...optimized.headers,
        'Cache-Control': 'max-age=300',
        'ETag': this.generateETag(message.content)
      };
    }

    return optimized;
  }

  async batchMessages(messages: Message[]): Promise<BatchedMessage[]> {
    const batches: BatchedMessage[] = [];
    let currentBatch: Message[] = [];
    let currentBatchSize = 0;

    for (const message of messages) {
      const messageSize = this.calculateMessageSize(message);
      
      // Check if adding this message would exceed batch limits
      if (currentBatch.length >= this.batchConfig.maxBatchSize ||
          currentBatchSize + messageSize > this.batchConfig.maxBatchBytes) {
        
        if (currentBatch.length > 0) {
          batches.push(await this.createBatch(currentBatch));
          currentBatch = [];
          currentBatchSize = 0;
        }
      }

      currentBatch.push(message);
      currentBatchSize += messageSize;
    }

    // Handle remaining messages
    if (currentBatch.length > 0) {
      batches.push(await this.createBatch(currentBatch));
    }

    return batches;
  }

  private async compressMessage(message: Message): Promise<Message> {
    const compressed = await gzip(JSON.stringify(message.payload));
    return {
      ...message,
      payload: compressed,
      headers: {
        ...message.headers,
        'Content-Encoding': 'gzip',
        'Original-Size': JSON.stringify(message.payload).length.toString()
      }
    };
  }
}
```

### 4.1.3 Caching Strategy Implementation
```typescript
class IntelligentCacheManager {
  private l1Cache: Map<string, CacheEntry> = new Map(); // Memory
  private l2Cache: RedisClient; // Redis
  private l3Cache: DatabaseClient; // Persistent storage
  
  private cacheStrategy: CacheStrategy;

  constructor(strategy: CacheStrategy, redis: RedisClient, db: DatabaseClient) {
    this.cacheStrategy = strategy;
    this.l2Cache = redis;
    this.l3Cache = db;
  }

  async get(key: string, context: CacheContext): Promise<any> {
    // L1 Cache (Memory) - Fastest
    const l1Entry = this.l1Cache.get(key);
    if (l1Entry && !this.isExpired(l1Entry)) {
      this.updateAccessMetrics(key, 'l1-hit');
      return l1Entry.value;
    }

    // L2 Cache (Redis) - Fast
    const l2Value = await this.l2Cache.get(key);
    if (l2Value) {
      const entry = JSON.parse(l2Value);
      if (!this.isExpired(entry)) {
        // Promote to L1 cache
        this.l1Cache.set(key, entry);
        this.updateAccessMetrics(key, 'l2-hit');
        return entry.value;
      }
    }

    // L3 Cache (Database) - Persistent
    const l3Entry = await this.l3Cache.getCacheEntry(key);
    if (l3Entry && !this.isExpired(l3Entry)) {
      // Promote to higher cache levels
      await this.l2Cache.setex(key, this.cacheStrategy.l2TTL, JSON.stringify(l3Entry));
      this.l1Cache.set(key, l3Entry);
      this.updateAccessMetrics(key, 'l3-hit');
      return l3Entry.value;
    }

    // Cache miss
    this.updateAccessMetrics(key, 'miss');
    return null;
  }

  async set(key: string, value: any, context: CacheContext): Promise<void> {
    const entry: CacheEntry = {
      key,
      value,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.calculateTTL(context)),
      accessCount: 0,
      lastAccessed: new Date(),
      metadata: context.metadata || {}
    };

    // Determine cache levels based on access pattern prediction
    const prediction = await this.predictAccessPattern(key, context);
    
    // Always cache in L1 for immediate access
    this.l1Cache.set(key, entry);

    // Cache in L2 based on prediction
    if (prediction.expectedFrequency > this.cacheStrategy.l2Threshold) {
      await this.l2Cache.setex(
        key, 
        this.cacheStrategy.l2TTL, 
        JSON.stringify(entry)
      );
    }

    // Cache in L3 for persistent storage
    if (prediction.persistenceValue > this.cacheStrategy.l3Threshold) {
      await this.l3Cache.setCacheEntry(key, entry);
    }
  }

  private async predictAccessPattern(key: string, context: CacheContext): Promise<AccessPrediction> {
    const historicalData = await this.getAccessHistory(key);
    const keyPattern = this.analyzeKeyPattern(key);
    const contextFactors = this.analyzeContext(context);

    return {
      expectedFrequency: this.calculateExpectedFrequency(historicalData, keyPattern),
      persistenceValue: this.calculatePersistenceValue(contextFactors),
      recommendedLevels: this.recommendCacheLevels(historicalData, keyPattern, contextFactors)
    };
  }
}
```

## 4.2 Advanced Error Handling and Recovery

### 4.2.1 Circuit Breaker with Adaptive Thresholds
```typescript
class AdaptiveCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  private config: CircuitBreakerConfig;
  
  // Adaptive thresholds based on historical data
  private adaptiveThresholds: AdaptiveThresholds;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
    this.adaptiveThresholds = {
      failureThreshold: config.initialFailureThreshold,
      timeoutThreshold: config.initialTimeoutThreshold,
      recoveryThreshold: config.initialRecoveryThreshold
    };
  }

  async execute<T>(operation: () => Promise<T>, context: OperationContext): Promise<T> {
    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptRecovery()) {
        this.state = CircuitState.HALF_OPEN;
        logger.info('Circuit breaker transitioning to HALF_OPEN');
      } else {
        throw new CircuitBreakerError('Circuit breaker is OPEN');
      }
    }

    const startTime = performance.now();
    
    try {
      const result = await Promise.race([
        operation(),
        this.createTimeoutPromise(context.timeout || this.config.defaultTimeout)
      ]);
      
      const executionTime = performance.now() - startTime;
      await this.onSuccess(executionTime, context);
      
      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      await this.onFailure(error, executionTime, context);
      throw error;
    }
  }

  private async onSuccess(executionTime: number, context: OperationContext): Promise<void> {
    this.successCount++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successCount >= this.adaptiveThresholds.recoveryThreshold) {
        this.state = CircuitState.CLOSED;
        this.resetCounters();
        logger.info('Circuit breaker closed after successful recovery');
      }
    }

    // Adaptive threshold adjustment
    await this.adjustThresholds(true, executionTime, context);
  }

  private async onFailure(error: Error, executionTime: number, context: OperationContext): Promise<void> {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
      logger.warn('Circuit breaker opened from HALF_OPEN state');
    } else if (this.failureCount >= this.adaptiveThresholds.failureThreshold) {
      this.state = CircuitState.OPEN;
      logger.warn(`Circuit breaker opened after ${this.failureCount} failures`);
    }

    // Adaptive threshold adjustment
    await this.adjustThresholds(false, executionTime, context);
    
    // Record failure metrics
    this.recordFailureMetrics(error, executionTime, context);
  }

  private async adjustThresholds(success: boolean, executionTime: number, context: OperationContext): Promise<void> {
    const recentMetrics = await this.getRecentMetrics();
    const errorRate = recentMetrics.errors / recentMetrics.total;
    const avgResponseTime = recentMetrics.totalResponseTime / recentMetrics.total;

    // Adjust failure threshold based on error rate trends
    if (errorRate > 0.1) { // High error rate
      this.adaptiveThresholds.failureThreshold = Math.max(
        this.config.minFailureThreshold,
        this.adaptiveThresholds.failureThreshold * 0.8
      );
    } else if (errorRate < 0.01) { // Low error rate
      this.adaptiveThresholds.failureThreshold = Math.min(
        this.config.maxFailureThreshold,
        this.adaptiveThresholds.failureThreshold * 1.2
      );
    }

    // Adjust timeout threshold based on response times
    if (avgResponseTime > this.adaptiveThresholds.timeoutThreshold * 0.8) {
      this.adaptiveThresholds.timeoutThreshold = Math.min(
        this.config.maxTimeoutThreshold,
        avgResponseTime * 1.5
      );
    }
  }
}
```

### 4.2.2 Retry Strategy with Exponential Backoff
```typescript
class IntelligentRetryManager {
  private retryStrategies: Map<string, RetryStrategy> = new Map();

  constructor() {
    this.initializeStrategies();
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>, 
    context: RetryContext
  ): Promise<T> {
    const strategy = this.selectRetryStrategy(context);
    let lastError: Error;
    
    for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Success - update strategy performance metrics
        this.updateStrategyMetrics(context.operationType, true, attempt);
        return result;
        
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error, context)) {
          throw error;
        }
        
        // Check if we've reached max attempts
        if (attempt >= strategy.maxAttempts) {
          break;
        }
        
        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, strategy, context);
        
        logger.warn(`Retry attempt ${attempt}/${strategy.maxAttempts} failed, retrying in ${delay}ms`, {
          operationType: context.operationType,
          error: error.message,
          attempt
        });
        
        // Wait before retrying
        await this.sleep(delay);
      }
    }
    
    // All retries exhausted
    this.updateStrategyMetrics(context.operationType, false, strategy.maxAttempts);
    throw new RetryExhaustedError(
      `Operation failed after ${strategy.maxAttempts} attempts`, 
      lastError
    );
  }

  private selectRetryStrategy(context: RetryContext): RetryStrategy {
    // Select strategy based on operation type and historical performance
    const baseStrategy = this.retryStrategies.get(context.operationType) || 
                        this.retryStrategies.get('default')!;
    
    // Adjust strategy based on current conditions
    const performance = this.getStrategyPerformance(context.operationType);
    
    if (performance.successRate < 0.5) {
      // Poor performance - be more aggressive
      return {
        ...baseStrategy,
        maxAttempts: Math.min(baseStrategy.maxAttempts * 1.5, 10),
        baseDelay: baseStrategy.baseDelay * 0.5,
        maxDelay: baseStrategy.maxDelay * 2
      };
    } else if (performance.successRate > 0.9) {
      // Good performance - be more conservative
      return {
        ...baseStrategy,
        maxAttempts: Math.max(baseStrategy.maxAttempts * 0.7, 2),
        baseDelay: baseStrategy.baseDelay * 1.5
      };
    }
    
    return baseStrategy;
  }

  private calculateDelay(attempt: number, strategy: RetryStrategy, context: RetryContext): number {
    let delay: number;
    
    switch (strategy.backoffType) {
      case BackoffType.EXPONENTIAL:
        delay = strategy.baseDelay * Math.pow(2, attempt - 1);
        break;
        
      case BackoffType.LINEAR:
        delay = strategy.baseDelay * attempt;
        break;
        
      case BackoffType.FIXED:
        delay = strategy.baseDelay;
        break;
        
      case BackoffType.FIBONACCI:
        delay = strategy.baseDelay * this.fibonacci(attempt);
        break;
        
      default:
        delay = strategy.baseDelay;
    }
    
    // Add jitter to prevent thundering herd
    if (strategy.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * jitterAmount * 2;
    }
    
    // Respect max delay
    delay = Math.min(delay, strategy.maxDelay);
    
    // Apply circuit breaker influence
    if (context.circuitBreakerState === CircuitState.HALF_OPEN) {
      delay *= 2; // Be more cautious when circuit breaker is recovering
    }
    
    return Math.floor(delay);
  }
}
```

## 4.3 Real-Time Monitoring and Alerting

### 4.3.1 Comprehensive Metrics Collection
```typescript
class MetricsCollector {
  private metrics: Map<string, MetricData> = new Map();
  private collectors: MetricCollector[] = [];
  private alertRules: AlertRule[] = [];

  constructor() {
    this.initializeCollectors();
    this.setupPeriodicCollection();
  }

  collectSystemMetrics(): SystemMetrics {
    return {
      timestamp: Date.now(),
      
      // Performance Metrics
      performance: {
        messageLatency: this.calculatePercentiles('message_latency'),
        throughput: this.calculateRate('messages_processed'),
        errorRate: this.calculateErrorRate(),
        connectionCount: this.getActiveConnections(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: this.getCPUUsage()
      },
      
      // Hub Metrics
      hub: {
        activeConnections: this.getActiveConnections(),
        messageQueueDepth: this.getQueueDepth(),
        circuitBreakerStates: this.getCircuitBreakerStates(),
        instanceHealth: this.getInstanceHealthSummary()
      },
      
      // Security Metrics
      security: {
        authenticationAttempts: this.getAuthAttempts(),
        authenticationFailures: this.getAuthFailures(),
        channelViolations: this.getChannelViolations(),
        suspiciousActivity: this.getSuspiciousActivity()
      },
      
      // Business Metrics
      business: {
        productionMessages: this.getProductionMessageCount(),
        developmentMessages: this.getDevelopmentMessageCount(),
        userSessions: this.getActiveUserSessions(),
        peakConcurrency: this.getPeakConcurrency()
      }
    };
  }

  private calculatePercentiles(metricName: string): Percentiles {
    const data = this.getMetricData(metricName);
    const sorted = data.values.sort((a, b) => a - b);
    
    return {
      p50: this.percentile(sorted, 50),
      p90: this.percentile(sorted, 90),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      p999: this.percentile(sorted, 99.9)
    };
  }

  async checkAlertRules(): Promise<AlertEvent[]> {
    const currentMetrics = this.collectSystemMetrics();
    const alerts: AlertEvent[] = [];
    
    for (const rule of this.alertRules) {
      try {
        const violation = await this.evaluateAlertRule(rule, currentMetrics);
        if (violation) {
          alerts.push({
            ruleId: rule.id,
            severity: rule.severity,
            message: rule.message,
            timestamp: Date.now(),
            metrics: violation.triggeringMetrics,
            context: violation.context
          });
        }
      } catch (error) {
        logger.error('Error evaluating alert rule', { rule: rule.id, error });
      }
    }
    
    return alerts;
  }

  private async evaluateAlertRule(rule: AlertRule, metrics: SystemMetrics): Promise<AlertViolation | null> {
    const value = this.extractMetricValue(metrics, rule.metricPath);
    
    if (this.evaluateCondition(value, rule.condition)) {
      // Check if this is a sustained violation
      const violationHistory = await this.getViolationHistory(rule.id);
      const sustainedViolation = this.checkSustainedViolation(violationHistory, rule.sustainedDuration);
      
      if (sustainedViolation || rule.severity === AlertSeverity.CRITICAL) {
        return {
          ruleId: rule.id,
          triggeringMetrics: { [rule.metricPath]: value },
          context: {
            historicalData: violationHistory,
            sustainedDuration: sustainedViolation ? this.calculateSustainedDuration(violationHistory) : 0
          }
        };
      }
    }
    
    return null;
  }
}
```

### 4.3.2 Predictive Alert System
```typescript
class PredictiveAlertSystem {
  private models: Map<string, PredictionModel> = new Map();
  private historicalData: Map<string, TimeSeriesData> = new Map();

  constructor() {
    this.initializePredictionModels();
  }

  async analyzeTrends(metricName: string): Promise<TrendAnalysis> {
    const data = this.historicalData.get(metricName);
    if (!data || data.points.length < 100) {
      return { trend: 'insufficient_data', confidence: 0 };
    }

    const model = this.models.get(metricName);
    if (!model) {
      return { trend: 'no_model', confidence: 0 };
    }

    // Perform trend analysis
    const recentData = data.points.slice(-50); // Last 50 data points
    const prediction = await model.predict(recentData);
    
    return {
      trend: this.classifyTrend(prediction),
      confidence: prediction.confidence,
      prediction: prediction.value,
      timeHorizon: prediction.timeHorizon,
      factors: prediction.contributingFactors
    };
  }

  async generatePredictiveAlerts(): Promise<PredictiveAlert[]> {
    const alerts: PredictiveAlert[] = [];
    
    for (const [metricName, model] of this.models) {
      try {
        const analysis = await this.analyzeTrends(metricName);
        
        if (analysis.confidence > 0.7) {
          const riskLevel = this.assessRiskLevel(analysis, metricName);
          
          if (riskLevel >= RiskLevel.MEDIUM) {
            alerts.push({
              type: 'predictive',
              metricName,
              currentTrend: analysis.trend,
              confidence: analysis.confidence,
              riskLevel,
              estimatedTimeToThreshold: this.estimateTimeToThreshold(analysis),
              recommendedActions: this.generateRecommendations(analysis, metricName)
            });
          }
        }
      } catch (error) {
        logger.error('Error generating predictive alert', { metricName, error });
      }
    }
    
    return alerts;
  }

  private generateRecommendations(analysis: TrendAnalysis, metricName: string): RecommendedAction[] {
    const recommendations: RecommendedAction[] = [];
    
    switch (metricName) {
      case 'memory_usage':
        if (analysis.trend === 'increasing') {
          recommendations.push({
            action: 'scale_up',
            priority: Priority.HIGH,
            description: 'Consider increasing memory allocation or adding more instances'
          });
        }
        break;
        
      case 'error_rate':
        if (analysis.trend === 'increasing') {
          recommendations.push({
            action: 'investigate_errors',
            priority: Priority.CRITICAL,
            description: 'Investigate root cause of increasing error rate'
          });
        }
        break;
        
      case 'connection_count':
        if (analysis.trend === 'rapidly_increasing') {
          recommendations.push({
            action: 'prepare_scaling',
            priority: Priority.MEDIUM,
            description: 'Prepare for auto-scaling or manual intervention'
          });
        }
        break;
    }
    
    return recommendations;
  }
}
```

## 4.4 Security Hardening Measures

### 4.4.1 Advanced Authentication System
```typescript
class AdvancedAuthenticationSystem {
  private tokenValidator: JWTValidator;
  private mfaValidator: MFAValidator;
  private riskAnalyzer: SecurityRiskAnalyzer;
  private behaviorAnalyzer: BehaviorAnalyzer;

  async authenticateConnection(request: AuthenticationRequest): Promise<AuthenticationResult> {
    // Step 1: Basic token validation
    const tokenValidation = await this.tokenValidator.validate(request.token);
    if (!tokenValidation.valid) {
      await this.logSecurityEvent('token_validation_failed', request);
      return { success: false, reason: 'invalid_token' };
    }

    // Step 2: Risk assessment
    const riskAssessment = await this.riskAnalyzer.assessRisk(request, tokenValidation.user);
    
    if (riskAssessment.level >= RiskLevel.HIGH) {
      // Require additional authentication
      return await this.handleHighRiskAuthentication(request, riskAssessment);
    }

    // Step 3: Behavioral analysis
    const behaviorAnalysis = await this.behaviorAnalyzer.analyze(
      tokenValidation.user.id, 
      request
    );
    
    if (behaviorAnalysis.anomalyDetected) {
      return await this.handleAnomalousAuthentication(request, behaviorAnalysis);
    }

    // Step 4: Channel-specific validation
    const channelValidation = await this.validateChannelAccess(
      tokenValidation.user, 
      request.targetChannel
    );
    
    if (!channelValidation.allowed) {
      await this.logSecurityEvent('channel_access_denied', request);
      return { 
        success: false, 
        reason: 'channel_access_denied',
        details: channelValidation.reason
      };
    }

    // Success - create secure session
    const session = await this.createSecureSession(tokenValidation.user, request);
    
    return {
      success: true,
      session,
      securityContext: {
        riskLevel: riskAssessment.level,
        requiresMFA: false,
        sessionTimeout: this.calculateSessionTimeout(riskAssessment.level)
      }
    };
  }

  private async handleHighRiskAuthentication(
    request: AuthenticationRequest,
    riskAssessment: RiskAssessment
  ): Promise<AuthenticationResult> {
    // Always require MFA for high-risk scenarios
    const mfaResult = await this.mfaValidator.validateMFA(request.mfaToken);
    
    if (!mfaResult.valid) {
      await this.logSecurityEvent('mfa_validation_failed', request);
      return { success: false, reason: 'mfa_required' };
    }

    // Additional security measures for high-risk
    if (riskAssessment.level === RiskLevel.CRITICAL) {
      // Require admin approval or additional verification
      return await this.requireAdminApproval(request, riskAssessment);
    }

    // Create limited-privilege session
    const session = await this.createLimitedSession(request, riskAssessment);
    
    return {
      success: true,
      session,
      securityContext: {
        riskLevel: riskAssessment.level,
        requiresMFA: true,
        sessionTimeout: 3600000, // 1 hour for high-risk
        restrictions: riskAssessment.recommendedRestrictions
      }
    };
  }
}
```

### 4.4.2 Message Encryption and Integrity
```typescript
class MessageSecurityManager {
  private encryptionKey: Buffer;
  private signingKey: Buffer;
  private keyRotationSchedule: KeyRotationSchedule;

  constructor(config: SecurityConfig) {
    this.loadEncryptionKeys(config.keyPath);
    this.setupKeyRotation(config.keyRotation);
  }

  async secureMessage(message: Message, context: SecurityContext): Promise<SecureMessage> {
    // Step 1: Input validation and sanitization
    const validatedMessage = await this.validateAndSanitize(message);
    
    // Step 2: Apply security based on channel requirements
    const securityLevel = this.determineSecurityLevel(context.channel);
    
    let securedMessage: SecureMessage = {
      id: message.id,
      type: message.type,
      encrypted: false,
      signed: false,
      timestamp: Date.now(),
      payload: validatedMessage.payload
    };

    // Step 3: Encryption (if required)
    if (securityLevel.requiresEncryption) {
      securedMessage.payload = await this.encryptPayload(
        securedMessage.payload,
        context.recipientKey || this.encryptionKey
      );
      securedMessage.encrypted = true;
      securedMessage.encryptionAlgorithm = 'AES-256-GCM';
    }

    // Step 4: Digital signature (if required)
    if (securityLevel.requiresSignature) {
      securedMessage.signature = await this.signMessage(securedMessage, this.signingKey);
      securedMessage.signed = true;
      securedMessage.signatureAlgorithm = 'HMAC-SHA256';
    }

    // Step 5: Add integrity hash
    securedMessage.integrity = await this.calculateIntegrityHash(securedMessage);

    // Step 6: Add anti-replay protection
    if (securityLevel.requiresAntiReplay) {
      securedMessage.nonce = this.generateNonce();
      securedMessage.sequenceNumber = await this.getNextSequenceNumber(context.userId);
    }

    return securedMessage;
  }

  async validateSecureMessage(
    securedMessage: SecureMessage,
    context: SecurityContext
  ): Promise<ValidationResult> {
    try {
      // Step 1: Integrity verification
      const integrityValid = await this.verifyIntegrity(securedMessage);
      if (!integrityValid) {
        return { valid: false, reason: 'integrity_check_failed' };
      }

      // Step 2: Anti-replay protection
      if (securedMessage.nonce && securedMessage.sequenceNumber) {
        const replayValid = await this.validateAntiReplay(securedMessage, context);
        if (!replayValid) {
          return { valid: false, reason: 'replay_attack_detected' };
        }
      }

      // Step 3: Signature verification
      if (securedMessage.signed && securedMessage.signature) {
        const signatureValid = await this.verifySignature(securedMessage, this.signingKey);
        if (!signatureValid) {
          return { valid: false, reason: 'signature_verification_failed' };
        }
      }

      // Step 4: Decrypt payload if encrypted
      let payload = securedMessage.payload;
      if (securedMessage.encrypted) {
        payload = await this.decryptPayload(
          securedMessage.payload,
          context.decryptionKey || this.encryptionKey
        );
      }

      return {
        valid: true,
        decryptedPayload: payload,
        securityLevel: this.assessMessageSecurityLevel(securedMessage)
      };

    } catch (error) {
      logger.error('Message security validation error', { error, messageId: securedMessage.id });
      return { valid: false, reason: 'validation_error', error: error.message };
    }
  }

  private async encryptPayload(payload: any, key: Buffer): Promise<string> {
    const cipher = crypto.createCipher('aes-256-gcm', key);
    const iv = crypto.randomBytes(16);
    cipher.setAutoPadding(true);
    
    const plaintext = JSON.stringify(payload);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    });
  }
}
```

## Next Phase: Completion

The final phase will cover:
1. Integration plan with existing infrastructure
2. Migration strategy and rollout plan
3. Testing and validation procedures
4. Documentation and training materials
5. Production deployment checklist

---

*Document Version: 1.0*
*Last Updated: 2025-08-21*
*Author: WebSocket Hub Architecture Team*