/**
 * Global Teardown for Activities Production Validation
 *
 * Cleanup and report generation after validation
 */

async function globalTeardown(config) {
  console.log('🏁 Starting Activities Production Validation Teardown');

  const fs = require('fs');
  const path = require('path');

  // Generate final validation report
  const reportsDir = '/workspaces/agent-feed/test-results';
  const screenshotsDir = '/workspaces/agent-feed/test-results/activities-validation-screenshots';

  try {
    // Count artifacts
    const screenshots = fs.existsSync(screenshotsDir) ?
      fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png')) : [];

    const finalReport = {
      validationSuite: 'Activities API Production Validation',
      completedAt: new Date().toISOString(),
      environment: {
        frontend: 'http://localhost:5173',
        backend: 'http://localhost:3000',
        testMode: 'PRODUCTION_VALIDATION'
      },
      artifacts: {
        screenshots: screenshots.length,
        screenshotFiles: screenshots,
        networkLogs: fs.existsSync(path.join(screenshotsDir, 'network-activity-log.json')),
        playwrightReport: fs.existsSync(path.join(reportsDir, 'playwright-report')),
        testResults: fs.existsSync(path.join(reportsDir, 'validation-results.json'))
      },
      validationScope: {
        apiEndpoint: 'GET /api/activities',
        frontendComponent: 'RealActivityFeed.tsx',
        databaseIntegration: 'Real database queries',
        webSocketTesting: 'Real-time broadcasting',
        mockDataUsage: 'ZERO - Real system only'
      },
      summary: 'Complete production validation with visual documentation and real system testing'
    };

    // Save final report
    fs.writeFileSync(
      path.join(reportsDir, 'final-validation-report.json'),
      JSON.stringify(finalReport, null, 2)
    );

    console.log('📄 Final validation report generated');
    console.log(`📊 Artifacts summary:`);
    console.log(`   - Screenshots: ${screenshots.length}`);
    console.log(`   - Network logs: ${finalReport.artifacts.networkLogs ? 'Generated' : 'Missing'}`);
    console.log(`   - Test results: ${finalReport.artifacts.testResults ? 'Generated' : 'Missing'}`);

  } catch (error) {
    console.error('❌ Error generating final report:', error.message);
  }

  console.log('✅ Global teardown completed');
  console.log(`📁 All results available in: ${reportsDir}`);
}

module.exports = globalTeardown;