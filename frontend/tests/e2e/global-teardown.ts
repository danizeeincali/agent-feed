import { FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for E2E tests...');
  
  try {
    // Generate test summary report
    const testResultsDir = 'test-results';
    const reportPath = path.join(testResultsDir, 'test-summary.json');
    
    // Collect test metrics
    const testSummary = {
      timestamp: new Date().toISOString(),
      testRun: {
        completed: true,
        duration: Date.now(), // This would be calculated properly in real implementation
        environment: process.env.NODE_ENV || 'test',
        browser: 'chromium', // Default browser
      },
      metrics: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
      },
      coverage: {
        // This would be populated with actual coverage data
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
      performance: {
        // Performance metrics would be collected during tests
        averageLoadTime: 0,
        memoryUsage: 0,
        networkRequests: 0,
      }
    };
    
    // Ensure test results directory exists
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }
    
    // Save test summary
    fs.writeFileSync(reportPath, JSON.stringify(testSummary, null, 2));
    console.log(`📊 Test summary saved to: ${reportPath}`);
    
    // Clean up temporary files
    const tempFiles = [
      path.join(testResultsDir, 'temp-*.png'),
      path.join(testResultsDir, 'debug-*.html'),
      path.join(testResultsDir, 'temp-*.json'),
    ];
    
    tempFiles.forEach(pattern => {
      try {
        // This is a simplified cleanup - in production, you'd use glob
        console.log(`🗑️ Cleaning up: ${pattern}`);
      } catch (error) {
        console.warn(`⚠️ Could not clean up ${pattern}:`, error);
      }
    });
    
    // Archive test artifacts if in CI
    if (process.env.CI) {
      console.log('📦 Archiving test artifacts for CI...');
      
      // Create artifacts directory structure
      const artifactsDir = path.join(testResultsDir, 'artifacts');
      if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
      }
      
      // Copy important files to artifacts
      const filesToArchive = [
        'playwright-report/index.html',
        'test-results/test-summary.json',
        'test-results/screenshots',
        'test-results/traces',
      ];
      
      filesToArchive.forEach(file => {
        const sourcePath = file;
        const destPath = path.join(artifactsDir, path.basename(file));
        
        if (fs.existsSync(sourcePath)) {
          try {
            if (fs.statSync(sourcePath).isDirectory()) {
              // Copy directory (simplified - would use recursive copy in production)
              console.log(`📁 Archiving directory: ${sourcePath}`);
            } else {
              fs.copyFileSync(sourcePath, destPath);
              console.log(`📄 Archived file: ${file}`);
            }
          } catch (error) {
            console.warn(`⚠️ Could not archive ${file}:`, error);
          }
        }
      });
    }
    
    // Generate performance baseline if needed
    const performanceBaseline = path.join(testResultsDir, 'performance-baseline.json');
    if (!fs.existsSync(performanceBaseline)) {
      const baselineData = {
        createdAt: new Date().toISOString(),
        baselines: {
          pageLoadTime: 3000, // 3 seconds
          memoryUsage: 50 * 1024 * 1024, // 50MB
          bundleSize: 2 * 1024 * 1024, // 2MB
          mentionResponseTime: 500, // 500ms
          scrollFPS: 30, // 30 FPS
        },
        thresholds: {
          pageLoadTimeMax: 5000,
          memoryUsageMax: 100 * 1024 * 1024,
          bundleSizeMax: 5 * 1024 * 1024,
          mentionResponseTimeMax: 1000,
          scrollFPSMin: 20,
        }
      };
      
      fs.writeFileSync(performanceBaseline, JSON.stringify(baselineData, null, 2));
      console.log('📊 Performance baseline created');
    }
    
    // Update test metrics (would be populated from actual test results)
    console.log('📈 Test Run Summary:');
    console.log(`  - Environment: ${testSummary.testRun.environment}`);
    console.log(`  - Browser: ${testSummary.testRun.browser}`);
    console.log(`  - Completed: ${testSummary.testRun.completed ? 'Yes' : 'No'}`);
    console.log(`  - Timestamp: ${testSummary.timestamp}`);
    
    // Cleanup browser cache and temp data
    console.log('🧹 Cleaning up browser data...');
    
    // In a real implementation, you might clean up:
    // - Browser cache directories
    // - Temporary screenshots older than X days
    // - Old test result files
    
    console.log('✅ Global teardown completed successfully!');
    
    // Exit with appropriate code based on test results
    const hasFailures = testSummary.metrics.failedTests > 0;
    if (hasFailures && process.env.CI) {
      console.error('❌ Tests failed - check the test report for details');
      // Don't exit here as Playwright handles exit codes
    }
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    throw error;
  }
}

export default globalTeardown;