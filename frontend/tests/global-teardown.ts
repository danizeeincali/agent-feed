import { FullConfig } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Playwright Global Teardown');

  try {
    // Generate comprehensive test report
    const testResultsDir = 'frontend/test-results';
    
    // Collect all test artifacts
    const artifacts = {
      screenshots: [],
      videos: [],
      traces: [],
      reports: []
    };

    try {
      const files = await fs.readdir(testResultsDir, { recursive: true });
      
      for (const file of files) {
        const filePath = path.join(testResultsDir, file as string);
        const stats = await fs.stat(filePath).catch(() => null);
        
        if (stats?.isFile()) {
          if (file.toString().endsWith('.png')) {
            artifacts.screenshots.push(file as string);
          } else if (file.toString().endsWith('.webm') || file.toString().endsWith('.mp4')) {
            artifacts.videos.push(file as string);
          } else if (file.toString().endsWith('.zip')) {
            artifacts.traces.push(file as string);
          } else if (file.toString().endsWith('.json')) {
            artifacts.reports.push(file as string);
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not scan test results directory:', error.message);
    }

    // Generate final report
    const finalReport = {
      testRun: {
        timestamp: new Date().toISOString(),
        duration: process.hrtime()[0], // Rough duration in seconds
        testType: 'White Screen Detection & Performance Monitoring'
      },
      artifacts: {
        totalScreenshots: artifacts.screenshots.length,
        totalVideos: artifacts.videos.length,
        totalTraces: artifacts.traces.length,
        totalReports: artifacts.reports.length
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        testMode: process.env.PLAYWRIGHT_TEST_MODE || 'default'
      },
      summary: {
        screenshotsSaved: artifacts.screenshots.length > 0,
        videoRecorded: artifacts.videos.length > 0,
        reportsGenerated: artifacts.reports.length > 0
      }
    };

    await fs.writeFile(
      path.join(testResultsDir, 'final-test-report.json'),
      JSON.stringify(finalReport, null, 2)
    );

    // Log summary
    console.log('📊 Test Artifacts Summary:');
    console.log(`   Screenshots: ${artifacts.screenshots.length}`);
    console.log(`   Videos: ${artifacts.videos.length}`);
    console.log(`   Traces: ${artifacts.traces.length}`);
    console.log(`   Reports: ${artifacts.reports.length}`);

    // Clean up old test artifacts (keep last 10 runs)
    await cleanupOldArtifacts(testResultsDir);

    // Check for white screen test failures and generate alert
    await checkForWhiteScreenFailures(testResultsDir);

    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Error during global teardown:', error.message);
  }
}

async function cleanupOldArtifacts(testResultsDir: string) {
  try {
    // Keep cleanup simple - just log what we would clean
    const files = await fs.readdir(testResultsDir).catch(() => []);
    const oldFiles = files.filter(file => 
      file.toString().includes('screenshot') || 
      file.toString().includes('video')
    );

    if (oldFiles.length > 50) { // Arbitrary threshold
      console.log(`📦 Note: ${oldFiles.length} test artifacts present. Consider periodic cleanup.`);
    }
  } catch (error) {
    console.warn('Warning: Could not perform artifact cleanup:', error.message);
  }
}

async function checkForWhiteScreenFailures(testResultsDir: string) {
  try {
    // Look for white screen error indicators
    const errorScreenshotsDir = path.join(testResultsDir, 'white-screen-errors');
    const errorFiles = await fs.readdir(errorScreenshotsDir).catch(() => []);
    
    if (errorFiles.length > 0) {
      console.log('🚨 WHITE SCREEN DETECTION ALERT:');
      console.log(`   ${errorFiles.length} error artifacts found`);
      console.log(`   Check: ${errorScreenshotsDir}`);
      
      // Create alert file for CI/CD systems
      const alertData = {
        alertType: 'WHITE_SCREEN_DETECTED',
        timestamp: new Date().toISOString(),
        errorArtifacts: errorFiles.length,
        location: errorScreenshotsDir,
        severity: 'HIGH',
        recommendation: 'Review error screenshots and fix rendering issues'
      };

      await fs.writeFile(
        path.join(testResultsDir, 'WHITE_SCREEN_ALERT.json'),
        JSON.stringify(alertData, null, 2)
      );
    }
  } catch (error) {
    console.warn('Warning: Could not check for white screen failures:', error.message);
  }
}

export default globalTeardown;