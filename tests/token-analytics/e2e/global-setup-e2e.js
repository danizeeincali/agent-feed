/**
 * Global E2E Setup for Token Analytics
 * Prepares browser environment for fake data detection
 */

async function globalSetup(config) {
  console.log('🎭 Setting up Playwright E2E environment for token analytics...');

  // Initialize fake data violation tracking
  global.e2eFakeDataViolations = [];
  global.e2eRealDataValidations = 0;

  // Check if application server is running
  try {
    const fetch = require('node-fetch');
    const response = await fetch('http://localhost:3000/health');

    if (!response.ok) {
      console.warn('⚠️  Application server health check failed');
    } else {
      console.log('✅ Application server is healthy');
    }
  } catch (error) {
    console.warn('⚠️  Could not connect to application server:', error.message);
  }

  // Check if API server is running
  try {
    const fetch = require('node-fetch');
    const response = await fetch('http://localhost:3001/health');

    if (!response.ok) {
      console.warn('⚠️  API server health check failed');
    } else {
      console.log('✅ API server is healthy');
    }
  } catch (error) {
    console.warn('⚠️  Could not connect to API server:', error.message);
  }

  console.log('🎭 E2E environment setup complete');
}

module.exports = globalSetup;