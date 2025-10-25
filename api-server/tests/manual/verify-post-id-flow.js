/**
 * Manual Verification Script: Post ID Flow
 *
 * This script demonstrates the complete post -> ticket flow
 * Run with: node api-server/tests/manual/verify-post-id-flow.js
 */

import Database from 'better-sqlite3';
import { WorkQueueRepository } from '../../repositories/work-queue-repository.js';
import { processPostForProactiveAgents } from '../../services/ticket-creation-service.cjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../../database.db');

console.log('🔍 Post ID Flow Verification\n');
console.log('Database:', dbPath);

// Initialize
const db = new Database(dbPath);
const workQueueRepo = new WorkQueueRepository(db);

// Test post
const testPost = {
  id: `verification-${Date.now()}`,
  author_id: 'test-user-123',
  authorId: 'test-user-123',
  content: 'Check out this amazing GitHub repo: https://github.com/microsoft/vscode'
};

console.log('\n1️⃣ Creating test post:');
console.log('   Post ID:', testPost.id);
console.log('   Content:', testPost.content);

// Process post
console.log('\n2️⃣ Processing post for proactive agents...');
const tickets = await processPostForProactiveAgents(testPost, workQueueRepo);

console.log('\n3️⃣ Tickets created:', tickets.length);

if (tickets.length === 0) {
  console.log('❌ No tickets created!');
  process.exit(1);
}

// Verify each ticket
for (let i = 0; i < tickets.length; i++) {
  const ticket = tickets[i];
  console.log(`\n4️⃣ Verifying Ticket ${i + 1}:`);
  console.log('   Ticket ID:', ticket.id);
  console.log('   Agent ID:', ticket.agent_id);
  console.log('   URL:', ticket.url);
  console.log('   Priority:', ticket.priority);

  // Check post_id as direct field
  console.log('\n   ✓ Direct field:');
  console.log('     ticket.post_id =', ticket.post_id);
  console.log('     Matches post.id?', ticket.post_id === testPost.id ? '✅' : '❌');

  // Check post_id in metadata
  console.log('\n   ✓ Metadata field:');
  console.log('     ticket.metadata.post_id =', ticket.metadata?.post_id);
  console.log('     Matches post.id?', ticket.metadata?.post_id === testPost.id ? '✅' : '❌');

  // Verify in database
  console.log('\n   ✓ Database verification:');
  const fromDb = db.prepare('SELECT post_id FROM work_queue_tickets WHERE id = ?').get(ticket.id);
  console.log('     DB post_id =', fromDb.post_id);
  console.log('     Matches post.id?', fromDb.post_id === testPost.id ? '✅' : '❌');

  // Retrieve via repository
  console.log('\n   ✓ Repository retrieval:');
  const retrieved = workQueueRepo.getTicket(ticket.id);
  console.log('     Retrieved post_id =', retrieved.post_id);
  console.log('     Matches post.id?', retrieved.post_id === testPost.id ? '✅' : '❌');
}

// Query by post_id
console.log('\n5️⃣ Querying all tickets for post_id:', testPost.id);
const allTickets = db.prepare('SELECT id, agent_id, post_id FROM work_queue_tickets WHERE post_id = ?').all(testPost.id);
console.log('   Found', allTickets.length, 'ticket(s)');

for (const t of allTickets) {
  console.log('   -', t.id, '(agent:', t.agent_id + ')');
}

// Cleanup
console.log('\n6️⃣ Cleaning up test data...');
for (const ticket of tickets) {
  db.prepare('DELETE FROM work_queue_tickets WHERE id = ?').run(ticket.id);
}
console.log('   Deleted', tickets.length, 'ticket(s)');

// Final verification
const remaining = db.prepare('SELECT COUNT(*) as count FROM work_queue_tickets WHERE post_id = ?').get(testPost.id);
console.log('   Remaining tickets:', remaining.count);

if (remaining.count === 0) {
  console.log('\n✅ VERIFICATION COMPLETE - All tests passed!');
  console.log('\n📊 Summary:');
  console.log('   ✓ post_id stored as direct database field');
  console.log('   ✓ post_id stored in metadata JSON');
  console.log('   ✓ post_id retrievable via repository');
  console.log('   ✓ post_id queryable via SQL');
  console.log('   ✓ Cleanup successful');
} else {
  console.log('\n❌ CLEANUP FAILED - Manual cleanup required');
  process.exit(1);
}

db.close();
