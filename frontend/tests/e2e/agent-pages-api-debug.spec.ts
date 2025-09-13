import { test, expect } from '../config/test-setup';
import { TEST_CONFIG, TEST_SCENARIOS } from '../config/test-setup';

test.describe('Agent Pages API Debug Suite', () => {
  test('Debug: API call sequence analysis', async ({ page, debugger }) => {
    console.log('🔍 Starting API call sequence analysis');
    
    // Navigate to the problematic URL directly
    const targetUrl = `${TEST_CONFIG.BASE_URL}${TEST_SCENARIOS.AGENT_PAGES_FLOW.expectedUrl}`;
    console.log(`🎯 Testing URL: ${targetUrl}`);
    
    await page.goto(targetUrl);
    await page.waitForLoadState('networkidle');
    
    // Wait additional time for potential delayed API calls
    await page.waitForTimeout(2000);
    
    const apiCalls = debugger.getApiCalls();
    console.log(`📊 Total API calls captured: ${apiCalls.length}`);
    
    // Analyze API call patterns
    const agentCalls = debugger.getApiCallsForPattern('/api/agents');
    const pageCalls = debugger.getApiCallsForPattern('/api/pages');
    const workspaceCalls = debugger.getApiCallsForPattern('/workspace');
    
    console.log(`🤖 Agent API calls: ${agentCalls.length}`);
    console.log(`📄 Page API calls: ${pageCalls.length}`);
    console.log(`🏢 Workspace API calls: ${workspaceCalls.length}`);
    
    // Log detailed API call information
    apiCalls.forEach((call, index) => {
      console.log(`📡 API Call ${index + 1}:`);
      console.log(`   Method: ${call.method}`);
      console.log(`   URL: ${call.url}`);
      console.log(`   Status: ${call.status}`);
      console.log(`   Timestamp: ${call.timestamp}ms`);
      
      if (call.response) {
        console.log(`   Response: ${JSON.stringify(call.response).substring(0, 200)}...`);
      }
    });
    
    // Check for expected API endpoints
    const expectedEndpoints = [
      '/api/agents/personal-todos-agent',
      '/api/agents/personal-todos-agent/pages',
      '/api/workspace/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d'
    ];
    
    const missingEndpoints = [];
    const foundEndpoints = [];
    
    for (const endpoint of expectedEndpoints) {
      const found = apiCalls.some(call => call.url.includes(endpoint));
      if (found) {
        foundEndpoints.push(endpoint);
      } else {
        missingEndpoints.push(endpoint);
      }
    }
    
    console.log(`✅ Found endpoints: ${foundEndpoints.length}`);
    foundEndpoints.forEach(endpoint => console.log(`   - ${endpoint}`));
    
    console.log(`❌ Missing endpoints: ${missingEndpoints.length}`);
    missingEndpoints.forEach(endpoint => console.log(`   - ${endpoint}`));
    
    // Check page content state
    const pageContent = await page.textContent('body');
    const hasEmptyState = pageContent?.includes('No pages yet') || pageContent?.includes('no pages');
    const hasPageContent = pageContent?.includes('page content') || pageContent?.includes('Page:');
    
    console.log(`📄 Has empty state: ${hasEmptyState}`);
    console.log(`📄 Has page content: ${hasPageContent}`);
    
    // Generate debug report
    const report = debugger.generateDebugReport();
    console.log('\n=== API DEBUG REPORT ===');
    console.log(report);
    
    // Assertions
    expect(apiCalls.length).toBeGreaterThan(0);
    expect(missingEndpoints.length).toBe(0);
    expect(hasEmptyState).toBe(false);
  });

  test('Debug: Backend API availability check', async ({ page }) => {
    console.log('🌐 Checking backend API availability');
    
    const endpoints = [
      '/api/health',
      '/api/agents',
      '/api/agents/personal-todos-agent',
      '/api/agents/personal-todos-agent/pages',
      '/api/workspace/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await page.goto(`${TEST_CONFIG.BASE_URL}${endpoint}`);
        const status = response?.status() || 0;
        const text = await response?.text() || '';
        
        console.log(`🔍 ${endpoint} → ${status}`);
        
        if (status === 200 && text) {
          try {
            const json = JSON.parse(text);
            console.log(`   Data: ${JSON.stringify(json).substring(0, 100)}...`);
          } catch (e) {
            console.log(`   Text: ${text.substring(0, 100)}...`);
          }
        }
        
        expect(status).toBeLessThan(500);
        
      } catch (error) {
        console.log(`❌ ${endpoint} → Error: ${error}`);
      }
    }
  });

  test('Debug: Request/Response timing analysis', async ({ page, debugger }) => {
    console.log('⏱️  Starting timing analysis');
    
    const startTime = Date.now();
    
    // Navigate and measure timing
    await page.goto(`${TEST_CONFIG.BASE_URL}/agents`);
    const agentsPageTime = Date.now() - startTime;
    console.log(`📊 Agents page load: ${agentsPageTime}ms`);
    
    await page.waitForLoadState('networkidle');
    const networkIdleTime = Date.now() - startTime;
    console.log(`📊 Network idle: ${networkIdleTime}ms`);
    
    // Navigate to specific page
    const pageNavigateStart = Date.now();
    await page.goto(`${TEST_CONFIG.BASE_URL}${TEST_SCENARIOS.AGENT_PAGES_FLOW.expectedUrl}`);
    await page.waitForLoadState('networkidle');
    const pageNavigateTime = Date.now() - pageNavigateStart;
    console.log(`📊 Page navigation: ${pageNavigateTime}ms`);
    
    // Wait for potential delayed API calls
    await page.waitForTimeout(3000);
    
    const apiCalls = debugger.getApiCalls();
    
    // Analyze API call timing
    if (apiCalls.length > 0) {
      const apiTimings = apiCalls.map(call => call.timestamp).sort((a, b) => a - b);
      const firstApiCall = apiTimings[0];
      const lastApiCall = apiTimings[apiTimings.length - 1];
      const apiWindow = lastApiCall - firstApiCall;
      
      console.log(`📊 First API call: ${firstApiCall}ms`);
      console.log(`📊 Last API call: ${lastApiCall}ms`);
      console.log(`📊 API window: ${apiWindow}ms`);
      
      // Check for delayed API calls
      const delayedCalls = apiCalls.filter(call => call.timestamp > 5000);
      if (delayedCalls.length > 0) {
        console.log(`⚠️  Found ${delayedCalls.length} delayed API calls (>5s)`);
        delayedCalls.forEach(call => {
          console.log(`   - ${call.url} at ${call.timestamp}ms`);
        });
      }
    }
    
    // Performance metrics
    const performanceMetrics = await debugger.captureNetworkWaterfall(page);
    console.log(`📊 Performance entries: ${performanceMetrics.length}`);
    
    // Find slow resources
    const slowResources = performanceMetrics
      .filter(entry => entry.duration > 1000)
      .sort((a, b) => b.duration - a.duration);
    
    if (slowResources.length > 0) {
      console.log(`🐌 Slow resources (>1s):`);
      slowResources.forEach(resource => {
        console.log(`   - ${resource.name}: ${resource.duration.toFixed(0)}ms`);
      });
    }
    
    expect(pageNavigateTime).toBeLessThan(10000); // Should load within 10s
  });

  test('Debug: Error response analysis', async ({ page }) => {
    console.log('🚨 Starting error response analysis');
    
    const errors: any[] = [];
    const warnings: any[] = [];
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({
          type: 'console_error',
          text: msg.text(),
          timestamp: Date.now()
        });
      } else if (msg.type() === 'warn') {
        warnings.push({
          type: 'console_warning', 
          text: msg.text(),
          timestamp: Date.now()
        });
      }
    });
    
    // Capture page errors
    page.on('pageerror', error => {
      errors.push({
        type: 'page_error',
        text: error.toString(),
        stack: error.stack,
        timestamp: Date.now()
      });
    });
    
    // Capture failed requests
    page.on('response', response => {
      if (response.status() >= 400) {
        errors.push({
          type: 'http_error',
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: Date.now()
        });
      }
    });
    
    // Navigate to problematic page
    await page.goto(`${TEST_CONFIG.BASE_URL}${TEST_SCENARIOS.AGENT_PAGES_FLOW.expectedUrl}`);
    await page.waitForLoadState('networkidle');
    
    // Wait for potential delayed errors
    await page.waitForTimeout(3000);
    
    console.log(`🚨 Found ${errors.length} errors`);
    errors.forEach((error, index) => {
      console.log(`❌ Error ${index + 1} [${error.type}]: ${error.text || error.url}`);
      if (error.stack) {
        console.log(`   Stack: ${error.stack.substring(0, 200)}...`);
      }
    });
    
    console.log(`⚠️  Found ${warnings.length} warnings`);
    warnings.forEach((warning, index) => {
      console.log(`⚠️  Warning ${index + 1}: ${warning.text}`);
    });
    
    // Check for specific error patterns
    const networkErrors = errors.filter(e => e.type === 'http_error');
    const jsErrors = errors.filter(e => e.type === 'console_error' || e.type === 'page_error');
    
    console.log(`📊 Network errors: ${networkErrors.length}`);
    console.log(`📊 JavaScript errors: ${jsErrors.length}`);
    
    // Look for common error patterns
    const commonPatterns = [
      'Cannot read property',
      'Cannot read properties of undefined',
      'TypeError',
      'ReferenceError',
      'Failed to fetch',
      '404',
      '500',
      'CORS'
    ];
    
    const patternMatches = commonPatterns.map(pattern => ({
      pattern,
      matches: errors.filter(error => 
        error.text?.includes(pattern) || error.url?.includes(pattern)
      ).length
    })).filter(p => p.matches > 0);
    
    if (patternMatches.length > 0) {
      console.log(`🔍 Error pattern analysis:`);
      patternMatches.forEach(match => {
        console.log(`   - ${match.pattern}: ${match.matches} occurrences`);
      });
    }
    
    // Critical errors should not occur
    const criticalErrors = errors.filter(error => 
      error.text?.includes('500') || 
      error.text?.includes('TypeError') ||
      error.status >= 500
    );
    
    expect(criticalErrors.length).toBe(0);
  });
});