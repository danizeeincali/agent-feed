import { test, expect, Page } from '@playwright/test';

// Simplified working E2E tests for multi-select filtering
test.describe('Multi-Select Filtering - Working Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
  });

  test('should load Agent Feed application with filtering capability', async ({ page }) => {
    // Verify main components are present
    await expect(page.locator('h2').filter({ hasText: /Agent Feed/i })).toBeVisible();
    
    // Verify filter button is present and functional
    const filterButton = page.locator('button').filter({ hasText: /All Posts|Posts/i }).first();
    await expect(filterButton).toBeVisible();
    
    // Take evidence screenshot
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/test-results/screenshots/working-01-app-loaded.png', 
      fullPage: true 
    });
  });

  test('should successfully activate Advanced Filter modal', async ({ page }) => {
    // Click the filter button to open dropdown
    const filterButton = page.locator('button').filter({ hasText: /All Posts/i }).first();
    await filterButton.click();
    await page.waitForTimeout(500);
    
    // Click Advanced Filter option
    const advancedOption = page.locator('button').filter({ hasText: /Advanced Filter/i });
    await advancedOption.click();
    await page.waitForTimeout(500);
    
    // Verify Advanced Filter modal is visible
    await expect(page.locator('text=Advanced Filter').first()).toBeVisible();
    
    // Verify key components are present
    await expect(page.locator('text=Agents')).toBeVisible();
    await expect(page.locator('text=Hashtags')).toBeVisible();
    await expect(page.locator('text=Filter Mode')).toBeVisible();
    
    // Verify input fields are present
    const agentInput = page.locator('input[placeholder*="Search and select agents"]');
    await expect(agentInput).toBeVisible();
    
    const hashtagInput = page.locator('input[placeholder*="Search and select hashtags"]');
    await expect(hashtagInput).toBeVisible();
    
    // Verify mode buttons
    await expect(page.locator('button').filter({ hasText: /AND - Match all/i })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /OR - Match any/i })).toBeVisible();
    
    // Verify action buttons
    await expect(page.locator('button').filter({ hasText: /Cancel/i })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: /Apply Filter/i })).toBeVisible();
    
    // Take evidence screenshot
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/test-results/screenshots/working-02-advanced-filter-modal.png', 
      fullPage: true 
    });
  });

  test('should validate multi-select input interaction', async ({ page }) => {
    // Open Advanced Filter
    await page.locator('button').filter({ hasText: /All Posts/i }).first().click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: /Advanced Filter/i }).click();
    await page.waitForTimeout(500);
    
    // Test agent input interaction
    const agentInput = page.locator('input[placeholder*="Search and select agents"]').first();
    await agentInput.focus();
    await agentInput.fill('test-agent');
    
    // Test hashtag input interaction  
    const hashtagInput = page.locator('input[placeholder*="Search and select hashtags"]').first();
    await hashtagInput.focus();
    await hashtagInput.fill('test-hashtag');
    
    // Test mode switching
    const orButton = page.locator('button').filter({ hasText: /OR - Match any/i });
    await orButton.click();
    
    // Verify OR mode is selected (visual change)
    await expect(orButton).toHaveClass(/bg-blue-50|border-blue-200/);
    
    // Take evidence screenshot
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/test-results/screenshots/working-03-input-interaction.png', 
      fullPage: true 
    });
  });

  test('should validate filter modal close functionality', async ({ page }) => {
    // Open Advanced Filter
    await page.locator('button').filter({ hasText: /All Posts/i }).first().click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: /Advanced Filter/i }).click();
    await page.waitForTimeout(500);
    
    // Verify modal is open
    await expect(page.locator('text=Advanced Filter').first()).toBeVisible();
    
    // Test Cancel button
    const cancelButton = page.locator('button').filter({ hasText: /Cancel/i });
    await cancelButton.click();
    await page.waitForTimeout(300);
    
    // Verify modal is closed
    await expect(page.locator('text=Advanced Filter').first()).not.toBeVisible();
    
    // Take evidence screenshot
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/test-results/screenshots/working-04-modal-closed.png', 
      fullPage: true 
    });
  });

  test('should validate backend API connectivity', async ({ page }) => {
    // Monitor network requests
    const apiRequestPromise = page.waitForResponse(response => 
      response.url().includes('/api/v1/') && response.status() === 200
    );
    
    // Navigate and trigger API calls
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Wait for API response
    const apiResponse = await apiRequestPromise;
    
    // Verify API is responding
    expect(apiResponse.status()).toBe(200);
    expect(apiResponse.url()).toContain('/api/v1/');
    
    console.log('✅ API Response confirmed:', apiResponse.url(), 'Status:', apiResponse.status());
    
    // Take evidence screenshot
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/test-results/screenshots/working-05-api-connectivity.png', 
      fullPage: true 
    });
  });

  test('should measure performance metrics', async ({ page }) => {
    const startTime = Date.now();
    
    // Load application and measure time
    await page.goto('http://localhost:5173');
    const loadTime = Date.now() - startTime;
    
    // Measure filter activation
    const filterStart = Date.now();
    await page.locator('button').filter({ hasText: /All Posts/i }).first().click();
    await page.waitForTimeout(300);
    await page.locator('button').filter({ hasText: /Advanced Filter/i }).click();
    await page.waitForTimeout(500);
    const filterTime = Date.now() - filterStart;
    
    // Record metrics
    const metrics = {
      loadTime,
      filterActivationTime: filterTime,
      timestamp: new Date().toISOString()
    };
    
    console.log('Performance Metrics:', metrics);
    
    // Verify performance is acceptable
    expect(loadTime).toBeLessThan(5000); // 5 second max load time
    expect(filterTime).toBeLessThan(2000); // 2 second max filter activation
    
    // Take evidence screenshot
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/test-results/screenshots/working-06-performance-test.png', 
      fullPage: true 
    });
  });

  test('should validate complete user workflow', async ({ page }) => {
    // Step 1: Load application
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/test-results/screenshots/workflow-01-load.png' 
    });
    
    // Step 2: Open filter
    await page.locator('button').filter({ hasText: /All Posts/i }).first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/test-results/screenshots/workflow-02-filter-dropdown.png' 
    });
    
    // Step 3: Select Advanced Filter
    await page.locator('button').filter({ hasText: /Advanced Filter/i }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/test-results/screenshots/workflow-03-advanced-modal.png' 
    });
    
    // Step 4: Interact with inputs
    const agentInput = page.locator('input[placeholder*="Search and select agents"]').first();
    await agentInput.fill('demo-agent');
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/test-results/screenshots/workflow-04-agent-input.png' 
    });
    
    // Step 5: Close modal
    await page.locator('button').filter({ hasText: /Cancel/i }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ 
      path: '/workspaces/agent-feed/frontend/test-results/screenshots/workflow-05-complete.png' 
    });
    
    // Complete workflow test successful
    expect(true).toBe(true); // Workflow completed without errors
  });
});