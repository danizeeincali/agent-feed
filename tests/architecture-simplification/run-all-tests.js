#!/usr/bin/env node

/**
 * Architecture Simplification Test Suite Runner
 *
 * Comprehensive TDD test suite for dual -> single architecture migration
 * Ensures zero-to-one reliability through mock-driven testing
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const testCategories = [
  {
    name: 'BEFORE Tests - Current Dual Architecture',
    pattern: 'before/**/*.test.js',
    description: 'Validates current dual system behavior and documents baseline'
  },
  {
    name: 'AFTER Tests - Simplified Single Architecture',
    pattern: 'after/**/*.test.js',
    description: 'Validates unified system functionality and improvements'
  },
  {
    name: 'Migration Safety Tests',
    pattern: 'migration/**/*.test.js',
    description: 'Ensures safe data migration and API compatibility'
  },
  {
    name: 'Regression Prevention Tests',
    pattern: 'regression/**/*.test.js',
    description: 'Prevents known issues: post.id?.slice, network errors, data mismatches'
  },
  {
    name: 'Performance Benchmark Tests',
    pattern: 'performance/**/*.test.js',
    description: 'Measures bundle size, load times, and memory usage improvements'
  }
];

async function runTestCategory(category) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running ${category.name}...`);
    console.log(`📋 ${category.description}\n`);

    const jest = spawn('npx', ['jest', '--config', 'jest.config.js', '--testPathPattern', category.pattern], {
      cwd: __dirname,
      stdio: 'inherit'
    });

    jest.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${category.name} - PASSED\n`);
        resolve({ category: category.name, status: 'PASSED' });
      } else {
        console.log(`❌ ${category.name} - FAILED\n`);
        resolve({ category: category.name, status: 'FAILED', code });
      }
    });

    jest.on('error', (error) => {
      console.error(`Error running ${category.name}:`, error);
      reject(error);
    });
  });
}

async function generateReport(results) {
  const reportPath = path.join(__dirname, 'test-results.json');
  const timestamp = new Date().toISOString();

  const report = {
    timestamp,
    summary: {
      total: results.length,
      passed: results.filter(r => r.status === 'PASSED').length,
      failed: results.filter(r => r.status === 'FAILED').length
    },
    results,
    recommendations: []
  };

  // Add recommendations based on results
  if (report.summary.failed > 0) {
    report.recommendations.push('❌ Architecture simplification is not ready - failing tests must be addressed');
    report.recommendations.push('🔧 Review failing test categories and fix underlying issues');
  } else {
    report.recommendations.push('✅ All tests pass - architecture simplification can proceed safely');
    report.recommendations.push('🚀 Migration can begin with confidence in data integrity and functionality preservation');
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n📊 TEST SUITE SUMMARY');
  console.log('=' .repeat(50));
  console.log(`📅 Timestamp: ${timestamp}`);
  console.log(`📈 Total Categories: ${report.summary.total}`);
  console.log(`✅ Passed: ${report.summary.passed}`);
  console.log(`❌ Failed: ${report.summary.failed}`);
  console.log(`📄 Full Report: ${reportPath}`);

  console.log('\n🎯 RECOMMENDATIONS:');
  report.recommendations.forEach(rec => console.log(`   ${rec}`));

  return report;
}

async function main() {
  console.log('🏗️  ARCHITECTURE SIMPLIFICATION TEST SUITE');
  console.log('=' .repeat(60));
  console.log('📋 TDD London School - Mock-driven architecture validation');
  console.log('🎯 Goal: Ensure zero-to-one reliability for dual -> single architecture migration\n');

  try {
    const results = [];

    for (const category of testCategories) {
      const result = await runTestCategory(category);
      results.push(result);
    }

    const report = await generateReport(results);

    console.log('\n🎉 Test suite execution complete!');

    // Exit with appropriate code
    process.exit(report.summary.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Test suite execution failed:', error);
    process.exit(1);
  }
}

// Handle CLI arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🏗️  Architecture Simplification Test Suite

Usage: node run-all-tests.js [options]

Options:
  --help, -h     Show this help message
  --category     Run specific category (before|after|migration|regression|performance)
  --verbose      Show detailed output

Examples:
  node run-all-tests.js                    # Run all test categories
  node run-all-tests.js --category before  # Run only BEFORE tests
  node run-all-tests.js --verbose          # Run with detailed output

Test Categories:
  ${testCategories.map(cat => `• ${cat.name}: ${cat.description}`).join('\n  ')}
  `);
  process.exit(0);
}

// Handle specific category execution
const categoryArg = process.argv.find((arg, index) =>
  process.argv[index - 1] === '--category'
);

if (categoryArg) {
  const category = testCategories.find(cat =>
    cat.name.toLowerCase().includes(categoryArg.toLowerCase())
  );

  if (category) {
    console.log(`🎯 Running specific category: ${category.name}\n`);
    runTestCategory(category).then(() => process.exit(0)).catch(() => process.exit(1));
  } else {
    console.error(`❌ Unknown category: ${categoryArg}`);
    console.log('Available categories:', testCategories.map(c => c.name).join(', '));
    process.exit(1);
  }
} else {
  // Run all tests
  main();
}