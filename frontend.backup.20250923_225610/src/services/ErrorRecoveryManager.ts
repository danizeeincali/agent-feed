/**
 * Error Recovery Manager - Robust SSE Connection Recovery
 * Handles connection failures, message loss, and automatic recovery with exponential backoff
 */

export interface RecoveryState {
  instanceId: string;
  isRecovering: boolean;
  retryAttempts: number;
  maxRetries: number;
  nextRetryTime: number;
  lastError: string | null;
  backoffMs: number;
  lastSuccessTime: number;
  totalFailures: number;
  recoveryStartTime: number;
}

export interface RecoveryMetrics {
  totalRecoveryAttempts: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  averageRecoveryTime: number;
  connectionUptime: number;
}

export interface RecoveryOptions {
  maxRetries?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  backoffMultiplier?: number;
  enableBackfill?: boolean;
  healthCheckInterval?: number;
}

type RecoveryCallback = (instanceId: string, state: RecoveryState) => void;
type ReconnectionHandler = (instanceId: string) => Promise<void>;

export class ErrorRecoveryManager {
  private recoveryStates = new Map<string, RecoveryState>();
  private recoveryCallbacks = new Set<RecoveryCallback>();
  private reconnectionHandlers = new Set<ReconnectionHandler>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly DEFAULT_OPTIONS: Required<RecoveryOptions> = {
    maxRetries: 5,
    baseBackoffMs: 1000,
    maxBackoffMs: 30000,
    backoffMultiplier: 2,
    enableBackfill: true,
    healthCheckInterval: 10000 // 10 seconds
  };
  
  private options: Required<RecoveryOptions>;
  private metrics: RecoveryMetrics = {
    totalRecoveryAttempts: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    averageRecoveryTime: 0,
    connectionUptime: 0
  };
  
  private recoveryTimes: number[] = [];
  
  constructor(options: RecoveryOptions = {}) {
    this.options = { ...this.DEFAULT_OPTIONS, ...options };
    this.startHealthCheck();
  }
  
  /**
   * Handle SSE connection failure with intelligent recovery
   */
  async handleConnectionFailure(instanceId: string, error: Event | Error, context?: any): Promise<void> {
    const errorMessage = this.extractErrorMessage(error);
    console.warn(`Connection failure for ${instanceId}: ${errorMessage}`);
    
    const state = this.getOrCreateRecoveryState(instanceId);
    state.lastError = errorMessage;
    state.isRecovering = true;
    state.totalFailures++;
    
    if (state.retryAttempts === 0) {
      state.recoveryStartTime = Date.now();
      this.metrics.totalRecoveryAttempts++;
    }
    
    // Check if we've exceeded max retries
    if (state.retryAttempts >= state.maxRetries) {
      console.error(`Max retries (${state.maxRetries}) exceeded for ${instanceId}`);
      await this.handleFinalFailure(instanceId, state);
      return;
    }
    
    // Calculate backoff delay
    const backoffMs = this.calculateBackoff(state.retryAttempts);
    state.backoffMs = backoffMs;
    state.nextRetryTime = Date.now() + backoffMs;
    state.retryAttempts++;
    
    console.info(`Scheduling recovery attempt ${state.retryAttempts}/${state.maxRetries} for ${instanceId} in ${backoffMs}ms`);
    
    // Notify callbacks
    this.notifyRecoveryCallbacks(instanceId, state);
    
    // Schedule recovery attempt
    setTimeout(async () => {
      await this.attemptRecovery(instanceId);
    }, backoffMs);
  }
  
  /**
   * Handle successful connection recovery
   */
  handleRecoverySuccess(instanceId: string): void {
    const state = this.recoveryStates.get(instanceId);
    if (!state || !state.isRecovering) {
      return;
    }
    
    const recoveryTime = Date.now() - state.recoveryStartTime;
    console.info(`Recovery successful for ${instanceId} after ${recoveryTime}ms and ${state.retryAttempts} attempts`);
    
    // Update metrics
    this.metrics.successfulRecoveries++;
    this.recoveryTimes.push(recoveryTime);
    this.updateAverageRecoveryTime();
    
    // Reset recovery state
    state.isRecovering = false;
    state.retryAttempts = 0;
    state.lastError = null;
    state.lastSuccessTime = Date.now();
    
    // Notify callbacks
    this.notifyRecoveryCallbacks(instanceId, state);
  }
  
