/**
 * TDD Unit Tests: Atomic Ticket Claiming
 *
 * Test file for atomic claimPendingTickets() method implementation.
 * These tests verify transaction safety, race condition prevention,
 * and concurrent access handling.
 *
 * TARGET METHOD: claimPendingTickets(options)
 * - Returns pending tickets and atomically marks as 'in_progress'
 * - Uses database transaction (all-or-nothing)
 * - Prevents race conditions between SELECT and UPDATE
 * - Ensures no double-claiming in concurrent scenarios
 *
 * EXPECTED STATE: All tests will FAIL initially (RED phase)
 * The method claimPendingTickets() does not exist yet.
 */

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
        retry_count, metadata, post_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.post_id || null,
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

  _deserializeTicket(ticket) {
    return {
      ...ticket,
      metadata: ticket.metadata ? JSON.parse(ticket.metadata) : null,
      result: ticket.result ? JSON.parse(ticket.result) : null
    };
  }

  // ========================================================================
  // ATOMIC CLAIMING METHOD - TO BE IMPLEMENTED (TDD RED PHASE)
  // ========================================================================

  /**
   * Atomically claim pending tickets and mark as 'in_progress'
   *
   * This method MUST:
   * 1. Use a database transaction (BEGIN/COMMIT)
   * 2. SELECT tickets WHERE status = 'pending' (with limit)
   * 3. UPDATE those tickets to status = 'in_progress' (with assigned_at timestamp)
   * 4. Return the claimed tickets
   * 5. Prevent race conditions - no two calls can claim same ticket
   *
   * @param {Object} options - Claiming options
   * @param {number} [options.limit=5] - Maximum tickets to claim
   * @param {string} [options.agent_id] - Optional filter by agent_id
   * @param {string} [options.claimed_by] - Optional identifier for who claimed
   * @returns {Array} Claimed tickets (now status='in_progress')
   */
  claimPendingTickets({ limit = 5, agent_id = null, claimed_by = null } = {}) {
    // THIS METHOD DOES NOT EXIST YET - TESTS SHOULD FAIL
    throw new Error('claimPendingTickets() not implemented yet - TDD RED PHASE');
  }
}

