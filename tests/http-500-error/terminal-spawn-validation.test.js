/**
 * Terminal Process Spawn Validation Tests
 * Tests process creation, validation, and error scenarios
 */

const { spawn } = require('child_process');
const pty = require('node-pty');
const fs = require('fs');
const path = require('path');

// Mock dependencies
jest.mock('child_process');
jest.mock('node-pty');
jest.mock('fs');

describe('Terminal Process Spawn Validation Tests', () => {
  let mockProcess;
  let mockPtyProcess;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock child process
    mockProcess = {
      pid: 12345,
      killed: false,
      stdin: {
        write: jest.fn(),
        end: jest.fn()
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
      send: jest.fn()
    };

    // Setup mock PTY process
    mockPtyProcess = {
      pid: 12345,
      killed: false,
      write: jest.fn(),
      resize: jest.fn(),
      kill: jest.fn(),
      on: jest.fn(),
      clear: jest.fn()
    };

    spawn.mockReturnValue(mockProcess);
    pty.spawn.mockReturnValue(mockPtyProcess);
    fs.existsSync.mockReturnValue(true);
    fs.accessSync.mockReturnValue(undefined);
  });

  describe('Claude CLI Process Spawn Validation', () => {
    test('should validate Claude CLI exists before spawning', () => {
      const claudePath = '/home/codespace/nvm/current/bin/claude';
      
      // Test when Claude CLI exists
      fs.existsSync.mockReturnValue(true);
      
      const spawnClaude = () => {
        if (!fs.existsSync(claudePath)) {
          throw new Error(`Claude CLI not found at ${claudePath}`);
        }
        return spawn(claudePath, [], { cwd: '/prod' });
      };

      expect(() => spawnClaude()).not.toThrow();
      expect(spawn).toHaveBeenCalledWith(claudePath, [], { cwd: '/prod' });
    });

    test('should throw error when Claude CLI not found', () => {
      const claudePath = '/home/codespace/nvm/current/bin/claude';
      
      fs.existsSync.mockReturnValue(false);
      
      const spawnClaude = () => {
        if (!fs.existsSync(claudePath)) {
          throw new Error(`Claude CLI not found at ${claudePath}`);
        }
        return spawn(claudePath, [], { cwd: '/prod' });
      };

      expect(() => spawnClaude()).toThrow('Claude CLI not found');
    });

    test('should validate executable permissions', () => {
      const claudePath = '/home/codespace/nvm/current/bin/claude';
      
      fs.existsSync.mockReturnValue(true);
      fs.accessSync.mockImplementation((path, mode) => {
        if (mode === fs.constants.X_OK) {
          throw new Error('EACCES: permission denied');
        }
      });

      const spawnClaude = () => {
        if (!fs.existsSync(claudePath)) {
          throw new Error('Claude CLI not found');
        }
        
        try {
          fs.accessSync(claudePath, fs.constants.X_OK);
        } catch (error) {
          throw new Error(`Claude CLI not executable: ${error.message}`);
        }
        
        return spawn(claudePath, []);
      };

      expect(() => spawnClaude()).toThrow('Claude CLI not executable: EACCES: permission denied');
    });

    test('should validate working directory exists', () => {
      const workingDir = '/prod';
      const claudePath = '/home/codespace/nvm/current/bin/claude';
      
      fs.existsSync.mockImplementation((path) => {
        if (path === claudePath) return true;
        if (path === workingDir) return false;
        return true;
      });

      const spawnClaude = () => {
        if (!fs.existsSync(claudePath)) {
          throw new Error('Claude CLI not found');
        }
        
        if (!fs.existsSync(workingDir)) {
          throw new Error(`Working directory not found: ${workingDir}`);
        }
        
        return spawn(claudePath, [], { cwd: workingDir });
      };

      expect(() => spawnClaude()).toThrow('Working directory not found: /prod');
    });

    test('should handle spawn ENOENT errors', () => {
      const claudePath = '/home/codespace/nvm/current/bin/claude';
      const spawnError = new Error('spawn ENOENT');
      spawnError.code = 'ENOENT';
      
      spawn.mockImplementation(() => {
        throw spawnError;
      });

      const spawnClaude = () => {
        try {
          return spawn(claudePath, []);
        } catch (error) {
          if (error.code === 'ENOENT') {
            throw new Error(`Claude CLI executable not found: ${claudePath}`);
          }
          throw error;
        }
      };

      expect(() => spawnClaude()).toThrow('Claude CLI executable not found');
    });

    test('should handle spawn EACCES errors', () => {
      const spawnError = new Error('spawn EACCES');
      spawnError.code = 'EACCES';
      
      spawn.mockImplementation(() => {
        throw spawnError;
      });

      const spawnClaude = () => {
        try {
          return spawn('/home/codespace/nvm/current/bin/claude', []);
        } catch (error) {
          if (error.code === 'EACCES') {
            throw new Error('Permission denied: Cannot execute Claude CLI');
          }
          throw error;
        }
      };

      expect(() => spawnClaude()).toThrow('Permission denied: Cannot execute Claude CLI');
    });
  });

  describe('PTY Terminal Spawn Validation', () => {
    test('should validate shell executable before PTY spawn', () => {
      const shell = '/bin/bash';
      
      fs.existsSync.mockReturnValue(true);
      
      const spawnPty = () => {
        if (!fs.existsSync(shell)) {
          throw new Error(`Shell not found: ${shell}`);
        }
        return pty.spawn(shell, []);
      };

      expect(() => spawnPty()).not.toThrow();
      expect(pty.spawn).toHaveBeenCalledWith(shell, []);
    });

    test('should handle PTY allocation failures', () => {
      const ptyError = new Error('Cannot allocate pty');
      ptyError.code = 'ENOMEM';
      
      pty.spawn.mockImplementation(() => {
        throw ptyError;
      });

      const spawnPty = () => {
        try {
          return pty.spawn('/bin/bash', []);
        } catch (error) {
          if (error.code === 'ENOMEM') {
            throw new Error('Out of memory: Cannot allocate pseudo terminal');
          }
          throw new Error(`PTY spawn failed: ${error.message}`);
        }
      };

      expect(() => spawnPty()).toThrow('Out of memory: Cannot allocate pseudo terminal');
    });

    test('should validate PTY dimensions', () => {
      const spawnPtyWithDimensions = (cols, rows) => {
        if (cols <= 0 || rows <= 0) {
          throw new Error('Invalid terminal dimensions');
        }
        
        if (cols > 1000 || rows > 1000) {
          throw new Error('Terminal dimensions too large');
        }
        
        return pty.spawn('/bin/bash', [], {
          cols,
          rows,
          name: 'xterm-256color'
        });
      };

      expect(() => spawnPtyWithDimensions(80, 24)).not.toThrow();
      expect(() => spawnPtyWithDimensions(0, 24)).toThrow('Invalid terminal dimensions');
      expect(() => spawnPtyWithDimensions(80, 0)).toThrow('Invalid terminal dimensions');
      expect(() => spawnPtyWithDimensions(2000, 24)).toThrow('Terminal dimensions too large');
    });

    test('should handle resource exhaustion during PTY spawn', () => {
      const resourceError = new Error('fork: retry: Resource temporarily unavailable');
      resourceError.code = 'EAGAIN';
      
      pty.spawn.mockImplementation(() => {
        throw resourceError;
      });

      const spawnPty = () => {
        try {
          return pty.spawn('/bin/bash', []);
        } catch (error) {
          if (error.code === 'EAGAIN') {
            throw new Error('System overloaded: Cannot create new process');
          }
          throw error;
        }
      };

      expect(() => spawnPty()).toThrow('System overloaded: Cannot create new process');
    });
  });

  describe('Process Environment Validation', () => {
    test('should validate environment variables', () => {
      const spawnWithEnv = (env) => {
        // Validate required environment variables
        if (!env.PATH) {
          throw new Error('PATH environment variable is required');
        }
        
        if (!env.HOME) {
          throw new Error('HOME environment variable is required');
        }
        
        // Validate PATH contains Claude CLI directory
        if (!env.PATH.includes('/home/codespace/nvm/current/bin')) {
          throw new Error('Claude CLI directory not in PATH');
        }
        
        return spawn('/home/codespace/nvm/current/bin/claude', [], { env });
      };

      // Valid environment
      const validEnv = {
        PATH: '/usr/bin:/bin:/home/codespace/nvm/current/bin',
        HOME: '/home/codespace',
        TERM: 'xterm-256color'
      };
      expect(() => spawnWithEnv(validEnv)).not.toThrow();

      // Missing PATH
      const noPath = { HOME: '/home/codespace' };
      expect(() => spawnWithEnv(noPath)).toThrow('PATH environment variable is required');

      // Missing HOME
      const noHome = { PATH: '/usr/bin:/bin' };
      expect(() => spawnWithEnv(noHome)).toThrow('HOME environment variable is required');

      // PATH without Claude CLI
      const wrongPath = {
        PATH: '/usr/bin:/bin',
        HOME: '/home/codespace'
      };
      expect(() => spawnWithEnv(wrongPath)).toThrow('Claude CLI directory not in PATH');
    });

    test('should validate working directory permissions', () => {
      const workingDir = '/prod';
      
      const spawnWithCwd = (cwd) => {
        if (!fs.existsSync(cwd)) {
          throw new Error(`Working directory does not exist: ${cwd}`);
        }
        
        try {
          fs.accessSync(cwd, fs.constants.R_OK | fs.constants.W_OK);
        } catch (error) {
          throw new Error(`No read/write access to working directory: ${cwd}`);
        }
        
        return spawn('/home/codespace/nvm/current/bin/claude', [], { cwd });
      };

      // Valid directory
      fs.existsSync.mockReturnValue(true);
      fs.accessSync.mockReturnValue(undefined);
      expect(() => spawnWithCwd(workingDir)).not.toThrow();

      // Directory doesn't exist
      fs.existsSync.mockReturnValue(false);
      expect(() => spawnWithCwd(workingDir)).toThrow('Working directory does not exist');

      // No access permissions
      fs.existsSync.mockReturnValue(true);
      fs.accessSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });
      expect(() => spawnWithCwd(workingDir)).toThrow('No read/write access to working directory');
    });
  });

  describe('Process Lifecycle Validation', () => {
    test('should validate process PID after spawn', () => {
      const validateSpawnedProcess = (process) => {
        if (!process) {
          throw new Error('Process spawn returned null');
        }
        
        if (!process.pid) {
          throw new Error('Process has no PID');
        }
        
        if (typeof process.pid !== 'number' || process.pid <= 0) {
          throw new Error('Process has invalid PID');
        }
        
        return process;
      };

      // Valid process
      expect(() => validateSpawnedProcess(mockProcess)).not.toThrow();

      // Process without PID
      const noPidProcess = { ...mockProcess, pid: null };
      expect(() => validateSpawnedProcess(noPidProcess)).toThrow('Process has no PID');

      // Process with invalid PID
      const invalidPidProcess = { ...mockProcess, pid: -1 };
      expect(() => validateSpawnedProcess(invalidPidProcess)).toThrow('Process has invalid PID');
    });

    test('should handle process immediate exit', () => {
      let exitCallback;
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'exit') {
          exitCallback = callback;
          // Simulate immediate exit
          setTimeout(() => callback(1, null), 0);
        }
      });

      const handleProcessSpawn = () => {
        const process = spawn('/home/codespace/nvm/current/bin/claude', []);
        
        process.on('exit', (code, signal) => {
          if (code !== 0) {
            throw new Error(`Process exited with non-zero code: ${code}`);
          }
        });

        return process;
      };

      expect(() => handleProcessSpawn()).not.toThrow();
      
      // Wait for exit event to be processed
      return new Promise((resolve) => {
        setTimeout(() => {
          // Exit callback should have been called with code 1
          expect(exitCallback).toBeDefined();
          resolve();
        }, 10);
      });
    });

    test('should handle process error events', () => {
      let errorCallback;
      mockProcess.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          errorCallback = callback;
          // Simulate error
          setTimeout(() => callback(new Error('Process error')), 0);
        }
      });

      const handleProcessSpawn = () => {
        const process = spawn('/home/codespace/nvm/current/bin/claude', []);
        let processError = null;
        
        process.on('error', (error) => {
          processError = error;
        });

        return { process, getError: () => processError };
      };

      const result = handleProcessSpawn();
      
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(result.getError()).toEqual(new Error('Process error'));
          resolve();
        }, 10);
      });
    });
  });

  describe('Resource Limit Validation', () => {
    test('should handle file descriptor limit', () => {
      const fdError = new Error('EMFILE: too many open files');
      fdError.code = 'EMFILE';
      
      spawn.mockImplementation(() => {
        throw fdError;
      });

      const spawnWithLimits = () => {
        try {
          return spawn('/home/codespace/nvm/current/bin/claude', []);
        } catch (error) {
          if (error.code === 'EMFILE') {
            throw new Error('File descriptor limit exceeded - too many processes');
          }
          throw error;
        }
      };

      expect(() => spawnWithLimits()).toThrow('File descriptor limit exceeded');
    });

    test('should handle memory limits', () => {
      const memError = new Error('Cannot allocate memory');
      memError.code = 'ENOMEM';
      
      spawn.mockImplementation(() => {
        throw memError;
      });

      const spawnWithMemoryCheck = () => {
        try {
          return spawn('/home/codespace/nvm/current/bin/claude', []);
        } catch (error) {
          if (error.code === 'ENOMEM') {
            throw new Error('Insufficient memory to spawn process');
          }
          throw error;
        }
      };

      expect(() => spawnWithMemoryCheck()).toThrow('Insufficient memory to spawn process');
    });

    test('should handle process limit', () => {
      const procError = new Error('fork: retry: Resource temporarily unavailable');
      procError.code = 'EAGAIN';
      
      spawn.mockImplementation(() => {
        throw procError;
      });

      const spawnWithProcessLimit = () => {
        try {
          return spawn('/home/codespace/nvm/current/bin/claude', []);
        } catch (error) {
          if (error.code === 'EAGAIN') {
            throw new Error('Process limit exceeded - system overloaded');
          }
          throw error;
        }
      };

      expect(() => spawnWithProcessLimit()).toThrow('Process limit exceeded');
    });
  });

  describe('Concurrent Process Management', () => {
    test('should prevent multiple concurrent spawns', () => {
      let activeProcess = null;
      
      const spawnSingle = () => {
        if (activeProcess && !activeProcess.killed) {
          throw new Error('Process already running - cannot spawn another');
        }
        
        activeProcess = spawn('/home/codespace/nvm/current/bin/claude', []);
        return activeProcess;
      };

      // First spawn should succeed
      expect(() => spawnSingle()).not.toThrow();

      // Second spawn should fail
      expect(() => spawnSingle()).toThrow('Process already running');
    });

    test('should handle rapid spawn/kill cycles', () => {
      let processCount = 0;
      const processes = [];
      
      const spawnAndTrack = () => {
        const process = spawn('/home/codespace/nvm/current/bin/claude', []);
        process.id = ++processCount;
        processes.push(process);
        return process;
      };

      const killAll = () => {
        processes.forEach(proc => {
          if (!proc.killed) {
            proc.kill();
            proc.killed = true;
          }
        });
        processes.length = 0;
      };

      // Spawn multiple processes rapidly
      for (let i = 0; i < 5; i++) {
        expect(() => spawnAndTrack()).not.toThrow();
      }

      expect(processes).toHaveLength(5);

      // Kill all processes
      expect(() => killAll()).not.toThrow();
      expect(processes).toHaveLength(0);
    });
  });
});