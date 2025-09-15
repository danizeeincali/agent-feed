import { test, expect, Page } from '@playwright/test';

/**
 * Dynamic Pages E2E Test Suite
 *
 * Tests the complete flow from agents page to individual dynamic pages:
 * 1. Navigate to agents page
 * 2. Select personal-todos-agent
 * 3. Click Dynamic Pages tab
 * 4. View individual pages
 * 5. Test navigation between pages and back to profile
 * 6. Test page metadata display (status badges, timestamps, tags)
 */

interface DynamicPage {
  id: string;
  agent_id: string;
  title: string;
  page_type: string;
  content_type: string;
  content_value: string;
  status: 'published' | 'draft' | 'archived';
  tags: string[];
  created_at: string;
  updated_at: string;
  version: number;
}

interface AgentPagesResponse {
  success: boolean;
  data: {
    pages: DynamicPage[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    agent: {
      id: string;
      name: string;
      display_name: string;
    };
  };
  timestamp: string;
}

test.describe('Dynamic Pages E2E Flow', () => {
  const FRONTEND_URL = 'http://localhost:5173';
  const BACKEND_URL = 'http://localhost:3000';
  const AGENT_ID = 'personal-todos-agent';

  // Test data for creating sample pages
  const samplePages = [
    {
      title: 'Todo Dashboard',
      content_type: 'component',
      content_value: JSON.stringify({ type: 'dashboard', widgets: ['tasks', 'calendar'] }),
      status: 'published',
      tags: ['dashboard', 'productivity']
    },
    {
      title: 'Task Analytics',
      content_type: 'markdown',
      content_value: '# Task Analytics\n\nThis page shows task completion analytics.',
      status: 'published',
      tags: ['analytics', 'reporting']
    },
    {
      title: 'Settings Panel',
      content_type: 'json',
      content_value: JSON.stringify({ preferences: { theme: 'dark', notifications: true } }),
      status: 'draft',
      tags: ['settings', 'configuration']
    },
    {
      title: 'Quick Actions',
      content_type: 'component',
      content_value: JSON.stringify({ type: 'actions', buttons: ['create', 'archive', 'export'] }),
      status: 'published',
      tags: ['actions', 'shortcuts']
    },
    {
      title: 'Help Documentation',
      content_type: 'text',
      content_value: 'This is the help documentation for the personal todos agent.',
      status: 'archived',
      tags: ['documentation', 'help']
    }
  ];

  let createdPageIds: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Set up test data - create sample pages for the agent
    createdPageIds = [];

    for (const pageData of samplePages) {
      const response = await fetch(`${BACKEND_URL}/api/agents/${AGENT_ID}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pageData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.page) {
          createdPageIds.push(data.data.page.id);
        }
      }
    }

    console.log(`Created ${createdPageIds.length} test pages for agent ${AGENT_ID}`);
  });

  test.afterEach(async () => {
    // Clean up test data - delete created pages
    for (const pageId of createdPageIds) {
      try {
        await fetch(`${BACKEND_URL}/api/agents/${AGENT_ID}/pages/${pageId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.warn(`Failed to delete test page ${pageId}:`, error);
      }
    }
    console.log(`Cleaned up ${createdPageIds.length} test pages`);
  });

  test('Complete navigation flow: Agents -> Agent Profile -> Dynamic Pages -> Individual Pages', async ({ page }) => {
    // Step 1: Navigate to the frontend application
    await page.goto(FRONTEND_URL);

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Step 2: Navigate to agents page
    await page.click('[data-testid="agents-link"], a[href="/agents"], text=Agents');
    await page.waitForURL('**/agents');
    await expect(page).toHaveTitle(/Agents/i);

    // Step 3: Find and click on the personal-todos-agent
    const agentSelector = `[data-testid="agent-${AGENT_ID}"], [data-agent-id="${AGENT_ID}"], text=${AGENT_ID}`;

    // Wait for agents to load
    await page.waitForSelector('.agent-card, .agent-item, [data-testid^="agent-"]', { timeout: 10000 });

    // Look for the specific agent
    const agentElement = page.locator(agentSelector).first();
    await expect(agentElement).toBeVisible({ timeout: 10000 });
    await agentElement.click();

    // Step 4: Verify we're on the agent profile page
    await page.waitForURL(`**/agents/${AGENT_ID}`);
    await expect(page.locator('h1, .agent-name')).toContainText('personal', { ignoreCase: true });

    // Step 5: Click on the Dynamic Pages tab
    const dynamicPagesTab = page.locator('text="Dynamic Pages", [data-tab="pages"], button:has-text("Dynamic Pages")');
    await expect(dynamicPagesTab).toBeVisible({ timeout: 10000 });
    await dynamicPagesTab.click();

    // Step 6: Verify Dynamic Pages content is loaded
    await expect(page.locator('text="Dynamic Pages"')).toBeVisible();

    // Step 7: Wait for pages to load and verify we have our test pages
    await page.waitForSelector('.page-item, [data-testid^="page-"], .border:has(.font-medium)', { timeout: 15000 });

    // Count visible pages
    const pageElements = page.locator('.page-item, [data-testid^="page-"], .border:has(.font-medium)');
    const pageCount = await pageElements.count();
    expect(pageCount).toBeGreaterThanOrEqual(3); // At least 3 of our sample pages should be visible

    // Step 8: Test page metadata display (status badges, timestamps, etc.)
    for (let i = 0; i < Math.min(3, pageCount); i++) {
      const pageElement = pageElements.nth(i);

      // Check for status badge
      await expect(pageElement.locator('.bg-green-100, .bg-yellow-100, .bg-gray-100, [data-status]')).toBeVisible();

      // Check for page type badge
      await expect(pageElement.locator('.bg-blue-100, [data-page-type]')).toBeVisible();

      // Check for timestamps
      await expect(pageElement.locator('text=/Created|Updated/')).toBeVisible();
    }

    // Step 9: Click on the first page to view it
    const firstPageViewButton = pageElements.first().locator('button:has-text("View"), [data-action="view"], .view-button');
    await expect(firstPageViewButton).toBeVisible();
    await firstPageViewButton.click();

    // Step 10: Verify we're on the individual page view
    await page.waitForURL(`**/agents/${AGENT_ID}/pages/*`);

    // Step 11: Navigate back to agent profile
    const backButton = page.locator('button:has-text("Back"), .back-button, [aria-label="Back"]');
    if (await backButton.isVisible()) {
      await backButton.click();
    } else {
      // Use browser back if no explicit back button
      await page.goBack();
    }

    // Step 12: Verify we're back on the agent profile with Dynamic Pages tab active
    await page.waitForURL(`**/agents/${AGENT_ID}`, { timeout: 10000 });
    await expect(page.locator('text="Dynamic Pages"')).toBeVisible();
  });

  test('Test individual page rendering and content display', async ({ page }) => {
    // Navigate to agent profile Dynamic Pages tab
    await page.goto(`${FRONTEND_URL}/agents/${AGENT_ID}`);
    await page.waitForLoadState('networkidle');

    // Click Dynamic Pages tab
    const dynamicPagesTab = page.locator('text="Dynamic Pages", [data-tab="pages"]');
    await dynamicPagesTab.click();

    // Wait for pages to load
    await page.waitForSelector('.page-item, [data-testid^="page-"], .border:has(.font-medium)', { timeout: 15000 });

    const pageElements = page.locator('.page-item, [data-testid^="page-"], .border:has(.font-medium)');
    const pageCount = await pageElements.count();

    // Test rendering of different page types
    const testedPages = new Set<string>();

    for (let i = 0; i < Math.min(3, pageCount) && testedPages.size < 3; i++) {
      const pageElement = pageElements.nth(i);
      const pageTitle = await pageElement.locator('.font-medium, h4, .page-title').first().textContent();

      if (pageTitle && !testedPages.has(pageTitle)) {
        testedPages.add(pageTitle);

        // Click view button
        const viewButton = pageElement.locator('button:has-text("View"), [data-action="view"]');
        await viewButton.click();

        // Wait for page to load
        await page.waitForLoadState('networkidle');

        // Verify page content is displayed
        const contentArea = page.locator('.page-content, .content-area, main');
        await expect(contentArea).toBeVisible({ timeout: 10000 });

        // Check for page title
        await expect(page.locator('h1, .page-title, .title')).toContainText(pageTitle, { ignoreCase: true });

        // Go back to pages list
        await page.goBack();
        await page.waitForSelector('.page-item, [data-testid^="page-"], .border:has(.font-medium)', { timeout: 10000 });
      }
    }

    expect(testedPages.size).toBeGreaterThanOrEqual(2);
  });

  test('Test navigation between multiple pages', async ({ page }) => {
    // Navigate to agent profile Dynamic Pages tab
    await page.goto(`${FRONTEND_URL}/agents/${AGENT_ID}`);
    await page.waitForLoadState('networkidle');

    const dynamicPagesTab = page.locator('text="Dynamic Pages", [data-tab="pages"]');
    await dynamicPagesTab.click();

    // Wait for pages to load
    await page.waitForSelector('.page-item, [data-testid^="page-"], .border:has(.font-medium)', { timeout: 15000 });

    const pageElements = page.locator('.page-item, [data-testid^="page-"], .border:has(.font-medium)');
    const pageCount = await pageElements.count();

    if (pageCount >= 2) {
      // Navigate to first page
      await pageElements.nth(0).locator('button:has-text("View")').click();
      await page.waitForURL(`**/agents/${AGENT_ID}/pages/*`);
      const firstPageUrl = page.url();

      // Go back
      await page.goBack();
      await page.waitForSelector('.page-item, [data-testid^="page-"], .border:has(.font-medium)');

      // Navigate to second page
      await pageElements.nth(1).locator('button:has-text("View")').click();
      await page.waitForURL(`**/agents/${AGENT_ID}/pages/*`);
      const secondPageUrl = page.url();

      // Verify we're on a different page
      expect(firstPageUrl).not.toBe(secondPageUrl);

      // Navigate back to agent profile
      await page.goBack();
      await page.waitForURL(`**/agents/${AGENT_ID}`);
      await expect(page.locator('text="Dynamic Pages"')).toBeVisible();
    }
  });

  test('Test page status badges and metadata display', async ({ page }) => {
    // Navigate to agent profile Dynamic Pages tab
    await page.goto(`${FRONTEND_URL}/agents/${AGENT_ID}`);
    await page.waitForLoadState('networkidle');

    const dynamicPagesTab = page.locator('text="Dynamic Pages", [data-tab="pages"]');
    await dynamicPagesTab.click();

    // Wait for pages to load
    await page.waitForSelector('.page-item, [data-testid^="page-"], .border:has(.font-medium)', { timeout: 15000 });

    const pageElements = page.locator('.page-item, [data-testid^="page-"], .border:has(.font-medium)');
    const pageCount = await pageElements.count();

    // Test each page's metadata
    for (let i = 0; i < Math.min(5, pageCount); i++) {
      const pageElement = pageElements.nth(i);

      // Test status badge
      const statusBadge = pageElement.locator('.bg-green-100, .bg-yellow-100, .bg-gray-100, [data-status]');
      await expect(statusBadge).toBeVisible();
      const statusText = await statusBadge.textContent();
      expect(['published', 'draft', 'archived']).toContain(statusText?.toLowerCase());

      // Test page type badge
      const typeBadge = pageElement.locator('.bg-blue-100, [data-page-type]');
      await expect(typeBadge).toBeVisible();

      // Test timestamps
      const createdText = pageElement.locator('text=/Created|created/');
      const updatedText = pageElement.locator('text=/Updated|updated/');

      // At least one timestamp should be visible
      const hasCreated = await createdText.count() > 0;
      const hasUpdated = await updatedText.count() > 0;
      expect(hasCreated || hasUpdated).toBe(true);
    }
  });

  test('Test empty state when no pages exist', async ({ page }) => {
    // Clean up all pages first
    for (const pageId of createdPageIds) {
      await fetch(`${BACKEND_URL}/api/agents/${AGENT_ID}/pages/${pageId}`, {
        method: 'DELETE',
      });
    }
    createdPageIds = []; // Clear the array since we deleted them

    // Navigate to agent profile Dynamic Pages tab
    await page.goto(`${FRONTEND_URL}/agents/${AGENT_ID}`);
    await page.waitForLoadState('networkidle');

    const dynamicPagesTab = page.locator('text="Dynamic Pages", [data-tab="pages"]');
    await dynamicPagesTab.click();

    // Check for empty state
    await expect(page.locator('text="No Dynamic Pages Yet", text="Create Your First Page"')).toBeVisible({ timeout: 10000 });

    // Test create page button
    const createButton = page.locator('button:has-text("Create"), button:has-text("Create Your First Page")');
    await expect(createButton).toBeVisible();
  });

  test('Test responsive design and mobile compatibility', async ({ page, browserName }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate to agent profile Dynamic Pages tab
    await page.goto(`${FRONTEND_URL}/agents/${AGENT_ID}`);
    await page.waitForLoadState('networkidle');

    const dynamicPagesTab = page.locator('text="Dynamic Pages", [data-tab="pages"]');
    await dynamicPagesTab.click();

    // Wait for pages to load
    await page.waitForSelector('.page-item, [data-testid^="page-"], .border:has(.font-medium)', { timeout: 15000 });

    // Verify content is still accessible in mobile view
    const pageElements = page.locator('.page-item, [data-testid^="page-"], .border:has(.font-medium)');
    const pageCount = await pageElements.count();

    if (pageCount > 0) {
      // Check that page elements are properly sized
      const firstPage = pageElements.first();
      const boundingBox = await firstPage.boundingBox();
      expect(boundingBox?.width).toBeLessThanOrEqual(375);

      // Test that buttons are still clickable
      const viewButton = firstPage.locator('button:has-text("View")');
      await expect(viewButton).toBeVisible();
    }
  });

  test('Test performance and loading states', async ({ page }) => {
    // Navigate to agent profile
    await page.goto(`${FRONTEND_URL}/agents/${AGENT_ID}`);

    // Monitor network activity
    let apiCallsMade = 0;
    page.on('response', (response) => {
      if (response.url().includes('/api/agents/') && response.url().includes('/pages')) {
        apiCallsMade++;
      }
    });

    // Click Dynamic Pages tab
    const dynamicPagesTab = page.locator('text="Dynamic Pages", [data-tab="pages"]');
    await dynamicPagesTab.click();

    // Check for loading state (spinner or skeleton)
    const loadingIndicator = page.locator('.animate-spin, .animate-pulse, text="Loading"');

    // Either loading should appear briefly or content should load immediately
    try {
      await expect(loadingIndicator).toBeVisible({ timeout: 1000 });
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
    } catch (error) {
      // If loading indicator doesn't appear, content should be visible quickly
      await page.waitForSelector('.page-item, [data-testid^="page-"], .border:has(.font-medium), text="No Dynamic Pages Yet"', { timeout: 5000 });
    }

    // Verify API calls were made
    expect(apiCallsMade).toBeGreaterThan(0);
  });
});

