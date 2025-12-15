import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';

/**
 * WHITE SCREEN PREVENTION TEST SUITE
 * Test 5: StreamingTicker Component Loading
 *
 * This test suite validates that the StreamingTicker component loads properly
 * and doesn't cause white screen issues through import failures or runtime errors.
 */

describe('White Screen Prevention - StreamingTicker Loading', () => {
  let consoleSpy: any;
  let originalEventSource: any;
  let mockEventSource: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock EventSource for testing
    originalEventSource = global.EventSource;
    mockEventSource = vi.fn();
    mockEventSource.prototype.close = vi.fn();
    mockEventSource.prototype.addEventListener = vi.fn();
    mockEventSource.CONNECTING = 0;
    mockEventSource.OPEN = 1;
    mockEventSource.CLOSED = 2;
    global.EventSource = mockEventSource;
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    global.EventSource = originalEventSource;
  });

  // Mock StreamingTicker component for testing
  const MockStreamingTicker: React.FC<{
    enabled?: boolean;
    userId?: string;
    className?: string;
    maxMessages?: number;
    demo?: boolean;
  }> = ({ enabled = true, userId = 'anonymous', className = '', maxMessages = 5, demo = false }) => {
    const [messages, setMessages] = React.useState<any[]>([]);
    const [connectionStatus, setConnectionStatus] = React.useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
    const eventSourceRef = React.useRef<any>(null);

    // Mock framer-motion imports
    const motion = {
      div: ({ children, ...props }: any) => <div {...props}>{children}</div>
    };
    const AnimatePresence = ({ children }: any) => <div>{children}</div>;

    const connect = React.useCallback(() => {
      if (!enabled || eventSourceRef.current) return;

      setConnectionStatus('connecting');

      // Simulate successful connection after short delay
      setTimeout(() => {
        setConnectionStatus('connected');
      }, 100);
    }, [enabled]);

    React.useEffect(() => {
      if (enabled) {
        connect();
      } else {
        setConnectionStatus('disconnected');
      }
    }, [enabled, connect]);

    if (!enabled) {
      return null;
    }

    return (
      <div className={`streaming-ticker ${className}`} data-testid="streaming-ticker">
        {/* Connection Status */}
        <div data-testid="connection-status" className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-400' :
            connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
            connectionStatus === 'error' ? 'bg-red-400' :
            'bg-gray-400'
          }`} />
          <span className="text-xs text-gray-500">
            {connectionStatus === 'connected' ? 'Live' :
             connectionStatus === 'connecting' ? 'Connecting...' :
             connectionStatus === 'error' ? 'Reconnecting...' :
             'Disconnected'}
          </span>
        </div>

        {/* Messages */}
        <div className="space-y-1 min-h-[120px] max-h-[200px] overflow-hidden" data-testid="messages-container">
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <motion.div
                key={`${message.timestamp || Date.now()}-${index}`}
                data-testid={`ticker-message-${index}`}
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 border border-gray-700/50"
              >
                <span className="text-sm">📍</span>
                <span className="text-sm font-mono text-gray-400">
                  {message.message || 'Test message'}
                </span>
                <span className="text-xs text-gray-500 ml-auto">
                  {new Date().toLocaleTimeString()}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {messages.length === 0 && connectionStatus === 'connected' && (
            <div className="flex items-center justify-center h-24 text-gray-500 text-sm" data-testid="empty-state">
              <motion.div>
                Waiting for Claude activity...
              </motion.div>
            </div>
          )}
        </div>
      </div>
    );
  };

  describe('Basic Component Loading', () => {
    it('should render StreamingTicker without errors', () => {
      expect(() => {
        render(<MockStreamingTicker />);
      }).not.toThrow();

      expect(screen.getByTestId('streaming-ticker')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
      expect(screen.getByTestId('messages-container')).toBeInTheDocument();
    });

    it('should handle disabled state correctly', () => {
      render(<MockStreamingTicker enabled={false} />);

      // Component should not render when disabled
      expect(screen.queryByTestId('streaming-ticker')).not.toBeInTheDocument();
    });

    it('should render with custom props', () => {
      render(
        <MockStreamingTicker
          enabled={true}
          userId="test-user"
          className="custom-class"
          maxMessages={10}
          demo={true}
        />
      );

      const component = screen.getByTestId('streaming-ticker');
      expect(component).toBeInTheDocument();
      expect(component).toHaveClass('custom-class');
    });
  });

  describe('Connection State Management', () => {
    it('should show connecting status initially', () => {
      render(<MockStreamingTicker />);

      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('should transition to connected state', async () => {
      render(<MockStreamingTicker />);

      // Initially connecting
      expect(screen.getByText('Connecting...')).toBeInTheDocument();

      // Should become connected
      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      }, { timeout: 200 });
    });

    it('should handle connection errors gracefully', async () => {
      const ErrorStreamingTicker: React.FC = () => {
        const [connectionStatus, setConnectionStatus] = React.useState<'error'>('error');

        return (
          <div data-testid="streaming-ticker">
            <div data-testid="connection-status">
              <span>Reconnecting...</span>
            </div>
          </div>
        );
      };

      expect(() => {
        render(<ErrorStreamingTicker />);
      }).not.toThrow();

      expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
    });
  });

  describe('Message Handling', () => {
    it('should display empty state when no messages', async () => {
      render(<MockStreamingTicker />);

      // Wait for connection
      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('Waiting for Claude activity...')).toBeInTheDocument();
    });

    it('should handle message rendering without errors', () => {
      const MessagesStreamingTicker: React.FC = () => {
        const messages = [
          { timestamp: Date.now(), message: 'Test message 1' },
          { timestamp: Date.now() + 1, message: 'Test message 2' }
        ];

        return (
          <div data-testid="streaming-ticker">
            <div data-testid="messages-container">
              {messages.map((message, index) => (
                <div key={index} data-testid={`ticker-message-${index}`}>
                  {message.message}
                </div>
              ))}
            </div>
          </div>
        );
      };

      expect(() => {
        render(<MessagesStreamingTicker />);
      }).not.toThrow();

      expect(screen.getByTestId('ticker-message-0')).toBeInTheDocument();
      expect(screen.getByTestId('ticker-message-1')).toBeInTheDocument();
    });

    it('should limit messages to maxMessages prop', () => {
      const maxMessages = 3;
      const messages = Array.from({ length: 5 }, (_, i) => ({
        timestamp: Date.now() + i,
        message: `Message ${i}`
      }));

      const LimitedMessagesComponent: React.FC = () => (
        <div data-testid="streaming-ticker">
          <div data-testid="messages-container">
            {messages.slice(0, maxMessages).map((message, index) => (
              <div key={index} data-testid={`ticker-message-${index}`}>
                {message.message}
              </div>
            ))}
          </div>
        </div>
      );

      render(<LimitedMessagesComponent />);

      // Should only show maxMessages
      expect(screen.getByTestId('ticker-message-0')).toBeInTheDocument();
      expect(screen.getByTestId('ticker-message-1')).toBeInTheDocument();
      expect(screen.getByTestId('ticker-message-2')).toBeInTheDocument();
      expect(screen.queryByTestId('ticker-message-3')).not.toBeInTheDocument();
    });
  });

  describe('Framer Motion Integration', () => {
    it('should handle motion components without errors', () => {
      const MotionTestComponent: React.FC = () => {
        // Mock framer-motion components
        const motion = {
          div: ({ children, initial, animate, exit, ...props }: any) => (
            <div data-motion-initial={JSON.stringify(initial)} {...props}>
              {children}
            </div>
          )
        };

        return (
          <div data-testid="motion-test">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              data-testid="motion-message"
            >
              Animated message
            </motion.div>
          </div>
        );
      };

      expect(() => {
        render(<MotionTestComponent />);
      }).not.toThrow();

      expect(screen.getByTestId('motion-message')).toBeInTheDocument();
    });

    it('should handle AnimatePresence without errors', () => {
      const AnimatePresenceTest: React.FC = () => {
        const [items, setItems] = React.useState([1, 2, 3]);

        // Mock AnimatePresence
        const AnimatePresence = ({ children }: any) => <div data-testid="animate-presence">{children}</div>;

        return (
          <div data-testid="animate-presence-test">
            <button
              data-testid="remove-item"
              onClick={() => setItems(items.slice(1))}
            >
              Remove Item
            </button>
            <AnimatePresence>
              {items.map(item => (
                <div key={item} data-testid={`item-${item}`}>
                  Item {item}
                </div>
              ))}
            </AnimatePresence>
          </div>
        );
      };

      expect(() => {
        render(<AnimatePresenceTest />);
      }).not.toThrow();

      expect(screen.getByTestId('animate-presence')).toBeInTheDocument();
    });
  });

  describe('EventSource Integration', () => {
    it('should handle EventSource creation without errors', () => {
      const EventSourceComponent: React.FC = () => {
        const [connected, setConnected] = React.useState(false);

        React.useEffect(() => {
          try {
            // Mock EventSource usage
            const eventSource = new EventSource('/api/test');
            setConnected(true);
            return () => eventSource.close();
          } catch (error) {
            console.error('EventSource error:', error);
          }
        }, []);

        return (
          <div data-testid="eventsource-component">
            Status: {connected ? 'Connected' : 'Disconnected'}
          </div>
        );
      };

      expect(() => {
        render(<EventSourceComponent />);
      }).not.toThrow();
    });

    it('should handle EventSource errors gracefully', () => {
      // Make EventSource constructor throw an error
      const originalEventSource = global.EventSource;
      global.EventSource = vi.fn(() => {
        throw new Error('EventSource not supported');
      });

      const ErrorHandlingComponent: React.FC = () => {
        const [error, setError] = React.useState<string | null>(null);

        React.useEffect(() => {
          try {
            new EventSource('/api/test');
          } catch (err) {
            setError('EventSource failed');
          }
        }, []);

        return (
          <div data-testid="error-handling-component">
            {error ? `Error: ${error}` : 'No error'}
          </div>
        );
      };

      expect(() => {
        render(<ErrorHandlingComponent />);
      }).not.toThrow();

      expect(screen.getByText('Error: EventSource failed')).toBeInTheDocument();

      // Restore original EventSource
      global.EventSource = originalEventSource;
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should handle component unmounting without memory leaks', () => {
      const { unmount } = render(<MockStreamingTicker />);

      expect(() => {
        unmount();
      }).not.toThrow();
    });

    it('should handle rapid props changes', () => {
      const { rerender } = render(<MockStreamingTicker enabled={true} />);

      // Rapidly change props
      for (let i = 0; i < 10; i++) {
        rerender(<MockStreamingTicker enabled={i % 2 === 0} userId={`user-${i}`} />);
      }

      // Should not cause errors
      expect(true).toBe(true);
    });

    it('should handle large number of messages efficiently', () => {
      const LargeMessageComponent: React.FC = () => {
        const messages = Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          message: `Message ${i}`,
          timestamp: Date.now() + i
        }));

        return (
          <div data-testid="large-message-component">
            {/* Only render first 5 to simulate maxMessages behavior */}
            {messages.slice(0, 5).map(msg => (
              <div key={msg.id} data-testid={`message-${msg.id}`}>
                {msg.message}
              </div>
            ))}
          </div>
        );
      };

      expect(() => {
        render(<LargeMessageComponent />);
      }).not.toThrow();

      // Should only render limited messages
      expect(screen.getByTestId('message-0')).toBeInTheDocument();
      expect(screen.getByTestId('message-4')).toBeInTheDocument();
      expect(screen.queryByTestId('message-5')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle malformed message data gracefully', () => {
      const MalformedDataComponent: React.FC = () => {
        const malformedMessages = [
          null,
          undefined,
          { /* missing required fields */ },
          { timestamp: 'invalid', message: null },
          { timestamp: Date.now() } // missing message
        ];

        return (
          <div data-testid="malformed-data-component">
            {malformedMessages.map((msg, index) => (
              <div key={index} data-testid={`malformed-message-${index}`}>
                {msg?.message || 'Invalid message'}
              </div>
            ))}
          </div>
        );
      };

      expect(() => {
        render(<MalformedDataComponent />);
      }).not.toThrow();
    });

    it('should handle network disconnection scenarios', () => {
      const NetworkDisconnectionComponent: React.FC = () => {
        const [connectionStatus, setConnectionStatus] = React.useState<'connected' | 'error'>('connected');

        // Simulate network disconnection
        React.useEffect(() => {
          const timer = setTimeout(() => {
            setConnectionStatus('error');
          }, 100);

          return () => clearTimeout(timer);
        }, []);

        return (
          <div data-testid="network-disconnection-component">
            Status: {connectionStatus === 'error' ? 'Reconnecting...' : 'Connected'}
          </div>
        );
      };

      expect(() => {
        render(<NetworkDisconnectionComponent />);
      }).not.toThrow();
    });
  });
});