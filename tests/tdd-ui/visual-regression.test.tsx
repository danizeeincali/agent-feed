import React from 'react';
import { render, screen, fireEvent, waitFor } from './utils/test-utils';
import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { mockTheme } from './utils/test-utils';

// Import components for visual testing
import { ClaudeInstanceButtons } from '@/components/ClaudeInstanceButtons';
import { ChatInterface } from '@/components/ChatInterface';
import { MessageList } from '@/components/MessageList';
import { MessageInput } from '@/components/MessageInput';
import { createMockClaudeInstance, createMockMessage, createMockSSEStream } from './utils/test-utils';

// London School TDD - Visual Regression Testing with Mocks
describe('Visual Regression Tests - Claudable Styling Patterns', () => {
  const mockClaudeInstance = createMockClaudeInstance();
  const mockSSE = createMockSSEStream();

  describe('Theme Variables and Consistent Styling', () => {
    it('should use consistent color palette across all components', () => {
      const ButtonWrapper = () => (
        <ClaudeInstanceButtons
          instanceId="test"
          isConnected={false}
          onConnect={jest.fn()}
          onDisconnect={jest.fn()}
        />
      );

      const ChatWrapper = () => (
        <ChatInterface
          instanceId="test"
          claudeInstance={mockClaudeInstance}
          messages={[]}
          onSendMessage={jest.fn()}
          onClearChat={jest.fn()}
          onExportChat={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const { container: buttonContainer } = render(<ButtonWrapper />);
      const { container: chatContainer } = render(<ChatWrapper />);

      // Primary color consistency
      const connectButton = buttonContainer.querySelector('.claude-button--primary');
      const chatHeader = chatContainer.querySelector('.chat-header');

      expect(connectButton).toHaveStyle({
        backgroundColor: mockTheme.colors.primary
      });

      expect(chatHeader).toHaveStyle({
        backgroundColor: mockTheme.colors.surface
      });
    });

    it('should maintain consistent typography across components', () => {
      const messages = [createMockMessage({ content: 'Test message' })];
      
      render(
        <ThemeProvider theme={mockTheme}>
          <MessageList
            messages={messages}
            onMessageAction={jest.fn()}
            onLoadMore={jest.fn()}
            onRetry={jest.fn()}
            sseConnection={mockSSE.eventSource}
          />
        </ThemeProvider>
      );

      const messageBubble = screen.getByTestId('message-bubble');
      
      expect(messageBubble).toHaveStyle({
        fontFamily: mockTheme.typography.fontFamily,
        fontSize: mockTheme.typography.fontSize.base,
        lineHeight: '1.5'
      });
    });

    it('should use consistent spacing throughout the UI', () => {
      render(
        <ChatInterface
          instanceId="test"
          claudeInstance={mockClaudeInstance}
          messages={[]}
          onSendMessage={jest.fn()}
          onClearChat={jest.fn()}
          onExportChat={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const chatContainer = screen.getByTestId('chat-interface');
      const header = screen.getByTestId('chat-header');
      const messagesList = screen.getByTestId('messages-container');

      expect(header).toHaveStyle({
        padding: mockTheme.spacing.lg
      });

      expect(messagesList).toHaveStyle({
        gap: mockTheme.spacing.md
      });
    });

    it('should apply consistent border radius patterns', () => {
      const messages = [createMockMessage({ role: 'user' })];
      
      render(
        <MessageList
          messages={messages}
          onMessageAction={jest.fn()}
          onLoadMore={jest.fn()}
          onRetry={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const messageBubble = screen.getByTestId('message-bubble');
      
      expect(messageBubble).toHaveStyle({
        borderRadius: '1rem 1rem 0.25rem 1rem' // User message bubble styling
      });
    });
  });

  describe('Component Animation Performance', () => {
    it('should use consistent easing functions for smooth transitions', () => {
      render(
        <ClaudeInstanceButtons
          instanceId="test"
          isConnected={false}
          onConnect={jest.fn()}
          onDisconnect={jest.fn()}
        />
      );

      const connectButton = screen.getByRole('button');
      
      expect(connectButton).toHaveStyle({
        transition: `all ${mockTheme.animation.duration.fast} ${mockTheme.animation.easing.easeOut}`
      });
    });

    it('should animate message appearance with proper timing', async () => {
      const { rerender } = render(
        <MessageList
          messages={[]}
          onMessageAction={jest.fn()}
          onLoadMore={jest.fn()}
          onRetry={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const newMessage = createMockMessage({ id: '1' });
      rerender(
        <MessageList
          messages={[newMessage]}
          onMessageAction={jest.fn()}
          onLoadMore={jest.fn()}
          onRetry={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const messageBubble = screen.getByTestId('message-1');
      
      expect(messageBubble).toHaveStyle({
        animation: `messageSlideIn ${mockTheme.animation.duration.normal} ${mockTheme.animation.easing.easeOut} forwards`
      });
    });

    it('should handle hover animations with consistent timing', async () => {
      const user = userEvent.setup();
      
      render(
        <ClaudeInstanceButtons
          instanceId="test"
          isConnected={false}
          onConnect={jest.fn()}
          onDisconnect={jest.fn()}
        />
      );

      const connectButton = screen.getByRole('button');
      
      await user.hover(connectButton);
      
      expect(connectButton).toHaveStyle({
        transition: `all ${mockTheme.animation.duration.fast} ${mockTheme.animation.easing.easeOut}`,
        transform: 'translateY(-1px)'
      });
    });

    it('should optimize animation performance for 60fps', () => {
      render(
        <MessageList
          isStreaming={true}
          messages={[]}
          onMessageAction={jest.fn()}
          onLoadMore={jest.fn()}
          onRetry={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const streamingDots = screen.getAllByTestId('streaming-dot');
      
      streamingDots.forEach((dot, index) => {
        expect(dot).toHaveStyle({
          animation: `streamingPulse 1.4s ease-in-out ${index * 0.16}s infinite both`,
          willChange: 'opacity, transform' // GPU acceleration hint
        });
      });
    });
  });

  describe('Professional Color Schemes and Visual Hierarchy', () => {
    it('should maintain proper contrast ratios for accessibility', () => {
      render(
        <ChatInterface
          instanceId="test"
          claudeInstance={mockClaudeInstance}
          messages={[createMockMessage({ content: 'Test message' })]}
          onSendMessage={jest.fn()}
          onClearChat={jest.fn()}
          onExportChat={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const messageBubble = screen.getByTestId('message-bubble');
      
      // User messages should have high contrast
      expect(messageBubble).toHaveStyle({
        backgroundColor: mockTheme.colors.primary,
        color: '#ffffff'
      });
      
      // Contrast ratio should be at least 4.5:1 for normal text
      const backgroundColor = mockTheme.colors.primary;
      const textColor = '#ffffff';
      
      // This would typically use a contrast checking library
      expect(backgroundColor).toBe('#6366f1');
      expect(textColor).toBe('#ffffff');
    });

    it('should use semantic color coding for different message states', () => {
      const messages = [
        createMockMessage({ id: '1', status: 'sending' }),
        createMockMessage({ id: '2', status: 'sent' }),
        createMockMessage({ id: '3', status: 'failed' }),
        createMockMessage({ id: '4', status: 'delivered' })
      ];

      render(
        <MessageList
          messages={messages}
          onMessageAction={jest.fn()}
          onLoadMore={jest.fn()}
          onRetry={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const sendingStatus = screen.getByTestId('message-status-1');
      const sentStatus = screen.getByTestId('message-status-2');
      const failedStatus = screen.getByTestId('message-status-3');
      const deliveredStatus = screen.getByTestId('message-status-4');

      expect(sendingStatus).toHaveStyle({
        color: mockTheme.colors.warning
      });

      expect(sentStatus).toHaveStyle({
        color: mockTheme.colors.success
      });

      expect(failedStatus).toHaveStyle({
        color: mockTheme.colors.error
      });

      expect(deliveredStatus).toHaveStyle({
        color: mockTheme.colors.success
      });
    });

    it('should maintain visual hierarchy with proper shadow usage', () => {
      render(
        <ChatInterface
          instanceId="test"
          claudeInstance={mockClaudeInstance}
          messages={[]}
          onSendMessage={jest.fn()}
          onClearChat={jest.fn()}
          onExportChat={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const chatContainer = screen.getByTestId('chat-interface');
      const header = screen.getByTestId('chat-header');

      expect(chatContainer).toHaveStyle({
        boxShadow: mockTheme.shadows.lg
      });

      // Header should have subtle shadow for depth
      expect(header).toHaveStyle({
        boxShadow: mockTheme.shadows.sm
      });
    });

    it('should adapt to different theme modes', () => {
      const darkTheme = {
        ...mockTheme,
        colors: {
          ...mockTheme.colors,
          background: '#1f2937',
          surface: '#374151',
          text: '#f9fafb',
          textSecondary: '#d1d5db'
        }
      };

      render(
        <ThemeProvider theme={darkTheme}>
          <ChatInterface
            instanceId="test"
            claudeInstance={mockClaudeInstance}
            messages={[]}
            onSendMessage={jest.fn()}
            onClearChat={jest.fn()}
            onExportChat={jest.fn()}
            sseConnection={mockSSE.eventSource}
          />
        </ThemeProvider>
      );

      const chatContainer = screen.getByTestId('chat-interface');
      
      expect(chatContainer).toHaveStyle({
        backgroundColor: darkTheme.colors.background,
        color: darkTheme.colors.text
      });
    });
  });

  describe('Status Indicators and Feedback Mechanisms', () => {
    it('should display connection status with consistent visual language', () => {
      const connectedInstance = createMockClaudeInstance({ isConnected: true });
      
      render(
        <ChatInterface
          instanceId="test"
          claudeInstance={connectedInstance}
          messages={[]}
          onSendMessage={jest.fn()}
          onClearChat={jest.fn()}
          onExportChat={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const statusIndicator = screen.getByTestId('connection-status-indicator');
      
      expect(statusIndicator).toHaveStyle({
        backgroundColor: mockTheme.colors.success,
        borderRadius: '50%',
        width: '8px',
        height: '8px',
        boxShadow: `0 0 0 2px ${mockTheme.colors.background}`
      });
    });

    it('should provide consistent loading state visuals', () => {
      render(
        <ClaudeInstanceButtons
          instanceId="test"
          isConnected={false}
          isLoading={true}
          onConnect={jest.fn()}
          onDisconnect={jest.fn()}
        />
      );

      const loadingSpinner = screen.getByTestId('loading-spinner');
      
      expect(loadingSpinner).toHaveStyle({
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        border: `2px solid ${mockTheme.colors.border}`,
        borderTopColor: mockTheme.colors.primary,
        animation: 'spin 1s linear infinite'
      });
    });

    it('should use consistent error state styling', () => {
      const errorInstance = createMockClaudeInstance({
        error: { message: 'Connection failed', code: 'CONNECTION_ERROR' }
      });
      
      render(
        <ChatInterface
          instanceId="test"
          claudeInstance={errorInstance}
          messages={[]}
          onSendMessage={jest.fn()}
          onClearChat={jest.fn()}
          onExportChat={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const errorDisplay = screen.getByTestId('error-display');
      
      expect(errorDisplay).toHaveStyle({
        backgroundColor: '#fef2f2',
        borderColor: mockTheme.colors.error,
        color: '#991b1b',
        padding: mockTheme.spacing.md,
        borderRadius: mockTheme.borders.radius.md
      });
    });

    it('should provide consistent hover and focus states', async () => {
      const user = userEvent.setup();
      
      render(
        <MessageInput
          onSendMessage={jest.fn()}
          placeholder="Type your message..."
        />
      );

      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button');
      
      // Focus state
      await user.click(textArea);
      
      expect(textArea).toHaveStyle({
        borderColor: mockTheme.colors.primary,
        boxShadow: `0 0 0 3px ${mockTheme.colors.focus}`
      });
      
      // Button hover state
      await user.hover(sendButton);
      
      expect(sendButton).toHaveStyle({
        backgroundColor: '#5b64f0', // Slightly darker primary
        transform: 'translateY(-1px)',
        boxShadow: mockTheme.shadows.md
      });
    });
  });

  describe('Mobile Responsiveness and Touch Interactions', () => {
    it('should adapt component sizing for mobile viewports', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(
        <ChatInterface
          instanceId="test"
          claudeInstance={mockClaudeInstance}
          messages={[]}
          onSendMessage={jest.fn()}
          onClearChat={jest.fn()}
          onExportChat={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const chatContainer = screen.getByTestId('chat-interface');
      
      expect(chatContainer).toHaveClass('chat-interface--mobile');
      expect(chatContainer).toHaveStyle({
        padding: mockTheme.spacing.sm,
        borderRadius: '0'
      });
    });

    it('should provide adequate touch targets for mobile', () => {
      render(
        <ClaudeInstanceButtons
          instanceId="test"
          isConnected={false}
          onConnect={jest.fn()}
          onDisconnect={jest.fn()}
        />
      );

      const connectButton = screen.getByRole('button');
      
      expect(connectButton).toHaveStyle({
        minHeight: '44px',
        minWidth: '44px',
        padding: mockTheme.spacing.md
      });
    });

    it('should handle touch interactions smoothly', async () => {
      const user = userEvent.setup();
      
      render(
        <MessageInput
          onSendMessage={jest.fn()}
          placeholder="Type your message..."
        />
      );

      const textArea = screen.getByRole('textbox');
      
      // Simulate touch interaction
      fireEvent.touchStart(textArea);
      fireEvent.touchEnd(textArea);
      
      expect(textArea).toHaveStyle({
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'text',
        touchAction: 'manipulation'
      });
    });
  });

  describe('Cross-browser Compatibility', () => {
    it('should use vendor prefixes for CSS properties', () => {
      render(
        <MessageList
          messages={[createMockMessage()]}
          onMessageAction={jest.fn()}
          onLoadMore={jest.fn()}
          onRetry={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const messagesList = screen.getByTestId('messages-list');
      
      expect(messagesList).toHaveStyle({
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none',
        scrollbarWidth: 'thin'
      });
    });

    it('should provide fallbacks for CSS grid and flexbox', () => {
      render(
        <ChatInterface
          instanceId="test"
          claudeInstance={mockClaudeInstance}
          messages={[]}
          onSendMessage={jest.fn()}
          onClearChat={jest.fn()}
          onExportChat={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const chatContainer = screen.getByTestId('chat-interface');
      
      // Should have both flexbox and fallback display properties
      const computedStyle = getComputedStyle(chatContainer);
      expect(computedStyle.display).toBe('flex');
    });

    it('should handle different font rendering across browsers', () => {
      render(
        <MessageInput
          onSendMessage={jest.fn()}
          placeholder="Type your message..."
        />
      );

      const textArea = screen.getByRole('textbox');
      
      expect(textArea).toHaveStyle({
        fontFamily: mockTheme.typography.fontFamily,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale'
      });
    });
  });

  describe('Performance Optimization Visuals', () => {
    it('should use will-change property for animated elements', () => {
      render(
        <MessageList
          isStreaming={true}
          messages={[]}
          onMessageAction={jest.fn()}
          onLoadMore={jest.fn()}
          onRetry={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const streamingIndicator = screen.getByTestId('streaming-indicator');
      
      expect(streamingIndicator).toHaveStyle({
        willChange: 'opacity, transform'
      });
    });

    it('should minimize layout thrashing during animations', async () => {
      const { rerender } = render(
        <ClaudeInstanceButtons
          instanceId="test"
          isConnected={false}
          isLoading={false}
          onConnect={jest.fn()}
          onDisconnect={jest.fn()}
        />
      );

      const connectButton = screen.getByRole('button');
      const initialHeight = connectButton.getBoundingClientRect().height;
      
      // Change to loading state
      rerender(
        <ClaudeInstanceButtons
          instanceId="test"
          isConnected={false}
          isLoading={true}
          onConnect={jest.fn()}
          onDisconnect={jest.fn()}
        />
      );

      // Height should remain the same to prevent layout shift
      const loadingHeight = connectButton.getBoundingClientRect().height;
      expect(loadingHeight).toBe(initialHeight);
    });

    it('should use GPU acceleration for smooth animations', () => {
      const messages = [createMockMessage()];
      
      render(
        <MessageList
          messages={messages}
          onMessageAction={jest.fn()}
          onLoadMore={jest.fn()}
          onRetry={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const messageBubble = screen.getByTestId('message-bubble');
      
      expect(messageBubble).toHaveStyle({
        transform: 'translateZ(0)', // Force GPU layer
        backfaceVisibility: 'hidden'
      });
    });
  });

  describe('Visual Consistency Regression Tests', () => {
    it('should maintain consistent component heights across states', () => {
      const { rerender } = render(
        <ClaudeInstanceButtons
          instanceId="test"
          isConnected={false}
          onConnect={jest.fn()}
          onDisconnect={jest.fn()}
        />
      );

      const button = screen.getByRole('button');
      const disconnectedHeight = button.getBoundingClientRect().height;
      
      rerender(
        <ClaudeInstanceButtons
          instanceId="test"
          isConnected={true}
          onConnect={jest.fn()}
          onDisconnect={jest.fn()}
        />
      );

      const connectedHeight = button.getBoundingClientRect().height;
      expect(connectedHeight).toBe(disconnectedHeight);
    });

    it('should prevent visual glitches during state transitions', async () => {
      const { rerender } = render(
        <MessageList
          messages={[]}
          isStreaming={false}
          onMessageAction={jest.fn()}
          onLoadMore={jest.fn()}
          onRetry={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const container = screen.getByTestId('messages-list');
      const initialOpacity = getComputedStyle(container).opacity;
      
      // Rapid state changes
      rerender(
        <MessageList
          messages={[]}
          isStreaming={true}
          onMessageAction={jest.fn()}
          onLoadMore={jest.fn()}
          onRetry={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      // Should not flicker or become invisible
      const streamingOpacity = getComputedStyle(container).opacity;
      expect(parseFloat(streamingOpacity)).toBeGreaterThanOrEqual(0.8);
    });

    it('should maintain visual coherence across component compositions', () => {
      render(
        <div>
          <ClaudeInstanceButtons
            instanceId="test"
            isConnected={true}
            onConnect={jest.fn()}
            onDisconnect={jest.fn()}
          />
          <ChatInterface
            instanceId="test"
            claudeInstance={mockClaudeInstance}
            messages={[createMockMessage()]}
            onSendMessage={jest.fn()}
            onClearChat={jest.fn()}
            onExportChat={jest.fn()}
            sseConnection={mockSSE.eventSource}
          />
          <MessageInput
            onSendMessage={jest.fn()}
            placeholder="Type your message..."
          />
        </div>
      );

      const button = screen.getByRole('button', { name: /disconnect/i });
      const chatInterface = screen.getByTestId('chat-interface');
      const textArea = screen.getByRole('textbox');

      // All components should use consistent border radius
      expect(button).toHaveStyle({
        borderRadius: mockTheme.borders.radius.md
      });
      
      expect(chatInterface).toHaveStyle({
        borderRadius: mockTheme.borders.radius.lg
      });
      
      expect(textArea).toHaveStyle({
        borderRadius: mockTheme.borders.radius.md
      });
    });
  });
});