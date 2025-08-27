/**
 * Mock implementation of Node.js child_process module
 * 
 * TDD London School Approach:
 * - Mock external dependencies completely
 * - Focus on interaction contracts, not implementation
 * - Provide controllable behavior for testing
 */

const { EventEmitter } = require('events');
// Jest is available globally in test environment

class MockChildProcess extends EventEmitter {
  constructor(command, args, options) {
    super();
    
    this.pid = Math.floor(Math.random() * 90000) + 10000;
    this.command = command;
    this.args = args;
    this.options = options;
    this.killed = false;
    this.connected = true;
    this.exitCode = null;
    this.signalCode = null;
    
    // Mock stdio streams
    this.stdin = {
      write: jest.fn(),
      end: jest.fn(),
      destroy: jest.fn(),
      writable: true
    };
    
    this.stdout = {
      on: jest.fn(),
      pipe: jest.fn(),
      readable: true,
      read: jest.fn()
    };
    
    this.stderr = {
      on: jest.fn(),
      readable: true,
      read: jest.fn()
    };
    
    // Auto-emit spawn event after creation
    process.nextTick(() => {
      if (!this.killed) {
        this.emit('spawn');
      }
    });
  }
  
  kill(signal = 'SIGTERM') {
    if (!this.killed) {
      this.killed = true;
      this.connected = false;
      
      process.nextTick(() => {
        this.exitCode = signal === 'SIGKILL' ? 9 : 0;
        this.signalCode = signal;
        this.emit('exit', this.exitCode, this.signalCode);
      });
    }
    return true;
  }
}

// Mock spawn function that creates MockChildProcess instances
const spawn = jest.fn((command, args = [], options = {}) => {
  return new MockChildProcess(command, args, options);
});

// Mock exec function (not typically used for interactive processes)
const exec = jest.fn((command, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  process.nextTick(() => {
    if (callback) {
      callback(null, 'mock exec output', '');
    }
  });
  
  return new MockChildProcess(command, [], options);
});

// Mock execSync function
const execSync = jest.fn((command, options = {}) => {
  return 'mock execSync output';
});

// Mock fork function
const fork = jest.fn((modulePath, args = [], options = {}) => {
  return new MockChildProcess('node', [modulePath, ...args], options);
});

module.exports = {
  spawn,
  exec,
  execSync,
  fork,
  MockChildProcess
};