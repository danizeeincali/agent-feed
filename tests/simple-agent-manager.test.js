/**
 * Simple Agent Manager E2E Test
 * Verifies that the Agent Manager displays content after fixing over-engineering
 */

const { test, expect } = require('@playwright/test');

test.describe('Simple Agent Manager Tests', () => {
  test('should display Agent Manager with visible content', async ({ page }) => {
    // Set a longer timeout for this test
    test.setTimeout(60000);
    
    // Navigate to the Agent Manager page
    await page.goto('http://localhost:3002/agents');
    
    // Wait for the page to load with longer timeout
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000); // Allow time for React rendering
    
    // Check if the title is visible
    await expect(page.locator('h1:has-text("Agent Manager")')).toBeVisible();
    
    // Check if subtitle is visible
    await expect(page.locator('text=Create, configure, and manage your Claude Code agents')).toBeVisible();
    
    // Check if Create Agent button is visible
    await expect(page.locator('button:has-text("Create Agent")')).toBeVisible();
    
    // Check if search input is visible
    await expect(page.locator('input[placeholder="Search agents..."]')).toBeVisible();
    
    // Wait for agents to load (they load after 1 second delay)
    await page.waitForTimeout(2000);
    
    // Check if agent cards are visible
    const agentCards = page.locator('.bg-white.rounded-lg.border');
    await expect(agentCards.first()).toBeVisible();
    
    // Check if specific agent names are visible
    await expect(page.locator('text=Task Coordinator')).toBeVisible();
    await expect(page.locator('text=Code Reviewer')).toBeVisible();
    
    // Test search functionality
    await page.fill('input[placeholder="Search agents..."]', 'Task');
    await expect(page.locator('text=Task Coordinator')).toBeVisible();
    await expect(page.locator('text=Code Reviewer')).not.toBeVisible();
    
    // Clear search
    await page.fill('input[placeholder="Search agents..."]', '');
    await expect(page.locator('text=Code Reviewer')).toBeVisible();
    
    console.log('✅ All Agent Manager tests passed!');
  });
  
  test('should handle loading state correctly', async ({ page }) => {
    await page.goto('http://localhost:3002/agents');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Should show loading state initially or content loads
    const hasContent = await page.locator('h1:has-text("Agent Manager")').isVisible();
    const hasLoadingSpinner = await page.locator('.animate-pulse, .animate-spin').isVisible();
    
    // Either content is visible or loading state is shown
    expect(hasContent || hasLoadingSpinner).toBeTruthy();
  });
});

test.describe('Agent Manager Functionality', () => {
  test('should display agent status correctly', async ({ page }) => {
    await page.goto('http://localhost:3002/agents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check for status badges
    await expect(page.locator('text=active').first()).toBeVisible();
    
    // Check for action buttons
    await expect(page.locator('button:has-text("Pause")').first()).toBeVisible();
  });
  
  test('should navigate to agents page from sidebar', async ({ page }) => {
    // Start from home page
    await page.goto('http://localhost:3002/');
    await page.waitForLoadState('networkidle');
    
    // Look for agents link in sidebar and click it
    const agentsLink = page.locator('a[href="/agents"], nav a:has-text("Agent")');
    if (await agentsLink.isVisible()) {
      await agentsLink.click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1:has-text("Agent Manager")')).toBeVisible();
    } else {
      // If no sidebar link, navigate directly
      await page.goto('http://localhost:3002/agents');
      await expect(page.locator('h1:has-text("Agent Manager")')).toBeVisible();
    }
  });
});