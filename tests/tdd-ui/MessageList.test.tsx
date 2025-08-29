import React from 'react';
import { render, screen, fireEvent, waitFor, within } from './utils/test-utils';
import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { MessageList } from '@/components/MessageList';
import { createMockMessage, createMockSSEStream } from './utils/test-utils';

// London School TDD - MessageList Component Testing
describe('MessageList - Professional Message Display Component', () => {
  // Mock dependencies
  const mockOnMessageAction = jest.fn();
  const mockOnLoadMore = jest.fn();
  const mockOnRetry = jest.fn();
  const mockSSE = createMockSSEStream();

  const defaultProps = {
    messages: [],
    isStreaming: false,
    isLoading: false,
    hasMore: false,
    onMessageAction: mockOnMessageAction,
    onLoadMore: mockOnLoadMore,
    onRetry: mockOnRetry,
    sseConnection: mockSSE.eventSource
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Message Rendering and Professional Styling', () => {
    it('should render empty state with professional styling', () => {
      render(<MessageList {...defaultProps} />);
      
      const emptyState = screen.getByTestId('empty-messages');
      
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveClass('empty-messages', 'empty-messages--professional');
      expect(emptyState).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
        textAlign: 'center',
        color: '#6b7280'
      });
      
      const emptyIcon = screen.getByTestId('empty-messages-icon');
      const emptyText = screen.getByTestId('empty-messages-text');
      
      expect(emptyIcon).toHaveClass('empty-icon');
      expect(emptyText).toHaveTextContent('No messages yet. Start a conversation!');
    });

    it('should render message list with professional container styling', () => {
      const messages = [createMockMessage({ id: '1' })];
      
      render(<MessageList {...defaultProps} messages={messages} />);
      
      const messagesList = screen.getByTestId('messages-list');
      
      expect(messagesList).toHaveClass('messages-list', 'messages-list--professional');
      expect(messagesList).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1rem',
        overflowY: 'auto',
        maxHeight: '600px',
        scrollBehavior: 'smooth'
      });
    });

    it('should apply virtualization for large message lists', () => {
      const largeMessageList = Array.from({ length: 500 }, (_, i) =>
        createMockMessage({ id: `msg-${i}`, content: `Message ${i}` })
      );
      
      render(<MessageList {...defaultProps} messages={largeMessageList} />);
      
      const virtualizedContainer = screen.getByTestId('virtualized-messages');
      
      expect(virtualizedContainer).toHaveClass('virtualized-container');
      expect(virtualizedContainer).toHaveAttribute('data-virtualized', 'true');
      
      // Only a subset should be rendered in DOM
      const renderedMessages = screen.getAllByTestId(/^message-/);
      expect(renderedMessages.length).toBeLessThan(largeMessageList.length);
      expect(renderedMessages.length).toBeGreaterThan(0);
    });

    it('should group consecutive messages from same sender', () => {
      const messages = [
        createMockMessage({ id: '1', role: 'user', content: 'First message' }),
        createMockMessage({ id: '2', role: 'user', content: 'Second message' }),
        createMockMessage({ id: '3', role: 'user', content: 'Third message' }),
        createMockMessage({ id: '4', role: 'assistant', content: 'Response' })
      ];
      
      render(<MessageList {...defaultProps} messages={messages} />);
      
      const userGroup = screen.getByTestId('message-group-user');
      const assistantGroup = screen.getByTestId('message-group-assistant');
      
      expect(userGroup).toHaveClass('message-group', 'message-group--user');
      expect(within(userGroup).getAllByTestId(/^message-/)).toHaveLength(3);
      
      expect(assistantGroup).toHaveClass('message-group', 'message-group--assistant');
      expect(within(assistantGroup).getAllByTestId(/^message-/)).toHaveLength(1);
    });
  });

  describe('Streaming Mock Integration', () => {
    it('should display streaming indicator during message streaming', () => {
      render(<MessageList {...defaultProps} isStreaming={true} />);
      
      const streamingIndicator = screen.getByTestId('streaming-indicator');
      
      expect(streamingIndicator).toBeInTheDocument();
      expect(streamingIndicator).toHaveClass('streaming-indicator', 'streaming-indicator--active');
      expect(streamingIndicator).toHaveStyle({
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '0.5rem',
        margin: '0 1rem 1rem'
      });
      
      const dots = within(streamingIndicator).getAllByTestId('streaming-dot');
      expect(dots).toHaveLength(3);
      
      dots.forEach((dot, index) => {
        expect(dot).toHaveStyle({
          width: '6px',
          height: '6px',
          backgroundColor: '#6366f1',
          borderRadius: '50%',
          animation: `streamingPulse 1.4s ease-in-out ${index * 0.16}s infinite both`
        });
      });
    });

    it('should handle streaming message updates', async () => {
      const streamingMessage = createMockMessage({
        id: 'streaming-msg',
        content: 'Partial response...',
        role: 'assistant',
        streaming: true
      });
      
      const { rerender } = render(
        <MessageList {...defaultProps} messages={[streamingMessage]} isStreaming={true} />
      );
      
      const messageBubble = screen.getByTestId('message-streaming-msg');
      
      expect(messageBubble).toHaveClass('message-bubble--streaming');
      expect(messageBubble).toHaveStyle({
        borderBottomRightRadius: '0.25rem',
        position: 'relative'
      });
      
      const streamingCursor = within(messageBubble).getByTestId('streaming-cursor');
      expect(streamingCursor).toHaveStyle({
        animation: 'blink 1s infinite'
      });
      
      // Update with more content
      const updatedMessage = {
        ...streamingMessage,
        content: 'Partial response... and more content'
      };
      
      rerender(
        <MessageList {...defaultProps} messages={[updatedMessage]} isStreaming={true} />
      );
      
      expect(messageBubble).toHaveTextContent('Partial response... and more content');
    });

    it('should complete streaming transition smoothly', async () => {
      const streamingMessage = createMockMessage({
        id: 'streaming-msg',
        content: 'Complete response',
        role: 'assistant',
        streaming: true
      });
      
      const { rerender } = render(
        <MessageList {...defaultProps} messages={[streamingMessage]} isStreaming={true} />
      );
      
      const messageBubble = screen.getByTestId('message-streaming-msg');
      expect(messageBubble).toHaveClass('message-bubble--streaming');
      
      // Complete streaming
      const completedMessage = {
        ...streamingMessage,
        streaming: false,
        status: 'sent'
      };
      
      rerender(
        <MessageList {...defaultProps} messages={[completedMessage]} isStreaming={false} />
      );
      
      await waitFor(() => {
        expect(messageBubble).toHaveClass('message-bubble--completed');
        expect(messageBubble).not.toHaveClass('message-bubble--streaming');
        expect(messageBubble).toHaveStyle({
          borderBottomRightRadius: '1rem'
        });
      });
    });

    it('should mock SSE connection for streaming updates', () => {
      render(<MessageList {...defaultProps} isStreaming={true} />);
      
      expect(mockSSE.eventSource.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
      
      // Simulate streaming data
      const streamingData = {
        type: 'message_delta',
        messageId: 'streaming-msg',
        delta: 'new content chunk'
      };
      
      mockSSE.simulateMessage(streamingData);
      
      // Verify the message handler was called
      const messageHandler = mockSSE.eventSource.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1];
      
      expect(messageHandler).toBeDefined();
    });
  });

  describe('Message Status and Visual Feedback', () => {
    it('should display message status indicators correctly', () => {
      const messages = [
        createMockMessage({ id: '1', status: 'sending' }),
        createMockMessage({ id: '2', status: 'sent' }),
        createMockMessage({ id: '3', status: 'failed' }),
        createMockMessage({ id: '4', status: 'delivered' })
      ];
      
      render(<MessageList {...defaultProps} messages={messages} />);
      
      const sendingStatus = screen.getByTestId('message-status-1');
      const sentStatus = screen.getByTestId('message-status-2');
      const failedStatus = screen.getByTestId('message-status-3');
      const deliveredStatus = screen.getByTestId('message-status-4');
      
      expect(sendingStatus).toHaveClass('message-status--sending');
      expect(sentStatus).toHaveClass('message-status--sent');
      expect(failedStatus).toHaveClass('message-status--failed');
      expect(deliveredStatus).toHaveClass('message-status--delivered');
    });

    it('should display retry button for failed messages', async () => {
      const user = userEvent.setup();
      const failedMessage = createMockMessage({
        id: 'failed-msg',
        status: 'failed',
        error: 'Network timeout'
      });
      
      render(<MessageList {...defaultProps} messages={[failedMessage]} />);
      
      const retryButton = screen.getByTestId('retry-message-failed-msg');
      
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveClass('retry-button', 'retry-button--professional');
      expect(retryButton).toHaveAttribute('aria-label', 'Retry sending message');
      
      await user.click(retryButton);
      
      expect(mockOnRetry).toHaveBeenCalledWith('failed-msg');
    });

    it('should animate message status changes', async () => {
      const message = createMockMessage({ id: '1', status: 'sending' });
      const { rerender } = render(<MessageList {...defaultProps} messages={[message]} />);
      
      const statusIndicator = screen.getByTestId('message-status-1');
      expect(statusIndicator).toHaveClass('message-status--sending');
      
      const updatedMessage = { ...message, status: 'sent' };
      rerender(<MessageList {...defaultProps} messages={[updatedMessage]} />);
      
      await waitFor(() => {
        expect(statusIndicator).toHaveClass('message-status--sent');
        expect(statusIndicator).toHaveStyle({
          transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)'
        });
      });
    });

    it('should display timestamps with proper formatting', () => {
      const messages = [
        createMockMessage({
          id: '1',
          timestamp: '2024-01-15T09:30:00Z',
          content: 'Morning message'
        }),
        createMockMessage({
          id: '2',
          timestamp: '2024-01-15T14:45:00Z',
          content: 'Afternoon message'
        })
      ];
      
      render(<MessageList {...defaultProps} messages={messages} />);
      
      const timestamp1 = screen.getByTestId('timestamp-1');
      const timestamp2 = screen.getByTestId('timestamp-2');
      
      expect(timestamp1).toHaveTextContent('9:30 AM');
      expect(timestamp2).toHaveTextContent('2:45 PM');
      
      expect(timestamp1).toHaveClass('message-timestamp');
      expect(timestamp1).toHaveStyle({
        fontSize: '0.75rem',
        color: '#6b7280',
        fontWeight: '400'
      });
    });
  });

  describe('Scroll Behavior and Load More Functionality', () => {
    it('should auto-scroll to bottom when new message arrives', async () => {
      const initialMessages = [createMockMessage({ id: '1' })];
      const { rerender } = render(<MessageList {...defaultProps} messages={initialMessages} />);
      
      const messagesList = screen.getByTestId('messages-list');
      const scrollSpy = jest.spyOn(messagesList, 'scrollTo');
      
      const newMessages = [
        ...initialMessages,
        createMockMessage({ id: '2', content: 'New message' })
      ];
      
      rerender(<MessageList {...defaultProps} messages={newMessages} />);
      
      await waitFor(() => {
        expect(scrollSpy).toHaveBeenCalledWith({
          top: messagesList.scrollHeight,
          behavior: 'smooth'
        });
      });
    });

    it('should maintain scroll position when loading older messages', async () => {
      const user = userEvent.setup();
      const messages = Array.from({ length: 20 }, (_, i) =>
        createMockMessage({ id: `msg-${i}` })
      );
      
      render(<MessageList {...defaultProps} messages={messages} hasMore={true} />);
      
      const messagesList = screen.getByTestId('messages-list');
      messagesList.scrollTop = 100;
      
      const loadMoreButton = screen.getByTestId('load-more-messages');
      
      await user.click(loadMoreButton);
      
      expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
      
      // Scroll position should be preserved during load
      expect(messagesList.scrollTop).toBeGreaterThanOrEqual(100);
    });

    it('should display scroll to bottom button when user scrolls up', async () => {
      const messages = Array.from({ length: 50 }, (_, i) =>
        createMockMessage({ id: `msg-${i}` })
      );
      
      render(<MessageList {...defaultProps} messages={messages} />);
      
      const messagesList = screen.getByTestId('messages-list');
      
      // Simulate scrolling up
      fireEvent.scroll(messagesList, { target: { scrollTop: 100 } });
      
      await waitFor(() => {
        const scrollToBottomButton = screen.getByTestId('scroll-to-bottom');
        expect(scrollToBottomButton).toBeInTheDocument();
        expect(scrollToBottomButton).toHaveClass('scroll-to-bottom-button');
      });
    });

    it('should handle infinite scroll loading', async () => {
      const messages = Array.from({ length: 10 }, (_, i) =>
        createMockMessage({ id: `msg-${i}` })
      );
      
      render(<MessageList {...defaultProps} messages={messages} hasMore={true} />);
      
      const messagesList = screen.getByTestId('messages-list');
      
      // Scroll to top to trigger load more
      fireEvent.scroll(messagesList, { target: { scrollTop: 0 } });
      
      await waitFor(() => {
        expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Message Actions and Interactions', () => {
    it('should display message actions on hover', async () => {
      const user = userEvent.setup();
      const message = createMockMessage({ id: '1', role: 'assistant' });
      
      render(<MessageList {...defaultProps} messages={[message]} />);
      
      const messageBubble = screen.getByTestId('message-1');
      
      await user.hover(messageBubble);
      
      const messageActions = screen.getByTestId('message-actions-1');
      
      expect(messageActions).toBeInTheDocument();
      expect(messageActions).toHaveClass('message-actions', 'message-actions--visible');
      
      const copyButton = within(messageActions).getByTestId('copy-message');
      const shareButton = within(messageActions).getByTestId('share-message');
      
      expect(copyButton).toBeInTheDocument();
      expect(shareButton).toBeInTheDocument();
    });

    it('should handle copy message action', async () => {
      const user = userEvent.setup();
      const message = createMockMessage({
        id: '1',
        content: 'Message to copy',
        role: 'assistant'
      });
      
      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockImplementation(() => Promise.resolve())
        }
      });
      
      render(<MessageList {...defaultProps} messages={[message]} />);
      
      const messageBubble = screen.getByTestId('message-1');
      await user.hover(messageBubble);
      
      const copyButton = screen.getByTestId('copy-message');
      await user.click(copyButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Message to copy');
      
      // Verify feedback
      const copyFeedback = screen.getByTestId('copy-feedback');
      expect(copyFeedback).toHaveTextContent('Copied!');
    });

    it('should handle message selection for bulk actions', async () => {
      const user = userEvent.setup();
      const messages = [
        createMockMessage({ id: '1', content: 'First message' }),
        createMockMessage({ id: '2', content: 'Second message' })
      ];
      
      render(<MessageList {...defaultProps} messages={messages} />);
      
      const message1 = screen.getByTestId('message-1');
      const message2 = screen.getByTestId('message-2');
      
      // Select messages with Ctrl+click
      await user.click(message1, { ctrlKey: true });
      await user.click(message2, { ctrlKey: true });
      
      expect(message1).toHaveClass('message-bubble--selected');
      expect(message2).toHaveClass('message-bubble--selected');
      
      const bulkActions = screen.getByTestId('bulk-actions');
      expect(bulkActions).toBeInTheDocument();
    });
  });

  describe('Loading States and Error Handling', () => {
    it('should display loading skeleton while messages are loading', () => {
      render(<MessageList {...defaultProps} isLoading={true} />);
      
      const loadingSkeleton = screen.getByTestId('messages-loading-skeleton');
      
      expect(loadingSkeleton).toBeInTheDocument();
      expect(loadingSkeleton).toHaveClass('loading-skeleton');
      
      const skeletonItems = within(loadingSkeleton).getAllByTestId('skeleton-message');
      expect(skeletonItems).toHaveLength(3);
      
      skeletonItems.forEach(item => {
        expect(item).toHaveClass('skeleton-message');
        expect(item).toHaveStyle({
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite'
        });
      });
    });

    it('should handle message loading errors gracefully', () => {
      const error = {
        message: 'Failed to load messages',
        code: 'LOAD_ERROR'
      };
      
      render(<MessageList {...defaultProps} error={error} />);
      
      const errorDisplay = screen.getByTestId('messages-error');
      
      expect(errorDisplay).toHaveClass('messages-error');
      expect(errorDisplay).toHaveTextContent('Failed to load messages');
      
      const retryButton = screen.getByTestId('retry-load-messages');
      expect(retryButton).toBeInTheDocument();
    });

    it('should show connection status in message list', () => {
      render(<MessageList {...defaultProps} connectionStatus="reconnecting" />);
      
      const connectionBanner = screen.getByTestId('connection-banner');
      
      expect(connectionBanner).toHaveClass('connection-banner--reconnecting');
      expect(connectionBanner).toHaveTextContent('Reconnecting...');
      expect(connectionBanner).toHaveStyle({
        backgroundColor: '#fef3c7',
        color: '#92400e',
        padding: '0.5rem 1rem',
        textAlign: 'center',
        fontSize: '0.875rem'
      });
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA attributes for message list', () => {
      const messages = [
        createMockMessage({ id: '1', role: 'user' }),
        createMockMessage({ id: '2', role: 'assistant' })
      ];
      
      render(<MessageList {...defaultProps} messages={messages} />);
      
      const messagesList = screen.getByTestId('messages-list');
      
      expect(messagesList).toHaveAttribute('role', 'log');
      expect(messagesList).toHaveAttribute('aria-live', 'polite');
      expect(messagesList).toHaveAttribute('aria-label', 'Conversation messages');
    });

    it('should support keyboard navigation through messages', async () => {
      const user = userEvent.setup();
      const messages = [
        createMockMessage({ id: '1' }),
        createMockMessage({ id: '2' })
      ];
      
      render(<MessageList {...defaultProps} messages={messages} />);
      
      const message1 = screen.getByTestId('message-1');
      const message2 = screen.getByTestId('message-2');
      
      // Tab to first message
      await user.tab();
      expect(message1).toHaveFocus();
      
      // Arrow down to next message
      await user.keyboard('{ArrowDown}');
      expect(message2).toHaveFocus();
      
      // Arrow up to previous message
      await user.keyboard('{ArrowUp}');
      expect(message1).toHaveFocus();
    });

    it('should announce new messages to screen readers', async () => {
      const { rerender } = render(<MessageList {...defaultProps} messages={[]} />);
      
      const newMessage = createMockMessage({
        id: '1',
        content: 'New message arrived',
        role: 'assistant'
      });
      
      rerender(<MessageList {...defaultProps} messages={[newMessage]} />);
      
      await waitFor(() => {
        const liveRegion = screen.getByTestId('messages-live-region');
        expect(liveRegion).toHaveAttribute('aria-live', 'assertive');
        expect(liveRegion).toHaveTextContent('New message from assistant: New message arrived');
      });
    });

    it('should have no accessibility violations', async () => {
      const messages = [
        createMockMessage({ id: '1', role: 'user' }),
        createMockMessage({ id: '2', role: 'assistant' })
      ];
      
      const { container } = render(<MessageList {...defaultProps} messages={messages} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});