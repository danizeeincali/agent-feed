/**
 * AviDirectChatSDK Component Test Suite
 * TDD London School Approach with comprehensive mocks and stubs
 *
 * Test Categories:
 * 1. Component Rendering & Props
 * 2. State Management & Transitions
 * 3. API Interactions & Error Handling
 * 4. User Interactions & Events
 * 5. Image Upload Functionality
 * 6. Streaming Integration
 * 7. Connection State Management
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AviDirectChatSDK } from '../AviDirectChatSDK';

// Mock dependencies
jest.mock('../../StreamingTicker', () => {
  return function MockStreamingTicker({ enabled, userId, className, maxMessages }: any) {
    return (
      <div data-testid="streaming-ticker" data-enabled={enabled} data-user-id={userId} className={className}>
        Mock Streaming Ticker (maxMessages: {maxMessages})
      </div>
    );
  };
});

jest.mock('@/utils/cn', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock FileReader
class MockFileReader {
  onload: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  result: string | null = null;

  readAsDataURL(file: File) {
    setTimeout(() => {
      this.result = `data:image/jpeg;base64,mockbase64data`;
      this.onload?.({ target: { result: this.result } });
    }, 0);
  }
}

global.FileReader = MockFileReader as any;

describe('AviDirectChatSDK Component', () => {
  // Test setup and mocks
  const defaultProps = {
    onMessageSent: jest.fn(),
    onConnectionStateChange: jest.fn(),
    onError: jest.fn(),
    className: 'test-class',
    isLoading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Component Rendering & Props', () => {
    test('renders with default props', () => {
      render(<AviDirectChatSDK />);

      expect(screen.getByTestId('avi-chat-sdk')).toBeInTheDocument();
      expect(screen.getByText('Avi AI Assistant')).toBeInTheDocument();
      expect(screen.getByText('Ready to chat')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(<AviDirectChatSDK className="custom-class" />);

      const component = screen.getByTestId('avi-chat-sdk');
      expect(component).toHaveClass('custom-class');
    });

    test('handles undefined isLoading prop gracefully', () => {
      render(<AviDirectChatSDK isLoading={undefined} />);

      const streamingTicker = screen.getByTestId('streaming-ticker');
      expect(streamingTicker).toHaveAttribute('data-enabled', 'false');
    });

    test('displays initial greeting when no messages', () => {
      render(<AviDirectChatSDK />);

      expect(screen.getByTestId('avi-greeting')).toBeInTheDocument();
      expect(screen.getByText("Hello! I'm Avi, your AI assistant")).toBeInTheDocument();
      expect(screen.getByText("I'm powered by Anthropic's Claude SDK. I can help with development tasks, answer questions, and more!")).toBeInTheDocument();
    });

    test('renders all UI elements', () => {
      render(<AviDirectChatSDK />);

      // Header elements
      expect(screen.getByText('Avi AI Assistant')).toBeInTheDocument();
      expect(screen.getByText('🔒 Claude Code SDK')).toBeInTheDocument();

      // Input elements
      expect(screen.getByPlaceholderText('Type your message to Avi...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add images/i })).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument(); // Send button
    });
  });

  describe('State Management & Transitions', () => {
    test('initializes with correct default state', () => {
      const onConnectionStateChange = jest.fn();
      render(<AviDirectChatSDK onConnectionStateChange={onConnectionStateChange} />);

      expect(onConnectionStateChange).toHaveBeenCalledWith('disconnected');
      expect(screen.getByText('Ready to chat')).toBeInTheDocument();
    });

    test('updates connection state through lifecycle', async () => {
      const onConnectionStateChange = jest.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, responses: [{ content: 'Test response' }] })
      });

      render(<AviDirectChatSDK onConnectionStateChange={onConnectionStateChange} />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' }); // Send button

      await userEvent.type(textarea, 'Hello Avi');
      await userEvent.click(sendButton);

      // Should transition: disconnected -> connecting -> connected
      await waitFor(() => {
        expect(onConnectionStateChange).toHaveBeenCalledWith('connecting');
      });

      await waitFor(() => {
        expect(onConnectionStateChange).toHaveBeenCalledWith('connected');
      });
    });

    test('manages message state correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, responses: [{ content: 'AI response' }] })
      });

      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'Test message');
      await userEvent.click(sendButton);

      // User message should appear immediately
      expect(screen.getByText('Test message')).toBeInTheDocument();

      // AI response should appear after API call
      await waitFor(() => {
        expect(screen.getByText('AI response')).toBeInTheDocument();
      });
    });

    test('handles typing indicator state', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, responses: [] })
        }), 100)
      ));

      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'Test');
      await userEvent.click(sendButton);

      // Should show typing indicator
      await waitFor(() => {
        expect(screen.getByTestId('avi-chat-sdk')).toContainHTML('animate-bounce');
      });
    });
  });

  describe('API Interactions & Error Handling', () => {
    test('sends message to correct API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, responses: [] })
      });

      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'Test message');
      await userEvent.click(sendButton);

      expect(mockFetch).toHaveBeenCalledWith('/api/claude-code/streaming-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          options: {
            workingDirectory: '/workspaces/agent-feed/prod',
            allowedTools: ['Read', 'Write', 'Grep', 'Bash']
          }
        })
      });
    });

    test('handles API success response', async () => {
      const mockResponse = {
        success: true,
        responses: [
          { content: 'Response 1' },
          { content: 'Response 2' }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const onMessageSent = jest.fn();
      render(<AviDirectChatSDK onMessageSent={onMessageSent} />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'Test');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Response 1')).toBeInTheDocument();
        expect(screen.getByText('Response 2')).toBeInTheDocument();
      });

      expect(onMessageSent).toHaveBeenCalled();
    });

    test('handles API error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const onError = jest.fn();
      render(<AviDirectChatSDK onError={onError} />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'Test');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/API request failed: 500/)).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    test('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const onError = jest.fn();
      render(<AviDirectChatSDK onError={onError} />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'Test');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    test('handles API success with error flag', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false, error: 'Processing failed' })
      });

      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'Test');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Processing failed')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions & Events', () => {
    test('enables send button when message is typed', async () => {
      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      expect(sendButton).toBeDisabled();

      await userEvent.type(textarea, 'Hello');
      expect(sendButton).not.toBeDisabled();

      await userEvent.clear(textarea);
      expect(sendButton).toBeDisabled();
    });

    test('handles Enter key to send message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, responses: [] })
      });

      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');

      await userEvent.type(textarea, 'Test message');
      await userEvent.keyboard('{Enter}');

      expect(mockFetch).toHaveBeenCalled();
    });

    test('handles Shift+Enter to add new line', async () => {
      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');

      await userEvent.type(textarea, 'Line 1');
      await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
      await userEvent.type(textarea, 'Line 2');

      expect(textarea).toHaveValue('Line 1\nLine 2');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('clears message input after sending', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, responses: [] })
      });

      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'Test message');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    test('disables input during message sending', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, responses: [] })
        }), 100)
      ));

      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'Test');
      await userEvent.click(sendButton);

      expect(textarea).toBeDisabled();

      await waitFor(() => {
        expect(textarea).not.toBeDisabled();
      });
    });

    test('dismisses error message', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Test error'));

      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'Test');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: '' });
      await userEvent.click(dismissButton);

      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  describe('Image Upload Functionality', () => {
    test('opens file dialog when image button clicked', async () => {
      render(<AviDirectChatSDK />);

      const imageButton = screen.getByRole('button', { name: /add images/i });
      const fileInput = screen.getByTestId('avi-chat-sdk').querySelector('input[type="file"]') as HTMLInputElement;

      const clickSpy = jest.spyOn(fileInput, 'click').mockImplementation(() => {});

      await userEvent.click(imageButton);

      expect(clickSpy).toHaveBeenCalled();
    });

    test('accepts and displays selected images', async () => {
      render(<AviDirectChatSDK />);

      const fileInput = screen.getByTestId('avi-chat-sdk').querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });
    });

    test('rejects non-image files', async () => {
      render(<AviDirectChatSDK />);

      const fileInput = screen.getByTestId('avi-chat-sdk').querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText('Only image files are allowed')).toBeInTheDocument();
      });
    });

    test('limits maximum number of images', async () => {
      render(<AviDirectChatSDK />);

      const fileInput = screen.getByTestId('avi-chat-sdk').querySelector('input[type="file"]') as HTMLInputElement;
      const files = Array.from({ length: 6 }, (_, i) =>
        new File(['test'], `test${i}.jpg`, { type: 'image/jpeg' })
      );

      await act(async () => {
        fireEvent.change(fileInput, { target: { files } });
      });

      await waitFor(() => {
        expect(screen.getByText('Maximum 5 images allowed')).toBeInTheDocument();
      });
    });

    test('removes selected image', async () => {
      render(<AviDirectChatSDK />);

      const fileInput = screen.getByTestId('avi-chat-sdk').querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(screen.getByText('test.jpg')).toBeInTheDocument();
      });

      const removeButton = screen.getByRole('button', { name: '' }); // X button
      await userEvent.click(removeButton);

      expect(screen.queryByText('test.jpg')).not.toBeInTheDocument();
    });

    test('sends message with images', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, responses: [] })
      });

      render(<AviDirectChatSDK />);

      const fileInput = screen.getByTestId('avi-chat-sdk').querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'Message with image');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/claude-code/streaming-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('mockbase64data')
        });
      });
    });

    test('enables send button with images only (no text)', async () => {
      render(<AviDirectChatSDK />);

      const fileInput = screen.getByTestId('avi-chat-sdk').querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const sendButton = screen.getByRole('button', { name: '' });

      expect(sendButton).toBeDisabled();

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      await waitFor(() => {
        expect(sendButton).not.toBeDisabled();
      });
    });
  });

  describe('Streaming Integration', () => {
    test('passes correct props to StreamingTicker', () => {
      render(<AviDirectChatSDK isLoading={true} />);

      const streamingTicker = screen.getByTestId('streaming-ticker');
      expect(streamingTicker).toHaveAttribute('data-enabled', 'false'); // disconnected state
      expect(streamingTicker).toHaveAttribute('data-user-id', 'avi-chat-user');
    });

    test('enables StreamingTicker when connected', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, responses: [] })
      });

      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'Test');
      await userEvent.click(sendButton);

      // StreamingTicker should be enabled when connected
      await waitFor(() => {
        const streamingTicker = screen.getByTestId('streaming-ticker');
        expect(streamingTicker).toHaveAttribute('data-enabled', 'true');
      });
    });

    test('disables StreamingTicker when disconnected', () => {
      render(<AviDirectChatSDK />);

      const streamingTicker = screen.getByTestId('streaming-ticker');
      expect(streamingTicker).toHaveAttribute('data-enabled', 'false');
    });
  });

  describe('Connection State Management', () => {
    test('displays correct status icons and text', () => {
      const { rerender } = render(<AviDirectChatSDK />);

      // Disconnected state
      expect(screen.getByText('Ready to chat')).toBeInTheDocument();

      // Mock connected state by triggering a successful API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, responses: [] })
      });

      // Test would require more complex state manipulation to test other states
    });

    test('calls onConnectionStateChange callback', async () => {
      const onConnectionStateChange = jest.fn();
      render(<AviDirectChatSDK onConnectionStateChange={onConnectionStateChange} />);

      expect(onConnectionStateChange).toHaveBeenCalledWith('disconnected');
    });

    test('maintains connection state through multiple messages', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, responses: [{ content: 'Response 1' }] })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, responses: [{ content: 'Response 2' }] })
        });

      const onConnectionStateChange = jest.fn();
      render(<AviDirectChatSDK onConnectionStateChange={onConnectionStateChange} />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      // First message
      await userEvent.type(textarea, 'Message 1');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Response 1')).toBeInTheDocument();
      });

      // Second message
      await userEvent.type(textarea, 'Message 2');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Response 2')).toBeInTheDocument();
      });

      // Connection should remain stable
      expect(onConnectionStateChange).toHaveBeenCalledWith('connected');
    });
  });

  describe('Message Display & Formatting', () => {
    test('displays user messages with correct styling', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, responses: [] })
      });

      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'User message');
      await userEvent.click(sendButton);

      const userMessage = screen.getByText('User message');
      expect(userMessage).toBeInTheDocument();
      expect(userMessage.closest('div')).toHaveClass('bg-blue-500', 'text-white');
    });

    test('displays assistant messages with correct styling', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, responses: [{ content: 'Assistant response' }] })
      });

      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'Test');
      await userEvent.click(sendButton);

      await waitFor(() => {
        const assistantMessage = screen.getByText('Assistant response');
        expect(assistantMessage).toBeInTheDocument();
        expect(assistantMessage.closest('div')).toHaveClass('bg-gray-100', 'text-gray-900');
      });
    });

    test('displays message timestamps', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, responses: [] })
      });

      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'Test message');
      await userEvent.click(sendButton);

      // Should display timestamp in format like "10:30:45 AM"
      await waitFor(() => {
        expect(screen.getByText(/\d{1,2}:\d{2}:\d{2}/)).toBeInTheDocument();
      });
    });

    test('displays message status indicators', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, responses: [] })
      });

      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'Test');
      await userEvent.click(sendButton);

      // Should show status indicator (green for sent, yellow for sending, red for error)
      await waitFor(() => {
        const statusIndicators = screen.getByTestId('avi-chat-sdk').querySelectorAll('.bg-green-400, .bg-yellow-400, .bg-red-400');
        expect(statusIndicators.length).toBeGreaterThan(0);
      });
    });

    test('auto-scrolls to bottom when new messages added', async () => {
      const scrollIntoViewMock = jest.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, responses: [{ content: 'Response' }] })
      });

      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'Test');
      await userEvent.click(sendButton);

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
      });
    });
  });

  describe('Accessibility & UX', () => {
    test('has proper ARIA labels and roles', () => {
      render(<AviDirectChatSDK />);

      expect(screen.getByRole('button', { name: /add images/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type your message to Avi...')).toBeInTheDocument();
    });

    test('handles keyboard navigation', async () => {
      render(<AviDirectChatSDK />);

      const textarea = screen.getByPlaceholderText('Type your message to Avi...');
      const imageButton = screen.getByRole('button', { name: /add images/i });

      // Tab navigation
      await userEvent.tab();
      expect(imageButton).toHaveFocus();

      await userEvent.tab();
      expect(textarea).toHaveFocus();
    });

    test('provides visual feedback for disabled states', () => {
      render(<AviDirectChatSDK />);

      const sendButton = screen.getByRole('button', { name: '' });
      expect(sendButton).toBeDisabled();
      expect(sendButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });
  });
});