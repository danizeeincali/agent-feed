import { FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Global Teardown for Tripling Bug Reproduction Tests
 * Collects and consolidates all evidence from test runs
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Tripling Bug Test Cleanup and Evidence Collection');
  
  // Consolidate all test evidence
  await consolidateTestEvidence();
  
  // Generate summary report
  await generateSummaryReport();
  
  console.log('📋 Tripling Bug Reproduction Test Suite Complete');
  console.log('📁 Evidence collected in: /workspaces/agent-feed/tests/playwright/tripling-evidence/');
}

async function consolidateTestEvidence() {
  const evidenceDir = '/workspaces/agent-feed/tests/playwright/tripling-evidence';
  const resultsDir = '/workspaces/agent-feed/tests/playwright/tripling-test-results';
  const reportsDir = '/workspaces/agent-feed/tests/playwright/tripling-bug-reports';
  
  // Ensure evidence directory exists
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
  
  console.log('📦 Consolidating test evidence...');
  
  // Copy screenshots
  if (fs.existsSync(resultsDir)) {
    const screenshots = fs.readdirSync(resultsDir).filter(file => file.endsWith('.png'));
    screenshots.forEach(screenshot => {
      const src = path.join(resultsDir, screenshot);
      const dest = path.join(evidenceDir, screenshot);
      fs.copyFileSync(src, dest);
    });
    console.log(`📸 Copied ${screenshots.length} screenshots`);
  }
  
  // Copy videos
  if (fs.existsSync(resultsDir)) {
    const videos = fs.readdirSync(resultsDir).filter(file => file.endsWith('.webm'));
    videos.forEach(video => {
      const src = path.join(resultsDir, video);
      const dest = path.join(evidenceDir, video);
      fs.copyFileSync(src, dest);
    });
    console.log(`🎥 Copied ${videos.length} videos`);
  }
  
  // Copy traces
  if (fs.existsSync(resultsDir)) {
    const traces = fs.readdirSync(resultsDir).filter(file => file.endsWith('.zip'));
    traces.forEach(trace => {
      const src = path.join(resultsDir, trace);
      const dest = path.join(evidenceDir, trace);
      fs.copyFileSync(src, dest);
    });
    console.log(`🔍 Copied ${traces.length} trace files`);
  }
  
  // Copy JSON results
  const jsonResults = '/workspaces/agent-feed/tests/playwright/tripling-bug-results.json';
  if (fs.existsSync(jsonResults)) {
    const dest = path.join(evidenceDir, 'test-results.json');
    fs.copyFileSync(jsonResults, dest);
    console.log('📊 Copied JSON test results');
  }
  
  // Copy HTML report
  if (fs.existsSync(reportsDir)) {
    const htmlReport = path.join(reportsDir, 'index.html');
    if (fs.existsSync(htmlReport)) {
      const dest = path.join(evidenceDir, 'test-report.html');
      fs.copyFileSync(htmlReport, dest);
      console.log('📄 Copied HTML test report');
    }
  }
}

async function generateSummaryReport() {
  const evidenceDir = '/workspaces/agent-feed/tests/playwright/tripling-evidence';
  const summaryPath = path.join(evidenceDir, 'TRIPLING_BUG_EVIDENCE_SUMMARY.md');
  
  console.log('📝 Generating evidence summary report...');
  
  // Read test results if available
  let testResults = null;
  const resultsPath = path.join(evidenceDir, 'test-results.json');
  if (fs.existsSync(resultsPath)) {
    testResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  }
  
  // Count evidence files
  const evidenceFiles = fs.existsSync(evidenceDir) ? fs.readdirSync(evidenceDir) : [];
  const screenshots = evidenceFiles.filter(f => f.endsWith('.png')).length;
  const videos = evidenceFiles.filter(f => f.endsWith('.webm')).length;
  const traces = evidenceFiles.filter(f => f.endsWith('.zip')).length;
  
  const summary = `# Claude Tripling Bug - E2E Test Evidence Summary

## Test Execution Summary
- **Date**: ${new Date().toISOString()}
- **Test Suite**: Claude Response Tripling Bug Reproduction
- **Purpose**: Automate reproduction of tripling behavior in Claude terminal interface

## Evidence Collected
- **Screenshots**: ${screenshots} files
- **Videos**: ${videos} files  
- **Trace Files**: ${traces} files
- **Test Results**: ${testResults ? 'Available' : 'Not available'}

## Test Results Summary
${testResults ? `
- **Total Tests**: ${testResults.suites?.reduce((acc, suite) => acc + (suite.tests?.length || 0), 0) || 'Unknown'}
- **Passed**: ${testResults.suites?.reduce((acc, suite) => acc + (suite.tests?.filter(t => t.outcome === 'passed')?.length || 0), 0) || 'Unknown'}
- **Failed**: ${testResults.suites?.reduce((acc, suite) => acc + (suite.tests?.filter(t => t.outcome === 'failed')?.length || 0), 0) || 'Unknown'}
- **Duration**: ${testResults.config?.metadata?.totalTime || 'Unknown'}
` : '- Test results not available'}

## Key Test Scenarios
1. **Character-by-character typing reproduction**
   - Simulates exact user behavior
   - Monitors DOM mutations for duplicate content
   - Captures network traffic for analysis

2. **WebSocket message flow monitoring**
   - Tracks duplicate message sends
   - Analyzes timing patterns
   - Documents network behavior

3. **DOM mutation tracking**
   - Records all DOM changes during input
   - Identifies suspicious patterns
   - Detects rapid sequential additions

## Expected Behavior vs Actual
- **Expected**: Single instance of user input in terminal
- **Actual**: Multiple instances (tripling) of the same input
- **Root Cause**: Under investigation (network/DOM/state management)

## Files in This Evidence Package
${evidenceFiles.map(file => `- ${file}`).join('\n')}

## Analysis Tools Used
- **Playwright E2E Testing**: Browser automation and interaction simulation
- **DOM Mutation Observer**: Real-time DOM change monitoring  
- **WebSocket Traffic Capture**: Network message flow analysis
- **Screenshot/Video Capture**: Visual evidence of tripling behavior
- **Trace Collection**: Detailed execution traces for debugging

## Next Steps for Investigation
1. Review captured network traffic for duplicate sends
2. Analyze DOM mutation patterns for timing issues
3. Check WebSocket connection management
4. Investigate input buffering mechanisms
5. Examine state management for duplicate updates

## Test Environment
- **Frontend URL**: http://localhost:5173
- **Backend URL**: http://localhost:3001  
- **Browser**: Chromium/Firefox
- **Automation**: Playwright ${process.env.npm_package_dependencies_playwright || 'Unknown version'}

---
*Generated automatically by Tripling Bug Reproduction Test Suite*
`;

  fs.writeFileSync(summaryPath, summary);
  console.log(`📋 Evidence summary saved to: ${summaryPath}`);
}

export default globalTeardown;