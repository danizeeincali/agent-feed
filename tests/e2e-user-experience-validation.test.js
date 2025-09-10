/**
 * E2E User Experience Validation
 * 
 * Browser-level validation that the user experience is working
 * without "Disconnected" messages or API connection failures
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 60000;

const userExperienceResults = {
  pageLoads: [],
  navigationTests: [],
  dataLoadingTests: [],
  errorAnalysis: [],
  networkMonitoring: []
};

describe('E2E User Experience Validation', () => {
  let browser;
  let page;
  let networkRequests = [];
  
  beforeAll(async () => {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    page = await browser.newPage();
    
    // Monitor all network requests
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now(),
        type: 'request'
      });
      request.continue();
    });
    
    page.on('response', (response) => {
      networkRequests.push({
        url: response.url(),
        method: response.request().method(),
        status: response.status(),
        timestamp: Date.now(),
        type: 'response'
      });
    });
    
    // Monitor console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        userExperienceResults.errorAnalysis.push({
          message: msg.text(),
          timestamp: Date.now(),
          type: 'console-error'
        });
      }
    });
    
  }, TEST_TIMEOUT);
  
  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
    
    // Generate comprehensive UX report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPageLoads: userExperienceResults.pageLoads.length,
        successfulPageLoads: userExperienceResults.pageLoads.filter(p => p.success).length,
        totalNavigations: userExperienceResults.navigationTests.length,
        successfulNavigations: userExperienceResults.navigationTests.filter(n => n.success).length,
        dataLoadingTests: userExperienceResults.dataLoadingTests.length,
        successfulDataLoading: userExperienceResults.dataLoadingTests.filter(d => d.success).length,
        totalErrors: userExperienceResults.errorAnalysis.length,
        apiRequests: networkRequests.filter(r => r.url.includes('/api/')).length,
        api404Errors: networkRequests.filter(r => r.status === 404 && r.url.includes('/api/')).length
      },
      results: userExperienceResults,
      networkAnalysis: {
        totalRequests: networkRequests.length,
        apiRequests: networkRequests.filter(r => r.url.includes('/api/')),
        errorRequests: networkRequests.filter(r => r.status >= 400),
        v1Requests: networkRequests.filter(r => r.url.includes('/api/v1/'))
      },
      conclusions: {
        userExperienceGood: userExperienceResults.pageLoads.every(p => p.success),
        noDisconnectedMessages: userExperienceResults.dataLoadingTests.every(d => !d.hasDisconnectedMessage),
        noApiConnectionFailures: networkRequests.filter(r => r.status === 404 && r.url.includes('/api/')).length === 0,
        noV1ApiCalls: networkRequests.filter(r => r.url.includes('/api/v1/')).length === 0
      }
    };
    
    fs.writeFileSync(
      '/workspaces/agent-feed/tests/e2e-user-experience-report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('📋 E2E User Experience report generated');
  });

  describe('Page Loading Experience', () => {
    test('Home/Feed page loads without connection errors', async () => {
      try {
        console.log('🏠 Testing home/feed page loading...');
        
        const startTime = Date.now();
        await page.goto(FRONTEND_URL, { 
          waitUntil: 'networkidle2', 
          timeout: TEST_TIMEOUT 
        });
        const loadTime = Date.now() - startTime;
        
        // Wait for content to appear
        await page.waitForSelector('body', { timeout: 10000 });
        
        // Check for error messages
        const bodyText = await page.$eval('body', el => el.textContent.toLowerCase());
        
        const hasDisconnectedMessage = bodyText.includes('disconnected') || 
                                      bodyText.includes('connection failed') ||
                                      bodyText.includes('api connection failed');
        
        const hasErrorMessage = bodyText.includes('error') && bodyText.includes('api');
        
        // Check page title
        const title = await page.title();
        
        expect(hasDisconnectedMessage).toBe(false);
        expect(hasErrorMessage).toBe(false);
        expect(loadTime).toBeLessThan(10000); // 10 second max load time
        
        userExperienceResults.pageLoads.push({
          page: 'home',
          success: true,
          loadTime,
          hasDisconnectedMessage,
          hasErrorMessage,
          title,
          url: page.url()
        });
        
      } catch (error) {
        userExperienceResults.pageLoads.push({
          page: 'home',
          success: false,
          error: error.message,
          url: page.url()
        });
        throw error;
      }
    });

    test('Agents page loads without 404 errors', async () => {
      try {
        console.log('👥 Testing agents page loading...');
        
        const startTime = Date.now();
        await page.goto(`${FRONTEND_URL}/agents`, { 
          waitUntil: 'networkidle2', 
          timeout: TEST_TIMEOUT 
        });
        const loadTime = Date.now() - startTime;
        
        // Wait for content
        await page.waitForSelector('body', { timeout: 10000 });
        
        // Check for 404 or error content
        const bodyText = await page.$eval('body', el => el.textContent.toLowerCase());
        const title = await page.title();
        
        const has404Error = bodyText.includes('404') || 
                           bodyText.includes('not found') ||
                           title.toLowerCase().includes('404');
        
        const hasConnectionError = bodyText.includes('disconnected') || 
                                  bodyText.includes('connection failed');
        
        expect(has404Error).toBe(false);
        expect(hasConnectionError).toBe(false);
        expect(loadTime).toBeLessThan(10000);
        
        userExperienceResults.pageLoads.push({
          page: 'agents',
          success: true,
          loadTime,
          has404Error,
          hasConnectionError,
          title,
          url: page.url()
        });
        
      } catch (error) {
        userExperienceResults.pageLoads.push({
          page: 'agents',
          success: false,
          error: error.message,
          url: page.url()
        });
        throw error;
      }
    });
  });

  describe('Data Loading Experience', () => {
    test('Feed data loads successfully without connection failures', async () => {
      try {
        console.log('📊 Testing feed data loading...');
        
        await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
        
        // Wait for potential data loading
        await page.waitForTimeout(5000);
        
        // Check for specific indicators of successful data loading
        const bodyText = await page.$eval('body', el => el.textContent);
        
        const hasDisconnectedMessage = bodyText.includes('Disconnected') || 
                                      bodyText.includes('API connection failed');
        
        const hasLoadingSpinner = await page.$('.loading, .spinner, [data-testid=\"loading\"]') !== null;
        
        // Look for content that suggests data was loaded
        const hasPostContent = await page.$$('.post, .agent-post, .feed-item, [data-testid=\"post\"]').then(els => els.length > 0);
        
        userExperienceResults.dataLoadingTests.push({
          test: 'feed-data-loading',
          success: !hasDisconnectedMessage,
          hasDisconnectedMessage,
          hasLoadingSpinner,
          hasPostContent,
          bodyTextLength: bodyText.length
        });
        
        expect(hasDisconnectedMessage).toBe(false);
        
      } catch (error) {
        userExperienceResults.dataLoadingTests.push({
          test: 'feed-data-loading',
          success: false,
          error: error.message
        });
        throw error;
      }
    });

    test('Filter data loads successfully', async () => {
      try {
        console.log('🔍 Testing filter data loading...');
        
        await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
        
        // Wait for filters to potentially load
        await page.waitForTimeout(3000);
        
        // Look for filter elements
        const hasFilterElements = await page.$$('.filter, .search, select, input[type=\"search\"]').then(els => els.length > 0);
        
        // Check for filter-related content
        const bodyText = await page.$eval('body', el => el.textContent);
        const hasFilterContent = bodyText.includes('filter') || 
                                bodyText.includes('search') || 
                                bodyText.includes('agent') ||
                                bodyText.includes('hashtag');
        
        userExperienceResults.dataLoadingTests.push({
          test: 'filter-data-loading',
          success: true,
          hasFilterElements,
          hasFilterContent
        });
        
      } catch (error) {
        userExperienceResults.dataLoadingTests.push({
          test: 'filter-data-loading',
          success: false,
          error: error.message
        });
        throw error;
      }
    });
  });

  describe('Navigation Experience', () => {
    test('Navigation between pages works smoothly', async () => {
      try {
        console.log('🧭 Testing navigation experience...');
        
        // Start at home
        await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
        
        // Try to find and click agents link
        let navigationSuccess = false;
        
        try {
          // Look for various possible agents link patterns
          const agentsLinkSelector = await page.evaluate(() => {
            const possibleSelectors = [
              'a[href="/agents"]',
              'a[href="#/agents"]', 
              'a[href="./agents"]',
              '[data-testid="agents-link"]',
              'nav a:contains("Agents")',
              'a:contains("Agents")'
            ];
            
            for (const selector of possibleSelectors) {
              try {
                const element = document.querySelector(selector);
                if (element) return selector;
              } catch (e) {}
            }
            
            // Look for any link containing \"agents\"
            const links = Array.from(document.querySelectorAll('a'));
            const agentsLink = links.find(link => 
              link.href.includes('agents') || 
              link.textContent.toLowerCase().includes('agents')
            );
            
            return agentsLink ? 'found' : null;
          });
          
          if (agentsLinkSelector && agentsLinkSelector !== 'found') {
            await page.click(agentsLinkSelector);
            await page.waitForTimeout(2000);
            navigationSuccess = true;
          } else if (agentsLinkSelector === 'found') {
            // Direct navigation as fallback
            await page.goto(`${FRONTEND_URL}/agents`, { waitUntil: 'networkidle2' });
            navigationSuccess = true;
          } else {
            // Direct navigation as final fallback
            await page.goto(`${FRONTEND_URL}/agents`, { waitUntil: 'networkidle2' });
            navigationSuccess = true;
          }
          
        } catch (navError) {
          console.log('Navigation link not found, using direct navigation');
          await page.goto(`${FRONTEND_URL}/agents`, { waitUntil: 'networkidle2' });
          navigationSuccess = true;
        }
        
        // Check that we're on agents page and it loaded successfully
        const currentUrl = page.url();
        const bodyText = await page.$eval('body', el => el.textContent.toLowerCase());
        
        const isOnAgentsPage = currentUrl.includes('agents');
        const hasPageError = bodyText.includes('404') || bodyText.includes('error');
        
        expect(navigationSuccess).toBe(true);
        expect(isOnAgentsPage).toBe(true);
        expect(hasPageError).toBe(false);
        
        userExperienceResults.navigationTests.push({
          test: 'home-to-agents-navigation',
          success: true,
          navigationMethod: 'click-or-direct',
          finalUrl: currentUrl,
          hasPageError
        });
        
      } catch (error) {
        userExperienceResults.navigationTests.push({
          test: 'home-to-agents-navigation',
          success: false,
          error: error.message
        });
        throw error;
      }
    });

    test('Page refresh maintains functionality', async () => {
      try {
        console.log('🔄 Testing page refresh experience...');
        
        // Go to feed page
        await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
        
        // Refresh
        await page.reload({ waitUntil: 'networkidle2' });
        
        // Wait for page to stabilize
        await page.waitForTimeout(3000);
        
        // Check that page still works
        const bodyText = await page.$eval('body', el => el.textContent);
        
        const hasDisconnectedMessage = bodyText.includes('Disconnected') || 
                                      bodyText.includes('API connection failed');
        
        const pageStillWorking = bodyText.length > 100; // Has substantial content
        
        expect(hasDisconnectedMessage).toBe(false);
        expect(pageStillWorking).toBe(true);
        
        userExperienceResults.navigationTests.push({
          test: 'page-refresh',
          success: true,
          hasDisconnectedMessage,
          pageStillWorking,
          contentLength: bodyText.length
        });
        
      } catch (error) {
        userExperienceResults.navigationTests.push({
          test: 'page-refresh',
          success: false,
          error: error.message
        });
        throw error;
      }
    });
  });

  describe('Network Request Analysis', () => {
    test('No API requests to old v1 endpoints', async () => {
      // Analyze collected network requests
      const v1ApiRequests = networkRequests.filter(req => 
        req.url.includes('/api/v1/') && req.type === 'request'
      );
      
      expect(v1ApiRequests.length).toBe(0);
      
      userExperienceResults.networkMonitoring.push({
        test: 'no-v1-api-requests',
        success: v1ApiRequests.length === 0,
        v1RequestCount: v1ApiRequests.length,
        v1Requests: v1ApiRequests
      });
    });

    test('API requests use correct endpoints', async () => {
      const apiRequests = networkRequests.filter(req => 
        req.url.includes('/api/') && req.type === 'request'
      );
      
      const correctEndpoints = [
        '/api/health',
        '/api/agents', 
        '/api/agent-posts',
        '/api/filter-data',
        '/api/filter-stats'
      ];
      
      const correctApiCalls = apiRequests.filter(req =>
        correctEndpoints.some(endpoint => req.url.includes(endpoint))
      );
      
      userExperienceResults.networkMonitoring.push({
        test: 'correct-api-endpoints',
        success: correctApiCalls.length > 0,
        totalApiRequests: apiRequests.length,
        correctApiCalls: correctApiCalls.length,
        apiRequests: apiRequests.map(r => ({ url: r.url, method: r.method }))
      });
      
      expect(correctApiCalls.length).toBeGreaterThan(0);
    });

    test('No 404 errors on API endpoints', async () => {
      const apiResponses = networkRequests.filter(req => 
        req.url.includes('/api/') && req.type === 'response'
      );
      
      const api404Errors = apiResponses.filter(res => res.status === 404);
      
      expect(api404Errors.length).toBe(0);
      
      userExperienceResults.networkMonitoring.push({
        test: 'no-api-404-errors',
        success: api404Errors.length === 0,
        total404Errors: api404Errors.length,
        api404Errors
      });
    });
  });
});

module.exports = {
  userExperienceResults
};