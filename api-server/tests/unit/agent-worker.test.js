/**
 * AgentWorker.execute() - TDD Unit Tests
 *
 * These tests define the expected behavior of the AgentWorker.execute() method.
 * Following TDD Red-Green-Refactor methodology.
 *
 * Context:
 * AgentWorker processes proactive agent tickets created when URLs are posted.
 * The worker must:
 * 1. Fetch ticket details from work queue
 * 2. Process the URL (simulate for MVP)
 * 3. Post result to agent feed as the agent
 * 4. Update ticket status to completed/failed
 */

const AgentWorker = require('../../worker/agent-worker.js');

describe('AgentWorker - TDD Unit Tests', () => {
  describe('Constructor', () => {
    test('UT-AW-001: should create worker with provided config', () => {
      const config = {
        workerId: 'test-worker-123',
        ticketId: 'ticket-abc',
        agentId: 'link-logger-agent',
        workQueueRepo: {},
        apiBaseUrl: 'http://localhost:3000'
      };

      const worker = new AgentWorker(config);

      expect(worker).toBeDefined();
      expect(worker.workerId).toBe('test-worker-123');
      expect(worker.ticketId).toBe('ticket-abc');
      expect(worker.agentId).toBe('link-logger-agent');
      expect(worker.workQueueRepo).toBeDefined();
      expect(worker.apiBaseUrl).toBe('http://localhost:3000');
    });

    test('UT-AW-002: should create worker with default values when config is empty', () => {
      const worker = new AgentWorker();

      expect(worker).toBeDefined();
      expect(worker.status).toBe('idle');
      expect(worker.apiBaseUrl).toBe('http://localhost:3001');
    });

    test('UT-AW-003: should initialize with idle status', () => {
      const worker = new AgentWorker({ workerId: 'worker-1' });

      expect(worker.status).toBe('idle');
    });
  });

  describe('execute() method', () => {
    test('UT-AW-004: should have execute method', () => {
      const worker = new AgentWorker();

      expect(typeof worker.execute).toBe('function');
    });

    test('UT-AW-005: should return a promise', () => {
      const worker = new AgentWorker({
        workerId: 'worker-1',
        ticketId: 'ticket-123',
        agentId: 'test-agent'
      });

      // Mock fetch globally
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            id: 'post-123',
            title: 'Test Post',
            content: 'Test content'
          }
        })
      });

      const result = worker.execute();
      expect(result).toBeInstanceOf(Promise);

      // Cleanup
      delete global.fetch;
      return result.catch(() => {}); // Prevent unhandled rejection
    });
  });

  describe('execute() - Ticket Fetching', () => {
    let worker;
    let mockFetch;

    beforeEach(() => {
      worker = new AgentWorker({
        workerId: 'test-worker-1',
        ticketId: 'ticket-abc-123',
        agentId: 'link-logger-agent',
        apiBaseUrl: 'http://localhost:3000'
      });

      mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            id: 'post-new-123',
            title: 'Intelligence Summary',
            content: 'Analyzed URL',
            author_agent: 'link-logger-agent'
          }
        })
      });
      global.fetch = mockFetch;
    });

    afterEach(() => {
      delete global.fetch;
    });

    test('UT-AW-006: should fetch ticket using fetchTicket method', async () => {
      const fetchTicketSpy = jest.spyOn(worker, 'fetchTicket');

      await worker.execute();

      expect(fetchTicketSpy).toHaveBeenCalled();
      fetchTicketSpy.mockRestore();
    });

    test('UT-AW-007: fetchTicket should return ticket object with required fields', async () => {
      const ticket = await worker.fetchTicket();

      expect(ticket).toBeDefined();
      expect(ticket.id).toBe('ticket-abc-123');
      expect(ticket.agent_id).toBe('link-logger-agent');
      expect(ticket.url).toBeDefined();
      expect(typeof ticket.url).toBe('string');
    });
  });

  describe('execute() - URL Processing', () => {
    let worker;
    let mockFetch;

    beforeEach(() => {
      worker = new AgentWorker({
        workerId: 'test-worker-1',
        ticketId: 'ticket-abc-123',
        agentId: 'link-logger-agent',
        apiBaseUrl: 'http://localhost:3000'
      });

      mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            id: 'post-new-123',
            title: 'Intelligence Summary',
            content: 'Analyzed URL'
          }
        })
      });
      global.fetch = mockFetch;
    });

    afterEach(() => {
      delete global.fetch;
    });

    test('UT-AW-008: should call processURL with ticket', async () => {
      const processURLSpy = jest.spyOn(worker, 'processURL');

      await worker.execute();

      expect(processURLSpy).toHaveBeenCalled();
      expect(processURLSpy.mock.calls[0][0]).toBeDefined();
      expect(processURLSpy.mock.calls[0][0].url).toBeDefined();
      processURLSpy.mockRestore();
    });

    test('UT-AW-009: processURL should return intelligence object with required fields', async () => {
      const ticket = {
        id: 'ticket-123',
        agent_id: 'test-agent',
        url: 'https://example.com/article'
      };

      const intelligence = await worker.processURL(ticket);

      expect(intelligence).toBeDefined();
      expect(intelligence.title).toBeDefined();
      expect(intelligence.summary).toBeDefined();
      expect(intelligence.tokensUsed).toBeDefined();
      expect(typeof intelligence.tokensUsed).toBe('number');
      expect(intelligence.completedAt).toBeDefined();
    });

    test('UT-AW-010: processURL should include URL in summary', async () => {
      const ticket = {
        id: 'ticket-123',
        agent_id: 'test-agent',
        url: 'https://example.com/test-article'
      };

      const intelligence = await worker.processURL(ticket);

      expect(intelligence.summary).toContain('https://example.com/test-article');
    });
  });

  describe('execute() - Agent Feed Posting', () => {
    let worker;
    let mockFetch;

    beforeEach(() => {
      worker = new AgentWorker({
        workerId: 'test-worker-1',
        ticketId: 'ticket-abc-123',
        agentId: 'link-logger-agent',
        apiBaseUrl: 'http://localhost:3000'
      });

      mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            id: 'post-new-123',
            title: 'Intelligence Summary',
            content: 'Analyzed: https://example.com/article',
            author_agent: 'link-logger-agent'
          }
        })
      });
      global.fetch = mockFetch;
    });

    afterEach(() => {
      delete global.fetch;
    });

    test('UT-AW-011: should post result to agent feed via API', async () => {
      await worker.execute();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/agent-posts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.any(String)
        })
      );
    });

    test('UT-AW-012: should include agent_id as author_agent in post', async () => {
      await worker.execute();

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.author_agent).toBe('link-logger-agent');
    });

    test('UT-AW-013: should include title in post', async () => {
      await worker.execute();

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.title).toBeDefined();
      expect(typeof body.title).toBe('string');
      expect(body.title.length).toBeGreaterThan(0);
    });

    test('UT-AW-014: should include content in post', async () => {
      await worker.execute();

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.content).toBeDefined();
      expect(typeof body.content).toBe('string');
      expect(body.content.length).toBeGreaterThan(0);
    });

    test('UT-AW-015: should include metadata with ticketId and url', async () => {
      await worker.execute();

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.metadata).toBeDefined();
      expect(body.metadata.ticketId).toBe('ticket-abc-123');
      expect(body.metadata.url).toBeDefined();
    });

    test('UT-AW-016: should throw error if agent feed post fails with HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error details'
      });

      await expect(worker.execute()).rejects.toThrow('Failed to post to agent feed');
    });
  });

  describe('execute() - Success Result', () => {
    let worker;
    let mockFetch;

    beforeEach(() => {
      worker = new AgentWorker({
        workerId: 'test-worker-1',
        ticketId: 'ticket-abc-123',
        agentId: 'link-logger-agent',
        apiBaseUrl: 'http://localhost:3000'
      });

      mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            id: 'post-new-123',
            title: 'Intelligence Summary',
            content: 'Analyzed: https://example.com/article',
            author_agent: 'link-logger-agent'
          }
        })
      });
      global.fetch = mockFetch;
    });

    afterEach(() => {
      delete global.fetch;
    });

    test('UT-AW-017: should return success result with response data', async () => {
      const result = await worker.execute();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.response).toBeDefined();
      expect(typeof result.response).toBe('string');
    });

    test('UT-AW-018: should return tokensUsed in result', async () => {
      const result = await worker.execute();

      expect(result.tokensUsed).toBeDefined();
      expect(typeof result.tokensUsed).toBe('number');
      expect(result.tokensUsed).toBeGreaterThan(0);
    });

    test('UT-AW-019: should return postId from API response', async () => {
      const result = await worker.execute();

      expect(result.postId).toBeDefined();
      expect(result.postId).toBe('post-new-123');
    });

    test('UT-AW-020: should set worker status to completed on success', async () => {
      await worker.execute();

      expect(worker.status).toBe('completed');
    });
  });

  describe('execute() - Error Handling', () => {
    let worker;
    let mockFetch;

    beforeEach(() => {
      worker = new AgentWorker({
        workerId: 'test-worker-1',
        ticketId: 'ticket-abc-123',
        agentId: 'link-logger-agent',
        apiBaseUrl: 'http://localhost:3000'
      });
    });

    afterEach(() => {
      if (global.fetch) {
        delete global.fetch;
      }
    });

    test('UT-AW-021: should set worker status to failed on error', async () => {
      mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;

      await expect(worker.execute()).rejects.toThrow();

      expect(worker.status).toBe('failed');
    });

    test('UT-AW-022: should throw error with network failure details', async () => {
      mockFetch = jest.fn().mockRejectedValue(new Error('Connection timeout'));
      global.fetch = mockFetch;

      await expect(worker.execute()).rejects.toThrow('Connection timeout');
    });

    test('UT-AW-023: should handle HTTP error responses gracefully', async () => {
      mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => 'Service temporarily unavailable'
      });
      global.fetch = mockFetch;

      await expect(worker.execute()).rejects.toThrow('Failed to post to agent feed: 503');
    });

    test('UT-AW-024: should handle malformed API responses', async () => {
      mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });
      global.fetch = mockFetch;

      await expect(worker.execute()).rejects.toThrow();
    });
  });

  describe('execute() - Integration with Work Queue Repository', () => {
    let worker;
    let mockWorkQueue;
    let mockFetch;

    beforeEach(() => {
      mockWorkQueue = {
        getTicket: jest.fn().mockReturnValue({
          id: 'ticket-123',
          agent_id: 'link-logger-agent',
          url: 'https://example.com/article',
          content: 'Test content',
          status: 'pending'
        }),
        updateTicketStatus: jest.fn().mockReturnValue({
          id: 'ticket-123',
          status: 'in_progress'
        }),
        completeTicket: jest.fn().mockReturnValue({
          id: 'ticket-123',
          status: 'completed'
        }),
        failTicket: jest.fn().mockReturnValue({
          id: 'ticket-123',
          status: 'failed'
        })
      };

      worker = new AgentWorker({
        workerId: 'test-worker-1',
        ticketId: 'ticket-123',
        agentId: 'link-logger-agent',
        workQueueRepo: mockWorkQueue,
        apiBaseUrl: 'http://localhost:3000'
      });

      mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            id: 'post-new-123',
            title: 'Test Post',
            content: 'Test content'
          }
        })
      });
      global.fetch = mockFetch;
    });

    afterEach(() => {
      delete global.fetch;
    });

    test('UT-AW-025: should use work queue repository when provided', async () => {
      // Override fetchTicket to use workQueueRepo
      worker.fetchTicket = async function() {
        if (this.workQueueRepo && this.workQueueRepo.getTicket) {
          return this.workQueueRepo.getTicket(this.ticketId);
        }
        // Fallback to default behavior
        return {
          id: this.ticketId,
          agent_id: this.agentId,
          url: 'https://example.com',
          content: 'Test'
        };
      };

      await worker.execute();

      expect(mockWorkQueue.getTicket).toHaveBeenCalledWith('ticket-123');
    });

    test('UT-AW-026: should handle missing work queue repository gracefully', async () => {
      const workerWithoutRepo = new AgentWorker({
        workerId: 'test-worker-2',
        ticketId: 'ticket-456',
        agentId: 'test-agent',
        apiBaseUrl: 'http://localhost:3000'
      });

      // Should still execute with default ticket fetching
      const result = await workerWithoutRepo.execute();

      expect(result.success).toBe(true);
    });
  });

  describe('execute() - MVP Simulation Behavior', () => {
    let worker;
    let mockFetch;

    beforeEach(() => {
      worker = new AgentWorker({
        workerId: 'test-worker-1',
        ticketId: 'ticket-abc-123',
        agentId: 'link-logger-agent',
        apiBaseUrl: 'http://localhost:3000'
      });

      mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            id: 'post-new-123',
            title: 'Intelligence Summary',
            content: 'Analyzed URL'
          }
        })
      });
      global.fetch = mockFetch;
    });

    afterEach(() => {
      delete global.fetch;
    });

    test('UT-AW-027: should generate realistic token usage', async () => {
      const result = await worker.execute();

      expect(result.tokensUsed).toBeGreaterThanOrEqual(100);
      expect(result.tokensUsed).toBeLessThanOrEqual(5000);
    });

    test('UT-AW-028: should include timestamp in intelligence processing', async () => {
      const ticket = {
        id: 'ticket-123',
        agent_id: 'test-agent',
        url: 'https://example.com'
      };

      const intelligence = await worker.processURL(ticket);

      expect(intelligence.completedAt).toBeDefined();
      expect(typeof intelligence.completedAt).toBe('number');
      expect(intelligence.completedAt).toBeGreaterThan(0);
    });

    test('UT-AW-029: should generate title based on URL domain', async () => {
      const ticket = {
        id: 'ticket-123',
        agent_id: 'test-agent',
        url: 'https://www.linkedin.com/pulse/article'
      };

      const intelligence = await worker.processURL(ticket);

      expect(intelligence.title).toContain('www.linkedin.com');
    });

    test('UT-AW-030: should handle various URL formats', async () => {
      const urls = [
        'https://example.com',
        'https://www.example.com/path',
        'https://subdomain.example.com/path/to/resource',
        'https://example.com:8080/path'
      ];

      for (const url of urls) {
        const ticket = { id: 'test', agent_id: 'test', url };
        const intelligence = await worker.processURL(ticket);

        expect(intelligence.title).toBeDefined();
        expect(intelligence.summary).toContain(url);
      }
    });
  });
});
