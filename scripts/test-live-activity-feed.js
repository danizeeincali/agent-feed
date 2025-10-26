#!/usr/bin/env node
/**
 * Test script for LiveActivityFeed component
 * Validates SSE endpoint and broadcasts test events
 */

const http = require('http');

const API_BASE = process.env.API_URL || 'http://localhost:3000';
const STREAMING_ENDPOINT = `${API_BASE}/api/streaming-ticker/stream`;
const MESSAGE_ENDPOINT = `${API_BASE}/api/streaming-ticker/message`;

console.log('🧪 LiveActivityFeed Test Script\n');
console.log('Testing SSE endpoint:', STREAMING_ENDPOINT);
console.log('Testing message endpoint:', MESSAGE_ENDPOINT);
console.log('─'.repeat(60));

// Test 1: Check if SSE endpoint is accessible
console.log('\n✓ Test 1: SSE Connection...');
const testConnection = new Promise((resolve, reject) => {
  const url = new URL(STREAMING_ENDPOINT);
  const req = http.get({
    hostname: url.hostname,
    port: url.port || 3000,
    path: url.pathname + url.search,
    headers: {
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache'
    }
  }, (res) => {
    if (res.statusCode === 200) {
      console.log('  ✅ SSE endpoint is accessible');
      console.log('  Content-Type:', res.headers['content-type']);

      let dataReceived = false;
      res.on('data', (chunk) => {
        if (!dataReceived) {
          dataReceived = true;
          console.log('  ✅ Receiving SSE data');
          console.log('  Sample data:', chunk.toString().substring(0, 100) + '...');
          req.abort();
          resolve();
        }
      });

      setTimeout(() => {
        if (!dataReceived) {
          console.log('  ⚠️  No data received in 5 seconds');
          req.abort();
          resolve();
        }
      }, 5000);
    } else {
      console.log(`  ❌ Unexpected status code: ${res.statusCode}`);
      reject(new Error(`Status ${res.statusCode}`));
    }
  });

  req.on('error', (err) => {
    console.log('  ❌ Connection failed:', err.message);
    console.log('  💡 Make sure the backend server is running on port 3000');
    reject(err);
  });

  req.setTimeout(10000, () => {
    console.log('  ❌ Connection timeout');
    req.abort();
    reject(new Error('Timeout'));
  });
});

// Test 2: Send test events
async function sendTestEvent(eventData) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(eventData);
    const url = new URL(MESSAGE_ENDPOINT);

    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Run tests
(async () => {
  try {
    // Test SSE connection
    await testConnection;

    console.log('\n✓ Test 2: Broadcasting Test Events...');

    // Test tool execution event
    const toolEvent = {
      type: 'tool_execution',
      message: {
        tool: 'Bash',
        action: 'ls -la',
        status: 'success',
        duration: 125,
        priority: 'high',
        timestamp: new Date().toISOString()
      }
    };

    const result1 = await sendTestEvent(toolEvent);
    console.log('  ✅ Tool execution event broadcasted');
    console.log('  Clients reached:', result1.sentCount || 'N/A');

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test agent spawn event
    const agentEvent = {
      type: 'custom',
      message: JSON.stringify({
        type: 'agent_spawn',
        data: {
          agent_type: 'coder',
          action: 'spawned successfully',
          tokens_used: 1500,
          cost: 0.00375,
          priority: 'high',
          timestamp: new Date().toISOString()
        }
      }),
      priority: 'high'
    };

    const result2 = await sendTestEvent(agentEvent);
    console.log('  ✅ Agent spawn event broadcasted');
    console.log('  Clients reached:', result2.sentCount || 'N/A');

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test session metrics event
    const metricsEvent = {
      type: 'custom',
      message: JSON.stringify({
        type: 'session_metrics',
        data: {
          session_id: 'test-session-' + Date.now(),
          request_count: 42,
          total_tokens: 15000,
          total_cost: 0.0375,
          timestamp: new Date().toISOString()
        }
      })
    };

    const result3 = await sendTestEvent(metricsEvent);
    console.log('  ✅ Session metrics event broadcasted');
    console.log('  Clients reached:', result3.sentCount || 'N/A');

    console.log('\n' + '─'.repeat(60));
    console.log('✅ All tests completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Open http://localhost:5173/activity in your browser');
    console.log('2. Verify that the LiveActivityFeed component is displaying');
    console.log('3. Run this script again to see events appear in real-time');
    console.log('4. Check that filtering, session metrics, and styling work correctly\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Ensure backend server is running: npm run dev (in api-server/)');
    console.log('2. Check that port 3000 is not blocked');
    console.log('3. Verify streaming-ticker routes are registered');
    console.log('4. Check server logs for errors\n');
    process.exit(1);
  }
})();
