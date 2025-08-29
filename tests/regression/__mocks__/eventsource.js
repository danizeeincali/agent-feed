/**
 * Mock EventSource for TDD London School SSE tests
 * 
 * Provides deterministic SSE client behavior for testing
 */

const { EventEmitter } = require('events');

class MockEventSource extends EventEmitter {
  constructor(url, options = {}) {
    super();
    this.url = url;
    this.readyState = MockEventSource.CONNECTING;
    this.withCredentials = options.withCredentials || false;
    
    // EventSource properties
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    
    // Mock connection states
    this.CONNECTING = 0;
    this.OPEN = 1;
    this.CLOSED = 2;
    
    // Track event listeners for testing
    this.eventListeners = new Map();
    
    // Simulate connection after short delay
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      if (this.onopen) {
        this.onopen({ type: 'open' });
      }
      this.emit('open');
    }, 10);
  }
  
  addEventListener(type, listener) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type).push(listener);
    this.on(type, listener);
  }
  
  removeEventListener(type, listener) {
    const listeners = this.eventListeners.get(type) || [];
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    this.removeListener(type, listener);
  }
  
  close() {
    this.readyState = MockEventSource.CLOSED;
    this.emit('close');
  }
  
  // Test helper: simulate receiving a message
  simulateMessage(data, eventType = 'message') {
    const event = {
      type: eventType,
      data: data,
      lastEventId: '',
      origin: new URL(this.url).origin
    };
    
    if (this.onmessage && eventType === 'message') {
      this.onmessage(event);
    }
    
    this.emit(eventType, event);
  }
  
  // Test helper: simulate connection error
  simulateError(error = new Error('Connection failed')) {
    const errorEvent = { type: 'error', error };
    
    if (this.onerror) {
      this.onerror(errorEvent);
    }
    
    this.emit('error', errorEvent);
  }
}

// Static constants
MockEventSource.CONNECTING = 0;
MockEventSource.OPEN = 1;
MockEventSource.CLOSED = 2;

module.exports = MockEventSource;
