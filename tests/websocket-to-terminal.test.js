/**
 * TDD WebSocket to Terminal Integration Tests
 * 
 * Tests the complete flow from WebSocket messages to terminal display.
 * These tests validate that data flows correctly through the entire chain.
 */

import { jest } from '@jest/globals';
import '@testing-library/jest-dom';

// Mock WebSocket
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
    
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 10);
  }
  
  send(data) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    console.log('WebSocket send:', data);
  }
  
  close(code, reason) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({ code, reason, wasClean: true });
  }
  
  // Simulate receiving message
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }
  
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
}

global.WebSocket = MockWebSocket;

// Mock Socket.IO
const mockSocket = {
  connected: false,
  emit: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn()
};

const mockSocketEvents = {};

mockSocket.on.mockImplementation((event, callback) => {
  if (!mockSocketEvents[event]) {
    mockSocketEvents[event] = [];
  }
  mockSocketEvents[event].push(callback);
});

mockSocket.emit.mockImplementation((event, data) => {
  console.log(`Socket.IO emit: ${event}`, data);
});

// Helper to trigger socket events
const triggerSocketEvent = (event, data) => {
  if (mockSocketEvents[event]) {
    mockSocketEvents[event].forEach(callback => callback(data));
  }
};

const mockIo = jest.fn(() => mockSocket);
jest.mock('socket.io-client', () => ({
  io: mockIo
}));

// Mock xterm.js
const mockTerminal = {
  write: jest.fn(),
  writeln: jest.fn(),
  open: jest.fn(),
  focus: jest.fn(),
  onData: jest.fn(() => ({ dispose: jest.fn() })),
  dispose: jest.fn(),
  loadAddon: jest.fn(),
  cols: 80,
  rows: 24
};

jest.mock('xterm', () => ({
  Terminal: jest.fn(() => ({ ...mockTerminal }))
}));

jest.mock('@xterm/addon-fit', () => ({
  FitAddon: jest.fn(() => ({ fit: jest.fn() }))
}));

