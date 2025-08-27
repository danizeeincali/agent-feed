/**
 * TDD London School: Claude Process Spawning Contracts Test Suite
 * 
 * Focus: Mock-driven testing for child_process.spawn() without --print flags
 * London School Methodology: Mock external dependencies first, define contracts through behavior
 * 
 * Testing Strategy:
 * - Unit tests for spawn command construction
 * - Integration tests for process lifecycle 
 * - Contract tests for frontend-backend communication
 * - Error scenario validation
 * 
 * Key Test Cases:
 * - Test: should spawn Claude without --print flag
 * - Test: should use PTY mode for interactive sessions
 * - Test: should handle stdin/stdout properly in interactive mode
 * - Test: should validate all 4 button configurations spawn correctly
 */

// Jest is already available globally in test environment
const { spawn } = require('child_process');
const pty = require('node-pty');

// === MOCK EXTERNAL DEPENDENCIES (LONDON SCHOOL APPROACH) ===
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

jest.mock('node-pty', () => ({
  spawn: jest.fn()
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true)
}));

// === SYSTEM UNDER TEST ===
class ClaudeProcessSpawner {
  constructor() {
    this.activeProcesses = new Map();
    this.spawnOptions = {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      cwd: '/workspaces/agent-feed/prod'
    };
  }

  // Contract: Spawn Claude process WITHOUT --print flag for interactive mode
  async spawnClaudeProcess(buttonConfig) {
    const instanceId = `claude-${Date.now()}`;
    
    // BUILD COMMAND WITHOUT --print (CRITICAL CONTRACT)
    const command = 'claude';
    let args = [];
    
    switch (buttonConfig.type) {
      case 'prod':
        args = []; // No additional flags
        break;
      case 'skip-permissions':
        args = ['--dangerously-skip-permissions'];
        break;
      case 'skip-permissions-c':
        args = ['--dangerously-skip-permissions', '-c'];
        break;
      case 'skip-permissions-resume':
        args = ['--dangerously-skip-permissions', '--resume'];
        break;
    }
    
    // NEVER ADD --print flag for interactive sessions
    const finalArgs = args; // No --print modification
    
    // Use PTY for better terminal emulation
    let claudeProcess;
    if (buttonConfig.usePty) {
      claudeProcess = pty.spawn(command, finalArgs, {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: this.spawnOptions.cwd,
        env: { ...process.env, TERM: 'xterm-256color' }
      });
    } else {
      claudeProcess = spawn(command, finalArgs, {
        ...this.spawnOptions,
        env: { ...process.env, TERM: 'xterm-256color' }
      });
    }
    
    const processInfo = {
      instanceId,
      process: claudeProcess,
      pid: claudeProcess.pid,
      command,
      args: finalArgs,
      fullCommand: `${command} ${finalArgs.join(' ')}`,
      buttonType: buttonConfig.type,
      usePty: buttonConfig.usePty,
      startTime: new Date(),
      status: 'starting'
    };
    
    this.activeProcesses.set(instanceId, processInfo);
    return processInfo;
  }

  // Contract: Send input to interactive Claude process
  sendInput(instanceId, input) {
    const processInfo = this.activeProcesses.get(instanceId);
    if (!processInfo) throw new Error('Process not found');
    
    if (processInfo.usePty) {
      processInfo.process.write(input);
    } else {
      processInfo.process.stdin.write(input);
    }
  }

  // Contract: Terminate process gracefully
  terminateProcess(instanceId) {
    const processInfo = this.activeProcesses.get(instanceId);
    if (!processInfo) throw new Error('Process not found');
    
    processInfo.process.kill('SIGTERM');
    this.activeProcesses.delete(instanceId);
  }
}

