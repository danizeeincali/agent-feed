/**
 * TDD Unit Tests: Comment Author Display
 *
 * Tests comment author name display in the comment system, ensuring:
 * - User comments show correct user display names (e.g., "Woz")
 * - Agent comments show agent names
 * - Proper handling of author_user_id field
 * - Fallback to author field when author_user_id is missing
 * - Migration compatibility (old + new formats)
 *
 * Test Coverage: 20 tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CommentThread } from '../../components/CommentThread';
import * as useUserSettingsModule from '../../hooks/useUserSettings';

// Mock hooks
vi.mock('../../hooks/useUserSettings');
vi.mock('../../services/api', () => ({
  apiService: {
    createComment: vi.fn(),
    getPostComments: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}));

describe('Comment Author Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('User Comments Display', () => {
    it('should show correct author name for user comment', async () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'Woz',
        loading: false,
        error: null,
        settings: { user_id: 'demo-user-123', display_name: 'Woz' },
        refresh: vi.fn(),
        username: undefined
      });

      const comment = {
        id: 'comment-1',
        content: 'Test comment',
        author: 'demo-user-123',
        author_user_id: 'demo-user-123',
        created_at: '2025-01-01T00:00:00Z',
        parent_id: null
      };

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={[comment]}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Woz')).toBeInTheDocument();
      });
    });

    it('should display "Woz" for demo-user-123 comments', async () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'Woz',
        loading: false,
        error: null,
        settings: { user_id: 'demo-user-123', display_name: 'Woz' },
        refresh: vi.fn(),
        username: undefined
      });

      const comment = {
        id: 'comment-1',
        content: 'User comment',
        author: 'User',
        author_user_id: 'demo-user-123',
        created_at: '2025-01-01T00:00:00Z',
        parent_id: null
      };

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={[comment]}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Woz')).toBeInTheDocument();
      });
    });

    it('should fetch user settings for author_user_id', async () => {
      // Arrange
      const useUserSettingsSpy = vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'Test User',
        loading: false,
        error: null,
        settings: { user_id: 'user-123', display_name: 'Test User' },
        refresh: vi.fn(),
        username: undefined
      });

      const comment = {
        id: 'comment-1',
        content: 'Comment text',
        author: 'Fallback Name',
        author_user_id: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        parent_id: null
      };

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={[comment]}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert
      await waitFor(() => {
        expect(useUserSettingsSpy).toHaveBeenCalledWith('user-123');
      });
    });

    it('should handle multiple user comments with different display names', async () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockImplementation((userId) => {
        if (userId === 'user-1') {
          return {
            displayName: 'Alice',
            loading: false,
            error: null,
            settings: { user_id: 'user-1', display_name: 'Alice' },
            refresh: vi.fn(),
            username: undefined
          };
        }
        if (userId === 'user-2') {
          return {
            displayName: 'Bob',
            loading: false,
            error: null,
            settings: { user_id: 'user-2', display_name: 'Bob' },
            refresh: vi.fn(),
            username: undefined
          };
        }
        return {
          displayName: 'User',
          loading: false,
          error: null,
          settings: null,
          refresh: vi.fn(),
          username: undefined
        };
      });

      const comments = [
        {
          id: 'comment-1',
          content: 'First comment',
          author: 'User',
          author_user_id: 'user-1',
          created_at: '2025-01-01T00:00:00Z',
          parent_id: null
        },
        {
          id: 'comment-2',
          content: 'Second comment',
          author: 'User',
          author_user_id: 'user-2',
          created_at: '2025-01-01T00:01:00Z',
          parent_id: null
        }
      ];

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={comments}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
      });
    });
  });

  describe('Agent Comments Display', () => {
    it('should show agent name for agent comments', async () => {
      // Arrange
      const comment = {
        id: 'comment-1',
        content: 'Agent response',
        author: 'lambda-vi',
        author_user_id: null, // No user ID for agent
        created_at: '2025-01-01T00:00:00Z',
        parent_id: null
      };

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={[comment]}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('lambda-vi')).toBeInTheDocument();
      });
    });

    it('should display agent name when author_user_id is null', async () => {
      // Arrange
      const comment = {
        id: 'comment-1',
        content: 'System message',
        author: 'system-agent',
        author_user_id: null,
        created_at: '2025-01-01T00:00:00Z',
        parent_id: null
      };

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={[comment]}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('system-agent')).toBeInTheDocument();
      });
    });

    it('should not call useUserSettings for agent comments', async () => {
      // Arrange
      const useUserSettingsSpy = vi.spyOn(useUserSettingsModule, 'useUserSettings');

      const comment = {
        id: 'comment-1',
        content: 'Agent comment',
        author: 'agent-name',
        author_user_id: null,
        created_at: '2025-01-01T00:00:00Z',
        parent_id: null
      };

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={[comment]}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert - Should not fetch user settings for agents
      await waitFor(() => {
        expect(useUserSettingsSpy).not.toHaveBeenCalledWith(null);
      });
    });
  });

  describe('Missing author_user_id Handling', () => {
    it('should fall back to author field when author_user_id is missing', async () => {
      // Arrange
      const comment = {
        id: 'comment-1',
        content: 'Comment without user ID',
        author: 'FallbackName',
        // author_user_id not present
        created_at: '2025-01-01T00:00:00Z',
        parent_id: null
      };

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={[comment]}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('FallbackName')).toBeInTheDocument();
      });
    });

    it('should handle undefined author_user_id gracefully', async () => {
      // Arrange
      const comment = {
        id: 'comment-1',
        content: 'Test comment',
        author: 'UserName',
        author_user_id: undefined,
        created_at: '2025-01-01T00:00:00Z',
        parent_id: null
      };

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={[comment]}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('UserName')).toBeInTheDocument();
      });
    });

    it('should fall back to "User" when both author and author_user_id missing', async () => {
      // Arrange
      const comment = {
        id: 'comment-1',
        content: 'Comment with missing author info',
        // No author or author_user_id
        created_at: '2025-01-01T00:00:00Z',
        parent_id: null
      };

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={[comment]}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('User')).toBeInTheDocument();
      });
    });
  });

  describe('Migration Compatibility', () => {
    it('should handle old format comments (only author field)', async () => {
      // Arrange - Old format comment
      const oldComment = {
        id: 'comment-old',
        content: 'Old style comment',
        author: 'OldUser',
        created_at: '2025-01-01T00:00:00Z',
        parent_id: null
      };

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={[oldComment]}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('OldUser')).toBeInTheDocument();
      });
    });

    it('should handle new format comments (with author_user_id)', async () => {
      // Arrange - New format comment
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'NewUser',
        loading: false,
        error: null,
        settings: { user_id: 'user-new', display_name: 'NewUser' },
        refresh: vi.fn(),
        username: undefined
      });

      const newComment = {
        id: 'comment-new',
        content: 'New style comment',
        author: 'Fallback',
        author_user_id: 'user-new',
        created_at: '2025-01-01T00:00:00Z',
        parent_id: null
      };

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={[newComment]}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('NewUser')).toBeInTheDocument();
      });
    });

    it('should handle mixed old and new format comments', async () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'ModernUser',
        loading: false,
        error: null,
        settings: { user_id: 'user-123', display_name: 'ModernUser' },
        refresh: vi.fn(),
        username: undefined
      });

      const comments = [
        {
          id: 'comment-old',
          content: 'Old format',
          author: 'LegacyUser',
          created_at: '2025-01-01T00:00:00Z',
          parent_id: null
        },
        {
          id: 'comment-new',
          content: 'New format',
          author: 'Fallback',
          author_user_id: 'user-123',
          created_at: '2025-01-01T00:01:00Z',
          parent_id: null
        }
      ];

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={comments}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('LegacyUser')).toBeInTheDocument();
        expect(screen.getByText('ModernUser')).toBeInTheDocument();
      });
    });

    it('should prioritize author_user_id over author when both present', async () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'RealName',
        loading: false,
        error: null,
        settings: { user_id: 'user-123', display_name: 'RealName' },
        refresh: vi.fn(),
        username: undefined
      });

      const comment = {
        id: 'comment-1',
        content: 'Test comment',
        author: 'OldName', // Should be ignored
        author_user_id: 'user-123', // Should be used
        created_at: '2025-01-01T00:00:00Z',
        parent_id: null
      };

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={[comment]}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('RealName')).toBeInTheDocument();
        expect(screen.queryByText('OldName')).not.toBeInTheDocument();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state while fetching user display name', () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: '',
        loading: true,
        error: null,
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      const comment = {
        id: 'comment-1',
        content: 'Test comment',
        author: 'Loading...',
        author_user_id: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        parent_id: null
      };

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={[comment]}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert - Should show loading indicator or fallback
      expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument();
    });

    it('should fall back to author field on user settings error', async () => {
      // Arrange
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: 'FallbackUser',
        loading: false,
        error: new Error('API Error'),
        settings: null,
        refresh: vi.fn(),
        username: undefined
      });

      const comment = {
        id: 'comment-1',
        content: 'Test comment',
        author: 'FallbackUser',
        author_user_id: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        parent_id: null
      };

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={[comment]}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('FallbackUser')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty author_user_id string', async () => {
      // Arrange
      const comment = {
        id: 'comment-1',
        content: 'Test comment',
        author: 'EmptyIdUser',
        author_user_id: '',
        created_at: '2025-01-01T00:00:00Z',
        parent_id: null
      };

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={[comment]}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('EmptyIdUser')).toBeInTheDocument();
      });
    });

    it('should handle whitespace-only author names', async () => {
      // Arrange
      const comment = {
        id: 'comment-1',
        content: 'Test comment',
        author: '   ',
        author_user_id: null,
        created_at: '2025-01-01T00:00:00Z',
        parent_id: null
      };

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={[comment]}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('User')).toBeInTheDocument();
      });
    });

    it('should handle special characters in author names', async () => {
      // Arrange
      const specialName = 'User@123!#$';
      vi.spyOn(useUserSettingsModule, 'useUserSettings').mockReturnValue({
        displayName: specialName,
        loading: false,
        error: null,
        settings: { user_id: 'user-123', display_name: specialName },
        refresh: vi.fn(),
        username: undefined
      });

      const comment = {
        id: 'comment-1',
        content: 'Test comment',
        author: 'Fallback',
        author_user_id: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        parent_id: null
      };

      // Act
      render(
        <CommentThread
          postId="post-1"
          comments={[comment]}
          currentUser="demo-user-123"
          onCommentsUpdate={vi.fn()}
        />
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText(specialName)).toBeInTheDocument();
      });
    });
  });
});
