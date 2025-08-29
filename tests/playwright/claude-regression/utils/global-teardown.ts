import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Playwright Claude Regression Tests Teardown...');

  // Generate test summary
  const testResultsDir = path.join(__dirname, '..', 'test-results');
  const screenshotsDir = path.join(__dirname, '..', 'screenshots');
  
  let testSummary = {
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    screenshots: 0,
    artifacts: []
  };

  // Count artifacts
  if (fs.existsSync(testResultsDir)) {
    const files = fs.readdirSync(testResultsDir);
    testSummary.artifacts = files;
    
    // Try to parse junit results if available
    const junitFile = files.find(f => f.includes('junit'));
    if (junitFile) {
      try {
        const junitPath = path.join(testResultsDir, junitFile);
        const junitContent = fs.readFileSync(junitPath, 'utf-8');
        
        // Basic XML parsing for test counts
        const testcaseMatches = junitContent.match(/<testcase/g);
        const failureMatches = junitContent.match(/<failure/g);
        
        testSummary.totalTests = testcaseMatches?.length || 0;
        testSummary.failedTests = failureMatches?.length || 0;
        testSummary.passedTests = testSummary.totalTests - testSummary.failedTests;
      } catch (error) {
        console.warn('⚠️ Could not parse JUnit results:', error);
      }
    }
  }

  // Count screenshots
  if (fs.existsSync(screenshotsDir)) {
    const screenshots = fs.readdirSync(screenshotsDir, { recursive: true }) as string[];
    testSummary.screenshots = screenshots.filter(f => f.endsWith('.png')).length;
  }

  // Write summary
  const summaryPath = path.join(testResultsDir, 'test-summary.json');
  try {
    fs.writeFileSync(summaryPath, JSON.stringify(testSummary, null, 2));
    console.log('📊 Test summary generated:', summaryPath);
  } catch (error) {
    console.warn('⚠️ Could not write test summary:', error);
  }

  // Log summary
  console.log('\n📈 Test Execution Summary:');
  console.log(`   Total Tests: ${testSummary.totalTests}`);
  console.log(`   Passed: ${testSummary.passedTests}`);
  console.log(`   Failed: ${testSummary.failedTests}`);
  console.log(`   Screenshots: ${testSummary.screenshots}`);
  console.log(`   Artifacts: ${testSummary.artifacts.length}`);

  // Cleanup old screenshots (keep only last 50)
  if (fs.existsSync(screenshotsDir)) {
    try {
      const allScreenshots = fs.readdirSync(screenshotsDir)
        .filter(f => f.endsWith('.png'))
        .map(f => ({
          name: f,
          path: path.join(screenshotsDir, f),
          time: fs.statSync(path.join(screenshotsDir, f)).mtime
        }))
        .sort((a, b) => b.time.getTime() - a.time.getTime());

      if (allScreenshots.length > 50) {
        const toDelete = allScreenshots.slice(50);
        toDelete.forEach(screenshot => {
          fs.unlinkSync(screenshot.path);
        });
        console.log(`🗑️ Cleaned up ${toDelete.length} old screenshots`);
      }
    } catch (error) {
      console.warn('⚠️ Screenshot cleanup failed:', error);
    }
  }

  // Performance recommendations
  if (testSummary.failedTests > 0) {
    console.log('\n🔍 Failed Tests Detected:');
    console.log('   • Check test-results/junit-results.xml for details');
    console.log('   • Review screenshots for visual failures');
    console.log('   • Check browser console logs in HTML report');
  }

  if (testSummary.screenshots > 100) {
    console.log('\n📸 High Screenshot Count:');
    console.log('   • Consider reviewing screenshot strategy');
    console.log('   • Use selective screenshot capture');
  }

  console.log('\n✅ Global teardown completed successfully!');
  console.log('📋 Run `npx playwright show-report` to view detailed results');
}

export default globalTeardown;