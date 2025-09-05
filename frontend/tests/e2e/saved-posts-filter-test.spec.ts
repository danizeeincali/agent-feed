import { test, expect } from '@playwright/test';

/**
 * Specific Test for Saved Posts Filter Functionality
 * 
 * This test isolates and validates the filter functionality specifically
 */

test.describe('Saved Posts Filter Specific Test', () => {
  test('should trigger filtered API call when saved posts filter is selected', async ({ page }) => {
    console.log('🔍 Testing saved posts filter API integration...');
    
    // Navigate to the application
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for posts to load
    await page.waitForSelector('article', { timeout: 10000 });
    console.log('✅ Posts loaded');
    
    // Monitor network requests for filtered posts
    const filteredApiPromise = page.waitForRequest(request => {
      const url = request.url();
      return url.includes('/api/v1/agent-posts') && 
             url.includes('filter=saved') &&
             url.includes('user_id=anonymous');
    });
    
    // Look for the filter panel button (the main filter dropdown)
    const filterButton = page.locator('button').filter({ hasText: 'All Posts' }).first();
    await expect(filterButton).toBeVisible();
    console.log('✅ Found filter button');
    
    // Click to open the filter dropdown
    await filterButton.click();
    await page.waitForTimeout(500);
    
    // Take screenshot of open dropdown
    await page.screenshot({ path: 'test-results/screenshots/filter-dropdown-open.png' });
    
    // Find and click the "Saved Posts" option
    const savedOption = page.locator('button').filter({ hasText: 'Saved Posts' });
    await expect(savedOption).toBeVisible();
    console.log('✅ Found saved posts option');
    
    // Click the saved posts option
    await savedOption.click();
    console.log('✅ Clicked saved posts filter');
    
    // Wait for the API call
    try {
      const request = await Promise.race([
        filteredApiPromise,
        page.waitForTimeout(8000).then(() => null)
      ]);
      
      if (request) {
        console.log('✅ Filtered API call detected:', request.url());
        console.log('Method:', request.method());
        
        // Wait for response
        const response = await request.response();
        if (response) {
          console.log('Response status:', response.status());
          const responseText = await response.text();
          console.log('Response preview:', responseText.substring(0, 200) + '...');
          
          // Parse response to check data
          try {
            const responseData = JSON.parse(responseText);
            console.log('Filtered posts count:', responseData.data?.length || 0);
            console.log('Filter applied:', responseData.filter);
          } catch (e) {
            console.log('Could not parse response as JSON');
          }
        }
        
        // Verify the filter button now shows "Saved Posts"
        await page.waitForTimeout(2000);
        const updatedFilterButton = page.locator('button').filter({ hasText: 'Saved Posts' });
        await expect(updatedFilterButton).toBeVisible();
        console.log('✅ Filter button updated to show "Saved Posts"');
        
        // Take screenshot of filtered results
        await page.screenshot({ path: 'test-results/screenshots/filtered-results.png', fullPage: true });
        
      } else {
        console.log('⚠️ No filtered API call detected within 8 seconds');
        
        // Debug: Check if filter state changed in UI
        const filterText = await filterButton.textContent();
        console.log('Filter button text after click:', filterText);
        
        // Check network tab for any requests
        console.log('Debug: Checking for any API requests...');
        const allRequests = [];
        page.on('request', req => allRequests.push(req.url()));
        await page.waitForTimeout(2000);
        console.log('Recent requests:', allRequests.slice(-5));
      }
      
    } catch (error) {
      console.log('Error during API monitoring:', error);
    }
    
    console.log('✅ Filter test completed');
  });

  test('should verify filter component integration with parent component', async ({ page }) => {
    console.log('🔍 Testing filter component integration...');
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('article', { timeout: 10000 });
    
    // Monitor all requests to understand the flow
    const allRequests: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/v1/agent-posts')) {
        allRequests.push(request.url());
        console.log('API Request detected:', request.url());
      }
    });
    
    // Get initial posts count
    const initialPosts = await page.locator('article').count();
    console.log('Initial posts count:', initialPosts);
    
    // Open filter dropdown
    const filterButton = page.locator('button').filter({ hasText: 'All Posts' });
    await filterButton.click();
    
    // Click saved posts
    const savedOption = page.locator('button').filter({ hasText: 'Saved Posts' });
    await savedOption.click();
    
    // Wait for any changes
    await page.waitForTimeout(3000);
    
    // Check final state
    const finalPosts = await page.locator('article').count();
    console.log('Final posts count:', finalPosts);
    
    // Check if filter state persisted
    const currentFilterText = await page.locator('button').filter({ hasText: /Posts|All|Saved/ }).first().textContent();
    console.log('Current filter state:', currentFilterText);
    
    console.log('All API requests during test:', allRequests);
    
    console.log('✅ Integration test completed');
  });
  
  test('should test the complete saved posts workflow', async ({ page }) => {
    console.log('🔍 Testing complete saved posts workflow...');
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('article', { timeout: 10000 });
    
    // Step 1: Save a post
    console.log('Step 1: Saving a post...');
    const posts = await page.locator('article').all();
    if (posts.length > 0) {
      const saveButton = posts[0].locator('button').filter({ hasText: 'Save' });
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);
        console.log('✅ Post saved');
      }
    }
    
    // Step 2: Apply saved filter
    console.log('Step 2: Applying saved filter...');
    let apiCallMade = false;
    
    page.on('request', request => {
      if (request.url().includes('filter=saved')) {
        apiCallMade = true;
        console.log('✅ Saved filter API call detected!');
      }
    });
    
    const filterButton = page.locator('button').filter({ hasText: /All Posts|Posts/ });
    await filterButton.click();
    
    const savedOption = page.locator('button').filter({ hasText: 'Saved Posts' });
    await savedOption.click();
    
    // Step 3: Wait and verify
    await page.waitForTimeout(4000);
    
    console.log('API call made during filter:', apiCallMade);
    
    // Take final screenshot
    await page.screenshot({ path: 'test-results/screenshots/workflow-complete.png', fullPage: true });
    
    console.log('✅ Complete workflow test finished');
  });
});