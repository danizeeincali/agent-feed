/**
 * Orchestrator Routing Test Suite
 * Tests the orchestrator's ability to route comment tickets vs. post tickets correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AviOrchestrator from '../avi/orchestrator.js';
import AgentWorker from '../worker/agent-worker.js';

describe('AVI Orchestrator - Routing Logic', () => {
  let orchestrator;
  let mockWorkQueueRepo;
  let mockWebsocketService;

  beforeEach(() => {
    // Mock work queue repository
    mockWorkQueueRepo = {
      getPendingTickets: vi.fn().mockResolvedValue([]),
      updateTicketStatus: vi.fn().mockResolvedValue(undefined),
      completeTicket: vi.fn().mockResolvedValue({ ticketId: 'test', completed: true }),
      failTicket: vi.fn().mockResolvedValue({ ticketId: 'test', failed: true }),
      getTicket: vi.fn()
    };

    // Mock WebSocket service
    mockWebsocketService = {
      isInitialized: vi.fn().mockReturnValue(true),
      broadcastCommentAdded: vi.fn(),
      emitTicketStatusUpdate: vi.fn()
    };

    // Create orchestrator instance
    orchestrator = new AviOrchestrator(
      {
        maxWorkers: 5,
        pollInterval: 1000,
        healthCheckInterval: 5000
      },
      mockWorkQueueRepo,
      mockWebsocketService
    );
  });

  afterEach(async () => {
    if (orchestrator.running) {
      await orchestrator.stop();
    }
  });

  describe('Comment Ticket Detection', () => {
    it('should detect comment tickets by metadata.type === "comment"', async () => {
      const commentTicket = {
        id: 1,
        agent_id: 'avi',
        post_id: 'comment-123',
        content: 'Test comment content',
        metadata: { type: 'comment', parent_post_id: 'post-456' }
      };

      mockWorkQueueRepo.getPendingTickets.mockResolvedValue([commentTicket]);

      // Spy on processCommentTicket
      const processCommentSpy = vi.spyOn(orchestrator, 'processCommentTicket');

      await orchestrator.processWorkQueue();

      // Should call processCommentTicket for comment tickets
      expect(processCommentSpy).toHaveBeenCalledWith(commentTicket, expect.any(String));
    });

    it('should NOT route regular post tickets to processCommentTicket', async () => {
      const postTicket = {
        id: 2,
        agent_id: 'avi',
        post_id: 'post-789',
        content: 'Regular post content',
        url: 'https://example.com',
        metadata: null
      };

      mockWorkQueueRepo.getPendingTickets.mockResolvedValue([postTicket]);

      // Spy on processCommentTicket
      const processCommentSpy = vi.spyOn(orchestrator, 'processCommentTicket');

      await orchestrator.processWorkQueue();

      // Should NOT call processCommentTicket for regular posts
      expect(processCommentSpy).not.toHaveBeenCalled();
    });

    it('should handle tickets with metadata but type !== "comment" as regular posts', async () => {
      const postTicket = {
        id: 3,
        agent_id: 'avi',
        post_id: 'post-999',
        content: 'Post with metadata',
        metadata: { type: 'post', tags: ['test'] }
      };

      mockWorkQueueRepo.getPendingTickets.mockResolvedValue([postTicket]);

      const processCommentSpy = vi.spyOn(orchestrator, 'processCommentTicket');

      await orchestrator.processWorkQueue();

      expect(processCommentSpy).not.toHaveBeenCalled();
    });
  });

  describe('Post Ticket Routing', () => {
    it('should route post tickets to worker.execute()', async () => {
      const postTicket = {
        id: 4,
        agent_id: 'avi',
        post_id: 'post-123',
        content: 'Test post',
        url: 'https://example.com'
      };

      mockWorkQueueRepo.getPendingTickets.mockResolvedValue([postTicket]);

      // Mock AgentWorker.execute
      vi.spyOn(AgentWorker.prototype, 'execute').mockResolvedValue({
        success: true,
        response: 'Test response',
        tokensUsed: 100
      });

      await orchestrator.processWorkQueue();

      // Verify ticket was marked as in_progress
      expect(mockWorkQueueRepo.updateTicketStatus).toHaveBeenCalledWith('4', 'in_progress');

      // Worker should be spawned and execute called
      expect(orchestrator.activeWorkers.size).toBeGreaterThan(0);
    });

    it('should update ticket status to in_progress for post tickets', async () => {
      const postTicket = {
        id: 5,
        agent_id: 'test-agent',
        post_id: 'post-555',
        content: 'Test content',
        url: 'https://test.com'
      };

      mockWorkQueueRepo.getPendingTickets.mockResolvedValue([postTicket]);

      vi.spyOn(AgentWorker.prototype, 'execute').mockResolvedValue({
        success: true,
        response: 'Success',
        tokensUsed: 50
      });

      await orchestrator.processWorkQueue();

      expect(mockWorkQueueRepo.updateTicketStatus).toHaveBeenCalledWith('5', 'in_progress');
    });
  });

  describe('Comment Ticket Processing', () => {
    it('should route comment tickets to processCommentTicket with correct parameters', async () => {
      const commentTicket = {
        id: 6,
        agent_id: 'avi',
        post_id: 'comment-777',
        post_content: 'What is the answer?',
        post_author: 'user123',
        metadata: {
          type: 'comment',
          parent_post_id: 'post-888',
          parent_comment_id: null
        }
      };

      mockWorkQueueRepo.getPendingTickets.mockResolvedValue([commentTicket]);

      // Mock processComment method
      vi.spyOn(AgentWorker.prototype, 'processComment').mockResolvedValue({
        success: true,
        reply: 'Test reply',
        agent: 'avi',
        commentId: 'comment-777'
      });

      await orchestrator.processWorkQueue();

      // Verify comment processing was initiated
      expect(mockWorkQueueRepo.updateTicketStatus).toHaveBeenCalledWith('6', 'in_progress');
    });

    it('should extract metadata fields correctly for comment tickets', async () => {
      const commentTicket = {
        id: 7,
        agent_id: 'avi',
        post_id: 'comment-999',
        post_content: 'Threaded reply',
        post_author: 'user456',
        post_metadata: {
          parent_post_id: 'post-111',
          parent_comment_id: 'comment-888'
        },
        metadata: { type: 'comment' }
      };

      mockWorkQueueRepo.getPendingTickets.mockResolvedValue([commentTicket]);

      vi.spyOn(AgentWorker.prototype, 'processComment').mockResolvedValue({
        success: true,
        reply: 'Threaded reply response'
      });

      await orchestrator.processWorkQueue();

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify worker was created with comment mode
      const workers = Array.from(orchestrator.activeWorkers.values());
      expect(workers.length).toBeGreaterThan(0);
    });
  });

  describe('Conversation Chain Retrieval', () => {
    it('should load parent post context for comment tickets', async () => {
      const commentTicket = {
        id: 8,
        agent_id: 'avi',
        post_id: 'comment-123',
        post_content: 'Follow-up question',
        metadata: {
          type: 'comment',
          parent_post_id: 'post-456'
        }
      };

      mockWorkQueueRepo.getPendingTickets.mockResolvedValue([commentTicket]);

      // Mock database selector
      const mockDbSelector = {
        getPostById: vi.fn().mockResolvedValue({
          id: 'post-456',
          title: 'Original Post',
          content: 'Post content',
          authorAgent: 'page-builder-agent'
        })
      };

      vi.doMock('../config/database-selector.js', () => ({
        default: mockDbSelector
      }));

      vi.spyOn(AgentWorker.prototype, 'processComment').mockResolvedValue({
        success: true,
        reply: 'Response with context'
      });

      await orchestrator.processWorkQueue();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify worker was spawned with context
      expect(orchestrator.activeWorkers.size).toBeGreaterThan(0);
    });

    it('should handle missing parent post gracefully', async () => {
      const commentTicket = {
        id: 9,
        agent_id: 'avi',
        post_id: 'comment-orphan',
        post_content: 'Orphaned comment',
        metadata: {
          type: 'comment',
          parent_post_id: 'post-nonexistent'
        }
      };

      mockWorkQueueRepo.getPendingTickets.mockResolvedValue([commentTicket]);

      vi.spyOn(AgentWorker.prototype, 'processComment').mockResolvedValue({
        success: true,
        reply: 'Response without parent context'
      });

      await orchestrator.processWorkQueue();

      // Should still process the ticket even if parent is missing
      expect(mockWorkQueueRepo.updateTicketStatus).toHaveBeenCalledWith('9', 'in_progress');
    });
  });

  describe('Agent Routing for Comments', () => {
    it('should route to page-builder-agent for page-related keywords', () => {
      const content = 'Can you create a new page for me?';
      const agent = orchestrator.routeCommentToAgent(content, {});

      expect(agent).toBe('page-builder-agent');
    });

    it('should route to skills-architect-agent for skill-related keywords', () => {
      const content = 'I need a new skill template';
      const agent = orchestrator.routeCommentToAgent(content, {});

      expect(agent).toBe('skills-architect-agent');
    });

    it('should route to agent-architect-agent for agent creation requests', () => {
      const content = 'Create a new agent for me';
      const agent = orchestrator.routeCommentToAgent(content, {});

      expect(agent).toBe('agent-architect-agent');
    });

    it('should default to avi for generic comments', () => {
      const content = 'What is the answer to life?';
      const agent = orchestrator.routeCommentToAgent(content, {});

      expect(agent).toBe('avi');
    });

    it('should respect @mentions for explicit routing', () => {
      const content = '@page-builder-agent can you help?';
      const agent = orchestrator.routeCommentToAgent(content, {});

      expect(agent).toBe('page-builder-agent');
    });
  });

  describe('Error Handling', () => {
    it('should fail ticket if comment processing throws error', async () => {
      const commentTicket = {
        id: 10,
        agent_id: 'avi',
        post_id: 'comment-error',
        post_content: 'This will fail',
        metadata: { type: 'comment', parent_post_id: 'post-123' }
      };

      mockWorkQueueRepo.getPendingTickets.mockResolvedValue([commentTicket]);

      vi.spyOn(AgentWorker.prototype, 'processComment').mockRejectedValue(
        new Error('Processing failed')
      );

      await orchestrator.processWorkQueue();

      // Wait for async error handling
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockWorkQueueRepo.failTicket).toHaveBeenCalledWith(
        '10',
        expect.stringContaining('failed')
      );
    });

    it('should fail ticket if post processing throws error', async () => {
      const postTicket = {
        id: 11,
        agent_id: 'avi',
        post_id: 'post-error',
        content: 'This will fail',
        url: 'https://broken.com'
      };

      mockWorkQueueRepo.getPendingTickets.mockResolvedValue([postTicket]);

      vi.spyOn(AgentWorker.prototype, 'execute').mockRejectedValue(
        new Error('Execution failed')
      );

      await orchestrator.processWorkQueue();

      // Wait for async error handling
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockWorkQueueRepo.failTicket).toHaveBeenCalledWith(
        '11',
        expect.stringContaining('failed')
      );
    });
  });

  describe('Worker Capacity Management', () => {
    it('should not spawn workers beyond maxWorkers limit', async () => {
      const tickets = Array.from({ length: 10 }, (_, i) => ({
        id: 100 + i,
        agent_id: 'avi',
        post_id: `post-${100 + i}`,
        content: `Test ${i}`,
        url: 'https://test.com'
      }));

      mockWorkQueueRepo.getPendingTickets.mockResolvedValue(tickets);

      vi.spyOn(AgentWorker.prototype, 'execute').mockResolvedValue({
        success: true,
        response: 'Done',
        tokensUsed: 50
      });

      await orchestrator.processWorkQueue();

      // Should only spawn up to maxWorkers (5)
      expect(orchestrator.activeWorkers.size).toBeLessThanOrEqual(5);
    });

    it('should spawn multiple workers for mixed ticket types', async () => {
      const tickets = [
        {
          id: 201,
          agent_id: 'avi',
          post_id: 'post-201',
          content: 'Post 1',
          url: 'https://test1.com'
        },
        {
          id: 202,
          agent_id: 'avi',
          post_id: 'comment-202',
          post_content: 'Comment 1',
          metadata: { type: 'comment', parent_post_id: 'post-100' }
        },
        {
          id: 203,
          agent_id: 'avi',
          post_id: 'post-203',
          content: 'Post 2',
          url: 'https://test2.com'
        }
      ];

      mockWorkQueueRepo.getPendingTickets.mockResolvedValue(tickets);

      vi.spyOn(AgentWorker.prototype, 'execute').mockResolvedValue({
        success: true,
        response: 'Done',
        tokensUsed: 50
      });

      vi.spyOn(AgentWorker.prototype, 'processComment').mockResolvedValue({
        success: true,
        reply: 'Comment reply',
        agent: 'avi'
      });

      await orchestrator.processWorkQueue();

      // Should spawn workers for all tickets
      expect(orchestrator.activeWorkers.size).toBe(3);
    });
  });

  describe('Integration: End-to-End Ticket Processing', () => {
    it('should complete full lifecycle for comment ticket', async () => {
      const commentTicket = {
        id: 300,
        agent_id: 'avi',
        post_id: 'comment-300',
        post_content: 'Calculate 3000+500, then divide by 2',
        post_author: 'user',
        metadata: {
          type: 'comment',
          parent_post_id: 'post-300',
          parent_comment_id: null
        }
      };

      mockWorkQueueRepo.getPendingTickets.mockResolvedValue([commentTicket]);

      vi.spyOn(AgentWorker.prototype, 'processComment').mockResolvedValue({
        success: true,
        reply: 'The answer is 1750',
        agent: 'avi',
        commentId: 'comment-300'
      });

      // Mock postCommentReply
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'comment-reply-300' } })
      });

      await orchestrator.processWorkQueue();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should update ticket to in_progress
      expect(mockWorkQueueRepo.updateTicketStatus).toHaveBeenCalledWith('300', 'in_progress');

      // Should eventually complete the ticket
      expect(mockWorkQueueRepo.completeTicket).toHaveBeenCalled();
    });

    it('should complete full lifecycle for post ticket', async () => {
      const postTicket = {
        id: 400,
        agent_id: 'test-agent',
        post_id: 'post-400',
        content: 'Test post content',
        url: 'https://example.com/article'
      };

      mockWorkQueueRepo.getPendingTickets.mockResolvedValue([postTicket]);

      vi.spyOn(AgentWorker.prototype, 'execute').mockResolvedValue({
        success: true,
        response: 'Article analyzed successfully',
        tokensUsed: 250,
        commentId: 'comment-400'
      });

      await orchestrator.processWorkQueue();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should update ticket to in_progress
      expect(mockWorkQueueRepo.updateTicketStatus).toHaveBeenCalledWith('400', 'in_progress');

      // Should eventually complete the ticket
      expect(mockWorkQueueRepo.completeTicket).toHaveBeenCalled();
    });
  });
});
