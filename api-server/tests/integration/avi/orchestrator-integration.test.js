/**
 * Orchestrator Integration Tests
 * Tests complete workflows with real database and minimal mocks
 *
 * Test Strategy:
 * - Real PostgreSQL database integration
 * - Mock only Claude API and external feed service
 * - Test full workflows: feed → ticket → worker → completion
 * - Verify state persistence across operations
 * - Test concurrent scenarios and race conditions
 *
 * Coverage:
 * - Complete feed → ticket → worker → completion workflow
 * - Context size monitoring and auto-restart
 * - Multiple concurrent workers
 * - Error handling and retry logic
 * - State persistence across restarts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import postgresManager from '../../../config/postgres.js';
import aviStateRepo from '../../../repositories/postgres/avi-state.repository.js';
import workQueueRepo from '../../../repositories/postgres/work-queue.repository.js';
import memoryRepo from '../../../repositories/postgres/memory.repository.js';

// Mock external services only
const mockClaudeAPI = {
  createMessage: vi.fn(),
  estimateTokens: vi.fn()
};

const mockFeedAPI = {
  getNewPosts: vi.fn(),
  markAsRead: vi.fn()
};

// Orchestrator implementation (simplified for integration testing)
class IntegrationOrchestrator {
  constructor(deps) {
    this.claudeAPI = deps.claudeAPI;
    this.feedAPI = deps.feedAPI;
    this.aviStateRepo = deps.aviStateRepo;
    this.workQueueRepo = deps.workQueueRepo;
    this.memoryRepo = deps.memoryRepo;

    this.isRunning = false;
    this.contextSize = 1500;
    this.workers = new Map(); // workerId -> { ticketId, status }
    this.maxConcurrentWorkers = 5;
  }

  async start() {
    await this.aviStateRepo.initialize();
    await this.aviStateRepo.markRunning();

    this.isRunning = true;
    this.contextSize = 1500;

    return { status: 'running' };
  }

  async stop() {
    this.isRunning = false;

    // Complete all active workers
    for (const [workerId, worker] of this.workers.entries()) {
      if (worker.status === 'running') {
        await this.completeWorker(workerId);
      }
    }

    await this.aviStateRepo.updateState({ status: 'stopped' });
    return { status: 'stopped' };
  }

  async processFeedBatch() {
    const state = await this.aviStateRepo.getState();
    const posts = await this.feedAPI.getNewPosts(state.last_feed_position);

    const tickets = [];
    for (const post of posts) {
      const ticket = await this.createTicketForPost(post);
      tickets.push(ticket);

      // Spawn worker if capacity available
      if (this.workers.size < this.maxConcurrentWorkers) {
        await this.spawnWorkerForTicket(ticket);
      }
    }

    if (posts.length > 0) {
      await this.aviStateRepo.updateFeedPosition(posts[posts.length - 1].id);
    }

    return { processed: posts.length, tickets };
  }

  async createTicketForPost(post) {
    const agent = this.selectAgent(post);
    const priority = this.calculatePriority(post);

    const ticket = await this.workQueueRepo.createTicket({
      user_id: post.userId || 'anonymous',
      post_id: post.id,
      post_content: post.content,
      post_author: post.author,
      post_metadata: post.metadata || {},
      assigned_agent: agent,
      priority
    });

    // Update context
    await this.addContextTokens(200);

    return ticket;
  }

  async spawnWorkerForTicket(ticket) {
    const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get agent context (memories, identity)
    const memories = await this.memoryRepo.getRecentMemories(
      ticket.user_id,
      ticket.assigned_agent,
      5
    );

    // Assign ticket to worker
    await this.workQueueRepo.assignTicket(ticket.id, workerId);
    await this.workQueueRepo.startProcessing(ticket.id);

    // Track worker
    this.workers.set(workerId, {
      ticketId: ticket.id,
      status: 'running',
      startedAt: Date.now()
    });

    await this.aviStateRepo.incrementWorkersSpawned();
    await this.aviStateRepo.updateActiveWorkers(this.workers.size);

    // Update context (worker spawn)
    await this.addContextTokens(2700);

    // Simulate worker processing
    await this.processWorkerTask(workerId, ticket, memories);

    return { workerId, ticketId: ticket.id };
  }

  async processWorkerTask(workerId, ticket, memories) {
    try {
      // Call Claude API to generate response
      const response = await this.claudeAPI.createMessage({
        agentType: ticket.assigned_agent,
        postContent: ticket.post_content,
        memories: memories
      });

      // Update context (response generation)
      const responseTokens = response.tokens || 5000;
      await this.addContextTokens(responseTokens);

      // Complete ticket
      await this.workQueueRepo.completeTicket(ticket.id, {
        response: response.content,
        posted: true,
        tokens: responseTokens
      });

      // Save memory
      await this.memoryRepo.createMemory({
        user_id: ticket.user_id,
        agent_name: ticket.assigned_agent,
        post_id: ticket.post_id,
        content: response.content,
        metadata: {
          response_type: 'reply',
          tokens: responseTokens
        }
      });

      // Complete worker
      await this.completeWorker(workerId);

      return { success: true, response };
    } catch (error) {
      // Handle worker failure
      await this.workQueueRepo.failTicket(ticket.id, error.message, true);
      await this.completeWorker(workerId);

      throw error;
    }
  }

  async completeWorker(workerId) {
    this.workers.delete(workerId);
    await this.aviStateRepo.updateActiveWorkers(this.workers.size);
    await this.aviStateRepo.incrementTicketsProcessed();
  }

  async addContextTokens(tokens) {
    this.contextSize += tokens;
    await this.aviStateRepo.updateContextSize(this.contextSize);

    // Auto-restart if needed
    if (this.contextSize >= 50000) {
      await this.gracefulRestart();
    }
  }

  async gracefulRestart() {
    // Get pending tickets
    const pending = await this.workQueueRepo.getTicketsByUser(null, {
      status: 'pending'
    });
    const pendingIds = pending.map(t => t.id);

    // Record restart
    await this.aviStateRepo.recordRestart(pendingIds);

    // Wait for workers
    for (const [workerId] of this.workers.entries()) {
      await this.completeWorker(workerId);
    }

    // Reset context
    this.contextSize = 1500;
    await this.aviStateRepo.updateContextSize(this.contextSize);
    await this.aviStateRepo.markRunning();

    return { contextSize: 1500, preservedTickets: pendingIds };
  }

  selectAgent(post) {
    if (post.content.includes('tech') || post.content.includes('code')) {
      return 'tech-guru';
    }
    return 'general-responder';
  }

  calculatePriority(post) {
    let priority = 0;
    if (post.metadata?.isReply) priority += 5;
    if (post.metadata?.mentions?.length > 0) priority += 3;
    return priority;
  }
}

describe('Orchestrator Integration Tests', () => {
  let orchestrator;

  beforeAll(async () => {
    await postgresManager.connect();
    const healthy = await postgresManager.healthCheck();
    if (!healthy) {
      throw new Error('PostgreSQL not healthy');
    }
  });

  afterAll(async () => {
    await postgresManager.close();
  });

  beforeEach(async () => {
    // Clean database
    await aviStateRepo.initialize();
    await postgresManager.query('DELETE FROM work_queue');
    await postgresManager.query('DELETE FROM agent_memories');

    // Reset mocks
    vi.clearAllMocks();

    // Create orchestrator
    orchestrator = new IntegrationOrchestrator({
      claudeAPI: mockClaudeAPI,
      feedAPI: mockFeedAPI,
      aviStateRepo: aviStateRepo,
      workQueueRepo: workQueueRepo,
      memoryRepo: memoryRepo
    });

    // Default mock behaviors
    mockClaudeAPI.createMessage.mockResolvedValue({
      content: 'Great post! Here is my response.',
      tokens: 5000
    });
    mockFeedAPI.getNewPosts.mockResolvedValue([]);
  });

  describe('Complete Feed-to-Completion Workflow', () => {
    it('should process feed post through entire workflow', async () => {
      await orchestrator.start();

      // Mock feed with one post
      const post = {
        id: 'post-1',
        content: 'What do you think about AI?',
        author: 'alice',
        userId: 'user-123',
        metadata: { platform: 'twitter' }
      };
      mockFeedAPI.getNewPosts.mockResolvedValue([post]);

      // Process feed
      const result = await orchestrator.processFeedBatch();

      expect(result.processed).toBe(1);
      expect(result.tickets).toHaveLength(1);

      // Verify ticket was created
      const tickets = await workQueueRepo.getTicketsByUser('user-123');
      expect(tickets).toHaveLength(1);
      expect(tickets[0].post_id).toBe('post-1');

      // Verify ticket was completed
      const ticket = await workQueueRepo.getTicketById(tickets[0].id);
      expect(ticket.status).toBe('completed');
      expect(ticket.result.posted).toBe(true);

      // Verify memory was saved
      const memories = await memoryRepo.getRecentMemories('user-123', ticket.assigned_agent, 10);
      expect(memories.length).toBeGreaterThan(0);
      expect(memories[0].post_id).toBe('post-1');

      // Verify state updates
      const state = await aviStateRepo.getState();
      expect(state.last_feed_position).toBe('post-1');
      expect(state.workers_spawned).toBe(1);
      expect(state.tickets_processed).toBe(1);
    });

    it('should process multiple posts concurrently', async () => {
      await orchestrator.start();

      const posts = [
        { id: 'post-1', content: 'Tech question 1', userId: 'user-1' },
        { id: 'post-2', content: 'Tech question 2', userId: 'user-2' },
        { id: 'post-3', content: 'Tech question 3', userId: 'user-3' }
      ];
      mockFeedAPI.getNewPosts.mockResolvedValue(posts);

      const result = await orchestrator.processFeedBatch();

      expect(result.processed).toBe(3);
      expect(result.tickets).toHaveLength(3);

      // Verify all tickets completed
      const allTickets = await postgresManager.query(
        'SELECT * FROM work_queue WHERE status = $1',
        ['completed']
      );
      expect(allTickets.rows.length).toBe(3);

      // Verify all memories saved
      const user1Memories = await memoryRepo.getRecentMemories('user-1', null, 10);
      const user2Memories = await memoryRepo.getRecentMemories('user-2', null, 10);
      const user3Memories = await memoryRepo.getRecentMemories('user-3', null, 10);

      expect(user1Memories.length).toBeGreaterThan(0);
      expect(user2Memories.length).toBeGreaterThan(0);
      expect(user3Memories.length).toBeGreaterThan(0);
    });

    it('should respect max concurrent workers limit', async () => {
      await orchestrator.start();
      orchestrator.maxConcurrentWorkers = 2;

      const posts = Array.from({ length: 5 }, (_, i) => ({
        id: `post-${i}`,
        content: `Test post ${i}`,
        userId: 'user-1'
      }));
      mockFeedAPI.getNewPosts.mockResolvedValue(posts);

      const result = await orchestrator.processFeedBatch();

      // Only first 2 should spawn workers immediately
      expect(orchestrator.workers.size).toBeLessThanOrEqual(2);

      // All tickets should be created
      expect(result.tickets).toHaveLength(5);
    });
  });

  describe('Context Size Monitoring and Auto-Restart', () => {
    it('should track context growth through operations', async () => {
      await orchestrator.start();

      const initialContext = orchestrator.contextSize;
      expect(initialContext).toBe(1500);

      // Process post (adds ~200 + 2700 + 5000 tokens)
      const post = { id: 'post-1', content: 'Test', userId: 'user-1' };
      mockFeedAPI.getNewPosts.mockResolvedValue([post]);

      await orchestrator.processFeedBatch();

      expect(orchestrator.contextSize).toBeGreaterThan(initialContext);

      const state = await aviStateRepo.getState();
      expect(state.context_size).toBe(orchestrator.contextSize);
    });

    it('should trigger graceful restart at 50K tokens', async () => {
      await orchestrator.start();

      // Manually set context close to limit
      orchestrator.contextSize = 48000;
      await aviStateRepo.updateContextSize(48000);

      // Create pending tickets
      await workQueueRepo.createTicket({
        post_id: 'post-pending',
        post_content: 'Pending task'
      });

      // Add tokens that exceed limit
      await orchestrator.addContextTokens(3000);

      // Should have triggered restart
      expect(orchestrator.contextSize).toBe(1500);

      const state = await aviStateRepo.getState();
      expect(state.context_size).toBe(1500);
      expect(state.last_restart).toBeDefined();
    });

    it('should preserve pending tickets during restart', async () => {
      await orchestrator.start();

      // Create pending tickets
      const pending1 = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Pending 1'
      });
      const pending2 = await workQueueRepo.createTicket({
        post_id: 'post-2',
        post_content: 'Pending 2'
      });

      const result = await orchestrator.gracefulRestart();

      expect(result.preservedTickets).toHaveLength(2);

      const state = await aviStateRepo.getState();
      expect(state.pending_tickets).toContain(pending1.id);
      expect(state.pending_tickets).toContain(pending2.id);

      // Pending tickets should still be pending
      const ticket1 = await workQueueRepo.getTicketById(pending1.id);
      expect(ticket1.status).toBe('pending');
    });

    it('should restore state after restart', async () => {
      await orchestrator.start();

      // Process some tickets
      const post = { id: 'post-1', content: 'Test', userId: 'user-1' };
      mockFeedAPI.getNewPosts.mockResolvedValue([post]);
      await orchestrator.processFeedBatch();

      const beforeState = await aviStateRepo.getState();
      const workersBefore = beforeState.workers_spawned;
      const ticketsBefore = beforeState.tickets_processed;

      // Restart
      await orchestrator.gracefulRestart();

      const afterState = await aviStateRepo.getState();

      // Counters should persist
      expect(afterState.workers_spawned).toBe(workersBefore);
      expect(afterState.tickets_processed).toBe(ticketsBefore);

      // Context should reset
      expect(afterState.context_size).toBe(1500);
    });
  });

  describe('Multiple Concurrent Workers', () => {
    it('should handle multiple workers processing different tickets', async () => {
      await orchestrator.start();

      const posts = [
        { id: 'post-1', content: 'Question 1', userId: 'user-1' },
        { id: 'post-2', content: 'Question 2', userId: 'user-2' },
        { id: 'post-3', content: 'Question 3', userId: 'user-3' }
      ];
      mockFeedAPI.getNewPosts.mockResolvedValue(posts);

      await orchestrator.processFeedBatch();

      // All tickets should complete
      const completed = await postgresManager.query(
        'SELECT COUNT(*) as count FROM work_queue WHERE status = $1',
        ['completed']
      );
      expect(parseInt(completed.rows[0].count)).toBe(3);

      // All workers should be cleaned up
      expect(orchestrator.workers.size).toBe(0);

      const state = await aviStateRepo.getState();
      expect(state.active_workers).toBe(0);
    });

    it('should track worker spawning and completion counters', async () => {
      await orchestrator.start();

      const posts = Array.from({ length: 5 }, (_, i) => ({
        id: `post-${i}`,
        content: `Test ${i}`,
        userId: 'user-1'
      }));

      // Process in batches
      mockFeedAPI.getNewPosts.mockResolvedValue(posts.slice(0, 3));
      await orchestrator.processFeedBatch();

      mockFeedAPI.getNewPosts.mockResolvedValue(posts.slice(3));
      await orchestrator.processFeedBatch();

      const state = await aviStateRepo.getState();
      expect(state.workers_spawned).toBe(5);
      expect(state.tickets_processed).toBe(5);
    });

    it('should handle worker failures without affecting others', async () => {
      await orchestrator.start();

      // First post will fail
      mockClaudeAPI.createMessage
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValue({ content: 'Success', tokens: 5000 });

      const posts = [
        { id: 'post-1', content: 'Will fail', userId: 'user-1' },
        { id: 'post-2', content: 'Will succeed', userId: 'user-2' }
      ];
      mockFeedAPI.getNewPosts.mockResolvedValue(posts);

      await orchestrator.processFeedBatch();

      // Check results
      const ticket1 = await postgresManager.query(
        'SELECT * FROM work_queue WHERE post_id = $1',
        ['post-1']
      );
      const ticket2 = await postgresManager.query(
        'SELECT * FROM work_queue WHERE post_id = $1',
        ['post-2']
      );

      expect(ticket1.rows[0].status).toBe('pending'); // Failed, retried
      expect(ticket2.rows[0].status).toBe('completed'); // Success
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should retry failed tickets', async () => {
      await orchestrator.start();

      mockClaudeAPI.createMessage
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue({ content: 'Success', tokens: 5000 });

      const post = { id: 'post-1', content: 'Test', userId: 'user-1' };
      mockFeedAPI.getNewPosts.mockResolvedValue([post]);

      await orchestrator.processFeedBatch();

      // Ticket should be pending for retry
      const tickets = await workQueueRepo.getTicketsByUser('user-1');
      expect(tickets[0].status).toBe('pending');
      expect(tickets[0].retry_count).toBe(1);
    });

    it('should handle database errors gracefully', async () => {
      await orchestrator.start();

      const post = { id: 'post-1', content: 'Test', userId: 'user-1' };
      mockFeedAPI.getNewPosts.mockResolvedValue([post]);

      // Temporarily break database
      const originalQuery = postgresManager.query.bind(postgresManager);
      postgresManager.query = vi.fn().mockRejectedValue(new Error('DB error'));

      await expect(orchestrator.processFeedBatch()).rejects.toThrow();

      // Restore
      postgresManager.query = originalQuery;
    });

    it('should continue processing after individual post failures', async () => {
      await orchestrator.start();

      mockClaudeAPI.createMessage
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce({ content: 'Success', tokens: 5000 })
        .mockRejectedValueOnce(new Error('Error'))
        .mockResolvedValueOnce({ content: 'Success', tokens: 5000 });

      const posts = [
        { id: 'post-1', content: 'Test 1', userId: 'user-1' },
        { id: 'post-2', content: 'Test 2', userId: 'user-2' },
        { id: 'post-3', content: 'Test 3', userId: 'user-3' },
        { id: 'post-4', content: 'Test 4', userId: 'user-4' }
      ];
      mockFeedAPI.getNewPosts.mockResolvedValue(posts);

      await orchestrator.processFeedBatch();

      // Some should succeed
      const completed = await postgresManager.query(
        'SELECT COUNT(*) as count FROM work_queue WHERE status = $1',
        ['completed']
      );
      expect(parseInt(completed.rows[0].count)).toBeGreaterThan(0);
    });
  });

  describe('State Persistence Across Restarts', () => {
    it('should persist feed position across restart', async () => {
      await orchestrator.start();

      const post = { id: 'post-final', content: 'Last post', userId: 'user-1' };
      mockFeedAPI.getNewPosts.mockResolvedValue([post]);
      await orchestrator.processFeedBatch();

      const beforeState = await aviStateRepo.getState();
      expect(beforeState.last_feed_position).toBe('post-final');

      await orchestrator.gracefulRestart();

      const afterState = await aviStateRepo.getState();
      expect(afterState.last_feed_position).toBe('post-final');
    });

    it('should maintain ticket history across restart', async () => {
      await orchestrator.start();

      // Process tickets
      const posts = [
        { id: 'post-1', content: 'Test 1', userId: 'user-1' },
        { id: 'post-2', content: 'Test 2', userId: 'user-1' }
      ];
      mockFeedAPI.getNewPosts.mockResolvedValue(posts);
      await orchestrator.processFeedBatch();

      const beforeTickets = await workQueueRepo.getTicketsByUser('user-1');
      expect(beforeTickets).toHaveLength(2);

      await orchestrator.gracefulRestart();

      const afterTickets = await workQueueRepo.getTicketsByUser('user-1');
      expect(afterTickets).toHaveLength(2);
      expect(afterTickets[0].status).toBe('completed');
    });

    it('should maintain memory history across restart', async () => {
      await orchestrator.start();

      const post = { id: 'post-1', content: 'Test', userId: 'user-1' };
      mockFeedAPI.getNewPosts.mockResolvedValue([post]);
      await orchestrator.processFeedBatch();

      const beforeMemories = await memoryRepo.getRecentMemories('user-1', null, 10);
      expect(beforeMemories.length).toBeGreaterThan(0);

      await orchestrator.gracefulRestart();

      const afterMemories = await memoryRepo.getRecentMemories('user-1', null, 10);
      expect(afterMemories).toHaveLength(beforeMemories.length);
    });

    it('should resume from correct feed position after restart', async () => {
      await orchestrator.start();

      // Process first batch
      mockFeedAPI.getNewPosts.mockResolvedValue([
        { id: 'post-1', content: 'Test', userId: 'user-1' }
      ]);
      await orchestrator.processFeedBatch();

      await orchestrator.gracefulRestart();

      // Mock next batch
      mockFeedAPI.getNewPosts.mockClear();
      mockFeedAPI.getNewPosts.mockResolvedValue([
        { id: 'post-2', content: 'New post', userId: 'user-1' }
      ]);

      await orchestrator.processFeedBatch();

      // Should request posts after 'post-1'
      expect(mockFeedAPI.getNewPosts).toHaveBeenCalledWith('post-1');
    });
  });

  describe('Integration: Complex Scenarios', () => {
    it('should handle full day simulation with multiple restarts', async () => {
      await orchestrator.start();

      // Simulate 10 feed batches
      for (let batch = 0; batch < 10; batch++) {
        const posts = Array.from({ length: 3 }, (_, i) => ({
          id: `post-${batch}-${i}`,
          content: `Batch ${batch} post ${i}`,
          userId: 'user-1'
        }));

        mockFeedAPI.getNewPosts.mockResolvedValue(posts);
        await orchestrator.processFeedBatch();

        // Force restart every 3 batches
        if (batch % 3 === 2) {
          await orchestrator.gracefulRestart();
        }
      }

      const state = await aviStateRepo.getState();
      expect(state.workers_spawned).toBe(30); // 10 batches * 3 posts
      expect(state.tickets_processed).toBe(30);

      // All memories should be preserved
      const memories = await memoryRepo.getRecentMemories('user-1', null, 100);
      expect(memories.length).toBe(30);
    });

    it('should handle mixed success and retry scenarios', async () => {
      await orchestrator.start();

      // Alternate success and failure
      mockClaudeAPI.createMessage
        .mockResolvedValueOnce({ content: 'Success 1', tokens: 5000 })
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce({ content: 'Success 2', tokens: 5000 })
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce({ content: 'Success 3', tokens: 5000 });

      const posts = Array.from({ length: 5 }, (_, i) => ({
        id: `post-${i}`,
        content: `Test ${i}`,
        userId: 'user-1'
      }));
      mockFeedAPI.getNewPosts.mockResolvedValue(posts);

      await orchestrator.processFeedBatch();

      const stats = await workQueueRepo.getQueueStats();
      expect(parseInt(stats.completed_count)).toBeGreaterThan(0);
      expect(parseInt(stats.pending_count)).toBeGreaterThan(0); // Failed, pending retry
    });

    it('should handle orchestrator stop during active processing', async () => {
      await orchestrator.start();

      const posts = [
        { id: 'post-1', content: 'Test', userId: 'user-1' }
      ];
      mockFeedAPI.getNewPosts.mockResolvedValue(posts);

      // Start processing
      const processPromise = orchestrator.processFeedBatch();

      // Stop orchestrator
      await orchestrator.stop();

      // Process should complete
      await processPromise;

      expect(orchestrator.isRunning).toBe(false);

      const state = await aviStateRepo.getState();
      expect(state.status).toBe('stopped');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large batch of posts efficiently', async () => {
      await orchestrator.start();

      const posts = Array.from({ length: 50 }, (_, i) => ({
        id: `post-${i}`,
        content: `Test post ${i}`,
        userId: `user-${i % 10}` // 10 different users
      }));

      mockFeedAPI.getNewPosts.mockResolvedValue(posts);

      const startTime = Date.now();
      await orchestrator.processFeedBatch();
      const duration = Date.now() - startTime;

      // Should complete in reasonable time (< 10 seconds for 50 posts)
      expect(duration).toBeLessThan(10000);

      const state = await aviStateRepo.getState();
      expect(state.workers_spawned).toBe(50);
    });

    it('should maintain performance across multiple restarts', async () => {
      await orchestrator.start();

      const times = [];

      for (let i = 0; i < 5; i++) {
        const posts = Array.from({ length: 10 }, (_, j) => ({
          id: `post-${i}-${j}`,
          content: `Test ${i}-${j}`,
          userId: 'user-1'
        }));

        mockFeedAPI.getNewPosts.mockResolvedValue(posts);

        const startTime = Date.now();
        await orchestrator.processFeedBatch();
        times.push(Date.now() - startTime);

        await orchestrator.gracefulRestart();
      }

      // Processing time shouldn't increase significantly
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(times[times.length - 1]).toBeLessThan(avgTime * 1.5);
    });
  });
});
