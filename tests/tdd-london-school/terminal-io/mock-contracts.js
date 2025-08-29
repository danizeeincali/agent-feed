/**
 * TDD London School - Terminal I/O Mock Contracts
 * 
 * Define all mock contracts and interfaces for terminal I/O components
 * London School emphasizes designing through mock interactions
 */

// Jest is globally available

/**
 * PTY Mock Contract
 * Defines how PTY should behave in our terminal system
 */
const createPtyMock = () => ({
  // Process control
  spawn: jest.fn(),
  write: jest.fn(),
  kill: jest.fn(),
  resize: jest.fn(),
  
  // Event handling
  on: jest.fn(),
  off: jest.fn(),
  
  // Process info
  pid: jest.fn(() => Math.floor(Math.random() * 10000)),
  
  // Configuration expectations
  expectSpawnWith: (shell, args, options) => {
    expect(require('node-pty').spawn).toHaveBeenCalledWith(shell, args, expect.objectContaining({
      echo: false, // CRITICAL: No echo
      ...options
    }));
  }
});

/**
 * WebSocket Mock Contract
 * Defines WebSocket communication patterns
 */
const createWebSocketMock = () => ({
  // Connection management
  send: jest.fn(),
  close: jest.fn(),
  
  // Event handling
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  
  // State
  readyState: 1, // OPEN
  OPEN: 1,
  CLOSED: 3,
  
  // Protocol expectations
  expectInputNotEchoed: (inputData) => {
    expect(this.send).not.toHaveBeenCalledWith(
      expect.stringContaining(`"type":"output","data":"${inputData}"`)
    );
  },
  
  expectOutputMessage: (outputData) => {
    expect(this.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'output',
        data: outputData,
        source: 'terminal'
      })
    );
  }
});

/**
 * Input Buffer Mock Contract
 * Defines input buffering behavior
 */
const createInputBufferMock = () => ({
  // Buffer operations
  add: jest.fn(),
  flush: jest.fn(() => 'mocked-command'),
  clear: jest.fn(),
  
  // State queries
  isEmpty: jest.fn(() => false),
  getBuffer: jest.fn(() => ''),
  
  // Contract expectations
  expectCharacterBuffering: (chars) => {
    chars.forEach(char => {
      expect(this.add).toHaveBeenCalledWith(char);
    });
  },
  
  expectFlushOnEnter: () => {
    expect(this.flush).toHaveBeenCalled();
  }
});

/**
 * Command Executor Mock Contract
 * Defines command execution behavior
 */
const createCommandExecutorMock = () => ({
  // Execution methods
  execute: jest.fn(),
  queue: jest.fn(),
  cancel: jest.fn(),
  
  // State management
  isReady: jest.fn(() => true),
  isBusy: jest.fn(() => false),
  
  // Event handling
  on: jest.fn(),
  
  // Contract expectations
  expectExecutionOrder: (commands) => {
    commands.forEach((cmd, index) => {
      expect(this.execute).toHaveBeenNthCalledWith(index + 1, cmd);
    });
  },
  
  expectNoExecutionWithoutEnter: (partialCommand) => {
    expect(this.execute).not.toHaveBeenCalledWith(partialCommand);
  }
});

/**
 * Output Filter Mock Contract
 * Defines output filtering behavior
 */
const createOutputFilterMock = () => ({
  // Filtering methods
  isEcho: jest.fn(() => false),
  isCommandOutput: jest.fn(() => true),
  filter: jest.fn((data) => data),
  
  // Contract expectations
  expectEchoFiltering: (echoData) => {
    expect(this.isEcho).toHaveBeenCalledWith(echoData);
    expect(this.isEcho).toHaveReturnedWith(true);
  },
  
  expectOutputPassing: (outputData) => {
    expect(this.isCommandOutput).toHaveBeenCalledWith(outputData);
    expect(this.isCommandOutput).toHaveReturnedWith(true);
  }
});

/**
 * Terminal Manager Mock Contract
 * Main orchestrator contract
 */
const createTerminalManagerMock = () => ({
  // Main methods
  handleInput: jest.fn(),
  executeCommand: jest.fn(),
  sendOutput: jest.fn(),
  
  // Lifecycle
  start: jest.fn(),
  stop: jest.fn(),
  restart: jest.fn(),
  
  // State
  isReady: jest.fn(() => true),
  getState: jest.fn(() => 'ready'),
  
  // Contract expectations
  expectInputBuffering: (input) => {
    expect(this.handleInput).toHaveBeenCalledWith(input);
    // Should not immediately execute
    expect(this.executeCommand).not.toHaveBeenCalled();
  },
  
  expectCommandExecution: (command) => {
    expect(this.executeCommand).toHaveBeenCalledWith(command);
  }
});

/**
 * WebSocket Protocol Handler Mock Contract
 * Protocol-specific behavior
 */
const createProtocolHandlerMock = () => ({
  // Message handling
  handleMessage: jest.fn(),
  sendMessage: jest.fn(),
  
  // Protocol methods
  processInput: jest.fn(),
  processCommand: jest.fn(),
  processOutput: jest.fn(),
  
  // Connection management
  handleConnection: jest.fn(),
  handleDisconnection: jest.fn(),
  
  // Contract expectations
  expectMessageTypeRouting: (messageType, handler) => {
    expect(this[`process${messageType.charAt(0).toUpperCase() + messageType.slice(1)}`])
      .toHaveBeenCalled();
  }
});

