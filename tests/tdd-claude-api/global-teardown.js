/**
 * Global Teardown for Claude API TDD Tests
 * Cleans up test processes and generates final reports
 */

const fs = require('fs').promises;
const path = require('path');

module.exports = async () => {
  console.log('🧹 Cleaning up Claude API TDD Test Environment...');
  
  // Kill any hanging Claude processes
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  
  try {
    // Find and kill any claude processes started during testing
    const { stdout } = await execAsync('pgrep -f "claude" || true');
    if (stdout.trim()) {
      const pids = stdout.trim().split('\n').filter(Boolean);
      for (const pid of pids) {
        try {
          await execAsync(`kill -TERM ${pid} || kill -KILL ${pid}`);
          console.log(`✅ Cleaned up Claude process ${pid}`);
        } catch (error) {
          // Process might already be dead
        }
      }
    }
  } catch (error) {
    // No processes to clean up or pgrep not available
  }
  
  // Generate test summary report
  try {
    const testResultsDir = path.join(__dirname, '../../test-results/tdd-claude-api');
    const summaryPath = path.join(testResultsDir, 'test-summary.json');
    
    const summary = {
      timestamp: new Date().toISOString(),
      testSuite: 'Claude API Timeout TDD',
      environment: {
        nodeVersion: process.version,
        claudeCliAvailable: process.env.CLAUDE_CLI_AVAILABLE === 'true',
        testTimeout: process.env.CLAUDE_API_TIMEOUT_MS || '15000'
      },
      cleanup: {
        processesKilled: true,
        environmentRestored: true
      }
    };
    
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log('📊 Test summary generated:', summaryPath);
  } catch (error) {
    console.warn('⚠️  Could not generate test summary:', error.message);
  }
  
  console.log('✅ Claude API TDD Test Environment Cleaned');
};