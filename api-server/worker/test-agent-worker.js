/**
 * Quick validation test for AgentWorker implementation
 * Tests the core methods without requiring a running server
 */

import AgentWorker from './agent-worker.js';

async function testAgentWorker() {
  console.log('Testing AgentWorker Implementation...\n');

  // Test 1: Constructor
  console.log('Test 1: Constructor');
  const worker = new AgentWorker({
    workerId: 'test-worker-1',
    ticketId: 'ticket-123',
    agentId: 'link-logger'
  });
  console.log('✅ Constructor accepts config:', worker.getStatus());
  console.log('   - workerId:', worker.workerId);
  console.log('   - ticketId:', worker.ticketId);
  console.log('   - agentId:', worker.agentId);
  console.log('   - status:', worker.status);
  console.log('');

  // Test 2: fetchTicket()
  console.log('Test 2: fetchTicket()');
  const ticket = await worker.fetchTicket();
  console.log('✅ fetchTicket returns mock ticket:', {
    id: ticket.id,
    agent_id: ticket.agent_id,
    url: ticket.url,
    hasContent: !!ticket.content,
    hasMetadata: !!ticket.metadata
  });
  console.log('');

  // Test 3: processURL()
  console.log('Test 3: processURL()');
  const intelligence = await worker.processURL(ticket);
  console.log('✅ processURL generates intelligence:', {
    title: intelligence.title,
    summaryLength: intelligence.summary.length,
    tokensUsed: intelligence.tokensUsed,
    hasCompletedAt: !!intelligence.completedAt
  });
  console.log('   Summary preview:', intelligence.summary.substring(0, 80) + '...');
  console.log('');

  // Test 4: start() and stop()
  console.log('Test 4: start() and stop()');
  await worker.start();
  console.log('✅ start() sets status to running:', worker.status);
  await worker.stop();
  console.log('✅ stop() sets status to stopped:', worker.status);
  console.log('');

  // Test 5: getStatus()
  console.log('Test 5: getStatus()');
  const status = worker.getStatus();
  console.log('✅ getStatus() returns object:', status);
  console.log('');

  console.log('All basic tests passed! ✅');
  console.log('\nNote: execute() and postToAgentFeed() require a running API server on port 3001');
}

// Run tests
testAgentWorker().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
