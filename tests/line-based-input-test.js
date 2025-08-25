#!/usr/bin/env node
/**
 * Test script to verify line-based input buffering prevents Claude CLI UI redraw
 */

const WebSocket = require('ws');

function testLineBasedInput() {
  console.log('🧪 Testing line-based input buffering...');
  
  const ws = new WebSocket('ws://localhost:3002/terminal');
  
  ws.on('open', () => {
    console.log('✅ Connected to terminal server');
    
    // Send init message
    ws.send(JSON.stringify({
      type: 'init',
      cols: 80,
      rows: 24
    }));
    
    setTimeout(() => {
      console.log('📝 Sending characters one by one (should be buffered)...');
      
      // Simulate typing "claude --help" character by character
      const command = "claude --help\n";
      
      command.split('').forEach((char, index) => {
        setTimeout(() => {
          console.log(`Sending char ${index + 1}/${command.length}: "${char}" (${char.charCodeAt(0)})`);
          
          ws.send(JSON.stringify({
            type: 'input',
            data: char,
            source: 'test'
          }));
        }, index * 100); // 100ms delay between characters
      });
      
      // Close connection after test
      setTimeout(() => {
        console.log('🏁 Test completed');
        ws.close();
      }, command.length * 100 + 2000);
      
    }, 1000);
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 Received message type: ${message.type}`);
      
      if (message.type === 'data' && message.data) {
        console.log(`📤 Terminal output: ${JSON.stringify(message.data.substring(0, 50))}`);
      }
    } catch (error) {
      console.log(`📤 Raw data received: ${JSON.stringify(data.toString().substring(0, 50))}`);
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
  
  ws.on('close', () => {
    console.log('🔌 Connection closed');
    process.exit(0);
  });
}

if (require.main === module) {
  testLineBasedInput();
}

module.exports = { testLineBasedInput };