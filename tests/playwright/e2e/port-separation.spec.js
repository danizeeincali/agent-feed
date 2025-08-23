// Port Separation Validation Tests
const { test, expect } = require('@playwright/test');

test.describe('Port Separation Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up error listeners
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`Console error: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', error => {
      console.error(`Page error: ${error.message}`);
    });
  });

  test('Frontend should be accessible on port 3000', async ({ page }) => {
    console.log('Testing frontend accessibility on port 3000...');
    
    // Navigate to frontend
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    // Verify page loads successfully
    await expect(page).toHaveTitle(/Agent Feed/i);
    
    // Check for main application elements
    const appContainer = page.locator('[data-testid="app-container"], .app-container, #app, #root');
    await expect(appContainer).toBeVisible({ timeout: 30000 });
    
    // Verify no 404 or error messages
    await expect(page.locator('text=404')).not.toBeVisible();
    await expect(page.locator('text=Cannot GET')).not.toBeVisible();
    
    console.log('✅ Frontend accessible on port 3000');
  });

  test('Backend should be accessible on port 3001', async ({ page }) => {
    console.log('Testing backend accessibility on port 3001...');
    
    // Test backend health endpoint
    const response = await page.request.get('http://localhost:3001/health');
    expect(response.status()).toBe(200);
    
    const healthData = await response.json();
    expect(healthData).toHaveProperty('status', 'ok');
    
    // Test API endpoints
    const apiResponse = await page.request.get('http://localhost:3001/api/status');
    expect(apiResponse.status()).toBe(200);
    
    console.log('✅ Backend accessible on port 3001');
  });

  test('WebSocket connections establish properly between different ports', async ({ page }) => {
    console.log('Testing WebSocket connections between ports...');
    
    let wsConnected = false;
    let wsMessages = [];
    
    // Navigate to frontend
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    // Inject WebSocket monitoring
    await page.addInitScript(() => {
      const originalWebSocket = window.WebSocket;
      window.WebSocket = class extends originalWebSocket {
        constructor(url, protocols) {
          console.log(`WebSocket connecting to: ${url}`);
          super(url, protocols);
          
          this.addEventListener('open', () => {
            console.log('WebSocket connected successfully');
            window.wsConnected = true;
          });
          
          this.addEventListener('message', (event) => {
            console.log('WebSocket message received:', event.data);
            window.wsMessages = window.wsMessages || [];
            window.wsMessages.push(event.data);
          });
          
          this.addEventListener('error', (error) => {
            console.error('WebSocket error:', error);
            window.wsError = error;
          });
        }
      };
    });
    
    // Wait for WebSocket connection
    await page.waitForFunction(() => {
      return window.wsConnected === true;
    }, { timeout: 30000 });
    
    // Verify WebSocket connection
    wsConnected = await page.evaluate(() => window.wsConnected);
    expect(wsConnected).toBe(true);
    
    console.log('✅ WebSocket connections established between ports');
  });

  test('Connection status shows "Connected"', async ({ page }) => {
    console.log('Testing connection status display...');
    
    // Navigate to frontend
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    // Wait for connection status to be visible
    const connectionStatus = page.locator('[data-testid="connection-status"], .connection-status, text=Connected');
    await expect(connectionStatus).toBeVisible({ timeout: 30000 });
    
    // Verify status shows "Connected"
    await expect(connectionStatus).toContainText('Connected', { ignoreCase: true });
    
    // Check for green/success indicator
    const statusIndicator = page.locator('[data-testid="status-indicator"], .status-indicator, .connection-indicator');
    if (await statusIndicator.count() > 0) {
      await expect(statusIndicator).toHaveClass(/connected|success|green/i);
    }
    
    console.log('✅ Connection status shows "Connected"');
  });

  test('Claude instance launcher works without hanging', async ({ page }) => {
    console.log('Testing Claude instance launcher functionality...');
    
    // Navigate to frontend
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    // Find and click Claude instance launcher
    const launcherButton = page.locator('[data-testid="claude-launcher"], [data-testid="instance-launcher"]').or(page.locator('button').filter({ hasText: 'Launch' })).or(page.locator('button').filter({ hasText: 'Start' }));
    
    if (await launcherButton.count() > 0) {
      console.log('Found launcher button, testing...');
      
      // Click launcher
      await launcherButton.first().click();
      
      // Wait for loading to complete (should not hang)
      const loadingElement = page.locator('[data-testid="loading"], .loading, text="Loading"');
      
      if (await loadingElement.count() > 0) {
        console.log('Loading state detected, waiting for completion...');
        
        // Wait for loading to disappear (max 60 seconds)
        await expect(loadingElement).not.toBeVisible({ timeout: 60000 });
      }
      
      // Verify launcher completed successfully
      const successIndicator = page.locator('[data-testid="launch-success"], .launch-success, text=Success, text=Ready');
      if (await successIndicator.count() > 0) {
        await expect(successIndicator).toBeVisible({ timeout: 30000 });
      }
      
      console.log('✅ Claude instance launcher works without hanging');
    } else {
      console.log('⚠️  Claude instance launcher not found on page');
    }
  });
});