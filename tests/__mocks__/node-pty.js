/**
 * Mock node-pty for Claude Interaction TDD Tests
 * London School: Mock PTY behavior for contract testing
 */

const mockSpawn = jest.fn(() => {
  return {
    pid: 12346,
    onData: jest.fn(),
    onExit: jest.fn(),
    write: jest.fn(),
    resize: jest.fn(),
    kill: jest.fn(),
    process: 'claude'
  };
});

module.exports = {
  spawn: mockSpawn
};