#!/usr/bin/env node

/**
 * Production Validation Runner
 * Command-line interface for running production validation tests
 */

const { ProductionValidationSuite } = require('./production-validation-suite');

// Parse command line arguments
const args = process.argv.slice(2);
const config = {
  frontendUrl: 'http://localhost:5173',
  backendUrl: 'http://localhost:3001', 
  wsUrl: 'ws://localhost:3001',
  apiUrl: 'http://localhost:3001/api',
  runParallel: true,
  detailedReports: true,
  skipSlowTests: false,
  minReliabilityScore: 95
};

// Process command line arguments
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--frontend-url':
      config.frontendUrl = args[++i];
      break;
    case '--backend-url':
      config.backendUrl = args[++i];
      config.apiUrl = `${config.backendUrl}/api`;
      break;
    case '--ws-url':
      config.wsUrl = args[++i];
      break;
    case '--sequential':
      config.runParallel = false;
      break;
    case '--no-reports':
      config.detailedReports = false;
      break;
    case '--skip-slow':
      config.skipSlowTests = true;
      break;
    case '--min-score':
      config.minReliabilityScore = parseInt(args[++i]);
      break;
    case '--help':
    case '-h':
      printUsage();
      process.exit(0);
      break;
    default:
      if (args[i].startsWith('--')) {
        console.error(`Unknown option: ${args[i]}`);
        printUsage();
        process.exit(1);
      }
  }
}

function printUsage() {
  console.log(`
Production Validation Suite

Usage: node run-validation.js [OPTIONS]

Options:
  --frontend-url URL     Frontend URL (default: http://localhost:5173)
  --backend-url URL      Backend URL (default: http://localhost:3001)
  --ws-url URL           WebSocket URL (default: ws://localhost:3001)
  --sequential           Run tests sequentially instead of parallel
  --no-reports           Skip generating detailed reports
  --skip-slow            Skip slow/long-running tests
  --min-score SCORE      Minimum reliability score to pass (default: 95)
  --help, -h             Show this help message

Examples:
  node run-validation.js
  node run-validation.js --sequential --skip-slow
  node run-validation.js --backend-url http://localhost:8080
  node run-validation.js --min-score 90 --no-reports
`);
}

async function main() {
  console.log('🚀 Production Validation Suite');
  console.log('==============================\n');
  
  const suite = new ProductionValidationSuite(config);
  
  try {
    const results = await suite.runFullValidationSuite();
    
    if (config.detailedReports) {
      await suite.generateDetailedReport(results);
    }
    
    console.log('\n📊 Final Results:');
    console.log(`   Overall Score: ${results.overallScore.toFixed(1)}%`);
    console.log(`   Status: ${results.passed ? '✅ PRODUCTION READY' : '❌ NOT PRODUCTION READY'}`);
    console.log(`   Duration: ${Math.floor(results.duration / 1000)}s`);
    
    if (!results.passed) {
      console.log('\n🚨 CRITICAL: System is NOT ready for production deployment!');
      console.log('   Please address all issues before proceeding.');
      console.log('   Review the detailed logs above for specific problems.');
    } else {
      console.log('\n🎉 SUCCESS: System validated for production deployment!');
      console.log('   All critical tests passed.');
      console.log('   Performance and reliability requirements met.');
      console.log('   Error recovery mechanisms are functional.');
    }
    
    // Exit with appropriate code
    process.exit(results.passed ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 Validation suite encountered an error:');
    console.error(`   ${error.message}`);
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Validation interrupted by user');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n\n⏹️  Validation terminated');
  process.exit(143);
});

// Run the main function
main();