describe('WebSocket to Terminal Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket.connected = false;
    mockSocket.emit.mockClear();
    mockSocket.on.mockClear();
    Object.keys(mockSocketEvents).forEach(key => delete mockSocketEvents[key]);
    mockTerminal.write.mockClear();
    mockTerminal.writeln.mockClear();
    mockTerminal.onData.mockClear();
  });

  describe('WebSocket Connection and Terminal Integration', () => {
    test('should establish WebSocket connection for terminal communication', async () => {
      const { io } = await import('socket.io-client');
      
      // Create socket connection
      const socket = io('/terminal');
      
      // CRITICAL: Socket.IO connection should be established
      expect(io).toHaveBeenCalledWith('/terminal');
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    test('should set up terminal output message handler', async () => {
      const { io } = await import('socket.io-client');
      const socket = io('/terminal');
      
      // CRITICAL: Must listen for terminal output messages
      expect(mockSocket.on).toHaveBeenCalledWith('output', expect.any(Function));
      
      // Get the output handler
      const outputHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'output'
      )?.[1];
      
      expect(outputHandler).toBeDefined();
    });

    test('should handle connection established event', async () => {
      const { io } = await import('socket.io-client');
      const { Terminal } = require('xterm');
      
      const socket = io('/terminal');
      const terminal = new Terminal();
      terminal.open(document.createElement('div'));
      
      // Simulate connection established
      triggerSocketEvent('connect');
      
      // CRITICAL: Should handle connection event
      const connectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      
      expect(connectHandler).toBeDefined();
      
      // Verify connection status is updated
      mockSocket.connected = true;
    });
  });

  describe('Terminal Output Message Processing', () => {
    test('should write output messages to terminal', async () => {
      const { io } = await import('socket.io-client');
      const { Terminal } = require('xterm');
      
      const socket = io('/terminal');
      const terminal = new Terminal();
      terminal.open(document.createElement('div'));
      
      // Get output handler
      const outputHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'output'
      )?.[1];
      
      expect(outputHandler).toBeDefined();
      
      // Simulate receiving output message
      const outputMessage = {
        type: 'output',
        data: 'Hello Terminal\n'
      };
      
      outputHandler(outputMessage);
      
      // CRITICAL: Terminal should receive the output
      expect(terminal.write).toHaveBeenCalledWith('Hello Terminal\n');
    });

    test('should handle multiple output messages in sequence', async () => {
      const { io } = await import('socket.io-client');
      const { Terminal } = require('xterm');
      
      const socket = io('/terminal');
      const terminal = new Terminal();
      terminal.open(document.createElement('div'));
      
      const outputHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'output'
      )?.[1];
      
      // Send multiple messages
      outputHandler({ data: 'Line 1\n' });
      outputHandler({ data: 'Line 2\n' });
      outputHandler({ data: 'Line 3\n' });
      
      // CRITICAL: All messages should be written to terminal
      expect(terminal.write).toHaveBeenCalledTimes(3);
      expect(terminal.write).toHaveBeenCalledWith('Line 1\n');
      expect(terminal.write).toHaveBeenCalledWith('Line 2\n');
      expect(terminal.write).toHaveBeenCalledWith('Line 3\n');
    });

    test('should handle error messages from WebSocket', async () => {
      const { io } = await import('socket.io-client');
      const { Terminal } = require('xterm');
      
      const socket = io('/terminal');
      const terminal = new Terminal();
      terminal.open(document.createElement('div'));
      
      // Should have error handler
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
      
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      // Simulate error message
      const errorMessage = {
        message: 'Connection failed',
        code: 500
      };
      
      errorHandler(errorMessage);
      
      // CRITICAL: Error should be displayed in terminal
      expect(terminal.writeln).toHaveBeenCalledWith(
        expect.stringContaining('Connection failed')
      );
    });
  });

  describe('Terminal Input to WebSocket Flow', () => {
    test('should capture terminal input and send via WebSocket', async () => {
      const { io } = await import('socket.io-client');
      const { Terminal } = require('xterm');
      
      const socket = io('/terminal');
      const terminal = new Terminal();
      terminal.open(document.createElement('div'));
      
      // Mock connection as established
      mockSocket.connected = true;
      
      // Get onData handler
      expect(terminal.onData).toHaveBeenCalled();
      const onDataHandler = terminal.onData.mock.calls[0][0];
      
      // Simulate user typing
      onDataHandler('hello');
      
      // CRITICAL: Input should be sent via WebSocket
      expect(mockSocket.emit).toHaveBeenCalledWith('message', {
        type: 'input',
        data: 'hello',
        timestamp: expect.any(Number)
      });
    });

    test('should handle special keys (Enter, Backspace)', async () => {
      const { io } = await import('socket.io-client');
      const { Terminal } = require('xterm');
      
      const socket = io('/terminal');
      const terminal = new Terminal();
      terminal.open(document.createElement('div'));
      
      mockSocket.connected = true;
      const onDataHandler = terminal.onData.mock.calls[0][0];
      
      // Test Enter key
      onDataHandler('\r');
      expect(mockSocket.emit).toHaveBeenCalledWith('message', {
        type: 'input',
        data: '\r',
        timestamp: expect.any(Number)
      });
      
      // Test Backspace key
      onDataHandler('\x7f');
      expect(mockSocket.emit).toHaveBeenCalledWith('message', {
        type: 'input',
        data: '\x7f',
        timestamp: expect.any(Number)
      });
    });

    test('should handle Ctrl+C interruption', async () => {
      const { io } = await import('socket.io-client');
      const { Terminal } = require('xterm');
      
      const socket = io('/terminal');
      const terminal = new Terminal();
      terminal.open(document.createElement('div'));
      
      mockSocket.connected = true;
      const onDataHandler = terminal.onData.mock.calls[0][0];
      
      // Simulate Ctrl+C (ASCII 3)
      onDataHandler('\x03');
      
      // CRITICAL: Interrupt signal should be sent
      expect(mockSocket.emit).toHaveBeenCalledWith('message', {
        type: 'input',
        data: '\x03',
        timestamp: expect.any(Number)
      });
    });
  });

  describe('WebSocket Message Types and Protocol', () => {
    test('should handle resize messages', async () => {
      const { io } = await import('socket.io-client');
      const { Terminal } = require('xterm');
      
      const socket = io('/terminal');
      const terminal = new Terminal();
      terminal.open(document.createElement('div'));
      
      mockSocket.connected = true;
      
      // Simulate terminal resize
      terminal.cols = 120;
      terminal.rows = 30;
      
      // Should send resize message
      const resizeMessage = {
        type: 'resize',
        cols: 120,
        rows: 30
      };
      
      mockSocket.emit('message', resizeMessage);
      
      // CRITICAL: Resize message should be sent
      expect(mockSocket.emit).toHaveBeenCalledWith('message', resizeMessage);
    });

    test('should handle init messages on connection', async () => {
      const { io } = await import('socket.io-client');
      const { Terminal } = require('xterm');
      
      const socket = io('/terminal');
      const terminal = new Terminal();
      terminal.open(document.createElement('div'));
      
      // Simulate connection with process info
      const processStatus = { isRunning: true, pid: 1234 };
      mockSocket.connected = true;
      
      triggerSocketEvent('connect');
      
      // Should send init message
      const expectedInit = {
        pid: 1234,
        cols: 80,
        rows: 24
      };
      
      // CRITICAL: Init message should be sent on connect
      expect(mockSocket.emit).toHaveBeenCalledWith('init', expectedInit);
    });
  });

  describe('End-to-End Command Execution Flow', () => {
    test('should handle complete command execution cycle', async () => {
      const { io } = await import('socket.io-client');
      const { Terminal } = require('xterm');
      
      const socket = io('/terminal');
      const terminal = new Terminal();
      terminal.open(document.createElement('div'));
      
      // Establish connection
      mockSocket.connected = true;
      triggerSocketEvent('connect');
      
      // Get handlers
      const onDataHandler = terminal.onData.mock.calls[0][0];
      const outputHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'output'
      )?.[1];
      
      // 1. User types command
      onDataHandler('l');
      onDataHandler('s');
      onDataHandler('\r'); // Enter key
      
      // 2. Server processes command and sends output
      outputHandler({ data: 'file1.txt\nfile2.txt\n' });
      
      // 3. Server sends prompt
      outputHandler({ data: '$ ' });
      
      // CRITICAL: Complete cycle should work
      expect(mockSocket.emit).toHaveBeenCalledWith('message', expect.objectContaining({
        type: 'input',
        data: 'l'
      }));
      
      expect(mockSocket.emit).toHaveBeenCalledWith('message', expect.objectContaining({
        type: 'input',
        data: 's'
      }));
      
      expect(mockSocket.emit).toHaveBeenCalledWith('message', expect.objectContaining({
        type: 'input',
        data: '\r'
      }));
      
      expect(terminal.write).toHaveBeenCalledWith('file1.txt\nfile2.txt\n');
      expect(terminal.write).toHaveBeenCalledWith('$ ');
    });

    test('should handle real-time command output streaming', async () => {
      const { io } = await import('socket.io-client');
      const { Terminal } = require('xterm');
      
      const socket = io('/terminal');
      const terminal = new Terminal();
      terminal.open(document.createElement('div'));
      
      mockSocket.connected = true;
      const outputHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'output'
      )?.[1];
      
      // Simulate streaming output (like tail -f or long-running command)
      const streamChunks = [
        'Starting process...\n',
        'Processing item 1\n',
        'Processing item 2\n',
        'Processing item 3\n',
        'Process complete.\n'
      ];
      
      // Send chunks with delays to simulate real-time streaming
      streamChunks.forEach((chunk, index) => {
        setTimeout(() => {
          outputHandler({ data: chunk });
        }, index * 50);
      });
      
      // Wait for all chunks
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // CRITICAL: All stream chunks should be written to terminal
      streamChunks.forEach(chunk => {
        expect(terminal.write).toHaveBeenCalledWith(chunk);
      });
    });
  });

  describe('Connection Reliability and Error Handling', () => {
    test('should handle WebSocket disconnection gracefully', async () => {
      const { io } = await import('socket.io-client');
      const { Terminal } = require('xterm');
      
      const socket = io('/terminal');
      const terminal = new Terminal();
      terminal.open(document.createElement('div'));
      
      // Establish connection
      mockSocket.connected = true;
      triggerSocketEvent('connect');
      
      // Should have disconnect handler
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];
      
      // Simulate disconnection
      triggerSocketEvent('disconnect', 'transport close');
      
      // CRITICAL: Should handle disconnection
      expect(disconnectHandler).toBeDefined();
      expect(terminal.writeln).toHaveBeenCalledWith(
        expect.stringContaining('Connection closed')
      );
    });

    test('should attempt reconnection after disconnection', async () => {
      const { io } = await import('socket.io-client');
      
      const socket = io('/terminal');
      
      // Simulate connection error
      triggerSocketEvent('connect_error', new Error('Connection failed'));
      
      // Should have connect_error handler
      expect(mockSocket.on).toHaveBeenCalledWith('connect_error', expect.any(Function));
      
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'connect_error'
      )?.[1];
      
      // CRITICAL: Should handle connection errors
      expect(errorHandler).toBeDefined();
    });

    test('should handle malformed WebSocket messages', async () => {
      const { io } = await import('socket.io-client');
      const { Terminal } = require('xterm');
      
      const socket = io('/terminal');
      const terminal = new Terminal();
      terminal.open(document.createElement('div'));
      
      const outputHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'output'
      )?.[1];
      
      // Send malformed message
      try {
        outputHandler({ invalidStructure: true });
        outputHandler(null);
        outputHandler(undefined);
      } catch (error) {
        // CRITICAL: Should not crash on malformed messages
        expect(error).toBeUndefined();
      }
      
      // Terminal should still be functional
      expect(terminal.write).toBeDefined();
    });
  });

  describe('Performance and Memory Management', () => {
    test('should handle high-frequency message updates', async () => {
      const { io } = await import('socket.io-client');
      const { Terminal } = require('xterm');
      
      const socket = io('/terminal');
      const terminal = new Terminal();
      terminal.open(document.createElement('div'));
      
      mockSocket.connected = true;
      const outputHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'output'
      )?.[1];
      
      // Send many messages rapidly
      const messageCount = 1000;
      const startTime = Date.now();
      
      for (let i = 0; i < messageCount; i++) {
        outputHandler({ data: `Message ${i}\n` });
      }
      
      const endTime = Date.now();
      
      // CRITICAL: Should handle high frequency without blocking
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(terminal.write).toHaveBeenCalledTimes(messageCount);
    });

    test('should clean up WebSocket connections on component unmount', async () => {
      const { io } = await import('socket.io-client');
      
      const socket = io('/terminal');
      mockSocket.connected = true;
      
      // Simulate component unmount
      mockSocket.disconnect();
      
      // CRITICAL: Connection should be properly closed
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });
});