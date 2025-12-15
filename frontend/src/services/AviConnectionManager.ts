/**
 * Avi Connection Manager - Bulletproof Claude Code Integration
 * Provides comprehensive error handling, retry logic, and connection management
 * for the Avi Direct Chat component
 */

import { captureError, captureNetworkError, captureAsyncError } from '@/utils/errorHandling';
import { safeApiCall, safePost, apiCache } from '@/utils/apiSafety';
import { safeObject, safeString, isDefined } from '@/utils/safetyUtils';

// Connection States
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
  DEGRADED = 'degraded'
}

// Connection Configuration
export interface ConnectionConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitterFactor: number;
  connectionTimeout: number;
  heartbeatInterval: number;
  heartbeatTimeout: number;
}

// Connection Metrics
export interface ConnectionMetrics {
  connectionAttempts: number;
  successfulConnections: number;
  totalMessages: number;
  errorCount: number;
  lastConnected: Date | null;
  uptime: number;
  latency: number;
  throughput: number;
}

// Event Types
export interface ConnectionEvents {
  stateChange: (state: ConnectionState, error?: string) => void;
  message: (data: any) => void;
  error: (error: Error, context?: any) => void;
  metrics: (metrics: ConnectionMetrics) => void;
}

export class AviConnectionManager {
  private config: ConnectionConfig;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private instanceId: string | null = null;
  private eventSource: EventSource | null = null;
  private retryAttempt = 0;
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private heartbeatIntervalId: NodeJS.Timeout | null = null;
  private lastHeartbeat = new Date();
  private connectionStartTime: Date | null = null;
  private listeners: Partial<ConnectionEvents> = {};
  private metrics: ConnectionMetrics;
  private messageBuffer: any[] = [];
  private circuitBreakerState = {
    failures: 0,
    lastFailure: null as Date | null,
    state: 'closed' as 'closed' | 'open' | 'half-open'
  };

  constructor(config?: Partial<ConnectionConfig>) {
    this.config = {
      maxRetries: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      jitterFactor: 0.1,
      connectionTimeout: 15000,
      heartbeatInterval: 30000,
      heartbeatTimeout: 120000,
      ...config
    };

    this.metrics = {
      connectionAttempts: 0,
      successfulConnections: 0,
      totalMessages: 0,
      errorCount: 0,
      lastConnected: null,
      uptime: 0,
      latency: 0,
      throughput: 0
    };

    // Start metrics collection
    this.startMetricsCollection();
  }

  /**
   * Add event listener
   */
  on<K extends keyof ConnectionEvents>(event: K, listener: ConnectionEvents[K]): void {
    this.listeners[event] = listener;
  }

  /**
   * Remove event listener
   */
  off<K extends keyof ConnectionEvents>(event: K): void {
    delete this.listeners[event];
  }

