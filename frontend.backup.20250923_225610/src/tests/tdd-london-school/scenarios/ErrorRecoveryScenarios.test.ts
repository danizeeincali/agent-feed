/**
 * Error Recovery Scenarios - London School TDD Approach
 * Tests error handling and recovery mechanisms for WebSocket to HTTP+SSE migration
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { MockEventSource, EventSourceMockFactory } from '../mocks/EventSourceMock';
import { FetchMock, FetchMockFactory } from '../mocks/FetchMock';
import { MockConnectionManager, ConnectionContractFactory } from '../contracts/ConnectionStateContracts';

describe('Error Recovery Scenarios - London School TDD', () => {
  let mockEventSource: MockEventSource;
  let mockFetch: FetchMock;
  let mockConnectionManager: MockConnectionManager;
  
  // Mock Dependencies - London School Pattern
  let mockTerminalComponent: any;
  let mockErrorBoundary: any;
  let mockNotificationService: any;
  let mockMetricsCollector: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock collaborators
    mockEventSource = EventSourceMockFactory.createDisconnectedMock('ws://localhost:3000');
    mockFetch = FetchMockFactory.createSuccessMock();
    mockConnectionManager = ConnectionContractFactory.createHybridContract();
    
    // Mock external dependencies
    mockTerminalComponent = {
      showError: jest.fn(),
      showReconnecting: jest.fn(),
      clearError: jest.fn(),
      updateConnectionStatus: jest.fn()
    };
    
    mockErrorBoundary = {
      captureError: jest.fn(),
      showFallbackUI: jest.fn(),
      resetErrorBoundary: jest.fn()
    };
    
    mockNotificationService = {
      showError: jest.fn(),
      showSuccess: jest.fn(),
      showWarning: jest.fn()
    };
    
    mockMetricsCollector = {
      recordError: jest.fn(),
      recordReconnection: jest.fn(),
      recordLatency: jest.fn()
    };
  });

  afterEach(() => {
    mockEventSource?.close();
    mockFetch?.clearHistory();
  });

  describe('Network Connection Failures', () => {
    it('should handle SSE connection timeout and fallback to HTTP', async () => {
      // London School - Setup mock interactions
      const slowEventSource = EventSourceMockFactory.createSlowMock('ws://localhost:3000', 10000);
      const httpFallback = FetchMockFactory.createTerminalMock();
      
      // Configure connection manager with timeout
      mockConnectionManager.setMockCollaborators({
        eventSource: slowEventSource,
        fetch: httpFallback
      });

      // Test the outside-in behavior
      const connectionPromise = mockConnectionManager.connect({
        url: 'ws://localhost:3000',
        timeout: 1000,
        enableAutoReconnect: true
      });

      // Should initially attempt SSE connection
      expect(mockConnectionManager.getConnectionState().status).toBe('connecting');
      
      // Wait for timeout and fallback
      await expect(connectionPromise).resolves.toBeUndefined();
      
      // Verify fallback to HTTP was attempted
      const httpRequests = httpFallback.getRequestsTo('/api/terminal/connect');
      expect(httpRequests).toHaveLength(1);
      
      // Verify error handling collaboration
      expect(mockErrorBoundary.captureError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('timeout')
        })
      );
      
      // Verify user notification
      expect(mockNotificationService.showWarning).toHaveBeenCalledWith(
        'Connection slow, switching to backup mode'
      );
    });

    it('should handle network disconnection with exponential backoff', async () => {
      // London School - Setup progressive failure mock
      const failingEventSource = EventSourceMockFactory.createFailingMock('ws://localhost:3000');
      
      mockConnectionManager.setMockCollaborators({
        eventSource: failingEventSource
      });

      // Attempt initial connection
      await expect(mockConnectionManager.connect({
        url: 'ws://localhost:3000',
        maxReconnectAttempts: 3,
        reconnectDelay: 100
      })).rejects.toThrow();

      // Verify error handling sequence
      expect(mockConnectionManager.handleConnectionErrorMock).toHaveBeenCalledTimes(1);
      
      // Simulate automatic reconnection attempts
      const reconnectPromises = [
        mockConnectionManager.reconnect(),
        mockConnectionManager.reconnect(),
        mockConnectionManager.reconnect()
      ];

      // All should fail but be handled gracefully
      await Promise.allSettled(reconnectPromises);
      
      // Verify exponential backoff behavior through mock interactions
      expect(mockConnectionManager.reconnectMock).toHaveBeenCalledTimes(3);
      expect(mockConnectionManager.getConnectionState().reconnectAttempts).toBe(3);
      
      // Verify metrics collection
      expect(mockMetricsCollector.recordError).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should handle partial message corruption with recovery', async () => {
      // London School - Setup message corruption scenario
      mockEventSource = EventSourceMockFactory.createConnectedMock('ws://localhost:3000');
      
      const mockMessageHandler = jest.fn();
      const mockErrorRecovery = jest.fn();
      
      mockConnectionManager.addEventListener('message', mockMessageHandler);
      mockConnectionManager.addEventListener('message:corrupted', mockErrorRecovery);
      
      // Send valid message first
      mockEventSource.mockMessage({
        type: 'terminal_output',
        data: 'valid command output'
      });
      
      // Send corrupted message
      mockEventSource.mockMessage('{"invalid": json}'); // Malformed JSON
      
      // Send another valid message
      mockEventSource.mockMessage({
        type: 'terminal_output',
        data: 'recovery successful'
      });
      
      // Verify message handling contract
      expect(mockMessageHandler).toHaveBeenCalledTimes(2); // Only valid messages
      expect(mockErrorRecovery).toHaveBeenCalledTimes(1); // Corruption detected
      
      // Verify error boundary interaction
      expect(mockErrorBoundary.captureError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Message parsing failed')
        })
      );
      
      // Verify UI feedback
      expect(mockTerminalComponent.showError).toHaveBeenCalledWith(
        'Message corruption detected, connection still stable'
      );
    });
  });

  describe('Server-Side Error Handling', () => {
    it('should handle 500 server errors with graceful degradation', async () => {
      // London School - Setup server error mock
      const errorFetch = FetchMockFactory.createErrorMock(500);
      
      mockConnectionManager.setMockCollaborators({
        fetch: errorFetch
      });
      
      // Attempt to send command during server error
      await mockConnectionManager.connect({
        url: 'http://localhost:3000',
        type: 'http'
      });
      
      await expect(mockConnectionManager.sendMessage({
        type: 'command',
        data: 'ls -la'
      })).rejects.toThrow();
      
      // Verify error was captured and handled
      const serverErrorRequests = errorFetch.getRequestHistory();
      expect(serverErrorRequests).toHaveLength(2); // Connect + send message
      
      // Verify graceful degradation
      expect(mockTerminalComponent.showError).toHaveBeenCalledWith(
        expect.stringContaining('Server error (500)')
      );
      
      expect(mockNotificationService.showError).toHaveBeenCalledWith(
        'Command failed, please try again'
      );
      
      // Verify metrics collection
      expect(mockMetricsCollector.recordError).toHaveBeenCalledWith({
        type: 'server_error',
        status: 500,
        endpoint: expect.any(String)
      });
    });

    it('should handle authentication failures with re-authentication', async () => {
      // London School - Setup auth failure sequence
      const authFetch = new FetchMock();
      
      // First request fails with 401
      authFetch.mockErrorResponse('/api/terminal/connect', 401, {
        error: 'Authentication required'
      });
      
      // Second request succeeds after re-auth
      authFetch.mockSuccessResponse('/api/terminal/connect', {
        success: true,
        terminalId: 'reauth-terminal-123'
      });
      
      // Mock authentication service
      const mockAuthService = {
        refreshToken: jest.fn().mockResolvedValue('new-token'),
        isTokenValid: jest.fn().mockReturnValue(false)
      };
      
      mockConnectionManager.setMockCollaborators({
        fetch: authFetch,
        authService: mockAuthService
      });
      
      // Initial connection should fail then succeed
      await mockConnectionManager.connect({
        url: 'http://localhost:3000'
      });
      
      // Verify re-authentication sequence
      expect(mockAuthService.refreshToken).toHaveBeenCalled();
      
      const authRequests = authFetch.getRequestsTo('/api/terminal/connect');
      expect(authRequests).toHaveLength(2);
      
      // First request should not have valid auth
      // Second request should have refreshed token
      expect(authRequests[1].headers.authorization).toBeTruthy();
      
      // Verify user was notified of re-authentication
      expect(mockNotificationService.showWarning).toHaveBeenCalledWith(
        'Session expired, reconnecting...'
      );
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle memory pressure with connection throttling', async () => {
      // London School - Setup memory pressure mock
      const memoryPressureFetch = new FetchMock();
      
      // Simulate progressive memory exhaustion
      memoryPressureFetch.mockErrorResponse('/api/terminal/connect', 503, {
        error: 'Service temporarily unavailable - high load'
      });
      
      const mockResourceMonitor = {
        getMemoryUsage: jest.fn().mockReturnValue({ used: 0.95, available: 0.05 }),
        shouldThrottleConnections: jest.fn().mockReturnValue(true),
        getThrottleDelay: jest.fn().mockReturnValue(5000)
      };
      
      mockConnectionManager.setMockCollaborators({
        fetch: memoryPressureFetch,
        resourceMonitor: mockResourceMonitor
      });
      
      // Connection should be throttled due to memory pressure
      const connectionStart = Date.now();
      
      await expect(mockConnectionManager.connect({
        url: 'http://localhost:3000'
      })).rejects.toThrow();
      
      // Verify throttling was applied
      expect(mockResourceMonitor.shouldThrottleConnections).toHaveBeenCalled();
      expect(mockResourceMonitor.getThrottleDelay).toHaveBeenCalled();
      
      // Verify user was informed about resource constraints
      expect(mockNotificationService.showWarning).toHaveBeenCalledWith(
        'System under high load, connection delayed'
      );
      
      // Verify metrics recorded resource pressure
      expect(mockMetricsCollector.recordError).toHaveBeenCalledWith({
        type: 'resource_exhaustion',
        memoryUsage: 0.95,
        throttleDelay: 5000
      });
    });

    it('should handle connection pool exhaustion with queuing', async () => {
      // London School - Setup connection pool mock
      const poolExhaustionFetch = new FetchMock();
      
      // First few connections succeed
      for (let i = 0; i < 5; i++) {
        poolExhaustionFetch.mockSuccessResponse('/api/terminal/connect', {
          terminalId: `pool-terminal-${i}`,
          poolSize: i + 1
        });
      }
      
      // Subsequent connections get queued
      poolExhaustionFetch.mockErrorResponse('/api/terminal/connect', 429, {
        error: 'Too many connections',
        retryAfter: 2000
      });
      
      const mockConnectionPool = {
        isPoolExhausted: jest.fn().mockReturnValue(true),
        queueConnection: jest.fn(),
        getQueuePosition: jest.fn().mockReturnValue(3),
        estimatedWaitTime: jest.fn().mockReturnValue(6000)
      };
      
      mockConnectionManager.setMockCollaborators({
        fetch: poolExhaustionFetch,
        connectionPool: mockConnectionPool
      });
      
      // Attempt connection when pool is exhausted
      const connectionPromise = mockConnectionManager.connect({
        url: 'http://localhost:3000'
      });
      
      // Should be queued rather than immediately rejected
      expect(mockConnectionPool.queueConnection).toHaveBeenCalled();
      
      // Verify user feedback about queue position
      expect(mockTerminalComponent.updateConnectionStatus).toHaveBeenCalledWith({
        status: 'queued',
        position: 3,
        estimatedWait: 6000
      });
      
      expect(mockNotificationService.showWarning).toHaveBeenCalledWith(
        'Connection queued (position 3), estimated wait: 6s'
      );
    });
  });

  describe('Concurrent Error Scenarios', () => {
    it('should handle multiple simultaneous connection failures', async () => {
      // London School - Setup multiple failing connections
      const connections = Array.from({ length: 5 }, (_, i) => 
        ConnectionContractFactory.createFailingContract()
      );
      
      const mockConcurrencyManager = {
        handleConcurrentFailures: jest.fn(),
        prioritizeRecovery: jest.fn(),
        coordinateReconnections: jest.fn()
      };
      
      // Attempt all connections simultaneously
      const connectionPromises = connections.map((conn, i) => 
        conn.connect({ url: `ws://localhost:300${i}` }).catch(() => {})
      );
      
      await Promise.allSettled(connectionPromises);
      
      // Verify all connections failed but were handled
      connections.forEach(conn => {
        expect(conn.handleConnectionErrorMock).toHaveBeenCalled();
        expect(conn.getConnectionState().status).toBe('error');
      });
      
      // Verify error boundary handled cascade failures
      expect(mockErrorBoundary.captureError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Multiple connection failures')
        })
      );
      
      // Verify coordinated recovery was initiated
      expect(mockConcurrencyManager.handleConcurrentFailures).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ status: 'error' })
        ])
      );
    });

    it('should handle error recovery race conditions', async () => {
      // London School - Setup race condition scenario
      const racyEventSource = EventSourceMockFactory.createDisconnectedMock('ws://localhost:3000');
      const racyFetch = FetchMockFactory.createSlowMock(1000);
      
      const mockRaceDetector = {
        detectRecoveryRace: jest.fn().mockReturnValue(true),
        selectRecoveryWinner: jest.fn().mockReturnValue('sse'),
        cancelConcurrentRecovery: jest.fn()
      };
      
      mockConnectionManager.setMockCollaborators({
        eventSource: racyEventSource,
        fetch: racyFetch,
        raceDetector: mockRaceDetector
      });
      
      // Trigger simultaneous recovery attempts
      const sseRecovery = mockConnectionManager.reconnect();
      const httpRecovery = mockConnectionManager.connect({
        url: 'http://localhost:3000',
        type: 'http'
      });
      
      // Both should complete but only one should be active
      await Promise.allSettled([sseRecovery, httpRecovery]);
      
      // Verify race was detected and resolved
      expect(mockRaceDetector.detectRecoveryRace).toHaveBeenCalled();
      expect(mockRaceDetector.selectRecoveryWinner).toHaveBeenCalled();
      expect(mockRaceDetector.cancelConcurrentRecovery).toHaveBeenCalled();
      
      // Verify final state is consistent
      const finalState = mockConnectionManager.getConnectionState();
      expect(['connected', 'error']).toContain(finalState.status);
      
      // Verify metrics recorded race condition
      expect(mockMetricsCollector.recordError).toHaveBeenCalledWith({
        type: 'recovery_race_condition',
        winner: 'sse',
        attempts: 2
      });
    });
  });

  describe('London School - Contract Verification', () => {
    it('should verify all error handling contracts are met', () => {
      // Verify mock interactions follow expected patterns
      const connectionHistory = mockConnectionManager.getInteractionHistory();
      const eventSourceHistory = mockEventSource.getInteractionHistory();
      const fetchHistory = mockFetch.getInteractionHistory();
      
      // All mocks should have been interacted with appropriately
      expect(connectionHistory).toBeDefined();
      expect(eventSourceHistory).toBeDefined();
      expect(fetchHistory).toBeDefined();
      
      // Verify error boundaries were engaged
      expect(mockErrorBoundary.captureError).toHaveBeenCalled();
      expect(mockNotificationService.showError).toHaveBeenCalled();
      
      // Verify metrics were collected
      expect(mockMetricsCollector.recordError).toHaveBeenCalled();
    });

    it('should verify collaborator cleanup on error scenarios', () => {
      // Verify all mock collaborators properly cleanup on errors
      mockConnectionManager.handleConnectionError(new Error('Test error'));
      
      // Should trigger cleanup sequence
      expect(mockConnectionManager.disconnectMock).toHaveBeenCalled();
      
      // Verify UI cleanup
      expect(mockTerminalComponent.clearError).toHaveBeenCalled();
      expect(mockErrorBoundary.resetErrorBoundary).toHaveBeenCalled();
      
      // Verify resource cleanup
      if (mockConnectionManager.mockEventSource?.close) {
        expect(mockConnectionManager.mockEventSource.close).toHaveBeenCalled();
      }
    });
  });
});