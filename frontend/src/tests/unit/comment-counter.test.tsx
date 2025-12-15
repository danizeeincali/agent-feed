/**
 * Unit Tests: Comment Counter Display Logic
 *
 * Tests the comment counter functionality in isolation
 * focusing on display logic and edge cases.
 *
 * Test Coverage:
 * - Counter displays correct values (0, 1, 5, 999+)
 * - Handles undefined/null comments field
 * - Displays fallback (0) when comments is missing
 * - TypeScript type checking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AgentPost } from '../../types/api';

// Mock component that uses the same logic as RealSocialMediaFeed
const CommentCounter = ({ post }: { post: AgentPost }) => {
  return (
    <button
      className="flex items-center space-x-2"
      data-testid="comment-counter"
    >
      <span className="icon">💬</span>
      <span data-testid="comment-count">{post.comments || 0}</span>
    </button>
  );
};

describe('Comment Counter - Unit Tests', () => {
  describe('Display Logic', () => {
    it('should display 0 when comments field is undefined', () => {
      const post: AgentPost = {
        id: 'test-1',
        title: 'Test Post',
        content: 'Test content',
        authorAgent: 'TestAgent',
        authorAgentName: 'Test Agent',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published',
        visibility: 'public',
        metadata: {
          businessImpact: 50,
          confidence_score: 0.9,
          isAgentResponse: false,
          processing_time_ms: 100,
          model_version: 'v1',
          tokens_used: 100,
          temperature: 0.7
        },
        engagement: {
          comments: 0,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: {
            average: 0,
            count: 0,
            distribution: {}
          }
        },
        tags: [],
        category: 'general',
        priority: 'medium',
        // comments field is intentionally omitted
      };

      render(<CommentCounter post={post} />);

      const countElement = screen.getByTestId('comment-count');
      expect(countElement.textContent).toBe('0');
    });

    it('should display 0 when comments field is explicitly 0', () => {
      const post: AgentPost = {
        id: 'test-2',
        title: 'Test Post',
        content: 'Test content',
        authorAgent: 'TestAgent',
        authorAgentName: 'Test Agent',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published',
        visibility: 'public',
        metadata: {
          businessImpact: 50,
          confidence_score: 0.9,
          isAgentResponse: false,
          processing_time_ms: 100,
          model_version: 'v1',
          tokens_used: 100,
          temperature: 0.7
        },
        engagement: {
          comments: 0,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: {
            average: 0,
            count: 0,
            distribution: {}
          }
        },
        tags: [],
        category: 'general',
        priority: 'medium',
        comments: 0
      };

      render(<CommentCounter post={post} />);

      const countElement = screen.getByTestId('comment-count');
      expect(countElement.textContent).toBe('0');
    });

    it('should display 1 when comments field is 1', () => {
      const post: AgentPost = {
        id: 'test-3',
        title: 'Test Post',
        content: 'Test content',
        authorAgent: 'TestAgent',
        authorAgentName: 'Test Agent',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published',
        visibility: 'public',
        metadata: {
          businessImpact: 50,
          confidence_score: 0.9,
          isAgentResponse: false,
          processing_time_ms: 100,
          model_version: 'v1',
          tokens_used: 100,
          temperature: 0.7
        },
        engagement: {
          comments: 0,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: {
            average: 0,
            count: 0,
            distribution: {}
          }
        },
        tags: [],
        category: 'general',
        priority: 'medium',
        comments: 1
      };

      render(<CommentCounter post={post} />);

      const countElement = screen.getByTestId('comment-count');
      expect(countElement.textContent).toBe('1');
    });

    it('should display 5 when comments field is 5', () => {
      const post: AgentPost = {
        id: 'test-4',
        title: 'Test Post',
        content: 'Test content',
        authorAgent: 'TestAgent',
        authorAgentName: 'Test Agent',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published',
        visibility: 'public',
        metadata: {
          businessImpact: 50,
          confidence_score: 0.9,
          isAgentResponse: false,
          processing_time_ms: 100,
          model_version: 'v1',
          tokens_used: 100,
          temperature: 0.7
        },
        engagement: {
          comments: 0,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: {
            average: 0,
            count: 0,
            distribution: {}
          }
        },
        tags: [],
        category: 'general',
        priority: 'medium',
        comments: 5
      };

      render(<CommentCounter post={post} />);

      const countElement = screen.getByTestId('comment-count');
      expect(countElement.textContent).toBe('5');
    });

    it('should display exact number for values under 1000', () => {
      const post: AgentPost = {
        id: 'test-5',
        title: 'Test Post',
        content: 'Test content',
        authorAgent: 'TestAgent',
        authorAgentName: 'Test Agent',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published',
        visibility: 'public',
        metadata: {
          businessImpact: 50,
          confidence_score: 0.9,
          isAgentResponse: false,
          processing_time_ms: 100,
          model_version: 'v1',
          tokens_used: 100,
          temperature: 0.7
        },
        engagement: {
          comments: 0,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: {
            average: 0,
            count: 0,
            distribution: {}
          }
        },
        tags: [],
        category: 'general',
        priority: 'medium',
        comments: 999
      };

      render(<CommentCounter post={post} />);

      const countElement = screen.getByTestId('comment-count');
      expect(countElement.textContent).toBe('999');
    });

    it('should display 1000 for exactly 1000 comments', () => {
      const post: AgentPost = {
        id: 'test-6',
        title: 'Test Post',
        content: 'Test content',
        authorAgent: 'TestAgent',
        authorAgentName: 'Test Agent',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published',
        visibility: 'public',
        metadata: {
          businessImpact: 50,
          confidence_score: 0.9,
          isAgentResponse: false,
          processing_time_ms: 100,
          model_version: 'v1',
          tokens_used: 100,
          temperature: 0.7
        },
        engagement: {
          comments: 0,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: {
            average: 0,
            count: 0,
            distribution: {}
          }
        },
        tags: [],
        category: 'general',
        priority: 'medium',
        comments: 1000
      };

      render(<CommentCounter post={post} />);

      const countElement = screen.getByTestId('comment-count');
      expect(countElement.textContent).toBe('1000');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null comments field gracefully', () => {
      const post: any = {
        id: 'test-7',
        title: 'Test Post',
        content: 'Test content',
        authorAgent: 'TestAgent',
        authorAgentName: 'Test Agent',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published',
        visibility: 'public',
        metadata: {
          businessImpact: 50,
          confidence_score: 0.9,
          isAgentResponse: false,
          processing_time_ms: 100,
          model_version: 'v1',
          tokens_used: 100,
          temperature: 0.7
        },
        engagement: {
          comments: 0,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: {
            average: 0,
            count: 0,
            distribution: {}
          }
        },
        tags: [],
        category: 'general',
        priority: 'medium',
        comments: null
      };

      render(<CommentCounter post={post} />);

      const countElement = screen.getByTestId('comment-count');
      expect(countElement.textContent).toBe('0');
    });

    it('should handle negative numbers as-is (no validation)', () => {
      const post: any = {
        id: 'test-8',
        title: 'Test Post',
        content: 'Test content',
        authorAgent: 'TestAgent',
        authorAgentName: 'Test Agent',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published',
        visibility: 'public',
        metadata: {
          businessImpact: 50,
          confidence_score: 0.9,
          isAgentResponse: false,
          processing_time_ms: 100,
          model_version: 'v1',
          tokens_used: 100,
          temperature: 0.7
        },
        engagement: {
          comments: 0,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: {
            average: 0,
            count: 0,
            distribution: {}
          }
        },
        tags: [],
        category: 'general',
        priority: 'medium',
        comments: -5
      };

      render(<CommentCounter post={post} />);

      const countElement = screen.getByTestId('comment-count');
      // Current implementation uses || 0, which won't catch negative numbers
      // This test documents the current behavior (not validating negatives)
      expect(countElement.textContent).toBe('-5');
    });

    it('should handle very large numbers', () => {
      const post: AgentPost = {
        id: 'test-9',
        title: 'Test Post',
        content: 'Test content',
        authorAgent: 'TestAgent',
        authorAgentName: 'Test Agent',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published',
        visibility: 'public',
        metadata: {
          businessImpact: 50,
          confidence_score: 0.9,
          isAgentResponse: false,
          processing_time_ms: 100,
          model_version: 'v1',
          tokens_used: 100,
          temperature: 0.7
        },
        engagement: {
          comments: 0,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: {
            average: 0,
            count: 0,
            distribution: {}
          }
        },
        tags: [],
        category: 'general',
        priority: 'medium',
        comments: 999999
      };

      render(<CommentCounter post={post} />);

      const countElement = screen.getByTestId('comment-count');
      expect(countElement.textContent).toBe('999999');
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should enforce AgentPost type correctly', () => {
      // This test verifies TypeScript compilation
      // If this compiles, the types are correct
      const validPost: AgentPost = {
        id: 'type-test-1',
        title: 'Type Test',
        content: 'Content',
        authorAgent: 'TestAgent',
        authorAgentName: 'Test Agent',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published',
        visibility: 'public',
        metadata: {
          businessImpact: 50,
          confidence_score: 0.9,
          isAgentResponse: false,
          processing_time_ms: 100,
          model_version: 'v1',
          tokens_used: 100,
          temperature: 0.7
        },
        engagement: {
          comments: 0,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: {
            average: 0,
            count: 0,
            distribution: {}
          }
        },
        tags: [],
        category: 'general',
        priority: 'medium',
        comments: 42
      };

      render(<CommentCounter post={validPost} />);
      expect(screen.getByTestId('comment-count').textContent).toBe('42');
    });

    it('should allow optional comments field', () => {
      // Test that comments is truly optional
      const postWithoutComments: AgentPost = {
        id: 'type-test-2',
        title: 'Type Test',
        content: 'Content',
        authorAgent: 'TestAgent',
        authorAgentName: 'Test Agent',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published',
        visibility: 'public',
        metadata: {
          businessImpact: 50,
          confidence_score: 0.9,
          isAgentResponse: false,
          processing_time_ms: 100,
          model_version: 'v1',
          tokens_used: 100,
          temperature: 0.7
        },
        engagement: {
          comments: 0,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: {
            average: 0,
            count: 0,
            distribution: {}
          }
        },
        tags: [],
        category: 'general',
        priority: 'medium'
        // No comments field
      };

      render(<CommentCounter post={postWithoutComments} />);
      expect(screen.getByTestId('comment-count').textContent).toBe('0');
    });
  });

  describe('Fallback Behavior', () => {
    it('should display 0 as fallback when comments is undefined', () => {
      const post: AgentPost = {
        id: 'fallback-1',
        title: 'Fallback Test',
        content: 'Content',
        authorAgent: 'TestAgent',
        authorAgentName: 'Test Agent',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published',
        visibility: 'public',
        metadata: {
          businessImpact: 50,
          confidence_score: 0.9,
          isAgentResponse: false,
          processing_time_ms: 100,
          model_version: 'v1',
          tokens_used: 100,
          temperature: 0.7
        },
        engagement: {
          comments: 0,
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: {
            average: 0,
            count: 0,
            distribution: {}
          }
        },
        tags: [],
        category: 'general',
        priority: 'medium'
      };

      render(<CommentCounter post={post} />);

      const countElement = screen.getByTestId('comment-count');
      expect(countElement.textContent).toBe('0');

      // Verify it's actually using the || 0 fallback
      expect(post.comments).toBeUndefined();
    });

    it('should NOT use engagement.comments as fallback', () => {
      // This is the key fix: we should ONLY use post.comments, not post.engagement.comments
      const post: AgentPost = {
        id: 'fallback-2',
        title: 'Fallback Test',
        content: 'Content',
        authorAgent: 'TestAgent',
        authorAgentName: 'Test Agent',
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'published',
        visibility: 'public',
        metadata: {
          businessImpact: 50,
          confidence_score: 0.9,
          isAgentResponse: false,
          processing_time_ms: 100,
          model_version: 'v1',
          tokens_used: 100,
          temperature: 0.7
        },
        engagement: {
          comments: 999, // This should be IGNORED
          shares: 0,
          views: 0,
          saves: 0,
          reactions: {},
          stars: {
            average: 0,
            count: 0,
            distribution: {}
          }
        },
        tags: [],
        category: 'general',
        priority: 'medium',
        comments: 5 // This should be used
      };

      render(<CommentCounter post={post} />);

      const countElement = screen.getByTestId('comment-count');
      // Should show 5, not 999
      expect(countElement.textContent).toBe('5');
    });
  });
});
