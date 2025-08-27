/**
 * Terminal Input Echo Test Suite
 * Tests the enhanced backend terminal input processing and SSE broadcasting
 */

const fetch = require('node-fetch');
const EventSource = require('eventsource');

const BASE_URL = 'http://localhost:3000';
const TEST_INSTANCE_ID = 'claude-test-1234';

// Test configuration
const TESTS = [
  { input: 'Hello', expected: 'Hello' },
  { input: 'echo Hello World', expected: 'Hello World' },
  { input: 'ls', expected: 'package.json' },
  { input: 'pwd', expected: '/workspaces/agent-feed' },
  { input: 'whoami', expected: 'claude' },
  { input: 'help', expected: 'Available commands' },
  { input: 'unknown_command', expected: 'command not found' }
];

class TerminalInputEchoTester {
  constructor() {
    this.eventSource = null;
    this.receivedEvents = [];
    this.testResults = [];
  }

  // Connect to SSE stream
  async connectSSE() {
    return new Promise((resolve, reject) => {
      console.log(`📡 Connecting to SSE stream for instance: ${TEST_INSTANCE_ID}`);
      
      this.eventSource = new EventSource(
        `${BASE_URL}/api/claude/instances/${TEST_INSTANCE_ID}/terminal/stream`
      );

      this.eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        resolve();
      };

      this.eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.receivedEvents.push(data);
        console.log(`📨 SSE Event: ${data.type} - ${data.data ? data.data.substring(0, 50) + '...' : 'No data'}`);
      };

      this.eventSource.onerror = (error) => {
        console.error('❌ SSE connection error:', error);
        reject(error);
      };

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.eventSource.readyState !== EventSource.OPEN) {
          reject(new Error('SSE connection timeout'));
        }
      }, 5000);
    });
  }

  // Send terminal input
  async sendInput(input) {
    console.log(`⌨️ Sending input: "${input}"`);
    
    const response = await fetch(
      `${BASE_URL}/api/claude/instances/${TEST_INSTANCE_ID}/terminal/input`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      }
    );

    const result = await response.json();
    console.log(`📤 Input API response:`, result);
    return result;
  }

  // Wait for SSE events
  async waitForEvents(expectedCount, timeout = 3000) {
    const startTime = Date.now();
    const initialCount = this.receivedEvents.length;
    
    while (this.receivedEvents.length < initialCount + expectedCount) {
      if (Date.now() - startTime > timeout) {
        console.warn(`⏰ Timeout waiting for ${expectedCount} events (got ${this.receivedEvents.length - initialCount})`);
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Run single test
  async runTest(testCase) {
    console.log(`\n🧪 Testing: "${testCase.input}"`);
    
    const initialEventCount = this.receivedEvents.length;
    
    // Send input
    const apiResponse = await this.sendInput(testCase.input);
    
    // Wait for SSE events (expect input_echo + output events)
    await this.waitForEvents(2);
    
    // Analyze events received after this input
    const newEvents = this.receivedEvents.slice(initialEventCount);
    
    // Find input echo event
    const inputEcho = newEvents.find(event => event.type === 'input_echo');
    const outputEvent = newEvents.find(event => event.type === 'output');
    
    const result = {
      input: testCase.input,
      expected: testCase.expected,
      apiResponse,
      inputEcho,
      outputEvent,
      success: false,
      issues: []
    };

    // Validate API response
    if (!apiResponse.success) {
      result.issues.push('API response indicates failure');
    }

    if (apiResponse.input !== testCase.input) {
      result.issues.push(`API input mismatch: expected "${testCase.input}", got "${apiResponse.input}"`);
    }

    // Validate input echo event
    if (!inputEcho) {
      result.issues.push('No input_echo event received');
    } else if (inputEcho.data !== testCase.input) {
      result.issues.push(`Input echo mismatch: expected "${testCase.input}", got "${inputEcho.data}"`);
    }

    // Validate output event (for commands that produce output)
    if (testCase.expected && testCase.input !== '') {
      if (!outputEvent) {
        result.issues.push('No output event received');
      } else if (!outputEvent.data.includes(testCase.expected)) {
        result.issues.push(`Output doesn't contain expected text: "${testCase.expected}" not in "${outputEvent.data}"`);
      }
    }

    result.success = result.issues.length === 0;
    
    if (result.success) {
      console.log('✅ Test passed');
    } else {
      console.log('❌ Test failed:', result.issues);
    }

    return result;
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Terminal Input Echo Test Suite');
    console.log('='.repeat(50));

    try {
      // Connect to SSE
      await this.connectSSE();
      
      // Wait a moment for initial connection messages
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Run each test
      for (const testCase of TESTS) {
        const result = await this.runTest(testCase);
        this.testResults.push(result);
        
        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Generate report
      this.generateReport();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      if (this.eventSource) {
        this.eventSource.close();
      }
    }
  }

  // Generate test report
  generateReport() {
    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(50));

    const passed = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.testResults.length}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`  - "${result.input}": ${result.issues.join(', ')}`);
        });
    }

    console.log('\n📈 SSE Events Summary:');
    const eventTypes = {};
    this.receivedEvents.forEach(event => {
      eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
    });
    
    Object.entries(eventTypes).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });

    console.log(`\n🎯 Overall Success Rate: ${Math.round((passed / this.testResults.length) * 100)}%`);
  }
}

// Run the tests
async function main() {
  const tester = new TerminalInputEchoTester();
  await tester.runAllTests();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TerminalInputEchoTester;