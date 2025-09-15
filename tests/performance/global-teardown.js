/**
 * Global teardown for performance tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Cleaning up performance test environment...');

  // Stop any running servers
  try {
    // Kill any processes running on port 3000
    execSync('pkill -f "next start" || true', { stdio: 'ignore' });
    execSync('lsof -ti:3000 | xargs kill -9 2>/dev/null || true', { stdio: 'ignore' });
  } catch (error) {
    // Ignore cleanup errors
  }

  // Generate final test summary if reports exist
  const reportsDir = path.join(__dirname, 'reports');

  if (fs.existsSync(reportsDir)) {
    const reportFiles = fs.readdirSync(reportsDir);

    if (reportFiles.length > 0) {
      console.log(`📊 Generated ${reportFiles.length} performance reports:`);
      reportFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
    }

    // Create archive of reports for CI
    try {
      const archivePath = path.join(reportsDir, 'performance-reports.tar.gz');
      execSync(`tar -czf ${archivePath} -C ${reportsDir} .`, { stdio: 'ignore' });
      console.log(`📦 Archived reports to: ${archivePath}`);
    } catch (error) {
      // Ignore archiving errors
    }
  }

  // Clean up temporary files
  const tempPatterns = [
    '.lighthouse-ci',
    '.next/cache',
    'node_modules/.cache'
  ];

  tempPatterns.forEach(pattern => {
    try {
      execSync(`rm -rf ${pattern}`, { stdio: 'ignore' });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  console.log('✅ Performance test environment cleaned up');
};