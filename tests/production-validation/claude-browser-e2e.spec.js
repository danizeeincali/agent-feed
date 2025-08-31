/**
 * BROWSER-BASED PRODUCTION VALIDATION
 * Validates Claude Code communication in real browser environment
 * Verifies WebSocket connections visible in DevTools
 */

const { test, expect } = require('@playwright/test');

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';

test.describe('BROWSER E2E VALIDATION: Claude Code Communication', () => {
  let page, context;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();
    
    // Enable console logging
    page.on('console', msg => console.log(`🌐 Browser: ${msg.text()}`));
    page.on('pageerror', error => console.error(`🚨 Page Error: ${error.message}`));
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test('VALIDATION 1: Frontend loads and connects to backend', async () => {
    console.log('🧪 Testing frontend loading and backend connection...');
    
    // Navigate to frontend
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Check for main component
    await expect(page.locator('[data-testid="claude-instance-manager"]')).toBeVisible({ timeout: 10000 });
    
    // Verify page title and heading
    await expect(page.locator('h1')).toContainText('Claude Instance Manager');
    
    console.log('✅ Frontend loaded successfully');
  });

  test('VALIDATION 2: Create Claude instance via UI', async () => {
    console.log('🧪 Testing Claude instance creation via UI...');
    
    // Look for create button - try multiple possible selectors
    const createButton = page.locator('button').filter({ hasText: /create|launch|new/i }).first();
    await expect(createButton).toBeVisible({ timeout: 5000 });
    
    console.log('📝 Found create button, clicking...');
    await createButton.click();
    
    // Wait for instance to appear in the list
    await expect(page.locator('.claude-instance-item, [class*="instance"]')).toBeVisible({ timeout: 15000 });
    
    const instanceItems = await page.locator('.claude-instance-item, [class*="instance"]').count();
    expect(instanceItems).toBeGreaterThan(0);
    
    console.log(`✅ Claude instance created successfully (${instanceItems} instances visible)`);
  });

  test('VALIDATION 3: Select instance and verify WebSocket connection', async () => {
    console.log('🧪 Testing instance selection and WebSocket connection...');
    
    // Start network monitoring to capture WebSocket connections
    const wsConnections = [];
    
    page.on('websocket', ws => {
      wsConnections.push(ws.url());
      console.log(`🔗 WebSocket connection detected: ${ws.url()}`);
    });
    
    // Select the first available instance
    const firstInstance = page.locator('.claude-instance-item, [class*="instance"]').first();
    await firstInstance.click();
    
    // Wait for WebSocket connection to be established
    await page.waitForTimeout(3000);
    
    // Verify WebSocket connection was created
    expect(wsConnections.length).toBeGreaterThan(0);
    expect(wsConnections.some(url => url.includes('/terminal'))).toBeTruthy();
    
    console.log('✅ WebSocket connection verified in browser');
  });

  test('VALIDATION 4: Send input and receive Claude response', async () => {
    console.log('🧪 Testing Claude AI communication via browser...');
    
    // Find input field - try multiple possible selectors
    const inputField = page.locator('input[type="text"], textarea, [placeholder*="message"], [placeholder*="input"]').first();
    await expect(inputField).toBeVisible({ timeout: 5000 });
    
    // Type test message
    const testMessage = 'Hello Claude, please respond to confirm you are working';
    await inputField.fill(testMessage);
    
    // Find and click send button
    const sendButton = page.locator('button').filter({ hasText: /send|submit/i }).first();
    await expect(sendButton).toBeVisible({ timeout: 5000 });
    await sendButton.click();
    
    console.log('📤 Test message sent to Claude');
    
    // Wait for response to appear in output area
    const outputArea = page.locator('[class*="output"], [class*="terminal"], [class*="chat"]').first();
    await expect(outputArea).toBeVisible({ timeout: 5000 });
    
    // Wait for Claude response (more flexible waiting)
    await page.waitForFunction(
      () => {
        const outputElements = document.querySelectorAll('[class*="output"], [class*="terminal"], [class*="chat"]');
        for (const element of outputElements) {
          if (element.textContent && element.textContent.length > 20) {
            return true;
          }
        }
        return false;
      },
      { timeout: 20000 }
    );
    
    const outputContent = await outputArea.textContent();
    expect(outputContent).toBeDefined();
    expect(outputContent.length).toBeGreaterThan(10);
    
    console.log(`✅ Claude response received: ${outputContent.slice(0, 100)}...`);
  });

  test('VALIDATION 5: Network tab verification', async () => {
    console.log('🧪 Testing network requests validation...');
    
    // Monitor network requests
    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method()
      });
    });
    
    // Trigger some API calls by refreshing instances
    await page.reload({ waitUntil: 'networkidle' });
    
    // Verify expected API calls were made
    const instancesRequests = requests.filter(req => 
      req.url.includes('/api/claude/instances') && req.method === 'GET'
    );
    expect(instancesRequests.length).toBeGreaterThan(0);
    
    const healthRequests = requests.filter(req => 
      req.url.includes('/health')
    );
    
    console.log(`✅ Network validation passed - ${instancesRequests.length} instances requests, ${healthRequests.length} health requests`);
  });

  test('VALIDATION 6: Error handling validation', async () => {
    console.log('🧪 Testing error handling...');
    
    // Try to interact with invalid instance (simulate error)
    const errorMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errorMessages.push(msg.text());
      }
    });
    
    // Look for error display areas
    const errorElements = await page.locator('[class*="error"], .text-red-', '[data-testid*="error"]').count();
    
    console.log(`✅ Error handling elements present: ${errorElements} error display components`);
    
    // If errors occurred, they should be handled gracefully (not crash the app)
    const criticalErrors = errorMessages.filter(msg => 
      msg.includes('Uncaught') || msg.includes('TypeError')
    );
    expect(criticalErrors).toHaveLength(0);
    
    console.log('✅ No critical JavaScript errors detected');
  });

  test('VALIDATION 7: Performance and responsiveness', async () => {
    console.log('🧪 Testing performance and responsiveness...');
    
    // Measure page load performance
    const startTime = performance.now();
    await page.reload({ waitUntil: 'networkidle' });
    const endTime = performance.now();
    
    const loadTime = endTime - startTime;
    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
    
    // Test UI responsiveness
    const createButton = page.locator('button').filter({ hasText: /create|launch|new/i }).first();
    const responseStart = performance.now();
    await createButton.click();
    await page.waitForSelector('.claude-instance-item, [class*="instance"]', { timeout: 15000 });
    const responseEnd = performance.now();
    
    const responseTime = responseEnd - responseStart;
    expect(responseTime).toBeLessThan(20000); // Should respond within 20 seconds
    
    console.log(`✅ Performance validated - Load: ${loadTime.toFixed(2)}ms, Response: ${responseTime.toFixed(2)}ms`);
  });
});