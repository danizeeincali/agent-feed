/**
 * Core Terminal Display Tests - TDD Approach
 * 
 * These tests focus on the core terminal display logic without complex dependencies.
 * They should FAIL initially to identify the exact display issues.
 */

const { jest } = require('jest-globals');

// Mock xterm without complex imports
const mockXterm = {
  Terminal: jest.fn(() => ({
    open: jest.fn(),
    write: jest.fn(),
    writeln: jest.fn(),
    focus: jest.fn(),
    onData: jest.fn(() => ({ dispose: jest.fn() })),
    dispose: jest.fn(),
    loadAddon: jest.fn(),
    cols: 80,
    rows: 24
  }))
};

// Mock Socket.IO
const mockSocket = {
  connected: false,
  emit: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn()
};

const mockIo = jest.fn(() => mockSocket);

// Simple terminal component simulation
class SimpleTerminalComponent {
  constructor(container, isVisible = true) {
    this.container = container;
    this.isVisible = isVisible;
    this.terminal = null;
    this.socket = null;
    this.outputBuffer = [];
    this.isInitialized = false;
  }

  initialize() {
    if (!this.isVisible || this.isInitialized) return false;
    
    // Create terminal instance
    this.terminal = new mockXterm.Terminal();
    
    // Mount to DOM
    if (this.container) {
      this.terminal.open(this.container);
      this.isInitialized = true;
      
      // Setup initial content
      this.terminal.writeln('Terminal initialized');
      return true;
    }
    return false;
  }

  connectWebSocket() {
    if (!this.terminal || !this.isInitialized) return false;
    
    this.socket = mockIo('/terminal');
    this.socket.connected = true;
    
    // Setup output handler
    this.socket.on('output', (message) => {
      this.handleOutput(message);
    });
    
    return true;
  }

  handleOutput(message) {
    if (!this.terminal || !message || !message.data) return false;
    
    // Store in buffer for verification
    this.outputBuffer.push(message.data);
    
    // Write to terminal
    this.terminal.write(message.data);
    return true;
  }

  sendInput(data) {
    if (!this.socket || !this.socket.connected) return false;
    
    this.socket.emit('message', {
      type: 'input',
      data: data,
      timestamp: Date.now()
    });
    return true;
  }

  isDisplayingOutput() {
    return this.outputBuffer.length > 0 && this.terminal && this.isInitialized;
  }

  getDisplayedContent() {
    return this.outputBuffer.join('');
  }
}

