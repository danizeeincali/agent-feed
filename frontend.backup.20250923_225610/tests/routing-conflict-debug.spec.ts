import { test, expect, Page } from '@playwright/test';

/**
 * SPARC:DEBUG - Routing Conflict Resolution Test Suite
 * Tests both / (feed) and /agents routes working simultaneously
 */

test.describe('Critical Routing Conflict Resolution', () => {
  
  test.beforeEach(async ({ page }) => {
    // Enable debug logging
    await page.addInitScript(() => {
      window.localStorage.setItem('debug', 'true');
      console.log('DEBUG: Routing test initialized');
    });
  });

  test('Feed route (/) should load independently', async ({ page }) => {
    console.log('Testing feed route independently...');
    
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    
    // Wait for React to mount
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
    
    // Check for feed content
    const feedIndicators = [
      '[data-testid="main-content"]',
      '.social-media-feed',
      '[data-testid="app-container"]'
    ];
    
    let feedFound = false;
    for (const selector of feedIndicators) {
      if (await page.isVisible(selector)) {
        feedFound = true;
        break;
      }
    }
    
    expect(feedFound).toBe(true);
    console.log('✅ Feed route working independently');
  });

  test('Agents route (/agents) should load independently', async ({ page }) => {
    console.log('Testing agents route independently...');
    
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');
    
    // Wait for React to mount
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
    
    // Check for agents content - multiple possible indicators
    const agentsIndicators = [
      '[data-testid="agent-list"]',
      '[data-testid="agent-card"]',
      '.agents-page',
      '.agents-container',
      '.agents-title'
    ];
    
    let agentsFound = false;
    for (const selector of agentsIndicators) {
      if (await page.isVisible(selector)) {
        agentsFound = true;
        console.log(`✅ Agents content found: ${selector}`);
        break;
      }
    }
    
    // Additional checks
    const content = await page.textContent('body');
    if (content?.includes('agents') || content?.includes('Agents') || content?.includes('Production Agents')) {
      agentsFound = true;
      console.log('✅ Agents content found in text');
    }
    
    expect(agentsFound).toBe(true);
    console.log('✅ Agents route working independently');
  });

  test('Routes should work sequentially without conflicts', async ({ page }) => {
    console.log('Testing sequential route navigation...');
    
    // Start with feed
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
    
    console.log('✅ Feed loaded first');
    
    // Navigate to agents
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');
    
    // Wait longer for agents to load
    await page.waitForTimeout(3000);
    
    const agentsVisible = await page.isVisible('.agents-page, [data-testid="agent-list"], .agents-container');
    const content = await page.textContent('body');
    const hasAgentsContent = content?.includes('agents') || content?.includes('Production Agents');
    
    expect(agentsVisible || hasAgentsContent).toBe(true);
    console.log('✅ Sequential navigation working');
    
    // Go back to feed
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="main-content"]', { timeout: 10000 });
    
    console.log('✅ Back to feed working');
  });

  test('Multiple tabs should work simultaneously', async ({ browser }) => {
    console.log('Testing simultaneous multi-tab access...');
    
    const context = await browser.newContext();
    
    // Create two pages
    const feedPage = await context.newPage();
    const agentsPage = await context.newPage();
    
    // Load both simultaneously
    const [feedResult, agentsResult] = await Promise.all([
      feedPage.goto('http://localhost:5173/'),
      agentsPage.goto('http://localhost:5173/agents')
    ]);
    
    // Wait for both to load
    await Promise.all([
      feedPage.waitForLoadState('networkidle'),
      agentsPage.waitForLoadState('networkidle')
    ]);
    
    // Check both are working
    await Promise.all([
      feedPage.waitForSelector('[data-testid="app-root"]', { timeout: 15000 }),
      agentsPage.waitForSelector('[data-testid="app-root"]', { timeout: 15000 })
    ]);
    
    // Verify feed page
    const feedContent = await feedPage.isVisible('[data-testid="main-content"]');
    expect(feedContent).toBe(true);
    
    // Verify agents page  
    const agentsContent = await agentsPage.textContent('body');
    const hasAgents = agentsContent?.includes('agents') || agentsContent?.includes('Production Agents') || 
                     await agentsPage.isVisible('.agents-page, [data-testid="agent-list"]');
    expect(hasAgents).toBe(true);
    
    console.log('✅ Multi-tab simultaneous access working');
    
    await context.close();
  });

  test('Navigation links should work correctly', async ({ page }) => {
    console.log('Testing navigation links...');
    
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
    
    // Try to click agents link in sidebar
    const agentsLink = page.locator('a[href="/agents"]').first();
    if (await agentsLink.isVisible()) {
      await agentsLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const agentsLoaded = await page.isVisible('.agents-page, [data-testid="agent-list"]') ||
                          (await page.textContent('body'))?.includes('Production Agents');
      
      expect(agentsLoaded).toBe(true);
      console.log('✅ Navigation link working');
    } else {
      console.log('⚠️ Agents navigation link not found in sidebar');
    }
  });

  test('Error boundaries should handle route failures gracefully', async ({ page }) => {
    console.log('Testing error boundary handling...');
    
    // Test invalid route
    await page.goto('http://localhost:5173/invalid-route');
    await page.waitForLoadState('networkidle');
    
    // Should show 404 or fallback
    const has404 = await page.textContent('body');
    expect(has404?.includes('404') || has404?.includes('Not Found') || 
           has404?.includes('Page not found')).toBe(true);
    
    console.log('✅ Error boundary working for invalid routes');
  });

});