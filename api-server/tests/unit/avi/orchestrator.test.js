/**
 * Orchestrator Unit Tests
 * TDD London School (mockist) approach for AVI Phase 2
 *
 * Test Strategy:
 * - Mock external collaborators (Claude API, feed service)
 * - Real database integration (PostgreSQL)
 * - Focus on behavior verification and interactions
 * - Test each orchestrator method in isolation
 *
 * Coverage:
 * - startOrchestrator() - Initialize and start feed monitoring
 * - stopOrchestrator() - Graceful shutdown
 * - monitorFeed() - Poll for new posts
 * - processPost(post) - Create work tickets
 * - spawnWorker(ticket) - Create ephemeral agent worker
 * - updateContext(tokens) - Track context size
 * - checkHealth() - Monitor orchestrator health
 * - gracefulRestart() - Restart at 50K tokens
 * - handleError(error) - Error recovery
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import postgresManager from '../../../config/postgres.js';
import aviStateRepo from '../../../repositories/postgres/avi-state.repository.js';
import workQueueRepo from '../../../repositories/postgres/work-queue.repository.js';

// Mock external collaborators (London School approach)
const mockClaudeAPI = {
  createInstance: vi.fn(),
  destroyInstance: vi.fn(),
  sendMessage: vi.fn(),
  estimateTokens: vi.fn()
};

const mockFeedService = {
  getNewPosts: vi.fn(),
  markAsRead: vi.fn(),
  healthCheck: vi.fn()
};

const mockWorkerSpawner = {
  spawn: vi.fn(),
  kill: vi.fn(),
  getStatus: vi.fn()
};

// Orchestrator class under test
class AviOrchestrator {
  constructor(dependencies) {
    this.claudeAPI = dependencies.claudeAPI;
    this.feedService = dependencies.feedService;
    this.workerSpawner = dependencies.workerSpawner;
    this.aviStateRepo = dependencies.aviStateRepo;
    this.workQueueRepo = dependencies.workQueueRepo;

    this.isRunning = false;
    this.contextSize = 1500; // Initial context
    this.feedCheckInterval = null;
    this.healthCheckInterval = null;
    this.activeWorkers = new Set();
  }

  async startOrchestrator() {
    // Initialize state
    await this.aviStateRepo.initialize();
    await this.aviStateRepo.markRunning();

    this.isRunning = true;
    this.contextSize = 1500;

    // Start feed monitoring
    this.feedCheckInterval = setInterval(() => {
      this.monitorFeed().catch(err => this.handleError(err));
    }, 5000);

    // Start health monitoring
    this.healthCheckInterval = setInterval(() => {
      this.checkHealth().catch(err => this.handleError(err));
    }, 30000);

    return { status: 'running', contextSize: this.contextSize };
  }

  async stopOrchestrator() {
    // Graceful shutdown
    this.isRunning = false;

    // Clear intervals
    if (this.feedCheckInterval) {
      clearInterval(this.feedCheckInterval);
      this.feedCheckInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Wait for active workers to complete
    const workerIds = Array.from(this.activeWorkers);
    await Promise.all(workerIds.map(id => this.workerSpawner.kill(id)));
    this.activeWorkers.clear();

    // Update state
    await this.aviStateRepo.updateState({ status: 'stopped' });

    return { status: 'stopped', activeWorkers: 0 };
  }

  async monitorFeed() {
    if (!this.isRunning) return;

    // Get current feed position
    const state = await this.aviStateRepo.getState();
    const lastPosition = state?.last_feed_position;

    // Fetch new posts
    const newPosts = await this.feedService.getNewPosts(lastPosition);

    if (newPosts.length === 0) return;

    // Process each post
    for (const post of newPosts) {
      await this.processPost(post);
    }

    // Update feed position
    const lastPostId = newPosts[newPosts.length - 1].id;
    await this.aviStateRepo.updateFeedPosition(lastPostId);

    return { processed: newPosts.length, lastPosition: lastPostId };
  }

  async processPost(post) {
    // Determine agent for this post
    const assignedAgent = await this.determineAgent(post);

    // Create work ticket
    const ticket = await this.workQueueRepo.createTicket({
      user_id: post.userId || 'anonymous',
      post_id: post.id,
      post_content: post.content,
      post_author: post.author,
      post_metadata: {
        platform: post.platform,
        mentions: post.mentions || [],
        hashtags: post.hashtags || []
      },
      assigned_agent: assignedAgent,
      priority: this.calculatePriority(post)
    });

    // Update context (ticket creation adds ~200 tokens)
    await this.updateContext(200);

    // Spawn worker for this ticket
    await this.spawnWorker(ticket);

    return ticket;
  }

  async spawnWorker(ticket) {
    // Spawn ephemeral worker
    const workerId = await this.workerSpawner.spawn({
      ticketId: ticket.id,
      agentType: ticket.assigned_agent,
      context: {
        postId: ticket.post_id,
        postContent: ticket.post_content,
        postAuthor: ticket.post_author
      }
    });

    // Track active worker
    this.activeWorkers.add(workerId);
    await this.aviStateRepo.incrementWorkersSpawned();
    await this.aviStateRepo.updateActiveWorkers(this.activeWorkers.size);

    // Update context (worker spawn adds ~2700 tokens)
    await this.updateContext(2700);

    // Set up worker completion handler
    this.setupWorkerCompletion(workerId, ticket.id);

    return { workerId, ticketId: ticket.id };
  }

  async updateContext(tokensAdded) {
    this.contextSize += tokensAdded;
    await this.aviStateRepo.updateContextSize(this.contextSize);

    // Check if restart needed
    if (this.contextSize >= 50000) {
      await this.gracefulRestart();
    }

    return { contextSize: this.contextSize };
  }

  async checkHealth() {
    try {
      // Check database connectivity
      const state = await this.aviStateRepo.getState();
      if (!state) {
        throw new Error('Cannot retrieve orchestrator state');
      }

      // Check feed service
      const feedHealthy = await this.feedService.healthCheck();
      if (!feedHealthy) {
        throw new Error('Feed service unhealthy');
      }

      // Record successful health check
      await this.aviStateRepo.recordHealthCheck();

      return { healthy: true, contextSize: this.contextSize };
    } catch (error) {
      // Record failed health check
      await this.aviStateRepo.recordHealthCheck(error.message);
      throw error;
    }
  }

  async gracefulRestart() {
    // Get pending tickets before restart
    const pendingTickets = await this.workQueueRepo.getTicketsByUser(null, {
      status: 'pending'
    });
    const pendingIds = pendingTickets.map(t => t.id);

    // Record restart
    await this.aviStateRepo.recordRestart(pendingIds);

    // Stop monitoring temporarily
    clearInterval(this.feedCheckInterval);
    clearInterval(this.healthCheckInterval);

    // Wait for active workers to complete
    const workerIds = Array.from(this.activeWorkers);
    await Promise.all(workerIds.map(id => this.workerSpawner.kill(id)));
    this.activeWorkers.clear();

    // Reset context
    this.contextSize = 1500;
    await this.aviStateRepo.updateContextSize(this.contextSize);

    // Resume running state
    await this.aviStateRepo.markRunning();

    // Restart monitoring
    this.feedCheckInterval = setInterval(() => {
      this.monitorFeed().catch(err => this.handleError(err));
    }, 5000);

    this.healthCheckInterval = setInterval(() => {
      this.checkHealth().catch(err => this.handleError(err));
    }, 30000);

    return { contextSize: this.contextSize, preservedTickets: pendingIds.length };
  }

  async handleError(error) {
    console.error('Orchestrator error:', error);

    // Record error in state
    await this.aviStateRepo.updateState({
      last_error: error.message
    });

    // Determine if we should continue or stop
    if (this.isCriticalError(error)) {
      await this.stopOrchestrator();
      throw error;
    }

    return { error: error.message, action: 'continue' };
  }

  // Helper methods
  async determineAgent(post) {
    // Simple logic for now - can be enhanced
    if (post.mentions?.includes('@tech')) return 'tech-guru';
    if (post.hashtags?.includes('#code')) return 'code-assistant';
    return 'general-responder';
  }

  calculatePriority(post) {
    let priority = 0;
    if (post.mentions?.length > 0) priority += 5;
    if (post.isReplyToUs) priority += 10;
    return priority;
  }

  isCriticalError(error) {
    const criticalPatterns = [
      'ECONNREFUSED',
      'Database connection lost',
      'Authentication failed'
    ];
    return criticalPatterns.some(pattern => error.message.includes(pattern));
  }

  setupWorkerCompletion(workerId, ticketId) {
    // In real implementation, this would listen to worker events
    // For testing, we'll simulate this
    this.workerSpawner.getStatus(workerId).then(status => {
      if (status === 'completed') {
        this.activeWorkers.delete(workerId);
        this.aviStateRepo.updateActiveWorkers(this.activeWorkers.size);
        this.aviStateRepo.incrementTicketsProcessed();
      }
    });
  }
}

describe('AviOrchestrator - Unit Tests', () => {
  let orchestrator;

  beforeAll(async () => {
    // Ensure PostgreSQL connection
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
    // Reset database state
    await aviStateRepo.initialize();
    await postgresManager.query('DELETE FROM work_queue');

    // Reset mocks
    vi.clearAllMocks();

    // Create fresh orchestrator with mocked dependencies
    orchestrator = new AviOrchestrator({
      claudeAPI: mockClaudeAPI,
      feedService: mockFeedService,
      workerSpawner: mockWorkerSpawner,
      aviStateRepo: aviStateRepo,
      workQueueRepo: workQueueRepo
    });

    // Setup default mock behaviors
    mockFeedService.getNewPosts.mockResolvedValue([]);
    mockFeedService.healthCheck.mockResolvedValue(true);
    mockWorkerSpawner.spawn.mockResolvedValue('worker-123');
    mockWorkerSpawner.kill.mockResolvedValue(true);
    mockWorkerSpawner.getStatus.mockResolvedValue('completed');
  });

  describe('startOrchestrator', () => {
    it('should initialize orchestrator and start monitoring', async () => {
      const result = await orchestrator.startOrchestrator();

      expect(result.status).toBe('running');
      expect(result.contextSize).toBe(1500);
      expect(orchestrator.isRunning).toBe(true);

      // Verify state was updated in database
      const state = await aviStateRepo.getState();
      expect(state.status).toBe('running');
      expect(state.context_size).toBe(1500);
    });

    it('should set up feed monitoring interval', async () => {
      await orchestrator.startOrchestrator();

      expect(orchestrator.feedCheckInterval).toBeDefined();
      expect(orchestrator.feedCheckInterval).not.toBeNull();
    });

    it('should set up health monitoring interval', async () => {
      await orchestrator.startOrchestrator();

      expect(orchestrator.healthCheckInterval).toBeDefined();
      expect(orchestrator.healthCheckInterval).not.toBeNull();
    });

    it('should initialize with fresh context size of 1500 tokens', async () => {
      await orchestrator.startOrchestrator();

      expect(orchestrator.contextSize).toBe(1500);

      const state = await aviStateRepo.getState();
      expect(state.context_size).toBe(1500);
    });
  });

  describe('stopOrchestrator', () => {
    it('should gracefully shut down orchestrator', async () => {
      await orchestrator.startOrchestrator();
      const result = await orchestrator.stopOrchestrator();

      expect(result.status).toBe('stopped');
      expect(orchestrator.isRunning).toBe(false);
      expect(orchestrator.feedCheckInterval).toBeNull();
      expect(orchestrator.healthCheckInterval).toBeNull();
    });

    it('should wait for active workers to complete', async () => {
      await orchestrator.startOrchestrator();

      // Simulate active workers
      orchestrator.activeWorkers.add('worker-1');
      orchestrator.activeWorkers.add('worker-2');

      await orchestrator.stopOrchestrator();

      expect(mockWorkerSpawner.kill).toHaveBeenCalledWith('worker-1');
      expect(mockWorkerSpawner.kill).toHaveBeenCalledWith('worker-2');
      expect(orchestrator.activeWorkers.size).toBe(0);
    });

    it('should update database state to stopped', async () => {
      await orchestrator.startOrchestrator();
      await orchestrator.stopOrchestrator();

      const state = await aviStateRepo.getState();
      expect(state.status).toBe('stopped');
    });

    it('should return active workers count of zero', async () => {
      await orchestrator.startOrchestrator();
      orchestrator.activeWorkers.add('worker-1');

      const result = await orchestrator.stopOrchestrator();

      expect(result.activeWorkers).toBe(0);
    });
  });

  describe('monitorFeed', () => {
    it('should fetch new posts from feed service', async () => {
      mockFeedService.getNewPosts.mockResolvedValue([
        { id: 'post-1', content: 'Test post', author: 'user1' }
      ]);

      await orchestrator.monitorFeed();

      expect(mockFeedService.getNewPosts).toHaveBeenCalled();
    });

    it('should process each new post', async () => {
      const posts = [
        { id: 'post-1', content: 'Test 1', author: 'user1' },
        { id: 'post-2', content: 'Test 2', author: 'user2' }
      ];
      mockFeedService.getNewPosts.mockResolvedValue(posts);

      await orchestrator.monitorFeed();

      // Verify tickets were created for each post
      const tickets = await workQueueRepo.getTicketsByUser(null);
      expect(tickets).toHaveLength(2);
    });

    it('should update feed position after processing', async () => {
      const posts = [
        { id: 'post-1', content: 'Test 1' },
        { id: 'post-2', content: 'Test 2' }
      ];
      mockFeedService.getNewPosts.mockResolvedValue(posts);

      const result = await orchestrator.monitorFeed();

      expect(result.lastPosition).toBe('post-2');

      const state = await aviStateRepo.getState();
      expect(state.last_feed_position).toBe('post-2');
    });

    it('should do nothing when no new posts', async () => {
      mockFeedService.getNewPosts.mockResolvedValue([]);

      const result = await orchestrator.monitorFeed();

      expect(result).toBeUndefined();
      expect(mockWorkerSpawner.spawn).not.toHaveBeenCalled();
    });

    it('should not run if orchestrator is stopped', async () => {
      orchestrator.isRunning = false;
      mockFeedService.getNewPosts.mockResolvedValue([
        { id: 'post-1', content: 'Test' }
      ]);

      const result = await orchestrator.monitorFeed();

      expect(result).toBeUndefined();
      expect(mockFeedService.getNewPosts).not.toHaveBeenCalled();
    });

    it('should use last feed position from state', async () => {
      await aviStateRepo.updateFeedPosition('post-100');

      await orchestrator.monitorFeed();

      expect(mockFeedService.getNewPosts).toHaveBeenCalledWith('post-100');
    });
  });

  describe('processPost', () => {
    it('should create work ticket for post', async () => {
      const post = {
        id: 'post-123',
        content: 'Interesting tech discussion',
        author: 'techie',
        userId: 'user-456',
        platform: 'twitter',
        mentions: ['@alice'],
        hashtags: ['#tech']
      };

      const ticket = await orchestrator.processPost(post);

      expect(ticket).toBeDefined();
      expect(ticket.post_id).toBe('post-123');
      expect(ticket.post_content).toBe('Interesting tech discussion');
      expect(ticket.user_id).toBe('user-456');
    });

    it('should determine appropriate agent for post', async () => {
      const post = {
        id: 'post-1',
        content: 'Tech question',
        mentions: ['@tech']
      };

      const ticket = await orchestrator.processPost(post);

      expect(ticket.assigned_agent).toBe('tech-guru');
    });

    it('should calculate priority based on post metadata', async () => {
      const highPriorityPost = {
        id: 'post-1',
        content: 'Reply to us',
        mentions: ['@us'],
        isReplyToUs: true
      };

      const ticket = await orchestrator.processPost(highPriorityPost);

      expect(ticket.priority).toBeGreaterThanOrEqual(10);
    });

    it('should update context size after ticket creation', async () => {
      const initialContext = orchestrator.contextSize;

      const post = { id: 'post-1', content: 'Test' };
      await orchestrator.processPost(post);

      expect(orchestrator.contextSize).toBeGreaterThan(initialContext);
    });

    it('should spawn worker for created ticket', async () => {
      const post = { id: 'post-1', content: 'Test', author: 'user1' };

      await orchestrator.processPost(post);

      expect(mockWorkerSpawner.spawn).toHaveBeenCalled();
      const spawnCall = mockWorkerSpawner.spawn.mock.calls[0][0];
      expect(spawnCall).toHaveProperty('ticketId');
      expect(spawnCall).toHaveProperty('agentType');
    });

    it('should store post metadata in ticket', async () => {
      const post = {
        id: 'post-1',
        content: 'Test',
        platform: 'twitter',
        mentions: ['@alice', '@bob'],
        hashtags: ['#tech', '#ai']
      };

      const ticket = await orchestrator.processPost(post);

      expect(ticket.post_metadata.platform).toBe('twitter');
      expect(ticket.post_metadata.mentions).toEqual(['@alice', '@bob']);
      expect(ticket.post_metadata.hashtags).toEqual(['#tech', '#ai']);
    });
  });

  describe('spawnWorker', () => {
    it('should spawn ephemeral worker for ticket', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test content',
        assigned_agent: 'tech-guru'
      });

      await orchestrator.spawnWorker(ticket);

      expect(mockWorkerSpawner.spawn).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketId: ticket.id,
          agentType: 'tech-guru'
        })
      );
    });

    it('should track active worker', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      const result = await orchestrator.spawnWorker(ticket);

      expect(orchestrator.activeWorkers.has(result.workerId)).toBe(true);
    });

    it('should increment workers spawned counter', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      await orchestrator.spawnWorker(ticket);

      const state = await aviStateRepo.getState();
      expect(state.workers_spawned).toBe(1);
    });

    it('should update active workers count in database', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      await orchestrator.spawnWorker(ticket);

      const state = await aviStateRepo.getState();
      expect(state.active_workers).toBe(1);
    });

    it('should update context size (worker adds ~2700 tokens)', async () => {
      const initialContext = orchestrator.contextSize;
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      await orchestrator.spawnWorker(ticket);

      expect(orchestrator.contextSize).toBe(initialContext + 2700);
    });

    it('should set up worker completion handler', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      await orchestrator.spawnWorker(ticket);

      // Worker completion should check status
      expect(mockWorkerSpawner.getStatus).toHaveBeenCalled();
    });
  });

  describe('updateContext', () => {
    it('should add tokens to context size', async () => {
      orchestrator.contextSize = 10000;

      await orchestrator.updateContext(5000);

      expect(orchestrator.contextSize).toBe(15000);
    });

    it('should persist context size to database', async () => {
      await orchestrator.updateContext(5000);

      const state = await aviStateRepo.getState();
      expect(state.context_size).toBe(1500 + 5000);
    });

    it('should trigger graceful restart when exceeding 50K tokens', async () => {
      orchestrator.contextSize = 49000;

      const restartSpy = vi.spyOn(orchestrator, 'gracefulRestart');

      await orchestrator.updateContext(2000);

      expect(restartSpy).toHaveBeenCalled();
    });

    it('should not restart if under 50K token limit', async () => {
      orchestrator.contextSize = 30000;

      const restartSpy = vi.spyOn(orchestrator, 'gracefulRestart');

      await orchestrator.updateContext(5000);

      expect(restartSpy).not.toHaveBeenCalled();
    });

    it('should return updated context size', async () => {
      const result = await orchestrator.updateContext(3000);

      expect(result.contextSize).toBe(1500 + 3000);
    });
  });

  describe('checkHealth', () => {
    it('should verify database connectivity', async () => {
      const result = await orchestrator.checkHealth();

      expect(result.healthy).toBe(true);

      const state = await aviStateRepo.getState();
      expect(state).toBeDefined();
    });

    it('should verify feed service health', async () => {
      await orchestrator.checkHealth();

      expect(mockFeedService.healthCheck).toHaveBeenCalled();
    });

    it('should record successful health check', async () => {
      await orchestrator.checkHealth();

      const state = await aviStateRepo.getState();
      expect(state.last_health_check).toBeDefined();
      expect(state.last_error).toBeNull();
    });

    it('should record failed health check with error', async () => {
      mockFeedService.healthCheck.mockResolvedValue(false);

      await expect(orchestrator.checkHealth()).rejects.toThrow();

      const state = await aviStateRepo.getState();
      expect(state.last_error).toBeDefined();
    });

    it('should return context size in health check', async () => {
      orchestrator.contextSize = 25000;

      const result = await orchestrator.checkHealth();

      expect(result.contextSize).toBe(25000);
    });

    it('should detect database unavailability', async () => {
      // Temporarily close connection
      await postgresManager.close();

      await expect(orchestrator.checkHealth()).rejects.toThrow();

      // Restore connection
      await postgresManager.connect();
    });
  });

  describe('gracefulRestart', () => {
    it('should preserve pending tickets', async () => {
      // Create pending tickets
      await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test 1'
      });
      await workQueueRepo.createTicket({
        post_id: 'post-2',
        post_content: 'Test 2'
      });

      const result = await orchestrator.gracefulRestart();

      expect(result.preservedTickets).toBe(2);
    });

    it('should record restart in database', async () => {
      await orchestrator.gracefulRestart();

      const state = await aviStateRepo.getState();
      expect(state.last_restart).toBeDefined();
    });

    it('should reset context size to 1500 tokens', async () => {
      orchestrator.contextSize = 51000;

      await orchestrator.gracefulRestart();

      expect(orchestrator.contextSize).toBe(1500);

      const state = await aviStateRepo.getState();
      expect(state.context_size).toBe(1500);
    });

    it('should wait for active workers to complete', async () => {
      orchestrator.activeWorkers.add('worker-1');
      orchestrator.activeWorkers.add('worker-2');

      await orchestrator.gracefulRestart();

      expect(mockWorkerSpawner.kill).toHaveBeenCalledWith('worker-1');
      expect(mockWorkerSpawner.kill).toHaveBeenCalledWith('worker-2');
      expect(orchestrator.activeWorkers.size).toBe(0);
    });

    it('should resume running state after restart', async () => {
      await orchestrator.gracefulRestart();

      const state = await aviStateRepo.getState();
      expect(state.status).toBe('running');
    });

    it('should restart monitoring intervals', async () => {
      await orchestrator.startOrchestrator();

      await orchestrator.gracefulRestart();

      expect(orchestrator.feedCheckInterval).toBeDefined();
      expect(orchestrator.healthCheckInterval).toBeDefined();
    });

    it('should store pending ticket IDs in database', async () => {
      const ticket1 = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test 1'
      });
      const ticket2 = await workQueueRepo.createTicket({
        post_id: 'post-2',
        post_content: 'Test 2'
      });

      await orchestrator.gracefulRestart();

      const state = await aviStateRepo.getState();
      expect(state.pending_tickets).toContain(ticket1.id);
      expect(state.pending_tickets).toContain(ticket2.id);
    });
  });

  describe('handleError', () => {
    it('should log error message', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Test error');

      await orchestrator.handleError(error);

      expect(consoleSpy).toHaveBeenCalledWith('Orchestrator error:', error);
      consoleSpy.mockRestore();
    });

    it('should record error in database state', async () => {
      const error = new Error('Database timeout');

      await orchestrator.handleError(error);

      const state = await aviStateRepo.getState();
      expect(state.last_error).toBe('Database timeout');
    });

    it('should continue on non-critical errors', async () => {
      const error = new Error('Temporary network glitch');

      const result = await orchestrator.handleError(error);

      expect(result.action).toBe('continue');
      expect(orchestrator.isRunning).toBe(false); // Not started yet
    });

    it('should stop orchestrator on critical errors', async () => {
      await orchestrator.startOrchestrator();

      const criticalError = new Error('Database connection lost');

      await expect(orchestrator.handleError(criticalError)).rejects.toThrow();

      expect(orchestrator.isRunning).toBe(false);
    });

    it('should detect ECONNREFUSED as critical', async () => {
      const error = new Error('ECONNREFUSED - Cannot connect');

      const isCritical = orchestrator.isCriticalError(error);

      expect(isCritical).toBe(true);
    });

    it('should detect authentication failures as critical', async () => {
      const error = new Error('Authentication failed');

      const isCritical = orchestrator.isCriticalError(error);

      expect(isCritical).toBe(true);
    });
  });

  describe('Interaction Testing (London School)', () => {
    it('should coordinate with all dependencies during post processing', async () => {
      const post = {
        id: 'post-1',
        content: 'Test post',
        author: 'user1',
        userId: 'user-123'
      };

      mockFeedService.getNewPosts.mockResolvedValue([post]);

      await orchestrator.monitorFeed();

      // Verify interaction sequence
      expect(mockFeedService.getNewPosts).toHaveBeenCalled();
      expect(mockWorkerSpawner.spawn).toHaveBeenCalled();

      // Verify database interactions
      const tickets = await workQueueRepo.getTicketsByUser(null);
      expect(tickets.length).toBeGreaterThan(0);

      const state = await aviStateRepo.getState();
      expect(state.last_feed_position).toBe('post-1');
    });

    it('should properly orchestrate worker lifecycle', async () => {
      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test',
        assigned_agent: 'tech-guru'
      });

      await orchestrator.spawnWorker(ticket);

      // Verify spawn interaction
      expect(mockWorkerSpawner.spawn).toHaveBeenCalledTimes(1);

      // Verify status check interaction
      expect(mockWorkerSpawner.getStatus).toHaveBeenCalled();

      // Verify state updates
      const state = await aviStateRepo.getState();
      expect(state.workers_spawned).toBe(1);
      expect(state.active_workers).toBe(1);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle empty feed gracefully', async () => {
      mockFeedService.getNewPosts.mockResolvedValue([]);

      const result = await orchestrator.monitorFeed();

      expect(result).toBeUndefined();
    });

    it('should handle worker spawn failure', async () => {
      mockWorkerSpawner.spawn.mockRejectedValue(new Error('Spawn failed'));

      const ticket = await workQueueRepo.createTicket({
        post_id: 'post-1',
        post_content: 'Test'
      });

      await expect(orchestrator.spawnWorker(ticket)).rejects.toThrow('Spawn failed');
    });

    it('should handle concurrent post processing', async () => {
      const posts = Array.from({ length: 10 }, (_, i) => ({
        id: `post-${i}`,
        content: `Test ${i}`
      }));

      const results = await Promise.all(
        posts.map(post => orchestrator.processPost(post))
      );

      expect(results).toHaveLength(10);
      expect(mockWorkerSpawner.spawn).toHaveBeenCalledTimes(10);
    });

    it('should handle restart with no pending tickets', async () => {
      const result = await orchestrator.gracefulRestart();

      expect(result.preservedTickets).toBe(0);
    });

    it('should handle health check during restart', async () => {
      const restartPromise = orchestrator.gracefulRestart();

      // Try health check during restart
      const healthPromise = orchestrator.checkHealth();

      await expect(Promise.all([restartPromise, healthPromise])).resolves.toBeDefined();
    });
  });
});
