/**
 * TDD London School: Agent Worker Comment Creation Bug Fix
 *
 * Testing comment creation with various intelligence.summary types
 * Bug: text.trim is not a function when summary is not a string
 *
 * London School Approach:
 * - Mock all collaborators (workQueueRepo, websocketService, fetch)
 * - Verify interactions between objects
 * - Focus on behavior, not state
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AgentWorker from '../../worker/agent-worker.js';

describe('AgentWorker - Comment Creation Bug Fix', () => {
  let worker;
  let mockWorkQueueRepo;
  let mockWebsocketService;
  let mockFetch;
  let originalFetch;

  const mockTicket = {
    id: 'ticket-123',
    agent_id: 'test-agent',
    url: 'https://example.com/test',
    post_id: 'post-456',
    content: 'Check this out: https://example.com/test'
  };

  beforeEach(() => {
    // Mock work queue repository
    mockWorkQueueRepo = {
      getTicket: vi.fn().mockResolvedValue(mockTicket)
    };

    // Mock WebSocket service
    mockWebsocketService = {
      isInitialized: vi.fn().mockReturnValue(true),
      emitTicketStatusUpdate: vi.fn()
    };

    // Save original fetch and create mock
    originalFetch = global.fetch;
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Initialize worker with mocked dependencies
    worker = new AgentWorker({
      workerId: 'worker-1',
      ticketId: 'ticket-123',
      agentId: 'test-agent',
      workQueueRepo: mockWorkQueueRepo,
      websocketService: mockWebsocketService,
      apiBaseUrl: 'http://localhost:3001'
    });

    // Mock processURL to control intelligence object
    worker.processURL = vi.fn();
  });

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('Comment Payload Structure', () => {
    it('should include all required fields in comment payload', async () => {
      // Arrange: Mock intelligence with string summary
      const intelligence = {
        summary: 'This is a test summary',
        tokensUsed: 100,
        completedAt: Date.now()
      };
      worker.processURL.mockResolvedValue(intelligence);

      // Mock successful comment creation
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'comment-789' } })
      });

      // Act: Execute worker
      await worker.execute();

      // Assert: Verify fetch was called with correct payload structure
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/agent-posts/post-456/comments',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );

      // Extract and verify comment payload
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody).toEqual({
        content: expect.any(String),
        author: 'test-agent',
        parent_id: null,
        mentioned_users: [],
        skipTicket: true
      });

      expect(requestBody.content.trim()).toBe('This is a test summary');
    });
  });

  describe('String Summary Handling', () => {
    it('should handle string summary correctly', async () => {
      // Arrange: Normal case with string summary
      const intelligence = {
        summary: '  Valid string summary  ',
        tokensUsed: 100,
        completedAt: Date.now()
      };
      worker.processURL.mockResolvedValue(intelligence);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'comment-789' } })
      });

      // Act
      await worker.execute();

      // Assert: Verify content is trimmed string
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.content).toBe('Valid string summary');
      expect(typeof requestBody.content).toBe('string');
    });
  });

  describe('Null Summary Handling', () => {
    it('should handle null summary with fallback text', async () => {
      // Arrange: intelligence.summary is null (BUG CASE)
      const intelligence = {
        summary: null,
        tokensUsed: 100,
        completedAt: Date.now()
      };
      worker.processURL.mockResolvedValue(intelligence);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'comment-789' } })
      });

      // Act
      await worker.execute();

      // Assert: Should use fallback instead of throwing
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.content).toBe('No summary available');
      expect(typeof requestBody.content).toBe('string');
    });
  });

  describe('Undefined Summary Handling', () => {
    it('should handle undefined summary with fallback text', async () => {
      // Arrange: intelligence.summary is undefined (BUG CASE)
      const intelligence = {
        summary: undefined,
        tokensUsed: 100,
        completedAt: Date.now()
      };
      worker.processURL.mockResolvedValue(intelligence);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'comment-789' } })
      });

      // Act
      await worker.execute();

      // Assert: Should use fallback instead of throwing
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.content).toBe('No summary available');
      expect(typeof requestBody.content).toBe('string');
    });
  });

  describe('Object Summary Handling', () => {
    it('should handle object summary by stringifying', async () => {
      // Arrange: intelligence.summary is an object (BUG CASE)
      const intelligence = {
        summary: { result: 'test', details: 'info' },
        tokensUsed: 100,
        completedAt: Date.now()
      };
      worker.processURL.mockResolvedValue(intelligence);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'comment-789' } })
      });

      // Act
      await worker.execute();

      // Assert: Should stringify object
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.content).toBe('[object Object]');
      expect(typeof requestBody.content).toBe('string');
    });
  });

  describe('Empty String Summary Handling', () => {
    it('should handle empty string summary with fallback', async () => {
      // Arrange: intelligence.summary is empty string
      const intelligence = {
        summary: '',
        tokensUsed: 100,
        completedAt: Date.now()
      };
      worker.processURL.mockResolvedValue(intelligence);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'comment-789' } })
      });

      // Act
      await worker.execute();

      // Assert: Should use fallback for empty string
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.content).toBe('No summary available');
      expect(typeof requestBody.content).toBe('string');
    });
  });

  describe('Whitespace-Only Summary Handling', () => {
    it('should handle whitespace-only summary with fallback', async () => {
      // Arrange: intelligence.summary is only whitespace
      const intelligence = {
        summary: '   \n\t  ',
        tokensUsed: 100,
        completedAt: Date.now()
      };
      worker.processURL.mockResolvedValue(intelligence);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'comment-789' } })
      });

      // Act
      await worker.execute();

      // Assert: Should use fallback for whitespace-only string
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.content).toBe('No summary available');
      expect(typeof requestBody.content).toBe('string');
    });
  });

  describe('Interaction Verification', () => {
    it('should coordinate comment creation workflow correctly', async () => {
      // Arrange
      const intelligence = {
        summary: 'Test summary',
        tokensUsed: 100,
        completedAt: Date.now()
      };
      worker.processURL.mockResolvedValue(intelligence);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'comment-789' } })
      });

      // Act
      const result = await worker.execute();

      // Assert: Verify workflow interactions
      expect(mockWorkQueueRepo.getTicket).toHaveBeenCalledWith('ticket-123');
      expect(worker.processURL).toHaveBeenCalledWith(mockTicket);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.commentId).toBe('comment-789');
    });

    it('should emit WebSocket events during comment creation', async () => {
      // Arrange
      const intelligence = {
        summary: 'Test summary',
        tokensUsed: 100,
        completedAt: Date.now()
      };
      worker.processURL.mockResolvedValue(intelligence);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'comment-789' } })
      });

      // Act
      await worker.execute();

      // Assert: Verify WebSocket coordination
      expect(mockWebsocketService.emitTicketStatusUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'processing',
          ticket_id: 'ticket-123',
          post_id: 'post-456'
        })
      );

      expect(mockWebsocketService.emitTicketStatusUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          ticket_id: 'ticket-123',
          post_id: 'post-456'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should not throw when summary conversion fails', async () => {
      // Arrange: Summary that might cause issues
      const intelligence = {
        summary: null,
        tokensUsed: 100,
        completedAt: Date.now()
      };
      worker.processURL.mockResolvedValue(intelligence);

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 'comment-789' } })
      });

      // Act & Assert: Should not throw
      await expect(worker.execute()).resolves.toBeDefined();
    });
  });
});
