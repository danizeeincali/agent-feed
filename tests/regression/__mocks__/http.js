/**
 * Mock HTTP module for TDD London School SSE server tests
 * 
 * Provides deterministic HTTP server behavior for testing
 */

const { EventEmitter } = require('events');

class MockIncomingMessage extends EventEmitter {
  constructor(options = {}) {
    super();
    this.headers = options.headers || {};
    this.method = options.method || 'GET';
    this.url = options.url || '/';
    this.httpVersion = '1.1';
    this.statusCode = null;
    this.statusMessage = null;
    this.setTimeout = jest.fn();
  }
}

class MockServerResponse extends EventEmitter {
  constructor() {
    super();
    this.writable = true;
    this.destroyed = false;
    this.writableEnded = false;
    this.headersSent = false;
    this.statusCode = 200;
    
    // Mock methods
    this.writeHead = jest.fn((statusCode, headers) => {
      this.statusCode = statusCode;
      this.headersSent = true;
      if (headers) {
        Object.assign(this.headers || {}, headers);
      }
    });
    
    this.write = jest.fn((chunk) => {
      if (this.destroyed || this.writableEnded) {
        throw new Error('Cannot write after response ended');
      }
      return true;
    });
    
    this.end = jest.fn((data) => {
      if (data) {
        this.write(data);
      }
      this.writableEnded = true;
      this.emit('finish');
    });
    
    this.setTimeout = jest.fn();
    this.setHeader = jest.fn();
    this.getHeader = jest.fn();
  }
  
  // Test helper: simulate connection close
  simulateClose() {
    this.destroyed = true;
    this.writable = false;
    this.emit('close');
  }
  
  // Test helper: simulate error
  simulateError(error) {
    this.emit('error', error);
  }
}

class MockServer extends EventEmitter {
  constructor() {
    super();
    this.listening = false;
    this.connections = [];
  }
  
  listen(port, callback) {
    this.listening = true;
    if (callback) {
      setTimeout(callback, 10);
    }
    setTimeout(() => {
      this.emit('listening');
    }, 10);
  }
  
  close(callback) {
    this.listening = false;
    if (callback) {
      setTimeout(callback, 10);
    }
    setTimeout(() => {
      this.emit('close');
    }, 10);
  }
  
  // Test helper: simulate incoming request
  simulateRequest(options = {}) {
    const req = new MockIncomingMessage(options);
    const res = new MockServerResponse();
    
    // Track connection
    this.connections.push({ req, res });
    
    setTimeout(() => {
      this.emit('request', req, res);
    }, 0);
    
    return { req, res };
  }
}

const createServer = jest.fn(() => new MockServer());

module.exports = {
  createServer,
  IncomingMessage: MockIncomingMessage,
  ServerResponse: MockServerResponse,
  Server: MockServer
};
