/**
 * Mock fs for Claude Interaction TDD Tests
 * London School: Control filesystem interactions
 */

const mockExistsSync = jest.fn(() => true);
const mockStatSync = jest.fn(() => ({
  isDirectory: () => true,
  isFile: () => true,
  mode: 0o755
}));
const mockRealpathSync = jest.fn((path) => path);

module.exports = {
  existsSync: mockExistsSync,
  statSync: mockStatSync,
  realpathSync: mockRealpathSync,
  // Add other fs methods as needed
  readFileSync: jest.fn(() => 'mocked file content'),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
};