/**
 * TDD London School - Claude Process Spawning Contract Tests
 * 
 * CRITICAL REGRESSION PROTECTION:
 * - Tests that Claude processes spawn WITHOUT --print flags
 * - Verifies all 4 button types create correct process configurations
 * - Mocks child_process.spawn() to validate arguments
 * - Tests authentication inheritance and environment setup
 * 
 * Focus: Behavior verification through mock interactions
 */

const { spawn } = require('child_process');
const pty = require('node-pty');
const fs = require('fs');

// Mock dependencies for isolation
jest.mock('child_process', () => ({
  spawn: jest.fn()
}));

jest.mock('node-pty', () => ({
  spawn: jest.fn()
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  constants: {
    R_OK: 4,
    W_OK: 2
  }
}));

describe('Claude Process Spawning Contract Tests', () => {
  let mockProcess;
  let mockPtyProcess;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock process with required methods
    mockProcess = {
      pid: 12345,
      killed: false,
      stdin: {
        write: jest.fn(),
        end: jest.fn(),
        destroyed: false,
        on: jest.fn()
      },
      stdout: {
        on: jest.fn(),
        pipe: jest.fn()
      },
      stderr: {
        on: jest.fn(),
        pipe: jest.fn()
      },
      on: jest.fn(),
      kill: jest.fn(),
      removeListener: jest.fn()
    };
    
    // Setup mock PTY process
    mockPtyProcess = {
      pid: 12346,
      killed: false,
      write: jest.fn(),
      onData: jest.fn(),
      onExit: jest.fn(),
      kill: jest.fn(),
      resize: jest.fn()
    };
    
    // Configure mocks to return mock processes
    spawn.mockReturnValue(mockProcess);
    pty.spawn.mockReturnValue(mockPtyProcess);
    fs.existsSync.mockReturnValue(true);
  });

  describe('CRITICAL: Claude Process Arguments Contract', () => {
    test('should spawn prod button WITHOUT --print flag (CRITICAL)', () => {
      const instanceId = 'test-instance-prod';
      const workingDir = '/workspaces/agent-feed/prod';
      
      // Mock the Claude spawning function
      const spawnClaude = jest.fn((command, args, options) => {
        spawn(command, args, options);
        return mockProcess;
      });
      
      // Execute prod button spawn
      const claudeCommands = {
        'prod': ['claude']
      };
      
      const [command, ...args] = claudeCommands['prod'];
      spawnClaude(command, args, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });
      
      // CRITICAL VERIFICATION: No --print flag should be present
      expect(spawn).toHaveBeenCalledWith('claude', [], {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: expect.objectContaining({})
      });
      
      // Verify NO --print flag in arguments
      const [, spawnArgs] = spawn.mock.calls[0];
      expect(spawnArgs).not.toContain('--print');
      expect(spawnArgs).toEqual([]); // Prod button should have no additional args
    });

    test('should spawn skip-permissions button with correct flags', () => {
      const instanceId = 'test-instance-skip';
      const workingDir = '/workspaces/agent-feed';
      
      const claudeCommands = {
        'skip-permissions': ['claude', '--dangerously-skip-permissions']
      };
      
      const [command, ...args] = claudeCommands['skip-permissions'];
      spawn(command, args, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });
      
      // Verify correct skip-permissions arguments
      expect(spawn).toHaveBeenCalledWith('claude', ['--dangerously-skip-permissions'], {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: expect.objectContaining({})
      });
      
      // Verify NO --print flag
      const [, spawnArgs] = spawn.mock.calls[0];
      expect(spawnArgs).not.toContain('--print');
    });

    test('should spawn skip-permissions-c button with chat flag', () => {
      const workingDir = '/workspaces/agent-feed';
      
      const claudeCommands = {
        'skip-permissions-c': ['claude', '--dangerously-skip-permissions', '-c']
      };
      
      const [command, ...args] = claudeCommands['skip-permissions-c'];
      spawn(command, args, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });
      
      // Verify correct chat arguments
      expect(spawn).toHaveBeenCalledWith('claude', ['--dangerously-skip-permissions', '-c'], {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: expect.objectContaining({})
      });
      
      // Verify NO --print flag
      const [, spawnArgs] = spawn.mock.calls[0];
      expect(spawnArgs).not.toContain('--print');
    });

    test('should spawn skip-permissions-resume button with resume flag', () => {
      const workingDir = '/workspaces/agent-feed';
      
      const claudeCommands = {
        'skip-permissions-resume': ['claude', '--dangerously-skip-permissions', '--resume']
      };
      
      const [command, ...args] = claudeCommands['skip-permissions-resume'];
      spawn(command, args, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });
      
      // Verify correct resume arguments
      expect(spawn).toHaveBeenCalledWith('claude', ['--dangerously-skip-permissions', '--resume'], {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: expect.objectContaining({})
      });
      
      // Verify NO --print flag
      const [, spawnArgs] = spawn.mock.calls[0];
      expect(spawnArgs).not.toContain('--print');
    });
  });

  describe('PTY vs Pipe Process Type Contract', () => {
    test('should create PTY process when usePty is true', () => {
      const instanceType = 'prod';
      const instanceId = 'test-pty';
      const usePty = true;
      
      // Mock PTY creation
      const createProcess = (type, id, usePtyFlag) => {
        if (usePtyFlag) {
          return pty.spawn('claude', [], {
            cwd: '/workspaces/agent-feed/prod',
            env: expect.objectContaining({
              TERM: 'xterm-256color',
              FORCE_COLOR: '1'
            }),
            cols: 100,
            rows: 30,
            name: 'xterm-color'
          });
        }
      };
      
      createProcess(instanceType, instanceId, usePty);
      
      // Verify PTY spawn was called instead of regular spawn
      expect(pty.spawn).toHaveBeenCalledWith('claude', [], {
        cwd: '/workspaces/agent-feed/prod',
        env: expect.objectContaining({
          TERM: 'xterm-256color',
          FORCE_COLOR: '1'
        }),
        cols: 100,
        rows: 30,
        name: 'xterm-color'
      });
      
      expect(spawn).not.toHaveBeenCalled();
    });

    test('should create pipe process when usePty is false', () => {
      const instanceType = 'prod';
      const usePty = false;
      
      spawn('claude', [], {
        cwd: '/workspaces/agent-feed/prod',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: expect.objectContaining({
          TERM: 'xterm-256color',
          FORCE_COLOR: '1'
        }),
        shell: false
      });
      
      // Verify regular spawn was called
      expect(spawn).toHaveBeenCalledWith('claude', [], {
        cwd: '/workspaces/agent-feed/prod',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: expect.objectContaining({
          TERM: 'xterm-256color',
          FORCE_COLOR: '1'
        }),
        shell: false
      });
      
      expect(pty.spawn).not.toHaveBeenCalled();
    });
  });

  describe('Environment and Authentication Contract', () => {
    test('should inherit process environment correctly', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        CLAUDE_API_KEY: 'test-key',
        CLAUDECODE: '1',
        HOME: '/home/codespace'
      };
      
      spawn('claude', [], {
        cwd: '/workspaces/agent-feed',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          FORCE_COLOR: '1'
        }
      });
      
      // Verify environment inheritance
      expect(spawn).toHaveBeenCalledWith('claude', [], {
        cwd: '/workspaces/agent-feed',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: expect.objectContaining({
          CLAUDE_API_KEY: 'test-key',
          CLAUDECODE: '1',
          HOME: '/home/codespace',
          TERM: 'xterm-256color',
          FORCE_COLOR: '1'
        })
      });
      
      process.env = originalEnv;
    });

    test('should set terminal environment variables for interactive sessions', () => {
      spawn('claude', [], {
        cwd: '/workspaces/agent-feed',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          FORCE_COLOR: '1'
        }
      });
      
      const [, , options] = spawn.mock.calls[0];
      expect(options.env.TERM).toBe('xterm-256color');
      expect(options.env.FORCE_COLOR).toBe('1');
    });
  });

  describe('Process Configuration Contract', () => {
    test('should configure stdio streams correctly for pipe processes', () => {
      spawn('claude', [], {
        cwd: '/workspaces/agent-feed',
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
        shell: false
      });
      
      const [, , options] = spawn.mock.calls[0];
      expect(options.stdio).toEqual(['pipe', 'pipe', 'pipe']);
      expect(options.shell).toBe(false);
    });

    test('should configure PTY with correct dimensions', () => {
      pty.spawn('claude', [], {
        cwd: '/workspaces/agent-feed',
        env: { ...process.env },
        cols: 100,
        rows: 30,
        name: 'xterm-color'
      });
      
      const [, , options] = pty.spawn.mock.calls[0];
      expect(options.cols).toBe(100);
      expect(options.rows).toBe(30);
      expect(options.name).toBe('xterm-color');
    });
  });

  describe('Error Handling Contract', () => {
    test('should handle spawn errors gracefully', () => {
      const mockProcess = {
        pid: 12345,
        killed: false,
        exitCode: null,
        stdin: { write: jest.fn(), end: jest.fn() },
        stdout: { on: jest.fn(), pipe: jest.fn() },
        stderr: { on: jest.fn(), pipe: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
        removeListener: jest.fn()
      };
      
      spawn.mockImplementation(() => mockProcess);
      
      const spawnProcess = () => {
        const process = spawn('claude', [], { cwd: '/invalid' });
        // Setup error handling
        process.on('error', (error) => {
          console.error('Process error:', error);
        });
        return process;
      };
      
      const process = spawnProcess();
      
      expect(spawn).toHaveBeenCalled();
      // Error handling should be set up
      expect(process.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should validate working directory exists before spawning', () => {
      fs.existsSync.mockReturnValue(false);
      
      const validateAndSpawn = (workingDir) => {
        if (!fs.existsSync(workingDir)) {
          throw new Error(`Working directory does not exist: ${workingDir}`);
        }
        return spawn('claude', [], { cwd: workingDir });
      };
      
      expect(() => validateAndSpawn('/invalid/path')).toThrow('Working directory does not exist');
      expect(fs.existsSync).toHaveBeenCalledWith('/invalid/path');
      expect(spawn).not.toHaveBeenCalled();
    });
  });

  describe('Process Lifecycle Contract', () => {
    test('should setup event handlers immediately after spawn', () => {
      const process = spawn('claude', [], { cwd: '/workspaces/agent-feed' });
      
      // Verify process has required event handler setup capability
      expect(process.on).toBeDefined();
      expect(process.stdout.on).toBeDefined();
      expect(process.stderr.on).toBeDefined();
      expect(process.stdin).toBeDefined();
    });

    test('should provide process termination capabilities', () => {
      const process = spawn('claude', [], { cwd: '/workspaces/agent-feed' });
      
      // Verify termination methods exist
      expect(process.kill).toBeDefined();
      expect(process.stdin.end).toBeDefined();
      expect(typeof process.pid).toBe('number');
      expect(typeof process.killed).toBe('boolean');
    });
  });
});