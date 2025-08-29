// SSE Testing Setup
import '@testing-library/jest-dom';

// Mock EventSource globally with tracking
class MockEventSource {
  constructor(url, options = {}) {
    this.url = url;
    this.readyState = EventSource.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.listeners = new Map();
    this.isClosed = false;
    
    // Store instance for test access
    MockEventSource.instances.push(this);
    
    // Track connection attempts
    if (!MockEventSource.connectionAttempts) {
      MockEventSource.connectionAttempts = [];
    }
    MockEventSource.connectionAttempts.push({ url, timestamp: Date.now() });
    
    // Simulate connection opening
    setTimeout(() => {
      if (!this.isClosed) {
        this.readyState = EventSource.OPEN;
        if (this.onopen) this.onopen({ type: 'open' });
        this.dispatchEvent({ type: 'open' });
      }
    }, 0);
  }
  
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type).push(listener);
  }
  
  removeEventListener(type, listener) {
    if (this.listeners.has(type)) {
      const listeners = this.listeners.get(type);
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  dispatchEvent(event) {
    const listeners = this.listeners.get(event.type) || [];
    listeners.forEach(listener => listener(event));
  }
  
  close() {
    this.readyState = EventSource.CLOSED;
    this.isClosed = true;
  }
  
  // Test helpers
  static instances = [];
  static connectionAttempts = [];
  
  static reset() {
    MockEventSource.instances = [];
  }
  
  static resetTracking() {
    MockEventSource.connectionAttempts = [];
    MockEventSource.instances = [];
  }
  
  static simulateMessage(data, type = 'message') {
    MockEventSource.instances.forEach(instance => {
      if (!instance.isClosed) {
        const event = { type, data };
        if (instance.onmessage) instance.onmessage(event);
        instance.dispatchEvent(event);
      }
    });
  }
  
  static simulateError(error = 'Connection failed') {
    MockEventSource.instances.forEach(instance => {
      if (!instance.isClosed) {
        const event = { type: 'error', error };
        if (instance.onerror) instance.onerror(event);
        instance.dispatchEvent(event);
      }
    });
  }
}

// Static constants
MockEventSource.CONNECTING = 0;
MockEventSource.OPEN = 1;
MockEventSource.CLOSED = 2;

global.EventSource = MockEventSource;

// Mock WebSocket to prevent actual connections with tracking
class MockWebSocket {
  static connectionAttempts = [];
  static resetTracking() {
    MockWebSocket.connectionAttempts = [];
  }

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    
    // Track connection attempts
    MockWebSocket.connectionAttempts.push({ url, timestamp: Date.now() });
    
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 10);
  }
  
  send(data) {
    if (this.onmessage) {
      setTimeout(() => {
        this.onmessage({ data: `Echo: ${data}` });
      }, 5);
    }
  }
  
  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
}

MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

global.WebSocket = MockWebSocket;

// Mock performance.now for timing tests
global.performance = {
  now: jest.fn(() => Date.now())
};

// Reset before each test
beforeEach(() => {
  MockEventSource.resetTracking();
  if (global.WebSocket && global.WebSocket.resetTracking) {
    global.WebSocket.resetTracking();
  }
  jest.clearAllMocks();
});

// Common test utilities
global.createMockClaudeOutput = (type = 'response', includeBoxDrawing = true) => {
  const boxDrawing = includeBoxDrawing ? '┌─────────────────────┐\n│' : '';
  const content = {
    response: `${boxDrawing} Claude Response ${boxDrawing ? '│\n└─────────────────────┘' : ''}`,
    error: `${boxDrawing} Error: Something went wrong ${boxDrawing ? '│\n└─────────────────────┘' : ''}`,
    welcome: `${boxDrawing} Welcome to Claude ${boxDrawing ? '│\n└─────────────────────┘' : ''}`
  };
  return content[type] || content.response;
};

global.createAnsiOutput = (text) => {
  return `\x1b[32m${text}\x1b[0m`; // Green text
};