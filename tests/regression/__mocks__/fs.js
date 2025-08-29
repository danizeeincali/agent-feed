/**
 * Mock fs module for TDD London School tests
 * 
 * Provides deterministic filesystem behavior for testing
 */

const path = require('path');

// Mock file system state
const mockFiles = new Map();
const mockDirectories = new Set([
  '/workspaces/agent-feed',
  '/workspaces/agent-feed/prod',
  '/workspaces/agent-feed/src',
  '/workspaces/agent-feed/tests',
  '/workspaces/agent-feed/frontend',
  '/home/codespace',
  '/home/codespace/.claude'
]);

// Default mock files
mockFiles.set('/home/codespace/.claude/.credentials.json', JSON.stringify({
  api_key: 'test-api-key',
  session_key: 'test-session-key'
}));

const existsSync = jest.fn((filePath) => {
  return mockDirectories.has(filePath) || mockFiles.has(filePath);
});

const readFileSync = jest.fn((filePath, encoding = 'utf8') => {
  if (mockFiles.has(filePath)) {
    const content = mockFiles.get(filePath);
    return encoding === 'utf8' ? content : Buffer.from(content);
  }
  throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
});

const writeFileSync = jest.fn((filePath, data) => {
  mockFiles.set(filePath, data.toString());
});

const mkdirSync = jest.fn((dirPath, options) => {
  mockDirectories.add(dirPath);
  
  if (options?.recursive) {
    // Add all parent directories
    const parts = dirPath.split(path.sep);
    let currentPath = '';
    
    for (const part of parts) {
      if (part) {
        currentPath = currentPath ? path.join(currentPath, part) : part;
        mockDirectories.add(currentPath);
      }
    }
  }
});

const rmSync = jest.fn((targetPath, options) => {
  if (mockDirectories.has(targetPath)) {
    mockDirectories.delete(targetPath);
  }
  if (mockFiles.has(targetPath)) {
    mockFiles.delete(targetPath);
  }
});

// Promises API
const promises = {
  stat: jest.fn(async (filePath) => {
    if (!mockDirectories.has(filePath) && !mockFiles.has(filePath)) {
      throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
    }
    
    return {
      isDirectory: () => mockDirectories.has(filePath),
      isFile: () => mockFiles.has(filePath),
      size: mockFiles.has(filePath) ? mockFiles.get(filePath).length : 0,
      mtime: new Date(),
      birthtime: new Date()
    };
  }),
  
  access: jest.fn(async (filePath, mode) => {
    if (!mockDirectories.has(filePath) && !mockFiles.has(filePath)) {
      throw new Error(`ENOENT: no such file or directory, access '${filePath}'`);
    }
    // Assume all files/directories are accessible for testing
  }),
  
  readFile: jest.fn(async (filePath, encoding = 'utf8') => {
    if (mockFiles.has(filePath)) {
      const content = mockFiles.get(filePath);
      return encoding === 'utf8' ? content : Buffer.from(content);
    }
    throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
  }),
  
  writeFile: jest.fn(async (filePath, data) => {
    mockFiles.set(filePath, data.toString());
  }),
  
  mkdir: jest.fn(async (dirPath, options) => {
    mockDirectories.add(dirPath);
    
    if (options?.recursive) {
      const parts = dirPath.split(path.sep);
      let currentPath = '';
      
      for (const part of parts) {
        if (part) {
          currentPath = currentPath ? path.join(currentPath, part) : part;
          mockDirectories.add(currentPath);
        }
      }
    }
  })
};

// Constants
const constants = {
  R_OK: 4,
  W_OK: 2,
  X_OK: 1,
  F_OK: 0
};

// Test utilities
const __setMockFiles = (files) => {
  mockFiles.clear();
  for (const [path, content] of Object.entries(files)) {
    mockFiles.set(path, content);
  }
};

const __setMockDirectories = (directories) => {
  mockDirectories.clear();
  for (const dir of directories) {
    mockDirectories.add(dir);
  }
};

const __clearMocks = () => {
  mockFiles.clear();
  mockDirectories.clear();
  // Restore defaults
  mockDirectories.add('/workspaces/agent-feed');
  mockDirectories.add('/workspaces/agent-feed/prod');
  mockDirectories.add('/workspaces/agent-feed/src');
  mockDirectories.add('/workspaces/agent-feed/tests');
  mockDirectories.add('/workspaces/agent-feed/frontend');
  mockDirectories.add('/home/codespace');
  mockDirectories.add('/home/codespace/.claude');
  
  mockFiles.set('/home/codespace/.claude/.credentials.json', JSON.stringify({
    api_key: 'test-api-key',
    session_key: 'test-session-key'
  }));
};

module.exports = {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  promises,
  constants,
  
  // Test utilities
  __setMockFiles,
  __setMockDirectories,
  __clearMocks
};