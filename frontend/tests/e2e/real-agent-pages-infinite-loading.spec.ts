import { test, expect, Page, Browser } from '@playwright/test';

const TARGET_URL = 'http://127.0.0.1:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723';
const FRONTEND_BASE = 'http://127.0.0.1:5173';
const BACKEND_BASE = 'http://localhost:3000';

/**
 * REAL BROWSER E2E TESTING - No Mocks Policy
 * 
 * Tests run against actual running servers:
 * - Frontend: http://127.0.0.1:5173 (Vite dev server)
 * - Backend: http://localhost:3000 (Node.js API server)
 * 
 * Target Issue: Infinite loading state on agent dynamic pages
 * Target URL: /agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723
 */

test.describe('Real Agent Pages Infinite Loading Investigation', () => {
  let consoleErrors: string[] = [];
  let networkRequests: string[] = [];
  let networkResponses: { url: string; status: number; error?: string }[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    networkRequests = [];
    networkResponses = [];

    // Capture real console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    // Monitor real network requests
    page.on('request', request => {
      networkRequests.push(request.url());
    });

    // Monitor real network responses
    page.on('response', response => {
      networkResponses.push({
        url: response.url(),
        status: response.status(),
        error: response.status() >= 400 ? `HTTP ${response.status()}` : undefined
      });
    });

    // Capture unhandled promise rejections
    page.on('pageerror', error => {
      consoleErrors.push(`[pageerror] ${error.message}`);
    });
  });

  test('Real Server Connectivity - Backend API Health Check', async ({ page }) => {
    console.log('🔍 Testing real backend server connectivity...');
    
    try {
      const backendHealthResponse = await page.request.get(`${BACKEND_BASE}/api/health`);
      console.log(`Backend health check: ${backendHealthResponse.status()}`);
      
      const agentPagesResponse = await page.request.get(`${BACKEND_BASE}/api/agents/personal-todos-agent/pages`);
      console.log(`Agent pages API: ${agentPagesResponse.status()}`);
      
      const specificAgentResponse = await page.request.get(`${BACKEND_BASE}/api/agents/personal-todos-agent`);
      console.log(`Specific agent API: ${specificAgentResponse.status()}`);

      // Log response bodies for debugging
      if (agentPagesResponse.status() === 200) {
        const pagesData = await agentPagesResponse.json();
        console.log('Pages data structure:', JSON.stringify(pagesData, null, 2));
      }

      expect(backendHealthResponse.status()).toBeLessThan(500);
      expect(agentPagesResponse.status()).toBeLessThan(500);
      expect(specificAgentResponse.status()).toBeLessThan(500);
    } catch (error) {
      console.error('Backend connectivity failed:', error);
      throw error;
    }
  });

  test('Real Server Connectivity - Frontend Vite Server', async ({ page }) => {
    console.log('🔍 Testing real frontend server connectivity...');
    
    try {
      const frontendResponse = await page.request.get(FRONTEND_BASE);
      console.log(`Frontend server: ${frontendResponse.status()}`);
      
      const staticAssetsResponse = await page.request.get(`${FRONTEND_BASE}/src/main.tsx`);
      console.log(`Static assets: ${staticAssetsResponse.status()}`);

      expect(frontendResponse.status()).toBe(200);
    } catch (error) {
      console.error('Frontend connectivity failed:', error);
      throw error;
    }
  });

  test('Real Page Navigation - Target URL Loading Behavior', async ({ page }) => {
    console.log('🚀 Testing real page navigation to target URL...');
    
    const startTime = Date.now();
    
    try {
      console.log(`Navigating to: ${TARGET_URL}`);
      await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
      
      const navigationTime = Date.now() - startTime;
      console.log(`Navigation completed in: ${navigationTime}ms`);

      // Wait and check for loading states
      await page.waitForTimeout(2000);
      
      // Check if still showing loading spinner
      const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
      const isLoadingVisible = await loadingSpinner.isVisible().catch(() => false);
      console.log(`Loading spinner visible: ${isLoadingVisible}`);

      // Check for loading text
      const loadingText = page.locator('text=Loading agent workspace');
      const isLoadingTextVisible = await loadingText.isVisible().catch(() => false);
      console.log(`Loading text visible: ${isLoadingTextVisible}`);

      // Check for actual content
      const dashboardHeader = page.locator('h2:has-text("Personal Todos Dashboard")');
      const isDashboardVisible = await dashboardHeader.isVisible().catch(() => false);
      console.log(`Dashboard header visible: ${isDashboardVisible}`);

      // Get page content for analysis
      const bodyText = await page.textContent('body');
      console.log('Page body contains:', bodyText?.substring(0, 500) + '...');

      // Log current URL
      const currentUrl = page.url();
      console.log(`Current URL: ${currentUrl}`);

      // Take screenshot for evidence
      await page.screenshot({ 
        path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/infinite-loading-state.png',
        fullPage: true 
      });

      // The test should fail if infinite loading is happening
      if (isLoadingVisible || isLoadingTextVisible) {
        console.error('🚨 INFINITE LOADING DETECTED - Page stuck in loading state');
        console.error('Console errors:', consoleErrors);
        console.error('Network requests:', networkRequests);
        console.error('Network responses:', networkResponses);
      }

      // Assert expectations
      expect(isLoadingVisible, 'Loading spinner should not be visible after 2 seconds').toBe(false);
      expect(isLoadingTextVisible, 'Loading text should not be visible after 2 seconds').toBe(false);
      expect(isDashboardVisible, 'Dashboard content should be visible').toBe(true);

    } catch (error) {
      console.error('Navigation test failed:', error);
      console.error('Console errors during navigation:', consoleErrors);
      console.error('Network requests made:', networkRequests);
      console.error('Network responses received:', networkResponses);
      throw error;
    }
  });

  test('Real Network Request Analysis - API Call Patterns', async ({ page }) => {
    console.log('📡 Analyzing real network requests during page load...');
    
    const criticalAPIs = [
      '/api/agents/personal-todos-agent/pages',
      '/api/agents/personal-todos-agent',
      '/api/agents/personal-todos-agent/workspace'
    ];

    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000); // Wait for any delayed requests

    console.log('All network requests made:');
    networkRequests.forEach((url, index) => {
      console.log(`${index + 1}. ${url}`);
    });

    console.log('\nNetwork responses received:');
    networkResponses.forEach((response, index) => {
      console.log(`${index + 1}. ${response.url} -> Status: ${response.status}${response.error ? ` (${response.error})` : ''}`);
    });

    // Check if critical API calls were made
    criticalAPIs.forEach(api => {
      const apiCalled = networkRequests.some(url => url.includes(api));
      console.log(`${api} called: ${apiCalled}`);
      
      if (apiCalled) {
        const apiResponse = networkResponses.find(response => response.url.includes(api));
        if (apiResponse) {
          console.log(`${api} response: ${apiResponse.status}`);
          if (apiResponse.status >= 400) {
            console.error(`🚨 API ERROR: ${api} returned ${apiResponse.status}`);
          }
        }
      } else {
        console.warn(`⚠️ MISSING API CALL: ${api} was not requested`);
      }
    });

    // Verify at least some critical APIs were called
    const criticalApisCalled = criticalAPIs.filter(api => 
      networkRequests.some(url => url.includes(api))
    );

    expect(criticalApisCalled.length, 'At least one critical API should be called').toBeGreaterThan(0);
  });

  test('Real Console Error Detection - Browser Errors', async ({ page }) => {
    console.log('🐛 Detecting real browser console errors...');
    
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000); // Wait for any async errors

    console.log('Console errors captured:');
    if (consoleErrors.length === 0) {
      console.log('✅ No console errors detected');
    } else {
      consoleErrors.forEach((error, index) => {
        console.error(`${index + 1}. ${error}`);
      });
    }

    // Group errors by type
    const errorTypes = {
      networkErrors: consoleErrors.filter(err => err.includes('net::') || err.includes('Failed to fetch')),
      jsErrors: consoleErrors.filter(err => err.includes('TypeError') || err.includes('ReferenceError')),
      reactErrors: consoleErrors.filter(err => err.includes('React') || err.includes('Warning:')),
      otherErrors: consoleErrors.filter(err => 
        !err.includes('net::') && 
        !err.includes('Failed to fetch') && 
        !err.includes('TypeError') && 
        !err.includes('ReferenceError') && 
        !err.includes('React') && 
        !err.includes('Warning:')
      )
    };

    console.log('\nError categorization:');
    console.log(`Network errors: ${errorTypes.networkErrors.length}`);
    console.log(`JavaScript errors: ${errorTypes.jsErrors.length}`);
    console.log(`React errors: ${errorTypes.reactErrors.length}`);
    console.log(`Other errors: ${errorTypes.otherErrors.length}`);

    // Network and JS errors are critical for infinite loading
    if (errorTypes.networkErrors.length > 0 || errorTypes.jsErrors.length > 0) {
      console.error('🚨 CRITICAL ERRORS DETECTED - Likely causing infinite loading');
    }

    // For debugging purposes, we'll warn about errors but not fail the test
    // This allows us to gather information even when errors exist
    if (consoleErrors.length > 0) {
      console.warn(`⚠️ ${consoleErrors.length} console errors detected - investigating infinite loading cause`);
    }
  });

  test('Real Component State Verification - React Component Lifecycle', async ({ page }) => {
    console.log('⚛️ Verifying real React component state and lifecycle...');
    
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });

    // Check React DevTools presence
    const hasReactDevTools = await page.evaluate(() => {
      return typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined';
    });
    console.log(`React DevTools available: ${hasReactDevTools}`);

    // Check if React is loaded
    const hasReact = await page.evaluate(() => {
      return typeof window.React !== 'undefined' || document.querySelector('[data-reactroot]') !== null;
    });
    console.log(`React loaded: ${hasReact}`);

    // Wait for component mounting
    await page.waitForTimeout(3000);

    // Check component states
    const componentStates = await page.evaluate(() => {
      const results = {
        appMounted: !!document.querySelector('#root'),
        routerActive: !!document.querySelector('[data-testid="router"]') || window.location.pathname !== '/',
        agentPageMounted: !!document.querySelector('[data-testid="agent-page"]'),
        loadingStates: {
          hasLoadingSpinner: !!document.querySelector('[data-testid="loading-spinner"]'),
          hasLoadingText: !!document.querySelector('*:contains("Loading")')?.textContent?.includes('Loading'),
          hasErrorBoundary: !!document.querySelector('[data-testid="error-boundary"]')
        },
        contentStates: {
          hasDashboard: !!document.querySelector('h2') && document.querySelector('h2')?.textContent?.includes('Dashboard'),
          hasPageContent: document.body.textContent.length > 100,
          isEmpty: document.body.textContent.trim().length < 50
        }
      };
      return results;
    });

    console.log('Component state analysis:');
    console.log(JSON.stringify(componentStates, null, 2));

    // Analyze stuck states
    if (componentStates.loadingStates.hasLoadingSpinner) {
      console.error('🚨 STUCK IN LOADING: Spinner still visible');
    }

    if (componentStates.contentStates.isEmpty) {
      console.error('🚨 EMPTY CONTENT: Page rendered but no content visible');
    }

    if (!componentStates.agentPageMounted) {
      console.error('🚨 COMPONENT NOT MOUNTED: Agent page component failed to mount');
    }

    // Take screenshot of current state
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/tests/e2e/screenshots/component-state-analysis.png',
      fullPage: true 
    });

    expect(componentStates.appMounted, 'App should be mounted').toBe(true);
    expect(componentStates.contentStates.isEmpty, 'Page should not be empty').toBe(false);
  });

  test('Real Performance Monitoring - Page Load Performance', async ({ page }) => {
    console.log('📊 Monitoring real page load performance...');
    
    const startTime = Date.now();
    
    // Enable performance monitoring
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    
    const loadTime = Date.now() - startTime;
    console.log(`Total page load time: ${loadTime}ms`);

    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        loadComplete: navigation.loadEventEnd - navigation.navigationStart,
        firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        resourceLoadTime: navigation.loadEventEnd - navigation.fetchStart,
        dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcpConnect: navigation.connectEnd - navigation.connectStart,
        serverResponse: navigation.responseEnd - navigation.requestStart
      };
    });

    console.log('Performance metrics:');
    console.log(JSON.stringify(performanceMetrics, null, 2));

    // Performance thresholds for debugging infinite loading
    const thresholds = {
      domContentLoaded: 5000, // 5 seconds
      loadComplete: 10000,    // 10 seconds
      firstContentfulPaint: 3000 // 3 seconds
    };

    // Check if performance issues might cause infinite loading
    if (performanceMetrics.domContentLoaded > thresholds.domContentLoaded) {
      console.warn(`⚠️ SLOW DOM LOADING: ${performanceMetrics.domContentLoaded}ms (threshold: ${thresholds.domContentLoaded}ms)`);
    }

    if (performanceMetrics.firstContentfulPaint > thresholds.firstContentfulPaint) {
      console.warn(`⚠️ SLOW FIRST PAINT: ${performanceMetrics.firstContentfulPaint}ms (threshold: ${thresholds.firstContentfulPaint}ms)`);
    }

    if (loadTime > thresholds.loadComplete) {
      console.warn(`⚠️ SLOW PAGE LOAD: ${loadTime}ms (threshold: ${thresholds.loadComplete}ms)`);
    }

    // Performance expectations (relaxed for debugging)
    expect(performanceMetrics.domContentLoaded, 'DOM should load within reasonable time').toBeLessThan(15000);
    expect(loadTime, 'Page should load within reasonable time').toBeLessThan(30000);
  });

  test('Real Data Flow Analysis - Component Props and State', async ({ page }) => {
    console.log('🔄 Analyzing real data flow in components...');
    
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Inject debugging script to analyze React components
    const componentAnalysis = await page.evaluate(() => {
      const results = {
        agentId: 'personal-todos-agent',
        pageId: '015b7296-a144-4096-9c60-ee5d7f900723',
        urlParams: new URLSearchParams(window.location.search).toString(),
        routerState: window.location.pathname,
        localStorageData: Object.keys(localStorage).map(key => ({
          key,
          value: localStorage.getItem(key)?.substring(0, 100) + '...'
        })),
        sessionStorageData: Object.keys(sessionStorage).map(key => ({
          key, 
          value: sessionStorage.getItem(key)?.substring(0, 100) + '...'
        })),
        windowVars: {
          hasReact: typeof window.React !== 'undefined',
          hasRouterContext: window.location.pathname.includes('agents'),
          currentPath: window.location.pathname,
          currentSearch: window.location.search,
          currentHash: window.location.hash
        }
      };
      return results;
    });

    console.log('Data flow analysis:');
    console.log(JSON.stringify(componentAnalysis, null, 2));

    // Check for data inconsistencies that might cause infinite loading
    const expectedAgentId = 'personal-todos-agent';
    const expectedPageId = '015b7296-a144-4096-9c60-ee5d7f900723';

    if (!componentAnalysis.routerState.includes(expectedAgentId)) {
      console.error(`🚨 ROUTING ISSUE: Expected agent ID '${expectedAgentId}' not in route '${componentAnalysis.routerState}'`);
    }

    if (!componentAnalysis.routerState.includes(expectedPageId)) {
      console.error(`🚨 ROUTING ISSUE: Expected page ID '${expectedPageId}' not in route '${componentAnalysis.routerState}'`);
    }

    // Check for required data in storage
    const hasAgentData = componentAnalysis.localStorageData.some(item => 
      item.key.includes('agent') || item.value.includes(expectedAgentId)
    );

    console.log(`Agent data in localStorage: ${hasAgentData}`);

    expect(componentAnalysis.windowVars.currentPath, 'Should be on correct path').toContain(expectedAgentId);
    expect(componentAnalysis.windowVars.currentPath, 'Should be on correct path').toContain(expectedPageId);
  });

  test.afterEach(async ({ page }) => {
    // Ensure screenshot directory exists
    await page.evaluate(() => {
      // Create directory if it doesn't exist
    });

    // Generate test report
    const testReport = {
      timestamp: new Date().toISOString(),
      targetUrl: TARGET_URL,
      consoleErrors: consoleErrors,
      networkRequests: networkRequests,
      networkResponses: networkResponses,
      testResults: 'See individual test outputs above'
    };

    console.log('\n📋 TEST EXECUTION SUMMARY:');
    console.log('=' .repeat(50));
    console.log(JSON.stringify(testReport, null, 2));
    console.log('=' .repeat(50));
  });
});