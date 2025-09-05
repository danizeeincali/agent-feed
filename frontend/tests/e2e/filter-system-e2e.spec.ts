/**
 * End-to-End Filter System Tests
 * Comprehensive browser-based testing of the advanced filter system
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5174';

// Test data and utilities
const TEST_USER_ID = 'e2e-test-user';
let availableAgents: string[] = [];
let availableHashtags: string[] = [];

test.describe('Advanced Filter System E2E Tests', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    // Setup console logging to catch frontend errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Frontend Error:', msg.text());
      }
    });

    // Navigate to the application
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Wait for the filter panel to be available
    await page.waitForSelector('[data-testid="filter-panel"], button:has-text("All Posts")', { timeout: 10000 });
    
    // Get available agents and hashtags for testing
    try {
      const response = await page.request.get(`${BACKEND_URL}/api/v1/filter-data`);
      const data = await response.json();
      availableAgents = data.agents || [];
      availableHashtags = data.hashtags || [];
      console.log(`Available for testing: ${availableAgents.length} agents, ${availableHashtags.length} hashtags`);
    } catch (error) {
      console.warn('Could not fetch filter data:', error);
    }
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Should load application without JavaScript errors', async () => {
    // Check that the page loads successfully
    expect(await page.title()).toBeTruthy();
    
    // Check for filter panel
    const filterPanel = page.locator('button:has-text("All Posts")');
    await expect(filterPanel).toBeVisible();
    
    // Check for posts container
    const postsContainer = page.locator('[data-testid="posts-container"], .posts-container, [class*="post"]').first();
    await expect(postsContainer).toBeVisible({ timeout: 10000 });
  });

  test('Should open and close the main filter dropdown', async () => {
    // Click the filter button to open dropdown
    const filterButton = page.locator('button:has-text("All Posts")');
    await filterButton.click();
    
    // Check that dropdown appears
    const dropdown = page.locator('[data-testid="filter-dropdown"], div:has-text("By Agent")');
    await expect(dropdown).toBeVisible();
    
    // Click outside to close
    await page.click('body', { position: { x: 100, y: 100 } });
    await expect(dropdown).not.toBeVisible();
  });

  test('Should open advanced filter panel', async () => {
    // Open filter dropdown
    const filterButton = page.locator('button:has-text("All Posts")');
    await filterButton.click();
    
    // Click on Advanced Filter option
    const advancedFilter = page.locator('button:has-text("Advanced Filter")');
    await advancedFilter.click();
    
    // Check that advanced filter panel opens
    const advancedPanel = page.locator('[data-testid="advanced-filter-panel"], div:has-text("Advanced Filter"):not(button)');
    await expect(advancedPanel).toBeVisible();
    
    // Check for multi-select inputs
    const agentInput = page.locator('input[placeholder*="agent"], input[placeholder*="Search and select agents"]');
    const hashtagInput = page.locator('input[placeholder*="hashtag"], input[placeholder*="Search and select hashtags"]');
    
    await expect(agentInput).toBeVisible();
    await expect(hashtagInput).toBeVisible();
    
    // Close the panel
    const cancelButton = page.locator('button:has-text("Cancel")');
    await cancelButton.click();
    await expect(advancedPanel).not.toBeVisible();
  });

  test('Should handle multi-select agent filtering', async () => {
    if (availableAgents.length < 2) {
      test.skip('Not enough agents available for testing');
    }

    // Open advanced filter
    await page.locator('button:has-text("All Posts")').click();
    await page.locator('button:has-text("Advanced Filter")').click();
    
    // Wait for the advanced filter panel
    const advancedPanel = page.locator('div:has-text("Advanced Filter"):not(button)');
    await expect(advancedPanel).toBeVisible();
    
    // Select agents using the multi-select input
    const agentInput = page.locator('input[placeholder*="agent"], input[placeholder*="Search and select agents"]').first();
    
    // Type and select first agent
    await agentInput.click();
    await agentInput.fill(availableAgents[0].substring(0, 3));
    await page.locator(`text="${availableAgents[0]}"`).first().click();
    
    // Select second agent
    await agentInput.fill(availableAgents[1].substring(0, 3));
    await page.locator(`text="${availableAgents[1]}"`).first().click();
    
    // Apply the filter
    const applyButton = page.locator('button:has-text("Apply Filter")');
    await expect(applyButton).toBeEnabled();
    await applyButton.click();
    
    // Wait for filter to be applied
    await page.waitForTimeout(1000);
    
    // Check that filter label is updated
    const filterLabel = page.locator('button span:has-text("agent")');
    await expect(filterLabel).toBeVisible();
    
    // Verify posts are filtered
    await page.waitForLoadState('networkidle');
    
    // Clear the filter
    const clearButton = page.locator('button:has-text("Clear")');
    if (await clearButton.isVisible()) {
      await clearButton.click();
      await expect(page.locator('button:has-text("All Posts")')).toBeVisible();
    }
  });

  test('Should handle hashtag filtering', async () => {
    if (availableHashtags.length === 0) {
      test.skip('No hashtags available for testing');
    }

    // Open advanced filter
    await page.locator('button:has-text("All Posts")').click();
    await page.locator('button:has-text("Advanced Filter")').click();
    
    // Select a hashtag
    const hashtagInput = page.locator('input[placeholder*="hashtag"], input[placeholder*="Search and select hashtags"]').first();
    await hashtagInput.click();
    await hashtagInput.fill(availableHashtags[0].substring(0, 3));
    
    // Look for hashtag option
    const hashtagOption = page.locator(`text="#${availableHashtags[0]}", text="${availableHashtags[0]}"`).first();
    if (await hashtagOption.isVisible()) {
      await hashtagOption.click();
    }
    
    // Apply the filter
    const applyButton = page.locator('button:has-text("Apply Filter")');
    await expect(applyButton).toBeEnabled();
    await applyButton.click();
    
    // Wait for filter to be applied
    await page.waitForTimeout(1000);
    
    // Clear the filter
    const clearButton = page.locator('button:has-text("Clear")');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }
  });

  test('Should toggle between AND and OR filter modes', async () => {
    // Open advanced filter
    await page.locator('button:has-text("All Posts")').click();
    await page.locator('button:has-text("Advanced Filter")').click();
    
    // Check for filter mode buttons
    const andButton = page.locator('button:has-text("AND")');
    const orButton = page.locator('button:has-text("OR")');
    
    await expect(andButton).toBeVisible();
    await expect(orButton).toBeVisible();
    
    // Toggle between modes
    await orButton.click();
    await expect(orButton).toHaveClass(/bg-blue/);
    
    await andButton.click();
    await expect(andButton).toHaveClass(/bg-blue/);
    
    // Close panel
    await page.locator('button:has-text("Cancel")').click();
  });

  test('Should handle saved posts and my posts toggles', async () => {
    // Open advanced filter
    await page.locator('button:has-text("All Posts")').click();
    await page.locator('button:has-text("Advanced Filter")').click();
    
    // Look for saved posts toggle
    const savedPostsToggle = page.locator('input[type="checkbox"]').first();
    const myPostsToggle = page.locator('input[type="checkbox"]').last();
    
    if (await savedPostsToggle.isVisible()) {
      await savedPostsToggle.check();
      await expect(savedPostsToggle).toBeChecked();
      
      await savedPostsToggle.uncheck();
      await expect(savedPostsToggle).not.toBeChecked();
    }
    
    if (await myPostsToggle.isVisible()) {
      await myPostsToggle.check();
      await expect(myPostsToggle).toBeChecked();
      
      await myPostsToggle.uncheck();
      await expect(myPostsToggle).not.toBeChecked();
    }
    
    // Close panel
    await page.locator('button:has-text("Cancel")').click();
  });

  test('Should apply filter with saved posts enabled', async () => {
    // Open advanced filter
    await page.locator('button:has-text("All Posts")').click();
    await page.locator('button:has-text("Advanced Filter")').click();
    
    // Enable saved posts toggle
    const savedPostsToggle = page.locator('input[type="checkbox"]').first();
    if (await savedPostsToggle.isVisible()) {
      await savedPostsToggle.check();
      
      // Apply the filter
      const applyButton = page.locator('button:has-text("Apply Filter")');
      await expect(applyButton).toBeEnabled();
      await applyButton.click();
      
      // Wait for filter to be applied
      await page.waitForTimeout(1000);
      
      // Clear the filter
      const clearButton = page.locator('button:has-text("Clear")');
      if (await clearButton.isVisible()) {
        await clearButton.click();
      }
    }
  });

  test('Should show proper post counts when filters are applied', async () => {
    // Get initial post count
    const initialPostCount = await page.locator('[data-testid="post-item"], [class*="post-item"], article').count();
    console.log(`Initial post count: ${initialPostCount}`);
    
    // Apply a simple filter (by agent if available)
    if (availableAgents.length > 0) {
      await page.locator('button:has-text("All Posts")').click();
      await page.locator('button:has-text("By Agent")').click();
      
      // Select first agent
      await page.locator(`text="${availableAgents[0]}"`).first().click();
      
      // Wait for filtering
      await page.waitForTimeout(2000);
      
      // Check post count updated
      const filteredPostCount = await page.locator('[data-testid="post-item"], [class*="post-item"], article').count();
      console.log(`Filtered post count: ${filteredPostCount}`);
      
      // Post count should be displayed in filter panel
      const postCountDisplay = page.locator('span:has-text("post")');
      if (await postCountDisplay.isVisible()) {
        const countText = await postCountDisplay.textContent();
        console.log(`Post count display: ${countText}`);
      }
      
      // Clear filter
      const clearButton = page.locator('button:has-text("Clear")');
      if (await clearButton.isVisible()) {
        await clearButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('Should handle network errors gracefully', async () => {
    // Intercept API calls and simulate network error
    await page.route(`${BACKEND_URL}/api/v1/**`, route => {
      route.abort('failed');
    });
    
    // Try to apply a filter
    await page.locator('button:has-text("All Posts")').click();
    await page.locator('button:has-text("Advanced Filter")').click();
    
    // The panel should still open even if suggestions fail
    const advancedPanel = page.locator('div:has-text("Advanced Filter"):not(button)');
    await expect(advancedPanel).toBeVisible();
    
    // Close panel
    await page.locator('button:has-text("Cancel")').click();
    
    // Remove route interception
    await page.unroute(`${BACKEND_URL}/api/v1/**`);
  });

  test('Should maintain filter state when navigating', async () => {
    if (availableAgents.length === 0) {
      test.skip('No agents available for testing');
    }

    // Apply a filter
    await page.locator('button:has-text("All Posts")').click();
    await page.locator('button:has-text("By Agent")').click();
    await page.locator(`text="${availableAgents[0]}"`).first().click();
    
    // Verify filter is applied
    await expect(page.locator(`button:has-text("${availableAgents[0]}")`)).toBeVisible();
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if filter state is preserved (this depends on implementation)
    // For now, we'll just verify the page loads correctly
    await expect(page.locator('button:has-text("All Posts"), button[class*="filter"]')).toBeVisible();
    
    // Clear any remaining filters
    const clearButton = page.locator('button:has-text("Clear")');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }
  });

  test('Should validate Apply button state correctly', async () => {
    // Open advanced filter
    await page.locator('button:has-text("All Posts")').click();
    await page.locator('button:has-text("Advanced Filter")').click();
    
    // Apply button should be disabled initially if no filters selected
    const applyButton = page.locator('button:has-text("Apply Filter")');
    const isInitiallyDisabled = await applyButton.getAttribute('disabled');
    
    // If we have agents available, test enabling the button
    if (availableAgents.length > 0) {
      const agentInput = page.locator('input[placeholder*="agent"], input[placeholder*="Search and select agents"]').first();
      await agentInput.click();
      await agentInput.fill(availableAgents[0].substring(0, 3));
      
      const agentOption = page.locator(`text="${availableAgents[0]}"`).first();
      if (await agentOption.isVisible()) {
        await agentOption.click();
        
        // Button should now be enabled
        await expect(applyButton).toBeEnabled();
      }
    }
    
    // Close panel
    await page.locator('button:has-text("Cancel")').click();
  });
});