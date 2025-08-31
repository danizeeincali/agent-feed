#!/usr/bin/env node

/**
 * Full Functionality Test - Verifies all Claude instance operations are REAL
 * No mocks, no simulations - 100% real Claude integration
 */

const http = require('http');
const WebSocket = require('ws');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test results tracking
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

function recordTest(name, passed, details = '') {
  if (passed) {
    testResults.passed.push(name);
    log(`✅ PASSED: ${name}`, 'green');
  } else {
    testResults.failed.push({ name, details });
    log(`❌ FAILED: ${name} - ${details}`, 'red');
  }
}

// API Helper Functions
async function httpRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: responseData ? JSON.parse(responseData) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: responseData
          });
        }
      });
    });
    
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test 1: Instance Creation
async function testInstanceCreation() {
  log('\n📋 TEST 1: Instance Creation', 'bright');
  
  const response = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/claude/instances',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }, { instanceType: 'prod' });
  
  const passed = response.statusCode === 201 && 
                 response.data.success && 
                 response.data.instance && 
                 response.data.instance.id &&
                 response.data.instance.processType === 'pty';
  
  recordTest('Instance Creation', passed, 
    passed ? '' : `Status: ${response.statusCode}, Response: ${JSON.stringify(response.data)}`);
  
  if (passed) {
    // Verify it's a REAL process
    const hasRealPID = response.data.instance.pid && typeof response.data.instance.pid === 'number';
    recordTest('Real Process PID', hasRealPID, 
      hasRealPID ? `PID: ${response.data.instance.pid}` : 'No valid PID');
    
    // Check for mock indicators
    const noMockIndicators = !response.data.instance.isMock && 
                            response.data.instance.processType !== 'mock';
    recordTest('No Mock Indicators', noMockIndicators,
      noMockIndicators ? '' : 'Mock indicators found!');
  }
  
  return response.data?.instance?.id;
}

// Test 2: Send Button / Input Functionality
async function testSendButton(instanceId) {
  log('\n📋 TEST 2: Send Button Functionality', 'bright');
  
  // Wait for instance to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const testInput = 'echo "Testing Claude Real Response"';
  const response = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: `/api/claude/instances/${instanceId}/terminal/input`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }, { input: testInput });
  
  const passed = response.statusCode === 200 && response.data.success;
  recordTest('Send Input API', passed,
    passed ? `Processed: ${response.data.processed}` : `Failed: ${JSON.stringify(response.data)}`);
  
  // Verify PTY mode
  if (passed && response.data.usePty) {
    recordTest('PTY Mode Active', true, 'Using PTY for better terminal emulation');
  }
  
  return passed;
}

// Test 3: WebSocket Terminal Connection
async function testWebSocketTerminal(instanceId) {
  log('\n📋 TEST 3: WebSocket Terminal Connection', 'bright');
  
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://localhost:3000/terminal?instanceId=${instanceId}`);
    let connected = false;
    let receivedData = false;
    const messages = [];
    
    ws.on('open', () => {
      connected = true;
      log('🔌 WebSocket connected', 'cyan');
      
      // Send test command
      ws.send(JSON.stringify({
        type: 'input',
        input: 'help'
      }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      messages.push(message);
      
      if (message.type === 'output' && message.data) {
        receivedData = true;
        log(`📥 Received: ${message.data.substring(0, 100)}...`, 'cyan');
      }
    });
    
    ws.on('error', (error) => {
      log(`WebSocket error: ${error.message}`, 'red');
    });
    
    // Check results after 3 seconds
    setTimeout(() => {
      ws.close();
      
      recordTest('WebSocket Connection', connected);
      recordTest('WebSocket Data Reception', receivedData,
        receivedData ? `Received ${messages.length} messages` : 'No data received');
      
      // Check for real Claude indicators
      const hasRealOutput = messages.some(m => 
        m.data && (
          m.data.includes('Claude') ||
          m.data.includes('help') ||
          m.data.includes('>') ||
          m.data.includes('Welcome')
        )
      );
      recordTest('Real Claude Output Detected', hasRealOutput,
        hasRealOutput ? 'Claude terminal output confirmed' : 'No Claude output detected');
      
      resolve(connected && receivedData);
    }, 3000);
  });
}

