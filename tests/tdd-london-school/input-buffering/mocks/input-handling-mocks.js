/**
 * TDD London School: Input Handling Mock Factory
 * Professional mock creation utilities for input buffering tests
 * Focus: Mock-driven behavior verification and contract testing
 */

/**
 * Mock WebSocket with input command handling
 */
const createMockWebSocket = (overrides = {}) => {
  return {
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: 1, // WebSocket.OPEN
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
    ...overrides
  };
};

/**
 * Mock Input Element with value tracking and keyboard events
 */
const createMockInputElement = (overrides = {}) => {
  return {
    value: '',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
    select: jest.fn(),
    selectionStart: 0,
    selectionEnd: 0,
    ...overrides
  };
};

/**
 * Mock Keyboard Event with key detection
 */
const createMockKeyboardEvent = (key = 'Enter', overrides = {}) => {
  return {
    key,
    keyCode: getKeyCode(key),
    code: `Key${key.toUpperCase()}`,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    stopImmediatePropagation: jest.fn(),
    target: null,
    currentTarget: null,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    repeat: false,
    ...overrides
  };
};

/**
 * Mock Input Buffer for line accumulation
 */
const createMockInputBuffer = (overrides = {}) => {
  return {
    append: jest.fn(),
    getCurrentLine: jest.fn().mockReturnValue(''),
    clear: jest.fn(),
    hasContent: jest.fn().mockReturnValue(false),
    getHistory: jest.fn().mockReturnValue([]),
    addToHistory: jest.fn(),
    ...overrides
  };
};

/**
 * Mock Command Processor for execution verification
 */
const createMockCommandProcessor = (overrides = {}) => {
  return {
    execute: jest.fn().mockResolvedValue({ success: true }),
    canExecute: jest.fn().mockReturnValue(true),
    formatCommand: jest.fn((cmd) => cmd),
    validateCommand: jest.fn().mockReturnValue(true),
    ...overrides
  };
};

/**
 * Mock Enter Key Detector for specific key handling
 */
const createMockEnterKeyDetector = (overrides = {}) => {
  return {
    isEnterKey: jest.fn((event) => event.keyCode === 13 || event.key === 'Enter'),
    isModifiedEnter: jest.fn((event) => event.shiftKey || event.ctrlKey || event.metaKey),
    shouldPreventDefault: jest.fn().mockReturnValue(true),
    shouldTriggerSend: jest.fn().mockReturnValue(true),
    ...overrides
  };
};

/**
 * Mock Line Completion Handler for full command processing
 */
const createMockLineCompletionHandler = (overrides = {}) => {
  return {
    completeLine: jest.fn().mockResolvedValue(true),
    isLineComplete: jest.fn().mockReturnValue(true),
    processCompletedLine: jest.fn(),
    clearLine: jest.fn(),
    onLineComplete: jest.fn(),
    ...overrides
  };
};

/**
 * Mock Character Filter for preventing character-by-character sending
 */
const createMockCharacterFilter = (overrides = {}) => {
  return {
    shouldBuffer: jest.fn().mockReturnValue(true),
    shouldSend: jest.fn().mockReturnValue(false),
    isCompleteInput: jest.fn().mockReturnValue(false),
    bufferCharacter: jest.fn(),
    getBufferedInput: jest.fn().mockReturnValue(''),
    ...overrides
  };
};

/**
 * Mock WebSocket Message Formatter for command serialization
 */
const createMockMessageFormatter = (overrides = {}) => {
  return {
    formatCommand: jest.fn((command) => JSON.stringify({ 
      type: 'command', 
      data: command, 
      timestamp: Date.now() 
    })),
    formatMessage: jest.fn(),
    serialize: jest.fn(),
    deserialize: jest.fn(),
    ...overrides
  };
};

/**
 * Mock Swarm Coordinator for distributed input handling
 */
const createMockSwarmInputCoordinator = (overrides = {}) => {
  return {
    beforeInput: jest.fn().mockResolvedValue(true),
    afterInput: jest.fn(),
    beforeCommand: jest.fn().mockResolvedValue(true),
    afterCommand: jest.fn(),
    shareInputState: jest.fn(),
    receiveInputState: jest.fn(),
    ...overrides
  };
};

/**
 * Get keyCode for given key name
 */
const getKeyCode = (key) => {
  const keyCodes = {
    'Enter': 13,
    'Escape': 27,
    'Tab': 9,
    'Backspace': 8,
    'Delete': 46,
    'ArrowUp': 38,
    'ArrowDown': 40,
    'ArrowLeft': 37,
    'ArrowRight': 39,
    'Space': 32,
    'a': 65,
    'A': 65,
    'z': 90,
    'Z': 90,
    '0': 48,
    '9': 57
  };
  return keyCodes[key] || key.charCodeAt(0);
};

/**
 * Create Mock Input Handler System - Complete integration mock
 */
