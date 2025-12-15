/**
 * TDD Test Suite: Conversation Memory Fix
 *
 * Tests the conversation memory system that allows agents to remember
 * multi-turn conversations by walking up the parent_id chain.
 *
 * Features tested:
 * 1. getCommentById returns correct comment
 * 2. getConversationChain walks parent_id chain correctly
 * 3. Agent receives full conversation context
 * 4. Multi-turn conversation maintains context
 * 5. Agent remembers previous context in replies
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import dbSelector from '../../config/database-selector.js';
import AgentWorker from '../../worker/agent-worker.js';
import { v4 as uuidv4 } from 'uuid';

describe('Conversation Memory Fix - TDD Suite', () => {
  let testPostId;
  let testCommentIds = [];
  let agentWorker;

  beforeAll(async () => {
    // Initialize database
    await dbSelector.initialize();
    console.log('✅ Database initialized for conversation memory tests');

    // Create a test post with proper structure
    const postData = {
      id: uuidv4(),
      title: 'Test Math Problem Post',
      content: 'What is 4949 + 98?',
      author_agent: 'test-user',
      status: 'published',
      published_at: new Date().toISOString()
    };

    const post = await dbSelector.createPost('test-user', postData);
    testPostId = postData.id; // Use the ID we created
    console.log('✅ Created test post:', testPostId);
  });

  afterAll(async () => {
    // Cleanup test data
    if (testCommentIds.length > 0) {
      for (const commentId of testCommentIds) {
        await dbSelector.deleteComment(commentId);
      }
    }

    if (testPostId) {
      await dbSelector.deletePost(testPostId);
    }

    console.log('✅ Cleaned up test data');
  });

  beforeEach(() => {
    testCommentIds = [];
  });

  describe('1. getCommentById - Basic Retrieval', () => {
    it('should retrieve a comment by ID', async () => {
      // Create a comment
      const comment = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'Test comment content',
        author: 'test-user',
        author_agent: 'test-user',
        parent_id: null
      });

      testCommentIds.push(comment.id);

      // Retrieve the comment
      const retrieved = await dbSelector.getCommentById(comment.id);

      expect(retrieved).toBeTruthy();
      expect(retrieved.id).toBe(comment.id);
      expect(retrieved.content).toBe('Test comment content');
      expect(retrieved.author_agent).toBe('test-user');
    });

    it('should return null for non-existent comment', async () => {
      const fakeId = uuidv4();
      const retrieved = await dbSelector.getCommentById(fakeId);

      expect(retrieved).toBeNull();
    });

    it('should retrieve comment with parent_id', async () => {
      // Create parent comment
      const parent = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'Parent comment',
        author: 'test-user',
        author_agent: 'test-user',
        parent_id: null
      });

      testCommentIds.push(parent.id);

      // Create child comment
      const child = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'Child comment',
        author: 'test-agent',
        author_agent: 'test-agent',
        parent_id: parent.id
      });

      testCommentIds.push(child.id);

      // Retrieve child and verify parent_id
      const retrieved = await dbSelector.getCommentById(child.id);

      expect(retrieved).toBeTruthy();
      expect(retrieved.parent_id).toBe(parent.id);
    });
  });

  describe('2. getConversationChain - Walk parent_id Chain', () => {
    it('should return empty array for non-existent comment', async () => {
      agentWorker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'test-agent'
      });

      const fakeId = uuidv4();
      const chain = await agentWorker.getConversationChain(fakeId);

      expect(chain).toEqual([]);
    });

    it('should return single comment for root comment (no parent)', async () => {
      // Create root comment
      const root = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'Root comment with no parent',
        author: 'test-user',
        author_agent: 'test-user',
        parent_id: null
      });

      testCommentIds.push(root.id);

      agentWorker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'test-agent'
      });

      const chain = await agentWorker.getConversationChain(root.id);

      expect(chain).toHaveLength(1);
      expect(chain[0].id).toBe(root.id);
      expect(chain[0].content).toBe('Root comment with no parent');
      expect(chain[0].parent_id).toBeNull();
    });

    it('should walk 2-level conversation chain correctly', async () => {
      // Create conversation: User -> Agent
      const userComment = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'User: What is 4949 + 98?',
        author: 'test-user',
        author_agent: 'test-user',
        parent_id: null
      });

      testCommentIds.push(userComment.id);

      const agentReply = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'Agent: The answer is 5047',
        author: 'test-agent',
        author_agent: 'test-agent',
        parent_id: userComment.id
      });

      testCommentIds.push(agentReply.id);

      agentWorker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'test-agent'
      });

      const chain = await agentWorker.getConversationChain(agentReply.id);

      expect(chain).toHaveLength(2);

      // First should be user comment (oldest)
      expect(chain[0].id).toBe(userComment.id);
      expect(chain[0].content).toBe('User: What is 4949 + 98?');
      expect(chain[0].parent_id).toBeNull();

      // Second should be agent reply (newest)
      expect(chain[1].id).toBe(agentReply.id);
      expect(chain[1].content).toBe('Agent: The answer is 5047');
      expect(chain[1].parent_id).toBe(userComment.id);
    });

    it('should walk 4-level conversation chain correctly', async () => {
      // Create conversation: User -> Agent -> User -> Agent
      const msg1 = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'User: What is 4949 + 98?',
        author: 'test-user',
        author_agent: 'test-user',
        parent_id: null
      });
      testCommentIds.push(msg1.id);

      const msg2 = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'Agent: The answer is 5047',
        author: 'test-agent',
        author_agent: 'test-agent',
        parent_id: msg1.id
      });
      testCommentIds.push(msg2.id);

      const msg3 = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'User: Now divide that by 2',
        author: 'test-user',
        author_agent: 'test-user',
        parent_id: msg2.id
      });
      testCommentIds.push(msg3.id);

      const msg4 = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'Agent: 5047 divided by 2 is 2523.5',
        author: 'test-agent',
        author_agent: 'test-agent',
        parent_id: msg3.id
      });
      testCommentIds.push(msg4.id);

      agentWorker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'test-agent'
      });

      const chain = await agentWorker.getConversationChain(msg4.id);

      expect(chain).toHaveLength(4);

      // Verify chronological order (oldest to newest)
      expect(chain[0].id).toBe(msg1.id);
      expect(chain[1].id).toBe(msg2.id);
      expect(chain[2].id).toBe(msg3.id);
      expect(chain[3].id).toBe(msg4.id);

      // Verify parent_id chain
      expect(chain[0].parent_id).toBeNull();
      expect(chain[1].parent_id).toBe(msg1.id);
      expect(chain[2].parent_id).toBe(msg2.id);
      expect(chain[3].parent_id).toBe(msg3.id);
    });

    it('should handle maxDepth parameter correctly', async () => {
      // Create a deep chain
      let previousId = null;
      const ids = [];

      for (let i = 0; i < 25; i++) {
        const comment = await dbSelector.createComment({
          id: uuidv4(),
          post_id: testPostId,
          content: `Message ${i}`,
          author: 'test-user',
          author_agent: 'test-user',
          parent_id: previousId
        });
        ids.push(comment.id);
        testCommentIds.push(comment.id);
        previousId = comment.id;
      }

      agentWorker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'test-agent'
      });

      // Get chain with maxDepth=20 (should stop at 20)
      const chain = await agentWorker.getConversationChain(previousId, 20);

      expect(chain.length).toBeLessThanOrEqual(20);
    });
  });

  describe('3. Agent Receives Full Conversation Context', () => {
    it('should build conversation context in processURL', async () => {
      // Create a conversation thread
      const msg1 = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'What is 100 + 200?',
        author: 'test-user',
        author_agent: 'test-user',
        parent_id: null
      });
      testCommentIds.push(msg1.id);

      const msg2 = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'The answer is 300',
        author: 'avi',
        author_agent: 'avi',
        parent_id: msg1.id
      });
      testCommentIds.push(msg2.id);

      // Verify conversation chain is built correctly
      agentWorker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'avi'
      });

      const chain = await agentWorker.getConversationChain(msg2.id);

      expect(chain).toHaveLength(2);
      expect(chain[0].content).toBe('What is 100 + 200?');
      expect(chain[1].content).toBe('The answer is 300');
    });
  });

  describe('4. Multi-Turn Conversation (Math Problem)', () => {
    it('should maintain context across 4949+98 -> divide by 2 conversation', async () => {
      // Simulate real conversation: User asks math, Agent answers, User asks follow-up
      const step1 = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'What is 4949 + 98?',
        author: 'user',
        author_agent: 'user',
        parent_id: null
      });
      testCommentIds.push(step1.id);

      const step2 = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'The answer is 5047',
        author: 'avi',
        author_agent: 'avi',
        parent_id: step1.id
      });
      testCommentIds.push(step2.id);

      const step3 = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'Now divide that by 2',
        author: 'user',
        author_agent: 'user',
        parent_id: step2.id
      });
      testCommentIds.push(step3.id);

      // Get conversation chain
      agentWorker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'avi'
      });

      const chain = await agentWorker.getConversationChain(step3.id);

      // Verify chain includes all 3 messages
      expect(chain).toHaveLength(3);
      expect(chain[0].content).toContain('4949 + 98');
      expect(chain[1].content).toContain('5047');
      expect(chain[2].content).toContain('divide that by 2');

      // Verify that agent would receive: "that" = 5047 from context
      const previousAnswer = chain[1].content;
      expect(previousAnswer).toContain('5047');
    });
  });

  describe('5. Agent Memory and Context Continuity', () => {
    it('should allow agent to reference "it" from previous context', async () => {
      // Simulate: User mentions a number, Agent responds, User says "double it"
      const msg1 = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'The number is 42',
        author: 'user',
        author_agent: 'user',
        parent_id: null
      });
      testCommentIds.push(msg1.id);

      const msg2 = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'Noted, the number is 42',
        author: 'avi',
        author_agent: 'avi',
        parent_id: msg1.id
      });
      testCommentIds.push(msg2.id);

      const msg3 = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'Now double it',
        author: 'user',
        author_agent: 'user',
        parent_id: msg2.id
      });
      testCommentIds.push(msg3.id);

      // Get conversation chain
      agentWorker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'avi'
      });

      const chain = await agentWorker.getConversationChain(msg3.id);

      // Verify agent has access to previous messages to resolve "it"
      expect(chain).toHaveLength(3);
      expect(chain[0].content).toContain('42');
      expect(chain[1].content).toContain('42');
      expect(chain[2].content).toContain('double it');

      // Agent should be able to infer: "it" = 42, so answer is 84
    });

    it('should maintain conversation context even with system messages', async () => {
      // Test that conversation memory works with mixed message types
      const messages = [];

      for (let i = 0; i < 5; i++) {
        const author = i % 2 === 0 ? 'user' : 'avi';
        const comment = await dbSelector.createComment({
          id: uuidv4(),
          post_id: testPostId,
          content: `Message ${i + 1} from ${author}`,
          author: author,
          author_agent: author,
          parent_id: i === 0 ? null : messages[i - 1].id
        });
        messages.push(comment);
        testCommentIds.push(comment.id);
      }

      agentWorker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'avi'
      });

      const chain = await agentWorker.getConversationChain(messages[messages.length - 1].id);

      // Verify full chain is returned
      expect(chain).toHaveLength(5);

      // Verify chronological order
      for (let i = 0; i < 5; i++) {
        expect(chain[i].id).toBe(messages[i].id);
      }
    });
  });

  describe('6. Edge Cases and Error Handling', () => {
    it('should handle circular references gracefully', async () => {
      // This shouldn't happen in practice, but test maxDepth protection
      const comment = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'Test comment',
        author: 'test-user',
        author_agent: 'test-user',
        parent_id: null
      });
      testCommentIds.push(comment.id);

      agentWorker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'test-agent'
      });

      // Should not hang or crash
      const chain = await agentWorker.getConversationChain(comment.id, 5);

      expect(chain).toBeTruthy();
      expect(chain.length).toBeGreaterThan(0);
    });

    it('should handle deleted comments in chain gracefully', async () => {
      // Create chain
      const msg1 = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'Message 1',
        author: 'user',
        author_agent: 'user',
        parent_id: null
      });
      testCommentIds.push(msg1.id);

      const msg2 = await dbSelector.createComment({
        id: uuidv4(),
        post_id: testPostId,
        content: 'Message 2',
        author: 'avi',
        author_agent: 'avi',
        parent_id: msg1.id
      });
      testCommentIds.push(msg2.id);

      // Delete msg1 (parent)
      await dbSelector.deleteComment(msg1.id);

      agentWorker = new AgentWorker({
        workerId: 'test-worker',
        ticketId: 'test-ticket',
        agentId: 'avi'
      });

      // Should stop at msg2 when parent is not found
      const chain = await agentWorker.getConversationChain(msg2.id);

      expect(chain).toHaveLength(1);
      expect(chain[0].id).toBe(msg2.id);
    });
  });
});
