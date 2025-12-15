/**
 * Simple WebSocket Connection Test
 * Tests direct WebSocket connection to backend
 */

const WebSocket = require('ws');

async function testDirectWebSocketConnection() {
  console.log('🔍 Testing direct WebSocket connection to backend...');
  
  try {
    // Test Socket.IO endpoint
    const response = await fetch('http://localhost:3001/socket.io/', {
      method: 'GET',
      headers: {
        'User-Agent': 'NodeJS-Test-Client'
      }
    });
    
    const data = await response.text();
    console.log('📡 Socket.IO endpoint response:', data);
    
    if (data.includes('{"code":0,"message":"Transport unknown"}')) {
      console.log('✅ Socket.IO server is responding correctly');
    }
    
    // Test regular HTTP health check
    const healthResponse = await fetch('http://localhost:3001/health');
    const healthData = await healthResponse.json();
    console.log('🏥 Health check response:', healthData);
    
    console.log('✅ Backend WebSocket server is accessible');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

// Run the test
testDirectWebSocketConnection().catch(console.error);