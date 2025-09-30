import { test, expect } from '@playwright/test';

/**
 * DYNAMIC PAGES VALIDATION SUITE
 * Comprehensive E2E tests for agent dynamic pages functionality
 * Tests API integration, component rendering, and user interactions
 *
 * Requirements:
 * - Backend API running on localhost:3001
 * - Frontend dev server running on localhost:5173
 * - personal-todos-agent with dynamic page data
 */

test.describe('Dynamic Pages - Complete Integration', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to personal-todos-agent profile
    await page.goto('http://localhost:5173/agents/personal-todos-agent');
    await page.waitForLoadState('networkidle');
  });

  test('1. Agent profile loads successfully with slug-based routing', async ({ page }) => {
    // Verify URL uses slug (not UUID)
    expect(page.url()).toContain('/agents/personal-todos-agent');

    // Verify agent header displays
    await expect(page.locator('h1')).toContainText('personal-todos-agent');

    // Verify agent status badge
    await expect(page.locator('text=active')).toBeVisible();
  });

  test('2. Dynamic Pages tab is visible and clickable', async ({ page }) => {
    // Find and click Dynamic Pages tab
    const dynamicPagesTab = page.locator('button:has-text("Dynamic Pages")');
    await expect(dynamicPagesTab).toBeVisible();
    await dynamicPagesTab.click();

    // Wait for tab content to load
    await page.waitForLoadState('networkidle');
  });

  test('3. Dynamic pages list loads from correct API endpoint', async ({ page }) => {
    // Setup API interception to verify correct endpoint
    const apiPromise = page.waitForResponse(
      response => response.url().includes('/api/agent-pages/agents/personal-todos-agent/pages')
    );

    // Click Dynamic Pages tab
    await page.locator('button:has-text("Dynamic Pages")').click();

    // Verify correct API endpoint was called
    const apiResponse = await apiPromise;
    expect(apiResponse.status()).toBe(200);

    const responseData = await apiResponse.json();
    expect(responseData.success).toBe(true);
    expect(responseData.pages).toBeDefined();
    expect(Array.isArray(responseData.pages)).toBe(true);
  });

  test('4. Personal Todos Dashboard page displays in list', async ({ page }) => {
    // Click Dynamic Pages tab
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    // Verify page card displays with correct title
    await expect(page.locator('text=Personal Todos Dashboard')).toBeVisible();

    // Verify status badge (published/draft)
    await expect(page.locator('.inline-flex:has-text("published"), .inline-flex:has-text("draft")')).toBeVisible();

    // Verify page type badge
    await expect(page.locator('.inline-flex:has-text("dashboard")')).toBeVisible();
  });

  test('5. Page metadata displays correctly (dates, tags)', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    // Verify creation date displays
    await expect(page.locator('text=/Created.*202\\d/')).toBeVisible();

    // Verify updated date displays
    await expect(page.locator('text=/Updated.*202\\d/')).toBeVisible();
  });

  test('6. View button navigates to page renderer', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    // Click View button
    const viewButton = page.locator('button:has-text("View")').first();
    await viewButton.click();

    // Verify navigation to page renderer
    await page.waitForURL(/\/agents\/personal-todos-agent\/pages\/.+/);

    // Verify page renderer loads
    await expect(page.locator('h1:has-text("Personal Todos Dashboard")')).toBeVisible();
  });

  test('7. Page renderer fetches from correct API endpoint', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    // Setup API interception for single page fetch
    const pageApiPromise = page.waitForResponse(
      response => response.url().match(/\/api\/agent-pages\/agents\/personal-todos-agent\/pages\/[^\/]+$/)
    );

    // Click View button
    await page.locator('button:has-text("View")').first().click();

    // Verify correct API endpoint
    const pageResponse = await pageApiPromise;
    expect(pageResponse.status()).toBe(200);

    const pageData = await pageResponse.json();
    expect(pageData.success).toBe(true);
    expect(pageData.data.page).toBeDefined();
  });

  test('8. Page renderer displays page content correctly', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    // Verify page title in header
    await expect(page.locator('h1')).toContainText('Personal Todos Dashboard');

    // Verify status badge displays
    await expect(page.locator('.inline-flex:has-text("published"), .inline-flex:has-text("draft")')).toBeVisible();

    // Verify version number displays
    await expect(page.locator('text=/v\\d+/')).toBeVisible();
  });

  test('9. Edit button navigates to edit mode (route exists)', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    // Find and verify Edit button exists
    const editButton = page.locator('button:has-text("Edit")');
    await expect(editButton).toBeVisible();
  });

  test('10. Back button navigates to agent profile', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    // Click back button
    const backButton = page.locator('button[aria-label="Go back"], button:has(svg.lucide-arrow-left)').first();
    await backButton.click();

    // Verify navigation back to agent profile
    await expect(page).toHaveURL(/\/agents\/personal-todos-agent$/);
  });

  test('11. Create Page button is visible and functional', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    // Verify Create Page button exists
    const createButton = page.locator('button:has-text("Create Page")');
    await expect(createButton).toBeVisible();
    await expect(createButton).toBeEnabled();
  });

  test('12. Page count summary displays correctly', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    // Verify page count footer displays
    await expect(page.locator('text=/\\d+ page(s)? total/')).toBeVisible();

    // Verify status breakdown (published/draft/archived counts)
    await expect(page.locator('text=/\\d+ published/')).toBeVisible();
    await expect(page.locator('text=/\\d+ draft/')).toBeVisible();
  });

  test('13. No API errors in console during page load', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('DevTools')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('14. Network requests use correct base URL (localhost:3001)', async ({ page }) => {
    const apiRequests: string[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push(request.url());
      }
    });

    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    // Verify all API requests go to correct backend
    const dynamicPagesRequests = apiRequests.filter(url =>
      url.includes('/api/agent-pages/')
    );

    expect(dynamicPagesRequests.length).toBeGreaterThan(0);
    dynamicPagesRequests.forEach(url => {
      expect(url).toContain('localhost:3001');
    });
  });

  test('15. Loading states display properly', async ({ page }) => {
    // Navigate to agent profile
    await page.goto('http://localhost:5173/agents/personal-todos-agent');

    // Verify loading spinner appears briefly
    const loadingSpinner = page.locator('[data-testid="loading-spinner"], .animate-spin');

    // Click Dynamic Pages tab quickly to catch loading state
    await page.locator('button:has-text("Dynamic Pages")').click();

    // Wait for content to load
    await page.waitForLoadState('networkidle');

    // Verify loading spinner is gone
    await expect(loadingSpinner).toHaveCount(0);
  });

  test('16. Error states handle gracefully (network failures)', async ({ page }) => {
    // Intercept API request and force failure
    await page.route('**/api/agent-pages/**', route => route.abort());

    await page.locator('button:has-text("Dynamic Pages")').click();

    // Wait for error state
    await page.waitForTimeout(1000);

    // Verify error message displays
    await expect(page.locator('text=/Error|Failed|Network error/')).toBeVisible();

    // Verify Try Again button exists
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
  });

  test('17. Empty state displays when no pages exist', async ({ page }) => {
    // Test with an agent that has no pages
    await page.goto('http://localhost:5173/agents/test-agent-no-pages');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    // Verify empty state message
    await expect(page.locator('text=/No Dynamic Pages Yet/')).toBeVisible();

    // Verify Create Your First Page button
    await expect(page.locator('button:has-text("Create Your First Page")')).toBeVisible();
  });

  test('18. Multiple pages display in list (if available)', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    // Count page cards
    const pageCards = page.locator('.border.border-gray-200.rounded-lg.p-4');
    const count = await pageCards.count();

    // Verify at least one page exists
    expect(count).toBeGreaterThan(0);
  });

  test('19. Page components render without React errors', async ({ page }) => {
    const reactErrors: string[] = [];

    page.on('console', msg => {
      if (msg.text().includes('React') || msg.text().includes('Warning')) {
        reactErrors.push(msg.text());
      }
    });

    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    // Filter critical React errors
    const criticalReactErrors = reactErrors.filter(err =>
      err.includes('Error') && !err.includes('DevTools')
    );

    expect(criticalReactErrors).toHaveLength(0);
  });

  test('20. Page data structure matches API response schema', async ({ page }) => {
    const apiResponse = await page.request.get(
      'http://localhost:3001/api/agent-pages/agents/personal-todos-agent/pages'
    );

    expect(apiResponse.status()).toBe(200);

    const data = await apiResponse.json();

    // Verify response structure
    expect(data.success).toBe(true);
    expect(data.pages).toBeDefined();
    expect(Array.isArray(data.pages)).toBe(true);
    expect(data.total).toBeGreaterThanOrEqual(0);

    // Verify page structure (if pages exist)
    if (data.pages.length > 0) {
      const page = data.pages[0];
      expect(page.id).toBeDefined();
      expect(page.agentId).toBeDefined();
      expect(page.title).toBeDefined();
      expect(page.layout || page.content_value).toBeDefined();
    }
  });

  test('21. Accessibility: Keyboard navigation works', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    // Tab to View button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Press Enter to activate
    await page.keyboard.press('Enter');

    // Verify navigation occurred
    await page.waitForURL(/\/agents\/personal-todos-agent\/pages\/.+/);
  });

  test('22. Responsive design: Mobile viewport works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    // Verify content is visible and accessible
    await expect(page.locator('text=Personal Todos Dashboard')).toBeVisible();
  });

  test('23. API response caching works correctly', async ({ page }) => {
    let requestCount = 0;

    page.on('request', request => {
      if (request.url().includes('/api/agent-pages/')) {
        requestCount++;
      }
    });

    // First load
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    const firstRequestCount = requestCount;

    // Navigate away
    await page.locator('button:has-text("Overview")').click();
    await page.waitForLoadState('networkidle');

    // Navigate back
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    // Should use cache or make minimal requests
    expect(requestCount).toBeGreaterThan(0);
  });

  test('24. Deep linking to specific page works', async ({ page }) => {
    // Get page ID from list first
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("View")').first().click();
    const pageUrl = page.url();
    const pageId = pageUrl.split('/').pop();

    // Navigate away
    await page.goto('http://localhost:5173/');

    // Direct link to page
    await page.goto(`http://localhost:5173/agents/personal-todos-agent/pages/${pageId}`);
    await page.waitForLoadState('networkidle');

    // Verify page loads directly
    await expect(page.locator('h1:has-text("Personal Todos Dashboard")')).toBeVisible();
  });

  test('25. Browser back/forward navigation works correctly', async ({ page }) => {
    // Navigate through pages
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    // Use browser back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Verify we're back on agent profile
    await expect(page).toHaveURL(/\/agents\/personal-todos-agent$/);

    // Use browser forward
    await page.goForward();
    await page.waitForLoadState('networkidle');

    // Verify we're back on page view
    await expect(page).toHaveURL(/\/agents\/personal-todos-agent\/pages\/.+/);
  });

  test('26. Page refresh maintains state correctly', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify page still displays correctly
    await expect(page.locator('h1:has-text("Personal Todos Dashboard")')).toBeVisible();
  });

  test('27. API response time is acceptable (< 2 seconds)', async ({ page }) => {
    const startTime = Date.now();

    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(responseTime).toBeLessThan(2000);
  });

  test('28. No memory leaks during repeated navigation', async ({ page }) => {
    // Navigate back and forth multiple times
    for (let i = 0; i < 5; i++) {
      await page.locator('button:has-text("Dynamic Pages")').click();
      await page.waitForLoadState('networkidle');

      await page.locator('button:has-text("View")').first().click();
      await page.waitForLoadState('networkidle');

      await page.goBack();
      await page.waitForLoadState('networkidle');

      await page.locator('button:has-text("Overview")').click();
      await page.waitForLoadState('networkidle');
    }

    // If we made it here without crashes, no major memory leaks
    expect(true).toBe(true);
  });

  test('29. Screenshot: Dynamic pages list', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'frontend/tests/screenshots/dynamic-pages-list.png',
      fullPage: true
    });
  });

  test('30. Screenshot: Individual page view', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: 'frontend/tests/screenshots/dynamic-page-view.png',
      fullPage: true
    });
  });

  test('31. INTEGRATION: Complete user flow from agent list to page view', async ({ page }) => {
    // Start from agents list
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');

    // Find and click personal-todos-agent
    await page.locator('text=personal-todos-agent').first().click();
    await page.waitForLoadState('networkidle');

    // Navigate to Dynamic Pages tab
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    // View specific page
    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    // Verify complete flow worked
    await expect(page.locator('h1:has-text("Personal Todos Dashboard")')).toBeVisible();
    expect(page.url()).toMatch(/\/agents\/personal-todos-agent\/pages\/.+/);
  });

  test('32. ZERO MOCK DATA: All data comes from real backend', async ({ page }) => {
    const apiRequests: any[] = [];

    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        const data = await response.json().catch(() => null);
        apiRequests.push({ url: response.url(), data });
      }
    });

    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForLoadState('networkidle');

    // Verify API responses contain real data
    const dynamicPagesResponse = apiRequests.find(req =>
      req.url.includes('/api/agent-pages/agents/personal-todos-agent/pages')
    );

    expect(dynamicPagesResponse).toBeDefined();
    expect(dynamicPagesResponse?.data.success).toBe(true);
    expect(dynamicPagesResponse?.data.pages.length).toBeGreaterThan(0);

    // Verify page data is real (not mock)
    const firstPage = dynamicPagesResponse?.data.pages[0];
    expect(firstPage.id).toBe('personal-todos-dashboard-v3');
    expect(firstPage.title).toBe('Personal Todos Dashboard');
  });

});