const createMockInputHandlerSystem = (overrides = {}) => {
  const mockWebSocket = createMockWebSocket();
  const mockInputElement = createMockInputElement();
  const mockInputBuffer = createMockInputBuffer();
  const mockCommandProcessor = createMockCommandProcessor();
  const mockEnterKeyDetector = createMockEnterKeyDetector();
  const mockLineCompletionHandler = createMockLineCompletionHandler();
  const mockCharacterFilter = createMockCharacterFilter();
  const mockMessageFormatter = createMockMessageFormatter();
  const mockSwarmCoordinator = createMockSwarmInputCoordinator();

  return {
    webSocket: mockWebSocket,
    inputElement: mockInputElement,
    inputBuffer: mockInputBuffer,
    commandProcessor: mockCommandProcessor,
    enterKeyDetector: mockEnterKeyDetector,
    lineCompletionHandler: mockLineCompletionHandler,
    characterFilter: mockCharacterFilter,
    messageFormatter: mockMessageFormatter,
    swarmCoordinator: mockSwarmCoordinator,
    ...overrides
  };
};

/**
 * Mock Verification Helpers
 */
const mockVerification = {
  /**
   * Verify WebSocket.send called exactly once with complete command
   */
  verifyWebSocketSendOnce: (mockWebSocket, expectedCommand) => {
    expect(mockWebSocket.send).toHaveBeenCalledTimes(1);
    expect(mockWebSocket.send).toHaveBeenCalledWith(expectedCommand);
  },

  /**
   * Verify Enter key detection and preventDefault behavior
   */
  verifyEnterKeyHandling: (mockEvent, mockDetector) => {
    expect(mockDetector.isEnterKey).toHaveBeenCalledWith(mockEvent);
    expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
  },

  /**
   * Verify no character-by-character sending
   */
  verifyNoCharacterSending: (mockWebSocket) => {
    const calls = mockWebSocket.send.mock.calls;
    expect(calls.length).toBeLessThanOrEqual(1);
    
    // If there was a call, it should be a complete command, not single characters
    if (calls.length === 1) {
      const sentData = calls[0][0];
      expect(sentData.length).toBeGreaterThan(1); // Not a single character
    }
  },

  /**
   * Verify input buffering until Enter
   */
  verifyInputBuffering: (mockInputBuffer, mockCharacterFilter) => {
    expect(mockCharacterFilter.shouldBuffer).toHaveBeenCalled();
    expect(mockInputBuffer.append).toHaveBeenCalled();
    expect(mockCharacterFilter.shouldSend).not.toHaveBeenCalled();
  },

  /**
   * Verify complete line processing
   */
  verifyLineCompletion: (mockLineCompletionHandler, expectedLine) => {
    expect(mockLineCompletionHandler.isLineComplete).toHaveBeenCalled();
    expect(mockLineCompletionHandler.processCompletedLine).toHaveBeenCalledWith(expectedLine);
  },

  /**
   * Verify command execution flow
   */
  verifyCommandExecution: (mockCommandProcessor, expectedCommand) => {
    expect(mockCommandProcessor.canExecute).toHaveBeenCalledWith(expectedCommand);
    expect(mockCommandProcessor.execute).toHaveBeenCalledWith(expectedCommand);
  },

  /**
   * Verify interaction order (London School approach)
   */
  verifyInteractionOrder: (mockA, mockB, methodA, methodB) => {
    const orderChecker = jest.fn();
    
    mockA[methodA].mockImplementation((...args) => {
      orderChecker('A');
      return jest.fn().getMockImplementation()(mockA[methodA])(...args);
    });
    
    mockB[methodB].mockImplementation((...args) => {
      orderChecker('B');
      return jest.fn().getMockImplementation()(mockB[methodB])(...args);
    });
    
    return orderChecker;
  }
};

/**
 * Contract Verification for London School TDD
 */
const contractVerification = {
  /**
   * Verify InputHandler contract compliance
   */
  verifyInputHandlerContract: (mockInputHandler) => {
    expect(mockInputHandler).toHaveProperty('handleKeyDown');
    expect(mockInputHandler).toHaveProperty('handleInput');
    expect(mockInputHandler).toHaveProperty('sendCommand');
    expect(mockInputHandler).toHaveProperty('clearInput');
  },

  /**
   * Verify WebSocket contract compliance
   */
  verifyWebSocketContract: (mockWebSocket) => {
    expect(mockWebSocket).toHaveProperty('send');
    expect(mockWebSocket).toHaveProperty('readyState');
    expect(mockWebSocket.readyState).toBe(1); // OPEN state
  },

  /**
   * Verify Enter Key Detector contract
   */
  verifyEnterKeyDetectorContract: (mockDetector) => {
    expect(mockDetector).toHaveProperty('isEnterKey');
    expect(mockDetector).toHaveProperty('shouldPreventDefault');
    expect(mockDetector).toHaveProperty('shouldTriggerSend');
  }
};

module.exports = {
  createMockWebSocket,
  createMockInputElement,
  createMockKeyboardEvent,
  createMockInputBuffer,
  createMockCommandProcessor,
  createMockEnterKeyDetector,
  createMockLineCompletionHandler,
  createMockCharacterFilter,
  createMockMessageFormatter,
  createMockSwarmInputCoordinator,
  createMockInputHandlerSystem,
  mockVerification,
  contractVerification,
  getKeyCode
};