test.describe('Dynamic Pages Error Handling', () => {
  const FRONTEND_URL = 'http://localhost:5173';
  const AGENT_ID = 'personal-todos-agent';

  test('Test 404 error for non-existent agent', async ({ page }) => {
    const nonExistentAgentId = 'non-existent-agent-123';

    // Try to navigate to non-existent agent
    await page.goto(`${FRONTEND_URL}/agents/${nonExistentAgentId}`);

    // Should show 404 or "Agent Not Found" message
    await expect(
      page.locator('text="Agent Not Found", text="404", text="not found"')
    ).toBeVisible({ timeout: 10000 });
  });

  test('Test 404 error for non-existent page', async ({ page }) => {
    const nonExistentPageId = 'non-existent-page-123';

    // Try to navigate to non-existent page
    await page.goto(`${FRONTEND_URL}/agents/${AGENT_ID}/pages/${nonExistentPageId}`);

    // Should show 404 or "Page Not Found" message
    await expect(
      page.locator('text="Page Not Found", text="404", text="not found"')
    ).toBeVisible({ timeout: 10000 });
  });

  test('Test network error handling', async ({ page }) => {
    // Block API requests to simulate network errors
    await page.route('**/api/agents/**', route => {
      route.abort('failed');
    });

    // Navigate to agent profile
    await page.goto(`${FRONTEND_URL}/agents/${AGENT_ID}`);

    // Click Dynamic Pages tab
    const dynamicPagesTab = page.locator('text="Dynamic Pages", [data-tab="pages"]');
    await dynamicPagesTab.click();

    // Should show error message
    await expect(
      page.locator('text="Error", text="Failed", text="Try Again"')
    ).toBeVisible({ timeout: 10000 });

    // Test retry functionality
    const retryButton = page.locator('button:has-text("Try Again"), button:has-text("Retry")');
    if (await retryButton.isVisible()) {
      await retryButton.click();
    }
  });
});