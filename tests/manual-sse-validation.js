/**
 * Manual SSE Connection Validation
 * Tests real SSE connections to identify why backend shows 0 connections
 */

const EventSource = require('eventsource');
const fetch = require('node-fetch');

console.log('🧪 Manual SSE Connection Validation Starting...');

// Test 1: Direct connection to status SSE endpoint
console.log('\n📡 Test 1: Connecting to status SSE endpoint...');
const statusEventSource = new EventSource('http://localhost:3000/api/status/stream');

statusEventSource.onopen = (event) => {
  console.log('✅ Status SSE connection opened successfully');
};

statusEventSource.onmessage = (event) => {
  console.log('📨 Status SSE message received:', event.data);
};

statusEventSource.onerror = (error) => {
  console.error('❌ Status SSE error:', error);
};

// Test 2: Create instance and connect to its terminal SSE
setTimeout(async () => {
  console.log('\n🚀 Test 2: Creating instance and testing terminal SSE...');
  
  try {
    const response = await fetch('http://localhost:3000/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: ['claude', '--dangerously-skip-permissions'],
        workingDirectory: '/workspaces/agent-feed'
      })
    });
    
    const data = await response.json();
    console.log('✅ Instance created:', data);
    
    if (data.success && data.instance) {
      const instanceId = data.instance.id;
      console.log(`🔗 Connecting to terminal SSE for instance: ${instanceId}`);
      
      const terminalEventSource = new EventSource(`http://localhost:3000/api/claude/instances/${instanceId}/terminal/stream`);
      
      terminalEventSource.onopen = (event) => {
        console.log(`✅ Terminal SSE connection opened for ${instanceId}`);
        
        // Test sending input after connection
        setTimeout(async () => {
          console.log(`⌨️ Sending test input to ${instanceId}...`);
          const inputResponse = await fetch(`http://localhost:3000/api/claude/instances/${instanceId}/terminal/input`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input: 'echo "Hello from manual test"' })
          });
          const inputResult = await inputResponse.json();
          console.log('✅ Input sent successfully:', inputResult);
        }, 1000);
      };
      
      terminalEventSource.onmessage = (event) => {
        console.log(`📨 Terminal SSE message from ${instanceId}:`, event.data);
      };
      
      terminalEventSource.onerror = (error) => {
        console.error(`❌ Terminal SSE error for ${instanceId}:`, error);
      };
      
      // Clean up after 10 seconds
      setTimeout(() => {
        console.log('\n🧹 Cleaning up connections...');
        statusEventSource.close();
        terminalEventSource.close();
        console.log('✅ Manual validation completed');
        process.exit(0);
      }, 10000);
    }
    
  } catch (error) {
    console.error('❌ Failed to create instance:', error);
    statusEventSource.close();
    process.exit(1);
  }
}, 2000);

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down manual validation...');
  statusEventSource.close();
  process.exit(0);
});