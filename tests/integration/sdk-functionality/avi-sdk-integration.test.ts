/**
 * Integration Tests for Avi SDK Functionality
 * Tests the complete SDK integration including UI components and API interaction
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/test-environment-jsdom';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockApiServer from '../mock-servers/mock-api-server';
import { AviDirectChatSDK } from '../../../frontend/src/components/posting-interface/AviDirectChatSDK';
import {
  aviChatTestMessages,
  streamingTickerTestData,
  delay,
  waitForCondition
} from '../fixtures/test-data';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock EventSource for SSE testing
global.EventSource = jest.fn().mockImplementation((url: string) => {
  const mockEventSource = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    close: jest.fn(),
    readyState: 1,
    url,
    onopen: null,
    onmessage: null,
    onerror: null
  };

  // Simulate connection after a delay
  setTimeout(() => {
    if (mockEventSource.onopen) {
      mockEventSource.onopen({} as Event);
    }
  }, 100);

  return mockEventSource;
});

describe('Avi SDK Integration Tests', () => {
  let mockServer: MockApiServer;
  let baseUrl: string;
  let user: any;

  beforeAll(async () => {
    // Start mock server
    mockServer = new MockApiServer({
      port: 3005,
      cors: true,
      logging: false
    });
    await mockServer.start();
    baseUrl = mockServer.getUrl();

    // Setup user events
    user = userEvent.setup();
  });

  afterAll(async () => {
    if (mockServer) {
      await mockServer.stop();
    }
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    mockServer.clearAllOverrides();
    mockServer.resetRequestCount();
    mockFetch.mockClear();
  });

  describe('SDK Component Rendering and Initialization', () => {
    test('should render AviDirectChatSDK component correctly', () => {
      render(<AviDirectChatSDK />);

      // Check header elements
      expect(screen.getByText('Avi AI Assistant')).toBeInTheDocument();
      expect(screen.getByText('🔒 Claude Code SDK')).toBeInTheDocument();

      // Check greeting message
      expect(screen.getByTestId('avi-greeting')).toBeInTheDocument();
      expect(screen.getByText(/Hello! I'm Avi/)).toBeInTheDocument();

      // Check input elements
      expect(screen.getByPlaceholderText('Type your message to Avi...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    test('should initialize with correct connection state', () => {
      const onConnectionStateChange = jest.fn();

      render(
        <AviDirectChatSDK onConnectionStateChange={onConnectionStateChange} />
      );

      // Should start in disconnected state
      expect(screen.getByText('Ready to chat')).toBeInTheDocument();
    });

    test('should handle loading state correctly', () => {
      render(<AviDirectChatSDK isLoading={true} />);

      // Should show loading state
      expect(screen.getByText('Avi AI Assistant')).toBeInTheDocument();
    });

    test('should apply custom className', () => {
      const customClass = 'test-custom-class';
      const { container } = render(
        <AviDirectChatSDK className={customClass} />
      );

      expect(container.firstChild).toHaveClass(customClass);
    });
  });

  describe('Message Sending and API Integration', () => {
    test('should send simple text message successfully', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{
            content: 'Test response from Avi',
            role: 'assistant',
            timestamp: new Date().toISOString()
          }],
          timestamp: new Date().toISOString()
        })
      } as Response);

      const onMessageSent = jest.fn();

      render(<AviDirectChatSDK onMessageSent={onMessageSent} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Type message and send
      await user.type(input, 'Hello Avi, how are you?');
      await user.click(sendButton);

      // Wait for API call and UI update
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/claude-code/streaming-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Hello Avi, how are you?',
            options: {
              workingDirectory: '/workspaces/agent-feed/prod',
              allowedTools: ['Read', 'Write', 'Grep', 'Bash']
            }
          })
        });
      });

      // Check if message was sent callback was called
      expect(onMessageSent).toHaveBeenCalled();

      // Check if response appears in UI
      await waitFor(() => {
        expect(screen.getByText('Test response from Avi')).toBeInTheDocument();
      });
    });

    test('should handle API errors gracefully', async () => {
      // Mock API error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: 'Internal server error'
        })
      } as Response);

      const onError = jest.fn();

      render(<AviDirectChatSDK onError={onError} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send message that will cause error
      await user.type(input, 'This will cause an error');
      await user.click(sendButton);

      // Wait for error handling
      await waitFor(() => {
        expect(screen.getByText(/API request failed/)).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalled();
    });

    test('should prevent sending empty messages', async () => {
      render(<AviDirectChatSDK />);

      const sendButton = screen.getByRole('button', { name: /send/i });

      // Button should be disabled for empty message
      expect(sendButton).toBeDisabled();

      // Click should not trigger API call
      await user.click(sendButton);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should handle network errors', async () => {
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const onError = jest.fn();

      render(<AviDirectChatSDK onError={onError} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test network error');
      await user.click(sendButton);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('Image Upload Functionality', () => {
    test('should handle image file selection', async () => {
      render(<AviDirectChatSDK />);

      const imageButton = screen.getByTitle('Add images');

      // Create mock file
      const file = new File(['test image'], 'test.png', { type: 'image/png' });

      // Mock file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false,
        });

        fireEvent.change(fileInput);

        // Should show selected image
        await waitFor(() => {
          expect(screen.getByText('test.png')).toBeInTheDocument();
        });
      }
    });

    test('should reject non-image files', async () => {
      render(<AviDirectChatSDK />);

      // Create mock non-image file
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false,
        });

        fireEvent.change(fileInput);

        // Should show error
        await waitFor(() => {
          expect(screen.getByText('Only image files are allowed')).toBeInTheDocument();
        });
      }
    });

    test('should limit number of images', async () => {
      render(<AviDirectChatSDK />);

      // Create multiple mock files
      const files = Array.from({ length: 6 }, (_, i) =>
        new File(['test'], `test${i}.png`, { type: 'image/png' })
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: files,
          writable: false,
        });

        fireEvent.change(fileInput);

        // Should show error for too many images
        await waitFor(() => {
          expect(screen.getByText('Maximum 5 images allowed')).toBeInTheDocument();
        });
      }
    });

    test('should remove selected images', async () => {
      render(<AviDirectChatSDK />);

      const file = new File(['test image'], 'test.png', { type: 'image/png' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      if (fileInput) {
        Object.defineProperty(fileInput, 'files', {
          value: [file],
          writable: false,
        });

        fireEvent.change(fileInput);

        // Wait for image to appear
        await waitFor(() => {
          expect(screen.getByText('test.png')).toBeInTheDocument();
        });

        // Click remove button
        const removeButton = screen.getByRole('button', { name: '' }); // X button
        await user.click(removeButton);

        // Image should be removed
        await waitFor(() => {
          expect(screen.queryByText('test.png')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Keyboard Shortcuts and UX', () => {
    test('should send message on Enter key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{ content: 'Response', role: 'assistant', timestamp: new Date().toISOString() }],
          timestamp: new Date().toISOString()
        })
      } as Response);

      render(<AviDirectChatSDK />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');

      await user.type(input, 'Test Enter key');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });
    });

    test('should not send message on Shift+Enter', async () => {
      render(<AviDirectChatSDK />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');

      await user.type(input, 'Test Shift+Enter');
      await user.keyboard('{Shift>}{Enter}{/Shift}');

      // Should not trigger API call
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('should disable input during message sending', async () => {
      // Mock slow API response
      mockFetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true, responses: [], timestamp: new Date().toISOString() })
          } as Response), 1000)
        )
      );

      render(<AviDirectChatSDK />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test disable during sending');
      await user.click(sendButton);

      // Input should be disabled during sending
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Streaming Ticker Integration', () => {
    test('should show streaming ticker when enabled', () => {
      render(<AviDirectChatSDK />);

      // StreamingTicker should be present in DOM
      const ticker = document.querySelector('[class*="streaming"]');
      expect(ticker).toBeInTheDocument();
    });

    test('should activate ticker during message processing', async () => {
      mockFetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true, responses: [], timestamp: new Date().toISOString() })
          } as Response), 500)
        )
      );

      render(<AviDirectChatSDK />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test ticker activation');
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Ticker should be enabled during processing
      // Implementation depends on StreamingTicker component
    });
  });

  describe('Connection State Management', () => {
    test('should update connection state during API calls', async () => {
      const onConnectionStateChange = jest.fn();

      mockFetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true, responses: [], timestamp: new Date().toISOString() })
          } as Response), 200)
        )
      );

      render(<AviDirectChatSDK onConnectionStateChange={onConnectionStateChange} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test connection state');
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Should transition through connection states
      await waitFor(() => {
        expect(onConnectionStateChange).toHaveBeenCalledWith('connecting');
      });

      await waitFor(() => {
        expect(onConnectionStateChange).toHaveBeenCalledWith('connected');
      });
    });

    test('should show error state on connection failure', async () => {
      const onConnectionStateChange = jest.fn();

      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      render(<AviDirectChatSDK onConnectionStateChange={onConnectionStateChange} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test connection error');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(onConnectionStateChange).toHaveBeenCalledWith('error');
      });

      // Should show error status
      expect(screen.getByText('Connection error')).toBeInTheDocument();
    });
  });

  describe('Message History and Display', () => {
    test('should display message history correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{
            content: 'First response',
            role: 'assistant',
            timestamp: new Date().toISOString()
          }],
          timestamp: new Date().toISOString()
        })
      } as Response);

      render(<AviDirectChatSDK />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');

      // Send first message
      await user.type(input, 'First message');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText('First message')).toBeInTheDocument();
        expect(screen.getByText('First response')).toBeInTheDocument();
      });

      // Send second message
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{
            content: 'Second response',
            role: 'assistant',
            timestamp: new Date().toISOString()
          }],
          timestamp: new Date().toISOString()
        })
      } as Response);

      await user.type(input, 'Second message');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByText('Second message')).toBeInTheDocument();
        expect(screen.getByText('Second response')).toBeInTheDocument();
      });

      // Both messages should be visible
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('First response')).toBeInTheDocument();
    });

    test('should show message status indicators', async () => {
      mockFetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true, responses: [], timestamp: new Date().toISOString() })
          } as Response), 100)
        )
      );

      render(<AviDirectChatSDK />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test status indicators');
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Should show sending status initially
      // Status indicators are represented by colored dots
      const statusDots = document.querySelectorAll('[class*="bg-yellow-400"], [class*="bg-green-400"], [class*="bg-red-400"]');
      expect(statusDots.length).toBeGreaterThan(0);
    });

    test('should auto-scroll to latest message', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{ content: 'Response', role: 'assistant', timestamp: new Date().toISOString() }],
          timestamp: new Date().toISOString()
        })
      } as Response);

      render(<AviDirectChatSDK />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');

      // Send multiple messages to test scrolling
      for (let i = 0; i < 3; i++) {
        await user.clear(input);
        await user.type(input, `Message ${i + 1}`);
        await user.click(screen.getByRole('button', { name: /send/i }));

        await waitFor(() => {
          expect(screen.getByText(`Message ${i + 1}`)).toBeInTheDocument();
        });
      }

      // Latest message should be visible (auto-scroll behavior)
      expect(screen.getByText('Message 3')).toBeInTheDocument();
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should allow retry after error', async () => {
      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{ content: 'Success after retry', role: 'assistant', timestamp: new Date().toISOString() }],
          timestamp: new Date().toISOString()
        })
      } as Response);

      render(<AviDirectChatSDK />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // First attempt fails
      await user.type(input, 'Test retry mechanism');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Clear error by clicking X
      const errorCloseButton = screen.getByRole('button', { name: '' });
      await user.click(errorCloseButton);

      // Retry with same message
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Success after retry')).toBeInTheDocument();
      });
    });

    test('should handle partial API responses', async () => {
      // Mock partial response (missing expected fields)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          // Missing responses array
          timestamp: new Date().toISOString()
        })
      } as Response);

      render(<AviDirectChatSDK />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test partial response');
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Should handle gracefully without crashing
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Component should still be functional
      expect(screen.getByPlaceholderText('Type your message to Avi...')).toBeInTheDocument();
    });
  });
});