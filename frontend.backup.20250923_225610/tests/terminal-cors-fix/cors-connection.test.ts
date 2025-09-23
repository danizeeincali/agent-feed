/**
 * TDD Terminal CORS Connection Tests
 * Testing WebSocket CORS configuration fixes
 */

import { io, Socket } from 'socket.io-client';
import { describe, test, expect, beforeEach, afterEach } from '@jest/testing-library/jest-dom';

describe('Terminal CORS WebSocket Connection Tests', () => {
  let socket: Socket;
  const serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:3000';
  
  beforeEach(() => {
    // Clean slate for each test
    if (socket) {
      socket.disconnect();
    }
  });
  
  afterEach(() => {
    if (socket) {
      socket.disconnect();
    }
  });

  test('should connect from localhost:3001 without CORS errors', (done) => {
    socket = io(serverUrl, {
      transports: ['websocket'],
      timeout: 5000,
      forceNew: true
    });
    
    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      expect(socket.id).toBeDefined();
      done();
    });
    
    socket.on('connect_error', (error) => {
      expect(error.message).not.toContain('CORS');
      expect(error.message).not.toContain('Not allowed by CORS');
      done.fail(`Connection failed: ${error.message}`);
    });
    
    // Timeout fallback
    setTimeout(() => {
      if (!socket.connected) {
        done.fail('Connection timeout - CORS may be blocking');
      }
    }, 6000);
  });

  test('should support multiple transport types', (done) => {
    socket = io(serverUrl, {
      transports: ['polling', 'websocket'],
      upgrade: true,
      timeout: 5000
    });
    
    let transportEvents = [];
    
    socket.on('connect', () => {
      transportEvents.push('connected');
      expect(socket.connected).toBe(true);
      
      // Test transport upgrade
      if (socket.io.engine.transport.name === 'websocket') {
        transportEvents.push('websocket');
      }
      
      expect(transportEvents).toContain('connected');
      done();
    });
    
    socket.on('connect_error', (error) => {
      done.fail(`Transport test failed: ${error.message}`);
    });
  });

  test('should handle preflight OPTIONS requests correctly', async () => {
    // Test preflight request handling
    const response = await fetch(`${serverUrl}/socket.io/`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3001',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  test('should accept WebSocket upgrade with proper headers', (done) => {
    socket = io(serverUrl, {
      transports: ['websocket'],
      upgrade: true,
      extraHeaders: {
        'Origin': 'http://localhost:3001'
      }
    });
    
    socket.on('connect', () => {
      expect(socket.io.engine.transport.name).toBe('websocket');
      expect(socket.connected).toBe(true);
      done();
    });
    
    socket.on('connect_error', (error) => {
      expect(error.message).not.toContain('CORS');
      done.fail(`WebSocket upgrade failed: ${error.message}`);
    });
  });

  test('should maintain connection stability', (done) => {
    socket = io(serverUrl, {
      transports: ['websocket'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000
    });
    
    let disconnectCount = 0;
    let reconnectCount = 0;
    
    socket.on('connect', () => {
      if (reconnectCount === 0) {
        // First connection
        expect(socket.connected).toBe(true);
        
        // Simulate disconnect/reconnect cycle
        setTimeout(() => {
          socket.disconnect();
        }, 1000);
      } else {
        // Reconnection successful
        expect(socket.connected).toBe(true);
        expect(reconnectCount).toBe(1);
        done();
      }
    });
    
    socket.on('disconnect', (reason) => {
      disconnectCount++;
      expect(reason).not.toContain('CORS');
    });
    
    socket.on('reconnect', () => {
      reconnectCount++;
    });
    
    socket.on('connect_error', (error) => {
      done.fail(`Connection stability test failed: ${error.message}`);
    });
  });

  test('should handle terminal-specific events without CORS interference', (done) => {
    socket = io(serverUrl, {
      transports: ['websocket']
    });
    
    socket.on('connect', () => {
      // Test terminal-specific event handling
      socket.emit('terminal:input', { input: 'echo "CORS test"' });
      
      socket.on('terminal:output', (data) => {
        expect(data).toBeDefined();
        expect(typeof data).toBe('object');
        done();
      });
      
      socket.on('terminal:error', (error) => {
        expect(error.error).not.toContain('CORS');
        done.fail(`Terminal event failed: ${error.error}`);
      });
    });
    
    socket.on('connect_error', (error) => {
      done.fail(`Terminal event test failed: ${error.message}`);
    });
  });
});