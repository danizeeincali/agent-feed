/**
 * Integration Tests for EnhancedPostingInterface
 *
 * London School TDD Integration Testing:
 * - Test component collaboration and integration
 * - Verify real AviDirectChatReal is used in production
 * - Mock external dependencies while testing internal behavior
 * - Validate tab switching and component lifecycle
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, test, beforeEach, afterAll, expect } from 'vitest';
import { EnhancedPostingInterface } from '../../components/EnhancedPostingInterface';

// Mock fetch globally
global.fetch = vi.fn();

// Mock console to avoid noise
const consoleSpy = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {})
};

describe('EnhancedPostingInterface - Integration Tests', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = global.fetch as ReturnType<typeof vi.fn>;
    vi.clearAllMocks();
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
  });

  afterAll(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('🔄 Tab Integration and Component Loading', () => {
    test('loads with Quick Post tab active by default', () => {
      render(<EnhancedPostingInterface />);

      // Check tab navigation
      const quickPostTab = screen.getByRole('button', { name: /quick post/i });
      const postTab = screen.getByRole('button', { name: /^post$/i });
      const aviTab = screen.getByRole('button', { name: /avi dm/i });

      expect(quickPostTab).toHaveAttribute('aria-selected', 'true');
      expect(postTab).toHaveAttribute('aria-selected', 'false');
      expect(aviTab).toHaveAttribute('aria-selected', 'false');

      // Check content area
      expect(screen.getByText('Quick Post')).toBeInTheDocument();
      expect(screen.getByText('Share a quick thought or update')).toBeInTheDocument();
    });

    test('switches to Avi DM tab and loads real Claude integration', async () => {
      // Mock Claude instance creation for real integration
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { id: 'integration-test-instance' }
        })
      });

      const user = userEvent.setup();
      render(<EnhancedPostingInterface />);

      // Click Avi DM tab
      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      // Verify tab switched
      expect(aviTab).toHaveAttribute('aria-selected', 'true');

      // Verify real AviDirectChatReal component loaded
      await waitFor(() => {
        expect(screen.getByTestId('avi-direct-chat')).toBeInTheDocument();
        expect(screen.getByTestId('avi-header')).toBeInTheDocument();
      });

      // Verify real Claude instance creation was attempted
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/claude-instances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Avi - Direct Message Assistant',
            workingDirectory: '/workspaces/agent-feed',
            skipPermissions: true,
            resumeSession: true,
            metadata: {
              isAvi: true,
              purpose: 'direct-messaging',
              capabilities: ['code-review', 'debugging', 'architecture', 'general-assistance']
            }
          })
        });
      });

      // Verify connection status
      expect(screen.getByTestId('avi-status')).toHaveTextContent('Connected');
    });

    test('validates real Claude integration through full message flow', async () => {
      // Mock successful instance creation and message sending
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'full-flow-test-instance' } })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              response: {
                content: 'This is a real response from Claude Code integration test. I can help you with code review, debugging, and architecture questions.'
              }
            }
          })
        } as Response);

      const mockOnPostCreated = vi.fn();
      const user = userEvent.setup();

      render(<EnhancedPostingInterface onPostCreated={mockOnPostCreated} />);

      // Switch to Avi tab
      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      // Wait for connection
      await waitFor(() => {
        expect(screen.getByTestId('avi-status')).toHaveTextContent('Connected');
      });

      // Send a message
      const messageInput = screen.getByTestId('message-input');
      await user.type(messageInput, 'integration test message');
      await user.click(screen.getByTestId('send-button'));

      // Verify API calls
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(2,
        '/api/claude-instances/full-flow-test-instance/message',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: 'integration test message',
            metadata: {
              source: 'avi-dm',
              timestamp: expect.any(String)
            }
          })
        }
      );

      // Verify response displayed
      await waitFor(() => {
        expect(screen.getByText(/This is a real response from Claude Code integration test/)).toBeInTheDocument();
      });

      // Verify parent callback triggered
      await waitFor(() => {
        expect(mockOnPostCreated).toHaveBeenCalledWith({
          content: 'integration test message',
          timestamp: expect.any(Date),
          instanceId: 'full-flow-test-instance',
          response: {
            content: 'This is a real response from Claude Code integration test. I can help you with code review, debugging, and architecture questions.'
          }
        });
      });
    });
  });

  describe('🎯 Real vs Mock Component Validation', () => {
    test('ensures AviDirectChatReal is imported and used, not the mock', async () => {
      // Mock Claude instance creation
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'real-component-test' } })
      });

      const user = userEvent.setup();
      render(<EnhancedPostingInterface />);

      // Switch to Avi tab
      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      // The real component should try to create a Claude instance
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/claude-instances',
          expect.objectContaining({ method: 'POST' })
        );
      });

      // The real component should have specific test IDs
      expect(screen.getByTestId('avi-direct-chat')).toBeInTheDocument();
      expect(screen.getByTestId('avi-header')).toBeInTheDocument();
      expect(screen.getByTestId('avi-status')).toBeInTheDocument();

      // Should NOT have mock-specific elements
      expect(screen.queryByText(/generateAviResponse/)).not.toBeInTheDocument();
    });

    test('validates no setTimeout-based fake responses in Avi integration', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'no-timeout-integration' } })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              response: {
                content: 'Real API response from integration test'
              }
            }
          })
        } as Response);

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      const user = userEvent.setup();

      render(<EnhancedPostingInterface />);

      // Switch to Avi tab and send message
      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      await waitFor(() => {
        expect(screen.getByTestId('avi-status')).toHaveTextContent('Connected');
      });

      const messageInput = screen.getByTestId('message-input');
      await user.type(messageInput, 'no timeout test');
      await user.click(screen.getByTestId('send-button'));

      // Response should come from API, not setTimeout
      await waitFor(() => {
        expect(screen.getByText('Real API response from integration test')).toBeInTheDocument();
      });

      // Verify no setTimeout calls for fake response generation (1-5 second range)
      const responseTimeouts = setTimeoutSpy.mock.calls.filter(call =>
        call[1] && call[1] >= 1000 && call[1] <= 5000
      );
      expect(responseTimeouts).toHaveLength(0);

      setTimeoutSpy.mockRestore();
    });
  });

  describe('📊 Error Handling Integration', () => {
    test('handles Claude instance creation failure gracefully in integration', async () => {
      // Mock failed instance creation
      mockFetch.mockRejectedValue(new Error('Instance creation failed'));

      const user = userEvent.setup();
      render(<EnhancedPostingInterface />);

      // Switch to Avi tab
      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      // Should display error state
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText(/Instance creation failed/)).toBeInTheDocument();
      });

      // Should show disconnected status
      expect(screen.getByTestId('avi-status')).toHaveTextContent('Disconnected');

      // Should have retry functionality
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });

    test('validates error recovery through retry mechanism', async () => {
      // Mock initial failure, then success on retry
      mockFetch
        .mockRejectedValueOnce(new Error('Initial failure'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'retry-success-instance' } })
        } as Response);

      const user = userEvent.setup();
      render(<EnhancedPostingInterface />);

      // Switch to Avi tab
      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      // Wait for initial error
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      // Click retry
      await user.click(screen.getByTestId('retry-button'));

      // Should recover and connect
      await waitFor(() => {
        expect(screen.getByTestId('avi-status')).toHaveTextContent('Connected');
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      });

      // Verify retry API call was made
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('🔗 Component Lifecycle Integration', () => {
    test('validates component cleanup on tab switch', async () => {
      // Mock Claude instance creation
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'lifecycle-test-instance' } })
      });

      const user = userEvent.setup();
      render(<EnhancedPostingInterface />);

      // Switch to Avi tab to initialize
      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      await waitFor(() => {
        expect(screen.getByTestId('avi-status')).toHaveTextContent('Connected');
      });

      // Switch to different tab
      const quickPostTab = screen.getByRole('button', { name: /quick post/i });
      await user.click(quickPostTab);

      // Avi component should be unmounted
      expect(screen.queryByTestId('avi-direct-chat')).not.toBeInTheDocument();

      // Switch back to Avi tab
      await user.click(aviTab);

      // Should reinitialize
      await waitFor(() => {
        expect(screen.getByTestId('avi-direct-chat')).toBeInTheDocument();
      });
    });

    test('validates persistent connection across renders', async () => {
      // Mock successful instance creation
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'persistent-test-instance' } })
      });

      const user = userEvent.setup();
      const { rerender } = render(<EnhancedPostingInterface />);

      // Switch to Avi tab
      const aviTab = screen.getByRole('button', { name: /avi dm/i });
      await user.click(aviTab);

      await waitFor(() => {
        expect(screen.getByTestId('avi-status')).toHaveTextContent('Connected');
      });

      // Rerender component (simulating prop changes)
      rerender(<EnhancedPostingInterface onPostCreated={vi.fn()} />);

      // Connection should persist or reconnect gracefully
      await waitFor(() => {
        expect(screen.getByTestId('avi-status')).toHaveTextContent(/Connected|Connecting/);
      });
    });
  });
});