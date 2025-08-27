/**
 * TDD London School: I/O Communication Flow Testing
 * 
 * Focus: Terminal I/O, SSE streaming, and bidirectional communication
 * London School Methodology: Mock all I/O streams, verify communication contracts
 * 
 * Testing: stdin/stdout/stderr flows, SSE broadcasting, real-time terminal interaction
 */

import { jest } from 'vitest';
import { EventEmitter } from 'events';

// === I/O STREAM MOCKS ===
const mockStdin = {
  write: vi.fn(),
  end: vi.fn(),
  destroy: vi.fn()
};

const mockStdout = new EventEmitter();
const mockStderr = new EventEmitter();

const mockProcess = {
  pid: 42424,
  stdin: mockStdin,
  stdout: mockStdout,
  stderr: mockStderr,
  kill: vi.fn(),
  on: vi.fn(),
  removeAllListeners: vi.fn()
};

const mockSpawn = vi.fn().mockReturnValue(mockProcess);

// === SSE MOCK ===
const mockSSEResponse = {
  writeHead: vi.fn(),
  write: vi.fn(),
  end: vi.fn(),
  on: vi.fn()
};

vi.mock('child_process', () => ({
  spawn: mockSpawn
}));

// === I/O COMMUNICATION MANAGER ===
class IOCommunicationManager extends EventEmitter {
  private processes = new Map<string, any>();
  private sseConnections = new Map<string, any>();
  private inputBuffer = new Map<string, string[]>();
  private outputBuffer = new Map<string, string[]>();

  async createProcessWithIO(config: any) {
    const processId = `io-proc-${Date.now()}`;
    
    const childProcess = mockSpawn(config.command, config.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: config.cwd,
      env: config.env
    });

    const processInfo = {
      id: processId,
      process: childProcess,
      config,
      status: 'running',
      startTime: Date.now(),
      inputHistory: [],
      outputHistory: []
    };

    // Setup I/O event handlers
    this.setupIOHandlers(processId, processInfo);
    
    this.processes.set(processId, processInfo);
    this.inputBuffer.set(processId, []);
    this.outputBuffer.set(processId, []);

    this.emit('process:io:ready', {
      processId,
      pid: childProcess.pid,
      ioStreams: ['stdin', 'stdout', 'stderr']
    });

