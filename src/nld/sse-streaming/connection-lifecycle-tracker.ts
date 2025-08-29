/**
 * Connection Lifecycle Tracker - NLD Pattern Detection System
 * Prevents SSE connection cascade failures and manages connection lifecycle
 */

export interface ConnectionLifecycleEvent {
  eventId: string;
  connectionId: string;
  eventType: 'CREATED' | 'CONNECTING' | 'CONNECTED' | 'MESSAGE_RECEIVED' | 'ERROR' | 'DISCONNECTED' | 'CLOSED' | 'TIMEOUT';
  timestamp: number;
  details: {
    endpoint?: string;
    errorCode?: string;
    errorMessage?: string;
    messageCount?: number;
    duration?: number;
    retryAttempt?: number;
  };
}

export interface ConnectionCascadeFailure {
  failureId: string;
  failureType: 'SSE_CONNECTION_CASCADE_FAILURE' | 'RAPID_RECONNECTION_STORM' | 'CIRCUIT_BREAKER_TRIGGERED' | 'CONNECTION_POOL_EXHAUSTION';
  affectedEndpoint: string;
  cascadeStartTime: number;
  detectedAt: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impactMetrics: {
    affectedConnections: number;
    failedConnections: number;
    reconnectionAttempts: number;
    errorRate: number;
    cascadeDuration: number;
  };
  rootCause: {
    triggerId: string;
    triggerType: string;
    triggerTimestamp: number;
  };
}

export interface ConnectionHealth {
  connectionId: string;
  endpoint: string;
  status: 'healthy' | 'degraded' | 'failing' | 'circuit_broken';
  uptime: number;
  errorCount: number;
  reconnectionCount: number;
  lastError?: string;
  lastErrorTime?: number;
  messageRate: number; // messages per second
  healthScore: number; // 0-100
}

export interface CircuitBreakerState {
  endpoint: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  successCount: number;
  openTime?: number;
}

class ConnectionLifecycleTracker {
  private connections = new Map<string, ConnectionHealth>();
  private lifecycleEvents = new Map<string, ConnectionLifecycleEvent[]>();
  private cascadeFailures: ConnectionCascadeFailure[] = [];
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  
  private readonly FAILURE_THRESHOLD = 5;
  private readonly SUCCESS_THRESHOLD = 3;
  private readonly CIRCUIT_OPEN_DURATION = 60000; // 1 minute
  private readonly CASCADE_DETECTION_WINDOW = 30000; // 30 seconds
  private readonly RAPID_RECONNECTION_THRESHOLD = 5;
  private readonly ERROR_RATE_THRESHOLD = 0.5; // 50% error rate
  private readonly HEALTH_CHECK_INTERVAL = 10000; // 10 seconds

  constructor() {
    this.startHealthMonitoring();
    this.startCascadeDetection();
  }

  /**
   * Track connection creation
   */
  public trackConnectionCreated(connectionId: string, endpoint: string): void {
    const health: ConnectionHealth = {
      connectionId,
      endpoint,
      status: 'healthy',
      uptime: 0,
      errorCount: 0,
      reconnectionCount: 0,
      messageRate: 0,
      healthScore: 100
    };

    this.connections.set(connectionId, health);
    this.lifecycleEvents.set(connectionId, []);
    
    this.recordEvent(connectionId, 'CREATED', { endpoint });
    this.initializeCircuitBreaker(endpoint);
    
    console.log(`[NLD-Lifecycle] Connection created: ${connectionId} -> ${endpoint}`);
  }

  /**
   * Track connection state changes
   */
  public trackConnectionEvent(
    connectionId: string, 
    eventType: ConnectionLifecycleEvent['eventType'], 
    details: ConnectionLifecycleEvent['details'] = {}
  ): void {
    const health = this.connections.get(connectionId);
    if (!health) {
      console.warn(`[NLD-Lifecycle] Unknown connection: ${connectionId}`);
      return;
    }

    this.recordEvent(connectionId, eventType, details);
    this.updateConnectionHealth(connectionId, eventType, details);
    this.updateCircuitBreaker(health.endpoint, eventType, details);
    
    // Detect potential cascade triggers
    if (this.isCascadeTriggerEvent(eventType)) {
      this.detectPotentialCascade(health.endpoint, eventType);
    }
  }

