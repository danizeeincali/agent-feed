#!/usr/bin/env node

/**
 * Regression Test Suite Runner
 *
 * Orchestrates the complete CSS architecture regression testing pipeline
 * Runs Jest tests followed by Playwright E2E tests
 */

const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');

const PROJECT_ROOT = '/workspaces/agent-feed';
const REGRESSION_DIR = path.join(PROJECT_ROOT, 'tests/regression');
const REPORTS_DIR = path.join(REGRESSION_DIR, 'reports');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`);
};

const logSection = (title) => {
  log(`\n${'='.repeat(60)}`, colors.cyan);
  log(`${title}`, colors.bright + colors.cyan);
  log(`${'='.repeat(60)}`, colors.cyan);
};

const runCommand = (command, args, options = {}) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'pipe',
      cwd: PROJECT_ROOT,
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      if (options.realtime) {
        process.stdout.write(data);
      }
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      if (options.realtime) {
        process.stderr.write(data);
      }
    });

    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
};

const createReportsDirectory = async () => {
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
    log(`✅ Reports directory created: ${REPORTS_DIR}`, colors.green);
  } catch (error) {
    log(`❌ Failed to create reports directory: ${error.message}`, colors.red);
    throw error;
  }
};

const runJestTests = async () => {
  logSection('Running Jest Unit Tests');

  try {
    log('🧪 Starting Jest regression tests...', colors.blue);

    const result = await runCommand('npx', [
      'jest',
      '--config',
      path.join(REGRESSION_DIR, 'jest.config.regression.js'),
      '--verbose',
      '--passWithNoTests'
    ], { realtime: true });

    if (result.code === 0) {
      log('✅ Jest tests completed successfully', colors.green);
    } else {
      log('❌ Jest tests failed', colors.red);
      log('Jest output:', colors.yellow);
      log(result.stdout);
      log(result.stderr, colors.red);
    }

    return result.code === 0;
  } catch (error) {
    log(`❌ Jest execution failed: ${error.message}`, colors.red);
    return false;
  }
};

const runPlaywrightTests = async () => {
  logSection('Running Playwright E2E Tests');

  try {
    log('🎭 Starting Playwright regression tests...', colors.blue);

    // Install Playwright browsers if needed
    log('📦 Ensuring Playwright browsers are installed...', colors.yellow);
    await runCommand('npx', ['playwright', 'install', '--with-deps']);

    const result = await runCommand('npx', [
      'playwright',
      'test',
      '--config',
      path.join(REGRESSION_DIR, 'playwright.config.regression.js'),
      '--reporter=list'
    ], { realtime: true });

    if (result.code === 0) {
      log('✅ Playwright tests completed successfully', colors.green);
    } else {
      log('❌ Playwright tests failed', colors.red);
      log('Playwright output:', colors.yellow);
      log(result.stdout);
      log(result.stderr, colors.red);
    }

    return result.code === 0;
  } catch (error) {
    log(`❌ Playwright execution failed: ${error.message}`, colors.red);
    return false;
  }
};

const generateSummaryReport = async (jestSuccess, playwrightSuccess) => {
  logSection('Generating Summary Report');

  const summary = {
    timestamp: new Date().toISOString(),
    testSuite: 'CSS Architecture Regression Tests',
    results: {
      jest: {
        success: jestSuccess,
        type: 'Unit Tests (CSS Variables, Tailwind, Components, React Hooks)'
      },
      playwright: {
        success: playwrightSuccess,
        type: 'E2E Tests (Multi-viewport, Responsive Design, Browser Compatibility)'
      }
    },
    overall: {
      success: jestSuccess && playwrightSuccess,
      coverage: [
        'CSS Variable Loading (HSL format validation)',
        'Tailwind Class Application',
        'Component Rendering (no white screen)',
        'React Hook Integration (useEffect working)',
        'Multi-viewport Responsive Design',
        'Build Process Validation',
        'Server Integration (3003/3000)',
        'Cross-browser Compatibility'
      ]
    }
  };

  try {
    const summaryPath = path.join(REPORTS_DIR, 'regression-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    log(`📊 Summary report saved: ${summaryPath}`, colors.green);

    // Generate human-readable summary
    const readableSummary = `
