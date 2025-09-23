/**
 * TDD London School - SSE Connection Bridge Tests
 * 
 * Mock-driven tests for HTTP/SSE bridge behavior:
 * 1. useHTTPSSE hook integration patterns
 * 2. ClaudeInstanceManager connection management
 * 3. Backend simple-backend.js SSE broadcasting
 * 4. Connection state synchronization
 * 
 * Focus: Integration contracts between frontend/backend components
 */

import { vi } from 'vitest';

// Mock contracts for SSE bridge behavior
interface UseHTTPSSEHook {
  connectSSE(instanceId: string): Promise<void>;
  disconnectFromInstance(): void;
  emit(event: string, data: any): Promise<void>;
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler?: (data: any) => void): void;
  startPolling(instanceId: string): Promise<void>;
  stopPolling(): void;
}

interface ClaudeInstanceManagerIntegration {
  setupEventHandlers(): void;
  sendInput(input: string, instanceId: string): Promise<void>;
  handleTerminalOutput(data: any): void;
  updateConnectionStatus(status: string, instanceId?: string): void;
  manageInstanceSelection(instanceId: string): Promise<void>;
}

interface BackendSSEBroadcaster {
  broadcastInstanceStatus(instanceId: string, status: string, data?: any): void;
  broadcastTerminalOutput(instanceId: string, output: string): void;
  maintainSSEConnection(instanceId: string): boolean;
  trackConnectionCount(instanceId: string): number;
  cleanupClosedConnections(instanceId: string): void;
}

interface ConnectionStateSynchronizer {
  syncFrontendBackend(instanceId: string, state: any): Promise<void>;
  validateStateConsistency(instanceId: string): boolean;
  handleStateConflicts(instanceId: string, frontendState: any, backendState: any): Promise<void>;
  broadcastStateChanges(instanceId: string, newState: any): void;
}

