import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useRealTimeUpdates } from '../../src/hooks/useRealTimeUpdates';
import { RealTimeManager } from '../../src/services/RealTimeManager';
import { NotificationService } from '../../src/services/NotificationService';

// Mock real-time collaborators
const mockRealTimeManager = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  isConnected: jest.fn(),
  getConnectionStatus: jest.fn(),
  processIncomingUpdate: jest.fn(),
  validateUpdate: jest.fn()
};

const mockNotificationService = {
  showRealTimeNotification: jest.fn(),
  handleConnectionLoss: jest.fn(),
  displayUpdateError: jest.fn(),
  queuePendingNotification: jest.fn()
};

const mockUpdateProcessor = {
  processAgentUpdate: jest.fn(),
  processPostUpdate: jest.fn(),
  processMetricsUpdate: jest.fn(),
  processBatchUpdate: jest.fn(),
  validateUpdateIntegrity: jest.fn()
};

const mockFailureHandler = {
  handleUpdateFailure: jest.fn(),
  handleConnectionTimeout: jest.fn(),
  handleDataCorruption: jest.fn(),
  reportFailureToMonitoring: jest.fn()
};

const mockOptimisticUpdater = {
  applyOptimisticUpdate: jest.fn(),
  revertOptimisticUpdate: jest.fn(),
  confirmOptimisticUpdate: jest.fn(),
  hasOptimisticUpdates: jest.fn()
};

