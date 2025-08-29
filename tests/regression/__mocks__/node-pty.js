/**
 * Mock node-pty module for TDD London School tests
 * 
 * Provides deterministic PTY behavior for testing
 */

const { EventEmitter } = require('events');

class MockPtyProcess extends EventEmitter {
  constructor(command, args, options) {
    super();
    this.pid = Math.floor(Math.random() * 9999) + 1000;
    this.killed = false;
    this.command = command;
    this.args = args || [];
    this.options = options || {};
    
    // PTY-specific properties
    this.cols = options.cols || 80;
    this.rows = options.rows || 24;
    
    // PTY methods
    this.write = jest.fn((data) => {
      // Echo input back as would happen in a real terminal
      setTimeout(() => {
        if (this.onDataCallback) {
          this.onDataCallback(data);
        }
      }, 5);
    });
    
    this.kill = jest.fn((signal = 'SIGTERM') => {
      this.killed = true;
      const exitCode = signal === 'SIGKILL' ? 137 : 0;
      setTimeout(() => {
        if (this.onExitCallback) {
          this.onExitCallback({ exitCode, signal });
        }
      }, 10);
      return true;
    });
    
    this.resize = jest.fn((cols, rows) => {
      this.cols = cols;
      this.rows = rows;
    });
    
    this.onData = jest.fn((callback) => {
      this.onDataCallback = callback;
    });
    
    this.onExit = jest.fn((callback) => {
      this.onExitCallback = callback;
    });
    
    // Simulate PTY ready state
    setTimeout(() => {
      this.emit('spawn');
    }, 10);
  }
}

const spawn = jest.fn((command, args, options) => {
  return new MockPtyProcess(command, args, options);
});

// Create mock PTY object with spawn method
const mockPty = {
  spawn: spawn
};

module.exports = {
  spawn,
  MockPtyProcess,
  default: mockPty
};