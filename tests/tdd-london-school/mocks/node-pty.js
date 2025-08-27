/**
 * Mock implementation of node-pty module
 * 
 * TDD London School Approach:
 * - Mock PTY (pseudo-terminal) behavior
 * - Focus on contract verification for terminal emulation
 * - Provide controllable PTY process for testing
 */

// Jest is available globally in test environment

class MockPtyProcess {
  constructor(command, args, options) {
    this.pid = Math.floor(Math.random() * 90000) + 10000;
    this.command = command;
    this.args = args;
    this.options = options;
    
    // PTY-specific properties
    this.cols = options.cols || 80;
    this.rows = options.rows || 24;
    this.killed = false;
    this.destroyed = false;
    
    // Mock PTY methods
    this.write = jest.fn();
    this.resize = jest.fn();
    this.kill = jest.fn();
    this.destroy = jest.fn();
    
    // Event handlers storage
    this._dataHandlers = [];
    this._exitHandlers = [];
    
    // PTY event registration methods
    this.onData = jest.fn((callback) => {
      this._dataHandlers.push(callback);
    });
    
    this.onExit = jest.fn((callback) => {
      this._exitHandlers.push(callback);
    });
    
    this.removeAllListeners = jest.fn();
    
    // Auto-emit spawn-like behavior
    process.nextTick(() => {
      this._emitData('\r\n'); // Initial terminal output
    });
  }
  
  // Internal method to simulate data emission
  _emitData(data) {
    this._dataHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in PTY data handler:', error);
      }
    });
  }
  
  // Internal method to simulate exit
  _emitExit(exitCode = 0, signal = null) {
    this._exitHandlers.forEach(handler => {
      try {
        handler({ exitCode, signal });
      } catch (error) {
        console.error('Error in PTY exit handler:', error);
      }
    });
  }
  
  // Mock write method implementation
  write(data) {
    if (this.destroyed || this.killed) {
      throw new Error('Cannot write to destroyed PTY');
    }
    
    // Echo back data (common PTY behavior for testing)
    process.nextTick(() => {
      this._emitData(data);
    });
    
    return true;
  }
  
  // Mock resize method implementation
  resize(cols, rows) {
    if (this.destroyed) return false;
    
    this.cols = cols;
    this.rows = rows;
    return true;
  }
  
  // Mock kill method implementation
  kill(signal = 'SIGTERM') {
    if (this.killed) return false;
    
    this.killed = true;
    
    process.nextTick(() => {
      const exitCode = signal === 'SIGKILL' ? 9 : 0;
      this._emitExit(exitCode, signal);
    });
    
    return true;
  }
  
  // Mock destroy method implementation
  destroy() {
    this.destroyed = true;
    this.killed = true;
    this._dataHandlers = [];
    this._exitHandlers = [];
  }
}

// Mock spawn function that creates MockPtyProcess instances
const spawn = jest.fn((command, args = [], options = {}) => {
  return new MockPtyProcess(command, args, options);
});

// Mock native addon loading (node-pty uses native bindings)
const native = {
  startProcess: jest.fn(),
  kill: jest.fn(),
  resize: jest.fn()
};

module.exports = {
  spawn,
  native,
  MockPtyProcess
};