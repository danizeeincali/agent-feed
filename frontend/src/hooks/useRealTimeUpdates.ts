import { useState, useEffect, useCallback, useRef } from 'react';
import { RealTimeManager, ProductionRealTimeManager } from '../services/RealTimeManager';
import { ProductionWebSocketManager } from '../services/WebSocketManager';
import { ProductionSSEConnectionManager } from '../services/SSEConnectionManager';

interface UseRealTimeUpdatesOptions {
  enablePollingFallback?: boolean;
  strictRealTimeMode?: boolean;
  failureMode?: 'complete_failure' | 'graceful_degradation';
  validateAuthenticity?: boolean;
  rejectMockData?: boolean;
  enableOptimisticUpdates?: boolean;
  enableBatchProcessing?: boolean;
  batchMode?: 'atomic' | 'partial';
  maintainStrictOrdering?: boolean;
  allowReordering?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

interface ConnectionStatus {
  connected: boolean;
  transport: 'websocket' | 'sse' | null;
  fallbackActive: boolean;
  latency: number;
  url?: string;
  protocol?: string;
  error?: string;
}

interface UseRealTimeUpdatesReturn {
  isConnected: boolean;
  connectionState: ConnectionStatus | null;
  lastUpdate: any;
  error: string | null;
  canReceiveUpdates: boolean;
  connectionStatus?: ConnectionStatus;
  optimisticUpdates: any[];
  rejectedUpdates: any[];
  lastRollback?: { updateId: string };
  processedUpdates: any[];
  lastSequenceNumber: number;
  lastBatchResult?: { success: boolean; rollbackRequired?: boolean; processedCount?: number };
  hasPartialUpdates: boolean;
  subscribe: (event: string, callback: (data: any) => void) => () => void;
  applyOptimisticUpdate: (update: any) => void;
}

export const useRealTimeUpdates = (
  options: UseRealTimeUpdatesOptions = {}
): UseRealTimeUpdatesReturn => {
  const {
    enablePollingFallback = false,
    strictRealTimeMode = false,
    failureMode = 'graceful_degradation',
    validateAuthenticity = false,
    rejectMockData = false,
    enableOptimisticUpdates = false,
    enableBatchProcessing = false,
    batchMode = 'partial',
    maintainStrictOrdering = false,
    allowReordering = true,
    autoReconnect = true,
    reconnectInterval = 5000
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionStatus | null>(null);
  const [lastUpdate, setLastUpdate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<any[]>([]);
  const [rejectedUpdates, setRejectedUpdates] = useState<any[]>([]);
  const [lastRollback, setLastRollback] = useState<{ updateId: string } | undefined>();
  const [processedUpdates, setProcessedUpdates] = useState<any[]>([]);
  const [lastSequenceNumber, setLastSequenceNumber] = useState(0);
  const [lastBatchResult, setLastBatchResult] = useState<{ success: boolean; rollbackRequired?: boolean; processedCount?: number }>();
  const [hasPartialUpdates, setHasPartialUpdates] = useState(false);

  const realTimeManagerRef = useRef<RealTimeManager | null>(null);
  const subscriptionsRef = useRef<Map<string, Set<Function>>>(new Map());

  // Initialize RealTimeManager
  useEffect(() => {
    const wsManager = new ProductionWebSocketManager();
    const sseManager = new ProductionSSEConnectionManager();
    const rtManager = new ProductionRealTimeManager(wsManager, sseManager);
    
    realTimeManagerRef.current = rtManager;

    // Set up connection event handlers
    rtManager.subscribe('connected', () => {
      setIsConnected(true);
      setError(null);
      const status = rtManager.getConnectionStatus();
      setConnectionState(status);
    });

    rtManager.subscribe('disconnected', () => {
      setIsConnected(false);
      setConnectionState(null);
      
      if (strictRealTimeMode) {
        setError('Real-time connection permanently lost - no fallback available');
      }
    });

    rtManager.subscribe('error', (data) => {
      setError(data.error || 'Connection error');
      if (strictRealTimeMode && !enablePollingFallback) {
        setIsConnected(false);
        setConnectionState(null);
      }
    });

    // Set up update handlers
    rtManager.subscribe('agent_update', (update) => {
      if (validateAuthenticity) {
        const validation = rtManager.validateUpdate(update);
        if (!validation.valid) {
          setRejectedUpdates(prev => [...prev, { ...update, reason: validation.reason }]);
          return;
        }
      }

      if (maintainStrictOrdering) {
        const sequence = update.sequence || 0;
        if (sequence <= lastSequenceNumber && sequence !== 0) {
          setRejectedUpdates(prev => [...prev, {
            ...update,
            reason: `Out of sequence - expected sequence > ${lastSequenceNumber}, got ${sequence}`
          }]);
          return;
        }
        setLastSequenceNumber(sequence);
      }

      setLastUpdate(update);
      setProcessedUpdates(prev => [...prev, update]);
    });

    rtManager.subscribe('batch_failed', (data) => {
      setLastBatchResult({
        success: false,
        rollbackRequired: data.rollbackRequired,
        processedCount: data.processedCount || 0
      });
      setHasPartialUpdates(false); // Atomic failure
    });

    rtManager.subscribe('update_rejected', (data) => {
      setRejectedUpdates(prev => [...prev, data]);
    });

    rtManager.subscribe('server_response', (response) => {
      if (response.type === 'UPDATE_REJECTED' && response.rollbackRequired) {
        // Handle optimistic update rollback
        setOptimisticUpdates(prev => prev.filter(u => u.clientId !== response.originalUpdateId));
        setLastRollback({ updateId: response.originalUpdateId });
      }
    });

    // Attempt initial connection
    rtManager.connect().catch((err) => {
      setError(err.message);
      if (strictRealTimeMode) {
        setIsConnected(false);
      }
    });

    return () => {
      rtManager.disconnect();
    };
  }, [strictRealTimeMode, enablePollingFallback, validateAuthenticity, maintainStrictOrdering, lastSequenceNumber]);

  // Auto-reconnect logic
  useEffect(() => {
    if (!autoReconnect || isConnected || !realTimeManagerRef.current) return;

    const reconnectTimer = setInterval(() => {
      if (realTimeManagerRef.current && !isConnected) {
        realTimeManagerRef.current.reconnect().catch(() => {
          // Reconnection failed, will retry next interval
        });
      }
    }, reconnectInterval);

    return () => clearInterval(reconnectTimer);
  }, [autoReconnect, isConnected, reconnectInterval]);

  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    if (!subscriptionsRef.current.has(event)) {
      subscriptionsRef.current.set(event, new Set());
    }
    subscriptionsRef.current.get(event)!.add(callback);

    if (realTimeManagerRef.current) {
      return realTimeManagerRef.current.subscribe(event, callback);
    }

    return () => {
      const handlers = subscriptionsRef.current.get(event);
      if (handlers) {
        handlers.delete(callback);
      }
    };
  }, []);

  const applyOptimisticUpdate = useCallback((update: any) => {
    if (!enableOptimisticUpdates) return;

    const optimisticId = `client-update-${Date.now()}`;
    const optimisticUpdate = {
      ...update,
      optimistic: true,
      clientId: optimisticId,
      timestamp: new Date().toISOString()
    };

    setOptimisticUpdates(prev => [...prev, optimisticUpdate]);
    
    // Apply the update immediately for UI responsiveness
    setLastUpdate(optimisticUpdate);
  }, [enableOptimisticUpdates]);

  return {
    isConnected,
    connectionState,
    lastUpdate,
    error,
    canReceiveUpdates: isConnected,
    connectionStatus: connectionState,
    optimisticUpdates,
    rejectedUpdates,
    lastRollback,
    processedUpdates,
    lastSequenceNumber,
    lastBatchResult,
    hasPartialUpdates,
    subscribe,
    applyOptimisticUpdate
  };
};