  /**
   * Emit event to listeners
   */
  private emit<K extends keyof ConnectionEvents>(
    event: K,
    ...args: Parameters<NonNullable<ConnectionEvents[K]>>
  ): void {
    try {
      const listener = this.listeners[event];
      if (listener) {
        (listener as any)(...args);
      }
    } catch (error) {
      console.error(`Error in event listener for ${event}:`, error);
    }
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get current instance ID
   */
  getInstanceId(): string | null {
    return this.instanceId;
  }

  /**
   * Get connection metrics
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if circuit breaker allows operation
   */
  private canAttemptOperation(): boolean {
    const now = Date.now();

    // Reset circuit breaker after timeout
    if (this.circuitBreakerState.state === 'open' &&
        this.circuitBreakerState.lastFailure &&
        now - this.circuitBreakerState.lastFailure.getTime() > 30000) {
      this.circuitBreakerState.state = 'half-open';
      this.circuitBreakerState.failures = Math.floor(this.circuitBreakerState.failures / 2);
    }

    return this.circuitBreakerState.state !== 'open';
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(success: boolean): void {
    if (success) {
      this.circuitBreakerState.failures = 0;
      this.circuitBreakerState.state = 'closed';
    } else {
      this.circuitBreakerState.failures++;
      this.circuitBreakerState.lastFailure = new Date();

      if (this.circuitBreakerState.failures >= 5) {
        this.circuitBreakerState.state = 'open';
        console.warn('[AviConnectionManager] Circuit breaker opened');
      }
    }
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number): number {
    const exponentialDelay = Math.min(
      this.config.baseDelay * Math.pow(2, attempt),
      this.config.maxDelay
    );
    const jitter = exponentialDelay * this.config.jitterFactor * Math.random();
    return exponentialDelay + jitter;
  }

  /**
   * Update connection state and emit event
   */
  private updateState(newState: ConnectionState, error?: string): void {
    if (this.state !== newState) {
      console.log(`[AviConnectionManager] State: ${this.state} → ${newState}`);
      this.state = newState;
      this.emit('stateChange', newState, error);
    }
  }

  /**
   * Create Claude instance with comprehensive error handling
   */
  private async createClaudeInstance(): Promise<string> {
    const startTime = Date.now();

    try {
      this.metrics.connectionAttempts++;

      if (!this.canAttemptOperation()) {
        throw new Error('Circuit breaker is open - too many recent failures');
      }

      const result = await safePost<any>('/api/claude/instances', {
        command: 'claude',
        instanceType: 'code',
        workingDirectory: '/workspaces/agent-feed/prod',
        usePty: true
      }, {
        timeout: this.config.connectionTimeout,
        retries: 2,
        validateResponse: (data) => {
          const responseData = safeObject(data);
          const id = responseData.data?.id || responseData.instanceId;
          return isDefined(id) && typeof id === 'string' && id.length > 0;
        },
        onError: (error) => {
          this.metrics.errorCount++;
          this.updateCircuitBreaker(false);
          captureNetworkError(error, '/api/claude/instances', 'POST');
          this.emit('error', error, { operation: 'create_instance' });
        }
      });

      if (!result.isSuccess || !result.data) {
        const errorMsg = result.error?.message || 'Failed to create Claude instance';
        throw new Error(errorMsg);
      }

      const newInstanceId = result.data.data?.id || result.data.instanceId;

      if (!newInstanceId || typeof newInstanceId !== 'string') {
        throw new Error('Invalid instance ID received from server');
      }

      // Update metrics
      this.metrics.latency = Date.now() - startTime;
      this.updateCircuitBreaker(true);

      console.log('[AviConnectionManager] Created Claude instance:', newInstanceId);
      return newInstanceId;

    } catch (error) {
      this.updateCircuitBreaker(false);
      throw error;
    }
  }

  /**
   * Setup SSE connection with robust error handling
   */
  private async setupSSEConnection(instanceId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const sseUrl = `/api/claude/instances/${instanceId}/terminal/stream`;
        console.log('[AviConnectionManager] Setting up SSE connection:', sseUrl);

        const eventSource = new EventSource(sseUrl, {
          withCredentials: false
        });

        this.eventSource = eventSource;

        // Connection timeout
        const connectionTimeout = setTimeout(() => {
          eventSource.close();
          reject(new Error('SSE connection timeout'));
        }, this.config.connectionTimeout);

        let isResolved = false;

        eventSource.onopen = () => {
          if (isResolved) return;
          isResolved = true;

          clearTimeout(connectionTimeout);
          console.log('[AviConnectionManager] SSE connection established');

          this.updateState(ConnectionState.CONNECTED);
          this.retryAttempt = 0; // Reset retry counter on successful connection
          this.connectionStartTime = new Date();
          this.lastHeartbeat = new Date();

          this.metrics.successfulConnections++;
          this.metrics.lastConnected = new Date();

          this.startHeartbeatMonitoring();
          this.updateCircuitBreaker(true);

          resolve();
        };

        eventSource.onmessage = (event) => {
          this.handleSSEMessage(event);
        };

        eventSource.onerror = (event) => {
          clearTimeout(connectionTimeout);

          if (isResolved) {
            // Connection was established but failed later
            this.handleSSEError(event);
          } else {
            // Initial connection failed
            isResolved = true;
            reject(new Error('SSE connection failed'));
          }
        };

      } catch (error) {
        const err = error instanceof Error ? error : new Error('SSE setup failed');
        captureError(err, {
          category: 'network',
          context: { instanceId, operation: 'sse_setup' }
        });
        reject(err);
      }
    });
  }

  /**
   * Handle incoming SSE messages with error boundaries
   */
  private handleSSEMessage(event: MessageEvent): void {
    try {
      const data = safeObject(JSON.parse(event.data));
      this.lastHeartbeat = new Date();
      this.metrics.totalMessages++;

      // Handle different message types
      switch (data.type) {
        case 'connected':
          console.log('[AviConnectionManager] SSE connection confirmed');
          break;

        case 'output':
          if (data.data?.trim()) {
            this.emit('message', {
              type: 'output',
              content: safeString(data.data),
              timestamp: new Date(),
              instanceId: this.instanceId
            });
          }
          break;

        case 'heartbeat':
          console.debug('[AviConnectionManager] Heartbeat received');
          break;

        case 'error':
          const errorMsg = safeString(data.message, 'Unknown server error');
          this.handleServerError(errorMsg, data);
          break;

        case 'process_exit':
          console.warn('[AviConnectionManager] Process exited:', data);
          this.updateState(ConnectionState.ERROR, 'Claude process exited');
          this.scheduleReconnect();
          break;

        default:
          // Generic message handler
          this.emit('message', data);
      }

      // Update throughput metrics
      this.updateThroughputMetrics();

    } catch (parseError) {
      const error = parseError instanceof Error ? parseError : new Error('SSE parse error');
      captureError(error, {
        category: 'network',
        context: { eventData: event.data, instanceId: this.instanceId }
      });
      console.error('[AviConnectionManager] SSE parsing error:', error);
    }
  }

  /**
   * Handle SSE connection errors
   */
  private handleSSEError(event: Event): void {
    console.warn('[AviConnectionManager] SSE connection error:', event);

    const eventSource = this.eventSource;
    if (!eventSource) return;

    // Handle different EventSource states
    switch (eventSource.readyState) {
      case EventSource.CONNECTING:
        console.log('[AviConnectionManager] SSE reconnecting...');
        this.updateState(ConnectionState.RECONNECTING);
        return;

      case EventSource.CLOSED:
        console.log('[AviConnectionManager] SSE connection closed');
        this.updateState(ConnectionState.DISCONNECTED, 'Connection closed by server');
        this.scheduleReconnect();
        break;

      default:
        this.updateState(ConnectionState.ERROR, 'SSE connection error');
        this.scheduleReconnect();
    }
  }

  /**
   * Handle server-side errors
   */
  private handleServerError(message: string, data?: any): void {
    const error = new Error(`Server error: ${message}`);
    this.metrics.errorCount++;
    this.updateCircuitBreaker(false);

    captureError(error, {
      category: 'network',
      context: { instanceId: this.instanceId, serverData: data }
    });

    this.emit('error', error, { type: 'server_error', data });
    this.updateState(ConnectionState.DEGRADED, message);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.retryAttempt >= this.config.maxRetries) {
      this.updateState(ConnectionState.ERROR, 'Max retry attempts reached');
      return;
    }

    const delay = this.calculateRetryDelay(this.retryAttempt);
    console.log(`[AviConnectionManager] Scheduling retry ${this.retryAttempt + 1}/${this.config.maxRetries} in ${delay}ms`);

    this.retryAttempt++;
    this.updateState(ConnectionState.RECONNECTING, `Retrying in ${Math.ceil(delay / 1000)}s...`);

    this.retryTimeoutId = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeatMonitoring(): void {
    this.stopHeartbeatMonitoring(); // Ensure no duplicates

    this.heartbeatIntervalId = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat.getTime();

      if (timeSinceLastHeartbeat > this.config.heartbeatTimeout) {
        console.warn('[AviConnectionManager] Heartbeat timeout detected');
        this.updateState(ConnectionState.DEGRADED, 'Connection may be unstable');
        this.metrics.errorCount++;
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeatMonitoring(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  /**
   * Update throughput metrics
   */
  private updateThroughputMetrics(): void {
    if (this.connectionStartTime) {
      const uptime = (Date.now() - this.connectionStartTime.getTime()) / 1000;
      this.metrics.throughput = this.metrics.totalMessages / Math.max(uptime, 1);
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      if (this.connectionStartTime) {
        this.metrics.uptime = Math.floor((Date.now() - this.connectionStartTime.getTime()) / 1000);
      }
      this.emit('metrics', this.getMetrics());
    }, 10000); // Every 10 seconds
  }

  /**
   * Clean up connection resources
   */
  private cleanup(): void {
    console.log('[AviConnectionManager] Cleaning up connection resources');

    // Clear timers
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }

    this.stopHeartbeatMonitoring();

    // Close EventSource
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch (error) {
        console.warn('[AviConnectionManager] Error closing EventSource:', error);
      }
      this.eventSource = null;
    }

    // Clear instance reference
    this.instanceId = null;
    this.connectionStartTime = null;
  }

  /**
   * Connect to Claude instance
   */
  async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTING || this.state === ConnectionState.CONNECTED) {
      console.log('[AviConnectionManager] Connection already in progress or established');
      return;
    }

    try {
      this.updateState(ConnectionState.CONNECTING);

      // Clear any existing connection
      this.cleanup();

      // Step 1: Create Claude instance
      const newInstanceId = await this.createClaudeInstance();
      this.instanceId = newInstanceId;

      console.log('[AviConnectionManager] Created Claude instance:', newInstanceId);

      // Step 2: Setup SSE connection
      await this.setupSSEConnection(newInstanceId);

      console.log('[AviConnectionManager] Successfully connected to Claude instance');

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Connection failed');

      console.error('[AviConnectionManager] Connection failed:', err);

      captureAsyncError(err, 'claude_instance_connection');
      this.emit('error', err, { instanceId: this.instanceId, retryAttempt: this.retryAttempt });

      this.updateState(ConnectionState.ERROR, err.message);
      this.metrics.errorCount++;

      // Schedule retry if within limits
      if (this.retryAttempt < this.config.maxRetries) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Force reconnection with cleanup
   */
  async forceReconnect(): Promise<void> {
    console.log('[AviConnectionManager] Force reconnecting...');

    this.cleanup();
    this.retryAttempt = 0;
    this.circuitBreakerState.failures = 0;
    this.circuitBreakerState.state = 'closed';

    // Clear cache to force fresh instance creation
    apiCache.delete('/api/claude/instances');

    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.connect();
  }

  /**
   * Disconnect from Claude instance
   */
  disconnect(): void {
    console.log('[AviConnectionManager] Disconnecting...');

    this.cleanup();
    this.updateState(ConnectionState.DISCONNECTED);
    this.emit('stateChange', ConnectionState.DISCONNECTED);
  }

  /**
   * Send message to Claude instance
   */
  async sendMessage(message: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.state !== ConnectionState.CONNECTED || !this.instanceId) {
        return {
          success: false,
          error: `Cannot send message: ${this.state === ConnectionState.CONNECTED ? 'no instance' : this.state}`
        };
      }

      if (!message.trim()) {
        return { success: false, error: 'Message cannot be empty' };
      }

      const startTime = Date.now();

      const result = await safePost<any>(
        `/api/claude/instances/${this.instanceId}/terminal/input`,
        { input: message.trim() + '\n' },
        {
          timeout: 30000,
          retries: 2,
          validateResponse: (data) => {
            const responseData = safeObject(data);
            return responseData.success === true;
          },
          onError: (error) => {
            this.metrics.errorCount++;
            this.updateCircuitBreaker(false);
            captureNetworkError(error, `/api/claude/instances/${this.instanceId}/terminal/input`, 'POST');
          }
        }
      );

      if (!result.isSuccess) {
        const errorMsg = result.error?.message || 'Failed to send message';
        this.emit('error', result.error || new Error(errorMsg), { operation: 'send_message' });
        return { success: false, error: errorMsg };
      }

      // Update metrics
      this.metrics.latency = Date.now() - startTime;
      this.updateCircuitBreaker(true);

      console.log('[AviConnectionManager] Message sent successfully');
      return { success: true };

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown send error');
      this.metrics.errorCount++;
      this.updateCircuitBreaker(false);

      captureAsyncError(err, 'message_send');
      this.emit('error', err, { operation: 'send_message' });

      return { success: false, error: err.message };
    }
  }

  /**
   * Get connection health status
   */
  getHealthStatus(): {
    isHealthy: boolean;
    state: ConnectionState;
    instanceId: string | null;
    uptime: number;
    lastHeartbeat: Date;
    circuitBreakerState: typeof this.circuitBreakerState;
    metrics: ConnectionMetrics;
  } {
    const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat.getTime();
    const isHealthy = this.state === ConnectionState.CONNECTED &&
                      timeSinceLastHeartbeat < this.config.heartbeatTimeout &&
                      this.circuitBreakerState.state === 'closed';

    return {
      isHealthy,
      state: this.state,
      instanceId: this.instanceId,
      uptime: this.metrics.uptime,
      lastHeartbeat: this.lastHeartbeat,
      circuitBreakerState: { ...this.circuitBreakerState },
      metrics: this.getMetrics()
    };
  }

  /**
   * Destroy the connection manager
   */
  destroy(): void {
    this.disconnect();
    this.listeners = {};
    this.messageBuffer = [];
  }
}

export default AviConnectionManager;