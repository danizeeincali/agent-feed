/**
 * Unit Tests for AviDirectChatSDK Component
 * SPARC Phase 4: Refinement - TDD Implementation
 *
 * Test Coverage:
 * - Component rendering and initialization
 * - Message processing and validation
 * - Image upload functionality
 * - Connection state management
 * - Error handling and recovery
 * - Keyboard shortcuts and accessibility
 * - Security validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AviDirectChatSDK } from '../../../../components/posting-interface/AviDirectChatSDK';

// Mock dependencies
jest.mock('../../../../utils/cn', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' ')
}));

jest.mock('../../../components/StreamingTicker', () => {
  return function MockStreamingTicker({ enabled, userId, className }: any) {
    return (
      <div data-testid="streaming-ticker" className={className}>
        {enabled ? `Active for ${userId}` : 'Inactive'}
      </div>
    );
  };
});

// Mock fetch API
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock FileReader
const mockFileReader = {
  readAsDataURL: jest.fn(),
  result: '',
  onload: null as any,
  onerror: null as any
};

(global as any).FileReader = jest.fn(() => mockFileReader);

describe('AviDirectChatSDK', () => {
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
    mockFileReader.readAsDataURL.mockReset();
  });

  describe('Component Rendering', () => {
    test('renders with initial state correctly', () => {
      render(<AviDirectChatSDK {...defaultProps} />);

      expect(screen.getByTestId('avi-chat-sdk')).toBeInTheDocument();
      expect(screen.getByTestId('avi-greeting')).toBeInTheDocument();
      expect(screen.getByText('Hello! I\'m Avi, your AI assistant')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type your message to Avi...')).toBeInTheDocument();
    });

    test('applies custom className', () => {
      render(<AviDirectChatSDK {...defaultProps} className="custom-class" />);

      const container = screen.getByTestId('avi-chat-sdk');
      expect(container).toHaveClass('custom-class');
    });

    test('displays connection status correctly', () => {
      render(<AviDirectChatSDK {...defaultProps} />);

      expect(screen.getByText('Ready to chat')).toBeInTheDocument();
      expect(screen.getByText('🔒 Claude Code SDK')).toBeInTheDocument();
    });

    test('shows streaming ticker when enabled', () => {
      render(<AviDirectChatSDK {...defaultProps} isLoading={true} />);

      const ticker = screen.getByTestId('streaming-ticker');
      expect(ticker).toBeInTheDocument();
    });

    test('renders all UI elements', () => {
      render(<AviDirectChatSDK {...defaultProps} />);

      // Header elements
      expect(screen.getByText('Avi AI Assistant')).toBeInTheDocument();

      // Input elements
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
      expect(screen.getByTitle('Add images')).toBeInTheDocument();
    });
  });

  describe('Message Handling', () => {
    test('sends text message successfully', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{ content: 'Hello! I can help you with that.' }]
        })
      });

      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'Hello Avi, can you help me?');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Hello Avi, can you help me?')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Hello! I can help you with that.')).toBeInTheDocument();
      });

      expect(defaultProps.onMessageSent).toHaveBeenCalledTimes(1);
      expect(defaultProps.onConnectionStateChange).toHaveBeenCalledWith('connected');
    });

    test('handles empty message validation', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toBeDisabled();

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, '   ');
      expect(sendButton).toBeDisabled();
    });

    test('clears input after sending message', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{ content: 'Response' }]
        })
      });

      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(input).toHaveValue('');
      });
    });

    test('displays error state on API failure', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/API request failed/)).toBeInTheDocument();
      });

      expect(defaultProps.onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('API request failed: 500')
        })
      );
    });

    test('handles network errors gracefully', async () => {
      const user = userEvent.setup();

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      expect(defaultProps.onError).toHaveBeenCalled();
    });

    test('updates message status indicators', async () => {
      const user = userEvent.setup();

      // Mock slow response
      mockFetch.mockImplementationOnce(() =>
        new Promise(resolve => {
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({
              success: true,
              responses: [{ content: 'Response' }]
            })
          }), 100);
        })
      );

      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Should show sending status initially
      await waitFor(() => {
        const messageElement = screen.getByText('Test message').closest('div');
        const statusIndicator = messageElement?.querySelector('.bg-yellow-400');
        expect(statusIndicator).toBeInTheDocument();
      });

      // Should update to sent status
      await waitFor(() => {
        const messageElement = screen.getByText('Test message').closest('div');
        const statusIndicator = messageElement?.querySelector('.bg-green-400');
        expect(statusIndicator).toBeInTheDocument();
      });
    });
  });

  describe('Image Upload Functionality', () => {
    test('handles valid image upload', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const file = new File(['image data'], 'test.png', { type: 'image/png' });
      const fileInput = screen.getByRole('button', { title: 'Add images' }).querySelector('input');

      // Mock FileReader success
      mockFileReader.readAsDataURL.mockImplementation(function() {
        this.result = 'data:image/png;base64,test-data';
        if (this.onload) this.onload();
      });

      await user.upload(fileInput!, file);

      expect(screen.getByText('test.png')).toBeInTheDocument();
    });

    test('validates image count limit', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const files = Array.from({ length: 6 }, (_, i) =>
        new File(['image data'], `test${i}.png`, { type: 'image/png' })
      );

      const fileInput = screen.getByRole('button', { title: 'Add images' }).querySelector('input');
      await user.upload(fileInput!, files);

      expect(screen.getByText('Maximum 5 images allowed')).toBeInTheDocument();
    });

    test('validates file type restriction', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const file = new File(['text data'], 'test.txt', { type: 'text/plain' });
      const fileInput = screen.getByRole('button', { title: 'Add images' }).querySelector('input');

      await user.upload(fileInput!, file);

      expect(screen.getByText('Only image files are allowed')).toBeInTheDocument();
    });

    test('removes selected images', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const file = new File(['image data'], 'test.png', { type: 'image/png' });
      const fileInput = screen.getByRole('button', { title: 'Add images' }).querySelector('input');

      // Mock FileReader success
      mockFileReader.readAsDataURL.mockImplementation(function() {
        this.result = 'data:image/png;base64,test-data';
        if (this.onload) this.onload();
      });

      await user.upload(fileInput!, file);
      expect(screen.getByText('test.png')).toBeInTheDocument();

      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);

      expect(screen.queryByText('test.png')).not.toBeInTheDocument();
    });

    test('sends message with images', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{ content: 'I can see the image.' }]
        })
      });

      render(<AviDirectChatSDK {...defaultProps} />);

      // Upload image
      const file = new File(['image data'], 'test.png', { type: 'image/png' });
      const fileInput = screen.getByRole('button', { title: 'Add images' }).querySelector('input');

      mockFileReader.readAsDataURL.mockImplementation(function() {
        this.result = 'data:image/png;base64,test-data';
        if (this.onload) this.onload();
      });

      await user.upload(fileInput!, file);

      // Send message
      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'What do you see?');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/claude-code/streaming-chat',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('data:image/png;base64,test-data')
          })
        );
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('sends message on Enter key', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{ content: 'Response' }]
        })
      });

      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test message{enter}');

      await waitFor(() => {
        expect(screen.getByText('Test message')).toBeInTheDocument();
      });
    });

    test('allows line break on Shift+Enter', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Line 1{shift}{enter}Line 2');

      expect(input).toHaveValue('Line 1\nLine 2');
    });

    test('prevents sending empty message with Enter', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, '{enter}');

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Connection State Management', () => {
    test('shows connecting state during message send', async () => {
      const user = userEvent.setup();

      // Mock slow response
      mockFetch.mockImplementationOnce(() =>
        new Promise(resolve => {
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true, responses: [] })
          }), 100);
        })
      );

      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      expect(screen.getByText('Connecting...')).toBeInTheDocument();
      expect(defaultProps.onConnectionStateChange).toHaveBeenCalledWith('connecting');

      await waitFor(() => {
        expect(screen.getByText('Connected securely')).toBeInTheDocument();
      });
    });

    test('shows error state on connection failure', async () => {
      const user = userEvent.setup();

      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Connection error')).toBeInTheDocument();
      });

      expect(defaultProps.onConnectionStateChange).toHaveBeenCalledWith('error');
    });

    test('recovers from error state on successful message', async () => {
      const user = userEvent.setup();

      // First request fails
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Connection error')).toBeInTheDocument();
      });

      // Second request succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{ content: 'Success' }]
        })
      });

      await user.clear(input);
      await user.type(input, 'Retry message');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Connected securely')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('displays and dismisses error messages', async () => {
      const user = userEvent.setup();

      mockFetch.mockRejectedValueOnce(new Error('Test error'));

      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });

      const dismissButton = screen.getByRole('button', { name: /close/i });
      await user.click(dismissButton);

      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });

    test('handles typing state correctly during errors', async () => {
      const user = userEvent.setup();

      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Should show typing state initially
      expect(screen.getByTestId('avi-chat-sdk')).toContainElement(
        screen.getByRole('button', { name: /loading/i })
      );

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /loading/i })).not.toBeInTheDocument();
      });
    });

    test('disables input during typing state', async () => {
      const user = userEvent.setup();

      // Mock slow response
      mockFetch.mockImplementationOnce(() =>
        new Promise(resolve => {
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ success: true, responses: [] })
          }), 100);
        })
      );

      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      expect(input).toBeDisabled();

      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA attributes', () => {
      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      expect(input).toHaveAttribute('aria-label');

      const sendButton = screen.getByRole('button', { name: /send/i });
      expect(sendButton).toHaveAttribute('aria-label');
    });

    test('manages focus correctly', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.click(input);
      expect(input).toHaveFocus();

      await user.tab();
      expect(screen.getByTitle('Add images')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /send/i })).toHaveFocus();
    });

    test('announces status changes to screen readers', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{ content: 'Response' }]
        })
      });

      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Status should be announced
      await waitFor(() => {
        expect(screen.getByText('Connected securely')).toBeInTheDocument();
      });
    });
  });

  describe('Security Validation', () => {
    test('sanitizes message content', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{ content: 'Safe response' }]
        })
      });

      render(<AviDirectChatSDK {...defaultProps} />);

      const maliciousInput = '<script>alert("xss")</script>';
      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, maliciousInput);

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Message should be displayed as text, not executed
      await waitFor(() => {
        const messageElement = screen.getByText(maliciousInput);
        expect(messageElement).toBeInTheDocument();
        expect(messageElement.innerHTML).not.toContain('<script');
      });
    });

    test('validates image file types', async () => {
      const user = userEvent.setup();
      render(<AviDirectChatSDK {...defaultProps} />);

      const maliciousFile = new File(['malicious content'], 'malware.exe', {
        type: 'application/x-executable'
      });

      const fileInput = screen.getByRole('button', { title: 'Add images' }).querySelector('input');
      await user.upload(fileInput!, maliciousFile);

      expect(screen.getByText('Only image files are allowed')).toBeInTheDocument();
    });

    test('prevents XSS in assistant responses', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{ content: '<script>alert("xss")</script>Malicious response' }]
        })
      });

      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      await waitFor(() => {
        const responseElement = screen.getByText(/Malicious response/);
        expect(responseElement).toBeInTheDocument();
        expect(responseElement.innerHTML).not.toContain('<script');
      });
    });
  });

  describe('Performance', () => {
    test('handles rapid message sending', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          responses: [{ content: 'Response' }]
        })
      });

      render(<AviDirectChatSDK {...defaultProps} />);

      const input = screen.getByPlaceholderText('Type your message to Avi...');
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Rapidly send multiple messages
      for (let i = 0; i < 5; i++) {
        await user.clear(input);
        await user.type(input, `Message ${i + 1}`);
        await user.click(sendButton);
      }

      // All messages should eventually appear
      await waitFor(() => {
        for (let i = 1; i <= 5; i++) {
          expect(screen.getByText(`Message ${i}`)).toBeInTheDocument();
        }
      });
    });

    test('cleans up resources on unmount', () => {
      const { unmount } = render(<AviDirectChatSDK {...defaultProps} />);

      // Verify component mounts successfully
      expect(screen.getByTestId('avi-chat-sdk')).toBeInTheDocument();

      // Unmount should not throw errors
      expect(() => unmount()).not.toThrow();
    });
  });
});