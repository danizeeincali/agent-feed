/**
 * Global Setup for UI Validation Tests
 * Ensures environment is ready for comprehensive UI testing
 */

const { chromium } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

async function globalSetup() {
  console.log('🚀 Setting up UI Validation Environment...');

  try {
    // Ensure screenshot directories exist
    const screenshotDir = '/workspaces/agent-feed/tests/screenshots/agents-fix';
    await fs.mkdir(screenshotDir, { recursive: true });
    console.log(`✅ Screenshot directory ready: ${screenshotDir}`);

    // Create artifacts directory
    const artifactsDir = path.join(screenshotDir, 'playwright-artifacts');
    await fs.mkdir(artifactsDir, { recursive: true });
    console.log(`✅ Artifacts directory ready: ${artifactsDir}`);

    // Create report directory
    const reportDir = path.join(screenshotDir, 'playwright-report');
    await fs.mkdir(reportDir, { recursive: true });
    console.log(`✅ Report directory ready: ${reportDir}`);

    // Quick health check of frontend
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      console.log('🔍 Performing frontend health check...');

      // Check if frontend is responsive
      const response = await page.goto('http://localhost:5173', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      if (response && response.ok()) {
        console.log('✅ Frontend is responsive and ready');
      } else {
        console.log('⚠️  Frontend responded but may have issues');
      }

      // Check if /agents route is accessible
      const agentsResponse = await page.goto('http://localhost:5173/agents', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      if (agentsResponse && agentsResponse.ok()) {
        console.log('✅ /agents route is accessible');
      } else {
        console.log('⚠️  /agents route may have issues');
      }

    } catch (error) {
      console.log(`⚠️  Frontend health check warning: ${error.message}`);
      console.log('🔄 Tests will still proceed - issues may be captured in validation');
    } finally {
      await browser.close();
    }

    // Create validation metadata
    const metadata = {
      setupTimestamp: new Date().toISOString(),
      environment: {
        platform: process.platform,
        nodeVersion: process.version,
        testTarget: 'http://localhost:5173/agents'
      },
      directories: {
        screenshots: screenshotDir,
        artifacts: artifactsDir,
        reports: reportDir
      },
      validation: {
        purpose: 'Before/After screenshot evidence collection',
        features: [
          'Page load validation',
          'Agents display verification',
          'API connectivity check',
          'Console error monitoring',
          'Responsive design testing',
          'Loading states validation'
        ]
      }
    };

    await fs.writeFile(
      path.join(screenshotDir, 'validation-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log('✅ UI Validation setup complete!');
    console.log('📸 Ready to capture comprehensive evidence');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

module.exports = globalSetup;