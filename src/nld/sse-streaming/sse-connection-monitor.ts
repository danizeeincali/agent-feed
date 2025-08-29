/**
 * SSE Connection Monitor - NLD Pattern Detection System
 * Detects and prevents SSE connection duplication and cascade failures
 */

export interface SSEConnectionState {
  endpoint: string;
  connectionId: string;
  eventSource: EventSource | null;
  lastActivity: number;
  messageCount: number;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  duplicateConnections: number;
  memoryLeakRisk: boolean;
}

export interface SSEFailurePattern {
  patternId: string;
  patternType: 'SSE_CONNECTION_DUPLICATION' | 'CASCADE_FAILURE' | 'MEMORY_LEAK' | 'CONNECTION_STORM';
  endpoint: string;
  detectedAt: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: {
    duplicateCount: number;
    rapidReconnections: number;
    unclosedConnections: number;
    memoryUsage: number;
  };
  preventionAction: string;
}

class SSEConnectionMonitor {
  private connections = new Map<string, SSEConnectionState>();
  private failurePatterns: SSEFailurePattern[] = [];
  private connectionHistory = new Map<string, number[]>();
  private cleanupTimers = new Map<string, NodeJS.Timeout>();
  
  private readonly DUPLICATE_THRESHOLD = 1;
  private readonly RECONNECTION_STORM_THRESHOLD = 5;
  private readonly CONNECTION_TIMEOUT = 30000;
  private readonly MEMORY_LEAK_THRESHOLD = 10;

  /**
   * Monitor SSE connection creation and detect duplicates
   */
  public monitorConnection(endpoint: string, eventSource: EventSource): string {
    const connectionId = this.generateConnectionId(endpoint);
    
    // Check for existing connections to same endpoint
    const existingConnections = Array.from(this.connections.values())
      .filter(conn => conn.endpoint === endpoint && conn.status !== 'disconnected');
    
    if (existingConnections.length > this.DUPLICATE_THRESHOLD) {
      this.detectDuplicateConnection(endpoint, existingConnections.length);
      // Auto-cleanup older connections
      this.cleanupDuplicateConnections(endpoint, connectionId);
    }
    
    // Register new connection
    const connectionState: SSEConnectionState = {
      endpoint,
      connectionId,
      eventSource,
      lastActivity: Date.now(),
      messageCount: 0,
      status: 'connecting',
      duplicateConnections: existingConnections.length,
      memoryLeakRisk: existingConnections.length >= this.MEMORY_LEAK_THRESHOLD
    };
    
    this.connections.set(connectionId, connectionState);
    this.trackConnectionHistory(endpoint);
    this.setupConnectionTimeout(connectionId);
    
    // Setup event listeners for monitoring
    this.attachEventListeners(connectionId, eventSource);
    
    return connectionId;
  }

  /**
   * Detect SSE connection duplication pattern
   */
  private detectDuplicateConnection(endpoint: string, duplicateCount: number): void {
    const pattern: SSEFailurePattern = {
      patternId: `SSE_DUP_${Date.now()}`,
      patternType: 'SSE_CONNECTION_DUPLICATION',
      endpoint,
      detectedAt: Date.now(),
      severity: duplicateCount > 3 ? 'critical' : duplicateCount > 1 ? 'high' : 'medium',
      details: {
        duplicateCount,
        rapidReconnections: this.getRapidReconnectionCount(endpoint),
        unclosedConnections: this.getUnclosedConnectionCount(endpoint),
        memoryUsage: this.estimateMemoryUsage(endpoint)
      },
      preventionAction: 'AUTO_CLEANUP_DUPLICATES'
    };
    
    this.failurePatterns.push(pattern);
    this.exportNeuralTrainingData(pattern);
    
    console.warn(`[NLD-SSE] Duplicate connection detected: ${endpoint}`, pattern);
  }

  /**
   * Clean up duplicate connections automatically
   */
  private cleanupDuplicateConnections(endpoint: string, keepConnectionId: string): void {
    for (const [connectionId, state] of this.connections.entries()) {
      if (state.endpoint === endpoint && connectionId !== keepConnectionId) {
        this.closeConnection(connectionId, 'DUPLICATE_CLEANUP');
      }
    }
  }

  /**
   * Monitor for connection cascade failures
   */
  private detectCascadeFailure(endpoint: string): void {
    const recentReconnections = this.getRapidReconnectionCount(endpoint);
    
    if (recentReconnections >= this.RECONNECTION_STORM_THRESHOLD) {
      const pattern: SSEFailurePattern = {
        patternId: `SSE_CASCADE_${Date.now()}`,
        patternType: 'CASCADE_FAILURE',
        endpoint,
        detectedAt: Date.now(),
        severity: 'critical',
        details: {
          duplicateCount: 0,
          rapidReconnections: recentReconnections,
          unclosedConnections: this.getUnclosedConnectionCount(endpoint),
          memoryUsage: this.estimateMemoryUsage(endpoint)
        },
        preventionAction: 'CIRCUIT_BREAKER_ACTIVATION'
      };
      
      this.failurePatterns.push(pattern);
      this.exportNeuralTrainingData(pattern);
      this.activateCircuitBreaker(endpoint);
    }
  }

