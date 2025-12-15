// Test Claude CLI execution in terminal sessions
const WebSocket = require('ws');

console.log('🧪 Testing Claude CLI execution in terminal sessions...');

function testClaudeCommand(commandName, command) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔧 Testing: ${commandName}`);
    console.log(`📤 Command: ${command}`);
    
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let output = '';
    let hasError = false;
    let claudeFound = false;
    
    ws.on('open', () => {
      console.log('✅ Connected to terminal server');
      
      // Send init message
      ws.send(JSON.stringify({
        type: 'init',
        cols: 80,
        rows: 24
      }));
      
      // Send command after short delay
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'input',
          data: command + '\\r\\n'
        }));
      }, 500);
      
      // Check output after 3 seconds
      setTimeout(() => {
        if (output.includes('Claude Code not found')) {
          console.error('❌ Claude CLI not found!');
          hasError = true;
        } else if (output.includes('command not found') || output.includes('No such file')) {
          console.error('❌ Command execution failed');
          hasError = true;
        } else if (output.includes('Claude') || output.includes('claude') || output.includes('Starting')) {
          console.log('✅ Claude command executed successfully');
          claudeFound = true;
        }
        
        ws.close();
        
        if (hasError) {
          reject(new Error('Claude CLI not found or failed'));
        } else {
          resolve({ command: commandName, success: true, claudeFound });
        }
      }, 3000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'data' && message.data) {
          output += message.data;
          
          // Check for error messages in real-time
          if (message.data.includes('Claude Code not found')) {
            console.error('❌ ERROR DETECTED: Claude Code not found');
            console.log('📋 Output so far:', output);
          } else if (message.data.includes('command not found')) {
            console.error('❌ ERROR DETECTED: Command not found');
            console.log('📋 Output so far:', output);
          }
        }
      } catch (err) {
        // Raw text data
        output += data.toString();
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      reject(error);
    });
    
    ws.on('close', () => {
      console.log('🔌 Connection closed');
    });
  });
}

async function testWhichClaude() {
  return new Promise((resolve) => {
    console.log('\\n🔍 Testing: which claude');
    
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let output = '';
    
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'init',
        cols: 80,
        rows: 24
      }));
      
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'input',
          data: 'which claude\\r\\n'
        }));
      }, 500);
      
      setTimeout(() => {
        if (output.includes('/claude')) {
          console.log('✅ Claude found at:', output.match(/\/[^\s]+claude/)?.[0]);
        } else {
          console.log('❌ Claude not found in PATH');
        }
        ws.close();
        resolve();
      }, 2000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === 'data' && message.data) {
          output += message.data;
        }
      } catch (err) {
        output += data.toString();
      }
    });
  });
}

async function runTests() {
  const testCases = [
    { name: '🚀 prod/claude', command: 'cd prod && claude' },
    { name: '⚡ skip-permissions', command: 'cd prod && claude --dangerously-skip-permissions' },
    { name: '⚡ skip-permissions -c', command: 'cd prod && claude --dangerously-skip-permissions -c' },
    { name: '↻ skip-permissions --resume', command: 'cd prod && claude --dangerously-skip-permissions --resume' }
  ];
  
  console.log('🎯 Running Claude CLI execution tests...');
  
  // First test if claude is in PATH
  await testWhichClaude();
  
  // Test direct claude execution
  console.log('\\n🔍 Testing direct Claude execution with full path...');
  await testClaudeCommand(
    'Direct Claude with full path',
    '/home/codespace/nvm/current/bin/claude --version'
  ).catch(err => console.error('Direct test failed:', err.message));
  
  // Test the 4 button commands
  let successCount = 0;
  let failureCount = 0;
  
  for (const testCase of testCases) {
    try {
      await testClaudeCommand(testCase.name, testCase.command);
      successCount++;
    } catch (error) {
      console.error(`❌ ${testCase.name} failed:`, error.message);
      failureCount++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\\n🎉 TEST RESULTS:');
  console.log(`✅ Successful: ${successCount}/${testCases.length}`);
  console.log(`❌ Failed: ${failureCount}/${testCases.length}`);
  
  if (failureCount > 0) {
    console.log('\\n⚠️ Claude CLI PATH issue detected!');
    console.log('The terminal sessions are not finding the Claude CLI.');
    console.log('PATH needs to include: /home/codespace/nvm/current/bin/claude');
    process.exit(1);
  } else {
    console.log('\\n🎯 All Claude CLI commands work correctly!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('🚨 Test suite failed:', err);
  process.exit(1);
});