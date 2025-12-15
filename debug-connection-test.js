// Quick WebSocket connection test
const WebSocket = require('ws');

console.log('Testing WebSocket connection to terminal server...');

const ws = new WebSocket('ws://localhost:3002/terminal');

ws.on('open', () => {
  console.log('✅ Connected to terminal server');
  
  // Send init message
  ws.send(JSON.stringify({
    type: 'init',
    cols: 80,
    rows: 24
  }));
  
  // Keep connection alive for 10 seconds
  setTimeout(() => {
    console.log('🔌 Closing connection normally');
    ws.close();
  }, 10000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('📥 Received:', message);
  } catch (e) {
    console.log('📥 Raw data:', data.toString());
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed: ${code} - ${reason}`);
});

ws.on('error', (error) => {
  console.error('❌ Connection error:', error);
});