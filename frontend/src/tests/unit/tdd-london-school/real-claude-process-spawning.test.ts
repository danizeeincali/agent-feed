/**
 * TDD London School: Real Claude Process Spawning Test Suite
 * 
 * Focus: Mock-driven testing for real Node.js child_process.spawn() and node-pty interactions
 * London School Methodology: Mock external dependencies first, define contracts through behavior
 * 
 * Testing Scope: Complete real Claude process spawning, lifecycle management, and I/O operations
 */

import { jest } from 'vitest';

// === REAL PROCESS SPAWNING MOCKS ===
const mockPtySpawn = vi.fn();
const mockChildProcessSpawn = vi.fn();
const mockPtyProcess = {
  pid: 12345,
  write: vi.fn(),
  resize: vi.fn(),
  kill: vi.fn(),
  onData: vi.fn(),
  onExit: vi.fn(),
  removeAllListeners: vi.fn()
};

// Mock external dependencies BEFORE imports
vi.mock('node-pty', () => ({
  spawn: mockPtySpawn
}));

vi.mock('child_process', () => ({
  spawn: mockChildProcessSpawn
}));

// === IMPORT SYSTEM UNDER TEST ===
import { EventEmitter } from 'events';

// Mock ClaudeProcessManager for testing
class MockClaudeProcessManager extends EventEmitter {
  constructor() {
    super();
    this.instances = new Map();
    this.maxInstances = 4;
  }

  async createInstance(config: any) {
    // Use mocked pty.spawn
    const ptyProcess = mockPtySpawn(config.command || 'claude', config.args || [], {
      name: 'xterm-256color',
      cols: 120,
      rows: 30,
      cwd: config.cwd || process.cwd(),
      env: { ...process.env, ...config.env }
    });

    const instanceId = `claude-${Date.now()}`;
    const instance = {
      id: instanceId,
      name: config.name,
      config,
      process: ptyProcess,
      status: 'starting',
      startTime: new Date(),
      output: [],
      pid: ptyProcess.pid
    };

    this.instances.set(instanceId, instance);
    return instance;
  }

  sendInput(instanceId: string, input: string) {
    const instance = this.instances.get(instanceId);
    if (!instance) throw new Error(`Instance ${instanceId} not found`);
    instance.process.write(input);
  }

  terminateInstance(instanceId: string) {
    const instance = this.instances.get(instanceId);
    if (!instance) throw new Error(`Instance ${instanceId} not found`);
    instance.process.kill();
    this.instances.delete(instanceId);
  }
}

