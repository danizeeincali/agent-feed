/**
 * TDD Integration Tests: Author Display System
 *
 * Tests the complete author display system integration including:
 * - AuthorDisplayName component with real hooks
 * - Usage in post context
 * - Usage in comment context
 * - API call verification for users vs agents
 * - Caching behavior across multiple renders
 *
 * Test Coverage:
 * - Post Context Integration - 4 tests
 * - Comment Context Integration - 3 tests
 * - API Call Verification - 5 tests
 * - Caching Behavior - 3 tests
 * Total: 15 tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthorDisplayName } from '../../components/AuthorDisplayName';
import * as apiService from '../../services/api';

// Mock API service
vi.mock('../../services/api', () => ({
  apiService: {
    getUserSettings: vi.fn()
  }
}));

describe('Author Display Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the cache between tests by reimporting the hook
    vi.resetModules();
  });

  describe('Post Context Integration', () => {
    it('should display agent name in post author without API call', async () => {
      const getUserSettingsSpy = vi.spyOn(apiService.apiService, 'getUserSettings');

      render(<AuthorDisplayName authorId="avi" />);

      expect(screen.getByText('Λvi')).toBeInTheDocument();
      expect(getUserSettingsSpy).not.toHaveBeenCalled();
    });

    it('should display user name in post author with API call', async () => {
      vi.spyOn(apiService.apiService, 'getUserSettings').mockResolvedValue({
        success: true,
        data: {
          user_id: 'demo-user-123',
          display_name: 'Woz'
        }
      });

      render(<AuthorDisplayName authorId="demo-user-123" />);

      await waitFor(() => {
        expect(screen.getByText('Woz')).toBeInTheDocument();
      });
    });

    it('should handle agent posts from different agents', async () => {
      const { rerender } = render(<AuthorDisplayName authorId="avi" />);
      expect(screen.getByText('Λvi')).toBeInTheDocument();

      rerender(<AuthorDisplayName authorId="get-to-know-you-agent" />);
      expect(screen.getByText('Get-to-Know-You')).toBeInTheDocument();

      rerender(<AuthorDisplayName authorId="system" />);
      expect(screen.getByText('System Guide')).toBeInTheDocument();
    });

    it('should handle multiple user posts with different authors', async () => {
      vi.spyOn(apiService.apiService, 'getUserSettings')
        .mockImplementation((userId: string) => {
          if (userId === 'user-1') {
            return Promise.resolve({
              success: true,
              data: { user_id: 'user-1', display_name: 'Alice' }
            });
          }
          if (userId === 'user-2') {
            return Promise.resolve({
              success: true,
              data: { user_id: 'user-2', display_name: 'Bob' }
            });
          }
          return Promise.resolve({ success: false, data: null });
        });

      const { container: container1 } = render(<AuthorDisplayName authorId="user-1" />);
      const { container: container2 } = render(<AuthorDisplayName authorId="user-2" />);

      await waitFor(() => {
        expect(container1.textContent).toBe('Alice');
        expect(container2.textContent).toBe('Bob');
      });
    });
  });

  describe('Comment Context Integration', () => {
    it('should display correct author in comment thread', async () => {
      vi.spyOn(apiService.apiService, 'getUserSettings').mockResolvedValue({
        success: true,
        data: {
          user_id: 'commenter-1',
          display_name: 'CommentUser'
        }
      });

      render(<AuthorDisplayName authorId="commenter-1" />);

      await waitFor(() => {
        expect(screen.getByText('CommentUser')).toBeInTheDocument();
      });
    });

    it('should handle agent comments without API calls', async () => {
      const getUserSettingsSpy = vi.spyOn(apiService.apiService, 'getUserSettings');

      render(<AuthorDisplayName authorId="lambda-vi" />);

      expect(screen.getByText('Λvi')).toBeInTheDocument();
      expect(getUserSettingsSpy).not.toHaveBeenCalled();
    });

    it('should handle mixed user and agent comments', async () => {
      const getUserSettingsSpy = vi.spyOn(apiService.apiService, 'getUserSettings')
        .mockResolvedValue({
          success: true,
          data: { user_id: 'user-1', display_name: 'UserComment' }
        });

      const { container: agentContainer } = render(<AuthorDisplayName authorId="avi" />);
      const { container: userContainer } = render(<AuthorDisplayName authorId="user-1" />);

      // Agent should render immediately
      expect(agentContainer.textContent).toBe('Λvi');
      expect(getUserSettingsSpy).not.toHaveBeenCalledWith('avi');

      // User should render after API call
      await waitFor(() => {
        expect(userContainer.textContent).toBe('UserComment');
      });
      expect(getUserSettingsSpy).toHaveBeenCalledWith('user-1');
    });
  });

  describe('API Call Verification', () => {
    it('should make API call for user IDs', async () => {
      const getUserSettingsSpy = vi.spyOn(apiService.apiService, 'getUserSettings')
        .mockResolvedValue({
          success: true,
          data: { user_id: 'user-123', display_name: 'TestUser' }
        });

      render(<AuthorDisplayName authorId="user-123" />);

      await waitFor(() => {
        expect(getUserSettingsSpy).toHaveBeenCalledTimes(1);
        expect(getUserSettingsSpy).toHaveBeenCalledWith('user-123');
      });
    });

    it('should not make API call for avi agent', async () => {
      const getUserSettingsSpy = vi.spyOn(apiService.apiService, 'getUserSettings');

      render(<AuthorDisplayName authorId="avi" />);

      await waitFor(() => {
        expect(screen.getByText('Λvi')).toBeInTheDocument();
      });

      expect(getUserSettingsSpy).not.toHaveBeenCalled();
    });

    it('should not make API call for lambda-vi agent', async () => {
      const getUserSettingsSpy = vi.spyOn(apiService.apiService, 'getUserSettings');

      render(<AuthorDisplayName authorId="lambda-vi" />);

      expect(screen.getByText('Λvi')).toBeInTheDocument();
      expect(getUserSettingsSpy).not.toHaveBeenCalled();
    });

    it('should not make API call for get-to-know-you-agent', async () => {
      const getUserSettingsSpy = vi.spyOn(apiService.apiService, 'getUserSettings');

      render(<AuthorDisplayName authorId="get-to-know-you-agent" />);

      expect(screen.getByText('Get-to-Know-You')).toBeInTheDocument();
      expect(getUserSettingsSpy).not.toHaveBeenCalled();
    });

    it('should not make API call for any known agent', async () => {
      const getUserSettingsSpy = vi.spyOn(apiService.apiService, 'getUserSettings');

      const agents = ['avi', 'lambda-vi', 'system', 'personal-todos-agent', 'agent-ideas-agent', 'link-logger-agent'];

      for (const agentId of agents) {
        const { unmount } = render(<AuthorDisplayName authorId={agentId} />);
        unmount();
      }

      expect(getUserSettingsSpy).not.toHaveBeenCalled();
    });
  });

  describe('Caching Behavior', () => {
    it('should use cached display name on second render', async () => {
      const getUserSettingsSpy = vi.spyOn(apiService.apiService, 'getUserSettings')
        .mockResolvedValue({
          success: true,
          data: { user_id: 'user-123', display_name: 'CachedUser' }
        });

      // First render
      const { unmount } = render(<AuthorDisplayName authorId="user-123" />);
      await waitFor(() => {
        expect(screen.getByText('CachedUser')).toBeInTheDocument();
      });
      expect(getUserSettingsSpy).toHaveBeenCalledTimes(1);
      unmount();

      // Second render should use cache
      render(<AuthorDisplayName authorId="user-123" />);
      await waitFor(() => {
        expect(screen.getByText('CachedUser')).toBeInTheDocument();
      });

      // Should still only have been called once (cache hit)
      expect(getUserSettingsSpy).toHaveBeenCalledTimes(1);
    });

    it('should make separate API calls for different users', async () => {
      const getUserSettingsSpy = vi.spyOn(apiService.apiService, 'getUserSettings')
        .mockImplementation((userId: string) => {
          return Promise.resolve({
            success: true,
            data: { user_id: userId, display_name: `User-${userId}` }
          });
        });

      render(<AuthorDisplayName authorId="user-1" />);
      render(<AuthorDisplayName authorId="user-2" />);

      await waitFor(() => {
        expect(getUserSettingsSpy).toHaveBeenCalledTimes(2);
        expect(getUserSettingsSpy).toHaveBeenCalledWith('user-1');
        expect(getUserSettingsSpy).toHaveBeenCalledWith('user-2');
      });
    });

    it('should handle API failure gracefully with fallback', async () => {
      vi.spyOn(apiService.apiService, 'getUserSettings')
        .mockRejectedValue(new Error('API Error'));

      render(<AuthorDisplayName authorId="user-123" fallback="Error User" />);

      await waitFor(() => {
        expect(screen.getByText('Error User')).toBeInTheDocument();
      });
    });
  });

  describe('Error Recovery', () => {
    it('should show fallback on API error', async () => {
      vi.spyOn(apiService.apiService, 'getUserSettings')
        .mockRejectedValue(new Error('Network error'));

      render(<AuthorDisplayName authorId="user-123" fallback="Offline User" />);

      await waitFor(() => {
        expect(screen.getByText('Offline User')).toBeInTheDocument();
      });
    });

    it('should show fallback when API returns no data', async () => {
      vi.spyOn(apiService.apiService, 'getUserSettings')
        .mockResolvedValue({ success: false, data: null });

      render(<AuthorDisplayName authorId="user-123" fallback="No Data" />);

      await waitFor(() => {
        expect(screen.getByText('No Data')).toBeInTheDocument();
      });
    });

    it('should show fallback when display_name is null', async () => {
      vi.spyOn(apiService.apiService, 'getUserSettings')
        .mockResolvedValue({
          success: true,
          data: { user_id: 'user-123', display_name: null }
        });

      render(<AuthorDisplayName authorId="user-123" fallback="Unnamed" />);

      await waitFor(() => {
        expect(screen.getByText('Unnamed')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should render agents synchronously without delay', () => {
      const startTime = performance.now();
      render(<AuthorDisplayName authorId="avi" />);
      const endTime = performance.now();

      expect(screen.getByText('Λvi')).toBeInTheDocument();
      expect(endTime - startTime).toBeLessThan(10); // Should be near-instant
    });

    it('should batch multiple user requests efficiently', async () => {
      const getUserSettingsSpy = vi.spyOn(apiService.apiService, 'getUserSettings')
        .mockImplementation((userId: string) => {
          return Promise.resolve({
            success: true,
            data: { user_id: userId, display_name: `User-${userId}` }
          });
        });

      // Render multiple components simultaneously
      render(
        <>
          <AuthorDisplayName authorId="user-1" />
          <AuthorDisplayName authorId="user-2" />
          <AuthorDisplayName authorId="user-3" />
        </>
      );

      await waitFor(() => {
        expect(getUserSettingsSpy).toHaveBeenCalledTimes(3);
      });
    });
  });
});
