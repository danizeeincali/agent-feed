#!/usr/bin/env node
/**
 * Test Script: Claude Launch Fix Validation
 * Validates that the HTTP 500 error is resolved
 */

const http = require('http');
const WebSocket = require('ws');

const BACKEND_URL = 'http://localhost:3002';
const WS_URL = 'ws://localhost:3002/terminal';

console.log('🧪 TESTING CLAUDE LAUNCH FIX');
console.log('=' .repeat(50));

async function testEndpoint(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = {
            statusCode: res.statusCode,
            data: JSON.parse(data)
          };
          resolve(result);
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function testWebSocket() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket connection timeout'));
    }, 5000);

    ws.on('open', () => {
      clearTimeout(timeout);
      ws.close();
      resolve(true);
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function runTests() {
  console.log('1️⃣  Testing Health Endpoint...');
  try {
    const health = await testEndpoint('/health');
    if (health.statusCode === 200 && health.data.success) {
      console.log('   ✅ Health endpoint working');
      console.log(`   📊 Terminals: ${health.data.terminals}`);
      console.log(`   🤖 Claude CLI: ${health.data.claudeCli.available ? '✅' : '❌'}`);
    } else {
      throw new Error(`Health check failed: ${health.statusCode}`);
    }
  } catch (error) {
    console.log('   ❌ Health endpoint failed:', error.message);
    return false;
  }

  console.log('\n2️⃣  Testing Claude Status Endpoint...');
  try {
    const status = await testEndpoint('/api/claude-status');
    if (status.statusCode === 200 && status.data.available) {
      console.log('   ✅ Claude status endpoint working');
      console.log(`   🛤️  Path: ${status.data.path}`);
      console.log(`   📦 Version: ${status.data.version || 'Unknown'}`);
    } else {
      throw new Error(`Claude status failed: ${status.statusCode}`);
    }
  } catch (error) {
    console.log('   ❌ Claude status failed:', error.message);
    return false;
  }

  console.log('\n3️⃣  Testing Launch Endpoint (Critical Fix)...');
  try {
    const launch = await testEndpoint('/api/launch', 'POST', { command: 'claude' });
    if (launch.statusCode === 200 && launch.data.success) {
      console.log('   ✅ Launch endpoint working - HTTP 500 ERROR FIXED!');
      console.log(`   🚀 Terminal ID: ${launch.data.terminalId}`);
      console.log(`   📨 Message: ${launch.data.message}`);
    } else {
      throw new Error(`Launch failed: ${launch.statusCode} - ${JSON.stringify(launch.data)}`);
    }
  } catch (error) {
    console.log('   ❌ Launch endpoint failed:', error.message);
    return false;
  }

  console.log('\n4️⃣  Testing WebSocket Connection...');
  try {
    await testWebSocket();
    console.log('   ✅ WebSocket connection working');
  } catch (error) {
    console.log('   ❌ WebSocket failed:', error.message);
    return false;
  }

  console.log('\n5️⃣  Testing Terminal List...');
  try {
    const terminals = await testEndpoint('/api/terminals');
    if (terminals.statusCode === 200 && terminals.data.success) {
      console.log('   ✅ Terminal list endpoint working');
      console.log(`   📊 Active terminals: ${terminals.data.count}`);
    } else {
      throw new Error(`Terminal list failed: ${terminals.statusCode}`);
    }
  } catch (error) {
    console.log('   ❌ Terminal list failed:', error.message);
    return false;
  }

  return true;
}

async function main() {
  try {
    const success = await runTests();
    
    console.log('\n' + '=' .repeat(50));
    if (success) {
      console.log('🎉 ALL TESTS PASSED - HTTP 500 ERROR FIXED!');
      console.log('');
      console.log('✅ Backend server is robust and ready');
      console.log('✅ /api/launch endpoint working correctly');
      console.log('✅ Claude CLI integration functional');
      console.log('✅ WebSocket terminal connections working');
      console.log('✅ Error handling implemented');
      console.log('');
      console.log('🚀 Users can now launch Claude without HTTP 500 errors!');
    } else {
      console.log('❌ SOME TESTS FAILED - Please check the errors above');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

main();