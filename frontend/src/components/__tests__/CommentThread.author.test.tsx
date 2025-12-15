import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CommentThread from '../CommentThread';

/**
 * TDD Test Suite for Issue 1: Comment Author Display
 *
 * PROBLEM: Agent comments show "Avi" instead of agent display name
 * EXPECTED: Each agent shows their unique display name
 *
 * Test Coverage:
 * - Agent comment displays agent.display_name
 * - User comment displays user name
 * - Fallback to "User" when no author
 * - Correct prioritization: author_agent > author_user_id
 * - Multiple agents show different names
 */

describe('Issue 1: Comment Author Display', () => {
  const mockPost = {
    id: 1,
    content: 'Test post',
    author: 'Test User',
    created_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Agent Comment Author Display', () => {
    it('should display agent display name instead of "Avi" for agent comments', async () => {
      const mockComments = [
        {
          id: 1,
          post_id: 1,
          content: 'Agent comment',
          created_at: new Date().toISOString(),
          author_agent: 10, // Agent ID
          author_user_id: null,
          agent: {
            id: 10,
            name: 'data_analyst',
            display_name: 'Data Analyst Avi',
            type: 'agent',
          },
        },
      ];

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onCommentSubmit={vi.fn()}
        />
      );

      // Should show agent display name
      expect(screen.getByText('Data Analyst Avi')).toBeInTheDocument();

      // Should NOT show "Avi"
      expect(screen.queryByText(/^Avi$/)).not.toBeInTheDocument();
    });

    it('should display different names for different agents', async () => {
      const mockComments = [
        {
          id: 1,
          post_id: 1,
          content: 'First agent comment',
          created_at: new Date().toISOString(),
          author_agent: 10,
          author_user_id: null,
          agent: {
            id: 10,
            name: 'data_analyst',
            display_name: 'Data Analyst Avi',
            type: 'agent',
          },
        },
        {
          id: 2,
          post_id: 1,
          content: 'Second agent comment',
          created_at: new Date().toISOString(),
          author_agent: 11,
          author_user_id: null,
          agent: {
            id: 11,
            name: 'creative_writer',
            display_name: 'Creative Writer Avi',
            type: 'agent',
          },
        },
        {
          id: 3,
          post_id: 1,
          content: 'Third agent comment',
          created_at: new Date().toISOString(),
          author_agent: 12,
          author_user_id: null,
          agent: {
            id: 12,
            name: 'tech_expert',
            display_name: 'Tech Expert Avi',
            type: 'agent',
          },
        },
      ];

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onCommentSubmit={vi.fn()}
        />
      );

      // Each agent should show unique display name
      expect(screen.getByText('Data Analyst Avi')).toBeInTheDocument();
      expect(screen.getByText('Creative Writer Avi')).toBeInTheDocument();
      expect(screen.getByText('Tech Expert Avi')).toBeInTheDocument();
    });

    it('should handle agent without display_name gracefully', async () => {
      const mockComments = [
        {
          id: 1,
          post_id: 1,
          content: 'Agent comment',
          created_at: new Date().toISOString(),
          author_agent: 10,
          author_user_id: null,
          agent: {
            id: 10,
            name: 'data_analyst',
            display_name: null, // Missing display name
            type: 'agent',
          },
        },
      ];

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onCommentSubmit={vi.fn()}
        />
      );

      // Should fallback to formatted name or "Agent"
      expect(screen.getByText(/data analyst|Agent/i)).toBeInTheDocument();
    });
  });

  describe('User Comment Author Display', () => {
    it('should display user name for user comments', async () => {
      const mockComments = [
        {
          id: 1,
          post_id: 1,
          content: 'User comment',
          created_at: new Date().toISOString(),
          author_agent: null,
          author_user_id: 1,
          user: {
            id: 1,
            name: 'John Doe',
          },
        },
      ];

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onCommentSubmit={vi.fn()}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should fallback to "User" when no author data', async () => {
      const mockComments = [
        {
          id: 1,
          post_id: 1,
          content: 'Anonymous comment',
          created_at: new Date().toISOString(),
          author_agent: null,
          author_user_id: null,
        },
      ];

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onCommentSubmit={vi.fn()}
        />
      );

      expect(screen.getByText('User')).toBeInTheDocument();
    });
  });

  describe('Author Priority Logic', () => {
    it('should prioritize author_agent over author_user_id', async () => {
      const mockComments = [
        {
          id: 1,
          post_id: 1,
          content: 'Comment with both',
          created_at: new Date().toISOString(),
          author_agent: 10,
          author_user_id: 1,
          agent: {
            id: 10,
            name: 'data_analyst',
            display_name: 'Data Analyst Avi',
            type: 'agent',
          },
          user: {
            id: 1,
            name: 'John Doe',
          },
        },
      ];

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onCommentSubmit={vi.fn()}
        />
      );

      // Should show agent name, not user name
      expect(screen.getByText('Data Analyst Avi')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  describe('Mixed Comments Display', () => {
    it('should correctly display mixed agent and user comments', async () => {
      const mockComments = [
        {
          id: 1,
          post_id: 1,
          content: 'User comment',
          created_at: new Date().toISOString(),
          author_agent: null,
          author_user_id: 1,
          user: {
            id: 1,
            name: 'John Doe',
          },
        },
        {
          id: 2,
          post_id: 1,
          content: 'Agent response',
          created_at: new Date().toISOString(),
          author_agent: 10,
          author_user_id: null,
          agent: {
            id: 10,
            name: 'data_analyst',
            display_name: 'Data Analyst Avi',
            type: 'agent',
          },
        },
        {
          id: 3,
          post_id: 1,
          content: 'Another user comment',
          created_at: new Date().toISOString(),
          author_agent: null,
          author_user_id: 1,
          user: {
            id: 1,
            name: 'John Doe',
          },
        },
      ];

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onCommentSubmit={vi.fn()}
        />
      );

      // Should show both user and agent names correctly
      const johnDoeElements = screen.getAllByText('John Doe');
      expect(johnDoeElements).toHaveLength(2);
      expect(screen.getByText('Data Analyst Avi')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty agent object', async () => {
      const mockComments = [
        {
          id: 1,
          post_id: 1,
          content: 'Comment',
          created_at: new Date().toISOString(),
          author_agent: 10,
          author_user_id: null,
          agent: null, // Missing agent object
        },
      ];

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onCommentSubmit={vi.fn()}
        />
      );

      // Should not crash, should show fallback
      expect(screen.getByText(/Agent|User/i)).toBeInTheDocument();
    });

    it('should handle malformed display_name', async () => {
      const mockComments = [
        {
          id: 1,
          post_id: 1,
          content: 'Comment',
          created_at: new Date().toISOString(),
          author_agent: 10,
          author_user_id: null,
          agent: {
            id: 10,
            name: 'data_analyst',
            display_name: '', // Empty string
            type: 'agent',
          },
        },
      ];

      render(
        <CommentThread
          post={mockPost}
          comments={mockComments}
          onCommentSubmit={vi.fn()}
        />
      );

      // Should handle empty string gracefully
      expect(screen.getByText(/data analyst|Agent/i)).toBeInTheDocument();
    });
  });
});
