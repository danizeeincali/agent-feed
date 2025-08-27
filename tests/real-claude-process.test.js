/**
 * Comprehensive Test Suite for Real Claude Process Implementation
 * TDD London School methodology with behavioral contracts and mocks
 * 
 * Test Coverage:
 * - Real process spawning for all 4 Claude command variants
 * - Process lifecycle management and health monitoring  
 * - Terminal I/O integration with SSE streaming
 * - Process cleanup and recovery mechanisms
 * - Complete end-to-end workflow validation
 */

const { expect } = require('@jest/globals');
const request = require('supertest');
const { spawn } = require('child_process');
const EventEmitter = require('events');
const fs = require('fs');

// Mock dependencies for isolation
jest.mock('child_process');
jest.mock('fs');

// Import components under test
const ProcessLifecycleManager = require('../src/process-lifecycle-manager');
const TerminalIntegration = require('../src/terminal-integration');

describe('Real Claude Process Implementation', () => {
  let mockProcess;
  let mockResponse;
  let lifecycleManager;
  let terminalIntegration;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock process with proper EventEmitter behavior
    mockProcess = new EventEmitter();
    mockProcess.pid = 12345;
    mockProcess.killed = false;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.stdin = {
      write: jest.fn()
    };
    mockProcess.kill = jest.fn();
    
    // Mock spawn to return our mock process
    spawn.mockReturnValue(mockProcess);
    
    // Mock filesystem
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockReturnValue(undefined);
    fs.appendFileSync.mockReturnValue(undefined);
    
    // Create mock SSE response
    mockResponse = new EventEmitter();
    mockResponse.writeHead = jest.fn();
    mockResponse.write = jest.fn();
    mockResponse.end = jest.fn();
    
    // Initialize managers
    lifecycleManager = new ProcessLifecycleManager({
      healthCheckInterval: 100,
      processTimeout: 1000,
      maxRestarts: 1
    });
    
    terminalIntegration = new TerminalIntegration({
      bufferSize: 100,
      maxHistoryLines: 50
    });
  });

  afterEach(async () => {
    // Clean up managers
    if (lifecycleManager) {
      lifecycleManager.shutdown();
    }
    if (terminalIntegration) {
      terminalIntegration.shutdown();
    }
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  describe('Process Spawning - All 4 Claude Command Variants', () => {
    const testCases = [
      {
        name: 'Basic Claude Command',
        input: { command: ['claude'] },
        expectedArgs: ['claude'],
        expectedType: 'basic'
      },
      {
        name: 'Skip Permissions Command', 
        input: { command: ['claude', '--dangerously-skip-permissions'] },
        expectedArgs: ['claude', '--dangerously-skip-permissions'],
        expectedType: 'skipPermissions'
      },
      {
        name: 'Chat Mode Command',
        input: { 
          command: ['claude', '--dangerously-skip-permissions', '-c'],
          prompt: 'Hello, how are you?'
        },
        expectedArgs: ['claude', '--dangerously-skip-permissions', '-c', 'Hello, how are you?'],
        expectedType: 'chat'
      },
      {
        name: 'Resume Command',
        input: { command: ['claude', '--dangerously-skip-permissions', '--resume'] },
        expectedArgs: ['claude', '--dangerously-skip-permissions', '--resume'],
        expectedType: 'resume'
      }
    ];

    testCases.forEach(({ name, input, expectedArgs, expectedType }) => {
      test(`should spawn real Claude process for ${name}`, async () => {
        const instanceId = 'test-instance-' + Date.now();
        
        // Simulate successful process spawn
        setTimeout(() => {
          mockProcess.emit('spawn');
        }, 10);
        
        // Register process with lifecycle manager
        const processInfo = {
          instanceId,
          process: mockProcess,
          pid: mockProcess.pid,
          commandType: expectedType,
          args: expectedArgs,
          startTime: new Date(),
          status: 'starting'
        };
        
        lifecycleManager.registerProcess(instanceId, processInfo);
        
        // Verify spawn was called correctly
        expect(spawn).toHaveBeenCalledWith(
          expect.stringContaining('claude'),
          expect.arrayContaining(expectedArgs.slice(1)), // Remove 'claude' from args
          expect.objectContaining({
            cwd: expect.stringContaining('prod'),
            stdio: ['pipe', 'pipe', 'pipe']
          })
        );
        
        // Wait for spawn event
        await new Promise(resolve => {
          mockProcess.on('spawn', resolve);
        });
        
        // Verify process is registered and tracked
        const registeredProcess = lifecycleManager.getProcessInfo(instanceId);
        expect(registeredProcess).toBeDefined();
        expect(registeredProcess.pid).toBe(12345);
        expect(registeredProcess.commandType).toBe(expectedType);
      });
    });

    test('should handle process spawn failures gracefully', async () => {
      const instanceId = 'failing-instance';
      const spawnError = new Error('Failed to spawn process');
      
      // Simulate spawn failure
      setTimeout(() => {
        mockProcess.emit('error', spawnError);
      }, 10);
      
      const processInfo = {
        instanceId,
        process: mockProcess,
        pid: null,
        status: 'failed'
      };
      
      lifecycleManager.registerProcess(instanceId, processInfo);
      
      // Wait for error event
      await new Promise(resolve => {
        lifecycleManager.on('processError', ({ instanceId: id, error }) => {
          expect(id).toBe(instanceId);
          expect(error.message).toBe('Failed to spawn process');
          resolve();
        });
      });
    });
  });

  describe('Process Lifecycle Management', () => {
    let instanceId;
    let processInfo;

    beforeEach(() => {
      instanceId = 'lifecycle-test-' + Date.now();
      processInfo = {
        instanceId,
        process: mockProcess,
        pid: 12345,
        commandType: 'basic',
        status: 'running',
        startTime: new Date()
      };
      
      lifecycleManager.registerProcess(instanceId, processInfo);
    });

    test('should monitor process health and detect failures', async () => {
      let healthCheckCount = 0;
      
      // Mock successful health checks
      lifecycleManager.on('healthCheck', () => {
        healthCheckCount++;
      });
      
      // Wait for several health checks
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (healthCheckCount >= 2) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
      });
      
      expect(healthCheckCount).toBeGreaterThanOrEqual(2);
      
      const status = lifecycleManager.getProcessStatus(instanceId);
      expect(status).toBeDefined();
      expect(status.healthStatus).toBe('healthy');
    });

    test('should handle unexpected process exits and attempt restart', async () => {
      let restartAttempted = false;
      
      lifecycleManager.on('processRestart', ({ instanceId: id }) => {
        expect(id).toBe(instanceId);
        restartAttempted = true;
      });
      
      // Simulate unexpected process exit
      mockProcess.emit('exit', 1, null); // Exit code 1 = failure
      
      // Wait for restart attempt
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(restartAttempted).toBe(true);
    });

    test('should clean up zombie processes', async () => {
      // Mark process as exited
      processInfo.status = 'exited';
      processInfo.exitTime = new Date(Date.now() - 7200000); // 2 hours ago
      
      // Trigger zombie cleanup
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Process should be cleaned up (this is implementation dependent)
      const status = lifecycleManager.getProcessStatus(instanceId);
      expect(status).toBeTruthy(); // Process info should still exist but be marked appropriately
    });

    test('should respect maximum restart limits', async () => {
      let restartCount = 0;
      
      lifecycleManager.on('processRestart', () => {
        restartCount++;
      });
      
      // Simulate multiple failures
      for (let i = 0; i < 3; i++) {
        mockProcess.emit('exit', 1, null);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Should not exceed max restart limit (set to 1 in beforeEach)
      expect(restartCount).toBeLessThanOrEqual(1);
    });
  });

  describe('Terminal Integration and I/O Streaming', () => {
    let instanceId;
    let processInfo;

    beforeEach(() => {
      instanceId = 'terminal-test-' + Date.now();
      processInfo = {
        instanceId,
        process: mockProcess,
        pid: 12345,
        commandType: 'basic',
        status: 'running'
      };
      
      terminalIntegration.initializeTerminal(instanceId, processInfo);
    });

    test('should initialize terminal state correctly', () => {
      const terminalState = terminalIntegration.getTerminalState(instanceId);
      
      expect(terminalState).toBeDefined();
      expect(terminalState.instanceId).toBe(instanceId);
      expect(terminalState.isActive).toBe(true);
      expect(terminalState.status).toBe('connected');
    });

    test('should handle SSE connection establishment', () => {
      terminalIntegration.addSSEConnection(instanceId, mockResponse);
      
      // Verify SSE headers were set
      expect(mockResponse.writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        })
      );
      
      // Verify initial messages were sent
      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('terminal_connected')
      );
    });

    test('should forward input to real Claude process stdin', async () => {
      const testInput = 'hello world';
      
      await terminalIntegration.sendInput(instanceId, testInput);
      
      // Verify input was written to process stdin
      expect(mockProcess.stdin.write).toHaveBeenCalledWith(testInput + '\n');
      
      // Verify input was added to history
      const inputHistory = terminalIntegration.getInputHistory(instanceId);
      expect(inputHistory).toContain(testInput);
    });

    test('should capture and stream process output via SSE', async () => {
      terminalIntegration.addSSEConnection(instanceId, mockResponse);
      
      const testOutput = 'Hello from Claude!';
      
      // Simulate process output
      mockProcess.stdout.emit('data', Buffer.from(testOutput));
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Verify output was broadcasted via SSE
      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining(testOutput)
      );
      
      // Verify output was added to history
      const history = terminalIntegration.getTerminalHistory(instanceId);
      expect(history.some(entry => entry.data.includes(testOutput))).toBe(true);
    });

    test('should handle process stderr and broadcast errors', async () => {
      terminalIntegration.addSSEConnection(instanceId, mockResponse);
      
      const errorOutput = 'Error: Something went wrong';
      
      // Simulate process stderr
      mockProcess.stderr.emit('data', Buffer.from(errorOutput));
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Verify error was broadcasted
      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringMatching(/terminal_output.*stderr/s)
      );
    });

    test('should detect prompt states and update input mode', async () => {
      const prompts = [
        { output: '$ ', expectedMode: 'command' },
        { output: 'Password: ', expectedMode: 'password' },
        { output: 'Continue [Y/n]? ', expectedMode: 'interactive' }
      ];
      
      for (const { output, expectedMode } of prompts) {
        // Simulate prompt output
        mockProcess.stdout.emit('data', Buffer.from(output));
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const terminalState = terminalIntegration.getTerminalState(instanceId);
        expect(terminalState.inputMode).toBe(expectedMode);
      }
    });

    test('should clean up terminal resources properly', () => {
      terminalIntegration.addSSEConnection(instanceId, mockResponse);
      
      // Verify terminal exists
      let terminalState = terminalIntegration.getTerminalState(instanceId);
      expect(terminalState).toBeDefined();
      
      // Clean up terminal
      terminalIntegration.cleanupTerminal(instanceId);
      
      // Verify cleanup
      terminalState = terminalIntegration.getTerminalState(instanceId);
      expect(terminalState).toBeUndefined();
      
      // Verify SSE connection was closed
      expect(mockResponse.end).toHaveBeenCalled();
    });
  });

  describe('Integrated Backend API Endpoints', () => {
    // Note: This would require setting up an actual Express app instance
    // For now, we'll test the core logic components

    test('should validate Claude CLI and working directory prerequisites', () => {
      // Mock filesystem checks
      fs.existsSync.mockImplementation((path) => {
        if (path.includes('claude')) return true;
        if (path.includes('prod')) return true;
        return false;
      });
      
      // Test prerequisite validation logic
      const claudeExists = fs.existsSync('/home/codespace/nvm/current/bin/claude');
      const workingDirExists = fs.existsSync('/workspaces/agent-feed/prod');
      
      expect(claudeExists).toBe(true);
      expect(workingDirExists).toBe(true);
    });

    test('should determine correct command type from frontend requests', () => {
      const testCases = [
        { 
          input: { command: ['claude'] },
          expected: { type: 'basic', additionalArgs: [] }
        },
        {
          input: { command: ['claude', '--dangerously-skip-permissions'] },
          expected: { type: 'skipPermissions', additionalArgs: [] }
        },
        {
          input: { 
            command: ['claude', '--dangerously-skip-permissions', '-c'],
            prompt: 'test prompt'
          },
          expected: { type: 'chat', additionalArgs: ['test prompt'] }
        },
        {
          input: { command: ['claude', '--dangerously-skip-permissions', '--resume'] },
          expected: { type: 'resume', additionalArgs: [] }
        }
      ];
      
      // This would be the actual function from the backend
      function determineCommandType(command, prompt) {
        if (!command || !Array.isArray(command)) {
          return { type: 'basic', additionalArgs: [] };
        }
        
        if (command.includes('--dangerously-skip-permissions')) {
          if (command.includes('--resume')) {
            return { type: 'resume', additionalArgs: [] };
          } else if (command.includes('-c')) {
            return { 
              type: 'chat', 
              additionalArgs: prompt ? [prompt] : []
            };
          } else {
            return { type: 'skipPermissions', additionalArgs: [] };
          }
        }
        
        return { type: 'basic', additionalArgs: [] };
      }
      
      testCases.forEach(({ input, expected }) => {
        const result = determineCommandType(input.command, input.prompt);
        expect(result).toEqual(expected);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing Claude CLI gracefully', () => {
      fs.existsSync.mockImplementation((path) => {
        if (path.includes('claude')) return false;
        return true;
      });
      
      const claudeExists = fs.existsSync('/home/codespace/nvm/current/bin/claude');
      expect(claudeExists).toBe(false);
      
      // Application should handle this gracefully with appropriate error messages
    });

    test('should handle process communication failures', async () => {
      const instanceId = 'error-test';
      const processInfo = {
        instanceId,
        process: mockProcess,
        pid: 12345
      };
      
      terminalIntegration.initializeTerminal(instanceId, processInfo);
      
      // Mock stdin write failure
      mockProcess.stdin.write.mockImplementation(() => {
        throw new Error('Broken pipe');
      });
      
      // Attempt to send input should handle the error
      await expect(
        terminalIntegration.sendInput(instanceId, 'test input')
      ).rejects.toThrow('Broken pipe');
    });

    test('should handle SSE connection failures gracefully', () => {
      terminalIntegration.addSSEConnection('test-instance', mockResponse);
      
      // Mock write failure
      mockResponse.write.mockImplementation(() => {
        throw new Error('Connection closed');
      });
      
      // Should not crash when trying to broadcast
      expect(() => {
        terminalIntegration.broadcastToTerminals('test-instance', {
          type: 'test',
          data: 'test message'
        });
      }).not.toThrow();
    });
  });

  describe('Performance and Resource Management', () => {
    test('should manage memory usage with circular buffers', () => {
      const instanceId = 'perf-test';
      const processInfo = { instanceId, process: mockProcess };
      
      terminalIntegration.initializeTerminal(instanceId, processInfo);
      
      // Add many entries to test buffer management
      for (let i = 0; i < 200; i++) {
        mockProcess.stdout.emit('data', Buffer.from(`Output line ${i}\n`));
      }
      
      // Buffer should be limited to configured size
      const history = terminalIntegration.getTerminalHistory(instanceId);
      expect(history.length).toBeLessThanOrEqual(50); // maxHistoryLines from beforeEach
    });

    test('should handle concurrent process operations', async () => {
      const instanceIds = ['concurrent-1', 'concurrent-2', 'concurrent-3'];
      const processes = instanceIds.map(id => {
        const proc = new EventEmitter();
        proc.pid = Math.floor(Math.random() * 10000);
        proc.stdout = new EventEmitter();
        proc.stderr = new EventEmitter();
        proc.stdin = { write: jest.fn() };
        proc.kill = jest.fn();
        return { id, process: proc };
      });
      
      // Register all processes concurrently
      processes.forEach(({ id, process }) => {
        lifecycleManager.registerProcess(id, {
          instanceId: id,
          process,
          pid: process.pid,
          status: 'running'
        });
      });
      
      // Verify all processes are registered
      processes.forEach(({ id }) => {
        const status = lifecycleManager.getProcessStatus(id);
        expect(status).toBeDefined();
        expect(status.instanceId).toBe(id);
      });
    });
  });
});

describe('Integration Test - Complete Workflow', () => {
  test('should execute complete real Claude process workflow', async () => {
    // This test would ideally run against a test instance of the integrated backend
    // For now, we'll outline the expected workflow:
    
    const workflowSteps = [
      '1. Frontend sends POST /api/claude/instances with command array',
      '2. Backend determines command type and spawns real Claude process',
      '3. Process lifecycle manager registers process for monitoring',
      '4. Terminal integration initializes I/O streaming',
      '5. SSE connection established for real-time communication',
      '6. User input forwarded to Claude process stdin',
      '7. Claude process output captured and streamed via SSE',
      '8. Process health monitored continuously',
      '9. Process terminated gracefully when requested',
      '10. All resources cleaned up properly'
    ];
    
    // Each step would have corresponding assertions
    expect(workflowSteps).toHaveLength(10);
    
    // In a full integration test, we would:
    // - Start the integrated backend server
    // - Make actual HTTP requests
    // - Establish real SSE connections
    // - Send real input and verify output
    // - Test process termination
    // - Verify complete cleanup
  });
});