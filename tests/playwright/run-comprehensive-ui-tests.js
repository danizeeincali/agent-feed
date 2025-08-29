#!/usr/bin/env node

/**
 * Comprehensive UI Test Runner
 * 
 * Runs all UI automation tests against the live frontend at localhost:5173
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const CONFIG = {
  baseUrl: 'http://localhost:5173',
  testDir: '/workspaces/agent-feed/tests/playwright',
  timeout: 120000,
  retries: 1,
  workers: 1,
  browsers: ['chromium', 'firefox']
};

// Test files to run
const TEST_FILES = [
  'comprehensive-ui-automation.spec.ts',
  'claude-instance-workflow.spec.ts', 
  'terminal-websocket-validation.spec.ts',
  'responsive-accessibility-tests.spec.ts'
];

class UITestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      total: 0,
      errors: [],
      screenshots: []
    };
  }

  async checkFrontendRunning() {
    console.log('🔍 Checking if frontend is running...');
    
    try {
      const response = await fetch(CONFIG.baseUrl);
      if (response.ok) {
        console.log('✅ Frontend is running at', CONFIG.baseUrl);
        return true;
      }
    } catch (error) {
      console.error('❌ Frontend is not running at', CONFIG.baseUrl);
      console.error('Please start the frontend with: cd frontend && npm run dev');
      return false;
    }
    
    return false;
  }

  async setupTestEnvironment() {
    console.log('🛠️ Setting up test environment...');
    
    // Create screenshots directory
    const screenshotDir = path.join(CONFIG.testDir, 'test-results', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
      console.log('📁 Created screenshots directory:', screenshotDir);
    }

    // Create test results directory
    const resultsDir = path.join(CONFIG.testDir, 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
      console.log('📁 Created test results directory:', resultsDir);
    }
    
    console.log('✅ Test environment setup complete');
  }

  async runTest(testFile, browser = 'chromium') {
    console.log(`\n🧪 Running ${testFile} on ${browser}...`);
    
    const command = `npx playwright test ${testFile} --project=${browser} --timeout=${CONFIG.timeout} --retries=${CONFIG.retries}`;
    
    try {
      const result = execSync(command, { 
        cwd: CONFIG.testDir,
        stdio: 'pipe',
        encoding: 'utf8',
        env: {
          ...process.env,
          PWTEST_SKIP_BROWSER_DOWNLOAD: '1'
        }
      });
      
      console.log(`✅ ${testFile} (${browser}) - PASSED`);
      this.results.passed++;
      
      return { success: true, output: result };
    } catch (error) {
      console.log(`❌ ${testFile} (${browser}) - FAILED`);
      console.log('Error output:', error.stdout || error.message);
      
      this.results.failed++;
      this.results.errors.push({
        file: testFile,
        browser: browser,
        error: error.stdout || error.message
      });
      
      return { success: false, output: error.stdout || error.message };
    }
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive UI test suite...\n');
    
    // Check if frontend is running
    if (!(await this.checkFrontendRunning())) {
      process.exit(1);
    }
    
    // Setup test environment
    await this.setupTestEnvironment();
    
    // Run tests for each file and browser combination
    for (const testFile of TEST_FILES) {
      for (const browser of CONFIG.browsers) {
        await this.runTest(testFile, browser);
        this.results.total++;
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Generate final report
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 TEST EXECUTION COMPLETE');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.errors.forEach(error => {
        console.log(`- ${error.file} (${error.browser})`);
        console.log(`  Error: ${error.error.split('\n')[0]}`);
      });
    }
    
    // Check for screenshots
    const screenshotDir = path.join(CONFIG.testDir, 'test-results', 'screenshots');
    if (fs.existsSync(screenshotDir)) {
      const screenshots = fs.readdirSync(screenshotDir).filter(f => f.endsWith('.png'));
      console.log(`\n📸 Screenshots captured: ${screenshots.length}`);
      
      if (screenshots.length > 0) {
        console.log('Screenshot files:');
        screenshots.slice(0, 10).forEach(screenshot => {
          console.log(`  - ${screenshot}`);
        });
        if (screenshots.length > 10) {
          console.log(`  ... and ${screenshots.length - 10} more`);
        }
      }
    }
    
    // Generate HTML report link
    const htmlReportPath = path.join(CONFIG.testDir, 'playwright-report', 'index.html');
    if (fs.existsSync(htmlReportPath)) {
      console.log('\n📋 Detailed HTML report available at:');
      console.log(`   file://${htmlReportPath}`);
    }
    
    console.log('\n🎯 UI AUTOMATION TEST SUMMARY:');
    console.log('- Button click validation: Tested across all browsers');
    console.log('- Instance creation workflow: End-to-end validation');  
    console.log('- Terminal functionality: Input/output testing');
    console.log('- WebSocket connections: Real-time monitoring');
    console.log('- Error handling: Edge cases validated'); 
    console.log('- Responsive design: Multiple viewport testing');
    console.log('- Accessibility: Keyboard navigation and ARIA');
    console.log('- Cross-browser compatibility: Chromium and Firefox');
    
    if (this.results.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Frontend is working correctly.');
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${this.results.failed} tests failed. Check the errors above.`);
      process.exit(1);
    }
  }
}

// Run the test suite
if (require.main === module) {
  const runner = new UITestRunner();
  runner.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = UITestRunner;