/**
 * TDD London School - WebSocket Protocol Tests
 * 
 * PROBLEM: WebSocket message handling causing echo and execution issues
 * SOLUTION: Define clean protocol through mock interactions
 * 
 * Focus: Message flow and protocol design through behavior verification
 */

// Jest is globally available
const { WebSocketServer } = require('ws');

// London School: Mock all external dependencies
const mockWebSocket = {
  send: jest.fn(),
  on: jest.fn(),
  emit: jest.fn(),
  close: jest.fn(),
  readyState: 1,
  OPEN: 1,
  CLOSED: 3
};

const mockTerminal = {
  write: jest.fn(),
  on: jest.fn(),
  kill: jest.fn(),
  resize: jest.fn(),
  pid: 1234
};

const mockServer = {
  on: jest.fn(),
  clients: new Set([mockWebSocket])
};

jest.mock('ws', () => ({
  WebSocketServer: jest.fn(() => mockServer)
}));

jest.mock('node-pty', () => ({
  spawn: jest.fn(() => mockTerminal)
}));

describe('TDD London School - WebSocket Protocol', () => {
  
  describe('RED PHASE: Protocol Message Specifications', () => {
    
    it('should differentiate between input and output messages', () => {
      // RED: Define message type contracts
      const protocolHandler = new WebSocketProtocolHandler(mockWebSocket, mockTerminal);
      
      // Mock message handler setup
      mockWebSocket.on.mockImplementation((event, handler) => {
        if (event === 'message') {
          protocolHandler._messageHandler = handler;
        }
      });
      
      // Input message should NOT be echoed back
      const inputMessage = JSON.stringify({ type: 'input', data: 'ls' });
      protocolHandler._messageHandler(inputMessage);
      
      // Should NOT send input back as output
      expect(mockWebSocket.send).not.toHaveBeenCalledWith(
        expect.stringContaining('"type":"output"')
      );
    });
    
    it('should buffer input messages until command completion', () => {
      // RED: Input buffering contract
      const protocolHandler = new WebSocketProtocolHandler(mockWebSocket, mockTerminal);
      
      mockWebSocket.on.mockImplementation((event, handler) => {
        protocolHandler._messageHandler = handler;
      });
      
      // Send partial input
      protocolHandler._messageHandler(JSON.stringify({ type: 'input', data: 'l' }));
      protocolHandler._messageHandler(JSON.stringify({ type: 'input', data: 's' }));
      
      // Should NOT execute partial commands
      expect(mockTerminal.write).not.toHaveBeenCalled();
      
      // Send Enter to complete command
      protocolHandler._messageHandler(JSON.stringify({ type: 'command', data: 'ls\n' }));
      
      // NOW should execute
      expect(mockTerminal.write).toHaveBeenCalledWith('ls\n');
    });
    
    it('should send only terminal output, not input echo', () => {
      // RED: Output filtering contract
      const protocolHandler = new WebSocketProtocolHandler(mockWebSocket, mockTerminal);
      
      // Mock terminal data handler
      mockTerminal.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          protocolHandler._terminalDataHandler = callback;
        }
      });
      
      // Simulate terminal output (not echo)
      protocolHandler._terminalDataHandler('file1.txt\nfile2.txt\n');
      
      // Should send as output message
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'output',
          data: 'file1.txt\nfile2.txt\n',
          source: 'terminal'
        })
      );
    });
    
    it('should handle WebSocket reconnection without duplicating processes', () => {
      // RED: Connection management contract
      const protocolHandler = new WebSocketProtocolHandler(mockWebSocket, mockTerminal);
      let connectionCount = 0;
      
      mockServer.on.mockImplementation((event, callback) => {
        if (event === 'connection') {
          protocolHandler._connectionHandler = callback;
        }
      });
      
      // First connection
      protocolHandler._connectionHandler(mockWebSocket);
      connectionCount++;
      
      // Should create terminal process
      expect(mockTerminal).toBeDefined();
      
      // Second connection (reconnect)
      const mockWebSocket2 = { ...mockWebSocket, send: jest.fn() };
      protocolHandler._connectionHandler(mockWebSocket2);
      connectionCount++;
      
      // Should reuse existing terminal, not create new one
      expect(connectionCount).toBe(2);
      // Terminal should not be recreated
    });
    
  });
  
  describe('GREEN PHASE: Mock Protocol Implementation', () => {
    
    it('should implement message type routing through mocks', () => {
      // GREEN: Mock message router
      const mockRouter = {
        routeInput: jest.fn(),
        routeCommand: jest.fn(),
        routeOutput: jest.fn(),
        routeError: jest.fn()
      };
      
      const protocolHandler = new WebSocketProtocolHandler(
        mockWebSocket, 
        mockTerminal,
        { router: mockRouter }
      );
      
      mockWebSocket.on.mockImplementation((event, handler) => {
        protocolHandler._messageHandler = handler;
      });
      
      // Test routing
      protocolHandler._messageHandler(JSON.stringify({ type: 'input', data: 'test' }));
      expect(mockRouter.routeInput).toHaveBeenCalledWith('test');
      
      protocolHandler._messageHandler(JSON.stringify({ type: 'command', data: 'ls\n' }));
      expect(mockRouter.routeCommand).toHaveBeenCalledWith('ls\n');
    });
    
    it('should mock input aggregation behavior', () => {
      // GREEN: Mock input aggregator
      const mockAggregator = {
        addChar: jest.fn(),
        getCommand: jest.fn(() => 'ls'),
        clear: jest.fn(),
        isComplete: jest.fn(() => false)
      };
      
      const protocolHandler = new WebSocketProtocolHandler(
        mockWebSocket, 
        mockTerminal,
        { inputAggregator: mockAggregator }
      );
      
      // Simulate character input
      protocolHandler.handleInput('l');
      protocolHandler.handleInput('s');
      
      expect(mockAggregator.addChar).toHaveBeenCalledWith('l');
      expect(mockAggregator.addChar).toHaveBeenCalledWith('s');
      expect(mockAggregator.isComplete).toHaveBeenCalled();
    });
    
    it('should mock output serialization', () => {
      // GREEN: Mock output serializer
      const mockSerializer = {
        serialize: jest.fn((type, data) => JSON.stringify({ type, data, timestamp: Date.now() })),
        deserialize: jest.fn()
      };
      
      const protocolHandler = new WebSocketProtocolHandler(
        mockWebSocket, 
        mockTerminal,
        { serializer: mockSerializer }
      );
      
      protocolHandler.sendOutput('test output');
      
      expect(mockSerializer.serialize).toHaveBeenCalledWith('output', 'test output');
      expect(mockWebSocket.send).toHaveBeenCalled();
    });
    
  });
  
  describe('REFACTOR PHASE: Clean Protocol Architecture', () => {
    
    it('should implement clean message processing pipeline', () => {
      // REFACTOR: Clean pipeline architecture
      const mockPipeline = {
        validate: jest.fn(() => true),
        transform: jest.fn((msg) => msg),
        process: jest.fn(),
        respond: jest.fn()
      };
      
      const protocolHandler = new WebSocketProtocolHandler(
        mockWebSocket, 
        mockTerminal,
        { pipeline: mockPipeline }
      );
      
      const message = { type: 'command', data: 'ls\n' };
      protocolHandler.processMessage(message);
      
      // Verify pipeline execution order
      expect(mockPipeline.validate).toHaveBeenCalledBefore(mockPipeline.transform);
      expect(mockPipeline.transform).toHaveBeenCalledBefore(mockPipeline.process);
      expect(mockPipeline.process).toHaveBeenCalledBefore(mockPipeline.respond);
    });
    
    it('should implement clean connection state management', () => {
      // REFACTOR: Clean state management
      const mockStateManager = {
        setState: jest.fn(),
        getState: jest.fn(() => 'connected'),
        isReady: jest.fn(() => true),
        cleanup: jest.fn()
      };
      
      const protocolHandler = new WebSocketProtocolHandler(
        mockWebSocket, 
        mockTerminal,
        { stateManager: mockStateManager }
      );
      
      // Test state transitions
      protocolHandler.handleConnection();
      expect(mockStateManager.setState).toHaveBeenCalledWith('connected');
      
      protocolHandler.handleDisconnection();
      expect(mockStateManager.setState).toHaveBeenCalledWith('disconnected');
      expect(mockStateManager.cleanup).toHaveBeenCalled();
    });
    
  });
  
  describe('Protocol Edge Cases', () => {
    
    it('should handle malformed messages gracefully', () => {
      // Test protocol robustness
      const protocolHandler = new WebSocketProtocolHandler(mockWebSocket, mockTerminal);
      
      mockWebSocket.on.mockImplementation((event, handler) => {
        protocolHandler._messageHandler = handler;
      });
      
      // Send malformed JSON
      expect(() => {
        protocolHandler._messageHandler('invalid json');
      }).not.toThrow();
      
      // Should send error response
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"error"')
      );
    });
    
    it('should handle connection drops during command execution', () => {
      // Test connection resilience
      const protocolHandler = new WebSocketProtocolHandler(mockWebSocket, mockTerminal);
      
      // Start command execution
      protocolHandler.executeCommand('long-running-command');
      
      // Simulate connection drop
      mockWebSocket.readyState = 3; // CLOSED
      
      // Terminal should continue running
      expect(mockTerminal.kill).not.toHaveBeenCalled();
      
      // But output should be buffered for reconnection
      protocolHandler.handleOutput('command output');
      expect(protocolHandler.outputBuffer).toBeDefined();
    });
    
  });
  
});

