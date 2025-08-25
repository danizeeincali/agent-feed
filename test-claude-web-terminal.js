/**
 * Test Claude CLI execution through web terminal
 */

const WebSocket = require('ws');

console.log('🧪 Testing Claude CLI execution through web terminal...\n');

// Connect to terminal WebSocket
const ws = new WebSocket('ws://localhost:3002/terminal');

ws.on('open', () => {
  console.log('✅ Connected to terminal WebSocket');
  
  // Send init message
  const initMessage = {
    type: 'init',
    cols: 80,
    rows: 24
  };
  
  console.log('📤 Sending init message:', JSON.stringify(initMessage));
  ws.send(JSON.stringify(initMessage));
  
  // Test command after a delay
  setTimeout(() => {
    const command = 'cd prod && claude --help';
    const commandMessage = {
      type: 'input',
      data: command + '\n'
    };
    
    console.log('📤 Sending test command:', command);
    ws.send(JSON.stringify(commandMessage));
  }, 2000);
});

ws.on('message', (data) => {
  const message = data.toString();
  console.log('📥 Received:', JSON.stringify(message));
  
  // Log first few lines of output
  if (message.includes('Claude') || message.includes('Usage:')) {
    console.log('🎉 Claude CLI output detected!');
    console.log('📝 Output snippet:', message.substring(0, 200));
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

ws.on('close', () => {
  console.log('🔌 WebSocket connection closed');
});

// Auto-close after 10 seconds
setTimeout(() => {
  console.log('⏱️  Test timeout - closing connection');
  ws.close();
  process.exit(0);
}, 10000);