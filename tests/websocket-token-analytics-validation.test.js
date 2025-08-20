/**
 * SPARC-TDD-NLD WebSocket Token Analytics Validation Test
 * Validates the complete WebSocket connection and token analytics functionality
 */

const io = require('socket.io-client');

describe('WebSocket Token Analytics Integration Test', () => {
  let clientSocket;
  const SERVER_URL = 'http://localhost:3000';
  const TEST_USER = {
    userId: 'test-user-websocket-analytics',
    username: 'TestWebSocketUser'
  };

  beforeAll(async () => {
    // Give server time to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  beforeEach(() => {
    clientSocket = null;
  });

  afterEach((done) => {
    if (clientSocket) {
      clientSocket.disconnect();
      clientSocket = null;
    }
    done();
  });

  test('should establish WebSocket connection to backend server', (done) => {
    clientSocket = io(SERVER_URL, {
      auth: {
        userId: TEST_USER.userId,
        username: TEST_USER.username
      },
      timeout: 10000,
      forceNew: true
    });

    clientSocket.on('connect', () => {
      expect(clientSocket.connected).toBe(true);
      expect(clientSocket.id).toBeDefined();
      console.log('✅ WebSocket connection established:', clientSocket.id);
      done();
    });

    clientSocket.on('connect_error', (error) => {
      done(new Error(`Connection failed: ${error.message}`));
    });
  });

  test('should subscribe to token analytics successfully', (done) => {
    clientSocket = io(SERVER_URL, {
      auth: {
        userId: TEST_USER.userId,
        username: TEST_USER.username
      },
      timeout: 10000,
      forceNew: true
    });

    clientSocket.on('connect', () => {
      // Subscribe to token analytics
      clientSocket.emit('subscribe:token-analytics');
      
      // Listen for subscription confirmation
      clientSocket.on('token-analytics:subscribed', (data) => {
        expect(data).toBeDefined();
        expect(data.timestamp).toBeDefined();
        expect(data.status).toBe('connected');
        console.log('✅ Token analytics subscription confirmed:', data);
        done();
      });
    });

    clientSocket.on('connect_error', (error) => {
      done(new Error(`Connection failed: ${error.message}`));
    });
  });

  test('should handle token usage emission and receive updates', (done) => {
    clientSocket = io(SERVER_URL, {
      auth: {
        userId: TEST_USER.userId,
        username: TEST_USER.username
      },
      timeout: 10000,
      forceNew: true
    });

    const testTokenUsage = {
      provider: 'claude',
      model: 'claude-3-sonnet',
      tokensUsed: 1250,
      estimatedCost: 0.0125,
      requestType: 'websocket-test',
      component: 'TokenAnalyticsTest'
    };

    clientSocket.on('connect', () => {
      // Subscribe to token analytics first
      clientSocket.emit('subscribe:token-analytics');
      
      // Wait for subscription then send token usage
      setTimeout(() => {
        clientSocket.emit('token-usage', testTokenUsage);
      }, 500);
    });

    // Listen for token usage updates
    clientSocket.on('token-usage-update', (data) => {
      expect(data).toBeDefined();
      expect(data.provider).toBe(testTokenUsage.provider);
      expect(data.model).toBe(testTokenUsage.model);
      expect(data.tokensUsed).toBe(testTokenUsage.tokensUsed);
      expect(data.id).toBeDefined();
      expect(data.timestamp).toBeDefined();
      console.log('✅ Token usage update received:', data);
      done();
    });

    // Listen for acknowledgment
    clientSocket.on('token-usage-ack', (ack) => {
      expect(ack).toBeDefined();
      expect(ack.status).toBe('processed');
      console.log('✅ Token usage acknowledgment received:', ack);
    });

    clientSocket.on('connect_error', (error) => {
      done(new Error(`Connection failed: ${error.message}`));
    });
  });

  test('should handle multiple clients and broadcast token updates', (done) => {
    const client1 = io(SERVER_URL, {
      auth: { userId: 'client1', username: 'Client1' },
      timeout: 10000,
      forceNew: true
    });

    const client2 = io(SERVER_URL, {
      auth: { userId: 'client2', username: 'Client2' },
      timeout: 10000,
      forceNew: true
    });

    let client1Connected = false;
    let client2Connected = false;
    let client2ReceivedUpdate = false;

    const testTokenUsage = {
      provider: 'openai',
      model: 'gpt-4',
      tokensUsed: 890,
      estimatedCost: 0.0178,
      requestType: 'multi-client-test',
      component: 'BroadcastTest'
    };

    client1.on('connect', () => {
      client1Connected = true;
      client1.emit('subscribe:token-analytics');
      checkAndSendToken();
    });

    client2.on('connect', () => {
      client2Connected = true;
      client2.emit('subscribe:token-analytics');
      checkAndSendToken();
    });

    function checkAndSendToken() {
      if (client1Connected && client2Connected) {
        setTimeout(() => {
          client1.emit('token-usage', testTokenUsage);
        }, 500);
      }
    }

    // Client2 should receive the update sent by Client1
    client2.on('token-usage-update', (data) => {
      expect(data.provider).toBe(testTokenUsage.provider);
      expect(data.model).toBe(testTokenUsage.model);
      client2ReceivedUpdate = true;
      console.log('✅ Client2 received broadcast from Client1:', data);
      
      // Cleanup and finish test
      client1.disconnect();
      client2.disconnect();
      done();
    });

    client1.on('connect_error', (error) => {
      client1.disconnect();
      client2.disconnect();
      done(new Error(`Client1 connection failed: ${error.message}`));
    });

    client2.on('connect_error', (error) => {
      client1.disconnect();
      client2.disconnect();
      done(new Error(`Client2 connection failed: ${error.message}`));
    });
  });

  test('should handle connection with proper auth validation', (done) => {
    // Test connection without required userId
    const invalidSocket = io(SERVER_URL, {
      auth: {
        username: 'TestUser'
        // Missing userId
      },
      timeout: 5000,
      forceNew: true
    });

    invalidSocket.on('connect_error', (error) => {
      expect(error.message).toMatch(/User ID required|Authentication failed/);
      console.log('✅ Auth validation working:', error.message);
      invalidSocket.disconnect();
      done();
    });

    invalidSocket.on('connect', () => {
      invalidSocket.disconnect();
      done(new Error('Should not connect without proper auth'));
    });
  });

  test('should handle graceful disconnection and cleanup', (done) => {
    clientSocket = io(SERVER_URL, {
      auth: {
        userId: TEST_USER.userId,
        username: TEST_USER.username
      },
      timeout: 10000,
      forceNew: true
    });

    clientSocket.on('connect', () => {
      // Subscribe to token analytics
      clientSocket.emit('subscribe:token-analytics');
      
      // Wait a bit then disconnect
      setTimeout(() => {
        expect(clientSocket.connected).toBe(true);
        clientSocket.disconnect();
        
        // Verify disconnection
        setTimeout(() => {
          expect(clientSocket.connected).toBe(false);
          console.log('✅ Graceful disconnection successful');
          done();
        }, 100);
      }, 500);
    });

    clientSocket.on('connect_error', (error) => {
      done(new Error(`Connection failed: ${error.message}`));
    });
  });
});

module.exports = {
  SERVER_URL,
  TEST_USER
};