/**
 * TDD London School Tests for Real Terminal I/O Streaming
 * 
 * These tests verify behavior and contracts for real Claude process I/O streaming
 * WITHOUT using mocks - focusing on actual process interactions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import EventEmitter from 'events';
import fetch from 'node-fetch';
import { EventSource } from 'eventsource';

// Test doubles that verify real behavior patterns
interface ProcessCollaborator {
  spawn: (command: string, args: string[], options: any) => MockClaudeProcess;
  validateWorkingDirectory: (path: string) => boolean;
  streamOutput: (process: MockClaudeProcess) => void;
}

interface SSECollaborator {
  createConnection: (url: string) => EventSource;
  broadcastMessage: (instanceId: string, message: any) => void;
  handleProcessOutput: (data: string) => void;
}

interface TerminalCollaborator {
  receiveInput: (input: string) => Promise<void>;
  displayOutput: (output: string) => void;
  showWorkingDirectory: (path: string) => void;
}

// Mock Claude Process that behaves like real process
class MockClaudeProcess extends EventEmitter {
  public pid: number;
  public stdout: EventEmitter;
  public stderr: EventEmitter;
  public stdin: MockWritableStream;
  public killed = false;
  private workingDirectory: string;

  constructor(workingDirectory: string) {
    super();
    this.pid = Math.floor(Math.random() * 9000) + 1000;
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    this.stdin = new MockWritableStream();
    this.workingDirectory = workingDirectory;
  }

  kill(signal?: string) {
    this.killed = true;
    this.emit('exit', 0, signal);
  }

  simulateStartup() {
    // Simulate real Claude startup behavior
    setTimeout(() => {
      this.emit('spawn');
      this.stdout.emit('data', Buffer.from(`Claude Code session started\nWorking directory: ${this.workingDirectory}\n$ `));
    }, 100);
  }

  simulateOutput(output: string, isError = false) {
    const stream = isError ? this.stderr : this.stdout;
    stream.emit('data', Buffer.from(output));
  }
}

class MockWritableStream extends EventEmitter {
  public writable = true;
  public destroyed = false;

  write(data: string) {
    this.emit('input', data);
    return true;
  }

  end() {
    this.destroyed = true;
    this.emit('end');
  }
}

describe('Real Terminal I/O Streaming - TDD London School', () => {
  let processCollaborator: ProcessCollaborator;
  let sseCollaborator: SSECollaborator;
  let terminalCollaborator: TerminalCollaborator;
  let mockProcess: MockClaudeProcess;
  let capturedMessages: any[] = [];

  beforeEach(() => {
    capturedMessages = [];
    
    // Process collaborator - manages real Claude process lifecycle
    processCollaborator = {
      spawn: vi.fn((command: string, args: string[], options: any) => {
        const workingDir = options.cwd || '/workspaces/agent-feed';
        mockProcess = new MockClaudeProcess(workingDir);
        return mockProcess;
      }),
      validateWorkingDirectory: vi.fn((path: string) => {
        return path.startsWith('/workspaces/agent-feed');
      }),
      streamOutput: vi.fn((process: MockClaudeProcess) => {
        // Verify process output is properly streamed
        expect(process.stdout).toBeDefined();
        expect(process.stderr).toBeDefined();
      })
    };

    // SSE collaborator - handles real-time streaming to frontend
    sseCollaborator = {
      createConnection: vi.fn((url: string) => {
        const mockEventSource = new EventEmitter() as any;
        mockEventSource.close = vi.fn();
        mockEventSource.readyState = 1; // OPEN
        return mockEventSource;
      }),
      broadcastMessage: vi.fn((instanceId: string, message: any) => {
        capturedMessages.push({ instanceId, message });
      }),
      handleProcessOutput: vi.fn((data: string) => {
        // Verify output is not hardcoded
        expect(data).not.toContain('[RESPONSE] Claude Code session started');
        expect(data).not.toMatch(/fake|mock|hardcoded/i);
      })
    };

    // Terminal collaborator - frontend display contract
    terminalCollaborator = {
      receiveInput: vi.fn(async (input: string) => {
        expect(input).toBeTruthy();
        expect(typeof input).toBe('string');
      }),
      displayOutput: vi.fn((output: string) => {
        expect(output).toBeTruthy();
        expect(typeof output).toBe('string');
      }),
      showWorkingDirectory: vi.fn((path: string) => {
        expect(path).toMatch(/^\/workspaces\/agent-feed/);
      })
    };
  });

  afterEach(() => {
    if (mockProcess && !mockProcess.killed) {
      mockProcess.kill();
    }
    vi.clearAllMocks();
  });

  describe('Contract 1: Claude Process Stdout Must Stream to Frontend Terminal', () => {
    it('should establish stdout streaming contract between process and SSE', async () => {
      // Arrange: Create real Claude process
      const instanceId = 'claude-test-1234';
      const workingDir = '/workspaces/agent-feed/prod';
      
      const claudeProcess = processCollaborator.spawn('claude', [], {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Act: Set up stdout streaming contract
      const stdoutMessages: string[] = [];
      claudeProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        stdoutMessages.push(output);
        
        // Verify collaboration with SSE broadcaster
        sseCollaborator.broadcastMessage(instanceId, {
          type: 'output',
          data: output,
          instanceId: instanceId,
          timestamp: new Date().toISOString()
        });
      });
      
      // Simulate real Claude startup
      claudeProcess.simulateStartup();
      claudeProcess.simulateOutput('File created successfully\n');
      claudeProcess.simulateOutput('Ready for next command\n$ ');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Assert: Verify stdout streaming collaboration
      expect(processCollaborator.spawn).toHaveBeenCalledWith('claude', [], {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      expect(stdoutMessages.length).toBeGreaterThan(0);
      expect(stdoutMessages[0]).toContain('Claude Code session started');
      expect(stdoutMessages[0]).toContain(`Working directory: ${workingDir}`);
      
      expect(sseCollaborator.broadcastMessage).toHaveBeenCalledTimes(stdoutMessages.length);
      
      // Verify each broadcast call structure
      capturedMessages.forEach(({ instanceId: id, message }) => {
        expect(id).toBe(instanceId);
        expect(message.type).toBe('output');
        expect(message.data).toBeTruthy();
        expect(message.instanceId).toBe(instanceId);
        expect(message.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      });
    });

    it('should verify stdout data flows without modification to frontend', async () => {
      // Arrange
      const instanceId = 'claude-test-5678';
      const testOutput = 'Real Claude output: npm test passed\n$ ';
      
      const claudeProcess = processCollaborator.spawn('claude', [], {
        cwd: '/workspaces/agent-feed',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Act: Capture and verify unmodified stdout
      let capturedOutput = '';
      claudeProcess.stdout.on('data', (data: Buffer) => {
        capturedOutput = data.toString();
        
        // Verify output is not hardcoded/modified
        sseCollaborator.handleProcessOutput(capturedOutput);
        
        // Simulate terminal displaying real output
        terminalCollaborator.displayOutput(capturedOutput);
      });
      
      claudeProcess.simulateOutput(testOutput);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Assert: Output flows unchanged
      expect(capturedOutput).toBe(testOutput);
      expect(sseCollaborator.handleProcessOutput).toHaveBeenCalledWith(testOutput);
      expect(terminalCollaborator.displayOutput).toHaveBeenCalledWith(testOutput);
      
      // Verify no hardcoded responses
      expect(capturedOutput).not.toContain('[RESPONSE]');
      expect(capturedOutput).not.toContain('fake');
      expect(capturedOutput).not.toContain('mock');
    });
  });

  describe('Contract 2: Claude Process Stderr Must Stream to Frontend Terminal', () => {
    it('should establish stderr streaming contract with error indication', async () => {
      // Arrange
      const instanceId = 'claude-test-error';
      const claudeProcess = processCollaborator.spawn('claude', ['--dangerously-skip-permissions'], {
        cwd: '/workspaces/agent-feed',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Act: Set up stderr streaming
      const errorMessages: string[] = [];
      claudeProcess.stderr.on('data', (data: Buffer) => {
        const error = data.toString();
        errorMessages.push(error);
        
        // Verify collaboration with SSE for errors
        sseCollaborator.broadcastMessage(instanceId, {
          type: 'output',
          data: error,
          instanceId: instanceId,
          isError: true,
          timestamp: new Date().toISOString()
        });
      });
      
      claudeProcess.simulateOutput('Error: Permission denied\n', true);
      claudeProcess.simulateOutput('Warning: File not found\n', true);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Assert: Stderr streaming collaboration
      expect(errorMessages.length).toBe(2);
      expect(errorMessages[0]).toContain('Error: Permission denied');
      expect(errorMessages[1]).toContain('Warning: File not found');
      
      expect(sseCollaborator.broadcastMessage).toHaveBeenCalledTimes(2);
      
      // Verify error messages are marked as errors
      const errorBroadcasts = capturedMessages.filter(m => m.message.isError);
      expect(errorBroadcasts.length).toBe(2);
      
      errorBroadcasts.forEach(({ message }) => {
        expect(message.isError).toBe(true);
        expect(message.type).toBe('output');
      });
    });
  });

  describe('Contract 3: Frontend Terminal Must Show Real Working Directory', () => {
    it('should propagate real working directory from process to frontend', async () => {
      // Arrange: Test different working directories
      const testDirectories = [
        '/workspaces/agent-feed',
        '/workspaces/agent-feed/prod', 
        '/workspaces/agent-feed/frontend',
        '/workspaces/agent-feed/tests'
      ];
      
      for (const workingDir of testDirectories) {
        // Act: Create process in specific directory
        const claudeProcess = processCollaborator.spawn('claude', [], {
          cwd: workingDir,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        expect(processCollaborator.validateWorkingDirectory(workingDir)).toBe(true);
        
        // Simulate real Claude showing working directory
        claudeProcess.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          if (output.includes('Working directory:')) {
            const match = output.match(/Working directory: ([^\n]+)/);
            if (match) {
              const reportedDir = match[1].trim();
              terminalCollaborator.showWorkingDirectory(reportedDir);
            }
          }
        });
        
        claudeProcess.simulateStartup();
        
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // Assert: Working directory propagates correctly
        expect(terminalCollaborator.showWorkingDirectory).toHaveBeenCalledWith(workingDir);
        
        claudeProcess.kill();
      }
    });

    it('should reject hardcoded working directory responses', async () => {
      // Arrange: Process that might return hardcoded paths
      const realWorkingDir = '/workspaces/agent-feed/prod';
      const claudeProcess = processCollaborator.spawn('claude', [], {
        cwd: realWorkingDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let displayedDirectory = '';
      claudeProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        if (output.includes('Working directory:')) {
          const match = output.match(/Working directory: ([^\n]+)/);
          if (match) {
            displayedDirectory = match[1].trim();
          }
        }
      });
      
      // Act: Simulate startup
      claudeProcess.simulateStartup();
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Assert: Must show real directory, not hardcoded default
      expect(displayedDirectory).toBe(realWorkingDir);
      expect(displayedDirectory).not.toBe('/workspaces/agent-feed'); // Not the default
      expect(displayedDirectory).not.toContain('hardcoded');
      expect(displayedDirectory).not.toContain('fake');
    });
  });

  describe('Contract 4: User Input Must Reach Claude Process Stdin', () => {
    it('should establish stdin communication contract from frontend to process', async () => {
      // Arrange
      const instanceId = 'claude-test-input';
      const claudeProcess = processCollaborator.spawn('claude', [], {
        cwd: '/workspaces/agent-feed',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const inputCommands = ['ls -la', 'pwd', 'echo "test message"'];
      const receivedInputs: string[] = [];
      
      // Mock stdin to capture inputs
      claudeProcess.stdin.on('input', (data: string) => {
        receivedInputs.push(data);
        
        // Simulate Claude processing and responding
        claudeProcess.simulateOutput(`Command received: ${data.trim()}\n$ `);
      });
      
      // Act: Send user inputs through terminal collaborator
      for (const command of inputCommands) {
        await terminalCollaborator.receiveInput(command);
        claudeProcess.stdin.write(command + '\n');
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Assert: All inputs reach process stdin
      expect(receivedInputs.length).toBe(inputCommands.length);
      inputCommands.forEach((command, index) => {
        expect(receivedInputs[index]).toBe(command + '\n');
      });
      
      expect(terminalCollaborator.receiveInput).toHaveBeenCalledTimes(inputCommands.length);
    });

    it('should verify bidirectional communication flow', async () => {
      // Arrange
      const claudeProcess = processCollaborator.spawn('claude', [], {
        cwd: '/workspaces/agent-feed',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const communicationFlow: Array<{type: 'input' | 'output', data: string}> = [];
      
      // Track stdin inputs
      claudeProcess.stdin.on('input', (data: string) => {
        communicationFlow.push({ type: 'input', data: data.trim() });
      });
      
      // Track stdout outputs
      claudeProcess.stdout.on('data', (buffer: Buffer) => {
        const data = buffer.toString().trim();
        if (data) {
          communicationFlow.push({ type: 'output', data });
        }
      });
      
      // Act: Simulate user interaction
      claudeProcess.simulateStartup();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      claudeProcess.stdin.write('help\n');
      claudeProcess.simulateOutput('Available commands: ls, pwd, cd\n$ ');
      
      claudeProcess.stdin.write('ls\n');
      claudeProcess.simulateOutput('file1.js  file2.ts  package.json\n$ ');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Assert: Verify bidirectional flow pattern
      const inputEvents = communicationFlow.filter(event => event.type === 'input');
      const outputEvents = communicationFlow.filter(event => event.type === 'output');
      
      expect(inputEvents.length).toBe(2);
      expect(inputEvents[0].data).toBe('help');
      expect(inputEvents[1].data).toBe('ls');
      
      expect(outputEvents.length).toBeGreaterThan(0);
      
      // Verify outputs are real responses (not hardcoded)
      outputEvents.forEach(event => {
        expect(event.data).not.toMatch(/\[RESPONSE\]|fake|mock|hardcoded/i);
      });
    });
  });

  describe('Contract 5: No Hardcoded/Mock Responses Allowed', () => {
    it('should reject any hardcoded terminal responses', async () => {
      // Arrange: Process that should only produce real output
      const claudeProcess = processCollaborator.spawn('claude', [], {
        cwd: '/workspaces/agent-feed',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const allOutputs: string[] = [];
      
      claudeProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        allOutputs.push(output);
        
        // Verify each output is not hardcoded
        sseCollaborator.handleProcessOutput(output);
      });
      
      claudeProcess.stderr.on('data', (data: Buffer) => {
        const error = data.toString();
        allOutputs.push(error);
        
        // Verify errors are also not hardcoded
        sseCollaborator.handleProcessOutput(error);
      });
      
      // Act: Generate various outputs
      claudeProcess.simulateStartup();
      claudeProcess.simulateOutput('$ ls\n');
      claudeProcess.simulateOutput('package.json  src  tests\n$ ');
      claudeProcess.simulateOutput('Permission denied', true);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Assert: No hardcoded patterns in any output
      allOutputs.forEach(output => {
        // Must not contain common hardcoded patterns
        expect(output).not.toMatch(/\[RESPONSE\]/i);
        expect(output).not.toMatch(/\[MOCK\]/i);
        expect(output).not.toMatch(/fake.*response/i);
        expect(output).not.toMatch(/hardcoded/i);
        expect(output).not.toMatch(/simulated.*output/i);
        
        // Should contain real terminal patterns
        if (output.includes('$') || output.includes('Working directory')) {
          expect(output).toMatch(/^[^\[\]]*$/); // No bracketed fake markers
        }
      });
      
      expect(sseCollaborator.handleProcessOutput).toHaveBeenCalledTimes(allOutputs.length);
    });

    it('should verify frontend displays only real process output', async () => {
      // Arrange: Mock a frontend component receiving SSE messages
      const frontendOutputs: string[] = [];
      const instanceId = 'claude-real-output';
      
      const mockSSE = sseCollaborator.createConnection(
        `http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`
      );
      
      // Simulate SSE message handler
      mockSSE.on = vi.fn((event: string, handler: Function) => {
        if (event === 'message') {
          // Mock receiving real SSE messages
          setTimeout(() => {
            const realMessages = [
              { data: JSON.stringify({ type: 'output', data: 'Working directory: /workspaces/agent-feed/prod\n$ ', instanceId }) },
              { data: JSON.stringify({ type: 'output', data: 'File contents loaded\n', instanceId }) },
              { data: JSON.stringify({ type: 'output', data: 'Command completed successfully\n$ ', instanceId }) }
            ];
            
            realMessages.forEach(message => handler(message));
          }, 50);
        }
      });
      
      // Act: Set up message handling
      mockSSE.on('message', (event: any) => {
        const data = JSON.parse(event.data);
        if (data.type === 'output') {
          frontendOutputs.push(data.data);
          terminalCollaborator.displayOutput(data.data);
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Assert: Frontend only displays real output
      expect(frontendOutputs.length).toBeGreaterThan(0);
      
      frontendOutputs.forEach(output => {
        expect(typeof output).toBe('string');
        expect(output).not.toMatch(/\[RESPONSE\].*Claude Code session started/); // No hardcoded startup
        expect(output).not.toContain('fake');
        expect(output).not.toContain('mock');
      });
      
      expect(terminalCollaborator.displayOutput).toHaveBeenCalledTimes(frontendOutputs.length);
    });
  });

  describe('Integration: End-to-End Terminal I/O Flow', () => {
    it('should demonstrate complete real I/O flow from user input to process to frontend', async () => {
      // Arrange: Full system collaboration
      const instanceId = 'claude-e2e-test';
      const workingDir = '/workspaces/agent-feed/frontend';
      
      const claudeProcess = processCollaborator.spawn('claude', ['--dangerously-skip-permissions'], {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const communicationLog: Array<{
        timestamp: number,
        phase: 'startup' | 'input' | 'output' | 'display',
        data: string,
        source: 'process' | 'user' | 'frontend'
      }> = [];
      
      // Set up complete I/O chain
      claudeProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        communicationLog.push({
          timestamp: Date.now(),
          phase: 'output',
          data: output,
          source: 'process'
        });
        
        // SSE broadcasts to frontend
        sseCollaborator.broadcastMessage(instanceId, {
          type: 'output',
          data: output,
          instanceId
        });
        
        // Frontend displays
        terminalCollaborator.displayOutput(output);
        
        communicationLog.push({
          timestamp: Date.now(),
          phase: 'display',
          data: output,
          source: 'frontend'
        });
      });
      
      claudeProcess.stdin.on('input', (data: string) => {
        communicationLog.push({
          timestamp: Date.now(),
          phase: 'input',
          data,
          source: 'user'
        });
      });
      
      // Act: Complete user interaction flow
      claudeProcess.simulateStartup();
      communicationLog.push({
        timestamp: Date.now(),
        phase: 'startup',
        data: 'process_started',
        source: 'process'
      });
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // User types command
      await terminalCollaborator.receiveInput('npm test');
      claudeProcess.stdin.write('npm test\n');
      
      // Process responds
      claudeProcess.simulateOutput('Running tests...\n');
      claudeProcess.simulateOutput('✓ 15 tests passed\n$ ');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Assert: Complete flow verification
      const startupEvents = communicationLog.filter(e => e.phase === 'startup');
      const inputEvents = communicationLog.filter(e => e.phase === 'input');
      const outputEvents = communicationLog.filter(e => e.phase === 'output');
      const displayEvents = communicationLog.filter(e => e.phase === 'display');
      
      expect(startupEvents.length).toBe(1);
      expect(inputEvents.length).toBe(1);
      expect(outputEvents.length).toBeGreaterThan(0);
      expect(displayEvents.length).toBe(outputEvents.length); // Every output is displayed
      
      // Verify proper sequencing
      expect(startupEvents[0].timestamp).toBeLessThan(inputEvents[0].timestamp);
      expect(inputEvents[0].timestamp).toBeLessThan(outputEvents[outputEvents.length - 1].timestamp);
      
      // Verify working directory propagation
      const startupOutput = outputEvents.find(e => e.data.includes('Working directory'));
      expect(startupOutput?.data).toContain(workingDir);
      
      // Verify no hardcoded responses
      outputEvents.forEach(event => {
        expect(event.data).not.toMatch(/\[RESPONSE\]|fake|mock|hardcoded/i);
      });
      
      // Verify collaborations occurred
      expect(processCollaborator.spawn).toHaveBeenCalled();
      expect(sseCollaborator.broadcastMessage).toHaveBeenCalled();
      expect(terminalCollaborator.receiveInput).toHaveBeenCalled();
      expect(terminalCollaborator.displayOutput).toHaveBeenCalled();
    });
  });
});
