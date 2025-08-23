import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting WebSocket Integration Test Suite');
  console.log('📝 Testing the following user scenarios:');
  console.log('   ✓ Live Activity Connection Status shows "Connected"');
  console.log('   ✓ Terminal launcher works without getting stuck');
  console.log('   ✓ Terminal connection establishes successfully');
  console.log('   ✓ WebSocket reconnection scenarios');
  console.log('   ✓ Cross-browser compatibility');
  console.log('   ✓ Performance under various conditions');
  console.log('');

  // Ensure screenshots directory exists
  const fs = require('fs');
  const path = require('path');
  
  const screenshotsDir = path.join(__dirname, '../screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Clear previous test artifacts
  const testResultsDir = path.join(__dirname, '../test-results');
  if (fs.existsSync(testResultsDir)) {
    fs.rmSync(testResultsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testResultsDir, { recursive: true });

  console.log('🧹 Test environment prepared');
  console.log('🌐 Base URL:', config.projects[0].use.baseURL);
  console.log('');
}

export default globalSetup;