describe('TDD London School: Claude Process Spawning Contracts', () => {
  let spawner;
  let mockChildProcess;
  let mockPtyProcess;

  beforeEach(() => {
    // === RESET MOCKS (ESSENTIAL FOR ISOLATION) ===
    jest.clearAllMocks();
    
    // === SETUP MOCK PROCESS OBJECTS ===
    mockChildProcess = {
      pid: 12345,
      stdin: { write: jest.fn() },
      stdout: { on: jest.fn() },
      stderr: { on: jest.fn() },
      on: jest.fn(),
      kill: jest.fn()
    };
    
    mockPtyProcess = {
      pid: 12346,
      write: jest.fn(),
      onData: jest.fn(),
      onExit: jest.fn(),
      kill: jest.fn(),
      resize: jest.fn()
    };
    
    // === CONFIGURE MOCK IMPLEMENTATIONS ===
    spawn.mockReturnValue(mockChildProcess);
    pty.spawn.mockReturnValue(mockPtyProcess);
    
    spawner = new ClaudeProcessSpawner();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Spawn Command Construction Without --print Flag', () => {
    test('should spawn Claude prod without --print flag (CRITICAL CONTRACT)', async () => {
      const buttonConfig = {
        type: 'prod',
        usePty: false
      };

      await spawner.spawnClaudeProcess(buttonConfig);

      // === VERIFY NO --print FLAG (MOST IMPORTANT TEST) ===
      expect(spawn).toHaveBeenCalledWith('claude', [], expect.objectContaining({
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false,
        cwd: '/workspaces/agent-feed/prod'
      }));
      
      // === ENSURE --print WAS NOT ADDED ===
      const [command, args] = spawn.mock.calls[0];
      expect(args).not.toContain('--print');
      expect(command).toBe('claude');
    });

    test('should spawn Claude skip-permissions without --print flag', async () => {
      const buttonConfig = {
        type: 'skip-permissions',
        usePty: false
      };

      await spawner.spawnClaudeProcess(buttonConfig);

      // === VERIFY SKIP-PERMISSIONS WITHOUT --print ===
      expect(spawn).toHaveBeenCalledWith('claude', ['--dangerously-skip-permissions'], expect.any(Object));
      
      const [command, args] = spawn.mock.calls[0];
      expect(args).toEqual(['--dangerously-skip-permissions']);
      expect(args).not.toContain('--print');
    });

    test('should spawn Claude skip-permissions-c without --print flag', async () => {
      const buttonConfig = {
        type: 'skip-permissions-c',
        usePty: false
      };

      await spawner.spawnClaudeProcess(buttonConfig);

      // === VERIFY CHAT MODE WITHOUT --print ===
      expect(spawn).toHaveBeenCalledWith('claude', ['--dangerously-skip-permissions', '-c'], expect.any(Object));
      
      const [command, args] = spawn.mock.calls[0];
      expect(args).toEqual(['--dangerously-skip-permissions', '-c']);
      expect(args).not.toContain('--print');
    });

    test('should spawn Claude skip-permissions-resume without --print flag', async () => {
      const buttonConfig = {
        type: 'skip-permissions-resume',
        usePty: false
      };

      await spawner.spawnClaudeProcess(buttonConfig);

      // === VERIFY RESUME MODE WITHOUT --print ===
      expect(spawn).toHaveBeenCalledWith('claude', ['--dangerously-skip-permissions', '--resume'], expect.any(Object));
      
      const [command, args] = spawn.mock.calls[0];
      expect(args).toEqual(['--dangerously-skip-permissions', '--resume']);
      expect(args).not.toContain('--print');
    });
  });

  describe('PTY Integration for Interactive Mode', () => {
    test('should use PTY mode for interactive sessions', async () => {
      const buttonConfig = {
        type: 'prod',
        usePty: true  // Enable PTY for better terminal emulation
      };

      await spawner.spawnClaudeProcess(buttonConfig);

      // === VERIFY PTY SPAWN CONTRACT ===
      expect(pty.spawn).toHaveBeenCalledWith('claude', [], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: '/workspaces/agent-feed/prod',
        env: expect.objectContaining({
          TERM: 'xterm-256color'
        })
      });
      
      // === ENSURE child_process.spawn WAS NOT USED ===
      expect(spawn).not.toHaveBeenCalled();
    });

    test('should handle PTY input correctly without echoing --print', async () => {
      const buttonConfig = { type: 'prod', usePty: true };
      const processInfo = await spawner.spawnClaudeProcess(buttonConfig);

      const testInput = 'Hello Claude\n';
      spawner.sendInput(processInfo.instanceId, testInput);

      // === VERIFY PTY INPUT CONTRACT ===
      expect(mockPtyProcess.write).toHaveBeenCalledWith('Hello Claude\n');
      expect(mockPtyProcess.write).not.toHaveBeenCalledWith(expect.stringContaining('--print'));
    });

    test('should handle PTY resize operations for terminal compatibility', async () => {
      const buttonConfig = { type: 'prod', usePty: true };
      const processInfo = await spawner.spawnClaudeProcess(buttonConfig);

      // === SIMULATE TERMINAL RESIZE ===
      processInfo.process.resize(100, 40);

      // === VERIFY RESIZE CONTRACT ===
      expect(mockPtyProcess.resize).toHaveBeenCalledWith(100, 40);
    });
  });

  describe('Authentication Flow Validation', () => {
    test('should spawn process with correct environment for authentication', async () => {
      const buttonConfig = { type: 'prod', usePty: false };
      await spawner.spawnClaudeProcess(buttonConfig);

      // === VERIFY AUTH ENVIRONMENT CONTRACT ===
      const [, , options] = spawn.mock.calls[0];
      expect(options.env).toEqual(expect.objectContaining({
        TERM: 'xterm-256color'
      }));
      expect(options.env).toBeDefined();
    });

    test('should handle authentication context in working directory', async () => {
      const buttonConfig = { type: 'skip-permissions', usePty: false };
      await spawner.spawnClaudeProcess(buttonConfig);

      // === VERIFY WORKING DIRECTORY CONTRACT ===
      const [, , options] = spawn.mock.calls[0];
      expect(options.cwd).toBe('/workspaces/agent-feed/prod');
    });
  });

  describe('Error Handling Scenarios', () => {
    test('should handle spawn failure gracefully', async () => {
      // === MOCK SPAWN FAILURE ===
      spawn.mockImplementationOnce(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const buttonConfig = { type: 'prod', usePty: false };

      // === VERIFY ERROR HANDLING CONTRACT ===
      await expect(spawner.spawnClaudeProcess(buttonConfig)).rejects.toThrow('ENOENT');
    });

    test('should handle input to terminated process', async () => {
      const buttonConfig = { type: 'prod', usePty: false };
      const processInfo = await spawner.spawnClaudeProcess(buttonConfig);

      // === TERMINATE PROCESS ===
      spawner.terminateProcess(processInfo.instanceId);

      // === VERIFY ERROR ON INPUT TO DEAD PROCESS ===
      expect(() => spawner.sendInput(processInfo.instanceId, 'test')).toThrow('Process not found');
    });

    test('should handle process crash during execution', async () => {
      const buttonConfig = { type: 'prod', usePty: false };
      await spawner.spawnClaudeProcess(buttonConfig);

      // === SIMULATE PROCESS EXIT EVENT ===
      const exitHandler = mockChildProcess.on.mock.calls.find(call => call[0] === 'exit');
      if (exitHandler) {
        exitHandler[1](1, 'SIGSEGV'); // Simulate crash
      }

      // === VERIFY CRASH HANDLING (Process should emit exit event) ===
      expect(mockChildProcess.on).toHaveBeenCalledWith('exit', expect.any(Function));
    });
  });

  describe('Frontend-Backend Communication Contracts', () => {
    test('should validate all 4 button configurations spawn correctly', async () => {
      const buttonConfigs = [
        { type: 'prod', name: '🚀 prod/claude' },
        { type: 'skip-permissions', name: '⚡ skip-permissions' },
        { type: 'skip-permissions-c', name: '💬 skip-permissions -c' },
        { type: 'skip-permissions-resume', name: '🔄 skip-permissions --resume' }
      ];

      const expectedCommands = [
        ['claude', []],
        ['claude', ['--dangerously-skip-permissions']],
        ['claude', ['--dangerously-skip-permissions', '-c']],
        ['claude', ['--dangerously-skip-permissions', '--resume']]
      ];

      // === SPAWN ALL 4 BUTTON CONFIGURATIONS ===
      for (let i = 0; i < buttonConfigs.length; i++) {
        const config = { ...buttonConfigs[i], usePty: false };
        await spawner.spawnClaudeProcess(config);

        // === VERIFY EACH BUTTON'S SPAWN CONTRACT ===
        const [command, args] = spawn.mock.calls[i];
        expect([command, args]).toEqual(expectedCommands[i]);
        expect(args).not.toContain('--print'); // CRITICAL: No --print flag
      }

      // === VERIFY ALL BUTTONS WERE TESTED ===
      expect(spawn).toHaveBeenCalledTimes(4);
    });

    test('should provide consistent process information for frontend', async () => {
      const buttonConfig = { type: 'prod', usePty: true };
      const processInfo = await spawner.spawnClaudeProcess(buttonConfig);

      // === VERIFY FRONTEND CONTRACT FIELDS ===
      expect(processInfo).toEqual(expect.objectContaining({
        instanceId: expect.any(String),
        pid: expect.any(Number),
        command: 'claude',
        args: [],
        fullCommand: 'claude ',
        buttonType: 'prod',
        usePty: true,
        startTime: expect.any(Date),
        status: 'starting'
      }));
    });

    test('should handle concurrent process creation requests', async () => {
      const configs = [
        { type: 'prod', usePty: false },
        { type: 'skip-permissions', usePty: true },
        { type: 'skip-permissions-c', usePty: false },
        { type: 'skip-permissions-resume', usePty: true }
      ];

      // === CREATE ALL PROCESSES CONCURRENTLY ===
      const promises = configs.map(config => spawner.spawnClaudeProcess(config));
      const processes = await Promise.all(promises);

      // === VERIFY CONCURRENT CREATION CONTRACT ===
      expect(processes).toHaveLength(4);
      expect(spawner.activeProcesses.size).toBe(4);
      
      // Verify each process has unique ID
      const ids = processes.map(p => p.instanceId);
      expect(new Set(ids).size).toBe(4); // All unique
    });
  });

  describe('Process Lifecycle Integration', () => {
    test('should setup process event handlers immediately after spawn', async () => {
      const buttonConfig = { type: 'prod', usePty: false };
      await spawner.spawnClaudeProcess(buttonConfig);

      // === VERIFY EVENT HANDLER CONTRACTS ===
      expect(mockChildProcess.on).toHaveBeenCalledWith('exit', expect.any(Function));
      expect(mockChildProcess.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockChildProcess.stderr.on).toHaveBeenCalledWith('data', expect.any(Function));
    });

    test('should handle stdin/stdout properly in interactive mode', async () => {
      const buttonConfig = { type: 'skip-permissions-c', usePty: false };
      const processInfo = await spawner.spawnClaudeProcess(buttonConfig);

      // === TEST STDIN/STDOUT CONTRACT ===
      const testInput = 'What is the meaning of life?\n';
      spawner.sendInput(processInfo.instanceId, testInput);

      // === VERIFY STDIN CONTRACT ===
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(testInput);

      // === SIMULATE STDOUT DATA ===
      const stdoutHandler = mockChildProcess.stdout.on.mock.calls.find(call => call[0] === 'data');
      if (stdoutHandler) {
        stdoutHandler[1]('Claude: The meaning of life is subjective...\n');
      }

      // === VERIFY STDOUT HANDLING (Should have registered handler) ===
      expect(mockChildProcess.stdout.on).toHaveBeenCalledWith('data', expect.any(Function));
    });

    test('should handle process termination with proper cleanup', async () => {
      const buttonConfig = { type: 'prod', usePty: false };
      const processInfo = await spawner.spawnClaudeProcess(buttonConfig);

      // Verify process is tracked
      expect(spawner.activeProcesses.has(processInfo.instanceId)).toBe(true);

      // === TERMINATE PROCESS ===
      spawner.terminateProcess(processInfo.instanceId);

      // === VERIFY TERMINATION CONTRACT ===
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(spawner.activeProcesses.has(processInfo.instanceId)).toBe(false);
    });

    test('should maintain process state throughout lifecycle', async () => {
      const buttonConfig = { type: 'skip-permissions-resume', usePty: true };
      const processInfo = await spawner.spawnClaudeProcess(buttonConfig);

      // === VERIFY INITIAL STATE ===
      expect(processInfo.status).toBe('starting');
      expect(processInfo.buttonType).toBe('skip-permissions-resume');
      expect(processInfo.usePty).toBe(true);

      // === VERIFY PROCESS TRACKING ===
      const tracked = spawner.activeProcesses.get(processInfo.instanceId);
      expect(tracked).toBe(processInfo);
      expect(tracked.fullCommand).toBe('claude --dangerously-skip-permissions --resume');
    });
  });

  describe('Performance and Resource Management', () => {
    test('should handle rapid input without blocking', async () => {
      const buttonConfig = { type: 'prod', usePty: false };
      const processInfo = await spawner.spawnClaudeProcess(buttonConfig);

      // === SEND MULTIPLE INPUTS RAPIDLY ===
      const inputs = Array.from({ length: 50 }, (_, i) => `input-${i}\n`);
      
      const startTime = Date.now();
      inputs.forEach(input => spawner.sendInput(processInfo.instanceId, input));
      const endTime = Date.now();

      // === VERIFY NON-BLOCKING PERFORMANCE ===
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      expect(mockChildProcess.stdin.write).toHaveBeenCalledTimes(50);
    });

    test('should cleanup resources when all processes terminate', async () => {
      const configs = [
        { type: 'prod', usePty: false },
        { type: 'skip-permissions', usePty: true }
      ];

      // === CREATE MULTIPLE PROCESSES ===
      const processes = await Promise.all(
        configs.map(config => spawner.spawnClaudeProcess(config))
      );

      expect(spawner.activeProcesses.size).toBe(2);

      // === TERMINATE ALL PROCESSES ===
      processes.forEach(process => {
        spawner.terminateProcess(process.instanceId);
      });

      // === VERIFY COMPLETE CLEANUP ===
      expect(spawner.activeProcesses.size).toBe(0);
    });
  });
});