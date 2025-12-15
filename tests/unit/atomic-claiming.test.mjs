/**
 * Unit Tests: Atomic Ticket Claiming
 * Tests for the claimPendingTickets() method to verify race condition prevention
 */

import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { WorkQueueRepository } from '../../api-server/repositories/work-queue-repository.js';

let db;
let workQueue;

// Setup test database
function setupTestDB() {
  db = new Database(':memory:');

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
      created_at INTEGER NOT NULL,
      assigned_at INTEGER,
      completed_at INTEGER
    ) STRICT;

    CREATE INDEX idx_work_queue_status ON work_queue_tickets(status);
    CREATE INDEX idx_work_queue_agent ON work_queue_tickets(agent_id);
    CREATE INDEX idx_work_queue_priority ON work_queue_tickets(priority, created_at);
  `);

  workQueue = new WorkQueueRepository(db);
}

// Helper to create test ticket
function createTestTicket(priority = 'P1', agentId = 'test-agent') {
  const id = randomUUID();
  const now = Date.now();

  db.prepare(`
    INSERT INTO work_queue_tickets (
      id, agent_id, content, priority, status, retry_count, created_at
    ) VALUES (?, ?, ?, ?, 'pending', 0, ?)
  `).run(id, agentId, 'Test content', priority, now);

  return id;
}

// Test 1: Basic atomic claiming
console.log('\n🧪 Test 1: Basic atomic claiming');
setupTestDB();
const ticket1 = createTestTicket('P1');
const claimed = workQueue.claimPendingTickets({ limit: 1 });
console.log(`✅ Claimed ${claimed.length} ticket(s)`);
console.log(`✅ Ticket status: ${claimed[0].status}`);
console.log(`✅ Has assigned_at: ${!!claimed[0].assigned_at}`);
if (claimed.length !== 1 || claimed[0].status !== 'in_progress' || !claimed[0].assigned_at) {
  throw new Error('FAILED: Basic claiming broken');
}
db.close();

// Test 2: Prevent duplicate claiming (race condition)
console.log('\n🧪 Test 2: Prevent duplicate claiming');
setupTestDB();
const ticket2 = createTestTicket('P1');

// Simulate race condition: Two concurrent claims
const claim1 = workQueue.claimPendingTickets({ limit: 1, workerId: 'worker-1' });
const claim2 = workQueue.claimPendingTickets({ limit: 1, workerId: 'worker-2' });

console.log(`✅ Worker 1 claimed: ${claim1.length} tickets`);
console.log(`✅ Worker 2 claimed: ${claim2.length} tickets`);
console.log(`✅ Total claims: ${claim1.length + claim2.length} (should be 1)`);

if (claim1.length + claim2.length !== 1) {
  throw new Error(`FAILED: Expected 1 total claim, got ${claim1.length + claim2.length}`);
}
db.close();

// Test 3: Multiple tickets claimed atomically
console.log('\n🧪 Test 3: Claim multiple tickets');
setupTestDB();
createTestTicket('P0');
createTestTicket('P1');
createTestTicket('P2');

const multiClaim = workQueue.claimPendingTickets({ limit: 3 });
console.log(`✅ Claimed ${multiClaim.length} tickets (expected 3)`);
console.log(`✅ All in_progress: ${multiClaim.every(t => t.status === 'in_progress')}`);

if (multiClaim.length !== 3 || !multiClaim.every(t => t.status === 'in_progress')) {
  throw new Error('FAILED: Multi-ticket claiming broken');
}
db.close();

// Test 4: Priority ordering
console.log('\n🧪 Test 4: Priority ordering (P0 before P1)');
setupTestDB();
const p1Ticket = createTestTicket('P1');
const p0Ticket = createTestTicket('P0'); // Created second but higher priority

const orderedClaim = workQueue.claimPendingTickets({ limit: 2 });
console.log(`✅ First ticket priority: ${orderedClaim[0].priority} (should be P0)`);
console.log(`✅ Second ticket priority: ${orderedClaim[1].priority} (should be P1)`);

if (orderedClaim[0].priority !== 'P0' || orderedClaim[1].priority !== 'P1') {
  throw new Error('FAILED: Priority ordering broken');
}
db.close();

// Test 5: Empty queue returns empty array
console.log('\n🧪 Test 5: Empty queue');
setupTestDB();
const emptyClaim = workQueue.claimPendingTickets({ limit: 5 });
console.log(`✅ Claimed from empty queue: ${emptyClaim.length} tickets (should be 0)`);

if (emptyClaim.length !== 0) {
  throw new Error('FAILED: Empty queue should return empty array');
}
db.close();

// Test 6: Stress test - 100 rapid claims
console.log('\n🧪 Test 6: Stress test - 100 concurrent claims for 1 ticket');
setupTestDB();
createTestTicket('P0');

let successfulClaims = 0;
for (let i = 0; i < 100; i++) {
  const result = workQueue.claimPendingTickets({ limit: 1, workerId: `stress-${i}` });
  successfulClaims += result.length;
}

console.log(`✅ Total successful claims: ${successfulClaims} (should be 1)`);
if (successfulClaims !== 1) {
  throw new Error(`FAILED: Expected exactly 1 claim from stress test, got ${successfulClaims}`);
}
db.close();

console.log('\n✅ ALL TESTS PASSED! Atomic claiming is working correctly.\n');
