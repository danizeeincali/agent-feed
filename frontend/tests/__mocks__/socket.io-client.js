/**
 * Mock for Socket.IO Client
 * 
 * Provides comprehensive mocking for WebSocket terminal connections
 * with event tracking and duplication detection for TDD tests.
 */

class MockSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
    this.connected = false;
    this.disconnected = true;
    
    // Event tracking for behavior verification
    this.eventHandlers = new Map();
    this.emittedMessages = [];
    this.connectionHistory = [];
    
    // Mock socket state
    this.id = 'mock-socket-' + Math.random().toString(36).substr(2, 9);
    
    // Auto-connect simulation
    setTimeout(() => {
      this.connected = true;
      this.disconnected = false;
      this.connectionHistory.push({
        action: 'connect',
        timestamp: Date.now()
      });
      this.emit('connect');
    }, 10);
  }
  
  // Event handler registration with duplicate tracking
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    
    const handlers = this.eventHandlers.get(event);
    handlers.push({
      handler,
      registered: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    });
    
    // Simulate potential duplicate handler registration bug
    if (process.env.SIMULATE_DUPLICATE_HANDLERS === 'true') {
      handlers.push({
        handler,
        registered: Date.now(),
        id: 'duplicate-' + Math.random().toString(36).substr(2, 9),
        isDuplicate: true
      });
    }
    
    return this;
  }
  
  // Emit events to registered handlers
  emit(event, ...args) {
    // Track emitted messages for duplication analysis
    if (event !== 'connect' && event !== 'disconnect') {
      this.emittedMessages.push({
        event,
        args,
        timestamp: Date.now()
      });
    }
    
    // Call registered handlers
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(({ handler }) => {
      if (typeof handler === 'function') {
        try {
          handler(...args);
        } catch (error) {
          console.error('Mock socket handler error:', error);
        }
      }
    });
    
    // Simulate server echo for terminal input (potential double echo bug)
    if (event === 'message' && args[0]?.type === 'input') {
      setTimeout(() => {
        this.simulateServerResponse('output', { data: args[0].data });
        
        // Simulate double echo bug for RED phase
        if (process.env.SIMULATE_DOUBLE_ECHO === 'true') {
          setTimeout(() => {
            this.simulateServerResponse('output', { 
              data: args[0].data,
              isDuplicate: true 
            });
          }, 5);
        }
      }, 1);
    }
    
    return this;
  }
  
  // Simulate server responses
  simulateServerResponse(event, data) {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(({ handler }) => {
      if (typeof handler === 'function') {
        handler(data);
      }
    });
  }
  
  // Connection control
  disconnect() {
    this.connected = false;
    this.disconnected = true;
    this.connectionHistory.push({
      action: 'disconnect',
      timestamp: Date.now()
    });
    this.emit('disconnect', 'client disconnect');
    return this;
  }
  
  connect() {
    if (!this.connected) {
      this.connected = true;
      this.disconnected = false;
      this.connectionHistory.push({
        action: 'connect',
        timestamp: Date.now()
      });
      setTimeout(() => this.emit('connect'), 1);
    }
    return this;
  }
  
  removeAllListeners(event) {
    if (event) {
      this.eventHandlers.delete(event);
    } else {
      this.eventHandlers.clear();
    }
    return this;
  }
  
  // Test utility methods
  getHandlerCount(event) {
    return this.eventHandlers.get(event)?.length || 0;
  }
  
  getDuplicateHandlers(event) {
    const handlers = this.eventHandlers.get(event) || [];
    return handlers.filter(h => h.isDuplicate);
  }
  
  getEmittedMessages() {
    return this.emittedMessages;
  }
  
  getDuplicateMessages() {
    const seen = new Map();
    const duplicates = [];
    
    this.emittedMessages.forEach(msg => {
      const key = JSON.stringify({ event: msg.event, args: msg.args });
      if (seen.has(key)) {
        duplicates.push(msg);
      } else {
        seen.set(key, msg);
      }
    });
    
    return duplicates;
  }
  
  getConnectionCount() {
    return this.connectionHistory.filter(h => h.action === 'connect').length;
  }
  
  // Mock auth and room methods
  auth(credentials) {
    return this;
  }
  
  join(room) {
    return this;
  }
  
  leave(room) {
    return this;
  }
}

// Mock io function
export const io = jest.fn((url, options) => {
  const socket = new MockSocket(url, options);
  
  // Track socket creation for connection duplication tests
  io._sockets = io._sockets || [];
  io._sockets.push(socket);
  
  return socket;
});

// Test utilities
io.getSockets = () => io._sockets || [];
io.getSocketCount = () => (io._sockets || []).length;
io.clearSockets = () => { io._sockets = []; };

// Mock Manager class
export class Manager {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
  }
  
  socket(namespace) {
    return new MockSocket(this.url + namespace, this.options);
  }
}

export default { io, Manager };