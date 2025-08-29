import React from 'react';
import { render, screen, fireEvent, waitFor, within } from './utils/test-utils';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { ClaudeInstanceButtons } from '@/components/ClaudeInstanceButtons';
import { ChatInterface } from '@/components/ChatInterface';
import { MessageList } from '@/components/MessageList';
import { MessageInput } from '@/components/MessageInput';
import { createMockClaudeInstance, createMockMessage, createMockSSEStream } from './utils/test-utils';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// London School TDD - Accessibility and UX Testing with Mocks
describe('Accessibility and UX Tests - Professional User Experience', () => {
  const mockClaudeInstance = createMockClaudeInstance();
  const mockSSE = createMockSSEStream();

  describe('Keyboard Navigation and Screen Reader Support', () => {
    it('should support full keyboard navigation through Claude interface', async () => {
      const user = userEvent.setup();
      const mockOnConnect = jest.fn();
      const mockOnSendMessage = jest.fn();
      
      render(
        <div>
          <ClaudeInstanceButtons
            instanceId="test"
            isConnected={false}
            onConnect={mockOnConnect}
            onDisconnect={jest.fn()}
          />
          <MessageInput onSendMessage={mockOnSendMessage} />
        </div>
      );

      // Tab through interface
      await user.tab();
      const connectButton = screen.getByRole('button', { name: /connect to claude/i });
      expect(connectButton).toHaveFocus();
      
      await user.tab();
      const textArea = screen.getByRole('textbox');
      expect(textArea).toHaveFocus();
      
      await user.tab();
      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).toHaveFocus();

      // Test keyboard activation
      await user.keyboard('{Shift>}{Tab}{/Shift}'); // Back to textarea
      expect(textArea).toHaveFocus();
      
      await user.type(textArea, 'Test keyboard message');
      await user.keyboard('{Control>}{Enter}{/Control}');
      
      expect(mockOnSendMessage).toHaveBeenCalledWith('Test keyboard message');
    });

    it('should provide proper ARIA landmarks and regions', () => {
      render(
        <ChatInterface
          instanceId="test"
          claudeInstance={mockClaudeInstance}
          messages={[createMockMessage()]}
          onSendMessage={jest.fn()}
          onClearChat={jest.fn()}
          onExportChat={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const main = screen.getByRole('main');
      const banner = screen.getByRole('banner');
      const log = screen.getByRole('log');
      const form = screen.getByRole('form');

      expect(main).toHaveAttribute('aria-label', 'Claude Chat Interface');
      expect(banner).toHaveAttribute('aria-label', 'Chat Header');
      expect(log).toHaveAttribute('aria-label', 'Conversation messages');
      expect(form).toHaveAttribute('aria-label', 'Send message form');
    });

    it('should announce dynamic content changes to screen readers', async () => {
      const { rerender } = render(
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

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');

      // Add new message
      const newMessage = createMockMessage({
        content: 'New message from Claude',
        role: 'assistant'
      });

      rerender(
        <ChatInterface
          instanceId="test"
          claudeInstance={mockClaudeInstance}
          messages={[newMessage]}
          onSendMessage={jest.fn()}
          onClearChat={jest.fn()}
          onExportChat={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      await waitFor(() => {
        expect(liveRegion).toHaveTextContent('New message from Claude: New message from Claude');
      });
    });

    it('should support screen reader navigation through message history', async () => {
      const user = userEvent.setup();
      const messages = [
        createMockMessage({ id: '1', content: 'First message', role: 'user' }),
        createMockMessage({ id: '2', content: 'Second message', role: 'assistant' }),
        createMockMessage({ id: '3', content: 'Third message', role: 'user' })
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

      const messagesList = screen.getByRole('log');
      expect(messagesList).toHaveAttribute('aria-label', 'Conversation messages');

      // Each message should be properly labeled
      messages.forEach((message) => {
        const messageElement = screen.getByTestId(`message-${message.id}`);
        expect(messageElement).toHaveAttribute('role', 'article');
        expect(messageElement).toHaveAttribute('aria-label', 
          `Message from ${message.role}: ${message.content}`);
      });
    });

    it('should handle focus management during state changes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <ClaudeInstanceButtons
          instanceId="test"
          isConnected={false}
          isLoading={false}
          onConnect={jest.fn()}
          onDisconnect={jest.fn()}
        />
      );

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);
      
      // Simulate connection process
      rerender(
        <ClaudeInstanceButtons
          instanceId="test"
          isConnected={false}
          isLoading={true}
          onConnect={jest.fn()}
          onDisconnect={jest.fn()}
        />
      );

      // Focus should remain on button during loading
      expect(connectButton).toHaveFocus();
      expect(connectButton).toHaveAttribute('aria-busy', 'true');

      // Complete connection
      rerender(
        <ClaudeInstanceButtons
          instanceId="test"
          isConnected={true}
          isLoading={false}
          onConnect={jest.fn()}
          onDisconnect={jest.fn()}
        />
      );

      const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
      expect(disconnectButton).toHaveFocus();
    });
  });

  describe('User Interaction Mocking and Validation', () => {
    it('should mock and validate touch interactions', async () => {
      const mockOnSendMessage = jest.fn();
      render(<MessageInput onSendMessage={mockOnSendMessage} />);

      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button');

      // Mock touch events
      fireEvent.touchStart(textArea, { touches: [{ clientX: 100, clientY: 100 }] });
      fireEvent.touchEnd(textArea);

      expect(textArea).toHaveStyle({
        touchAction: 'manipulation'
      });

      // Test touch target size
      const buttonRect = sendButton.getBoundingClientRect();
      expect(buttonRect.height).toBeGreaterThanOrEqual(44); // WCAG minimum touch target
      expect(buttonRect.width).toBeGreaterThanOrEqual(44);
    });

    it('should validate gesture-based interactions', async () => {
      const mockOnLoadMore = jest.fn();
      const messages = Array.from({ length: 20 }, (_, i) => 
        createMockMessage({ id: `msg-${i}` })
      );

      render(
        <MessageList
          messages={messages}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
          onMessageAction={jest.fn()}
          onRetry={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const messagesList = screen.getByTestId('messages-list');

      // Mock swipe-to-refresh gesture
      fireEvent.touchStart(messagesList, { touches: [{ clientX: 200, clientY: 100 }] });
      fireEvent.touchMove(messagesList, { touches: [{ clientX: 200, clientY: 150 }] });
      fireEvent.touchEnd(messagesList);

      // Should trigger load more
      await waitFor(() => {
        expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle drag and drop interactions with proper feedback', async () => {
      const mockOnFileUpload = jest.fn();
      render(<MessageInput onSendMessage={jest.fn()} onFileUpload={mockOnFileUpload} />);

      const textArea = screen.getByRole('textbox');

      // Mock file drag
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      fireEvent.dragEnter(textArea);
      expect(textArea).toHaveClass('drag-over');

      fireEvent.dragOver(textArea, {
        dataTransfer: { files: [file] }
      });

      fireEvent.drop(textArea, {
        dataTransfer: { files: [file] }
      });

      expect(mockOnFileUpload).toHaveBeenCalledWith([file]);
      expect(textArea).not.toHaveClass('drag-over');
    });

    it('should provide haptic feedback simulation for touch devices', async () => {
      const mockVibrate = jest.fn();
      // Mock navigator.vibrate
      Object.defineProperty(navigator, 'vibrate', {
        writable: true,
        value: mockVibrate
      });

      const user = userEvent.setup();
      render(
        <ClaudeInstanceButtons
          instanceId="test"
          isConnected={false}
          onConnect={jest.fn()}
          onDisconnect={jest.fn()}
          enableHapticFeedback={true}
        />
      );

      const connectButton = screen.getByRole('button');
      
      // Simulate touch press
      fireEvent.touchStart(connectButton);
      await user.click(connectButton);

      expect(mockVibrate).toHaveBeenCalledWith(50); // Short vibration
    });
  });

  describe('Error States and Professional User Feedback', () => {
    it('should provide accessible error messages with recovery actions', () => {
      const error = {
        message: 'Connection failed',
        code: 'NETWORK_ERROR',
        details: 'Server is temporarily unavailable'
      };

      const mockOnRetry = jest.fn();
      render(
        <ChatInterface
          instanceId="test"
          claudeInstance={{ ...mockClaudeInstance, error }}
          messages={[]}
          onSendMessage={jest.fn()}
          onClearChat={jest.fn()}
          onExportChat={jest.fn()}
          onRetry={mockOnRetry}
          sseConnection={mockSSE.eventSource}
        />
      );

      const errorRegion = screen.getByRole('alert');
      expect(errorRegion).toHaveAttribute('aria-live', 'assertive');
      expect(errorRegion).toHaveTextContent('Connection failed');

      const retryButton = within(errorRegion).getByRole('button', { name: /retry connection/i });
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveAttribute('aria-describedby', 'error-details');

      const errorDetails = screen.getByTestId('error-details');
      expect(errorDetails).toHaveTextContent('Server is temporarily unavailable');
    });

    it('should handle loading states with proper accessibility', () => {
      render(
        <MessageList
          messages={[]}
          isLoading={true}
          onMessageAction={jest.fn()}
          onLoadMore={jest.fn()}
          onRetry={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const loadingRegion = screen.getByRole('status');
      expect(loadingRegion).toHaveAttribute('aria-live', 'polite');
      expect(loadingRegion).toHaveAttribute('aria-label', 'Loading messages');

      const loadingSkeleton = screen.getByTestId('messages-loading-skeleton');
      expect(loadingSkeleton).toHaveAttribute('aria-hidden', 'true');
    });

    it('should provide contextual help and guidance', () => {
      render(
        <MessageInput
          onSendMessage={jest.fn()}
          placeholder="Type your message..."
          showHints={true}
        />
      );

      const textArea = screen.getByRole('textbox');
      const helpText = screen.getByTestId('input-help');

      expect(textArea).toHaveAttribute('aria-describedby', 'input-help keyboard-hints');
      expect(helpText).toHaveTextContent('Type your message and press Ctrl+Enter to send');

      const keyboardHints = screen.getByTestId('keyboard-hints');
      expect(keyboardHints).toHaveAttribute('role', 'complementary');
      expect(keyboardHints).toHaveAttribute('aria-label', 'Keyboard shortcuts');
    });

    it('should handle form validation with accessible error reporting', async () => {
      const user = userEvent.setup();
      const mockValidator = jest.fn().mockReturnValue('Message too short');
      
      render(
        <MessageInput
          onSendMessage={jest.fn()}
          validator={mockValidator}
          minLength={10}
        />
      );

      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button');

      await user.type(textArea, 'Short');
      await user.click(sendButton);

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('Message too short');
      expect(textArea).toHaveAttribute('aria-invalid', 'true');
      expect(textArea).toHaveAttribute('aria-describedby', expect.stringContaining('error-'));
    });
  });

  describe('Mobile Responsiveness and Touch UX', () => {
    it('should adapt to mobile viewport with proper touch targets', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <ClaudeInstanceButtons
          instanceId="test"
          isConnected={false}
          onConnect={jest.fn()}
          onDisconnect={jest.fn()}
        />
      );

      const connectButton = screen.getByRole('button');
      const buttonRect = connectButton.getBoundingClientRect();

      // WCAG 2.1 AA minimum touch target size
      expect(buttonRect.height).toBeGreaterThanOrEqual(44);
      expect(buttonRect.width).toBeGreaterThanOrEqual(44);

      expect(connectButton).toHaveStyle({
        padding: '12px 16px', // Adequate touch padding
        fontSize: '16px' // Prevent zoom on iOS
      });
    });

    it('should handle mobile keyboard interactions', async () => {
      const user = userEvent.setup();
      const mockOnSendMessage = jest.fn();
      
      render(<MessageInput onSendMessage={mockOnSendMessage} />);

      const textArea = screen.getByRole('textbox');

      // Mobile keyboards often trigger different events
      await user.type(textArea, 'Mobile message');
      
      // Test mobile send action (tap send button)
      const sendButton = screen.getByRole('button');
      fireEvent.touchStart(sendButton);
      fireEvent.touchEnd(sendButton);
      fireEvent.click(sendButton);

      expect(mockOnSendMessage).toHaveBeenCalledWith('Mobile message');
    });

    it('should provide appropriate mobile scrolling behavior', () => {
      const messages = Array.from({ length: 50 }, (_, i) =>
        createMockMessage({ id: `msg-${i}` })
      );

      render(
        <MessageList
          messages={messages}
          onMessageAction={jest.fn()}
          onLoadMore={jest.fn()}
          onRetry={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const messagesList = screen.getByTestId('messages-list');

      expect(messagesList).toHaveStyle({
        WebkitOverflowScrolling: 'touch',
        overflowY: 'auto',
        scrollBehavior: 'smooth'
      });
    });

    it('should handle orientation changes gracefully', () => {
      const { rerender } = render(
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

      // Portrait mode
      Object.defineProperty(screen, 'orientation', {
        writable: true,
        value: { angle: 0, type: 'portrait-primary' }
      });

      const chatInterface = screen.getByTestId('chat-interface');
      expect(chatInterface).toHaveClass('orientation-portrait');

      // Landscape mode
      Object.defineProperty(screen, 'orientation', {
        writable: true,
        value: { angle: 90, type: 'landscape-primary' }
      });

      rerender(
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

      expect(chatInterface).toHaveClass('orientation-landscape');
    });
  });

  describe('Comprehensive Accessibility Compliance', () => {
    it('should meet WCAG 2.1 AA standards', async () => {
      const { container } = render(
        <ChatInterface
          instanceId="test"
          claudeInstance={mockClaudeInstance}
          messages={[
            createMockMessage({ role: 'user', content: 'Hello' }),
            createMockMessage({ role: 'assistant', content: 'Hi there!' })
          ]}
          onSendMessage={jest.fn()}
          onClearChat={jest.fn()}
          onExportChat={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-management': { enabled: true },
          'aria-labels': { enabled: true }
        }
      });

      expect(results).toHaveNoViolations();
    });

    it('should support high contrast mode', () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      });

      render(
        <ClaudeInstanceButtons
          instanceId="test"
          isConnected={false}
          onConnect={jest.fn()}
          onDisconnect={jest.fn()}
        />
      );

      const connectButton = screen.getByRole('button');
      
      expect(connectButton).toHaveClass('high-contrast');
      expect(connectButton).toHaveStyle({
        borderWidth: '2px',
        borderColor: 'ButtonText'
      });
    });

    it('should respect reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      });

      render(
        <MessageList
          messages={[createMockMessage()]}
          onMessageAction={jest.fn()}
          onLoadMore={jest.fn()}
          onRetry={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const messageBubble = screen.getByTestId('message-bubble');
      
      expect(messageBubble).toHaveStyle({
        animation: 'none',
        transition: 'none'
      });
    });

    it('should support voice control and speech recognition', async () => {
      const mockSpeechRecognition = {
        start: jest.fn(),
        stop: jest.fn(),
        addEventListener: jest.fn(),
        continuous: true,
        interimResults: true
      };

      // Mock Speech Recognition API
      Object.defineProperty(window, 'SpeechRecognition', {
        writable: true,
        value: jest.fn(() => mockSpeechRecognition)
      });

      render(
        <MessageInput
          onSendMessage={jest.fn()}
          enableVoiceInput={true}
        />
      );

      const voiceButton = screen.getByRole('button', { name: /start voice input/i });
      
      expect(voiceButton).toBeInTheDocument();
      expect(voiceButton).toHaveAttribute('aria-pressed', 'false');
      
      fireEvent.click(voiceButton);
      
      expect(mockSpeechRecognition.start).toHaveBeenCalled();
      expect(voiceButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should provide proper skip links and navigation shortcuts', () => {
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

      const skipLinks = screen.getAllByRole('link');
      const skipToContent = skipLinks.find(link => 
        link.textContent?.includes('Skip to main content')
      );
      const skipToInput = skipLinks.find(link => 
        link.textContent?.includes('Skip to message input')
      );

      expect(skipToContent).toBeInTheDocument();
      expect(skipToInput).toBeInTheDocument();
      
      expect(skipToContent).toHaveAttribute('href', '#main-content');
      expect(skipToInput).toHaveAttribute('href', '#message-input');
    });
  });

  describe('Performance and UX Optimization', () => {
    it('should debounce user input to prevent performance issues', async () => {
      const user = userEvent.setup();
      const mockOnTyping = jest.fn();
      
      render(<MessageInput onSendMessage={jest.fn()} onTyping={mockOnTyping} />);

      const textArea = screen.getByRole('textbox');
      
      // Rapid typing
      await user.type(textArea, 'Quick typing test', { delay: 10 });
      
      // Should debounce the typing events
      await waitFor(() => {
        expect(mockOnTyping).toHaveBeenCalledTimes(1);
        expect(mockOnTyping).toHaveBeenLastCalledWith('Quick typing test');
      }, { timeout: 500 });
    });

    it('should optimize scroll performance for large message lists', () => {
      const largeMessageList = Array.from({ length: 1000 }, (_, i) =>
        createMockMessage({ id: `msg-${i}` })
      );

      render(
        <MessageList
          messages={largeMessageList}
          onMessageAction={jest.fn()}
          onLoadMore={jest.fn()}
          onRetry={jest.fn()}
          sseConnection={mockSSE.eventSource}
        />
      );

      const virtualizedContainer = screen.getByTestId('virtualized-messages');
      
      expect(virtualizedContainer).toHaveAttribute('data-virtualized', 'true');
      expect(virtualizedContainer).toHaveStyle({
        containIntrinsicSize: '1000 * 60px', // Estimated item size
        contentVisibility: 'auto'
      });
    });

    it('should provide instant feedback for user actions', async () => {
      const user = userEvent.setup();
      const mockOnSendMessage = jest.fn();
      
      render(<MessageInput onSendMessage={mockOnSendMessage} />);

      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button');
      
      await user.type(textArea, 'Instant feedback test');
      
      // Button should become enabled immediately
      expect(sendButton).not.toBeDisabled();
      expect(sendButton).toHaveClass('send-button--ready');
      
      await user.click(sendButton);
      
      // Should provide immediate visual feedback
      expect(sendButton).toHaveClass('send-button--sending');
      expect(textArea).toHaveValue(''); // Cleared immediately
    });

    it('should handle network latency gracefully', async () => {
      const user = userEvent.setup();
      const mockOnSendMessage = jest.fn(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );
      
      render(<MessageInput onSendMessage={mockOnSendMessage} />);

      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button');
      
      await user.type(textArea, 'Slow network message');
      await user.click(sendButton);
      
      // Should show loading state
      expect(sendButton).toHaveClass('send-button--loading');
      expect(sendButton).toBeDisabled();
      
      const loadingSpinner = screen.getByTestId('send-loading-spinner');
      expect(loadingSpinner).toBeInTheDocument();
      
      // Should show timeout warning after delay
      await waitFor(() => {
        const timeoutWarning = screen.getByTestId('network-timeout-warning');
        expect(timeoutWarning).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});