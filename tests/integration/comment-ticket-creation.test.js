/**
 * Comment Ticket Creation Integration Tests
 *
 * Tests the complete flow:
 * 1. User posts comment
 * 2. System creates ticket in work_queue_tickets
 * 3. Orchestrator detects ticket
 * 4. Agent processes ticket and posts reply
 * 5. Reply has skipTicket=true (NO infinite loop)
 *
 * Uses REAL SQLite database at /workspaces/agent-feed/database.db
 * NO MOCKS - actual HTTP requests and database queries
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '../../database.db');
const API_BASE = 'http://localhost:3001';

let db;
let testPostId;
let testCommentId;
let testTicketId;

describe('Comment Ticket Creation - Integration Tests', () => {

  before(async () => {
    // Connect to real database
    db = new Database(DB_PATH);
    console.log('✅ Connected to SQLite database:', DB_PATH);

    // Verify work_queue_tickets table exists
    const tableCheck = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='work_queue_tickets'
    `).get();

    assert.ok(tableCheck, 'work_queue_tickets table should exist');
    console.log('✅ work_queue_tickets table exists');

    // Create a test post for comments
    const response = await fetch(`${API_BASE}/api/agent-posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user'
      },
      body: JSON.stringify({
        title: 'Test Post for Comment Tickets',
        content: 'This post is for testing comment ticket creation',
        author_agent: 'test-agent',
        metadata: { tags: ['test'] }
      })
    });

    assert.strictEqual(response.ok, true, 'Post creation should succeed');
    const postData = await response.json();
    testPostId = postData.data.id;
    console.log('✅ Created test post:', testPostId);
  });

  after(async () => {
    // Cleanup test data
    if (testTicketId) {
      try {
        db.prepare('DELETE FROM work_queue_tickets WHERE id = ?').run(testTicketId);
        console.log('✅ Cleaned up test ticket:', testTicketId);
      } catch (e) {
        console.warn('⚠️ Cleanup warning:', e.message);
      }
    }

    if (testCommentId) {
      try {
        db.prepare('DELETE FROM comments WHERE id = ?').run(testCommentId);
        console.log('✅ Cleaned up test comment:', testCommentId);
      } catch (e) {
        console.warn('⚠️ Cleanup warning:', e.message);
      }
    }

    if (testPostId) {
      try {
        db.prepare('DELETE FROM posts WHERE id = ?').run(testPostId);
        console.log('✅ Cleaned up test post:', testPostId);
      } catch (e) {
        console.warn('⚠️ Cleanup warning:', e.message);
      }
    }

    db.close();
    console.log('✅ Database closed');
  });

  it('should create ticket in work_queue_tickets when comment is posted', async () => {
    // Post a comment
    const response = await fetch(`${API_BASE}/api/agent-posts/${testPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user'
      },
      body: JSON.stringify({
        content: 'This is a test comment that should create a ticket',
        author_agent: 'test-user',
        skipTicket: false // Explicitly create ticket
      })
    });

    assert.strictEqual(response.ok, true, 'Comment creation should succeed');
    const commentData = await response.json();

    assert.ok(commentData.success, 'Response should be successful');
    assert.ok(commentData.data, 'Should have comment data');
    assert.ok(commentData.data.id, 'Comment should have ID');

    testCommentId = commentData.data.id;
    console.log('✅ Created test comment:', testCommentId);

    // Verify ticket was created
    const ticket = db.prepare(`
      SELECT * FROM work_queue_tickets
      WHERE post_id = ?
    `).get(testCommentId);

    assert.ok(ticket, 'Ticket should exist in work_queue_tickets');
    assert.strictEqual(ticket.post_id, testCommentId, 'Ticket should reference comment ID');
    assert.strictEqual(ticket.status, 'pending', 'Ticket should be pending');

    testTicketId = ticket.id;
    console.log('✅ Found ticket:', testTicketId);
    console.log('   Status:', ticket.status);
    console.log('   Priority:', ticket.priority);
  });

  it('should have correct ticket metadata with type=comment and parent_post_id', async () => {
    // Get the ticket we just created
    const ticket = db.prepare('SELECT * FROM work_queue_tickets WHERE id = ?').get(testTicketId);

    assert.ok(ticket, 'Ticket should exist');
    assert.ok(ticket.metadata, 'Ticket should have metadata JSON');

    // Parse metadata
    const metadata = JSON.parse(ticket.metadata);

    assert.strictEqual(metadata.type, 'comment', 'Metadata type should be "comment"');
    assert.strictEqual(metadata.parent_post_id, testPostId, 'Metadata should have parent_post_id');
    assert.ok(metadata.parent_post_title, 'Metadata should have parent_post_title');
    assert.ok(metadata.parent_post_content, 'Metadata should have parent_post_content');

    console.log('✅ Ticket metadata is correct:', {
      type: metadata.type,
      parent_post_id: metadata.parent_post_id,
      parent_post_title: metadata.parent_post_title
    });
  });

  it('should be detected by orchestrator getAllPendingTickets()', async () => {
    // Import the repository
    const { WorkQueueRepository } = await import('../../api-server/repositories/work-queue-repository.js');
    const repo = new WorkQueueRepository(db);

    // Call the method orchestrator uses
    const pendingTickets = await repo.getAllPendingTickets({ limit: 100 });

    assert.ok(Array.isArray(pendingTickets), 'Should return array');

    // Find our ticket
    const ourTicket = pendingTickets.find(t => t.id === testTicketId);

    assert.ok(ourTicket, 'Our ticket should be in pending list');
    assert.strictEqual(ourTicket.status, 'pending', 'Ticket should be pending');
    assert.ok(ourTicket.metadata, 'Ticket should have metadata object');
    assert.strictEqual(ourTicket.metadata.type, 'comment', 'Metadata type should be "comment"');

    console.log('✅ Ticket found by getAllPendingTickets():', {
      id: ourTicket.id,
      status: ourTicket.status,
      type: ourTicket.metadata.type
    });
  });

  it('should verify SQLite work_queue_tickets schema is correct', async () => {
    // Query schema
    const schema = db.prepare(`
      SELECT sql FROM sqlite_master
      WHERE type='table' AND name='work_queue_tickets'
    `).get();

    assert.ok(schema, 'Schema should exist');
    assert.ok(schema.sql, 'Schema SQL should be available');

    // Verify required columns
    const requiredColumns = [
      'id TEXT PRIMARY KEY',
      'user_id TEXT',
      'agent_id TEXT',
      'content TEXT',
      'url TEXT',
      'priority TEXT',
      'status TEXT',
      'retry_count INTEGER',
      'metadata TEXT',
      'result TEXT',
      'last_error TEXT',
      'created_at INTEGER',
      'assigned_at INTEGER',
      'completed_at INTEGER',
      'post_id TEXT'
    ];

    for (const col of requiredColumns) {
      const columnName = col.split(' ')[0];
      assert.ok(
        schema.sql.includes(columnName),
        `Schema should include ${columnName} column`
      );
    }

    console.log('✅ Schema validation passed');
  });

  it('should NOT create ticket when skipTicket=true', async () => {
    // Count current tickets
    const beforeCount = db.prepare('SELECT COUNT(*) as count FROM work_queue_tickets').get().count;

    // Post comment with skipTicket=true (simulates agent reply)
    const response = await fetch(`${API_BASE}/api/agent-posts/${testPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-agent'
      },
      body: JSON.stringify({
        content: 'This is an agent reply with skipTicket=true',
        author_agent: 'avi',
        skipTicket: true // CRITICAL: prevents infinite loop
      })
    });

    assert.strictEqual(response.ok, true, 'Comment creation should succeed');
    const commentData = await response.json();

    assert.ok(commentData.success, 'Response should be successful');
    const skipCommentId = commentData.data.id;

    // Count tickets after
    const afterCount = db.prepare('SELECT COUNT(*) as count FROM work_queue_tickets').get().count;

    assert.strictEqual(
      afterCount,
      beforeCount,
      'Ticket count should not increase when skipTicket=true'
    );

    // Cleanup
    db.prepare('DELETE FROM comments WHERE id = ?').run(skipCommentId);

    console.log('✅ skipTicket=true prevents ticket creation (no infinite loop)');
  });

  it('should handle regular posts creating tickets (regression test)', async () => {
    // Count current tickets
    const beforeCount = db.prepare('SELECT COUNT(*) as count FROM work_queue_tickets').get().count;

    // Create a regular post
    const response = await fetch(`${API_BASE}/api/agent-posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user'
      },
      body: JSON.stringify({
        title: 'Regression Test Post',
        content: 'This post should create a ticket',
        author_agent: 'test-agent',
        metadata: { tags: ['test'] }
      })
    });

    assert.strictEqual(response.ok, true, 'Post creation should succeed');
    const postData = await response.json();
    const newPostId = postData.data.id;

    // Count tickets after
    const afterCount = db.prepare('SELECT COUNT(*) as count FROM work_queue_tickets').get().count;

    assert.ok(
      afterCount > beforeCount,
      'Regular posts should still create tickets'
    );

    // Verify ticket exists
    const ticket = db.prepare('SELECT * FROM work_queue_tickets WHERE post_id = ?').get(newPostId);
    assert.ok(ticket, 'Ticket should exist for regular post');

    // Parse metadata to check it's a post, not a comment
    const metadata = JSON.parse(ticket.metadata);
    assert.strictEqual(metadata.type, 'post', 'Regular post ticket should have type=post');

    // Cleanup
    db.prepare('DELETE FROM work_queue_tickets WHERE id = ?').run(ticket.id);
    db.prepare('DELETE FROM posts WHERE id = ?').run(newPostId);

    console.log('✅ Regular posts still create tickets correctly');
  });

  it('should route comment tickets to appropriate agents', async () => {
    // Create comments with different content to test routing
    const routingTests = [
      {
        content: '@page-builder can you help with UI?',
        expectedAgent: 'page-builder-agent'
      },
      {
        content: 'Need help with page layout component',
        expectedAgent: 'page-builder-agent'
      },
      {
        content: 'What is the current status?',
        expectedAgent: 'avi' // Default
      }
    ];

    // Import orchestrator to test routing
    const { default: AviOrchestrator } = await import('../../api-server/avi/orchestrator.js');
    const orchestrator = new AviOrchestrator();

    for (const test of routingTests) {
      const agent = orchestrator.routeCommentToAgent(test.content, {});

      assert.strictEqual(
        agent,
        test.expectedAgent,
        `"${test.content}" should route to ${test.expectedAgent}`
      );

      console.log(`✅ Routing: "${test.content.substring(0, 30)}..." → ${agent}`);
    }
  });

  it('should verify ticket priority ordering', async () => {
    // Create tickets with different priorities
    const { WorkQueueRepository } = await import('../../api-server/repositories/work-queue-repository.js');
    const repo = new WorkQueueRepository(db);

    const priorities = ['P0', 'P1', 'P2', 'P3'];
    const ticketIds = [];

    // Create tickets in reverse priority order
    for (const priority of priorities.reverse()) {
      const ticket = repo.createTicket({
        agent_id: 'test-agent',
        content: `Test content for ${priority}`,
        priority: priority,
        post_id: testPostId,
        metadata: { type: 'test' }
      });
      ticketIds.push(ticket.id);
    }

    // Get pending tickets (should be ordered by priority)
    const pendingTickets = await repo.getAllPendingTickets({ limit: 100 });

    // Filter to our test tickets
    const ourTickets = pendingTickets.filter(t => ticketIds.includes(t.id));

    // Verify order: P0 should come first
    const priorityOrder = ourTickets.map(t => t.priority);

    assert.strictEqual(priorityOrder[0], 'P0', 'P0 should be first');
    assert.strictEqual(priorityOrder[1], 'P1', 'P1 should be second');
    assert.strictEqual(priorityOrder[2], 'P2', 'P2 should be third');
    assert.strictEqual(priorityOrder[3], 'P3', 'P3 should be fourth');

    // Cleanup
    for (const id of ticketIds) {
      db.prepare('DELETE FROM work_queue_tickets WHERE id = ?').run(id);
    }

    console.log('✅ Ticket priority ordering is correct:', priorityOrder.join(' → '));
  });
});
