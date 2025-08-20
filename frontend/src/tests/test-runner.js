#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Agent Feed Frontend
 * 
 * This script provides an organized way to run all test suites
 * with proper reporting and configuration.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n${colors.blue}📋 ${description}${colors.reset}`);
  log(`${colors.cyan}Running: ${command}${colors.reset}`);
  
  try {
    const output = execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd(),
      timeout: 300000, // 5 minutes timeout
    });
    log(`${colors.green}✅ ${description} completed successfully${colors.reset}`);
    return true;
  } catch (error) {
    log(`${colors.red}❌ ${description} failed${colors.reset}`);
    log(`${colors.red}Error: ${error.message}${colors.reset}`);
    return false;
  }
}

function generateTestReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalSuites: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      successRate: `${((results.filter(r => r.success).length / results.length) * 100).toFixed(1)}%`
    },
    suites: results
  };

  const reportPath = path.join(__dirname, '../test-results/test-report.json');
  
  // Ensure directory exists
  const dir = path.dirname(reportPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log(`\n${colors.magenta}📊 Test Report Generated${colors.reset}`);
  log(`Location: ${reportPath}`);
  log(`Total Suites: ${report.summary.totalSuites}`);
  log(`Passed: ${colors.green}${report.summary.passed}${colors.reset}`);
  log(`Failed: ${colors.red}${report.summary.failed}${colors.reset}`);
  log(`Success Rate: ${colors.cyan}${report.summary.successRate}${colors.reset}`);

  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const suiteToRun = args[0];
  
  log(`${colors.bright}🧪 Agent Feed Frontend - Comprehensive Test Suite${colors.reset}`);
  log(`${colors.yellow}=====================================================${colors.reset}`);

  const testSuites = [
    {
      name: 'unit',
      command: 'npm test src/tests/unit -- --passWithNoTests --watchAll=false',
      description: 'Unit Tests (Components, Hooks, Utilities)',
      category: 'Core'
    },
    {
      name: 'integration',
      command: 'npm test src/tests/integration -- --passWithNoTests --watchAll=false',
      description: 'Integration Tests (Component Interactions, API)',
      category: 'Integration'
    },
    {
      name: 'performance',
      command: 'npm test src/tests/performance -- --passWithNoTests --watchAll=false',
      description: 'Performance Tests (Render Time, Memory, Bundle Size)',
      category: 'Performance'
    },
    {
      name: 'regression',
      command: 'npm test src/tests/regression -- --passWithNoTests --watchAll=false',
      description: 'Regression Tests (White Screen Prevention)',
      category: 'Regression'
    },
    {
      name: 'e2e',
      command: 'npx playwright test src/tests/e2e --reporter=line',
      description: 'End-to-End Tests (User Workflows)',
      category: 'E2E',
      skipInCI: process.env.CI && !process.env.RUN_E2E_TESTS
    }
  ];

  // Filter suites if specific suite requested
  const suitesToRun = suiteToRun 
    ? testSuites.filter(suite => suite.name === suiteToRun)
    : testSuites;

  if (suitesToRun.length === 0) {
    log(`${colors.red}❌ Unknown test suite: ${suiteToRun}${colors.reset}`);
    log(`Available suites: ${testSuites.map(s => s.name).join(', ')}`);
    process.exit(1);
  }

  const results = [];

  for (const suite of suitesToRun) {
    if (suite.skipInCI) {
      log(`${colors.yellow}⏭️  Skipping ${suite.name} tests (disabled in CI)${colors.reset}`);
      continue;
    }

    const startTime = Date.now();
    const success = runCommand(suite.command, suite.description);
    const duration = Date.now() - startTime;

    results.push({
      name: suite.name,
      description: suite.description,
      category: suite.category,
      success,
      duration,
      command: suite.command
    });

    // Add delay between test suites to prevent resource conflicts
    if (suite.name === 'e2e' && results.length < suitesToRun.length) {
      log(`${colors.yellow}⏳ Waiting 3 seconds before next suite...${colors.reset}`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Generate comprehensive report
  const report = generateTestReport(results);

  // Summary
  log(`\n${colors.bright}🎯 Test Suite Summary${colors.reset}`);
  log(`${colors.yellow}=====================${colors.reset}`);

  const categories = [...new Set(results.map(r => r.category))];
  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category === category);
    const passed = categoryResults.filter(r => r.success).length;
    const total = categoryResults.length;
    const status = passed === total ? colors.green : colors.red;
    
    log(`${category}: ${status}${passed}/${total}${colors.reset}`);
  });

  const allPassed = results.every(r => r.success);
  const finalStatus = allPassed ? 'PASSED' : 'FAILED';
  const statusColor = allPassed ? colors.green : colors.red;

  log(`\n${colors.bright}${statusColor}🏁 FINAL RESULT: ${finalStatus}${colors.reset}`);

  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

// Handle CLI usage
if (require.main === module) {
  main().catch(error => {
    log(`${colors.red}💥 Test runner failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = { main, runCommand, generateTestReport };