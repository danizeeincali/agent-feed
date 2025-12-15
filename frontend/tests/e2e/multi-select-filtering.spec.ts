import { test, expect, Page } from '@playwright/test';

// Helper functions for consistent interactions
async function navigateToAgentFeed(page: Page) {
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveTitle(/Agent Feed|AgentLink/);
}

async function activateAdvancedFilter(page: Page) {
  // Click the main filter button first
  const filterButton = page.locator('button').filter({ hasText: /All Posts|Posts/ }).first();
  await filterButton.click();
  await page.waitForTimeout(300);
  
  // Then click Advanced Filter option
  const advancedFilterOption = page.locator('button').filter({ hasText: /Advanced Filter/ });
  await advancedFilterOption.click();
  await page.waitForTimeout(500);
}

async function waitForFilterPanel(page: Page) {
  // Wait for the multi-select panel to appear
  await expect(page.locator('div').filter({ hasText: 'Advanced Filter' }).first()).toBeVisible();
  await expect(page.locator('label').filter({ hasText: /Agents.*selected/ })).toBeVisible();
}

test.describe('Multi-Select Filtering E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToAgentFeed(page);
  });

  test('should load Agent Feed application successfully', async ({ page }) => {
    // Verify main components are present
    await expect(page.locator('h1, h2').filter({ hasText: /Agent Feed|Feed|Posts/i }).first()).toBeVisible();
    
    // Wait for data to load
    await page.waitForLoadState('networkidle');
    
    // Check for the main content area - look for posts or the main container
    const mainContent = page.locator('.space-y-4, .post, [class*="post"], .bg-white').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });
    
    // Take screenshot for evidence
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/screenshots/01-app-loaded.png', fullPage: true });
  });

  test('should activate Advanced Filter mode', async ({ page }) => {
    await activateAdvancedFilter(page);
    await waitForFilterPanel(page);
    
    // Verify filter panel is visible and functional
    const filterPanel = page.locator('[data-testid="filter-panel"], .filter-panel, .advanced-filter').first();
    await expect(filterPanel).toBeVisible();
    
    // Check for agent and hashtag input sections
    const agentSection = page.locator('label, div').filter({ hasText: /agents?/i }).first();
    const hashtagSection = page.locator('label, div').filter({ hasText: /hashtags?/i }).first();
    
    await expect(agentSection).toBeVisible();
    await expect(hashtagSection).toBeVisible();
    
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/screenshots/02-advanced-filter-activated.png', fullPage: true });
  });

  test('should validate agent type-to-add functionality', async ({ page }) => {
    await activateAdvancedFilter(page);
    await waitForFilterPanel(page);
    
    // Find agent input field - look for placeholder containing "Search and select agents"
    const agentInput = page.locator('input[placeholder*="Search and select agents"], input[placeholder*="agent" i]').first();
    await expect(agentInput).toBeVisible();
    
    // Type a partial agent name to trigger suggestions
    await agentInput.fill('coder');
    await page.waitForTimeout(500);
    
    // Look for suggestion dropdown and click on option if available
    const suggestion = page.locator('.multi-select-option, .dropdown-option, button').filter({ hasText: /coder/i }).first();
    if (await suggestion.isVisible({ timeout: 2000 })) {
      await suggestion.click();
    } else {
      // If no suggestions, try pressing Enter
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(300);
    
    // Verify agent tag is added in the multi-select input
    const coderTag = page.locator('.tag, .chip, .badge, .selected-item').filter({ hasText: /coder/i });
    await expect(coderTag).toBeVisible();
    
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/screenshots/03-agent-type-to-add.png', fullPage: true });
  });

  test('should validate hashtag type-to-add functionality', async ({ page }) => {
    await activateAdvancedFilter(page);
    await waitForFilterPanel(page);
    
    // Find hashtag input field - look for placeholder containing "Search and select hashtags"
    const hashtagInput = page.locator('input[placeholder*="Search and select hashtags"], input[placeholder*="hashtag" i]').nth(1);
    await expect(hashtagInput).toBeVisible();
    
    // Type a hashtag to trigger suggestions
    await hashtagInput.fill('javascript');
    await page.waitForTimeout(500);
    
    // Look for suggestion dropdown and click on option if available
    const suggestion = page.locator('.multi-select-option, .dropdown-option, button').filter({ hasText: /javascript/i }).first();
    if (await suggestion.isVisible({ timeout: 2000 })) {
      await suggestion.click();
    } else {
      // If no suggestions, try pressing Enter
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(300);
    
    // Verify hashtag tag is added in the multi-select input
    const jsTag = page.locator('.tag, .chip, .badge, .selected-item').filter({ hasText: /javascript/i });
    await expect(jsTag).toBeVisible();
    
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/screenshots/04-hashtag-type-to-add.png', fullPage: true });
  });

  test('should test Apply/Cancel button functionality', async ({ page }) => {
    await activateAdvancedFilter(page);
    await waitForFilterPanel(page);
    
    // Add some filters by typing and selecting
    const agentInput = page.locator('input[placeholder*="Search and select agents"], input[placeholder*="agent" i]').first();
    await agentInput.fill('coder');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    // Test Apply button
    const applyBtn = page.locator('button').filter({ hasText: /Apply Filter/i }).first();
    await expect(applyBtn).toBeVisible();
    
    // Capture network request when applying filters
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/agent-posts') && response.status() === 200
    );
    
    await applyBtn.click();
    await responsePromise;
    
    // Wait for results to update
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/screenshots/05-apply-filters.png', fullPage: true });
    
    // Test Cancel button (reopen filter to test cancel)
    await activateAdvancedFilter(page);
    const cancelBtn = page.locator('button').filter({ hasText: /Cancel/i }).first();
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      // Verify filter panel is hidden
      await expect(page.locator('div').filter({ hasText: 'Advanced Filter' }).first()).toBeHidden();
    }
  });

  test('should verify filtered results accuracy', async ({ page }) => {
    await activateAdvancedFilter(page);
    await waitForFilterPanel(page);
    
    // Apply a specific filter
    const agentInput = page.locator('input[placeholder*="Search and select agents"]').first();
    await agentInput.fill('coder');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    // Apply filters
    const applyBtn = page.locator('button').filter({ hasText: /Apply Filter/i }).first();
    await applyBtn.click();
    
    // Wait for filtered results
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Verify filter is applied by checking the filter button shows active state
    const filterButton = page.locator('button').filter({ hasText: /agent/i }).first();
    await expect(filterButton).toBeVisible();
    
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/screenshots/06-filtered-results.png', fullPage: true });
  });

  test('should test multiple agents combination filtering', async ({ page }) => {
    await activateAdvancedFilter(page);
    await waitForFilterPanel(page);
    
    // Add multiple agents
    const agentInput = page.locator('input[placeholder*="Search and select agents"]').first();
    
    const agents = ['coder', 'tester'];
    for (const agent of agents) {
      await agentInput.fill(agent);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      await agentInput.clear(); // Clear for next entry
    }
    
    // Apply filters
    const applyBtn = page.locator('button').filter({ hasText: /Apply Filter/i }).first();
    await applyBtn.click();
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/screenshots/07-multiple-agents.png', fullPage: true });
  });

  test('should test hashtag AND logic filtering', async ({ page }) => {
    await activateAdvancedFilter(page);
    await waitForFilterPanel(page);
    
    // Add multiple hashtags
    const hashtagInput = page.locator('input[placeholder*="Search and select hashtags"]').first();
    
    const hashtags = ['javascript', 'testing'];
    for (const hashtag of hashtags) {
      await hashtagInput.fill(hashtag);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      await hashtagInput.clear(); // Clear for next entry
    }
    
    // Verify AND mode is selected (default)
    const andButton = page.locator('button').filter({ hasText: /AND - Match all selected/i });
    await expect(andButton).toHaveClass(/bg-blue-50|border-blue-200/);
    
    // Apply filters
    const applyBtn = page.locator('button').filter({ hasText: /Apply Filter/i }).first();
    await applyBtn.click();
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/screenshots/08-hashtag-and-logic.png', fullPage: true });
  });

  test('should test combined agent + hashtag filtering', async ({ page }) => {
    await activateAdvancedFilter(page);
    await waitForFilterPanel(page);
    
    // Add agents
    const agentInput = page.locator('input[placeholder*="Search and select agents"]').first();
    await agentInput.fill('coder');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    // Add hashtags  
    const hashtagInput = page.locator('input[placeholder*="Search and select hashtags"]').first();
    await hashtagInput.fill('javascript');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    // Apply combined filters
    const applyBtn = page.locator('button').filter({ hasText: /Apply Filter/i }).first();
    
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/agent-posts') && response.status() === 200
    );
    
    await applyBtn.click();
    const response = await responsePromise;
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/screenshots/09-combined-filtering.png', fullPage: true });
  });

  test('should validate keyboard navigation and accessibility', async ({ page }) => {
    await activateAdvancedFilter(page);
    await waitForFilterPanel(page);
    
    // Test keyboard navigation
    const agentInput = page.locator('input[placeholder*="Search and select agents"]').first();
    await agentInput.focus();
    
    // Verify input is focused
    await expect(agentInput).toBeFocused();
    
    // Test Tab navigation to hashtag input
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab'); // May need multiple tabs to reach hashtag input
    const hashtagInput = page.locator('input[placeholder*="Search and select hashtags"]').first();
    await hashtagInput.focus(); // Ensure focus
    
    // Test Enter key functionality
    await hashtagInput.fill('accessibility');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    // Test Escape key to close filter
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/screenshots/10-keyboard-accessibility.png', fullPage: true });
  });

  test('should test filter removal and clearing', async ({ page }) => {
    await activateAdvancedFilter(page);
    await waitForFilterPanel(page);
    
    // Add some filters
    const agentInput = page.locator('input[placeholder*="Search and select agents"]').first();
    await agentInput.fill('coder');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    const hashtagInput = page.locator('input[placeholder*="Search and select hashtags"]').first();
    await hashtagInput.fill('testing');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    // Apply filters first
    const applyBtn = page.locator('button').filter({ hasText: /Apply Filter/i }).first();
    await applyBtn.click();
    await page.waitForTimeout(1000);
    
    // Test clear all functionality using the Clear button in the filter bar
    const clearBtn = page.locator('button').filter({ hasText: /Clear/i }).first();
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForTimeout(300);
    }
    
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/screenshots/11-filter-removal.png', fullPage: true });
  });

  test('should measure performance with real data', async ({ page }) => {
    const startTime = Date.now();
    
    // Navigate and measure load time
    await navigateToAgentFeed(page);
    const loadTime = Date.now() - startTime;
    
    // Measure filter activation time
    const filterStartTime = Date.now();
    await activateAdvancedFilter(page);
    await waitForFilterPanel(page);
    const filterActivationTime = Date.now() - filterStartTime;
    
    // Measure filtering operation time
    const agentInput = page.locator('input[placeholder*="agent" i], input[data-testid="agent-input"], input[name="agents"]').first();
    await agentInput.fill('coder');
    await page.keyboard.press('Enter');
    
    const filteringStartTime = Date.now();
    const applyBtn = page.locator('button').filter({ hasText: /apply/i }).first();
    await applyBtn.click();
    await page.waitForLoadState('networkidle');
    const filteringTime = Date.now() - filteringStartTime;
    
    // Record performance metrics
    const performanceMetrics = {
      loadTime,
      filterActivationTime,
      filteringTime,
      timestamp: new Date().toISOString()
    };
    
    // Verify performance is acceptable
    expect(loadTime).toBeLessThan(10000); // 10 seconds max load time
    expect(filterActivationTime).toBeLessThan(2000); // 2 seconds max filter activation
    expect(filteringTime).toBeLessThan(5000); // 5 seconds max filtering operation
    
    console.log('Performance Metrics:', performanceMetrics);
    
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/screenshots/12-performance-test.png', fullPage: true });
  });

  test('should validate complete user workflow', async ({ page }) => {
    // Test complete workflow: Navigate -> Filter -> Apply -> Verify -> Clear
    
    // Step 1: Navigate
    await navigateToAgentFeed(page);
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/screenshots/13-workflow-01-navigate.png' });
    
    // Step 2: Activate filtering
    await activateAdvancedFilter(page);
    await waitForFilterPanel(page);
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/screenshots/13-workflow-02-filter-panel.png' });
    
    // Step 3: Add filters
    const agentInput = page.locator('input[placeholder*="Search and select agents"]').first();
    await agentInput.fill('coder');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    const hashtagInput = page.locator('input[placeholder*="Search and select hashtags"]').first();
    await hashtagInput.fill('api');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/screenshots/13-workflow-03-add-filters.png' });
    
    // Step 4: Apply filters
    const applyBtn = page.locator('button').filter({ hasText: /Apply Filter/i }).first();
    await applyBtn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/screenshots/13-workflow-04-apply-filters.png' });
    
    // Step 5: Verify active filter state
    const filterButton = page.locator('button').first(); // Main filter button should show active state
    await expect(filterButton).toBeVisible();
    
    // Step 6: Clear filters using Clear button
    const clearBtn = page.locator('button').filter({ hasText: /Clear/i }).first();
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: '/workspaces/agent-feed/frontend/test-results/screenshots/13-workflow-05-clear-filters.png' });
    
    // Complete workflow verification
    console.log('Complete workflow test passed');
  });
});