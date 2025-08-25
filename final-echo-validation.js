#!/usr/bin/env node
/**
 * FINAL Echo Fix Validation - Focused on actual command execution
 */

const WebSocket = require('ws');

class FinalValidator {
  async validate() {
    console.log('🎯 FINAL ECHO VALIDATION TEST');
    console.log('==============================');
    
    const ws = new WebSocket('ws://localhost:3002/terminal');
    
    return new Promise((resolve) => {
      let commandOutput = '';
      let foundCommand = false;
      
      ws.on('open', () => {
        console.log('✅ Connected to terminal server');
        
        ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
        
        setTimeout(() => {
          console.log('📤 Typing "hello" character by character...');
          
          const chars = ['h', 'e', 'l', 'l', 'o', '\n'];
          let index = 0;
          
          const sendNext = () => {
            if (index < chars.length) {
              const char = chars[index];
              ws.send(JSON.stringify({
                type: 'input',
                data: char,
                timestamp: Date.now()
              }));
              index++;
              setTimeout(sendNext, 100);
            }
          };
          
          setTimeout(sendNext, 2000);
        }, 1000);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type === 'data') {
            const received = message.data;
            
            // Look for bash command execution
            if (received.includes('bash: ') && received.includes('command not found')) {
              commandOutput = received;
              foundCommand = true;
              
              // Extract the command that bash tried to execute
              const commandMatch = received.match(/bash: (.*?): command not found/);
              const executedCommand = commandMatch ? commandMatch[1] : 'unknown';
              
              console.log('🔍 Command executed by bash:', `"${executedCommand}"`);
              
              if (executedCommand === 'hello') {
                console.log('✅ ECHO FIX SUCCESS: Bash received exactly "hello"');
                console.log('✅ No character duplication detected');
                console.log('✅ Proper character-by-character echo working');
                console.log('\n🎉 CHARACTER ECHO DUPLICATION FIXED!');
              } else {
                console.log(`❌ ECHO FIX FAILED: Expected "hello", got "${executedCommand}"`);
              }
              
              ws.close();
              resolve(executedCommand === 'hello');
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      });
      
      ws.on('close', () => {
        if (!foundCommand) {
          console.log('⚠️  No command execution detected');
          resolve(false);
        }
      });
      
      ws.on('error', (error) => {
        console.error('❌ Test error:', error);
        resolve(false);
      });
    });
  }
}

const validator = new FinalValidator();
validator.validate().then((success) => {
  process.exit(success ? 0 : 1);
});
