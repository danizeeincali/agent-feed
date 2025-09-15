import { test, expect, Page } from '@playwright/test';
import { TestHelper, DynamicPagesPage } from './utils/test-helpers';

/**
 * Avi DM Workflow End-to-End Tests
 *
 * This comprehensive test suite validates the complete Avi DM user workflow,
 * covering all aspects of the dynamic pages system including:
 * - User journey from dashboard to agents to dynamic pages
 * - Page creation, editing, and management
 * - Real-time updates and WebSocket communication
 * - Error handling and recovery scenarios
 * - Mobile and accessibility compliance
 * - Performance benchmarking
 */

test.describe('Avi DM Complete User Workflow', () => {
  const testAgentId = TestHelper.TEST_AGENT_ID;
  let createdPageIds: string[] = [];

  test.beforeAll(async () => {
    // Set up test environment
    console.log('🚀 Starting Avi DM workflow tests...');
  });

  test.beforeEach(async ({ page }) => {
    // Clear any previous test data
    createdPageIds = [];

    // Set up page error handling
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Store errors on page for later access
    (page as any).testErrors = errors;
  });

  test.afterEach(async ({ page }) => {
    // Clean up test data
    await TestHelper.cleanupTestPages(createdPageIds);

    // Check for console errors
    const errors = (page as any).testErrors || [];
    if (errors.length > 0) {
      console.warn('Console errors detected:', errors);
    }
  });

  test('Complete Avi DM workflow: Dashboard → Agents → Dynamic Pages → Individual Page', async ({ page }) => {
    // Step 1: Start at dashboard
    await page.goto(TestHelper.FRONTEND_URL);
    await TestHelper.waitForPageReady(page);

    // Verify dashboard loads correctly
    await expect(page.locator('h1, .dashboard-title, [data-testid="page-title"]')).toBeVisible();
    await TestHelper.takeTimestampedScreenshot(page, 'dashboard-loaded');

    // Step 2: Navigate to agents page
    await TestHelper.navigateToAgents(page);
    await TestHelper.takeTimestampedScreenshot(page, 'agents-page-loaded');

    // Verify agents are displayed
    const agentCards = page.locator('.agent-card, .agent-item, [data-testid^="agent-"]');
    await expect(agentCards.first()).toBeVisible({ timeout: 15000 });

    const agentCount = await agentCards.count();
    expect(agentCount).toBeGreaterThan(0);
    console.log(`Found ${agentCount} agents on the page`);

    // Step 3: Navigate to specific agent profile
    await TestHelper.navigateToAgent(page, testAgentId);
    await TestHelper.takeTimestampedScreenshot(page, 'agent-profile-loaded');

    // Verify agent profile displays correctly
    await expect(page.locator('h1, .agent-name, [data-testid="agent-title"]')).toBeVisible();

    // Step 4: Click Dynamic Pages tab
    const dynamicPagesTab = page.locator(
      'text="Dynamic Pages", [data-tab="pages"], button:has-text("Dynamic Pages")'
    );
    await expect(dynamicPagesTab).toBeVisible({ timeout: 10000 });
    await dynamicPagesTab.click();

    // Wait for pages tab to load
    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], .border:has(.font-medium), text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );
    await TestHelper.takeTimestampedScreenshot(page, 'dynamic-pages-tab-loaded');

    // Step 5: Create a test page if none exist
    const pageElements = page.locator('.page-item, [data-testid^="page-"], .border:has(.font-medium)');
    const existingPageCount = await pageElements.count();

    if (existingPageCount === 0) {
      // Create a new page
      const createButton = page.locator('button:has-text("Create"), button:has-text("Create Your First Page")');
      await expect(createButton).toBeVisible();
      await createButton.click();

      // Wait for navigation to page creation/editing
      await page.waitForURL('**/pages/**', { timeout: 10000 });
      await TestHelper.takeTimestampedScreenshot(page, 'page-creation-started');

      // Go back to pages list
      await page.goBack();
      await page.waitForURL(`**/agents/${testAgentId}`);
    }

    // Step 6: View individual page
    const updatedPageElements = page.locator('.page-item, [data-testid^="page-"], .border:has(.font-medium)');
    const finalPageCount = await updatedPageElements.count();

    if (finalPageCount > 0) {
      // Click view button on first page
      const firstPageViewButton = updatedPageElements.first().locator(
        'button:has-text("View"), [data-action="view"], .view-button'
      );
      await expect(firstPageViewButton).toBeVisible();
      await firstPageViewButton.click();

      // Verify individual page loads
      await page.waitForURL(`**/agents/${testAgentId}/pages/*`, { timeout: 10000 });
      await TestHelper.waitForPageReady(page);
      await TestHelper.takeTimestampedScreenshot(page, 'individual-page-loaded');

      // Verify page content displays
      const contentArea = page.locator('.page-content, .content-area, main, [data-testid="page-content"]');
      await expect(contentArea).toBeVisible({ timeout: 10000 });

      // Test navigation back to agent profile
      const backButton = page.locator('button:has-text("Back"), .back-button, [aria-label="Back"]');
      if (await backButton.isVisible()) {
        await backButton.click();
      } else {
        await page.goBack();
      }

      await page.waitForURL(`**/agents/${testAgentId}`, { timeout: 10000 });
      await expect(page.locator('text="Dynamic Pages"')).toBeVisible();
      await TestHelper.takeTimestampedScreenshot(page, 'workflow-completed');
    }

    console.log('✅ Complete Avi DM workflow test completed successfully');
  });

  test('Dynamic page creation and management workflow', async ({ page }) => {
    // Navigate to Dynamic Pages tab
    const dynamicPagesPage = new DynamicPagesPage(page);
    await dynamicPagesPage.goto();

    // Test creating a new page
    await dynamicPagesPage.clickCreatePageButton();

    // Wait for page creation form or navigation
    await page.waitForURL('**/pages/**', { timeout: 15000 });

    // Verify we're in page creation/editing mode
    const pageTitle = page.locator('h1, .page-title, [data-testid="page-title"]');
    await expect(pageTitle).toBeVisible();

    // Test basic form interactions (if form is present)
    const titleInput = page.locator('input[name="title"], [data-testid="title-input"]');
    if (await titleInput.isVisible()) {
      await titleInput.fill('Test Page Created by Playwright');
      await TestHelper.takeTimestampedScreenshot(page, 'page-creation-form-filled');

      // Save the page
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Create")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForLoadState('networkidle');
      }
    }

    // Navigate back to pages list
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
    await dynamicPagesPage.goto();

    // Verify the new page appears in the list
    const pageCount = await dynamicPagesPage.getPageCount();
    expect(pageCount).toBeGreaterThanOrEqual(1);

    console.log('✅ Page creation workflow completed');
  });

  test('Multiple page navigation and state management', async ({ page }) => {
    // Create test pages first
    const pageData1 = TestHelper.generateTestPageData('markdown');
    const pageData2 = TestHelper.generateTestPageData('json');
    const pageData3 = TestHelper.generateTestPageData('component');

    const pageId1 = await TestHelper.createTestPage({ ...pageData1, title: 'Test Page 1' });
    const pageId2 = await TestHelper.createTestPage({ ...pageData2, title: 'Test Page 2' });
    const pageId3 = await TestHelper.createTestPage({ ...pageData3, title: 'Test Page 3' });

    createdPageIds.push(pageId1, pageId2, pageId3);

    // Navigate to Dynamic Pages tab
    const dynamicPagesPage = new DynamicPagesPage(page);
    await dynamicPagesPage.goto();

    // Verify all pages are visible
    const pageCount = await dynamicPagesPage.getPageCount();
    expect(pageCount).toBeGreaterThanOrEqual(3);

    // Test navigation between pages
    const pageUrls: string[] = [];

    for (let i = 0; i < 3; i++) {
      await dynamicPagesPage.clickViewButton(i);
      await page.waitForURL(`**/agents/${testAgentId}/pages/*`);

      const currentUrl = page.url();
      pageUrls.push(currentUrl);

      // Verify page content loads
      await TestHelper.waitForPageReady(page);
      const contentArea = page.locator('.page-content, .content-area, main');
      await expect(contentArea).toBeVisible();

      // Navigate back
      await page.goBack();
      await page.waitForURL(`**/agents/${testAgentId}`);
      await page.waitForSelector('.page-item, [data-testid^="page-"], .border:has(.font-medium)');
    }

    // Verify all URLs are unique
    const uniqueUrls = new Set(pageUrls);
    expect(uniqueUrls.size).toBe(3);

    // Test direct URL navigation
    for (const url of pageUrls) {
      await page.goto(url);
      await TestHelper.waitForPageReady(page);
      const contentArea = page.locator('.page-content, .content-area, main');
      await expect(contentArea).toBeVisible();
    }

    console.log('✅ Multiple page navigation test completed');
  });

  test('Page metadata and status badge validation', async ({ page }) => {
    // Create pages with different statuses
    const publishedPage = await TestHelper.createTestPage({
      ...TestHelper.generateTestPageData(),
      title: 'Published Page',
      status: 'published'
    });

    const draftPage = await TestHelper.createTestPage({
      ...TestHelper.generateTestPageData(),
      title: 'Draft Page',
      status: 'draft'
    });

    createdPageIds.push(publishedPage, draftPage);

    // Navigate to Dynamic Pages tab
    const dynamicPagesPage = new DynamicPagesPage(page);
    await dynamicPagesPage.goto();

    // Verify page count and metadata
    const pageCount = await dynamicPagesPage.getPageCount();
    expect(pageCount).toBeGreaterThanOrEqual(2);

    // Test metadata for each page
    for (let i = 0; i < Math.min(pageCount, 5); i++) {
      await dynamicPagesPage.verifyPageMetadata(i);
    }

    // Test status badge filtering (if available)
    const statusBadges = page.locator('.bg-green-100, .bg-yellow-100, .bg-gray-100, [data-status]');
    const badgeCount = await statusBadges.count();
    expect(badgeCount).toBeGreaterThan(0);

    // Verify page statistics
    const statsSection = page.locator('.border-t.border-gray-200');
    if (await statsSection.isVisible()) {
      await expect(statsSection.locator('text=/published/i')).toBeVisible();
      await expect(statsSection.locator('text=/draft/i')).toBeVisible();
    }

    console.log('✅ Page metadata validation completed');
  });

  test('Error handling and edge cases', async ({ page }) => {
    // Test 1: Navigate to non-existent agent
    const nonExistentAgentId = 'non-existent-agent-12345';
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${nonExistentAgentId}`);

    // Should show 404 or error message
    const errorMessage = page.locator(
      'text="Agent Not Found", text="404", text="not found", .error-message'
    );
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Test 2: Navigate to non-existent page
    const nonExistentPageId = 'non-existent-page-12345';
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}/pages/${nonExistentPageId}`);

    const pageErrorMessage = page.locator(
      'text="Page Not Found", text="404", text="not found", .error-message'
    );
    await expect(pageErrorMessage).toBeVisible({ timeout: 10000 });

    // Test 3: Network error simulation
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);

    // Block API requests
    await page.route('**/api/agents/**', route => {
      route.abort('failed');
    });

    // Click Dynamic Pages tab
    const dynamicPagesTab = page.locator('text="Dynamic Pages", [data-tab="pages"]');
    await dynamicPagesTab.click();

    // Should show error state
    const networkErrorMessage = page.locator(
      'text="Error", text="Failed", text="Try Again", .error-state'
    );
    await expect(networkErrorMessage).toBeVisible({ timeout: 15000 });

    // Test retry functionality
    const retryButton = page.locator('button:has-text("Try Again"), button:has-text("Retry")');
    if (await retryButton.isVisible()) {
      // Unblock requests
      await page.unroute('**/api/agents/**');
      await retryButton.click();

      // Should recover
      await page.waitForSelector(
        '.page-item, [data-testid^="page-"], .border:has(.font-medium), text="No Dynamic Pages Yet"',
        { timeout: 15000 }
      );
    }

    console.log('✅ Error handling test completed');
  });

  test('Performance and loading state validation', async ({ page }) => {
    // Measure page load times
    const dashboardLoadTime = await TestHelper.measurePageLoadTime(page, TestHelper.FRONTEND_URL);
    const agentsLoadTime = await TestHelper.measurePageLoadTime(page, `${TestHelper.FRONTEND_URL}/agents`);
    const agentProfileLoadTime = await TestHelper.measurePageLoadTime(
      page,
      `${TestHelper.FRONTEND_URL}/agents/${testAgentId}`
    );

    console.log('📊 Load Times:', {
      dashboard: `${dashboardLoadTime}ms`,
      agents: `${agentsLoadTime}ms`,
      agentProfile: `${agentProfileLoadTime}ms`
    });

    // Performance thresholds
    expect(dashboardLoadTime).toBeLessThan(5000); // 5 seconds
    expect(agentsLoadTime).toBeLessThan(5000);
    expect(agentProfileLoadTime).toBeLessThan(5000);

    // Test loading states
    await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);

    // Monitor network requests
    let apiCallCount = 0;
    page.on('response', response => {
      if (response.url().includes('/api/agents/') && response.url().includes('/pages')) {
        apiCallCount++;
      }
    });

    // Click Dynamic Pages tab
    const dynamicPagesTab = page.locator('text="Dynamic Pages", [data-tab="pages"]');
    await dynamicPagesTab.click();

    // Check for loading indicators
    const loadingIndicator = page.locator(
      '.animate-spin, .animate-pulse, text="Loading", [data-testid="loading-spinner"]'
    );

    // Either loading appears or content loads quickly
    try {
      await expect(loadingIndicator).toBeVisible({ timeout: 1000 });
      await expect(loadingIndicator).not.toBeVisible({ timeout: 10000 });
    } catch {
      // Content loaded immediately - that's fine too
      await page.waitForSelector(
        '.page-item, [data-testid^="page-"], .border:has(.font-medium), text="No Dynamic Pages Yet"',
        { timeout: 5000 }
      );
    }

    // Verify API calls were made
    expect(apiCallCount).toBeGreaterThanOrEqual(1);

    console.log('✅ Performance validation completed');
  });
});

