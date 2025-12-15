/**
 * Ghost Post Fix TDD Test Suite
 *
 * Bug: AVI DMs created ghost posts in activity feed
 * Fix: Removed onMessageSent callback (line 390) in EnhancedPostingInterface.tsx
 *
 * This test suite validates:
 * 1. AVI DMs do NOT trigger onPostCreated callback
 * 2. Quick Posts STILL trigger onPostCreated callback
 * 3. Feed does NOT show DM messages
 * 4. Feed STILL shows Quick Posts
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { EnhancedPostingInterface } from '@/components/EnhancedPostingInterface';

// Mock the hooks that use EventSource
vi.mock('@/hooks/useActivityStream', () => ({
  useActivityStream: () => ({
    currentActivity: null,
    connectionStatus: 'disconnected'
  })
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    toasts: [],
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
    dismissToast: vi.fn()
  })
}));

describe('Ghost Post Fix - TDD Validation', () => {
  let mockOnPostCreated: ReturnType<typeof vi.fn>;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create fresh mock for each test
    mockOnPostCreated = vi.fn();
    mockFetch = vi.fn();

    // Replace global fetch with our mock
    global.fetch = mockFetch;

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AVI DM Section - Should NOT create ghost posts', () => {
    it('should NOT call onPostCreated after sending DM to AVI', async () => {
      // Arrange: Mock successful AVI response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Hello from Λvi',
          content: 'Hello from Λvi'
        })
      });

      render(
        <EnhancedPostingInterface
          onPostCreated={mockOnPostCreated}
          isLoading={false}
        />
      );

      // Act: Switch to AVI tab
      const aviTab = screen.getByRole('button', { name: /Avi DM/i });
      fireEvent.click(aviTab);

      // Act: Type and send DM
      const messageInput = screen.getByPlaceholderText(/Type your message to Λvi/i);
      fireEvent.change(messageInput, { target: { value: 'Test DM message' } });

      const sendButton = screen.getByRole('button', { name: /Send/i });
      fireEvent.click(sendButton);

      // Wait for API call to complete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/claude-code/streaming-chat',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
        );
      });

      // Assert: onPostCreated should NOT be called
      expect(mockOnPostCreated).not.toHaveBeenCalled();
    });

    it('should update chat history without triggering post callback', async () => {
      // Arrange: Mock successful AVI response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'Test response',
          content: 'Test response'
        })
      });

      render(
        <EnhancedPostingInterface
          onPostCreated={mockOnPostCreated}
          isLoading={false}
        />
      );

      // Act: Switch to AVI tab and send message
      fireEvent.click(screen.getByRole('button', { name: /Avi DM/i }));

      const messageInput = screen.getByPlaceholderText(/Type your message to Λvi/i);
      fireEvent.change(messageInput, { target: { value: 'Hello AVI' } });
      fireEvent.click(screen.getByRole('button', { name: /Send/i }));

      // Wait for response
      await waitFor(() => {
        expect(screen.getByText('Test response')).toBeInTheDocument();
      });

      // Assert: Message appears in chat but no post created
      expect(screen.getByText('Test response')).toBeInTheDocument();
      expect(mockOnPostCreated).not.toHaveBeenCalled();
    });

    it('should NOT call onPostCreated even on AVI error response', async () => {
      // Arrange: Mock AVI error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <EnhancedPostingInterface
          onPostCreated={mockOnPostCreated}
          isLoading={false}
        />
      );

      // Act: Switch to AVI tab and send message
      fireEvent.click(screen.getByRole('button', { name: /Avi DM/i }));

      const messageInput = screen.getByPlaceholderText(/Type your message to Λvi/i);
      fireEvent.change(messageInput, { target: { value: 'Test message' } });
      fireEvent.click(screen.getByRole('button', { name: /Send/i }));

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/I encountered an error/i)).toBeInTheDocument();
      });

      // Assert: Even on error, no post callback
      expect(mockOnPostCreated).not.toHaveBeenCalled();
    });

    it('should handle multiple DM messages without any post callbacks', async () => {
      // Arrange: Mock multiple responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ content: 'Response 1' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ content: 'Response 2' })
        });

      render(
        <EnhancedPostingInterface
          onPostCreated={mockOnPostCreated}
          isLoading={false}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Avi DM/i }));

      const messageInput = screen.getByPlaceholderText(/Type your message to Λvi/i);

      // Act: Send first message
      fireEvent.change(messageInput, { target: { value: 'First message' } });
      fireEvent.click(screen.getByRole('button', { name: /Send/i }));

      await waitFor(() => {
        expect(screen.getByText('Response 1')).toBeInTheDocument();
      });

      // Act: Send second message
      fireEvent.change(messageInput, { target: { value: 'Second message' } });
      fireEvent.click(screen.getByRole('button', { name: /Send/i }));

      await waitFor(() => {
        expect(screen.getByText('Response 2')).toBeInTheDocument();
      });

      // Assert: No post callbacks despite multiple DMs
      expect(mockOnPostCreated).not.toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Quick Post Section - Should STILL create posts', () => {
    it('should call onPostCreated when Quick Post is submitted', async () => {
      // Arrange: Mock successful post creation
      const mockPost = {
        data: {
          id: 'post-123',
          title: 'Test post...',
          content: 'Test post content',
          author_agent: 'user-agent'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPost
      });

      const { container } = render(
        <EnhancedPostingInterface
          onPostCreated={mockOnPostCreated}
          isLoading={false}
        />
      );

      // Act: Quick Post tab is default, fill and submit
      const textarea = screen.getByPlaceholderText(/What's on your mind/i);
      fireEvent.change(textarea, { target: { value: 'Test post content' } });

      // Find and click the submit button (not tab button)
      const submitButton = container.querySelector('button[type="submit"]');
      if (submitButton) {
        fireEvent.click(submitButton);
      }

      // Wait for API call
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/agent-posts',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
        );
      }, { timeout: 3000 });

      // Assert: onPostCreated WAS called with post data
      expect(mockOnPostCreated).toHaveBeenCalledTimes(1);
      expect(mockOnPostCreated).toHaveBeenCalledWith(mockPost.data);
    });

    it('should create post with correct metadata', async () => {
      // Arrange
      const mockPost = {
        data: {
          id: 'post-456',
          title: 'Another test...',
          content: 'Another test content'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPost
      });

      const { container } = render(
        <EnhancedPostingInterface
          onPostCreated={mockOnPostCreated}
          isLoading={false}
        />
      );

      // Act: Create quick post
      const textarea = screen.getByPlaceholderText(/What's on your mind/i);
      fireEvent.change(textarea, { target: { value: 'Another test content' } });

      const submitButton = container.querySelector('button[type="submit"]');
      if (submitButton) {
        fireEvent.click(submitButton);
      }

      // Assert: Verify request payload
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/agent-posts',
          expect.objectContaining({
            body: expect.stringContaining('"author_agent":"user-agent"')
          })
        );
      }, { timeout: 3000 });

      // Assert: Post callback called with data
      await waitFor(() => {
        expect(mockOnPostCreated).toHaveBeenCalledWith(mockPost.data);
      });
    });

    it('should NOT call onPostCreated if Quick Post API fails', async () => {
      // Arrange: Mock API failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Failed to create post' })
      });

      const { container } = render(
        <EnhancedPostingInterface
          onPostCreated={mockOnPostCreated}
          isLoading={false}
        />
      );

      // Act: Try to create post
      const textarea = screen.getByPlaceholderText(/What's on your mind/i);
      fireEvent.change(textarea, { target: { value: 'Test content' } });

      const submitButton = container.querySelector('button[type="submit"]');
      if (submitButton) {
        fireEvent.click(submitButton);
      }

      // Wait for API call to complete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Assert: Callback should NOT be called on failure
      expect(mockOnPostCreated).not.toHaveBeenCalled();
    });

    it('should handle multiple Quick Posts correctly', async () => {
      // Arrange: Mock successful responses
      const mockPost1 = { data: { id: 'p1', content: 'Post 1' } };
      const mockPost2 = { data: { id: 'p2', content: 'Post 2' } };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPost1
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPost2
        });

      const { container } = render(
        <EnhancedPostingInterface
          onPostCreated={mockOnPostCreated}
          isLoading={false}
        />
      );

      const textarea = screen.getByPlaceholderText(/What's on your mind/i);

      // Act: Create first post
      fireEvent.change(textarea, { target: { value: 'First post' } });

      let submitButton = container.querySelector('button[type="submit"]');
      if (submitButton) {
        fireEvent.click(submitButton);
      }

      await waitFor(() => {
        expect(mockOnPostCreated).toHaveBeenCalledWith(mockPost1.data);
      }, { timeout: 3000 });

      // Act: Create second post
      fireEvent.change(textarea, { target: { value: 'Second post' } });

      submitButton = container.querySelector('button[type="submit"]');
      if (submitButton) {
        fireEvent.click(submitButton);
      }

      await waitFor(() => {
        expect(mockOnPostCreated).toHaveBeenCalledWith(mockPost2.data);
      }, { timeout: 3000 });

      // Assert: Callback called twice, once per post
      expect(mockOnPostCreated).toHaveBeenCalledTimes(2);
    });
  });

  describe('Tab Switching - Isolation between DM and Post', () => {
    it('should maintain separate state between tabs', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'post-1', content: 'Quick post' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ content: 'AVI response' })
        });

      render(
        <EnhancedPostingInterface
          onPostCreated={mockOnPostCreated}
          isLoading={false}
        />
      );

      // Act: Create Quick Post
      const textarea = screen.getByPlaceholderText(/What's on your mind/i);
      fireEvent.change(textarea, { target: { value: 'Quick post' } });

      // Submit form properly
      const form = textarea.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(mockOnPostCreated).toHaveBeenCalledTimes(1);
      }, { timeout: 3000 });

      // Act: Switch to AVI tab and send DM
      fireEvent.click(screen.getByRole('button', { name: /Avi DM/i }));

      const messageInput = screen.getByPlaceholderText(/Type your message to Λvi/i);
      fireEvent.change(messageInput, { target: { value: 'DM to AVI' } });
      fireEvent.click(screen.getByRole('button', { name: /Send/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      // Assert: Only Quick Post triggered callback, not DM
      expect(mockOnPostCreated).toHaveBeenCalledTimes(1);
    });

    it('should switch from DM to Quick Post without interference', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ content: 'AVI response' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'post-1', content: 'Now a quick post' } })
        });

      render(
        <EnhancedPostingInterface
          onPostCreated={mockOnPostCreated}
          isLoading={false}
        />
      );

      // Act: Start with AVI DM
      fireEvent.click(screen.getByRole('button', { name: /Avi DM/i }));

      const messageInput = screen.getByPlaceholderText(/Type your message to Λvi/i);
      fireEvent.change(messageInput, { target: { value: 'First DM' } });
      fireEvent.click(screen.getByRole('button', { name: /Send/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // DM should not trigger callback
      expect(mockOnPostCreated).not.toHaveBeenCalled();

      // Act: Switch to Quick Post tab
      const quickPostTab = screen.getAllByRole('button', { name: /Quick Post/i })[0];
      fireEvent.click(quickPostTab);

      const textarea = screen.getByPlaceholderText(/What's on your mind/i);
      fireEvent.change(textarea, { target: { value: 'Now a quick post' } });

      // Submit via form
      const form = textarea.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(mockOnPostCreated).toHaveBeenCalledTimes(1);
      }, { timeout: 3000 });

      // Assert: Only the Quick Post triggered callback
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Regression Prevention - Ghost Post Bug', () => {
    it('should verify line 390 callback is removed from AviChatSection', async () => {
      // This test documents the fix location
      // Line 390: onMessageSent?.(userMessage) was REMOVED
      // This prevented ghost posts from appearing in feed

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'Response' })
      });

      render(
        <EnhancedPostingInterface
          onPostCreated={mockOnPostCreated}
          isLoading={false}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Avi DM/i }));

      const messageInput = screen.getByPlaceholderText(/Type your message to Λvi/i);
      fireEvent.change(messageInput, { target: { value: 'Test' } });
      fireEvent.click(screen.getByRole('button', { name: /Send/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Critical assertion: onPostCreated must NOT be called
      expect(mockOnPostCreated).not.toHaveBeenCalled();
    });

    it('should prevent DM messages from appearing in activity feed', async () => {
      // This validates the ghost post fix end-to-end
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'AVI reply' })
      });

      const feedPosts: any[] = [];
      const trackFeedPost = vi.fn((post) => {
        feedPosts.push(post);
      });

      render(
        <EnhancedPostingInterface
          onPostCreated={trackFeedPost}
          isLoading={false}
        />
      );

      // Act: Send DM
      fireEvent.click(screen.getByRole('button', { name: /Avi DM/i }));

      const messageInput = screen.getByPlaceholderText(/Type your message to Λvi/i);
      fireEvent.change(messageInput, { target: { value: 'Private DM' } });
      fireEvent.click(screen.getByRole('button', { name: /Send/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Assert: Feed should remain empty (no ghost posts)
      expect(feedPosts).toHaveLength(0);
      expect(trackFeedPost).not.toHaveBeenCalled();
    });

    it('should allow Quick Posts in feed after DM interaction', async () => {
      // Validates that fixing DM didn't break Quick Posts
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ content: 'AVI response' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'post-1', content: 'Real post' } })
        });

      const feedPosts: any[] = [];
      const trackFeedPost = vi.fn((post) => {
        feedPosts.push(post);
      });

      render(
        <EnhancedPostingInterface
          onPostCreated={trackFeedPost}
          isLoading={false}
        />
      );

      // Act: DM to AVI (should NOT create post)
      fireEvent.click(screen.getByRole('button', { name: /Avi DM/i }));
      fireEvent.change(
        screen.getByPlaceholderText(/Type your message to Λvi/i),
        { target: { value: 'DM message' } }
      );
      fireEvent.click(screen.getByRole('button', { name: /Send/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Act: Quick Post (should create post)
      const quickPostTabs = screen.getAllByRole('button', { name: /Quick Post/i });
      fireEvent.click(quickPostTabs[0]);

      fireEvent.change(
        screen.getByPlaceholderText(/What's on your mind/i),
        { target: { value: 'Real post content' } }
      );

      const submitButtons = screen.getAllByRole('button', { name: /Quick Post/i });
      fireEvent.click(submitButtons[submitButtons.length - 1]);

      await waitFor(() => {
        expect(trackFeedPost).toHaveBeenCalledTimes(1);
      });

      // Assert: Only Quick Post appears in feed
      expect(feedPosts).toHaveLength(1);
      expect(feedPosts[0]).toEqual({ id: 'post-1', content: 'Real post' });
    });
  });

  describe('Edge Cases - Callback Behavior', () => {
    it('should handle undefined onPostCreated gracefully in DM', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: 'Response' })
      });

      // Render without onPostCreated prop
      render(
        <EnhancedPostingInterface isLoading={false} />
      );

      fireEvent.click(screen.getByRole('button', { name: /Avi DM/i }));

      const messageInput = screen.getByPlaceholderText(/Type your message to Λvi/i);
      fireEvent.change(messageInput, { target: { value: 'Test' } });
      fireEvent.click(screen.getByRole('button', { name: /Send/i }));

      // Should not throw error
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      expect(() => screen.getByText('Response')).not.toThrow();
    });

    it('should handle undefined onPostCreated gracefully in Quick Post', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'post-1' } })
      });

      // Render without onPostCreated prop
      const { container } = render(
        <EnhancedPostingInterface isLoading={false} />
      );

      const textarea = screen.getByPlaceholderText(/What's on your mind/i);
      fireEvent.change(textarea, { target: { value: 'Test post' } });

      const submitButton = container.querySelector('button[type="submit"]');
      if (submitButton) {
        fireEvent.click(submitButton);
      }

      // Should not throw error even without callback
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should maintain callback separation during rapid tab switching', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'post-1', content: 'Post 1' } })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ content: 'AVI' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { id: 'post-2', content: 'Post 2' } })
        });

      render(
        <EnhancedPostingInterface
          onPostCreated={mockOnPostCreated}
          isLoading={false}
        />
      );

      // Quick Post 1
      let textarea = screen.getByPlaceholderText(/What's on your mind/i);
      fireEvent.change(textarea, { target: { value: 'Post 1' } });

      let form = textarea.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(mockOnPostCreated).toHaveBeenCalledTimes(1);
      }, { timeout: 3000 });

      // Switch to DM
      fireEvent.click(screen.getByRole('button', { name: /Avi DM/i }));

      const messageInput = screen.getByPlaceholderText(/Type your message to Λvi/i);
      fireEvent.change(messageInput, { target: { value: 'DM' } });
      fireEvent.click(screen.getByRole('button', { name: /Send/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      // Callback count should still be 1 (DM didn't trigger it)
      expect(mockOnPostCreated).toHaveBeenCalledTimes(1);

      // Switch back to Quick Post tab
      const quickPostTabs = screen.getAllByRole('button', { name: /Quick Post/i });
      fireEvent.click(quickPostTabs[0]);

      textarea = screen.getByPlaceholderText(/What's on your mind/i);
      fireEvent.change(textarea, { target: { value: 'Post 2' } });

      // Submit second post
      form = textarea.closest('form');
      if (form) {
        fireEvent.submit(form);
      }

      await waitFor(() => {
        expect(mockOnPostCreated).toHaveBeenCalledTimes(2);
      }, { timeout: 3000 });

      // Assert: Exactly 2 posts, no DM callback
      expect(mockFetch).toHaveBeenCalledTimes(3); // 2 posts + 1 DM
    });
  });
});
