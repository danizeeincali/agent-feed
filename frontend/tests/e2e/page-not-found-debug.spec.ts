import { test, expect } from '@playwright/test';

test.describe('Page Not Found Debug Suite', () => {
  test('Debug: Page not found despite API success', async ({ page }) => {
    // Capture all console messages
    const consoleMessages: Array<{type: string, text: string, timestamp: number}> = [];
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
    });

    // Capture network requests and responses
    const networkActivity: Array<{
      type: 'request' | 'response',
      method?: string,
      status?: number,
      url: string,
      data?: any,
      timestamp: number
    }> = [];

    page.on('request', request => {
      if (request.url().includes('/api/') || request.url().includes('agents')) {
        networkActivity.push({
          type: 'request',
          method: request.method(),
          url: request.url(),
          timestamp: Date.now()
        });
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/') || response.url().includes('agents')) {
        let responseData = null;
        try {
          const contentType = response.headers()['content-type'];
          if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
          } else {
            responseData = await response.text();
          }
        } catch (error) {
          responseData = `Error reading response: ${error.message}`;
        }

        networkActivity.push({
          type: 'response',
          status: response.status(),
          url: response.url(),
          data: responseData,
          timestamp: Date.now()
        });
      }
    });

    // Navigate to target page
    console.log('🔍 Navigating to target page...');
    await page.goto('http://127.0.0.1:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723');

    // Wait for component to finish loading
    console.log('🔍 Waiting for page to load...');
    await page.waitForTimeout(5000);

    // Try to wait for specific elements
    try {
      await page.waitForSelector('[data-testid="agent-page-content"]', { timeout: 3000 });
      console.log('🔍 Found agent page content element');
    } catch (error) {
      console.log('🔍 No agent page content element found');
    }

    try {
      await page.waitForSelector('.error-message, [data-testid="error"]', { timeout: 1000 });
      console.log('🔍 Found error message element');
    } catch (error) {
      console.log('🔍 No error message element found');
    }

    // Capture final page state
    const pageContent = await page.textContent('body');
    const isPageNotFound = pageContent?.includes('Page not found') || pageContent?.includes('not found') || false;
    const isPageLoaded = pageContent?.includes('Personal Todos Dashboard') || pageContent?.includes('Dashboard') || false;
    const pageTitle = await page.title();
    const currentUrl = page.url();

    // Get page HTML for detailed analysis
    const pageHTML = await page.content();

    // Debug output
    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMessages.forEach(msg => {
      console.log(`[${msg.type.toUpperCase()}] ${msg.text}`);
    });

    console.log('\n=== NETWORK ACTIVITY ===');
    networkActivity.forEach(activity => {
      console.log(`[${activity.type.toUpperCase()}] ${activity.method || activity.status} ${activity.url}`);
      if (activity.data && activity.type === 'response') {
        if (typeof activity.data === 'string') {
          console.log('Response text:', activity.data.substring(0, 200) + '...');
        } else {
          console.log('Response data:', JSON.stringify(activity.data, null, 2));
        }
      }
    });

    console.log('\n=== PAGE STATE ===');
    console.log('Current URL:', currentUrl);
    console.log('Page Title:', pageTitle);
    console.log('Page Not Found:', isPageNotFound);
    console.log('Page Loaded:', isPageLoaded);
    console.log('Body Content Preview:', pageContent?.substring(0, 500) + '...');

    // Take screenshot for visual debugging
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/tests/debug-page-not-found.png', 
      fullPage: true 
    });

    // Save page HTML for analysis
    require('fs').writeFileSync(
      '/workspaces/agent-feed/frontend/tests/debug-page-source.html', 
      pageHTML
    );

    // Check for React errors
    const reactErrors = consoleMessages.filter(msg => 
      msg.type === 'error' && (
        msg.text.includes('React') || 
        msg.text.includes('Warning') ||
        msg.text.includes('Error')
      )
    );

    console.log('\n=== REACT ERRORS ===');
    reactErrors.forEach(error => {
      console.log(`[REACT ERROR] ${error.text}`);
    });

    // Report findings
    console.log('\n=== DIAGNOSTIC SUMMARY ===');
    console.log(`API Calls Made: ${networkActivity.filter(a => a.type === 'request').length}`);
    console.log(`API Responses: ${networkActivity.filter(a => a.type === 'response').length}`);
    console.log(`Console Errors: ${consoleMessages.filter(m => m.type === 'error').length}`);
    console.log(`Console Warnings: ${consoleMessages.filter(m => m.type === 'warning').length}`);
    console.log(`Page Shows Error: ${isPageNotFound}`);
    console.log(`Page Shows Content: ${isPageLoaded}`);

    // Test assertions (these may fail but provide clear documentation)
    expect(networkActivity.filter(a => a.type === 'request').length).toBeGreaterThan(0);
    expect(isPageNotFound).toBe(false); // This should pass but currently fails
    expect(isPageLoaded).toBe(true);    // This should pass but currently fails
  });

  test('API Direct Verification', async ({ request }) => {
    console.log('🔍 Testing API directly...');
    
    // Test API directly through browser request context
    const response = await request.get('http://127.0.0.1:5173/api/agents/personal-todos-agent/pages');
    let apiData;
    
    try {
      apiData = await response.json();
    } catch (error) {
      apiData = await response.text();
    }

    console.log('\n=== DIRECT API TEST ===');
    console.log('Status:', response.status());
    console.log('Headers:', response.headers());
    console.log('Data:', typeof apiData === 'string' ? apiData : JSON.stringify(apiData, null, 2));

    // Verify API is working correctly
    expect(response.status()).toBe(200);
    
    if (typeof apiData === 'object' && apiData !== null) {
      expect(apiData.success).toBe(true);
      expect(apiData.pages).toBeDefined();
      expect(apiData.pages.length).toBeGreaterThan(0);

      const targetPage = apiData.pages.find((p: any) => p.id === '015b7296-a144-4096-9c60-ee5d7f900723');
      expect(targetPage).toBeDefined();
      
      console.log('\n=== TARGET PAGE DATA ===');
      console.log(JSON.stringify(targetPage, null, 2));
    }
  });

  test('Component State Debug', async ({ page }) => {
    console.log('🔍 Running component state debug...');
    
    // Inject debugging script into page
    await page.addInitScript(() => {
      // Override console.log to capture React component logs
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      
      window.debugLogs = [];
      
      console.log = (...args) => {
        window.debugLogs.push({ type: 'log', message: args.join(' '), timestamp: Date.now() });
        originalLog.apply(console, args);
      };
      
      console.error = (...args) => {
        window.debugLogs.push({ type: 'error', message: args.join(' '), timestamp: Date.now() });
        originalError.apply(console, args);
      };
      
      console.warn = (...args) => {
        window.debugLogs.push({ type: 'warn', message: args.join(' '), timestamp: Date.now() });
        originalWarn.apply(console, args);
      };

      // Track React component mounts
      window.componentMounts = [];
      
      // Monkey patch React if available
      if (window.React) {
        const originalCreateElement = window.React.createElement;
        window.React.createElement = function(type, props, ...children) {
          if (typeof type === 'function' && type.name) {
            window.componentMounts.push({
              component: type.name,
              timestamp: Date.now(),
              props: props ? Object.keys(props) : []
            });
          }
          return originalCreateElement.apply(this, arguments);
        };
      }
    });

    await page.goto('http://127.0.0.1:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723');
    
    // Wait and capture debug logs
    await page.waitForTimeout(8000);
    
    const debugLogs = await page.evaluate(() => window.debugLogs || []);
    const componentMounts = await page.evaluate(() => window.componentMounts || []);
    
    console.log('\n=== COMPONENT DEBUG LOGS ===');
    debugLogs.forEach((log: any) => console.log(`[${log.type.toUpperCase()}] ${log.message}`));
    
    console.log('\n=== COMPONENT MOUNTS ===');
    componentMounts.forEach((mount: any) => {
      console.log(`Component: ${mount.component}, Props: [${mount.props.join(', ')}]`);
    });
    
    // Check specific component states
    const componentState = await page.evaluate(() => {
      const debugInfo: any = {};
      
      // Try to access React component state if available
      const elements = document.querySelectorAll('[data-testid], [class*="agent"], [class*="page"], [id*="agent"]');
      
      elements.forEach(el => {
        const identifier = el.getAttribute('data-testid') || 
                          el.getAttribute('class') || 
                          el.getAttribute('id') || 
                          el.tagName.toLowerCase();
        debugInfo[identifier] = {
          textContent: el.textContent?.substring(0, 100),
          visible: el.offsetWidth > 0 && el.offsetHeight > 0,
          className: el.className,
          tagName: el.tagName
        };
      });
      
      // Check for React DevTools
      debugInfo.reactDevTools = !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      debugInfo.reactVersion = (window as any).React?.version || 'unknown';
      
      return debugInfo;
    });
    
    console.log('\n=== COMPONENT STATE ===');
    console.log(JSON.stringify(componentState, null, 2));

    // Check router state
    const routerState = await page.evaluate(() => {
      const pathname = window.location.pathname;
      const search = window.location.search;
      const hash = window.location.hash;
      
      return {
        pathname,
        search,
        hash,
        fullUrl: window.location.href
      };
    });

    console.log('\n=== ROUTER STATE ===');
    console.log(JSON.stringify(routerState, null, 2));

    // Take detailed screenshot
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/tests/debug-component-state.png', 
      fullPage: true 
    });
  });

  test('Route Matching Debug', async ({ page }) => {
    console.log('🔍 Testing route matching...');
    
    // Test different route patterns
    const routesToTest = [
      'http://127.0.0.1:5173/',
      'http://127.0.0.1:5173/agents',
      'http://127.0.0.1:5173/agents/personal-todos-agent',
      'http://127.0.0.1:5173/agents/personal-todos-agent/pages',
      'http://127.0.0.1:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723'
    ];

    for (const route of routesToTest) {
      console.log(`\n🔍 Testing route: ${route}`);
      
      await page.goto(route);
      await page.waitForTimeout(2000);
      
      const pageContent = await page.textContent('body');
      const isError = pageContent?.includes('not found') || pageContent?.includes('404') || false;
      const title = await page.title();
      
      console.log(`  - Title: ${title}`);
      console.log(`  - Error: ${isError}`);
      console.log(`  - Content preview: ${pageContent?.substring(0, 100)}...`);
    }
  });
});