describe('Work Queue Repository - Atomic Ticket Claiming (TDD)', () => {
  let db;
  let workQueue;

  beforeAll(() => {
    // Create test database
    db = new Database(':memory:');

    // Create work_queue_tickets table with claimed_by field
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
        post_id TEXT,
        claimed_by TEXT,
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

  // ========================================================================
  // GROUP 1: claimPendingTickets() Basic Functionality
  // ========================================================================

  describe('Group 1: Basic Claiming Functionality', () => {
    test('ATOMIC-001: claimPendingTickets() returns pending tickets and marks as in_progress', () => {
      // Arrange: Create 3 pending tickets
      const ticket1 = workQueue.createTicket({
        agent_id: 'test-agent',
        content: 'Task 1',
        priority: 'P2'
      });

      const ticket2 = workQueue.createTicket({
        agent_id: 'test-agent',
        content: 'Task 2',
        priority: 'P1'
      });

      const ticket3 = workQueue.createTicket({
        agent_id: 'test-agent',
        content: 'Task 3',
        priority: 'P0'
      });

      // Act: Claim tickets
      const claimed = workQueue.claimPendingTickets({ limit: 3 });

      // Assert: Returns 3 tickets, all marked as in_progress
      expect(claimed).toHaveLength(3);
      expect(claimed[0].status).toBe('in_progress');
      expect(claimed[1].status).toBe('in_progress');
      expect(claimed[2].status).toBe('in_progress');

      // Assert: Tickets ordered by priority (P0 > P1 > P2)
      expect(claimed[0].priority).toBe('P0');
      expect(claimed[1].priority).toBe('P1');
      expect(claimed[2].priority).toBe('P2');

      // Assert: All have assigned_at timestamp
      expect(claimed[0].assigned_at).toBeGreaterThan(0);
      expect(claimed[1].assigned_at).toBeGreaterThan(0);
      expect(claimed[2].assigned_at).toBeGreaterThan(0);
    });

    test('ATOMIC-002: claimPendingTickets() respects limit parameter', () => {
      // Arrange: Create 10 pending tickets
      for (let i = 0; i < 10; i++) {
        workQueue.createTicket({
          agent_id: 'test-agent',
          content: `Task ${i}`,
          priority: 'P2'
        });
      }

      // Act: Claim only 5 tickets
      const claimed = workQueue.claimPendingTickets({ limit: 5 });

      // Assert: Returns exactly 5 tickets
      expect(claimed).toHaveLength(5);

      // Assert: All claimed tickets are in_progress
      claimed.forEach(ticket => {
        expect(ticket.status).toBe('in_progress');
      });

      // Assert: 5 tickets still pending in database
      const remaining = workQueue.getPendingTickets({ limit: 10 });
      expect(remaining).toHaveLength(5);
    });

    test('ATOMIC-003: claimPendingTickets() returns empty array if no pending tickets', () => {
      // Arrange: No pending tickets

      // Act: Try to claim tickets
      const claimed = workQueue.claimPendingTickets({ limit: 5 });

      // Assert: Returns empty array
      expect(claimed).toEqual([]);
      expect(claimed).toHaveLength(0);
    });

    test('ATOMIC-004: claimPendingTickets() filters by agent_id when provided', () => {
      // Arrange: Create tickets for different agents
      workQueue.createTicket({
        agent_id: 'agent-A',
        content: 'Task for A',
        priority: 'P1'
      });

      workQueue.createTicket({
        agent_id: 'agent-B',
        content: 'Task for B',
        priority: 'P1'
      });

      workQueue.createTicket({
        agent_id: 'agent-A',
        content: 'Another task for A',
        priority: 'P2'
      });

      // Act: Claim tickets for agent-A only
      const claimed = workQueue.claimPendingTickets({
        limit: 10,
        agent_id: 'agent-A'
      });

      // Assert: Returns only agent-A tickets
      expect(claimed).toHaveLength(2);
      expect(claimed[0].agent_id).toBe('agent-A');
      expect(claimed[1].agent_id).toBe('agent-A');

      // Assert: Agent-B ticket still pending
      const pendingB = workQueue.getPendingTickets({ agent_id: 'agent-B' });
      expect(pendingB).toHaveLength(1);
      expect(pendingB[0].agent_id).toBe('agent-B');
    });

    test('ATOMIC-005: Claimed tickets do NOT appear in subsequent getPendingTickets() calls', () => {
      // Arrange: Create 5 pending tickets
      for (let i = 0; i < 5; i++) {
        workQueue.createTicket({
          agent_id: 'test-agent',
          content: `Task ${i}`,
          priority: 'P2'
        });
      }

      // Act: Claim 3 tickets
      const claimed = workQueue.claimPendingTickets({ limit: 3 });
      expect(claimed).toHaveLength(3);

      // Assert: Only 2 tickets still pending
      const pending = workQueue.getPendingTickets({ limit: 10 });
      expect(pending).toHaveLength(2);

      // Assert: Claimed ticket IDs not in pending list
      const pendingIds = pending.map(t => t.id);
      const claimedIds = claimed.map(t => t.id);

      claimedIds.forEach(id => {
        expect(pendingIds).not.toContain(id);
      });
    });
  });

  // ========================================================================
  // GROUP 2: Atomic Transaction Behavior
  // ========================================================================

  describe('Group 2: Atomic Transaction Behavior', () => {
    test('ATOMIC-006: Status update happens atomically (within transaction)', () => {
      // Arrange: Create pending ticket
      const ticket = workQueue.createTicket({
        agent_id: 'test-agent',
        content: 'Task 1',
        priority: 'P2'
      });

      // Act: Claim ticket
      const claimed = workQueue.claimPendingTickets({ limit: 1 });

      // Assert: Ticket returned from claim is already in_progress
      expect(claimed[0].status).toBe('in_progress');

      // Assert: Database state confirms in_progress (not pending)
      const dbTicket = workQueue.getTicket(ticket.id);
      expect(dbTicket.status).toBe('in_progress');

      // Assert: No race window - ticket not in pending list
      const pending = workQueue.getPendingTickets({ limit: 10 });
      expect(pending).toHaveLength(0);
    });

    test('ATOMIC-007: Transaction rollback on error leaves tickets in pending state', () => {
      // This test verifies transaction safety if an error occurs
      // Note: Actual implementation will need transaction wrapping

      // Arrange: Create tickets
      const ticket1 = workQueue.createTicket({
        agent_id: 'test-agent',
        content: 'Task 1',
        priority: 'P2'
      });

      const ticket2 = workQueue.createTicket({
        agent_id: 'test-agent',
        content: 'Task 2',
        priority: 'P1'
      });

      // Act & Assert: If claim fails, tickets should remain pending
      // (This test will be enhanced once implementation exists)
      try {
        // Force an error scenario (will be implemented in GREEN phase)
        workQueue.claimPendingTickets({ limit: 2 });
      } catch (error) {
        // On error, tickets should still be pending
        const pending = workQueue.getPendingTickets({ limit: 10 });
        expect(pending).toHaveLength(2);
        expect(pending[0].status).toBe('pending');
        expect(pending[1].status).toBe('pending');
      }
    });

    test('ATOMIC-008: assigned_at timestamp set during transaction', () => {
      // Arrange: Create ticket
      const ticket = workQueue.createTicket({
        agent_id: 'test-agent',
        content: 'Task 1',
        priority: 'P2'
      });

      const beforeClaim = Date.now();

      // Act: Claim ticket
      const claimed = workQueue.claimPendingTickets({ limit: 1 });

      const afterClaim = Date.now();

      // Assert: assigned_at is set and within expected range
      expect(claimed[0].assigned_at).toBeGreaterThanOrEqual(beforeClaim);
      expect(claimed[0].assigned_at).toBeLessThanOrEqual(afterClaim);

      // Assert: Database confirms assigned_at
      const dbTicket = workQueue.getTicket(ticket.id);
      expect(dbTicket.assigned_at).toBe(claimed[0].assigned_at);
    });
  });

  // ========================================================================
  // GROUP 3: Race Condition Prevention
  // ========================================================================

  describe('Group 3: Race Condition Prevention', () => {
    test('ATOMIC-009: Concurrent claims do not claim the same ticket', () => {
      // Arrange: Create 5 pending tickets
      for (let i = 0; i < 5; i++) {
        workQueue.createTicket({
          agent_id: 'test-agent',
          content: `Task ${i}`,
          priority: 'P2'
        });
      }

      // Act: Simulate concurrent claiming (sequential for now, will test concurrency)
      const claim1 = workQueue.claimPendingTickets({ limit: 3 });
      const claim2 = workQueue.claimPendingTickets({ limit: 3 });

      // Assert: First claim gets 3 tickets
      expect(claim1).toHaveLength(3);

      // Assert: Second claim gets only 2 remaining tickets
      expect(claim2).toHaveLength(2);

      // Assert: No ticket appears in both claims
      const claim1Ids = claim1.map(t => t.id);
      const claim2Ids = claim2.map(t => t.id);

      claim1Ids.forEach(id => {
        expect(claim2Ids).not.toContain(id);
      });

      // Assert: All 5 tickets claimed, none pending
      const pending = workQueue.getPendingTickets({ limit: 10 });
      expect(pending).toHaveLength(0);
    });

    test('ATOMIC-010: Rapid polling does not double-claim tickets', () => {
      // Arrange: Create 10 pending tickets
      for (let i = 0; i < 10; i++) {
        workQueue.createTicket({
          agent_id: 'test-agent',
          content: `Task ${i}`,
          priority: 'P2'
        });
      }

      // Act: Simulate rapid polling (5 sequential claims)
      const allClaimed = [];
      for (let i = 0; i < 5; i++) {
        const claimed = workQueue.claimPendingTickets({ limit: 3 });
        allClaimed.push(...claimed);
      }

      // Assert: Exactly 10 tickets claimed (no duplicates)
      expect(allClaimed).toHaveLength(10);

      // Assert: All ticket IDs are unique
      const uniqueIds = new Set(allClaimed.map(t => t.id));
      expect(uniqueIds.size).toBe(10);

      // Assert: No pending tickets remain
      const pending = workQueue.getPendingTickets({ limit: 10 });
      expect(pending).toHaveLength(0);
    });

    test('ATOMIC-011: claimed_by field prevents duplicate claims', () => {
      // Arrange: Create tickets
      for (let i = 0; i < 5; i++) {
        workQueue.createTicket({
          agent_id: 'test-agent',
          content: `Task ${i}`,
          priority: 'P2'
        });
      }

      // Act: Claim with different claimed_by identifiers
      const worker1Claims = workQueue.claimPendingTickets({
        limit: 3,
        claimed_by: 'worker-1'
      });

      const worker2Claims = workQueue.claimPendingTickets({
        limit: 3,
        claimed_by: 'worker-2'
      });

      // Assert: Worker 1 claims 3 tickets
      expect(worker1Claims).toHaveLength(3);
      worker1Claims.forEach(ticket => {
        expect(ticket.claimed_by).toBe('worker-1');
      });

      // Assert: Worker 2 claims remaining 2 tickets
      expect(worker2Claims).toHaveLength(2);
      worker2Claims.forEach(ticket => {
        expect(ticket.claimed_by).toBe('worker-2');
      });

      // Assert: No overlap between claims
      const worker1Ids = worker1Claims.map(t => t.id);
      const worker2Ids = worker2Claims.map(t => t.id);

      worker1Ids.forEach(id => {
        expect(worker2Ids).not.toContain(id);
      });
    });
  });

  // ========================================================================
  // GROUP 4: Database State Verification
  // ========================================================================

  describe('Group 4: Database State Verification', () => {
    test('ATOMIC-012: Ticket status changes from pending to in_progress in database', () => {
      // Arrange: Create ticket
      const ticket = workQueue.createTicket({
        agent_id: 'test-agent',
        content: 'Task 1',
        priority: 'P2'
      });

      // Verify initial state
      expect(ticket.status).toBe('pending');
      expect(ticket.assigned_at).toBeNull();

      // Act: Claim ticket
      const claimed = workQueue.claimPendingTickets({ limit: 1 });

      // Assert: Database state changed
      const dbTicket = db.prepare('SELECT * FROM work_queue_tickets WHERE id = ?')
        .get(ticket.id);

      expect(dbTicket.status).toBe('in_progress');
      expect(dbTicket.assigned_at).toBeGreaterThan(0);
    });

    test('ATOMIC-013: assigned_at timestamp set correctly in database', () => {
      // Arrange: Create ticket
      const ticket = workQueue.createTicket({
        agent_id: 'test-agent',
        content: 'Task 1',
        priority: 'P2'
      });

      const beforeClaim = Date.now();

      // Act: Claim ticket
      workQueue.claimPendingTickets({ limit: 1 });

      const afterClaim = Date.now();

      // Assert: Database has assigned_at timestamp
      const dbTicket = db.prepare('SELECT assigned_at FROM work_queue_tickets WHERE id = ?')
        .get(ticket.id);

      expect(dbTicket.assigned_at).toBeDefined();
      expect(dbTicket.assigned_at).toBeGreaterThanOrEqual(beforeClaim);
      expect(dbTicket.assigned_at).toBeLessThanOrEqual(afterClaim);
    });

    test('ATOMIC-014: No pending tickets left after claiming all', () => {
      // Arrange: Create 5 pending tickets
      for (let i = 0; i < 5; i++) {
        workQueue.createTicket({
          agent_id: 'test-agent',
          content: `Task ${i}`,
          priority: 'P2'
        });
      }

      // Act: Claim all tickets
      workQueue.claimPendingTickets({ limit: 10 });

      // Assert: Database has no pending tickets
      const pendingCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM work_queue_tickets
        WHERE status = 'pending'
      `).get();

      expect(pendingCount.count).toBe(0);

      // Assert: All tickets are in_progress
      const inProgressCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM work_queue_tickets
        WHERE status = 'in_progress'
      `).get();

      expect(inProgressCount.count).toBe(5);
    });

    test('ATOMIC-015: claimed_by field populated correctly in database', () => {
      // Arrange: Create tickets
      for (let i = 0; i < 3; i++) {
        workQueue.createTicket({
          agent_id: 'test-agent',
          content: `Task ${i}`,
          priority: 'P2'
        });
      }

      // Act: Claim with claimed_by identifier
      const claimed = workQueue.claimPendingTickets({
        limit: 3,
        claimed_by: 'worker-alpha'
      });

      // Assert: Database has claimed_by field set
      claimed.forEach(ticket => {
        const dbTicket = db.prepare('SELECT claimed_by FROM work_queue_tickets WHERE id = ?')
          .get(ticket.id);

        expect(dbTicket.claimed_by).toBe('worker-alpha');
      });
    });
  });

  // ========================================================================
  // GROUP 5: Edge Cases
  // ========================================================================

  describe('Group 5: Edge Cases', () => {
    test('ATOMIC-016: Claiming when maxWorkers=1 (only 1 ticket)', () => {
      // Arrange: Create 5 pending tickets
      for (let i = 0; i < 5; i++) {
        workQueue.createTicket({
          agent_id: 'test-agent',
          content: `Task ${i}`,
          priority: 'P2'
        });
      }

      // Act: Claim only 1 ticket (simulating maxWorkers=1)
      const claimed = workQueue.claimPendingTickets({ limit: 1 });

      // Assert: Only 1 ticket claimed
      expect(claimed).toHaveLength(1);
      expect(claimed[0].status).toBe('in_progress');

      // Assert: 4 tickets still pending
      const pending = workQueue.getPendingTickets({ limit: 10 });
      expect(pending).toHaveLength(4);
    });

    test('ATOMIC-017: Claiming when maxWorkers=5 (multiple tickets)', () => {
      // Arrange: Create 10 pending tickets
      for (let i = 0; i < 10; i++) {
        workQueue.createTicket({
          agent_id: 'test-agent',
          content: `Task ${i}`,
          priority: 'P2'
        });
      }

      // Act: Claim 5 tickets (simulating maxWorkers=5)
      const claimed = workQueue.claimPendingTickets({ limit: 5 });

      // Assert: Exactly 5 tickets claimed
      expect(claimed).toHaveLength(5);

      // Assert: All claimed tickets are in_progress
      claimed.forEach(ticket => {
        expect(ticket.status).toBe('in_progress');
      });

      // Assert: 5 tickets still pending
      const pending = workQueue.getPendingTickets({ limit: 10 });
      expect(pending).toHaveLength(5);
    });

    test('ATOMIC-018: Claiming with no available tickets returns empty array', () => {
      // Arrange: No tickets created

      // Act: Try to claim tickets
      const claimed = workQueue.claimPendingTickets({ limit: 5 });

      // Assert: Returns empty array
      expect(claimed).toEqual([]);
      expect(claimed).toHaveLength(0);
    });

    test('ATOMIC-019: Claiming with partial availability (3 pending, limit 5)', () => {
      // Arrange: Create only 3 pending tickets
      for (let i = 0; i < 3; i++) {
        workQueue.createTicket({
          agent_id: 'test-agent',
          content: `Task ${i}`,
          priority: 'P2'
        });
      }

      // Act: Try to claim 5 tickets
      const claimed = workQueue.claimPendingTickets({ limit: 5 });

      // Assert: Only 3 tickets claimed (all available)
      expect(claimed).toHaveLength(3);

      // Assert: All claimed tickets are in_progress
      claimed.forEach(ticket => {
        expect(ticket.status).toBe('in_progress');
      });

      // Assert: No pending tickets remain
      const pending = workQueue.getPendingTickets({ limit: 10 });
      expect(pending).toHaveLength(0);
    });

    test('ATOMIC-020: Claiming respects priority ordering', () => {
      // Arrange: Create tickets with mixed priorities
      workQueue.createTicket({
        agent_id: 'test-agent',
        content: 'Low priority',
        priority: 'P3'
      });

      workQueue.createTicket({
        agent_id: 'test-agent',
        content: 'Critical',
        priority: 'P0'
      });

      workQueue.createTicket({
        agent_id: 'test-agent',
        content: 'High priority',
        priority: 'P1'
      });

      workQueue.createTicket({
        agent_id: 'test-agent',
        content: 'Medium priority',
        priority: 'P2'
      });

      // Act: Claim tickets
      const claimed = workQueue.claimPendingTickets({ limit: 10 });

      // Assert: Tickets claimed in priority order (P0, P1, P2, P3)
      expect(claimed[0].priority).toBe('P0');
      expect(claimed[1].priority).toBe('P1');
      expect(claimed[2].priority).toBe('P2');
      expect(claimed[3].priority).toBe('P3');
    });
  });

  // ========================================================================
  // GROUP 6: Concurrency Stress Tests
  // ========================================================================

  describe('Group 6: Concurrency Stress Tests', () => {
    test('ATOMIC-021: 100 rapid sequential claims do not double-claim', () => {
      // Arrange: Create 100 pending tickets
      for (let i = 0; i < 100; i++) {
        workQueue.createTicket({
          agent_id: 'test-agent',
          content: `Task ${i}`,
          priority: 'P2'
        });
      }

      // Act: Simulate 100 rapid polling calls
      const allClaimed = [];
      for (let i = 0; i < 100; i++) {
        const claimed = workQueue.claimPendingTickets({ limit: 1 });
        allClaimed.push(...claimed);
      }

      // Assert: Exactly 100 tickets claimed
      expect(allClaimed).toHaveLength(100);

      // Assert: All ticket IDs are unique
      const uniqueIds = new Set(allClaimed.map(t => t.id));
      expect(uniqueIds.size).toBe(100);

      // Assert: No pending tickets remain
      const pending = workQueue.getPendingTickets({ limit: 200 });
      expect(pending).toHaveLength(0);
    });

    test('ATOMIC-022: Multiple workers claiming simultaneously', () => {
      // Arrange: Create 30 pending tickets
      for (let i = 0; i < 30; i++) {
        workQueue.createTicket({
          agent_id: 'test-agent',
          content: `Task ${i}`,
          priority: 'P2'
        });
      }

      // Act: Simulate 3 workers claiming simultaneously (sequential for now)
      const worker1 = workQueue.claimPendingTickets({ limit: 10, claimed_by: 'worker-1' });
      const worker2 = workQueue.claimPendingTickets({ limit: 10, claimed_by: 'worker-2' });
      const worker3 = workQueue.claimPendingTickets({ limit: 10, claimed_by: 'worker-3' });

      // Assert: Total claimed is 30
      const totalClaimed = worker1.length + worker2.length + worker3.length;
      expect(totalClaimed).toBe(30);

      // Assert: No overlaps between workers
      const worker1Ids = new Set(worker1.map(t => t.id));
      const worker2Ids = new Set(worker2.map(t => t.id));
      const worker3Ids = new Set(worker3.map(t => t.id));

      // Check no intersection between sets
      worker1.forEach(ticket => {
        expect(worker2Ids.has(ticket.id)).toBe(false);
        expect(worker3Ids.has(ticket.id)).toBe(false);
      });

      worker2.forEach(ticket => {
        expect(worker3Ids.has(ticket.id)).toBe(false);
      });
    });

    test('ATOMIC-023: Claiming under high load (1000 tickets)', () => {
      // Arrange: Create 1000 pending tickets
      for (let i = 0; i < 1000; i++) {
        workQueue.createTicket({
          agent_id: 'test-agent',
          content: `Task ${i}`,
          priority: 'P2'
        });
      }

      // Act: Claim in batches of 50
      const allClaimed = [];
      while (allClaimed.length < 1000) {
        const claimed = workQueue.claimPendingTickets({ limit: 50 });
        if (claimed.length === 0) break;
        allClaimed.push(...claimed);
      }

      // Assert: All 1000 tickets claimed
      expect(allClaimed).toHaveLength(1000);

      // Assert: All unique IDs
      const uniqueIds = new Set(allClaimed.map(t => t.id));
      expect(uniqueIds.size).toBe(1000);

      // Assert: No pending tickets
      const pending = workQueue.getPendingTickets({ limit: 2000 });
      expect(pending).toHaveLength(0);
    });
  });
});
