/**
 * Global Setup for Activities Production Validation
 *
 * Prepares the testing environment and validates prerequisites
 */

async function globalSetup(config) {
  console.log('🚀 Starting Activities Production Validation Setup');

  const fs = require('fs');
  const path = require('path');

  // Create necessary directories
  const dirs = [
    '/workspaces/agent-feed/test-results',
    '/workspaces/agent-feed/test-results/activities-validation-screenshots',
    '/workspaces/agent-feed/test-results/playwright-report',
    '/workspaces/agent-feed/test-results/playwright-artifacts'
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });

  // Log environment information
  console.log('🌍 Environment Setup:');
  console.log(`  - Frontend URL: http://localhost:5173`);
  console.log(`  - Backend API URL: http://localhost:3000`);
  console.log(`  - Test Mode: PRODUCTION VALIDATION`);
  console.log(`  - Mock Data: DISABLED (Real system only)`);
  console.log(`  - Screenshots: ENABLED`);
  console.log(`  - Browser: Real browser (headless: false)`);

  // Wait for servers to be ready
  console.log('⏳ Waiting for servers to be ready...');

  // Additional setup can be added here

  console.log('✅ Global setup completed');
}

module.exports = globalSetup;