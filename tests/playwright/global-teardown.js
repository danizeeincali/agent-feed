/**
 * Global Teardown for Playwright Tests in Codespaces
 * Cleanup and final reporting
 */

const fs = require('fs');
const path = require('path');

async function globalTeardown(config) {
  console.log('🧹 Starting global teardown...');
  
  try {
    // Collect test artifacts information
    const screenshotsDir = '/workspaces/agent-feed/tests/playwright/screenshots';
    const reportDir = '/workspaces/agent-feed/tests/playwright/playwright-report';
    const resultsDir = '/workspaces/agent-feed/tests/playwright/test-results';
    
    const artifacts = {
      screenshots: [],
      reports: [],
      results: []
    };
    
    // Collect screenshots
    if (fs.existsSync(screenshotsDir)) {
      artifacts.screenshots = fs.readdirSync(screenshotsDir)
        .filter(file => file.endsWith('.png'))
        .map(file => path.join(screenshotsDir, file));
    }
    
    // Collect report files
    if (fs.existsSync(reportDir)) {
      artifacts.reports = fs.readdirSync(reportDir, { recursive: true })
        .filter(file => file.endsWith('.html') || file.endsWith('.json'));
    }
    
    // Collect test results
    if (fs.existsSync(resultsDir)) {
      artifacts.results = fs.readdirSync(resultsDir, { recursive: true });
    }
    
    // Generate final summary
    const summary = {
      timestamp: new Date().toISOString(),
      artifacts,
      counts: {
        screenshots: artifacts.screenshots.length,
        reports: artifacts.reports.length,
        results: artifacts.results.length
      }
    };
    
    console.log('📊 Test Execution Summary:');
    console.log(`   Screenshots captured: ${summary.counts.screenshots}`);
    console.log(`   Reports generated: ${summary.counts.reports}`);
    console.log(`   Result files: ${summary.counts.results}`);
    
    // Save summary
    fs.writeFileSync(
      '/workspaces/agent-feed/tests/playwright/teardown-summary.json',
      JSON.stringify(summary, null, 2)
    );
    
    // Log artifact locations
    if (artifacts.screenshots.length > 0) {
      console.log('🖼️  Screenshots available at:');
      artifacts.screenshots.forEach(screenshot => 
        console.log(`     ${screenshot}`)
      );
    }
    
    if (fs.existsSync('/workspaces/agent-feed/tests/playwright/playwright-report/index.html')) {
      console.log('📋 HTML Report: /workspaces/agent-feed/tests/playwright/playwright-report/index.html');
    }
    
    console.log('✅ Global teardown completed');
    
  } catch (error) {
    console.error('❌ Error during teardown:', error.message);
  }
}

module.exports = globalTeardown;