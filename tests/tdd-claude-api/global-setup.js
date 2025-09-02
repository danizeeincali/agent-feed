/**
 * Global Setup for Claude API TDD Tests
 * Prepares test environment and validates Claude CLI availability
 */

const { spawn } = require('child_process');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Setting up Claude API TDD Test Environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.TDD_CLAUDE_TESTING = 'true';
  process.env.CLAUDE_API_TIMEOUT_MS = '5000'; // Lower timeout for testing
  
  // Verify Claude CLI availability (optional - tests should work without it)
  try {
    const claudeCheck = spawn('claude', ['--version'], { 
      stdio: 'pipe',
      timeout: 3000 
    });
    
    await new Promise((resolve, reject) => {
      let output = '';
      claudeCheck.stdout.on('data', (data) => output += data.toString());
      claudeCheck.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Claude CLI available:', output.trim());
          process.env.CLAUDE_CLI_AVAILABLE = 'true';
        } else {
          console.log('⚠️  Claude CLI not available - using mocks only');
          process.env.CLAUDE_CLI_AVAILABLE = 'false';
        }
        resolve();
      });
      claudeCheck.on('error', () => {
        console.log('⚠️  Claude CLI not found - using mocks only');
        process.env.CLAUDE_CLI_AVAILABLE = 'false';
        resolve();
      });
    });
  } catch (error) {
    console.log('⚠️  Claude CLI check failed - using mocks only');
    process.env.CLAUDE_CLI_AVAILABLE = 'false';
  }
  
  // Create test directories
  const fs = require('fs').promises;
  const testDirs = [
    path.join(__dirname, '../../test-results/tdd-claude-api'),
    path.join(__dirname, '../../coverage/tdd-claude-api'),
    path.join(__dirname, '../../logs/tdd-tests')
  ];
  
  for (const dir of testDirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }
  
  console.log('✅ Claude API TDD Test Environment Ready');
};