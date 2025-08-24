// Enhanced Backend PTY Test with Improved Lifecycle Management
const pty = require('node-pty');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

describe('Enhanced PTY Backend Implementation', () => {
  let testApp;
  let testServer;
  let testIo;
  let testPty;

  afterEach(() => {
    if (testPty && !testPty.killed) {
      testPty.kill();
    }
    if (testServer) {
      testServer.close();
    }
  });

  test('TDD: Create enhanced PTY with proper lifecycle management', (done) => {
    console.log('🔧 Creating enhanced PTY backend...');
    
    // Enhanced PTY creation function
    function createEnhancedPTY() {
      const bashPath = '/bin/bash';
      
      const ptyProcess = pty.spawn(bashPath, ['-i'], {  // Interactive shell
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: process.cwd(),
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          SHELL: '/bin/bash',
          PATH: process.env.PATH,
          HOME: process.env.HOME || '/root',
          USER: process.env.USER || 'root',
          PS1: '\\u@\\h:\\w\\$ ',  // Custom prompt
          HISTCONTROL: 'ignoredups',
          BASH_SILENCE_DEPRECATION_WARNING: '1'
        }
      });
      
      console.log(`✅ Enhanced PTY created with PID: ${ptyProcess.pid}`);
      
      // Enhanced event handling
      ptyProcess.on('spawn', () => {
        console.log('🚀 PTY spawn event fired');
      });
      
      ptyProcess.on('data', (data) => {
        console.log(`📤 PTY data (${data.length} chars): "${data.substring(0, 100)}"`);
      });
      
      ptyProcess.on('exit', (code, signal) => {
        console.log(`🚪 PTY exit: code=${code}, signal=${signal}`);
        if (code === 0 && !signal) {
          console.log('⚠️ PTY exited normally - this might indicate immediate termination');
        }
      });
      
      ptyProcess.on('error', (error) => {
        console.error('❌ PTY error:', error);
      });
      
      return ptyProcess;
    }
    
    testPty = createEnhancedPTY();
    
    let dataReceived = false;
    let promptReceived = false;
    
    testPty.on('data', (data) => {
      dataReceived = true;
      
      // Look for shell prompt
      if (data.includes('$') || data.includes('#') || data.includes('>')) {
        promptReceived = true;
        console.log('✅ Shell prompt detected');
        
        // Send test command
        setTimeout(() => {
          console.log('📝 Sending test command...');
          testPty.write('echo "enhanced-test-success"\n');
        }, 100);
      }
      
      // Look for command output
      if (data.includes('enhanced-test-success')) {
        console.log('✅ Enhanced PTY command execution successful');
        done();
      }
    });
    
    testPty.on('exit', (code) => {
      if (!dataReceived) {
        done(new Error(`Enhanced PTY exited immediately with code ${code} - NO DATA`));
      }
    });
    
    setTimeout(() => {
      if (!dataReceived) {
        done(new Error('Enhanced PTY produced no output within 5 seconds'));
      } else if (!promptReceived) {
        done(new Error('Enhanced PTY data received but no prompt detected'));
      }
    }, 5000);
  }, 10000);

  test('TDD: Enhanced backend server with better PTY management', (done) => {
    console.log('🔧 Creating enhanced backend server...');
    
    testApp = express();
    testServer = http.createServer(testApp);
    testIo = socketIo(testServer);
    
    let claudeProcess = null;
    
    // Enhanced launch endpoint
    testApp.post('/api/claude/launch', (req, res) => {
      console.log('🚀 Enhanced launch called');
      
      try {
        if (claudeProcess) {
          console.log('🔄 Killing existing process:', claudeProcess.pid);
          claudeProcess.kill('SIGTERM');
          claudeProcess = null;
          // Wait for cleanup
          setTimeout(createNewProcess, 500);
        } else {
          createNewProcess();
        }
        
        function createNewProcess() {
          claudeProcess = pty.spawn('/bin/bash', ['-i'], {
            name: 'xterm-256color',
            cols: 80,
            rows: 24,
            cwd: process.cwd(),
            env: {
              ...process.env,
              TERM: 'xterm-256color',
              SHELL: '/bin/bash',
              PS1: '$ ',
              HOME: process.env.HOME || '/root',
              USER: process.env.USER || 'root'
            }
          });
          
          console.log(`✅ Enhanced PTY created with PID: ${claudeProcess.pid}`);
          
          // Enhanced data handling
          claudeProcess.on('data', (data) => {
            console.log(`📤 Enhanced PTY data: "${data.substring(0, 50)}"`);
            testIo.emit('terminal:output', data);
          });
          
          // Enhanced exit handling
          claudeProcess.on('exit', (code, signal) => {
            console.log(`🚪 Enhanced PTY exit: code=${code}, signal=${signal}`);
            if (code === 0 && !signal) {
              console.log('⚠️ WARNING: PTY exited with code 0 - possible immediate termination');
              // Try to respawn if exit was unexpected
              setTimeout(() => {
                if (!claudeProcess) {
                  console.log('🔄 Auto-respawning PTY...');
                  createNewProcess();
                }
              }, 1000);
            }
            claudeProcess = null;
          });
          
          claudeProcess.on('error', (error) => {
            console.error('❌ Enhanced PTY error:', error);
            claudeProcess = null;
          });
          
          res.json({
            success: true,
            message: 'Enhanced Claude launched successfully',
            pid: claudeProcess.pid,
            enhanced: true
          });
        }
        
      } catch (error) {
        console.error('❌ Enhanced launch error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
    
    // Enhanced Socket.IO handling
    testIo.on('connection', (socket) => {
      console.log('🔌 Enhanced client connected');
      
      socket.on('terminal:input', (data) => {
        console.log(`📝 Enhanced input: "${data.substring(0, 20)}"`);
        if (claudeProcess && !claudeProcess.killed) {
          claudeProcess.write(data);
        } else {
          console.log('⚠️ No enhanced PTY process available');
          socket.emit('terminal:output', 'Error: Enhanced terminal process not available\r\n');
        }
      });
    });
    
    testServer.listen(3002, () => {
      console.log('✅ Enhanced test server running on port 3002');
      done();
    });
  }, 10000);
});