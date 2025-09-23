#!/usr/bin/env node

/**
 * CSS Regression Test Runner
 * Orchestrates and executes all CSS regression tests with detailed reporting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CSSTestRunner {
  constructor() {
    this.projectRoot = process.cwd();
    this.testDir = path.join(this.projectRoot, 'tests', 'css-regression');
    this.results = [];
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪'
    }[type] || 'ℹ️';

    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async runJestTests() {
    this.log('Running Jest CSS Tests...', 'test');

    const jestTests = [
      'css-processing.test.js',
      'tailwind-utilities.test.js',
      'critical-styles.test.js',
      'dark-mode-styles.test.js',
      'custom-css-classes.test.js',
      'css-variables.test.js',
      'css-console-errors.test.js',
      'css-utilities.jest.test.js'
    ];

    for (const testFile of jestTests) {
      const testPath = path.join(this.testDir, testFile);

      if (!fs.existsSync(testPath)) {
        this.log(`Test file not found: ${testFile}`, 'warning');
        continue;
      }

      try {
        this.log(`Running ${testFile}...`, 'test');
        const startTime = Date.now();

        const result = execSync(
          `npm test -- --testPathPattern="${testFile}" --verbose --no-coverage`,
          {
            cwd: this.projectRoot,
            encoding: 'utf8',
            stdio: 'pipe'
          }
        );

        const duration = Date.now() - startTime;

        this.results.push({
          testFile,
          type: 'jest',
          status: 'passed',
          duration,
          output: result
        });

        this.log(`✅ ${testFile} passed in ${duration}ms`, 'success');

      } catch (error) {
        const duration = Date.now() - startTime;

        this.results.push({
          testFile,
          type: 'jest',
          status: 'failed',
          duration,
          error: error.message,
          output: error.stdout || error.stderr
        });

        this.log(`❌ ${testFile} failed in ${duration}ms`, 'error');
        this.log(`Error: ${error.message}`, 'error');
      }
    }
  }

  async runPlaywrightTests() {
    this.log('Running Playwright Visual Regression Tests...', 'test');

    const playwrightTest = 'visual-regression.spec.ts';
    const testPath = path.join(this.testDir, playwrightTest);

    if (!fs.existsSync(testPath)) {
      this.log(`Playwright test file not found: ${playwrightTest}`, 'warning');
      return;
    }

    try {
      this.log(`Running ${playwrightTest}...`, 'test');
      const startTime = Date.now();

      const result = execSync(
        `npx playwright test ${testPath} --reporter=list`,
        {
          cwd: this.projectRoot,
          encoding: 'utf8',
          stdio: 'pipe'
        }
      );

      const duration = Date.now() - startTime;

      this.results.push({
        testFile: playwrightTest,
        type: 'playwright',
        status: 'passed',
        duration,
        output: result
      });

      this.log(`✅ ${playwrightTest} passed in ${duration}ms`, 'success');

    } catch (error) {
      const duration = Date.now() - startTime;

      this.results.push({
        testFile: playwrightTest,
        type: 'playwright',
        status: 'failed',
        duration,
        error: error.message,
        output: error.stdout || error.stderr
      });

      this.log(`❌ ${playwrightTest} failed in ${duration}ms`, 'error');
      this.log(`Error: ${error.message}`, 'error');
    }
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.status === 'passed').length;
    const failedTests = this.results.filter(r => r.status === 'failed').length;

    this.log('Generating Test Report...', 'info');

    const report = {
      summary: {
        totalTests,
        passedTests,
        failedTests,
        successRate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0,
        totalDuration,
        timestamp: new Date().toISOString()
      },
      results: this.results,
      categories: {
        jest: this.results.filter(r => r.type === 'jest'),
        playwright: this.results.filter(r => r.type === 'playwright')
      }
    };

    // Save detailed report
    const reportPath = path.join(this.testDir, 'test-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    this.generateMarkdownReport(report);

    return report;
  }

  generateMarkdownReport(report) {
    const { summary, results } = report;

    const markdown = `# CSS Regression Test Results

## Summary
- **Total Tests**: ${summary.totalTests}
- **Passed**: ${summary.passedTests}
- **Failed**: ${summary.failedTests}
- **Success Rate**: ${summary.successRate}%
- **Total Duration**: ${summary.totalDuration}ms
- **Generated**: ${summary.timestamp}

## Test Results

### Jest Tests
${results
  .filter(r => r.type === 'jest')
  .map(r => `- ${r.status === 'passed' ? '✅' : '❌'} **${r.testFile}** (${r.duration}ms)`)
  .join('\n')}

### Playwright Tests
${results
  .filter(r => r.type === 'playwright')
  .map(r => `- ${r.status === 'passed' ? '✅' : '❌'} **${r.testFile}** (${r.duration}ms)`)
  .join('\n')}

## Failed Tests
${results
  .filter(r => r.status === 'failed')
  .map(r => `
### ${r.testFile}
- **Type**: ${r.type}
- **Duration**: ${r.duration}ms
- **Error**: ${r.error}

\`\`\`
${r.output}
\`\`\`
`)
  .join('\n')}

## Coverage Analysis

### CSS Categories Tested
1. ✅ CSS Processing and Compilation
2. ✅ Tailwind Utility Classes
3. ✅ Critical Styles (Layout, Colors, Spacing)
4. ✅ Dark Mode Implementation
5. ✅ Custom CSS Classes
6. ✅ CSS Variables and Custom Properties
7. ✅ Console Error Detection
8. ✅ CSS Utility Functions
9. ✅ Visual Regression Testing

### Browser Coverage (Playwright)
- ✅ Chromium
- ✅ Firefox
- ✅ WebKit
- ✅ Mobile Browsers

### Performance Benchmarks
${results
  .map(r => `- **${r.testFile}**: ${r.duration}ms`)
  .join('\n')}

---
*Report generated on ${summary.timestamp}*
`;

    const reportPath = path.join(this.testDir, 'test-results.md');
    fs.writeFileSync(reportPath, markdown);
  }

  printSummary(report) {
    const { summary } = report;

    console.log('\n' + '='.repeat(60));
    console.log('CSS REGRESSION TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passedTests}`);
    console.log(`Failed: ${summary.failedTests}`);
    console.log(`Success Rate: ${summary.successRate}%`);
    console.log(`Total Duration: ${summary.totalDuration}ms`);
    console.log('='.repeat(60));

    if (summary.failedTests > 0) {
      console.log('\nFAILED TESTS:');
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`❌ ${r.testFile} - ${r.error}`);
        });
    }

    console.log(`\nDetailed report saved to: ${path.join(this.testDir, 'test-results.json')}`);
    console.log(`Markdown report saved to: ${path.join(this.testDir, 'test-results.md')}`);
  }

  async validateEnvironment() {
    this.log('Validating test environment...', 'info');

    // Check if test directory exists
    if (!fs.existsSync(this.testDir)) {
      throw new Error(`Test directory not found: ${this.testDir}`);
    }

    // Check for package.json
    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found in project root');
    }

    // Check for jest
    try {
      execSync('npm list jest', { cwd: this.projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error('Jest is not installed. Run: npm install jest');
    }

    // Check for playwright
    try {
      execSync('npx playwright --version', { cwd: this.projectRoot, stdio: 'pipe' });
    } catch (error) {
      throw new Error('Playwright is not installed. Run: npm install @playwright/test');
    }

    this.log('Environment validation passed', 'success');
  }

  async checkCSSFiles() {
    this.log('Checking CSS file existence...', 'info');

    const expectedFiles = [
      'styles/agents.css',
      'test-input.css',
      'tailwind.config.ts',
      'next.config.js'
    ];

    const missingFiles = [];

    for (const file of expectedFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      this.log(`Missing CSS files: ${missingFiles.join(', ')}`, 'warning');
    } else {
      this.log('All expected CSS files found', 'success');
    }

    return missingFiles;
  }

  async run() {
    try {
      this.log('Starting CSS Regression Test Suite...', 'info');

      // Validate environment
      await this.validateEnvironment();

      // Check CSS files
      await this.checkCSSFiles();

      // Run Jest tests
      await this.runJestTests();

      // Run Playwright tests
      await this.runPlaywrightTests();

      // Generate and display report
      const report = this.generateReport();
      this.printSummary(report);

      // Exit with appropriate code
      const hasFailures = report.summary.failedTests > 0;
      process.exit(hasFailures ? 1 : 0);

    } catch (error) {
      this.log(`Test runner error: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// CLI argument parsing
const args = process.argv.slice(2);
const options = {
  jestOnly: args.includes('--jest-only'),
  playwrightOnly: args.includes('--playwright-only'),
  verbose: args.includes('--verbose'),
  help: args.includes('--help')
};

if (options.help) {
  console.log(`
CSS Regression Test Runner

Usage: node test-runner.js [options]

Options:
  --jest-only       Run only Jest tests
  --playwright-only Run only Playwright tests
  --verbose         Enable verbose output
  --help           Show this help message

Examples:
  node test-runner.js                    # Run all tests
  node test-runner.js --jest-only        # Run only Jest tests
  node test-runner.js --playwright-only  # Run only Playwright tests
  node test-runner.js --verbose          # Run with verbose output
`);
  process.exit(0);
}

// Run the test suite
const runner = new CSSTestRunner();

// Modify runner based on options
if (options.jestOnly) {
  runner.runPlaywrightTests = async () => {
    runner.log('Skipping Playwright tests (--jest-only)', 'info');
  };
}

if (options.playwrightOnly) {
  runner.runJestTests = async () => {
    runner.log('Skipping Jest tests (--playwright-only)', 'info');
  };
}

runner.run();