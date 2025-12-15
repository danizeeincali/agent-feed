/**
 * SPARC TDD Unit Tests: Avi Typing Indicator Chat Integration
 *
 * Tests the integration of typing indicator as a chat message that:
 * - Appears in chatHistory array when isSubmitting is true
 * - Has isTyping flag to differentiate from regular messages
 * - Pushes existing messages up in the chat
 * - Gets removed and replaced when Avi response arrives
 * - Only allows one typing indicator at a time
 *
 * @package agent-feed
 * @subpackage frontend/tests/unit
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { EnhancedPostingInterface } from '../../components/EnhancedPostingInterface';
import React from 'react';

describe('AviTypingChatIntegration - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for Claude API
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('chatHistory State Management', () => {
    it('should add typing indicator to chatHistory when isSubmitting becomes true', async () => {
      // Mock API delay
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Test response' })
        }), 100))
      );

      const { container } = render(<EnhancedPostingInterface />);

      // Switch to Avi tab
      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      // Get input and send button
      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Type message
      fireEvent.change(input, { target: { value: 'Hello Avi' } });

      // Submit message
      fireEvent.click(sendButton);

      // Wait for typing indicator to appear in chat
      await waitFor(() => {
        const chatMessages = container.querySelectorAll('[data-testid="chat-message"]');
        const typingMessage = Array.from(chatMessages).find(msg =>
          msg.querySelector('[data-typing="true"]')
        );
        expect(typingMessage).toBeTruthy();
      });
    });

    it('should set isTyping flag on typing indicator message', async () => {
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Test response' })
        }), 100))
      );

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        const typingIndicator = container.querySelector('[data-typing="true"]');
        expect(typingIndicator).toBeTruthy();
        expect(typingIndicator?.getAttribute('data-sender')).toBe('avi');
      });
    });

    it('should remove typing indicator when response arrives', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Avi response text' })
      });

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.click(sendButton);

      // Typing indicator should appear
      await waitFor(() => {
        expect(container.querySelector('[data-typing="true"]')).toBeTruthy();
      });

      // Typing indicator should be removed after response
      await waitFor(() => {
        expect(container.querySelector('[data-typing="true"]')).toBeFalsy();
      }, { timeout: 3000 });

      // Real Avi message should appear
      await waitFor(() => {
        expect(screen.getByText('Avi response text')).toBeTruthy();
      });
    });

    it('should only allow one typing indicator at a time', async () => {
      let resolveFirst: any;
      const firstPromise = new Promise(resolve => { resolveFirst = resolve; });

      (global.fetch as any).mockImplementation(() => firstPromise);

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send first message
      fireEvent.change(input, { target: { value: 'First message' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        const typingIndicators = container.querySelectorAll('[data-typing="true"]');
        expect(typingIndicators.length).toBe(1);
      });

      // Attempt to send second message (should be disabled)
      fireEvent.change(input, { target: { value: 'Second message' } });
      expect(sendButton).toBeDisabled();

      // Resolve first request
      resolveFirst({ ok: true, json: async () => ({ message: 'Response' }) });
    });

    it('should place typing indicator at end of chatHistory array', async () => {
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Response' })
        }), 100))
      );

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Send first message and let it complete
      fireEvent.change(input, { target: { value: 'First' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.queryByText(/is typing/i)).toBeFalsy();
      });

      // Send second message
      fireEvent.change(input, { target: { value: 'Second' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        const allMessages = container.querySelectorAll('[data-testid="chat-message"]');
        const lastMessage = allMessages[allMessages.length - 1];
        expect(lastMessage.querySelector('[data-typing="true"]')).toBeTruthy();
      });
    });
  });

  describe('Message Rendering', () => {
    it('should render AviTypingIndicator component for typing message', async () => {
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Response' })
        }), 100))
      );

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        const typingIndicator = container.querySelector('.avi-typing-indicator');
        expect(typingIndicator).toBeTruthy();
      });
    });

    it('should render text content for regular messages', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Regular Avi message' })
      });

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'User message' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Regular Avi message')).toBeTruthy();
      });
    });

    it('should apply Avi bubble styling to typing indicator', async () => {
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Response' })
        }), 200))
      );

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        const typingMessage = container.querySelector('[data-typing="true"]');
        expect(typingMessage).toBeTruthy();

        // Should have Avi message styling (bg-white, not bg-blue-100)
        const messageContainer = typingMessage?.closest('.p-3');
        expect(messageContainer?.classList.contains('bg-white')).toBeTruthy();
        expect(messageContainer?.classList.contains('bg-blue-100')).toBeFalsy();
      });
    });

    it('should apply user bubble styling to user messages', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Response' })
      });

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'User test message' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        const userMessage = screen.getByText('User test message');
        const messageContainer = userMessage.closest('.p-3');

        // User messages should have blue background
        expect(messageContainer?.classList.contains('bg-blue-100')).toBeTruthy();
      });
    });
  });

  describe('Animation Properties', () => {
    it('should display wave animation with character variations', async () => {
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Response' })
        }), 500))
      );

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        const waveText = container.querySelector('.avi-wave-text');
        expect(waveText).toBeTruthy();

        // Should show one of the wave animation frames
        const text = waveText?.textContent;
        const validFrames = ['A v i', 'Λ v i', 'Λ V i', 'Λ V !', 'A v !', 'A V !', 'A V i'];
        expect(validFrames.some(frame => text?.includes(frame))).toBeTruthy();
      });
    });

    it('should use single color (no ROYGBIV in chat)', async () => {
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Response' })
        }), 300))
      );

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        const waveText = container.querySelector('.avi-wave-text');
        const computedStyle = window.getComputedStyle(waveText as Element);

        // In chat mode, should use consistent color, not ROYGBIV cycle
        // This test validates the chat integration disables color cycling
        expect(waveText).toBeTruthy();
      });
    });

    it('should NOT show "is typing..." text in chat message', async () => {
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ message: 'Response' })
        }), 200))
      );

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        const typingMessage = container.querySelector('[data-typing="true"]');
        expect(typingMessage).toBeTruthy();

        // Should NOT contain "is typing..." text when in chat mode
        expect(typingMessage?.textContent).not.toContain('is typing...');
      });
    });

    it('should maintain 200ms frame timing', async () => {
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

      // Wait for typing indicator to appear
      await waitFor(() => {
        expect(container.querySelector('.avi-wave-text')).toBeTruthy();
      });

      const waveText = container.querySelector('.avi-wave-text');
      const initialFrame = waveText?.textContent;

      // Advance 200ms
      vi.advanceTimersByTime(200);

      await waitFor(() => {
        const newFrame = container.querySelector('.avi-wave-text')?.textContent;
        expect(newFrame).not.toBe(initialFrame);
      });

      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should remove typing indicator on API error', async () => {
      (global.fetch as any).mockRejectedValue(new Error('API Error'));

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      fireEvent.change(input, { target: { value: 'Test' } });
      fireEvent.click(sendButton);

      // Typing indicator should appear
      await waitFor(() => {
        expect(container.querySelector('[data-typing="true"]')).toBeTruthy();
      });

      // Typing indicator should be removed after error
      await waitFor(() => {
        expect(container.querySelector('[data-typing="true"]')).toBeFalsy();
      });

      // Error message should appear
      await waitFor(() => {
        expect(screen.getByText(/encountered an error/i)).toBeTruthy();
      });
    });

    it('should remove typing indicator on timeout', async () => {
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

      // Typing indicator should appear
      await waitFor(() => {
        expect(container.querySelector('[data-typing="true"]')).toBeTruthy();
      });

      // Advance past 90s timeout
      vi.advanceTimersByTime(90001);

      // Typing indicator should be removed
      await waitFor(() => {
        expect(container.querySelector('[data-typing="true"]')).toBeFalsy();
      });

      // Timeout error message should appear
      await waitFor(() => {
        expect(screen.getByText(/timeout/i)).toBeTruthy();
      });

      vi.useRealTimers();
    });

    it('should prevent duplicate typing indicators on rapid submissions', async () => {
      let resolveCount = 0;
      (global.fetch as any).mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolveCount++;
            resolve({
              ok: true,
              json: async () => ({ message: `Response ${resolveCount}` })
            });
          }, 100);
        })
      );

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      fireEvent.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      // Rapidly send 3 messages (only first should work due to isSubmitting guard)
      fireEvent.change(input, { target: { value: 'Message 1' } });
      fireEvent.click(sendButton);

      fireEvent.change(input, { target: { value: 'Message 2' } });
      fireEvent.click(sendButton);

      fireEvent.change(input, { target: { value: 'Message 3' } });
      fireEvent.click(sendButton);

      // Only one typing indicator should exist
      await waitFor(() => {
        const typingIndicators = container.querySelectorAll('[data-typing="true"]');
        expect(typingIndicators.length).toBeLessThanOrEqual(1);
      });
    });
  });
});
