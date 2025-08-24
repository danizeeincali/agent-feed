// Enhanced Backend Validation - Direct Connection Test
const io = require('socket.io-client');
const axios = require('axios');

describe('Enhanced Backend Direct Validation', () => {
  let socket;

  afterEach(() => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  });

  test('Enhanced Backend API check responds correctly', async () => {
    const response = await axios.get('http://localhost:3001/api/claude/check');
    expect(response.status).toBe(200);
    expect(response.data.version).toBe('2.0.0-enhanced');
    console.log('✅ Enhanced API check successful');
  });

  test('Enhanced PTY launch with interactive mode', async () => {
    console.log('🚀 Testing enhanced PTY launch...');
    
    const launchResponse = await axios.post('http://localhost:3001/api/claude/launch');
    console.log('Launch response:', launchResponse.data);
    
    expect(launchResponse.data.success).toBe(true);
    expect(launchResponse.data.enhanced).toBe(true);
    expect(launchResponse.data.interactive).toBe(true);
    expect(launchResponse.data.sparc_debug_applied).toBe(true);
    
    // Wait for PTY to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check status
    const statusResponse = await axios.get('http://localhost:3001/api/claude/status');
    console.log('Status response:', statusResponse.data);
    
    expect(statusResponse.data.running).toBe(true);
    expect(statusResponse.data.enhanced).toBe(true);
    expect(statusResponse.data.pid).toBeDefined();
    
    console.log('✅ Enhanced PTY launched successfully with PID:', statusResponse.data.pid);
  }, 15000);

  test('Enhanced PTY command execution through WebSocket', (done) => {
    console.log('🔌 Testing enhanced WebSocket command execution...');
    
    socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 10000
    });
    
    let outputReceived = false;
    let commandSent = false;
    
    socket.on('connect', () => {
      console.log('✅ Connected to enhanced backend:', socket.id);
      
      // Wait a moment for PTY initialization, then send command
      setTimeout(() => {
        console.log('📝 Sending enhanced test command...');
        socket.emit('terminal:input', 'echo "enhanced-backend-test-success"\n');
        commandSent = true;
      }, 1000);
    });
    
    socket.on('terminal:output', (data) => {
      console.log('📤 Enhanced output received:', data.substring(0, 100));
      outputReceived = true;
      
      if (data.includes('enhanced-backend-test-success')) {
        console.log('✅ Enhanced PTY command executed successfully!');
        done();
      } else if (data.includes('$') && commandSent) {
        // Got prompt, try command again
        console.log('🔄 Got prompt, retrying command...');
        socket.emit('terminal:input', 'pwd\n');
      } else if (data.includes('/workspaces')) {
        console.log('✅ Enhanced PTY working directory confirmed!');
        done();
      }
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Enhanced connection error:', error);
      done(error);
    });
    
    // Timeout handling
    setTimeout(() => {
      if (!outputReceived) {
        done(new Error('No enhanced output received within 12 seconds'));
      } else if (!commandSent) {
        done(new Error('Command not sent within timeout'));
      } else {
        done(new Error('Command sent but no success response within 12 seconds'));
      }
    }, 12000);
  }, 15000);

  test('Enhanced PTY persistence validation', async () => {
    console.log('🔄 Testing enhanced PTY persistence...');
    
    // Send multiple commands to verify PTY stays alive
    return new Promise((resolve, reject) => {
      socket = io('http://localhost:3001');
      
      let commandCount = 0;
      const commands = ['pwd', 'echo "test1"', 'echo "test2"', 'whoami'];
      let responses = [];
      
      socket.on('connect', () => {
        console.log('✅ Connected for persistence test');
        sendNextCommand();
      });
      
      socket.on('terminal:output', (data) => {
        responses.push(data);
        console.log(`📤 Response ${responses.length}:`, data.substring(0, 50));
        
        if (data.includes('$') && commandCount < commands.length) {
          setTimeout(sendNextCommand, 500);
        } else if (commandCount >= commands.length && responses.length >= 8) {
          console.log('✅ Enhanced PTY persistent through multiple commands');
          resolve();
        }
      });
      
      function sendNextCommand() {
        if (commandCount < commands.length) {
          const cmd = commands[commandCount];
          console.log(`📝 Sending command ${commandCount + 1}: ${cmd}`);
          socket.emit('terminal:input', cmd + '\n');
          commandCount++;
        }
      }
      
      socket.on('connect_error', reject);
      
      setTimeout(() => {
        reject(new Error('Persistence test timeout - PTY may have died'));
      }, 15000);
    });
  }, 20000);
});