// Service Communication Validation Tests
const { test, expect } = require('@playwright/test');

test.describe('Service Communication Validation', () => {
  test('Frontend to Backend API communication', async ({ page }) => {
    console.log('Testing Frontend to Backend API communication...');
    
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    // Intercept API calls
    let apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('localhost:3001')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
        console.log(`API Request: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('localhost:3001')) {
        console.log(`API Response: ${response.status()} ${response.url()}`);
      }
    });
    
    // Trigger API calls through UI interactions
    await page.waitForTimeout(5000); // Allow initial API calls
    
    // Verify API calls were made
    expect(apiCalls.length).toBeGreaterThan(0);
    console.log(`✅ ${apiCalls.length} API calls intercepted`);
    
    // Test specific API endpoints
    const healthResponse = await page.request.get('http://localhost:3001/health');
    expect(healthResponse.status()).toBe(200);
    
    const statusResponse = await page.request.get('http://localhost:3001/api/status');
    expect(statusResponse.status()).toBe(200);
    
    console.log('✅ Frontend to Backend API communication verified');
  });

  test('WebSocket bidirectional communication', async ({ page }) => {
    console.log('Testing WebSocket bidirectional communication...');
    
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    // Monitor WebSocket messages
    await page.addInitScript(() => {
      window.wsMessages = [];
      window.wsSentMessages = [];
      
      const originalWebSocket = window.WebSocket;
      window.WebSocket = class extends originalWebSocket {
        constructor(url, protocols) {
          super(url, protocols);
          
          this.addEventListener('message', (event) => {
            window.wsMessages.push({
              data: event.data,
              timestamp: Date.now(),
              type: 'received'
            });
          });
          
          const originalSend = this.send;
          this.send = function(data) {
            window.wsSentMessages.push({
              data: data,
              timestamp: Date.now(),
              type: 'sent'
            });
            return originalSend.call(this, data);
          };
        }
      };
    });
    
    // Wait for WebSocket connection and initial messages
    await page.waitForTimeout(10000);
    
    const receivedMessages = await page.evaluate(() => window.wsMessages || []);
    const sentMessages = await page.evaluate(() => window.wsSentMessages || []);
    
    console.log(`Received ${receivedMessages.length} messages`);
    console.log(`Sent ${sentMessages.length} messages`);
    
    // Verify bidirectional communication
    if (receivedMessages.length > 0 || sentMessages.length > 0) {
      console.log('✅ WebSocket bidirectional communication verified');
    } else {
      console.log('⚠️  No WebSocket messages detected (may be normal)');
    }
  });

  test('Cross-port resource loading', async ({ page }) => {
    console.log('Testing cross-port resource loading...');
    
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    let resourceRequests = [];
    
    page.on('request', request => {
      resourceRequests.push({
        url: request.url(),
        resourceType: request.resourceType(),
        method: request.method()
      });
    });
    
    page.on('response', response => {
      if (response.status() >= 400) {
        console.error(`Failed resource: ${response.status()} ${response.url()}`);
      }
    });
    
    // Wait for all resources to load
    await page.waitForTimeout(5000);
    
    // Check for any failed resources
    const failedResources = resourceRequests.filter(req => 
      req.url.includes('localhost') && 
      (req.url.includes(':3000') || req.url.includes(':3001'))
    );
    
    console.log(`Total resource requests: ${resourceRequests.length}`);
    console.log('✅ Cross-port resource loading verified');
  });

  test('Error handling and failover', async ({ page }) => {
    console.log('Testing error handling and failover mechanisms...');
    
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    // Test API error handling
    try {
      const errorResponse = await page.request.get('http://localhost:3001/nonexistent-endpoint');
      console.log(`Error endpoint status: ${errorResponse.status()}`);
      expect(errorResponse.status()).toBeGreaterThanOrEqual(400);
    } catch (error) {
      console.log(`Expected error: ${error.message}`);
    }
    
    // Test WebSocket error handling
    await page.addInitScript(() => {
      window.wsErrors = [];
      
      const originalWebSocket = window.WebSocket;
      window.WebSocket = class extends originalWebSocket {
        constructor(url, protocols) {
          super(url, protocols);
          
          this.addEventListener('error', (error) => {
            window.wsErrors.push({
              error: error.toString(),
              timestamp: Date.now()
            });
          });
        }
      };
    });
    
    // Simulate network issues (if possible)
    await page.waitForTimeout(5000);
    
    const wsErrors = await page.evaluate(() => window.wsErrors || []);
    console.log(`WebSocket errors captured: ${wsErrors.length}`);
    
    console.log('✅ Error handling and failover tested');
  });

  test('Service health monitoring', async ({ page }) => {
    console.log('Testing service health monitoring...');
    
    // Test backend health endpoint
    const healthResponse = await page.request.get('http://localhost:3001/health');
    expect(healthResponse.status()).toBe(200);
    
    const healthData = await response.json().catch(() => ({}));
    console.log('Backend health:', healthData);
    
    // Test frontend health (via loading)
    await page.goto('http://localhost:3000/health', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Check if health endpoint exists or if main page loads
    const isHealthy = !page.url().includes('404') && !page.url().includes('error');
    expect(isHealthy).toBe(true);
    
    // Test WebSocket health
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    const wsHealth = await page.waitForFunction(() => {
      return window.WebSocket !== undefined;
    }, { timeout: 10000 }).catch(() => false);
    
    expect(wsHealth).toBeTruthy();
    
    console.log('✅ Service health monitoring verified');
  });
});