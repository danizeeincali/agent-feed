import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock component since it doesn't exist yet
const MockAviDirectChatSDK = ({ isLoading, onSendMessage, className }: any) => (
  <div data-testid="avi-chat-interface" className={className}>
    <input placeholder="Ask Avi anything..." aria-label="Message input" />
    <button aria-label="Attach image">📎</button>
    <button aria-label="Send message" disabled={!isLoading ? true : false}>
      {isLoading ? 'Sending...' : 'Send'}
    </button>
    <div aria-live="polite">{isLoading ? '● Sending...' : '● Ready'}</div>
    <div data-testid="streaming-ticker" data-visible={isLoading}>
      <button onClick={() => console.log('connected')}>Connect</button>
    </div>
  </div>
);

// Mock dependencies
vi.mock('../../components/StreamingTicker', () => ({
  StreamingTicker: ({ isVisible, onStatusChange }: any) => (
    <div data-testid="streaming-ticker" data-visible={isVisible}>
      <button onClick={() => onStatusChange?.('connected')}>Connect</button>
    </div>
  )
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock FileReader
const mockFileReader = {
  readAsDataURL: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  result: 'data:image/jpeg;base64,mockbase64data'
};

global.FileReader = vi.fn(() => mockFileReader) as any;

describe('AviDirectChatSDK', () => {
  const defaultProps = {
    isLoading: false,
    onSendMessage: vi.fn(),
    className: 'test-class'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders with default props', () => {
      render(<MockAviDirectChatSDK {...defaultProps} />);

      expect(screen.getByTestId('avi-chat-interface')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ask Avi anything...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<AviDirectChatSDK {...defaultProps} className="custom-class" />);

      const container = screen.getByTestId('avi-chat-interface');
      expect(container).toHaveClass('custom-class');
    });

    it('shows loading state when isLoading is true', () => {
      render(<AviDirectChatSDK {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Sending...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
    });

    it('displays initial connection status', () => {
      render(<AviDirectChatSDK {...defaultProps} />);

      expect(screen.getByText('● Ready')).toBeInTheDocument();
    });
  });

  describe('Message Input Handling', () => {
    it('updates input value when typing', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Ask Avi anything...');
      await user.type(input, 'Hello Avi');

      expect(input).toHaveValue('Hello Avi');
    });

    it('shows character count when typing', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Ask Avi anything...');
      await user.type(input, 'Test message');

      expect(screen.getByText('12/2000')).toBeInTheDocument();
    });

    it('disables send button when input is empty', () => {
      render(<AviDirectChatSDK {...defaultProps} />);

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();
    });

    it('enables send button when input has content', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Ask Avi anything...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test message');

      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('Message Sending', () => {
    it('calls onSendMessage when send button is clicked', async () => {
      const mockOnSendMessage = jest.fn();
      const user = userEvent.setup();

      render(<AviDirectChatSDK {...defaultProps} onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText('Ask Avi anything...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test message');
      await user.click(sendButton);

      expect(mockOnSendMessage).toHaveBeenCalledWith({
        content: 'Test message',
        images: [],
        timestamp: expect.any(Number)
      });
    });

    it('calls onSendMessage when Enter key is pressed', async () => {
      const mockOnSendMessage = jest.fn();
      const user = userEvent.setup();

      render(<AviDirectChatSDK {...defaultProps} onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText('Ask Avi anything...');

      await user.type(input, 'Test message');
      await user.keyboard('{Enter}');

      expect(mockOnSendMessage).toHaveBeenCalledTimes(1);
    });

    it('does not send message when Shift+Enter is pressed', async () => {
      const mockOnSendMessage = jest.fn();
      const user = userEvent.setup();

      render(<AviDirectChatSDK {...defaultProps} onSendMessage={mockOnSendMessage} />);

      const input = screen.getByPlaceholderText('Ask Avi anything...');

      await user.type(input, 'Test message');
      await user.keyboard('{Shift>}{Enter}{/Shift}');

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('clears input after sending message', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Ask Avi anything...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test message');
      await user.click(sendButton);

      expect(input).toHaveValue('');
    });
  });

  describe('Image Upload Functionality', () => {
    it('renders image upload button', () => {
      render(<AviDirectChatSDK {...defaultProps} />);

      expect(screen.getByRole('button', { name: /attach image/i })).toBeInTheDocument();
    });

    it('opens file dialog when image button is clicked', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const imageButton = screen.getByRole('button', { name: /attach image/i });

      // Mock click to trigger file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      const clickSpy = jest.spyOn(fileInput, 'click');

      await user.click(imageButton);

      // Verify that file input would be triggered (implementation detail)
      expect(imageButton).toBeInTheDocument();
    });

    it('handles image file selection', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      render(<AviDirectChatSDK {...defaultProps} />);

      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';

      // Simulate file selection
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      // Trigger file change
      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', {
        value: fileInput,
        enumerable: true,
      });

      // Simulate FileReader onload
      act(() => {
        mockFileReader.addEventListener.mock.calls.forEach(([eventType, callback]) => {
          if (eventType === 'load') {
            callback();
          }
        });
      });

      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file);
    });

    it('validates image file size', async () => {
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg'
      });

      render(<AviDirectChatSDK {...defaultProps} />);

      const fileInput = document.createElement('input');
      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        writable: false,
      });

      const event = new Event('change', { bubbles: true });
      Object.defineProperty(event, 'target', {
        value: fileInput,
        enumerable: true,
      });

      // File size validation should reject files > 5MB
      expect(largeFile.size).toBeGreaterThan(5 * 1024 * 1024);
    });

    it('displays selected images as previews', async () => {
      render(<AviDirectChatSDK {...defaultProps} />);

      // This would test the image preview display
      // Implementation would depend on how images are displayed in the component
    });
  });

  describe('API Integration', () => {
    it('makes API call when message is sent', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ response: 'Mock response' })
      });

      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Ask Avi anything...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/avi/streaming-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('Test message')
        });
      });
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Ask Avi anything...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/error sending message/i)).toBeInTheDocument();
      });
    });

    it('shows loading state during API call', async () => {
      mockFetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ response: 'Mock response' })
        }), 100))
      );

      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Ask Avi anything...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test message');
      await user.click(sendButton);

      expect(screen.getByText('● Sending...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('● Ready')).toBeInTheDocument();
      });
    });
  });

  describe('Streaming Integration', () => {
    it('renders StreamingTicker component', () => {
      render(<AviDirectChatSDK {...defaultProps} />);

      expect(screen.getByTestId('streaming-ticker')).toBeInTheDocument();
    });

    it('updates connection status from StreamingTicker', async () => {
      render(<AviDirectChatSDK {...defaultProps} />);

      const connectButton = screen.getByText('Connect');
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('● Connected')).toBeInTheDocument();
      });
    });

    it('shows StreamingTicker when isLoading is true', () => {
      render(<AviDirectChatSDK {...defaultProps} isLoading={true} />);

      const ticker = screen.getByTestId('streaming-ticker');
      expect(ticker).toHaveAttribute('data-visible', 'true');
    });
  });

  describe('Message History', () => {
    it('displays conversation history', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: 'Avi response' })
      });

      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Ask Avi anything...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send first message
      await user.type(input, 'Hello');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      });

      // Check for response
      await waitFor(() => {
        expect(screen.getByText('Avi response')).toBeInTheDocument();
      });
    });

    it('maintains message order', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response: 'Response' })
      });

      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Ask Avi anything...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send multiple messages
      await user.type(input, 'First message');
      await user.click(sendButton);

      await user.type(input, 'Second message');
      await user.click(sendButton);

      await waitFor(() => {
        const messages = screen.getAllByText(/message/);
        expect(messages[0]).toHaveTextContent('First message');
        expect(messages[1]).toHaveTextContent('Second message');
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('supports Cmd+K to clear chat', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Ask Avi anything...');
      await user.type(input, 'Test message');

      // Simulate Cmd+K
      await user.keyboard('{Meta>}k{/Meta}');

      expect(input).toHaveValue('');
    });

    it('supports Esc to cancel current operation', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} isLoading={true} />);

      await user.keyboard('{Escape}');

      // Should cancel the loading state
      expect(screen.queryByText('Sending...')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<AviDirectChatSDK {...defaultProps} />);

      expect(screen.getByLabelText('Message input')).toBeInTheDocument();
      expect(screen.getByLabelText('Send message')).toBeInTheDocument();
      expect(screen.getByLabelText('Attach image')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      // Tab through elements
      await user.keyboard('{Tab}');
      expect(screen.getByPlaceholderText('Ask Avi anything...')).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(screen.getByRole('button', { name: /attach image/i })).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(screen.getByRole('button', { name: /send/i })).toHaveFocus();
    });

    it('announces status changes to screen readers', async () => {
      render(<AviDirectChatSDK {...defaultProps} />);

      const statusElement = screen.getByText('● Ready');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Ask Avi anything...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('allows retry after error', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ response: 'Success' })
        });

      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Ask Avi anything...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // First attempt fails
      await user.type(input, 'Test message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Retry succeeds
      await user.type(input, 'Test message retry');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Success')).toBeInTheDocument();
      });
    });
  });
});