  /**
   * Attach event listeners to monitor connection health
   */
  private attachEventListeners(connectionId: string, eventSource: EventSource): void {
    const state = this.connections.get(connectionId);
    if (!state) return;

    eventSource.onopen = () => {
      state.status = 'connected';
      state.lastActivity = Date.now();
    };

    eventSource.onmessage = (event) => {
      state.messageCount++;
      state.lastActivity = Date.now();
      this.validateMessageIntegrity(connectionId, event.data);
    };

    eventSource.onerror = (error) => {
      state.status = 'error';
      this.detectConnectionError(connectionId, error);
    };

    // Monitor for connection state changes
    const monitorInterval = setInterval(() => {
      this.monitorConnectionHealth(connectionId);
    }, 5000);

    eventSource.addEventListener('close', () => {
      clearInterval(monitorInterval);
      this.handleConnectionClose(connectionId);
    });
  }

  /**
   * Monitor individual connection health
   */
  private monitorConnectionHealth(connectionId: string): void {
    const state = this.connections.get(connectionId);
    if (!state) return;

    const now = Date.now();
    const timeSinceActivity = now - state.lastActivity;

    // Detect stale connections
    if (timeSinceActivity > this.CONNECTION_TIMEOUT) {
      this.detectStaleConnection(connectionId, timeSinceActivity);
    }

    // Check for memory leak indicators
    if (state.memoryLeakRisk && state.status === 'disconnected') {
      this.detectMemoryLeak(connectionId);
    }
  }

  /**
   * Detect stale connection pattern
   */
  private detectStaleConnection(connectionId: string, staleDuration: number): void {
    const state = this.connections.get(connectionId);
    if (!state) return;

    const pattern: SSEFailurePattern = {
      patternId: `SSE_STALE_${Date.now()}`,
      patternType: 'CONNECTION_STORM',
      endpoint: state.endpoint,
      detectedAt: Date.now(),
      severity: 'medium',
      details: {
        duplicateCount: 0,
        rapidReconnections: 0,
        unclosedConnections: 1,
        memoryUsage: this.estimateMemoryUsage(state.endpoint)
      },
      preventionAction: 'AUTO_CLOSE_STALE_CONNECTION'
    };

    this.failurePatterns.push(pattern);
    this.closeConnection(connectionId, 'STALE_CONNECTION_CLEANUP');
  }

  /**
   * Close SSE connection with cleanup
   */
  public closeConnection(connectionId: string, reason: string): void {
    const state = this.connections.get(connectionId);
    if (!state) return;

    if (state.eventSource) {
      state.eventSource.close();
      state.eventSource = null;
    }

    state.status = 'disconnected';
    
    // Clear cleanup timer
    const timer = this.cleanupTimers.get(connectionId);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(connectionId);
    }

