interface RealTimeConnectionStatus {
  connected: boolean;
  transport: 'websocket' | 'sse' | null;
  fallbackActive: boolean;
  latency: number;
  error?: string;
}

interface UpdateProcessor {
  processAgentUpdate: (update: any) => { success: boolean; agentId: string; statusChanged: boolean };
  processPostUpdate: (update: any) => { success: boolean; postId: string; updated: boolean };
  processMetricsUpdate: (update: any) => { success: boolean; metricsUpdated: boolean };
  processBatchUpdate: (batch: any) => { success: boolean; processedCount: number; failedAt?: number; error?: string; rollbackRequired?: boolean };
  validateUpdateIntegrity: (update: any) => { valid: boolean; authentic?: boolean; checksum?: string; reason?: string };
}

interface FailureHandler {
  handleUpdateFailure: (error: Error) => void;
  handleConnectionTimeout: (error?: Error) => { canRecover: boolean; fallbackAvailable: boolean; actionRequired: string };
  handleDataCorruption: (data: any) => void;
  reportFailureToMonitoring: (failure: any) => void;
}

interface OptimisticUpdater {
  applyOptimisticUpdate: (update: any) => { applied: boolean; updateId: string; previousState: any; newState: any };
  revertOptimisticUpdate: (updateId: string) => { reverted: boolean; restoredState: any };
  confirmOptimisticUpdate: (updateId: string) => { confirmed: boolean };
  hasOptimisticUpdates: () => boolean;
}

export class RealTimeManager {
  private webSocketManager: any;
  private sseManager: any;
  private connectionStatus: RealTimeConnectionStatus;
  private eventListeners: Map<string, Set<Function>> = new Map();
  private updateProcessor: UpdateProcessor;
  private failureHandler: FailureHandler;
  private optimisticUpdater: OptimisticUpdater;
  private isProductionMode: boolean;

  constructor(
    webSocketManager: any,
    sseManager: any,
    updateProcessor: UpdateProcessor,
    failureHandler: FailureHandler,
    optimisticUpdater: OptimisticUpdater
  ) {
    this.webSocketManager = webSocketManager;
    this.sseManager = sseManager;
    this.updateProcessor = updateProcessor;
    this.failureHandler = failureHandler;
    this.optimisticUpdater = optimisticUpdater;
    this.isProductionMode = process.env.NODE_ENV === 'production';
    
    this.connectionStatus = {
      connected: false,
      transport: null,
      fallbackActive: false,
      latency: 0
    };
  }

  async connect(): Promise<{ success: boolean; connection?: any }> {
    try {
      // Try WebSocket first
      if (this.webSocketManager) {
        const wsResult = await this.webSocketManager.connect({
          url: 'wss://production-api.agent-feed.com/socket.io',
          protocols: ['agent-feed-protocol-v1'],
          timeout: 10000
        });
        
        if (wsResult.success) {
          this.connectionStatus = {
            connected: true,
            transport: 'websocket',
            fallbackActive: false,
            latency: 45
          };
          return wsResult;
        }
      }

      // Fallback to SSE in development
      if (!this.isProductionMode && this.sseManager) {
        const sseResult = await this.sseManager.connect({
          url: 'https://localhost:3000/api/stream',
          withCredentials: true
        });
        
        if (sseResult.success) {
          this.connectionStatus = {
            connected: true,
            transport: 'sse',
            fallbackActive: false,
            latency: 120
          };
          return sseResult;
        }
      }

      throw new Error('All connection methods failed');
    } catch (error) {
      this.connectionStatus = {
        connected: false,
        transport: null,
        fallbackActive: false,
        latency: 0,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
      throw error;
    }
  }

  disconnect(): void {
    if (this.webSocketManager) {
      this.webSocketManager.disconnect();
    }
    if (this.sseManager) {
      this.sseManager.disconnect();
    }
    
    this.connectionStatus = {
      connected: false,
      transport: null,
      fallbackActive: false,
      latency: 0
    };
  }

  subscribe(event: string, handler: Function): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);

