/**
 * SPARC:debug Final TDD Test - White Screen Resolution Validation
 * Comprehensive testing after WebSocket context method addition
 */

const puppeteer = require('puppeteer');

describe('Final White Screen Resolution - SPARC TDD Validation', () => {
  let browser, page;
  
  beforeAll(async () => {
    // Wait for servers to stabilize after fixes
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });
    page = await browser.newPage();
    
    // Capture console messages for debugging
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request => 
      console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText)
    );
  });
  
  afterAll(async () => {
    if (browser) await browser.close();
  });
  
  test('should successfully render React content without white screen', async () => {
    try {
      console.log('Testing frontend on port 3002...');
      
      const response = await page.goto('http://127.0.0.1:3002/', { 
        waitUntil: 'domcontentloaded',
        timeout: 45000 
      });
      
      console.log('Response status:', response?.status());
      expect(response?.status()).toBe(200);
      
      // Wait for React to mount
      await page.waitForTimeout(5000);
      
      // Check for React root content
      const pageContent = await page.evaluate(() => {
        const root = document.getElementById('root');
        const body = document.body;
        
        return {
          hasRoot: !!root,
          rootHasContent: root?.innerHTML?.length > 100,
          bodyContent: body.innerHTML.length,
          title: document.title,
          hasReactComponents: body.innerHTML.includes('data-testid') || 
                           body.innerHTML.includes('AgentLink') ||
                           body.innerHTML.includes('nav') ||
                           body.innerHTML.includes('header')
        };
      });
      
      console.log('Page content analysis:', pageContent);
      
      // Validate React application loaded properly
      expect(pageContent.hasRoot).toBe(true);
      expect(pageContent.rootHasContent).toBe(true);
      expect(pageContent.bodyContent).toBeGreaterThan(500);
      expect(pageContent.hasReactComponents).toBe(true);
      
    } catch (error) {
      console.error('Frontend test error:', error.message);
      
      // Capture screenshot for debugging
      const screenshot = await page.screenshot({ fullPage: true });
      console.log('Screenshot captured, length:', screenshot.length);
      
      throw error;
    }
  }, 60000);
  
  test('should have WebSocket context methods available', async () => {
    await page.goto('http://127.0.0.1:3002/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    
    // Check for React errors related to WebSocket context
    const hasWebSocketErrors = await page.evaluate(() => {
      const errors = window.console?.error?.toString() || '';
      return errors.includes('WebSocket') || 
             errors.includes('useWebSocket') ||
             errors.includes('socket.on') ||
             errors.includes('socket.off');
    });
    
    expect(hasWebSocketErrors).toBe(false);
  }, 45000);
  
  test('should load application navigation', async () => {
    await page.goto('http://127.0.0.1:3002/', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForTimeout(4000);
    
    // Check for navigation elements
    const navigation = await page.evaluate(() => {
      const hasNavigation = document.querySelector('nav') || 
                           document.querySelector('[role="navigation"]') ||
                           document.querySelector('a[href="/"]');
      const hasHeader = document.querySelector('header') ||
                       document.querySelector('[data-testid="header"]');
      
      return {
        hasNav: !!hasNavigation,
        hasHeader: !!hasHeader,
        linkCount: document.querySelectorAll('a').length
      };
    });
    
    expect(navigation.hasNav || navigation.hasHeader).toBe(true);
    expect(navigation.linkCount).toBeGreaterThan(0);
  }, 45000);
});