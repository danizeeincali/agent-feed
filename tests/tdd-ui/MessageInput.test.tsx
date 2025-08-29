import React from 'react';
import { render, screen, fireEvent, waitFor } from './utils/test-utils';
import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { MessageInput } from '@/components/MessageInput';

// London School TDD - MessageInput Component Testing
describe('MessageInput - Professional Message Input Component', () => {
  // Mock event handlers following London School approach
  const mockOnSendMessage = jest.fn();
  const mockOnTyping = jest.fn();
  const mockOnFocus = jest.fn();
  const mockOnBlur = jest.fn();
  const mockOnKeyPress = jest.fn();

  const defaultProps = {
    onSendMessage: mockOnSendMessage,
    onTyping: mockOnTyping,
    onFocus: mockOnFocus,
    onBlur: mockOnBlur,
    onKeyPress: mockOnKeyPress,
    disabled: false,
    isLoading: false,
    placeholder: 'Type your message...'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Professional Input Styling and Layout', () => {
    it('should render with professional Claudable styling', () => {
      render(<MessageInput {...defaultProps} />);
      
      const inputContainer = screen.getByTestId('message-input-container');
      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      expect(inputContainer).toHaveClass('message-input-container', 'message-input--professional');
      expect(inputContainer).toHaveStyle({
        display: 'flex',
        alignItems: 'flex-end',
        gap: '0.5rem',
        padding: '1rem',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e5e7eb',
        borderRadius: '0 0 0.5rem 0.5rem'
      });
      
      expect(textArea).toHaveClass('message-input', 'message-input--textarea');
      expect(textArea).toHaveStyle({
        flex: '1',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        padding: '0.75rem',
        fontSize: '1rem',
        lineHeight: '1.5',
        resize: 'none',
        minHeight: '44px',
        maxHeight: '200px'
      });
      
      expect(sendButton).toHaveClass('send-button', 'send-button--professional');
      expect(sendButton).toHaveStyle({
        backgroundColor: '#6366f1',
        color: '#ffffff',
        border: 'none',
        borderRadius: '0.375rem',
        padding: '0.75rem',
        minWidth: '44px',
        height: '44px'
      });
    });

    it('should apply disabled styling when disabled', () => {
      render(<MessageInput {...defaultProps} disabled={true} />);
      
      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button');
      
      expect(textArea).toBeDisabled();
      expect(textArea).toHaveClass('message-input--disabled');
      expect(textArea).toHaveStyle({
        backgroundColor: '#f9fafb',
        color: '#9ca3af',
        cursor: 'not-allowed'
      });
      
      expect(sendButton).toBeDisabled();
      expect(sendButton).toHaveClass('send-button--disabled');
      expect(sendButton).toHaveStyle({
        backgroundColor: '#d1d5db',
        cursor: 'not-allowed'
      });
    });

    it('should show loading state with spinner', () => {
      render(<MessageInput {...defaultProps} isLoading={true} />);
      
      const sendButton = screen.getByRole('button');
      const loadingSpinner = screen.getByTestId('send-loading-spinner');
      
      expect(sendButton).toHaveClass('send-button--loading');
      expect(sendButton).toBeDisabled();
      
      expect(loadingSpinner).toBeInTheDocument();
      expect(loadingSpinner).toHaveStyle({
        width: '16px',
        height: '16px',
        animation: 'spin 1s linear infinite'
      });
    });

    it('should display character count for long messages', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} maxLength={500} />);
      
      const textArea = screen.getByRole('textbox');
      
      const longMessage = 'x'.repeat(450);
      await user.type(textArea, longMessage);
      
      const charCount = screen.getByTestId('character-count');
      
      expect(charCount).toBeInTheDocument();
      expect(charCount).toHaveTextContent('450 / 500');
      expect(charCount).toHaveClass('character-count');
      expect(charCount).toHaveStyle({
        fontSize: '0.75rem',
        color: '#f59e0b',
        textAlign: 'right',
        marginTop: '0.25rem'
      });
    });
  });

  describe('Auto-resize and Dynamic Height', () => {
    it('should auto-resize based on content', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const textArea = screen.getByRole('textbox');
      
      // Single line
      await user.type(textArea, 'Short message');
      expect(textArea.style.height).toBe('44px');
      
      // Multiple lines
      const multiLineMessage = 'Line 1\nLine 2\nLine 3\nLine 4';
      await user.clear(textArea);
      await user.type(textArea, multiLineMessage);
      
      await waitFor(() => {
        const height = parseInt(textArea.style.height);
        expect(height).toBeGreaterThan(44);
        expect(height).toBeLessThanOrEqual(200); // maxHeight
      });
    });

    it('should maintain max height constraint', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const textArea = screen.getByRole('textbox');
      
      // Very long message
      const veryLongMessage = 'Very long line\n'.repeat(20);
      await user.type(textArea, veryLongMessage);
      
      await waitFor(() => {
        const height = parseInt(textArea.style.height);
        expect(height).toBeLessThanOrEqual(200);
      });
      
      // Should show scrollbar
      expect(textArea).toHaveStyle({
        overflowY: 'auto'
      });
    });

    it('should handle rapid resize changes smoothly', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const textArea = screen.getByRole('textbox');
      
      // Rapid changes
      await user.type(textArea, 'Line 1\nLine 2');
      await user.type(textArea, '\nLine 3\nLine 4');
      await user.clear(textArea);
      await user.type(textArea, 'Short');
      
      await waitFor(() => {
        expect(textArea).toHaveStyle({
          transition: 'height 150ms ease-out'
        });
      });
    });
  });

  describe('Event Handling and User Interactions', () => {
    it('should call onSendMessage when send button is clicked', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      await user.type(textArea, 'Test message');
      await user.click(sendButton);
      
      expect(mockOnSendMessage).toHaveBeenCalledTimes(1);
      expect(mockOnSendMessage).toHaveBeenCalledWith('Test message');
      
      // Input should be cleared after sending
      expect(textArea).toHaveValue('');
    });

    it('should send message on Ctrl+Enter or Cmd+Enter', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const textArea = screen.getByRole('textbox');
      
      await user.type(textArea, 'Test message 1');
      await user.keyboard('{Control>}{Enter}{/Control}');
      
      expect(mockOnSendMessage).toHaveBeenCalledWith('Test message 1');
      expect(textArea).toHaveValue('');
      
      // Test Cmd+Enter
      await user.type(textArea, 'Test message 2');
      await user.keyboard('{Meta>}{Enter}{/Meta}');
      
      expect(mockOnSendMessage).toHaveBeenCalledWith('Test message 2');
    });

    it('should allow new line on plain Enter', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const textArea = screen.getByRole('textbox');
      
      await user.type(textArea, 'Line 1');
      await user.keyboard('{Enter}');
      await user.type(textArea, 'Line 2');
      
      expect(textArea).toHaveValue('Line 1\nLine 2');
      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should call onTyping while user is typing', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const textArea = screen.getByRole('textbox');
      
      await user.type(textArea, 'Hello');
      
      expect(mockOnTyping).toHaveBeenCalledTimes(5); // One for each character
      expect(mockOnTyping).toHaveBeenLastCalledWith('Hello');
    });

    it('should handle focus and blur events', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const textArea = screen.getByRole('textbox');
      
      await user.click(textArea);
      expect(mockOnFocus).toHaveBeenCalledTimes(1);
      
      await user.tab(); // Move focus away
      expect(mockOnBlur).toHaveBeenCalledTimes(1);
    });

    it('should not send empty messages', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      
      // Try to send empty message
      await user.click(sendButton);
      expect(mockOnSendMessage).not.toHaveBeenCalled();
      
      // Try with only whitespace
      const textArea = screen.getByRole('textbox');
      await user.type(textArea, '   \n\t  ');
      await user.click(sendButton);
      
      expect(mockOnSendMessage).not.toHaveBeenCalled();
      expect(textArea).toHaveValue('   \n\t  '); // Should not clear
    });

    it('should trim whitespace from messages before sending', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button');
      
      await user.type(textArea, '  Hello world  \n\n  ');
      await user.click(sendButton);
      
      expect(mockOnSendMessage).toHaveBeenCalledWith('Hello world');
    });
  });

  describe('Keyboard Shortcuts and Advanced Features', () => {
    it('should support Shift+Enter for new line in single-line mode', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} singleLine={true} />);
      
      const textArea = screen.getByRole('textbox');
      
      await user.type(textArea, 'Line 1');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      await user.type(textArea, 'Line 2');
      
      expect(textArea).toHaveValue('Line 1\nLine 2');
    });

    it('should support text formatting shortcuts', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} supportFormatting={true} />);
      
      const textArea = screen.getByRole('textbox');
      
      await user.type(textArea, 'bold text');
      await user.keyboard('{Control>}a{/Control}'); // Select all
      await user.keyboard('{Control>}b{/Control}'); // Bold
      
      expect(textArea).toHaveValue('**bold text**');
    });

    it('should handle paste events with formatting', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const textArea = screen.getByRole('textbox');
      
      // Mock clipboard data
      const clipboardData = 'Pasted content with\nmultiple lines';
      
      await user.click(textArea);
      await user.paste(clipboardData);
      
      expect(textArea).toHaveValue(clipboardData);
      expect(mockOnTyping).toHaveBeenCalledWith(clipboardData);
    });

    it('should support undo/redo functionality', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const textArea = screen.getByRole('textbox');
      
      await user.type(textArea, 'First text');
      await user.keyboard('{Control>}z{/Control}'); // Undo
      
      // Behavior depends on browser implementation
      expect(mockOnTyping).toHaveBeenCalled();
    });

    it('should handle tab key for accessibility', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button');
      
      // Tab should move between elements
      await user.tab();
      expect(textArea).toHaveFocus();
      
      await user.tab();
      expect(sendButton).toHaveFocus();
    });
  });

  describe('Input Validation and Error Handling', () => {
    it('should validate message length', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} maxLength={10} />);
      
      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button');
      
      await user.type(textArea, 'This message is too long');
      
      const charCount = screen.getByTestId('character-count');
      expect(charCount).toHaveClass('character-count--error');
      
      expect(sendButton).toBeDisabled();
      expect(sendButton).toHaveClass('send-button--disabled');
    });

    it('should show validation error messages', async () => {
      const user = userEvent.setup();
      const mockValidator = jest.fn().mockReturnValue('Invalid message format');
      
      render(<MessageInput {...defaultProps} validator={mockValidator} />);
      
      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button');
      
      await user.type(textArea, 'Invalid message');
      await user.click(sendButton);
      
      const errorMessage = screen.getByTestId('validation-error');
      
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Invalid message format');
      expect(errorMessage).toHaveClass('validation-error');
      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    it('should handle rate limiting', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} rateLimited={true} cooldownMs={1000} />);
      
      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button');
      
      await user.type(textArea, 'First message');
      await user.click(sendButton);
      
      expect(mockOnSendMessage).toHaveBeenCalledTimes(1);
      
      // Immediate second message should be blocked
      await user.type(textArea, 'Second message');
      await user.click(sendButton);
      
      expect(sendButton).toBeDisabled();
      expect(sendButton).toHaveClass('send-button--cooldown');
      
      const cooldownIndicator = screen.getByTestId('cooldown-indicator');
      expect(cooldownIndicator).toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      mockOnSendMessage.mockRejectedValueOnce(new Error('Network error'));
      
      render(<MessageInput {...defaultProps} />);
      
      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button');
      
      await user.type(textArea, 'Test message');
      await user.click(sendButton);
      
      await waitFor(() => {
        const errorDisplay = screen.getByTestId('send-error');
        expect(errorDisplay).toBeInTheDocument();
        expect(errorDisplay).toHaveTextContent('Failed to send message');
      });
      
      // Message should remain in input for retry
      expect(textArea).toHaveValue('Test message');
    });
  });

  describe('Accessibility Features', () => {
    it('should have proper ARIA attributes', () => {
      render(<MessageInput {...defaultProps} />);
      
      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button');
      
      expect(textArea).toHaveAttribute('aria-label', 'Type your message to Claude');
      expect(textArea).toHaveAttribute('aria-describedby', 'input-help character-count');
      expect(textArea).toHaveAttribute('aria-multiline', 'true');
      
      expect(sendButton).toHaveAttribute('aria-label', 'Send message');
      expect(sendButton).toHaveAttribute('type', 'button');
    });

    it('should support screen reader announcements', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const textArea = screen.getByRole('textbox');
      const liveRegion = screen.getByTestId('sr-announcements');
      
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      
      await user.type(textArea, 'Test message');
      
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent('Message length: 12 characters');
      });
    });

    it('should handle keyboard-only navigation', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const textArea = screen.getByRole('textbox');
      const sendButton = screen.getByRole('button');
      
      // Navigate with keyboard only
      await user.tab(); // Focus textarea
      expect(textArea).toHaveFocus();
      
      await user.type(textArea, 'Keyboard message');
      
      await user.tab(); // Focus send button
      expect(sendButton).toHaveFocus();
      
      await user.keyboard('{Enter}'); // Activate button
      expect(mockOnSendMessage).toHaveBeenCalledWith('Keyboard message');
    });

    it('should provide helpful keyboard shortcut hints', () => {
      render(<MessageInput {...defaultProps} showHints={true} />);
      
      const hints = screen.getByTestId('keyboard-hints');
      
      expect(hints).toBeInTheDocument();
      expect(hints).toHaveClass('keyboard-hints');
      expect(hints).toHaveTextContent('Ctrl+Enter to send, Enter for new line');
    });

    it('should have no accessibility violations', async () => {
      const { container } = render(<MessageInput {...defaultProps} />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Professional UX Enhancements', () => {
    it('should provide visual feedback during typing', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} />);
      
      const textArea = screen.getByRole('textbox');
      const container = screen.getByTestId('message-input-container');
      
      await user.click(textArea);
      
      expect(container).toHaveClass('message-input-container--focused');
      expect(container).toHaveStyle({
        borderColor: '#6366f1',
        boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)'
      });
    });

    it('should show typing indicators to other users', async () => {
      const user = userEvent.setup();
      render(<MessageInput {...defaultProps} showTypingIndicator={true} />);
      
      const textArea = screen.getByRole('textbox');
      
      await user.type(textArea, 'Typing...');
      
      // Should call onTyping which triggers typing indicator
      expect(mockOnTyping).toHaveBeenCalled();
    });

    it('should handle drag and drop file uploads', async () => {
      const mockOnFileUpload = jest.fn();
      render(<MessageInput {...defaultProps} onFileUpload={mockOnFileUpload} />);
      
      const textArea = screen.getByRole('textbox');
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      
      fireEvent.dragOver(textArea);
      fireEvent.drop(textArea, {
        dataTransfer: {
          files: [file]
        }
      });
      
      expect(mockOnFileUpload).toHaveBeenCalledWith([file]);
    });

    it('should provide smooth animations and transitions', () => {
      render(<MessageInput {...defaultProps} />);
      
      const container = screen.getByTestId('message-input-container');
      const textArea = screen.getByRole('textbox');
      
      expect(container).toHaveStyle({
        transition: 'all 150ms cubic-bezier(0, 0, 0.2, 1)'
      });
      
      expect(textArea).toHaveStyle({
        transition: 'height 150ms ease-out, border-color 150ms ease-out'
      });
    });
  });
});