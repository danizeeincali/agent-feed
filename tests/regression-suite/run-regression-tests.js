#!/usr/bin/env node

/**
 * Regression Test Suite Runner
 * Runs all validation tests and generates comprehensive report
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class RegressionTestRunner {
  constructor() {
    this.results = {
      componentRegistry: { status: 'PENDING', errors: [], details: {} },
      agentPagesE2E: { status: 'PENDING', errors: [], details: {} },
      apiIntegration: { status: 'PENDING', errors: [], details: {} },
      frontendRendering: { status: 'PENDING', errors: [], details: {} },
      buildSystem: { status: 'PENDING', errors: [], details: {} }
    };
    this.startTime = Date.now();
  }

  async runAllTests() {
    console.log('🚀 Starting Regression Test Suite...\n');

    const testSuites = [
      {
        name: 'componentRegistry',
        file: 'component-registry-validation.test.js',
        description: 'Component Registry Validation'
      },
      {
        name: 'apiIntegration',
        file: 'api-integration.test.js', 
        description: 'API Integration Tests'
      },
      {
        name: 'buildSystem',
        file: 'build-system.test.js',
        description: 'Build System Validation'
      },
      {
        name: 'agentPagesE2E',
        file: 'agent-pages-e2e.test.js',
        description: 'Agent Pages E2E Tests'
      },
      {
        name: 'frontendRendering',
        file: 'frontend-rendering.test.js',
        description: 'Frontend Rendering Tests'
      }
    ];

    // Run tests in optimal order (build first, then integration, then e2e)
    for (const suite of testSuites) {
      console.log(`\n📋 Running ${suite.description}...`);
      await this.runTestSuite(suite.name, suite.file, suite.description);
    }

    this.generateReport();
    this.printSummary();
  }

  async runTestSuite(name, file, description) {
    const testPath = path.join(__dirname, file);
    
    if (!fs.existsSync(testPath)) {
      this.results[name] = {
        status: 'SKIPPED',
        errors: [`Test file not found: ${file}`],
        details: { duration: 0 }
      };
      return;
    }

    const startTime = Date.now();
    
    try {
      const result = await this.executeJestTest(testPath);
      const duration = Date.now() - startTime;
      
      this.results[name] = {
        status: result.success ? 'PASS' : 'FAIL',
        errors: result.errors,
        details: {
          duration,
          tests: result.tests,
          passes: result.passes,
          failures: result.failures,
          output: result.output
        }
      };

      if (result.success) {
        console.log(`✅ ${description} - PASSED (${duration}ms)`);
      } else {
        console.log(`❌ ${description} - FAILED (${duration}ms)`);
        console.log(`   Errors: ${result.errors.join(', ')}`);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results[name] = {
        status: 'ERROR',
        errors: [error.message],
        details: { duration, error: error.stack }
      };
      
      console.log(`💥 ${description} - ERROR (${duration}ms)`);
      console.log(`   ${error.message}`);
    }
  }

  async executeJestTest(testPath) {
    return new Promise((resolve) => {
      const jestArgs = [
        '--testPathPattern', testPath,
        '--verbose',
        '--no-coverage',
        '--detectOpenHandles',
        '--forceExit'
      ];

      const jestProcess = spawn('npx', ['jest', ...jestArgs], {
        cwd: path.resolve(__dirname, '../../'),
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';
      let testResults = {
        tests: 0,
        passes: 0, 
        failures: 0,
        errors: []
      };

      jestProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        
        // Parse Jest output
        const testMatch = output.match(/(\d+) passed|(\d+) failed|Tests:\s+(\d+) failed, (\d+) passed/);
        if (testMatch) {
          testResults.passes = parseInt(testMatch[1] || testMatch[4] || '0');
          testResults.failures = parseInt(testMatch[2] || testMatch[3] || '0');
          testResults.tests = testResults.passes + testResults.failures;
        }

        // Capture errors
        const errorLines = output.split('\n').filter(line => 
          line.includes('FAIL') || 
          line.includes('Error:') ||
          line.includes('✕')
        );
        testResults.errors.push(...errorLines);
      });

      jestProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      jestProcess.on('close', (code) => {
        resolve({
          success: code === 0,
          tests: testResults.tests,
          passes: testResults.passes,
          failures: testResults.failures,
          errors: testResults.errors.filter(e => e.trim().length > 0),
          output: stdout + stderr
        });
      });
    });
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration,
      summary: this.generateSummary(),
      results: this.results
    };

    const reportPath = path.join(__dirname, '../reports/regression-test-report.json');
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Detailed report saved to: ${reportPath}`);
  }

  generateSummary() {
    const tests = Object.values(this.results);
    const summary = {
      total: tests.length,
      passed: tests.filter(t => t.status === 'PASS').length,
      failed: tests.filter(t => t.status === 'FAIL').length,
      errors: tests.filter(t => t.status === 'ERROR').length,
      skipped: tests.filter(t => t.status === 'SKIPPED').length
    };

    summary.successRate = ((summary.passed / summary.total) * 100).toFixed(1);
    return summary;
  }

  printSummary() {
    const summary = this.generateSummary();
    const totalDuration = Date.now() - this.startTime;

    console.log('\n' + '='.repeat(60));
    console.log('🎯 REGRESSION TEST SUITE RESULTS');
    console.log('='.repeat(60));
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Tests: ${summary.total}`);
    console.log(`   ✅ Passed: ${summary.passed}`);
    console.log(`   ❌ Failed: ${summary.failed}`);
    console.log(`   💥 Errors: ${summary.errors}`);
    console.log(`   ⏭️  Skipped: ${summary.skipped}`);
    console.log(`   📈 Success Rate: ${summary.successRate}%`);
    console.log(`   ⏱️  Total Duration: ${(totalDuration/1000).toFixed(1)}s`);

    console.log(`\n📋 DETAILED RESULTS:`);
    
    Object.entries(this.results).forEach(([name, result]) => {
      const icon = this.getStatusIcon(result.status);
      const duration = result.details?.duration ? `${result.details.duration}ms` : 'N/A';
      
      console.log(`   ${icon} ${this.getTestName(name)}: ${result.status} (${duration})`);
      
      if (result.errors.length > 0) {
        result.errors.slice(0, 2).forEach(error => {
          console.log(`      ⚠️  ${error.substring(0, 80)}${error.length > 80 ? '...' : ''}`);
        });
        if (result.errors.length > 2) {
          console.log(`      ... ${result.errors.length - 2} more errors`);
        }
      }
    });

    // Final recommendations
    console.log(`\n🎯 RECOMMENDATIONS:`);
    
    const failedTests = Object.entries(this.results)
      .filter(([name, result]) => result.status === 'FAIL' || result.status === 'ERROR');

    if (failedTests.length === 0) {
      console.log('   ✅ All tests passed! System is ready for production.');
    } else {
      console.log('   ❌ Failed tests need attention before production deployment:');
      failedTests.forEach(([name, result]) => {
        console.log(`      - Fix ${this.getTestName(name)}`);
      });
    }

    // Critical areas check
    console.log('\n🔍 CRITICAL AREAS STATUS:');
    console.log(`   Build System: ${this.results.buildSystem.status}`);
    console.log(`   API Integration: ${this.results.apiIntegration.status}`);
    console.log(`   Component Registry: ${this.results.componentRegistry.status}`);
    console.log(`   Frontend Rendering: ${this.results.frontendRendering.status}`);
    console.log(`   E2E Agent Pages: ${this.results.agentPagesE2E.status}`);
    
    console.log('\n' + '='.repeat(60));
    
    // Exit with proper code
    const hasFailures = summary.failed > 0 || summary.errors > 0;
    process.exit(hasFailures ? 1 : 0);
  }

  getStatusIcon(status) {
    switch (status) {
      case 'PASS': return '✅';
      case 'FAIL': return '❌';
      case 'ERROR': return '💥';
      case 'SKIPPED': return '⏭️';
      default: return '⏸️';
    }
  }

  getTestName(name) {
    const names = {
      componentRegistry: 'Component Registry',
      agentPagesE2E: 'Agent Pages E2E',
      apiIntegration: 'API Integration',
      frontendRendering: 'Frontend Rendering',
      buildSystem: 'Build System'
    };
    return names[name] || name;
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new RegressionTestRunner();
  runner.runAllTests().catch(error => {
    console.error('Fatal error running regression tests:', error);
    process.exit(1);
  });
}

module.exports = RegressionTestRunner;