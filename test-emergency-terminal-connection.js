#!/usr/bin/env node

/**
 * 🚨 EMERGENCY TEST: Validate Terminal WebSocket JSON Message Processing
 * Tests that the frontend correctly extracts terminal data from JSON messages
 */

const WebSocket = require('ws');

console.log('🚨 EMERGENCY: Testing Terminal WebSocket JSON Message Processing...');

// Connect to emergency backend
const ws = new WebSocket('ws://localhost:3002/terminal');

ws.on('open', () => {
  console.log('✅ Connected to emergency backend on port 3002');
  
  // Send initialization
  const initMessage = {
    type: 'init',
    cols: 80,
    rows: 24
  };
  ws.send(JSON.stringify(initMessage));
  console.log('📤 Sent init message:', initMessage);

  // Test command that produces output
  setTimeout(() => {
    const testCommand = {
      type: 'input',
      data: 'echo "🚨 EMERGENCY TEST: JSON to Terminal Output Fix" && pwd\n'
    };
    ws.send(JSON.stringify(testCommand));
    console.log('📤 Sent test command');
  }, 2000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('\n📥 RECEIVED JSON MESSAGE:');
    console.log('  Type:', message.type);
    console.log('  Data length:', message.data ? message.data.length : 0);
    console.log('  Data preview:', message.data ? JSON.stringify(message.data.substring(0, 100)) : 'No data');
    console.log('  Full message:', JSON.stringify(message).substring(0, 200) + '...');
    
    // Check if this is terminal output
    if (message.type === 'data' && message.data) {
      console.log('\n🔍 EXTRACTING TERMINAL DATA FROM JSON:');
      console.log('  Raw terminal output:', JSON.stringify(message.data));
      console.log('  Should display as:', message.data.replace(/\r?\n/g, '\\n'));
      console.log('  🎯 CRITICAL: Frontend should show ONLY this data, NOT the raw JSON');
    }
    
  } catch (error) {
    console.log('\n📥 RECEIVED RAW DATA (not JSON):', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed: ${code} - ${reason || 'No reason'}`);
});

// Auto-close after 10 seconds
setTimeout(() => {
  console.log('\n🏁 Test completed - closing connection');
  ws.close();
  process.exit(0);
}, 10000);