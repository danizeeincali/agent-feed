/**
 * TDD London School: Interactive Mode Validation Test Suite
 * 
 * Focus: Mock-driven testing for Claude interactive sessions without --print mode
 * London School Methodology: Test object interactions and behaviors, not state
 * 
 * Key Requirements:
 * - Verify Claude processes start in interactive mode (NOT print mode)
 * - Test bidirectional communication (stdin/stdout)
 * - Validate terminal emulation features (PTY mode)
 * - Ensure proper session management
 */

// Jest is already available globally in test environment

// === MOCK DEPENDENCIES FOR ISOLATION ===
const mockChildProcess = {
  pid: 54321,
  stdin: {
    write: jest.fn(),
    end: jest.fn(),
    destroy: jest.fn(),
    writable: true
  },
  stdout: {
    on: jest.fn(),
    pipe: jest.fn(),
    readable: true
  },
  stderr: {
    on: jest.fn(),
    readable: true
  },
  on: jest.fn(),
  kill: jest.fn(),
  killed: false,
  connected: true
};

const mockPtyProcess = {
  pid: 54322,
  write: jest.fn(),
  onData: jest.fn(),
  onExit: jest.fn(),
  resize: jest.fn(),
  kill: jest.fn(),
  cols: 120,
  rows: 30
};

jest.mock('child_process', () => ({
  spawn: jest.fn().mockReturnValue(mockChildProcess)
}));

jest.mock('node-pty', () => ({
  spawn: jest.fn().mockReturnValue(mockPtyProcess)
}));

const { spawn } = require('child_process');
const pty = require('node-pty');

// === SYSTEM UNDER TEST: Interactive Claude Session Manager ===
class InteractiveClaudeSession {
  constructor(config = {}) {
    this.sessions = new Map();
    this.defaultConfig = {
      interactive: true,
      enablePty: true,
      bufferOutput: true,
      workingDirectory: '/workspaces/agent-feed/prod'
    };
  }

  // Contract: Create interactive session WITHOUT --print flag
  async createInteractiveSession(sessionConfig) {
    const sessionId = `session-${Date.now()}`;
    const config = { ...this.defaultConfig, ...sessionConfig };
    
    // CRITICAL: Build interactive command (NO --print flag)
    const command = 'claude';
    const args = this.buildInteractiveArgs(config);
    
    let claudeProcess;
    
    if (config.enablePty) {
      // PTY mode for full terminal emulation
      claudeProcess = pty.spawn(command, args, {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: config.workingDirectory,
        env: { 
          ...process.env, 
          CLAUDE_INTERACTIVE: '1',
          TERM: 'xterm-256color',
          FORCE_COLOR: '1'
        }
      });
    } else {
      // Standard pipes with interactive stdin/stdout
      claudeProcess = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: config.workingDirectory,
        env: { 
          ...process.env, 
          CLAUDE_INTERACTIVE: '1' 
        }
      });
    }
    
    const session = {
      id: sessionId,
      process: claudeProcess,
      config,
      startTime: new Date(),
      status: 'initializing',
      inputBuffer: [],
      outputBuffer: [],
      isInteractive: true,
      currentPrompt: null
    };
    
    this.sessions.set(sessionId, session);
    this.setupInteractiveHandlers(session);
    
    return session;
  }
  
  // Contract: Build args for interactive mode (NEVER include --print)
  buildInteractiveArgs(config) {
    const args = [];
    
    if (config.skipPermissions) {
      args.push('--dangerously-skip-permissions');
    }
    
    if (config.chatMode) {
      args.push('-c');
    }
    
    if (config.resume) {
      args.push('--resume');
    }
    
    // CRITICAL CONTRACT: NEVER add --print for interactive sessions
    // --print is only for non-interactive, one-shot commands
    
    return args;
  }
  
  // Contract: Setup handlers for bidirectional communication
  setupInteractiveHandlers(session) {
    if (session.config.enablePty) {
      this.setupPtyHandlers(session);
    } else {
      this.setupPipeHandlers(session);
    }
  }
  
  setupPtyHandlers(session) {
    // PTY data handler for combined stdout/stderr
    session.process.onData((data) => {
      session.outputBuffer.push(data);
      this.processInteractiveOutput(session, data);
    });
    
    // PTY exit handler
    session.process.onExit(({ exitCode, signal }) => {
      session.status = 'terminated';
      session.exitCode = exitCode;
      session.signal = signal;
    });
  }
  
  setupPipeHandlers(session) {
    // Stdout handler
    session.process.stdout.on('data', (data) => {
      const output = data.toString();
      session.outputBuffer.push(output);
      this.processInteractiveOutput(session, output);
    });
    
    // Stderr handler
    session.process.stderr.on('data', (data) => {
      const error = data.toString();
      session.outputBuffer.push(`[ERROR] ${error}`);
    });
    
    // Exit handler
    session.process.on('exit', (code, signal) => {
      session.status = 'terminated';
      session.exitCode = code;
      session.signal = signal;
    });
  }
  
  // Contract: Process output to detect interactive prompts and state
  processInteractiveOutput(session, data) {
    const output = data.toString();
    
    // Detect Claude ready state
    if (output.includes('Welcome to Claude') || 
        output.includes('Claude Code') ||
        output.includes('✻ Ready to help')) {
      session.status = 'ready';
    }
    
    // Detect interactive prompt
    if (output.includes('Claude: ') || output.includes('\n> ')) {
      session.currentPrompt = output.trim();
    }
  }
  
  // Contract: Send interactive input to Claude
  async sendInteractiveInput(sessionId, input) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.status === 'terminated') throw new Error('Session terminated');
    
    session.inputBuffer.push(input);
    
    if (session.config.enablePty) {
      session.process.write(input);
    } else {
      session.process.stdin.write(input);
    }
  }
  
  // Contract: Resize terminal (PTY only)
  resizeTerminal(sessionId, cols, rows) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.config.enablePty) return;
    
    session.process.resize(cols, rows);
  }
  
  // Contract: Terminate interactive session
  terminateSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    session.process.kill('SIGTERM');
    this.sessions.delete(sessionId);
  }
}

