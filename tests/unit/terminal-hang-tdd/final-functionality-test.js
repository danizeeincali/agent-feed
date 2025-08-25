#!/usr/bin/env node

/**
 * Final Terminal Functionality Test
 * 
 * Validates that normal commands work while preventing hangs
 */

const WebSocket = require('ws');

async function testNormalCommands() {
  console.log('🧪 FINAL TERMINAL FUNCTIONALITY TEST');
  console.log('===================================\n');

  return new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let testResults = [];
    
    ws.on('open', () => {
      console.log('📡 Connected to terminal');
      
      // Send init
      ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'init_ack') {
        console.log('✅ Terminal initialized');
        runCommandTests(ws, testResults, resolve);
      } else if (message.type === 'data') {
        // Log output for verification
        const output = message.data.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, ''); // Strip ANSI
        if (output.trim()) {
          console.log('📤 Terminal output:', JSON.stringify(output.substring(0, 50) + '...'));
        }
      }
    });
  });
}

function runCommandTests(ws, testResults, resolve) {
  console.log('\n🔍 Testing command scenarios...\n');
  
  const tests = [
    {
      name: 'Safe Command: pwd',
      command: 'pwd\n',
      shouldPrevent: false
    },
    {
      name: 'Safe Command: claude --version',
      command: 'claude --version\n',
      shouldPrevent: false
    },
    {
      name: 'Dangerous Command: claude (standalone)',
      command: 'claude\r',
      shouldPrevent: true
    },
    {
      name: 'Safe Command: ls',
      command: 'ls\n',
      shouldPrevent: false
    }
  ];
  
  let testIndex = 0;
  
  function runNextTest() {
    if (testIndex >= tests.length) {
      // All tests completed
      setTimeout(() => {
        ws.close();
        
        console.log('\n📊 TEST RESULTS SUMMARY:');
        console.log('========================');
        testResults.forEach((result, i) => {
          console.log(`${i + 1}. ${result.name}: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
        });
        
        const allPassed = testResults.every(r => r.passed);
        console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
        
        resolve({ success: allPassed, results: testResults });
      }, 1000);
      return;
    }
    
    const test = tests[testIndex];
    console.log(`Running: ${test.name}...`);
    
    // Monitor for hang prevention response
    let hangPreventionDetected = false;
    const messageHandler = (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'data' && message.data.includes('Claude CLI Usage Help')) {
          hangPreventionDetected = true;
          console.log('  🚨 Hang prevention triggered (expected)');
        }
      } catch (e) {}
    };
    
    ws.on('message', messageHandler);
    
    // Send test command
    ws.send(JSON.stringify({
      type: 'input',
      data: test.command
    }));
    
    // Wait for response
    setTimeout(() => {
      ws.off('message', messageHandler);
      
      const testPassed = test.shouldPrevent ? hangPreventionDetected : !hangPreventionDetected;
      
      testResults.push({
        name: test.name,
        passed: testPassed,
        expectPrevent: test.shouldPrevent,
        actualPrevent: hangPreventionDetected
      });
      
      console.log(`  Result: ${testPassed ? '✅ PASS' : '❌ FAIL'}\n`);
      
      testIndex++;
      setTimeout(runNextTest, 500);
    }, 2000);
  }
  
  // Start first test after short delay
  setTimeout(runNextTest, 1000);
}

// Run the test
testNormalCommands().then((results) => {
  console.log('\n🎉 Final functionality test completed!');
  if (results.success) {
    console.log('✅ Terminal is fully functional with hang prevention active');
  }
}).catch(error => {
  console.error('❌ Test failed:', error);
});