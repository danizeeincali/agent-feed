/**
 * Comprehensive Claude CLI Terminal Regression Tests
 * Prevents regression of TTY emulation and interactive Claude CLI functionality
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');

describe('Claude CLI Terminal Integration', () => {
  let terminalServer;
  
  beforeAll(async () => {
    // Start terminal server for testing
    terminalServer = spawn('node', ['backend-terminal-server.js'], {
      cwd: '/workspaces/agent-feed',
      stdio: 'pipe'
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  });
  
  afterAll(() => {
    if (terminalServer) {
      terminalServer.kill();
    }
  });
  
  test('Should establish WebSocket connection to terminal server', async () => {
    const ws = new WebSocket('ws://localhost:3002/terminal');
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        resolve();
      });
      
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  });
  
  test('Should execute Claude CLI --help command successfully', async () => {
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let helpOutput = '';
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        // Send init
        ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
        
        // Send command after delay
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'input',
            data: 'cd prod && claude --help\n'
          }));
        }, 1000);
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'data') {
          helpOutput += message.data;
          
          // Check for complete help output
          if (helpOutput.includes('Usage: claude') && 
              helpOutput.includes('Commands:') && 
              helpOutput.includes('prod')) {
            ws.close();
            resolve();
          }
        }
      });
      
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Command timeout')), 10000);
    });
    
    expect(helpOutput).toContain('Usage: claude');
    expect(helpOutput).toContain('--dangerously-skip-permissions');
    expect(helpOutput).toContain('prod'); // Working directory changed
  });
  
  test('Should start interactive Claude CLI session', async () => {
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let claudeOutput = '';
    let claudeStarted = false;
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
        
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'input',
            data: 'cd prod && claude --dangerously-skip-permissions\n'
          }));
        }, 1000);
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'data') {
          claudeOutput += message.data;
          
          // Check for Claude CLI startup
          if (claudeOutput.includes('Welcome to Claude Code') && 
              claudeOutput.includes('bypass permissions on')) {
            claudeStarted = true;
            
            // Send exit command to clean up
            setTimeout(() => {
              ws.send(JSON.stringify({
                type: 'input',
                data: '/exit\n'
              }));
              
              setTimeout(() => {
                ws.close();
                resolve();
              }, 2000);
            }, 1000);
          }
        }
      });
      
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Claude startup timeout')), 15000);
    });
    
    expect(claudeStarted).toBe(true);
    expect(claudeOutput).toContain('Welcome to Claude Code');
    expect(claudeOutput).toContain('bypass permissions on');
  });
  
  test('Should handle all 4 terminal button commands', async () => {
    const commands = [
      'cd prod && claude',
      'cd prod && claude --dangerously-skip-permissions',
      'cd prod && claude --dangerously-skip-permissions -c', 
      'cd prod && claude --dangerously-skip-permissions --resume'
    ];
    
    for (const command of commands) {
      const ws = new WebSocket('ws://localhost:3002/terminal');
      let commandExecuted = false;
      
      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
          
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'input',
              data: command + '\n'
            }));
          }, 1000);
        });
        
        let output = '';
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'data') {
            output += message.data;
            
            // Look for Claude CLI starting or help text
            if (output.includes('Claude Code') || output.includes('Usage: claude')) {
              commandExecuted = true;
              ws.send(JSON.stringify({ type: 'input', data: '\x03' })); // Ctrl+C
              setTimeout(() => {
                ws.close();
                resolve();
              }, 1000);
            }
          }
        });
        
        ws.on('error', reject);
        setTimeout(() => reject(new Error(`Command timeout: ${command}`)), 10000);
      });
      
      expect(commandExecuted).toBe(true);
    }
  });
  
  test('Should maintain proper TTY environment for interactive commands', async () => {
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let ttySupported = false;
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
        
        setTimeout(() => {
          // Test TTY detection
          ws.send(JSON.stringify({
            type: 'input',
            data: 'tty && echo "TTY_WORKING"\n'
          }));
        }, 1000);
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'data') {
          if (message.data.includes('/dev/pts/') || message.data.includes('TTY_WORKING')) {
            ttySupported = true;
            ws.close();
            resolve();
          }
        }
      });
      
      ws.on('error', reject);
      setTimeout(() => reject(new Error('TTY test timeout')), 5000);
    });
    
    expect(ttySupported).toBe(true);
  });
  
  test('Should prevent carriage return corruption regression', async () => {
    const ws = new WebSocket('ws://localhost:3002/terminal');
    let commandOutput = '';
    
    await new Promise((resolve, reject) => {
      ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'init', cols: 80, rows: 24 }));
        
        setTimeout(() => {
          ws.send(JSON.stringify({
            type: 'input',
            data: 'echo "test" && which claude\n'
          }));
        }, 1000);
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'data') {
          commandOutput += message.data;
          
          if (commandOutput.includes('claude') && commandOutput.includes('test')) {
            ws.close();
            resolve();
          }
        }
      });
      
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Command test timeout')), 5000);
    });
    
    // Should not contain corrupted command like "claudern"
    expect(commandOutput).not.toContain('claudern');
    expect(commandOutput).toContain('/home/codespace/nvm/current/bin/claude');
  });
});