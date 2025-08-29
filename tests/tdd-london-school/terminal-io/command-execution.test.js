/**
 * TDD London School - Command Execution Tests
 * 
 * PROBLEM: Commands not executing properly, hanging terminal
 * SOLUTION: Mock-driven command execution flow with proper lifecycle
 * 
 * Focus: HOW commands should be executed, not WHAT they contain
 */

// Jest is globally available

// London School: Mock all collaborators first
const mockPty = {
  spawn: jest.fn(),
  write: jest.fn(),
  on: jest.fn(),
  kill: jest.fn(),
  resize: jest.fn(),
  pid: 1234
};

const mockWebSocket = {
  send: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
  close: jest.fn(),
  readyState: 1 // OPEN
};

const mockCommandBuffer = {
  enqueue: jest.fn(),
  dequeue: jest.fn(),
  isEmpty: jest.fn(() => false),
  clear: jest.fn()
};

const mockExecutionContext = {
  isReady: jest.fn(() => true),
  setCommand: jest.fn(),
  getCommand: jest.fn(),
  markExecuting: jest.fn(),
  markComplete: jest.fn()
};

jest.mock('node-pty', () => ({
  spawn: jest.fn(() => mockPty)
}));

describe('TDD London School - Command Execution', () => {
  
  describe('RED PHASE: Command Execution Contracts', () => {
    
    it('should execute commands only after Enter is pressed', () => {
      // RED: Define the execution contract
      const commandExecutor = new CommandExecutor(mockPty, mockWebSocket, mockCommandBuffer);
      
      // Type command without Enter
      commandExecutor.bufferInput('l');
      commandExecutor.bufferInput('s');
      
      // Should NOT execute yet
      expect(mockPty.write).not.toHaveBeenCalled();
      expect(mockCommandBuffer.enqueue).not.toHaveBeenCalled();
      
      // Press Enter
      commandExecutor.execute('\n');
      
      // NOW should execute
      expect(mockCommandBuffer.enqueue).toHaveBeenCalledWith('ls');
      expect(mockPty.write).toHaveBeenCalledWith('ls\n');
    });
    
    it('should coordinate command lifecycle with execution context', () => {
      // RED: Mock the conversation between executor and context
      const commandExecutor = new CommandExecutor(
        mockPty, 
        mockWebSocket, 
        mockCommandBuffer,
        mockExecutionContext
      );
      
      commandExecutor.execute('pwd\n');
      
      // Verify the coordination sequence
      expect(mockExecutionContext.setCommand).toHaveBeenCalledWith('pwd');
      expect(mockExecutionContext.markExecuting).toHaveBeenCalled();
      expect(mockPty.write).toHaveBeenCalledAfter(mockExecutionContext.markExecuting);
    });
    
    it('should handle command output properly', () => {
      // RED: Mock PTY output handling
      const commandExecutor = new CommandExecutor(mockPty, mockWebSocket);
      
      // Mock PTY data event
      mockPty.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          commandExecutor._onData = callback;
        }
      });
      
      commandExecutor.execute('ls\n');
      
      // Simulate command output
      commandExecutor._onData('file1.txt\nfile2.txt\n');
      
      // Should send output to WebSocket
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'output',
          data: 'file1.txt\nfile2.txt\n',
          timestamp: expect.any(Number)
        })
      );
    });
    
    it('should prevent multiple simultaneous executions', () => {
      // RED: Define execution concurrency contract
      mockExecutionContext.isReady
        .mockReturnValueOnce(true)  // First call succeeds
        .mockReturnValueOnce(false); // Second call blocked
      
      const commandExecutor = new CommandExecutor(
        mockPty, mockWebSocket, mockCommandBuffer, mockExecutionContext
      );
      
      // First command
      commandExecutor.execute('ls\n');
      expect(mockPty.write).toHaveBeenCalledWith('ls\n');
      
      // Second command while first is running
      commandExecutor.execute('pwd\n');
      expect(mockPty.write).not.toHaveBeenCalledWith('pwd\n');
    });
    
  });
  
  describe('GREEN PHASE: Mock Implementation', () => {
    
    it('should implement command queueing through mocks', () => {
      // GREEN: Mock the queueing behavior
      const mockQueue = [];
      mockCommandBuffer.enqueue.mockImplementation((cmd) => {
        mockQueue.push(cmd);
      });
      mockCommandBuffer.dequeue.mockImplementation(() => {
        return mockQueue.shift();
      });
      mockCommandBuffer.isEmpty.mockImplementation(() => {
        return mockQueue.length === 0;
      });
      
      const commandExecutor = new CommandExecutor(mockPty, mockWebSocket, mockCommandBuffer);
      
      // Queue multiple commands
      commandExecutor.queueCommand('ls');
      commandExecutor.queueCommand('pwd');
      
      expect(mockCommandBuffer.enqueue).toHaveBeenCalledWith('ls');
      expect(mockCommandBuffer.enqueue).toHaveBeenCalledWith('pwd');
    });
    
    it('should mock proper error handling', () => {
      // GREEN: Define error handling contracts
      const errorHandler = jest.fn();
      mockPty.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          commandExecutor._onError = callback;
        }
      });
      
      const commandExecutor = new CommandExecutor(
        mockPty, 
        mockWebSocket,
        mockCommandBuffer,
        mockExecutionContext,
        { onError: errorHandler }
      );
      
      // Simulate PTY error
      const error = new Error('Command failed');
      commandExecutor._onError(error);
      
      expect(errorHandler).toHaveBeenCalledWith(error);
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"')
      );
    });
    
    it('should mock command completion workflow', () => {
      // GREEN: Mock the completion sequence
      const commandExecutor = new CommandExecutor(
        mockPty, mockWebSocket, mockCommandBuffer, mockExecutionContext
      );
      
      mockPty.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          commandExecutor._onData = callback;
        }
      });
      
      commandExecutor.execute('echo "test"\n');
      
      // Simulate command completion
      commandExecutor._onData('test\n');
      
      // Should mark execution complete
      expect(mockExecutionContext.markComplete).toHaveBeenCalled();
    });
    
  });
  
  describe('REFACTOR PHASE: Clean Command Execution', () => {
    
    it('should implement clean command execution pipeline', () => {
      // REFACTOR: Verify clean architecture
      const mockPipeline = {
        validate: jest.fn(() => true),
        prepare: jest.fn((cmd) => cmd.trim()),
        execute: jest.fn(),
        handle: jest.fn()
      };
      
      const commandExecutor = new CommandExecutor(
        mockPty, mockWebSocket, mockCommandBuffer, mockExecutionContext,
        { pipeline: mockPipeline }
      );
      
      commandExecutor.execute('ls -la\n');
      
      // Verify pipeline execution order
      expect(mockPipeline.validate).toHaveBeenCalledBefore(mockPipeline.prepare);
      expect(mockPipeline.prepare).toHaveBeenCalledBefore(mockPipeline.execute);
      expect(mockPipeline.prepare).toHaveBeenCalledWith('ls -la');
    });
    
    it('should cleanly separate concerns in command handling', () => {
      // REFACTOR: Mock clean separation
      const mockInputProcessor = { process: jest.fn() };
      const mockOutputProcessor = { process: jest.fn() };
      const mockStateManager = { transition: jest.fn() };
      
      const commandExecutor = new CommandExecutor(
        mockPty, mockWebSocket, mockCommandBuffer, mockExecutionContext, {
          inputProcessor: mockInputProcessor,
          outputProcessor: mockOutputProcessor,
          stateManager: mockStateManager
        }
      );
      
      commandExecutor.execute('echo test\n');
      
      // Verify clean interactions
      expect(mockInputProcessor.process).toHaveBeenCalledWith('echo test');
      expect(mockStateManager.transition).toHaveBeenCalledWith('executing');
    });
    
  });
  
  describe('Integration with WebSocket Protocol', () => {
    
    it('should coordinate WebSocket message handling', () => {
      // Test the conversation between WebSocket and command executor
      const commandExecutor = new CommandExecutor(mockPty, mockWebSocket);
      
      mockWebSocket.on.mockImplementation((event, handler) => {
        if (event === 'message') {
          commandExecutor._messageHandler = handler;
        }
      });
      
      // Simulate WebSocket message
      const message = JSON.stringify({ type: 'command', data: 'ls' });
      commandExecutor._messageHandler(message);
      
      expect(mockPty.write).toHaveBeenCalledWith('ls\n');
    });
    
  });
  
});