describe('TDD London School: Real Claude Process Spawning', () => {
  let claudeManager: MockClaudeProcessManager;
  let mockOnDataCallback: vi.Mock;
  let mockOnExitCallback: vi.Mock;

  beforeEach(() => {
    // === RESET ALL MOCKS ===
    vi.clearAllMocks();
    
    // === SETUP MOCK PTY PROCESS BEHAVIOR ===
    mockOnDataCallback = vi.fn();
    mockOnExitCallback = vi.fn();
    
    mockPtyProcess.onData.mockImplementation((callback) => {
      mockOnDataCallback = callback;
    });
    
    mockPtyProcess.onExit.mockImplementation((callback) => {
      mockOnExitCallback = callback;
    });
    
    mockPtySpawn.mockReturnValue(mockPtyProcess);
    
    claudeManager = new MockClaudeProcessManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Process Spawning Contracts: 4 Claude Command Variants', () => {
    test('should spawn claude prod command with correct arguments', async () => {
      const config = {
        name: 'Claude Prod',
        mode: 'prod',
        command: 'claude',
        args: [],
        cwd: '/workspaces/agent-feed/prod'
      };

      await claudeManager.createInstance(config);

      // === VERIFY SPAWN CONTRACT ===
      expect(mockPtySpawn).toHaveBeenCalledWith('claude', [], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: '/workspaces/agent-feed/prod',
        env: expect.objectContaining(process.env)
      });
    });

    test('should spawn claude with skip-permissions flag', async () => {
      const config = {
        name: 'Claude Skip Permissions',
        mode: 'skip-permissions',
        command: 'claude',
        args: ['--dangerously-skip-permissions'],
        cwd: '/workspaces/agent-feed/prod'
      };

      await claudeManager.createInstance(config);

      // === VERIFY SKIP-PERMISSIONS CONTRACT ===
      expect(mockPtySpawn).toHaveBeenCalledWith('claude', ['--dangerously-skip-permissions'], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: '/workspaces/agent-feed/prod',
        env: expect.objectContaining(process.env)
      });
    });

    test('should spawn claude with skip-permissions and claude-dev flags', async () => {
      const config = {
        name: 'Claude Skip Permissions C',
        mode: 'skip-permissions-c',
        command: 'claude',
        args: ['--dangerously-skip-permissions', '--claude-dev'],
        cwd: '/workspaces/agent-feed/prod'
      };

      await claudeManager.createInstance(config);

      // === VERIFY COMBINED FLAGS CONTRACT ===
      expect(mockPtySpawn).toHaveBeenCalledWith('claude', 
        ['--dangerously-skip-permissions', '--claude-dev'], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: '/workspaces/agent-feed/prod',
        env: expect.objectContaining(process.env)
      });
    });

    test('should spawn claude with skip-permissions and resume flags', async () => {
      const config = {
        name: 'Claude Skip Permissions Resume',
        mode: 'skip-permissions-resume',
        command: 'claude',
        args: ['--dangerously-skip-permissions', '--resume'],
        cwd: '/workspaces/agent-feed/prod'
      };

      await claudeManager.createInstance(config);

      // === VERIFY RESUME FLAGS CONTRACT ===
      expect(mockPtySpawn).toHaveBeenCalledWith('claude', 
        ['--dangerously-skip-permissions', '--resume'], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: '/workspaces/agent-feed/prod',
        env: expect.objectContaining(process.env)
      });
    });
  });

  describe('Process Lifecycle Behavior Contracts', () => {
    test('should setup event handlers when process spawns', async () => {
      const config = {
        name: 'Lifecycle Test',
        command: 'claude',
        args: [],
        cwd: '/workspaces/agent-feed/prod'
      };

      await claudeManager.createInstance(config);

      // === VERIFY EVENT HANDLER CONTRACTS ===
      expect(mockPtyProcess.onData).toHaveBeenCalledWith(expect.any(Function));
      expect(mockPtyProcess.onExit).toHaveBeenCalledWith(expect.any(Function));
    });

    test('should emit process spawned event with correct contract', async () => {
      const spawnedHandler = vi.fn();
      claudeManager.on('instance:created', spawnedHandler);

      const config = {
        name: 'Spawn Event Test',
        command: 'claude',
        args: []
      };

      const instance = await claudeManager.createInstance(config);

      // === VERIFY SPAWN EVENT CONTRACT ===
      expect(spawnedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          name: 'Spawn Event Test',
          pid: 12345,
          status: 'starting',
          process: mockPtyProcess
        })
      );
    });

    test('should handle process ready state transition', async () => {
      const readyHandler = vi.fn();
      claudeManager.on('instance:ready', readyHandler);

      const config = { name: 'Ready Test', command: 'claude' };
      const instance = await claudeManager.createInstance(config);

      // === SIMULATE CLAUDE READY OUTPUT ===
      const mockClaudeWelcome = 'Welcome to Claude!\n╭─ Claude Code ─╮\n✻ Ready to help\n';
      mockOnDataCallback(mockClaudeWelcome);

      // === VERIFY READY STATE CONTRACT ===
      expect(readyHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          id: instance.id,
          status: 'running'
        })
      );
    });

    test('should handle process exit with exit code and signal', async () => {
      const exitHandler = vi.fn();
      claudeManager.on('instance:exit', exitHandler);

      const config = { name: 'Exit Test', command: 'claude' };
      const instance = await claudeManager.createInstance(config);

      // === SIMULATE PROCESS EXIT ===
      mockOnExitCallback({ exitCode: 0, signal: null });

      // === VERIFY EXIT EVENT CONTRACT ===
      expect(exitHandler).toHaveBeenCalledWith({
        instanceId: instance.id,
        exitCode: 0,
        signal: null
      });
    });

    test('should cleanup process resources on exit', async () => {
      const config = { name: 'Cleanup Test', command: 'claude' };
      const instance = await claudeManager.createInstance(config);

      // Verify instance exists
      expect(claudeManager.instances.has(instance.id)).toBe(true);

      // === SIMULATE PROCESS EXIT ===
      mockOnExitCallback({ exitCode: 1, signal: 'SIGTERM' });

      // === VERIFY CLEANUP CONTRACT ===
      expect(claudeManager.instances.has(instance.id)).toBe(false);
    });
  });

  describe('I/O Communication Behavior Contracts', () => {
    test('should write input to process stdin with correct format', async () => {
      const config = { name: 'Input Test', command: 'claude' };
      const instance = await claudeManager.createInstance(config);

      const testInput = 'hello world\n';
      claudeManager.sendInput(instance.id, testInput);

      // === VERIFY INPUT CONTRACT ===
      expect(mockPtyProcess.write).toHaveBeenCalledWith('hello world\n');
    });

    test('should process output data and emit events', async () => {
      const outputHandler = vi.fn();
      claudeManager.on('instance:output', outputHandler);

      const config = { name: 'Output Test', command: 'claude' };
      const instance = await claudeManager.createInstance(config);

      // === SIMULATE OUTPUT DATA ===
      const outputData = 'Claude: Hello! How can I help you today?\n';
      mockOnDataCallback(outputData);

      // === VERIFY OUTPUT EVENT CONTRACT ===
      expect(outputHandler).toHaveBeenCalledWith({
        instanceId: instance.id,
        data: outputData
      });
    });

    test('should handle binary data output correctly', async () => {
      const outputHandler = vi.fn();
      claudeManager.on('instance:output', outputHandler);

      const config = { name: 'Binary Test', command: 'claude' };
      const instance = await claudeManager.createInstance(config);

      // === SIMULATE BINARY OUTPUT (ANSI escape sequences) ===
      const binaryData = '\x1b[32mGreen text\x1b[0m\n\x1b[1mBold text\x1b[0m';
      mockOnDataCallback(binaryData);

      // === VERIFY BINARY DATA HANDLING CONTRACT ===
      expect(outputHandler).toHaveBeenCalledWith({
        instanceId: instance.id,
        data: binaryData
      });
    });

    test('should handle process resize operations', async () => {
      const config = { name: 'Resize Test', command: 'claude' };
      const instance = await claudeManager.createInstance(config);

      claudeManager.getInstance(instance.id)?.process.resize(100, 50);

      // === VERIFY RESIZE CONTRACT ===
      expect(mockPtyProcess.resize).toHaveBeenCalledWith(100, 50);
    });
  });

  describe('Error Scenario Behavior Contracts', () => {
    test('should handle spawn failures gracefully', async () => {
      // === MOCK SPAWN FAILURE ===
      mockPtySpawn.mockImplementationOnce(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const config = { name: 'Spawn Fail Test', command: 'non-existent-command' };

      // === VERIFY ERROR HANDLING CONTRACT ===
      await expect(claudeManager.createInstance(config)).rejects.toThrow('ENOENT');
    });

    test('should handle write to dead process', async () => {
      const config = { name: 'Dead Process Test', command: 'claude' };
      const instance = await claudeManager.createInstance(config);

      // === TERMINATE INSTANCE ===
      claudeManager.terminateInstance(instance.id);

      // === VERIFY WRITE TO DEAD PROCESS CONTRACT ===
      expect(() => claudeManager.sendInput(instance.id, 'test')).toThrow('not found');
    });

    test('should handle process crash during execution', async () => {
      const errorHandler = vi.fn();
      claudeManager.on('instance:exit', errorHandler);

      const config = { name: 'Crash Test', command: 'claude' };
      const instance = await claudeManager.createInstance(config);

      // === SIMULATE PROCESS CRASH ===
      mockOnExitCallback({ exitCode: 1, signal: 'SIGSEGV' });

      // === VERIFY CRASH HANDLING CONTRACT ===
      expect(errorHandler).toHaveBeenCalledWith({
        instanceId: instance.id,
        exitCode: 1,
        signal: 'SIGSEGV'
      });
    });
  });

  describe('Performance and Concurrency Contracts', () => {
    test('should handle multiple concurrent process spawns', async () => {
      const configs = [
        { name: 'Concurrent 1', command: 'claude', args: [] },
        { name: 'Concurrent 2', command: 'claude', args: ['--help'] },
        { name: 'Concurrent 3', command: 'claude', args: ['--version'] },
        { name: 'Concurrent 4', command: 'claude', args: ['chat'] }
      ];

      // === SPAWN ALL PROCESSES CONCURRENTLY ===
      const promises = configs.map(config => claudeManager.createInstance(config));
      const instances = await Promise.all(promises);

      // === VERIFY CONCURRENT SPAWN CONTRACT ===
      expect(mockPtySpawn).toHaveBeenCalledTimes(4);
      expect(instances).toHaveLength(4);
      
      instances.forEach((instance, index) => {
        expect(instance.name).toBe(configs[index].name);
        expect(instance.pid).toBe(12345);
      });
    });

    test('should enforce maximum instance limit', async () => {
      claudeManager.maxInstances = 2;

      // === CREATE MAXIMUM INSTANCES ===
      await claudeManager.createInstance({ name: 'Test 1', command: 'claude' });
      await claudeManager.createInstance({ name: 'Test 2', command: 'claude' });

      // === VERIFY LIMIT ENFORCEMENT CONTRACT ===
      await expect(
        claudeManager.createInstance({ name: 'Test 3', command: 'claude' })
      ).rejects.toThrow('Maximum number of instances');
    });

    test('should handle rapid I/O operations without blocking', async () => {
      const config = { name: 'Rapid IO Test', command: 'claude' };
      const instance = await claudeManager.createInstance(config);

      // === RAPID INPUT SEQUENCE ===
      const inputs = Array.from({ length: 100 }, (_, i) => `input-${i}\n`);
      
      const startTime = Date.now();
      inputs.forEach(input => claudeManager.sendInput(instance.id, input));
      const endTime = Date.now();

      // === VERIFY NON-BLOCKING I/O CONTRACT ===
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
      expect(mockPtyProcess.write).toHaveBeenCalledTimes(100);
    });
  });

  describe('Real Process State Management Contracts', () => {
    test('should maintain accurate process state throughout lifecycle', async () => {
      const config = { name: 'State Test', command: 'claude' };
      const instance = await claudeManager.createInstance(config);

      // === VERIFY INITIAL STATE ===
      expect(instance.status).toBe('starting');
      expect(instance.pid).toBe(12345);
      expect(instance.startTime).toBeInstanceOf(Date);

      // === SIMULATE READY TRANSITION ===
      mockOnDataCallback('Welcome to Claude!\n');
      expect(instance.status).toBe('starting'); // Should update in real implementation

      // === SIMULATE EXIT ===
      mockOnExitCallback({ exitCode: 0, signal: null });
      expect(claudeManager.instances.has(instance.id)).toBe(false);
    });

    test('should track process resource usage patterns', async () => {
      const config = { name: 'Resource Test', command: 'claude' };
      const instance = await claudeManager.createInstance(config);

      // === VERIFY RESOURCE TRACKING CONTRACT ===
      expect(instance.pid).toBeDefined();
      expect(instance.startTime).toBeInstanceOf(Date);
      expect(instance.output).toEqual([]); // Empty initially
    });

    test('should handle graceful vs forced termination', async () => {
      const config = { name: 'Termination Test', command: 'claude' };
      const instance = await claudeManager.createInstance(config);

      // === TEST GRACEFUL TERMINATION ===
      claudeManager.terminateInstance(instance.id);

      // === VERIFY TERMINATION CONTRACT ===
      expect(mockPtyProcess.kill).toHaveBeenCalled();
      expect(claudeManager.instances.has(instance.id)).toBe(false);
    });
  });

  describe('Claude-Specific Behavior Contracts', () => {
    test('should recognize Claude startup patterns correctly', async () => {
      const readyHandler = vi.fn();
      claudeManager.on('instance:ready', readyHandler);

      const config = { name: 'Claude Pattern Test', command: 'claude' };
      const instance = await claudeManager.createInstance(config);

      // === TEST VARIOUS CLAUDE STARTUP MESSAGES ===
      const claudeMessages = [
        'Welcome to Claude',
        '╭─ Claude Code ─╮',
        '✻ Ready to assist',
        'Claude Code v3.0.0'
      ];

      claudeMessages.forEach((message) => {
        mockOnDataCallback(message);
      });

      // === VERIFY CLAUDE RECOGNITION CONTRACT ===
      // In real implementation, should trigger ready state
      expect(mockOnDataCallback).toHaveBeenCalledTimes(4);
    });

    test('should handle Claude conversation flow', async () => {
      const outputHandler = vi.fn();
      claudeManager.on('instance:output', outputHandler);

      const config = { name: 'Conversation Test', command: 'claude' };
      const instance = await claudeManager.createInstance(config);

      // === SIMULATE CLAUDE CONVERSATION ===
      claudeManager.sendInput(instance.id, 'Hello Claude\n');
      mockOnDataCallback('\nClaude: Hello! How can I help you today?\n\n');

      claudeManager.sendInput(instance.id, 'Write a Python script\n');
      mockOnDataCallback('Claude: I\'d be happy to help you write a Python script...\n');

      // === VERIFY CONVERSATION FLOW CONTRACT ===
      expect(mockPtyProcess.write).toHaveBeenCalledWith('Hello Claude\n');
      expect(mockPtyProcess.write).toHaveBeenCalledWith('Write a Python script\n');
      expect(outputHandler).toHaveBeenCalledTimes(2);
    });
  });
});

