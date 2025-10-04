import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EnhancedPostingInterface } from '@/components/EnhancedPostingInterface';
import { RealSocialMediaFeed } from '@/components/RealSocialMediaFeed';

describe('Avi Activity Integration', () => {
  let mockEventSource: any;

  beforeEach(() => {
    // Mock EventSource for SSE
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

  describe('EnhancedPostingInterface', () => {
    it('should display activity text inline with typing indicator', async () => {
      const user = userEvent.setup();

      // Mock fetch for Claude API - delay response to keep typing indicator visible
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

      render(<EnhancedPostingInterface />);

      // Switch to Avi DM tab
      const aviTab = screen.getByText('Avi DM');
      await user.click(aviTab);

      // Send message to Avi
      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      await user.type(input, 'test message');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Wait for SSE connection to open
      await waitFor(() => {
        expect(mockEventSource.onopen).toBeDefined();
      });

      // Trigger onopen callback
      if (mockEventSource.onopen) {
        mockEventSource.onopen();
      }

      // Simulate SSE activity message
      const activityMessage = {
        type: 'tool_activity',
        data: {
          tool: 'Bash',
          action: 'git status',
          priority: 'high',
          timestamp: Date.now(),
        },
      };

      // Trigger SSE message
      if (mockEventSource.onmessage) {
        mockEventSource.onmessage({
          data: JSON.stringify(activityMessage),
        });
      }

      // Verify activity text appears inline (format: "- Bash(git status)")
      await waitFor(() => {
        const activityText = screen.getByText(/Bash\(git status\)/i);
        expect(activityText).toBeInTheDocument();
      });
    });

    it('should truncate long activity text to 80 characters', async () => {
      const user = userEvent.setup();

      // Delay response to keep typing indicator visible
      global.fetch = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ message: 'Test response' }),
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

      // Wait for SSE connection
      await waitFor(() => {
        expect(mockEventSource.onopen).toBeDefined();
      });

      // Trigger onopen
      if (mockEventSource.onopen) {
        mockEventSource.onopen();
      }

      // Simulate long activity message (>80 chars)
      const longActivity = {
        type: 'tool_activity',
        data: {
          tool: 'Task',
          action: 'Phase 5 & 6: Launch 3 Concurrent Validation Agents with E2E Testing & Screenshots and Full Regression Suite',
          priority: 'high',
          timestamp: Date.now(),
        },
      };

      if (mockEventSource.onmessage) {
        mockEventSource.onmessage({
          data: JSON.stringify(longActivity),
        });
      }

      // Verify truncation with ellipsis (text should be cut to 80 chars)
      await waitFor(() => {
        const truncatedText = screen.getByText(/Task\(Phase 5 & 6.*\.\.\./);
        expect(truncatedText).toBeInTheDocument();
      });
    });

    it('should only display high priority activities', async () => {
      const user = userEvent.setup();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Test response' }),
      });

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      await user.type(input, 'test');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Simulate low priority message (should be ignored)
      const lowPriorityMessage = {
        type: 'tool_activity',
        data: {
          tool: 'Bash',
          action: 'low priority action',
          priority: 'low',
          timestamp: Date.now(),
        },
      };

      if (mockEventSource.onmessage) {
        mockEventSource.onmessage({
          data: JSON.stringify(lowPriorityMessage),
        });
      }

      // Wait a bit and verify low priority activity does NOT appear
      await new Promise(resolve => setTimeout(resolve, 100));

      const lowPriorityText = screen.queryByText(/low priority action/i);
      expect(lowPriorityText).not.toBeInTheDocument();
    });

    it('should clear activity when response received', async () => {
      const user = userEvent.setup();

      // Fast response to test cleanup
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Avi response' }),
      });

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      await user.type(input, 'test');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Wait for response (typing indicator should be removed)
      await waitFor(
        () => {
          expect(screen.getByText(/Avi response/i)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify typing indicator is removed after response
      expect(screen.queryByLabelText(/Avi is thinking/i)).not.toBeInTheDocument();

      // Verify SSE connection was closed
      expect(mockEventSource.close).toHaveBeenCalled();
    });
  });

  describe('RealSocialMediaFeed', () => {
    beforeEach(() => {
      // Mock API calls for feed
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [],
          total: 0,
        }),
      });
    });

    it('should not display Live Tool Execution widget', async () => {
      render(<RealSocialMediaFeed />);

      // Wait for feed to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading real post data/i)).not.toBeInTheDocument();
      });

      // Verify the widget title does not exist
      expect(screen.queryByText('📊 Live Tool Execution')).not.toBeInTheDocument();
      expect(screen.queryByText(/Live Tool Execution/i)).not.toBeInTheDocument();
    });

    it('should render without errors after widget removal', async () => {
      const { container } = render(<RealSocialMediaFeed />);

      // Wait for feed to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading real post data/i)).not.toBeInTheDocument();
      });

      // Verify basic feed structure is intact
      expect(screen.getByTestId('social-media-feed')).toBeInTheDocument();
      expect(container.querySelector('.lg\\:col-span-2')).toBeInTheDocument();
    });
  });

  describe('SSE Connection Management', () => {
    it('should connect to SSE when submitting starts', async () => {
      const user = userEvent.setup();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Response' }),
      });

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      await user.click(aviTab);

      // Verify EventSource not created yet
      expect(global.EventSource).not.toHaveBeenCalled();

      // Start submission
      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      await user.type(input, 'test');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Verify EventSource created
      await waitFor(() => {
        expect(global.EventSource).toHaveBeenCalledWith(
          expect.stringContaining('/api/streaming-ticker/stream')
        );
      });
    });

    it('should disconnect from SSE when submission completes', async () => {
      const user = userEvent.setup();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Response' }),
      });

      render(<EnhancedPostingInterface />);

      const aviTab = screen.getByText('Avi DM');
      await user.click(aviTab);

      const input = screen.getByPlaceholderText(/Type your message to Λvi/i);
      await user.type(input, 'test');

      const sendButton = screen.getByRole('button', { name: /send/i });
      await user.click(sendButton);

      // Wait for response
      await waitFor(() => {
        expect(screen.getByText(/Response/i)).toBeInTheDocument();
      });

      // Verify EventSource closed
      await waitFor(() => {
        expect(mockEventSource.close).toHaveBeenCalled();
      });
    });
  });
});