  /**
   * Record lifecycle event
   */
  private recordEvent(
    connectionId: string, 
    eventType: ConnectionLifecycleEvent['eventType'], 
    details: ConnectionLifecycleEvent['details']
  ): void {
    const event: ConnectionLifecycleEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      connectionId,
      eventType,
      timestamp: Date.now(),
      details
    };

    const events = this.lifecycleEvents.get(connectionId) || [];
    events.push(event);
    
    // Keep only last 100 events per connection
    if (events.length > 100) {
      events.shift();
    }
    
    this.lifecycleEvents.set(connectionId, events);
  }

  /**
   * Update connection health based on events
   */
  private updateConnectionHealth(
    connectionId: string, 
    eventType: ConnectionLifecycleEvent['eventType'], 
    details: ConnectionLifecycleEvent['details']
  ): void {
    const health = this.connections.get(connectionId);
    if (!health) return;

    const now = Date.now();
    
    switch (eventType) {
      case 'CONNECTED':
        health.status = 'healthy';
        health.healthScore = Math.min(100, health.healthScore + 10);
        break;
        
      case 'ERROR':
        health.errorCount++;
        health.lastError = details.errorMessage || 'Unknown error';
        health.lastErrorTime = now;
        health.healthScore = Math.max(0, health.healthScore - 20);
        
        if (health.errorCount >= this.FAILURE_THRESHOLD) {
          health.status = 'failing';
        } else if (health.errorCount >= 2) {
          health.status = 'degraded';
        }
        break;
        
      case 'DISCONNECTED':
      case 'TIMEOUT':
        health.reconnectionCount++;
        health.healthScore = Math.max(0, health.healthScore - 15);
        
        if (health.reconnectionCount >= this.RAPID_RECONNECTION_THRESHOLD) {
          health.status = 'failing';
        }
        break;
        
      case 'MESSAGE_RECEIVED':
        health.messageRate = this.calculateMessageRate(connectionId);
        health.healthScore = Math.min(100, health.healthScore + 1);
        break;
    }

    // Update overall status based on circuit breaker
    const circuitBreaker = this.circuitBreakers.get(health.endpoint);
    if (circuitBreaker?.state === 'OPEN') {
      health.status = 'circuit_broken';
    }
  }

  /**
   * Initialize circuit breaker for endpoint
   */
  private initializeCircuitBreaker(endpoint: string): void {
    if (!this.circuitBreakers.has(endpoint)) {
      const breaker: CircuitBreakerState = {
        endpoint,
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
        successCount: 0
      };
      
      this.circuitBreakers.set(endpoint, breaker);
    }
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(
    endpoint: string, 
    eventType: ConnectionLifecycleEvent['eventType'], 
    details: ConnectionLifecycleEvent['details']
  ): void {
    const breaker = this.circuitBreakers.get(endpoint);
    if (!breaker) return;

    const now = Date.now();

    switch (eventType) {
      case 'ERROR':
      case 'TIMEOUT':
      case 'DISCONNECTED':
        this.handleCircuitBreakerFailure(breaker, now);
        break;
        
      case 'CONNECTED':
      case 'MESSAGE_RECEIVED':
        this.handleCircuitBreakerSuccess(breaker, now);
        break;
    }
  }

  /**
   * Handle circuit breaker failure
   */
  private handleCircuitBreakerFailure(breaker: CircuitBreakerState, timestamp: number): void {
    breaker.failureCount++;
    breaker.lastFailureTime = timestamp;

    if (breaker.state === 'CLOSED' && breaker.failureCount >= this.FAILURE_THRESHOLD) {
      this.openCircuitBreaker(breaker, timestamp);
    } else if (breaker.state === 'HALF_OPEN') {
      // Failed while testing, go back to OPEN
      this.openCircuitBreaker(breaker, timestamp);
    }
  }

  /**
   * Handle circuit breaker success
   */
  private handleCircuitBreakerSuccess(breaker: CircuitBreakerState, timestamp: number): void {
    if (breaker.state === 'HALF_OPEN') {
      breaker.successCount++;
      
      if (breaker.successCount >= this.SUCCESS_THRESHOLD) {
        this.closeCircuitBreaker(breaker);
      }
    } else if (breaker.state === 'CLOSED') {
      // Reset failure count on success
      breaker.failureCount = Math.max(0, breaker.failureCount - 1);
    }
  }

  /**
   * Open circuit breaker
   */
  private openCircuitBreaker(breaker: CircuitBreakerState, timestamp: number): void {
    breaker.state = 'OPEN';
    breaker.openTime = timestamp;
    breaker.nextAttemptTime = timestamp + this.CIRCUIT_OPEN_DURATION;
    
    console.warn(`[NLD-Lifecycle] Circuit breaker OPENED for: ${breaker.endpoint}`);
    
    // Record cascade failure
    this.recordCascadeFailure('CIRCUIT_BREAKER_TRIGGERED', breaker.endpoint, timestamp);
    
    // Close all connections to this endpoint
    this.closeEndpointConnections(breaker.endpoint);
  }

  /**
   * Close circuit breaker
   */
  private closeCircuitBreaker(breaker: CircuitBreakerState): void {
    breaker.state = 'CLOSED';
    breaker.failureCount = 0;
    breaker.successCount = 0;
    breaker.openTime = undefined;
    
    console.log(`[NLD-Lifecycle] Circuit breaker CLOSED for: ${breaker.endpoint}`);
  }

  /**
   * Check if circuit breaker should transition to HALF_OPEN
   */
  private checkCircuitBreakerTransition(): void {
    const now = Date.now();
    
    for (const breaker of this.circuitBreakers.values()) {
      if (breaker.state === 'OPEN' && now >= breaker.nextAttemptTime) {
        breaker.state = 'HALF_OPEN';
        breaker.successCount = 0;
        console.log(`[NLD-Lifecycle] Circuit breaker HALF_OPEN for: ${breaker.endpoint}`);
      }
    }
  }

  /**
   * Close all connections to endpoint
   */
  private closeEndpointConnections(endpoint: string): void {
    for (const [connectionId, health] of this.connections.entries()) {
      if (health.endpoint === endpoint && health.status !== 'circuit_broken') {
        health.status = 'circuit_broken';
        this.recordEvent(connectionId, 'CLOSED', { reason: 'circuit_breaker' });
      }
    }
  }

  /**
   * Check if event type can trigger cascades
   */
  private isCascadeTriggerEvent(eventType: ConnectionLifecycleEvent['eventType']): boolean {
    return ['ERROR', 'TIMEOUT', 'DISCONNECTED'].includes(eventType);
  }

  /**
   * Detect potential cascade failures
   */
  private detectPotentialCascade(endpoint: string, triggerType: ConnectionLifecycleEvent['eventType']): void {
    const now = Date.now();
    const windowStart = now - this.CASCADE_DETECTION_WINDOW;
    
    // Count recent failures for this endpoint
    const recentFailures = this.getRecentFailures(endpoint, windowStart);
    const reconnectionAttempts = this.getRecentReconnections(endpoint, windowStart);
    
    if (recentFailures.length >= 3 || reconnectionAttempts >= this.RAPID_RECONNECTION_THRESHOLD) {
      this.recordCascadeFailure('SSE_CONNECTION_CASCADE_FAILURE', endpoint, now, {
        recentFailures,
        reconnectionAttempts
      });
    }
  }

  /**
   * Get recent failures for endpoint
   */
  private getRecentFailures(endpoint: string, since: number): ConnectionLifecycleEvent[] {
    const failures: ConnectionLifecycleEvent[] = [];
    
    for (const [connectionId, health] of this.connections.entries()) {
      if (health.endpoint === endpoint) {
        const events = this.lifecycleEvents.get(connectionId) || [];
        const recentFailures = events.filter(event => 
          event.timestamp >= since && 
          ['ERROR', 'TIMEOUT', 'DISCONNECTED'].includes(event.eventType)
        );
        failures.push(...recentFailures);
      }
    }
    
    return failures.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get recent reconnection attempts for endpoint
   */
  private getRecentReconnections(endpoint: string, since: number): number {
    let reconnections = 0;
    
    for (const [connectionId, health] of this.connections.entries()) {
      if (health.endpoint === endpoint) {
        const events = this.lifecycleEvents.get(connectionId) || [];
        reconnections += events.filter(event => 
          event.timestamp >= since && 
          event.eventType === 'CONNECTING' &&
          event.details.retryAttempt
        ).length;
      }
    }
    
    return reconnections;
  }

  /**
   * Record cascade failure
   */
  private recordCascadeFailure(
    failureType: ConnectionCascadeFailure['failureType'], 
    endpoint: string, 
    timestamp: number,
    context?: { recentFailures?: ConnectionLifecycleEvent[]; reconnectionAttempts?: number }
  ): void {
    const endpointConnections = Array.from(this.connections.values()).filter(h => h.endpoint === endpoint);
    const failedConnections = endpointConnections.filter(h => h.status === 'failing').length;
    const errorRate = this.calculateEndpointErrorRate(endpoint);
    
    const failure: ConnectionCascadeFailure = {
      failureId: `CASCADE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      failureType,
      affectedEndpoint: endpoint,
      cascadeStartTime: this.findCascadeStartTime(endpoint),
      detectedAt: timestamp,
      severity: this.calculateCascadeSeverity(endpointConnections.length, failedConnections, errorRate),
      impactMetrics: {
        affectedConnections: endpointConnections.length,
        failedConnections,
        reconnectionAttempts: context?.reconnectionAttempts || 0,
        errorRate,
        cascadeDuration: timestamp - this.findCascadeStartTime(endpoint)
      },
      rootCause: {
        triggerId: context?.recentFailures?.[0]?.eventId || 'unknown',
        triggerType: context?.recentFailures?.[0]?.eventType || 'unknown',
        triggerTimestamp: context?.recentFailures?.[0]?.timestamp || timestamp
      }
    };

    this.cascadeFailures.push(failure);
    
    // Keep only last 50 cascade failures
    if (this.cascadeFailures.length > 50) {
      this.cascadeFailures.shift();
    }

    this.exportNeuralTrainingData(failure);
    console.error(`[NLD-Lifecycle] Cascade failure detected:`, failure);
  }

  /**
   * Calculate cascade severity
   */
  private calculateCascadeSeverity(totalConnections: number, failedConnections: number, errorRate: number): 'low' | 'medium' | 'high' | 'critical' {
    const failureRatio = failedConnections / Math.max(1, totalConnections);
    
    if (failureRatio >= 0.8 || errorRate >= 0.9) return 'critical';
    if (failureRatio >= 0.5 || errorRate >= 0.7) return 'high';
    if (failureRatio >= 0.3 || errorRate >= 0.5) return 'medium';
    return 'low';
  }

  /**
   * Find cascade start time
   */
  private findCascadeStartTime(endpoint: string): number {
    const windowStart = Date.now() - this.CASCADE_DETECTION_WINDOW;
    const recentFailures = this.getRecentFailures(endpoint, windowStart);
    
    return recentFailures.length > 0 ? recentFailures[0].timestamp : Date.now();
  }

  /**
   * Calculate endpoint error rate
   */
  private calculateEndpointErrorRate(endpoint: string): number {
    const endpointConnections = Array.from(this.connections.values()).filter(h => h.endpoint === endpoint);
    const totalConnections = endpointConnections.length;
    
    if (totalConnections === 0) return 0;
    
    const totalErrors = endpointConnections.reduce((sum, health) => sum + health.errorCount, 0);
    const totalEvents = endpointConnections.reduce((sum, health) => {
      const events = this.lifecycleEvents.get(health.connectionId) || [];
      return sum + events.length;
    }, 0);
    
    return totalEvents > 0 ? totalErrors / totalEvents : 0;
  }

  /**
   * Calculate message rate for connection
   */
  private calculateMessageRate(connectionId: string): number {
    const events = this.lifecycleEvents.get(connectionId) || [];
    const recentMessages = events.filter(event => 
      event.eventType === 'MESSAGE_RECEIVED' && 
      Date.now() - event.timestamp < 60000 // Last minute
    );
    
    return recentMessages.length / 60; // Messages per second
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    setInterval(() => {
      this.performHealthChecks();
      this.checkCircuitBreakerTransition();
      this.cleanupOldData();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Start cascade detection monitoring
   */
  private startCascadeDetection(): void {
    setInterval(() => {
      this.monitorForCascades();
    }, 5000); // Every 5 seconds
  }

  /**
   * Perform health checks
   */
  private performHealthChecks(): void {
    for (const [connectionId, health] of this.connections.entries()) {
      this.updateHealthScore(connectionId);
      this.checkConnectionTimeout(connectionId);
    }
  }

  /**
   * Update connection health score
   */
  private updateHealthScore(connectionId: string): void {
    const health = this.connections.get(connectionId);
    if (!health) return;

    const events = this.lifecycleEvents.get(connectionId) || [];
    const recentEvents = events.filter(event => Date.now() - event.timestamp < 300000); // 5 minutes
    
    const errorEvents = recentEvents.filter(e => e.eventType === 'ERROR').length;
    const successEvents = recentEvents.filter(e => e.eventType === 'MESSAGE_RECEIVED').length;
    
    // Base score calculation
    const errorPenalty = errorEvents * 10;
    const successBonus = successEvents * 2;
    
    health.healthScore = Math.max(0, Math.min(100, 100 - errorPenalty + successBonus));
    
    // Update status based on health score
    if (health.healthScore >= 80) {
      health.status = 'healthy';
    } else if (health.healthScore >= 50) {
      health.status = 'degraded';
    } else {
      health.status = 'failing';
    }
  }

  /**
   * Check for connection timeouts
   */
  private checkConnectionTimeout(connectionId: string): void {
    const events = this.lifecycleEvents.get(connectionId) || [];
    const lastEvent = events[events.length - 1];
    
    if (lastEvent && Date.now() - lastEvent.timestamp > 60000) { // 1 minute timeout
      this.trackConnectionEvent(connectionId, 'TIMEOUT', { duration: Date.now() - lastEvent.timestamp });
    }
  }

  /**
   * Monitor for new cascades
   */
  private monitorForCascades(): void {
    const endpointGroups = new Map<string, ConnectionHealth[]>();
    
    // Group connections by endpoint
    for (const health of this.connections.values()) {
      const group = endpointGroups.get(health.endpoint) || [];
      group.push(health);
      endpointGroups.set(health.endpoint, group);
    }

    // Check each endpoint for cascade patterns
    for (const [endpoint, connections] of endpointGroups.entries()) {
      const failingConnections = connections.filter(h => h.status === 'failing').length;
      const totalConnections = connections.length;
      
      if (totalConnections > 1 && failingConnections / totalConnections >= 0.5) {
        const now = Date.now();
        const existingCascade = this.cascadeFailures.find(f => 
          f.affectedEndpoint === endpoint && 
          now - f.detectedAt < this.CASCADE_DETECTION_WINDOW
        );
        
        if (!existingCascade) {
          this.recordCascadeFailure('SSE_CONNECTION_CASCADE_FAILURE', endpoint, now);
        }
      }
    }
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoffTime = Date.now() - 3600000; // 1 hour
    
    // Clean old lifecycle events
    for (const [connectionId, events] of this.lifecycleEvents.entries()) {
      const recentEvents = events.filter(event => event.timestamp > cutoffTime);
      this.lifecycleEvents.set(connectionId, recentEvents);
    }
    
    // Clean old cascade failures
    this.cascadeFailures = this.cascadeFailures.filter(failure => failure.detectedAt > cutoffTime);
  }

  /**
   * Export neural training data
   */
  private exportNeuralTrainingData(failure: ConnectionCascadeFailure): void {
    const trainingData = {
      failure,
      context: {
        totalConnections: this.connections.size,
        totalCircuitBreakers: this.circuitBreakers.size,
        openCircuitBreakers: Array.from(this.circuitBreakers.values()).filter(cb => cb.state === 'OPEN').length,
        totalCascadeFailures: this.cascadeFailures.length,
        timestamp: Date.now()
      }
    };

    console.log(`[NLD-Lifecycle] Neural training data exported:`, trainingData);
  }

  /**
   * Get connection health summary
   */
  public getHealthSummary(): {
    totalConnections: number;
    healthyConnections: number;
    degradedConnections: number;
    failingConnections: number;
    circuitBrokenConnections: number;
    cascadeFailures: number;
    circuitBreakers: { [endpoint: string]: CircuitBreakerState };
  } {
    const connections = Array.from(this.connections.values());
    const circuitBreakers = Object.fromEntries(this.circuitBreakers.entries());

    return {
      totalConnections: connections.length,
      healthyConnections: connections.filter(h => h.status === 'healthy').length,
      degradedConnections: connections.filter(h => h.status === 'degraded').length,
      failingConnections: connections.filter(h => h.status === 'failing').length,
      circuitBrokenConnections: connections.filter(h => h.status === 'circuit_broken').length,
      cascadeFailures: this.cascadeFailures.length,
      circuitBreakers
    };
  }

  /**
   * Remove connection from tracking
   */
  public removeConnection(connectionId: string): void {
    this.connections.delete(connectionId);
    this.lifecycleEvents.delete(connectionId);
    console.log(`[NLD-Lifecycle] Connection removed from tracking: ${connectionId}`);
  }

  /**
   * Cleanup all tracking data
   */
  public cleanup(): void {
    this.connections.clear();
    this.lifecycleEvents.clear();
    this.cascadeFailures.length = 0;
    this.circuitBreakers.clear();
  }
}

export default ConnectionLifecycleTracker;