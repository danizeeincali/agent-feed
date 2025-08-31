#!/usr/bin/env node
/**
 * CRITICAL FIX VALIDATION TEST
 * Tests the instance ID mismatch fix and complete Claude functionality
 */

const WebSocket = require('ws');
const http = require('http');

console.log('🔍 CRITICAL FIX VALIDATION STARTING...');

// Test configuration
const BACKEND_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/terminal';
const TEST_TIMEOUT = 30000; // 30 seconds

let testsPassed = 0;
let testsFailed = 0;
let currentInstance = null;

function logTest(name, passed, details = '') {
  if (passed) {
    console.log(`✅ ${name} - PASSED ${details}`);
    testsPassed++;
  } else {
    console.log(`❌ ${name} - FAILED ${details}`);
    testsFailed++;
  }
}

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${BACKEND_URL}${path}`;
    const req = http.request(url, { method: 'GET', ...options }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => reject(new Error('Request timeout')));
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testBackendHealth() {
  try {
    const response = await makeRequest('/health');
    logTest('Backend Health Check', response.status === 200, `Status: ${response.status}`);
    return response.status === 200;
  } catch (error) {
    logTest('Backend Health Check', false, `Error: ${error.message}`);
    return false;
  }
}

async function testCreateInstance() {
  try {
    const response = await makeRequest('/api/claude/instances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { command: 'cd prod && claude', instanceType: 'prod', usePty: true }
    });
    
    if ((response.status === 200 || response.status === 201) && response.data.success && response.data.instance) {
      currentInstance = response.data.instance.id;
      logTest('Create Claude Instance', true, `ID: ${currentInstance}`);
      return true;
    } else {
      logTest('Create Claude Instance', false, `Status: ${response.status}, Data: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    logTest('Create Claude Instance', false, `Error: ${error.message}`);
    return false;
  }
}

async function testInstanceListing() {
  try {
    const response = await makeRequest('/api/claude/instances');
    const instances = Array.isArray(response.data) ? response.data : [];
    const hasFormatted = instances.some(id => id.includes('(') && id.includes(')'));
    const hasOurInstance = instances.some(id => id.includes(currentInstance));
    
    logTest('Instance Listing Format', hasFormatted, `Found formatted IDs: ${hasFormatted}`);
    logTest('Our Instance Listed', hasOurInstance, `Instance found in list: ${hasOurInstance}`);
    
    console.log(`🔍 Listed instances: [${instances.join(', ')}]`);
    return hasFormatted && hasOurInstance;
  } catch (error) {
    logTest('Instance Listing', false, `Error: ${error.message}`);
    return false;
  }
}

function testWebSocketConnection() {
  return new Promise((resolve) => {
    let wsConnected = false;
    let wsInputSent = false;
    let wsResponseReceived = false;
    let responseData = '';
    
    const ws = new WebSocket(WS_URL);
    
    const timeout = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
      logTest('WebSocket Connection', wsConnected, 'Connection established');
      logTest('WebSocket Input Processing', wsInputSent, 'Input sent successfully');
      logTest('WebSocket Response Received', wsResponseReceived, `Response: ${responseData.substring(0, 100)}...`);
      resolve(wsConnected && wsInputSent);
    }, 15000);
    
    ws.on('open', () => {
      console.log('🔗 WebSocket connected, testing with formatted instance ID...');
      wsConnected = true;
      
      // Send connection message with FORMATTED instance ID (the critical test!)
      const formattedInstanceId = `${currentInstance} (prod/claude)`;
      ws.send(JSON.stringify({
        type: 'connect',
        terminalId: formattedInstanceId
      }));
      
      // Wait a moment, then send input
      setTimeout(() => {
        console.log(`⌨️ Sending input to formatted ID: ${formattedInstanceId}`);
        ws.send(JSON.stringify({
          type: 'input',
          terminalId: formattedInstanceId,
          data: 'hello world'
        }));
        wsInputSent = true;
      }, 2000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log(`📨 WebSocket message type: ${message.type}`);
        
        if (message.type === 'claude_response' || message.type === 'output') {
          responseData += message.data || message.content || '';
          wsResponseReceived = true;
          console.log(`📝 Claude response received: ${(responseData).substring(0, 200)}...`);
        }
        
        if (message.type === 'error') {
          console.log(`❌ WebSocket error: ${message.error}`);
        }
      } catch (e) {
        console.log(`📦 Raw WebSocket data: ${data.toString().substring(0, 100)}...`);
        if (data.toString().length > 10) {
          responseData += data.toString();
          wsResponseReceived = true;
        }
      }
    });
    
    ws.on('error', (error) => {
      console.log(`❌ WebSocket error: ${error.message}`);
      clearTimeout(timeout);
      resolve(false);
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket closed');
      clearTimeout(timeout);
    });
  });
}

async function cleanup() {
  if (currentInstance) {
    try {
      await makeRequest(`/api/claude/instances/${currentInstance}`, { method: 'DELETE' });
      logTest('Instance Cleanup', true, `Deleted ${currentInstance}`);
    } catch (error) {
      logTest('Instance Cleanup', false, `Error: ${error.message}`);
    }
  }
}

async function runTests() {
  console.log('🚀 Starting CRITICAL FIX validation tests...\n');
  
  // Wait for backend to be ready
  console.log('⏳ Waiting for backend to be ready...');
  let backendReady = false;
  for (let i = 0; i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (await testBackendHealth()) {
      backendReady = true;
      break;
    }
    console.log(`⏳ Attempt ${i + 1}/10 - Backend not ready yet...`);
  }
  
  if (!backendReady) {
    console.log('❌ Backend never became ready, aborting tests');
    return;
  }
  
  console.log('\n🔧 Testing Claude instance creation...');
  if (!(await testCreateInstance())) {
    console.log('❌ Cannot proceed without instance creation');
    return;
  }
  
  console.log('\n📋 Testing instance listing and formatting...');
  await testInstanceListing();
  
  console.log('\n🔗 Testing WebSocket with formatted instance ID...');
  await testWebSocketConnection();
  
  console.log('\n🧹 Cleaning up...');
  await cleanup();
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 TEST RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('='.repeat(60));
  
  if (testsPassed >= 6 && testsFailed === 0) {
    console.log('🎉 ALL CRITICAL TESTS PASSED! Claude functionality is working!');
  } else if (testsPassed >= 4) {
    console.log('⚠️  Most tests passed, minor issues remain');
  } else {
    console.log('❌ Critical issues remain, functionality not working');
  }
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Handle cleanup on exit
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

runTests().catch(error => {
  console.error('💥 Test runner crashed:', error);
  process.exit(1);
});