describe('TDD London School: Real-time Updates Without Fallbacks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Live Update Stream Processing', () => {
    it('should process real-time updates without fallback to polling', async () => {
      // Contract: Real-time updates only, no polling fallback mechanism
      const realTimeUpdate = {
        type: 'AGENT_STATUS_CHANGED',
        agentId: 'prod-agent-1',
        previousStatus: 'idle',
        newStatus: 'busy',
        timestamp: new Date().toISOString(),
        source: 'realtime_stream',
        updateId: 'update-12345'
      };

      mockRealTimeManager.isConnected.mockReturnValue(true);
      mockRealTimeManager.getConnectionStatus.mockReturnValue({
        connected: true,
        transport: 'websocket',
        fallbackActive: false,
        latency: 45
      });

      let updateHandler: ((update: any) => void) | null = null;
      mockRealTimeManager.subscribe.mockImplementation((event, handler) => {
        if (event === 'agent_update') {
          updateHandler = handler;
        }
        return () => {}; // unsubscribe function
      });

      mockUpdateProcessor.processAgentUpdate.mockImplementation((update) => {
        expect(update.source).toBe('realtime_stream');
        expect(update.type).toBe('AGENT_STATUS_CHANGED');
        return {
          success: true,
          agentId: update.agentId,
          statusChanged: true
        };
      });

      mockUpdateProcessor.validateUpdateIntegrity.mockReturnValue({
        valid: true,
        checksum: 'valid-checksum-abc123'
      });

      const { result } = renderHook(() => useRealTimeUpdates({
        enablePollingFallback: false,
        strictRealTimeMode: true
      }));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate real-time update
      if (updateHandler) {
        act(() => {
          updateHandler(realTimeUpdate);
        });
      }

      await waitFor(() => {
        expect(result.current.lastUpdate).not.toBeNull();
      });

      // Verify real-time processing without fallback
      expect(mockRealTimeManager.getConnectionStatus).toHaveBeenCalled();
      expect(result.current.connectionStatus?.fallbackActive).toBe(false);
      expect(mockUpdateProcessor.processAgentUpdate).toHaveBeenCalledWith(realTimeUpdate);
      expect(mockUpdateProcessor.validateUpdateIntegrity).toHaveBeenCalledWith(realTimeUpdate);
      
      // Verify no polling fallback was activated
      expect(result.current.lastUpdate?.source).toBe('realtime_stream');
      expect(result.current.lastUpdate?.transport).not.toBe('polling');
    });

    it('should fail completely when real-time connection is lost without fallback', async () => {
      // Contract: Complete failure when real-time is unavailable, no graceful degradation
      const connectionLossError = 'Real-time connection permanently lost - no fallback available';
      
      mockRealTimeManager.isConnected.mockReturnValueOnce(true).mockReturnValue(false);
      mockRealTimeManager.getConnectionStatus.mockReturnValue({
        connected: false,
        transport: null,
        fallbackActive: false,
        error: connectionLossError
      });

      mockFailureHandler.handleConnectionTimeout.mockReturnValue({
        canRecover: false,
        fallbackAvailable: false,
        actionRequired: 'manual_intervention'
      });

      mockNotificationService.handleConnectionLoss.mockImplementation((error) => {
        expect(error).toBe(connectionLossError);
      });

      const { result } = renderHook(() => useRealTimeUpdates({
        enablePollingFallback: false,
        strictRealTimeMode: true,
        failureMode: 'complete_failure'
      }));

      // Initially connected
      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate connection loss
      act(() => {
        mockRealTimeManager.isConnected.mockReturnValue(false);
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });

      // Verify complete failure without fallback
      expect(mockFailureHandler.handleConnectionTimeout).toHaveBeenCalled();
      expect(mockNotificationService.handleConnectionLoss).toHaveBeenCalledWith(connectionLossError);
      expect(result.current.error).toBe(connectionLossError);
      expect(result.current.connectionStatus?.fallbackActive).toBe(false);
      
      // Verify no updates are processed during disconnection
      expect(result.current.canReceiveUpdates).toBe(false);
    });

    it('should validate update authenticity without accepting mock/simulated data', async () => {
      // Contract: Real update validation, reject any simulated/mock updates
      const authenticUpdate = {
        type: 'POST_CREATED',
        postId: 'post-prod-123',
        agentId: 'real-agent-1',
        content: 'Real user-generated content',
        timestamp: new Date().toISOString(),
        source: 'realtime_stream',
        signature: 'sha256-real-signature-abc123',
        serverTimestamp: new Date().toISOString(),
        authenticityToken: 'real-server-token-xyz789'
      };

      const mockUpdate = {
        type: 'POST_CREATED',
        postId: 'mock-post-123',
        agentId: 'mock-agent-1',
        content: 'Mock generated content',
        timestamp: new Date().toISOString(),
        source: 'mock_generator',
        signature: 'mock-signature',
        serverTimestamp: null,
        authenticityToken: null
      };

      mockUpdateProcessor.validateUpdateIntegrity.mockImplementation((update) => {
        if (update.source === 'realtime_stream' && update.authenticityToken) {
          return { valid: true, authentic: true, checksum: 'valid' };
        }
        return { valid: false, authentic: false, reason: 'Invalid authenticity token' };
      });

      mockRealTimeManager.isConnected.mockReturnValue(true);
      
      let updateHandler: ((update: any) => void) | null = null;
      mockRealTimeManager.subscribe.mockImplementation((event, handler) => {
        updateHandler = handler;
        return () => {};
      });

      const { result } = renderHook(() => useRealTimeUpdates({
        validateAuthenticity: true,
        rejectMockData: true
      }));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Process authentic update
      if (updateHandler) {
        act(() => {
          updateHandler(authenticUpdate);
        });
      }

      await waitFor(() => {
        expect(result.current.lastUpdate).not.toBeNull();
      });

      // Verify authentic update was accepted
      expect(mockUpdateProcessor.validateUpdateIntegrity).toHaveBeenCalledWith(authenticUpdate);
      expect(result.current.lastUpdate?.postId).toBe('post-prod-123');

      // Attempt to process mock update
      if (updateHandler) {
        act(() => {
          updateHandler(mockUpdate);
        });
      }

      // Verify mock update was rejected
      expect(mockUpdateProcessor.validateUpdateIntegrity).toHaveBeenCalledWith(mockUpdate);
      expect(result.current.lastUpdate?.postId).not.toBe('mock-post-123');
      expect(result.current.rejectedUpdates).toContainEqual(
        expect.objectContaining({ reason: 'Invalid authenticity token' })
      );
    });
  });

  describe('Optimistic Updates with Rollback', () => {
    it('should apply optimistic updates and rollback on server rejection', async () => {
      // Contract: Optimistic updates with guaranteed rollback on server failure
      const optimisticUpdate = {
        type: 'LIKE_POST',
        postId: 'post-123',
        userId: 'user-456',
        action: 'like',
        optimistic: true,
        clientId: 'client-update-789'
      };

      const serverRejection = {
        type: 'UPDATE_REJECTED',
        originalUpdateId: 'client-update-789',
        reason: 'User already liked this post',
        rollbackRequired: true,
        timestamp: new Date().toISOString()
      };

      mockOptimisticUpdater.applyOptimisticUpdate.mockImplementation((update) => {
        expect(update.optimistic).toBe(true);
        return {
          applied: true,
          updateId: update.clientId,
          previousState: { liked: false, likeCount: 10 },
          newState: { liked: true, likeCount: 11 }
        };
      });

      mockOptimisticUpdater.revertOptimisticUpdate.mockImplementation((updateId) => {
        expect(updateId).toBe('client-update-789');
        return {
          reverted: true,
          restoredState: { liked: false, likeCount: 10 }
        };
      });

      mockRealTimeManager.isConnected.mockReturnValue(true);
      
      let updateHandler: ((update: any) => void) | null = null;
      mockRealTimeManager.subscribe.mockImplementation((event, handler) => {
        if (event === 'server_response') {
          updateHandler = handler;
        }
        return () => {};
      });

      const { result } = renderHook(() => useRealTimeUpdates({
        enableOptimisticUpdates: true
      }));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Apply optimistic update
      act(() => {
        result.current.applyOptimisticUpdate(optimisticUpdate);
      });

      expect(mockOptimisticUpdater.applyOptimisticUpdate).toHaveBeenCalledWith(optimisticUpdate);
      expect(result.current.optimisticUpdates).toContainEqual(
        expect.objectContaining({ clientId: 'client-update-789' })
      );

      // Simulate server rejection
      if (updateHandler) {
        act(() => {
          updateHandler(serverRejection);
        });
      }

      await waitFor(() => {
        expect(mockOptimisticUpdater.revertOptimisticUpdate)
          .toHaveBeenCalledWith('client-update-789');
      });

      // Verify rollback occurred
      expect(result.current.optimisticUpdates).not.toContainEqual(
        expect.objectContaining({ clientId: 'client-update-789' })
      );
      expect(result.current.lastRollback?.updateId).toBe('client-update-789');
    });
  });

  describe('Batch Update Processing', () => {
    it('should process batch updates atomically without partial failures', async () => {
      // Contract: All-or-nothing batch processing, no partial update states
      const batchUpdate = {
        type: 'BATCH_UPDATE',
        batchId: 'batch-456',
        updates: [
          { type: 'AGENT_STATUS', agentId: 'agent-1', status: 'busy' },
          { type: 'AGENT_STATUS', agentId: 'agent-2', status: 'idle' },
          { type: 'METRICS_UPDATE', systemLoad: 85.5 }
        ],
        atomic: true,
        timestamp: new Date().toISOString()
      };

      const batchFailure = {
        type: 'BATCH_FAILED',
        batchId: 'batch-456',
        failedAt: 1, // Second update failed
        reason: 'Agent not found: agent-2',
        rollbackAll: true
      };

      mockUpdateProcessor.processBatchUpdate.mockImplementation((batch) => {
        if (batch.batchId === 'batch-456') {
          // Simulate failure at second update
          return {
            success: false,
            processedCount: 1,
            failedAt: 1,
            error: 'Agent not found: agent-2',
            rollbackRequired: true
          };
        }
        return { success: true, processedCount: batch.updates.length };
      });

      mockRealTimeManager.isConnected.mockReturnValue(true);
      
      let batchHandler: ((batch: any) => void) | null = null;
      mockRealTimeManager.subscribe.mockImplementation((event, handler) => {
        if (event === 'batch_update') {
          batchHandler = handler;
        }
        return () => {};
      });

      const { result } = renderHook(() => useRealTimeUpdates({
        enableBatchProcessing: true,
        batchMode: 'atomic'
      }));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Process batch update
      if (batchHandler) {
        act(() => {
          batchHandler(batchUpdate);
        });
      }

      await waitFor(() => {
        expect(mockUpdateProcessor.processBatchUpdate).toHaveBeenCalledWith(batchUpdate);
      });

      // Verify atomic failure - no partial updates applied
      expect(result.current.lastBatchResult?.success).toBe(false);
      expect(result.current.lastBatchResult?.rollbackRequired).toBe(true);
      expect(result.current.lastBatchResult?.processedCount).toBe(1);
      
      // Verify no partial state exists
      expect(result.current.hasPartialUpdates).toBe(false);
    });
  });

  describe('Update Ordering and Consistency', () => {
    it('should maintain strict update ordering without reordering fallback', async () => {
      // Contract: Strict chronological order, fail if out-of-order updates detected
      const orderedUpdates = [
        { id: 'update-1', timestamp: '2023-12-01T10:00:00.000Z', sequence: 1 },
        { id: 'update-2', timestamp: '2023-12-01T10:00:01.000Z', sequence: 2 },
        { id: 'update-3', timestamp: '2023-12-01T10:00:02.000Z', sequence: 3 }
      ];

      const outOfOrderUpdate = {
        id: 'update-1.5',
        timestamp: '2023-12-01T10:00:00.500Z',
        sequence: 1.5 // Arrives after update-3
      };

      mockUpdateProcessor.validateUpdateIntegrity.mockImplementation((update) => {
        // Reject out-of-order updates
        if (update.id === 'update-1.5') {
          return {
            valid: false,
            reason: 'Out of sequence - expected sequence > 3, got 1.5'
          };
        }
        return { valid: true };
      });

      mockRealTimeManager.isConnected.mockReturnValue(true);
      
      let updateHandler: ((update: any) => void) | null = null;
      mockRealTimeManager.subscribe.mockImplementation((event, handler) => {
        updateHandler = handler;
        return () => {};
      });

      const { result } = renderHook(() => useRealTimeUpdates({
        maintainStrictOrdering: true,
        allowReordering: false
      }));

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Process updates in order
      if (updateHandler) {
        for (const update of orderedUpdates) {
          act(() => {
            updateHandler(update);
          });
        }
      }

      // Attempt out-of-order update
      if (updateHandler) {
        act(() => {
          updateHandler(outOfOrderUpdate);
        });
      }

      // Verify strict ordering maintained
      expect(result.current.processedUpdates).toHaveLength(3);
      expect(result.current.rejectedUpdates).toContainEqual(
        expect.objectContaining({ 
          id: 'update-1.5',
          reason: 'Out of sequence - expected sequence > 3, got 1.5'
        })
      );
      expect(result.current.lastSequenceNumber).toBe(3);
    });
  });
});
