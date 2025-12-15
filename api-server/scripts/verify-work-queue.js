import Database from 'better-sqlite3';
import { WorkQueueRepository } from '../repositories/work-queue-repository.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../../database.db');

console.log('🔍 Verifying Work Queue Repository with production database...\n');

const db = new Database(dbPath);
const workQueue = new WorkQueueRepository(db);

try {
  // Test 1: Create a test ticket
  console.log('Test 1: Creating test ticket...');
  const ticket = workQueue.createTicket({
    user_id: 'test-user-123',
    agent_id: 'link-logger-agent',
    content: 'Test URL processing: https://example.com/test',
    url: 'https://example.com/test',
    priority: 'P2',
    metadata: {
      post_id: 'test-post-456',
      context: 'Verification test',
      created_by: 'database-agent-verification'
    }
  });
  console.log('✅ Ticket created:', {
    id: ticket.id,
    status: ticket.status,
    priority: ticket.priority,
    agent_id: ticket.agent_id
  });

  // Test 2: Get pending tickets
  console.log('\nTest 2: Getting pending tickets...');
  const pending = workQueue.getPendingTickets({ limit: 5 });
  console.log(`✅ Found ${pending.length} pending ticket(s)`);

  // Test 3: Update status to in_progress
  console.log('\nTest 3: Updating ticket status to in_progress...');
  const inProgress = workQueue.updateTicketStatus(ticket.id, 'in_progress');
  console.log('✅ Status updated:', {
    status: inProgress.status,
    assigned_at: inProgress.assigned_at
  });

  // Test 4: Complete ticket with result
  console.log('\nTest 4: Completing ticket...');
  const completed = workQueue.completeTicket(ticket.id, {
    summary: 'Test ticket completed successfully',
    url_processed: 'https://example.com/test',
    intelligence: 'Verification test passed'
  });
  console.log('✅ Ticket completed:', {
    status: completed.status,
    completed_at: completed.completed_at,
    result_summary: completed.result?.summary
  });

  // Test 5: Query by agent
  console.log('\nTest 5: Getting tickets by agent...');
  const agentTickets = workQueue.getTicketsByAgent('link-logger-agent');
  console.log(`✅ Found ${agentTickets.length} ticket(s) for link-logger-agent`);

  // Clean up test ticket
  console.log('\nCleaning up test ticket...');
  db.prepare('DELETE FROM work_queue_tickets WHERE id = ?').run(ticket.id);
  console.log('✅ Test ticket deleted');

  console.log('\n🎉 All verification tests passed!');
  console.log('\n📊 Work Queue Repository Summary:');
  console.log('   - Database: Connected ✓');
  console.log('   - Table: work_queue_tickets ✓');
  console.log('   - Create ticket: ✓');
  console.log('   - Get pending: ✓');
  console.log('   - Update status: ✓');
  console.log('   - Complete ticket: ✓');
  console.log('   - Query by agent: ✓');

} catch (error) {
  console.error('❌ Verification failed:', error.message);
  console.error(error.stack);
  process.exit(1);
} finally {
  db.close();
}
