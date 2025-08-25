/**
 * Simple Claude CLI Interaction Test
 * Tests if the echo duplication issue is resolved
 */

const WebSocket = require('ws');

console.log('🧪 Simple Claude CLI Echo Test\n');

const ws = new WebSocket('ws://localhost:3002/terminal');

ws.on('open', () => {
  console.log('✅ Connected to terminal');
  
  ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
  
  setTimeout(() => {
    console.log('📤 Starting Claude CLI...');
    ws.send(JSON.stringify({
      type: 'input',
      data: 'cd prod && claude --dangerously-skip-permissions\n'
    }));
  }, 2000);
  
  setTimeout(() => {
    console.log('📤 Typing "hello" to test echo behavior...');
    ws.send(JSON.stringify({
      type: 'input',
      data: 'hello'
    }));
  }, 10000);
});

let outputLog = '';
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === 'data') {
    outputLog += msg.data;
    process.stdout.write(msg.data);
    
    if (msg.data.includes('Welcome to Claude Code')) {
      console.log('\n🎉 Claude CLI started!');
    }
  }
});

ws.on('error', (error) => {
  console.error('❌ Error:', error);
});

setTimeout(() => {
  console.log('\n⏱️  Test complete');
  
  // Quick analysis
  const helloMatches = (outputLog.match(/hello/g) || []).length;
  console.log(`\n📊 Word "hello" appears ${helloMatches} times in output`);
  
  if (helloMatches <= 2) {
    console.log('✅ Echo behavior looks normal');
  } else {
    console.log('⚠️  Possible echo duplication still present');
  }
  
  ws.close();
  process.exit(0);
}, 15000);