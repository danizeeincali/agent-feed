import React from 'react';
import { render, screen, fireEvent, waitFor, within } from './utils/test-utils';
import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { ClaudeInstanceManager } from '@/components/ClaudeInstanceManager';
import { createMockSSEStream, createMockClaudeInstance, createMockMessage } from './utils/test-utils';

// London School TDD - Integration Testing with Mocks
describe('ClaudeInstanceManager - UI Integration Tests', () => {
  // Mock all external dependencies
  const mockUseClaudeInstance = jest.fn();
  const mockUseSSEConnection = jest.fn();
  const mockUseMessages = jest.fn();
  const mockOnInstanceConnect = jest.fn();
  const mockOnInstanceDisconnect = jest.fn();
  const mockOnMessageSend = jest.fn();
  const mockSSE = createMockSSEStream();

  const defaultMockState = {
    instance: createMockClaudeInstance(),
    messages: [],
    isLoading: false,
    isConnected: false,
    isStreaming: false,
    error: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock hook implementations
    mockUseClaudeInstance.mockReturnValue({
      ...defaultMockState,
      connect: mockOnInstanceConnect,
      disconnect: mockOnInstanceDisconnect
    });
    
    mockUseSSEConnection.mockReturnValue({
      connection: mockSSE.eventSource,
      isConnected: true,
      reconnect: jest.fn()
    });
    
    mockUseMessages.mockReturnValue({
      messages: defaultMockState.messages,
      sendMessage: mockOnMessageSend,
      clearMessages: jest.fn()
    });
  });

  describe('Component Integration and Hook Synchronization', () => {
    it('should integrate ClaudeInstanceButtons with ClaudeInstanceManager state', async () => {
      const user = userEvent.setup();
      
      render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      const connectButton = screen.getByRole('button', { name: /connect to claude/i });
      
      await user.click(connectButton);
      
      expect(mockOnInstanceConnect).toHaveBeenCalledWith('test-instance');
      
      // Verify UI state synchronization
      await waitFor(() => {
        expect(connectButton).toHaveAttribute('aria-busy', 'true');
        expect(connectButton).toHaveClass('claude-button--loading');
      });
    });

    it('should synchronize ChatInterface with instance connection state', async () => {
      // Mock connected state
      mockUseClaudeInstance.mockReturnValue({
        ...defaultMockState,
        instance: createMockClaudeInstance({ isConnected: true }),
        isConnected: true
      });
      
      render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      const chatInterface = screen.getByTestId('chat-interface');
      const inputField = screen.getByRole('textbox', { name: /type your message/i });
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      expect(chatInterface).toHaveClass('chat-interface--connected');
      expect(inputField).not.toBeDisabled();
      expect(sendButton).not.toBeDisabled();
    });

    it('should update all UI components when connection state changes', async () => {
      const { rerender } = render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      // Initially disconnected
      expect(screen.getByTestId('connection-status')).toHaveClass('status-indicator--disconnected');
      expect(screen.getByRole('textbox')).toBeDisabled();
      
      // Update to connected state
      mockUseClaudeInstance.mockReturnValue({
        ...defaultMockState,
        instance: createMockClaudeInstance({ isConnected: true }),
        isConnected: true
      });
      
      rerender(<ClaudeInstanceManager instanceId="test-instance" />);
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveClass('status-indicator--connected');
        expect(screen.getByRole('textbox')).not.toBeDisabled();
      });
    });

    it('should handle SSE streaming integration with chat display', async () => {
      const streamingMessage = createMockMessage({
        id: 'streaming-msg',
        content: 'This is streaming...',
        role: 'assistant',
        streaming: true
      });
      
      mockUseMessages.mockReturnValue({
        messages: [streamingMessage],
        sendMessage: mockOnMessageSend,
        isStreaming: true,
        clearMessages: jest.fn()
      });
      
      render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      const streamingIndicator = screen.getByTestId('streaming-indicator');
      const messageBubble = screen.getByTestId(`message-${streamingMessage.id}`);
      
      expect(streamingIndicator).toBeInTheDocument();
      expect(messageBubble).toHaveClass('message-bubble--streaming');
      expect(messageBubble).toHaveTextContent('This is streaming...');
    });
  });

  describe('Regression Prevention - Claude Functionality Unchanged', () => {
    it('should preserve existing Claude instance creation logic', async () => {
      render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      expect(mockUseClaudeInstance).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        autoConnect: false
      });
      
      // Verify no interference with core Claude logic
      expect(mockUseClaudeInstance).toHaveBeenCalledTimes(1);
    });

    it('should maintain existing SSE streaming functionality', () => {
      render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      expect(mockUseSSEConnection).toHaveBeenCalledWith({
        instanceId: 'test-instance',
        autoReconnect: true
      });
      
      // Verify SSE connection setup unchanged
      expect(mockSSE.eventSource.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
    });

    it('should preserve message handling and state management', async () => {
      const user = userEvent.setup();
      
      mockUseClaudeInstance.mockReturnValue({
        ...defaultMockState,
        isConnected: true
      });
      
      render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      const inputField = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(inputField, 'Test message');
      await user.click(sendButton);
      
      expect(mockOnMessageSend).toHaveBeenCalledWith('Test message');
      
      // Verify original message sending logic preserved
      expect(mockOnMessageSend).toHaveBeenCalledTimes(1);
    });

    it('should not interfere with existing error handling', async () => {
      const errorState = {
        ...defaultMockState,
        error: { message: 'Connection failed', code: 'CONNECTION_ERROR' }
      };
      
      mockUseClaudeInstance.mockReturnValue(errorState);
      
      render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      const errorDisplay = screen.getByTestId('error-display');
      
      expect(errorDisplay).toBeInTheDocument();
      expect(errorDisplay).toHaveTextContent('Connection failed');
      
      // Verify error handling logic unchanged
      expect(errorDisplay).toHaveClass('error-display--connection');
    });
  });

  describe('Professional UI State Management', () => {
    it('should coordinate loading states across all components', async () => {
      mockUseClaudeInstance.mockReturnValue({
        ...defaultMockState,
        isLoading: true
      });
      
      render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      const connectButton = screen.getByRole('button', { name: /connect to claude/i });
      const loadingSpinner = screen.getByTestId('loading-spinner');
      const chatInterface = screen.getByTestId('chat-interface');
      
      expect(connectButton).toHaveClass('claude-button--loading');
      expect(connectButton).toBeDisabled();
      expect(loadingSpinner).toBeInTheDocument();
      expect(chatInterface).toHaveClass('chat-interface--loading');
    });

    it('should handle concurrent state updates gracefully', async () => {
      const { rerender } = render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      // Rapid state changes
      mockUseClaudeInstance.mockReturnValue({
        ...defaultMockState,
        isLoading: true
      });
      rerender(<ClaudeInstanceManager instanceId="test-instance" />);
      
      mockUseClaudeInstance.mockReturnValue({
        ...defaultMockState,
        isConnected: true
      });
      rerender(<ClaudeInstanceManager instanceId="test-instance" />);
      
      await waitFor(() => {
        const statusIndicator = screen.getByTestId('connection-status');
        expect(statusIndicator).toHaveClass('status-indicator--connected');
        expect(statusIndicator).not.toHaveClass('status-indicator--loading');
      });
    });

    it('should maintain UI consistency during reconnection attempts', async () => {
      const user = userEvent.setup();
      
      // Start connected
      mockUseClaudeInstance.mockReturnValue({
        ...defaultMockState,
        isConnected: true
      });
      
      const { rerender } = render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
      await user.click(disconnectButton);
      
      // Simulate reconnection attempt
      mockUseClaudeInstance.mockReturnValue({
        ...defaultMockState,
        isLoading: true,
        isConnected: false
      });
      
      rerender(<ClaudeInstanceManager instanceId="test-instance" />);
      
      const statusIndicator = screen.getByTestId('connection-status');
      const chatInterface = screen.getByTestId('chat-interface');
      
      expect(statusIndicator).toHaveClass('status-indicator--reconnecting');
      expect(chatInterface).toHaveClass('chat-interface--reconnecting');
    });
  });

  describe('Message Flow Integration', () => {
    it('should integrate message sending with UI feedback', async () => {
      const user = userEvent.setup();
      
      mockUseClaudeInstance.mockReturnValue({
        ...defaultMockState,
        isConnected: true
      });
      
      const pendingMessage = createMockMessage({
        id: 'pending-msg',
        content: 'Test message',
        status: 'sending'
      });
      
      render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      const inputField = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(inputField, 'Test message');
      
      // Mock message sending
      mockOnMessageSend.mockImplementation(() => {
        mockUseMessages.mockReturnValue({
          messages: [pendingMessage],
          sendMessage: mockOnMessageSend,
          clearMessages: jest.fn()
        });
      });
      
      await user.click(sendButton);
      
      expect(mockOnMessageSend).toHaveBeenCalledWith('Test message');
      expect(inputField).toHaveValue('');
    });

    it('should handle message failures with retry mechanism', async () => {
      const user = userEvent.setup();
      
      const failedMessage = createMockMessage({
        id: 'failed-msg',
        content: 'Failed message',
        status: 'failed',
        error: 'Network timeout'
      });
      
      mockUseMessages.mockReturnValue({
        messages: [failedMessage],
        sendMessage: mockOnMessageSend,
        clearMessages: jest.fn()
      });
      
      render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      const retryButton = screen.getByTestId(`retry-message-${failedMessage.id}`);
      
      await user.click(retryButton);
      
      expect(mockOnMessageSend).toHaveBeenCalledWith(
        failedMessage.content,
        { retry: true, originalId: failedMessage.id }
      );
    });

    it('should display conversation history correctly', () => {
      const messages = [
        createMockMessage({ id: '1', role: 'user', content: 'Hello' }),
        createMockMessage({ id: '2', role: 'assistant', content: 'Hi there!' }),
        createMockMessage({ id: '3', role: 'user', content: 'How are you?' })
      ];
      
      mockUseMessages.mockReturnValue({
        messages,
        sendMessage: mockOnMessageSend,
        clearMessages: jest.fn()
      });
      
      render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      messages.forEach(message => {
        const messageBubble = screen.getByTestId(`message-${message.id}`);
        expect(messageBubble).toBeInTheDocument();
        expect(messageBubble).toHaveTextContent(message.content);
        expect(messageBubble).toHaveClass(`message-bubble--${message.role}`);
      });
    });
  });

  describe('Error Handling Integration', () => {
    it('should display connection errors with professional styling', () => {
      const connectionError = {
        message: 'Failed to connect to Claude instance',
        code: 'CONNECTION_TIMEOUT',
        details: 'Server not responding'
      };
      
      mockUseClaudeInstance.mockReturnValue({
        ...defaultMockState,
        error: connectionError
      });
      
      render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      const errorDisplay = screen.getByTestId('error-display');
      const errorMessage = screen.getByTestId('error-message');
      const errorActions = screen.getByTestId('error-actions');
      
      expect(errorDisplay).toHaveClass('error-display', 'error-display--connection');
      expect(errorMessage).toHaveTextContent(connectionError.message);
      expect(errorActions).toBeInTheDocument();
    });

    it('should handle SSE connection errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockUseSSEConnection.mockReturnValue({
        connection: null,
        isConnected: false,
        error: 'SSE connection failed',
        reconnect: jest.fn()
      });
      
      render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      const sseErrorDisplay = screen.getByTestId('sse-error-display');
      const reconnectButton = screen.getByTestId('sse-reconnect-button');
      
      expect(sseErrorDisplay).toHaveTextContent('SSE connection failed');
      
      await user.click(reconnectButton);
      
      expect(mockUseSSEConnection().reconnect).toHaveBeenCalled();
    });

    it('should recover from errors with proper UI state restoration', async () => {
      const { rerender } = render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      // Simulate error state
      mockUseClaudeInstance.mockReturnValue({
        ...defaultMockState,
        error: { message: 'Connection error' }
      });
      
      rerender(<ClaudeInstanceManager instanceId="test-instance" />);
      
      expect(screen.getByTestId('error-display')).toBeInTheDocument();
      
      // Simulate recovery
      mockUseClaudeInstance.mockReturnValue({
        ...defaultMockState,
        isConnected: true,
        error: null
      });
      
      rerender(<ClaudeInstanceManager instanceId="test-instance" />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('error-display')).not.toBeInTheDocument();
        expect(screen.getByTestId('connection-status')).toHaveClass('status-indicator--connected');
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain focus management across component updates', async () => {
      const user = userEvent.setup();
      
      const { rerender } = render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      const connectButton = screen.getByRole('button', { name: /connect/i });
      connectButton.focus();
      
      expect(connectButton).toHaveFocus();
      
      // Simulate connection
      mockUseClaudeInstance.mockReturnValue({
        ...defaultMockState,
        isConnected: true
      });
      
      rerender(<ClaudeInstanceManager instanceId="test-instance" />);
      
      await waitFor(() => {
        const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
        expect(disconnectButton).toHaveFocus();
      });
    });

    it('should announce state changes to screen readers', async () => {
      const { rerender } = render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      const announcement = screen.getByTestId('sr-announcement');
      expect(announcement).toHaveAttribute('aria-live', 'polite');
      
      // Connect
      mockUseClaudeInstance.mockReturnValue({
        ...defaultMockState,
        isConnected: true
      });
      
      rerender(<ClaudeInstanceManager instanceId="test-instance" />);
      
      await waitFor(() => {
        expect(announcement).toHaveTextContent('Connected to Claude instance');
      });
    });

    it('should have no accessibility violations in integrated state', async () => {
      mockUseClaudeInstance.mockReturnValue({
        ...defaultMockState,
        isConnected: true
      });
      
      mockUseMessages.mockReturnValue({
        messages: [createMockMessage({ id: '1', content: 'Test message' })],
        sendMessage: mockOnMessageSend,
        clearMessages: jest.fn()
      });
      
      const { container } = render(<ClaudeInstanceManager instanceId="test-instance" />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Performance Integration', () => {
    it('should optimize re-renders during state changes', async () => {
      const renderSpy = jest.fn();
      
      const TestComponent = () => {
        renderSpy();
        return <ClaudeInstanceManager instanceId="test-instance" />;
      };
      
      const { rerender } = render(<TestComponent />);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Multiple state changes
      mockUseClaudeInstance.mockReturnValue({
        ...defaultMockState,
        isLoading: true
      });
      
      rerender(<TestComponent />);
      
      mockUseClaudeInstance.mockReturnValue({
        ...defaultMockState,
        isConnected: true
      });
      
      rerender(<TestComponent />);
      
      // Should render efficiently
      expect(renderSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle large message lists efficiently', () => {
      const largeMessageList = Array.from({ length: 1000 }, (_, i) =>
        createMockMessage({
          id: `msg-${i}`,
          content: `Message ${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant'
        })
      );
      
      mockUseMessages.mockReturnValue({
        messages: largeMessageList,
        sendMessage: mockOnMessageSend,
        clearMessages: jest.fn()
      });
      
      const startTime = performance.now();
      render(<ClaudeInstanceManager instanceId="test-instance" />);
      const endTime = performance.now();
      
      // Should render within reasonable time
      expect(endTime - startTime).toBeLessThan(100);
      
      // Verify virtualization is working
      const visibleMessages = screen.getAllByTestId(/^message-/);
      expect(visibleMessages.length).toBeLessThan(largeMessageList.length);
    });
  });
});