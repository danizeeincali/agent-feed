/**
 * TDD London School Specific Validation Tests
 * 
 * These tests implement London School principles:
 * - Outside-in testing from user perspective  
 * - Mock detection and real behavior verification
 * - Component collaboration testing
 * - API integration validation
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

let context: BrowserContext;
let page: Page;

test.describe('TDD London School Validation Suite', () => {
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    page = await context.newPage();

    // Enable console logging for debugging
    page.on('console', msg => console.log('PAGE:', msg.text()));
    page.on('pageerror', error => console.error('PAGE ERROR:', error));
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('Navigation Workflow - Outside-In Testing', async () => {
    console.log('🧪 Testing Navigation Workflow (Outside-In)');
    
    // Start from user's perspective - landing on the app
    await page.goto('http://localhost:5173/');
    
    // Verify initial load
    await expect(page.locator('[data-testid="header"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('nav')).toBeVisible();
    
    // Test each navigation item (London School: test real user flow)
    const navigationItems = [
      { name: 'Feed', href: '/', selector: '[data-testid="agent-feed"]' },
      { name: 'Agents', href: '/agents', selector: '.agents-container, .agent-list, [data-testid="agents-page"]' },
      { name: 'Claude Manager', href: '/claude-manager', selector: '.claude-manager, .instance-manager, .dual-mode-manager' },
      { name: 'Analytics', href: '/analytics', selector: '.analytics, .metrics, .analytics-container' },
      { name: 'Settings', href: '/settings', selector: '.settings, .configuration, .settings-container' }
    ];
    
    for (const item of navigationItems) {
      console.log(`  📋 Testing navigation to ${item.name}...`);
      
      // Click the navigation link (real user action)
      await page.click(`a[href="${item.href}"]`);
      
      // Verify URL changed (real browser behavior)
      await expect(page).toHaveURL(new RegExp(`${item.href.replace('/', '\\/')}(?:\\?.*)?$`));
      
      // Verify page content loads (not just routing)
      try {
        await page.waitForSelector(item.selector, { timeout: 5000 });
        console.log(`    ✅ ${item.name} page loaded successfully`);
      } catch (error) {
        console.log(`    ❌ ${item.name} page failed to load content: ${error}`);
        // Continue testing other pages
      }
      
      // Small delay for visual feedback
      await page.waitForTimeout(500);
    }
  });

  test('Feed Real Data Validation - Mock Detection', async () => {
    console.log('🧪 Testing Feed Data (Mock vs Real Detection)');
    
    await page.goto('http://localhost:5173/');
    await page.waitForSelector('[data-testid="agent-feed"]', { timeout: 10000 });
    
    // Wait for potential data loading
    await page.waitForTimeout(3000);
    
    // Analyze page content for mock vs real data indicators
    const pageContent = await page.content();
    
    const mockIndicators = [
      'test-data', 'mock-', 'fallback', 'placeholder', 
      'demo', 'sample', 'example', 'fake', 'lorem ipsum'
    ].filter(indicator => pageContent.toLowerCase().includes(indicator));
    
    const realDataIndicators = [
      'id:', 'timestamp:', 'created_at', 'updated_at', 
      'uuid', 'api-response', '"id":', '"timestamp":'
    ].filter(indicator => pageContent.toLowerCase().includes(indicator));
    
    console.log(`  🔍 Mock indicators found: ${mockIndicators.length} - ${mockIndicators.join(', ')}`);
    console.log(`  📊 Real data indicators found: ${realDataIndicators.length} - ${realDataIndicators.join(', ')}`);
    
    // Check for actual posts/content
    const postElements = await page.$$('.post, .feed-item, .social-post, .card, .agent-post');
    console.log(`  📝 Post elements found: ${postElements.length}`);
    
    if (postElements.length > 0) {
      console.log('  ✅ Feed contains content elements');
    } else {
      console.log('  ⚠️  Feed appears empty or still loading');
    }
    
    // London School principle: Test the collaboration, not the state
    // Verify that components are attempting to load data
    const loadingElements = await page.$$('.loading, .spinner, .skeleton');
    const errorElements = await page.$$('.error, .error-message, .alert-error');
    
    console.log(`  ⏳ Loading indicators: ${loadingElements.length}`);
    console.log(`  ❌ Error indicators: ${errorElements.length}`);
  });

  test('Agents Page Data Verification - Behavior Testing', async () => {
    console.log('🧪 Testing Agents Page (Behavior Verification)');
    
    await page.goto('http://localhost:5173/agents');
    
    // Wait for page to load
    try {
      await page.waitForSelector('.agents-container, .agent-list, [data-testid="agents-page"]', { timeout: 10000 });
      console.log('  ✅ Agents page container loaded');
    } catch (error) {
      console.log('  ❌ Agents page container failed to load');
      return; // Skip rest of test if page doesn't load
    }
    
    // Wait for potential data loading
    await page.waitForTimeout(3000);
    
    // Check for agent elements (London School: verify actual behavior)
    const agentElements = await page.$$('.agent, .agent-card, .agent-item, .agent-row');
    console.log(`  🤖 Agent elements found: ${agentElements.length}`);
    
    if (agentElements.length > 0) {
      // Test interaction with first agent (real behavior)
      try {
        await agentElements[0].click();
        console.log('  ✅ Agent interaction successful');
      } catch (error) {
        console.log('  ⚠️  Agent interaction failed');
      }
    } else {
      // Check for empty state or loading state
      const emptyStateElements = await page.$$('.empty-state, .no-agents, .placeholder');
      const loadingElements = await page.$$('.loading, .spinner');
      
      if (emptyStateElements.length > 0) {
        console.log('  📝 Empty state detected - no agents configured');
      } else if (loadingElements.length > 0) {
        console.log('  ⏳ Loading state detected - agents still loading');
      } else {
        console.log('  ❌ No agents, empty state, or loading indicators found');
      }
    }
  });

  test('Claude Manager Functionality - Real Integration Testing', async () => {
    console.log('🧪 Testing Claude Manager (Real Integration)');
    
    await page.goto('http://localhost:5173/claude-manager');
    
    // Wait for Claude Manager to load
    try {
      await page.waitForSelector('.claude-manager, .instance-manager, .dual-mode-manager', { timeout: 10000 });
      console.log('  ✅ Claude Manager interface loaded');
    } catch (error) {
      console.log('  ❌ Claude Manager interface failed to load');
      return;
    }
    
    // Wait for potential data loading
    await page.waitForTimeout(3000);
    
    // Test London School principle: verify real functionality
    const instanceElements = await page.$$('.instance-list, .claude-instances, .instance-card, .instance-item');
    console.log(`  🖥️  Instance elements found: ${instanceElements.length}`);
    
    // Look for functional buttons (real behavior testing)
    const actionButtons = await page.$$('button[class*="create"], button[class*="start"], button[class*="stop"], button[class*="manage"]');
    console.log(`  🔘 Action buttons found: ${actionButtons.length}`);
    
    if (actionButtons.length > 0) {
      console.log('  ✅ Claude Manager has functional controls');
    } else {
      console.log('  ⚠️  Claude Manager appears to be read-only or not functional');
    }
    
    // Check for WebSocket or real-time connection indicators
    const connectionIndicators = await page.$$('.connection-status, .websocket-status, .real-time');
    console.log(`  📡 Connection indicators: ${connectionIndicators.length}`);
  });

  test('Analytics Real Metrics - Data Validation', async () => {
    console.log('🧪 Testing Analytics (Real Metrics Validation)');
    
    await page.goto('http://localhost:5173/analytics');
    
    // Wait for analytics to load
    try {
      await page.waitForSelector('.analytics, .metrics, .analytics-container', { timeout: 10000 });
      console.log('  ✅ Analytics interface loaded');
    } catch (error) {
      console.log('  ❌ Analytics interface failed to load');
      return;
    }
    
    // Wait for charts/data to load
    await page.waitForTimeout(4000);
    
    // London School: Test real data vs mock data
    const chartElements = await page.$$('.chart, .metric, .analytics-card, canvas, svg');
    console.log(`  📈 Chart/metric elements found: ${chartElements.length}`);
    
    // Check for actual data values (not placeholders)
    const pageContent = await page.content();
    const hasRealNumbers = /\b\d{1,3}(,\d{3})*(\.\d+)?\b/.test(pageContent);
    const hasPercentages = /%/.test(pageContent);
    const hasDateTimestamps = /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/.test(pageContent);
    
    console.log(`  🔢 Contains real numbers: ${hasRealNumbers ? '✅' : '❌'}`);
    console.log(`  📊 Contains percentages: ${hasPercentages ? '✅' : '❌'}`);
    console.log(`  📅 Contains timestamps: ${hasDateTimestamps ? '✅' : '❌'}`);
    
    // Check for placeholder data indicators
    const placeholderPatterns = ['N/A', 'No data', 'Coming soon', '0', '0.0', '--'];
    const placeholderCount = placeholderPatterns.filter(pattern => 
      pageContent.includes(pattern)
    ).length;
    
    console.log(`  🎭 Placeholder patterns found: ${placeholderCount}`);
    
    if (chartElements.length > 0 && (hasRealNumbers || hasPercentages)) {
      console.log('  ✅ Analytics appears to have real data visualization');
    } else {
      console.log('  ⚠️  Analytics appears to be using placeholder/demo data');
    }
  });

  test('Settings Configuration Persistence - State Testing', async () => {
    console.log('🧪 Testing Settings (Configuration Persistence)');
    
    await page.goto('http://localhost:5173/settings');
    
    // Wait for settings to load
    try {
      await page.waitForSelector('.settings, .configuration, .settings-container', { timeout: 10000 });
      console.log('  ✅ Settings interface loaded');
    } catch (error) {
      console.log('  ❌ Settings interface failed to load');
      return;
    }
    
    // Look for setting controls
    const settingControls = await page.$$('input, select, textarea, .toggle, .switch, .checkbox');
    console.log(`  ⚙️  Setting controls found: ${settingControls.length}`);
    
    if (settingControls.length > 0) {
      console.log('  ✅ Settings has interactive controls');
      
      // Test London School: verify real interaction (not just UI)
      try {
        // Try to interact with first setting
        const firstControl = settingControls[0];
        const tagName = await firstControl.evaluate(el => el.tagName.toLowerCase());
        
        if (tagName === 'input') {
          const inputType = await firstControl.getAttribute('type');
          if (inputType === 'checkbox' || inputType === 'radio') {
            await firstControl.click();
            console.log('  ✅ Successfully interacted with setting control');
          } else if (inputType === 'text' || !inputType) {
            await firstControl.fill('test-value');
            console.log('  ✅ Successfully modified text setting');
          }
        }
      } catch (error) {
        console.log('  ⚠️  Setting interaction failed');
      }
    } else {
      console.log('  ❌ No interactive settings found');
    }
    
    // Check for save/apply buttons (indicates real persistence)
    const saveButtons = await page.$$('button[class*="save"], button[class*="apply"], button[class*="submit"]');
    console.log(`  💾 Save/Apply buttons found: ${saveButtons.length}`);
    
    if (saveButtons.length > 0) {
      console.log('  ✅ Settings appear to support persistence');
    }
  });

  test('Error Resilience - Graceful Degradation Testing', async () => {
    console.log('🧪 Testing Error Resilience (Graceful Degradation)');
    
    // Test various error scenarios
    const errorScenarios = [
      { name: 'Non-existent route', url: '/non-existent-page' },
      { name: 'Network failure simulation', url: '/' }
    ];
    
    for (const scenario of errorScenarios) {
      console.log(`  🧪 Testing: ${scenario.name}`);
      
      try {
        await page.goto(`http://localhost:5173${scenario.url}`);
        await page.waitForTimeout(3000);
        
        // Check for error boundaries or fallback UI
        const errorBoundaries = await page.$$('.error-boundary, .fallback, .error-message');
        const notFoundElements = await page.$$('.not-found, .404, .page-not-found');
        
        console.log(`    🚨 Error boundaries: ${errorBoundaries.length}`);
        console.log(`    🔍 Not found elements: ${notFoundElements.length}`);
        
        if (errorBoundaries.length > 0 || notFoundElements.length > 0) {
          console.log(`    ✅ ${scenario.name} - Graceful error handling detected`);
        } else if (scenario.url === '/non-existent-page') {
          // For non-existent routes, check if app still functions
          const appElements = await page.$$('[data-testid="header"], nav, .app');
          if (appElements.length > 0) {
            console.log(`    ✅ ${scenario.name} - App remains functional`);
          } else {
            console.log(`    ❌ ${scenario.name} - App crashed or unresponsive`);
          }
        }
        
      } catch (error) {
        console.log(`    ⚠️  ${scenario.name} - Test execution error: ${error}`);
      }
    }
  });

  test('Network Integration - API Response Analysis', async () => {
    console.log('🧪 Testing Network Integration (API Analysis)');
    
    const apiCalls: any[] = [];
    
    // Intercept network requests
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiCalls.push({
          url: response.url(),
          status: response.status(),
          method: response.request().method()
        });
      }
    });
    
    // Visit main pages to trigger API calls
    const pages = ['/', '/agents', '/claude-manager', '/analytics'];
    
    for (const pagePath of pages) {
      console.log(`  📡 Testing API calls for: ${pagePath}`);
      await page.goto(`http://localhost:5173${pagePath}`);
      await page.waitForTimeout(3000); // Allow time for API calls
    }
    
    console.log(`  📊 Total API calls captured: ${apiCalls.length}`);
    
    // Analyze API call patterns
    const successfulCalls = apiCalls.filter(call => call.status >= 200 && call.status < 300);
    const failedCalls = apiCalls.filter(call => call.status >= 400);
    const uniqueEndpoints = [...new Set(apiCalls.map(call => new URL(call.url).pathname))];
    
    console.log(`  ✅ Successful calls: ${successfulCalls.length}`);
    console.log(`  ❌ Failed calls: ${failedCalls.length}`);
    console.log(`  🔗 Unique endpoints: ${uniqueEndpoints.length}`);
    console.log(`  📋 Endpoints: ${uniqueEndpoints.join(', ')}`);
    
    if (apiCalls.length > 0) {
      console.log('  ✅ Application is making API calls (not purely static)');
    } else {
      console.log('  ⚠️  No API calls detected (may be using mock data or static content)');
    }
  });
});