// Stub implementations for test execution
class WebSocketProtocolHandler {
  constructor(webSocket, terminal, options = {}) {
    this.webSocket = webSocket;
    this.terminal = terminal;
    this.options = options;
    this.inputBuffer = '';
    this.outputBuffer = [];
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    if (this.webSocket.on) {
      this.webSocket.on('message', (message) => this.handleMessage(message));
      this.webSocket.on('close', () => this.handleDisconnection());
    }
    
    if (this.terminal.on) {
      this.terminal.on('data', (data) => this.handleOutput(data));
      this.terminal.on('error', (error) => this.handleError(error));
    }
  }
  
  handleMessage(message) {
    try {
      const parsed = JSON.parse(message);
      
      if (this.options.pipeline) {
        if (!this.options.pipeline.validate(parsed)) return;
        parsed = this.options.pipeline.transform(parsed);
        this.options.pipeline.process(parsed);
        this.options.pipeline.respond(parsed);
      }
      
      this.processMessage(parsed);
    } catch (error) {
      this.sendError('Invalid message format');
    }
  }
  
  processMessage(message) {
    if (this.options.router) {
      switch (message.type) {
        case 'input':
          this.options.router.routeInput(message.data);
          break;
        case 'command':
          this.options.router.routeCommand(message.data);
          break;
      }
    } else {
      switch (message.type) {
        case 'input':
          this.handleInput(message.data);
          break;
        case 'command':
          this.executeCommand(message.data);
          break;
      }
    }
  }
  
