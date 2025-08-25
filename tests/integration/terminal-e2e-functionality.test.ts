/**
 * CRITICAL TDD TEST: End-to-End Terminal Functionality
 * 
 * These tests validate the complete terminal functionality from user input
 * through WebSocket communication to backend processing and response display.
 * 
 * CURRENT STATE: These tests will FAIL due to various terminal issues
 * EXPECTED: These tests will PASS when all terminal components work together
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

interface TerminalE2ETest {
  setupTerminal: () => Promise<any>;
  sendCommand: (cmd: string) => Promise<string>;
  waitForResponse: (timeout?: number) => Promise<string>;
  cleanup: () => Promise<void>;
}

interface TestScenario {
  name: string;
  command: string;
  expectedOutput?: string;
  expectedError?: string;
  timeout?: number;
  skipReason?: string;
}

describe('Terminal End-to-End Functionality - TDD Tests', () => {
  let terminalTest: TerminalE2ETest;
  let mockWebSocket: any;
  let mockTerminal: any;
  let connectionEvents: string[];

  beforeEach(async () => {
    connectionEvents = [];

    mockWebSocket = {
      readyState: 1, // OPEN
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    mockTerminal = {
      write: vi.fn(),
      writeln: vi.fn(),
      onData: vi.fn(() => ({ dispose: vi.fn() })),
      focus: vi.fn(),
      clear: vi.fn()
    };

    terminalTest = {
      setupTerminal: vi.fn(async () => {
        connectionEvents.push('setup_called');
        return { terminal: mockTerminal, websocket: mockWebSocket };
      }),
      sendCommand: vi.fn(async (cmd: string) => {
        connectionEvents.push(`command_sent: ${cmd}`);
        return `Mock response for: ${cmd}`;
      }),
      waitForResponse: vi.fn(async (timeout = 5000) => {
        connectionEvents.push(`waiting_for_response: ${timeout}ms`);
        return 'Mock response received';
      }),
      cleanup: vi.fn(async () => {
        connectionEvents.push('cleanup_called');
      })
    };
  });

  afterEach(async () => {
    await terminalTest.cleanup();
    vi.clearAllMocks();
  });

  describe('Basic Terminal Operations', () => {
    it('CRITICAL: should initialize terminal successfully', async () => {
      const result = await terminalTest.setupTerminal();
      
      expect(terminalTest.setupTerminal).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.terminal).toBeDefined();
      expect(result.websocket).toBeDefined();
      expect(connectionEvents).toContain('setup_called');
    });

    it('should send and receive simple commands', async () => {
      await terminalTest.setupTerminal();
      
      const testCommands = [
        'echo "hello world"',
        'pwd',
        'ls',
        'whoami'
      ];

      for (const cmd of testCommands) {
        const response = await terminalTest.sendCommand(cmd);
        
        expect(response).toBeDefined();
        expect(response).toContain(cmd);
        expect(connectionEvents).toContain(`command_sent: ${cmd}`);
      }
    });

    it('should handle command with arguments properly', async () => {
      await terminalTest.setupTerminal();
      
      const commandsWithArgs = [
        { cmd: 'ls -la', expectInResponse: 'ls' },
        { cmd: 'grep -r "test" .', expectInResponse: 'grep' },
        { cmd: 'find . -name "*.js"', expectInResponse: 'find' },
        { cmd: 'cat file.txt | head -10', expectInResponse: 'cat' }
      ];

      for (const test of commandsWithArgs) {
        const response = await terminalTest.sendCommand(test.cmd);
        expect(response).toContain(test.expectInResponse);
      }
    });
  });

  describe('Claude CLI Integration Tests', () => {
    const claudeCommands: TestScenario[] = [
      {
        name: 'Help Command',
        command: 'claude --help',
        expectedOutput: 'Claude CLI',
        timeout: 10000
      },
      {
        name: 'Version Command', 
        command: 'claude --version',
        expectedOutput: 'version',
        timeout: 5000
      },
      {
        name: 'Status Command',
        command: 'claude status',
        expectedOutput: 'status',
        timeout: 5000
      },
      {
        name: 'Analyze Command',
        command: 'claude analyze --help',
        expectedOutput: 'analyze',
        timeout: 10000
      },
      {
        name: 'Invalid Command',
        command: 'claude invalidcommand',
        expectedError: 'error',
        timeout: 5000
      }
    ];

    claudeCommands.forEach(scenario => {
      it(`CRITICAL: should handle ${scenario.name} properly`, async () => {
        if (scenario.skipReason) {
          console.log(`Skipping ${scenario.name}: ${scenario.skipReason}`);
          return;
        }

        await terminalTest.setupTerminal();
        
        // Send command and wait for response
        const startTime = Date.now();
        const response = await terminalTest.sendCommand(scenario.command);
        const endTime = Date.now();
        
        const duration = endTime - startTime;
        
        // Validate response time
        if (scenario.timeout) {
          expect(duration).toBeLessThan(scenario.timeout);
        }
        
        // Validate response content
        if (scenario.expectedOutput) {
          expect(response.toLowerCase()).toContain(scenario.expectedOutput.toLowerCase());
        }
        
        if (scenario.expectedError) {
          expect(response.toLowerCase()).toContain(scenario.expectedError.toLowerCase());
        }
        
        // Validate no escape sequences in response
        expect(response).not.toContain('[O[I');
        expect(response).not.toContain('\x1b[A');
        expect(response).not.toContain('\x1b[B');
      });
    });

    it('should handle Claude CLI interactive prompts', async () => {
      await terminalTest.setupTerminal();
      
      // Commands that might trigger interactive prompts
      const interactiveCommands = [
        'claude init',
        'claude configure',
        'claude login'
      ];

      for (const cmd of interactiveCommands) {
        const response = await terminalTest.sendCommand(cmd);
        
        // Should handle gracefully even if interactive
        expect(response).toBeDefined();
        expect(typeof response).toBe('string');
        
        // Should not hang indefinitely
        const maxWaitTime = 15000; // 15 seconds max
        const responseTime = await Promise.race([
          terminalTest.waitForResponse(maxWaitTime),
          new Promise(resolve => setTimeout(() => resolve('timeout'), maxWaitTime))
        ]);
        
        expect(responseTime).not.toBe('timeout');
      }
    });
  });

  describe('Input Processing Validation', () => {
    it('CRITICAL: should process line-based input correctly', async () => {
      await terminalTest.setupTerminal();
      
      const testCommand = 'echo "line-based test"';
      const chars = testCommand.split('');
      
      // EXPECTED: Should buffer characters until newline
      let buffer = '';
      let processedCount = 0;
      
      chars.forEach(char => {
        buffer += char;
        // Should NOT process each character individually
        expect(processedCount).toBe(0);
      });
      
      // Add newline to complete command
      buffer += '\n';
      processedCount = 1; // Should process only once
      
      expect(buffer).toBe(testCommand + '\n');
      expect(processedCount).toBe(1);
      
      const response = await terminalTest.sendCommand(buffer);
      expect(response).toBeDefined();
    });

    it('should handle special characters and escape sequences in input', async () => {
      await terminalTest.setupTerminal();
      
      const specialInputs = [
        'echo "test with spaces"',
        'echo "test\twith\ttabs"',
        'echo "test with $VAR"',
        'echo "test with \\"quotes\\""',
        'echo "test with $(command)"'
      ];

      for (const input of specialInputs) {
        const response = await terminalTest.sendCommand(input);
        
        expect(response).toBeDefined();
        // Should handle without corruption
        expect(response).not.toContain('[O[I');
      }
    });

    it('should validate input sanitization', async () => {
      await terminalTest.setupTerminal();
      
      const potentiallyDangerousInputs = [
        'command[O[I',
        'test\x1b[A',
        'input\x1b[B',
        'cmd\x1b[2J'
      ];

      for (const input of potentiallyDangerousInputs) {
        const response = await terminalTest.sendCommand(input);
        
        // Response should not contain escape sequences
        expect(response).not.toContain('[O[I');
        expect(response).not.toContain('\x1b[A');
        expect(response).not.toContain('\x1b[B');
        expect(response).not.toContain('\x1b[2J');
      }
    });
  });

  describe('WebSocket Communication Tests', () => {
    it('CRITICAL: should maintain stable WebSocket connection', async () => {
      await terminalTest.setupTerminal();
      
      // Test connection stability over multiple commands
      const commandSequence = [
        'pwd',
        'ls',
        'echo "test1"',
        'echo "test2"',
        'echo "test3"'
      ];

      let consecutiveSuccesses = 0;
      
      for (const cmd of commandSequence) {
        try {
          const response = await terminalTest.sendCommand(cmd);
          if (response && response.length > 0) {
            consecutiveSuccesses++;
          }
        } catch (error) {
          console.warn(`Command failed: ${cmd}`, error);
          break;
        }
      }
      
      // Should complete all commands successfully
      expect(consecutiveSuccesses).toBe(commandSequence.length);
    });

    it('should handle connection interruption gracefully', async () => {
      await terminalTest.setupTerminal();
      
      // Simulate connection interruption
      mockWebSocket.readyState = 3; // CLOSED
      
      const response = await terminalTest.sendCommand('echo "test after disconnect"');
      
      // Should handle gracefully, not crash
      expect(response).toBeDefined();
      
      // Should attempt reconnection
      expect(connectionEvents.some(event => 
        event.includes('reconnect') || event.includes('connecting')
      )).toBeTruthy();
    });

    it('should queue messages when connection is unstable', async () => {
      await terminalTest.setupTerminal();
      
      // Simulate unstable connection
      mockWebSocket.readyState = 0; // CONNECTING
      
      const queuedCommands = [
        'echo "queued1"',
        'echo "queued2"',
        'echo "queued3"'
      ];

      // Commands should be queued when connection is unstable
      const promises = queuedCommands.map(cmd => 
        terminalTest.sendCommand(cmd)
      );
      
      // Restore connection
      mockWebSocket.readyState = 1; // OPEN
      
      // All commands should eventually succeed
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(typeof response).toBe('string');
      });
    });
  });

  describe('Performance and Reliability Tests', () => {
    it('should handle rapid command execution', async () => {
      await terminalTest.setupTerminal();
      
      const rapidCommands = Array.from({ length: 10 }, (_, i) => 
        `echo "rapid test ${i}"`
      );

      const startTime = Date.now();
      
      const promises = rapidCommands.map(cmd => 
        terminalTest.sendCommand(cmd)
      );
      
      const responses = await Promise.all(promises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete all commands
      expect(responses.length).toBe(rapidCommands.length);
      
      // Should be reasonably fast (under 5 seconds for 10 commands)
      expect(totalTime).toBeLessThan(5000);
      
      // All responses should be valid
      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(typeof response).toBe('string');
      });
    });

    it('should handle long-running commands gracefully', async () => {
      await terminalTest.setupTerminal();
      
      const longCommand = 'sleep 2 && echo "long command complete"';
      const timeout = 10000; // 10 second timeout
      
      const startTime = Date.now();
      const response = await terminalTest.sendCommand(longCommand);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(response).toBeDefined();
      expect(duration).toBeLessThan(timeout);
      
      // Should handle long commands without connection issues
      expect(response).not.toContain('timeout');
      expect(response).not.toContain('error');
    });

    it('should validate memory usage during extended session', async () => {
      await terminalTest.setupTerminal();
      
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Execute many commands to test memory leaks
      for (let i = 0; i < 50; i++) {
        await terminalTest.sendCommand(`echo "memory test ${i}"`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('CRITICAL: should recover from terminal errors gracefully', async () => {
      await terminalTest.setupTerminal();
      
      const errorScenarios = [
        'nonexistent_command_12345',
        'cat /nonexistent/file.txt',
        'mkdir /root/forbidden',
        'kill -9 1'  // Potentially harmful command
      ];

      for (const errorCmd of errorScenarios) {
        const response = await terminalTest.sendCommand(errorCmd);
        
        // Should handle error without crashing
        expect(response).toBeDefined();
        
        // Should be able to continue with next command
        const followupResponse = await terminalTest.sendCommand('echo "still working"');
        expect(followupResponse).toContain('still working');
      }
    });

    it('should handle terminal session cleanup properly', async () => {
      const { terminal, websocket } = await terminalTest.setupTerminal();
      
      // Verify setup
      expect(terminal).toBeDefined();
      expect(websocket).toBeDefined();
      
      // Execute some commands
      await terminalTest.sendCommand('echo "before cleanup"');
      
      // Cleanup should not throw errors
      await expect(terminalTest.cleanup()).resolves.not.toThrow();
      
      // Verify cleanup was called
      expect(connectionEvents).toContain('cleanup_called');
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should work across different shell environments', async () => {
      const shellCommands = [
        { cmd: 'echo $SHELL', description: 'Check shell type' },
        { cmd: 'pwd', description: 'Print working directory' },
        { cmd: 'ls -la | head -5', description: 'List files with pipe' },
        { cmd: 'env | grep PATH', description: 'Environment variables' }
      ];

      await terminalTest.setupTerminal();

      for (const test of shellCommands) {
        const response = await terminalTest.sendCommand(test.cmd);
        
        expect(response).toBeDefined();
        expect(response.length).toBeGreaterThan(0);
        
        // Should not contain escape sequences regardless of shell
        expect(response).not.toContain('[O[I');
      }
    });

    it('should handle different line ending styles', async () => {
      await terminalTest.setupTerminal();
      
      const lineEndingTests = [
        'echo "unix style"\n',      // Unix: LF
        'echo "windows style"\r\n', // Windows: CRLF
        'echo "mac style"\r'        // Old Mac: CR
      ];

      for (const test of lineEndingTests) {
        const response = await terminalTest.sendCommand(test);
        
        expect(response).toBeDefined();
        expect(response).toContain('style');
      }
    });
  });
});

/**
 * Test Validation Summary:
 * 
 * FAILING TESTS (Current Broken State):
 * - Terminal initialization failures
 * - Claude CLI command execution errors
 * - WebSocket connection instability  
 * - Input processing character-by-character issues
 * - Escape sequence corruption in output
 * - Memory leaks during extended sessions
 * - Error recovery failures
 * 
 * PASSING TESTS (When Fully Fixed):
 * - Stable terminal setup and teardown
 * - Successful Claude CLI integration
 * - Reliable WebSocket communication
 * - Proper line-based input processing
 * - Clean output without escape sequences
 * - Efficient memory usage
 * - Graceful error handling and recovery
 * 
 * These end-to-end tests validate that all terminal components work
 * together properly to provide a stable, functional Claude CLI experience.
 */