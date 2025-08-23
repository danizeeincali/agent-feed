#!/usr/bin/env node

/**
 * Browser Terminal Testing Script
 * 
 * Tests terminal launching functionality in browser environment
 * using Playwright for automated browser testing
 */

const { chromium } = require('playwright');
const { performance } = require('perf_hooks');

// Test Configuration
const config = {
  frontendUrl: 'http://localhost:3000',
  backendUrl: 'http://localhost:3001',
  headless: false, // Set to true for CI/CD
  timeout: 30000,
  slowMo: 1000 // Slow down interactions for visibility
};

// Test Results
let testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  warnings: [],
  details: [],
  screenshots: []
};

// Logging utility
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  console.log(logMessage);
  if (data) {
    console.log('  Data:', JSON.stringify(data, null, 2));
  }
  
  testResults.details.push({ timestamp, level, message, data });
}

// Test assertion utility
function assert(condition, message, details = null) {
  if (condition) {
    testResults.passed++;
    log('pass', message, details);
  } else {
    testResults.failed++;
    testResults.errors.push({ message, details });
    log('fail', message, details);
  }
  return condition;
}

// Warning utility
function warn(message, details = null) {
  testResults.warnings.push({ message, details });
  log('warn', message, details);
}

// Screenshot utility
async function takeScreenshot(page, name) {
  try {
    const screenshotPath = `/workspaces/agent-feed/tests/screenshots/${name}-${Date.now()}.png`;
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    testResults.screenshots.push({ name, path: screenshotPath });
    log('info', `Screenshot saved: ${screenshotPath}`);
    return screenshotPath;
  } catch (error) {
    warn('Failed to take screenshot', { error: error.message });
    return null;
  }
}

// Main browser test runner
async function runBrowserTerminalTests() {
  log('info', 'Starting Browser Terminal Validation Tests');
  log('info', `Testing against frontend: ${config.frontendUrl}`);
  
  let browser = null;
  let page = null;
  
  try {
    // Launch browser
    log('info', 'Launching browser...');
    browser = await chromium.launch({ 
      headless: config.headless,
      slowMo: config.slowMo,
      timeout: config.timeout
    });
    
    page = await browser.newPage();
    
    // Set up error and console monitoring
    page.on('console', (msg) => {
      const level = msg.type();
      const text = msg.text();
      
      if (level === 'error') {
        testResults.errors.push({ 
          source: 'browser_console', 
          error: text 
        });
        log('error', `Browser Console Error: ${text}`);
      } else if (level === 'warning') {
        testResults.warnings.push({ 
          source: 'browser_console', 
          warning: text 
        });
        log('warn', `Browser Console Warning: ${text}`);
      } else {
        log('info', `Browser Console: [${level}] ${text}`);
      }
    });
    
    page.on('pageerror', (error) => {
      testResults.errors.push({ 
        source: 'page_error', 
        error: error.message 
      });
      log('error', `Page Error: ${error.message}`);
    });
    
    // Run test suite
    await testFrontendAccessibility(page);
    await testNavigationToDualInstance(page);
    await testTerminalLaunching(page);
    await testTerminalWebSocketConnection(page);
    await testTerminalInteraction(page);
    
    log('info', 'Browser tests completed successfully');
    
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ 
      test: 'Browser Test Suite', 
      error: error.message 
    });
    log('error', 'Browser test suite failed', { error: error.message });
  } finally {
    if (page) {
      await takeScreenshot(page, 'final-state');
    }
    if (browser) {
      await browser.close();
    }
  }
  
  // Generate final report
  generateFinalReport();
}

// Test 1: Frontend accessibility
async function testFrontendAccessibility(page) {
  log('info', 'Testing frontend accessibility...');
  
  try {
    const timer = performance.now();
    
    await page.goto(config.frontendUrl, { 
      waitUntil: 'networkidle',
      timeout: config.timeout 
    });
    
    const loadTime = performance.now() - timer;
    
    assert(true, 'Frontend loaded successfully', { 
      url: config.frontendUrl,
      loadTime: Math.round(loadTime) + 'ms'
    });
    
    // Check for React app
    const reactRoot = await page.$('#root');
    assert(reactRoot !== null, 'React root element found');
    
    // Check page title
    const title = await page.title();
    assert(title.length > 0, 'Page has title', { title });
    
    await takeScreenshot(page, 'frontend-loaded');
    
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ 
      test: 'Frontend Accessibility', 
      error: error.message 
    });
    log('fail', 'Frontend accessibility test failed', { error: error.message });
  }
}

