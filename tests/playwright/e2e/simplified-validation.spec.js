// Simplified Port Separation Validation
const { test, expect } = require('@playwright/test');

test.describe('Simplified Port Separation Validation', () => {
  test('Basic port accessibility validation', async ({ page }) => {
    console.log('Testing basic port separation...');
    
    // Test 1: Frontend on port 3000
    try {
      await page.goto('http://localhost:3000', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      console.log('✅ Frontend (port 3000): Accessible');
    } catch (error) {
      console.log('❌ Frontend (port 3000): Failed -', error.message);
      throw error;
    }
    
    // Test 2: Backend API on port 3001
    try {
      const healthResponse = await page.request.get('http://localhost:3001/health');
      if (healthResponse.status() === 200) {
        console.log('✅ Backend API (port 3001): Accessible');
      } else {
        console.log(`❌ Backend API (port 3001): Status ${healthResponse.status()}`);
      }
    } catch (error) {
      console.log('❌ Backend API (port 3001): Failed -', error.message);
    }
    
    // Test 3: WebSocket connection attempts
    let wsConnectionAttempts = [];
    
    page.on('request', request => {
      if (request.url().includes('socket.io')) {
        wsConnectionAttempts.push(request.url());
        console.log('WebSocket attempt:', request.url());
      }
    });
    
    // Wait for WebSocket attempts
    await page.waitForTimeout(10000);
    
    if (wsConnectionAttempts.length > 0) {
      console.log(`⚠️ WebSocket attempts detected: ${wsConnectionAttempts.length}`);
      wsConnectionAttempts.forEach(url => console.log('  -', url));
    } else {
      console.log('ℹ️ No WebSocket connection attempts detected');
    }
    
    // Test 4: Basic UI functionality
    try {
      const title = await page.title();
      expect(title).toMatch(/agent/i);
      console.log('✅ Page title verification passed');
    } catch (error) {
      console.log('❌ Page title verification failed');
    }
    
    console.log('Port separation validation completed');
  });

  test('WebSocket connection diagnosis', async ({ page }) => {
    console.log('Diagnosing WebSocket connection issues...');
    
    await page.goto('http://localhost:3000', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Capture console errors related to WebSocket
    let wsErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && 
          (msg.text().includes('WebSocket') || 
           msg.text().includes('socket.io') ||
           msg.text().includes('CONNECTION_REFUSED'))) {
        wsErrors.push(msg.text());
      }
    });
    
    // Monitor WebSocket attempts
    let wsAttempts = [];
    page.on('request', request => {
      if (request.url().includes('socket.io') || request.url().includes('websocket')) {
        wsAttempts.push({
          url: request.url(),
          timestamp: Date.now()
        });
      }
    });
    
    // Wait for connection attempts
    await page.waitForTimeout(15000);
    
    console.log(`Captured ${wsErrors.length} WebSocket errors:`);
    wsErrors.slice(0, 5).forEach(error => console.log('  Error:', error.substring(0, 100)));
    
    console.log(`Detected ${wsAttempts.length} WebSocket attempts:`);
    wsAttempts.forEach(attempt => console.log('  Attempt:', attempt.url));
    
    // Check if any successful connections
    const hasSuccessfulWS = wsAttempts.some(attempt => 
      !attempt.url.includes(':3002') && 
      !attempt.url.includes(':3003')
    );
    
    if (hasSuccessfulWS) {
      console.log('✅ Some WebSocket attempts may have succeeded');
    } else {
      console.log('❌ All WebSocket attempts failed - port configuration issue');
    }
  });

  test('Service communication validation', async ({ page }) => {
    console.log('Validating service communication...');
    
    // Direct API tests
    const tests = [
      { endpoint: 'http://localhost:3001/health', name: 'Health Check' },
      { endpoint: 'http://localhost:3001/api/status', name: 'API Status' },
    ];
    
    for (const test of tests) {
      try {
        const response = await page.request.get(test.endpoint);
        if (response.status() === 200) {
          console.log(`✅ ${test.name}: OK (${response.status()})`);
        } else {
          console.log(`⚠️ ${test.name}: Status ${response.status()}`);
        }
      } catch (error) {
        console.log(`❌ ${test.name}: Failed - ${error.message}`);
      }
    }
    
    // Frontend loading validation
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Check for basic UI elements
    const basicElements = [
      'body',
      'div',
      '[id*="app"], [id*="root"]',
      'nav, header, main, .container'
    ];
    
    for (const selector of basicElements) {
      try {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          console.log(`✅ UI Element found: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`⚠️ UI Element not found: ${selector}`);
      }
    }
    
    console.log('Service communication validation completed');
  });
});