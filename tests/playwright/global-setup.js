/**
 * Global Setup for Playwright Tests in Codespaces
 * Prepares the test environment and validates prerequisites
 */

const fs = require('fs');
const path = require('path');

async function globalSetup(config) {
  console.log('🚀 Setting up Playwright test environment for Codespaces...');
  
  // Create necessary directories
  const directories = [
    '/workspaces/agent-feed/tests/playwright/screenshots',
    '/workspaces/agent-feed/tests/playwright/test-results',
    '/workspaces/agent-feed/tests/playwright/playwright-report'
  ];
  
  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }
  
  // Log environment information
  console.log('🔍 Environment Information:');
  console.log(`   Node.js Version: ${process.version}`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Architecture: ${process.arch}`);
  console.log(`   Working Directory: ${process.cwd()}`);
  
  // Check if we're in Codespaces
  const isCodespaces = process.env.CODESPACE_NAME || process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  if (isCodespaces) {
    console.log(`   🌐 Codespaces Environment Detected`);
    console.log(`   📍 Codespace Name: ${process.env.CODESPACE_NAME || 'Unknown'}`);
  }
  
  // Test URLs availability (optional pre-check)
  const baseUrl = 'https://animated-guacamole-4jgqg976v49pcqwqv-5173.app.github.dev';
  const backendUrl = 'https://animated-guacamole-4jgqg976v49pcqwqv-3000.app.github.dev';
  
  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('🔗 Testing URL accessibility...');
    
    try {
      const response = await page.goto(baseUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      console.log(`   ✅ Frontend (${baseUrl}): ${response.status()}`);
    } catch (error) {
      console.log(`   ⚠️  Frontend (${baseUrl}): ${error.message}`);
    }
    
    try {
      const response = await page.goto(`${backendUrl}/api/health`, { 
        timeout: 15000 
      });
      console.log(`   ✅ Backend API (${backendUrl}): ${response.status()}`);
    } catch (error) {
      console.log(`   ⚠️  Backend API (${backendUrl}): ${error.message}`);
    }
    
    await browser.close();
  } catch (error) {
    console.log(`   ⚠️  Pre-check failed: ${error.message}`);
  }
  
  // Create initial test report
  const setupReport = {
    timestamp: new Date().toISOString(),
    environment: 'codespaces',
    nodeVersion: process.version,
    platform: process.platform,
    baseUrl,
    backendUrl,
    directories: directories.map(dir => ({
      path: dir,
      exists: fs.existsSync(dir)
    }))
  };
  
  fs.writeFileSync(
    '/workspaces/agent-feed/tests/playwright/setup-report.json',
    JSON.stringify(setupReport, null, 2)
  );
  
  console.log('✅ Global setup completed successfully');
  return setupReport;
}

module.exports = globalSetup;