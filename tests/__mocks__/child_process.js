/**
 * Mock child_process for Claude Interaction TDD Tests
 * London School: Control all external dependencies through mocks
 */

const { EventEmitter } = require('events');

const mockSpawn = jest.fn(() => {
  const mockProcess = new EventEmitter();
  mockProcess.pid = 12345;
  mockProcess.stdout = new EventEmitter();
  mockProcess.stderr = new EventEmitter();
  mockProcess.stdin = {
    write: jest.fn(),
    end: jest.fn(),
    destroy: jest.fn()
  };
  mockProcess.kill = jest.fn();
  mockProcess.killed = false;
  mockProcess.connected = true;
  mockProcess.exitCode = null;
  mockProcess.signalCode = null;
  
  return mockProcess;
});

const mockExecSync = jest.fn(() => 'mocked exec output');

module.exports = {
  spawn: mockSpawn,
  execSync: mockExecSync,
  // Add other child_process methods as needed
  exec: jest.fn(),
  fork: jest.fn()
};