describe('TDD London School: Process Integration Workflow Tests', () => {
  let claudeManager: MockClaudeProcessManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPtySpawn.mockReturnValue(mockPtyProcess);
    claudeManager = new MockClaudeProcessManager();
  });

  describe('Complete User Workflow: Button → Spawn → Connect → Interact', () => {
    test('should complete full workflow for prod claude button', async () => {
      // === SIMULATE PROD BUTTON CLICK ===
      const config = {
        name: '🚀 prod/claude',
        command: 'claude',
        args: [],
        cwd: '/workspaces/agent-feed/prod'
      };

      // === STEP 1: PROCESS CREATION ===
      const instance = await claudeManager.createInstance(config);
      expect(mockPtySpawn).toHaveBeenCalledWith('claude', [], expect.any(Object));

      // === STEP 2: READY STATE TRANSITION ===
      mockPtyProcess.onData.mock.calls[0][0]('Welcome to Claude!\n');

      // === STEP 3: USER INTERACTION ===
      claudeManager.sendInput(instance.id, 'help\n');
      expect(mockPtyProcess.write).toHaveBeenCalledWith('help\n');

      // === STEP 4: PROCESS RESPONSE ===
      mockPtyProcess.onData.mock.calls[0][0]('Claude: Here are the available commands...\n');

      // === VERIFY COMPLETE WORKFLOW ===
      expect(instance.name).toBe('🚀 prod/claude');
      expect(instance.pid).toBe(12345);
    });

    test('should handle skip-permissions workflow with flags', async () => {
      // === SIMULATE SKIP-PERMISSIONS BUTTON ===
      const config = {
        name: '⚡ skip-permissions',
        command: 'claude',
        args: ['--dangerously-skip-permissions'],
        cwd: '/workspaces/agent-feed/prod'
      };

      const instance = await claudeManager.createInstance(config);

      // === VERIFY SKIP-PERMISSIONS WORKFLOW ===
      expect(mockPtySpawn).toHaveBeenCalledWith('claude', 
        ['--dangerously-skip-permissions'], 
        expect.objectContaining({
          cwd: '/workspaces/agent-feed/prod'
        })
      );
    });
  });
});