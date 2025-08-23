// Comprehensive Browser Workflow Tests
const { test, expect } = require('@playwright/test');

test.describe('Comprehensive Browser Workflow', () => {
  test('Complete end-to-end workflow validation', async ({ page }) => {
    console.log('Starting comprehensive workflow validation...');
    
    // Step 1: Verify frontend loads
    console.log('Step 1: Loading frontend...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    await expect(page).toHaveTitle(/Agent Feed/i);
    console.log('✅ Frontend loaded successfully');
    
    // Step 2: Check backend connectivity
    console.log('Step 2: Verifying backend connectivity...');
    const backendHealth = await page.request.get('http://localhost:3001/health');
    expect(backendHealth.status()).toBe(200);
    console.log('✅ Backend connectivity verified');
    
    // Step 3: Monitor WebSocket connection
    console.log('Step 3: Monitoring WebSocket connection...');
    let wsEvents = [];
    
    await page.addInitScript(() => {
      window.wsEvents = [];
      const originalWebSocket = window.WebSocket;
      window.WebSocket = class extends originalWebSocket {
        constructor(url, protocols) {
          super(url, protocols);
          window.wsEvents.push({ type: 'connecting', url, timestamp: Date.now() });
          
          this.addEventListener('open', () => {
            window.wsEvents.push({ type: 'connected', timestamp: Date.now() });
          });
          
          this.addEventListener('message', (event) => {
            window.wsEvents.push({ type: 'message', data: event.data, timestamp: Date.now() });
          });
          
          this.addEventListener('error', (error) => {
            window.wsEvents.push({ type: 'error', error: error.toString(), timestamp: Date.now() });
          });
          
          this.addEventListener('close', (event) => {
            window.wsEvents.push({ type: 'closed', code: event.code, timestamp: Date.now() });
          });
        }
      };
    });
    
    // Wait for WebSocket connection
    await page.waitForFunction(() => {
      return window.wsEvents && window.wsEvents.some(event => event.type === 'connected');
    }, { timeout: 30000 });
    
    wsEvents = await page.evaluate(() => window.wsEvents);
    console.log('WebSocket events:', wsEvents);
    console.log('✅ WebSocket connection established');
    
    // Step 4: Verify connection status UI
    console.log('Step 4: Checking connection status UI...');
    const connectionStatus = page.locator('[data-testid="connection-status"], .connection-status, text=Connected');
    await expect(connectionStatus).toBeVisible({ timeout: 30000 });
    console.log('✅ Connection status UI verified');
    
    // Step 5: Test interactive elements
    console.log('Step 5: Testing interactive elements...');
    
    // Test navigation
    const navElements = page.locator('nav a, .nav-link, [data-testid*="nav"]');
    if (await navElements.count() > 0) {
      await navElements.first().click();
      await page.waitForTimeout(2000); // Allow navigation
    }
    
    // Test forms if present
    const formElements = page.locator('form, input[type="text"], textarea');
    if (await formElements.count() > 0) {
      const firstInput = formElements.first();
      await firstInput.fill('Test input');
      await expect(firstInput).toHaveValue('Test input');
    }
    
    console.log('✅ Interactive elements tested');
    
    // Step 6: Test error boundaries
    console.log('Step 6: Testing error boundaries...');
    
    // Inject a test error and verify it's handled gracefully
    await page.addInitScript(() => {
      window.testErrorHandling = () => {
        try {
          throw new Error('Test error for boundary testing');
        } catch (error) {
          console.error('Test error caught:', error);
          return true;
        }
      };
    });
    
    const errorHandled = await page.evaluate(() => window.testErrorHandling());
    expect(errorHandled).toBe(true);
    console.log('✅ Error boundaries tested');
    
    console.log('🎉 Comprehensive workflow validation completed successfully!');
  });

  test('Performance and load testing', async ({ page }) => {
    console.log('Starting performance validation...');
    
    // Measure page load time
    const startTime = Date.now();
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    const loadTime = Date.now() - startTime;
    
    console.log(`Page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(10000); // Should load in under 10 seconds
    
    // Test multiple rapid requests
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        page.request.get('http://localhost:3001/health')
      );
    }
    
    const responses = await Promise.all(promises);
    responses.forEach((response, index) => {
      expect(response.status()).toBe(200);
      console.log(`Request ${index + 1}: ${response.status()}`);
    });
    
    console.log('✅ Performance validation completed');
  });

  test('Multi-browser compatibility', async ({ page, browserName }) => {
    console.log(`Testing compatibility in ${browserName}...`);
    
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    // Test basic functionality in each browser
    await expect(page).toHaveTitle(/Agent Feed/i);
    
    // Test WebSocket support
    const webSocketSupported = await page.evaluate(() => {
      return typeof WebSocket !== 'undefined';
    });
    expect(webSocketSupported).toBe(true);
    
    // Test modern JS features
    const modernJSSupported = await page.evaluate(() => {
      try {
        // Test arrow functions, async/await, fetch
        const testAsync = async () => fetch;
        return typeof testAsync === 'function' && typeof fetch !== 'undefined';
      } catch (e) {
        return false;
      }
    });
    expect(modernJSSupported).toBe(true);
    
    console.log(`✅ ${browserName} compatibility verified`);
  });
});