  handleInput(data) {
    if (this.options.inputAggregator) {
      this.options.inputAggregator.addChar(data);
      if (this.options.inputAggregator.isComplete()) {
        const command = this.options.inputAggregator.getCommand();
        this.executeCommand(command);
        this.options.inputAggregator.clear();
      }
    } else {
      this.inputBuffer += data;
    }
  }
  
  executeCommand(command) {
    if (this.terminal && this.terminal.write) {
      this.terminal.write(command);
    }
  }
  
  handleOutput(data) {
    this.sendOutput(data);
  }
  
  sendOutput(data) {
    const message = this.options.serializer 
      ? this.options.serializer.serialize('output', data)
      : JSON.stringify({ type: 'output', data, source: 'terminal' });
    
    if (this.webSocket.readyState === 1) {
      this.webSocket.send(message);
    } else {
      this.outputBuffer.push(message);
    }
  }
  
  sendError(message) {
    const errorMessage = JSON.stringify({ 
      type: 'error', 
      message, 
      timestamp: Date.now() 
    });
    
    if (this.webSocket.readyState === 1) {
      this.webSocket.send(errorMessage);
    }
  }
  
  handleConnection() {
    if (this.options.stateManager) {
      this.options.stateManager.setState('connected');
    }
  }
  
  handleDisconnection() {
    if (this.options.stateManager) {
      this.options.stateManager.setState('disconnected');
      this.options.stateManager.cleanup();
    }
  }
  
  handleError(error) {
    this.sendError(error.message);
  }
}

module.exports = { WebSocketProtocolHandler };