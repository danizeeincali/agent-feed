#!/usr/bin/env node

/**
 * Test Runner for Rate Limiting Button Interaction Tests
 * 
 * Executes all rate limiting test suites and generates comprehensive reports
 * Validates the rate limiting fix across all scenarios
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const testSuites = [
  { name: 'Page Load Button State', file: 'button-page-load.spec.ts', priority: 1 },
  { name: 'First Click Response', file: 'button-first-click.spec.ts', priority: 1 },
  { name: 'Rapid Clicking Debounce', file: 'rapid-clicking-debounce.spec.ts', priority: 2 },
  { name: 'Rate Limit Engagement', file: 'rate-limit-engagement.spec.ts', priority: 2 },
  { name: 'Component Re-render Stability', file: 'component-rerender-stability.spec.ts', priority: 3 },
  { name: 'Rate Limit Reset Timing', file: 'rate-limit-reset-timing.spec.ts', priority: 3 },
  { name: 'Cross-Browser Compatibility', file: 'cross-browser-compatibility.spec.ts', priority: 4 },
  { name: 'Visual Regression', file: 'visual-regression.spec.ts', priority: 4 }
];

const browsers = ['chromium', 'firefox', 'webkit'];

function logWithTimestamp(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function runTestSuite(suite, browser = 'chromium') {
  logWithTimestamp(`Running ${suite.name} tests on ${browser}...`);
  
  try {
    const command = `npx playwright test ${suite.file} --project=${browser} --reporter=html,json`;
    const startTime = Date.now();
    
    execSync(command, { 
      stdio: 'inherit',
      cwd: __dirname 
    });
    
    const duration = Date.now() - startTime;
    logWithTimestamp(`✅ ${suite.name} completed successfully in ${duration}ms`);
    
    return { success: true, duration, browser, suite: suite.name };
  } catch (error) {
    logWithTimestamp(`❌ ${suite.name} failed on ${browser}: ${error.message}`);
    return { success: false, error: error.message, browser, suite: suite.name };
  }
}

function generateTestReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => r.success === false).length,
      totalDuration: results.reduce((sum, r) => sum + (r.duration || 0), 0)
    },
    results: results,
    rateLimitingFixValidation: {
      pageLoadNoDisabling: results.find(r => r.suite === 'Page Load Button State')?.success || false,
      firstClickImmediate: results.find(r => r.suite === 'First Click Response')?.success || false,
      debouncingWorking: results.find(r => r.suite === 'Rapid Clicking Debounce')?.success || false,
      rateLimitThreshold: results.find(r => r.suite === 'Rate Limit Engagement')?.success || false,
      rerenderStability: results.find(r => r.suite === 'Component Re-render Stability')?.success || false,
      timingAccuracy: results.find(r => r.suite === 'Rate Limit Reset Timing')?.success || false,
      crossBrowserConsistency: results.filter(r => r.suite === 'Cross-Browser Compatibility').every(r => r.success),
      visualConsistency: results.find(r => r.suite === 'Visual Regression')?.success || false
    }
  };
  
  // Generate human-readable report
  let textReport = `# Rate Limiting Button Interaction Test Report\n\n`;
  textReport += `**Generated:** ${report.timestamp}\n\n`;
  textReport += `## Summary\n\n`;
  textReport += `- **Total Tests:** ${report.summary.total}\n`;
  textReport += `- **Passed:** ${report.summary.passed}\n`;
  textReport += `- **Failed:** ${report.summary.failed}\n`;
  textReport += `- **Total Duration:** ${Math.round(report.summary.totalDuration / 1000)}s\n\n`;
  
  textReport += `## Rate Limiting Fix Validation\n\n`;
  const validation = report.rateLimitingFixValidation;
  textReport += `- **Page Load No Disabling:** ${validation.pageLoadNoDisabling ? '✅ PASS' : '❌ FAIL'}\n`;
  textReport += `- **First Click Immediate:** ${validation.firstClickImmediate ? '✅ PASS' : '❌ FAIL'}\n`;
  textReport += `- **Debouncing Working:** ${validation.debouncingWorking ? '✅ PASS' : '❌ FAIL'}\n`;
  textReport += `- **Rate Limit Threshold:** ${validation.rateLimitThreshold ? '✅ PASS' : '❌ FAIL'}\n`;
  textReport += `- **Re-render Stability:** ${validation.rerenderStability ? '✅ PASS' : '❌ FAIL'}\n`;
  textReport += `- **Timing Accuracy:** ${validation.timingAccuracy ? '✅ PASS' : '❌ FAIL'}\n`;
  textReport += `- **Cross-Browser Consistency:** ${validation.crossBrowserConsistency ? '✅ PASS' : '❌ FAIL'}\n`;
  textReport += `- **Visual Consistency:** ${validation.visualConsistency ? '✅ PASS' : '❌ FAIL'}\n\n`;
  
  textReport += `## Detailed Results\n\n`;
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const duration = result.duration ? `(${Math.round(result.duration / 1000)}s)` : '';
    textReport += `- **${result.suite}** [${result.browser}]: ${status} ${duration}\n`;
    if (!result.success && result.error) {
      textReport += `  - Error: ${result.error}\n`;
    }
  });
  
  return { json: report, text: textReport };
}

async function main() {
  const mode = process.argv[2] || 'full';
  const targetBrowser = process.argv[3] || 'chromium';
  
  logWithTimestamp('Starting Rate Limiting Button Interaction Tests');
  logWithTimestamp(`Mode: ${mode}, Browser: ${targetBrowser}`);
  
  const results = [];
  
  if (mode === 'quick') {
    // Run only critical tests on single browser
    const criticalTests = testSuites.filter(suite => suite.priority <= 2);
    
    for (const suite of criticalTests) {
      const result = runTestSuite(suite, targetBrowser);
      results.push(result);
    }
  } else if (mode === 'cross-browser') {
    // Run all tests across all browsers
    for (const browser of browsers) {
      for (const suite of testSuites) {
        const result = runTestSuite(suite, browser);
        results.push(result);
      }
    }
  } else {
    // Full test suite on single browser
    for (const suite of testSuites) {
      const result = runTestSuite(suite, targetBrowser);
      results.push(result);
    }
  }
  
  // Generate reports
  const report = generateTestReport(results);
  
  // Save reports
  const reportsDir = path.join(__dirname, 'test-results');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(reportsDir, 'rate-limiting-report.json'), JSON.stringify(report.json, null, 2));
  fs.writeFileSync(path.join(reportsDir, 'rate-limiting-report.md'), report.text);
  
  logWithTimestamp('Test execution completed');
  logWithTimestamp(`Reports saved to: ${reportsDir}`);
  
  // Exit with appropriate code
  const allPassed = results.every(r => r.success);
  process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}