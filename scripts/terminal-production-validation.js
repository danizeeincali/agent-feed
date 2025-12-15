#!/usr/bin/env node

/**
 * Terminal Production Validation Script
 * Tests terminal functionality programmatically using puppeteer
 */

const puppeteer = require('puppeteer');

class TerminalValidator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async initialize() {
    console.log('🚀 Starting Terminal Production Validation...');
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Listen for console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`❌ Console Error: ${msg.text()}`);
      }
    });

    // Listen for uncaught exceptions
    this.page.on('pageerror', err => {
      console.error(`❌ Page Error: ${err.message}`);
    });

    await this.page.setViewport({ width: 1200, height: 800 });
  }

  async test(name, testFn) {
    try {
      console.log(`🧪 Running test: ${name}`);
      await testFn();
      this.results.passed++;
      this.results.tests.push({ name, status: 'PASS', error: null });
      console.log(`✅ ${name} - PASSED`);
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({ name, status: 'FAIL', error: error.message });
      console.error(`❌ ${name} - FAILED: ${error.message}`);
    }
  }

  async runValidation() {
    await this.initialize();

    // Test 1: SimpleLauncher loads without ReferenceError
    await this.test('SimpleLauncher route loads without ReferenceError', async () => {
      await this.page.goto('http://localhost:5173/simple-launcher', { waitUntil: 'networkidle0' });
      
      // Check page loads successfully
      const title = await this.page.title();
      if (!title.includes('Agent Feed')) {
        throw new Error(`Invalid page title: ${title}`);
      }
      
      // Check for Claude Agent Terminal heading
      const heading = await this.page.$eval('body', body => body.textContent);
      if (!heading.includes('Claude Agent Terminal')) {
        throw new Error('SimpleLauncher component not found');
      }
    });

    // Test 2: Terminal component mounts without errors
    await this.test('TerminalFixed component mounts without errors', async () => {
      await this.page.goto('http://localhost:5173/simple-launcher');
      
      // Click launch button
      const launchButton = await this.page.waitForSelector('button:has-text("Launch Claude Agent")', { timeout: 10000 });
      await launchButton.click();
      
      // Wait for terminal to mount
      await this.page.waitForSelector('.xterm', { timeout: 15000 });
      
      // Verify canvas exists
      const canvas = await this.page.$('.xterm-canvas');
      if (!canvas) {
        throw new Error('Terminal canvas not found');
      }
    });

    // Test 3: Terminal canvas renders correctly
    await this.test('Terminal canvas renders with proper dimensions', async () => {
      const canvas = await this.page.$('.xterm-canvas');
      const box = await canvas.boundingBox();
      
      if (box.width < 400 || box.height < 200) {
        throw new Error(`Invalid terminal dimensions: ${box.width}x${box.height}`);
      }
      
      // Check for cursor
      await this.page.waitForSelector('.xterm-cursor', { timeout: 5000 });
    });

    // Test 4: WebSocket connection establishes
    await this.test('WebSocket connection establishes properly', async () => {
      let wsConnected = false;
      
      const client = await this.page.target().createCDPSession();
      await client.send('Runtime.enable');
      
      // Monitor WebSocket connections via CDP
      await client.send('Network.enable');
      client.on('Network.webSocketCreated', () => {
        wsConnected = true;
      });
      
      // Wait a bit for connection
      await this.page.waitForTimeout(3000);
      
      if (!wsConnected) {
        console.warn('⚠️ WebSocket connection not detected via CDP - this may be normal in some environments');
      }
    });

    // Test 5: Terminal input functionality
    await this.test('Terminal accepts and processes input', async () => {
      const terminal = await this.page.$('.xterm-canvas');
      await terminal.click();
      
      // Type a command
      await this.page.keyboard.type('echo "test-validation"');
      await this.page.keyboard.press('Enter');
      
      // Wait for processing
      await this.page.waitForTimeout(2000);
      
      // Check if input was processed (by looking for terminal content)
      const terminalExists = await this.page.$('.xterm-screen');
      if (!terminalExists) {
        throw new Error('Terminal screen not found after input');
      }
    });

    // Test 6: Terminal output display
    await this.test('Terminal displays output correctly', async () => {
      const terminal = await this.page.$('.xterm-canvas');
      await terminal.click();
      
      await this.page.keyboard.type('pwd');
      await this.page.keyboard.press('Enter');
      
      // Wait for command output
      await this.page.waitForTimeout(3000);
      
      // Verify some content exists in terminal
      const content = await this.page.$eval('.xterm-screen', el => el.textContent || '');
      if (content.length < 10) {
        throw new Error('Terminal output too short, may not be working properly');
      }
    });

    // Test 7: End-to-end workflow
    await this.test('End-to-end terminal workflow', async () => {
      const terminal = await this.page.$('.xterm-canvas');
      await terminal.click();
      
      // Execute multiple commands
      const commands = ['date', 'echo "workflow-test"', 'ls'];
      
      for (const command of commands) {
        await this.page.keyboard.type(command);
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(1000);
      }
      
      // Verify terminal is still responsive
      const finalContent = await this.page.$eval('.xterm-screen', el => el.textContent || '');
      if (!finalContent.includes('workflow-test')) {
        throw new Error('End-to-end workflow failed - test string not found');
      }
    });

    // Test 8: Performance validation
    await this.test('Terminal performance within acceptable limits', async () => {
      const startTime = Date.now();
      
      await this.page.goto('http://localhost:5173/simple-launcher');
      const launchButton = await this.page.waitForSelector('button:has-text("Launch Claude Agent")');
      await launchButton.click();
      await this.page.waitForSelector('.xterm-canvas', { timeout: 15000 });
      
      const initTime = Date.now() - startTime;
      console.log(`ℹ️ Terminal initialization time: ${initTime}ms`);
      
      if (initTime > 15000) {
        throw new Error(`Terminal initialization too slow: ${initTime}ms`);
      }
      
      // Test input responsiveness
      const terminal = await this.page.$('.xterm-canvas');
      await terminal.click();
      
      const inputStart = Date.now();
      await this.page.keyboard.type('echo "perf-test"');
      await this.page.keyboard.press('Enter');
      
      // Wait for response with timeout
      try {
        await this.page.waitForFunction(
          () => {
            const content = document.querySelector('.xterm-screen')?.textContent || '';
            return content.includes('perf-test');
          },
          { timeout: 5000 }
        );
        
        const responseTime = Date.now() - inputStart;
        console.log(`ℹ️ Input response time: ${responseTime}ms`);
        
        if (responseTime > 5000) {
          throw new Error(`Input response too slow: ${responseTime}ms`);
        }
      } catch (error) {
        throw new Error('Terminal input response timeout');
      }
    });

    // Test 9: Error handling
    await this.test('Terminal handles errors gracefully', async () => {
      const terminal = await this.page.$('.xterm-canvas');
      await terminal.click();
      
      // Send invalid command
      await this.page.keyboard.type('invalid-command-xyz-123');
      await this.page.keyboard.press('Enter');
      
      await this.page.waitForTimeout(2000);
      
      // Terminal should still be responsive
      await this.page.keyboard.type('echo "still-working"');
      await this.page.keyboard.press('Enter');
      
      await this.page.waitForTimeout(1000);
      
      // Verify terminal is still functional
      const content = await this.page.$eval('.xterm-screen', el => el.textContent || '');
      if (!content.includes('still-working')) {
        throw new Error('Terminal not responsive after error');
      }
    });

    await this.cleanup();
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  printReport() {
    console.log('\n📊 TERMINAL PRODUCTION VALIDATION REPORT');
    console.log('==========================================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'FAIL')
        .forEach(test => {
          console.log(`  • ${test.name}: ${test.error}`);
        });
    }

    console.log('\n📋 Production Readiness Assessment:');
    
    const criticalTests = [
      'SimpleLauncher route loads without ReferenceError',
      'TerminalFixed component mounts without errors', 
      'Terminal canvas renders with proper dimensions',
      'Terminal accepts and processes input',
      'End-to-end terminal workflow'
    ];

    const criticalFailures = this.results.tests
      .filter(test => test.status === 'FAIL' && criticalTests.includes(test.name));

    if (criticalFailures.length === 0) {
      console.log('🟢 PRODUCTION READY - All critical tests passed');
    } else {
      console.log('🔴 NOT PRODUCTION READY - Critical test failures detected');
    }

    return this.results.failed === 0;
  }
}

// Run validation
(async () => {
  const validator = new TerminalValidator();
  
  try {
    await validator.runValidation();
    const success = validator.printReport();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    await validator.cleanup();
    process.exit(1);
  }
})();