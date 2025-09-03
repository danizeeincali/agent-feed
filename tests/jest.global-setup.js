/**
 * Jest Global Setup
 * 
 * Global setup that runs once before all tests
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

module.exports = async () => {
  console.log('🚀 Setting up global test environment...');
  
  // Ensure test directories exist
  const testDirs = [
    'test-results',
    'coverage',
    'performance-results',
    'logs',
    'test-data'
  ];
  
  for (const dir of testDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  // Set up test environment variables
  process.env.NODE_ENV = 'test';
  process.env.CI = 'true';
  process.env.MOCK_CLAUDE_CLI = 'true';
  process.env.TEST_BACKEND_URL = 'http://localhost:3000';
  process.env.TEST_FRONTEND_URL = 'http://localhost:5173';
  
  // Store the global setup timestamp
  global.__SETUP_TIMESTAMP__ = Date.now();
  
  console.log('✅ Global test environment setup complete');
};