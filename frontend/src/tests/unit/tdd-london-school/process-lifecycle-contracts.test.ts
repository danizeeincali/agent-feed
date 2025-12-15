/**
 * TDD London School: Process Lifecycle Contract Testing
 * 
 * Focus: Complete process lifecycle from spawn → ready → running → exit
 * London School Methodology: Mock all process events, verify behavior contracts
 * 
 * Testing: Event-driven process management, state transitions, resource cleanup
 */

import { jest } from 'vitest';
import { EventEmitter } from 'events';

// === PROCESS LIFECYCLE MOCKS ===
const mockProcessEventEmitter = new EventEmitter();
const mockPtyProcess = {
  pid: 54321,
  write: vi.fn(),
  resize: vi.fn(),
  kill: vi.fn(),
  onData: vi.fn(),
  onExit: vi.fn(),
  removeAllListeners: vi.fn(),
  // Add EventEmitter capabilities
  ...mockProcessEventEmitter
};

const mockPtySpawn = vi.fn().mockReturnValue(mockPtyProcess);

vi.mock('node-pty', () => ({
  spawn: mockPtySpawn
}));

// === PROCESS LIFECYCLE MANAGER ===
class ProcessLifecycleManager extends EventEmitter {
  private processes = new Map<string, any>();
  private eventHandlers = new Map<string, Map<string, Function[]>>();

