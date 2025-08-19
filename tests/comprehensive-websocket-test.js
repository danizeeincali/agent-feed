const io = require('socket.io-client');

console.log('🚀 Starting Comprehensive WebSocket Test Suite');
console.log('================================================\n');

// Test configurations to validate
const testConfigs = [
  {
    name: 'Frontend-like connection (from port 3002)',
    url: 'http://localhost:3000',
    options: {
      transports: ['polling', 'websocket'],
      timeout: 20000,
      auth: {
        userId: 'frontend-user',
        username: 'Frontend User',
        token: 'debug-token'
      },
      forceNew: true
    }
  },
  {
    name: 'Backend-like connection (internal)',
    url: 'http://localhost:3000',
    options: {
      transports: ['websocket'],
      timeout: 10000,
      auth: {
        userId: 'backend-user',
        username: 'Backend User',
        token: 'internal-token'
      },
      forceNew: true
    }
  }
];

let testResults = [];
let currentTest = 0;

function runTest(config) {
  return new Promise((resolve) => {
    console.log(`🧪 Test ${currentTest + 1}: ${config.name}`);
    console.log(`   Connecting to: ${config.url}`);
    
    const socket = io(config.url, config.options);
    const testResult = {
      name: config.name,
      connected: false,
      events: [],
      errors: []
    };
    
    const timeout = setTimeout(() => {
      console.log(`   ❌ Timeout after ${config.options.timeout}ms`);
      testResult.errors.push('Connection timeout');
      socket.disconnect();
      resolve(testResult);
    }, config.options.timeout + 1000);
    
    socket.on('connect', () => {
      console.log(`   ✅ Connected successfully!`);
      console.log(`   📡 Socket ID: ${socket.id}`);
      testResult.connected = true;
      testResult.socketId = socket.id;
      
      // Test comment room join
      socket.emit('join_comment_room', 'test-post-123');
      testResult.events.push('join_comment_room sent');
      console.log(`   📨 Sent: join_comment_room`);
      
      // Test claude agent room join
      socket.emit('join_claude_agent_room', 'test-session');
      testResult.events.push('join_claude_agent_room sent');
      console.log(`   📨 Sent: join_claude_agent_room`);
      
      // Test heartbeat/ping
      socket.emit('ping', { timestamp: Date.now() });
      testResult.events.push('ping sent');
      console.log(`   💓 Sent: ping`);
      
      // Wait and then disconnect
      setTimeout(() => {
        clearTimeout(timeout);
        socket.disconnect();
        console.log(`   ✅ Test completed successfully\n`);
        resolve(testResult);
      }, 2000);
    });
    
    socket.on('disconnect', (reason) => {
      console.log(`   🔌 Disconnected: ${reason}`);
      testResult.disconnectReason = reason;
    });
    
    socket.on('connect_error', (error) => {
      console.log(`   ❌ Connection error: ${error.message}`);
      testResult.errors.push(error.message);
      clearTimeout(timeout);
      resolve(testResult);
    });
    
    socket.on('error', (error) => {
      console.log(`   ❌ Socket error:`, error);
      testResult.errors.push(error.toString());
    });
    
    // Listen for any server responses
    socket.onAny((event, ...args) => {
      console.log(`   📨 Received: ${event}`, args.length > 0 ? args : '');
      testResult.events.push(`received: ${event}`);
    });
  });
}

async function runAllTests() {
  for (const config of testConfigs) {
    const result = await runTest(config);
    testResults.push(result);
    currentTest++;
  }
  
  // Print comprehensive results
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('================================');
  
  let allPassed = true;
  testResults.forEach((result, index) => {
    const status = result.connected && result.errors.length === 0 ? '✅ PASS' : '❌ FAIL';
    if (result.connected === false || result.errors.length > 0) {
      allPassed = false;
    }
    
    console.log(`\nTest ${index + 1}: ${result.name}`);
    console.log(`Status: ${status}`);
    console.log(`Connected: ${result.connected}`);
    console.log(`Socket ID: ${result.socketId || 'N/A'}`);
    console.log(`Events: ${result.events.length} sent/received`);
    console.log(`Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log(`Error details: ${result.errors.join(', ')}`);
    }
  });
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 ALL WEBSOCKET TESTS PASSED!');
    console.log('✅ WebSocket connection issues have been resolved');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed - WebSocket issues still exist');
    process.exit(1);
  }
}

runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});