/**
 * Mock Factory
 * Creates configured mock instances
 */
const createMockFactory = () => ({
  createPty: createPtyMock,
  createWebSocket: createWebSocketMock,
  createInputBuffer: createInputBufferMock,
  createCommandExecutor: createCommandExecutorMock,
  createOutputFilter: createOutputFilterMock,
  createTerminalManager: createTerminalManagerMock,
  createProtocolHandler: createProtocolHandlerMock,
  
  // Create full mock suite
  createFullSuite: () => ({
    pty: createPtyMock(),
    webSocket: createWebSocketMock(),
    inputBuffer: createInputBufferMock(),
    commandExecutor: createCommandExecutorMock(),
    outputFilter: createOutputFilterMock(),
    terminalManager: createTerminalManagerMock(),
    protocolHandler: createProtocolHandlerMock()
  })
});

/**
 * Contract Verification Helpers
 * Verify mock interactions follow expected patterns
 */
const contractVerifier = {
  
  /**
   * Verify no character echo in WebSocket output
   */
  verifyNoEcho: (webSocketMock, inputChars) => {
    inputChars.forEach(char => {
      expect(webSocketMock.send).not.toHaveBeenCalledWith(
        expect.stringContaining(`"data":"${char}"`)
      );
    });
  },
  
  /**
   * Verify input buffering behavior
   */
  verifyInputBuffering: (inputBufferMock, chars, expectedCommand) => {
    // Characters should be buffered
    chars.forEach(char => {
      expect(inputBufferMock.add).toHaveBeenCalledWith(char);
    });
    
    // Command should be flushed
    expect(inputBufferMock.flush).toHaveBeenCalled();
    expect(inputBufferMock.flush).toHaveReturnedWith(expectedCommand);
  },
  
  /**
   * Verify command execution flow
   */
  verifyCommandExecution: (executorMock, ptyMock, command) => {
    expect(executorMock.execute).toHaveBeenCalledWith(command);
    expect(ptyMock.write).toHaveBeenCalledWith(command);
  },
  
  /**
   * Verify output filtering
   */
  verifyOutputFiltering: (filterMock, webSocketMock, echoData, realOutput) => {
    // Echo should be filtered out
    expect(filterMock.isEcho).toHaveBeenCalledWith(echoData);
    expect(webSocketMock.send).not.toHaveBeenCalledWith(
      expect.stringContaining(echoData)
    );
    
    // Real output should pass through
    expect(filterMock.isCommandOutput).toHaveBeenCalledWith(realOutput);
    expect(webSocketMock.send).toHaveBeenCalledWith(
      expect.stringContaining(realOutput)
    );
  },
  
  /**
   * Verify complete interaction flow
   */
  verifyCompleteFlow: (mocks, scenario) => {
    const { input, expectedCommand, expectedOutput } = scenario;
    
    // Input buffering
    this.verifyInputBuffering(mocks.inputBuffer, input.chars, expectedCommand);
    
    // Command execution
    this.verifyCommandExecution(mocks.commandExecutor, mocks.pty, expectedCommand);
    
    // No echo
    this.verifyNoEcho(mocks.webSocket, input.chars);
    
    // Output delivery
    expect(mocks.webSocket.send).toHaveBeenCalledWith(
      expect.stringContaining(expectedOutput)
    );
  }
};

/**
 * Mock Behavior Builders
 * Configure mock behavior for specific test scenarios
 */
const behaviorBuilder = {
  
  /**
   * Configure echo-free terminal behavior
   */
  configureEchoFreeBehavior: (mocks) => {
    // PTY spawns with echo=false
    mocks.pty.spawn.mockReturnValue({
      ...mocks.pty,
      on: jest.fn(),
      write: jest.fn()
    });
    
    // Input buffer accumulates characters
    let buffer = '';
    mocks.inputBuffer.add.mockImplementation((char) => {
      buffer += char;
    });
    mocks.inputBuffer.flush.mockImplementation(() => {
      const cmd = buffer;
      buffer = '';
      return cmd;
    });
    
    // WebSocket doesn't echo input
    mocks.webSocket.send.mockImplementation((message) => {
      const parsed = JSON.parse(message);
      if (parsed.type === 'output') {
        // Only allow real terminal output
        return;
      }
    });
  },
  
  /**
   * Configure command execution behavior
   */
  configureCommandExecution: (mocks) => {
    mocks.commandExecutor.execute.mockImplementation((command) => {
      if (command.includes('\n')) {
        mocks.pty.write(command);
        return true;
      }
      return false;
    });
  }
};

module.exports = {
  createPtyMock,
  createWebSocketMock,
  createInputBufferMock,
  createCommandExecutorMock,
  createOutputFilterMock,
  createTerminalManagerMock,
  createProtocolHandlerMock,
  createMockFactory,
  contractVerifier,
  behaviorBuilder
};