describe('TDD London School: Interactive Mode Validation', () => {
  let sessionManager;
  let mockDataCallback;
  let mockExitCallback;

  beforeEach(() => {
    // === RESET ALL MOCKS ===
    jest.clearAllMocks();
    
    // === SETUP MOCK CALLBACKS ===
    mockDataCallback = jest.fn();
    mockExitCallback = jest.fn();
    
    mockPtyProcess.onData.mockImplementation((callback) => {
      mockDataCallback = callback;
    });
    
    mockPtyProcess.onExit.mockImplementation((callback) => {
      mockExitCallback = callback;
    });
    
    sessionManager = new InteractiveClaudeSession();
  });

  describe('Interactive Session Creation Without --print Flag', () => {
    test('should create interactive session without --print flag (CRITICAL)', async () => {
      const config = {
        enablePty: false,
        skipPermissions: false
      };

      await sessionManager.createInteractiveSession(config);

      // === VERIFY INTERACTIVE SPAWN (NO --print) ===
      expect(spawn).toHaveBeenCalledWith('claude', [], expect.objectContaining({
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: '/workspaces/agent-feed/prod',
        env: expect.objectContaining({
          CLAUDE_INTERACTIVE: '1'
        })
      }));
      
      // === CRITICAL: Ensure --print was NOT added ===
      const [command, args] = spawn.mock.calls[0];
      expect(args).not.toContain('--print');
      expect(command).toBe('claude');
    });

    test('should create PTY interactive session with terminal emulation', async () => {
      const config = {
        enablePty: true,
        skipPermissions: true,
        chatMode: false
      };

      await sessionManager.createInteractiveSession(config);

      // === VERIFY PTY INTERACTIVE SPAWN ===
      expect(pty.spawn).toHaveBeenCalledWith('claude', ['--dangerously-skip-permissions'], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: '/workspaces/agent-feed/prod',
        env: expect.objectContaining({
          CLAUDE_INTERACTIVE: '1',
          TERM: 'xterm-256color',
          FORCE_COLOR: '1'
        })
      });
      
      // === VERIFY NO --print IN PTY MODE ===
      const [command, args] = pty.spawn.mock.calls[0];
      expect(args).not.toContain('--print');
    });

    test('should build interactive args correctly for all modes', () => {
      const testCases = [
        {
          config: { skipPermissions: false, chatMode: false, resume: false },
          expected: []
        },
        {
          config: { skipPermissions: true, chatMode: false, resume: false },
          expected: ['--dangerously-skip-permissions']
        },
        {
          config: { skipPermissions: true, chatMode: true, resume: false },
          expected: ['--dangerously-skip-permissions', '-c']
        },
        {
          config: { skipPermissions: true, chatMode: false, resume: true },
          expected: ['--dangerously-skip-permissions', '--resume']
        }
      ];

      testCases.forEach(({ config, expected }) => {
        const args = sessionManager.buildInteractiveArgs(config);
        expect(args).toEqual(expected);
        expect(args).not.toContain('--print'); // CRITICAL: Never include --print
      });
    });
  });

  describe('Bidirectional Communication Contracts', () => {
    test('should handle stdin input in interactive mode', async () => {
      const config = { enablePty: false };
      const session = await sessionManager.createInteractiveSession(config);
      
      const userInput = 'Hello Claude, can you help me?\n';
      await sessionManager.sendInteractiveInput(session.id, userInput);

      // === VERIFY STDIN COMMUNICATION ===
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(userInput);
      expect(session.inputBuffer).toContain(userInput);
    });

    test('should handle PTY input in interactive mode', async () => {
      const config = { enablePty: true };
      const session = await sessionManager.createInteractiveSession(config);
      
      const userInput = 'Write a Python script\n';
      await sessionManager.sendInteractiveInput(session.id, userInput);

      // === VERIFY PTY COMMUNICATION ===
      expect(mockPtyProcess.write).toHaveBeenCalledWith(userInput);
      expect(session.inputBuffer).toContain(userInput);
    });

    test('should process stdout output in interactive mode', async () => {
      const config = { enablePty: false };
      const session = await sessionManager.createInteractiveSession(config);
      
      // === SIMULATE INTERACTIVE OUTPUT ===
      const claudeResponse = 'Claude: I\'d be happy to help you! What can I do?\n';
      const stdoutHandler = mockChildProcess.stdout.on.mock.calls.find(call => call[0] === 'data');
      if (stdoutHandler) {
        stdoutHandler[1](Buffer.from(claudeResponse));
      }

      // === VERIFY OUTPUT PROCESSING ===
      expect(session.outputBuffer).toContain(claudeResponse);
      expect(session.currentPrompt).toBe(claudeResponse.trim());
    });

    test('should handle PTY data in interactive mode', async () => {
      const config = { enablePty: true };
      const session = await sessionManager.createInteractiveSession(config);
      
      // === SIMULATE PTY DATA ===
      const ptyData = '\x1b[32mClaude: \x1b[0mReady to assist!\n> ';
      mockDataCallback(ptyData);

      // === VERIFY PTY DATA PROCESSING ===
      expect(session.outputBuffer).toContain(ptyData);
    });

    test('should maintain session state during conversation', async () => {
      const config = { enablePty: true, chatMode: true, skipPermissions: true };
      const session = await sessionManager.createInteractiveSession(config);
      
      // === SIMULATE CONVERSATION FLOW ===
      await sessionManager.sendInteractiveInput(session.id, 'Hello\n');
      mockDataCallback('Claude: Hello! How can I help?\n');
      
      await sessionManager.sendInteractiveInput(session.id, 'What is Python?\n');
      mockDataCallback('Claude: Python is a programming language...\n');

      // === VERIFY CONVERSATION STATE ===
      expect(session.inputBuffer).toHaveLength(2);
      expect(session.outputBuffer).toHaveLength(2);
      expect(session.isInteractive).toBe(true);
    });
  });

  describe('Terminal Emulation Features (PTY Mode)', () => {
    test('should support terminal resize operations', async () => {
      const config = { enablePty: true };
      const session = await sessionManager.createInteractiveSession(config);
      
      // === RESIZE TERMINAL ===
      sessionManager.resizeTerminal(session.id, 100, 40);

      // === VERIFY RESIZE CONTRACT ===
      expect(mockPtyProcess.resize).toHaveBeenCalledWith(100, 40);
    });

    test('should handle ANSI escape sequences in PTY mode', async () => {
      const config = { enablePty: true };
      const session = await sessionManager.createInteractiveSession(config);
      
      // === SIMULATE ANSI SEQUENCES ===
      const ansiOutput = '\x1b[1;32mSuccess!\x1b[0m\x1b[2K\r';
      mockDataCallback(ansiOutput);

      // === VERIFY ANSI HANDLING ===
      expect(session.outputBuffer).toContain(ansiOutput);
    });

    test('should not support resize in pipe mode', async () => {
      const config = { enablePty: false };
      const session = await sessionManager.createInteractiveSession(config);
      
      // === ATTEMPT RESIZE (SHOULD BE NO-OP) ===
      sessionManager.resizeTerminal(session.id, 100, 40);

      // === VERIFY NO PTY OPERATIONS CALLED ===
      expect(mockPtyProcess.resize).not.toHaveBeenCalled();
    });
  });

  describe('Session Management and State', () => {
    test('should detect Claude ready state from output', async () => {
      const config = { enablePty: true };
      const session = await sessionManager.createInteractiveSession(config);
      
      expect(session.status).toBe('initializing');
      
      // === SIMULATE CLAUDE READY MESSAGE ===
      mockDataCallback('Welcome to Claude!\n\u256d\u2500 Claude Code \u2500\u256e\n\u273b Ready to help\n');

      // === VERIFY READY STATE DETECTION ===
      expect(session.status).toBe('ready');
    });

    test('should handle session termination gracefully', async () => {
      const config = { enablePty: true };
      const session = await sessionManager.createInteractiveSession(config);
      
      expect(sessionManager.sessions.has(session.id)).toBe(true);
      
      // === TERMINATE SESSION ===
      sessionManager.terminateSession(session.id);

      // === VERIFY TERMINATION ===
      expect(mockPtyProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(sessionManager.sessions.has(session.id)).toBe(false);
    });

    test('should handle process exit events', async () => {
      const config = { enablePty: true };
      const session = await sessionManager.createInteractiveSession(config);
      
      // === SIMULATE PROCESS EXIT ===
      mockExitCallback({ exitCode: 0, signal: null });

      // === VERIFY EXIT HANDLING ===
      expect(session.status).toBe('terminated');
      expect(session.exitCode).toBe(0);
      expect(session.signal).toBe(null);
    });

    test('should prevent input to terminated sessions', async () => {
      const config = { enablePty: false };
      const session = await sessionManager.createInteractiveSession(config);
      
      // === TERMINATE SESSION ===
      session.status = 'terminated';
      
      // === ATTEMPT INPUT TO TERMINATED SESSION ===
      await expect(
        sessionManager.sendInteractiveInput(session.id, 'test')
      ).rejects.toThrow('Session terminated');
    });
  });

  describe('Error Handling in Interactive Mode', () => {
    test('should handle spawn errors gracefully', async () => {
      // === MOCK SPAWN FAILURE ===
      spawn.mockImplementationOnce(() => {
        throw new Error('claude: command not found');
      });

      const config = { enablePty: false };

      // === VERIFY ERROR HANDLING ===
      await expect(
        sessionManager.createInteractiveSession(config)
      ).rejects.toThrow('claude: command not found');
    });

    test('should handle input errors during conversation', async () => {
      const config = { enablePty: false };
      const session = await sessionManager.createInteractiveSession(config);
      
      // === MOCK STDIN ERROR ===
      mockChildProcess.stdin.write.mockImplementationOnce(() => {
        throw new Error('EPIPE: broken pipe');
      });

      // === VERIFY INPUT ERROR HANDLING ===
      await expect(
        sessionManager.sendInteractiveInput(session.id, 'test')
      ).rejects.toThrow('EPIPE: broken pipe');
    });

    test('should handle session not found errors', async () => {
      const invalidSessionId = 'non-existent-session';
      
      // === VERIFY SESSION NOT FOUND ERROR ===
      await expect(
        sessionManager.sendInteractiveInput(invalidSessionId, 'test')
      ).rejects.toThrow('Session not found');
    });
  });

  describe('Performance in Interactive Mode', () => {
    test('should handle rapid interactive exchanges', async () => {
      const config = { enablePty: true };
      const session = await sessionManager.createInteractiveSession(config);
      
      // === RAPID INPUT SEQUENCE ===
      const inputs = Array.from({ length: 20 }, (_, i) => `query-${i}\n`);
      
      const startTime = Date.now();
      for (const input of inputs) {
        await sessionManager.sendInteractiveInput(session.id, input);
      }
      const endTime = Date.now();

      // === VERIFY PERFORMANCE ===
      expect(endTime - startTime).toBeLessThan(200);
      expect(mockPtyProcess.write).toHaveBeenCalledTimes(20);
      expect(session.inputBuffer).toHaveLength(20);
    });

    test('should manage output buffer size in long conversations', async () => {
      const config = { enablePty: true };
      const session = await sessionManager.createInteractiveSession(config);
      
      // === SIMULATE LONG OUTPUT ===
      for (let i = 0; i < 100; i++) {
        mockDataCallback(`Claude response ${i}\n`);
      }

      // === VERIFY BUFFER MANAGEMENT ===
      expect(session.outputBuffer).toHaveLength(100);
      // In real implementation, might implement buffer limits
    });
  });
});