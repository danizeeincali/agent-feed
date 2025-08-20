/**
 * Playwright E2E Tests for Agent Manager UI
 * Tests that the Agent Manager page displays all necessary elements
 */

const { test, expect } = require('@playwright/test');

test.describe('Agent Manager UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Agent Manager page
    await page.goto('http://localhost:3001/agents');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display Agent Manager title', async ({ page }) => {
    // Check if the title is visible
    const title = await page.locator('h1:has-text("Agent Manager")');
    await expect(title).toBeVisible();
    
    // Check subtitle
    const subtitle = await page.locator('text=Create, configure, and manage your Claude Code agents');
    await expect(subtitle).toBeVisible();
  });

  test('should display Create Agent button', async ({ page }) => {
    // Check if Create Agent button exists
    const createButton = await page.locator('button:has-text("Create Agent")');
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();
  });

  test('should display search and filter controls', async ({ page }) => {
    // Check search input
    const searchInput = await page.locator('input[placeholder*="Search agents"]');
    await expect(searchInput).toBeVisible();
    
    // Check status filter dropdown
    const statusFilter = await page.locator('select:has(option:text("All Status"))');
    await expect(statusFilter).toBeVisible();
  });

  test('should display agent cards', async ({ page }) => {
    // Wait for agent cards to load
    await page.waitForTimeout(2000); // Allow time for mock data to load
    
    // Check if any agent cards are displayed
    const agentCards = await page.locator('.bg-white.rounded-lg.border.border-gray-200').count();
    
    console.log(`Found ${agentCards} agent cards`);
    
    // Should have at least one agent card (or the create form)
    expect(agentCards).toBeGreaterThan(0);
  });

  test('should display agent information in cards', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Look for specific agent names from mock data
    const taskCoordinator = await page.locator('text=Task Coordinator').first();
    const codeReviewer = await page.locator('text=Code Reviewer').first();
    
    // At least one should be visible
    const taskCoordinatorVisible = await taskCoordinator.isVisible().catch(() => false);
    const codeReviewerVisible = await codeReviewer.isVisible().catch(() => false);
    
    expect(taskCoordinatorVisible || codeReviewerVisible).toBeTruthy();
  });

  test('should display performance metrics button', async ({ page }) => {
    // Check for Performance button
    const perfButton = await page.locator('button:has-text("Performance")');
    await expect(perfButton).toBeVisible();
  });

  test('should display refresh button', async ({ page }) => {
    // Check for Refresh button
    const refreshButton = await page.locator('button:has-text("Refresh")');
    await expect(refreshButton).toBeVisible();
  });

  test('should open create agent form when clicking Create Agent', async ({ page }) => {
    // Click Create Agent button
    const createButton = await page.locator('button:has-text("Create Agent")');
    await createButton.click();
    
    // Check if form appears
    const formTitle = await page.locator('h2:has-text("Create New Agent")');
    await expect(formTitle).toBeVisible();
    
    // Check form fields
    const nameInput = await page.locator('input[placeholder="task-coordinator"]');
    const displayNameInput = await page.locator('input[placeholder="Task Coordinator"]');
    
    await expect(nameInput).toBeVisible();
    await expect(displayNameInput).toBeVisible();
  });

  test('should have proper layout with sidebar and nav', async ({ page }) => {
    // Check sidebar is visible
    const sidebar = await page.locator('nav').first();
    await expect(sidebar).toBeVisible();
    
    // Check main content area exists
    const mainContent = await page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should handle no agents state gracefully', async ({ page }) => {
    // Check if either agents or a message is displayed
    const hasContent = await page.locator('.grid').count() > 0 || 
                       await page.locator('text=No agents').count() > 0;
    
    expect(hasContent).toBeTruthy();
  });
});

test.describe('Agent Manager Error States', () => {
  test('should handle loading state', async ({ page }) => {
    await page.goto('http://localhost:3001/agents');
    
    // Check for any loading indicators or content
    const content = await page.locator('main').textContent();
    expect(content).toBeTruthy();
  });

  test('should handle error boundaries', async ({ page }) => {
    await page.goto('http://localhost:3001/agents');
    
    // Check that no error boundary is triggered
    const errorBoundary = await page.locator('text=Something went wrong').count();
    expect(errorBoundary).toBe(0);
  });
});

// Debug helper test
test.describe('Debug Agent Manager', () => {
  test('capture page screenshot for debugging', async ({ page }) => {
    await page.goto('http://localhost:3001/agents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'agent-manager-debug.png', fullPage: true });
    
    // Log page content
    const bodyText = await page.locator('body').textContent();
    console.log('Page content:', bodyText.substring(0, 500));
    
    // Log any console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
      }
    });
  });
});