/**
 * Launch Workflow Integration Tests - London School TDD
 * 
 * Focus: End-to-end testing of complete launch workflow
 * Mock-driven integration testing across components
 * Behavior verification for complete user journeys
 */

import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

// Mock all external dependencies
const mockChildProcess = {
  spawn: jest.fn(),
  ChildProcess: EventEmitter
};

const mockFs = {
  existsSync: jest.fn(),
  readFileSync: jest.fn()
};

const mockPath = {
  join: jest.fn()
};

// Mock HTTP request handler
const mockRequest = {
  body: {},
  params: {},
  query: {}
};

const mockResponse = {
  json: jest.fn().mockReturnThis(),
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis()
};

// Mock WebSocket for real-time updates
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
  readyState: 1 // WebSocket.OPEN
};

// Mock modules before imports
jest.mock('child_process', () => mockChildProcess);
jest.mock('fs', () => mockFs);
jest.mock('path', () => mockPath);

describe('Launch Workflow Integration - London School TDD', () => {
  let processManager;
  let apiHandler;
  let mockProcess;
  let mockWebSocketClients;

  // Create mock process with enhanced capabilities
  const createMockProcess = () => {
    const process = new EventEmitter();
    process.pid = 1234 + Math.floor(Math.random() * 1000);
    process.kill = jest.fn((signal) => {
      // Simulate process responding to kill signals
      setTimeout(() => {
        if (signal === 'SIGTERM') {
          process.emit('exit', 0, 'SIGTERM');
        } else if (signal === 'SIGKILL') {
          process.emit('exit', 9, 'SIGKILL');
        }
      }, 10);
    });
    process.stdin = { write: jest.fn() };
    process.stdout = new EventEmitter();
    process.stderr = new EventEmitter();
    return process;
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup fresh mock process
    mockProcess = createMockProcess();
    mockChildProcess.spawn.mockReturnValue(mockProcess);
    
    // Setup fs mocks
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('# Integration Test Claude Instance');
    mockPath.join.mockImplementation((...args) => args.join('/'));
    
    // Setup WebSocket clients collection
    mockWebSocketClients = new Set([mockWebSocket]);
    
    // Import modules after mocks
    const ProcessManagerModule = await import('../../src/services/ProcessManager');
    const ProcessManager = ProcessManagerModule.ProcessManager;
    processManager = new ProcessManager();
    
    const ApiModule = await import('../../src/api/routes/processManager');
    apiHandler = ApiModule.default;
    
    // Setup response mocks
    mockResponse.json.mockClear();
    mockResponse.status.mockClear();
    mockResponse.send.mockClear();
  });

  afterEach(async () => {
    // Cleanup
    if (processManager?.cleanup) {
      await processManager.cleanup();
    }
    jest.useRealTimers();
  });

  describe('Complete Launch-to-Running Workflow', () => {
    it('should orchestrate full launch workflow from HTTP request to running process', async () => {
      // Arrange - Setup the complete workflow chain
      const launchConfig = {
        workingDirectory: '/workspaces/agent-feed/prod',
        environment: 'production',
        autoRestartHours: 6
      };
      
      mockRequest.body = launchConfig;
      
      const workflowEvents = [];
      const eventListener = (event, data) => workflowEvents.push({ event, data, timestamp: Date.now() });
      
      // Monitor ProcessManager events
      processManager.on('launched', data => eventListener('launched', data));
      processManager.on('output', data => eventListener('output', data));
      processManager.on('terminal:output', data => eventListener('terminal:output', data));
      
      // Act - Execute the complete workflow
      const launchPromise = new Promise((resolve, reject) => {
        // Simulate API handler calling ProcessManager
        processManager.launchInstance(launchConfig)
          .then(resolve)
          .catch(reject);
      });
      
      // Simulate successful process spawn
      process.nextTick(() => {
        mockProcess.emit('spawn');
        
        // Simulate process producing output
        setTimeout(() => {
          mockProcess.stdout.emit('data', Buffer.from('Claude instance started successfully\n'));
          mockProcess.stdout.emit('data', Buffer.from('Ready to accept connections\n'));
        }, 50);
      });
      
      const processInfo = await launchPromise;
      
      // Assert - Verify complete workflow execution
      expect(mockChildProcess.spawn).toHaveBeenCalledWith('claude', 
        ['--dangerously-skip-permissions'],
        expect.objectContaining({
          cwd: launchConfig.workingDirectory,
          env: expect.objectContaining({
            CLAUDE_INSTANCE_NAME: expect.stringMatching(/Integration Test Claude Instance/),
            CLAUDE_MANAGED_INSTANCE: 'true'
          })
        })
      );
      
      // Verify ProcessManager state
      expect(processInfo).toEqual(
        expect.objectContaining({
          pid: mockProcess.pid,
          status: 'running',
          name: expect.stringContaining('Integration Test Claude Instance')
        })
      );
      
      // Verify event sequence
      expect(workflowEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            event: 'launched',
            data: expect.objectContaining({ status: 'running' })
          }),
          expect.objectContaining({
            event: 'output',
            data: expect.stringContaining('Claude instance started successfully')
          }),
          expect.objectContaining({
            event: 'terminal:output',
            data: expect.objectContaining({
              type: 'stdout',
              data: expect.stringContaining('Ready to accept connections')
            })
          })
        ])
      );
    });

    it('should handle launch failures gracefully across all workflow layers', async () => {
      // Arrange
      const invalidConfig = {
        workingDirectory: '/invalid/path',
        environment: 'production'
      };
      
      const spawnError = new Error('ENOENT: no such file or directory');
      mockChildProcess.spawn.mockImplementation(() => {
        const failedProcess = createMockProcess();
        process.nextTick(() => failedProcess.emit('error', spawnError));
        return failedProcess;
      });
      
      const errorEvents = [];
      processManager.on('error', error => errorEvents.push(error));
      
      // Act & Assert
      await expect(processManager.launchInstance(invalidConfig))
        .rejects
        .toThrow('Failed to spawn Claude process: ENOENT: no such file or directory');
      
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0]).toBe(spawnError);
    });
  });

  describe('Launch-Monitor-Kill Workflow', () => {
    it('should complete full lifecycle from launch through monitoring to termination', async () => {
      // Arrange
      const lifecycleEvents = [];
      const eventTracker = (event, data) => lifecycleEvents.push({ event, data });
      
      processManager.on('launched', data => eventTracker('launched', data));
      processManager.on('output', data => eventTracker('output', data));
      processManager.on('killed', data => eventTracker('killed', data));
      
      // Act - Launch Phase
      const launchPromise = processManager.launchInstance({
        workingDirectory: '/workspaces/agent-feed/prod'
      });
      
      process.nextTick(() => mockProcess.emit('spawn'));
      const launchResult = await launchPromise;
      
      // Verify launch completed
      expect(launchResult.status).toBe('running');
      expect(launchResult.pid).toBe(mockProcess.pid);
      
      // Act - Monitor Phase (simulate process output)
      mockProcess.stdout.emit('data', Buffer.from('Process monitoring active\n'));
      mockProcess.stderr.emit('data', Buffer.from('Debug: Memory usage OK\n'));
      
      // Act - Kill Phase
      const killPromise = processManager.killInstance();
      
      // Simulate graceful shutdown
      setTimeout(() => mockProcess.emit('exit', 0, 'SIGTERM'), 10);
      await killPromise;
      
      // Assert - Verify complete lifecycle
      expect(lifecycleEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            event: 'launched',
            data: expect.objectContaining({ status: 'running' })
          }),
          expect.objectContaining({
            event: 'output',
            data: 'Process monitoring active\n'
          }),
          expect.objectContaining({
            event: 'killed',
            data: expect.objectContaining({ pid: mockProcess.pid })
          })
        ])
      );
      
      // Verify final state
      const finalInfo = processManager.getProcessInfo();
      expect(finalInfo.status).toBe('stopped');
      expect(finalInfo.pid).toBeNull();
    });
  });

  describe('Auto-Restart Workflow Integration', () => {
    it('should handle complete auto-restart cycle when process exits unexpectedly', async () => {
      // Arrange
      jest.useFakeTimers();
      
      const restartEvents = [];
      processManager.on('auto-restart-triggered', () => restartEvents.push('triggered'));
      processManager.on('launched', data => restartEvents.push(`launched-${data.pid}`));
      processManager.on('exit', data => restartEvents.push(`exit-${data.code}`));
      
      // Launch with auto-restart enabled
      const launchPromise = processManager.launchInstance({
        autoRestartHours: 1 // 1 hour for testing
      });
      
      process.nextTick(() => mockProcess.emit('spawn'));
      await launchPromise;
      
      // Verify auto-restart timer is set
      expect(restartEvents).toContain(`launched-${mockProcess.pid}`);
      
      // Create new mock process for restart
      const newMockProcess = createMockProcess();
      newMockProcess.pid = 9999;
      mockChildProcess.spawn.mockReturnValue(newMockProcess);
      
      // Act - Trigger auto-restart by advancing time
      jest.advanceTimersByTime(60 * 60 * 1000); // 1 hour
      
      // Simulate old process exit and new process spawn
      mockProcess.emit('exit', 0, 'SIGTERM');
      await new Promise(resolve => process.nextTick(resolve));
      newMockProcess.emit('spawn');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Assert
      expect(restartEvents).toEqual(
        expect.arrayContaining([
          `launched-${mockProcess.pid}`,
          'triggered',
          'exit-0',
          'launched-9999'
        ])
      );
      
      jest.useRealTimers();
    });
  });

  describe('HTTP API Integration with ProcessManager', () => {
    it('should integrate HTTP endpoints with ProcessManager for complete REST API workflow', async () => {
      // This test simulates the actual Express route behavior
      
      // Arrange - Mock Express route handler behavior
      const simulateRoute = async (method, endpoint, body = {}) => {
        mockRequest.body = body;
        mockResponse.json.mockClear();
        mockResponse.status.mockClear();
        
        switch (`${method} ${endpoint}`) {
          case 'POST /launch':
            try {
              const result = await processManager.launchInstance(body);
              mockResponse.json({ success: true, data: result });
              return { status: 200, body: { success: true, data: result } };
            } catch (error) {
              mockResponse.status(500).json({ success: false, error: error.message });
              return { status: 500, body: { success: false, error: error.message } };
            }
            
          case 'GET /info':
            try {
              const info = processManager.getProcessInfo();
              mockResponse.json({ success: true, data: info });
              return { status: 200, body: { success: true, data: info } };
            } catch (error) {
              mockResponse.status(500).json({ success: false, error: error.message });
              return { status: 500, body: { success: false, error: error.message } };
            }
            
          case 'POST /kill':
            try {
              await processManager.killInstance();
              mockResponse.json({ success: true, message: 'Instance killed' });
              return { status: 200, body: { success: true, message: 'Instance killed' } };
            } catch (error) {
              mockResponse.status(500).json({ success: false, error: error.message });
              return { status: 500, body: { success: false, error: error.message } };
            }
            
          default:
            mockResponse.status(404).json({ error: 'Not found' });
            return { status: 404, body: { error: 'Not found' } };
        }
      };
      
      // Act & Assert - Complete API workflow
      
      // 1. Check initial status (no running instance)
      let response = await simulateRoute('GET', '/info');
      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('stopped');
      
      // 2. Launch new instance
      const launchPromise = simulateRoute('POST', '/launch', {
        workingDirectory: '/workspaces/agent-feed/prod',
        environment: 'production'
      });
      
      process.nextTick(() => mockProcess.emit('spawn'));
      response = await launchPromise;
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('running');
      
      // 3. Check status after launch
      response = await simulateRoute('GET', '/info');
      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('running');
      expect(response.body.data.pid).toBe(mockProcess.pid);
      
      // 4. Kill the instance
      const killPromise = simulateRoute('POST', '/kill');
      setTimeout(() => mockProcess.emit('exit', 0, 'SIGTERM'), 10);
      response = await killPromise;
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Instance killed');
      
      // 5. Verify final status
      response = await simulateRoute('GET', '/info');
      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('stopped');
      expect(response.body.data.pid).toBeNull();
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should recover gracefully from various failure modes during workflow', async () => {
      // Arrange
      const errorScenarios = [];
      processManager.on('error', error => errorScenarios.push(error.message));
      
      // Scenario 1: Launch failure due to invalid config
      try {
        await processManager.launchInstance({ workingDirectory: null });
      } catch (error) {
        errorScenarios.push(`Launch failed: ${error.message}`);
      }
      
      // Scenario 2: Process spawn failure
      mockChildProcess.spawn.mockImplementationOnce(() => {
        const failedProcess = createMockProcess();
        process.nextTick(() => failedProcess.emit('error', new Error('Spawn failed')));
        return failedProcess;
      });
      
      try {
        const launchPromise = processManager.launchInstance({
          workingDirectory: '/workspaces/agent-feed/prod'
        });
        // Don't emit spawn event, let it fail
        await launchPromise;
      } catch (error) {
        errorScenarios.push(`Spawn failed: ${error.message}`);
      }
      
      // Scenario 3: Successful launch for recovery test
      mockChildProcess.spawn.mockReturnValue(mockProcess);
      const launchPromise = processManager.launchInstance({
        workingDirectory: '/workspaces/agent-feed/prod'
      });
      
      process.nextTick(() => mockProcess.emit('spawn'));
      const processInfo = await launchPromise;
      
      // Scenario 4: Process exits unexpectedly
      mockProcess.emit('exit', 1, null); // Non-zero exit code
      
      // Assert - Verify error handling and recovery
      expect(errorScenarios.length).toBeGreaterThan(0);
      expect(processInfo.status).toBe('running'); // Successful recovery
      
      // Verify final state shows stopped after unexpected exit
      const finalInfo = processManager.getProcessInfo();
      expect(finalInfo.status).toBe('stopped');
    });
  });

  describe('Concurrent Workflow Operations', () => {
    it('should handle concurrent launch/kill operations without race conditions', async () => {
      // Arrange
      const operations = [];
      
      // Act - Attempt concurrent operations
      const launchPromise1 = processManager.launchInstance({
        workingDirectory: '/workspaces/agent-feed/prod'
      }).then(result => {
        operations.push(`launch1-${result.pid}`);
        return result;
      });
      
      // Simulate spawn for first launch
      process.nextTick(() => mockProcess.emit('spawn'));
      
      // Try to launch second instance (should kill first)
      const secondMockProcess = createMockProcess();
      secondMockProcess.pid = 5555;
      
      const launchPromise2 = processManager.launchInstance({
        workingDirectory: '/workspaces/agent-feed/prod'
      }).then(result => {
        operations.push(`launch2-${result.pid}`);
        return result;
      });
      
      // Wait for first launch to complete
      const firstResult = await launchPromise1;
      
      // Then simulate kill of first and spawn of second
      mockChildProcess.spawn.mockReturnValue(secondMockProcess);
      mockProcess.emit('exit', 0, 'SIGTERM'); // First process exits
      process.nextTick(() => secondMockProcess.emit('spawn')); // Second process spawns
      
      const secondResult = await launchPromise2;
      
      // Assert - Verify sequential execution despite concurrent calls
      expect(operations).toEqual([
        `launch1-${firstResult.pid}`,
        `launch2-${secondResult.pid}`
      ]);
      
      expect(firstResult.pid).toBe(mockProcess.pid);
      expect(secondResult.pid).toBe(secondMockProcess.pid);
      
      // Verify only second instance is running
      const finalInfo = processManager.getProcessInfo();
      expect(finalInfo.pid).toBe(secondMockProcess.pid);
      expect(finalInfo.status).toBe('running');
    });
  });
});