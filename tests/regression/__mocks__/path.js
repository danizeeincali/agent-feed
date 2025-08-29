// Selective path mock that preserves Jest functionality
const originalPath = require("path");

// Only mock specific functions if needed, preserve others for Jest
module.exports = {
  ...originalPath,
  // Add specific overrides here if needed for tests
  // dirname: jest.fn().mockImplementation(originalPath.dirname),
  // join: jest.fn().mockImplementation(originalPath.join),
  // resolve: jest.fn().mockImplementation(originalPath.resolve),
};
