#!/usr/bin/env node
/**
 * Simple Echo Diagnostic Test
 * Send individual characters and trace exactly what happens
 */

const WebSocket = require('ws');

async function diagnoseEcho() {
  console.log('🔍 ECHO ISSUE DIAGNOSIS');
  console.log('========================');
  
  const ws = new WebSocket('ws://localhost:3002/terminal');
  let receivedData = '';
  
  ws.on('open', () => {
    console.log('✅ Connected to terminal server');
    
    // Initialize
    ws.send(JSON.stringify({
      type: 'init',
      cols: 80,
      rows: 24
    }));
    
    // Wait for initialization, then send characters one by one
    setTimeout(() => {
      console.log('\n🧪 SENDING INDIVIDUAL CHARACTERS:');
      
      const chars = ['h', 'e', 'l', 'l', 'o'];
      let index = 0;
      
      const sendNext = () => {
        if (index < chars.length) {
          const char = chars[index];
          console.log(`📤 Sending character ${index + 1}: '${char}'`);
          
          ws.send(JSON.stringify({
            type: 'input',
            data: char,
            timestamp: Date.now(),
            source: 'diagnostic-test'
          }));
          
          index++;
          setTimeout(sendNext, 500); // 500ms delay between chars
        } else {
          // Send newline to execute
          console.log('📤 Sending newline to execute command');
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'input',
              data: '\n',
              timestamp: Date.now()
            }));
            
            // Wait and close
            setTimeout(() => {
              console.log('\n📊 FINAL DIAGNOSIS:');
              console.log('Received data:', JSON.stringify(receivedData));
              console.log('Expected: Individual character echoes');
              console.log('Actual behavior will show if characters accumulate');
              ws.close();
            }, 2000);
          }, 1000);
        }
      };
      
      setTimeout(sendNext, 2000); // Wait for shell prompt
    }, 1000);
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      if (message.type === 'data') {
        const received = message.data;
        receivedData += received;
        console.log(`📥 Received: ${JSON.stringify(received)}`);
        
        // Check for command execution
        if (received.includes('command not found') || received.includes('hello')) {
          console.log('🚨 COMMAND EXECUTED WITH:', received.match(/bash: (.*?): command not found/)?.[1] || 'unknown');
        }
      }
    } catch (e) {
      receivedData += data.toString();
      console.log(`📥 Raw: ${JSON.stringify(data.toString())}`);
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

diagnoseEcho();