    return processInfo;
  }

  private setupIOHandlers(processId: string, processInfo: any) {
    const { process: childProcess } = processInfo;

    // === STDOUT DATA HANDLER ===
    childProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      
      processInfo.outputHistory.push({
        stream: 'stdout',
        data: output,
        timestamp: Date.now()
      });

      this.outputBuffer.get(processId)?.push(output);

      // Emit for SSE broadcasting
      this.emit('process:stdout', {
        processId,
        data: output,
        stream: 'stdout'
      });
    });

    // === STDERR DATA HANDLER ===
    childProcess.stderr.on('data', (data: Buffer) => {
      const error = data.toString();
      
      processInfo.outputHistory.push({
        stream: 'stderr',
        data: error,
        timestamp: Date.now()
      });

      // Emit for error handling
      this.emit('process:stderr', {
        processId,
        data: error,
        stream: 'stderr'
      });
    });

    // === PROCESS EXIT HANDLER ===
    childProcess.on('exit', (code: number, signal: string) => {
      processInfo.status = 'exited';
      
      this.emit('process:io:exit', {
        processId,
        exitCode: code,
        signal,
        ioSummary: {
          inputCount: processInfo.inputHistory.length,
          outputCount: processInfo.outputHistory.length
        }
      });

      this.cleanupIO(processId);
    });
  }

  sendInput(processId: string, input: string) {
    const processInfo = this.processes.get(processId);
    if (!processInfo) throw new Error(`Process ${processId} not found`);

    // Record input
    processInfo.inputHistory.push({
      data: input,
      timestamp: Date.now()
    });

    this.inputBuffer.get(processId)?.push(input);

    // Write to process stdin
    processInfo.process.stdin.write(input);

    this.emit('process:input:sent', {
      processId,
      input,
      inputCount: processInfo.inputHistory.length
    });
  }

  // === SSE STREAMING METHODS ===
  createSSEConnection(processId: string, response: any) {
    const connectionId = `sse-${processId}-${Date.now()}`;
    
    // Setup SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const sseConnection = {
      id: connectionId,
      processId,
      response,
      isActive: true,
      startTime: Date.now(),
      messageCount: 0
    };

    this.sseConnections.set(connectionId, sseConnection);

    // Send initial connection message
    this.sendSSEMessage(connectionId, {
      type: 'connection',
      data: { processId, status: 'connected' }
    });

    // Setup cleanup on connection close
    response.on('close', () => {
      sseConnection.isActive = false;
      this.sseConnections.delete(connectionId);
      
      this.emit('sse:disconnected', { connectionId, processId });
    });

    this.emit('sse:connected', { connectionId, processId });

    return sseConnection;
  }

  sendSSEMessage(connectionId: string, message: any) {
    const connection = this.sseConnections.get(connectionId);
    if (!connection || !connection.isActive) return;

    const sseData = `data: ${JSON.stringify(message)}\n\n`;
    connection.response.write(sseData);
    connection.messageCount++;

    this.emit('sse:message:sent', {
      connectionId,
      processId: connection.processId,
      message,
      messageCount: connection.messageCount
    });
  }

  broadcastToSSE(processId: string, message: any) {
    const connections = Array.from(this.sseConnections.values())
      .filter(conn => conn.processId === processId && conn.isActive);

    connections.forEach(conn => {
      this.sendSSEMessage(conn.id, message);
    });

    this.emit('sse:broadcast', {
      processId,
      message,
      connectionCount: connections.length
    });
  }

  // === TERMINAL INTERACTION METHODS ===
  processTerminalCommand(processId: string, command: string) {
    const processInfo = this.processes.get(processId);
    if (!processInfo) throw new Error(`Process ${processId} not found`);

    // Parse command for special handling
    const parsedCommand = this.parseTerminalCommand(command);
    
    this.emit('terminal:command:parsed', {
      processId,
      originalCommand: command,
      parsedCommand
    });

    // Send to process
    this.sendInput(processId, parsedCommand.formatted);

    return parsedCommand;
  }

  private parseTerminalCommand(command: string) {
    const trimmed = command.trim();
    
    // Handle special terminal commands
    if (trimmed.startsWith('clear')) {
      return {
        type: 'clear',
        formatted: trimmed + '\n',
        special: true
      };
    }

    if (trimmed.startsWith('exit')) {
      return {
        type: 'exit',
        formatted: trimmed + '\n',
        special: true
      };
    }

    // Regular command
    return {
      type: 'command',
      formatted: trimmed + '\n',
      special: false
    };
  }

  // === BUFFER MANAGEMENT ===
  getInputBuffer(processId: string, lines: number = 50) {
    const buffer = this.inputBuffer.get(processId) || [];
    return buffer.slice(-lines);
  }

  getOutputBuffer(processId: string, lines: number = 50) {
    const buffer = this.outputBuffer.get(processId) || [];
    return buffer.slice(-lines);
  }

  clearBuffers(processId: string) {
    this.inputBuffer.set(processId, []);
    this.outputBuffer.set(processId, []);
    
    this.emit('buffers:cleared', { processId });
  }

  private cleanupIO(processId: string) {
    this.inputBuffer.delete(processId);
    this.outputBuffer.delete(processId);
    
    // Close any SSE connections for this process
    const connections = Array.from(this.sseConnections.values())
      .filter(conn => conn.processId === processId);
    
    connections.forEach(conn => {
      conn.response.end();
      this.sseConnections.delete(conn.id);
    });
  }
}