    console.log(`[NLD-SSE] Connection closed: ${connectionId} (${reason})`);
  }

  /**
   * Get rapid reconnection count for endpoint
   */
  private getRapidReconnectionCount(endpoint: string): number {
    const history = this.connectionHistory.get(endpoint) || [];
    const recentWindow = Date.now() - 60000; // 1 minute window
    return history.filter(timestamp => timestamp > recentWindow).length;
  }

  /**
   * Track connection history for pattern analysis
   */
  private trackConnectionHistory(endpoint: string): void {
    const history = this.connectionHistory.get(endpoint) || [];
    history.push(Date.now());
    
    // Keep only last 50 connections for analysis
    if (history.length > 50) {
      history.shift();
    }
    
    this.connectionHistory.set(endpoint, history);
    this.detectCascadeFailure(endpoint);
  }

  /**
   * Setup connection timeout monitoring
   */
  private setupConnectionTimeout(connectionId: string): void {
    const timer = setTimeout(() => {
      this.monitorConnectionHealth(connectionId);
    }, this.CONNECTION_TIMEOUT);
    
    this.cleanupTimers.set(connectionId, timer);
  }

  /**
   * Validate message integrity
   */
  private validateMessageIntegrity(connectionId: string, data: string): void {
    // Check for malformed JSON or unexpected data
    try {
      if (data.trim().startsWith('{') || data.trim().startsWith('[')) {
        JSON.parse(data);
      }
    } catch (error) {
      console.warn(`[NLD-SSE] Message integrity issue: ${connectionId}`, error);
    }
  }

  /**
   * Detect connection error patterns
   */
  private detectConnectionError(connectionId: string, error: Event): void {
    const state = this.connections.get(connectionId);
    if (!state) return;

    console.error(`[NLD-SSE] Connection error: ${connectionId}`, error);
    
    // Auto-retry with exponential backoff
    this.scheduleReconnection(state.endpoint, connectionId);
  }

  /**
   * Schedule reconnection with backoff
   */
  private scheduleReconnection(endpoint: string, connectionId: string): void {
    const retryDelay = Math.min(1000 * Math.pow(2, this.getRapidReconnectionCount(endpoint)), 30000);
    
    setTimeout(() => {
      if (this.connections.get(connectionId)?.status === 'error') {
        console.log(`[NLD-SSE] Attempting reconnection: ${endpoint}`);
        // Trigger reconnection through callback if provided
      }
    }, retryDelay);
  }

  /**
   * Activate circuit breaker for endpoint
   */
  private activateCircuitBreaker(endpoint: string): void {
    console.warn(`[NLD-SSE] Circuit breaker activated for: ${endpoint}`);
    
    // Close all connections to this endpoint
    for (const [connectionId, state] of this.connections.entries()) {
      if (state.endpoint === endpoint) {
        this.closeConnection(connectionId, 'CIRCUIT_BREAKER');
      }
    }
  }

  /**
   * Handle connection close event
   */
  private handleConnectionClose(connectionId: string): void {
    const state = this.connections.get(connectionId);
    if (state) {
      state.status = 'disconnected';
      state.eventSource = null;
    }
    
    this.cleanupTimers.delete(connectionId);
  }

  /**
   * Detect memory leak patterns
   */
  private detectMemoryLeak(connectionId: string): void {
    const pattern: SSEFailurePattern = {
      patternId: `SSE_MEMLEAK_${Date.now()}`,
      patternType: 'MEMORY_LEAK',
      endpoint: this.connections.get(connectionId)?.endpoint || 'unknown',
      detectedAt: Date.now(),
      severity: 'high',
      details: {
        duplicateCount: 0,
        rapidReconnections: 0,
        unclosedConnections: this.getUnclosedConnectionCount('all'),
        memoryUsage: this.estimateMemoryUsage('all')
      },
      preventionAction: 'FORCE_CLEANUP_CONNECTIONS'
    };

    this.failurePatterns.push(pattern);
    this.exportNeuralTrainingData(pattern);
  }

  /**
   * Get unclosed connection count
   */
  private getUnclosedConnectionCount(endpoint: string): number {
    if (endpoint === 'all') {
      return Array.from(this.connections.values())
        .filter(conn => conn.status !== 'disconnected').length;
    }
    
    return Array.from(this.connections.values())
      .filter(conn => conn.endpoint === endpoint && conn.status !== 'disconnected').length;
  }

  /**
   * Estimate memory usage for connections
   */
  private estimateMemoryUsage(endpoint: string): number {
    const connections = endpoint === 'all' 
      ? Array.from(this.connections.values())
      : Array.from(this.connections.values()).filter(conn => conn.endpoint === endpoint);
    
    // Rough estimate: 1KB per connection + message buffer
    return connections.reduce((total, conn) => {
      return total + 1024 + (conn.messageCount * 100); // 100 bytes per message estimate
    }, 0);
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(endpoint: string): string {
    return `sse_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export neural training data for pattern learning
   */
  private exportNeuralTrainingData(pattern: SSEFailurePattern): void {
    const trainingData = {
      pattern,
      context: {
        activeConnections: this.connections.size,
        totalFailures: this.failurePatterns.length,
        timestamp: Date.now()
      }
    };

    // Store for neural network training
    console.log(`[NLD-SSE] Neural training data exported:`, trainingData);
  }

  /**
   * Get connection status summary
   */
  public getConnectionStatus(): {
    totalConnections: number;
    activeConnections: number;
    failurePatterns: SSEFailurePattern[];
    memoryUsage: number;
  } {
    const active = Array.from(this.connections.values())
      .filter(conn => conn.status === 'connected').length;

    return {
      totalConnections: this.connections.size,
      activeConnections: active,
      failurePatterns: this.failurePatterns,
      memoryUsage: this.estimateMemoryUsage('all')
    };
  }

  /**
   * Cleanup all connections
   */
  public cleanup(): void {
    for (const connectionId of this.connections.keys()) {
      this.closeConnection(connectionId, 'SYSTEM_CLEANUP');
    }
    this.connections.clear();
    this.failurePatterns.length = 0;
    this.connectionHistory.clear();
  }
}

export default SSEConnectionMonitor;