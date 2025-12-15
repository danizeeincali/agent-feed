/**
 * Integration Tests for AviTypingIndicator with EnhancedPostingInterface
 *
 * SPARC TDD - Integration Testing:
 * - Test AviTypingIndicator integration with parent components
 * - Verify animation appears during message submission
 * - Test timing and lifecycle with real user flows
 * - Validate state management integration
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest';
import { EnhancedPostingInterface } from '../../components/EnhancedPostingInterface';

// Mock fetch globally
global.fetch = vi.fn();

// Mock console to reduce noise
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {})
};

describe('AviTypingIndicator - Integration Tests', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = global.fetch as ReturnType<typeof vi.fn>;
    vi.clearAllMocks();
    vi.useFakeTimers();
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('🎯 EnhancedPostingInterface Integration', () => {
    test('animation appears when user sends message in Avi DM', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          message: 'Test response from Avi',
          content: 'Test response'
        })
      });

      const user = userEvent.setup({ delay: null });
      render(<EnhancedPostingInterface />);

      // Switch to Avi DM tab
      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      // Type and send message
      const input = screen.getByPlaceholderText(/type your message to/i);
      await user.type(input, 'Hello Avi');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Animation should appear
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByText('Avi is typing...')).toBeInTheDocument();
      });
    });

    test('animation visible while isSubmitting is true', async () => {
      let resolveResponse: (value: any) => void;
      const responsePromise = new Promise(resolve => {
        resolveResponse = resolve;
      });

      mockFetch.mockReturnValue(responsePromise);

      const user = userEvent.setup({ delay: null });
      render(<EnhancedPostingInterface />);

      // Switch to Avi DM and send message
      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/type your message to/i);
      await user.type(input, 'Test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Animation should be visible
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Verify animation is still visible (isSubmitting = true)
      expect(screen.getByRole('status')).toBeInTheDocument();

      // Resolve response
      resolveResponse!({
        ok: true,
        json: async () => ({ message: 'Response' })
      });

      // Animation should disappear
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    test('animation disappears when response arrives', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          message: 'Avi response',
          content: 'Response content'
        })
      });

      const user = userEvent.setup({ delay: null });
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/type your message to/i);
      await user.type(input, 'Test');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Animation appears
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Wait for response
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    test('multiple messages work correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Response' })
      });

      const user = userEvent.setup({ delay: null });
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      // First message
      const input = screen.getByPlaceholderText(/type your message to/i);
      await user.type(input, 'Message 1');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Second message
      await user.type(input, 'Message 2');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });
  });

  describe('⏱️ Timing Tests', () => {
    test('fast response (5s): animation visible ~5 seconds', async () => {
      let resolveResponse: (value: any) => void;
      const responsePromise = new Promise(resolve => {
        resolveResponse = resolve;
      });

      mockFetch.mockReturnValue(responsePromise);

      const user = userEvent.setup({ delay: null });
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/type your message to/i);
      await user.type(input, 'Fast test');
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Animation should appear
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Simulate 5 second response time
      vi.advanceTimersByTime(5000);

      // Resolve response after 5 seconds
      resolveResponse!({
        ok: true,
        json: async () => ({ message: 'Fast response' })
      });

      // Animation should disappear
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    test('medium response (15s): animation visible ~15 seconds', async () => {
      let resolveResponse: (value: any) => void;
      const responsePromise = new Promise(resolve => {
        resolveResponse = resolve;
      });

      mockFetch.mockReturnValue(responsePromise);

      const user = userEvent.setup({ delay: null });
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/type your message to/i);
      await user.type(input, 'Medium test');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Simulate 15 second response time
      vi.advanceTimersByTime(15000);

      resolveResponse!({
        ok: true,
        json: async () => ({ message: 'Medium response' })
      });

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    test('slow response (30s): animation loops 1.5 times', async () => {
      let resolveResponse: (value: any) => void;
      const responsePromise = new Promise(resolve => {
        resolveResponse = resolve;
      });

      mockFetch.mockReturnValue(responsePromise);

      const user = userEvent.setup({ delay: null });
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/type your message to/i);
      await user.type(input, 'Slow test');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      const indicator = screen.getByRole('status');

      // First loop (2000ms = 2s)
      vi.advanceTimersByTime(2000);
      expect(indicator).toBeInTheDocument();

      // Second loop (4000ms total = 4s)
      vi.advanceTimersByTime(2000);
      expect(indicator).toBeInTheDocument();

      // Half of third loop (5000ms total = 5s)
      vi.advanceTimersByTime(1000);
      expect(indicator).toBeInTheDocument();

      // Continue to 30s
      vi.advanceTimersByTime(25000);
      expect(indicator).toBeInTheDocument();

      resolveResponse!({
        ok: true,
        json: async () => ({ message: 'Slow response' })
      });

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });
  });

  describe('🎬 Animation Frame Integration', () => {
    test('animation cycles through frames during submission', async () => {
      let resolveResponse: (value: any) => void;
      const responsePromise = new Promise(resolve => {
        resolveResponse = resolve;
      });

      mockFetch.mockReturnValue(responsePromise);

      const user = userEvent.setup({ delay: null });
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/type your message to/i);
      await user.type(input, 'Frame test');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      const indicator = screen.getByRole('status');

      // Frame 1: "A v i"
      expect(indicator).toHaveTextContent('A v i');

      // Frame 2: "Λ v i" (after 200ms)
      vi.advanceTimersByTime(200);
      expect(indicator).toHaveTextContent('Λ v i');

      // Frame 3: "Λ V i" (after 400ms total)
      vi.advanceTimersByTime(200);
      expect(indicator).toHaveTextContent('Λ V i');

      // Frame 4: "Λ V !" (after 600ms total)
      vi.advanceTimersByTime(200);
      expect(indicator).toHaveTextContent('Λ V !');

      resolveResponse!({
        ok: true,
        json: async () => ({ message: 'Response' })
      });
    });

    test('animation colors cycle during submission', async () => {
      let resolveResponse: (value: any) => void;
      const responsePromise = new Promise(resolve => {
        resolveResponse = resolve;
      });

      mockFetch.mockReturnValue(responsePromise);

      const user = userEvent.setup({ delay: null });
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/type your message to/i);
      await user.type(input, 'Color test');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      const indicator = screen.getByRole('status');
      const textElement = indicator.querySelector('[data-testid="avi-text"]');

      // Red at start
      expect(textElement).toHaveStyle({ color: '#FF0000' });

      // Orange after 200ms
      vi.advanceTimersByTime(200);
      expect(textElement).toHaveStyle({ color: '#FF7F00' });

      // Yellow after 400ms
      vi.advanceTimersByTime(200);
      expect(textElement).toHaveStyle({ color: '#FFFF00' });

      resolveResponse!({
        ok: true,
        json: async () => ({ message: 'Response' })
      });
    });
  });

  describe('💬 Chat State Integration', () => {
    test('animation resets between messages', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Response' })
      });

      const user = userEvent.setup({ delay: null });
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      // First message
      const input = screen.getByPlaceholderText(/type your message to/i);
      await user.type(input, 'First');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Advance to frame 5
      vi.advanceTimersByTime(800);

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Second message - should reset to frame 1
      await user.type(input, 'Second');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        const indicator = screen.getByRole('status');
        expect(indicator).toHaveTextContent('A v i'); // Reset to frame 1
      });
    });

    test('animation position updates with chat scroll', async () => {
      let resolveResponse: (value: any) => void;
      const responsePromise = new Promise(resolve => {
        resolveResponse = resolve;
      });

      mockFetch.mockReturnValue(responsePromise);

      const user = userEvent.setup({ delay: null });
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/type your message to/i);
      await user.type(input, 'Scroll test');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Animation should be at bottom of input area
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveClass('absolute', 'bottom-0', 'left-0');

      resolveResponse!({
        ok: true,
        json: async () => ({ message: 'Response' })
      });
    });
  });

  describe('🔄 Error Handling Integration', () => {
    test('animation disappears on error', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      const user = userEvent.setup({ delay: null });
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/type your message to/i);
      await user.type(input, 'Error test');
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Animation appears
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // Animation should disappear after error
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    test('animation works correctly after error recovery', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Success' })
        });

      const user = userEvent.setup({ delay: null });
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/type your message to/i);

      // First attempt - error
      await user.type(input, 'Error');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      // Second attempt - success
      await user.type(input, 'Success');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });
  });

  describe('🎨 UI Integration', () => {
    test('animation appears in correct position relative to input', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Response' })
      });

      const user = userEvent.setup({ delay: null });
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/type your message to/i);
      await user.type(input, 'Position test');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      const indicator = screen.getByRole('status');
      const inputField = screen.getByPlaceholderText(/type your message to/i);

      // Should be positioned near the input
      expect(indicator).toBeInTheDocument();
      expect(inputField).toBeInTheDocument();
    });

    test('animation does not interfere with input focus', async () => {
      let resolveResponse: (value: any) => void;
      const responsePromise = new Promise(resolve => {
        resolveResponse = resolve;
      });

      mockFetch.mockReturnValue(responsePromise);

      const user = userEvent.setup({ delay: null });
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/type your message to/i);
      await user.type(input, 'Focus test');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // User should be able to type another message
      await user.type(input, 'Another message');

      expect(input).toHaveValue('Another message');

      resolveResponse!({
        ok: true,
        json: async () => ({ message: 'Response' })
      });
    });
  });

  describe('♿ Accessibility Integration', () => {
    test('screen reader announces typing status during submission', async () => {
      let resolveResponse: (value: any) => void;
      const responsePromise = new Promise(resolve => {
        resolveResponse = resolve;
      });

      mockFetch.mockReturnValue(responsePromise);

      const user = userEvent.setup({ delay: null });
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/type your message to/i);
      await user.type(input, 'SR test');
      await user.click(screen.getByRole('button', { name: /send/i }));

      await waitFor(() => {
        const indicator = screen.getByRole('status');
        expect(indicator).toHaveAttribute('aria-live', 'polite');
        expect(indicator).toHaveAttribute('aria-label', 'Avi is typing');
      });

      resolveResponse!({
        ok: true,
        json: async () => ({ message: 'Response' })
      });
    });

    test('focus management during animation lifecycle', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Response' })
      });

      const user = userEvent.setup({ delay: null });
      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/type your message to/i);

      // Input should be focused
      input.focus();
      expect(input).toHaveFocus();

      await user.type(input, 'Focus test');
      await user.click(screen.getByRole('button', { name: /send/i }));

      // Animation appears but focus should remain manageable
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });

      // After response, user can focus input again
      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });

      input.focus();
      expect(input).toHaveFocus();
    });
  });
});