  /**
   * Detect and recover from message sequence gaps
   */
  async handleSequenceGap(instanceId: string, expectedSequence: number, receivedSequence: number): Promise<void> {
    console.warn(`Message sequence gap detected for ${instanceId}: expected ${expectedSequence}, received ${receivedSequence}`);
    
    if (!this.options.enableBackfill) {
      console.info('Backfill disabled, skipping sequence gap recovery');
      return;
    }
    
    try {
      const success = await this.requestBackfill(instanceId, expectedSequence, receivedSequence - 1);
      
      if (success) {
        console.info(`Backfill successful for ${instanceId}, gap filled`);
      } else {
        console.warn(`Backfill failed for ${instanceId}, may have missing messages`);
        // Consider triggering full reconnection if critical
        await this.handleConnectionFailure(instanceId, new Error('Backfill failed'), { sequenceGap: true });
      }
      
    } catch (error) {
      console.error(`Backfill error for ${instanceId}:`, error);
      await this.handleConnectionFailure(instanceId, error as Error, { sequenceGap: true });
    }
  }
  
  /**
   * Force recovery attempt for an instance
   */
  async forceRecovery(instanceId: string): Promise<void> {
    console.info(`Forcing recovery for ${instanceId}`);
    
    const state = this.getOrCreateRecoveryState(instanceId);
    
    // Reset retry count to allow immediate retry
    state.retryAttempts = 0;
    state.isRecovering = true;
    state.recoveryStartTime = Date.now();
    
    await this.attemptRecovery(instanceId);
  }
  
  /**
   * Get recovery state for instance
   */
  getRecoveryState(instanceId: string): RecoveryState | null {
    return this.recoveryStates.get(instanceId) || null;
  }
  
  /**
   * Check if instance is currently recovering
   */
  isRecovering(instanceId: string): boolean {
    const state = this.recoveryStates.get(instanceId);
    return state ? state.isRecovering : false;
  }
  
  /**
   * Get overall recovery metrics
   */
  getMetrics(): RecoveryMetrics {
    return { ...this.metrics };
  }
  
  /**
   * Add recovery state change callback
   */
  onRecoveryStateChange(callback: RecoveryCallback): () => void {
    this.recoveryCallbacks.add(callback);
    return () => this.recoveryCallbacks.delete(callback);
  }
  
  /**
   * Add reconnection handler
   */
  addReconnectionHandler(handler: ReconnectionHandler): () => void {
    this.reconnectionHandlers.add(handler);
    return () => this.reconnectionHandlers.delete(handler);
  }
  
  /**
   * Clear recovery state for instance
   */
  clearInstance(instanceId: string): void {
    this.recoveryStates.delete(instanceId);
    console.debug(`Cleared recovery state for instance: ${instanceId}`);
  }
  
  /**
   * Update recovery options
   */
  updateOptions(options: RecoveryOptions): void {
    this.options = { ...this.options, ...options };
    console.info('Recovery options updated:', options);
  }
  
  /**
   * Perform health check on all connections
   */
  performHealthCheck(): void {
    const now = Date.now();
    
    for (const [instanceId, state] of this.recoveryStates.entries()) {
      // Check for stale recovering states
      if (state.isRecovering && (now - state.recoveryStartTime > 300000)) { // 5 minutes
        console.warn(`Recovery timeout for ${instanceId}, marking as failed`);
        this.handleFinalFailure(instanceId, state);
        continue;
      }
      
      // Update connection uptime
      if (!state.isRecovering && state.lastSuccessTime > 0) {
        this.metrics.connectionUptime = now - state.lastSuccessTime;
      }
    }
  }
  
