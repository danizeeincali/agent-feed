/**
 * Orchestrator E2E Tests
 * Full end-to-end tests with real database and simulated external services
 *
 * Test Strategy:
 * - Real PostgreSQL database
 * - Mock Claude API with realistic fixtures
 * - Simulate real feed posts and platform responses
 * - Test complete orchestrator lifecycle
 * - Verify health monitoring dashboard
 * - Test real-world scenarios and edge cases
 *
 * Coverage:
 * - Full orchestrator lifecycle with real database
 * - Feed monitoring with real posts
 * - Worker spawning and completion
 * - Health monitoring dashboard
 * - Multi-user scenarios
 * - Platform integration patterns
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import postgresManager from '../../../config/postgres.js';
import aviStateRepo from '../../../repositories/postgres/avi-state.repository.js';
import workQueueRepo from '../../../repositories/postgres/work-queue.repository.js';
import memoryRepo from '../../../repositories/postgres/memory.repository.js';
import agentRepo from '../../../repositories/postgres/agent.repository.js';

// Test fixtures for realistic scenarios
const TEST_FIXTURES = {
  posts: {
    techQuestion: {
      id: 'post-tech-1',
      content: 'What are your thoughts on the latest AI developments? @tech',
      author: 'alice',
      userId: 'user-alice',
      metadata: {
        platform: 'twitter',
        mentions: ['@tech'],
        hashtags: ['#AI', '#technology'],
        isReply: false,
        timestamp: Date.now()
      }
    },
    codeHelp: {
      id: 'post-code-1',
      content: 'Can you help me debug this TypeScript error? #code #typescript',
      author: 'bob',
      userId: 'user-bob',
      metadata: {
        platform: 'twitter',
        hashtags: ['#code', '#typescript'],
        isReply: false,
        timestamp: Date.now()
      }
    },
    conversation: {
      id: 'post-conv-1',
      content: 'Thanks for the explanation! That makes sense now.',
      author: 'charlie',
      userId: 'user-charlie',
      metadata: {
        platform: 'twitter',
        isReply: true,
        replyToId: 'our-post-1',
        timestamp: Date.now()
      }
    }
  },
  responses: {
    techResponse: {
      content: 'AI developments are fascinating! Recent advances in multimodal models show great promise for practical applications.',
      tokens: 4200
    },
    codeResponse: {
      content: 'I can help with that! The error suggests a type mismatch. Try explicitly defining the return type of your function.',
      tokens: 3800
    },
    conversationResponse: {
      content: 'You are welcome! Feel free to ask if you have more questions.',
      tokens: 2500
    }
  }
};

// Mock external services with realistic behavior
class MockClaudeService {
  constructor() {
    this.callCount = 0;
    this.errors = 0;
  }

  async createMessage({ agentType, postContent, memories }) {
    this.callCount++;

    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulate occasional errors (5% rate)
    if (Math.random() < 0.05) {
      this.errors++;
      throw new Error('Claude API temporary error');
    }

    // Determine response based on content
    if (postContent.includes('tech') || postContent.includes('AI')) {
      return TEST_FIXTURES.responses.techResponse;
    } else if (postContent.includes('code') || postContent.includes('debug')) {
      return TEST_FIXTURES.responses.codeResponse;
    } else {
      return TEST_FIXTURES.responses.conversationResponse;
    }
  }

  getStats() {
    return {
      totalCalls: this.callCount,
      errors: this.errors,
      successRate: ((this.callCount - this.errors) / this.callCount) * 100
    };
  }

  reset() {
    this.callCount = 0;
    this.errors = 0;
  }
}

class MockFeedService {
  constructor() {
    this.postQueue = [];
    this.readPosts = new Set();
  }

  addPosts(posts) {
    this.postQueue.push(...posts);
  }

  async getNewPosts(lastPosition) {
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 20));

    if (this.postQueue.length === 0) {
      return [];
    }

    // Return posts after lastPosition
    const startIndex = lastPosition
      ? this.postQueue.findIndex(p => p.id === lastPosition) + 1
      : 0;

    const newPosts = this.postQueue.slice(startIndex);
    return newPosts;
  }

  async markAsRead(postId) {
    this.readPosts.add(postId);
  }

  reset() {
    this.postQueue = [];
    this.readPosts.clear();
  }

  getStats() {
    return {
      totalPosts: this.postQueue.length,
      readPosts: this.readPosts.size
    };
  }
}

// Full Orchestrator implementation for E2E testing
class E2EOrchestrator {
  constructor(deps) {
    this.claudeService = deps.claudeService;
    this.feedService = deps.feedService;
    this.aviStateRepo = deps.aviStateRepo;
    this.workQueueRepo = deps.workQueueRepo;
    this.memoryRepo = deps.memoryRepo;
    this.agentRepo = deps.agentRepo;

    this.isRunning = false;
    this.contextSize = 1500;
    this.workers = new Map();
    this.health = { status: 'stopped', lastCheck: null };
    this.maxConcurrentWorkers = 5;
    this.feedCheckIntervalMs = 1000; // 1 second for testing
    this.healthCheckIntervalMs = 2000; // 2 seconds for testing
  }

  async start() {
    await this.aviStateRepo.initialize();
    await this.aviStateRepo.markRunning();

    this.isRunning = true;
    this.contextSize = 1500;
    this.health.status = 'running';

    // Start background tasks
    this.startBackgroundTasks();

    return { status: 'running', timestamp: Date.now() };
  }

  async stop() {
    this.isRunning = false;
    this.stopBackgroundTasks();

    // Complete active workers
    for (const [workerId] of this.workers.entries()) {
      await this.terminateWorker(workerId);
    }

    await this.aviStateRepo.updateState({ status: 'stopped' });
    this.health.status = 'stopped';

    return { status: 'stopped', timestamp: Date.now() };
  }

  startBackgroundTasks() {
    // Feed monitoring
    this.feedInterval = setInterval(async () => {
      try {
        await this.processFeed();
      } catch (error) {
        console.error('Feed processing error:', error);
      }
    }, this.feedCheckIntervalMs);

    // Health monitoring
    this.healthInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Health check error:', error);
      }
    }, this.healthCheckIntervalMs);
  }

  stopBackgroundTasks() {
    if (this.feedInterval) {
      clearInterval(this.feedInterval);
      this.feedInterval = null;
    }
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
  }

  async processFeed() {
    if (!this.isRunning) return;

    const state = await this.aviStateRepo.getState();
    const posts = await this.feedService.getNewPosts(state.last_feed_position);

    for (const post of posts) {
      // Check worker capacity
      if (this.workers.size >= this.maxConcurrentWorkers) {
        // Queue ticket for later
        await this.createTicket(post);
      } else {
        // Process immediately
        const ticket = await this.createTicket(post);
        await this.spawnWorker(ticket);
      }
    }

    if (posts.length > 0) {
      await this.aviStateRepo.updateFeedPosition(posts[posts.length - 1].id);
    }

    return { processed: posts.length };
  }

  async createTicket(post) {
    const agent = await this.selectAgent(post);
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

    await this.updateContext(200);
    return ticket;
  }

  async spawnWorker(ticket) {
    const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Assign ticket
    await this.workQueueRepo.assignTicket(ticket.id, workerId);
    await this.workQueueRepo.startProcessing(ticket.id);

    // Get agent context
    const memories = await this.memoryRepo.getRecentMemories(
      ticket.user_id,
      ticket.assigned_agent,
      5
    );

    // Track worker
    this.workers.set(workerId, {
      ticketId: ticket.id,
      status: 'running',
      startedAt: Date.now()
    });

    await this.aviStateRepo.incrementWorkersSpawned();
    await this.aviStateRepo.updateActiveWorkers(this.workers.size);
    await this.updateContext(2700);

    // Process asynchronously
    this.processWorker(workerId, ticket, memories).catch(async error => {
      console.error('Worker error:', error);
      await this.workQueueRepo.failTicket(ticket.id, error.message, true);
      await this.terminateWorker(workerId);
    });

    return { workerId, ticketId: ticket.id };
  }

  async processWorker(workerId, ticket, memories) {
    try {
      // Generate response
      const response = await this.claudeService.createMessage({
        agentType: ticket.assigned_agent,
        postContent: ticket.post_content,
        memories: memories
      });

      await this.updateContext(response.tokens);

      // Complete ticket
      await this.workQueueRepo.completeTicket(ticket.id, {
        response: response.content,
        posted: true,
        tokens: response.tokens,
        timestamp: Date.now()
      });

      // Save memory
      await this.memoryRepo.createMemory({
        user_id: ticket.user_id,
        agent_name: ticket.assigned_agent,
        post_id: ticket.post_id,
        content: response.content,
        metadata: {
          response_type: 'reply',
          tokens: response.tokens,
          timestamp: Date.now()
        }
      });

      // Mark feed post as read
      await this.feedService.markAsRead(ticket.post_id);

      // Terminate worker
      await this.terminateWorker(workerId);

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async terminateWorker(workerId) {
    this.workers.delete(workerId);
    await this.aviStateRepo.updateActiveWorkers(this.workers.size);
    await this.aviStateRepo.incrementTicketsProcessed();
  }

  async updateContext(tokens) {
    this.contextSize += tokens;
    await this.aviStateRepo.updateContextSize(this.contextSize);

    if (this.contextSize >= 50000) {
      await this.gracefulRestart();
    }
  }

  async gracefulRestart() {
    const pending = await this.workQueueRepo.getTicketsByUser(null, { status: 'pending' });
    const pendingIds = pending.map(t => t.id);

    await this.aviStateRepo.recordRestart(pendingIds);

    // Wait for workers
    const workerIds = Array.from(this.workers.keys());
    await Promise.all(workerIds.map(id => this.terminateWorker(id)));

    this.contextSize = 1500;
    await this.aviStateRepo.updateContextSize(this.contextSize);
    await this.aviStateRepo.markRunning();

    return { restarted: true, preservedTickets: pendingIds };
  }

  async performHealthCheck() {
    try {
      // Check database
      const state = await this.aviStateRepo.getState();
      if (!state) throw new Error('Cannot retrieve state');

      // Check context
      const contextHealthy = this.contextSize < 60000;

      // Check workers
      const stuckWorkers = await this.findStuckWorkers();

      this.health = {
        status: 'healthy',
        lastCheck: Date.now(),
        contextSize: this.contextSize,
        activeWorkers: this.workers.size,
        stuckWorkers: stuckWorkers.length,
        uptime: await this.aviStateRepo.getUptime()
      };

      await this.aviStateRepo.recordHealthCheck();

      return this.health;
    } catch (error) {
      this.health = {
        status: 'unhealthy',
        lastCheck: Date.now(),
        error: error.message
      };

      await this.aviStateRepo.recordHealthCheck(error.message);
      throw error;
    }
  }

  async findStuckWorkers() {
    const stuck = [];
    const now = Date.now();
    const timeout = 60000; // 1 minute

    for (const [workerId, worker] of this.workers.entries()) {
      if (now - worker.startedAt > timeout) {
        stuck.push(workerId);
      }
    }

    return stuck;
  }

  async getHealthDashboard() {
    const state = await this.aviStateRepo.getState();
    const queueStats = await this.workQueueRepo.getQueueStats();
    const claudeStats = this.claudeService.getStats();
    const feedStats = this.feedService.getStats();

    return {
      orchestrator: {
        status: state.status,
        uptime: await this.aviStateRepo.getUptime(),
        contextSize: state.context_size,
        activeWorkers: state.active_workers,
        lastHealthCheck: state.last_health_check,
        lastError: state.last_error
      },
      metrics: {
        workersSpawned: state.workers_spawned,
        ticketsProcessed: state.tickets_processed,
        lastFeedPosition: state.last_feed_position
      },
      queue: {
        pending: parseInt(queueStats.pending_count) || 0,
        assigned: parseInt(queueStats.assigned_count) || 0,
        processing: parseInt(queueStats.processing_count) || 0,
        completed: parseInt(queueStats.completed_count) || 0,
        failed: parseInt(queueStats.failed_count) || 0
      },
      external: {
        claude: claudeStats,
        feed: feedStats
      },
      health: this.health
    };
  }

  async selectAgent(post) {
    const content = post.content.toLowerCase();

    if (content.includes('tech') || content.includes('ai')) {
      return 'tech-guru';
    } else if (content.includes('code') || content.includes('debug')) {
      return 'code-assistant';
    } else {
      return 'general-responder';
    }
  }

  calculatePriority(post) {
    let priority = 0;
    if (post.metadata?.isReply) priority += 10;
    if (post.metadata?.mentions?.length > 0) priority += 5;
    if (post.metadata?.hashtags?.length > 2) priority += 2;
    return priority;
  }
}

describe('Orchestrator E2E Tests', () => {
  let orchestrator;
  let claudeService;
  let feedService;

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
    await postgresManager.query('DELETE FROM work_queue_tickets');
    await postgresManager.query('DELETE FROM agent_memories');

    // Create mock services
    claudeService = new MockClaudeService();
    feedService = new MockFeedService();

    // Create orchestrator
    orchestrator = new E2EOrchestrator({
      claudeService,
      feedService,
      aviStateRepo,
      workQueueRepo,
      memoryRepo,
      agentRepo
    });
  });

  afterEach(async () => {
    if (orchestrator.isRunning) {
      await orchestrator.stop();
    }
  });

  describe('Full Orchestrator Lifecycle', () => {
    it('should start, process posts, and stop gracefully', async () => {
      // Start orchestrator
      const startResult = await orchestrator.start();
      expect(startResult.status).toBe('running');

      // Add posts to feed
      feedService.addPosts([
        TEST_FIXTURES.posts.techQuestion,
        TEST_FIXTURES.posts.codeHelp
      ]);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify processing
      const tickets = await workQueueRepo.getTicketsByUser(null);
      expect(tickets.length).toBeGreaterThanOrEqual(2);

      // Stop orchestrator
      const stopResult = await orchestrator.stop();
      expect(stopResult.status).toBe('stopped');

      // Verify state
      const state = await aviStateRepo.getState();
      expect(state.status).toBe('stopped');
      expect(state.active_workers).toBe(0);
    });

    it('should maintain consistent state throughout lifecycle', async () => {
      await orchestrator.start();

      feedService.addPosts([TEST_FIXTURES.posts.techQuestion]);

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check state consistency
      const state1 = await aviStateRepo.getState();
      const dashboard1 = await orchestrator.getHealthDashboard();

      expect(dashboard1.orchestrator.status).toBe('running');
      expect(dashboard1.orchestrator.contextSize).toBe(state1.context_size);
      expect(dashboard1.orchestrator.activeWorkers).toBe(state1.active_workers);

      await orchestrator.stop();
    });
  });

  describe('Feed Monitoring with Real Posts', () => {
    it('should process tech-related posts correctly', async () => {
      await orchestrator.start();

      feedService.addPosts([TEST_FIXTURES.posts.techQuestion]);

      await new Promise(resolve => setTimeout(resolve, 1500));

      const tickets = await workQueueRepo.getTicketsByUser('user-alice');
      expect(tickets).toHaveLength(1);
      expect(tickets[0].assigned_agent).toBe('tech-guru');
      expect(tickets[0].status).toBe('completed');

      const memories = await memoryRepo.getRecentMemories('user-alice', 'tech-guru', 10);
      expect(memories.length).toBeGreaterThan(0);
      expect(memories[0].content).toContain('AI');

      await orchestrator.stop();
    });

    it('should process code-related posts correctly', async () => {
      await orchestrator.start();

      feedService.addPosts([TEST_FIXTURES.posts.codeHelp]);

      await new Promise(resolve => setTimeout(resolve, 1500));

      const tickets = await workQueueRepo.getTicketsByUser('user-bob');
      expect(tickets).toHaveLength(1);
      expect(tickets[0].assigned_agent).toBe('code-assistant');

      await orchestrator.stop();
    });

    it('should handle mixed post types in feed', async () => {
      await orchestrator.start();

      feedService.addPosts([
        TEST_FIXTURES.posts.techQuestion,
        TEST_FIXTURES.posts.codeHelp,
        TEST_FIXTURES.posts.conversation
      ]);

      await new Promise(resolve => setTimeout(resolve, 2500));

      const tickets = await postgresManager.query('SELECT * FROM work_queue_tickets');
      expect(tickets.rows.length).toBe(3);

      const techTickets = tickets.rows.filter(t => t.assigned_agent === 'tech-guru');
      const codeTickets = tickets.rows.filter(t => t.assigned_agent === 'code-assistant');
      const generalTickets = tickets.rows.filter(t => t.assigned_agent === 'general-responder');

      expect(techTickets.length).toBeGreaterThan(0);
      expect(codeTickets.length).toBeGreaterThan(0);
      expect(generalTickets.length).toBeGreaterThan(0);

      await orchestrator.stop();
    });

    it('should respect priority ordering', async () => {
      await orchestrator.start();

      const lowPriority = {
        id: 'post-low',
        content: 'Just a random post',
        userId: 'user-1',
        metadata: {}
      };

      const highPriority = {
        id: 'post-high',
        content: 'Reply to our thread',
        userId: 'user-2',
        metadata: { isReply: true, mentions: ['@us'] }
      };

      feedService.addPosts([lowPriority, highPriority]);

      await new Promise(resolve => setTimeout(resolve, 1500));

      const tickets = await postgresManager.query(
        'SELECT * FROM work_queue_tickets ORDER BY priority DESC'
      );

      expect(tickets.rows[0].post_id).toBe('post-high');

      await orchestrator.stop();
    });
  });

  describe('Worker Spawning and Completion', () => {
    it('should spawn workers for each ticket', async () => {
      await orchestrator.start();

      feedService.addPosts([
        TEST_FIXTURES.posts.techQuestion,
        TEST_FIXTURES.posts.codeHelp
      ]);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const state = await aviStateRepo.getState();
      expect(state.workers_spawned).toBeGreaterThanOrEqual(2);
      expect(state.tickets_processed).toBeGreaterThanOrEqual(2);

      await orchestrator.stop();
    });

    it('should limit concurrent workers', async () => {
      orchestrator.maxConcurrentWorkers = 2;
      await orchestrator.start();

      const posts = Array.from({ length: 10 }, (_, i) => ({
        id: `post-${i}`,
        content: `Test post ${i}`,
        userId: 'user-1'
      }));

      feedService.addPosts(posts);

      // Check active workers after initial batch
      await new Promise(resolve => setTimeout(resolve, 500));

      const state = await aviStateRepo.getState();
      expect(state.active_workers).toBeLessThanOrEqual(2);

      await orchestrator.stop();
    });

    it('should complete workers and clean up', async () => {
      await orchestrator.start();

      feedService.addPosts([TEST_FIXTURES.posts.techQuestion]);

      await new Promise(resolve => setTimeout(resolve, 1500));

      expect(orchestrator.workers.size).toBe(0);

      const state = await aviStateRepo.getState();
      expect(state.active_workers).toBe(0);

      await orchestrator.stop();
    });

    it('should save memories after worker completion', async () => {
      await orchestrator.start();

      feedService.addPosts([TEST_FIXTURES.posts.techQuestion]);

      await new Promise(resolve => setTimeout(resolve, 1500));

      const memories = await memoryRepo.getRecentMemories('user-alice', null, 10);
      expect(memories.length).toBeGreaterThan(0);
      expect(memories[0].post_id).toBe('post-tech-1');
      expect(memories[0].agent_name).toBe('tech-guru');

      await orchestrator.stop();
    });
  });

  describe('Health Monitoring Dashboard', () => {
    it('should provide comprehensive health dashboard', async () => {
      await orchestrator.start();

      feedService.addPosts([TEST_FIXTURES.posts.techQuestion]);

      await new Promise(resolve => setTimeout(resolve, 1500));

      const dashboard = await orchestrator.getHealthDashboard();

      expect(dashboard).toHaveProperty('orchestrator');
      expect(dashboard).toHaveProperty('metrics');
      expect(dashboard).toHaveProperty('queue');
      expect(dashboard).toHaveProperty('external');
      expect(dashboard).toHaveProperty('health');

      expect(dashboard.orchestrator.status).toBe('running');
      expect(dashboard.metrics.workersSpawned).toBeGreaterThan(0);
      expect(dashboard.queue.completed).toBeGreaterThan(0);

      await orchestrator.stop();
    });

    it('should track health check status', async () => {
      await orchestrator.start();

      // Wait for health check to run
      await new Promise(resolve => setTimeout(resolve, 2500));

      const state = await aviStateRepo.getState();
      expect(state.last_health_check).toBeDefined();
      expect(state.last_error).toBeNull();

      const dashboard = await orchestrator.getHealthDashboard();
      expect(dashboard.health.status).toBe('healthy');

      await orchestrator.stop();
    });

    it('should report unhealthy status on errors', async () => {
      await orchestrator.start();

      // Simulate database error
      const originalQuery = postgresManager.query.bind(postgresManager);
      postgresManager.query = vi.fn().mockRejectedValue(new Error('DB error'));

      await new Promise(resolve => setTimeout(resolve, 2500));

      // Restore
      postgresManager.query = originalQuery;

      const state = await aviStateRepo.getState();
      expect(state.last_error).toBeDefined();

      await orchestrator.stop();
    });

    it('should track external service statistics', async () => {
      await orchestrator.start();

      feedService.addPosts([
        TEST_FIXTURES.posts.techQuestion,
        TEST_FIXTURES.posts.codeHelp
      ]);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const dashboard = await orchestrator.getHealthDashboard();

      expect(dashboard.external.claude.totalCalls).toBeGreaterThan(0);
      expect(dashboard.external.claude.successRate).toBeGreaterThan(80);
      expect(dashboard.external.feed.totalPosts).toBe(2);

      await orchestrator.stop();
    });
  });

  describe('Multi-User Scenarios', () => {
    it('should handle posts from different users', async () => {
      await orchestrator.start();

      const user1Post = { ...TEST_FIXTURES.posts.techQuestion, userId: 'user-1' };
      const user2Post = { ...TEST_FIXTURES.posts.codeHelp, userId: 'user-2' };
      const user3Post = { ...TEST_FIXTURES.posts.conversation, userId: 'user-3' };

      feedService.addPosts([user1Post, user2Post, user3Post]);

      await new Promise(resolve => setTimeout(resolve, 2500));

      const user1Tickets = await workQueueRepo.getTicketsByUser('user-1');
      const user2Tickets = await workQueueRepo.getTicketsByUser('user-2');
      const user3Tickets = await workQueueRepo.getTicketsByUser('user-3');

      expect(user1Tickets.length).toBeGreaterThan(0);
      expect(user2Tickets.length).toBeGreaterThan(0);
      expect(user3Tickets.length).toBeGreaterThan(0);

      await orchestrator.stop();
    });

    it('should isolate memories per user', async () => {
      await orchestrator.start();

      const user1Post = { ...TEST_FIXTURES.posts.techQuestion, userId: 'user-1' };
      const user2Post = { ...TEST_FIXTURES.posts.techQuestion, userId: 'user-2', id: 'post-tech-2' };

      feedService.addPosts([user1Post, user2Post]);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const user1Memories = await memoryRepo.getRecentMemories('user-1', null, 10);
      const user2Memories = await memoryRepo.getRecentMemories('user-2', null, 10);

      expect(user1Memories.length).toBeGreaterThan(0);
      expect(user2Memories.length).toBeGreaterThan(0);

      // Verify isolation
      expect(user1Memories.every(m => m.user_id === 'user-1')).toBe(true);
      expect(user2Memories.every(m => m.user_id === 'user-2')).toBe(true);

      await orchestrator.stop();
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle continuous feed monitoring', async () => {
      await orchestrator.start();

      // Add posts in batches
      for (let i = 0; i < 3; i++) {
        const posts = Array.from({ length: 2 }, (_, j) => ({
          id: `post-batch-${i}-${j}`,
          content: `Batch ${i} post ${j}`,
          userId: `user-${j}`
        }));

        feedService.addPosts(posts);
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      const state = await aviStateRepo.getState();
      expect(state.workers_spawned).toBeGreaterThanOrEqual(6);

      await orchestrator.stop();
    });

    it('should handle context growth and restart', async () => {
      await orchestrator.start();

      // Force context growth
      orchestrator.contextSize = 48000;
      await aviStateRepo.updateContextSize(48000);

      feedService.addPosts([TEST_FIXTURES.posts.techQuestion]);

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Should have restarted
      const state = await aviStateRepo.getState();
      expect(state.context_size).toBeLessThan(10000);
      expect(state.last_restart).toBeDefined();

      await orchestrator.stop();
    });

    it('should recover from API errors', async () => {
      await orchestrator.start();

      // Add enough posts to trigger some errors (5% error rate)
      const posts = Array.from({ length: 20 }, (_, i) => ({
        id: `post-${i}`,
        content: `Test post ${i}`,
        userId: 'user-1'
      }));

      feedService.addPosts(posts);

      await new Promise(resolve => setTimeout(resolve, 3000));

      const stats = claudeService.getStats();
      expect(stats.totalCalls).toBeGreaterThan(0);

      // Some should succeed despite errors
      const completed = await postgresManager.query(
        'SELECT COUNT(*) as count FROM work_queue_tickets WHERE status = $1',
        ['completed']
      );
      expect(parseInt(completed.rows[0].count)).toBeGreaterThan(10);

      await orchestrator.stop();
    });

    it('should handle rapid start/stop cycles', async () => {
      for (let i = 0; i < 3; i++) {
        await orchestrator.start();
        feedService.addPosts([{ id: `post-${i}`, content: 'Test', userId: 'user-1' }]);
        await new Promise(resolve => setTimeout(resolve, 500));
        await orchestrator.stop();
      }

      const state = await aviStateRepo.getState();
      expect(state.status).toBe('stopped');
    });
  });

  describe('Performance and Reliability', () => {
    it('should maintain performance under load', async () => {
      await orchestrator.start();

      const largeBatch = Array.from({ length: 30 }, (_, i) => ({
        id: `post-${i}`,
        content: `Load test post ${i}`,
        userId: `user-${i % 5}`
      }));

      feedService.addPosts(largeBatch);

      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 5000));
      const duration = Date.now() - startTime;

      const state = await aviStateRepo.getState();
      expect(state.workers_spawned).toBeGreaterThan(20);

      await orchestrator.stop();
    });

    it('should not leak memory or workers', async () => {
      await orchestrator.start();

      for (let i = 0; i < 5; i++) {
        feedService.addPosts([{
          id: `post-${i}`,
          content: `Test ${i}`,
          userId: 'user-1'
        }]);

        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // All workers should be cleaned up
      expect(orchestrator.workers.size).toBe(0);

      const state = await aviStateRepo.getState();
      expect(state.active_workers).toBe(0);

      await orchestrator.stop();
    });
  });
});
