import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedPostingInterface } from '@/components/EnhancedPostingInterface';

/**
 * Integration tests for full-width Avi activity indicator
 *
 * These tests verify that the AviTypingIndicator component properly spans
 * the full width of its container when displayed in the chat interface.
 *
 * Test Scenarios:
 * 1. Indicator spans full width in message list
 * 2. No overflow with long activity text
 * 3. Layout stability during activity updates
 * 4. Edge cases (very long text, empty text)
 */
describe('Avi Activity Indicator - Full Width Integration', () => {
  let mockEventSource: any;

  beforeEach(() => {
    // Mock EventSource for SSE streaming
    mockEventSource = {
      onmessage: null,
      onerror: null,
      onopen: null,
      close: vi.fn(),
      readyState: EventSource.OPEN,
    };

    (global as any).EventSource = vi.fn(() => mockEventSource);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Full Width Layout', () => {
    it('should span full width in message list', async () => {
      const user = userEvent.setup();

      // Mock delayed API response to keep typing indicator visible
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ message: 'Test response from Avi' }),
                }),
              2000
            )
          )
      );

      const { container } = render(<EnhancedPostingInterface />);

      // Switch to Avi DM tab
      const aviTab = screen.getByText('Avi DM');
      await user.click(aviTab);

      // Send message to trigger typing indicator
      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      await user.type(input, 'test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Wait for typing indicator to appear
      await waitFor(() => {
        const indicator = screen.getByRole('status', { name: /Avi is thinking/i });
        expect(indicator).toBeInTheDocument();
      }, { timeout: 2000 });

      // Trigger SSE connection open
      if (mockEventSource.onopen) {
        mockEventSource.onopen();
      }

      // Simulate SSE activity message
      const activityMessage = {
        type: 'tool_activity',
        data: {
          tool: 'Read',
          action: 'package.json',
          priority: 'high',
          timestamp: Date.now(),
        },
      };

      if (mockEventSource.onmessage) {
        mockEventSource.onmessage({
          data: JSON.stringify(activityMessage),
        });
      }

      // Wait for activity text to update
      await waitFor(() => {
        expect(screen.getByText(/Read\(package\.json\)/i)).toBeInTheDocument();
      });

      // Get the indicator element and its container
      const indicatorElement = screen.getByRole('status', { name: /Avi is thinking/i });
      const messageContainer = indicatorElement.closest('.p-3');

      // Measure widths using DOM API
      const indicatorWidth = indicatorElement.offsetWidth || 0;
      const containerWidth = messageContainer?.offsetWidth || 0;

      console.log(`Indicator width: ${indicatorWidth}px`);
      console.log(`Container width: ${containerWidth}px`);

      // Indicator should be close to container width (within 50px for padding/margin)
      // This allows for the message bubble padding (p-3 = 0.75rem ≈ 12px on each side)
      const widthDifference = Math.abs(indicatorWidth - containerWidth);
      console.log(`Width difference: ${widthDifference}px`);

      // PASS CRITERIA: Width difference should be less than 50px
      // This accounts for padding, borders, and potential scroll bars
      expect(widthDifference).toBeLessThan(50);
    });

    it('should not overflow container with very long activity text', async () => {
      const user = userEvent.setup();

      // Mock delayed response
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ message: 'Response' }),
                }),
              2000
            )
          )
      );

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      await user.type(input, 'test');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Wait for typing indicator
      await waitFor(() => {
        expect(screen.getByRole('status', { name: /Avi is thinking/i })).toBeInTheDocument();
      });

      // Trigger SSE
      if (mockEventSource.onopen) {
        mockEventSource.onopen();
      }

      // Simulate VERY long activity text (200 characters)
      const longActivity = {
        type: 'tool_activity',
        data: {
          tool: 'Task',
          action: 'A'.repeat(200), // 200 'A' characters
          priority: 'high',
          timestamp: Date.now(),
        },
      };

      if (mockEventSource.onmessage) {
        mockEventSource.onmessage({
          data: JSON.stringify(longActivity),
        });
      }

      // Wait for activity to update
      await waitFor(() => {
        const activityText = screen.getByText(/Task\(/i);
        expect(activityText).toBeInTheDocument();
      });

      // Get elements
      const indicatorElement = screen.getByRole('status', { name: /Avi is thinking/i });
      const chatContainer = container.querySelector('.h-64'); // Chat history container

      const indicatorWidth = indicatorElement.offsetWidth || 0;
      const chatWidth = chatContainer?.offsetWidth || 0;

      console.log(`Long text - Indicator width: ${indicatorWidth}px`);
      console.log(`Long text - Chat container width: ${chatWidth}px`);

      // Indicator should NOT exceed chat container width
      expect(indicatorWidth).toBeLessThanOrEqual(chatWidth);

      // Verify no horizontal scroll on chat container
      const hasHorizontalScroll = chatContainer
        ? chatContainer.scrollWidth > chatContainer.clientWidth
        : false;

      console.log(`Has horizontal scroll: ${hasHorizontalScroll}`);
      expect(hasHorizontalScroll).toBe(false);

      // Verify text is truncated with ellipsis
      const activityTextElement = screen.getByText(/Task\(/i);
      const textContent = activityTextElement.textContent || '';

      console.log(`Activity text length: ${textContent.length}`);
      console.log(`Activity text content: ${textContent}`);

      // Text should be truncated to 80 chars + "- " + "..." ≈ 85 chars max
      expect(textContent.length).toBeLessThan(90);
      expect(textContent).toContain('...');
    });

    it('should maintain stable width during activity text updates', async () => {
      const user = userEvent.setup();

      // Mock delayed response
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ message: 'Response' }),
                }),
              3000
            )
          )
      );

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      await user.type(input, 'test');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Wait for typing indicator
      await waitFor(() => {
        expect(screen.getByRole('status', { name: /Avi is thinking/i })).toBeInTheDocument();
      });

      // Trigger SSE
      if (mockEventSource.onopen) {
        mockEventSource.onopen();
      }

      // First activity: Short text
      const shortActivity = {
        type: 'tool_activity',
        data: {
          tool: 'Bash',
          action: 'ls',
          priority: 'high',
          timestamp: Date.now(),
        },
      };

      if (mockEventSource.onmessage) {
        mockEventSource.onmessage({
          data: JSON.stringify(shortActivity),
        });
      }

      // Wait for short activity
      await waitFor(() => {
        expect(screen.getByText(/Bash\(ls\)/i)).toBeInTheDocument();
      });

      // Measure initial width
      const indicatorElement = screen.getByRole('status', { name: /Avi is thinking/i });
      const initialWidth = indicatorElement.offsetWidth || 0;

      console.log(`Initial width (short text): ${initialWidth}px`);

      // Second activity: Much longer text
      const longActivity = {
        type: 'tool_activity',
        data: {
          tool: 'Read',
          action: '/workspaces/agent-feed/frontend/package.json - analyzing dependencies',
          priority: 'high',
          timestamp: Date.now(),
        },
      };

      if (mockEventSource.onmessage) {
        mockEventSource.onmessage({
          data: JSON.stringify(longActivity),
        });
      }

      // Wait for long activity
      await waitFor(() => {
        expect(screen.getByText(/Read\(/i)).toBeInTheDocument();
      });

      // Measure updated width
      const updatedWidth = indicatorElement.offsetWidth || 0;

      console.log(`Updated width (long text): ${updatedWidth}px`);
      console.log(`Width difference: ${Math.abs(updatedWidth - initialWidth)}px`);

      // Width should remain the same (100% of container)
      // Allow small tolerance for rounding errors (5px)
      const widthChange = Math.abs(updatedWidth - initialWidth);
      expect(widthChange).toBeLessThan(5);

      // Verify indicator is still full-width
      const messageContainer = indicatorElement.closest('.p-3');
      const containerWidth = messageContainer?.offsetWidth || 0;
      const finalDifference = Math.abs(updatedWidth - containerWidth);

      console.log(`Final container width: ${containerWidth}px`);
      console.log(`Final width difference: ${finalDifference}px`);

      expect(finalDifference).toBeLessThan(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty activity text gracefully', async () => {
      const user = userEvent.setup();

      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ message: 'Response' }),
                }),
              2000
            )
          )
      );

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      await user.type(input, 'test');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Wait for typing indicator
      await waitFor(() => {
        expect(screen.getByRole('status', { name: /Avi is thinking/i })).toBeInTheDocument();
      });

      // Empty activity (no onmessage call or empty activity)
      // Indicator should still render and be full-width

      const indicatorElement = screen.getByRole('status', { name: /Avi is thinking/i });
      const messageContainer = indicatorElement.closest('.p-3');

      const indicatorWidth = indicatorElement.offsetWidth || 0;
      const containerWidth = messageContainer?.offsetWidth || 0;

      console.log(`Empty activity - Indicator width: ${indicatorWidth}px`);
      console.log(`Empty activity - Container width: ${containerWidth}px`);

      // Should still be full-width even without activity text
      const widthDifference = Math.abs(indicatorWidth - containerWidth);
      expect(widthDifference).toBeLessThan(50);
    });

    it('should handle rapid activity updates without layout issues', async () => {
      const user = userEvent.setup();

      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ message: 'Response' }),
                }),
              3000
            )
          )
      );

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      await user.type(input, 'test');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Wait for typing indicator
      await waitFor(() => {
        expect(screen.getByRole('status', { name: /Avi is thinking/i })).toBeInTheDocument();
      });

      // Trigger SSE
      if (mockEventSource.onopen) {
        mockEventSource.onopen();
      }

      // Simulate rapid activity updates (5 in quick succession)
      const activities = [
        { tool: 'Bash', action: 'git status' },
        { tool: 'Read', action: 'package.json' },
        { tool: 'Grep', action: 'searching for imports' },
        { tool: 'Edit', action: 'updating component' },
        { tool: 'Bash', action: 'npm test' },
      ];

      // Send all activities rapidly
      for (const activity of activities) {
        if (mockEventSource.onmessage) {
          mockEventSource.onmessage({
            data: JSON.stringify({
              type: 'tool_activity',
              data: {
                ...activity,
                priority: 'high',
                timestamp: Date.now(),
              },
            }),
          });
        }
        // Small delay between updates (50ms)
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Wait for last activity to appear
      await waitFor(() => {
        expect(screen.getByText(/Bash\(npm test\)/i)).toBeInTheDocument();
      });

      // Verify layout is still stable
      const indicatorElement = screen.getByRole('status', { name: /Avi is thinking/i });
      const messageContainer = indicatorElement.closest('.p-3');

      const indicatorWidth = indicatorElement.offsetWidth || 0;
      const containerWidth = messageContainer?.offsetWidth || 0;

      console.log(`After rapid updates - Indicator width: ${indicatorWidth}px`);
      console.log(`After rapid updates - Container width: ${containerWidth}px`);

      // Should still be full-width
      const widthDifference = Math.abs(indicatorWidth - containerWidth);
      expect(widthDifference).toBeLessThan(50);

      // Verify no console errors (React should handle rapid updates gracefully)
      // This is implicitly tested - if there are errors, the test would fail earlier
    });
  });

  describe('Message Container Verification', () => {
    it('should not constrain other messages when indicator is full-width', async () => {
      const user = userEvent.setup();

      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ message: 'Avi response message' }),
                }),
              2000
            )
          )
      );

      const { container } = render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      await user.click(aviTab);

      // Send first message
      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      await user.type(input, 'first message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Wait for response
      await waitFor(() => {
        expect(screen.getByText(/Avi response message/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // Measure first message width
      const firstMessage = screen.getByText('first message');
      const firstMessageContainer = firstMessage.closest('.p-3');
      const firstMessageWidth = firstMessageContainer?.offsetWidth || 0;

      console.log(`First message width: ${firstMessageWidth}px`);

      // Send second message to trigger typing indicator again
      await user.type(input, 'second message');
      await user.click(sendButton);

      // Wait for typing indicator
      await waitFor(() => {
        expect(screen.getByRole('status', { name: /Avi is thinking/i })).toBeInTheDocument();
      });

      // Measure typing indicator width
      const indicatorElement = screen.getByRole('status', { name: /Avi is thinking/i });
      const indicatorContainer = indicatorElement.closest('.p-3');
      const indicatorWidth = indicatorContainer?.offsetWidth || 0;

      console.log(`Typing indicator width: ${indicatorWidth}px`);

      // Both should have similar widths (both full-width within their containers)
      const widthDifference = Math.abs(firstMessageWidth - indicatorWidth);
      console.log(`Width difference between messages: ${widthDifference}px`);

      // Allow some tolerance for different padding on user vs system messages
      expect(widthDifference).toBeLessThan(100);

      // Verify chat container didn't grow horizontally
      const chatContainer = container.querySelector('.h-64');
      const hasHorizontalScroll = chatContainer
        ? chatContainer.scrollWidth > chatContainer.clientWidth
        : false;

      expect(hasHorizontalScroll).toBe(false);
    });
  });
});
