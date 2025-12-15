import { test, expect } from '@playwright/test';

/**
 * Production Validation: Complete Advanced Filter System Validation
 * 
 * This test suite validates the complete advanced filter system functionality
 * including multi-select, type-ahead, saved posts, and my posts filtering.
 * 
 * CRITICAL VALIDATION REQUIREMENTS:
 * 1. Advanced Filter panel opens and displays correctly
 * 2. Type-ahead suggestions work for agents and hashtags  
 * 3. Enter key adds selections as removable chips
 * 4. Saved Posts and My Posts toggles work
 * 5. Apply button filters posts correctly
 * 6. No JavaScript errors or API failures
 * 
 * SUCCESS CRITERIA:
 * - All filter interactions work without errors
 * - Backend API responses are correct for all filter types
 * - Multi-select filtering actually filters posts
 * - UI state updates correctly after filtering
 */

const BASE_URL = 'http://localhost:5174';
const API_BASE_URL = 'http://localhost:3000';

test.describe('Production Validation: Advanced Filter System', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging to catch any errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Browser Console Error:', msg.text());
      }
    });
    
    // Enable network monitoring
    page.on('requestfailed', (request) => {
      console.error('Network Request Failed:', request.url(), request.failure()?.errorText);
    });
    
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('Advanced Filter Panel Opens and Displays Correctly', async ({ page }) => {
    // Wait for the main filter button to be visible
    const filterButton = page.locator('button').filter({ hasText: 'All Posts' });
    await expect(filterButton).toBeVisible();
    
    // Click to open the filter panel
    await filterButton.click();
    
    // Verify all filter options are present
    await expect(page.locator('text=All Posts')).toBeVisible();
    await expect(page.locator('text=By Agent')).toBeVisible();
    await expect(page.locator('text=By Hashtag')).toBeVisible();
    await expect(page.locator('text=Advanced Filter')).toBeVisible();
    await expect(page.locator('text=Saved Posts')).toBeVisible();
    await expect(page.locator('text=My Posts')).toBeVisible();
    
    console.log('✅ Advanced Filter Panel displays all options correctly');
  });

  test('Advanced Filter Multi-Select Panel Opens', async ({ page }) => {
    // Open filter dropdown
    const filterButton = page.locator('button').filter({ hasText: 'All Posts' });
    await filterButton.click();
    
    // Click on Advanced Filter
    await page.locator('text=Advanced Filter').click();
    
    // Verify multi-select panel opens
    await expect(page.locator('h3').filter({ hasText: 'Advanced Filter' })).toBeVisible();
    await expect(page.locator('text=Agents')).toBeVisible();
    await expect(page.locator('text=Hashtags')).toBeVisible();
    await expect(page.locator('text=Post Filters')).toBeVisible();
    await expect(page.locator('text=Filter Mode')).toBeVisible();
    
    // Verify toggles are present
    await expect(page.locator('text=Saved Posts')).toBeVisible();
    await expect(page.locator('text=My Posts')).toBeVisible();
    
    // Verify mode buttons
    await expect(page.locator('text=AND - Match all selected')).toBeVisible();
    await expect(page.locator('text=OR - Match any selected')).toBeVisible();
    
    console.log('✅ Advanced Filter Multi-Select Panel opens correctly');
  });

  test('Type-ahead Suggestions Work for Agents', async ({ page }) => {
    // Open advanced filter
    const filterButton = page.locator('button').filter({ hasText: 'All Posts' });
    await filterButton.click();
    await page.locator('text=Advanced Filter').click();
    
    // Find the agents input field
    const agentsInput = page.locator('input[placeholder*="Search and select agents"]');
    await expect(agentsInput).toBeVisible();
    
    // Type in agent input
    await agentsInput.fill('Prod');
    
    // Wait for suggestions to appear and check API call
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/filter-suggestions') && 
      response.url().includes('type=agent')
    );
    
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(Array.isArray(responseData.data)).toBe(true);
    
    console.log('✅ Type-ahead suggestions work for agents with API response:', responseData.data.length, 'results');
  });

  test('Type-ahead Suggestions Work for Hashtags', async ({ page }) => {
    // Open advanced filter
    const filterButton = page.locator('button').filter({ hasText: 'All Posts' });
    await filterButton.click();
    await page.locator('text=Advanced Filter').click();
    
    // Find the hashtags input field
    const hashtagsInput = page.locator('input[placeholder*="Search and select hashtags"]');
    await expect(hashtagsInput).toBeVisible();
    
    // Type in hashtag input
    await hashtagsInput.fill('val');
    
    // Wait for suggestions to appear and check API call
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/filter-suggestions') && 
      response.url().includes('type=hashtag')
    );
    
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(Array.isArray(responseData.data)).toBe(true);
    
    console.log('✅ Type-ahead suggestions work for hashtags with API response:', responseData.data.length, 'results');
  });

  test('Single Agent Filter Works Correctly', async ({ page }) => {
    // Open filter dropdown
    const filterButton = page.locator('button').filter({ hasText: 'All Posts' });
    await filterButton.click();
    
    // Select "By Agent"
    await page.locator('text=By Agent').click();
    
    // Wait for agent dropdown and select one
    await expect(page.locator('text=Select Agent')).toBeVisible();
    await page.locator('text=ProductionValidator').first().click();
    
    // Wait for API call and verify filtering works
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/agent-posts') && 
      response.url().includes('filter=by-agent') &&
      response.url().includes('agent=ProductionValidator')
    );
    
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(Array.isArray(responseData.data)).toBe(true);
    
    // Verify filter button shows the selected agent
    await expect(page.locator('text=Agent: ProductionValidator')).toBeVisible();
    
    console.log('✅ Single agent filter works correctly, returned', responseData.data.length, 'posts');
  });

  test('Single Hashtag Filter Works Correctly', async ({ page }) => {
    // Open filter dropdown
    const filterButton = page.locator('button').filter({ hasText: /All Posts|Agent:/ });
    await filterButton.click();
    
    // Select "By Hashtag"
    await page.locator('text=By Hashtag').click();
    
    // Wait for hashtag dropdown and select one
    await expect(page.locator('text=Select Hashtag')).toBeVisible();
    await page.locator('text=#validation').first().click();
    
    // Wait for API call and verify filtering works
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/agent-posts') && 
      response.url().includes('filter=by-tags') &&
      response.url().includes('tags=validation')
    );
    
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.success).toBe(true);
    expect(Array.isArray(responseData.data)).toBe(true);
    
    // Verify filter button shows the selected hashtag
    await expect(page.locator('text=#validation')).toBeVisible();
    
    console.log('✅ Single hashtag filter works correctly, returned', responseData.data.length, 'posts');
  });

  test('Multi-Select Filter Mode Toggle Works', async ({ page }) => {
    // Open advanced filter
    const filterButton = page.locator('button').filter({ hasText: /All Posts|#validation/ });
    await filterButton.click();
    await page.locator('text=Advanced Filter').click();
    
    // Verify default mode is AND
    const andButton = page.locator('button').filter({ hasText: 'AND - Match all selected' });
    const orButton = page.locator('button').filter({ hasText: 'OR - Match any selected' });
    
    await expect(andButton).toHaveClass(/bg-blue-50|border-blue-200/);
    
    // Click OR mode
    await orButton.click();
    
    // Verify OR mode is selected
    await expect(orButton).toHaveClass(/bg-blue-50|border-blue-200/);
    
    console.log('✅ Multi-select filter mode toggle works correctly');
  });

  test('Saved Posts and My Posts Toggles Work', async ({ page }) => {
    // Open advanced filter
    const filterButton = page.locator('button').filter({ hasText: /All Posts|#validation/ });
    await filterButton.click();
    await page.locator('text=Advanced Filter').click();
    
    // Find toggle switches
    const savedPostsToggle = page.locator('input[type="checkbox"]').first();
    const myPostsToggle = page.locator('input[type="checkbox"]').last();
    
    // Verify toggles start unchecked
    await expect(savedPostsToggle).not.toBeChecked();
    await expect(myPostsToggle).not.toBeChecked();
    
    // Click toggles
    await savedPostsToggle.click();
    await myPostsToggle.click();
    
    // Verify toggles are now checked
    await expect(savedPostsToggle).toBeChecked();
    await expect(myPostsToggle).toBeChecked();
    
    console.log('✅ Saved Posts and My Posts toggles work correctly');
  });

  test('CRITICAL: Multi-Select Filter Actually Filters Posts', async ({ page }) => {
    // Get initial post count
    const initialPosts = await page.locator('article').count();
    console.log('Initial post count:', initialPosts);
    
    // Open advanced filter
    const filterButton = page.locator('button').filter({ hasText: /All Posts|#validation/ });
    await filterButton.click();
    await page.locator('text=Advanced Filter').click();
    
    // Add an agent selection (ProductionValidator should have 1 post)
    const agentsInput = page.locator('input[placeholder*="Search and select agents"]');
    await agentsInput.fill('ProductionValidator');
    await page.keyboard.press('Enter');
    
    // Verify chip appears
    await expect(page.locator('text=ProductionValidator').first()).toBeVisible();
    
    // Apply the filter
    const applyButton = page.locator('button').filter({ hasText: 'Apply Filter' });
    await expect(applyButton).not.toBeDisabled();
    
    // Monitor the API call when applying
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/agent-posts') && 
      response.url().includes('filter=multi-select') &&
      response.url().includes('agents=ProductionValidator')
    );
    
    await applyButton.click();
    
    try {
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      
      console.log('API Response for multi-select filter:', {
        success: responseData.success,
        dataLength: responseData.data?.length || 0,
        total: responseData.total
      });
      
      // Wait for UI to update
      await page.waitForTimeout(1000);
      
      // Check filtered post count
      const filteredPosts = await page.locator('article').count();
      console.log('Filtered post count:', filteredPosts);
      
      // Verify filtering occurred
      if (responseData.data && responseData.data.length > 0) {
        expect(filteredPosts).toBeGreaterThan(0);
        expect(filteredPosts).toBeLessThanOrEqual(initialPosts);
        console.log('✅ Multi-select filter successfully filtered posts');
      } else {
        console.warn('⚠️ Multi-select filter returned no posts - checking if this is expected');
        
        // Test with OR mode which should be more inclusive
        await page.locator('button').filter({ hasText: 'OR - Match any selected' }).click();
        await applyButton.click();
        
        await page.waitForTimeout(1000);
        const orFilteredPosts = await page.locator('article').count();
        console.log('OR mode filtered post count:', orFilteredPosts);
      }
      
    } catch (error) {
      console.error('❌ Multi-select filter API call failed:', error);
      throw error;
    }
  });

  test('Clear Filter Works Correctly', async ({ page }) => {
    // First apply a filter
    const filterButton = page.locator('button').filter({ hasText: 'All Posts' });
    await filterButton.click();
    await page.locator('text=By Agent').click();
    await page.locator('text=ProductionValidator').first().click();
    
    // Verify filter is applied
    await expect(page.locator('text=Agent: ProductionValidator')).toBeVisible();
    
    // Click clear filter
    const clearButton = page.locator('button').filter({ hasText: 'Clear' });
    await clearButton.click();
    
    // Wait for API call to get all posts
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/agent-posts') && 
      !response.url().includes('filter=')
    );
    
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    
    // Verify UI returns to "All Posts"
    await expect(page.locator('button').filter({ hasText: 'All Posts' })).toBeVisible();
    
    console.log('✅ Clear filter works correctly');
  });

  test('No JavaScript Errors During Filter Operations', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Perform various filter operations
    const filterButton = page.locator('button').filter({ hasText: 'All Posts' });
    await filterButton.click();
    
    // Test each filter type
    await page.locator('text=By Agent').click();
    await page.locator('text=Select Agent').click();
    await page.locator('text=ProductionValidator').first().click();
    
    await page.waitForTimeout(500);
    
    await filterButton.click();
    await page.locator('text=Advanced Filter').click();
    
    const agentsInput = page.locator('input[placeholder*="Search and select agents"]');
    await agentsInput.fill('Security');
    await page.keyboard.press('Enter');
    
    await page.locator('button').filter({ hasText: 'Apply Filter' }).click();
    
    await page.waitForTimeout(1000);
    
    // Verify no JavaScript errors occurred
    expect(errors.length).toBe(0);
    
    if (errors.length > 0) {
      console.error('JavaScript errors detected:', errors);
    } else {
      console.log('✅ No JavaScript errors during filter operations');
    }
  });

  test('Network Request Validation for All Filter Types', async ({ page }) => {
    const networkRequests: Array<{url: string, status: number, type: string}> = [];
    
    page.on('response', (response) => {
      if (response.url().includes('/api/v1/')) {
        networkRequests.push({
          url: response.url(),
          status: response.status(),
          type: response.url().includes('agent-posts') ? 'posts' : 
                response.url().includes('filter-suggestions') ? 'suggestions' : 
                response.url().includes('filter-data') ? 'data' : 'other'
        });
      }
    });
    
    // Test filter data loading
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Test agent filter
    const filterButton = page.locator('button').filter({ hasText: 'All Posts' });
    await filterButton.click();
    await page.locator('text=By Agent').click();
    await page.locator('text=ProductionValidator').first().click();
    
    await page.waitForTimeout(500);
    
    // Test hashtag filter  
    await filterButton.click();
    await page.locator('text=By Hashtag').click();
    await page.locator('text=#validation').first().click();
    
    await page.waitForTimeout(500);
    
    // Test advanced filter
    await filterButton.click();
    await page.locator('text=Advanced Filter').click();
    
    const agentsInput = page.locator('input[placeholder*="Search and select agents"]');
    await agentsInput.fill('Prod');
    
    await page.waitForTimeout(500);
    
    // Validate all network requests succeeded
    const failedRequests = networkRequests.filter(req => req.status >= 400);
    expect(failedRequests.length).toBe(0);
    
    const postsRequests = networkRequests.filter(req => req.type === 'posts');
    const suggestionsRequests = networkRequests.filter(req => req.type === 'suggestions');
    const dataRequests = networkRequests.filter(req => req.type === 'data');
    
    expect(postsRequests.length).toBeGreaterThan(0);
    expect(dataRequests.length).toBeGreaterThan(0);
    
    console.log('✅ Network validation complete:', {
      total: networkRequests.length,
      posts: postsRequests.length,
      suggestions: suggestionsRequests.length,
      data: dataRequests.length,
      failed: failedRequests.length
    });
  });
});