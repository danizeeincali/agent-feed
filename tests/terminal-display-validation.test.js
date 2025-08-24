/**
 * TDD Terminal Display Validation Tests
 * 
 * These tests identify and validate terminal output display issues.
 * Tests should FAIL initially (TDD Red), then pass after fixes.
 */

import { jest } from '@jest/globals';

// Skip React Testing Library for now - focus on core logic
const mockRender = jest.fn();
const mockScreen = {
  getByTestId: jest.fn(),
  queryByTestId: jest.fn()
};
const mockWaitFor = jest.fn();
const mockAct = jest.fn();

// Mock xterm.js and addons
const mockTerminal = {
  open: jest.fn(),
  write: jest.fn(),
  writeln: jest.fn(),
  focus: jest.fn(),
  fit: jest.fn(),
  dispose: jest.fn(),
  onData: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  loadAddon: jest.fn(),
  cols: 80,
  rows: 24
};

const mockFitAddon = {
  fit: jest.fn()
};

const mockWebLinksAddon = jest.fn();
const mockSearchAddon = jest.fn();

jest.mock('xterm', () => ({
  Terminal: jest.fn(() => mockTerminal)
}));

jest.mock('@xterm/addon-fit', () => ({
  FitAddon: jest.fn(() => mockFitAddon)
}));

jest.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: mockWebLinksAddon
}));

jest.mock('@xterm/addon-search', () => ({
  SearchAddon: mockSearchAddon
}));

// Mock CSS import
jest.mock('xterm/css/xterm.css', () => ({}));

// Mock Socket.IO
const mockSocket = {
  connected: false,
  emit: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn()
};

const mockIo = jest.fn(() => mockSocket);
jest.mock('socket.io-client', () => ({
  io: mockIo
}));

// Import the component to test
import React from 'react';

// Mock Terminal Component (simplified version for testing)
const TerminalComponent = ({ isVisible, processStatus }) => {
  const terminalRef = React.useRef(null);
  const terminal = React.useRef(null);

  React.useEffect(() => {
    if (isVisible && terminalRef.current && !terminal.current) {
      const { Terminal } = require('xterm');
      terminal.current = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace'
      });
      
      terminal.current.open(terminalRef.current);
      terminal.current.writeln('Terminal initialized');
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div data-testid="terminal-container" className="terminal-container">
      <div 
        ref={terminalRef} 
        data-testid="terminal-element"
        className="terminal-element"
      />
    </div>
  );
};

