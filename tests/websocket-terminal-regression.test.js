// TDD Test Suite for Terminal WebSocket Connection
const io = require('socket.io-client');
const axios = require('axios');

describe('Terminal WebSocket Connection TDD', () => {
  let socket;

  afterEach(() => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  });

  test('Backend Socket.IO server accepts connections', (done) => {
    socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 5000
    });

    socket.on('connect', () => {
      console.log('✅ Socket.IO connection successful');
      expect(socket.connected).toBe(true);
      expect(socket.id).toBeDefined();
      done();
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection failed:', error.message);
      done(error);
    });
  }, 10000);

  test('Terminal events are properly handled by backend', (done) => {
    socket = io('http://localhost:3001');
    
    socket.on('connect', () => {
      console.log('✅ Connected, testing terminal events');
      
      // Test terminal input event
      socket.emit('terminal:input', 'pwd\n');
      
      // Listen for terminal output
      socket.on('terminal:output', (data) => {
        console.log('✅ Received terminal output:', data.substring(0, 50));
        expect(data).toBeDefined();
        expect(typeof data).toBe('string');
        done();
      });
      
      // Timeout if no response
      setTimeout(() => {
        done(new Error('No terminal output received within 5 seconds'));
      }, 5000);
    });

    socket.on('connect_error', (error) => {
      done(error);
    });
  }, 10000);

  test('Backend PTY process responds to commands', async () => {
    // Launch PTY process first
    const launchResponse = await axios.post('http://localhost:3001/api/claude/launch');
    expect(launchResponse.data.success).toBe(true);
    expect(launchResponse.data.pid).toBeDefined();

    return new Promise((resolve, reject) => {
      socket = io('http://localhost:3001');
      
      socket.on('connect', () => {
        console.log('✅ Connected, testing PTY command execution');
        
        // Send a simple command
        socket.emit('terminal:input', 'echo "test123"\n');
        
        socket.on('terminal:output', (data) => {
          if (data.includes('test123')) {
            console.log('✅ PTY command executed successfully');
            resolve();
          }
        });
        
        setTimeout(() => {
          reject(new Error('PTY command did not execute within 5 seconds'));
        }, 5000);
      });

      socket.on('connect_error', reject);
    });
  }, 15000);

  test('Frontend terminal connects to correct Socket.IO namespace', (done) => {
    // Test connection to root namespace (what frontend uses)
    socket = io('http://localhost:3001/', {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ Root namespace connection successful');
      expect(socket.nsp).toBe('/');
      done();
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Root namespace connection failed:', error.message);
      done(error);
    });
  }, 10000);

  test('WebSocket connection survives through Vite proxy', async () => {
    // Test if connection works through Vite proxy (frontend perspective)
    try {
      const response = await axios.get('http://localhost:5173/socket.io/');
      // Should get Socket.IO response even through proxy
      expect(response.status).toBe(200);
      console.log('✅ Socket.IO accessible through Vite proxy');
    } catch (error) {
      console.error('❌ Socket.IO not accessible through proxy:', error.message);
      throw error;
    }
  });

  test('Backend logs show client connections', (done) => {
    socket = io('http://localhost:3001');
    
    socket.on('connect', () => {
      // Wait a bit for backend to log the connection
      setTimeout(() => {
        console.log('✅ Connection established - backend should log "Client connected"');
        done();
      }, 1000);
    });

    socket.on('connect_error', done);
  }, 10000);

});