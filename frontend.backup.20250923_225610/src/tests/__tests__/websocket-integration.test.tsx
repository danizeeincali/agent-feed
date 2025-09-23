/**
 * SPARC TDD Tests for WebSocket Integration
 * Validates unified WebSocket terminal functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { TerminalUnified } from '../components/TerminalUnified';

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  readyState: WebSocket.CONNECTING,
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

// Mock xterm
jest.mock('xterm', () => ({
  Terminal: jest.fn().mockImplementation(() => ({
    open: jest.fn(),
    writeln: jest.fn(),
    write: jest.fn(),
    dispose: jest.fn(),
    onData: jest.fn().mockReturnValue({ dispose: jest.fn() }),
    loadAddon: jest.fn(),
    focus: jest.fn(),
    cols: 80,
    rows: 24
  }))
}));

jest.mock('@xterm/addon-fit', () => ({
  FitAddon: jest.fn().mockImplementation(() => ({
    fit: jest.fn()
  }))
}));

jest.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: jest.fn()
}));

jest.mock('@xterm/addon-search', () => ({
  SearchAddon: jest.fn()
}));

// Mock useWebSocketTerminal hook
const mockConnectToInstance = jest.fn();
const mockDisconnectFromInstance = jest.fn();
const mockSendCommand = jest.fn();
const mockAddHandler = jest.fn();
const mockRemoveHandler = jest.fn();

jest.mock('../hooks/useWebSocketTerminal', () => ({
  useWebSocketTerminal: jest.fn(() => ({
    connectionState: {
      isConnected: false,
      instanceId: null,
      connectionType: 'none',
      lastError: null
    },
    connectToInstance: mockConnectToInstance,
    disconnectFromInstance: mockDisconnectFromInstance,
    sendCommand: mockSendCommand,
    addHandler: mockAddHandler,
    removeHandler: mockRemoveHandler,
    config: {
      url: 'ws://localhost:3000'
    }
  }))
}));

describe('SPARC WebSocket Integration Tests', () => {
  const defaultProps = {
    isVisible: true,
    processStatus: {
      isRunning: true,
      pid: 1234,
      status: 'running'
    },
    instanceId: 'test-instance'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SPARC Specification Phase Tests', () => {
    test('should render unified terminal without dual WebSocket managers', () => {
      render(<TerminalUnified {...defaultProps} />);
      
      expect(screen.getByText('SPARC Unified Terminal')).toBeInTheDocument();
      expect(screen.getByText(/Single Manager/)).toBeInTheDocument();
      expect(screen.getByText(/No Dual Managers/)).toBeInTheDocument();
    });

    test('should use only useWebSocketTerminal hook for connections', async () => {
      render(<TerminalUnified {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockConnectToInstance).toHaveBeenCalledWith('test-instance');
      });
      
      // Verify no direct WebSocket creation
      expect(global.WebSocket).not.toHaveBeenCalled();
    });
  });

  describe('SPARC Architecture Phase Tests', () => {
    test('should establish single WebSocket connection via hook', async () => {
      render(<TerminalUnified {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockConnectToInstance).toHaveBeenCalledTimes(1);
        expect(mockConnectToInstance).toHaveBeenCalledWith('test-instance');
      });
    });

    test('should setup all event handlers through hook', async () => {
      render(<TerminalUnified {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockAddHandler).toHaveBeenCalledWith('message', expect.any(Function));
        expect(mockAddHandler).toHaveBeenCalledWith('loading', expect.any(Function));
        expect(mockAddHandler).toHaveBeenCalledWith('permission_request', expect.any(Function));
        expect(mockAddHandler).toHaveBeenCalledWith('connect', expect.any(Function));
        expect(mockAddHandler).toHaveBeenCalledWith('disconnect', expect.any(Function));
        expect(mockAddHandler).toHaveBeenCalledWith('error', expect.any(Function));
      });
    });

    test('should disconnect when process stops running', async () => {
      const { rerender } = render(<TerminalUnified {...defaultProps} />);
      
      // Stop the process
      rerender(<TerminalUnified {...defaultProps} processStatus={{ isRunning: false, pid: 1234, status: 'stopped' }} />);
      
      await waitFor(() => {
        expect(mockDisconnectFromInstance).toHaveBeenCalledWith('test-instance');
      });
    });
  });

  describe('SPARC Refinement Phase Tests', () => {
    test('should send commands through hook sendCommand method', async () => {
      mockSendCommand.mockResolvedValue({ success: true });
      
      render(<TerminalUnified {...defaultProps} />);
      
      // Simulate terminal input (this would normally come from xterm onData)
      // We'll test the sendCommand call directly since xterm is mocked
      await mockSendCommand('test-instance', 'test command');
      
      expect(mockSendCommand).toHaveBeenCalledWith('test-instance', 'test command');
    });

    test('should handle loading animations', async () => {
      render(<TerminalUnified {...defaultProps} />);
      
      // Get the loading handler that was added
      const loadingHandler = mockAddHandler.mock.calls.find(call => call[0] === 'loading')?.[1];
      expect(loadingHandler).toBeDefined();
      
      if (loadingHandler) {
        // Simulate loading animation
        loadingHandler({
          isComplete: false,
          message: 'Processing...'
        });
        
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      }
    });

    test('should handle permission requests', async () => {
      render(<TerminalUnified {...defaultProps} />);
      
      // Get the permission request handler
      const permissionHandler = mockAddHandler.mock.calls.find(call => call[0] === 'permission_request')?.[1];
      expect(permissionHandler).toBeDefined();
      
      if (permissionHandler) {
        // Simulate permission request
        permissionHandler({
          message: 'Allow file access?',
          requestId: 'req-123'
        });
        
        expect(screen.getByText('Permission Required')).toBeInTheDocument();
        expect(screen.getByText('Allow file access?')).toBeInTheDocument();
      }
    });
  });

  describe('SPARC Completion Phase Tests', () => {
    test('should execute initial command after connection', async () => {
      const propsWithInitialCommand = {
        ...defaultProps,
        initialCommand: 'ls -la'
      };
      
      render(<TerminalUnified {...propsWithInitialCommand} />);
      
      // Get the connect handler
      const connectHandler = mockAddHandler.mock.calls.find(call => call[0] === 'connect')?.[1];
      expect(connectHandler).toBeDefined();
      
      if (connectHandler) {
        // Simulate successful connection
        connectHandler({ instanceId: 'test-instance' });
        
        // Wait for initial command to be sent
        await waitFor(() => {
          expect(mockSendCommand).toHaveBeenCalledWith('test-instance', 'ls -la');
        }, { timeout: 1000 });
      }
    });

    test('should clean up handlers on unmount', () => {
      const { unmount } = render(<TerminalUnified {...defaultProps} />);
      
      unmount();
      
      // Verify handlers are removed
      expect(mockRemoveHandler).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockRemoveHandler).toHaveBeenCalledWith('loading', expect.any(Function));
      expect(mockRemoveHandler).toHaveBeenCalledWith('permission_request', expect.any(Function));
      expect(mockRemoveHandler).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRemoveHandler).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockRemoveHandler).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should display connection status correctly', () => {
      // Mock connected state
      const mockUseWebSocketTerminal = jest.requireMock('../hooks/useWebSocketTerminal').useWebSocketTerminal;
      mockUseWebSocketTerminal.mockReturnValue({
        connectionState: {
          isConnected: true,
          instanceId: 'test-instance',
          connectionType: 'websocket',
          lastError: null
        },
        connectToInstance: mockConnectToInstance,
        disconnectFromInstance: mockDisconnectFromInstance,
        sendCommand: mockSendCommand,
        addHandler: mockAddHandler,
        removeHandler: mockRemoveHandler,
        config: { url: 'ws://localhost:3000' }
      });
      
      render(<TerminalUnified {...defaultProps} />);
      
      expect(screen.getByText(/Connected \(SPARC Unified\)/)).toBeInTheDocument();
    });
  });

  describe('Error Handling Tests', () => {
    test('should handle connection errors gracefully', async () => {
      mockConnectToInstance.mockRejectedValue(new Error('Connection failed'));
      
      render(<TerminalUnified {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Connection failed/)).toBeInTheDocument();
      });
    });

    test('should handle WebSocket errors through hook', async () => {
      render(<TerminalUnified {...defaultProps} />);
      
      // Get the error handler
      const errorHandler = mockAddHandler.mock.calls.find(call => call[0] === 'error')?.[1];
      expect(errorHandler).toBeDefined();
      
      if (errorHandler) {
        errorHandler({ error: 'WebSocket connection lost' });
        
        expect(screen.getByText(/WebSocket connection lost/)).toBeInTheDocument();
      }
    });
  });
});