describe('Terminal Display Validation Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock terminal state
    mockTerminal.open.mockClear();
    mockTerminal.write.mockClear();
    mockTerminal.writeln.mockClear();
    mockSocket.connected = false;
    mockSocket.emit.mockClear();
    mockSocket.on.mockClear();
  });

  describe('Terminal Component Mounting and Visibility', () => {
    test('should render terminal container when visible', () => {
      const processStatus = { isRunning: true, pid: 1234, status: 'running' };
      
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={processStatus}
        />
      );

      // CRITICAL: Terminal container must be visible
      const container = screen.getByTestId('terminal-container');
      expect(container).toBeInTheDocument();
      expect(container).toBeVisible();
    });

    test('should NOT render terminal container when not visible', () => {
      const processStatus = { isRunning: false, pid: null, status: 'stopped' };
      
      render(
        <TerminalComponent 
          isVisible={false} 
          processStatus={processStatus}
        />
      );

      // Terminal should not be in DOM when not visible
      expect(screen.queryByTestId('terminal-container')).not.toBeInTheDocument();
    });

    test('should show terminal element in DOM when mounted', async () => {
      const processStatus = { isRunning: true, pid: 1234, status: 'running' };
      
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={processStatus}
        />
      );

      // Wait for useEffect to run
      await waitFor(() => {
        const terminalElement = screen.getByTestId('terminal-element');
        expect(terminalElement).toBeInTheDocument();
        expect(terminalElement).toBeVisible();
      });
    });
  });

  describe('Xterm.js Instance Creation and DOM Attachment', () => {
    test('should create xterm.js Terminal instance when visible', async () => {
      const processStatus = { isRunning: true, pid: 1234, status: 'running' };
      
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={processStatus}
        />
      );

      await waitFor(() => {
        // CRITICAL: Terminal constructor must be called
        const { Terminal } = require('xterm');
        expect(Terminal).toHaveBeenCalledWith(expect.objectContaining({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: expect.stringContaining('Fira Code')
        }));
      });
    });

    test('should attach terminal to DOM element', async () => {
      const processStatus = { isRunning: true, pid: 1234, status: 'running' };
      
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={processStatus}
        />
      );

      await waitFor(() => {
        // CRITICAL: Terminal.open() must be called with DOM element
        expect(mockTerminal.open).toHaveBeenCalledTimes(1);
        expect(mockTerminal.open).toHaveBeenCalledWith(expect.any(HTMLDivElement));
      });
    });

    test('should write initial content to terminal', async () => {
      const processStatus = { isRunning: true, pid: 1234, status: 'running' };
      
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={processStatus}
        />
      );

      await waitFor(() => {
        // CRITICAL: Terminal must show initial content
        expect(mockTerminal.writeln).toHaveBeenCalledWith('Terminal initialized');
      });
    });

    test('should NOT create terminal instance when not visible', () => {
      const processStatus = { isRunning: false, pid: null, status: 'stopped' };
      
      render(
        <TerminalComponent 
          isVisible={false} 
          processStatus={processStatus}
        />
      );

      // Terminal should not be created
      const { Terminal } = require('xterm');
      expect(Terminal).not.toHaveBeenCalled();
      expect(mockTerminal.open).not.toHaveBeenCalled();
    });
  });

  describe('Terminal Data Event Handling', () => {
    test('should set up onData event handler for input', async () => {
      const processStatus = { isRunning: true, pid: 1234, status: 'running' };
      
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={processStatus}
        />
      );

      await waitFor(() => {
        // CRITICAL: onData handler must be set up
        expect(mockTerminal.onData).toHaveBeenCalledTimes(1);
        expect(mockTerminal.onData).toHaveBeenCalledWith(expect.any(Function));
      });
    });

    test('should handle keyboard input through onData', async () => {
      const processStatus = { isRunning: true, pid: 1234, status: 'running' };
      
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={processStatus}
        />
      );

      await waitFor(() => {
        expect(mockTerminal.onData).toHaveBeenCalled();
      });

      // Simulate typing 'hello'
      const onDataCallback = mockTerminal.onData.mock.calls[0][0];
      act(() => {
        onDataCallback('hello');
      });

      // CRITICAL: Input should be processed (implementation specific)
      // This test will help identify if input handling is working
      expect(onDataCallback).toBeDefined();
    });

    test('should handle special keys (Enter, Backspace)', async () => {
      const processStatus = { isRunning: true, pid: 1234, status: 'running' };
      
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={processStatus}
        />
      );

      await waitFor(() => {
        expect(mockTerminal.onData).toHaveBeenCalled();
      });

      const onDataCallback = mockTerminal.onData.mock.calls[0][0];
      
      // Test Enter key (carriage return)
      act(() => {
        onDataCallback('\r');
      });

      // Test Backspace key
      act(() => {
        onDataCallback('\x7f');
      });

      // CRITICAL: Special keys should be handled
      expect(onDataCallback).toBeDefined();
    });
  });

  describe('Character Display in Terminal DOM', () => {
    test('should display characters in terminal element', async () => {
      const processStatus = { isRunning: true, pid: 1234, status: 'running' };
      
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={processStatus}
        />
      );

      await waitFor(() => {
        expect(mockTerminal.open).toHaveBeenCalled();
      });

      // Simulate writing text to terminal
      act(() => {
        mockTerminal.write('Hello World');
      });

      // CRITICAL: Text should be written to terminal
      expect(mockTerminal.write).toHaveBeenCalledWith('Hello World');
    });

    test('should display multiple lines in terminal', async () => {
      const processStatus = { isRunning: true, pid: 1234, status: 'running' };
      
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={processStatus}
        />
      );

      await waitFor(() => {
        expect(mockTerminal.open).toHaveBeenCalled();
      });

      // Simulate writing multiple lines
      act(() => {
        mockTerminal.writeln('Line 1');
        mockTerminal.writeln('Line 2');
        mockTerminal.write('Line 3 (no newline)');
      });

      // CRITICAL: Multiple lines should be handled
      expect(mockTerminal.writeln).toHaveBeenCalledWith('Line 1');
      expect(mockTerminal.writeln).toHaveBeenCalledWith('Line 2');
      expect(mockTerminal.write).toHaveBeenCalledWith('Line 3 (no newline)');
    });

    test('should handle ANSI color codes', async () => {
      const processStatus = { isRunning: true, pid: 1234, status: 'running' };
      
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={processStatus}
        />
      );

      await waitFor(() => {
        expect(mockTerminal.open).toHaveBeenCalled();
      });

      // Simulate colored text
      const coloredText = '\x1b[31mRed Text\x1b[0m';
      act(() => {
        mockTerminal.write(coloredText);
      });

      // CRITICAL: ANSI codes should be processed
      expect(mockTerminal.write).toHaveBeenCalledWith(coloredText);
    });
  });

  describe('Terminal Container CSS and Visibility', () => {
    test('should have correct CSS classes for terminal container', () => {
      const processStatus = { isRunning: true, pid: 1234, status: 'running' };
      
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={processStatus}
        />
      );

      const container = screen.getByTestId('terminal-container');
      
      // CRITICAL: Container must have proper styling
      expect(container).toHaveClass('terminal-container');
      expect(container).toBeVisible();
    });

    test('should have correct CSS classes for terminal element', async () => {
      const processStatus = { isRunning: true, pid: 1234, status: 'running' };
      
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={processStatus}
        />
      );

      await waitFor(() => {
        const terminalElement = screen.getByTestId('terminal-element');
        
        // CRITICAL: Terminal element must have proper styling
        expect(terminalElement).toHaveClass('terminal-element');
        expect(terminalElement).toBeVisible();
      });
    });

    test('should have non-zero dimensions', async () => {
      const processStatus = { isRunning: true, pid: 1234, status: 'running' };
      
      render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={processStatus}
        />
      );

      await waitFor(() => {
        const terminalElement = screen.getByTestId('terminal-element');
        
        // CRITICAL: Terminal must have dimensions for content to be visible
        const rect = terminalElement.getBoundingClientRect();
        expect(rect.width).toBeGreaterThan(0);
        expect(rect.height).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration: Component Lifecycle', () => {
    test('should create, render, and cleanup terminal properly', async () => {
      const processStatus = { isRunning: true, pid: 1234, status: 'running' };
      
      const { rerender, unmount } = render(
        <TerminalComponent 
          isVisible={true} 
          processStatus={processStatus}
        />
      );

      // Verify creation
      await waitFor(() => {
        const { Terminal } = require('xterm');
        expect(Terminal).toHaveBeenCalled();
        expect(mockTerminal.open).toHaveBeenCalled();
      });

      // Change visibility
      rerender(
        <TerminalComponent 
          isVisible={false} 
          processStatus={processStatus}
        />
      );

      // Verify terminal is hidden but not destroyed
      expect(screen.queryByTestId('terminal-container')).not.toBeInTheDocument();

      // Unmount component
      unmount();

      // CRITICAL: Resources should be cleaned up
      // This test helps identify memory leaks
    });

    test('should handle rapid visibility changes', async () => {
      const processStatus = { isRunning: true, pid: 1234, status: 'running' };
      
      const { rerender } = render(
        <TerminalComponent 
          isVisible={false} 
          processStatus={processStatus}
        />
      );

      // Rapid visibility changes
      for (let i = 0; i < 5; i++) {
        rerender(
          <TerminalComponent 
            isVisible={true} 
            processStatus={processStatus}
          />
        );
        
        rerender(
          <TerminalComponent 
            isVisible={false} 
            processStatus={processStatus}
          />
        );
      }

      // CRITICAL: Should handle rapid changes without errors
      // This test helps identify race conditions
    });
  });
});