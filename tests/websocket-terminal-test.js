/**
 * Comprehensive WebSocket Terminal Streaming Test Suite
 * Tests the complete terminal functionality with WebSocket communication
 * 
 * This test covers:
 * 1. Claude instance creation via API
 * 2. WebSocket connection to /terminal namespace
 * 3. Terminal command execution and output streaming
 * 4. End-to-end terminal flow validation
 */

const axios = require('axios');
const WebSocket = require('ws');
const { spawn } = require('child_process');

// Test configuration
const config = {
  backend: {
    url: 'http://localhost:3000',
    apiPath: '/api/claude'
  },
  terminal: {
    host: 'localhost',
    port: 3002,
    path: '/terminal'
  },
  websocket: {
    url: 'ws://localhost:3002/terminal'
  },
  timeout: 30000,
  maxRetries: 3
};

class WebSocketTerminalTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
      details: []
    };
    this.ws = null;
    this.claudeInstance = null;
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    this.testResults.details.push(logMessage);
  }

  async assert(condition, message, details = '') {
    if (condition) {
      this.testResults.passed++;
      this.log(`✅ PASS: ${message}`, 'PASS');
      if (details) this.log(`   Details: ${details}`, 'INFO');
      return true;
    } else {
      this.testResults.failed++;
      this.log(`❌ FAIL: ${message}`, 'FAIL');
      if (details) this.log(`   Details: ${details}`, 'ERROR');
      this.testResults.errors.push(message);
      return false;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async waitForCondition(conditionFn, timeout = 10000, interval = 100) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await conditionFn()) {
        return true;
      }
      await this.sleep(interval);
    }
    return false;
  }

  // Test 1: Check backend services are running
  async testBackendAvailability() {
    this.log('🧪 Test 1: Backend Service Availability');
    
    try {
      // Test main backend server (port 3000)
      const backendResponse = await axios.get(`${config.backend.url}/health`, {
        timeout: 5000
      });
      await this.assert(
        backendResponse.status === 200, 
        'Main backend server is responding',
        `Response: ${backendResponse.status}`
      );

      // Test terminal server (port 3002)
      const terminalResponse = await axios.get(`http://${config.terminal.host}:${config.terminal.port}/health`, {
        timeout: 5000
      });
      await this.assert(
        terminalResponse.status === 200,
        'Terminal server is responding',
        `Response: ${terminalResponse.status}`
      );

      return true;
    } catch (error) {
      await this.assert(false, 'Backend services availability check failed', error.message);
      return false;
    }
  }

  // Test 2: Create Claude instance via API
  async testClaudeInstanceCreation() {
    this.log('🧪 Test 2: Claude Instance Creation');
    
    try {
      const instanceData = {
        name: `test-instance-${Date.now()}`,
        description: 'Test instance for WebSocket terminal validation',
        config: {
          model: 'claude-3-sonnet',
          temperature: 0.7
        }
      };

      const response = await axios.post(`${config.backend.url}${config.backend.apiPath}/instances`, instanceData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await this.assert(
        response.status === 201,
        'Claude instance created successfully',
        `Status: ${response.status}, ID: ${response.data?.id}`
      );

      this.claudeInstance = response.data;
      return true;
    } catch (error) {
      await this.assert(false, 'Claude instance creation failed', error.message);
      return false;
    }
  }

  // Test 3: WebSocket connection establishment
  async testWebSocketConnection() {
    this.log('🧪 Test 3: WebSocket Connection Establishment');

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(config.websocket.url);
        
        const connectionTimeout = setTimeout(() => {
          this.assert(false, 'WebSocket connection timed out');
          resolve(false);
        }, 10000);

        this.ws.on('open', async () => {
          clearTimeout(connectionTimeout);
          await this.assert(true, 'WebSocket connection established');
          resolve(true);
        });

        this.ws.on('error', async (error) => {
          clearTimeout(connectionTimeout);
          await this.assert(false, 'WebSocket connection error', error.message);
          resolve(false);
        });
      } catch (error) {
        this.assert(false, 'WebSocket connection failed', error.message);
        resolve(false);
      }
    });
  }

  // Test 4: Basic terminal command execution
  async testBasicTerminalCommands() {
    this.log('🧪 Test 4: Basic Terminal Command Execution');

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.assert(false, 'WebSocket not ready for terminal commands');
      return false;
    }

    const testCommands = [
      {
        command: 'echo "Hello WebSocket Terminal"',
        expectedOutput: 'Hello WebSocket Terminal',
        description: 'Echo command test'
      },
      {
        command: 'pwd',
        expectedOutput: '/workspaces/agent-feed',
        description: 'Working directory test'
      },
      {
        command: 'ls -la | head -5',
        expectedOutput: 'total',
        description: 'List files test'
      }
    ];

    for (const testCommand of testCommands) {
      let receivedOutput = '';
      let outputReceived = false;

      // Set up message listener
      const messageHandler = (data) => {
        const message = data.toString();
        receivedOutput += message;
        outputReceived = true;
      };

      this.ws.on('message', messageHandler);

      // Send command
      this.log(`Sending command: ${testCommand.command}`);
      this.ws.send(testCommand.command + '\n');

      // Wait for response
      const responseReceived = await this.waitForCondition(
        () => outputReceived && receivedOutput.includes(testCommand.expectedOutput),
        8000
      );

      // Remove listener
      this.ws.removeListener('message', messageHandler);

      await this.assert(
        responseReceived,
        `${testCommand.description} executed successfully`,
        `Expected: ${testCommand.expectedOutput}, Received: ${receivedOutput.substring(0, 200)}`
      );

      // Reset for next command
      receivedOutput = '';
      outputReceived = false;
      await this.sleep(1000); // Wait between commands
    }

    return true;
  }

  // Test 5: Terminal streaming performance
  async testTerminalStreaming() {
    this.log('🧪 Test 5: Terminal Streaming Performance');

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.assert(false, 'WebSocket not ready for streaming test');
      return false;
    }

    let messageCount = 0;
    let totalLatency = 0;
    const testStartTime = Date.now();

    const messageHandler = (data) => {
      messageCount++;
      const now = Date.now();
      totalLatency += (now - testStartTime);
    };

    this.ws.on('message', messageHandler);

    // Send a command that generates multiple lines of output
    const streamingCommand = 'for i in {1..10}; do echo "Stream test line $i"; sleep 0.1; done';
    this.ws.send(streamingCommand + '\n');

    // Wait for streaming to complete
    await this.sleep(5000);

    this.ws.removeListener('message', messageHandler);

    const averageLatency = messageCount > 0 ? totalLatency / messageCount : 0;

    await this.assert(
      messageCount >= 10,
      'Terminal streaming received expected message count',
      `Messages: ${messageCount}, Avg Latency: ${averageLatency.toFixed(2)}ms`
    );

    await this.assert(
      averageLatency < 1000,
      'Terminal streaming latency is acceptable',
      `Average latency: ${averageLatency.toFixed(2)}ms`
    );

    return true;
  }

  // Test 6: Error handling and recovery
  async testErrorHandling() {
    this.log('🧪 Test 6: Error Handling and Recovery');

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.assert(false, 'WebSocket not ready for error handling test');
      return false;
    }

    let errorReceived = false;
    let errorMessage = '';

    const messageHandler = (data) => {
      const message = data.toString();
      if (message.includes('command not found') || message.includes('No such file')) {
        errorReceived = true;
        errorMessage = message;
      }
    };

    this.ws.on('message', messageHandler);

    // Send invalid command
    this.ws.send('nonexistent-command-12345\n');

    // Wait for error response
    const errorResponseReceived = await this.waitForCondition(() => errorReceived, 5000);

    this.ws.removeListener('message', messageHandler);

    await this.assert(
      errorResponseReceived,
      'Terminal error handling working correctly',
      `Error message received: ${errorMessage.substring(0, 100)}`
    );

    // Test recovery by sending valid command after error
    let recoveryOutput = '';
    let recoveryReceived = false;

    const recoveryHandler = (data) => {
      recoveryOutput += data.toString();
      if (recoveryOutput.includes('Recovery Test')) {
        recoveryReceived = true;
      }
    };

    this.ws.on('message', recoveryHandler);
    this.ws.send('echo "Recovery Test"\n');

    const recoverySuccess = await this.waitForCondition(() => recoveryReceived, 3000);
    this.ws.removeListener('message', recoveryHandler);

    await this.assert(
      recoverySuccess,
      'Terminal recovery after error working',
      'Terminal can execute valid commands after error'
    );

    return true;
  }

  // Test 7: Connection stability
  async testConnectionStability() {
    this.log('🧪 Test 7: Connection Stability Test');

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.assert(false, 'WebSocket not ready for stability test');
      return false;
    }

    let pingCount = 0;
    let pongCount = 0;

    const pongHandler = () => {
      pongCount++;
    };

    this.ws.on('pong', pongHandler);

    // Send multiple pings
    const pingInterval = setInterval(() => {
      if (pingCount < 5) {
        this.ws.ping();
        pingCount++;
      }
    }, 1000);

    // Wait for pongs
    await this.sleep(8000);
    clearInterval(pingInterval);

    this.ws.removeListener('pong', pongHandler);

    await this.assert(
      pongCount >= 3,
      'WebSocket ping-pong stability test passed',
      `Pings sent: ${pingCount}, Pongs received: ${pongCount}`
    );

    return true;
  }

  // Test 8: Resource cleanup
  async testResourceCleanup() {
    this.log('🧪 Test 8: Resource Cleanup');

    if (this.ws) {
      const initialState = this.ws.readyState;
      this.ws.close();

      // Wait for cleanup
      await this.sleep(2000);

      await this.assert(
        this.ws.readyState === WebSocket.CLOSED,
        'WebSocket connection closed properly',
        `Initial state: ${initialState}, Final state: ${this.ws.readyState}`
      );
    }

    // Cleanup Claude instance if created
    if (this.claudeInstance) {
      try {
        await axios.delete(`${config.backend.url}${config.backend.apiPath}/instances/${this.claudeInstance.id}`);
        await this.assert(true, 'Claude instance cleaned up successfully');
      } catch (error) {
        await this.assert(false, 'Claude instance cleanup failed', error.message);
      }
    }

    return true;
  }

  // Main test runner
  async runAllTests() {
    console.log('\n🚀 Starting Comprehensive WebSocket Terminal Test Suite\n');
    console.log('=' * 60);

    const tests = [
      () => this.testBackendAvailability(),
      () => this.testClaudeInstanceCreation(),
      () => this.testWebSocketConnection(),
      () => this.testBasicTerminalCommands(),
      () => this.testTerminalStreaming(),
      () => this.testErrorHandling(),
      () => this.testConnectionStability(),
      () => this.testResourceCleanup()
    ];

    let successfulTests = 0;

    for (let i = 0; i < tests.length; i++) {
      try {
        const result = await tests[i]();
        if (result) successfulTests++;
      } catch (error) {
        await this.assert(false, `Test ${i + 1} threw exception`, error.message);
      }
      
      console.log(''); // Add spacing between tests
    }

    // Final results
    console.log('\n' + '=' * 60);
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' * 60);
    console.log(`Total Tests: ${tests.length}`);
    console.log(`Successful: ${successfulTests}`);
    console.log(`Failed: ${tests.length - successfulTests}`);
    console.log(`Assertions Passed: ${this.testResults.passed}`);
    console.log(`Assertions Failed: ${this.testResults.failed}`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ ERRORS ENCOUNTERED:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    const success = this.testResults.failed === 0 && successfulTests === tests.length;
    console.log(`\n🏁 Overall Result: ${success ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);

    return {
      success,
      totalTests: tests.length,
      successfulTests,
      failedTests: tests.length - successfulTests,
      assertionsPassed: this.testResults.passed,
      assertionsFailed: this.testResults.failed,
      errors: this.testResults.errors,
      details: this.testResults.details
    };
  }
}

// Export for use as module
if (require.main === module) {
  // Run tests if executed directly
  const tester = new WebSocketTerminalTester();
  
  tester.runAllTests()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error in test suite:', error);
      process.exit(1);
    });
}

module.exports = WebSocketTerminalTester;