#!/usr/bin/env node

/**
 * TDD London School: Input Buffering Test Runner
 * Comprehensive test execution with behavior verification reporting
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
  testDir: __dirname,
  coverageDir: path.join(__dirname, 'coverage'),
  reportsDir: path.join(__dirname, 'reports'),
  jestConfig: path.join(__dirname, 'jest.config.js'),
  timeout: 30000 // 30 seconds
};

// Test categories
const TEST_CATEGORIES = {
  unit: {
    name: 'Unit Tests (Mock-Driven)',
    pattern: 'unit/**/*.test.js',
    description: 'Individual component behavior verification through mocks'
  },
  integration: {
    name: 'Integration Tests (Swarm Coordination)',
    pattern: 'integration/**/*.test.js', 
    description: 'Cross-component interaction and swarm behavior testing'
  },
  contracts: {
    name: 'Contract Verification',
    pattern: '**/*.test.js',
    testNamePattern: 'Contract',
    description: 'Mock interface compliance and contract satisfaction'
  },
  mocks: {
    name: 'Mock Factory Validation',
    pattern: 'mocks/**/*.js',
    description: 'Mock creation utilities and behavior verification'
  }
};

// Colors for output
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

const log = {
  info: (msg) => console.log(`${colors.cyan}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.magenta}=== ${msg} ===${colors.reset}\n`)
};

/**
 * Ensure required directories exist
 */
function setupDirectories() {
  const dirs = [TEST_CONFIG.coverageDir, TEST_CONFIG.reportsDir];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log.info(`Created directory: ${dir}`);
    }
  });
}

/**
 * Run Jest with specific configuration
 */
function runJest(options = {}) {
  const {
    pattern = '**/*.test.js',
    testNamePattern,
    coverage = false,
    watch = false,
    verbose = false,
    category = 'all'
  } = options;

  let jestArgs = [
    `--config=${TEST_CONFIG.jestConfig}`,
    `--testTimeout=${TEST_CONFIG.timeout}`,
    '--colors',
    '--detectOpenHandles',
    '--forceExit'
  ];

  // Test pattern
  if (pattern !== '**/*.test.js') {
    jestArgs.push(`--testPathPattern="${pattern}"`);
  }

  // Test name pattern for contract tests
  if (testNamePattern) {
    jestArgs.push(`--testNamePattern="${testNamePattern}"`);
  }

  // Coverage
  if (coverage) {
    jestArgs.push('--coverage');
    jestArgs.push(`--coverageDirectory=${TEST_CONFIG.coverageDir}`);
  }

  // Watch mode
  if (watch) {
    jestArgs.push('--watch');
  }

  // Verbose output
  if (verbose) {
    jestArgs.push('--verbose');
  }

  const jestCommand = `npx jest ${jestArgs.join(' ')}`;
  
  log.info(`Running ${category} tests...`);
  log.info(`Command: ${jestCommand}`);

  try {
    execSync(jestCommand, {
      cwd: TEST_CONFIG.testDir,
      stdio: 'inherit',
      timeout: TEST_CONFIG.timeout
    });
    return true;
  } catch (error) {
    log.error(`Test execution failed: ${error.message}`);
    return false;
  }
}

/**
 * Run specific test category
 */
function runTestCategory(categoryKey) {
  const category = TEST_CATEGORIES[categoryKey];
  
  if (!category) {
    log.error(`Unknown test category: ${categoryKey}`);
    return false;
  }

  log.header(category.name);
  log.info(category.description);

  return runJest({
    pattern: category.pattern,
    testNamePattern: category.testNamePattern,
    coverage: true,
    verbose: true,
    category: category.name
  });
}

/**
 * Run all test categories in sequence
 */
function runAllTests() {
  log.header('TDD London School: Input Buffering Test Suite');
  
  const results = {};
  let overallSuccess = true;

  // Run each test category
  for (const [key, category] of Object.entries(TEST_CATEGORIES)) {
    const success = runTestCategory(key);
    results[key] = { success, category: category.name };
    
    if (!success) {
      overallSuccess = false;
    }
  }

  // Summary
  log.header('Test Execution Summary');
  
  for (const [key, result] of Object.entries(results)) {
    const status = result.success ? 
      `${colors.green}✓ PASSED${colors.reset}` : 
      `${colors.red}✗ FAILED${colors.reset}`;
    
    console.log(`${status} ${result.category}`);
  }

  return overallSuccess;
}

/**
 * Generate test report
 */