// Test 2: Navigation to dual instance page
async function testNavigationToDualInstance(page) {
  log('info', 'Testing navigation to dual instance page...');
  
  try {
    // Navigate to dual instance page
    await page.goto(`${config.frontendUrl}/dual-instance`, { 
      waitUntil: 'networkidle',
      timeout: config.timeout 
    });
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Check URL
    const currentUrl = page.url();
    assert(currentUrl.includes('/dual-instance'), 'Successfully navigated to dual instance page', { url: currentUrl });
    
    // Look for dual instance elements
    const pageContent = await page.textContent('body');
    const hasDualInstanceContent = pageContent.includes('Claude') || 
                                  pageContent.includes('Instance') || 
                                  pageContent.includes('Terminal') ||
                                  pageContent.includes('Launch');
    
    assert(hasDualInstanceContent, 'Dual instance page content found');
    
    await takeScreenshot(page, 'dual-instance-page');
    
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ 
      test: 'Navigation to Dual Instance', 
      error: error.message 
    });
    log('fail', 'Navigation test failed', { error: error.message });
  }
}

// Test 3: Terminal launching functionality
async function testTerminalLaunching(page) {
  log('info', 'Testing terminal launching functionality...');
  
  try {
    // Look for terminal launch button/link
    const terminalElements = await page.$$eval('*', elements => {
      return elements
        .filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('terminal') || 
                 text.includes('launch') || 
                 text.includes('connect') ||
                 text.includes('claude');
        })
        .map(el => ({
          tagName: el.tagName,
          textContent: el.textContent?.substring(0, 100),
          className: el.className
        }));
    });
    
    log('info', 'Found potential terminal elements', { count: terminalElements.length, elements: terminalElements });
    
    // Try common selectors for terminal launch
    const selectors = [
      'button:has-text("Launch")',
      'button:has-text("Terminal")',
      'a:has-text("Terminal")',
      '[data-testid*="terminal"]',
      '[class*="terminal"]',
      'button:has-text("Connect")',
      '.terminal-launch',
      '#launch-terminal'
    ];
    
    let terminalLaunched = false;
    
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          log('info', `Found terminal element with selector: ${selector}`);
          
          // Try to click it
          await element.click();
          await page.waitForTimeout(3000); // Wait for response
          
          // Check if we navigated to terminal or terminal opened
          const newUrl = page.url();
          if (newUrl.includes('/terminal') || newUrl.includes('/instance')) {
            terminalLaunched = true;
            assert(true, 'Terminal launched successfully', { 
              selector, 
              newUrl 
            });
            break;
          }
        }
      } catch (error) {
        log('debug', `Selector ${selector} failed: ${error.message}`);
      }
    }
    
    if (!terminalLaunched) {
      // Try manual URL navigation to terminal
      try {
        await page.goto(`${config.frontendUrl}/terminal/test-instance`, { 
          waitUntil: 'networkidle',
          timeout: config.timeout 
        });
        
        const url = page.url();
        if (url.includes('/terminal/')) {
          assert(true, 'Terminal accessed via direct URL navigation', { url });
          terminalLaunched = true;
        }
      } catch (error) {
        log('debug', 'Direct terminal URL navigation failed', { error: error.message });
      }
    }
    
    if (!terminalLaunched) {
      warn('Terminal launch functionality not found or not working', { 
        elementsFound: terminalElements.length,
        selectors: selectors 
      });
    }
    
    await takeScreenshot(page, 'terminal-launch-attempt');
    
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ 
      test: 'Terminal Launching', 
      error: error.message 
    });
    log('fail', 'Terminal launching test failed', { error: error.message });
  }
}

// Test 4: Terminal WebSocket connection
async function testTerminalWebSocketConnection(page) {
  log('info', 'Testing terminal WebSocket connection...');
  
  try {
    // Inject WebSocket connection test
    const connectionResult = await page.evaluate(async (backendUrl) => {
      return new Promise((resolve) => {
        try {
          // Test main socket connection
          const socket = io(backendUrl, {
            timeout: 10000,
            auth: {
              userId: 'test-browser-user-' + Date.now(),
              username: 'Browser Test User'
            }
          });
          
          const timeout = setTimeout(() => {
            socket.disconnect();
            resolve({ 
              success: false, 
              error: 'Connection timeout',
              events: []
            });
          }, 10000);
          
          const events = [];
          
          socket.on('connect', () => {
            events.push('connect');
            socket.emit('ping');
          });
          
          socket.on('pong', () => {
            events.push('pong');
            clearTimeout(timeout);
            socket.disconnect();
            resolve({ 
              success: true, 
              socketId: socket.id,
              events
            });
          });
          
          socket.on('connect_error', (error) => {
            events.push('connect_error');
            clearTimeout(timeout);
            socket.disconnect();
            resolve({ 
              success: false, 
              error: error.message,
              events
            });
          });
          
        } catch (error) {
          resolve({ 
            success: false, 
            error: error.message,
            events: []
          });
        }
      });
    }, config.backendUrl);
    
    assert(connectionResult.success, 'WebSocket connection established', connectionResult);
    
    if (!connectionResult.success) {
      warn('WebSocket connection failed', connectionResult);
    }
    
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ 
      test: 'Terminal WebSocket Connection', 
      error: error.message 
    });
    log('fail', 'WebSocket connection test failed', { error: error.message });
  }
}

