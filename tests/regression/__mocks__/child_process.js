/**
 * Mock child_process module for TDD London School tests
 * 
 * Provides deterministic process spawning behavior for testing
 */

const { EventEmitter } = require('events');

class MockChildProcess extends EventEmitter {
  constructor(command, args, options) {
    super();
    this.pid = Math.floor(Math.random() * 9999) + 1000;
    this.killed = false;
    this.exitCode = null;
    this.command = command;
    this.args = args || [];
    this.options = options || {};
    
    // Mock streams
    this.stdin = new EventEmitter();
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    
    // Add stream methods
    this.stdin.write = jest.fn();
    this.stdin.end = jest.fn();
    this.stdin.destroyed = false;
    
    this.kill = jest.fn((signal = 'SIGTERM') => {
      this.killed = true;
      this.exitCode = signal === 'SIGKILL' ? 137 : 0;
      setTimeout(() => this.emit('exit', this.exitCode, signal), 10);
      return true;
    });
    
    // Simulate successful spawn after short delay
    setTimeout(() => {
      this.emit('spawn');
    }, 10);
  }
}

const spawn = jest.fn((command, args, options) => {
  return new MockChildProcess(command, args, options);
});

const execSync = jest.fn((command, options) => {
  if (command.includes('claude --help')) {
    return 'Claude CLI v1.0.0\nUsage: claude [options]';
  }
  if (command.includes('claude --version')) {
    return 'v1.0.0';
  }
  throw new Error(`Command failed: ${command}`);
});

const exec = jest.fn((command, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  setTimeout(() => {
    if (command.includes('claude --help')) {
      callback(null, 'Claude CLI v1.0.0', '');
    } else {
      callback(new Error(`Command failed: ${command}`), '', 'Command not found');
    }
  }, 10);
});

module.exports = {
  spawn,
  execSync,
  exec,
  MockChildProcess
};