describe('TDD London School: I/O Communication Flows', () => {
  let ioManager: IOCommunicationManager;

  beforeEach(() => {
    vi.clearAllMocks();
    ioManager = new IOCommunicationManager();
  });

  describe('Process I/O Stream Contracts', () => {
    test('should create process with all I/O streams configured', async () => {
      const ioReadyHandler = vi.fn();
      ioManager.on('process:io:ready', ioReadyHandler);

      const config = {
        command: 'claude',
        args: [],
        cwd: '/workspaces/agent-feed/prod'
      };

      const processInfo = await ioManager.createProcessWithIO(config);

      // === VERIFY I/O SETUP CONTRACT ===
      expect(mockSpawn).toHaveBeenCalledWith('claude', [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: '/workspaces/agent-feed/prod',
        env: config.env
      });

      expect(ioReadyHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        pid: 42424,
        ioStreams: ['stdin', 'stdout', 'stderr']
      });
    });

    test('should handle stdin input correctly', async () => {
      const inputSentHandler = vi.fn();
      ioManager.on('process:input:sent', inputSentHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await ioManager.createProcessWithIO(config);

      const testInput = 'Hello Claude!\n';
      
      // === SEND INPUT TO PROCESS ===
      ioManager.sendInput(processInfo.id, testInput);

      // === VERIFY STDIN CONTRACT ===
      expect(mockStdin.write).toHaveBeenCalledWith(testInput);
      expect(inputSentHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        input: testInput,
        inputCount: 1
      });
    });

    test('should process stdout data with proper event emission', async () => {
      const stdoutHandler = vi.fn();
      ioManager.on('process:stdout', stdoutHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await ioManager.createProcessWithIO(config);

      const testOutput = 'Claude: Hello! How can I help you?\n';
      
      // === SIMULATE STDOUT DATA ===
      mockProcess.stdout.emit('data', Buffer.from(testOutput));

      // === VERIFY STDOUT PROCESSING CONTRACT ===
      expect(stdoutHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        data: testOutput,
        stream: 'stdout'
      });

      // Check output history
      expect(processInfo.outputHistory).toContainEqual({
        stream: 'stdout',
        data: testOutput,
        timestamp: expect.any(Number)
      });
    });

    test('should handle stderr separately from stdout', async () => {
      const stderrHandler = vi.fn();
      ioManager.on('process:stderr', stderrHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await ioManager.createProcessWithIO(config);

      const errorOutput = 'Error: Invalid command\n';
      
      // === SIMULATE STDERR DATA ===
      mockProcess.stderr.emit('data', Buffer.from(errorOutput));

      // === VERIFY STDERR PROCESSING CONTRACT ===
      expect(stderrHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        data: errorOutput,
        stream: 'stderr'
      });
    });

    test('should track I/O history correctly', async () => {
      const config = { command: 'claude', args: [] };
      const processInfo = await ioManager.createProcessWithIO(config);

      // === SEND MULTIPLE INPUTS ===
      ioManager.sendInput(processInfo.id, 'input 1\n');
      ioManager.sendInput(processInfo.id, 'input 2\n');

      // === SIMULATE OUTPUTS ===
      mockProcess.stdout.emit('data', Buffer.from('output 1\n'));
      mockProcess.stdout.emit('data', Buffer.from('output 2\n'));

      // === VERIFY HISTORY TRACKING ===
      expect(processInfo.inputHistory).toHaveLength(2);
      expect(processInfo.outputHistory).toHaveLength(2);
      
      expect(processInfo.inputHistory[0].data).toBe('input 1\n');
      expect(processInfo.outputHistory[0].data).toBe('output 1\n');
    });
  });

  describe('SSE Streaming Contracts', () => {
    test('should create SSE connection with proper headers', async () => {
      const sseConnectedHandler = vi.fn();
      ioManager.on('sse:connected', sseConnectedHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await ioManager.createProcessWithIO(config);

      // === CREATE SSE CONNECTION ===
      const connection = ioManager.createSSEConnection(processInfo.id, mockSSEResponse);

      // === VERIFY SSE SETUP CONTRACT ===
      expect(mockSSEResponse.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      expect(sseConnectedHandler).toHaveBeenCalledWith({
        connectionId: connection.id,
        processId: processInfo.id
      });
    });

    test('should send SSE messages with correct format', async () => {
      const messageSentHandler = vi.fn();
      ioManager.on('sse:message:sent', messageSentHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await ioManager.createProcessWithIO(config);

      const connection = ioManager.createSSEConnection(processInfo.id, mockSSEResponse);
      
      const testMessage = { type: 'terminal_output', data: 'Hello World' };
      
      // === SEND SSE MESSAGE ===
      ioManager.sendSSEMessage(connection.id, testMessage);

      // === VERIFY SSE MESSAGE CONTRACT ===
      expect(mockSSEResponse.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(testMessage)}\n\n`
      );

      expect(messageSentHandler).toHaveBeenCalledWith({
        connectionId: connection.id,
        processId: processInfo.id,
        message: testMessage,
        messageCount: 2 // 1 initial connection + 1 test message
      });
    });

    test('should broadcast to all SSE connections for a process', async () => {
      const broadcastHandler = vi.fn();
      ioManager.on('sse:broadcast', broadcastHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await ioManager.createProcessWithIO(config);

      // === CREATE MULTIPLE SSE CONNECTIONS ===
      const connection1 = ioManager.createSSEConnection(processInfo.id, mockSSEResponse);
      const connection2 = ioManager.createSSEConnection(processInfo.id, mockSSEResponse);

      const broadcastMessage = { type: 'status', data: 'Process ready' };
      
      // === BROADCAST MESSAGE ===
      ioManager.broadcastToSSE(processInfo.id, broadcastMessage);

      // === VERIFY BROADCAST CONTRACT ===
      expect(broadcastHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        message: broadcastMessage,
        connectionCount: 2
      });
    });

    test('should handle SSE connection close gracefully', async () => {
      const disconnectedHandler = vi.fn();
      ioManager.on('sse:disconnected', disconnectedHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await ioManager.createProcessWithIO(config);

      const connection = ioManager.createSSEConnection(processInfo.id, mockSSEResponse);
      
      // === SIMULATE CONNECTION CLOSE ===
      mockSSEResponse.emit('close');

      // === VERIFY DISCONNECT HANDLING ===
      expect(disconnectedHandler).toHaveBeenCalledWith({
        connectionId: connection.id,
        processId: processInfo.id
      });

      expect(connection.isActive).toBe(false);
    });
  });

  describe('Terminal Interaction Contracts', () => {
    test('should parse and process terminal commands correctly', async () => {
      const commandParsedHandler = vi.fn();
      ioManager.on('terminal:command:parsed', commandParsedHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await ioManager.createProcessWithIO(config);

      // === PROCESS REGULAR COMMAND ===
      const result = ioManager.processTerminalCommand(processInfo.id, 'ls -la');

      // === VERIFY COMMAND PARSING CONTRACT ===
      expect(commandParsedHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        originalCommand: 'ls -la',
        parsedCommand: {
          type: 'command',
          formatted: 'ls -la\n',
          special: false
        }
      });

      expect(result.formatted).toBe('ls -la\n');
    });

    test('should handle special terminal commands', async () => {
      const config = { command: 'claude', args: [] };
      const processInfo = await ioManager.createProcessWithIO(config);

      // === TEST CLEAR COMMAND ===
      const clearResult = ioManager.processTerminalCommand(processInfo.id, 'clear');
      expect(clearResult.type).toBe('clear');
      expect(clearResult.special).toBe(true);

      // === TEST EXIT COMMAND ===
      const exitResult = ioManager.processTerminalCommand(processInfo.id, 'exit');
      expect(exitResult.type).toBe('exit');
      expect(exitResult.special).toBe(true);
    });

    test('should integrate terminal input with SSE output streaming', async () => {
      const config = { command: 'claude', args: [] };
      const processInfo = await ioManager.createProcessWithIO(config);

      const connection = ioManager.createSSEConnection(processInfo.id, mockSSEResponse);

      // === SEND COMMAND AND SIMULATE OUTPUT ===
      ioManager.processTerminalCommand(processInfo.id, 'help');
      mockProcess.stdout.emit('data', Buffer.from('Available commands:\n- help\n- exit\n'));

      // === VERIFY INTEGRATION CONTRACT ===
      expect(mockStdin.write).toHaveBeenCalledWith('help\n');
      expect(mockSSEResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('Available commands:')
      );
    });
  });

  describe('Buffer Management Contracts', () => {
    test('should maintain input and output buffers', async () => {
      const config = { command: 'claude', args: [] };
      const processInfo = await ioManager.createProcessWithIO(config);

      // === FILL BUFFERS ===
      ioManager.sendInput(processInfo.id, 'input 1\n');
      ioManager.sendInput(processInfo.id, 'input 2\n');
      
      mockProcess.stdout.emit('data', Buffer.from('output 1\n'));
      mockProcess.stdout.emit('data', Buffer.from('output 2\n'));

      // === VERIFY BUFFER CONTRACTS ===
      const inputBuffer = ioManager.getInputBuffer(processInfo.id);
      const outputBuffer = ioManager.getOutputBuffer(processInfo.id);

      expect(inputBuffer).toEqual(['input 1\n', 'input 2\n']);
      expect(outputBuffer).toEqual(['output 1\n', 'output 2\n']);
    });

    test('should limit buffer size correctly', async () => {
      const config = { command: 'claude', args: [] };
      const processInfo = await ioManager.createProcessWithIO(config);

      // === FILL BUFFER BEYOND LIMIT ===
      for (let i = 0; i < 100; i++) {
        ioManager.sendInput(processInfo.id, `input ${i}\n`);
      }

      // === VERIFY LIMITED BUFFER ===
      const limitedBuffer = ioManager.getInputBuffer(processInfo.id, 10);
      expect(limitedBuffer).toHaveLength(10);
      expect(limitedBuffer[9]).toBe('input 99\n'); // Should be the last 10
    });

    test('should clear buffers on demand', async () => {
      const buffersClearedHandler = vi.fn();
      ioManager.on('buffers:cleared', buffersClearedHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await ioManager.createProcessWithIO(config);

      // === FILL BUFFERS ===
      ioManager.sendInput(processInfo.id, 'test input\n');
      mockProcess.stdout.emit('data', Buffer.from('test output\n'));

      // === CLEAR BUFFERS ===
      ioManager.clearBuffers(processInfo.id);

      // === VERIFY CLEAR CONTRACT ===
      expect(buffersClearedHandler).toHaveBeenCalledWith({
        processId: processInfo.id
      });

      expect(ioManager.getInputBuffer(processInfo.id)).toHaveLength(0);
      expect(ioManager.getOutputBuffer(processInfo.id)).toHaveLength(0);
    });
  });

  describe('Process I/O Exit and Cleanup', () => {
    test('should emit I/O summary on process exit', async () => {
      const ioExitHandler = vi.fn();
      ioManager.on('process:io:exit', ioExitHandler);

      const config = { command: 'claude', args: [] };
      const processInfo = await ioManager.createProcessWithIO(config);

      // === GENERATE SOME I/O ACTIVITY ===
      ioManager.sendInput(processInfo.id, 'test1\n');
      ioManager.sendInput(processInfo.id, 'test2\n');
      
      mockProcess.stdout.emit('data', Buffer.from('response1\n'));
      mockProcess.stdout.emit('data', Buffer.from('response2\n'));

      // === SIMULATE PROCESS EXIT ===
      mockProcess.emit('exit', 0, null);

      // === VERIFY I/O EXIT CONTRACT ===
      expect(ioExitHandler).toHaveBeenCalledWith({
        processId: processInfo.id,
        exitCode: 0,
        signal: null,
        ioSummary: {
          inputCount: 2,
          outputCount: 2
        }
      });
    });

    test('should cleanup all I/O resources on exit', async () => {
      const config = { command: 'claude', args: [] };
      const processInfo = await ioManager.createProcessWithIO(config);

      // === CREATE SSE CONNECTION ===
      const connection = ioManager.createSSEConnection(processInfo.id, mockSSEResponse);

      // === SIMULATE PROCESS EXIT ===
      mockProcess.emit('exit', 0, null);

      // === VERIFY CLEANUP CONTRACT ===
      expect(mockSSEResponse.end).toHaveBeenCalled();
      
      // Buffers should be cleaned up
      expect(ioManager.getInputBuffer(processInfo.id)).toHaveLength(0);
      expect(ioManager.getOutputBuffer(processInfo.id)).toHaveLength(0);
    });
  });
});