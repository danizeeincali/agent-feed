#!/usr/bin/env node
/**
 * React Hooks Validation Test Runner
 * Executes comprehensive hooks validation tests for React components
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logHeader(message) {
  log('\n' + '='.repeat(60), 'cyan');
  log(` 🧪 ${message}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function runCommand(command, description) {
  log(`\n🔄 ${description}...`, 'yellow');
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      timeout: 60000 // 1 minute timeout
    });
    
    logSuccess(`${description} completed`);
    return { success: true, output };
  } catch (error) {
    logError(`${description} failed`);
    log(error.message, 'red');
    return { success: false, error: error.message };
  }
}

async function checkPrerequisites() {
  logHeader('Checking Prerequisites');
  
  // Check if we're in the right directory
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    logError('package.json not found. Please run from project root.');
    process.exit(1);
  }
  
  // Check if test files exist
  const testFiles = [
    'tests/hooks-validation/RealSocialMediaFeed.hooks.test.tsx',
    'tests/hooks-validation/RealSocialMediaFeed.integration.test.tsx',
    'tests/hooks-validation/hooks-test-utils.ts',
    'tests/hooks-validation/hooks-validation.config.ts'
  ];
  
  for (const file of testFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      logSuccess(`Found ${file}`);
    } else {
      logWarning(`Missing ${file} - some tests may not run`);
    }
  }
  
  // Check Node version
  const nodeVersion = process.version;
  logInfo(`Node.js version: ${nodeVersion}`);
  
  // Check if Vitest is available
  try {
    execSync('npx vitest --version', { stdio: 'pipe' });
    logSuccess('Vitest is available');
  } catch (error) {
    logError('Vitest not found. Please install test dependencies.');
    logInfo('Run: npm install --save-dev vitest @testing-library/react @testing-library/jest-dom');
    process.exit(1);
  }
}

async function runHooksValidationTests() {
  logHeader('Running React Hooks Validation Tests');
  
  const testCommands = [
    {
      command: 'npx vitest run tests/hooks-validation/RealSocialMediaFeed.hooks.test.tsx --reporter=verbose',
      description: 'Core Hooks Validation Tests'
    },
    {
      command: 'npx vitest run tests/hooks-validation/RealSocialMediaFeed.integration.test.tsx --reporter=verbose', 
      description: 'Integration Hooks Tests'
    }
  ];
  
  const results = [];
  
  for (const { command, description } of testCommands) {
    const result = await runCommand(command, description);
    results.push({ description, ...result });
  }
  
  return results;
}

async function generateReport(testResults) {
  logHeader('Generating Validation Report');
  
  const reportPath = path.join(process.cwd(), 'tests/hooks-validation/VALIDATION_RESULTS.json');
  
  const report = {
    timestamp: new Date().toISOString(),
    component: 'RealSocialMediaFeed',
    testSuite: 'React Hooks Validation',
    results: testResults,
    summary: {
      total: testResults.length,
      passed: testResults.filter(r => r.success).length,
      failed: testResults.filter(r => !r.success).length,
      successRate: Math.round((testResults.filter(r => r.success).length / testResults.length) * 100)
    }
  };
  
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logSuccess(`Report saved to ${reportPath}`);
    
    // Also create a simple summary
    const summaryPath = path.join(process.cwd(), 'tests/hooks-validation/VALIDATION_SUMMARY.txt');
    const summary = `
React Hooks Validation Summary
==============================
Component: ${report.component}
Timestamp: ${report.timestamp}

Results:
- Total Tests: ${report.summary.total}
- Passed: ${report.summary.passed}
- Failed: ${report.summary.failed}
- Success Rate: ${report.summary.successRate}%

Status: ${report.summary.successRate === 100 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}
`;
    
    fs.writeFileSync(summaryPath, summary);
    logSuccess(`Summary saved to ${summaryPath}`);
    
  } catch (error) {
    logError(`Failed to save report: ${error.message}`);
  }
  
  return report;
}

async function displayResults(report) {
  logHeader('Test Results Summary');
  
  log(`📊 Component: ${report.component}`, 'bright');
  log(`🕐 Timestamp: ${report.timestamp}`, 'blue');
  log(`📈 Success Rate: ${report.summary.successRate}%`, 
      report.summary.successRate === 100 ? 'green' : 'yellow');
  
  log('\n📋 Test Results:');
  report.results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`  ${index + 1}. ${status} ${result.description}`, color);
  });
  
  if (report.summary.successRate === 100) {
    log('\n🎉 ALL TESTS PASSED! Component hooks are consistent and stable.', 'green');
  } else {
    log(`\n⚠️  ${report.summary.failed} test(s) failed. Check logs above for details.`, 'yellow');
  }
}

async function runCoverage() {
  logHeader('Running Coverage Analysis');
  
  const coverageResult = await runCommand(
    'npx vitest run tests/hooks-validation/ --coverage --reporter=verbose',
    'Test Coverage Analysis'
  );
  
  if (coverageResult.success) {
    logSuccess('Coverage analysis completed');
  } else {
    logWarning('Coverage analysis failed or not configured');
  }
  
  return coverageResult;
}

// Main execution
async function main() {
  const startTime = Date.now();
  
  log('🚀 React Hooks Validation Test Runner', 'bright');
  log('=====================================\n', 'bright');
  
  try {
    // Step 1: Check prerequisites
    await checkPrerequisites();
    
    // Step 2: Run validation tests
    const testResults = await runHooksValidationTests();
    
    // Step 3: Generate report
    const report = await generateReport(testResults);
    
    // Step 4: Display results
    await displayResults(report);
    
    // Step 5: Optional coverage analysis
    if (process.argv.includes('--coverage')) {
      await runCoverage();
    }
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    logHeader('Validation Complete');
    log(`⏱️  Total time: ${duration} seconds`, 'blue');
    
    // Exit with appropriate code
    const exitCode = report.summary.successRate === 100 ? 0 : 1;
    process.exit(exitCode);
    
  } catch (error) {
    logError(`Validation runner failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🧪 React Hooks Validation Test Runner

Usage:
  node run-hooks-validation.js [options]

Options:
  --coverage    Run with coverage analysis
  --help, -h    Show this help message

Description:
  Runs comprehensive React hooks validation tests to ensure component
  stability and prevent "Rendered more hooks" errors.

Examples:
  node run-hooks-validation.js
  node run-hooks-validation.js --coverage
  npm run hooks:validate
`);
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  runHooksValidationTests,
  checkPrerequisites,
  generateReport,
  displayResults
};
