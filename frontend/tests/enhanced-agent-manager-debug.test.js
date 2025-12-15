import { test, expect } from '@playwright/test';

test.describe('Enhanced Agent Manager - White Screen Debug Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      console.log(`[BROWSER ${msg.type().toUpperCase()}]`, msg.text());
    });
    
    // Capture errors
    page.on('pageerror', err => {
      console.error(`[PAGE ERROR]`, err.message);
      console.error(`[ERROR STACK]`, err.stack);
    });
    
    // Capture failed requests
    page.on('requestfailed', request => {
      console.error(`[FAILED REQUEST] ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('should load Enhanced Agent Manager without white screen', async ({ page }) => {
    console.log('🔍 Starting white screen diagnosis...');
    
    // Navigate to the enhanced agent manager
    const response = await page.goto('http://127.0.0.1:3001/agents-enhanced');
    
    // Check if page loaded successfully
    expect(response.status()).toBe(200);
    console.log('✅ Page response: 200 OK');
    
    // Wait for any initial loading
    await page.waitForTimeout(2000);
    
    // Check for React app mounting
    const reactRoot = await page.locator('#root').count();
    expect(reactRoot).toBe(1);
    console.log('✅ React root element found');
    
    // Check for content inside root
    const rootContent = await page.locator('#root').innerHTML();
    console.log('📄 Root content length:', rootContent.length);
    
    if (rootContent.trim() === '') {
      console.error('❌ CRITICAL: Root element is empty - WHITE SCREEN DETECTED');
      
      // Check browser console for errors
      const logs = await page.evaluate(() => {
        return {
          errors: window.console._errors || [],
          logs: window.console._logs || [],
          localStorage: localStorage.getItem('nld-logs')
        };
      });
      console.log('🔍 Browser state:', logs);
    }
    
    // Look for key indicators of successful render
    const indicators = [
      '[data-testid="enhanced-agent-manager"]',
      'h1:has-text("Enhanced Agent Manager")',
      'button[role="tab"]:has-text("Production")',
      'button[role="tab"]:has-text("Development")',
      'button[role="tab"]:has-text("Unified")',
    ];
    
    for (const selector of indicators) {
      const element = await page.locator(selector).count();
      console.log(`🔍 ${selector}: ${element > 0 ? '✅ Found' : '❌ Missing'}`);
    }
    
    // Check for error boundaries
    const errorBoundary = await page.locator('[data-testid="error-boundary"]').count();
    if (errorBoundary > 0) {
      const errorText = await page.locator('[data-testid="error-boundary"]').textContent();
      console.error('❌ Error boundary triggered:', errorText);
    }
    
    // Check for loading states
    const loading = await page.locator('[data-testid="loading-spinner"]').count();
    console.log(`🔍 Loading spinner: ${loading > 0 ? '⏳ Found (still loading)' : '✅ Not found (loaded)'}`);
    
    // Take screenshot for visual debugging
    await page.screenshot({ path: 'test-results/enhanced-agent-manager-debug.png', fullPage: true });
    
    // Final assertion - should not be white screen
    const hasContent = await page.locator('body').evaluate(body => {
      const text = body.textContent || '';
      const hasVisibleElements = body.querySelectorAll('*').length > 10;
      return text.trim().length > 0 && hasVisibleElements;
    });
    
    expect(hasContent).toBe(true);
    console.log('✅ Page has content - not a white screen');
  });

  test('should handle component errors gracefully', async ({ page }) => {
    console.log('🔍 Testing error handling...');
    
    await page.goto('http://127.0.0.1:3001/agents-enhanced');
    
    // Inject an error to test error boundaries
    await page.evaluate(() => {
      // Simulate component error
      window.postMessage({ type: 'SIMULATE_ERROR', component: 'EnhancedAgentManager' }, '*');
    });
    
    await page.waitForTimeout(1000);
    
    // Check if error boundary caught the error
    const errorBoundary = await page.locator('[data-testid="error-boundary"]');
    const errorCount = await errorBoundary.count();
    
    if (errorCount > 0) {
      console.log('✅ Error boundary is working');
      const errorMessage = await errorBoundary.textContent();
      console.log('📄 Error message:', errorMessage);
    }
  });

  test('should load required dependencies', async ({ page }) => {
    console.log('🔍 Checking dependencies...');
    
    await page.goto('http://127.0.0.1:3001/agents-enhanced');
    await page.waitForTimeout(1000);
    
    // Check if React is loaded
    const reactLoaded = await page.evaluate(() => {
      return typeof window.React !== 'undefined' || typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined';
    });
    console.log(`🔍 React: ${reactLoaded ? '✅ Loaded' : '❌ Missing'}`);
    
    // Check if the component is in the module system
    const moduleCheck = await page.evaluate(async () => {
      try {
        // Try to access the component
        return {
          hasEnhancedAgentManager: typeof window.EnhancedAgentManager !== 'undefined',
          hasModuleSystem: typeof window.webpackChunkApp !== 'undefined' || typeof window.__webpack_require__ !== 'undefined',
          moduleErrors: []
        };
      } catch (error) {
        return {
          hasEnhancedAgentManager: false,
          hasModuleSystem: false,
          moduleErrors: [error.message]
        };
      }
    });
    
    console.log('🔍 Module system:', moduleCheck);
  });

  test('should handle WebSocket connection properly', async ({ page }) => {
    console.log('🔍 Testing WebSocket integration...');
    
    await page.goto('http://127.0.0.1:3001/agents-enhanced');
    await page.waitForTimeout(2000);
    
    // Check WebSocket connection status
    const wsStatus = await page.evaluate(() => {
      return {
        websocketExists: typeof WebSocket !== 'undefined',
        connectionAttempts: window.__wsConnectionAttempts || 0,
        connectionErrors: window.__wsConnectionErrors || [],
        hasWebSocketSingleton: typeof window.__webSocketSingleton !== 'undefined'
      };
    });
    
    console.log('🔍 WebSocket status:', wsStatus);
    
    // The component should render even without WebSocket
    const hasContent = await page.locator('body').evaluate(body => body.textContent.trim().length > 0);
    expect(hasContent).toBe(true);
  });

  test('should render basic structure even with mock data', async ({ page }) => {
    console.log('🔍 Testing with mock data...');
    
    // Intercept API calls and return mock data
    await page.route('**/api/v1/claude-live/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          agents: [
            {
              id: 'test-1',
              name: 'Test Agent',
              display_name: 'Test Agent',
              description: 'Test agent for debugging',
              status: 'active',
              capabilities: ['test'],
              system: 'production'
            }
          ]
        })
      });
    });
    
    await page.goto('http://127.0.0.1:3001/agents-enhanced');
    await page.waitForTimeout(3000);
    
    // Should render with mock data
    const tabs = await page.locator('[role="tab"]').count();
    console.log(`🔍 Tab count: ${tabs}`);
    expect(tabs).toBeGreaterThan(0);
    
    // Should have agent manager title
    const title = await page.locator('h1:has-text("Enhanced Agent Manager")').count();
    console.log(`🔍 Title found: ${title > 0 ? '✅' : '❌'}`);
    expect(title).toBe(1);
  });

  test('should handle route-specific loading', async ({ page }) => {
    console.log('🔍 Testing route loading...');
    
    // First load the base app
    await page.goto('http://127.0.0.1:3001/');
    await page.waitForTimeout(1000);
    
    // Check if base app loads
    const baseLoaded = await page.locator('body').evaluate(body => body.textContent.trim().length > 0);
    console.log(`🔍 Base app: ${baseLoaded ? '✅ Loaded' : '❌ Failed'}`);
    
    // Navigate to enhanced agent manager via router
    await page.click('a[href="/agents-enhanced"]').catch(() => {
      console.log('⚠️ Navigation link not found, trying direct navigation');
    });
    
    await page.goto('http://127.0.0.1:3001/agents-enhanced');
    await page.waitForTimeout(3000);
    
    const enhancedLoaded = await page.locator('body').evaluate(body => body.textContent.trim().length > 0);
    console.log(`🔍 Enhanced agent manager: ${enhancedLoaded ? '✅ Loaded' : '❌ Failed'}`);
    expect(enhancedLoaded).toBe(true);
  });
});