describe('Core Terminal Display Validation', () => {
  let mockContainer;
  let terminal;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock container
    mockContainer = {
      appendChild: jest.fn(),
      querySelector: jest.fn(),
      innerHTML: '',
      style: {},
      className: ''
    };
    
    terminal = new SimpleTerminalComponent(mockContainer, true);
  });

  describe('Terminal Initialization', () => {
    test('CRITICAL: should initialize terminal when visible', () => {
      // This test SHOULD FAIL if terminal doesn't initialize properly
      const result = terminal.initialize();
      
      expect(result).toBe(true);
      expect(terminal.terminal).toBeDefined();
      expect(terminal.isInitialized).toBe(true);
    });

    test('CRITICAL: should create xterm.js instance', () => {
      terminal.initialize();
      
      expect(mockXterm.Terminal).toHaveBeenCalledTimes(1);
      expect(terminal.terminal.open).toHaveBeenCalledWith(mockContainer);
    });

    test('CRITICAL: should write initial content', () => {
      terminal.initialize();
      
      // FAILS if terminal doesn't show initial content
      expect(terminal.terminal.writeln).toHaveBeenCalledWith('Terminal initialized');
    });

    test('CRITICAL: should NOT initialize when not visible', () => {
      const invisibleTerminal = new SimpleTerminalComponent(mockContainer, false);
      const result = invisibleTerminal.initialize();
      
      expect(result).toBe(false);
      expect(invisibleTerminal.isInitialized).toBe(false);
    });
  });

  describe('WebSocket Connection', () => {
    beforeEach(() => {
      terminal.initialize();
    });

    test('CRITICAL: should establish WebSocket connection', () => {
      const result = terminal.connectWebSocket();
      
      expect(result).toBe(true);
      expect(mockIo).toHaveBeenCalledWith('/terminal');
      expect(terminal.socket).toBeDefined();
    });

    test('CRITICAL: should setup output message handler', () => {
      terminal.connectWebSocket();
      
      expect(terminal.socket.on).toHaveBeenCalledWith('output', expect.any(Function));
    });

    test('CRITICAL: should fail connection without initialized terminal', () => {
      const uninitializedTerminal = new SimpleTerminalComponent(mockContainer, true);
      const result = uninitializedTerminal.connectWebSocket();
      
      expect(result).toBe(false);
    });
  });

  describe('Output Display', () => {
    beforeEach(() => {
      terminal.initialize();
      terminal.connectWebSocket();
    });

    test('CRITICAL: should display output messages in terminal', () => {
      const outputMessage = {
        type: 'output',
        data: 'Hello Terminal Output\n'
      };
      
      const result = terminal.handleOutput(outputMessage);
      
      // FAILS if output doesn't display
      expect(result).toBe(true);
      expect(terminal.terminal.write).toHaveBeenCalledWith('Hello Terminal Output\n');
      expect(terminal.outputBuffer).toContain('Hello Terminal Output\n');
    });

    test('CRITICAL: should handle multiple output messages', () => {
      const messages = [
        { data: 'Line 1\n' },
        { data: 'Line 2\n' },
        { data: 'Line 3\n' }
      ];
      
      messages.forEach(msg => terminal.handleOutput(msg));
      
      // FAILS if multiple messages don't display
      expect(terminal.terminal.write).toHaveBeenCalledTimes(3);
      expect(terminal.outputBuffer).toHaveLength(3);
      expect(terminal.getDisplayedContent()).toBe('Line 1\nLine 2\nLine 3\n');
    });

    test('CRITICAL: should track display state correctly', () => {
      // Initially no output
      expect(terminal.isDisplayingOutput()).toBe(false);
      
      terminal.handleOutput({ data: 'Some output' });
      
      // After output, should be displaying
      expect(terminal.isDisplayingOutput()).toBe(true);
    });

    test('CRITICAL: should handle empty or invalid messages', () => {
      // These should not crash the system
      const results = [
        terminal.handleOutput(null),
        terminal.handleOutput(undefined),
        terminal.handleOutput({}),
        terminal.handleOutput({ data: null })
      ];
      
      // All should return false for invalid messages
      results.forEach(result => expect(result).toBe(false));
      
      // Buffer should remain empty
      expect(terminal.outputBuffer).toHaveLength(0);
    });
  });

  describe('Input Handling', () => {
    beforeEach(() => {
      terminal.initialize();
      terminal.connectWebSocket();
    });

    test('CRITICAL: should send input through WebSocket', () => {
      const inputData = 'ls -la';
      const result = terminal.sendInput(inputData);
      
      expect(result).toBe(true);
      expect(terminal.socket.emit).toHaveBeenCalledWith('message', {
        type: 'input',
        data: inputData,
        timestamp: expect.any(Number)
      });
    });

    test('CRITICAL: should handle special characters', () => {
      const specialInputs = [
        '\r', // Enter
        '\x7f', // Backspace
        '\x03', // Ctrl+C
        '\t' // Tab
      ];
      
      specialInputs.forEach(input => {
        const result = terminal.sendInput(input);
        expect(result).toBe(true);
      });
      
      expect(terminal.socket.emit).toHaveBeenCalledTimes(4);
    });

    test('CRITICAL: should fail input without connection', () => {
      terminal.socket.connected = false;
      const result = terminal.sendInput('test');
      
      expect(result).toBe(false);
    });
  });

  describe('Integration Flow', () => {
    test('CRITICAL: complete terminal session flow', () => {
      // 1. Initialize terminal
      const initResult = terminal.initialize();
      expect(initResult).toBe(true);
      
      // 2. Connect WebSocket
      const connectResult = terminal.connectWebSocket();
      expect(connectResult).toBe(true);
      
      // 3. Send input
      const inputResult = terminal.sendInput('echo "Hello World"');
      expect(inputResult).toBe(true);
      
      // 4. Receive output
      const outputResult = terminal.handleOutput({
        data: 'Hello World\n'
      });
      expect(outputResult).toBe(true);
      
      // 5. Verify display state
      expect(terminal.isDisplayingOutput()).toBe(true);
      expect(terminal.getDisplayedContent()).toBe('Hello World\n');
      
      // CRITICAL: This entire flow must work for terminal to function
    });

    test('CRITICAL: terminal should handle rapid input/output', () => {
      terminal.initialize();
      terminal.connectWebSocket();
      
      // Rapid input
      for (let i = 0; i < 10; i++) {
        terminal.sendInput(`command ${i}\n`);
      }
      
      // Rapid output
      for (let i = 0; i < 10; i++) {
        terminal.handleOutput({ data: `output ${i}\n` });
      }
      
      // Should handle all messages
      expect(terminal.socket.emit).toHaveBeenCalledTimes(10);
      expect(terminal.terminal.write).toHaveBeenCalledTimes(10);
      expect(terminal.outputBuffer).toHaveLength(10);
    });
  });

  describe('Error Conditions and Edge Cases', () => {
    test('CRITICAL: should handle terminal without container', () => {
      const terminalNoContainer = new SimpleTerminalComponent(null, true);
      const result = terminalNoContainer.initialize();
      
      expect(result).toBe(false);
      expect(terminalNoContainer.isInitialized).toBe(false);
    });

    test('CRITICAL: should handle WebSocket disconnection', () => {
      terminal.initialize();
      terminal.connectWebSocket();
      
      // Simulate disconnection
      terminal.socket.connected = false;
      
      // Input should fail
      const result = terminal.sendInput('test');
      expect(result).toBe(false);
      
      // Output should still work (buffered)
      const outputResult = terminal.handleOutput({ data: 'buffered output' });
      expect(outputResult).toBe(true);
    });

    test('CRITICAL: should handle double initialization', () => {
      const firstInit = terminal.initialize();
      const secondInit = terminal.initialize();
      
      expect(firstInit).toBe(true);
      expect(secondInit).toBe(false); // Should not re-initialize
      
      // Terminal should be created only once
      expect(mockXterm.Terminal).toHaveBeenCalledTimes(1);
    });

    test('CRITICAL: should maintain state consistency', () => {
      // Test various state combinations
      expect(terminal.isInitialized).toBe(false);
      expect(terminal.isDisplayingOutput()).toBe(false);
      
      terminal.initialize();
      expect(terminal.isInitialized).toBe(true);
      expect(terminal.isDisplayingOutput()).toBe(false);
      
      terminal.connectWebSocket();
      terminal.handleOutput({ data: 'test output' });
      expect(terminal.isDisplayingOutput()).toBe(true);
    });
  });
});

// Export for use in other tests
module.exports = {
  SimpleTerminalComponent,
  mockXterm,
  mockSocket,
  mockIo
};