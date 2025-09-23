// Playwright Console and Network Error Capture Script
// Run with: npx playwright test debug-scripts/playwright-console-capture.js

const { test, expect } = require('@playwright/test');

test('React White Screen Debug - Console and Network Capture', async ({ page }) => {
  // Arrays to store captured data
  const consoleMessages = [];
  const networkFailures = [];
  const jsErrors = [];

  // Capture all console messages
  page.on('console', msg => {
    const logEntry = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
      timestamp: new Date().toISOString()
    };
    
    consoleMessages.push(logEntry);
    
    // Log errors and warnings immediately
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`❌ Console ${msg.type()}: ${msg.text()}`);
      if (msg.location()) {
        console.log(`   📍 Location: ${msg.location().url}:${msg.location().lineNumber}`);
      }
    }
  });

  // Capture JavaScript errors
  page.on('pageerror', error => {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    jsErrors.push(errorInfo);
    console.log(`🚨 JavaScript Error: ${error.message}`);
    console.log(`   📚 Stack: ${error.stack?.split('\n')[0] || 'No stack trace'}`);
  });

  // Capture network failures
  page.on('response', response => {
    if (!response.ok()) {
      const failureInfo = {
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        timestamp: new Date().toISOString()
      };
      
      networkFailures.push(failureInfo);
      console.log(`🌐 Network Failure: ${response.status()} ${response.statusText()}`);
      console.log(`   🔗 URL: ${response.url()}`);
    }
  });

  // Capture failed requests
  page.on('requestfailed', request => {
    console.log(`❌ Request Failed: ${request.url()}`);
    console.log(`   💥 Failure: ${request.failure()?.errorText || 'Unknown error'}`);
    
    networkFailures.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText,
      timestamp: new Date().toISOString()
    });
  });

  try {
    // Navigate to the problematic page
    console.log('🚀 Starting navigation to localhost:3000...');
    
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait a moment for any delayed JavaScript execution
    await page.waitForTimeout(3000);

    // Check if React app mounted
    const rootElement = await page.locator('#root').first();
    const rootContent = await rootElement.innerHTML().catch(() => '');
    
    console.log('\n📊 ANALYSIS RESULTS:');
    console.log('='.repeat(50));
    
    console.log(`\n🎯 Root Element Content Length: ${rootContent.length} characters`);
    if (rootContent.length === 0) {
      console.log('❌ React app NOT mounted - root element is empty');
    } else if (rootContent.length < 100) {
      console.log('⚠️  React app may be partially mounted');
      console.log(`   Content preview: ${rootContent.substring(0, 100)}...`);
    } else {
      console.log('✅ React app appears to be mounted');
    }

    // Check for specific React patterns
    const hasReactContent = await page.locator('div[data-reactroot], [data-react-helmet]').count();
    console.log(`\n⚛️  React-specific elements found: ${hasReactContent}`);

    // Check if main JavaScript files loaded
    const scriptTags = await page.locator('script[type="module"]').count();
    console.log(`📜 Module scripts loaded: ${scriptTags}`);

    // Summary of issues
    console.log(`\n🔍 ISSUE SUMMARY:`);
    console.log(`   Console Errors: ${consoleMessages.filter(m => m.type === 'error').length}`);
    console.log(`   Console Warnings: ${consoleMessages.filter(m => m.type === 'warning').length}`);
    console.log(`   JavaScript Errors: ${jsErrors.length}`);
    console.log(`   Network Failures: ${networkFailures.length}`);

    // Detailed error analysis
    if (jsErrors.length > 0) {
      console.log('\n🚨 JAVASCRIPT ERRORS DETAILS:');
      jsErrors.forEach((error, index) => {
        console.log(`\n   Error ${index + 1}:`);
        console.log(`     Name: ${error.name}`);
        console.log(`     Message: ${error.message}`);
        if (error.stack) {
          console.log(`     First Stack Line: ${error.stack.split('\n')[1]?.trim() || 'No stack'}`);
        }
      });
    }

    if (networkFailures.length > 0) {
      console.log('\n🌐 NETWORK FAILURES DETAILS:');
      networkFailures.forEach((failure, index) => {
        console.log(`\n   Failure ${index + 1}:`);
        console.log(`     URL: ${failure.url}`);
        console.log(`     Status: ${failure.status || 'Request failed'}`);
        console.log(`     Error: ${failure.failure || failure.statusText || 'Unknown'}`);
      });
    }

    // Get page title and URL for verification
    const title = await page.title();
    const url = page.url();
    console.log(`\n📄 Page Info:`);
    console.log(`   Title: "${title}"`);
    console.log(`   URL: ${url}`);

    // Take screenshot for visual debugging
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/debug-scripts/white-screen-debug.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved to: debug-scripts/white-screen-debug.png');

    // Save detailed logs to file
    const debugData = {
      timestamp: new Date().toISOString(),
      url,
      title,
      rootContentLength: rootContent.length,
      rootContentPreview: rootContent.substring(0, 500),
      reactElementsFound: hasReactContent,
      moduleScriptsCount: scriptTags,
      consoleMessages,
      jsErrors,
      networkFailures
    };

    await page.evaluate((data) => {
      console.log('=== DETAILED DEBUG DATA ===');
      console.log(JSON.stringify(data, null, 2));
    }, debugData);

  } catch (error) {
    console.log(`\n💥 Test execution error: ${error.message}`);
    
    // Still try to capture what we can
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/debug-scripts/error-debug.png' 
    }).catch(() => {});
  }
});

// Additional test for specific Vite dev server checks
test('Vite Dev Server Specific Checks', async ({ page }) => {
  console.log('\n🔧 VITE DEV SERVER DIAGNOSTICS:');
  
  try {
    // Check if Vite client is connecting
    await page.goto('http://localhost:3000');
    
    // Look for Vite HMR connection
    const viteClient = await page.evaluate(() => {
      return window.__vite_plugin_react_preamble_installed__ !== undefined;
    });
    
    console.log(`⚡ Vite React plugin detected: ${viteClient ? 'Yes' : 'No'}`);
    
    // Check for HMR WebSocket connection
    const hmrStatus = await page.evaluate(() => {
      // Check if HMR is working
      return typeof window.__viteHot !== 'undefined';
    });
    
    console.log(`🔥 HMR Status: ${hmrStatus ? 'Connected' : 'Disconnected'}`);
    
    // Check module loading
    const moduleErrors = await page.evaluate(() => {
      const errors = [];
      const scripts = Array.from(document.querySelectorAll('script[type="module"]'));
      
      return {
        moduleScriptsFound: scripts.length,
        modulesSrc: scripts.map(s => s.src || s.innerHTML.substring(0, 100))
      };
    });
    
    console.log(`📦 Module Analysis:`, moduleErrors);
    
  } catch (error) {
    console.log(`❌ Vite diagnostics failed: ${error.message}`);
  }
});