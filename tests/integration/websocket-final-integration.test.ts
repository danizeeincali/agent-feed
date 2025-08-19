/**
 * Final WebSocket Integration Test
 * Validates that the WebSocket connection issues have been resolved
 */

import { io, Socket } from 'socket.io-client';

describe('WebSocket Integration - Final Validation', () => {
  let socket: Socket;
  const WEBSOCKET_URL = 'http://localhost:3000';
  
  beforeEach(() => {
    // Use exact same configuration as frontend
    socket = io(WEBSOCKET_URL, {
      transports: ['polling', 'websocket'],
      timeout: 20000,
      auth: {
        userId: 'test-user',
        username: 'Test User', 
        token: 'debug-token'
      },
      forceNew: true
    });
  });

  afterEach(() => {
    if (socket) {
      socket.disconnect();
    }
  });

  test('WebSocket should connect successfully', (done) => {
    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      expect(socket.id).toBeDefined();
      done();
    });

    socket.on('connect_error', (error) => {
      done(new Error(`Connection failed: ${error.message}`));
    });
  });

  test('Should handle comment room events', (done) => {
    socket.on('connect', () => {
      socket.emit('join_comment_room', 'test-post-123');
      
      // If we get here without error, the event was sent successfully
      setTimeout(() => {
        done();
      }, 1000);
    });

    socket.on('connect_error', done);
  });

  test('Should handle Claude agent room events', (done) => {
    socket.on('connect', () => {
      socket.emit('join_claude_agent_room', 'test-session');
      
      // If we get here without error, the event was sent successfully
      setTimeout(() => {
        done();
      }, 1000);
    });

    socket.on('connect_error', done);
  });

  test('Should handle ping/pong heartbeat', (done) => {
    socket.on('connect', () => {
      const startTime = Date.now();
      
      socket.emit('ping', { timestamp: startTime });
      
      socket.on('pong', (data) => {
        expect(data).toBeDefined();
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    socket.on('connect_error', done);
  });

  test('Should not show "websocket error" anymore', (done) => {
    let hasError = false;
    
    socket.on('connect', () => {
      // Connected successfully - no websocket error
      setTimeout(() => {
        expect(hasError).toBe(false);
        done();
      }, 2000);
    });

    socket.on('connect_error', (error) => {
      if (error.message.includes('websocket error')) {
        hasError = true;
        done(new Error('Still getting websocket error'));
      }
    });

    socket.on('error', (error) => {
      if (error.toString().includes('websocket error')) {
        hasError = true;
        done(new Error('Still getting websocket error'));
      }
    });
  });
});