  async createProcess(config: any) {
    const processId = `proc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const ptyProcess = mockPtySpawn(config.command, config.args, {
      cwd: config.cwd,
      env: config.env
    });

    const processInfo = {
      id: processId,
      process: ptyProcess,
      config,
      status: 'spawning',
      startTime: Date.now(),
      lastActivity: Date.now(),
      outputBuffer: [],
      eventHandlers: new Map<string, Function[]>()
    };

    // Setup lifecycle event handlers
    this.setupProcessEventHandlers(processId, processInfo);
    
    this.processes.set(processId, processInfo);
    
    // Emit process created event
    this.emit('process:created', {
      processId,
      pid: ptyProcess.pid,
      config
    });

    return processInfo;
  }

  private setupProcessEventHandlers(processId: string, processInfo: any) {
    const { process: ptyProcess } = processInfo;

    // === DATA EVENT HANDLER ===
    const dataHandler = (data: string) => {
      processInfo.lastActivity = Date.now();
      processInfo.outputBuffer.push(data);
      
      // Check for ready state indicators
      if (processInfo.status === 'spawning') {
        if (this.isProcessReady(data)) {
          processInfo.status = 'ready';
          this.emit('process:ready', {
            processId,
            pid: ptyProcess.pid,
            readyTime: Date.now() - processInfo.startTime
          });
        }
      }

      this.emit('process:data', {
        processId,
        data,
        timestamp: Date.now()
      });
    };

    // === EXIT EVENT HANDLER ===
    const exitHandler = ({ exitCode, signal }: { exitCode: number; signal: string | null }) => {
      processInfo.status = 'exited';
      processInfo.exitCode = exitCode;
      processInfo.exitSignal = signal;
      processInfo.endTime = Date.now();

      this.emit('process:exit', {
        processId,
        pid: ptyProcess.pid,
        exitCode,
        signal,
        runtime: processInfo.endTime - processInfo.startTime
      });

      // Cleanup process
      this.cleanupProcess(processId);
    };

    // === ERROR EVENT HANDLER ===
    const errorHandler = (error: Error) => {
      processInfo.status = 'error';
      processInfo.error = error;

      this.emit('process:error', {
        processId,
        pid: ptyProcess.pid,
        error: error.message
      });
    };

    // Register handlers with mock
    ptyProcess.onData(dataHandler);
    ptyProcess.onExit(exitHandler);

    // Store handler references for cleanup
    processInfo.eventHandlers.set('data', [dataHandler]);
    processInfo.eventHandlers.set('exit', [exitHandler]);
    processInfo.eventHandlers.set('error', [errorHandler]);
  }

  private isProcessReady(data: string): boolean {
    const readyIndicators = [
      'Welcome to Claude',
      'Claude Code',
      'Ready to help',
      '$ ', // Shell prompt
      '> ', // Command prompt
      'claude>'
    ];
    
    return readyIndicators.some(indicator => data.includes(indicator));
  }

  private cleanupProcess(processId: string) {
    const processInfo = this.processes.get(processId);
    if (!processInfo) return;

    // Remove all event handlers
    processInfo.eventHandlers.forEach((handlers: Function[], event: string) => {
      handlers.forEach(handler => {
        // In real implementation, would remove from actual process
      });
    });

    // Remove from active processes
    this.processes.delete(processId);

    this.emit('process:cleanup', { processId });
  }

  getProcess(processId: string) {
    return this.processes.get(processId);
  }

  getAllProcesses() {
    return Array.from(this.processes.values());
  }

  sendInput(processId: string, input: string) {
    const processInfo = this.processes.get(processId);
    if (!processInfo) throw new Error(`Process ${processId} not found`);
    
    processInfo.lastActivity = Date.now();
    processInfo.process.write(input);
    
    this.emit('process:input', { processId, input });
  }

  killProcess(processId: string, signal: string = 'SIGTERM') {
    const processInfo = this.processes.get(processId);
    if (!processInfo) throw new Error(`Process ${processId} not found`);
    
    processInfo.status = 'killing';
    processInfo.process.kill(signal);
    
    this.emit('process:kill', { processId, signal });
  }
}

describe('TDD London School: Process Lifecycle Contracts', () => {
  let lifecycleManager: ProcessLifecycleManager;
  let mockDataCallback: Function;
  let mockExitCallback: Function;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // === SETUP MOCK CALLBACKS ===
    mockDataCallback = vi.fn();
    mockExitCallback = vi.fn();
    
    mockPtyProcess.onData.mockImplementation((callback) => {
      mockDataCallback = callback;
    });
    
    mockPtyProcess.onExit.mockImplementation((callback) => {
      mockExitCallback = callback;
    });
    
    lifecycleManager = new ProcessLifecycleManager();
  });

  describe('Process Creation and Spawning Contracts', () => {
    test('should emit process:created event with complete contract data', async () => {
      const createdHandler = vi.fn();
      lifecycleManager.on('process:created', createdHandler);

      const config = {
        command: 'claude',
        args: ['--help'],
        cwd: '/workspaces/agent-feed/prod',
        env: { CLAUDE_ENV: 'test' }
      };

      const processInfo = await lifecycleManager.createProcess(config);

      // === VERIFY CREATION CONTRACT ===
      expect(createdHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        pid: 54321,
        config: expect.objectContaining({
          command: 'claude',
          args: ['--help'],
          cwd: '/workspaces/agent-feed/prod'
        })
      });
    });

    test('should initialize process with correct initial state', async () => {
      const config = { command: 'claude', args: [] };
      const processInfo = await lifecycleManager.createProcess(config);

      // === VERIFY INITIAL STATE CONTRACT ===
      expect(processInfo.status).toBe('spawning');
      expect(processInfo.startTime).toBeGreaterThan(0);
      expect(processInfo.lastActivity).toBeGreaterThan(0);
      expect(processInfo.outputBuffer).toEqual([]);
      expect(processInfo.process.pid).toBe(54321);
    });

    test('should setup all required event handlers on creation', async () => {
      const config = { command: 'claude', args: [] };
      await lifecycleManager.createProcess(config);

      // === VERIFY EVENT HANDLER SETUP CONTRACT ===
      expect(mockPtyProcess.onData).toHaveBeenCalledWith(expect.any(Function));
      expect(mockPtyProcess.onExit).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Process Ready State Transition Contracts', () => {
    test('should transition to ready state on Claude welcome message', async () => {
      const readyHandler = vi.fn();
      lifecycleManager.on('process:ready', readyHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await lifecycleManager.createProcess(config);

      // === SIMULATE CLAUDE WELCOME MESSAGE ===
      mockDataCallback('Welcome to Claude\nReady to help you today!\n');

      // === VERIFY READY TRANSITION CONTRACT ===
      expect(readyHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        pid: 54321,
        readyTime: expect.any(Number)
      });
      
      expect(processInfo.status).toBe('ready');
    });

    test('should not transition to ready on regular output', async () => {
      const readyHandler = vi.fn();
      lifecycleManager.on('process:ready', readyHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await lifecycleManager.createProcess(config);

      // === SIMULATE REGULAR OUTPUT (NOT READY INDICATOR) ===
      mockDataCallback('Loading dependencies...\n');
      mockDataCallback('Initializing modules...\n');

      // === VERIFY NO PREMATURE READY TRANSITION ===
      expect(readyHandler).not.toHaveBeenCalled();
      expect(processInfo.status).toBe('spawning');
    });

    test('should handle multiple ready indicators correctly', async () => {
      const readyHandler = vi.fn();
      lifecycleManager.on('process:ready', readyHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await lifecycleManager.createProcess(config);

      // === TEST VARIOUS READY INDICATORS ===
      const readyMessages = [
        'Claude Code v3.0.0\nReady to help',
        '$ ', // Shell prompt
        'claude> ', // Claude prompt
        'Welcome to Claude\n╭─ Ready ─╮'
      ];

      readyMessages.forEach((message, index) => {
        // Reset state for next test
        processInfo.status = 'spawning';
        mockDataCallback(message);
        
        expect(readyHandler).toHaveBeenCalledTimes(index + 1);
        expect(processInfo.status).toBe('ready');
      });
    });
  });

  describe('Process Data Flow Contracts', () => {
    test('should emit process:data events with complete metadata', async () => {
      const dataHandler = vi.fn();
      lifecycleManager.on('process:data', dataHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await lifecycleManager.createProcess(config);

      const testData = 'Claude: Hello! How can I help?\n';
      const beforeTime = Date.now();
      
      // === SIMULATE DATA OUTPUT ===
      mockDataCallback(testData);

      // === VERIFY DATA EVENT CONTRACT ===
      expect(dataHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        data: testData,
        timestamp: expect.any(Number)
      });
      
      // Verify timestamp is reasonable
      const callArgs = dataHandler.mock.calls[0][0];
      expect(callArgs.timestamp).toBeGreaterThanOrEqual(beforeTime);
    });

    test('should update last activity timestamp on data', async () => {
      const config = { command: 'claude', args: [] };
      const processInfo = await lifecycleManager.createProcess(config);

      const initialActivity = processInfo.lastActivity;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // === SIMULATE DATA OUTPUT ===
      mockDataCallback('Some output data\n');

      // === VERIFY ACTIVITY UPDATE CONTRACT ===
      expect(processInfo.lastActivity).toBeGreaterThan(initialActivity);
    });

    test('should accumulate output in buffer correctly', async () => {
      const config = { command: 'claude', args: [] };
      const processInfo = await lifecycleManager.createProcess(config);

      const outputs = ['Line 1\n', 'Line 2\n', 'Line 3\n'];
      
      // === SIMULATE MULTIPLE OUTPUTS ===
      outputs.forEach(output => mockDataCallback(output));

      // === VERIFY OUTPUT BUFFER CONTRACT ===
      expect(processInfo.outputBuffer).toEqual(outputs);
    });
  });

  describe('Process Input Handling Contracts', () => {
    test('should write input to process and emit input event', async () => {
      const inputHandler = vi.fn();
      lifecycleManager.on('process:input', inputHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await lifecycleManager.createProcess(config);

      const testInput = 'help\n';
      
      // === SEND INPUT ===
      lifecycleManager.sendInput(processInfo.id, testInput);

      // === VERIFY INPUT HANDLING CONTRACT ===
      expect(mockPtyProcess.write).toHaveBeenCalledWith(testInput);
      expect(inputHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        input: testInput
      });
    });

    test('should update last activity on input', async () => {
      const config = { command: 'claude', args: [] };
      const processInfo = await lifecycleManager.createProcess(config);

      const initialActivity = processInfo.lastActivity;
      await new Promise(resolve => setTimeout(resolve, 10));

      // === SEND INPUT ===
      lifecycleManager.sendInput(processInfo.id, 'test input\n');

      // === VERIFY ACTIVITY UPDATE ON INPUT ===
      expect(processInfo.lastActivity).toBeGreaterThan(initialActivity);
    });

    test('should handle input to non-existent process', async () => {
      // === VERIFY ERROR HANDLING CONTRACT ===
      expect(() => {
        lifecycleManager.sendInput('non-existent-process', 'test\n');
      }).toThrow('Process non-existent-process not found');
    });
  });

  describe('Process Exit and Cleanup Contracts', () => {
    test('should handle normal process exit with cleanup', async () => {
      const exitHandler = vi.fn();
      const cleanupHandler = vi.fn();
      
      lifecycleManager.on('process:exit', exitHandler);
      lifecycleManager.on('process:cleanup', cleanupHandler);

      const config = { command: 'claude', args: ['--version'] };
      const processInfo = await lifecycleManager.createProcess(config);

      const startTime = Date.now();
      
      // === SIMULATE NORMAL EXIT ===
      mockExitCallback({ exitCode: 0, signal: null });

      // === VERIFY EXIT CONTRACT ===
      expect(exitHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        pid: 54321,
        exitCode: 0,
        signal: null,
        runtime: expect.any(Number)
      });

      // === VERIFY CLEANUP CONTRACT ===
      expect(cleanupHandler).toHaveBeenCalledWith({
        processId: processInfo.id
      });

      // === VERIFY PROCESS REMOVAL ===
      expect(lifecycleManager.getProcess(processInfo.id)).toBeUndefined();
    });

    test('should handle process exit with signal', async () => {
      const exitHandler = vi.fn();
      lifecycleManager.on('process:exit', exitHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await lifecycleManager.createProcess(config);

      // === SIMULATE SIGNAL EXIT ===
      mockExitCallback({ exitCode: 1, signal: 'SIGTERM' });

      // === VERIFY SIGNAL EXIT CONTRACT ===
      expect(exitHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        pid: 54321,
        exitCode: 1,
        signal: 'SIGTERM',
        runtime: expect.any(Number)
      });

      expect(processInfo.status).toBe('exited');
      expect(processInfo.exitCode).toBe(1);
      expect(processInfo.exitSignal).toBe('SIGTERM');
    });

    test('should handle graceful process termination', async () => {
      const killHandler = vi.fn();
      lifecycleManager.on('process:kill', killHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await lifecycleManager.createProcess(config);

      // === KILL PROCESS GRACEFULLY ===
      lifecycleManager.killProcess(processInfo.id, 'SIGTERM');

      // === VERIFY KILL CONTRACT ===
      expect(killHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        signal: 'SIGTERM'
      });
      
      expect(mockPtyProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(processInfo.status).toBe('killing');
    });

    test('should handle force kill process', async () => {
      const config = { command: 'claude', args: [] };
      const processInfo = await lifecycleManager.createProcess(config);

      // === FORCE KILL PROCESS ===
      lifecycleManager.killProcess(processInfo.id, 'SIGKILL');

      // === VERIFY FORCE KILL CONTRACT ===
      expect(mockPtyProcess.kill).toHaveBeenCalledWith('SIGKILL');
    });
  });

  describe('Process State Consistency Contracts', () => {
    test('should maintain consistent state throughout lifecycle', async () => {
      const config = { command: 'claude', args: [] };
      const processInfo = await lifecycleManager.createProcess(config);

      // === VERIFY INITIAL STATE ===
      expect(processInfo.status).toBe('spawning');

      // === TRANSITION TO READY ===
      mockDataCallback('Welcome to Claude\n');
      expect(processInfo.status).toBe('ready');

      // === SEND INPUT (SHOULD REMAIN READY) ===
      lifecycleManager.sendInput(processInfo.id, 'help\n');
      expect(processInfo.status).toBe('ready');

      // === PROCESS OUTPUT (SHOULD REMAIN READY) ===
      mockDataCallback('Available commands:\n');
      expect(processInfo.status).toBe('ready');

      // === EXIT PROCESS ===
      mockExitCallback({ exitCode: 0, signal: null });
      expect(processInfo.status).toBe('exited');
    });

    test('should track process timing correctly', async () => {
      const config = { command: 'claude', args: [] };
      const processInfo = await lifecycleManager.createProcess(config);

      const creationTime = processInfo.startTime;
      expect(creationTime).toBeGreaterThan(0);

      // === SIMULATE SOME RUNTIME ===
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // === EXIT PROCESS ===
      mockExitCallback({ exitCode: 0, signal: null });

      // === VERIFY TIMING CONTRACT ===
      expect(processInfo.endTime).toBeGreaterThan(creationTime);
      expect(processInfo.endTime - creationTime).toBeGreaterThanOrEqual(50);
    });

    test('should handle process state errors gracefully', async () => {
      const errorHandler = vi.fn();
      lifecycleManager.on('process:error', errorHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await lifecycleManager.createProcess(config);

      // === SIMULATE PROCESS ERROR ===
      const testError = new Error('Process crashed unexpectedly');
      
      // Manually trigger error handler (in real implementation, would come from process)
      const errorHandlerFn = processInfo.eventHandlers.get('error')?.[0];
      if (errorHandlerFn) errorHandlerFn(testError);

      // === VERIFY ERROR HANDLING CONTRACT ===
      expect(errorHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        pid: 54321,
        error: 'Process crashed unexpectedly'
      });

      expect(processInfo.status).toBe('error');
      expect(processInfo.error).toBe(testError);
    });
  });

  describe('Multi-Process Lifecycle Management', () => {
    test('should manage multiple processes independently', async () => {
      const configs = [
        { command: 'claude', args: ['--help'] },
        { command: 'claude', args: ['--version'] },
        { command: 'claude', args: ['chat'] }
      ];

      // === CREATE MULTIPLE PROCESSES ===
      const processes = await Promise.all(
        configs.map(config => lifecycleManager.createProcess(config))
      );

      // === VERIFY INDEPENDENT MANAGEMENT ===
      expect(processes).toHaveLength(3);
      expect(lifecycleManager.getAllProcesses()).toHaveLength(3);

      // === TRANSITION PROCESSES INDEPENDENTLY ===
      processes.forEach((proc, index) => {
        mockDataCallback(`Process ${index} ready\n`);
        expect(proc.status).toBe('ready');
      });

      // === EXIT ONE PROCESS ===
      mockExitCallback({ exitCode: 0, signal: null });
      
      // Should still have remaining processes
      expect(lifecycleManager.getAllProcesses().length).toBeGreaterThan(0);
    });
  });
});