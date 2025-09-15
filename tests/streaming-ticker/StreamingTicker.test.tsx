import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import StreamingTicker from '../../frontend/src/components/StreamingTicker';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock EventSource
class MockEventSource {
  public url: string;
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public readyState: number = 0;

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  constructor(url: string) {
    this.url = url;
    this.readyState = MockEventSource.CONNECTING;

    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 100);
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(data)
      });
      this.onmessage(event);
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Setup global EventSource mock
(global as any).EventSource = MockEventSource;

describe('StreamingTicker Component', () => {
  let mockEventSource: MockEventSource;

  beforeEach(() => {
    jest.clearAllMocks();

    // Capture EventSource instances
    const originalEventSource = (global as any).EventSource;
    (global as any).EventSource = jest.fn().mockImplementation((url: string) => {
      mockEventSource = new MockEventSource(url);
      return mockEventSource;
    });
  });

  afterEach(() => {
    if (mockEventSource) {
      mockEventSource.close();
    }
  });

  describe('Connection Management', () => {
    test('should establish connection when enabled', async () => {
      render(<StreamingTicker enabled={true} userId="testuser" />);

      await waitFor(() => {
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });
    });

    test('should not render when disabled', () => {
      render(<StreamingTicker enabled={false} />);
      expect(screen.queryByText('Live')).not.toBeInTheDocument();
    });

    test('should include userId and demo params in URL', () => {
      render(<StreamingTicker enabled={true} userId="testuser" demo={true} />);

      expect((global as any).EventSource).toHaveBeenCalledWith(
        expect.stringContaining('userId=testuser')
      );
      expect((global as any).EventSource).toHaveBeenCalledWith(
        expect.stringContaining('demo=true')
      );
    });

    test('should handle connection errors', async () => {
      render(<StreamingTicker enabled={true} />);

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });

      act(() => {
        mockEventSource.simulateError();
      });

      await waitFor(() => {
        expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
      });
    });
  });

  describe('Message Handling', () => {
    test('should display tool activity messages', async () => {
      render(<StreamingTicker enabled={true} />);

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });

      act(() => {
        mockEventSource.simulateMessage({
          type: 'tool_activity',
          data: {
            tool: 'bash',
            action: 'running tests',
            timestamp: Date.now(),
            priority: 'critical'
          }
        });
      });

      await waitFor(() => {
        expect(screen.getByText('bash: running tests')).toBeInTheDocument();
        expect(screen.getByText('⚠️')).toBeInTheDocument();
      });
    });

    test('should display custom messages', async () => {
      render(<StreamingTicker enabled={true} />);

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });

      act(() => {
        mockEventSource.simulateMessage({
          type: 'custom',
          data: {
            message: 'Custom test message',
            timestamp: Date.now(),
            priority: 'medium'
          }
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Custom test message')).toBeInTheDocument();
        expect(screen.getByText('⚡')).toBeInTheDocument();
      });
    });

    test('should handle connection messages', async () => {
      render(<StreamingTicker enabled={true} />);

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });

      act(() => {
        mockEventSource.simulateMessage({
          type: 'connection',
          data: {
            status: 'connected',
            connectionId: 'test-connection-123'
          }
        });
      });

      // Connection messages should not be displayed in the message list
      expect(screen.queryByText('connection:')).not.toBeInTheDocument();
    });

    test('should handle heartbeat messages silently', async () => {
      render(<StreamingTicker enabled={true} />);

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });

      act(() => {
        mockEventSource.simulateMessage({
          type: 'heartbeat',
          data: { timestamp: Date.now() }
        });
      });

      // Heartbeat should not appear in messages
      expect(screen.queryByText('heartbeat')).not.toBeInTheDocument();
    });

    test('should limit messages to maxMessages', async () => {
      render(<StreamingTicker enabled={true} maxMessages={2} />);

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });

      // Send 3 messages
      for (let i = 1; i <= 3; i++) {
        act(() => {
          mockEventSource.simulateMessage({
            type: 'tool_activity',
            data: {
              tool: 'read',
              action: `message ${i}`,
              timestamp: Date.now() + i,
              priority: 'medium'
            }
          });
        });
      }

      await waitFor(() => {
        expect(screen.getByText('read: message 3')).toBeInTheDocument();
        expect(screen.getByText('read: message 2')).toBeInTheDocument();
        expect(screen.queryByText('read: message 1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Visual Elements', () => {
    test('should show correct connection status indicators', async () => {
      render(<StreamingTicker enabled={true} />);

      // Initial connecting state
      await waitFor(() => {
        const statusDot = document.querySelector('.bg-yellow-400');
        expect(statusDot).toBeInTheDocument();
      });

      // Connected state
      await waitFor(() => {
        const statusDot = document.querySelector('.bg-green-400');
        expect(statusDot).toBeInTheDocument();
      });
    });

    test('should display tool-specific colors', async () => {
      render(<StreamingTicker enabled={true} />);

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });

      act(() => {
        mockEventSource.simulateMessage({
          type: 'tool_activity',
          data: {
            tool: 'bash',
            action: 'running command',
            timestamp: Date.now(),
            priority: 'critical'
          }
        });
      });

      await waitFor(() => {
        const messageElement = screen.getByText('bash: running command');
        expect(messageElement).toHaveClass('text-red-400');
      });
    });

    test('should show empty state when no messages', async () => {
      render(<StreamingTicker enabled={true} />);

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Waiting for Claude activity...')).toBeInTheDocument();
      });
    });

    test('should display timestamps', async () => {
      render(<StreamingTicker enabled={true} />);

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });

      const testTime = new Date().getTime();
      act(() => {
        mockEventSource.simulateMessage({
          type: 'tool_activity',
          data: {
            tool: 'read',
            action: 'file.txt',
            timestamp: testTime,
            priority: 'medium'
          }
        });
      });

      await waitFor(() => {
        const expectedTime = new Date(testTime).toLocaleTimeString();
        expect(screen.getByText(expectedTime)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON messages', async () => {
      render(<StreamingTicker enabled={true} />);

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });

      // Simulate malformed message
      act(() => {
        if (mockEventSource.onmessage) {
          const event = new MessageEvent('message', {
            data: 'invalid json'
          });
          mockEventSource.onmessage(event);
        }
      });

      // Should not crash or display error message
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    test('should attempt reconnection after error', async () => {
      jest.useFakeTimers();

      render(<StreamingTicker enabled={true} />);

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });

      // Simulate error
      act(() => {
        mockEventSource.readyState = MockEventSource.CLOSED;
        mockEventSource.simulateError();
      });

      await waitFor(() => {
        expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
      });

      // Fast forward timers for reconnection
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Should attempt to create new connection
      expect((global as any).EventSource).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe('Development Mode', () => {
    test('should show connection ID in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(<StreamingTicker enabled={true} />);

      await waitFor(() => {
        expect(screen.getByText('Live')).toBeInTheDocument();
      });

      act(() => {
        mockEventSource.simulateMessage({
          type: 'connection',
          data: {
            status: 'connected',
            connectionId: 'test-connection-12345678'
          }
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Connection: test-con...')).toBeInTheDocument();
      });

      process.env.NODE_ENV = originalEnv;
    });
  });
});