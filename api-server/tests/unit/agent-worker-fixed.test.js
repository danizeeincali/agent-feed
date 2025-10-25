/**
 * Unit Tests for Fixed AgentWorker Implementation
 *
 * Test Coverage:
 * 1. fetchTicket() - 5 tests
 * 2. processURL() - 6 tests
 * 3. postToAgentFeed() - 5 tests
 * 4. execute() Integration - 4 tests
 *
 * Total: 20 comprehensive tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import AgentWorker from '../../worker/agent-worker.js';
import { promises as fs } from 'fs';

// Mock dependencies
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn()
  }
}));

vi.mock('../../../prod/src/services/ClaudeCodeSDKManager.ts', () => ({
  getClaudeCodeSDKManager: vi.fn(() => ({
    executeHeadlessTask: vi.fn()
  }))
}));

// Import mocked module
import { getClaudeCodeSDKManager } from '../../../prod/src/services/ClaudeCodeSDKManager.ts';

// Mock global fetch
global.fetch = vi.fn();

describe('AgentWorker - Fixed Implementation', () => {
  let worker;
  let mockWorkQueueRepo;
  let mockSDKManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock work queue repository
    mockWorkQueueRepo = {
      getTicket: vi.fn(),
      updateTicketStatus: vi.fn()
    };

    // Setup mock SDK manager
    mockSDKManager = {
      executeHeadlessTask: vi.fn()
    };
    getClaudeCodeSDKManager.mockReturnValue(mockSDKManager);

    // Create worker instance
    worker = new AgentWorker({
      workerId: 'worker-123',
      ticketId: 'ticket-456',
      agentId: 'test-agent',
      workQueueRepo: mockWorkQueueRepo,
      apiBaseUrl: 'http://localhost:3001'
    });
  });

  // ============================================================
  // 1. fetchTicket() Tests (5 tests)
  // ============================================================

  describe('fetchTicket()', () => {
    it('should fetch real ticket from workQueueRepo', async () => {
      const mockTicket = {
        id: 'ticket-456',
        agent_id: 'test-agent',
        url: 'https://example.com',
        post_id: 'post-789',
        content: 'Analyze this URL',
        status: 'pending'
      };

      mockWorkQueueRepo.getTicket.mockResolvedValue(mockTicket);

      const ticket = await worker.fetchTicket();

      expect(mockWorkQueueRepo.getTicket).toHaveBeenCalledWith('ticket-456');
      expect(ticket).toEqual(mockTicket);
      expect(ticket.id).toBe('ticket-456');
      expect(ticket.agent_id).toBe('test-agent');
      expect(ticket.url).toBe('https://example.com');
      expect(ticket.post_id).toBe('post-789');
    });

    it('should throw error if workQueueRepo not provided', async () => {
      const workerWithoutRepo = new AgentWorker({
        workerId: 'worker-123',
        ticketId: 'ticket-456'
      });

      await expect(workerWithoutRepo.fetchTicket()).rejects.toThrow(
        'WorkQueueRepo not initialized - cannot fetch ticket'
      );
    });

    it('should throw error if ticket not found', async () => {
      mockWorkQueueRepo.getTicket.mockResolvedValue(null);

      await expect(worker.fetchTicket()).rejects.toThrow(
        'Ticket ticket-456 not found in work queue'
      );
    });

    it('should validate required fields (id, agent_id, url, post_id, content)', async () => {
      const incompleteTicket = {
        id: 'ticket-456',
        agent_id: 'test-agent',
        // Missing url, post_id, content
      };

      mockWorkQueueRepo.getTicket.mockResolvedValue(incompleteTicket);

      await expect(worker.fetchTicket()).rejects.toThrow(
        'Ticket ticket-456 missing required fields: url, post_id, content'
      );
    });

    it('should log ticket fetch with URL and post_id', async () => {
      const mockTicket = {
        id: 'ticket-456',
        agent_id: 'test-agent',
        url: 'https://example.com',
        post_id: 'post-789',
        content: 'Analyze this URL'
      };

      mockWorkQueueRepo.getTicket.mockResolvedValue(mockTicket);

      const ticket = await worker.fetchTicket();

      // Verify NO mock data - all real values from repo
      expect(ticket.url).not.toBe('mock-url');
      expect(ticket.post_id).not.toBe('mock-post-id');
      expect(ticket.url).toBe('https://example.com');
      expect(ticket.post_id).toBe('post-789');
    });
  });

  // ============================================================
  // 2. processURL() Tests (6 tests)
  // ============================================================

  describe('processURL()', () => {
    const mockTicket = {
      id: 'ticket-456',
      agent_id: 'security-analyst',
      url: 'https://example.com/security-report',
      post_id: 'post-789',
      content: 'Analyze security vulnerabilities'
    };

    it('should load agent instructions from .md file', async () => {
      const agentInstructions = '# Security Analyst\n\nYou analyze security vulnerabilities...';

      fs.readFile.mockResolvedValue(agentInstructions);

      mockSDKManager.executeHeadlessTask.mockResolvedValue({
        success: true,
        messages: [
          { type: 'assistant', text: 'Security analysis complete' },
          { type: 'result', usage: { input_tokens: 100, output_tokens: 200 } }
        ]
      });

      await worker.processURL(mockTicket);

      expect(fs.readFile).toHaveBeenCalledWith(
        '/workspaces/agent-feed/prod/.claude/agents/security-analyst.md',
        'utf-8'
      );
    });

    it('should call ClaudeCodeSDKManager.executeHeadlessTask()', async () => {
      const agentInstructions = '# Security Analyst Instructions';

      fs.readFile.mockResolvedValue(agentInstructions);

      mockSDKManager.executeHeadlessTask.mockResolvedValue({
        success: true,
        messages: [
          { type: 'assistant', text: 'Analysis complete' },
          { type: 'result', usage: { input_tokens: 150, output_tokens: 250 } }
        ]
      });

      await worker.processURL(mockTicket);

      expect(mockSDKManager.executeHeadlessTask).toHaveBeenCalledOnce();

      const callArg = mockSDKManager.executeHeadlessTask.mock.calls[0][0];
      expect(callArg).toContain('# Security Analyst Instructions');
      expect(callArg).toContain('Process this URL: https://example.com/security-report');
      expect(callArg).toContain('Provide your analysis and intelligence summary');
    });

    it('should extract intelligence from SDK response messages', async () => {
      fs.readFile.mockResolvedValue('Agent instructions');

      mockSDKManager.executeHeadlessTask.mockResolvedValue({
        success: true,
        messages: [
          { type: 'assistant', text: 'First analysis point' },
          { type: 'assistant', text: 'Second analysis point' },
          { type: 'assistant', text: 'Final conclusion' },
          { type: 'result', usage: { input_tokens: 100, output_tokens: 200 } }
        ]
      });

      const intelligence = await worker.processURL(mockTicket);

      expect(intelligence.summary).toContain('First analysis point');
      expect(intelligence.summary).toContain('Second analysis point');
      expect(intelligence.summary).toContain('Final conclusion');

      // Verify NO mock data in response
      expect(intelligence.summary).not.toContain('mock');
      expect(intelligence.summary).not.toContain('Mock');
    });

    it('should calculate real token usage (input + output tokens)', async () => {
      fs.readFile.mockResolvedValue('Agent instructions');

      mockSDKManager.executeHeadlessTask.mockResolvedValue({
        success: true,
        messages: [
          { type: 'assistant', text: 'Analysis' },
          {
            type: 'result',
            subtype: 'success',
            usage: {
              input_tokens: 1234,
              output_tokens: 5678
            }
          }
        ]
      });

      const intelligence = await worker.processURL(mockTicket);

      // Verify real token calculation: 1234 + 5678 = 6912
      expect(intelligence.tokensUsed).toBe(6912);
      expect(intelligence.tokensUsed).not.toBe(0);
      expect(intelligence.tokensUsed).toBeGreaterThan(0);
    });

    it('should throw error if agent instructions not found', async () => {
      fs.readFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      await expect(worker.processURL(mockTicket)).rejects.toThrow(
        'Failed to load agent instructions for security-analyst'
      );
    });

    it('should throw error if SDK execution fails', async () => {
      fs.readFile.mockResolvedValue('Agent instructions');

      mockSDKManager.executeHeadlessTask.mockResolvedValue({
        success: false,
        error: 'API rate limit exceeded'
      });

      await expect(worker.processURL(mockTicket)).rejects.toThrow(
        'Claude Code SDK execution failed: API rate limit exceeded'
      );
    });
  });

  // ============================================================
  // 3. postToAgentFeed() Tests (5 tests)
  // ============================================================

  describe('postToAgentFeed()', () => {
    const mockIntelligence = {
      title: 'Intelligence: https://example.com',
      summary: 'Comprehensive security analysis reveals...',
      tokensUsed: 6912,
      completedAt: Date.now()
    };

    const mockTicket = {
      id: 'ticket-456',
      agent_id: 'security-analyst',
      post_id: 'post-789'
    };

    it('should POST to comment endpoint (not post endpoint)', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            id: 'comment-101',
            content: mockIntelligence.summary,
            author: 'security-analyst'
          }
        })
      });

      await worker.postToAgentFeed(mockIntelligence, mockTicket);

      expect(global.fetch).toHaveBeenCalledOnce();

      const fetchUrl = global.fetch.mock.calls[0][0];
      // Verify it's posting to COMMENT endpoint, not POST endpoint
      expect(fetchUrl).toContain('/comments');
      expect(fetchUrl).toBe('http://localhost:3001/api/agent-posts/post-789/comments');
    });

    it('should use ticket.post_id in URL path', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { id: 'comment-101' }
        })
      });

      const ticketWithDifferentPostId = {
        ...mockTicket,
        post_id: 'post-XYZ-999'
      };

      await worker.postToAgentFeed(mockIntelligence, ticketWithDifferentPostId);

      const fetchUrl = global.fetch.mock.calls[0][0];
      expect(fetchUrl).toContain('post-XYZ-999');
      expect(fetchUrl).toBe('http://localhost:3001/api/agent-posts/post-XYZ-999/comments');
    });

    it('should send correct comment structure (content, author, parent_id, skipTicket)', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { id: 'comment-101' }
        })
      });

      await worker.postToAgentFeed(mockIntelligence, mockTicket);

      const fetchOptions = global.fetch.mock.calls[0][1];
      const requestBody = JSON.parse(fetchOptions.body);

      expect(requestBody).toEqual({
        content: mockIntelligence.summary,
        author: 'security-analyst',
        parent_id: null,
        skipTicket: true
      });

      // Verify skipTicket prevents infinite loop
      expect(requestBody.skipTicket).toBe(true);
    });

    it('should throw error if ticket.post_id missing', async () => {
      const ticketWithoutPostId = {
        id: 'ticket-456',
        agent_id: 'security-analyst'
        // post_id is missing
      };

      await expect(
        worker.postToAgentFeed(mockIntelligence, ticketWithoutPostId)
      ).rejects.toThrow('Ticket ticket-456 missing post_id - cannot create comment');
    });

    it('should return comment object with comment_id', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            id: 'comment-101',
            content: mockIntelligence.summary,
            author: 'security-analyst',
            created_at: Date.now()
          }
        })
      });

      const result = await worker.postToAgentFeed(mockIntelligence, mockTicket);

      expect(result).toHaveProperty('comment_id');
      expect(result.comment_id).toBe('comment-101');
      expect(result.id).toBe('comment-101');
      expect(result.author).toBe('security-analyst');
    });
  });

  // ============================================================
  // 4. execute() Integration Tests (4 tests)
  // ============================================================

  describe('execute() - Full Integration', () => {
    beforeEach(() => {
      // Setup complete mock chain for execute()
      mockWorkQueueRepo.getTicket.mockResolvedValue({
        id: 'ticket-456',
        agent_id: 'security-analyst',
        url: 'https://example.com/security',
        post_id: 'post-789',
        content: 'Analyze security'
      });

      fs.readFile.mockResolvedValue('# Security Analyst\n\nAnalyze security...');

      mockSDKManager.executeHeadlessTask.mockResolvedValue({
        success: true,
        messages: [
          { type: 'assistant', text: 'Security analysis complete. No vulnerabilities found.' },
          {
            type: 'result',
            subtype: 'success',
            usage: {
              input_tokens: 500,
              output_tokens: 1500
            }
          }
        ]
      });

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            id: 'comment-101',
            content: 'Security analysis complete. No vulnerabilities found.',
            author: 'security-analyst'
          }
        })
      });
    });

    it('should execute full flow: fetch → process → post', async () => {
      const result = await worker.execute();

      // Verify all three steps were executed
      expect(mockWorkQueueRepo.getTicket).toHaveBeenCalledOnce();
      expect(fs.readFile).toHaveBeenCalledOnce();
      expect(mockSDKManager.executeHeadlessTask).toHaveBeenCalledOnce();
      expect(global.fetch).toHaveBeenCalledOnce();

      // Verify final result
      expect(result.success).toBe(true);
      expect(result.response).toContain('Security analysis complete');
      expect(result.tokensUsed).toBe(2000); // 500 + 1500
      expect(result.commentId).toBe('comment-101');
    });

    it('should return success with real token usage', async () => {
      const result = await worker.execute();

      expect(result).toEqual({
        success: true,
        response: 'Security analysis complete. No vulnerabilities found.',
        tokensUsed: 2000,
        commentId: 'comment-101'
      });

      // Verify NO mock token data
      expect(result.tokensUsed).not.toBe(0);
      expect(result.tokensUsed).toBeGreaterThan(0);
      expect(result.tokensUsed).toBe(2000);
    });

    it('should update status to "completed" on success', async () => {
      expect(worker.status).toBe('idle');

      await worker.execute();

      expect(worker.status).toBe('completed');
    });

    it('should update status to "failed" on error', async () => {
      // Force an error during fetch
      mockWorkQueueRepo.getTicket.mockRejectedValue(
        new Error('Database connection failed')
      );

      expect(worker.status).toBe('idle');

      await expect(worker.execute()).rejects.toThrow('Database connection failed');

      expect(worker.status).toBe('failed');
    });
  });

  // ============================================================
  // Additional Edge Case Tests
  // ============================================================

  describe('Edge Cases & Error Handling', () => {
    it('should handle empty assistant response gracefully', async () => {
      const mockTicket = {
        id: 'ticket-456',
        agent_id: 'test-agent',
        url: 'https://example.com',
        post_id: 'post-789',
        content: 'Test'
      };

      fs.readFile.mockResolvedValue('Agent instructions');

      mockSDKManager.executeHeadlessTask.mockResolvedValue({
        success: true,
        messages: [
          // No assistant messages
          { type: 'result', usage: { input_tokens: 100, output_tokens: 0 } }
        ]
      });

      await expect(worker.processURL(mockTicket)).rejects.toThrow(
        'No assistant response received from Claude Code SDK'
      );
    });

    it('should handle API error response correctly', async () => {
      const mockIntelligence = {
        summary: 'Test analysis',
        tokensUsed: 100
      };

      const mockTicket = {
        id: 'ticket-456',
        agent_id: 'test-agent',
        post_id: 'post-789'
      };

      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Database error'
      });

      await expect(
        worker.postToAgentFeed(mockIntelligence, mockTicket)
      ).rejects.toThrow('Failed to create comment on post post-789: 500 Database error');
    });

    it('should handle missing token usage data', async () => {
      const mockTicket = {
        id: 'ticket-456',
        agent_id: 'test-agent',
        url: 'https://example.com',
        post_id: 'post-789',
        content: 'Test'
      };

      fs.readFile.mockResolvedValue('Agent instructions');

      mockSDKManager.executeHeadlessTask.mockResolvedValue({
        success: true,
        messages: [
          { type: 'assistant', text: 'Analysis complete' }
          // No result message with usage
        ]
      });

      const intelligence = await worker.processURL(mockTicket);

      // Should default to 0 tokens if usage not found
      expect(intelligence.tokensUsed).toBe(0);
    });
  });
});
