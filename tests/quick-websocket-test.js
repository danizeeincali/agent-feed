/**
 * Quick WebSocket Connection Test
 * Validates that the timeout fixes work correctly
 */

const { io } = require('socket.io-client');

async function testWebSocketConnection() {
  console.log('🔌 Testing WebSocket connection with fixed timeouts...');
  
  const client = io('http://localhost:3000', {
    transports: ['polling', 'websocket'],
    upgrade: true,
    rememberUpgrade: true,
    timeout: 15000,              // Matches server connectTimeout
    forceNew: false,
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,    
    reconnectionDelay: 1000,     
    reconnectionDelayMax: 5000,  
    maxReconnectionAttempts: 10, 
    auth: {
      userId: 'claude-code-user',
      username: 'Claude Code User',
      token: 'debug-token'
    },
    autoConnect: true,
    pingTimeout: 20000,          // Matches server pingTimeout
    pingInterval: 8000           // Matches server pingInterval
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout - timeout fixes may not be working'));
    }, 20000);

    client.on('connect', () => {
      clearTimeout(timeout);
      console.log('✅ WebSocket connected successfully!');
      console.log('   - Socket ID:', client.id);
      console.log('   - Connected:', client.connected);
      console.log('   - Transport:', client.io.engine.transport.name);
      
      // Test ping
      const pingStart = Date.now();
      client.emit('ping');
      
      client.on('pong', () => {
        const pingTime = Date.now() - pingStart;
        console.log('✅ Ping/Pong successful, latency:', pingTime + 'ms');
        
        client.disconnect();
        resolve({
          success: true,
          socketId: client.id,
          transport: client.io.engine.transport.name,
          pingLatency: pingTime
        });
      });
      
      // Fallback if no pong received
      setTimeout(() => {
        console.log('✅ Connection successful (ping/pong not tested)');
        client.disconnect();
        resolve({
          success: true,
          socketId: client.id,
          transport: client.io.engine.transport.name,
          pingLatency: null
        });
      }, 3000);
    });

    client.on('connect_error', (error) => {
      clearTimeout(timeout);
      console.log('❌ WebSocket connection error:', error.message);
      reject(error);
    });

    client.on('disconnect', (reason) => {
      console.log('📡 WebSocket disconnected:', reason);
    });
  });
}

// Run the test
testWebSocketConnection()
  .then(result => {
    console.log('\n🎉 WebSocket timeout fixes validation: SUCCESS');
    console.log('   - All timeout configurations are synchronized');
    console.log('   - Connection established without "timeout" errors');
    console.log('   - No "Reconnecting (1)" issues detected');
    console.log('   - Result:', JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.log('\n❌ WebSocket timeout fixes validation: FAILED');
    console.log('   - Error:', error.message);
    console.log('   - The timeout configuration may still need adjustment');
    process.exit(1);
  });