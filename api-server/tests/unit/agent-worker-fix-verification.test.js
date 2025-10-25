/**
 * Quick verification test for agent-worker comment creation fix
 * Demonstrates the bug is fixed without needing full integration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import AgentWorker from '../../worker/agent-worker.js';

describe('Agent Worker Comment Fix - Quick Verification', () => {
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
    content: 'Test content'
  };

  beforeEach(() => {
    mockWorkQueueRepo = {
      getTicket: vi.fn().mockResolvedValue(mockTicket)
    };

    mockWebsocketService = {
      isInitialized: vi.fn().mockReturnValue(false)
    };

    originalFetch = global.fetch;
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'comment-123' } })
    });
    global.fetch = mockFetch;

    worker = new AgentWorker({
      workerId: 'worker-1',
      ticketId: 'ticket-123',
      agentId: 'test-agent',
      workQueueRepo: mockWorkQueueRepo,
      websocketService: mockWebsocketService,
      apiBaseUrl: 'http://localhost:3001'
    });

    worker.processURL = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('BUG FIX: handles null summary without throwing text.trim error', async () => {
    // This was the critical bug: intelligence.summary could be null
    worker.processURL.mockResolvedValue({
      summary: null,
      tokensUsed: 100,
      completedAt: Date.now()
    });

    // Should NOT throw "text.trim is not a function"
    await expect(worker.execute()).resolves.toBeDefined();

    // Verify comment was created with fallback text
    const fetchCall = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    expect(requestBody.content).toBe('No summary available');
  });

  it('BUG FIX: handles undefined summary without throwing', async () => {
    worker.processURL.mockResolvedValue({
      summary: undefined,
      tokensUsed: 100,
      completedAt: Date.now()
    });

    await expect(worker.execute()).resolves.toBeDefined();

    const fetchCall = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    expect(requestBody.content).toBe('No summary available');
  });

  it('BUG FIX: handles object summary without throwing', async () => {
    worker.processURL.mockResolvedValue({
      summary: { result: 'data' },
      tokensUsed: 100,
      completedAt: Date.now()
    });

    await expect(worker.execute()).resolves.toBeDefined();

    const fetchCall = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    expect(requestBody.content).toBe('[object Object]');
  });

  it('REGRESSION: still handles valid string summaries correctly', async () => {
    worker.processURL.mockResolvedValue({
      summary: '  Valid summary text  ',
      tokensUsed: 100,
      completedAt: Date.now()
    });

    const result = await worker.execute();

    expect(result.success).toBe(true);
    const fetchCall = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    expect(requestBody.content).toBe('Valid summary text');
  });

  it('REGRESSION: comment payload includes all required fields', async () => {
    worker.processURL.mockResolvedValue({
      summary: 'Test summary',
      tokensUsed: 100,
      completedAt: Date.now()
    });

    await worker.execute();

    const fetchCall = mockFetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);

    expect(requestBody).toHaveProperty('content');
    expect(requestBody).toHaveProperty('author', 'test-agent');
    expect(requestBody).toHaveProperty('parent_id', null);
    expect(requestBody).toHaveProperty('mentioned_users', []);
    expect(requestBody).toHaveProperty('skipTicket', true);
  });
});
