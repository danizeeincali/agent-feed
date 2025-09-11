import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global teardown for Dynamic Agent Pages E2E tests
 * Cleans up test environment and generates final reports
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up Dynamic Agent Pages E2E test environment...');
  
  try {
    // Generate test summary report
    await generateTestSummary();
    
    // Cleanup temporary files
    await cleanupTempFiles();
    
    // Archive test artifacts for CI
    if (process.env.CI) {
      await archiveTestArtifacts();
    }
    
    console.log('✅ Global teardown completed successfully');
    
  } catch (error) {
    console.error('⚠️  Global teardown encountered issues:', error);
    // Don't fail the entire test run due to cleanup issues
  }
}

async function generateTestSummary() {
  console.log('📋 Generating test summary report...');
  
  const resultsPath = path.join(__dirname, '../reports/results.json');
  
  if (fs.existsSync(resultsPath)) {
    try {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      
      const summary = {
        timestamp: new Date().toISOString(),
        totalTests: results.suites?.reduce((acc, suite) => acc + (suite.specs?.length || 0), 0) || 0,
        passed: results.suites?.reduce((acc, suite) => 
          acc + (suite.specs?.filter(spec => spec.ok)?.length || 0), 0) || 0,
        failed: results.suites?.reduce((acc, suite) => 
          acc + (suite.specs?.filter(spec => !spec.ok)?.length || 0), 0) || 0,
        duration: results.stats?.duration || 0,
        browsers: results.config?.projects?.map(p => p.name) || [],
        testCategories: {
          navigation: 0,
          content: 0,
          customization: 0,
          responsive: 0,
          realtime: 0,
          performance: 0,
          accessibility: 0
        }
      };
      
      // Count tests by category based on file paths
      results.suites?.forEach(suite => {
        const suitePath = suite.file || '';
        if (suitePath.includes('/navigation/')) summary.testCategories.navigation++;
        else if (suitePath.includes('/content/')) summary.testCategories.content++;
        else if (suitePath.includes('/customization/')) summary.testCategories.customization++;
        else if (suitePath.includes('/responsive/')) summary.testCategories.responsive++;
        else if (suitePath.includes('/realtime/')) summary.testCategories.realtime++;
        else if (suitePath.includes('/performance/')) summary.testCategories.performance++;
        else if (suitePath.includes('/accessibility/')) summary.testCategories.accessibility++;
      });
      
      const summaryPath = path.join(__dirname, '../reports/test-summary.json');
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
      
      // Generate human-readable summary
      const readableSummary = `
# Dynamic Agent Pages E2E Test Summary

**Execution Time:** ${new Date(summary.timestamp).toLocaleString()}
**Total Duration:** ${Math.round(summary.duration / 1000)}s

## Results Overview
- **Total Tests:** ${summary.totalTests}
- **Passed:** ${summary.passed} ✅
- **Failed:** ${summary.failed} ${summary.failed > 0 ? '❌' : ''}
- **Success Rate:** ${summary.totalTests > 0 ? Math.round((summary.passed / summary.totalTests) * 100) : 0}%

## Browser Coverage
${summary.browsers.map(browser => `- ${browser}`).join('\n')}

## Test Categories
- **Navigation Tests:** ${summary.testCategories.navigation}
- **Content Rendering:** ${summary.testCategories.content} 
- **Profile Customization:** ${summary.testCategories.customization}
- **Responsive Design:** ${summary.testCategories.responsive}
- **Real-time Updates:** ${summary.testCategories.realtime}
- **Performance:** ${summary.testCategories.performance}
- **Accessibility:** ${summary.testCategories.accessibility}

## Test Artifacts
- HTML Report: \`./reports/html/index.html\`
- JSON Results: \`./reports/results.json\`
- JUnit XML: \`./reports/results.xml\`
- Screenshots: \`./screenshots/\`
- Videos: \`./videos/\`
- Traces: \`./traces/\`
`;
      
      const readablePath = path.join(__dirname, '../reports/SUMMARY.md');
      fs.writeFileSync(readablePath, readableSummary);
      
    } catch (error) {
      console.warn('Could not parse test results:', error.message);
    }
  }
}

async function cleanupTempFiles() {
  console.log('🗑️  Cleaning up temporary files...');
  
  const tempPaths = [
    path.join(__dirname, '../fixtures/test-agents.json'),
    path.join(__dirname, '../fixtures/mock-websocket-events.json'),
    path.join(__dirname, '../test-results/temp'),
  ];
  
  tempPaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        if (fs.lstatSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
        console.log(`  Removed: ${filePath}`);
      } catch (error) {
        console.warn(`  Could not remove ${filePath}: ${error.message}`);
      }
    }
  });
}

async function archiveTestArtifacts() {
  console.log('📦 Archiving test artifacts for CI...');
  
  const archiveDir = path.join(__dirname, '../archive');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveName = `agent-pages-e2e-${timestamp}`;
  const archivePath = path.join(archiveDir, archiveName);
  
  // Create archive directory
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }
  
  if (!fs.existsSync(archivePath)) {
    fs.mkdirSync(archivePath, { recursive: true });
  }
  
  // Copy important artifacts
  const artifactPaths = [
    { src: './reports', dest: 'reports' },
    { src: './screenshots', dest: 'screenshots' },
    { src: './test-results', dest: 'test-results' }
  ];
  
  artifactPaths.forEach(({ src, dest }) => {
    const srcPath = path.join(__dirname, '..', src);
    const destPath = path.join(archivePath, dest);
    
    if (fs.existsSync(srcPath)) {
      try {
        fs.cpSync(srcPath, destPath, { recursive: true });
        console.log(`  Archived: ${src} -> ${dest}`);
      } catch (error) {
        console.warn(`  Could not archive ${src}: ${error.message}`);
      }
    }
  });
  
  console.log(`📦 Test artifacts archived to: ${archivePath}`);
}

export default globalTeardown;