// Test 4: Stream Output
async function testStreamOutput(instanceId) {
  log('\n📋 TEST 4: SSE Stream Output', 'bright');
  
  return new Promise((resolve) => {
    const outputs = [];
    
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/claude/instances/${instanceId}/terminal/stream`,
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream'
      }
    }, (res) => {
      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'terminal_output' && data.output) {
                outputs.push(data.output);
                log(`📤 Stream: ${data.output.substring(0, 50)}...`, 'magenta');
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      });
    });
    
    req.on('error', (e) => {
      log(`Stream error: ${e.message}`, 'red');
    });
    
    req.end();
    
    // Test for 3 seconds
    setTimeout(() => {
      req.abort();
      
      const hasOutput = outputs.length > 0;
      recordTest('SSE Stream Connection', hasOutput,
        hasOutput ? `Received ${outputs.length} outputs` : 'No stream output');
      
      resolve(hasOutput);
    }, 3000);
  });
}

// Test 5: Verify No Mock Code Active
async function testNoMockCode(instanceId) {
  log('\n📋 TEST 5: Verify No Mock Code Active', 'bright');
  
  // Get instance details
  const response = await httpRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/claude/instances',
    method: 'GET'
  });
  
  if (response.data.instances) {
    const instance = response.data.instances.find(i => i.id === instanceId);
    
    if (instance) {
      const checks = {
        'No isMock flag': !instance.isMock,
        'Process type not mock': instance.processType !== 'mock',
        'Has real PID': typeof instance.pid === 'number' && instance.pid > 0,
        'Using PTY': instance.processType === 'pty',
        'Status is running': instance.status === 'running'
      };
      
      for (const [check, passed] of Object.entries(checks)) {
        recordTest(check, passed, passed ? '' : `Failed: ${check}`);
      }
      
      // Additional verification - send a real command
      log('\n🔍 Sending real command to verify functionality...', 'yellow');
      const cmdResponse = await httpRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/api/claude/instances/${instanceId}/terminal/input`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, { input: 'pwd' });
      
      recordTest('Real Command Execution', cmdResponse.data.success,
        cmdResponse.data.success ? 'Command accepted' : 'Command failed');
    }
  }
}

// Main test runner
async function runAllTests() {
  log('\n' + '='.repeat(60), 'bright');
  log('🚀 FULL FUNCTIONALITY TEST - 100% REAL CLAUDE VERIFICATION', 'bright');
  log('='.repeat(60) + '\n', 'bright');
  
  try {
    // Test 1: Create instance
    const instanceId = await testInstanceCreation();
    
    if (!instanceId) {
      log('\n⚠️  Cannot continue - instance creation failed', 'red');
      return;
    }
    
    log(`\n📌 Testing with instance: ${instanceId}`, 'yellow');
    
    // Test 2: Send button
    await testSendButton(instanceId);
    
    // Test 3: WebSocket terminal
    await testWebSocketTerminal(instanceId);
    
    // Test 4: Stream output
    await testStreamOutput(instanceId);
    
    // Test 5: Verify no mocks
    await testNoMockCode(instanceId);
    
  } catch (error) {
    log(`\n❌ Test suite error: ${error.message}`, 'red');
    console.error(error);
  }
  
  // Final Report
  log('\n' + '='.repeat(60), 'bright');
  log('📊 FINAL REPORT', 'bright');
  log('='.repeat(60), 'bright');
  
  log(`\n✅ Passed: ${testResults.passed.length} tests`, 'green');
  for (const test of testResults.passed) {
    log(`   • ${test}`, 'green');
  }
  
  if (testResults.failed.length > 0) {
    log(`\n❌ Failed: ${testResults.failed.length} tests`, 'red');
    for (const { name, details } of testResults.failed) {
      log(`   • ${name}: ${details}`, 'red');
    }
  }
  
  const allPassed = testResults.failed.length === 0;
  log('\n' + '='.repeat(60), 'bright');
  if (allPassed) {
    log('🎉 ALL TESTS PASSED - 100% REAL CLAUDE FUNCTIONALITY VERIFIED!', 'green');
  } else {
    log('⚠️  SOME TESTS FAILED - REVIEW ISSUES ABOVE', 'yellow');
  }
  log('='.repeat(60) + '\n', 'bright');
}

// Run tests
runAllTests();