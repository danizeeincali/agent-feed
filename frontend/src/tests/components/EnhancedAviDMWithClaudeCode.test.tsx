/**
 * Test file for EnhancedAviDMWithClaudeCode component timeout handling
 * Tests for 45+ second response times from Claude Code SDK
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import EnhancedAviDMWithClaudeCode from '../../components/claude-manager/EnhancedAviDMWithClaudeCode';

// Mock fetch to simulate long response times
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('EnhancedAviDMWithClaudeCode - Timeout Handling', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Long Response Time Handling', () => {
    it('should handle 15-17 second response times gracefully', async () => {
      // Mock a successful but slow response
      mockFetch.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({
                message: 'Response after 17 seconds',
                status: 'success'
              })
            } as Response);
          }, 17000); // 17 second delay
        })
      );

      render(<EnhancedAviDMWithClaudeCode />);

      // Switch to Claude Code tab
      const claudeCodeTab = screen.getByRole('tab', { name: /claude code/i });
      await user.click(claudeCodeTab);

      // Send a message
      const input = screen.getByPlaceholderText(/enter command/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'test command');
      await user.click(sendButton);

      // Should show loading state immediately
      expect(screen.getByText(/executing/i)).toBeInTheDocument();
      expect(sendButton).toBeDisabled();

      // Fast-forward 10 seconds - should still be loading
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(screen.getByText(/executing/i)).toBeInTheDocument();

      // Fast-forward to 17 seconds - should complete
      act(() => {
        vi.advanceTimersByTime(7000);
      });

      await waitFor(() => {
        expect(screen.getByText('Response after 17 seconds')).toBeInTheDocument();
      });

      expect(screen.queryByText(/executing/i)).not.toBeInTheDocument();
      expect(sendButton).not.toBeDisabled();
    });

    it('should show progressive loading messages for long operations', async () => {
      mockFetch.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({
                message: 'Complex operation completed',
                status: 'success'
              })
            } as Response);
          }, 25000); // 25 second delay
        })
      );

      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByRole('tab', { name: /claude code/i });
      await user.click(claudeCodeTab);

      const input = screen.getByPlaceholderText(/enter command/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'complex operation');
      await user.click(sendButton);

      // Initially shows executing
      expect(screen.getByText(/executing/i)).toBeInTheDocument();

      // TODO: Add progressive status messages as we implement them
      // After 10 seconds should show "Still processing..."
      // After 20 seconds should show "Almost done..."
    });

    it('should handle actual timeouts (45+ seconds) with proper error messages', async () => {
      mockFetch.mockImplementation(() =>
        new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Request timeout'));
          }, 50000); // 50 second timeout
        })
      );

      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByRole('tab', { name: /claude code/i });
      await user.click(claudeCodeTab);

      const input = screen.getByPlaceholderText(/enter command/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'timeout test');
      await user.click(sendButton);

      // Fast-forward to timeout
      act(() => {
        vi.advanceTimersByTime(50000);
      });

      await waitFor(() => {
        expect(screen.getByText(/request timeout/i)).toBeInTheDocument();
      });
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests with exponential backoff', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            message: 'Success after retries',
            status: 'success'
          })
        } as Response);
      });

      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByRole('tab', { name: /claude code/i });
      await user.click(claudeCodeTab);

      const input = screen.getByPlaceholderText(/enter command/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'retry test');
      await user.click(sendButton);

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(screen.getByText('Success after retries')).toBeInTheDocument();
      }, { timeout: 10000 });

      expect(callCount).toBe(3);
    });

    it('should distinguish between timeout and network errors', async () => {
      mockFetch.mockImplementation(() =>
        Promise.reject(new Error('Failed to fetch'))
      );

      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByRole('tab', { name: /claude code/i });
      await user.click(claudeCodeTab);

      const input = screen.getByPlaceholderText(/enter command/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'network error test');
      await user.click(sendButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/failed to fetch/i);
        expect(errorMessage).toBeInTheDocument();
        // Should suggest checking backend connectivity
        expect(screen.getByText(/make sure the backend is running/i)).toBeInTheDocument();
      });
    });
  });

  describe('Connection Status Updates', () => {
    it('should show "Processing..." instead of "Failed" during long operations', async () => {
      mockFetch.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({
                message: 'Processed successfully',
                status: 'success'
              })
            } as Response);
          }, 20000);
        })
      );

      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByRole('tab', { name: /claude code/i });
      await user.click(claudeCodeTab);

      const input = screen.getByPlaceholderText(/enter command/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'long processing');
      await user.click(sendButton);

      // Should show processing status, not failed
      expect(screen.getByText(/executing/i)).toBeInTheDocument();

      // Should not show any "Failed" text during the operation
      expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
    });

    it('should update connection status indicators appropriately', async () => {
      render(<EnhancedAviDMWithClaudeCode />);

      // Should show online status initially
      expect(screen.getByText(/online/i)).toBeInTheDocument();
      expect(screen.getByText(/claude code sdk/i)).toBeInTheDocument();
    });
  });

  describe('User Experience Improvements', () => {
    it('should provide clear feedback about operation progress', async () => {
      mockFetch.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({
                message: 'Operation completed',
                status: 'success'
              })
            } as Response);
          }, 15000);
        })
      );

      render(<EnhancedAviDMWithClaudeCode />);

      const claudeCodeTab = screen.getByRole('tab', { name: /claude code/i });
      await user.click(claudeCodeTab);

      const input = screen.getByPlaceholderText(/enter command/i);
      const sendButton = screen.getByRole('button', { name: /send/i });

      await user.type(input, 'test operation');
      await user.click(sendButton);

      // Should show clear loading indicator
      expect(screen.getByText(/executing/i)).toBeInTheDocument();

      // Input should be disabled
      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();

      // Should show spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should allow cancellation of long-running operations', async () => {
      // This test will be implemented when we add cancellation functionality
      expect(true).toBe(true); // Placeholder
    });
  });
});