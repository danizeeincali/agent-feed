/**
 * Simple Terminal Input Echo Test
 * Tests the enhanced backend terminal input processing using fetch
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_INSTANCE_ID = 'claude-test-1234';

// Test configuration
const TESTS = [
  { input: 'Hello', description: 'Simple text input' },
  { input: 'echo Hello World', description: 'Echo command' },
  { input: 'ls', description: 'List directory' },
  { input: 'pwd', description: 'Print working directory' },
  { input: 'whoami', description: 'Show current user' },
  { input: 'help', description: 'Show help' },
  { input: 'unknown_command', description: 'Unknown command' }
];

class SimpleTerminalTester {
  constructor() {
    this.testResults = [];
  }

  // Send terminal input and check API response
  async sendInput(input) {
    console.log(`⌨️ Sending input: "${input}"`);
    
    try {
      const response = await fetch(
        `${BASE_URL}/api/claude/instances/${TEST_INSTANCE_ID}/terminal/input`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input })
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`📤 API Response:`, {
        success: result.success,
        processed: result.processed,
        input: result.input,
        response: result.response ? result.response.substring(0, 50) + '...' : 'No response'
      });
      return result;
    } catch (error) {
      console.error(`❌ Error sending input "${input}":`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Test single input
  async runTest(testCase) {
    console.log(`\n🧪 Testing: ${testCase.description} - "${testCase.input}"`);
    
    const result = await this.sendInput(testCase.input);
    
    const testResult = {
      input: testCase.input,
      description: testCase.description,
      apiSuccess: result.success === true,
      inputEchoed: result.input === testCase.input,
      processed: result.processed === true,
      hasResponse: !!result.response,
      issues: []
    };

    // Validate results
    if (!testResult.apiSuccess) {
      testResult.issues.push('API call failed');
    }

    if (!testResult.inputEchoed) {
      testResult.issues.push(`Input not echoed correctly: expected "${testCase.input}", got "${result.input}"`);
    }

    if (!testResult.processed) {
      testResult.issues.push('Input not marked as processed');
    }

    if (!testResult.hasResponse) {
      testResult.issues.push('No response received');
    }

    testResult.success = testResult.issues.length === 0;
    
    if (testResult.success) {
      console.log('✅ Test passed - Input processed correctly');
    } else {
      console.log('❌ Test failed:', testResult.issues.join(', '));
    }

    return testResult;
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Simple Terminal Input Test Suite');
    console.log('='.repeat(60));

    // Test backend health first
    try {
      console.log('🏥 Testing backend health...');
      const healthResponse = await fetch(`${BASE_URL}/health`);
      const health = await healthResponse.json();
      console.log('✅ Backend health:', health.status);
    } catch (error) {
      console.error('❌ Backend health check failed:', error.message);
      return;
    }

    // Run each test
    for (const testCase of TESTS) {
      const result = await this.runTest(testCase);
      this.testResults.push(result);
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Generate report
    this.generateReport();
  }

  // Generate test report
  generateReport() {
    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(60));

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
          console.log(`  - "${result.input}" (${result.description}): ${result.issues.join(', ')}`);
        });
    }

    console.log('\n✅ Passed Tests:');
    this.testResults
      .filter(r => r.success)
      .forEach(result => {
        console.log(`  - "${result.input}" (${result.description})`);
      });

    const successRate = Math.round((passed / this.testResults.length) * 100);
    console.log(`\n🎯 Overall Success Rate: ${successRate}%`);

    if (successRate === 100) {
      console.log('🎉 All tests passed! Terminal input processing is working correctly.');
      console.log('👍 Input echo functionality has been successfully implemented.');
    } else if (successRate >= 80) {
      console.log('⚠️ Most tests passed, but some issues detected.');
    } else {
      console.log('🚨 Multiple test failures - implementation needs review.');
    }
  }
}

// Run the tests
async function main() {
  const tester = new SimpleTerminalTester();
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

module.exports = SimpleTerminalTester;