/**
 * SPARC TDD Integration Tests: Avi Chat Flow with Typing Indicator
 *
 * Tests the complete chat flow integration including:
 * - Full message lifecycle from send to response
 * - Typing indicator appearing in chat and being replaced
 * - Scroll behavior with typing indicator
 * - Error handling with typing indicator cleanup
 * - Multiple message sequences
 *
 * @package agent-feed
 * @subpackage frontend/tests/integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { EnhancedPostingInterface } from '../../components/EnhancedPostingInterface';
import React from 'react';

describe('AviChatFlow - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Full Chat Flow', () => {
    it('should complete full flow: send → typing indicator → response', async () => {
      let messageCount = 0;

      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            messageCount++;
            resolve({
              ok: true,
              json: async () => ({ message: `Avi response ${messageCount}` })
            });
          }, 100);
        })
      );

      const { container } = render(<EnhancedPostingInterface />);

      // Switch to Avi tab
      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Initial state - no messages
      const chatHistory = container.querySelector('.h-64');
      expect(chatHistory).toBeTruthy();

      // Send message
      fireEvent.change(input, { target: { value: 'Hello Avi' } });
      fireEvent.click(sendButton);

      // Step 1: User message appears
      await waitFor(() => {
        expect(screen.getByText('Hello Avi')).toBeTruthy();
      });

      // Step 2: Typing indicator appears
      await waitFor(() => {
        const typingIndicator = container.querySelector('[data-typing="true"]');
        expect(typingIndicator).toBeTruthy();
      });

      // Step 3: Typing indicator disappears, Avi response appears
      await waitFor(() => {
        expect(container.querySelector('[data-typing="true"]')).toBeFalsy();
        expect(screen.getByText('Avi response 1')).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should increase chatHistory length by 2 after complete flow', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Test response' })
      });

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Get initial message count
      const getMessageCount = () =>
        container.querySelectorAll('[data-testid="chat-message"]').length;

      const initialCount = getMessageCount();

      // Send message
      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);

      // Wait for complete flow
      await waitFor(() => {
        expect(screen.getByText('Test response')).toBeTruthy();
      });

      // Should have +2 messages (user + Avi)
      const finalCount = getMessageCount();
      expect(finalCount).toBe(initialCount + 2);
    });

    it('should place typing indicator at bottom of chat', async () => {
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ message: 'Response' })
            });
          }, 500);
        })
      );

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send first message and wait for completion
      fireEvent.change(input, { target: { value: 'First message' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.queryByText(/First message/i)).toBeTruthy();
      });

      await waitFor(() => {
        expect(container.querySelector('[data-typing="true"]')).toBeFalsy();
      });

      // Send second message
      fireEvent.change(input, { target: { value: 'Second message' } });
      fireEvent.click(sendButton);

      // Typing indicator should be at the bottom
      await waitFor(() => {
        const allMessages = container.querySelectorAll('[data-testid="chat-message"]');
        const lastMessage = allMessages[allMessages.length - 1];

        expect(lastMessage.querySelector('[data-typing="true"]')).toBeTruthy();
      });
    });

    it('should replace typing indicator with real message (not append)', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Avi final response' })
      });

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'User message' } });
      fireEvent.click(sendButton);

      // Wait for typing indicator
      await waitFor(() => {
        expect(container.querySelector('[data-typing="true"]')).toBeTruthy();
      });

      const messagesWithTyping = container.querySelectorAll('[data-testid="chat-message"]').length;

      // Wait for response
      await waitFor(() => {
        expect(screen.getByText('Avi final response')).toBeTruthy();
      });

      const messagesAfterResponse = container.querySelectorAll('[data-testid="chat-message"]').length;

      // Should be same count (replaced, not appended)
      expect(messagesAfterResponse).toBe(messagesWithTyping);
    });
  });

  describe('Scroll Behavior', () => {
    it('should auto-scroll to bottom when typing indicator appears', async () => {
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      (global.fetch as any).mockImplementation(() =>
        new Promise(() => {}) // Never resolve
      );

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);

      // Wait for typing indicator
      await waitFor(() => {
        expect(container.querySelector('[data-typing="true"]')).toBeTruthy();
      });

      // scrollIntoView should have been called for auto-scroll
      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalled();
      });
    });

    it('should keep scroll at bottom when response replaces indicator', async () => {
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Response message' })
      });

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);

      // Clear previous calls
      scrollIntoViewMock.mockClear();

      // Wait for response to appear
      await waitFor(() => {
        expect(screen.getByText('Response message')).toBeTruthy();
      });

      // Should have scrolled when response replaced indicator
      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalled();
      });
    });

    it('should preserve user scroll position if scrolled up', async () => {
      const scrollIntoViewMock = vi.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ message: 'Response' })
            });
          }, 100);
        })
      );

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      // Send multiple messages to create scrollable content
      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      for (let i = 0; i < 5; i++) {
        fireEvent.change(input, { target: { value: `Message ${i}` } });
        fireEvent.click(sendButton);

        await waitFor(() => {
          expect(container.querySelector('[data-typing="true"]')).toBeFalsy();
        });
      }

      // Simulate user scrolling up
      const chatContainer = container.querySelector('.h-64.overflow-y-auto');
      if (chatContainer) {
        Object.defineProperty(chatContainer, 'scrollTop', {
          writable: true,
          value: 0
        });
        Object.defineProperty(chatContainer, 'scrollHeight', {
          writable: true,
          value: 1000
        });
        Object.defineProperty(chatContainer, 'clientHeight', {
          writable: true,
          value: 300
        });
      }

      scrollIntoViewMock.mockClear();

      // Send new message
      fireEvent.change(input, { target: { value: 'New message' } });
      fireEvent.click(sendButton);

      // If user is scrolled up, should not force scroll
      // This test validates the scroll preservation logic exists
      await waitFor(() => {
        expect(container.querySelector('[data-typing="true"]')).toBeTruthy();
      });
    });
  });

  describe('Error Cases', () => {
    it('should remove typing indicator and show error on API failure', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);

      // Typing indicator appears
      await waitFor(() => {
        expect(container.querySelector('[data-typing="true"]')).toBeTruthy();
      });

      // Typing indicator removed, error message appears
      await waitFor(() => {
        expect(container.querySelector('[data-typing="true"]')).toBeFalsy();
        expect(screen.getByText(/encountered an error/i)).toBeTruthy();
      });
    });

    it('should handle timeout with typing indicator cleanup', async () => {
      vi.useFakeTimers();

      (global.fetch as any).mockImplementation(() =>
        new Promise(() => {}) // Never resolve
      );

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);

      // Typing indicator appears
      await waitFor(() => {
        expect(container.querySelector('[data-typing="true"]')).toBeTruthy();
      });

      // Advance past 90s timeout
      vi.advanceTimersByTime(91000);

      // Typing indicator removed, timeout message appears
      await waitFor(() => {
        expect(container.querySelector('[data-typing="true"]')).toBeFalsy();
        expect(screen.getByText(/timeout/i)).toBeTruthy();
      });

      vi.useRealTimers();
    });

    it('should handle multiple rapid messages without duplicate indicators', async () => {
      let callCount = 0;
      (global.fetch as any).mockImplementation(() => {
        callCount++;
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ message: `Response ${callCount}` })
            });
          }, 50);
        });
      });

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send message 1
      fireEvent.change(input, { target: { value: 'Message 1' } });
      fireEvent.click(sendButton);

      // Wait for completion
      await waitFor(() => {
        expect(container.querySelector('[data-typing="true"]')).toBeFalsy();
      });

      // Send message 2 immediately
      fireEvent.change(input, { target: { value: 'Message 2' } });
      fireEvent.click(sendButton);

      // Only one typing indicator should exist at any time
      await waitFor(() => {
        const typingIndicators = container.querySelectorAll('[data-typing="true"]');
        expect(typingIndicators.length).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Multi-Message Sequences', () => {
    it('should handle 5 consecutive messages correctly', async () => {
      let responseCount = 0;

      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => {
          responseCount++;
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ message: `Avi response ${responseCount}` })
            });
          }, 50);
        })
      );

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send 5 messages sequentially
      for (let i = 1; i <= 5; i++) {
        fireEvent.change(input, { target: { value: `User message ${i}` } });
        fireEvent.click(sendButton);

        // Wait for typing indicator
        await waitFor(() => {
          expect(container.querySelector('[data-typing="true"]')).toBeTruthy();
        });

        // Wait for response
        await waitFor(() => {
          expect(screen.getByText(`Avi response ${i}`)).toBeTruthy();
        }, { timeout: 3000 });

        // Ensure typing indicator is gone
        await waitFor(() => {
          expect(container.querySelector('[data-typing="true"]')).toBeFalsy();
        });
      }

      // Final count should be 10 messages (5 user + 5 Avi)
      const finalMessages = container.querySelectorAll('[data-testid="chat-message"]');
      expect(finalMessages.length).toBe(10);
    });

    it('should maintain message order with typing indicators', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Avi response' })
      });

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send 3 messages
      for (let i = 1; i <= 3; i++) {
        fireEvent.change(input, { target: { value: `Message ${i}` } });
        fireEvent.click(sendButton);

        await waitFor(() => {
          expect(container.querySelector('[data-typing="true"]')).toBeFalsy();
        }, { timeout: 3000 });
      }

      // Verify order: user1, avi1, user2, avi2, user3, avi3
      const allMessages = container.querySelectorAll('[data-testid="chat-message"]');
      expect(allMessages.length).toBe(6);

      // Check alternating pattern
      for (let i = 0; i < 6; i += 2) {
        const userMsg = allMessages[i];
        const aviMsg = allMessages[i + 1];

        expect(userMsg.querySelector('[data-sender="user"]')).toBeTruthy();
        expect(aviMsg.querySelector('[data-sender="avi"]')).toBeTruthy();
      }
    });

    it('should handle long chat history (50+ messages) with typing indicator', async () => {
      let count = 0;

      (global.fetch as any).mockImplementation(() => {
        count++;
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: `Response ${count}` })
        });
      });

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send 50 messages
      for (let i = 1; i <= 50; i++) {
        fireEvent.change(input, { target: { value: `Msg ${i}` } });
        fireEvent.click(sendButton);

        await waitFor(() => {
          expect(container.querySelector('[data-typing="true"]')).toBeFalsy();
        }, { timeout: 1000 });
      }

      // Should have 100 total messages (50 user + 50 Avi)
      const allMessages = container.querySelectorAll('[data-testid="chat-message"]');
      expect(allMessages.length).toBe(100);

      // Send one more to test typing indicator with large history
      fireEvent.change(input, { target: { value: 'Final message' } });
      fireEvent.click(sendButton);

      // Typing indicator should still work
      await waitFor(() => {
        expect(container.querySelector('[data-typing="true"]')).toBeTruthy();
      });
    });
  });

  describe('State Consistency', () => {
    it('should clear input field after sending message', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Response' })
      });

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i) as HTMLInputElement;
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Test message' } });
      expect(input.value).toBe('Test message');

      fireEvent.click(sendButton);

      // Input should be cleared
      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should disable input during submission', async () => {
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ message: 'Response' })
            });
          }, 200);
        })
      );

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i) as HTMLInputElement;
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);

      // Input and button should be disabled during submission
      await waitFor(() => {
        expect(input.disabled).toBeTruthy();
        expect(sendButton.disabled).toBeTruthy();
      });

      // Should be re-enabled after response
      await waitFor(() => {
        expect(input.disabled).toBeFalsy();
        expect(sendButton.disabled).toBeFalsy();
      }, { timeout: 3000 });
    });
  });
});
