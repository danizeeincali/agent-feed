const Database = require('better-sqlite3');
const { randomUUID } = require('crypto');

// WorkQueueRepository implementation inline for testing
class WorkQueueRepository {
  constructor(db) {
    this.db = db;
  }

  createTicket(data) {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO work_queue_tickets (
        id, user_id, agent_id, content, url, priority, status,
        retry_count, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.user_id || null,
      data.agent_id,
      data.content,
      data.url || null,
      data.priority,
      'pending',
      0,
      data.metadata ? JSON.stringify(data.metadata) : null,
      now
    );

    return this.getTicket(id);
  }

  getTicket(id) {
    const stmt = this.db.prepare('SELECT * FROM work_queue_tickets WHERE id = ?');
    const ticket = stmt.get(id);

    if (!ticket) return null;

    return this._deserializeTicket(ticket);
  }

  getPendingTickets({ limit = 5, agent_id = null } = {}) {
    let sql = `
      SELECT * FROM work_queue_tickets
      WHERE status = 'pending'
    `;

    const params = [];
    if (agent_id) {
      sql += ' AND agent_id = ?';
      params.push(agent_id);
    }

    sql += ' ORDER BY priority ASC, created_at ASC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(sql);
    const tickets = stmt.all(...params);

    return tickets.map(ticket => this._deserializeTicket(ticket));
  }

  updateTicketStatus(id, status) {
    const updates = { status };

    if (status === 'in_progress') {
      updates.assigned_at = Date.now();
    } else if (status === 'completed' || status === 'failed') {
      updates.completed_at = Date.now();
    }

    const setClauses = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    const stmt = this.db.prepare(`
      UPDATE work_queue_tickets
      SET ${setClauses}
      WHERE id = ?
    `);

    stmt.run(...values, id);
    return this.getTicket(id);
  }

  completeTicket(id, result) {
    const stmt = this.db.prepare(`
      UPDATE work_queue_tickets
      SET status = 'completed', completed_at = ?, result = ?
      WHERE id = ?
    `);

    stmt.run(Date.now(), JSON.stringify(result), id);
    return this.getTicket(id);
  }

  failTicket(id, error) {
    const ticket = this.getTicket(id);
    if (!ticket) return null;

    const retryCount = (ticket.retry_count || 0) + 1;
    const maxRetries = 3;

    if (retryCount < maxRetries) {
      const stmt = this.db.prepare(`
        UPDATE work_queue_tickets
        SET status = 'pending', retry_count = ?, last_error = ?
        WHERE id = ?
      `);
      stmt.run(retryCount, error, id);
    } else {
      const stmt = this.db.prepare(`
        UPDATE work_queue_tickets
        SET status = 'failed', retry_count = ?, last_error = ?, completed_at = ?
        WHERE id = ?
      `);
      stmt.run(retryCount, error, Date.now(), id);
    }

    return this.getTicket(id);
  }

  getTicketsByAgent(agent_id) {
    const stmt = this.db.prepare(`
      SELECT * FROM work_queue_tickets
      WHERE agent_id = ?
      ORDER BY created_at DESC
    `);

    const tickets = stmt.all(agent_id);
    return tickets.map(ticket => this._deserializeTicket(ticket));
  }

  _deserializeTicket(ticket) {
    return {
      ...ticket,
      metadata: ticket.metadata ? JSON.parse(ticket.metadata) : null,
      result: ticket.result ? JSON.parse(ticket.result) : null
    };
  }
}

