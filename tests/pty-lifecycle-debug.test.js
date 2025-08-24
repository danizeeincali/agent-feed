// TDD Test Suite for PTY Lifecycle Debug - SPARC:Debug Implementation
const pty = require('node-pty');
const axios = require('axios');
const io = require('socket.io-client');

describe('PTY Lifecycle Debug - SPARC:Debug Analysis', () => {
  let testPty;
  let socket;

  afterEach(() => {
    if (testPty && !testPty.killed) {
      testPty.kill();
    }
    if (socket) {
      socket.disconnect();
    }
  });

  test('SPARC:Debug - PTY spawn environment validation', (done) => {
    console.log('🔍 SPARC:Debug - Testing PTY spawn environment...');
    
    testPty = pty.spawn('bash', [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-color',
        SHELL: '/bin/bash',
        PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin'
      }
    });

    console.log(`✅ PTY spawned with PID: ${testPty.pid}`);
    console.log(`📁 Working directory: ${process.cwd()}`);
    console.log(`🌍 Environment TERM: ${process.env.TERM || 'undefined'}`);
    console.log(`🐚 Environment SHELL: ${process.env.SHELL || 'undefined'}`);

    let dataReceived = false;
    let exitReceived = false;

    testPty.on('data', (data) => {
      console.log(`📤 PTY Data received: "${data.substring(0, 100)}"`);
      dataReceived = true;
      
      if (!exitReceived) {
        // Test if PTY is responsive by sending a command
        setTimeout(() => {
          console.log('📝 Sending test command: echo "pty-test"');
          testPty.write('echo "pty-test"\n');
        }, 100);
      }
    });

    testPty.on('exit', (code, signal) => {
      console.log(`❌ PTY exited with code: ${code}, signal: ${signal}`);
      exitReceived = true;
      
      if (code === 0 && !dataReceived) {
        done(new Error('PTY exited immediately with code 0 - NO DATA RECEIVED'));
      } else if (code !== 0) {
        done(new Error(`PTY exited with non-zero code: ${code}`));
      }
    });

    // Give PTY time to initialize and send data
    setTimeout(() => {
      if (dataReceived && !exitReceived) {
        console.log('✅ PTY is alive and responsive');
        done();
      } else if (!dataReceived && !exitReceived) {
        done(new Error('PTY spawned but sent no initial data within 3 seconds'));
      }
    }, 3000);
  }, 10000);

  test('SPARC:Debug - Enhanced PTY spawn with signal handlers', (done) => {
    console.log('🔍 SPARC:Debug - Testing PTY with enhanced signal handling...');
    
    testPty = pty.spawn('bash', ['-i'], {  // Interactive mode
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-color',
        SHELL: '/bin/bash',
        PS1: '$ ',
        BASH_ENV: '',
        ENV: ''
      }
    });

    console.log(`✅ Interactive PTY spawned with PID: ${testPty.pid}`);
    
    let initialData = '';
    let commandOutput = '';
    
    testPty.on('data', (data) => {
      initialData += data;
      console.log(`📤 PTY Data: "${data.replace(/\r\n/g, '\\r\\n').substring(0, 50)}"`);
      
      // Look for prompt and send test command
      if (data.includes('$') && !commandOutput) {
        setTimeout(() => {
          console.log('📝 Sending pwd command...');
          testPty.write('pwd\n');
        }, 100);
      }
      
      if (data.includes('/workspaces')) {
        commandOutput = data;
        console.log('✅ Command executed successfully');
        done();
      }
    });

    testPty.on('exit', (code, signal) => {
      console.log(`❌ Interactive PTY exited with code: ${code}, signal: ${signal}`);
      console.log(`📊 Initial data length: ${initialData.length}`);
      
      if (!commandOutput) {
        done(new Error(`Interactive PTY exited before command execution. Code: ${code}, Initial data: "${initialData.substring(0, 100)}"`));
      }
    });

    setTimeout(() => {
      if (!initialData) {
        done(new Error('No initial data received from interactive PTY'));
      }
    }, 5000);
  }, 15000);

  test('SPARC:Debug - Backend PTY lifecycle through API', async () => {
    console.log('🔍 SPARC:Debug - Testing backend PTY through API...');
    
    try {
      // Launch PTY through backend API
      const launchResponse = await axios.post('http://localhost:3001/api/claude/launch');
      console.log('✅ Launch response:', launchResponse.data);
      
      expect(launchResponse.data.success).toBe(true);
      expect(launchResponse.data.pid).toBeDefined();
      
      const pid = launchResponse.data.pid;
      console.log(`📋 PTY launched with PID: ${pid}`);
      
      // Wait a moment for PTY to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check status
      const statusResponse = await axios.get('http://localhost:3001/api/claude/status');
      console.log('📊 Status response:', statusResponse.data);
      
      expect(statusResponse.data.running).toBe(true);
      expect(statusResponse.data.pid).toBe(pid);
      
      // Connect via WebSocket to test interaction
      return new Promise((resolve, reject) => {
        socket = io('http://localhost:3001', {
          transports: ['websocket', 'polling'],
          timeout: 5000
        });
        
        let outputReceived = false;
        
        socket.on('connect', () => {
          console.log('✅ WebSocket connected for PTY testing');
          
          // Send test command
          socket.emit('terminal:input', 'echo "backend-pty-test"\n');
          console.log('📝 Sent test command through WebSocket');
        });
        
        socket.on('terminal:output', (data) => {
          console.log(`📤 Received output: "${data.substring(0, 50)}"`);
          outputReceived = true;
          
          if (data.includes('backend-pty-test')) {
            console.log('✅ Backend PTY command executed successfully');
            resolve();
          }
        });
        
        socket.on('connect_error', reject);
        
        setTimeout(() => {
          if (!outputReceived) {
            reject(new Error('No output received from backend PTY within 8 seconds'));
          }
        }, 8000);
      });
      
    } catch (error) {
      console.error('❌ Backend PTY test failed:', error.message);
      throw error;
    }
  }, 20000);

  test('SPARC:Debug - PTY environment diagnostics', () => {
    console.log('🔍 SPARC:Debug - Running environment diagnostics...');
    
    // Check system bash
    const bashPath = require('child_process').execSync('which bash', { encoding: 'utf8' }).trim();
    console.log(`🐚 Bash location: ${bashPath}`);
    
    // Check environment
    console.log(`🌍 PWD: ${process.cwd()}`);
    console.log(`📋 NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    console.log(`🔧 PATH length: ${(process.env.PATH || '').length}`);
    console.log(`🖥️ TERM: ${process.env.TERM || 'undefined'}`);
    console.log(`🐚 SHELL: ${process.env.SHELL || 'undefined'}`);
    
    // Test basic PTY creation
    testPty = pty.spawn(bashPath, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: process.env
    });
    
    console.log(`✅ PTY created with explicit bash path, PID: ${testPty.pid}`);
    expect(testPty.pid).toBeDefined();
    expect(testPty.killed).toBe(false);
  });
});