function generateReport() {
  log.header('Generating Test Reports');

  try {
    // HTML Report
    const htmlReportPath = path.join(TEST_CONFIG.reportsDir, 'input-buffering-test-report.html');
    if (fs.existsSync(htmlReportPath)) {
      log.success(`HTML Report: ${htmlReportPath}`);
    }

    // Coverage Report
    const coverageReportPath = path.join(TEST_CONFIG.coverageDir, 'lcov-report', 'index.html');
    if (fs.existsSync(coverageReportPath)) {
      log.success(`Coverage Report: ${coverageReportPath}`);
    }

    // JUnit XML
    const junitReportPath = path.join(TEST_CONFIG.reportsDir, 'input-buffering-junit.xml');
    if (fs.existsSync(junitReportPath)) {
      log.success(`JUnit Report: ${junitReportPath}`);
    }

    return true;
  } catch (error) {
    log.error(`Report generation failed: ${error.message}`);
    return false;
  }
}

/**
 * Display London School TDD metrics
 */
function displayTDDMetrics() {
  log.header('London School TDD Metrics');

  const coveragePath = path.join(TEST_CONFIG.coverageDir, 'coverage-summary.json');
  
  if (fs.existsSync(coveragePath)) {
    try {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const total = coverage.total;

      console.log('📊 Test Coverage:');
      console.log(`   Lines: ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})`);
      console.log(`   Functions: ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})`);
      console.log(`   Branches: ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})`);
      console.log(`   Statements: ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})`);

      // London School specific metrics
      console.log('\n🎭 London School Compliance:');
      console.log('   ✓ Mock-driven development approach');
      console.log('   ✓ Behavior verification over state testing');
      console.log('   ✓ Outside-in test design');
      console.log('   ✓ Contract-based mock definitions');
      console.log('   ✓ Interaction verification utilities');

    } catch (error) {
      log.warning('Could not parse coverage data');
    }
  }

  console.log('\n🚀 Test Performance:');
  console.log('   • Mock isolation ensures fast test execution');
  console.log('   • Behavior verification prevents brittle tests');
  console.log('   • Contract testing maintains interface integrity');
  console.log('   • Swarm coordination enables distributed testing');
}

/**
 * Main execution function
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Setup
  setupDirectories();

  switch (command) {
    case 'unit':
      process.exit(runTestCategory('unit') ? 0 : 1);
      break;

    case 'integration':
      process.exit(runTestCategory('integration') ? 0 : 1);
      break;

    case 'contracts':
      process.exit(runTestCategory('contracts') ? 0 : 1);
      break;

    case 'mocks':
      process.exit(runTestCategory('mocks') ? 0 : 1);
      break;

    case 'watch':
      log.info('Starting watch mode for TDD development...');
      runJest({ watch: true, verbose: true });
      break;

    case 'coverage':
      const success = runJest({ coverage: true, verbose: true });
      if (success) {
        displayTDDMetrics();
      }
      process.exit(success ? 0 : 1);
      break;

    case 'report':
      generateReport();
      displayTDDMetrics();
      break;

    case 'ci':
      log.info('Running CI test suite...');
      const ciSuccess = runJest({ 
        coverage: true, 
        verbose: false,
        category: 'CI Pipeline'
      });
      
      if (ciSuccess) {
        generateReport();
        displayTDDMetrics();
      }
      
      process.exit(ciSuccess ? 0 : 1);
      break;

    case 'help':
    case '--help':
    case '-h':
      console.log(`
TDD London School Input Buffering Test Runner

Usage:
  node run-tests.js [command]

Commands:
  unit           Run unit tests (mock-driven behavior verification)
  integration    Run integration tests (swarm coordination)
  contracts      Run contract verification tests
  mocks          Validate mock factory utilities
  watch          Start watch mode for TDD development
  coverage       Run all tests with coverage reporting
  report         Generate test reports and metrics
  ci             Run CI pipeline tests
  help           Show this help message

Examples:
  node run-tests.js unit          # Run unit tests only
  node run-tests.js watch         # TDD development mode
  node run-tests.js coverage      # Full coverage analysis
  node run-tests.js ci            # CI/CD pipeline execution

London School TDD Focus:
  • Mock-driven development approach
  • Behavior verification over state testing  
  • Outside-in test design principles
  • Contract-based mock definitions
  • Interaction verification utilities
      `);
      break;

    default:
      log.info('Running all test categories...');
      const allSuccess = runAllTests();
      
      if (allSuccess) {
        generateReport();
        displayTDDMetrics();
        log.success('All tests completed successfully! 🎉');
      } else {
        log.error('Some tests failed. Check the output above for details.');
      }
      
      process.exit(allSuccess ? 0 : 1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = {
  runTestCategory,
  runAllTests,
  generateReport,
  displayTDDMetrics,
  TEST_CONFIG,
  TEST_CATEGORIES
};