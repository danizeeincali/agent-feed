/**
 * TDD London School - Test Runner Configuration
 * 
 * Specialized test runner for sharing removal tests
 * Ensures proper test isolation and mock management
 */

const { execSync } = require('child_process');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/tdd-sharing-removal/test-setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1'
  },
  testMatch: [
    '<rootDir>/tests/tdd-sharing-removal/**/*.test.{js,ts}'
  ],
  collectCoverageFrom: [
    'frontend/src/components/SocialMediaFeed.tsx',
    'frontend/src/services/api.ts'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: '<rootDir>/coverage/tdd-sharing-removal',
  verbose: true,
  testTimeout: 10000
};

// Test execution order (London School - outside-in)
const TEST_EXECUTION_ORDER = [
  'sharing-removal.acceptance.test.ts',    // Acceptance tests first
  'sharing-ui-isolation.test.ts',          // UI isolation tests
  'api-interaction.test.ts',               // API interaction tests
  'regression-prevention.test.ts',         // Regression tests
  'integration-outside-in.test.ts'         // Integration tests last
];

function runTestSuite() {
  console.log('🧪 Starting TDD London School - Sharing Removal Test Suite');
  console.log('=' .repeat(60));
  
  try {
    // Run tests in order
    for (const testFile of TEST_EXECUTION_ORDER) {
      console.log(`\n🔄 Running: ${testFile}`);
      console.log('-'.repeat(40));
      
      const testPath = path.join(__dirname, testFile);
      
      try {
        // Run individual test file
        execSync(`npx jest "${testPath}" --config='${JSON.stringify(TEST_CONFIG)}'`, {
          stdio: 'inherit',
          cwd: path.resolve(__dirname, '../../')
        });
        
        console.log(`✅ ${testFile} - PASSED`);
      } catch (error) {
        console.log(`❌ ${testFile} - FAILED`);
        console.log(`Error: ${error.message}`);
        
        // Continue with other tests in TDD mode
        continue;
      }
    }
    
    // Run full coverage report
    console.log('\n📊 Generating Coverage Report...');
    console.log('-'.repeat(40));
    
    execSync(`npx jest --config='${JSON.stringify(TEST_CONFIG)}' --coverage`, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../../')
    });
    
    console.log('\n🎯 Test Suite Complete!');
    console.log('📈 Coverage report available in: coverage/tdd-sharing-removal/');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
TDD London School - Sharing Removal Test Runner

Usage:
  node test-runner.js [options]

Options:
  --help              Show this help message
  --watch             Run tests in watch mode
  --coverage          Generate coverage report only
  --single <test>     Run a single test file
  
Test Order (London School Outside-In):
  1. acceptance tests (failing behavior expectations)
  2. UI isolation tests (mock-driven component tests)
  3. API interaction tests (service layer verification)
  4. regression tests (ensure no breakage)
  5. integration tests (end-to-end verification)

Examples:
  node test-runner.js
  node test-runner.js --single acceptance
  node test-runner.js --coverage
`);
    return;
  }
  
  if (args.includes('--single')) {
    const testIndex = args.indexOf('--single') + 1;
    const testName = args[testIndex];
    
    if (!testName) {
      console.error('❌ Please specify a test name');
      process.exit(1);
    }
    
    const testFile = TEST_EXECUTION_ORDER.find(file => 
      file.includes(testName.toLowerCase())
    );
    
    if (!testFile) {
      console.error(`❌ Test not found: ${testName}`);
      console.log('Available tests:', TEST_EXECUTION_ORDER);
      process.exit(1);
    }
    
    console.log(`🧪 Running single test: ${testFile}`);
    const testPath = path.join(__dirname, testFile);
    
    try {
      execSync(`npx jest "${testPath}" --config='${JSON.stringify(TEST_CONFIG)}'`, {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../../')
      });
    } catch (error) {
      process.exit(1);
    }
    
    return;
  }
  
  if (args.includes('--coverage')) {
    console.log('📊 Generating coverage report only...');
    
    try {
      execSync(`npx jest --config='${JSON.stringify(TEST_CONFIG)}' --coverage --passWithNoTests`, {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../../')
      });
    } catch (error) {
      process.exit(1);
    }
    
    return;
  }
  
  if (args.includes('--watch')) {
    console.log('👀 Running tests in watch mode...');
    
    try {
      execSync(`npx jest --config='${JSON.stringify(TEST_CONFIG)}' --watch`, {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '../../')
      });
    } catch (error) {
      process.exit(1);
    }
    
    return;
  }
  
  // Default: run full test suite
  runTestSuite();
}

module.exports = {
  TEST_CONFIG,
  TEST_EXECUTION_ORDER,
  runTestSuite
};