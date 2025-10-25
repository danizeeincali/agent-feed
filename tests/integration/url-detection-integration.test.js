/**
 * URL Detection Integration Tests
 * Tests the full flow of URL detection and ticket creation
 */

const { processPostForProactiveAgents } = require('../../api-server/services/ticket-creation-service.cjs');
const { extractURLs, matchProactiveAgents } = require('../../api-server/services/url-detection-service.cjs');

describe('URL Detection Integration', () => {

  test('INT-URL-001: Process post with single URL creates ticket', async () => {
    // Mock work queue repository
    const mockTickets = [];
    const mockWorkQueueRepo = {
      createTicket: jest.fn(async (data) => {
        const ticket = {
          id: `ticket-${mockTickets.length + 1}`,
          ...data,
          status: 'pending',
          created_at: Date.now()
        };
        mockTickets.push(ticket);
        return ticket;
      })
    };

    const post = {
      id: 'post-123',
      content: 'Can you save this link: https://example.com/article for me?',
      author_id: 'user-456'
    };

    const tickets = await processPostForProactiveAgents(post, mockWorkQueueRepo);

    // Should create at least one ticket (link-logger-agent)
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets[0].url).toBe('https://example.com/article');
    expect(tickets[0].agent_id).toBe('link-logger-agent');
    expect(tickets[0].status).toBe('pending');
    expect(tickets[0].user_id).toBe('user-456');
    expect(mockWorkQueueRepo.createTicket).toHaveBeenCalled();
  });

  test('INT-URL-002: Post with multiple URLs creates multiple tickets', async () => {
    const mockTickets = [];
    const mockWorkQueueRepo = {
      createTicket: jest.fn(async (data) => {
        const ticket = {
          id: `ticket-${mockTickets.length + 1}`,
          ...data,
          status: 'pending',
          created_at: Date.now()
        };
        mockTickets.push(ticket);
        return ticket;
      })
    };

    const post = {
      id: 'post-789',
      content: 'Check these: https://example.com/one and https://example.com/two',
      author_id: 'user-999'
    };

    const tickets = await processPostForProactiveAgents(post, mockWorkQueueRepo);

    // Should create tickets for both URLs
    expect(tickets.length).toBeGreaterThanOrEqual(2);

    const urls = tickets.map(t => t.url);
    expect(urls).toContain('https://example.com/one');
    expect(urls).toContain('https://example.com/two');
  });

  test('INT-URL-003: Post without URLs creates no tickets', async () => {
    const mockWorkQueueRepo = {
      createTicket: jest.fn()
    };

    const post = {
      id: 'post-999',
      content: 'Just a regular post without any links',
      author_id: 'user-111'
    };

    const tickets = await processPostForProactiveAgents(post, mockWorkQueueRepo);

    expect(tickets).toHaveLength(0);
    expect(mockWorkQueueRepo.createTicket).not.toHaveBeenCalled();
  });

  test('INT-URL-004: Priority determination works correctly', async () => {
    const mockTickets = [];
    const mockWorkQueueRepo = {
      createTicket: jest.fn(async (data) => {
        const ticket = {
          id: `ticket-${mockTickets.length + 1}`,
          ...data,
          status: 'pending',
          created_at: Date.now()
        };
        mockTickets.push(ticket);
        return ticket;
      })
    };

    const urgentPost = {
      id: 'post-urgent',
      content: 'URGENT: Check this immediately https://example.com/critical',
      author_id: 'user-urgent'
    };

    const tickets = await processPostForProactiveAgents(urgentPost, mockWorkQueueRepo);

    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets[0].priority).toBe('P0');
  });

  test('INT-URL-005: Metadata includes post context', async () => {
    const mockTickets = [];
    const mockWorkQueueRepo = {
      createTicket: jest.fn(async (data) => {
        const ticket = {
          id: `ticket-${mockTickets.length + 1}`,
          ...data,
          status: 'pending',
          created_at: Date.now()
        };
        mockTickets.push(ticket);
        return ticket;
      })
    };

    const post = {
      id: 'post-context',
      content: 'This is a very interesting article about AI https://example.com/ai that I found today',
      author_id: 'user-context'
    };

    const tickets = await processPostForProactiveAgents(post, mockWorkQueueRepo);

    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets[0].metadata).toBeDefined();
    expect(tickets[0].metadata.post_id).toBe('post-context');
    expect(tickets[0].metadata.context).toContain('interesting article');
    expect(tickets[0].metadata.context).toContain('found today');
  });

  test('INT-URL-006: Follow-up keywords trigger multiple agents', async () => {
    const mockTickets = [];
    const mockWorkQueueRepo = {
      createTicket: jest.fn(async (data) => {
        const ticket = {
          id: `ticket-${mockTickets.length + 1}`,
          ...data,
          status: 'pending',
          created_at: Date.now()
        };
        mockTickets.push(ticket);
        return ticket;
      })
    };

    const post = {
      id: 'post-followup',
      content: 'Follow up on this article later https://example.com/research',
      author_id: 'user-followup'
    };

    const tickets = await processPostForProactiveAgents(post, mockWorkQueueRepo);

    // Should trigger both link-logger-agent AND follow-ups-agent
    expect(tickets.length).toBeGreaterThanOrEqual(2);

    const agentIds = tickets.map(t => t.agent_id);
    expect(agentIds).toContain('link-logger-agent');
    expect(agentIds).toContain('follow-ups-agent');
  });

  test('INT-URL-007: TODO keywords trigger personal-todos-agent', async () => {
    const mockTickets = [];
    const mockWorkQueueRepo = {
      createTicket: jest.fn(async (data) => {
        const ticket = {
          id: `ticket-${mockTickets.length + 1}`,
          ...data,
          status: 'pending',
          created_at: Date.now()
        };
        mockTickets.push(ticket);
        return ticket;
      })
    };

    const post = {
      id: 'post-todo',
      content: 'TODO: Read this tutorial https://example.com/tutorial',
      author_id: 'user-todo'
    };

    const tickets = await processPostForProactiveAgents(post, mockWorkQueueRepo);

    // Should trigger both link-logger-agent AND personal-todos-agent
    expect(tickets.length).toBeGreaterThanOrEqual(2);

    const agentIds = tickets.map(t => t.agent_id);
    expect(agentIds).toContain('link-logger-agent');
    expect(agentIds).toContain('personal-todos-agent');
  });

  test('INT-URL-008: URL extraction works with complex URLs', async () => {
    const mockTickets = [];
    const mockWorkQueueRepo = {
      createTicket: jest.fn(async (data) => {
        const ticket = {
          id: `ticket-${mockTickets.length + 1}`,
          ...data,
          status: 'pending',
          created_at: Date.now()
        };
        mockTickets.push(ticket);
        return ticket;
      })
    };

    const post = {
      id: 'post-complex',
      content: 'Check https://www.linkedin.com/pulse/article?id=123&ref=twitter#section',
      author_id: 'user-complex'
    };

    const tickets = await processPostForProactiveAgents(post, mockWorkQueueRepo);

    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets[0].url).toBe('https://www.linkedin.com/pulse/article?id=123&ref=twitter#section');
  });
});
