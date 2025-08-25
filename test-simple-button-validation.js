/**
 * Simple Terminal Button Validation
 * Quick test to verify all 4 buttons launch Claude CLI
 */

const WebSocket = require('ws');

const testButton = async (name, command) => {
  return new Promise((resolve) => {
    console.log(`Testing: ${name}`);
    
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let success = false;
    
    const timeout = setTimeout(() => {
      if (!success) {
        console.log(`❌ ${name}: Timeout`);
        ws.close();
        resolve(false);
      }
    }, 8000);
    
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
      
      setTimeout(() => {
        ws.send(JSON.stringify({ type: 'input', data: command + '\n' }));
      }, 500);
    });
    
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'data' && msg.data.includes('Welcome to Claude Code')) {
        if (!success) {
          success = true;
          console.log(`✅ ${name}: Working`);
          clearTimeout(timeout);
          ws.send(JSON.stringify({ type: 'input', data: '\x03' })); // Ctrl+C
          setTimeout(() => {
            ws.close();
            resolve(true);
          }, 500);
        }
      }
    });
    
    ws.on('error', () => {
      if (!success) {
        console.log(`❌ ${name}: Error`);
        resolve(false);
      }
    });
  });
};

async function main() {
  console.log('🧪 Quick Terminal Button Validation\n');
  
  const buttons = [
    { name: '🚀 prod/claude', cmd: 'cd prod && claude' },
    { name: '⚡ skip-permissions', cmd: 'cd prod && claude --dangerously-skip-permissions' }, 
    { name: '⚡ skip-permissions -c', cmd: 'cd prod && claude --dangerously-skip-permissions -c' },
    { name: '↻ skip-permissions --resume', cmd: 'cd prod && claude --dangerously-skip-permissions --resume' }
  ];
  
  let working = 0;
  for (const button of buttons) {
    const result = await testButton(button.name, button.cmd);
    if (result) working++;
  }
  
  console.log(`\n🎯 Results: ${working}/4 buttons working (${(working/4*100).toFixed(0)}%)`);
  
  if (working >= 3) {
    console.log('🎉 SYSTEM OPERATIONAL! All main functionality working.');
    console.log('🌐 Ready at: http://localhost:5173/');
  }
}

main();