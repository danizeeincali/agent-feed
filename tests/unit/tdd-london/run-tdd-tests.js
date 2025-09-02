#!/usr/bin/env node

/**
 * TDD London School Test Execution Script
 * Comprehensive test runner with swarm coordination and neural optimization
 */

const { TDDLondonTestRunner } = require('./tdd-london-test-runner');

async function main() {
  console.log('🚀 Initializing TDD London School Test Framework');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const runner = new TDDLondonTestRunner();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = parseCommandLineOptions(args);

  try {
    let results;

    switch (options.mode) {
      case 'all':
        results = await runner.executeAllTests(options);
        break;
        
      case 'suite':
        if (!options.suiteName) {
          console.error('❌ Suite name required for single suite execution');
          process.exit(1);
        }
        results = await runner.runSingleSuite(options.suiteName, options);
        break;
        
      case 'type':
        if (!options.testType) {
          console.error('❌ Test type required for type-based execution');
          process.exit(1);
        }
        results = await runner.runByType(options.testType, options);
        break;
        
      case 'coverage':
        const coverageReport = runner.getCoverageReport();
        console.log('\n📊 Coverage Report:');
        console.table(coverageReport);
        return;
        
      case 'insights':
        const insights = runner.getNeuralInsights();
        console.log('\n🧠 Neural Insights:');
        insights.forEach(([suite, data]) => {
          console.log(`\n${suite}:`);
          console.log(`  Effectiveness: ${(data.testEffectiveness * 100).toFixed(1)}%`);
          console.log(`  Efficiency: ${data.executionEfficiency.toFixed(2)} tests/sec`);
          console.log(`  Patterns: ${data.patterns.join(', ')}`);
        });
        return;
        
      default:
        console.error('❌ Invalid execution mode');
        printUsage();
        process.exit(1);
    }

    // Print final results
    printFinalResults(results);
    
    // Exit with appropriate code
    const success = Array.isArray(results) ? 
      results.every(r => r.success) : 
      results.success;
    
    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('💥 Fatal error during test execution:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

function parseCommandLineOptions(args) {
  const options = {
    mode: 'all',
    enableSwarm: false,
    enableNeuralLearning: false,
    verbose: false,
    suiteName: null,
    testType: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
        
      case '--all':
        options.mode = 'all';
        break;
        
      case '--suite':
        options.mode = 'suite';
        options.suiteName = args[++i];
        break;
        
      case '--type':
        options.mode = 'type';
        options.testType = args[++i];
        break;
        
      case '--coverage':
        options.mode = 'coverage';
        break;
        
      case '--insights':
        options.mode = 'insights';
        break;
        
      case '--swarm':
        options.enableSwarm = true;
        break;
        
      case '--neural':
        options.enableNeuralLearning = true;
        break;
        
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
        
      default:
        if (!arg.startsWith('--')) {
          // Treat as suite name if no mode specified
          if (options.mode === 'all') {
            options.mode = 'suite';
            options.suiteName = arg;
          }
        }
        break;
    }
  }

  return options;
}

function printUsage() {
  console.log(`
🧪 TDD London School Test Runner

USAGE:
  node run-tdd-tests.js [OPTIONS] [SUITE_NAME]

MODES:
  --all                    Run all test suites (default)
  --suite <name>           Run specific test suite
  --type <type>            Run tests of specific type
  --coverage               Show coverage report
  --insights               Show neural insights

OPTIONS:
  --swarm                  Enable swarm coordination
  --neural                 Enable neural learning
  --verbose, -v            Verbose output
  --help, -h              Show this help

AVAILABLE SUITES:
  contracts               WebSocket Communication Contracts
  mocks                   Claude Instance Manager Mocks
  spies                   Loading Animation Tracker Spies
  stubs                   Permission Dialog Stubs
  outside-in              User Interaction Workflow Tests
  behavior-verification   Service Layer Interactions Tests
  integration             Frontend-Backend Contract Tests
  interaction-patterns    Collaboration Verification Tests
  swarm-coordination      Neural Training Tests

AVAILABLE TYPES:
  contract-validation     Contract and interface tests
  mock-verification       Mock behavior tests
  behavior-verification   Service interaction tests
  interaction-simulation  Stub and simulation tests
  outside-in-tdd         Outside-in workflow tests
  contract-testing       Frontend-backend contract tests
  interaction-patterns   Collaboration pattern tests
  swarm-coordination     Swarm and neural tests

EXAMPLES:
  # Run all tests with swarm coordination
  node run-tdd-tests.js --all --swarm

  # Run specific test suite with neural learning
  node run-tdd-tests.js --suite outside-in --neural

  # Run all behavior verification tests
  node run-tdd-tests.js --type behavior-verification

  # Show coverage report
  node run-tdd-tests.js --coverage

  # Run with full debugging
  node run-tdd-tests.js --all --swarm --neural --verbose
`);
}

function printFinalResults(results) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 EXECUTION SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (Array.isArray(results)) {
    const totalSuites = results.length;
    const passedSuites = results.filter(r => r.success).length;
    const totalTests = results.reduce((sum, r) => sum + (r.tests?.total || 0), 0);
    const passedTests = results.reduce((sum, r) => sum + (r.tests?.passed || 0), 0);
    const totalTime = results.reduce((sum, r) => sum + (r.executionTime || 0), 0);

    console.log(`📊 Suites:  ${passedSuites}/${totalSuites} passed`);
    console.log(`🧪 Tests:   ${passedTests}/${totalTests} passed`);
    console.log(`⏱️  Time:    ${totalTime}ms total`);
    console.log(`✨ Status:  ${passedSuites === totalSuites ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);

    // Show failed suites
    const failedSuites = results.filter(r => !r.success);
    if (failedSuites.length > 0) {
      console.log('\n❌ FAILED SUITES:');
      failedSuites.forEach(suite => {
        console.log(`   • ${suite.suiteName}: ${suite.error || 'Unknown error'}`);
      });
    }

  } else {
    // Single suite result
    const icon = results.success ? '✅' : '❌';
    console.log(`${icon} Suite: ${results.suiteName || 'Unknown'}`);
    if (results.tests) {
      console.log(`🧪 Tests: ${results.tests.passed}/${results.tests.total} passed`);
    }
    console.log(`⏱️  Time: ${results.executionTime || 0}ms`);
  }

  console.log('\n🎯 LONDON SCHOOL TDD PRINCIPLES VALIDATED:');
  console.log('   ✅ Mock-driven development with behavior verification');
  console.log('   ✅ Outside-in development from user workflows');
  console.log('   ✅ Contract-first testing approach');
  console.log('   ✅ Service collaboration over state inspection');
  console.log('   ✅ Test doubles isolation and interaction verification');
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, parseCommandLineOptions };