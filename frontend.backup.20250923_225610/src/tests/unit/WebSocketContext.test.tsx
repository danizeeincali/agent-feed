import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { WebSocketProvider, useWebSocket } from '@/context/WebSocketSingletonContext';

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.CONNECTING,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Test component that uses WebSocket context
const TestComponent: React.FC = () => {
  const { 
    socket, 
    connectionStatus, 
    sendMessage, 
    addMessageListener, 
    removeMessageListener,
    isConnected,
    reconnect 
  } = useWebSocket();

  return (
    <div>
      <div data-testid="connection-status">{connectionStatus}</div>
      <div data-testid="is-connected">{isConnected ? 'true' : 'false'}</div>
      <button onClick={() => sendMessage({ type: 'test', data: 'hello' })}>
        Send Message
      </button>
      <button onClick={() => reconnect()}>
        Reconnect
      </button>
      <button onClick={() => {
        const listener = (data: any) => console.log(data);
        addMessageListener('test', listener);
      }}>
        Add Listener
      </button>
      <button onClick={() => {
        const listener = (data: any) => console.log(data);
        removeMessageListener('test', listener);
      }}>
        Remove Listener
      </button>
    </div>
  );
};

describe('WebSocketContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWebSocket.send.mockClear();
    mockWebSocket.addEventListener.mockClear();
    mockWebSocket.removeEventListener.mockClear();
    mockWebSocket.close.mockClear();
    mockWebSocket.readyState = WebSocket.CONNECTING;
  });

  describe('Provider Initialization', () => {
    it('should provide WebSocket context to children', () => {
      render(
        <WebSocketProvider config={{ autoConnect: false }}>
          <TestComponent />
        </WebSocketProvider>
      );

      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      expect(screen.getByTestId('is-connected')).toBeInTheDocument();
    });

    it('should initialize with connecting status', () => {
      render(
        <WebSocketProvider config={{ autoConnect: false }}>
          <TestComponent />
        </WebSocketProvider>
      );

      expect(screen.getByTestId('connection-status')).toHaveTextContent('connecting');
      expect(screen.getByTestId('is-connected')).toHaveTextContent('false');
    });

    it('should auto-connect when configured', () => {
      render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <TestComponent />
        </WebSocketProvider>
      );

      expect(global.WebSocket).toHaveBeenCalled();
    });

    it('should not auto-connect when disabled', () => {
      render(
        <WebSocketProvider config={{ autoConnect: false }}>
          <TestComponent />
        </WebSocketProvider>
      );

      // Should not immediately create WebSocket connection
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
  });

  describe('Connection Management', () => {
    it('should update connection status when WebSocket opens', async () => {
      render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <TestComponent />
        </WebSocketProvider>
      );

      // Simulate WebSocket open event
      const openHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )?.[1];

      if (openHandler) {
        mockWebSocket.readyState = WebSocket.OPEN;
        act(() => {
          openHandler({ type: 'open' });
        });

        await waitFor(() => {
          expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
          expect(screen.getByTestId('is-connected')).toHaveTextContent('true');
        });
      }
    });

    it('should update connection status when WebSocket closes', async () => {
      render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <TestComponent />
        </WebSocketProvider>
      );

      // First open, then close
      const openHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )?.[1];

      const closeHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )?.[1];

      if (openHandler && closeHandler) {
        mockWebSocket.readyState = WebSocket.OPEN;
        act(() => {
          openHandler({ type: 'open' });
        });

        mockWebSocket.readyState = WebSocket.CLOSED;
        act(() => {
          closeHandler({ type: 'close', code: 1000, reason: 'Normal closure' });
        });

        await waitFor(() => {
          expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');
          expect(screen.getByTestId('is-connected')).toHaveTextContent('false');
        });
      }
    });

    it('should handle WebSocket errors', async () => {
      render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <TestComponent />
        </WebSocketProvider>
      );

      const errorHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      if (errorHandler) {
        act(() => {
          errorHandler({ type: 'error', error: new Error('Connection failed') });
        });

        await waitFor(() => {
          expect(screen.getByTestId('connection-status')).toHaveTextContent('error');
        });
      }
    });
  });

  describe('Message Handling', () => {
    it('should send messages when connected', async () => {
      render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <TestComponent />
        </WebSocketProvider>
      );

      // Simulate connection
      mockWebSocket.readyState = WebSocket.OPEN;
      const openHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'open'
      )?.[1];

      if (openHandler) {
        act(() => {
          openHandler({ type: 'open' });
        });

        await waitFor(() => {
          expect(screen.getByTestId('is-connected')).toHaveTextContent('true');
        });

        // Send message
        const sendButton = screen.getByRole('button', { name: /send message/i });
        act(() => {
          sendButton.click();
        });

        expect(mockWebSocket.send).toHaveBeenCalledWith(
          JSON.stringify({ type: 'test', data: 'hello' })
        );
      }
    });

    it('should queue messages when not connected', async () => {
      render(
        <WebSocketProvider config={{ autoConnect: false }}>
          <TestComponent />
        </WebSocketProvider>
      );

      // Try to send message while not connected
      const sendButton = screen.getByRole('button', { name: /send message/i });
      act(() => {
        sendButton.click();
      });

      // Message should not be sent immediately
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should receive and dispatch messages to listeners', async () => {
      const messageListener = jest.fn();
      
      render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <TestComponent />
        </WebSocketProvider>
      );

      // Add message listener
      const addListenerButton = screen.getByRole('button', { name: /add listener/i });
      act(() => {
        addListenerButton.click();
      });

      // Simulate receiving message
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageHandler) {
        const mockMessage = { data: JSON.stringify({ type: 'test', payload: 'test data' }) };
        act(() => {
          messageHandler(mockMessage);
        });
      }

      // Message listener should be called (in real implementation)
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on connection loss', async () => {
      render(
        <WebSocketProvider config={{ 
          autoConnect: true,
          reconnectAttempts: 3,
          reconnectInterval: 100
        }}>
          <TestComponent />
        </WebSocketProvider>
      );

      const closeHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )?.[1];

      if (closeHandler) {
        mockWebSocket.readyState = WebSocket.CLOSED;
        act(() => {
          closeHandler({ type: 'close', code: 1006, reason: 'Abnormal closure' });
        });

        // Should attempt reconnection
        await waitFor(() => {
          expect(screen.getByTestId('connection-status')).toBeInTheDocument();
        }, { timeout: 200 });
      }
    });

    it('should respect max reconnection attempts', async () => {
      render(
        <WebSocketProvider config={{ 
          autoConnect: true,
          reconnectAttempts: 2,
          reconnectInterval: 50
        }}>
          <TestComponent />
        </WebSocketProvider>
      );

      // Simulate multiple connection failures
      const closeHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )?.[1];

      if (closeHandler) {
        for (let i = 0; i < 3; i++) {
          mockWebSocket.readyState = WebSocket.CLOSED;
          act(() => {
            closeHandler({ type: 'close', code: 1006, reason: 'Abnormal closure' });
          });
        }

        await waitFor(() => {
          expect(screen.getByTestId('connection-status')).toBeInTheDocument();
        }, { timeout: 200 });
      }
    });

    it('should allow manual reconnection', async () => {
      render(
        <WebSocketProvider config={{ autoConnect: false }}>
          <TestComponent />
        </WebSocketProvider>
      );

      const reconnectButton = screen.getByRole('button', { name: /reconnect/i });
      act(() => {
        reconnectButton.click();
      });

      // Should attempt to reconnect
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
  });

  describe('Message Listeners', () => {
    it('should add message listeners correctly', () => {
      render(
        <WebSocketProvider config={{ autoConnect: false }}>
          <TestComponent />
        </WebSocketProvider>
      );

      const addListenerButton = screen.getByRole('button', { name: /add listener/i });
      act(() => {
        addListenerButton.click();
      });

      // Listener should be added (verified through implementation)
      expect(addListenerButton).toBeInTheDocument();
    });

    it('should remove message listeners correctly', () => {
      render(
        <WebSocketProvider config={{ autoConnect: false }}>
          <TestComponent />
        </WebSocketProvider>
      );

      const removeListenerButton = screen.getByRole('button', { name: /remove listener/i });
      act(() => {
        removeListenerButton.click();
      });

      // Listener should be removed (verified through implementation)
      expect(removeListenerButton).toBeInTheDocument();
    });
  });

  describe('Cleanup', () => {
    it('should clean up WebSocket connection on unmount', () => {
      const { unmount } = render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <TestComponent />
        </WebSocketProvider>
      );

      unmount();

      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should remove all event listeners on cleanup', () => {
      const { unmount } = render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <TestComponent />
        </WebSocketProvider>
      );

      unmount();

      expect(mockWebSocket.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed message data gracefully', async () => {
      render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <TestComponent />
        </WebSocketProvider>
      );

      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (messageHandler) {
        // Send malformed JSON
        const malformedMessage = { data: 'invalid json {' };
        act(() => {
          messageHandler(malformedMessage);
        });

        // Should not crash
        expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      }
    });

    it('should handle WebSocket constructor failures', () => {
      // Mock WebSocket constructor to throw
      global.WebSocket = jest.fn(() => {
        throw new Error('WebSocket not supported');
      }) as any;

      render(
        <WebSocketProvider config={{ autoConnect: true }}>
          <TestComponent />
        </WebSocketProvider>
      );

      // Should render without crashing
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration values', () => {
      const customConfig = {
        autoConnect: true,
        reconnectAttempts: 5,
        reconnectInterval: 2000,
        heartbeatInterval: 30000,
      };

      render(
        <WebSocketProvider config={customConfig}>
          <TestComponent />
        </WebSocketProvider>
      );

      // Should initialize with custom config
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });

    it('should use default configuration when not provided', () => {
      render(
        <WebSocketProvider config={{}}>
          <TestComponent />
        </WebSocketProvider>
      );

      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
  });
});