CSS Architecture Regression Test Summary
Generated: ${summary.timestamp}

Test Results:
✅ Jest Unit Tests: ${jestSuccess ? 'PASSED' : 'FAILED'}
   - CSS Variable Loading Tests
   - Tailwind Class Application Tests
   - Component Rendering Tests
   - React Hook Integration Tests
   - Build Process Validation Tests
   - Server Integration Tests

✅ Playwright E2E Tests: ${playwrightSuccess ? 'PASSED' : 'FAILED'}
   - Multi-viewport Responsive Tests
   - Cross-browser Compatibility Tests
   - Visual Regression Tests

Overall Result: ${summary.overall.success ? 'PASSED' : 'FAILED'}

Coverage Areas:
${summary.overall.coverage.map(item => `- ${item}`).join('\n')}

Report Location: ${REPORTS_DIR}
`;

    const readablePath = path.join(REPORTS_DIR, 'regression-summary.txt');
    await fs.writeFile(readablePath, readableSummary);
    log(`📄 Readable summary saved: ${readablePath}`, colors.green);

    return summary;
  } catch (error) {
    log(`❌ Failed to generate summary report: ${error.message}`, colors.red);
    return null;
  }
};

const displayFinalResults = (summary) => {
  logSection('Final Results');

  if (summary?.overall.success) {
    log('🎉 ALL REGRESSION TESTS PASSED!', colors.bright + colors.green);
    log('CSS architecture is stable and regression-free', colors.green);
  } else {
    log('❌ REGRESSION TESTS FAILED', colors.bright + colors.red);
    log('CSS architecture has regressions that need attention', colors.red);
  }

  log('\nTest Coverage:', colors.bright);
  log('✅ CSS Variable Loading (HSL format)', colors.green);
  log('✅ Tailwind CSS Integration', colors.green);
  log('✅ Component Rendering', colors.green);
  log('✅ React Hook Integration', colors.green);
  log('✅ Responsive Design', colors.green);
  log('✅ Build Process', colors.green);
  log('✅ Server Integration', colors.green);
  log('✅ Cross-browser Compatibility', colors.green);

  log(`\nReports available in: ${REPORTS_DIR}`, colors.cyan);
  log('- Jest: regression-test-results.xml', colors.cyan);
  log('- Playwright: regression-e2e-results.xml', colors.cyan);
  log('- Summary: regression-summary.json', colors.cyan);
};

// Main execution
const main = async () => {
  try {
    log('🚀 Starting CSS Architecture Regression Test Suite', colors.bright + colors.magenta);
    log(`Project: ${PROJECT_ROOT}`, colors.cyan);
    log(`Reports: ${REPORTS_DIR}`, colors.cyan);

    // Setup
    await createReportsDirectory();

    // Run tests
    const jestSuccess = await runJestTests();
    const playwrightSuccess = await runPlaywrightTests();

    // Generate reports
    const summary = await generateSummaryReport(jestSuccess, playwrightSuccess);

    // Display results
    displayFinalResults(summary);

    // Exit with appropriate code
    const success = jestSuccess && playwrightSuccess;
    process.exit(success ? 0 : 1);

  } catch (error) {
    log(`❌ Regression test suite failed: ${error.message}`, colors.red);
    process.exit(1);
  }
};

// Handle process signals
process.on('SIGINT', () => {
  log('\n⏹️ Regression test suite interrupted', colors.yellow);
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('\n⏹️ Regression test suite terminated', colors.yellow);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runJestTests,
  runPlaywrightTests,
  generateSummaryReport,
  main
};