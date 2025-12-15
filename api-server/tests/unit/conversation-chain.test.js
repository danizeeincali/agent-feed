import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentWorker } from '../../worker/agent-worker.js';

describe('Conversation Chain Context Extraction', () => {
  let worker;
  let mockDatabase;

  beforeEach(() => {
    // Create mock database
    mockDatabase = {
      get: vi.fn(),
      all: vi.fn()
    };

    worker = new AgentWorker('test-agent', '/tmp/test');
    // Mock the database getter
    vi.spyOn(worker, 'db', 'get').mockReturnValue(mockDatabase);
  });

  describe('Parent Chain Walking', () => {
    it('should walk up parent_id chain chronologically', async () => {
      // Mock database with threaded comments
      const mockComments = {
        'comment-3': {
          id: 'comment-3',
          content: 'divide by 2',
          parent_id: 'comment-2',
          created_at: '2025-01-03T10:00:00Z'
        },
        'comment-2': {
          id: 'comment-2',
          content: '5047',
          parent_id: 'comment-1',
          created_at: '2025-01-02T10:00:00Z'
        },
        'comment-1': {
          id: 'comment-1',
          content: '4949 + 98',
          parent_id: null,
          created_at: '2025-01-01T10:00:00Z'
        }
      };

      mockDatabase.get.mockImplementation((query, params, callback) => {
        const commentId = params[0];
        callback(null, mockComments[commentId]);
      });

      const chain = await worker.getConversationChain('comment-3');

      expect(chain).toHaveLength(3);
      expect(chain[0].content).toBe('4949 + 98');  // Oldest first
      expect(chain[1].content).toBe('5047');
      expect(chain[2].content).toBe('divide by 2'); // Newest last
    });

    it('should handle single comment with no parent', async () => {
      mockDatabase.get.mockImplementation((query, params, callback) => {
        callback(null, {
          id: 'comment-1',
          content: 'First comment',
          parent_id: null
        });
      });

      const chain = await worker.getConversationChain('comment-1');

      expect(chain).toHaveLength(1);
      expect(chain[0].content).toBe('First comment');
    });

    it('should stop at max depth to prevent infinite loops', async () => {
      // Mock circular reference
      mockDatabase.get.mockImplementation((query, params, callback) => {
        callback(null, {
          id: 'comment-loop',
          content: 'test',
          parent_id: 'comment-loop' // Points to itself
        });
      });

      const chain = await worker.getConversationChain('comment-loop', 5);

      expect(chain.length).toBeLessThanOrEqual(5);
    });

    it('should handle missing parent gracefully', async () => {
      mockDatabase.get.mockImplementation((query, params, callback) => {
        if (params[0] === 'comment-2') {
          callback(null, {
            id: 'comment-2',
            content: 'Child comment',
            parent_id: 'comment-1'
          });
        } else {
          // Parent not found
          callback(null, null);
        }
      });

      const chain = await worker.getConversationChain('comment-2');

      // Should only include the child comment
      expect(chain).toHaveLength(1);
      expect(chain[0].content).toBe('Child comment');
    });
  });

  describe('Prompt Enhancement with Conversation Context', () => {
    it('should include conversation chain in prompt for comment replies', async () => {
      const ticket = {
        id: 'ticket-1',
        post_id: 'comment-123',
        metadata: { type: 'comment', content: 'latest reply' },
        agent_id: 'avi'
      };

      const mockChain = [
        { id: 'comment-1', content: 'What is 4949 + 98?', author: 'user1' },
        { id: 'comment-2', content: 'The answer is 5047', author: 'avi' },
        { id: 'comment-3', content: 'Now divide by 2', author: 'user1' }
      ];

      vi.spyOn(worker, 'getConversationChain').mockResolvedValue(mockChain);
      vi.spyOn(worker, 'getSystemIdentity').mockResolvedValue('You are Avi, a helpful assistant.');

      const prompt = await worker.buildEnhancedPrompt(ticket);

      expect(prompt).toContain('CONVERSATION THREAD');
      expect(prompt).toContain('What is 4949 + 98?');
      expect(prompt).toContain('The answer is 5047');
      expect(prompt).toContain('Now divide by 2');
      expect(prompt).toContain('Reference previous messages');
    });

    it('should format conversation thread chronologically', async () => {
      const ticket = {
        id: 'ticket-1',
        post_id: 'comment-456',
        metadata: { type: 'comment' },
        agent_id: 'avi'
      };

      const mockChain = [
        { id: 'c1', content: 'First', author: 'user1', created_at: '2025-01-01T10:00:00Z' },
        { id: 'c2', content: 'Second', author: 'avi', created_at: '2025-01-01T11:00:00Z' },
        { id: 'c3', content: 'Third', author: 'user1', created_at: '2025-01-01T12:00:00Z' }
      ];

      vi.spyOn(worker, 'getConversationChain').mockResolvedValue(mockChain);
      vi.spyOn(worker, 'getSystemIdentity').mockResolvedValue('You are Avi.');

      const prompt = await worker.buildEnhancedPrompt(ticket);

      // Check that messages appear in order
      const firstIndex = prompt.indexOf('First');
      const secondIndex = prompt.indexOf('Second');
      const thirdIndex = prompt.indexOf('Third');

      expect(firstIndex).toBeLessThan(secondIndex);
      expect(secondIndex).toBeLessThan(thirdIndex);
    });

    it('should not include conversation context for top-level posts', async () => {
      const ticket = {
        id: 'ticket-1',
        post_id: 'post-789',
        metadata: { type: 'post', content: 'Original post' },
        agent_id: 'avi'
      };

      vi.spyOn(worker, 'getConversationChain').mockResolvedValue([]);
      vi.spyOn(worker, 'getSystemIdentity').mockResolvedValue('You are Avi.');

      const prompt = await worker.buildEnhancedPrompt(ticket);

      expect(prompt).not.toContain('CONVERSATION THREAD');
      expect(prompt).toContain('Original post');
    });

    it('should handle long conversation threads with truncation', async () => {
      const ticket = {
        id: 'ticket-1',
        post_id: 'comment-999',
        metadata: { type: 'comment' },
        agent_id: 'avi'
      };

      // Create 20 message thread
      const longChain = Array.from({ length: 20 }, (_, i) => ({
        id: `comment-${i}`,
        content: `Message ${i}`,
        author: i % 2 === 0 ? 'user1' : 'avi'
      }));

      vi.spyOn(worker, 'getConversationChain').mockResolvedValue(longChain);
      vi.spyOn(worker, 'getSystemIdentity').mockResolvedValue('You are Avi.');

      const prompt = await worker.buildEnhancedPrompt(ticket);

      // Should include conversation context but might truncate
      expect(prompt).toContain('CONVERSATION THREAD');

      // Should have reasonable length (not exponentially long)
      expect(prompt.length).toBeLessThan(50000);
    });
  });

  describe('Context Extraction for Different Scenarios', () => {
    it('should extract context from math calculation thread', async () => {
      const mockChain = [
        { id: 'c1', content: 'Calculate 4949 + 98', author: 'user1' },
        { id: 'c2', content: '5047', author: 'avi' },
        { id: 'c3', content: 'divide this by 2', author: 'user1' }
      ];

      vi.spyOn(worker, 'getConversationChain').mockResolvedValue(mockChain);

      const ticket = {
        post_id: 'c3',
        metadata: { type: 'comment' },
        agent_id: 'avi'
      };

      vi.spyOn(worker, 'getSystemIdentity').mockResolvedValue('You are Avi.');
      const prompt = await worker.buildEnhancedPrompt(ticket);

      // Agent should see full context
      expect(prompt).toContain('4949 + 98');
      expect(prompt).toContain('5047');
      expect(prompt).toContain('divide this by 2');
    });

    it('should preserve author attribution in context', async () => {
      const mockChain = [
        { id: 'c1', content: 'Question', author: 'alice' },
        { id: 'c2', content: 'Answer', author: 'avi' },
        { id: 'c3', content: 'Follow-up', author: 'bob' }
      ];

      vi.spyOn(worker, 'getConversationChain').mockResolvedValue(mockChain);

      const ticket = {
        post_id: 'c3',
        metadata: { type: 'comment' },
        agent_id: 'avi'
      };

      vi.spyOn(worker, 'getSystemIdentity').mockResolvedValue('You are Avi.');
      const prompt = await worker.buildEnhancedPrompt(ticket);

      // Should show who said what
      expect(prompt).toContain('alice');
      expect(prompt).toContain('bob');
      expect(prompt).toContain('avi');
    });

    it('should handle special characters in conversation content', async () => {
      const mockChain = [
        { id: 'c1', content: 'Test <script>alert("xss")</script>', author: 'user1' },
        { id: 'c2', content: 'Test "quotes" and \'apostrophes\'', author: 'user2' }
      ];

      vi.spyOn(worker, 'getConversationChain').mockResolvedValue(mockChain);

      const ticket = {
        post_id: 'c2',
        metadata: { type: 'comment' },
        agent_id: 'avi'
      };

      vi.spyOn(worker, 'getSystemIdentity').mockResolvedValue('You are Avi.');
      const prompt = await worker.buildEnhancedPrompt(ticket);

      // Should safely include special characters
      expect(prompt).toContain('script');
      expect(prompt).toContain('quotes');
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDatabase.get.mockImplementation((query, params, callback) => {
        callback(new Error('Database connection failed'), null);
      });

      const chain = await worker.getConversationChain('comment-1');

      // Should return empty chain on error, not crash
      expect(chain).toEqual([]);
    });

    it('should handle malformed comment data', async () => {
      mockDatabase.get.mockImplementation((query, params, callback) => {
        callback(null, {
          // Missing required fields
          id: 'comment-1'
          // No content or parent_id
        });
      });

      const chain = await worker.getConversationChain('comment-1');

      // Should handle gracefully
      expect(chain).toBeDefined();
      expect(Array.isArray(chain)).toBe(true);
    });
  });
});