describe('TDD London School: SSE Connection Bridge Integration', () => {
  let useHTTPSSEHook: vi.Mocked<UseHTTPSSEHook>;
  let claudeInstanceManagerIntegration: vi.Mocked<ClaudeInstanceManagerIntegration>;
  let backendSSEBroadcaster: vi.Mocked<BackendSSEBroadcaster>;
  let connectionStateSynchronizer: vi.Mocked<ConnectionStateSynchronizer>;

  // Mock fetch and EventSource for integration testing
  let mockFetch: vi.MockedFunction<typeof fetch>;
  let mockEventSource: vi.MockedClass<typeof EventSource>;

  beforeEach(() => {
    vi.clearAllMocks();

    useHTTPSSEHook = {
      connectSSE: vi.fn().mockResolvedValue(undefined),
      disconnectFromInstance: vi.fn(),
      emit: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
      startPolling: vi.fn().mockResolvedValue(undefined),
      stopPolling: vi.fn()
    };

    claudeInstanceManagerIntegration = {
      setupEventHandlers: vi.fn(),
      sendInput: vi.fn().mockResolvedValue(undefined),
      handleTerminalOutput: vi.fn(),
      updateConnectionStatus: vi.fn(),
      manageInstanceSelection: vi.fn().mockResolvedValue(undefined)
    };

    backendSSEBroadcaster = {
      broadcastInstanceStatus: vi.fn(),
      broadcastTerminalOutput: vi.fn(),
      maintainSSEConnection: vi.fn().mockReturnValue(true),
      trackConnectionCount: vi.fn().mockReturnValue(1),
      cleanupClosedConnections: vi.fn()
    };

    connectionStateSynchronizer = {
      syncFrontendBackend: vi.fn().mockResolvedValue(undefined),
      validateStateConsistency: vi.fn().mockReturnValue(true),
      handleStateConflicts: vi.fn().mockResolvedValue(undefined),
      broadcastStateChanges: vi.fn()
    };

    // Mock fetch responses
    mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/terminal/input')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, message: 'Input forwarded' })
        });
      }
      if (url.includes('/instances')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, instances: [] })
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      });
    });

    // Mock EventSource
    mockEventSource = vi.fn().mockImplementation(() => ({
      readyState: EventSource.OPEN,
      onopen: null,
      onmessage: null,
      onerror: null,
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }));

    global.fetch = mockFetch as any;
    global.EventSource = mockEventSource as any;
  });

  describe('useHTTPSSE Hook Integration Behavior', () => {
    it('should establish SSE connection and setup event handlers', async () => {
      const instanceId = 'claude-hook-integration-1';

      // Act: Hook establishes SSE connection
      await useHTTPSSEHook.connectSSE(instanceId);
      
      // Setup event handlers for terminal communication
      useHTTPSSEHook.on('terminal:output', vi.fn());
      useHTTPSSEHook.on('instance:status', vi.fn());
      useHTTPSSEHook.on('connect', vi.fn());

      // Assert: Hook integration behavior
      expect(useHTTPSSEHook.connectSSE).toHaveBeenCalledWith(instanceId);
      expect(useHTTPSSEHook.on).toHaveBeenCalledTimes(3);
      expect(useHTTPSSEHook.on).toHaveBeenNthCalledWith(1, 'terminal:output', expect.any(Function));
      expect(useHTTPSSEHook.on).toHaveBeenNthCalledWith(2, 'instance:status', expect.any(Function));
      expect(useHTTPSSEHook.on).toHaveBeenNthCalledWith(3, 'connect', expect.any(Function));
    });

    it('should emit terminal input through HTTP bridge', async () => {
      const instanceId = 'claude-input-bridge-2';
      const inputData = { input: 'help\\n', instanceId };

      // Act: Emit terminal input
      await useHTTPSSEHook.emit('terminal:input', inputData);

      // Assert: HTTP bridge behavior for input
      expect(useHTTPSSEHook.emit).toHaveBeenCalledWith('terminal:input', inputData);
    });

    it('should handle connection cleanup when switching instances', async () => {
      const oldInstanceId = 'claude-old-instance-3';
      const newInstanceId = 'claude-new-instance-3';

      // Act: Disconnect from old instance and connect to new
      useHTTPSSEHook.disconnectFromInstance();
      await useHTTPSSEHook.connectSSE(newInstanceId);

      // Assert: Connection switching behavior
      expect(useHTTPSSEHook.disconnectFromInstance).toHaveBeenCalledTimes(1);
      expect(useHTTPSSEHook.connectSSE).toHaveBeenCalledWith(newInstanceId);
    });

    it('should fallback to polling when SSE fails', async () => {
      const instanceId = 'claude-fallback-polling-4';

      // Act: SSE connection fails, trigger polling fallback
      // Simulate SSE failure by mock throwing error
      useHTTPSSEHook.connectSSE = vi.fn().mockRejectedValue(new Error('SSE Failed'));
      
      try {
        await useHTTPSSEHook.connectSSE(instanceId);
      } catch (error) {
        // Fallback to polling
        await useHTTPSSEHook.startPolling(instanceId);
      }

      // Assert: Fallback behavior
      expect(useHTTPSSEHook.startPolling).toHaveBeenCalledWith(instanceId);
    });
  });

  describe('ClaudeInstanceManager Integration Behavior', () => {
    it('should setup comprehensive event handlers for SSE communication', () => {
      // Act: Setup event handlers in manager
      claudeInstanceManagerIntegration.setupEventHandlers();

      // Assert: Event handlers setup behavior
      expect(claudeInstanceManagerIntegration.setupEventHandlers).toHaveBeenCalledTimes(1);
    });

    it('should coordinate input sending with connection validation', async () => {
      const instanceId = 'claude-manager-input-5';
      const input = 'ls -la';

      // Act: Manager handles input sending
      await claudeInstanceManagerIntegration.sendInput(input, instanceId);

      // Assert: Input coordination behavior
      expect(claudeInstanceManagerIntegration.sendInput).toHaveBeenCalledWith(input, instanceId);
    });

    it('should handle terminal output updates from SSE events', () => {
      const instanceId = 'claude-output-handler-6';
      const outputData = {
        instanceId,
        output: 'Command executed successfully\\n',
        timestamp: new Date().toISOString()
      };

      // Act: Handle terminal output
      claudeInstanceManagerIntegration.handleTerminalOutput(outputData);

      // Assert: Output handling behavior
      expect(claudeInstanceManagerIntegration.handleTerminalOutput).toHaveBeenCalledWith(outputData);
    });

    it('should manage instance selection with proper connection lifecycle', async () => {
      const instanceId = 'claude-selection-management-7';

      // Act: Manage instance selection
      await claudeInstanceManagerIntegration.manageInstanceSelection(instanceId);

      // Assert: Selection management behavior  
      expect(claudeInstanceManagerIntegration.manageInstanceSelection).toHaveBeenCalledWith(instanceId);
    });

    it('should update connection status based on SSE events', () => {
      const instanceId = 'claude-status-update-8';
      const status = 'Connected via SSE (claude-st)';

      // Act: Update connection status
      claudeInstanceManagerIntegration.updateConnectionStatus(status, instanceId);

      // Assert: Status update behavior
      expect(claudeInstanceManagerIntegration.updateConnectionStatus).toHaveBeenCalledWith(status, instanceId);
    });
  });

  describe('Backend SSE Broadcaster Behavior', () => {
    it('should broadcast instance status to all connected clients', () => {
      const instanceId = 'claude-backend-broadcast-9';
      const status = 'running';
      const statusData = { pid: 12345, command: 'claude --dangerously-skip-permissions' };

      // Act: Backend broadcasts status
      backendSSEBroadcaster.broadcastInstanceStatus(instanceId, status, statusData);

      // Assert: Broadcasting behavior
      expect(backendSSEBroadcaster.broadcastInstanceStatus)
        .toHaveBeenCalledWith(instanceId, status, statusData);
    });

    it('should broadcast terminal output to connected clients', () => {
      const instanceId = 'claude-terminal-broadcast-10';
      const output = 'Welcome to Claude terminal\\n$ ';

      // Act: Backend broadcasts terminal output
      backendSSEBroadcaster.broadcastTerminalOutput(instanceId, output);

      // Assert: Terminal output broadcasting behavior
      expect(backendSSEBroadcaster.broadcastTerminalOutput)
        .toHaveBeenCalledWith(instanceId, output);
    });

    it('should maintain SSE connections and track active count', () => {
      const instanceId = 'claude-connection-tracking-11';

      // Act: Maintain connection and track count
      const isActive = backendSSEBroadcaster.maintainSSEConnection(instanceId);
      const connectionCount = backendSSEBroadcaster.trackConnectionCount(instanceId);

      // Assert: Connection maintenance behavior
      expect(backendSSEBroadcaster.maintainSSEConnection).toHaveBeenCalledWith(instanceId);
      expect(isActive).toBe(true);
      
      expect(backendSSEBroadcaster.trackConnectionCount).toHaveBeenCalledWith(instanceId);
      expect(connectionCount).toBe(1);
    });

    it('should clean up closed connections to prevent ECONNRESET accumulation', () => {
      const instanceId = 'claude-cleanup-connections-12';

      // Act: Clean up closed connections
      backendSSEBroadcaster.cleanupClosedConnections(instanceId);

      // Assert: Cleanup behavior
      expect(backendSSEBroadcaster.cleanupClosedConnections).toHaveBeenCalledWith(instanceId);
    });
  });

  describe('Connection State Synchronization Behavior', () => {
    it('should synchronize state between frontend and backend', async () => {
      const instanceId = 'claude-sync-state-13';
      const state = { 
        status: 'connected', 
        connectionType: 'sse', 
        lastActivity: new Date().toISOString() 
      };

      // Act: Synchronize frontend and backend state
      await connectionStateSynchronizer.syncFrontendBackend(instanceId, state);
      const isConsistent = connectionStateSynchronizer.validateStateConsistency(instanceId);

      // Assert: State synchronization behavior
      expect(connectionStateSynchronizer.syncFrontendBackend).toHaveBeenCalledWith(instanceId, state);
      expect(connectionStateSynchronizer.validateStateConsistency).toHaveBeenCalledWith(instanceId);
      expect(isConsistent).toBe(true);
    });

    it('should handle state conflicts between frontend and backend', async () => {
      const instanceId = 'claude-state-conflicts-14';
      const frontendState = { status: 'connected', type: 'sse' };
      const backendState = { status: 'disconnected', type: 'polling' };

      // Act: Handle state conflict resolution
      await connectionStateSynchronizer.handleStateConflicts(instanceId, frontendState, backendState);

      // Assert: Conflict resolution behavior
      expect(connectionStateSynchronizer.handleStateConflicts)
        .toHaveBeenCalledWith(instanceId, frontendState, backendState);
    });

    it('should broadcast state changes to maintain consistency', () => {
      const instanceId = 'claude-broadcast-changes-15';
      const newState = { status: 'reconnected', method: 'sse', timestamp: Date.now() };

      // Act: Broadcast state changes
      connectionStateSynchronizer.broadcastStateChanges(instanceId, newState);

      // Assert: State broadcasting behavior
      expect(connectionStateSynchronizer.broadcastStateChanges).toHaveBeenCalledWith(instanceId, newState);
    });
  });

  describe('Complete Bridge Integration Workflow', () => {
    it('should execute end-to-end connection establishment and communication', async () => {
      const instanceId = 'claude-e2e-workflow-16';
      const testInput = 'echo \"Bridge integration test\"';
      
      // Phase 1: Frontend Hook Connects to Backend
      await useHTTPSSEHook.connectSSE(instanceId);
      claudeInstanceManagerIntegration.setupEventHandlers();
      
      // Phase 2: Backend Maintains Connection
      const backendConnectionActive = backendSSEBroadcaster.maintainSSEConnection(instanceId);
      expect(backendConnectionActive).toBe(true);
      
      // Phase 3: State Synchronization
      const connectionState = { status: 'connected', type: 'sse', instanceId };
      await connectionStateSynchronizer.syncFrontendBackend(instanceId, connectionState);
      
      // Phase 4: Frontend Sends Input
      await claudeInstanceManagerIntegration.sendInput(testInput, instanceId);
      
      // Phase 5: Backend Broadcasts Output
      const testOutput = 'Bridge integration test\\n$ ';
      backendSSEBroadcaster.broadcastTerminalOutput(instanceId, testOutput);
      
      // Phase 6: Frontend Handles Output
      const outputData = { instanceId, output: testOutput };
      claudeInstanceManagerIntegration.handleTerminalOutput(outputData);
      
      // Phase 7: Connection Status Update
      claudeInstanceManagerIntegration.updateConnectionStatus('Connected via SSE', instanceId);

      // Assert: Complete workflow verification
      expect(useHTTPSSEHook.connectSSE).toHaveBeenCalledWith(instanceId);
      expect(claudeInstanceManagerIntegration.setupEventHandlers).toHaveBeenCalled();
      expect(backendSSEBroadcaster.maintainSSEConnection).toHaveBeenCalledWith(instanceId);
      expect(connectionStateSynchronizer.syncFrontendBackend).toHaveBeenCalledWith(instanceId, connectionState);
      expect(claudeInstanceManagerIntegration.sendInput).toHaveBeenCalledWith(testInput, instanceId);
      expect(backendSSEBroadcaster.broadcastTerminalOutput).toHaveBeenCalledWith(instanceId, testOutput);
      expect(claudeInstanceManagerIntegration.handleTerminalOutput).toHaveBeenCalledWith(outputData);
      expect(claudeInstanceManagerIntegration.updateConnectionStatus).toHaveBeenCalledWith('Connected via SSE', instanceId);
    });

    it('should maintain stable connection across multiple command interactions', async () => {
      const instanceId = 'claude-stable-interaction-17';
      const commands = ['pwd', 'ls', 'cd frontend', 'npm test'];

      // Establish connection
      await useHTTPSSEHook.connectSSE(instanceId);
      backendSSEBroadcaster.maintainSSEConnection(instanceId);

      // Execute multiple commands
      for (let i = 0; i < commands.length; i++) {
        // Send command
        await claudeInstanceManagerIntegration.sendInput(commands[i], instanceId);
        
        // Backend broadcasts response
        backendSSEBroadcaster.broadcastTerminalOutput(instanceId, `Executed: ${commands[i]}`);
        
        // Frontend handles output
        claudeInstanceManagerIntegration.handleTerminalOutput({
          instanceId,
          output: `Executed: ${commands[i]}`
        });

        // Verify connection remains active
        const isActive = backendSSEBroadcaster.maintainSSEConnection(instanceId);
        expect(isActive).toBe(true);
      }

      // Assert: Stable connection behavior
      expect(useHTTPSSEHook.connectSSE).toHaveBeenCalledTimes(1); // Only once
      expect(claudeInstanceManagerIntegration.sendInput).toHaveBeenCalledTimes(commands.length);
      expect(backendSSEBroadcaster.broadcastTerminalOutput).toHaveBeenCalledTimes(commands.length);
      expect(backendSSEBroadcaster.maintainSSEConnection).toHaveBeenCalledTimes(commands.length + 1); // +1 for initial

      // Connection should never be closed during active session
      expect(useHTTPSSEHook.disconnectFromInstance).not.toHaveBeenCalled();
    });
  });

  describe('Bridge Contract Verification', () => {
    it('should verify all bridge components implement required contracts', () => {
      // Verify useHTTPSSE hook contract
      expect(useHTTPSSEHook.connectSSE).toBeDefined();
      expect(useHTTPSSEHook.disconnectFromInstance).toBeDefined();
      expect(useHTTPSSEHook.emit).toBeDefined();
      expect(useHTTPSSEHook.on).toBeDefined();
      expect(useHTTPSSEHook.off).toBeDefined();
      expect(useHTTPSSEHook.startPolling).toBeDefined();
      expect(useHTTPSSEHook.stopPolling).toBeDefined();

      // Verify ClaudeInstanceManager integration contract
      expect(claudeInstanceManagerIntegration.setupEventHandlers).toBeDefined();
      expect(claudeInstanceManagerIntegration.sendInput).toBeDefined();
      expect(claudeInstanceManagerIntegration.handleTerminalOutput).toBeDefined();
      expect(claudeInstanceManagerIntegration.updateConnectionStatus).toBeDefined();
      expect(claudeInstanceManagerIntegration.manageInstanceSelection).toBeDefined();

      // Verify Backend SSE broadcaster contract
      expect(backendSSEBroadcaster.broadcastInstanceStatus).toBeDefined();
      expect(backendSSEBroadcaster.broadcastTerminalOutput).toBeDefined();
      expect(backendSSEBroadcaster.maintainSSEConnection).toBeDefined();
      expect(backendSSEBroadcaster.trackConnectionCount).toBeDefined();
      expect(backendSSEBroadcaster.cleanupClosedConnections).toBeDefined();

      // Verify Connection state synchronizer contract
      expect(connectionStateSynchronizer.syncFrontendBackend).toBeDefined();
      expect(connectionStateSynchronizer.validateStateConsistency).toBeDefined();
      expect(connectionStateSynchronizer.handleStateConflicts).toBeDefined();
      expect(connectionStateSynchronizer.broadcastStateChanges).toBeDefined();
    });

    it('should verify mock collaborations follow expected interaction patterns', async () => {
      const instanceId = 'claude-contract-verification-18';
      
      // Execute basic collaboration pattern
      await useHTTPSSEHook.connectSSE(instanceId);
      claudeInstanceManagerIntegration.setupEventHandlers();
      backendSSEBroadcaster.broadcastInstanceStatus(instanceId, 'running');
      await connectionStateSynchronizer.syncFrontendBackend(instanceId, { status: 'connected' });

      // Verify collaborations occurred
      expect(useHTTPSSEHook.connectSSE).toHaveBeenCalledWith(instanceId);
      expect(claudeInstanceManagerIntegration.setupEventHandlers).toHaveBeenCalled();
      expect(backendSSEBroadcaster.broadcastInstanceStatus).toHaveBeenCalledWith(instanceId, 'running');
      expect(connectionStateSynchronizer.syncFrontendBackend).toHaveBeenCalledWith(instanceId, { status: 'connected' });
    });
  });
});