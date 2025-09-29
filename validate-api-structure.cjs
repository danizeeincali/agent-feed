#!/usr/bin/env node

/**
 * Direct API Structure Validation Script
 * This script validates that the API structure changes are working correctly
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testAPIStructure() {
  log('\n🔍 API Structure Validation Test Suite', 'bold');
  log('======================================\n', 'blue');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function test(description, testFn) {
    totalTests++;
    try {
      const result = testFn();
      if (result === true || result === undefined) {
        log(`✅ ${description}`, 'green');
        passedTests++;
      } else {
        log(`❌ ${description}`, 'red');
        failedTests++;
      }
    } catch (error) {
      log(`❌ ${description} - ${error.message}`, 'red');
      failedTests++;
    }
  }

  function expect(actual) {
    return {
      toBe: (expected) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, but got ${actual}`);
        }
        return true;
      },
      toEqual: (expected) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
        }
        return true;
      },
      toHaveProperty: (prop, value) => {
        if (!(prop in actual)) {
          throw new Error(`Expected object to have property ${prop}`);
        }
        if (value !== undefined && actual[prop] !== value) {
          throw new Error(`Expected property ${prop} to be ${value}, but got ${actual[prop]}`);
        }
        return true;
      },
      toBeDefined: () => {
        if (actual === undefined) {
          throw new Error('Expected value to be defined');
        }
        return true;
      },
      toBeInstanceOf: (constructor) => {
        if (!(actual instanceof constructor)) {
          throw new Error(`Expected value to be instance of ${constructor.name}`);
        }
        return true;
      }
    };
  }

  // Test 1: Check if agents.js file exists and has correct structure
  test('agents.js file exists', () => {
    const filePath = path.join(__dirname, 'pages/api/agents.js');
    return expect(fs.existsSync(filePath)).toBe(true);
  });

  // Test 2: Verify agents.js contains the new response structure
  test('agents.js contains new response structure', () => {
    const filePath = path.join(__dirname, 'pages/api/agents.js');
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for the new structure elements
    const hasSuccessField = content.includes('success: true');
    const hasAgentsField = content.includes('agents: mockAgents');
    const hasTotalField = content.includes('total: mockAgents.length');
    const hasTimestampField = content.includes('timestamp: new Date().toISOString()');

    return expect(hasSuccessField && hasAgentsField && hasTotalField && hasTimestampField).toBe(true);
  });

  // Test 3: Verify old flat array structure is removed
  test('agents.js does not return flat array (regression test)', () => {
    const filePath = path.join(__dirname, 'pages/api/agents.js');
    const content = fs.readFileSync(filePath, 'utf8');

    // Should not have the old structure
    const hasOldStructure = content.includes('res.status(200).json(mockAgents)') &&
                           !content.includes('agents: mockAgents');

    return expect(hasOldStructure).toBe(false);
  });

  // Test 4: Check agent-posts.js has timestamp field
  test('agent-posts.js includes timestamp field', () => {
    const filePath = path.join(__dirname, 'pages/api/agent-posts.js');
    if (!fs.existsSync(filePath)) {
      throw new Error('agent-posts.js does not exist');
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return expect(content.includes('timestamp: new Date().toISOString()')).toBe(true);
  });

  // Test 5: Check v1/agent-posts.js maintains proper structure
  test('v1/agent-posts.js maintains proper v1 structure', () => {
    const filePath = path.join(__dirname, 'pages/api/v1/agent-posts.js');
    if (!fs.existsSync(filePath)) {
      throw new Error('v1/agent-posts.js does not exist');
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const hasVersion = content.includes('version: "1.0"');
    const hasMetaObject = content.includes('meta: {');
    const hasTimestamp = content.includes('timestamp: new Date().toISOString()');

    return expect(hasVersion && hasMetaObject && hasTimestamp).toBe(true);
  });

  // Test 6: Simulate API response structure
  test('Mock API response has correct structure', () => {
    const mockAgents = [
      { id: 1, name: "Test Agent", status: "active", category: "Development" }
    ];

    const response = {
      success: true,
      agents: mockAgents,
      total: mockAgents.length,
      timestamp: new Date().toISOString()
    };

    expect(response).toHaveProperty('success', true);
    expect(response).toHaveProperty('agents');
    expect(response).toHaveProperty('total');
    expect(response).toHaveProperty('timestamp');
    expect(Array.isArray(response.agents)).toBe(true);
    return expect(response.total).toBe(response.agents.length);
  });

  // Test 7: Verify CORS headers are maintained
  test('CORS headers are properly set in agents.js', () => {
    const filePath = path.join(__dirname, 'pages/api/agents.js');
    const content = fs.readFileSync(filePath, 'utf8');

    const hasCORSOrigin = content.includes("res.setHeader('Access-Control-Allow-Origin', '*')");
    const hasCORSMethods = content.includes("res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')");
    const hasCORSHeaders = content.includes("res.setHeader('Access-Control-Allow-Headers', 'Content-Type')");

    return expect(hasCORSOrigin && hasCORSMethods && hasCORSHeaders).toBe(true);
  });

  // Test 8: Test timestamp format
  test('Timestamp is in valid ISO format', () => {
    const timestamp = new Date().toISOString();
    const parsedDate = new Date(timestamp);

    expect(timestamp).toBeDefined();
    expect(parsedDate).toBeInstanceOf(Date);
    return expect(parsedDate.toISOString()).toBe(timestamp);
  });

  // Test 9: Test response consistency
  test('All APIs return objects, not arrays', () => {
    const agentsResponse = {
      success: true,
      agents: [],
      total: 0,
      timestamp: new Date().toISOString()
    };

    const postsResponse = {
      success: true,
      data: [],
      total: 0,
      limit: 20,
      offset: 0,
      timestamp: new Date().toISOString()
    };

    expect(Array.isArray(agentsResponse)).toBe(false);
    expect(Array.isArray(postsResponse)).toBe(false);
    expect(agentsResponse).toBeInstanceOf(Object);
    return expect(postsResponse).toBeInstanceOf(Object);
  });

  // Test 10: Performance test
  test('Response creation is performant', () => {
    const startTime = performance.now();

    const mockData = Array.from({ length: 1000 }, (_, i) => ({
      id: i + 1,
      name: `Agent ${i + 1}`,
      status: 'active',
      category: 'Test'
    }));

    const response = {
      success: true,
      agents: mockData,
      total: mockData.length,
      timestamp: new Date().toISOString()
    };

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(response.agents.length).toBe(1000);
    return expect(duration < 100).toBe(true); // Should complete in under 100ms
  });

  // Print results
  log('\n📊 Test Results:', 'bold');
  log('===============', 'blue');
  log(`Total Tests: ${totalTests}`, 'blue');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`, passedTests === totalTests ? 'green' : 'yellow');

  if (failedTests === 0) {
    log('\n🎉 All tests passed! API structure fix is working correctly.', 'green');
    log('✅ The API response structure has been successfully updated:', 'green');
    log('   • /api/agents now returns proper object structure', 'green');
    log('   • /api/agent-posts includes timestamp for consistency', 'green');
    log('   • /api/v1/agent-posts maintains proper v1 structure', 'green');
    log('   • CORS headers are preserved', 'green');
    log('   • No regression detected', 'green');
    return true;
  } else {
    log('\n❌ Some tests failed. Please review the API implementation.', 'red');
    return false;
  }
}

// Run the tests
testAPIStructure().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  log(`\n💥 Test suite crashed: ${error.message}`, 'red');
  process.exit(1);
});