describe('Work Queue Repository - TDD Tests', () => {
  let db;
  let workQueue;

  beforeAll(() => {
    // Create test database
    db = new Database(':memory:');

    // Create work_queue_tickets table
    db.exec(`
      CREATE TABLE IF NOT EXISTS work_queue_tickets (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        agent_id TEXT NOT NULL,
        content TEXT NOT NULL,
        url TEXT,
        priority TEXT NOT NULL CHECK(priority IN ('P0', 'P1', 'P2', 'P3')),
        status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'failed')),
        retry_count INTEGER DEFAULT 0,
        metadata TEXT,
        result TEXT,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        assigned_at INTEGER,
        completed_at INTEGER
      ) STRICT;

      CREATE INDEX idx_work_queue_status ON work_queue_tickets(status);
      CREATE INDEX idx_work_queue_agent ON work_queue_tickets(agent_id);
      CREATE INDEX idx_work_queue_priority ON work_queue_tickets(priority, created_at);
    `);

    workQueue = new WorkQueueRepository(db);
  });

  afterAll(() => {
    db.close();
  });

  beforeEach(() => {
    // Clear tickets before each test
    db.prepare('DELETE FROM work_queue_tickets').run();
  });

  test('UT-001: Create ticket with all required fields', () => {
    const ticket = workQueue.createTicket({
      user_id: 'user-123',
      agent_id: 'link-logger-agent',
      content: 'Check this: https://example.com',
      url: 'https://example.com',
      priority: 'P2',
      metadata: { post_id: 'post-456', context: 'Important link' }
    });

    expect(ticket.id).toBeDefined();
    expect(ticket.agent_id).toBe('link-logger-agent');
    expect(ticket.content).toBe('Check this: https://example.com');
    expect(ticket.url).toBe('https://example.com');
    expect(ticket.priority).toBe('P2');
    expect(ticket.status).toBe('pending');
    expect(ticket.retry_count).toBe(0);
    expect(ticket.metadata).toEqual({ post_id: 'post-456', context: 'Important link' });
    expect(ticket.created_at).toBeDefined();
  });

  test('UT-002: Get pending tickets ordered by priority', () => {
    // Create tickets with different priorities
    workQueue.createTicket({
      agent_id: 'agent-1',
      content: 'Task 1',
      priority: 'P2'
    });

    workQueue.createTicket({
      agent_id: 'agent-2',
      content: 'Task 2',
      priority: 'P0'
    });

    workQueue.createTicket({
      agent_id: 'agent-3',
      content: 'Task 3',
      priority: 'P1'
    });

    const pending = workQueue.getPendingTickets({ limit: 5 });

    expect(pending).toHaveLength(3);
    expect(pending[0].priority).toBe('P0'); // Highest priority first
    expect(pending[1].priority).toBe('P1');
    expect(pending[2].priority).toBe('P2');
  });

  test('UT-003: Update ticket status to in_progress', () => {
    const ticket = workQueue.createTicket({
      agent_id: 'test-agent',
      content: 'Test task',
      priority: 'P2'
    });

    const updated = workQueue.updateTicketStatus(ticket.id, 'in_progress');

    expect(updated.status).toBe('in_progress');
    expect(updated.assigned_at).toBeDefined();
    expect(updated.assigned_at).toBeGreaterThan(0);
  });

  test('UT-004: Complete ticket with result', () => {
    const ticket = workQueue.createTicket({
      agent_id: 'test-agent',
      content: 'Test task',
      priority: 'P2'
    });

    const completed = workQueue.completeTicket(ticket.id, {
      summary: 'Intelligence captured',
      posted: true,
      url_processed: 'https://example.com'
    });

    expect(completed.status).toBe('completed');
    expect(completed.completed_at).toBeDefined();
    expect(completed.completed_at).toBeGreaterThan(0);
    expect(completed.result).toEqual({
      summary: 'Intelligence captured',
      posted: true,
      url_processed: 'https://example.com'
    });
  });

  test('UT-005: Fail ticket with error and retry', () => {
    const ticket = workQueue.createTicket({
      agent_id: 'test-agent',
      content: 'Test task',
      priority: 'P2'
    });

    const failed = workQueue.failTicket(ticket.id, 'Network error: timeout');

    // First failure should retry (set back to pending)
    expect(failed.status).toBe('pending');
    expect(failed.retry_count).toBe(1);
    expect(failed.last_error).toBe('Network error: timeout');
  });

  test('UT-006: Max retries exceeded marks as failed', () => {
    const ticket = workQueue.createTicket({
      agent_id: 'test-agent',
      content: 'Test task',
      priority: 'P2'
    });

    // Fail 3 times (max retries = 3)
    const fail1 = workQueue.failTicket(ticket.id, 'Error 1');
    expect(fail1.status).toBe('pending');
    expect(fail1.retry_count).toBe(1);

    const fail2 = workQueue.failTicket(fail1.id, 'Error 2');
    expect(fail2.status).toBe('pending');
    expect(fail2.retry_count).toBe(2);

    const fail3 = workQueue.failTicket(fail2.id, 'Error 3');
    expect(fail3.status).toBe('failed');
    expect(fail3.retry_count).toBe(3);
    expect(fail3.completed_at).toBeDefined();
  });

  test('UT-007: Get tickets by agent_id', () => {
    workQueue.createTicket({
      agent_id: 'link-logger-agent',
      content: 'Task 1',
      priority: 'P2'
    });

    workQueue.createTicket({
      agent_id: 'other-agent',
      content: 'Task 2',
      priority: 'P2'
    });

    workQueue.createTicket({
      agent_id: 'link-logger-agent',
      content: 'Task 3',
      priority: 'P1'
    });

    const tickets = workQueue.getTicketsByAgent('link-logger-agent');

    expect(tickets).toHaveLength(2);
    expect(tickets[0].agent_id).toBe('link-logger-agent');
    expect(tickets[1].agent_id).toBe('link-logger-agent');
  });

  test('UT-008: Filter pending tickets by agent_id', () => {
    workQueue.createTicket({
      agent_id: 'link-logger-agent',
      content: 'Task 1',
      priority: 'P2'
    });

    workQueue.createTicket({
      agent_id: 'other-agent',
      content: 'Task 2',
      priority: 'P1'
    });

    const pending = workQueue.getPendingTickets({ limit: 5, agent_id: 'link-logger-agent' });

    expect(pending).toHaveLength(1);
    expect(pending[0].agent_id).toBe('link-logger-agent');
  });
});
