/**
 * Work Queue Selector Compatibility Tests
 *
 * Tests that the work queue selector properly abstracts SQLite vs PostgreSQL:
 * 1. Mode detection (SQLite vs PostgreSQL)
 * 2. Repository interface compatibility
 * 3. createTicket() method compatibility
 * 4. getAllPendingTickets() method compatibility
 * 5. Method signatures match across both implementations
 *
 * Uses REAL database connections - NO MOCKS
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../../database.db');

let db;
let workQueueSelector;
let testTicketIds = [];

describe('Work Queue Selector - Compatibility Tests', () => {

  before(async () => {
    // Connect to real database
    db = new Database(DB_PATH);
    console.log('✅ Connected to SQLite database:', DB_PATH);

    // Import the selector
    workQueueSelector = (await import('../../api-server/config/work-queue-selector.js')).default;

    // Initialize selector
    workQueueSelector.initialize(db);
    console.log('✅ Work queue selector initialized');
  });

  after(async () => {
    // Cleanup test tickets
    for (const ticketId of testTicketIds) {
      try {
        db.prepare('DELETE FROM work_queue_tickets WHERE id = ?').run(ticketId);
      } catch (e) {
        console.warn('⚠️ Cleanup warning:', e.message);
      }
    }

    db.close();
    console.log('✅ Database closed');
  });

  it('should detect correct database mode (SQLite vs PostgreSQL)', async () => {
    const usePostgres = workQueueSelector.usePostgres;

    // Should be SQLite in test environment (USE_POSTGRES not set)
    assert.strictEqual(
      usePostgres,
      false,
      'Should use SQLite when USE_POSTGRES is not set'
    );

    console.log('✅ Mode detected: SQLite');
  });

  it('should provide repository instance via .repository getter', async () => {
    const repo = workQueueSelector.repository;

    assert.ok(repo, 'Repository should exist');
    assert.ok(typeof repo === 'object', 'Repository should be an object');

    // Check required methods exist
    const requiredMethods = [
      'createTicket',
      'getTicket',
      'getPendingTickets',
      'updateTicketStatus',
      'completeTicket',
      'failTicket',
      'getAllPendingTickets' // Orchestrator compatibility
    ];

    for (const method of requiredMethods) {
      assert.ok(
        typeof repo[method] === 'function',
        `Repository should have ${method}() method`
      );
    }

    console.log('✅ Repository has all required methods:', requiredMethods.join(', '));
  });

  it('should create ticket using repository.createTicket()', async () => {
    const repo = workQueueSelector.repository;

    const ticketData = {
      agent_id: 'test-agent',
      content: 'Test ticket content for selector test',
      priority: 'P2',
      post_id: 'test-post-123',
      metadata: {
        type: 'test',
        test_key: 'test_value'
      }
    };

    const ticket = repo.createTicket(ticketData);

    assert.ok(ticket, 'Ticket should be created');
    assert.ok(ticket.id, 'Ticket should have ID');
    assert.strictEqual(ticket.agent_id, ticketData.agent_id, 'Agent ID should match');
    assert.strictEqual(ticket.content, ticketData.content, 'Content should match');
    assert.strictEqual(ticket.priority, ticketData.priority, 'Priority should match');
    assert.strictEqual(ticket.status, 'pending', 'Status should be pending');
    assert.strictEqual(ticket.post_id, ticketData.post_id, 'Post ID should match');

    // Verify metadata is properly deserialized
    assert.ok(ticket.metadata, 'Ticket should have metadata object');
    assert.strictEqual(ticket.metadata.type, 'test', 'Metadata should be parsed');

    testTicketIds.push(ticket.id);

    console.log('✅ Ticket created:', {
      id: ticket.id,
      agent_id: ticket.agent_id,
      status: ticket.status,
      priority: ticket.priority
    });
  });

  it('should retrieve pending tickets using getPendingTickets()', async () => {
    const repo = workQueueSelector.repository;

    // Create test ticket
    const ticket = repo.createTicket({
      agent_id: 'test-agent-2',
      content: 'Test for getPendingTickets',
      priority: 'P1',
      post_id: 'test-post-456',
      metadata: { type: 'test' }
    });

    testTicketIds.push(ticket.id);

    // Get pending tickets
    const pendingTickets = repo.getPendingTickets({ limit: 10 });

    assert.ok(Array.isArray(pendingTickets), 'Should return array');
    assert.ok(pendingTickets.length > 0, 'Should have at least one ticket');

    // Find our ticket
    const foundTicket = pendingTickets.find(t => t.id === ticket.id);
    assert.ok(foundTicket, 'Should find our ticket');
    assert.strictEqual(foundTicket.status, 'pending', 'Ticket should be pending');

    console.log('✅ getPendingTickets() works:', {
      total: pendingTickets.length,
      found: !!foundTicket
    });
  });

  it('should retrieve pending tickets using getAllPendingTickets() (orchestrator compatibility)', async () => {
    const repo = workQueueSelector.repository;

    // Create test ticket
    const ticket = repo.createTicket({
      agent_id: 'test-agent-3',
      content: 'Test for getAllPendingTickets',
      priority: 'P0',
      post_id: 'test-post-789',
      metadata: { type: 'test' }
    });

    testTicketIds.push(ticket.id);

    // Call orchestrator-compatible method
    const pendingTickets = await repo.getAllPendingTickets({ limit: 100 });

    assert.ok(Array.isArray(pendingTickets), 'Should return array');
    assert.ok(pendingTickets.length > 0, 'Should have at least one ticket');

    // Find our ticket
    const foundTicket = pendingTickets.find(t => t.id === ticket.id);
    assert.ok(foundTicket, 'Should find our ticket');
    assert.strictEqual(foundTicket.status, 'pending', 'Ticket should be pending');

    // Verify metadata is deserialized
    assert.ok(foundTicket.metadata, 'Ticket should have metadata object');
    assert.strictEqual(foundTicket.metadata.type, 'test', 'Metadata should be parsed');

    console.log('✅ getAllPendingTickets() works:', {
      total: pendingTickets.length,
      found: !!foundTicket,
      metadata_parsed: !!foundTicket.metadata
    });
  });

  it('should update ticket status correctly', async () => {
    const repo = workQueueSelector.repository;

    // Create test ticket
    const ticket = repo.createTicket({
      agent_id: 'test-agent-4',
      content: 'Test for status update',
      priority: 'P2',
      post_id: 'test-post-status',
      metadata: { type: 'test' }
    });

    testTicketIds.push(ticket.id);

    assert.strictEqual(ticket.status, 'pending', 'Initial status should be pending');

    // Update to in_progress
    const updated = repo.updateTicketStatus(ticket.id, 'in_progress');

    assert.strictEqual(updated.status, 'in_progress', 'Status should be updated');
    assert.ok(updated.assigned_at, 'Should have assigned_at timestamp');

    // Update to completed
    const completed = repo.updateTicketStatus(ticket.id, 'completed');

    assert.strictEqual(completed.status, 'completed', 'Status should be completed');
    assert.ok(completed.completed_at, 'Should have completed_at timestamp');

    console.log('✅ Status updates work:', {
      pending: ticket.status,
      in_progress: updated.status,
      completed: completed.status
    });
  });

  it('should complete ticket with result', async () => {
    const repo = workQueueSelector.repository;

    // Create test ticket
    const ticket = repo.createTicket({
      agent_id: 'test-agent-5',
      content: 'Test for completion',
      priority: 'P2',
      post_id: 'test-post-complete',
      metadata: { type: 'test' }
    });

    testTicketIds.push(ticket.id);

    // Complete with result
    const result = {
      success: true,
      output: 'Task completed successfully',
      tokensUsed: 1500
    };

    const completed = repo.completeTicket(ticket.id, result);

    assert.strictEqual(completed.status, 'completed', 'Status should be completed');
    assert.ok(completed.completed_at, 'Should have completed_at timestamp');
    assert.ok(completed.result, 'Should have result object');
    assert.strictEqual(completed.result.success, true, 'Result should match');
    assert.strictEqual(completed.result.output, result.output, 'Result output should match');

    console.log('✅ Ticket completion works:', {
      status: completed.status,
      result: completed.result
    });
  });

  it('should handle ticket failure with retry logic', async () => {
    const repo = workQueueSelector.repository;

    // Create test ticket
    const ticket = repo.createTicket({
      agent_id: 'test-agent-6',
      content: 'Test for failure',
      priority: 'P2',
      post_id: 'test-post-fail',
      metadata: { type: 'test' }
    });

    testTicketIds.push(ticket.id);

    // Fail ticket (retry #1)
    const failed1 = repo.failTicket(ticket.id, 'First error');
    assert.strictEqual(failed1.status, 'pending', 'Should retry (set to pending)');
    assert.strictEqual(failed1.retry_count, 1, 'Retry count should be 1');

    // Fail ticket (retry #2)
    const failed2 = repo.failTicket(ticket.id, 'Second error');
    assert.strictEqual(failed2.status, 'pending', 'Should retry (set to pending)');
    assert.strictEqual(failed2.retry_count, 2, 'Retry count should be 2');

    // Fail ticket (retry #3 - max retries)
    const failed3 = repo.failTicket(ticket.id, 'Third error');
    assert.strictEqual(failed3.status, 'failed', 'Should be permanently failed');
    assert.strictEqual(failed3.retry_count, 3, 'Retry count should be 3');

    console.log('✅ Retry logic works:', {
      retry1: failed1.status,
      retry2: failed2.status,
      retry3: failed3.status,
      final_count: failed3.retry_count
    });
  });

  it('should verify metadata JSON serialization/deserialization', async () => {
    const repo = workQueueSelector.repository;

    const complexMetadata = {
      type: 'comment',
      parent_post_id: 'post-123',
      parent_post_title: 'Test Post',
      parent_post_content: 'Test content',
      mentioned_users: ['user1', 'user2'],
      depth: 2,
      nested: {
        key1: 'value1',
        key2: 123,
        key3: true
      }
    };

    // Create ticket with complex metadata
    const ticket = repo.createTicket({
      agent_id: 'test-agent-7',
      content: 'Test for metadata',
      priority: 'P2',
      post_id: 'test-post-metadata',
      metadata: complexMetadata
    });

    testTicketIds.push(ticket.id);

    // Verify metadata is properly deserialized
    assert.ok(ticket.metadata, 'Ticket should have metadata object');
    assert.strictEqual(ticket.metadata.type, 'comment', 'Metadata type should match');
    assert.strictEqual(ticket.metadata.parent_post_id, 'post-123', 'Parent post ID should match');
    assert.deepStrictEqual(
      ticket.metadata.mentioned_users,
      ['user1', 'user2'],
      'Arrays should match'
    );
    assert.deepStrictEqual(
      ticket.metadata.nested,
      complexMetadata.nested,
      'Nested objects should match'
    );

    // Retrieve ticket again
    const retrieved = repo.getTicket(ticket.id);
    assert.deepStrictEqual(
      retrieved.metadata,
      complexMetadata,
      'Retrieved metadata should match original'
    );

    console.log('✅ Metadata serialization works:', {
      type: ticket.metadata.type,
      nested_keys: Object.keys(ticket.metadata.nested)
    });
  });

  it('should verify priority ordering in getAllPendingTickets()', async () => {
    const repo = workQueueSelector.repository;

    // Create tickets with different priorities
    const priorities = ['P3', 'P0', 'P2', 'P1'];
    const createdIds = [];

    for (const priority of priorities) {
      const ticket = repo.createTicket({
        agent_id: 'test-agent-priority',
        content: `Test ${priority}`,
        priority: priority,
        post_id: `test-post-${priority}`,
        metadata: { type: 'test' }
      });
      createdIds.push(ticket.id);
      testTicketIds.push(ticket.id);
    }

    // Get pending tickets
    const pendingTickets = await repo.getAllPendingTickets({ limit: 100 });

    // Filter to our test tickets
    const ourTickets = pendingTickets.filter(t => createdIds.includes(t.id));

    // Verify order: P0, P1, P2, P3
    const priorityOrder = ourTickets.map(t => t.priority);

    assert.strictEqual(priorityOrder[0], 'P0', 'First should be P0');
    assert.strictEqual(priorityOrder[1], 'P1', 'Second should be P1');
    assert.strictEqual(priorityOrder[2], 'P2', 'Third should be P2');
    assert.strictEqual(priorityOrder[3], 'P3', 'Fourth should be P3');

    console.log('✅ Priority ordering correct:', priorityOrder.join(' → '));
  });

  it('should verify both repositories implement same interface', async () => {
    // Import both repositories
    const { WorkQueueRepository: SQLiteRepo } = await import('../../api-server/repositories/work-queue-repository.js');
    const PostgresRepo = (await import('../../api-server/repositories/postgres/work-queue.repository.js')).default;

    // Get methods from SQLite repository
    const sqliteMethods = Object.getOwnPropertyNames(SQLiteRepo.prototype)
      .filter(name => name !== 'constructor' && typeof SQLiteRepo.prototype[name] === 'function');

    // Get static methods from PostgreSQL repository
    const postgresMethods = Object.getOwnPropertyNames(PostgresRepo)
      .filter(name => typeof PostgresRepo[name] === 'function');

    console.log('SQLite methods:', sqliteMethods);
    console.log('PostgreSQL methods:', postgresMethods);

    // Critical methods that must exist in both
    const criticalMethods = [
      'createTicket',
      'getTicket',
      'getPendingTickets',
      'updateTicketStatus',
      'completeTicket',
      'failTicket',
      'getAllPendingTickets' // Orchestrator compatibility
    ];

    for (const method of criticalMethods) {
      assert.ok(
        sqliteMethods.includes(method),
        `SQLite repository should have ${method}()`
      );

      assert.ok(
        postgresMethods.includes(method),
        `PostgreSQL repository should have ${method}()`
      );
    }

    console.log('✅ Both repositories implement the same interface');
    console.log('   Critical methods:', criticalMethods.join(', '));
  });
});
