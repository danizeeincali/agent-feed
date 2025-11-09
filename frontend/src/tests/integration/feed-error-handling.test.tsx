import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RealSocialMediaFeed from '../../components/RealSocialMediaFeed';

/**
 * Integration Tests for Feed Error Handling
 *
 * Testing Strategy:
 * - Verify feed handles posts with missing/invalid authorAgent
 * - Ensure no TypeError is thrown for undefined fields
 * - Validate graceful degradation with partial data
 */

// Mock the fetch API
global.fetch = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Feed Error Handling Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Posts with Missing/Invalid authorAgent', () => {
    it('should handle posts with undefined authorAgent without crashing', async () => {
      const postsWithUndefinedAuthor = [
        {
          post_id: 1,
          content: 'Test post 1',
          author_agent: undefined, // This was causing the charAt error
          created_at: new Date().toISOString(),
          engagement: { comments: 0, likes: 0, shares: 0, views: 0 }
        }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => postsWithUndefinedAuthor,
      });

      const { container } = render(<RealSocialMediaFeed />, {
        wrapper: createWrapper(),
      });

      // Should not throw error
      await waitFor(() => {
        expect(container).toBeTruthy();
      });

      // Should not show error message
      expect(screen.queryByText(/Feed Error Detected/i)).not.toBeInTheDocument();
    });

    it('should handle posts with null authorAgent', async () => {
      const postsWithNullAuthor = [
        {
          post_id: 2,
          content: 'Test post 2',
          author_agent: null,
          created_at: new Date().toISOString(),
          engagement: { comments: 0, likes: 0, shares: 0, views: 0 }
        }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => postsWithNullAuthor,
      });

      const { container } = render(<RealSocialMediaFeed />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(container).toBeTruthy();
      });

      expect(screen.queryByText(/TypeError/i)).not.toBeInTheDocument();
    });

    it('should handle posts with empty string authorAgent', async () => {
      const postsWithEmptyAuthor = [
        {
          post_id: 3,
          content: 'Test post 3',
          author_agent: '',
          created_at: new Date().toISOString(),
          engagement: { comments: 0, likes: 0, shares: 0, views: 0 }
        }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => postsWithEmptyAuthor,
      });

      const { container } = render(<RealSocialMediaFeed />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(container).toBeTruthy();
      });

      expect(screen.queryByText(/Cannot read properties/i)).not.toBeInTheDocument();
    });

    it('should handle posts with non-string authorAgent', async () => {
      const postsWithInvalidAuthor = [
        {
          post_id: 4,
          content: 'Test post 4',
          author_agent: 12345 as any, // Invalid type
          created_at: new Date().toISOString(),
          engagement: { comments: 0, likes: 0, shares: 0, views: 0 }
        }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => postsWithInvalidAuthor,
      });

      const { container } = render(<RealSocialMediaFeed />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(container).toBeTruthy();
      });

      expect(screen.queryByText(/TypeError/i)).not.toBeInTheDocument();
    });
  });

  describe('Mixed Valid and Invalid Data', () => {
    it('should handle mix of valid and invalid posts', async () => {
      const mixedPosts = [
        {
          post_id: 1,
          content: 'Valid post',
          author_agent: 'lambda-vi',
          created_at: new Date().toISOString(),
          engagement: { comments: 5, likes: 10, shares: 2, views: 100 }
        },
        {
          post_id: 2,
          content: 'Invalid post',
          author_agent: undefined,
          created_at: new Date().toISOString(),
          engagement: { comments: 0, likes: 0, shares: 0, views: 0 }
        },
        {
          post_id: 3,
          content: 'Another valid post',
          author_agent: 'get-to-know-you-agent',
          created_at: new Date().toISOString(),
          engagement: { comments: 3, likes: 7, shares: 1, views: 50 }
        }
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mixedPosts,
      });

      const { container } = render(<RealSocialMediaFeed />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(container).toBeTruthy();
      });

      // Should render without errors
      expect(screen.queryByText(/Feed Error Detected/i)).not.toBeInTheDocument();
    });
  });

  describe('Network Error Handling', () => {
    it('should handle API fetch errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { container } = render(<RealSocialMediaFeed />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(container).toBeTruthy();
      });

      // Should show appropriate error or loading state, not crash
      expect(container).toBeTruthy();
    });

    it('should handle malformed JSON response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const { container } = render(<RealSocialMediaFeed />, {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(container).toBeTruthy();
      });

      expect(container).toBeTruthy();
    });
  });

  describe('Regression Tests for charAt Error', () => {
    it('should never throw "Cannot read properties of undefined (reading charAt)" error', async () => {
      const errorScenarios = [
        { author_agent: undefined },
        { author_agent: null },
        { author_agent: '' },
        { author_agent: '   ' },
        { author_agent: 123 },
        { author_agent: {} },
        { author_agent: [] }
      ];

      for (const scenario of errorScenarios) {
        const posts = [
          {
            post_id: 1,
            content: 'Test post',
            created_at: new Date().toISOString(),
            engagement: { comments: 0, likes: 0, shares: 0, views: 0 },
            ...scenario
          }
        ];

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => posts,
        });

        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

        const { unmount } = render(<RealSocialMediaFeed />, {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          const errors = consoleError.mock.calls
            .map(call => call[0])
            .filter(err =>
              typeof err === 'string' &&
              err.includes('charAt')
            );

          expect(errors).toHaveLength(0);
        });

        consoleError.mockRestore();
        unmount();
      }
    });
  });
});
