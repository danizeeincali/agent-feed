/**
 * London School TDD Test Runner
 * Orchestrates complete test suite execution with coverage analysis
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class LondonSchoolTestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      e2e: null,
      regression: null,
      contracts: null,
      coordination: null
    };
    this.coverage = null;
    this.startTime = Date.now();
  }

  async runTestSuite() {
    console.log('🧪 Starting London School TDD Test Suite...\n');

    try {
      // Run test categories in parallel for efficiency
      await this.runParallelTests();
      
      // Generate comprehensive coverage report
      await this.generateCoverageReport();
      
      // Analyze results and provide recommendations
      this.analyzeResults();
      
      console.log('\n✅ London School TDD Test Suite Complete!');
      console.log(`Total execution time: ${((Date.now() - this.startTime) / 1000).toFixed(2)}s`);
      
    } catch (error) {
      console.error('❌ Test suite execution failed:', error.message);
      process.exit(1);
    }
  }

  async runParallelTests() {
    console.log('🔄 Running test categories in parallel...\n');

    const testCommands = [
      { name: 'unit', cmd: 'vitest run unit --config vitest.config.ts --reporter=json' },
      { name: 'integration', cmd: 'vitest run integration --config vitest.config.ts --reporter=json' },
      { name: 'e2e', cmd: 'vitest run e2e --config vitest.config.ts --reporter=json' },
      { name: 'regression', cmd: 'vitest run regression --config vitest.config.ts --reporter=json' },
      { name: 'contracts', cmd: 'vitest run contracts --config vitest.config.ts --reporter=json' },
      { name: 'coordination', cmd: 'vitest run coordination --config vitest.config.ts --reporter=json' }
    ];

    const promises = testCommands.map(({ name, cmd }) => 
      this.runTestCategory(name, cmd)
    );

    await Promise.allSettled(promises);
  }

  runTestCategory(name, command) {
    return new Promise((resolve, reject) => {
      console.log(`📋 Running ${name} tests...`);
      
      const child = spawn('npx', command.split(' '), {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        try {
          const result = JSON.parse(stdout);
          this.results[name] = {
            passed: result.numPassedTests || 0,
            failed: result.numFailedTests || 0,
            total: result.numTotalTests || 0,
            coverage: result.coverageMap || null,
            duration: result.testResults?.reduce((sum, test) => sum + (test.duration || 0), 0) || 0
          };
          
          console.log(`✅ ${name}: ${this.results[name].passed}/${this.results[name].total} passed`);
          resolve();
        } catch (parseError) {
          // Fallback for non-JSON output
          this.results[name] = {
            passed: code === 0 ? 1 : 0,
            failed: code === 0 ? 0 : 1,
            total: 1,
            rawOutput: stdout,
            rawError: stderr
          };
          
          if (code === 0) {
            console.log(`✅ ${name}: completed successfully`);
            resolve();
          } else {
            console.log(`❌ ${name}: failed with code ${code}`);
            resolve(); // Don't reject to allow other tests to continue
          }
        }
      });

      child.on('error', (error) => {
        console.log(`❌ ${name}: execution error - ${error.message}`);
        this.results[name] = { error: error.message };
        resolve(); // Continue with other tests
      });
    });
  }

  async generateCoverageReport() {
    console.log('\n📊 Generating coverage report...');
    
    try {
      execSync('vitest run --coverage --reporter=json > coverage-results.json', {
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      if (fs.existsSync('coverage-results.json')) {
        const coverageData = JSON.parse(fs.readFileSync('coverage-results.json', 'utf8'));
        this.coverage = coverageData.coverageMap || {};
        console.log('✅ Coverage report generated');
      }
    } catch (error) {
      console.log('⚠️ Coverage generation failed:', error.message);
    }
  }

  analyzeResults() {
    console.log('\n📈 Test Results Analysis');
    console.log('========================\n');

    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;

    // Analyze each test category
    Object.entries(this.results).forEach(([category, result]) => {
      if (result && typeof result === 'object' && !result.error) {
        console.log(`${category.toUpperCase()}:`);
        console.log(`  ✅ Passed: ${result.passed}`);
        console.log(`  ❌ Failed: ${result.failed}`);
        console.log(`  📊 Total: ${result.total}`);
        if (result.duration) {
          console.log(`  ⏱️ Duration: ${(result.duration / 1000).toFixed(2)}s`);
        }
        console.log('');

        totalPassed += result.passed;
        totalFailed += result.failed;
        totalTests += result.total;
      } else if (result?.error) {
        console.log(`${category.toUpperCase()}: ❌ Error - ${result.error}\n`);
      }
    });

    // Overall summary
    console.log('OVERALL SUMMARY:');
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)`);

    // Coverage summary
    if (this.coverage) {
      console.log('\n📊 COVERAGE SUMMARY:');
      console.log('(Detailed coverage report available in coverage/ directory)');
    }

    // Recommendations
    this.generateRecommendations();
  }

  generateRecommendations() {
    console.log('\n💡 RECOMMENDATIONS:');
    
    const recommendations = [];

    // Check for failed tests
    const failedCategories = Object.entries(this.results).filter(
      ([, result]) => result && result.failed > 0
    );

    if (failedCategories.length > 0) {
      recommendations.push('🔍 Investigate failed tests in: ' + 
        failedCategories.map(([cat]) => cat).join(', '));
    }

    // Check for missing test categories
    const missingCategories = Object.entries(this.results).filter(
      ([, result]) => !result || result.error
    );

    if (missingCategories.length > 0) {
      recommendations.push('⚠️ Fix test execution issues in: ' + 
        missingCategories.map(([cat]) => cat).join(', '));
    }

    // Performance recommendations
    const slowCategories = Object.entries(this.results).filter(
      ([, result]) => result && result.duration > 10000
    );

    if (slowCategories.length > 0) {
      recommendations.push('⚡ Optimize slow test categories: ' + 
        slowCategories.map(([cat]) => cat).join(', '));
    }

    // General recommendations
    recommendations.push('🧪 Ensure all critical paths have 90%+ coverage');
    recommendations.push('🔄 Run tests in CI/CD pipeline for continuous validation');
    recommendations.push('📋 Review mock contracts for accuracy and completeness');

    recommendations.forEach(rec => console.log(`  ${rec}`));
  }
}

// Main execution
if (require.main === module) {
  const runner = new LondonSchoolTestRunner();
  runner.runTestSuite().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = LondonSchoolTestRunner;