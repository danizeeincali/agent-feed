/**
 * Enhanced SSE Status Broadcasting and Terminal Command Processing Test
 * Tests both status updates and complete terminal command processing
 */

const EventSource = require('eventsource');
const fetch = require('node-fetch');

async function testEnhancedSSEAndTerminal() {
  console.log('🧪 Testing Enhanced SSE Status Broadcasting & Terminal Command Processing\n');

  try {
    // 1. Create new instance and watch for status broadcasts
    console.log('📡 Step 1: Creating new instance...');
    const createResponse = await fetch('http://localhost:3000/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: ['claude', '--test-enhanced'],
        workingDirectory: '/workspaces/agent-feed/test'
      })
    });

    const instanceData = await createResponse.json();
    const instanceId = instanceData.instanceId;
    console.log(`✅ Instance created: ${instanceId} (${instanceData.instance.name})`);
    console.log(`🔄 Initial status: ${instanceData.instance.status}`);

    // 2. Connect to SSE stream to monitor status changes
    console.log('\n📡 Step 2: Connecting to SSE stream...');
    const eventSource = new EventSource(`http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`);
    
    let statusUpdates = [];
    let terminalOutputs = [];

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(`📨 SSE Event: ${data.type} - ${JSON.stringify(data)}`);
      
      if (data.type === 'instance:status') {
        statusUpdates.push(data);
      } else if (data.type === 'terminal:echo' || data.type === 'terminal:output') {
        terminalOutputs.push(data);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE Error:', error);
    };

    // 3. Wait for connection and initial status updates
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 4. Test terminal command processing with various commands
    console.log('\n⌨️  Step 3: Testing enhanced terminal commands...');
    
    const testCommands = [
      'hello',
      'help', 
      'echo Enhanced command processing works!',
      'ls',
      'pwd',
      'whoami',
      'status',
      'date',
      'uptime',
      'nonexistent_command'
    ];

    for (const command of testCommands) {
      console.log(`\n🔄 Testing command: "${command}"`);
      
      const response = await fetch(`http://localhost:3000/api/claude/instances/${instanceId}/terminal/input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: command })
      });

      const result = await response.json();
      console.log(`✅ Response: ${result.response}`);
      console.log(`📊 Processed: ${result.processed}`);
      
      // Small delay to see SSE events
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 5. Wait for all SSE events to arrive
    console.log('\n⏳ Step 4: Waiting for all SSE events...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 6. Test instance deletion and status broadcast
    console.log('\n🗑️  Step 5: Testing instance deletion...');
    const deleteResponse = await fetch(`http://localhost:3000/api/claude/instances/${instanceId}`, {
      method: 'DELETE'
    });

    const deleteResult = await deleteResponse.json();
    console.log(`✅ Instance deleted: ${deleteResult.message}`);

    // 7. Wait for final status update
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 8. Close SSE connection
    eventSource.close();

    // 9. Display results summary
    console.log('\n📊 RESULTS SUMMARY:');
    console.log(`🔄 Status updates received: ${statusUpdates.length}`);
    console.log(`⌨️  Terminal interactions: ${terminalOutputs.length}`);
    
    console.log('\n📡 Status Updates:');
    statusUpdates.forEach((update, i) => {
      console.log(`  ${i + 1}. ${update.status} - ${update.timestamp}`);
    });
    
    console.log('\n⌨️  Terminal Interactions Summary:');
    console.log(`  - Echo events: ${terminalOutputs.filter(t => t.type === 'terminal:echo').length}`);
    console.log(`  - Output events: ${terminalOutputs.filter(t => t.type === 'terminal:output').length}`);

    // 10. Validation
    const hasStartingStatus = statusUpdates.some(s => s.status === 'starting');
    const hasRunningStatus = statusUpdates.some(s => s.status === 'running');
    const hasStoppedStatus = statusUpdates.some(s => s.status === 'stopped');
    const hasTerminalInteractions = terminalOutputs.length > 0;

    console.log('\n✅ VALIDATION RESULTS:');
    console.log(`✅ Starting status broadcast: ${hasStartingStatus ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Running status broadcast: ${hasRunningStatus ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Stopped status broadcast: ${hasStoppedStatus ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Terminal command processing: ${hasTerminalInteractions ? 'PASS' : 'FAIL'}`);

    const allPassed = hasStartingStatus && hasRunningStatus && hasStoppedStatus && hasTerminalInteractions;
    console.log(`\n🎉 OVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED!' : 'SOME TESTS FAILED'}`);

    return allPassed;

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testEnhancedSSEAndTerminal()
    .then(success => {
      console.log(`\n🏁 Test completed with ${success ? 'SUCCESS' : 'FAILURE'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test error:', error);
      process.exit(1);
    });
}

module.exports = { testEnhancedSSEAndTerminal };