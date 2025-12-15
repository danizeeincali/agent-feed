/**
 * Final Validation: All 4 Terminal Buttons Working
 * Tests the exact functionality user will experience
 */

const WebSocket = require('ws');

console.log('🧪 FINAL VALIDATION: Testing all 4 terminal launcher buttons\n');

const buttons = [
  {
    name: '🚀 prod/claude',
    command: 'cd prod && claude'
  },
  {
    name: '⚡ skip-permissions', 
    command: 'cd prod && claude --dangerously-skip-permissions'
  },
  {
    name: '⚡ skip-permissions -c',
    command: 'cd prod && claude --dangerously-skip-permissions -c'
  },
  {
    name: '↻ skip-permissions --resume',
    command: 'cd prod && claude --dangerously-skip-permissions --resume'
  }
];

async function testButton(button) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔍 Testing: ${button.name}`);
    console.log(`📤 Command: ${button.command}`);
    
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let output = '';
    let claudeStarted = false;
    
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`Timeout testing ${button.name}`));
    }, 15000);
    
    ws.on('open', () => {
      // Send init
      ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
      
      // Send command
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'input',
          data: button.command + '\n'
        }));
      }, 1000);
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'data') {
        output += message.data;
        
        // Check for Claude CLI startup indicators
        if (output.includes('Welcome to Claude Code') || 
            output.includes('/help for help') ||
            (output.includes('Usage: claude') && output.includes('prod'))) {
          claudeStarted = true;
          console.log(`✅ ${button.name}: Claude CLI started successfully!`);
          
          // Send exit to clean up
          ws.send(JSON.stringify({ type: 'input', data: '\x03\n' })); // Ctrl+C
          
          setTimeout(() => {
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          }, 1000);
        }
      }
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive validation of all terminal buttons...\n');
  
  let passedTests = 0;
  const totalTests = buttons.length;
  
  for (const button of buttons) {
    try {
      await testButton(button);
      passedTests++;
    } catch (error) {
      console.error(`❌ ${button.name}: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 FINAL VALIDATION RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}/${totalTests} terminal buttons`);
  console.log(`🎯 Success Rate: ${(passedTests/totalTests*100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! 4-Button Terminal Launcher is fully functional!');
    console.log('🌐 Ready for user testing at: http://localhost:5173/');
  } else {
    console.log(`⚠️  ${totalTests - passedTests} tests failed. System needs debugging.`);
  }
  
  process.exit(passedTests === totalTests ? 0 : 1);
}

runAllTests();