/**
 * Echo Duplication Prevention Test
 * Regression test to ensure character echo duplication doesn't occur in Claude CLI
 */

const WebSocket = require('ws');

describe('Terminal Echo Duplication Prevention', () => {
  test('Should not duplicate characters in Claude CLI interactive mode', async () => {
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let outputBuffer = '';
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Test timeout')), 20000);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
        
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'input',
            data: 'cd prod && claude --dangerously-skip-permissions\n'
          }));
        }, 1000);
        
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'input',
            data: 'test123'
          }));
        }, 8000);
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'data') {
          outputBuffer += message.data;
          
          if (outputBuffer.includes('Welcome to Claude Code') && 
              outputBuffer.includes('test123')) {
            clearTimeout(timeout);
            ws.close();
            resolve();
          }
        }
      });
      
      ws.on('error', reject);
    });
    
    // Analyze character duplication
    const testChars = ['t', 'e', 's', '1', '2', '3'];
    let duplicatesFound = 0;
    
    testChars.forEach(char => {
      const regex = new RegExp(char, 'g');
      const matches = outputBuffer.match(regex);
      const count = matches ? matches.length : 0;
      
      // If character appears more than 5 times, likely duplication
      if (count > 5) {
        duplicatesFound++;
        console.log(`Character "${char}" appears ${count} times - possible duplication`);
      }
    });
    
    expect(duplicatesFound).toBe(0); // No character duplications allowed
  });
  
  test('Should handle rapid character input without echo issues', async () => {
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let charactersSent = 0;
    let outputReceived = '';
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Rapid input test timeout')), 15000);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
        
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'input', 
            data: 'cd prod && claude --dangerously-skip-permissions\n'
          }));
        }, 1000);
        
        setTimeout(() => {
          // Send rapid character input
          'abcdefg'.split('').forEach((char, i) => {
            setTimeout(() => {
              charactersSent++;
              ws.send(JSON.stringify({ type: 'input', data: char }));
            }, i * 100);
          });
        }, 8000);
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'data') {
          outputReceived += message.data;
          
          if (outputReceived.includes('abcdefg')) {
            clearTimeout(timeout);
            ws.close();
            resolve();
          }
        }
      });
      
      ws.on('error', reject);
    });
    
    expect(charactersSent).toBe(7); // All characters sent
    expect(outputReceived).toContain('abcdefg'); // String appears in output
    
    // Count occurrences of complete string
    const stringOccurrences = (outputReceived.match(/abcdefg/g) || []).length;
    expect(stringOccurrences).toBeLessThanOrEqual(2); // Should not be heavily duplicated
  });
});