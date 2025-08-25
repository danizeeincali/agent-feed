/**
 * Test Interactive Claude CLI Session
 */

const WebSocket = require('ws');

console.log('🧪 Testing Interactive Claude CLI session...\n');

const ws = new WebSocket('ws://localhost:3002/terminal');

ws.on('open', () => {
  console.log('✅ Connected to terminal WebSocket');
  
  // Send init message
  ws.send(JSON.stringify({
    type: 'init',
    cols: 80,
    rows: 24
  }));
  
  // Start interactive Claude CLI after delay
  setTimeout(() => {
    console.log('📤 Starting interactive Claude CLI');
    ws.send(JSON.stringify({
      type: 'input',
      data: 'cd prod && claude --dangerously-skip-permissions\n'
    }));
  }, 2000);
  
  // Send a test prompt after Claude starts
  setTimeout(() => {
    console.log('📤 Sending test prompt to Claude');
    ws.send(JSON.stringify({
      type: 'input', 
      data: 'hello world\n'
    }));
  }, 8000);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  if (message.type === 'data') {
    process.stdout.write(message.data);
    
    // Look for Claude CLI startup
    if (message.data.includes('Claude Code')) {
      console.log('\n🎉 Claude CLI started successfully!');
    }
    
    // Look for Claude response
    if (message.data.includes('Hello') || message.data.includes('world')) {
      console.log('\n🎉 Claude CLI responded to prompt!');
    }
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

// Auto-close after 20 seconds
setTimeout(() => {
  console.log('\n⏱️  Test complete - closing connection');
  ws.close();
  process.exit(0);
}, 20000);