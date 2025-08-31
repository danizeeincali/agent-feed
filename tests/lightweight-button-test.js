#!/usr/bin/env node

/**
 * Lightweight Button Input Test - No Process Spawning
 * Tests button->Claude communication without creating multiple processes
 */

const http = require('http');

// Simple HTTP request to check if button messages are received
function testButtonMessage(buttonType) {
  const data = JSON.stringify({
    type: 'claude_request',
    action: buttonType,
    input: `Test from ${buttonType} button`,
    timestamp: Date.now()
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/claude',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`✅ ${buttonType}: Response received (${res.statusCode})`);
        resolve({ button: buttonType, status: res.statusCode, data: responseData });
      });
    });

    req.on('error', (error) => {
      console.error(`❌ ${buttonType}: Request failed - ${error.message}`);
      resolve({ button: buttonType, error: error.message });
    });

    req.write(data);
    req.end();
  });
}

// Test all four buttons sequentially (not in parallel)
async function runTest() {
  console.log('🧪 Lightweight Button Test - No Process Spawning\n');
  
  const buttons = ['dev_mode', 'api_mode', 'ui_mode', 'test_mode'];
  const results = [];
  
  for (const button of buttons) {
    console.log(`Testing ${button}...`);
    const result = await testButtonMessage(button);
    results.push(result);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 Test Summary:');
  results.forEach(r => {
    if (r.error) {
      console.log(`  ${r.button}: Failed - ${r.error}`);
    } else {
      console.log(`  ${r.button}: Status ${r.status}`);
    }
  });
  
  console.log('\n✨ Test complete - No processes spawned!');
}

// Run if executed directly
if (require.main === module) {
  runTest().catch(console.error);
}

module.exports = { testButtonMessage, runTest };