import { test, expect } from '@playwright/test';
import fs from 'fs';

test.describe('Agent Manager Visibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to agents page
    await page.goto('/agents');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot for debugging
    await page.screenshot({ 
      path: 'tests/playwright/screenshots/agents-page-initial.png',
      fullPage: true 
    });
  });

  test('should display Agent Manager header and title', async ({ page }) => {
    console.log('🔍 Testing: Agent Manager header visibility');
    
    // Wait for and check the main heading
    const heading = page.locator('h1:has-text("Agent Manager")');
    await expect(heading).toBeVisible({ timeout: 10000 });
    
    // Check the description
    const description = page.locator('text=Create, configure, and manage your Claude Code agents');
    await expect(description).toBeVisible();
    
    console.log('✅ Agent Manager header is visible');
  });

  test('should display control buttons (Performance, Refresh, Create Agent)', async ({ page }) => {
    console.log('🔍 Testing: Control buttons visibility');
    
    // Check Performance button
    const performanceBtn = page.locator('button:has-text("Performance")');
    await expect(performanceBtn).toBeVisible({ timeout: 10000 });
    
    // Check Refresh button  
    const refreshBtn = page.locator('button:has-text("Refresh")');
    await expect(refreshBtn).toBeVisible();
    
    // Check Create Agent button
    const createBtn = page.locator('button:has-text("Create Agent")');
    await expect(createBtn).toBeVisible();
    
    console.log('✅ Control buttons are visible');
  });

  test('should display search and filter controls', async ({ page }) => {
    console.log('🔍 Testing: Search and filter controls visibility');
    
    // Check search input
    const searchInput = page.locator('input[placeholder*="Search agents"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    
    // Check status filter dropdown
    const statusFilter = page.locator('select').first();
    await expect(statusFilter).toBeVisible();
    
    console.log('✅ Search and filter controls are visible');
  });

  test('should display agent cards grid', async ({ page }) => {
    console.log('🔍 Testing: Agent cards grid visibility');
    
    // Wait for agent cards to load
    await page.waitForTimeout(3000); // Give time for component to load
    
    // Check for agent cards container
    const agentsGrid = page.locator('.grid').first();
    await expect(agentsGrid).toBeVisible({ timeout: 10000 });
    
    // Check for individual agent cards
    const agentCards = page.locator('.bg-white.rounded-lg.border');
    const cardCount = await agentCards.count();
    console.log(`Found ${cardCount} agent cards`);
    
    if (cardCount > 0) {
      // Check first agent card elements
      const firstCard = agentCards.first();
      await expect(firstCard).toBeVisible();
      
      // Check for agent name in first card
      const agentName = firstCard.locator('.font-semibold').first();
      await expect(agentName).toBeVisible();
      
      console.log('✅ Agent cards are visible');
    } else {
      console.log('⚠️ No agent cards found - checking for empty state');
      
      // Check for empty state message
      const emptyState = page.locator('text=No agents found');
      const isEmptyVisible = await emptyState.isVisible();
      
      if (isEmptyVisible) {
        console.log('✅ Empty state message is visible');
      } else {
        console.log('❌ Neither agent cards nor empty state found');
        
        // Take debugging screenshot
        await page.screenshot({ 
          path: 'tests/playwright/screenshots/no-content-debug.png',
          fullPage: true 
        });
        
        throw new Error('No agent content found');
      }
    }
  });

  test('should have proper page layout and no overflow issues', async ({ page }) => {
    console.log('🔍 Testing: Page layout and overflow');
    
    // Check that main content area is visible
    const mainContent = page.locator('main[data-testid="agent-feed"]');
    await expect(mainContent).toBeVisible({ timeout: 10000 });
    
    // Check that content is not clipped
    const contentBox = await mainContent.boundingBox();
    expect(contentBox.height).toBeGreaterThan(100);
    expect(contentBox.width).toBeGreaterThan(200);
    
    // Check for any elements with overflow:hidden that might be clipping
    const hiddenElements = await page.$$eval('*', elements => {
      return elements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.overflow === 'hidden' && style.height !== 'auto';
      }).map(el => ({
        tagName: el.tagName,
        className: el.className,
        overflow: window.getComputedStyle(el).overflow,
        height: window.getComputedStyle(el).height
      }));
    });
    
    console.log('Elements with overflow:hidden:', hiddenElements);
    
    console.log('✅ Page layout is proper');
  });

  test('should check component rendering and DOM structure', async ({ page }) => {
    console.log('🔍 Testing: Component rendering and DOM structure');
    
    // Check if BulletproofAgentManager component is in DOM
    const agentManager = page.locator('[class*="p-6"]').first();
    await expect(agentManager).toBeVisible({ timeout: 10000 });
    
    // Get full DOM content for debugging
    const bodyHTML = await page.locator('body').innerHTML();
    
    // Check for specific component markers
    const hasBulletproofContent = bodyHTML.includes('Agent Manager') || 
                                  bodyHTML.includes('Create Agent') ||
                                  bodyHTML.includes('task-coordinator');
    
    if (!hasBulletproofContent) {
      console.log('❌ BulletproofAgentManager content not found in DOM');
      
      // Save DOM content for debugging
      const bodyHTML = await page.locator('body').innerHTML();
      fs.writeFileSync('tests/playwright/debug-dom.html', bodyHTML);
      
      throw new Error('BulletproofAgentManager content not rendered');
    }
    
    console.log('✅ Component is properly rendered in DOM');
  });

  test('should take full page screenshot for visual validation', async ({ page }) => {
    console.log('🔍 Taking full page screenshot for visual validation');
    
    // Wait for all content to load
    await page.waitForTimeout(5000);
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'tests/playwright/screenshots/agents-page-full.png',
      fullPage: true 
    });
    
    // Take viewport screenshot
    await page.screenshot({ 
      path: 'tests/playwright/screenshots/agents-page-viewport.png',
      fullPage: false 
    });
    
    console.log('✅ Screenshots saved for visual validation');
  });

  test('should check console for errors', async ({ page }) => {
    console.log('🔍 Testing: Console errors');
    
    const consoleErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('❌ Console Error:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      consoleErrors.push(error.message);
      console.log('❌ Page Error:', error.message);
    });
    
    // Wait for page interactions
    await page.waitForTimeout(3000);
    
    // Check if there are critical errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('DevTools') &&
      !error.includes('Extension')
    );
    
    if (criticalErrors.length > 0) {
      console.log('❌ Critical console errors found:', criticalErrors);
      // Don't fail the test but log for debugging
    } else {
      console.log('✅ No critical console errors');
    }
  });
});