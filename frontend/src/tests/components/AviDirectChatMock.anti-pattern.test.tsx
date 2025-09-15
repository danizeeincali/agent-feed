/**
 * Anti-Pattern Tests for AviDirectChatMock
 *
 * These tests validate that the mock implementation contains the expected
 * hardcoded patterns that we want to AVOID in the real implementation.
 * This serves as a control group to ensure our real tests are working correctly.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, beforeEach, expect } from 'vitest';
import { AviDirectChat } from '../../components/posting-interface/AviDirectChatMock';

// Mock fetch to prevent actual API calls
global.fetch = vi.fn();

describe('AviDirectChatMock - Anti-Pattern Validation (What We DON\'T Want)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: {} })
    });
  });

  describe('🚨 Hardcoded Mock Patterns (Anti-Patterns)', () => {
    test('SHOULD contain generateAviResponse function (mock behavior)', async () => {
      // This test validates that the mock version DOES have hardcoded responses
      // We want to ensure these patterns are NOT in the real implementation

      const user = userEvent.setup();
      render(<AviDirectChat />);

      // Send "hello" message
      const messageInput = screen.getByRole('textbox', { name: /chat with/i });
      await user.type(messageInput, 'hello');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // The mock should generate a response using generateAviResponse
      await waitFor(() => {
        // Look for the hardcoded greeting pattern from generateAviResponse
        expect(screen.getByText(/Hello! Great to meet you!/i)).toBeInTheDocument();
        expect(screen.getByText(/I'm Avi, your AI coding assistant/i)).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    test('SHOULD use setTimeout for fake response delays (mock behavior)', async () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      const user = userEvent.setup();
      render(<AviDirectChat />);

      const messageInput = screen.getByRole('textbox', { name: /chat with/i });
      await user.type(messageInput, 'test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // The mock should use setTimeout to simulate response delay
      expect(setTimeoutSpy).toHaveBeenCalled();

      // Look for setTimeout calls with delays in the 1-5 second range (typical for mocks)
      const mockDelayTimeouts = setTimeoutSpy.mock.calls.filter(call =>
        call[1] && call[1] >= 1500 && call[1] <= 4000
      );
      expect(mockDelayTimeouts.length).toBeGreaterThan(0);

      setTimeoutSpy.mockRestore();
    });

    test('SHOULD generate contextual responses without API calls (mock behavior)', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      const user = userEvent.setup();
      render(<AviDirectChat />);

      // Test different message types that should trigger different mock responses
      const testMessages = [
        { input: 'debug my code', expectedPattern: /debug.*together/i },
        { input: 'review this', expectedPattern: /review.*code/i },
        { input: 'architecture help', expectedPattern: /architecture.*scalable/i }
      ];

      for (const { input, expectedPattern } of testMessages) {
        const messageInput = screen.getByRole('textbox', { name: /chat with/i });
        await user.clear(messageInput);
        await user.type(messageInput, input);

        const sendButton = screen.getByRole('button', { name: /send/i });
        await user.click(sendButton);

        await waitFor(() => {
          expect(screen.getByText(expectedPattern)).toBeInTheDocument();
        }, { timeout: 5000 });
      }

      // Should NOT have made Claude API calls (only the initial agent-posts call)
      const claudeApiCalls = fetchSpy.mock.calls.filter(call =>
        call[0] && typeof call[0] === 'string' && call[0].includes('claude-instances')
      );
      expect(claudeApiCalls).toHaveLength(0);

      fetchSpy.mockRestore();
    });

    test('SHOULD NOT create real Claude instances (mock behavior)', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      render(<AviDirectChat />);

      // Wait a bit to see if any initialization calls are made
      await waitFor(() => {
        // Should not have called claude-instances API
        const claudeInstanceCalls = fetchSpy.mock.calls.filter(call =>
          call[0] && typeof call[0] === 'string' && call[0].includes('/api/claude-instances')
        );
        expect(claudeInstanceCalls).toHaveLength(0);
      });

      fetchSpy.mockRestore();
    });
  });

  describe('📋 Mock Implementation Validation', () => {
    test('validates mock component uses agent-posts API instead of claude-instances', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'mock-post-123' } })
      });

      const user = userEvent.setup();
      render(<AviDirectChat />);

      const messageInput = screen.getByRole('textbox', { name: /chat with/i });
      await user.type(messageInput, 'test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Should call agent-posts, not claude-instances
      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith('/api/agent-posts',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('"isAviMessage":true')
          })
        );
      });

      fetchSpy.mockRestore();
    });

    test('validates mock responses are generated client-side', async () => {
      const user = userEvent.setup();
      render(<AviDirectChat />);

      // Send multiple different messages
      const messages = ['hello', 'debug help', 'architecture advice', 'performance tips'];

      for (const message of messages) {
        const messageInput = screen.getByRole('textbox', { name: /chat with/i });
        await user.clear(messageInput);
        await user.type(messageInput, message);

        const sendButton = screen.getByRole('button', { name: /send/i });
        await user.click(sendButton);

        // Each should generate an immediate client-side response
        await waitFor(() => {
          const assistantMessages = screen.getAllByText(new RegExp('.+', 'i')).filter(el =>
            el.closest('[data-testid*="message"]')
          );
          expect(assistantMessages.length).toBeGreaterThan(0);
        }, { timeout: 5000 });
      }
    });
  });
});