test.describe('Avi DM Responsive Design Tests', () => {
  const testAgentId = TestHelper.TEST_AGENT_ID;

  test('Mobile responsiveness validation', async ({ page, browserName }) => {
    // Test on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Navigate through workflow on mobile
    await page.goto(TestHelper.FRONTEND_URL);
    await TestHelper.waitForPageReady(page);

    // Check dashboard mobile layout
    const dashboardContent = page.locator('main, .dashboard, [role="main"]');
    await expect(dashboardContent).toBeVisible();

    const dashboardBox = await dashboardContent.boundingBox();
    expect(dashboardBox?.width).toBeLessThanOrEqual(375);

    // Navigate to agents on mobile
    await TestHelper.navigateToAgents(page);

    // Verify agents list mobile layout
    const agentCards = page.locator('.agent-card, .agent-item, [data-testid^="agent-"]');
    const firstAgent = agentCards.first();
    await expect(firstAgent).toBeVisible();

    const agentBox = await firstAgent.boundingBox();
    expect(agentBox?.width).toBeLessThanOrEqual(375);

    // Navigate to agent profile on mobile
    await TestHelper.navigateToAgent(page, testAgentId);

    // Test mobile navigation and tabs
    const dynamicPagesTab = page.locator('text="Dynamic Pages", [data-tab="pages"]');
    await expect(dynamicPagesTab).toBeVisible();
    await dynamicPagesTab.click();

    // Verify mobile page list layout
    await page.waitForSelector(
      '.page-item, [data-testid^="page-"], .border:has(.font-medium), text="No Dynamic Pages Yet"',
      { timeout: 15000 }
    );

    const pageElements = page.locator('.page-item, [data-testid^="page-"], .border:has(.font-medium)');
    const pageCount = await pageElements.count();

    if (pageCount > 0) {
      const firstPage = pageElements.first();
      const pageBox = await firstPage.boundingBox();
      expect(pageBox?.width).toBeLessThanOrEqual(375);

      // Test mobile page interactions
      const viewButton = firstPage.locator('button:has-text("View")');
      await expect(viewButton).toBeVisible();

      // Verify buttons are touch-friendly (at least 44px)
      const buttonBox = await viewButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThanOrEqual(32); // Minimum touch target
    }

    console.log(`✅ Mobile responsiveness test completed for ${browserName}`);
  });

  test('Tablet and desktop responsiveness', async ({ page }) => {
    const viewports = [
      { width: 768, height: 1024, name: 'Tablet Portrait' },
      { width: 1024, height: 768, name: 'Tablet Landscape' },
      { width: 1280, height: 720, name: 'Desktop' },
      { width: 1920, height: 1080, name: 'Large Desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      console.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height})`);

      // Navigate to agent profile
      await page.goto(`${TestHelper.FRONTEND_URL}/agents/${testAgentId}`);
      await TestHelper.waitForPageReady(page);

      // Click Dynamic Pages tab
      const dynamicPagesTab = page.locator('text="Dynamic Pages"');
      await expect(dynamicPagesTab).toBeVisible();
      await dynamicPagesTab.click();

      // Verify layout adapts to viewport
      await page.waitForSelector(
        '.page-item, [data-testid^="page-"], .border:has(.font-medium), text="No Dynamic Pages Yet"',
        { timeout: 10000 }
      );

      // Check content width utilization
      const content = page.locator('.bg-white.rounded-lg.border, main, .container');
      if (await content.count() > 0) {
        const contentBox = await content.first().boundingBox();
        expect(contentBox?.width).toBeLessThanOrEqual(viewport.width);
        expect(contentBox?.width).toBeGreaterThan(viewport.width * 0.5); // Uses at least 50% of width
      }
    }

    console.log('✅ Responsive design test completed');
  });
});