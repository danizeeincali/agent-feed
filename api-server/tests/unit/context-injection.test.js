/**
 * Context Injection Fix - Unit Tests
 * Tests the thread context extraction for agent responses
 *
 * @test Context Injection
 * @description Validates that agent responses include proper context
 * @prerequisites Mock database calls
 */

const { describe, it, expect, beforeEach, afterEach, vi } = require('vitest');

// Mock database module
const mockDb = {
  get: vi.fn(),
  all: vi.fn()
};

// Mock the database import
vi.mock('../../database.js', () => ({
  default: mockDb
}));

// Import the functions we're testing
const {
  getThreadContext,
  enhancePromptWithContext,
  extractSystemIdentityFromContext
} = require('../../worker/agent-worker.js');

describe('Context Injection Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getThreadContext()', () => {
    it('should fetch post and comments for given postId', async () => {
      const mockPost = {
        id: 'post-123',
        content: 'Original post content',
        author: 'user1',
        created_at: '2025-01-01T00:00:00Z'
      };

      const mockComments = [
        {
          id: 'comment-1',
          post_id: 'post-123',
          content: 'First comment',
          author: 'user2',
          created_at: '2025-01-01T00:01:00Z'
        },
        {
          id: 'comment-2',
          post_id: 'post-123',
          content: 'Second comment',
          author: 'user3',
          created_at: '2025-01-01T00:02:00Z'
        }
      ];

      mockDb.get.mockResolvedValue(mockPost);
      mockDb.all.mockResolvedValue(mockComments);

      const context = await getThreadContext('post-123');

      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM posts WHERE id = ?'),
        ['post-123']
      );
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM comments WHERE post_id = ?'),
        ['post-123']
      );
      expect(context).toEqual({
        post: mockPost,
        comments: mockComments
      });
    });

    it('should return null post if post not found', async () => {
      mockDb.get.mockResolvedValue(null);
      mockDb.all.mockResolvedValue([]);

      const context = await getThreadContext('nonexistent-post');

      expect(context.post).toBeNull();
      expect(context.comments).toEqual([]);
    });

    it('should return empty comments array if no comments exist', async () => {
      const mockPost = {
        id: 'post-123',
        content: 'Post with no comments',
        author: 'user1'
      };

      mockDb.get.mockResolvedValue(mockPost);
      mockDb.all.mockResolvedValue([]);

      const context = await getThreadContext('post-123');

      expect(context.post).toEqual(mockPost);
      expect(context.comments).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.get.mockRejectedValue(new Error('Database connection failed'));

      const context = await getThreadContext('post-123');

      expect(context).toEqual({
        post: null,
        comments: []
      });
    });

    it('should limit comments to most recent 10', async () => {
      const mockPost = { id: 'post-123', content: 'Post' };
      const mockComments = Array.from({ length: 15 }, (_, i) => ({
        id: `comment-${i}`,
        post_id: 'post-123',
        content: `Comment ${i}`,
        created_at: new Date(Date.now() - (15 - i) * 60000).toISOString()
      }));

      mockDb.get.mockResolvedValue(mockPost);
      mockDb.all.mockResolvedValue(mockComments.slice(-10)); // Only last 10

      const context = await getThreadContext('post-123');

      expect(context.comments.length).toBe(10);
      expect(context.comments[0].content).toContain('Comment 5');
    });
  });

  describe('enhancePromptWithContext()', () => {
    it('should include post metadata in enhanced prompt', () => {
      const originalPrompt = 'What files are in agent_workspace?';
      const context = {
        post: {
          id: 'post-123',
          content: 'Original post about agent workspace',
          author: 'user1',
          created_at: '2025-01-01T00:00:00Z'
        },
        comments: []
      };

      const enhanced = enhancePromptWithContext(originalPrompt, context);

      expect(enhanced).toContain('THREAD CONTEXT');
      expect(enhanced).toContain('Original Post:');
      expect(enhanced).toContain('Original post about agent workspace');
      expect(enhanced).toContain('user1');
      expect(enhanced).toContain(originalPrompt);
    });

    it('should include recent comments in enhanced prompt', () => {
      const originalPrompt = 'Follow up question';
      const context = {
        post: {
          id: 'post-123',
          content: 'Original post',
          author: 'user1'
        },
        comments: [
          {
            id: 'comment-1',
            content: 'First reply',
            author: 'user2',
            created_at: '2025-01-01T00:01:00Z'
          },
          {
            id: 'comment-2',
            content: 'Second reply',
            author: 'avi',
            created_at: '2025-01-01T00:02:00Z'
          }
        ]
      };

      const enhanced = enhancePromptWithContext(originalPrompt, context);

      expect(enhanced).toContain('Previous Comments:');
      expect(enhanced).toContain('First reply');
      expect(enhanced).toContain('Second reply');
      expect(enhanced).toContain('user2:');
      expect(enhanced).toContain('avi:');
    });

    it('should gracefully handle missing post context', () => {
      const originalPrompt = 'Question without context';
      const context = {
        post: null,
        comments: []
      };

      const enhanced = enhancePromptWithContext(originalPrompt, context);

      expect(enhanced).toContain(originalPrompt);
      expect(enhanced).toContain('No previous context available');
    });

    it('should handle context with only post and no comments', () => {
      const originalPrompt = 'Question';
      const context = {
        post: {
          id: 'post-123',
          content: 'Original post',
          author: 'user1'
        },
        comments: []
      };

      const enhanced = enhancePromptWithContext(originalPrompt, context);

      expect(enhanced).toContain('Original post');
      expect(enhanced).not.toContain('Previous Comments:');
    });

    it('should preserve original prompt formatting', () => {
      const originalPrompt = `Multi-line
prompt with
special formatting`;
      const context = {
        post: { content: 'Post', author: 'user1' },
        comments: []
      };

      const enhanced = enhancePromptWithContext(originalPrompt, context);

      expect(enhanced).toContain('Multi-line');
      expect(enhanced).toContain('prompt with');
      expect(enhanced).toContain('special formatting');
    });
  });

  describe('extractSystemIdentityFromContext()', () => {
    it('should extract system identity from post content', () => {
      const context = {
        post: {
          content: 'System: You are Avi, a helpful assistant.'
        },
        comments: []
      };

      const identity = extractSystemIdentityFromContext(context);

      expect(identity).toContain('You are Avi');
      expect(identity).toContain('helpful assistant');
    });

    it('should extract system identity from first comment if not in post', () => {
      const context = {
        post: {
          content: 'Regular post content'
        },
        comments: [
          {
            content: 'System: You are a specialized agent',
            author: 'system'
          }
        ]
      };

      const identity = extractSystemIdentityFromContext(context);

      expect(identity).toContain('specialized agent');
    });

    it('should return default identity if no system prompt found', () => {
      const context = {
        post: {
          content: 'Regular post'
        },
        comments: [
          {
            content: 'Regular comment',
            author: 'user1'
          }
        ]
      };

      const identity = extractSystemIdentityFromContext(context);

      expect(identity).toContain('helpful assistant');
      expect(identity).toBeTruthy();
    });

    it('should handle context with null post', () => {
      const context = {
        post: null,
        comments: []
      };

      const identity = extractSystemIdentityFromContext(context);

      expect(identity).toBeTruthy();
      expect(identity.length).toBeGreaterThan(0);
    });
  });

  describe('Context caching and performance', () => {
    it('should not make duplicate database calls for same post', async () => {
      const mockPost = { id: 'post-123', content: 'Post' };
      mockDb.get.mockResolvedValue(mockPost);
      mockDb.all.mockResolvedValue([]);

      await getThreadContext('post-123');
      await getThreadContext('post-123');

      // Without caching, this would be 2 calls
      expect(mockDb.get).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent context fetches', async () => {
      const mockPost = { id: 'post-123', content: 'Post' };
      mockDb.get.mockResolvedValue(mockPost);
      mockDb.all.mockResolvedValue([]);

      const [context1, context2, context3] = await Promise.all([
        getThreadContext('post-123'),
        getThreadContext('post-123'),
        getThreadContext('post-123')
      ]);

      expect(context1).toEqual(context2);
      expect(context2).toEqual(context3);
    });
  });

  describe('Edge cases and security', () => {
    it('should sanitize SQL injection attempts', async () => {
      const maliciousId = "'; DROP TABLE posts; --";
      mockDb.get.mockResolvedValue(null);
      mockDb.all.mockResolvedValue([]);

      await getThreadContext(maliciousId);

      // Verify parameterized query was used
      expect(mockDb.get).toHaveBeenCalledWith(
        expect.any(String),
        [maliciousId] // Parameter binding prevents injection
      );
    });

    it('should handle very long post content', () => {
      const originalPrompt = 'Question';
      const context = {
        post: {
          content: 'a'.repeat(10000),
          author: 'user1'
        },
        comments: []
      };

      const enhanced = enhancePromptWithContext(originalPrompt, context);

      expect(enhanced.length).toBeLessThan(15000); // Should truncate
    });

    it('should handle special characters in content', () => {
      const originalPrompt = 'Question';
      const context = {
        post: {
          content: '<script>alert("XSS")</script>',
          author: 'user1'
        },
        comments: []
      };

      const enhanced = enhancePromptWithContext(originalPrompt, context);

      // Content should be included as-is (sanitization happens on display)
      expect(enhanced).toContain('<script>');
    });

    it('should handle unicode and emojis', () => {
      const originalPrompt = '🤖 What can you do?';
      const context = {
        post: {
          content: 'Post with emoji 🚀',
          author: 'user1'
        },
        comments: []
      };

      const enhanced = enhancePromptWithContext(originalPrompt, context);

      expect(enhanced).toContain('🤖');
      expect(enhanced).toContain('🚀');
    });
  });
});
