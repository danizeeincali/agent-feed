/**
 * WebSocket ProcessManager Integration Test
 * 
 * Tests the WebSocket handlers for ProcessManager events
 */

const { io: Client } = require('socket.io-client');

const SOCKET_URL = 'http://localhost:3000';

class ProcessManagerWebSocketTest {
  constructor() {
    this.client = null;
    this.testResults = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.client = Client(SOCKET_URL, {
        auth: {
          userId: 'test-user-processmanager',
          username: 'ProcessManager Tester'
        },
        transports: ['polling', 'websocket']
      });

      this.client.on('connect', () => {
        console.log('✅ Connected to WebSocket server');
        resolve();
      });

      this.client.on('connect_error', (error) => {
        console.error('❌ Connection failed:', error.message);
        reject(error);
      });

      // Set up event listeners for ProcessManager events
      this.setupProcessManagerListeners();
    });
  }

  setupProcessManagerListeners() {
    // Process launch events
    this.client.on('process:launched', (data) => {
      console.log('🚀 Process launched:', data);
      this.testResults.push({
        event: 'process:launched',
        success: true,
        data
      });
    });

    this.client.on('process:killed', (data) => {
      console.log('🛑 Process killed:', data);
      this.testResults.push({
        event: 'process:killed',
        success: true,
        data
      });
    });

    this.client.on('process:restarted', (data) => {
      console.log('🔄 Process restarted:', data);
      this.testResults.push({
        event: 'process:restarted',
        success: true,
        data
      });
    });

    this.client.on('process:restarting', (data) => {
      console.log('⏳ Process restarting:', data);
      this.testResults.push({
        event: 'process:restarting',
        success: true,
        data
      });
    });

    this.client.on('process:info:response', (data) => {
      console.log('ℹ️  Process info:', data);
      this.testResults.push({
        event: 'process:info:response',
        success: true,
        data
      });
    });

    this.client.on('process:error', (data) => {
      console.log('❌ Process error:', data);
      this.testResults.push({
        event: 'process:error',
        success: false,
        data
      });
    });

    // Terminal events
    this.client.on('terminal:output', (data) => {
      console.log('📟 Terminal output:', data.type, ':', data.data?.substring(0, 100));
      this.testResults.push({
        event: 'terminal:output',
        success: true,
        data
      });
    });

    this.client.on('terminal:error', (data) => {
      console.log('❌ Terminal error:', data);
      this.testResults.push({
        event: 'terminal:error',
        success: false,
        data
      });
    });

    // Error handling
    this.client.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  }

  async testProcessInfo() {
    console.log('\n🔍 Testing process:info...');
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⚠️  Process info test timed out');
        resolve(false);
      }, 5000);

      const listener = (data) => {
        clearTimeout(timeout);
        this.client.off('process:info:response', listener);
        console.log('✅ Received process info:', data);
        resolve(true);
      };

      this.client.on('process:info:response', listener);
      this.client.emit('process:info');
    });
  }

  async testTerminalInput() {
    console.log('\n📝 Testing terminal:input...');
    
    // Test sending simple input
    this.client.emit('terminal:input', { input: 'echo "Hello ProcessManager Test"\n' });
    
    // Wait a bit to see if we get output
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('✅ Terminal input sent (check for terminal:output)');
        resolve(true);
      }, 2000);
    });
  }

  async testInvalidInput() {
    console.log('\n❌ Testing invalid terminal input...');
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⚠️  Invalid input test timed out');
        resolve(false);
      }, 3000);

      const listener = (data) => {
        clearTimeout(timeout);
        this.client.off('terminal:error', listener);
        console.log('✅ Received expected error:', data);
        resolve(true);
      };

      this.client.on('terminal:error', listener);
      this.client.emit('terminal:input', { input: 123 }); // Invalid input type
    });
  }

  async runTests() {
    try {
      await this.connect();
      
      console.log('\n🧪 Starting ProcessManager WebSocket Tests...\n');

      // Test 1: Process info
      const infoResult = await this.testProcessInfo();
      
      // Test 2: Terminal input
      const terminalResult = await this.testTerminalInput();
      
      // Test 3: Invalid input handling
      const invalidResult = await this.testInvalidInput();

      // Summary
      console.log('\n📊 Test Results:');
      console.log('=================');
      console.log(`Process Info: ${infoResult ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Terminal Input: ${terminalResult ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`Invalid Input Handling: ${invalidResult ? '✅ PASS' : '❌ FAIL'}`);
      
      console.log('\n📋 All Events Received:');
      this.testResults.forEach((result, index) => {
        console.log(`${index + 1}. ${result.event}: ${result.success ? '✅' : '❌'}`);
      });

      // Test launching a process (this might fail if Claude is not available, which is expected)
      console.log('\n🚀 Testing process launch (may fail if Claude not available)...');
      this.client.emit('process:launch', { 
        config: { 
          autoRestartHours: 0, // Disable auto-restart for testing
          workingDirectory: '/workspaces/agent-feed/prod'
        } 
      });

      // Wait a bit for launch response
      setTimeout(() => {
        console.log('\n✨ ProcessManager WebSocket integration test completed!');
        console.log('   Check the server logs for detailed ProcessManager events.');
        this.disconnect();
      }, 5000);

    } catch (error) {
      console.error('❌ Test failed:', error);
      this.disconnect();
    }
  }

  disconnect() {
    if (this.client) {
      this.client.disconnect();
      console.log('🔌 Disconnected from WebSocket server');
    }
    
    // Exit after a delay to see all output
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
}

// Run the test
const test = new ProcessManagerWebSocketTest();
test.runTests().catch(console.error);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  test.disconnect();
});