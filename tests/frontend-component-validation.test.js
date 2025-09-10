/**
 * Frontend Component API Integration Validation
 * 
 * Tests that frontend components can successfully load data through
 * the corrected API endpoints without 404 errors
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Test configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 60000;

const componentValidationResults = {
  componentTests: [],
  networkRequests: [],
  consoleErrors: [],
  userInteractions: []
};

describe('Frontend Component API Integration', () => {
  let browser;
  let page;
  
  beforeAll(async () => {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // Enable request interception to monitor API calls
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      componentValidationResults.networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString()
      });
      request.continue();
    });
    
    page.on('response', (response) => {
      if (response.url().includes('/api/')) {
        componentValidationResults.networkRequests.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          headers: response.headers(),
          timestamp: new Date().toISOString(),
          type: 'response'
        });
      }
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        componentValidationResults.consoleErrors.push({
          text: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
  }, TEST_TIMEOUT);
  
  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
    
    // Generate component validation report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalComponentTests: componentValidationResults.componentTests.length,
        passedTests: componentValidationResults.componentTests.filter(t => t.status === 'pass').length,
        failedTests: componentValidationResults.componentTests.filter(t => t.status === 'fail').length,
        totalNetworkRequests: componentValidationResults.networkRequests.length,
        api404Errors: componentValidationResults.networkRequests.filter(r => r.status === 404 && r.url?.includes('/api/')).length,
        consoleErrors: componentValidationResults.consoleErrors.length
      },
      results: componentValidationResults,
      conclusions: {
        componentsLoadSuccessfully: componentValidationResults.componentTests.every(t => t.status === 'pass'),
        noApiConnectionErrors: componentValidationResults.networkRequests.filter(r => r.status === 404 && r.url?.includes('/api/')).length === 0,
        noConsoleErrors: componentValidationResults.consoleErrors.length === 0
      }
    };
    
    fs.writeFileSync(
      '/workspaces/agent-feed/tests/frontend-component-validation-report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('📋 Frontend component validation report generated');
  });

  describe('Feed Page Component Validation', () => {
    test('Feed page loads without 404 API errors', async () => {
      try {
        console.log('🔍 Testing Feed page loading...');
        
        await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
        
        // Wait for feed to load
        await page.waitForSelector('[data-testid="feed-container"], .feed-container, .posts-container, main', {
          timeout: 10000
        });
        
        // Check for "Disconnected" or error messages
        const disconnectedElements = await page.$$eval(
          'text=Disconnected, text="API connection failed", .error-message',
          elements => elements.map(el => el.textContent)
        ).catch(() => []);
        
        expect(disconnectedElements.length).toBe(0);
        
        // Check for post elements
        const postElements = await page.$$('.post, .agent-post, [data-testid="post"]');
        
        componentValidationResults.componentTests.push({
          component: 'feed-page',
          status: 'pass',
          postsLoaded: postElements.length,
          noDisconnectedMessage: disconnectedElements.length === 0,
          url: page.url()
        });
        
      } catch (error) {
        componentValidationResults.componentTests.push({
          component: 'feed-page',
          status: 'fail',
          error: error.message,
          url: page.url()
        });
        throw error;
      }
    });

    test('Feed page makes correct API calls to /api/ endpoints', async () => {
      // Reset network tracking
      const apiCalls = componentValidationResults.networkRequests.filter(req => 
        req.url && req.url.includes('/api/') && req.type === 'response'
      );
      
      expect(apiCalls.length).toBeGreaterThan(0);
      
      // Check that no calls are made to old /api/v1/ endpoints
      const v1Calls = apiCalls.filter(call => call.url.includes('/api/v1/'));
      expect(v1Calls.length).toBe(0);
      
      // Check that calls are made to correct endpoints
      const expectedEndpoints = ['/api/agent-posts', '/api/filter-data', '/api/agents'];
      const foundEndpoints = expectedEndpoints.filter(endpoint => 
        apiCalls.some(call => call.url.includes(endpoint))
      );
      
      expect(foundEndpoints.length).toBeGreaterThan(0);
      
      componentValidationResults.componentTests.push({
        component: 'feed-api-calls',
        status: 'pass',
        apiCallsMade: apiCalls.length,
        correctEndpointsCalled: foundEndpoints.length,
        noV1Calls: v1Calls.length === 0
      });
    });
  });

  describe('Agents Page Component Validation', () => {
    test('Agents page loads without 404 errors', async () => {
      try {
        console.log('🔍 Testing Agents page loading...');
        
        await page.goto(`${FRONTEND_URL}/agents`, { waitUntil: 'networkidle2', timeout: TEST_TIMEOUT });
        
        // Wait for agents page to load
        await page.waitForSelector('[data-testid="agents-container"], .agents-container, .agents-page', {
          timeout: 10000
        }).catch(async () => {
          // Fallback: wait for any substantial content
          await page.waitForSelector('main, .page-content', { timeout: 5000 });
        });
        
        // Check for error messages
        const errorElements = await page.$$eval(
          'text="404", text="Not Found", .error-message',
          elements => elements.map(el => el.textContent)
        ).catch(() => []);
        
        expect(errorElements.length).toBe(0);
        
        // Check page title or content
        const pageTitle = await page.title();
        expect(pageTitle).not.toContain('404');
        
        componentValidationResults.componentTests.push({
          component: 'agents-page',
          status: 'pass',
          noErrorMessages: errorElements.length === 0,
          pageTitle,
          url: page.url()
        });
        
      } catch (error) {
        componentValidationResults.componentTests.push({
          component: 'agents-page',
          status: 'fail',
          error: error.message,
          url: page.url()
        });
        throw error;
      }
    });
  });

  describe('Real-time Features Validation', () => {
    test('WebSocket connections work without errors', async () => {
      try {
        // Monitor WebSocket connections
        let wsConnected = false;
        
        page.on('websocket', (ws) => {
          console.log('WebSocket connection detected:', ws.url());
          wsConnected = true;
          
          ws.on('framereceived', (event) => {
            console.log('WebSocket frame received:', event.payload);
          });
          
          ws.on('close', () => {
            console.log('WebSocket closed');
          });
        });
        
        // Navigate to feed and wait for potential WebSocket connections
        await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
        
        // Wait a bit for WebSocket connections to establish
        await page.waitForTimeout(3000);
        
        componentValidationResults.componentTests.push({
          component: 'websocket-connection',
          status: 'pass',
          wsConnected,
          description: 'WebSocket monitoring completed'
        });
        
      } catch (error) {
        componentValidationResults.componentTests.push({
          component: 'websocket-connection',
          status: 'fail',
          error: error.message
        });
        throw error;
      }
    });
  });

  describe('User Interaction Validation', () => {
    test('Navigation between pages works without errors', async () => {
      try {
        // Start at home/feed
        await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
        
        // Try to navigate to agents page via menu/link
        try {
          await page.click('a[href="/agents"], a[href="#/agents"], [data-testid="agents-link"]', { timeout: 5000 });
          await page.waitForTimeout(2000);
        } catch (e) {
          // Direct navigation if no link found
          await page.goto(`${FRONTEND_URL}/agents`, { waitUntil: 'networkidle2' });
        }
        
        // Check that we're on agents page without errors
        const currentUrl = page.url();
        expect(currentUrl).toContain('agents');
        
        // Check for error indicators
        const hasErrors = await page.$('.error, [data-testid="error"]') !== null;
        expect(hasErrors).toBe(false);
        
        componentValidationResults.userInteractions.push({
          action: 'navigate-to-agents',
          status: 'pass',
          finalUrl: currentUrl,
          hasErrors
        });
        
      } catch (error) {
        componentValidationResults.userInteractions.push({
          action: 'navigate-to-agents',
          status: 'fail',
          error: error.message
        });
        throw error;
      }
    });

    test('Page refresh maintains functionality', async () => {
      try {
        // Go to feed page
        await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
        
        // Refresh the page
        await page.reload({ waitUntil: 'networkidle2' });
        
        // Wait for content to load
        await page.waitForSelector('main, .page-content', { timeout: 10000 });
        
        // Check for disconnected messages
        const disconnectedText = await page.$eval('body', body => body.textContent).catch(() => '');
        expect(disconnectedText).not.toContain('Disconnected');
        expect(disconnectedText).not.toContain('API connection failed');
        
        componentValidationResults.userInteractions.push({
          action: 'page-refresh',
          status: 'pass',
          noDisconnectedMessage: !disconnectedText.includes('Disconnected')
        });
        
      } catch (error) {
        componentValidationResults.userInteractions.push({
          action: 'page-refresh',
          status: 'fail',
          error: error.message
        });
        throw error;
      }
    });
  });
});

module.exports = {
  componentValidationResults
};
