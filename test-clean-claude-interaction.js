/**
 * Test Clean Claude CLI Interaction
 * Verifies no command pollution or echo issues
 */

const WebSocket = require('ws');

console.log('🧪 Testing Clean Claude CLI Interaction (No Command Pollution)\n');

const ws = new WebSocket('ws://localhost:3002/terminal');

ws.on('open', () => {
  console.log('✅ Connected to terminal WebSocket');
  
  ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
  
  setTimeout(() => {
    console.log('📤 Starting Claude CLI...');
    ws.send(JSON.stringify({
      type: 'input',
      data: 'cd prod && claude --dangerously-skip-permissions\n'
    }));
  }, 1500);
  
  setTimeout(() => {
    console.log('📤 Testing clean input: "hello world"');
    ws.send(JSON.stringify({
      type: 'input',
      data: 'hello world'
    }));
  }, 8000);
});

let output = '';
let commandPollutionDetected = false;
let claudeStarted = false;

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  if (message.type === 'data') {
    output += message.data;
    process.stdout.write(message.data);
    
    // Check for Claude CLI startup
    if (message.data.includes('Welcome to Claude Code')) {
      console.log('\n🎉 Claude CLI started successfully!');
      claudeStarted = true;
    }
    
    // Check for command pollution
    if (message.data.includes('export PS1') || 
        message.data.includes('clear') ||
        (message.data.includes('export') && message.data.includes('PS1'))) {
      commandPollutionDetected = true;
      console.log('\n❌ Command pollution detected!');
    }
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

setTimeout(() => {
  console.log('\n' + '='.repeat(50));
  console.log('📊 CLEAN INTERACTION TEST RESULTS');
  console.log('='.repeat(50));
  
  console.log(`🎯 Claude CLI Started: ${claudeStarted ? '✅ YES' : '❌ NO'}`);
  console.log(`🧹 Command Pollution: ${commandPollutionDetected ? '❌ DETECTED' : '✅ NONE'}`);
  
  // Check for hello world in output
  const helloCount = (output.match(/hello world/gi) || []).length;
  console.log(`📝 "hello world" appearances: ${helloCount}`);
  
  if (claudeStarted && !commandPollutionDetected && helloCount <= 2) {
    console.log('\n🎉 SUCCESS: Clean Claude CLI interaction working perfectly!');
    console.log('✅ No command pollution detected');
    console.log('✅ Proper interactive behavior');
  } else {
    console.log('\n❌ ISSUES DETECTED:');
    if (!claudeStarted) console.log('  - Claude CLI failed to start');
    if (commandPollutionDetected) console.log('  - Command pollution in input stream');
    if (helloCount > 2) console.log('  - Possible echo duplication');
  }
  
  ws.close();
  process.exit(claudeStarted && !commandPollutionDetected ? 0 : 1);
}, 12000);