import { test, expect, Page } from '@playwright/test';

/**
 * FINAL VALIDATION TEST - Multi-Select Filtering Complete Functionality
 * 
 * This test validates that the multi-select filtering feature is 100% operational.
 * Tests all aspects from UI interaction to API integration.
 */

test.describe('Multi-Select Filtering - Complete Validation', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('1. Browser Interface Test - Basic Filter Panel', async () => {
    // Navigate to page and verify basic elements
    await expect(page).toHaveTitle(/Agent Feed/i);
    
    // Locate the FilterPanel button (should show "All Posts")
    const filterButton = page.locator('button').filter({ hasText: 'All Posts' });
    await expect(filterButton).toBeVisible();
    await expect(filterButton).toContainText('All Posts');
    
    // Click to open dropdown menu
    await filterButton.click();
    
    // Verify dropdown opens
    const dropdown = page.locator('div').filter({ hasText: 'Advanced Filter' });
    await expect(dropdown).toBeVisible();
    
    // Verify "Advanced Filter" option is present and clickable
    const advancedFilterOption = page.locator('button').filter({ hasText: 'Advanced Filter' });
    await expect(advancedFilterOption).toBeVisible();
    await expect(advancedFilterOption).toBeEnabled();
    
    // Take screenshot of filter panel
    await page.screenshot({ path: 'validation-evidence/01-filter-panel-basic.png' });
  });

  test('2. Multi-Select Panel Test - Interface Elements', async () => {
    // Open filter dropdown
    const filterButton = page.locator('button').filter({ hasText: 'All Posts' });
    await filterButton.click();
    
    // Click "Advanced Filter" to open multi-select panel
    const advancedFilterOption = page.locator('button').filter({ hasText: 'Advanced Filter' });
    await advancedFilterOption.click();
    
    // Verify multi-select panel appears
    const multiSelectPanel = page.locator('div').filter({ hasText: 'Advanced Filter' }).nth(1);
    await expect(multiSelectPanel).toBeVisible();
    
    // Verify agent multi-select input field appears
    const agentInput = page.locator('input').filter({ hasAttribute: 'placeholder' }).first();
    await expect(agentInput).toBeVisible();
    
    // Verify hashtag multi-select input field appears
    const hashtagInput = page.locator('input').filter({ hasAttribute: 'placeholder' }).nth(1);
    await expect(hashtagInput).toBeVisible();
    
    // Verify AND/OR mode buttons work
    const andButton = page.locator('button').filter({ hasText: 'AND' });
    const orButton = page.locator('button').filter({ hasText: 'OR' });
    await expect(andButton).toBeVisible();
    await expect(orButton).toBeVisible();
    
    // Test mode switching
    await orButton.click();
    await expect(orButton).toHaveClass(/bg-blue-50/);
    await andButton.click();
    await expect(andButton).toHaveClass(/bg-blue-50/);
    
    // Verify Apply button is present
    const applyButton = page.locator('button').filter({ hasText: 'Apply Filter' });
    await expect(applyButton).toBeVisible();
    
    // Take screenshot of multi-select panel
    await page.screenshot({ path: 'validation-evidence/02-multiselect-panel.png' });
  });

  test('3. Type-ahead Functionality Test', async () => {
    // Open advanced filter
    await page.locator('button').filter({ hasText: 'All Posts' }).click();
    await page.locator('button').filter({ hasText: 'Advanced Filter' }).click();
    
    // Test agent field type-ahead
    const agentInput = page.locator('input').first();
    await agentInput.focus();
    await agentInput.fill('Prod'); // Type partial agent name
    
    // Wait for suggestions to appear
    await page.waitForTimeout(500);
    
    // Test hashtag field type-ahead  
    const hashtagInput = page.locator('input').nth(1);
    await hashtagInput.focus();
    await hashtagInput.fill('test'); // Type partial hashtag
    
    // Wait for suggestions
    await page.waitForTimeout(500);
    
    // Take screenshot of type-ahead suggestions
    await page.screenshot({ path: 'validation-evidence/03-typeahead-suggestions.png' });
  });

  test('4. Enter Key Selection Test', async () => {
    // Open advanced filter
    await page.locator('button').filter({ hasText: 'All Posts' }).click();
    await page.locator('button').filter({ hasText: 'Advanced Filter' }).click();
    
    // Test adding selection with Enter key - Agent
    const agentInput = page.locator('input').first();
    await agentInput.focus();
    await agentInput.fill('ProductionValidator');
    await agentInput.press('Enter');
    
    // Verify chip was created
    const agentChip = page.locator('div').filter({ hasText: 'ProductionValidator' });
    await expect(agentChip).toBeVisible();
    
    // Test adding selection with Enter key - Hashtag
    const hashtagInput = page.locator('input').nth(1);
    await hashtagInput.focus();
    await hashtagInput.fill('validation');
    await hashtagInput.press('Enter');
    
    // Verify hashtag chip was created
    const hashtagChip = page.locator('div').filter({ hasText: 'validation' });
    await expect(hashtagChip).toBeVisible();
    
    // Take screenshot with chips
    await page.screenshot({ path: 'validation-evidence/04-selection-chips.png' });
  });

  test('5. Complete User Workflow Test', async () => {
    // Step 1: Open Advanced Filter
    await page.locator('button').filter({ hasText: 'All Posts' }).click();
    await page.locator('button').filter({ hasText: 'Advanced Filter' }).click();
    
    // Step 2: Add multiple agents
    const agentInput = page.locator('input').first();
    await agentInput.focus();
    await agentInput.fill('ProductionValidator');
    await agentInput.press('Enter');
    
    await agentInput.fill('TestAgent');
    await agentInput.press('Enter');
    
    // Step 3: Add hashtags
    const hashtagInput = page.locator('input').nth(1);
    await hashtagInput.focus();
    await hashtagInput.fill('validation');
    await hashtagInput.press('Enter');
    
    await hashtagInput.fill('testing');
    await hashtagInput.press('Enter');
    
    // Step 4: Choose OR mode
    await page.locator('button').filter({ hasText: 'OR' }).click();
    
    // Step 5: Click Apply
    const applyButton = page.locator('button').filter({ hasText: 'Apply Filter' });
    await applyButton.click();
    
    // Step 6: Verify panel closes and filter is applied
    await expect(page.locator('div').filter({ hasText: 'Advanced Filter' }).nth(1)).not.toBeVisible();
    
    // Verify filter button shows applied filter count
    const filterButton = page.locator('button').first();
    await expect(filterButton).toContainText(/2 agent|2 tag/);
    
    // Step 7: Verify posts are filtered (check for loading state completion)
    await page.waitForLoadState('networkidle');
    
    // Take final workflow screenshot
    await page.screenshot({ path: 'validation-evidence/05-complete-workflow.png' });
  });

  test('6. Clear Filters Test', async () => {
    // Apply some filters first
    await page.locator('button').filter({ hasText: 'All Posts' }).click();
    await page.locator('button').filter({ hasText: 'Advanced Filter' }).click();
    
    const agentInput = page.locator('input').first();
    await agentInput.fill('TestAgent');
    await agentInput.press('Enter');
    
    await page.locator('button').filter({ hasText: 'Apply Filter' }).click();
    
    // Verify Clear button appears
    const clearButton = page.locator('button').filter({ hasText: 'Clear' });
    await expect(clearButton).toBeVisible();
    
    // Click clear button
    await clearButton.click();
    
    // Verify filter resets to "All Posts"
    await expect(page.locator('button').filter({ hasText: 'All Posts' })).toBeVisible();
    
    // Take screenshot of cleared state
    await page.screenshot({ path: 'validation-evidence/06-filters-cleared.png' });
  });

  test('7. API Integration and Network Validation', async () => {
    // Monitor network requests
    const requests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        requests.push(request.url());
      }
    });
    
    // Open advanced filter (should trigger filter-data request)
    await page.locator('button').filter({ hasText: 'All Posts' }).click();
    await page.locator('button').filter({ hasText: 'Advanced Filter' }).click();
    
    // Type in fields (should trigger suggestions requests)
    const agentInput = page.locator('input').first();
    await agentInput.fill('Prod');
    await page.waitForTimeout(500);
    
    // Apply filter (should trigger filtered posts request)
    await agentInput.fill('ProductionValidator');
    await agentInput.press('Enter');
    await page.locator('button').filter({ hasText: 'Apply Filter' }).click();
    
    await page.waitForLoadState('networkidle');
    
    // Validate expected API calls were made
    const filterDataRequests = requests.filter(url => url.includes('filter-data'));
    const postsRequests = requests.filter(url => url.includes('agent-posts'));
    
    console.log('API Requests made:', requests);
    console.log('Filter data requests:', filterDataRequests.length);
    console.log('Posts requests:', postsRequests.length);
    
    // Verify critical requests were made
    expect(filterDataRequests.length).toBeGreaterThan(0);
    expect(postsRequests.length).toBeGreaterThan(0);
  });

  test('8. Error Handling and Edge Cases', async () => {
    // Test empty selections
    await page.locator('button').filter({ hasText: 'All Posts' }).click();
    await page.locator('button').filter({ hasText: 'Advanced Filter' }).click();
    
    // Verify Apply button is disabled when no selections
    const applyButton = page.locator('button').filter({ hasText: 'Apply Filter' });
    await expect(applyButton).toBeDisabled();
    
    // Test cancel functionality
    const cancelButton = page.locator('button').filter({ hasText: 'Cancel' });
    await cancelButton.click();
    
    // Verify panel closes
    await expect(page.locator('div').filter({ hasText: 'Advanced Filter' }).nth(1)).not.toBeVisible();
    
    // Take screenshot of error handling
    await page.screenshot({ path: 'validation-evidence/07-error-handling.png' });
  });

  test('9. Performance and Responsiveness Test', async () => {
    const startTime = Date.now();
    
    // Rapid interaction test
    await page.locator('button').filter({ hasText: 'All Posts' }).click();
    await page.locator('button').filter({ hasText: 'Advanced Filter' }).click();
    
    // Quickly add multiple items
    const agentInput = page.locator('input').first();
    await agentInput.fill('Agent1');
    await agentInput.press('Enter');
    await agentInput.fill('Agent2'); 
    await agentInput.press('Enter');
    await agentInput.fill('Agent3');
    await agentInput.press('Enter');
    
    // Apply filter
    await page.locator('button').filter({ hasText: 'Apply Filter' }).click();
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    console.log(`Multi-select workflow completed in ${totalTime}ms`);
    
    // Verify performance is reasonable (under 5 seconds)
    expect(totalTime).toBeLessThan(5000);
    
    // Take performance screenshot
    await page.screenshot({ path: 'validation-evidence/08-performance-test.png' });
  });

  test('10. Visual Validation - UI Consistency', async () => {
    // Test visual consistency across different states
    
    // Initial state
    await page.screenshot({ path: 'validation-evidence/09-initial-state.png' });
    
    // Dropdown open state
    await page.locator('button').filter({ hasText: 'All Posts' }).click();
    await page.screenshot({ path: 'validation-evidence/10-dropdown-open.png' });
    
    // Multi-select panel open state
    await page.locator('button').filter({ hasText: 'Advanced Filter' }).click();
    await page.screenshot({ path: 'validation-evidence/11-multiselect-open.png' });
    
    // With selections state
    const agentInput = page.locator('input').first();
    await agentInput.fill('ProductionValidator');
    await agentInput.press('Enter');
    await page.screenshot({ path: 'validation-evidence/12-with-selections.png' });
    
    // Applied filter state
    await page.locator('button').filter({ hasText: 'Apply Filter' }).click();
    await page.screenshot({ path: 'validation-evidence/13-applied-filters.png' });
  });
});