  /**
   * Shutdown and cleanup
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.recoveryStates.clear();
    this.recoveryCallbacks.clear();
    this.reconnectionHandlers.clear();
    
    console.log('ErrorRecoveryManager shutdown completed');
  }
  
  private async attemptRecovery(instanceId: string): Promise<void> {
    const state = this.recoveryStates.get(instanceId);
    if (!state || !state.isRecovering) {
      return;
    }
    
    console.info(`Attempting recovery for ${instanceId} (attempt ${state.retryAttempts}/${state.maxRetries})`);
    
    try {
      // Execute all registered reconnection handlers
      const reconnectionPromises = Array.from(this.reconnectionHandlers).map(handler => 
        handler(instanceId).catch(error => {
          console.error(`Reconnection handler failed for ${instanceId}:`, error);
          throw error;
        })
      );
      
      // Wait for all handlers to complete
      await Promise.all(reconnectionPromises);
      
      // If we get here, recovery was successful
      this.handleRecoverySuccess(instanceId);
      
    } catch (error) {
      console.error(`Recovery attempt failed for ${instanceId}:`, error);
      
      // Schedule next retry or give up
      if (state.retryAttempts < state.maxRetries) {
        await this.handleConnectionFailure(instanceId, error as Error);
      } else {
        await this.handleFinalFailure(instanceId, state);
      }
    }
  }
  
  private async requestBackfill(instanceId: string, fromSequence: number, toSequence: number): Promise<boolean> {
    try {
      const response = await fetch(`/api/claude/instances/${instanceId}/backfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromSequence,
          toSequence,
          timestamp: Date.now()
        })
      });
      
      if (!response.ok) {
        throw new Error(`Backfill request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.messages) {
        console.info(`Backfilled ${data.messages.length} messages for ${instanceId}`);
        
        // Process backfilled messages (would need to integrate with message processor)
        // This is a placeholder - actual implementation would depend on your message processing system
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error(`Backfill request error for ${instanceId}:`, error);
      return false;
    }
  }
  
  private async handleFinalFailure(instanceId: string, state: RecoveryState): Promise<void> {
    console.error(`Final failure for ${instanceId} after ${state.retryAttempts} attempts`);
    
    state.isRecovering = false;
    this.metrics.failedRecoveries++;
    
    // Notify callbacks of final failure
    this.notifyRecoveryCallbacks(instanceId, state);
    
    // Could emit a final failure event here for UI notification
  }
  
  private calculateBackoff(attempt: number): number {
    const backoff = this.options.baseBackoffMs * Math.pow(this.options.backoffMultiplier, attempt);
    return Math.min(backoff, this.options.maxBackoffMs);
  }
  
  private getOrCreateRecoveryState(instanceId: string): RecoveryState {
    if (!this.recoveryStates.has(instanceId)) {
      this.recoveryStates.set(instanceId, {
        instanceId,
        isRecovering: false,
        retryAttempts: 0,
        maxRetries: this.options.maxRetries,
        nextRetryTime: 0,
        lastError: null,
        backoffMs: 0,
        lastSuccessTime: Date.now(),
        totalFailures: 0,
        recoveryStartTime: 0
      });
    }
    
    return this.recoveryStates.get(instanceId)!;
  }
  
  private extractErrorMessage(error: Event | Error): string {
    if (error instanceof Error) {
      return error.message;
    }
    
    if ('target' in error && error.target) {
      const target = error.target as any;
      if (target.readyState === EventSource.CLOSED) {
        return 'SSE connection closed';
      }
      if (target.readyState === EventSource.CONNECTING) {
        return 'SSE connection failed during reconnection';
      }
    }
    
    return 'Unknown connection error';
  }
  
  private notifyRecoveryCallbacks(instanceId: string, state: RecoveryState): void {
    this.recoveryCallbacks.forEach(callback => {
      try {
        callback(instanceId, state);
      } catch (error) {
        console.error('Recovery callback error:', error);
      }
    });
  }
  
  private updateAverageRecoveryTime(): void {
    if (this.recoveryTimes.length > 0) {
      this.metrics.averageRecoveryTime = this.recoveryTimes.reduce((sum, time) => sum + time, 0) / this.recoveryTimes.length;
    }
    
    // Limit recovery time history
    if (this.recoveryTimes.length > 50) {
      this.recoveryTimes = this.recoveryTimes.slice(-25);
    }
  }
  
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.options.healthCheckInterval);
  }
}

export default ErrorRecoveryManager;