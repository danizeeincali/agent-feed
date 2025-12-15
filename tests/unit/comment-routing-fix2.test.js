/**
 * Unit Test: Comment Routing Fix 2 - Agent Response Routing for Comment Replies
 *
 * Tests that agent responses are correctly routed based on parent comment's author_agent
 * PRIORITY 1: Parent comment's author_agent (for threaded replies)
 * PRIORITY 2: Parent post's author_agent (for top-level comments)
 * PRIORITY 3-5: Fallback logic (mentions, keywords, default)
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock the database selector
const mockDbSelector = {
  getCommentById: jest.fn(),
  getPostById: jest.fn()
};

// Mock the import
jest.unstable_mockModule('../api-server/config/database-selector.js', () => ({
  default: mockDbSelector
}));

describe('Fix 2: Agent Response Routing for Comment Replies', () => {
  let AviOrchestrator;
  let orchestrator;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Import the orchestrator (after mocks are set up)
    const module = await import('../api-server/avi/orchestrator.js');
    AviOrchestrator = module.default;

    // Create orchestrator instance
    orchestrator = new AviOrchestrator();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('PRIORITY 1: Parent Comment Routing (Threaded Replies)', () => {
    test('should route reply to parent comment\'s agent (avi → avi)', async () => {
      const parentComment = {
        id: 'comment-123',
        author_agent: 'avi',
        content: 'Original comment by Avi'
      };

      const parentPost = {
        id: 'post-456',
        author_agent: 'page-builder-agent'
      };

      mockDbSelector.getCommentById.mockResolvedValue(parentComment);

      const metadata = {
        parent_comment_id: 'comment-123',
        parent_post_id: 'post-456'
      };

      const agent = await orchestrator.routeCommentToAgent(
        'This is a reply to Avi',
        metadata,
        parentPost
      );

      expect(agent).toBe('avi');
      expect(mockDbSelector.getCommentById).toHaveBeenCalledWith('comment-123');
    });

    test('should route reply to parent comment\'s agent (page-builder → page-builder)', async () => {
      const parentComment = {
        id: 'comment-789',
        author_agent: 'page-builder-agent',
        content: 'Comment by PageBuilder'
      };

      mockDbSelector.getCommentById.mockResolvedValue(parentComment);

      const metadata = {
        parent_comment_id: 'comment-789',
        parent_post_id: 'post-101'
      };

      const agent = await orchestrator.routeCommentToAgent(
        'Reply to PageBuilder',
        metadata,
        null
      );

      expect(agent).toBe('page-builder-agent');
    });

    test('should fallback to parent post when parent comment has no author_agent', async () => {
      const parentComment = {
        id: 'comment-111',
        author_agent: null,  // Missing agent!
        content: 'Comment without agent'
      };

      const parentPost = {
        id: 'post-222',
        author_agent: 'skills-architect-agent'
      };

      mockDbSelector.getCommentById.mockResolvedValue(parentComment);

      const metadata = {
        parent_comment_id: 'comment-111',
        parent_post_id: 'post-222'
      };

      const agent = await orchestrator.routeCommentToAgent(
        'Reply to comment without agent',
        metadata,
        parentPost
      );

      expect(agent).toBe('skills-architect-agent');
    });

    test('should fallback to parent post when parent comment not found', async () => {
      mockDbSelector.getCommentById.mockResolvedValue(null); // Not found

      const parentPost = {
        id: 'post-333',
        author_agent: 'avi'
      };

      const metadata = {
        parent_comment_id: 'comment-999', // Non-existent
        parent_post_id: 'post-333'
      };

      const agent = await orchestrator.routeCommentToAgent(
        'Reply to non-existent comment',
        metadata,
        parentPost
      );

      expect(agent).toBe('avi');
    });

    test('should handle database errors gracefully', async () => {
      mockDbSelector.getCommentById.mockRejectedValue(new Error('Database error'));

      const parentPost = {
        id: 'post-444',
        author_agent: 'page-builder-agent'
      };

      const metadata = {
        parent_comment_id: 'comment-error',
        parent_post_id: 'post-444'
      };

      const agent = await orchestrator.routeCommentToAgent(
        'Reply after database error',
        metadata,
        parentPost
      );

      // Should fallback to parent post routing
      expect(agent).toBe('page-builder-agent');
    });
  });

  describe('PRIORITY 2: Parent Post Routing (Top-Level Comments)', () => {
    test('should route to parent post\'s agent when no parent_comment_id', async () => {
      const parentPost = {
        id: 'post-555',
        author_agent: 'avi'
      };

      const metadata = {
        parent_post_id: 'post-555'
        // No parent_comment_id = top-level comment
      };

      const agent = await orchestrator.routeCommentToAgent(
        'Top-level comment on Avi\'s post',
        metadata,
        parentPost
      );

      expect(agent).toBe('avi');
      expect(mockDbSelector.getCommentById).not.toHaveBeenCalled();
    });

    test('should route to page-builder for top-level comment on their post', async () => {
      const parentPost = {
        id: 'post-666',
        author_agent: 'page-builder-agent'
      };

      const metadata = {
        parent_post_id: 'post-666'
      };

      const agent = await orchestrator.routeCommentToAgent(
        'Comment on PageBuilder post',
        metadata,
        parentPost
      );

      expect(agent).toBe('page-builder-agent');
    });
  });

  describe('PRIORITY 3-5: Fallback Logic (Mentions, Keywords, Default)', () => {
    test('should route by mention when no parent context available', async () => {
      const metadata = {};

      const agent = await orchestrator.routeCommentToAgent(
        'Hey @page-builder can you help?',
        metadata,
        null
      );

      expect(agent).toBe('page-builder-agent');
    });

    test('should route by keyword when no parent context or mentions', async () => {
      const metadata = {};

      const agent = await orchestrator.routeCommentToAgent(
        'I need help with page layout',
        metadata,
        null
      );

      expect(agent).toBe('page-builder-agent');
    });

    test('should default to avi when all routing fails', async () => {
      const metadata = {};

      const agent = await orchestrator.routeCommentToAgent(
        'Generic question',
        metadata,
        null
      );

      expect(agent).toBe('avi');
    });
  });

  describe('Complex Threading Scenarios', () => {
    test('should maintain thread context through multiple replies (depth 3)', async () => {
      // Level 1: User comments on Avi's post
      // Level 2: PageBuilder replies to user
      // Level 3: User replies to PageBuilder ← should route to PageBuilder

      const pageBuilderComment = {
        id: 'comment-level2',
        author_agent: 'page-builder-agent',
        parent_id: 'comment-level1',
        content: 'PageBuilder response'
      };

      mockDbSelector.getCommentById.mockResolvedValue(pageBuilderComment);

      const aviPost = {
        id: 'post-thread',
        author_agent: 'avi'
      };

      const metadata = {
        parent_comment_id: 'comment-level2',
        parent_post_id: 'post-thread'
      };

      const agent = await orchestrator.routeCommentToAgent(
        'Reply to PageBuilder at depth 3',
        metadata,
        aviPost
      );

      expect(agent).toBe('page-builder-agent');
    });

    test('should route correctly when switching agents mid-thread', async () => {
      // Scenario: User talks to Avi, then skills-architect joins, then user replies to skills-architect

      const skillsArchitectComment = {
        id: 'comment-skills',
        author_agent: 'skills-architect-agent',
        content: 'Skills architect joining conversation'
      };

      mockDbSelector.getCommentById.mockResolvedValue(skillsArchitectComment);

      const aviPost = {
        id: 'post-multiagent',
        author_agent: 'avi'
      };

      const metadata = {
        parent_comment_id: 'comment-skills',
        parent_post_id: 'post-multiagent'
      };

      const agent = await orchestrator.routeCommentToAgent(
        'Follow-up to skills architect',
        metadata,
        aviPost
      );

      expect(agent).toBe('skills-architect-agent');
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing metadata gracefully', async () => {
      const agent = await orchestrator.routeCommentToAgent(
        'Comment with minimal context',
        {},  // Empty metadata
        null
      );

      expect(agent).toBe('avi');
    });

    test('should handle null content gracefully', async () => {
      const agent = await orchestrator.routeCommentToAgent(
        '',
        {},
        null
      );

      expect(agent).toBe('avi');
    });

    test('should be case-insensitive for mentions', async () => {
      const agent = await orchestrator.routeCommentToAgent(
        'Hey @PAGE-BUILDER can you help?',
        {},
        null
      );

      expect(agent).toBe('page-builder-agent');
    });
  });
});
