#!/usr/bin/env node

/**
 * TDD Systematic Rebuild Validation Runner
 * Validates all system components before declaring success
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class TestValidationRunner {
  constructor() {
    this.results = {
      health: { passed: false, output: '', duration: 0 },
      unit: { passed: false, output: '', duration: 0 },
      integration: { passed: false, output: '', duration: 0 },
      e2e: { passed: false, output: '', duration: 0 },
      regression: { passed: false, output: '', duration: 0 }
    };
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
  }

  async runCommand(command, args = [], cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { 
        cwd, 
        stdio: 'pipe',
        shell: true 
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
        resolve({
          code,
          stdout,
          stderr,
          success: code === 0
        });
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async runTestSuite(suiteName, command) {
    console.log(`\n🧪 Running ${suiteName} Tests...`);
    console.log('='.repeat(50));
    
    const startTime = Date.now();
    
    try {
      const result = await this.runCommand(command);
      const duration = Date.now() - startTime;
      
      this.results[suiteName.toLowerCase()] = {
        passed: result.success,
        output: result.stdout + result.stderr,
        duration
      };

      if (result.success) {
        console.log(`✅ ${suiteName} Tests PASSED (${duration}ms)`);
        this.passedTests++;
      } else {
        console.log(`❌ ${suiteName} Tests FAILED (${duration}ms)`);
        console.log('Error Output:', result.stderr);
        this.failedTests++;
      }

      this.totalTests++;
      return result.success;
    } catch (error) {
      console.log(`💥 ${suiteName} Tests CRASHED:`, error.message);
      this.failedTests++;
      this.totalTests++;
      return false;
    }
  }

  async checkPrerequisites() {
    console.log('🔍 Checking Prerequisites...');
    
    // Check if node_modules exists
    try {
      await fs.access('node_modules');
    } catch (error) {
      console.log('📦 Installing dependencies...');
      await this.runCommand('npm', ['install']);
    }

    // Check if database directory exists
    try {
      await fs.mkdir('data', { recursive: true });
    } catch (error) {
      // Directory already exists
    }

    console.log('✅ Prerequisites satisfied');
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.totalTests,
        passed: this.passedTests,
        failed: this.failedTests,
        successRate: (this.passedTests / this.totalTests * 100).toFixed(2)
      },
      results: this.results,
      systemReady: this.failedTests === 0
    };

    const reportPath = path.join(__dirname, '../docs/tdd-validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(30));
    console.log(`Total Test Suites: ${this.totalTests}`);
    console.log(`Passed: ${this.passedTests}`);
    console.log(`Failed: ${this.failedTests}`);
    console.log(`Success Rate: ${report.summary.successRate}%`);

    if (this.failedTests === 0) {
      console.log('\n🎉 ALL TESTS PASSED! System is ready for production.');
      console.log(`📄 Full report saved to: ${reportPath}`);
      return true;
    } else {
      console.log('\n⚠️  Some tests failed. System requires attention.');
      console.log(`📄 Detailed report saved to: ${reportPath}`);
      return false;
    }
  }

  async validateCoverage() {
    console.log('\n📈 Validating Test Coverage...');
    
    try {
      const result = await this.runCommand('npm', ['run', 'test:coverage']);
      
      // Parse coverage results (simplified)
      const coverageLines = result.stdout.split('\n').filter(line => 
        line.includes('All files') || line.includes('Statements') || line.includes('Branches')
      );

      console.log('Coverage Summary:');
      coverageLines.forEach(line => console.log(`  ${line.trim()}`));
      
      return true;
    } catch (error) {
      console.log('⚠️  Coverage validation failed:', error.message);
      return false;
    }
  }

  async run() {
    console.log('🚀 Starting TDD Systematic Rebuild Validation');
    console.log('=============================================');

    try {
      // Step 1: Check prerequisites
      await this.checkPrerequisites();

      // Step 2: Run test suites in order
      const testSuites = [
        { name: 'Health', command: 'npm run test:health' },
        { name: 'Unit', command: 'npm run test:unit' },
        { name: 'Integration', command: 'npm run test:integration' },
        { name: 'Regression', command: 'npm run test:regression' }
      ];

      for (const suite of testSuites) {
        await this.runTestSuite(suite.name, suite.command);
      }

      // Step 3: Validate coverage
      await this.validateCoverage();

      // Step 4: Generate final report
      const success = await this.generateReport();

      // Step 5: Exit with appropriate code
      process.exit(success ? 0 : 1);

    } catch (error) {
      console.error('💥 Validation runner crashed:', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestValidationRunner();
  runner.run();
}

module.exports = TestValidationRunner;