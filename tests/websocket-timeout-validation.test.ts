/**
 * WebSocket Timeout Configuration Validation Test
 * Validates that the timeout fixes resolve the "Reconnecting (1)" and "Connection Error timeout" issues
 */

import { Server } from 'socket.io';
import { createServer } from 'http';
import { io as Client, Socket } from 'socket.io-client';
import { WEBSOCKET_CONFIG } from '../config/websocket-config';

describe('WebSocket Timeout Fix Validation', () => {
  let httpServer: any;
  let io: Server;
  let clientSocket: Socket;
  let port: number;

  beforeAll((done) => {
    httpServer = createServer();
    
    // Initialize with FIXED timeout configuration
    io = new Server(httpServer, {
      cors: {
        origin: "http://localhost:3001",
        methods: ["GET", "POST"]
      },
      ...WEBSOCKET_CONFIG.SERVER
    });
    
    httpServer.listen(() => {
      port = httpServer.address()?.port;
      done();
    });
  });

  afterAll(() => {
    io.close();
    httpServer.close();
  });

  afterEach(() => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Timeout Configuration Sync', () => {
    it('should connect successfully with synchronized timeouts', (done) => {
      const connectTimeout = setTimeout(() => {
        done(new Error('Connection timeout - this should not happen with fixed config'));
      }, WEBSOCKET_CONFIG.CLIENT.timeout + 1000);

      clientSocket = Client(`http://localhost:${port}`, {
        ...WEBSOCKET_CONFIG.CLIENT,
        auth: {
          userId: 'test-user-timeout',
          username: 'Timeout Test User',
          token: 'test-token'
        }
      });

      clientSocket.on('connect', () => {
        clearTimeout(connectTimeout);
        expect(clientSocket.connected).toBe(true);
        done();
      });

      clientSocket.on('connect_error', (error) => {
        clearTimeout(connectTimeout);
        done(error);
      });
    });

    it('should handle ping/pong cycles correctly', (done) => {
      let pingReceived = false;
      let pongSent = false;

      clientSocket = Client(`http://localhost:${port}`, {
        ...WEBSOCKET_CONFIG.CLIENT,
        auth: {
          userId: 'test-user-ping',
          username: 'Ping Test User',
          token: 'test-token'
        }
      });

      clientSocket.on('connect', () => {
        // Listen for ping events
        clientSocket.on('ping', () => {
          pingReceived = true;
          clientSocket.emit('pong');
          pongSent = true;
        });

        // Send manual ping to test response
        clientSocket.emit('ping');
      });

      clientSocket.on('pong', () => {
        expect(pingReceived || pongSent).toBe(true);
        done();
      });

      setTimeout(() => {
        if (!pingReceived && !pongSent) {
          done(new Error('No ping/pong activity detected'));
        }
      }, WEBSOCKET_CONFIG.SERVER.pingInterval + 2000);
    });

    it('should reconnect properly after temporary disconnection', (done) => {
      let disconnected = false;
      let reconnected = false;

      clientSocket = Client(`http://localhost:${port}`, {
        ...WEBSOCKET_CONFIG.CLIENT,
        auth: {
          userId: 'test-user-reconnect',
          username: 'Reconnect Test User',
          token: 'test-token'
        }
      });

      clientSocket.on('connect', () => {
        if (!disconnected) {
          // Force disconnect to test reconnection
          disconnected = true;
          clientSocket.disconnect();
          
          // Reconnect after a short delay
          setTimeout(() => {
            clientSocket.connect();
          }, 500);
        } else if (!reconnected) {
          reconnected = true;
          expect(clientSocket.connected).toBe(true);
          done();
        }
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });

      // Timeout if reconnection takes too long
      setTimeout(() => {
        if (!reconnected) {
          done(new Error('Reconnection timeout - this should not happen with fixed config'));
        }
      }, WEBSOCKET_CONFIG.CLIENT.reconnectionDelayMax + 5000);
    });
  });

  describe('Error Handling Improvements', () => {
    it('should provide meaningful error messages', (done) => {
      // Try to connect to non-existent server
      const badClient = Client('http://localhost:99999', {
        ...WEBSOCKET_CONFIG.CLIENT,
        timeout: 2000,
        auth: {
          userId: 'test-user-error',
          username: 'Error Test User',
          token: 'test-token'
        }
      });

      badClient.on('connect_error', (error) => {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.message).not.toBe('Connection failed');
        badClient.disconnect();
        done();
      });

      badClient.on('connect', () => {
        badClient.disconnect();
        done(new Error('Should not have connected to non-existent server'));
      });
    });

    it('should handle rate limiting gracefully', (done) => {
      let rateLimitHit = false;

      clientSocket = Client(`http://localhost:${port}`, {
        ...WEBSOCKET_CONFIG.CLIENT,
        auth: {
          userId: 'test-user-rate-limit',
          username: 'Rate Limit Test User',
          token: 'test-token'
        }
      });

      io.on('connection', (socket) => {
        // Simulate rate limiting
        let messageCount = 0;
        socket.on('test:message', () => {
          messageCount++;
          if (messageCount > 5) {
            socket.emit('error', { message: 'Rate limit exceeded' });
            rateLimitHit = true;
          }
        });
      });

      clientSocket.on('connect', () => {
        // Send many messages quickly to trigger rate limit
        for (let i = 0; i < 10; i++) {
          clientSocket.emit('test:message', { count: i });
        }
      });

      clientSocket.on('error', (error) => {
        if (error.message.includes('Rate limit')) {
          rateLimitHit = true;
          expect(clientSocket.connected).toBe(true); // Should still be connected
          done();
        }
      });

      setTimeout(() => {
        if (!rateLimitHit) {
          done(new Error('Rate limiting was not triggered'));
        }
      }, 3000);
    });
  });

  describe('Connection State Management', () => {
    it('should track connection state accurately', (done) => {
      const connectionStates: string[] = [];

      clientSocket = Client(`http://localhost:${port}`, {
        ...WEBSOCKET_CONFIG.CLIENT,
        auth: {
          userId: 'test-user-state',
          username: 'State Test User',
          token: 'test-token'
        }
      });

      clientSocket.on('connect', () => {
        connectionStates.push('connected');
        expect(clientSocket.connected).toBe(true);
        
        // Test state after disconnect
        clientSocket.disconnect();
      });

      clientSocket.on('disconnect', () => {
        connectionStates.push('disconnected');
        expect(clientSocket.connected).toBe(false);
        
        expect(connectionStates).toEqual(['connected', 'disconnected']);
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should handle multiple rapid connection attempts gracefully', (done) => {
      let connectionAttempts = 0;
      let successfulConnections = 0;

      const attemptConnection = () => {
        connectionAttempts++;
        const client = Client(`http://localhost:${port}`, {
          ...WEBSOCKET_CONFIG.CLIENT,
          auth: {
            userId: `test-user-multi-${connectionAttempts}`,
            username: `Multi Connection Test User ${connectionAttempts}`,
            token: 'test-token'
          }
        });

        client.on('connect', () => {
          successfulConnections++;
          client.disconnect();
          
          if (connectionAttempts < 5) {
            setTimeout(attemptConnection, 100);
          } else {
            expect(successfulConnections).toBe(5);
            done();
          }
        });

        client.on('connect_error', (error) => {
          done(error);
        });
      };

      attemptConnection();
    });
  });

  describe('Real-world Scenario Tests', () => {
    it('should maintain connection during network simulation', (done) => {
      let messagesSent = 0;
      let messagesReceived = 0;
      const totalMessages = 10;

      clientSocket = Client(`http://localhost:${port}`, {
        ...WEBSOCKET_CONFIG.CLIENT,
        auth: {
          userId: 'test-user-network',
          username: 'Network Test User',
          token: 'test-token'
        }
      });

      io.on('connection', (socket) => {
        socket.on('test:echo', (data) => {
          // Simulate network delay
          setTimeout(() => {
            socket.emit('test:echo:response', data);
          }, Math.random() * 100);
        });
      });

      clientSocket.on('connect', () => {
        // Send messages with varying intervals
        const sendMessage = () => {
          if (messagesSent < totalMessages) {
            clientSocket.emit('test:echo', { id: messagesSent, timestamp: Date.now() });
            messagesSent++;
            setTimeout(sendMessage, Math.random() * 500 + 100);
          }
        };
        sendMessage();
      });

      clientSocket.on('test:echo:response', (data) => {
        messagesReceived++;
        if (messagesReceived === totalMessages) {
          expect(messagesReceived).toBe(totalMessages);
          expect(clientSocket.connected).toBe(true);
          done();
        }
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });

      // Timeout if test takes too long
      setTimeout(() => {
        if (messagesReceived < totalMessages) {
          done(new Error(`Only received ${messagesReceived}/${totalMessages} messages`));
        }
      }, 15000);
    });
  });
});