/**
 * Orchestrator Comment Processing - Unit Tests
 *
 * Tests for AviOrchestrator.processCommentTicket() and routeCommentToAgent()
 *
 * BUG CONTEXT:
 * The orchestrator uses ticket.post_content when extracting comment content,
 * but the correct field is ticket.content. This causes comment processing to fail
 * with "content is undefined" errors.
 *
 * These tests will initially FAIL, demonstrating the bug.
 * After fixing orchestrator.js line 245, all tests should PASS.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import AviOrchestrator from '../../avi/orchestrator.js';
import {
  createMockCommentTicket,
  createTestPost,
  createMockWorkQueueRepo,
  createMockAgentWorker
} from '../helpers/comment-test-utils.js';

describe('AviOrchestrator - Comment Processing (Unit Tests)', () => {
  let orchestrator;
  let mockWorkQueueRepo;
  let mockWebSocketService;

  beforeEach(() => {
    // Create mock work queue repository
    mockWorkQueueRepo = createMockWorkQueueRepo();

    // Create mock WebSocket service
    mockWebSocketService = {
      isInitialized: () => true,
      broadcastCommentAdded: vi.fn(),
      broadcastToAll: vi.fn()
    };

    // Create orchestrator instance with mocks
    orchestrator = new AviOrchestrator(
      {
        maxWorkers: 5,
        pollInterval: 1000
      },
      mockWorkQueueRepo,
      mockWebSocketService
    );

    // Mock AgentWorker to prevent actual execution
    vi.mock('../../worker/agent-worker.js', () => ({
      default: class MockAgentWorker {
        constructor(config) {
          this.config = config;
        }

        async processComment() {
          return {
            success: true,
            reply: 'Mock reply',
            agent: this.config.agentId
          };
        }
      }
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('processCommentTicket() - Core Functionality', () => {
    test('UT-OCP-001: should extract content from ticket.content field (BUG FIX)', async () => {
      const ticket = createMockCommentTicket('Hello @avi, can you help?', {
        parent_post_id: 'post-123'
      });

      // Add ticket to mock repository
      await mockWorkQueueRepo.createTicket(ticket);

      // Spy on routeCommentToAgent to verify it receives correct content
      const routeSpy = vi.spyOn(orchestrator, 'routeCommentToAgent');

      // Mock database selector
      const mockDbSelector = {
        getPostById: vi.fn().mockResolvedValue(createTestPost({ id: 'post-123' }))
      };

      // Mock the import for database selector
      vi.doMock('../../config/database-selector.js', () => ({
        default: mockDbSelector
      }));

      const workerId = 'test-worker-1';

      // Process comment ticket
      await orchestrator.processCommentTicket(ticket, workerId);

      // BUG: This will FAIL because orchestrator uses ticket.post_content
      // EXPECTED: routeCommentToAgent should be called with correct content
      expect(routeSpy).toHaveBeenCalledWith(
        'Hello @avi, can you help?', // Should extract from ticket.content
        expect.any(Object)
      );
    });

    test('UT-OCP-002: should fail when content field is missing', async () => {
      const ticket = {
        id: 'ticket-123',
        post_id: 'comment-123',
        // Missing content field entirely
        post_metadata: {
          type: 'comment',
          parent_post_id: 'post-123'
        },
        metadata: {
          type: 'comment',
          parent_post_id: 'post-123'
        },
        agent_id: 'avi'
      };

      await mockWorkQueueRepo.createTicket(ticket);

      const workerId = 'test-worker-2';

      // Should handle missing content gracefully
      await orchestrator.processCommentTicket(ticket, workerId);

      // Verify ticket was marked as failed
      const updatedTicket = await mockWorkQueueRepo.getTicket(ticket.id);
      expect(updatedTicket.status).toBe('failed');
    });

    test('UT-OCP-003: should extract parent_post_id from metadata', async () => {
      const ticket = createMockCommentTicket('Test comment', {
        parent_post_id: 'post-abc-123'
      });

      await mockWorkQueueRepo.createTicket(ticket);

      const mockDbSelector = {
        getPostById: vi.fn().mockResolvedValue(createTestPost({ id: 'post-abc-123' }))
      };

      vi.doMock('../../config/database-selector.js', () => ({
        default: mockDbSelector
      }));

      const workerId = 'test-worker-3';

      await orchestrator.processCommentTicket(ticket, workerId);

      // Verify parent post was loaded
      expect(mockDbSelector.getPostById).toHaveBeenCalledWith('post-abc-123');
    });

    test('UT-OCP-004: should mark ticket as in_progress', async () => {
      const ticket = createMockCommentTicket('Test comment', {
        parent_post_id: 'post-123'
      });

      await mockWorkQueueRepo.createTicket(ticket);

      const workerId = 'test-worker-4';

      await orchestrator.processCommentTicket(ticket, workerId);

      // Verify ticket status was updated
      const updatedTicket = await mockWorkQueueRepo.getTicket(ticket.id);
      expect(updatedTicket.status).toBe('in_progress');
    });

    test('UT-OCP-005: should route comment to appropriate agent', async () => {
      const ticket = createMockCommentTicket('@page-builder create a landing page', {
        parent_post_id: 'post-123'
      });

      await mockWorkQueueRepo.createTicket(ticket);

      const routeSpy = vi.spyOn(orchestrator, 'routeCommentToAgent');

      const workerId = 'test-worker-5';

      await orchestrator.processCommentTicket(ticket, workerId);

      // Verify routing was called
      expect(routeSpy).toHaveBeenCalled();
    });

    test('UT-OCP-006: should handle parent post loading failure gracefully', async () => {
      const ticket = createMockCommentTicket('Test comment', {
        parent_post_id: 'post-nonexistent'
      });

      await mockWorkQueueRepo.createTicket(ticket);

      const mockDbSelector = {
        getPostById: vi.fn().mockRejectedValue(new Error('Post not found'))
      };

      vi.doMock('../../config/database-selector.js', () => ({
        default: mockDbSelector
      }));

      const workerId = 'test-worker-6';

      // Should not throw error - should continue processing
      await expect(
        orchestrator.processCommentTicket(ticket, workerId)
      ).resolves.not.toThrow();
    });

    test('UT-OCP-007: should create worker with comment mode', async () => {
      const ticket = createMockCommentTicket('Test comment', {
        parent_post_id: 'post-123'
      });

      await mockWorkQueueRepo.createTicket(ticket);

      const workerId = 'test-worker-7';

      await orchestrator.processCommentTicket(ticket, workerId);

      // Verify worker was added to active workers
      expect(orchestrator.activeWorkers.has(workerId)).toBe(true);
    });

    test('UT-OCP-008: should include comment context in worker config', async () => {
      const ticket = createMockCommentTicket('Test comment content', {
        parent_post_id: 'post-123',
        author: 'test-user'
      });

      await mockWorkQueueRepo.createTicket(ticket);

      const workerId = 'test-worker-8';

      // We need to capture the worker config to verify context
      // This is tricky with real AgentWorker, so we'll verify indirectly
      await orchestrator.processCommentTicket(ticket, workerId);

      const worker = orchestrator.activeWorkers.get(workerId);
      expect(worker).toBeDefined();
    });
  });

  describe('routeCommentToAgent() - Agent Routing Logic', () => {
    test('UT-OCP-009: should route @page-builder mentions to page-builder-agent', () => {
      const content = 'Hey @page-builder, can you create a landing page?';
      const metadata = {};

      const agent = orchestrator.routeCommentToAgent(content, metadata);

      expect(agent).toBe('page-builder-agent');
    });

    test('UT-OCP-010: should route @skills mentions to skills-architect', () => {
      const content = '@skills can you help with pattern templates?';
      const metadata = {};

      const agent = orchestrator.routeCommentToAgent(content, metadata);

      expect(agent).toBe('skills-architect-agent');
    });

    test('UT-OCP-011: should route @agent-architect mentions', () => {
      const content = '@agent-architect create a new agent for me';
      const metadata = {};

      const agent = orchestrator.routeCommentToAgent(content, metadata);

      expect(agent).toBe('agent-architect-agent');
    });

    test('UT-OCP-012: should route based on keywords (page, component, ui)', () => {
      const content = 'I need help building a UI component';
      const metadata = {};

      const agent = orchestrator.routeCommentToAgent(content, metadata);

      expect(agent).toBe('page-builder-agent');
    });

    test('UT-OCP-013: should route based on keywords (skill, template)', () => {
      const content = 'Need a skill template for data processing';
      const metadata = {};

      const agent = orchestrator.routeCommentToAgent(content, metadata);

      expect(agent).toBe('skills-architect-agent');
    });

    test('UT-OCP-014: should default to avi when no match', () => {
      const content = 'Just a general question here';
      const metadata = {};

      const agent = orchestrator.routeCommentToAgent(content, metadata);

      expect(agent).toBe('avi');
    });

    test('UT-OCP-015: should be case-insensitive for mentions', () => {
      const content = 'Hey @PAGE-BUILDER can you help?';
      const metadata = {};

      const agent = orchestrator.routeCommentToAgent(content, metadata);

      expect(agent).toBe('page-builder-agent');
    });
  });

  describe('extractKeywords() - Keyword Extraction', () => {
    test('UT-OCP-016: should extract meaningful keywords', () => {
      const text = 'create a page with component and layout';

      const keywords = orchestrator.extractKeywords(text);

      expect(keywords).toContain('create');
      expect(keywords).toContain('page');
      expect(keywords).toContain('component');
      expect(keywords).toContain('layout');
    });

    test('UT-OCP-017: should filter out stop words', () => {
      const text = 'the page is what I need';

      const keywords = orchestrator.extractKeywords(text);

      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('is');
      expect(keywords).not.toContain('what');
      expect(keywords).toContain('page');
      expect(keywords).toContain('need');
    });

    test('UT-OCP-018: should filter out short words (length <= 3)', () => {
      const text = 'I am on the run to get page';

      const keywords = orchestrator.extractKeywords(text);

      expect(keywords).not.toContain('I');
      expect(keywords).not.toContain('am');
      expect(keywords).not.toContain('on');
      expect(keywords).not.toContain('the');
      expect(keywords).not.toContain('run'); // 3 chars, should be filtered
      expect(keywords).not.toContain('get'); // 3 chars
      expect(keywords).toContain('page'); // 4 chars, kept
    });
  });

  describe('postCommentReply() - Reply Posting', () => {
    test('UT-OCP-019: should post reply with correct structure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            id: 'comment-reply-123',
            content: 'Test reply',
            author_agent: 'avi'
          }
        })
      });

      const postId = 'post-123';
      const commentId = 'comment-456';
      const agent = 'avi';
      const reply = 'This is my reply';

      await orchestrator.postCommentReply(postId, commentId, agent, reply);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/agent-posts/${postId}/comments`),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.any(String)
        })
      );

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.content).toBe(reply);
      expect(body.author_agent).toBe(agent);
      expect(body.parent_id).toBe(commentId);
      expect(body.skipTicket).toBe(true); // Critical: prevent infinite loop

      delete global.fetch;
    });

    test('UT-OCP-020: should include skipTicket flag to prevent loop', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'comment-123' } })
      });

      await orchestrator.postCommentReply('post-1', 'comment-1', 'avi', 'Reply');

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.skipTicket).toBe(true);

      delete global.fetch;
    });

    test('UT-OCP-021: should broadcast via WebSocket when available', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            id: 'comment-reply-123',
            content: 'Test reply'
          }
        })
      });

      await orchestrator.postCommentReply('post-1', 'comment-1', 'avi', 'Reply');

      expect(mockWebSocketService.broadcastCommentAdded).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: 'post-1',
          commentId: 'comment-reply-123',
          parentCommentId: 'comment-1',
          author: 'avi',
          content: 'Reply'
        })
      );

      delete global.fetch;
    });

    test('UT-OCP-022: should throw error on API failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal server error'
      });

      await expect(
        orchestrator.postCommentReply('post-1', 'comment-1', 'avi', 'Reply')
      ).rejects.toThrow('Failed to post comment reply');

      delete global.fetch;
    });

    test('UT-OCP-023: should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        orchestrator.postCommentReply('post-1', 'comment-1', 'avi', 'Reply')
      ).rejects.toThrow('Network error');

      delete global.fetch;
    });
  });
});