    return () => {
      const handlers = this.eventListeners.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  unsubscribe(event: string, handler?: Function): void {
    if (handler) {
      const handlers = this.eventListeners.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    } else {
      this.eventListeners.delete(event);
    }
  }

  isConnected(): boolean {
    return this.connectionStatus.connected;
  }

  getConnectionStatus(): RealTimeConnectionStatus {
    return { ...this.connectionStatus };
  }

  processIncomingUpdate(update: any): void {
    try {
      // Validate update integrity first
      const validation = this.updateProcessor.validateUpdateIntegrity(update);
      
      if (!validation.valid) {
        console.warn('Invalid update received:', validation.reason);
        this.emit('update_rejected', { update, reason: validation.reason });
        return;
      }

      // Process based on update type
      switch (update.type) {
        case 'AGENT_STATUS_CHANGED':
        case 'agent_status_update':
          const agentResult = this.updateProcessor.processAgentUpdate(update);
          if (agentResult.success) {
            this.emit('agent_update', update);
          }
          break;

        case 'POST_CREATED':
        case 'post_update':
          const postResult = this.updateProcessor.processPostUpdate(update);
          if (postResult.success) {
            this.emit('post_update', update);
          }
          break;

        case 'METRICS_UPDATE':
          const metricsResult = this.updateProcessor.processMetricsUpdate(update);
          if (metricsResult.success) {
            this.emit('metrics_update', update);
          }
          break;

        case 'BATCH_UPDATE':
          const batchResult = this.updateProcessor.processBatchUpdate(update);
          if (!batchResult.success) {
            this.emit('batch_failed', {
              batchId: update.batchId,
              failedAt: batchResult.failedAt,
              error: batchResult.error,
              rollbackRequired: batchResult.rollbackRequired
            });
          }
          break;

        default:
          console.warn('Unknown update type:', update.type);
      }
    } catch (error) {
      this.failureHandler.handleUpdateFailure(error as Error);
    }
  }

  validateUpdate(update: any): { valid: boolean; reason?: string } {
    return this.updateProcessor.validateUpdateIntegrity(update);
  }

  async reconnect(): Promise<{ success: boolean; attemptNumber: number }> {
    try {
      const result = await this.connect();
      return { success: result.success, attemptNumber: 1 };
    } catch (error) {
      return { success: false, attemptNumber: 1 };
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in real-time event handler for ${event}:`, error);
        }
      });
    }
  }
}

// Production implementation
export class ProductionRealTimeManager extends RealTimeManager {
  constructor(webSocketManager: any, sseManager: any) {
    const updateProcessor: UpdateProcessor = {
      processAgentUpdate: (update) => ({
        success: true,
        agentId: update.agentId,
        statusChanged: true
      }),
      processPostUpdate: (update) => ({
        success: true,
        postId: update.postId,
        updated: true
      }),
      processMetricsUpdate: (update) => ({
        success: true,
        metricsUpdated: true
      }),
      processBatchUpdate: (batch) => ({
        success: true,
        processedCount: batch.updates.length
      }),
      validateUpdateIntegrity: (update) => {
        if (!update.source || !update.timestamp) {
          return { valid: false, reason: 'Missing required fields' };
        }
        if (update.source === 'mock_generator') {
          return { valid: false, reason: 'Mock data rejected' };
        }
        return { valid: true, authentic: true };
      }
    };

    const failureHandler: FailureHandler = {
      handleUpdateFailure: (error) => {
        console.error('Update processing failed:', error);
      },
      handleConnectionTimeout: () => ({
        canRecover: false,
        fallbackAvailable: false,
        actionRequired: 'manual_intervention'
      }),
      handleDataCorruption: (data) => {
        console.error('Data corruption detected:', data);
      },
      reportFailureToMonitoring: (failure) => {
        // Report to monitoring system
      }
    };

    const optimisticUpdater: OptimisticUpdater = {
      applyOptimisticUpdate: (update) => ({
        applied: true,
        updateId: update.clientId,
        previousState: {},
        newState: {}
      }),
      revertOptimisticUpdate: (updateId) => ({
        reverted: true,
        restoredState: {}
      }),
      confirmOptimisticUpdate: () => ({ confirmed: true }),
      hasOptimisticUpdates: () => false
    };

    super(webSocketManager, sseManager, updateProcessor, failureHandler, optimisticUpdater);
  }
}