// Stub implementations for test execution
class CommandExecutor {
  constructor(pty, webSocket, commandBuffer, executionContext, options = {}) {
    this.pty = pty;
    this.webSocket = webSocket;
    this.commandBuffer = commandBuffer;
    this.executionContext = executionContext;
    this.options = options;
    this.inputBuffer = '';
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    if (this.pty.on) {
      this.pty.on('data', (data) => this.handleOutput(data));
      this.pty.on('error', (error) => this.handleError(error));
    }
  }
  
  bufferInput(char) {
    this.inputBuffer += char;
  }
  
  execute(input) {
    if (input.includes('\n')) {
      const command = this.inputBuffer || input.replace('\n', '');
      this.inputBuffer = '';
      
      if (this.executionContext && !this.executionContext.isReady()) {
        return false;
      }
      
      if (this.options.pipeline) {
        if (!this.options.pipeline.validate(command)) return false;
        command = this.options.pipeline.prepare(command);
      }
      
      if (this.executionContext) {
        this.executionContext.setCommand(command);
        this.executionContext.markExecuting();
      }
      
      if (this.commandBuffer) {
        this.commandBuffer.enqueue(command);
      }
      
      this.pty.write(command + '\n');
      return true;
    } else {
      this.bufferInput(input);
      return false;
    }
  }
  
  queueCommand(command) {
    if (this.commandBuffer) {
      this.commandBuffer.enqueue(command);
    }
  }
  
  handleOutput(data) {
    if (this.webSocket && this.webSocket.readyState === 1) {
      this.webSocket.send(JSON.stringify({
        type: 'output',
        data: data,
        timestamp: Date.now()
      }));
    }
    
    if (this.executionContext) {
      this.executionContext.markComplete();
    }
  }
  
  handleError(error) {
    if (this.options.onError) {
      this.options.onError(error);
    }
    
    if (this.webSocket && this.webSocket.readyState === 1) {
      this.webSocket.send(JSON.stringify({
        type: 'error',
        message: error.message,
        timestamp: Date.now()
      }));
    }
  }
}

module.exports = { CommandExecutor };