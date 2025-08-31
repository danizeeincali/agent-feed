/**
 * Global test setup for Claude output parsing tests
 * Prepares test environment and dependencies
 */

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs').promises;

async function globalSetup(config) {
  console.log('🚀 Setting up Claude output parsing test environment...');
  
  try {
    // Ensure test result directories exist
    await ensureDirectories([
      'test-results',
      'test-results/html-report',
      'test-results/screenshots',
      'test-results/videos',
      'test-results/traces',
    ]);

    // Setup test data directory
    await setupTestData();

    // Validate test fixtures
    await validateFixtures();

    // Start backend services if not running
    await ensureBackendServices();

    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

/**
 * Ensure required directories exist
 */
async function ensureDirectories(dirs) {
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

/**
 * Setup test data and fixtures
 */
async function setupTestData() {
  console.log('📋 Setting up test data...');
  
  // Create test fixture validation
  const fixturesPath = path.join(__dirname, '../fixtures');
  
  try {
    await fs.access(fixturesPath);
    console.log('✅ Test fixtures directory found');
  } catch (error) {
    throw new Error(`Test fixtures directory not found at ${fixturesPath}`);
  }

  // Generate additional test samples if needed
  await generateDynamicTestSamples();
}

/**
 * Generate dynamic test samples for comprehensive testing
 */
async function generateDynamicTestSamples() {
  const dynamicSamplesPath = path.join(__dirname, '../fixtures/ansi-samples/dynamic-samples.json');
  
  const dynamicSamples = {
    generated: new Date().toISOString(),
    samples: {
      simpleColors: '\u001b[31mRed\u001b[0m \u001b[32mGreen\u001b[0m \u001b[34mBlue\u001b[0m',
      nestedStyles: '\u001b[1m\u001b[32mBold Green \u001b[4mUnderlined\u001b[0m\u001b[0m',
      complexProgress: '🔄 Processing... \u001b[32m[████████████████████]\u001b[0m 100%',
      errorWithStack: '\u001b[31mError:\u001b[0m Failed to parse\n  at line 42:15\n  at parseFunction()',
      mixedOutput: '\u001b[36mInfo:\u001b[0m Starting process\n\u001b[33m⚠ Warning:\u001b[0m Check configuration\n\u001b[32m✅ Success:\u001b[0m Operation completed',
    },
  };

  await fs.writeFile(dynamicSamplesPath, JSON.stringify(dynamicSamples, null, 2));
  console.log('📝 Generated dynamic test samples');
}

/**
 * Validate test fixtures are properly formatted
 */
async function validateFixtures() {
  console.log('🔍 Validating test fixtures...');
  
  const fixtures = [
    '../fixtures/ansi-samples/raw-claude-outputs.js',
    '../fixtures/expected-outputs/clean-outputs.js',
  ];

  for (const fixture of fixtures) {
    try {
      const fixturePath = path.join(__dirname, fixture);
      await fs.access(fixturePath);
      
      // Basic validation - check if file can be required
      require(fixturePath);
      console.log(`✅ Validated fixture: ${fixture}`);
    } catch (error) {
      throw new Error(`Invalid fixture ${fixture}: ${error.message}`);
    }
  }
}

/**
 * Ensure backend services are running
 */
async function ensureBackendServices() {
  console.log('🔌 Checking backend services...');
  
  // Check if frontend dev server is accessible
  try {
    const response = await fetch('http://localhost:5173');
    if (response.ok) {
      console.log('✅ Frontend dev server is running');
    }
  } catch (error) {
    console.log('⚠️ Frontend dev server not yet ready, will wait for webServer');
  }

  // Check if backend API is accessible
  try {
    const response = await fetch('http://localhost:3001/health');
    if (response.ok) {
      console.log('✅ Backend API server is running');
    }
  } catch (error) {
    console.log('⚠️ Backend API server not yet ready, will wait for webServer');
  }
}

module.exports = globalSetup;