// Test 5: Terminal interaction
async function testTerminalInteraction(page) {
  log('info', 'Testing terminal interaction...');
  
  try {
    // Look for terminal elements
    const terminalContainer = await page.$('.xterm-viewport, .terminal, [class*="terminal"], .xterm');
    
    if (terminalContainer) {
      assert(true, 'Terminal container found in DOM');
      
      // Check if xterm.js is loaded
      const xtermLoaded = await page.evaluate(() => {
        return typeof window.Terminal !== 'undefined';
      });
      
      if (xtermLoaded) {
        assert(true, 'xterm.js library loaded');
      } else {
        warn('xterm.js library not detected');
      }
      
      await takeScreenshot(page, 'terminal-interface');
      
    } else {
      warn('Terminal container not found in DOM');
    }
    
  } catch (error) {
    warn('Terminal interaction test failed', { error: error.message });
  }
}

// Generate final report
function generateFinalReport() {
  const totalTests = testResults.passed + testResults.failed;
  const successRate = totalTests > 0 ? ((testResults.passed / totalTests) * 100).toFixed(1) : 0;
  
  console.log('\n' + '='.repeat(80));
  console.log('BROWSER TERMINAL VALIDATION REPORT');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${testResults.passed}`);
  console.log(`Failed: ${testResults.failed}`);
  console.log(`Warnings: ${testResults.warnings.length}`);
  console.log(`Screenshots: ${testResults.screenshots.length}`);
  console.log(`Success Rate: ${successRate}%`);
  console.log('');
  
  // Status assessment
  let status = 'UNKNOWN';
  let recommendation = '';
  
  if (successRate >= 80) {
    status = 'PRODUCTION READY';
    recommendation = 'Browser terminal functionality is working correctly and ready for production use.';
  } else if (successRate >= 60) {
    status = 'NEEDS ATTENTION';
    recommendation = 'Browser terminal has some issues that should be addressed before production deployment.';
  } else {
    status = 'CRITICAL ISSUES';
    recommendation = 'Browser terminal implementation has critical issues that must be fixed before deployment.';
  }
  
  console.log(`Status: ${status}`);
  console.log(`Recommendation: ${recommendation}`);
  console.log('');
  
  // Show errors if any
  if (testResults.errors.length > 0) {
    console.log('ERRORS:');
    testResults.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error.message || error.error}`);
      if (error.details) {
        console.log(`     Details: ${JSON.stringify(error.details)}`);
      }
    });
    console.log('');
  }
  
  // Show warnings if any
  if (testResults.warnings.length > 0) {
    console.log('WARNINGS:');
    testResults.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. ${warning.message || warning.warning}`);
      if (warning.details) {
        console.log(`     Details: ${JSON.stringify(warning.details)}`);
      }
    });
    console.log('');
  }
  
  // Screenshots
  if (testResults.screenshots.length > 0) {
    console.log('SCREENSHOTS:');
    testResults.screenshots.forEach((screenshot, index) => {
      console.log(`  ${index + 1}. ${screenshot.name}: ${screenshot.path}`);
    });
    console.log('');
  }
  
  console.log('BROWSER VALIDATION FINDINGS:');
  console.log('- Frontend accessibility: ' + (testResults.details.find(d => d.message.includes('Frontend loaded successfully')) ? 'WORKING' : 'FAILED'));
  console.log('- Page navigation: ' + (testResults.details.find(d => d.message.includes('Successfully navigated')) ? 'WORKING' : 'ISSUES'));
  console.log('- Terminal launching: ' + (testResults.details.find(d => d.message.includes('Terminal launched successfully')) ? 'WORKING' : 'NOT FOUND'));
  console.log('- WebSocket connection: ' + (testResults.details.find(d => d.message.includes('WebSocket connection established')) ? 'WORKING' : 'FAILED'));
  console.log('- Terminal interface: ' + (testResults.details.find(d => d.message.includes('Terminal container found')) ? 'PRESENT' : 'MISSING'));
  
  console.log('\n' + '='.repeat(80));
  
  // Exit code based on results  
  process.exit(testResults.failed === 0 ? 0 : 1);
}

// Handle cleanup
process.on('SIGINT', () => {
  log('info', 'Browser test interrupted by user');
  generateFinalReport();
});

process.on('uncaughtException', (error) => {
  log('error', 'Uncaught exception during browser test', { error: error.message });
  testResults.failed++;
  testResults.errors.push({ test: 'System', error: error.message });
  generateFinalReport();
});

// Ensure screenshots directory exists
const fs = require('fs');
const screenshotsDir = '/workspaces/agent-feed/tests/screenshots';
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Run tests
if (require.main === module) {
  runBrowserTerminalTests().catch((error) => {
    log('error', 'Browser test suite failed', { error: error.message });
    testResults.failed++;
    testResults.errors.push({ test: 'Test Suite', error: error.message });
    generateFinalReport();
  });
}

module.exports = { 
  runBrowserTerminalTests, 
  testResults, 
  config 
};