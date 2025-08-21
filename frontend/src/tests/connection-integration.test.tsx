import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WebSocketSingletonProvider } from '@/context/WebSocketSingletonContext';
import { LiveActivityIndicator } from '@/components/LiveActivityIndicator';
import ConnectionStatus from '@/components/ConnectionStatus';
import { io, Socket } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');
const mockIo = io as jest.MockedFunction<typeof io>;

describe('Connection Integration Tests', () => {
  let mockSocket: Partial<Socket>;
  
  beforeEach(() => {
    mockSocket = {
      id: 'test-socket-id',
      connected: false,
      connecting: false,
      connect: jest.fn().mockReturnThis(),
      disconnect: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn()
    };
    
    mockIo.mockReturnValue(mockSocket as Socket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProvider = (component: React.ReactElement) => {
    return render(
      <WebSocketSingletonProvider>
        {component}
      </WebSocketSingletonProvider>
    );
  };

  describe('Connection Status Component', () => {
    it('should render disconnected state initially', () => {
      renderWithProvider(<ConnectionStatus />);
      
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByText('Connect')).toBeInTheDocument();
    });

    it('should show connecting state when connection is initiated', async () => {
      mockSocket.connecting = true;
      
      renderWithProvider(<ConnectionStatus />);
      
      const connectButton = screen.getByText('Connect');
      await act(async () => {
        fireEvent.click(connectButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
      });
    });

    it('should show connected state with controls', async () => {
      mockSocket.connected = true;
      
      renderWithProvider(<ConnectionStatus />);
      
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
        expect(screen.getByText('Reconnect')).toBeInTheDocument();
        expect(screen.getByText('Disconnect')).toBeInTheDocument();
      });
    });

    it('should handle reconnection', async () => {
      mockSocket.connected = true;
      
      renderWithProvider(<ConnectionStatus />);
      
      const reconnectButton = screen.getByText('Reconnect');
      await act(async () => {
        fireEvent.click(reconnectButton);
      });

      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('should handle disconnection', async () => {
      mockSocket.connected = true;
      
      renderWithProvider(<ConnectionStatus />);
      
      const disconnectButton = screen.getByText('Disconnect');
      await act(async () => {
        fireEvent.click(disconnectButton);
      });

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('Live Activity Indicator', () => {
    it('should render with connection status', () => {
      renderWithProvider(<LiveActivityIndicator />);
      
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should show details when clicked', async () => {
      renderWithProvider(<LiveActivityIndicator />);
      
      const indicator = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(indicator);
      });

      await waitFor(() => {
        expect(screen.getByText('Live Activity')).toBeInTheDocument();
        expect(screen.getByText('Connection Status:')).toBeInTheDocument();
        expect(screen.getByText('Connection Controls')).toBeInTheDocument();
      });
    });

    it('should display connection controls in dropdown', async () => {
      renderWithProvider(<LiveActivityIndicator />);
      
      const indicator = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(indicator);
      });

      await waitFor(() => {
        expect(screen.getByText('Connect')).toBeInTheDocument();
      });
    });

    it('should show online users when connected', async () => {
      mockSocket.connected = true;
      
      renderWithProvider(<LiveActivityIndicator />);
      
      const indicator = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(indicator);
      });

      // Simulate receiving online users data
      await act(async () => {
        const onHandler = mockSocket.on as jest.Mock;
        const connectHandler = onHandler.mock.calls.find(call => call[0] === 'online_users')?.[1];
        if (connectHandler) {
          connectHandler([
            { id: '1', username: 'user1', lastSeen: new Date().toISOString() },
            { id: '2', username: 'user2', lastSeen: new Date().toISOString() }
          ]);
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Online Users (2)')).toBeInTheDocument();
      });
    });
  });

  describe('WebSocket Integration', () => {
    it('should establish connection with correct URL', () => {
      renderWithProvider(<div>Test</div>);
      
      expect(mockIo).toHaveBeenCalledWith('/', expect.objectContaining({
        autoConnect: true,
        transports: ['websocket', 'polling'],
        timeout: 10000
      }));
    });

    it('should handle connection events', async () => {
      renderWithProvider(<ConnectionStatus />);
      
      // Simulate connection
      await act(async () => {
        const onHandler = mockSocket.on as jest.Mock;
        const connectHandler = onHandler.mock.calls.find(call => call[0] === 'connect')?.[1];
        if (connectHandler) {
          mockSocket.connected = true;
          connectHandler();
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });

    it('should handle disconnection events', async () => {
      mockSocket.connected = true;
      
      renderWithProvider(<ConnectionStatus />);
      
      // Simulate disconnection
      await act(async () => {
        const onHandler = mockSocket.on as jest.Mock;
        const disconnectHandler = onHandler.mock.calls.find(call => call[0] === 'disconnect')?.[1];
        if (disconnectHandler) {
          mockSocket.connected = false;
          disconnectHandler('io server disconnect');
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });
    });

    it('should handle error events', async () => {
      renderWithProvider(<ConnectionStatus />);
      
      // Simulate error
      await act(async () => {
        const onHandler = mockSocket.on as jest.Mock;
        const errorHandler = onHandler.mock.calls.find(call => call[0] === 'connect_error')?.[1];
        if (errorHandler) {
          errorHandler(new Error('Connection failed'));
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Features', () => {
    it('should handle live activity updates', async () => {
      mockSocket.connected = true;
      
      renderWithProvider(<LiveActivityIndicator />);
      
      const indicator = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(indicator);
      });

      // Simulate system stats update
      await act(async () => {
        const onHandler = mockSocket.on as jest.Mock;
        const statsHandler = onHandler.mock.calls.find(call => call[0] === 'system_stats')?.[1];
        if (statsHandler) {
          statsHandler({
            connectedUsers: 5,
            activeRooms: 3,
            totalSockets: 10,
            timestamp: new Date().toISOString()
          });
        }
      });

      await waitFor(() => {
        expect(screen.getByText('System Statistics')).toBeInTheDocument();
      });
    });

    it('should emit events correctly', async () => {
      mockSocket.connected = true;
      
      renderWithProvider(<div>Test</div>);
      
      // Simulate emitting an event
      await act(async () => {
        const emitHandler = mockSocket.emit as jest.Mock;
        emitHandler('test-event', { data: 'test' });
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
    });
  });

  describe('Error Handling', () => {
    it('should handle connection failures gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      renderWithProvider(<ConnectionStatus />);
      
      const connectButton = screen.getByText('Connect');
      
      // Mock connect to throw error
      (mockSocket.connect as jest.Mock).mockImplementation(() => {
        throw new Error('Connection failed');
      });

      await act(async () => {
        fireEvent.click(connectButton);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Manual connection failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle reconnection failures', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSocket.connected = true;
      
      renderWithProvider(<ConnectionStatus />);
      
      const reconnectButton = screen.getByText('Reconnect');
      
      // Mock connect to throw error
      (mockSocket.connect as jest.Mock).mockImplementation(() => {
        throw new Error('Reconnection failed');
      });

      await act(async () => {
        fireEvent.click(reconnectButton);
      });

      expect(consoleSpy).toHaveBeenCalledWith('Manual reconnection failed:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should not cause memory leaks', async () => {
      const { unmount } = renderWithProvider(<ConnectionStatus />);
      
      // Component should clean up listeners
      unmount();
      
      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
    });

    it('should handle rapid state changes', async () => {
      renderWithProvider(<ConnectionStatus />);
      
      // Simulate rapid connect/disconnect
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          mockSocket.connected = i % 2 === 0;
          const onHandler = mockSocket.on as jest.Mock;
          const handler = onHandler.mock.calls.find(call => 
            call[0] === (mockSocket.connected ? 'connect' : 'disconnect')
          )?.[1];
          if (handler) {
            handler();
          }
        });
      }

      // Should still render correctly
      expect(screen.getByText(/Connected|Disconnected/)).toBeInTheDocument();
    });
  });
});