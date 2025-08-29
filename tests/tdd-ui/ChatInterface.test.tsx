import React from 'react';
import { render, screen, fireEvent, waitFor } from './utils/test-utils';
import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '@/components/ChatInterface';
import { createMockSSEStream, createMockMessage, createMockClaudeInstance } from './utils/test-utils';

// London School TDD - Mock-driven Chat Interface Testing
describe('ChatInterface - Professional Chat UI Component', () => {
  // Mock dependencies following London School approach
  const mockOnSendMessage = jest.fn();
  const mockOnClearChat = jest.fn();
  const mockOnExportChat = jest.fn();
  const mockSSE = createMockSSEStream();
  const mockClaudeInstance = createMockClaudeInstance();

  const defaultProps = {
    instanceId: 'test-instance-123',
    claudeInstance: mockClaudeInstance,
    messages: [],
    isStreaming: false,
    onSendMessage: mockOnSendMessage,
    onClearChat: mockOnClearChat,
    onExportChat: mockOnExportChat,
    sseConnection: mockSSE.eventSource
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Chat Container Styling and Layout', () => {
    it('should render chat interface with professional Claudable styling', () => {
      render(<ChatInterface {...defaultProps} />);
      
      const chatContainer = screen.getByTestId('chat-interface');
      
      expect(chatContainer).toBeInTheDocument();
      expect(chatContainer).toHaveClass('chat-interface', 'chat-interface--professional');
      expect(chatContainer).toHaveStyle({
        backgroundColor: '#ffffff',
        borderRadius: '0.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column'
      });
    });

    it('should apply responsive layout for different screen sizes', () => {
      render(<ChatInterface {...defaultProps} />);
      
      const chatContainer = screen.getByTestId('chat-interface');
      
      expect(chatContainer).toHaveStyle({
        width: '100%',
        maxWidth: '800px',
        margin: '0 auto'
      });
      
      // Test mobile responsive classes
      expect(chatContainer).toHaveClass('chat-interface--responsive');
    });

    it('should display header with connection status and controls', () => {
      render(<ChatInterface {...defaultProps} />);
      
      const header = screen.getByTestId('chat-header');
      
      expect(header).toHaveClass('chat-header');
      expect(header).toHaveStyle({
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f8fafc'
      });
    });
  });

  describe('Message Bubble Rendering and Styling', () => {
    it('should render user message with proper styling', () => {
      const userMessage = createMockMessage({
        role: 'user',
        content: 'Hello Claude!'
      });
      
      render(<ChatInterface {...defaultProps} messages={[userMessage]} />);
      
      const messageBubble = screen.getByTestId(`message-${userMessage.id}`);
      
      expect(messageBubble).toHaveClass('message-bubble', 'message-bubble--user');
      expect(messageBubble).toHaveStyle({
        backgroundColor: '#6366f1',
        color: '#ffffff',
        marginLeft: 'auto',
        marginRight: '0',
        maxWidth: '70%',
        padding: '0.75rem 1rem',
        borderRadius: '1rem 1rem 0.25rem 1rem'
      });
    });

    it('should render assistant message with different styling', () => {
      const assistantMessage = createMockMessage({
        role: 'assistant',
        content: 'Hello! How can I help you today?'
      });
      
      render(<ChatInterface {...defaultProps} messages={[assistantMessage]} />);
      
      const messageBubble = screen.getByTestId(`message-${assistantMessage.id}`);
      
      expect(messageBubble).toHaveClass('message-bubble', 'message-bubble--assistant');
      expect(messageBubble).toHaveStyle({
        backgroundColor: '#f3f4f6',
        color: '#1f2937',
        marginLeft: '0',
        marginRight: 'auto',
        borderRadius: '1rem 1rem 1rem 0.25rem'
      });
    });

    it('should display message timestamps with proper formatting', () => {
      const message = createMockMessage({
        timestamp: '2024-01-15T10:30:00Z'
      });
      
      render(<ChatInterface {...defaultProps} messages={[message]} />);
      
      const timestamp = screen.getByTestId(`timestamp-${message.id}`);
      
      expect(timestamp).toHaveClass('message-timestamp');
      expect(timestamp).toHaveStyle({
        fontSize: '0.75rem',
        color: '#6b7280',
        marginTop: '0.25rem'
      });
      expect(timestamp).toHaveTextContent('10:30 AM');
    });

    it('should group consecutive messages from same sender', () => {
      const messages = [
        createMockMessage({ id: '1', role: 'user', content: 'First message' }),
        createMockMessage({ id: '2', role: 'user', content: 'Second message' }),
        createMockMessage({ id: '3', role: 'assistant', content: 'Response' })
      ];
      
      render(<ChatInterface {...defaultProps} messages={messages} />);
      
      const messageGroup = screen.getByTestId('message-group-user');
      
      expect(messageGroup).toHaveClass('message-group');
      expect(messageGroup.children).toHaveLength(2);
    });
  });

  describe('SSE Streaming Integration', () => {
    it('should connect to SSE stream on mount', () => {
      render(<ChatInterface {...defaultProps} />);
      
      expect(mockSSE.eventSource.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
      expect(mockSSE.eventSource.addEventListener).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
      expect(mockSSE.eventSource.addEventListener).toHaveBeenCalledWith(
        'open',
        expect.any(Function)
      );
    });

    it('should handle streaming message updates', async () => {
      render(<ChatInterface {...defaultProps} isStreaming={true} />);
      
      const streamingData = {
        id: 'streaming-msg',
        content: 'This is a streaming response...',
        role: 'assistant',
        streaming: true
      };
      
      mockSSE.simulateMessage(streamingData);
      
      await waitFor(() => {
        const streamingMessage = screen.getByTestId('streaming-message');
        expect(streamingMessage).toBeInTheDocument();
        expect(streamingMessage).toHaveClass('message-bubble--streaming');
      });
    });

    it('should display streaming indicator with animation', () => {
      render(<ChatInterface {...defaultProps} isStreaming={true} />);
      
      const streamingIndicator = screen.getByTestId('streaming-indicator');
      
      expect(streamingIndicator).toHaveClass('streaming-indicator');
      expect(streamingIndicator).toHaveStyle({
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem'
      });
      
      const dots = screen.getAllByTestId('streaming-dot');
      expect(dots).toHaveLength(3);
      dots.forEach(dot => {
        expect(dot).toHaveStyle({
          animation: 'pulse 1.4s ease-in-out infinite both'
        });
      });
    });

    it('should handle SSE connection errors gracefully', async () => {
      render(<ChatInterface {...defaultProps} />);
      
      mockSSE.simulateError();
      
      await waitFor(() => {
        const errorMessage = screen.getByTestId('connection-error');
        expect(errorMessage).toBeInTheDocument();
        expect(errorMessage).toHaveClass('error-message');
        expect(errorMessage).toHaveTextContent(/connection error/i);
      });
    });

    it('should reconnect SSE on connection recovery', async () => {
      const { rerender } = render(<ChatInterface {...defaultProps} />);
      
      // Simulate error
      mockSSE.simulateError();
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-error')).toBeInTheDocument();
      });
      
      // Simulate recovery
      rerender(<ChatInterface {...defaultProps} />);
      mockSSE.simulateOpen();
      
      await waitFor(() => {
        expect(screen.queryByTestId('connection-error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Input Field Behavior and Professional Styling', () => {
    it('should render input field with professional styling', () => {
      render(<ChatInterface {...defaultProps} />);
      
      const inputField = screen.getByRole('textbox', { name: /type your message/i });
      
      expect(inputField).toHaveClass('message-input', 'message-input--professional');
      expect(inputField).toHaveStyle({
        border: '1px solid #e5e7eb',
        borderRadius: '0.375rem',
        padding: '0.75rem',
        fontSize: '1rem',
        lineHeight: '1.5',
        resize: 'vertical',
        minHeight: '44px'
      });
    });

    it('should handle input value changes', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);
      
      const inputField = screen.getByRole('textbox', { name: /type your message/i });
      
      await user.type(inputField, 'Hello Claude!');
      
      expect(inputField).toHaveValue('Hello Claude!');
    });

    it('should auto-resize input based on content', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);
      
      const inputField = screen.getByRole('textbox', { name: /type your message/i });
      
      const longMessage = 'This is a very long message that should cause the input field to expand vertically to accommodate multiple lines of text content.';
      
      await user.type(inputField, longMessage);
      
      expect(inputField).toHaveStyle({
        height: expect.stringMatching(/^\d+px$/),
        minHeight: '44px'
      });
    });

    it('should show character count for long messages', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);
      
      const inputField = screen.getByRole('textbox');
      const longMessage = 'x'.repeat(500);
      
      await user.type(inputField, longMessage);
      
      const characterCount = screen.getByTestId('character-count');
      expect(characterCount).toHaveTextContent('500');
      expect(characterCount).toHaveClass('character-count');
    });

    it('should handle keyboard shortcuts', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);
      
      const inputField = screen.getByRole('textbox');
      
      await user.type(inputField, 'Test message');
      
      // Test Cmd+Enter / Ctrl+Enter for send
      await user.keyboard('{Meta>}{Enter}{/Meta}');
      
      expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
      expect(inputField).toHaveValue('');
    });
  });

  describe('Real-time Message Updates and State Management', () => {
    it('should scroll to bottom when new message arrives', async () => {
      const messages = [createMockMessage({ id: '1' })];
      const { rerender } = render(<ChatInterface {...defaultProps} messages={messages} />);
      
      const messagesContainer = screen.getByTestId('messages-container');
      const scrollSpy = jest.spyOn(messagesContainer, 'scrollTo');
      
      const newMessages = [...messages, createMockMessage({ id: '2' })];
      rerender(<ChatInterface {...defaultProps} messages={newMessages} />);
      
      await waitFor(() => {
        expect(scrollSpy).toHaveBeenCalledWith({
          top: messagesContainer.scrollHeight,
          behavior: 'smooth'
        });
      });
    });

    it('should maintain scroll position when loading older messages', async () => {
      const messages = Array.from({ length: 20 }, (_, i) => 
        createMockMessage({ id: `msg-${i}` })
      );
      
      render(<ChatInterface {...defaultProps} messages={messages} />);
      
      const messagesContainer = screen.getByTestId('messages-container');
      messagesContainer.scrollTop = 100;
      
      const loadMoreButton = screen.getByTestId('load-more-messages');
      fireEvent.click(loadMoreButton);
      
      await waitFor(() => {
        expect(messagesContainer.scrollTop).toBeGreaterThan(100);
      });
    });

    it('should update message status in real-time', async () => {
      const message = createMockMessage({ id: '1', status: 'sending' });
      const { rerender } = render(<ChatInterface {...defaultProps} messages={[message]} />);
      
      let messageStatus = screen.getByTestId('message-status-1');
      expect(messageStatus).toHaveClass('status--sending');
      
      const updatedMessage = { ...message, status: 'sent' };
      rerender(<ChatInterface {...defaultProps} messages={[updatedMessage]} />);
      
      await waitFor(() => {
        messageStatus = screen.getByTestId('message-status-1');
        expect(messageStatus).toHaveClass('status--sent');
      });
    });

    it('should handle message retry for failed messages', async () => {
      const user = userEvent.setup();
      const failedMessage = createMockMessage({ id: '1', status: 'failed' });
      
      render(<ChatInterface {...defaultProps} messages={[failedMessage]} />);
      
      const retryButton = screen.getByTestId('retry-message-1');
      
      await user.click(retryButton);
      
      expect(mockOnSendMessage).toHaveBeenCalledWith(
        failedMessage.content,
        { retry: true, originalId: '1' }
      );
    });
  });

  describe('Connection Status and Error States', () => {
    it('should display connection status indicator', () => {
      render(<ChatInterface {...defaultProps} />);
      
      const statusIndicator = screen.getByTestId('connection-status-indicator');
      
      expect(statusIndicator).toHaveClass('status-indicator--connected');
      expect(statusIndicator).toHaveStyle({
        backgroundColor: '#10b981',
        borderRadius: '50%',
        width: '8px',
        height: '8px'
      });
    });

    it('should show offline state when disconnected', () => {
      const disconnectedInstance = { ...mockClaudeInstance, isConnected: false };
      
      render(<ChatInterface {...defaultProps} claudeInstance={disconnectedInstance} />);
      
      const statusIndicator = screen.getByTestId('connection-status-indicator');
      const offlineMessage = screen.getByTestId('offline-message');
      
      expect(statusIndicator).toHaveClass('status-indicator--disconnected');
      expect(offlineMessage).toBeInTheDocument();
      expect(offlineMessage).toHaveTextContent(/currently offline/i);
    });

    it('should disable input when disconnected', () => {
      const disconnectedInstance = { ...mockClaudeInstance, isConnected: false };
      
      render(<ChatInterface {...defaultProps} claudeInstance={disconnectedInstance} />);
      
      const inputField = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      expect(inputField).toBeDisabled();
      expect(sendButton).toBeDisabled();
    });

    it('should handle network errors with retry mechanism', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);
      
      const inputField = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      // Mock network error
      mockOnSendMessage.mockRejectedValueOnce(new Error('Network error'));
      
      await user.type(inputField, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        const errorMessage = screen.getByTestId('network-error');
        const retryButton = screen.getByTestId('retry-network');
        
        expect(errorMessage).toBeInTheDocument();
        expect(retryButton).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    it('should have proper ARIA attributes', () => {
      render(<ChatInterface {...defaultProps} />);
      
      const chatInterface = screen.getByTestId('chat-interface');
      const messagesContainer = screen.getByTestId('messages-container');
      const inputField = screen.getByRole('textbox');
      
      expect(chatInterface).toHaveAttribute('role', 'application');
      expect(chatInterface).toHaveAttribute('aria-label', 'Chat with Claude');
      
      expect(messagesContainer).toHaveAttribute('role', 'log');
      expect(messagesContainer).toHaveAttribute('aria-live', 'polite');
      expect(messagesContainer).toHaveAttribute('aria-label', 'Chat messages');
      
      expect(inputField).toHaveAttribute('aria-label', 'Type your message to Claude');
      expect(inputField).toHaveAttribute('aria-describedby', 'input-help');
    });

    it('should support keyboard navigation through messages', async () => {
      const user = userEvent.setup();
      const messages = [
        createMockMessage({ id: '1', content: 'First message' }),
        createMockMessage({ id: '2', content: 'Second message' })
      ];
      
      render(<ChatInterface {...defaultProps} messages={messages} />);
      
      // Focus first message
      await user.tab();
      expect(screen.getByTestId('message-1')).toHaveFocus();
      
      // Navigate to next message
      await user.keyboard('{ArrowDown}');
      expect(screen.getByTestId('message-2')).toHaveFocus();
      
      // Navigate back
      await user.keyboard('{ArrowUp}');
      expect(screen.getByTestId('message-1')).toHaveFocus();
    });

    it('should announce new messages to screen readers', async () => {
      const { rerender } = render(<ChatInterface {...defaultProps} messages={[]} />);
      
      const newMessage = createMockMessage({
        id: '1',
        content: 'New message from Claude',
        role: 'assistant'
      });
      
      rerender(<ChatInterface {...defaultProps} messages={[newMessage]} />);
      
      await waitFor(() => {
        const announcement = screen.getByTestId('sr-announcement');
        expect(announcement).toHaveAttribute('aria-live', 'assertive');
        expect(announcement).toHaveTextContent('New message from Claude: New message from Claude');
      });
    });

    it('should have no accessibility violations', async () => {
      const { container } = render(<ChatInterface {...defaultProps} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Professional UI Interactions and Animations', () => {
    it('should animate message appearance', async () => {
      const { rerender } = render(<ChatInterface {...defaultProps} messages={[]} />);
      
      const newMessage = createMockMessage({ id: '1' });
      rerender(<ChatInterface {...defaultProps} messages={[newMessage]} />);
      
      const messageBubble = screen.getByTestId('message-1');
      
      expect(messageBubble).toHaveClass('message-bubble--entering');
      expect(messageBubble).toHaveStyle({
        animation: 'messageSlideIn 250ms cubic-bezier(0.4, 0, 0.2, 1) forwards'
      });
    });

    it('should provide visual feedback for user actions', async () => {
      const user = userEvent.setup();
      render(<ChatInterface {...defaultProps} />);
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.hover(sendButton);
      
      expect(sendButton).toHaveClass('send-button--hover');
      expect(sendButton).toHaveStyle({
        transform: 'scale(1.05)',
        transition: 'transform 150ms cubic-bezier(0, 0, 0.2, 1)'
      });
    });

    it('should handle smooth scrolling animations', async () => {
      const messages = Array.from({ length: 10 }, (_, i) => 
        createMockMessage({ id: `msg-${i}` })
      );
      
      render(<ChatInterface {...defaultProps} messages={messages} />);
      
      const scrollToBottomButton = screen.getByTestId('scroll-to-bottom');
      fireEvent.click(scrollToBottomButton);
      
      const messagesContainer = screen.getByTestId('messages-container');
      expect(messagesContainer.scrollTo).toHaveBeenCalledWith({
        top: messagesContainer.scrollHeight,
        behavior: 'smooth'
      });
    });
  });
});