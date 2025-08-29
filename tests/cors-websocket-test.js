/**
 * CORS WebSocket Connection Test
 * Tests WebSocket connections from frontend origin to backend terminal server
 */

const WebSocket = require('ws');

function testWebSocketConnection() {
  console.log('🔍 Testing WebSocket connection with CORS...');
  
  const ws = new WebSocket('ws://localhost:3002/terminal', {
    headers: {
      'Origin': 'http://localhost:5173',
      'User-Agent': 'Frontend-Test-Client'
    }
  });

  ws.on('open', () => {
    console.log('✅ WebSocket connection opened successfully');
    
    // Send init message
    ws.send(JSON.stringify({
      type: 'init',
      cols: 80,
      rows: 24
    }));
    
    setTimeout(() => {
      ws.close(1000, 'Test completed');
    }, 2000);
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received message:', message.type, message);
    } catch (error) {
      console.log('📨 Received raw data:', data.toString().slice(0, 100));
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`🔚 WebSocket closed: ${code} - ${reason}`);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });
}

// Test HTTP endpoints first
async function testHTTPEndpoints() {
  const fetch = require('node-fetch');
  
  console.log('🌐 Testing HTTP endpoints with CORS...');
  
  try {
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:3002/health', {
      headers: {
        'Origin': 'http://localhost:5173',
        'Accept': 'application/json'
      }
    });
    
    console.log('✅ Health endpoint:', healthResponse.status, healthResponse.headers.get('Access-Control-Allow-Origin'));
    
    // Test launch endpoint
    const launchResponse = await fetch('http://localhost:3002/api/launch', {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:5173',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command: 'claude' })
    });
    
    console.log('✅ Launch endpoint:', launchResponse.status, launchResponse.headers.get('Access-Control-Allow-Origin'));
    
    // Test terminals endpoint
    const terminalsResponse = await fetch('http://localhost:3002/api/terminals', {
      headers: {
        'Origin': 'http://localhost:5173',
        'Accept': 'application/json'
      }
    });
    
    console.log('✅ Terminals endpoint:', terminalsResponse.status, terminalsResponse.headers.get('Access-Control-Allow-Origin'));
    
  } catch (error) {
    console.error('❌ HTTP test error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting CORS Tests for Backend Terminal Server\n');
  
  await testHTTPEndpoints();
  console.log('');
  testWebSocketConnection();
  
  setTimeout(() => {
    console.log('\n✅ CORS tests completed!');
    process.exit(0);
  }, 5000);
}

runTests();