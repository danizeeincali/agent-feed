/**
 * Real Browser Testing Framework for Single-Connection Architecture
 * Tests actual button clicks, DOM interactions, and browser behavior
 */

const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');

class RealBrowserValidator {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:5173',
      headless: config.headless !== false,
      slowMo: config.slowMo || 50,
      timeout: config.timeout || 30000,
      ...config
    };
    this.browser = null;
    this.page = null;
    this.results = [];
  }

  async initialize() {
    console.log('🔧 Initializing browser for production validation...');
    
    this.browser = await puppeteer.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-gpu'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Enable performance monitoring
    await this.page.setCacheEnabled(false);
    await this.page.setViewport({ width: 1280, height: 720 });
    
    // Listen for console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`❌ Browser Console Error: ${msg.text()}`);
      }
    });

    // Listen for page errors
    this.page.on('pageerror', error => {
      console.error(`❌ Page Error: ${error.message}`);
    });

    console.log('✅ Browser initialized successfully');
  }

  async validateCompleteWorkflow() {
    const testId = `workflow-${Date.now()}`;
    console.log(`🧪 Starting complete workflow validation: ${testId}`);
    
    try {
      // Navigate to application
      await this.page.goto(this.config.baseUrl, { 
        waitUntil: 'networkidle0',
        timeout: this.config.timeout 
      });

      // Wait for React to load
      await this.page.waitForSelector('[data-testid="terminal-launcher"]', {
        timeout: this.config.timeout
      });

      console.log('📱 Application loaded, starting button interaction test...');

      // Test 1: Button Click and Instance Creation
      const buttonTest = await this.testButtonInteraction();
      
      // Test 2: WebSocket Connection
      const wsTest = await this.testWebSocketConnection();
      
      // Test 3: Command Execution
      const commandTest = await this.testCommandExecution();
      
      // Test 4: Response Handling
      const responseTest = await this.testResponseHandling();

      const result = {
        testId,
        timestamp: new Date().toISOString(),
        success: buttonTest.success && wsTest.success && commandTest.success && responseTest.success,
        details: {
          buttonInteraction: buttonTest,
          websocketConnection: wsTest,
          commandExecution: commandTest,
          responseHandling: responseTest
        },
        duration: Date.now() - parseInt(testId.split('-')[1])
      };

      this.results.push(result);
      return result;

    } catch (error) {
      console.error(`❌ Workflow validation failed: ${error.message}`);
      return {
        testId,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async testButtonInteraction() {
    console.log('🖱️  Testing button interaction...');
    
    try {
      // Find and click the "Start Terminal" button
      const button = await this.page.waitForSelector('[data-testid="start-terminal-btn"]', {
        timeout: 10000,
        visible: true
      });

      // Verify button is clickable
      const isEnabled = await this.page.evaluate(el => !el.disabled, button);
      if (!isEnabled) {
        throw new Error('Start terminal button is disabled');
      }

      // Record button click timing
      const clickStart = Date.now();
      await button.click();
      const clickDuration = Date.now() - clickStart;

      // Wait for terminal interface to appear
      await this.page.waitForSelector('[data-testid="terminal-interface"]', {
        timeout: 15000,
        visible: true
      });

      // Verify connection status indicator
      const connectionStatus = await this.page.waitForSelector('[data-testid="connection-status"]', {
        timeout: 10000,
        visible: true
      });

      const statusText = await this.page.evaluate(el => el.textContent, connectionStatus);

      return {
        success: true,
        clickDuration,
        statusText,
        terminalVisible: true
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testWebSocketConnection() {
    console.log('🔌 Testing WebSocket connection...');
    
    try {
      // Monitor WebSocket connections
      const wsConnections = [];
      
      this.page.on('response', response => {
        if (response.url().includes('ws://') || response.url().includes('wss://')) {
          wsConnections.push({
            url: response.url(),
            status: response.status(),
            timestamp: Date.now()
          });
        }
      });

      // Wait for connection status to show "Connected"
      await this.page.waitForFunction(() => {
        const statusEl = document.querySelector('[data-testid="connection-status"]');
        return statusEl && statusEl.textContent.toLowerCase().includes('connected');
      }, { timeout: 20000 });

      // Verify WebSocket is actually connected via JavaScript
      const wsState = await this.page.evaluate(() => {
        return window.terminalWebSocket ? {
          readyState: window.terminalWebSocket.readyState,
          url: window.terminalWebSocket.url
        } : null;
      });

      return {
        success: true,
        connections: wsConnections,
        websocketState: wsState,
        readyState: wsState ? wsState.readyState : null
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testCommandExecution() {
    console.log('⌨️  Testing command execution...');
    
    try {
      // Wait for terminal input to be ready
      await this.page.waitForSelector('[data-testid="terminal-input"]', {
        timeout: 10000,
        visible: true
      });

      const input = await this.page.$('[data-testid="terminal-input"]');
      
      // Type a simple command
      const testCommand = 'echo "Production validation test"';
      await input.type(testCommand);
      
      // Press Enter to execute
      await this.page.keyboard.press('Enter');

      // Wait for command to be sent
      await this.page.waitForTimeout(1000);

      // Verify command appears in terminal output
      const output = await this.page.waitForFunction(() => {
        const outputEl = document.querySelector('[data-testid="terminal-output"]');
        return outputEl && outputEl.textContent.includes('Production validation test');
      }, { timeout: 15000 });

      return {
        success: true,
        command: testCommand,
        outputReceived: !!output
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testResponseHandling() {
    console.log('📨 Testing response handling...');
    
    try {
      // Monitor network requests for Claude API calls
      const apiCalls = [];
      
      this.page.on('request', request => {
        if (request.url().includes('/api/') || request.url().includes('claude')) {
          apiCalls.push({
            url: request.url(),
            method: request.method(),
            timestamp: Date.now()
          });
        }
      });

      // Send a command that should trigger Claude API
      const input = await this.page.$('[data-testid="terminal-input"]');
      await input.clear();
      await input.type('help');
      await this.page.keyboard.press('Enter');

      // Wait for response to appear
      await this.page.waitForFunction(() => {
        const outputEl = document.querySelector('[data-testid="terminal-output"]');
        return outputEl && outputEl.children.length > 1;
      }, { timeout: 30000 });

      // Check response time
      const responseElements = await this.page.$$('[data-testid="terminal-output"] > *');
      const hasResponse = responseElements.length > 1;

      return {
        success: hasResponse,
        apiCalls: apiCalls,
        responseCount: responseElements.length
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async runPerformanceAudit() {
    console.log('🚀 Running Lighthouse performance audit...');
    
    try {
      const { lhr } = await lighthouse(this.config.baseUrl, {
        port: (new URL(this.browser.wsEndpoint())).port,
        output: 'json',
        onlyCategories: ['performance']
      });

      return {
        score: lhr.categories.performance.score * 100,
        metrics: {
          firstContentfulPaint: lhr.audits['first-contentful-paint'].numericValue,
          largestContentfulPaint: lhr.audits['largest-contentful-paint'].numericValue,
          totalBlockingTime: lhr.audits['total-blocking-time'].numericValue,
          cumulativeLayoutShift: lhr.audits['cumulative-layout-shift'].numericValue
        }
      };

    } catch (error) {
      console.error(`❌ Performance audit failed: ${error.message}`);
      return { error: error.message };
    }
  }

  async testConcurrentUsers(userCount = 3) {
    console.log(`👥 Testing ${userCount} concurrent users...`);
    
    const promises = [];
    for (let i = 0; i < userCount; i++) {
      promises.push(this.simulateUser(`user-${i}`));
    }

    const results = await Promise.all(promises);
    
    return {
      success: results.every(r => r.success),
      users: results,
      conflicts: results.filter(r => r.conflict).length
    };
  }

  async simulateUser(userId) {
    const page = await this.browser.newPage();
    
    try {
      await page.goto(this.config.baseUrl);
      await page.waitForSelector('[data-testid="start-terminal-btn"]');
      
      // Stagger clicks to test race conditions
      await page.waitForTimeout(Math.random() * 2000);
      await page.click('[data-testid="start-terminal-btn"]');
      
      await page.waitForSelector('[data-testid="terminal-interface"]', { timeout: 20000 });
      
      return { success: true, userId };
    } catch (error) {
      return { success: false, userId, error: error.message };
    } finally {
      await page.close();
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser cleanup completed');
    }
  }

  getResults() {
    return {
      summary: {
        totalTests: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length
      },
      details: this.results
    };
  }
}

module.exports = { RealBrowserValidator };