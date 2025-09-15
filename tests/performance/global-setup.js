/**
 * Global setup for performance tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Setting up performance test environment...');

  // Ensure reports directory exists
  const reportsDir = path.join(__dirname, 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Clean previous test artifacts
  const artifactPatterns = [
    'bundle-analysis-*.json',
    'memory-leak-report.txt',
    'user-interaction-results.json',
    'performance-report.json',
    'ci-performance-report.json'
  ];

  artifactPatterns.forEach(pattern => {
    try {
      execSync(`rm -f ${path.join(reportsDir, pattern)}`, { stdio: 'ignore' });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  // Build the application if not already built
  try {
    console.log('📦 Building application for performance tests...');
    execSync('npm run build', {
      stdio: process.env.VERBOSE_TESTS === 'true' ? 'inherit' : 'ignore',
      cwd: process.cwd()
    });
  } catch (error) {
    console.error('❌ Failed to build application:', error.message);
    throw error;
  }

  // Set up environment variables for tests
  process.env.NODE_ENV = 'test';
  process.env.PERFORMANCE_TEST_MODE = 'true';
  process.env.NEXT_TELEMETRY_DISABLED = '1';

  console.log('✅ Performance test environment ready');
};