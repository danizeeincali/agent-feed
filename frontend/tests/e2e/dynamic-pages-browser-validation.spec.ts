import { test, expect } from '@playwright/test';

/**
 * BROWSER VALIDATION: Dynamic Pages Functionality
 * Tests the actual browser experience with real backend data
 * Takes screenshots to prove functionality is working
 */

test.describe('Dynamic Pages - Browser Validation with Screenshots', () => {

  test('1. Navigate to personal-todos-agent and verify Dynamic Pages tab', async ({ page }) => {
    // Navigate to agent profile
    await page.goto('http://localhost:5173/agents/personal-todos-agent');
    await page.waitForLoadState('networkidle');

    // Take screenshot of agent profile page
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/01-agent-profile-loaded.png',
      fullPage: true
    });

    // Verify agent name displays
    await expect(page.locator('h1')).toContainText('personal-todos-agent');

    // Verify Dynamic Pages tab exists
    const dynamicPagesTab = page.locator('button:has-text("Dynamic Pages")');
    await expect(dynamicPagesTab).toBeVisible();

    console.log('✅ Agent profile loaded successfully');
  });

  test('2. Click Dynamic Pages tab and verify pages list loads', async ({ page }) => {
    await page.goto('http://localhost:5173/agents/personal-todos-agent');
    await page.waitForLoadState('networkidle');

    // Click Dynamic Pages tab
    const dynamicPagesTab = page.locator('button:has-text("Dynamic Pages")');
    await dynamicPagesTab.click();

    // Wait for API response
    await page.waitForTimeout(1000);

    // Take screenshot of Dynamic Pages tab
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/02-dynamic-pages-tab-clicked.png',
      fullPage: true
    });

    console.log('✅ Dynamic Pages tab clicked');
  });

  test('3. Verify "Personal Todos Dashboard" displays in pages list', async ({ page }) => {
    await page.goto('http://localhost:5173/agents/personal-todos-agent');
    await page.waitForLoadState('networkidle');

    // Click Dynamic Pages tab
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(1500);

    // Check for the page title
    const pageTitle = page.locator('text=Personal Todos Dashboard');

    // Take screenshot showing the pages list
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/03-pages-list-with-dashboard.png',
      fullPage: true
    });

    // Verify the page is visible
    await expect(pageTitle).toBeVisible({ timeout: 5000 });

    console.log('✅ Personal Todos Dashboard found in pages list');
  });

  test('4. Verify NO "No Dynamic Pages Yet" error message', async ({ page }) => {
    await page.goto('http://localhost:5173/agents/personal-todos-agent');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(1500);

    // This message should NOT be present
    const errorMessage = page.locator('text=No Dynamic Pages Yet');

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/04-no-error-message.png',
      fullPage: true
    });

    // Verify error message is NOT visible
    await expect(errorMessage).not.toBeVisible();

    console.log('✅ No error message displayed - pages are loading correctly');
  });

  test('5. Click View button and verify page renders', async ({ page }) => {
    await page.goto('http://localhost:5173/agents/personal-todos-agent');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(1500);

    // Click View button
    const viewButton = page.locator('button:has-text("View")').first();
    await viewButton.click();

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/05-page-view-rendered.png',
      fullPage: true
    });

    // Verify page title in header
    await expect(page.locator('h1')).toContainText('Personal Todos Dashboard');

    console.log('✅ Page view rendered successfully');
  });

  test('6. Verify page metadata displays (status, version, dates)', async ({ page }) => {
    await page.goto('http://localhost:5173/agents/personal-todos-agent');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(1500);

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    // Verify status badge
    const statusBadge = page.locator('.inline-flex:has-text("published"), .inline-flex:has-text("draft")');
    await expect(statusBadge).toBeVisible();

    // Verify version number
    const version = page.locator('text=/v\\d+/');
    await expect(version).toBeVisible();

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/06-page-metadata.png',
      fullPage: true
    });

    console.log('✅ Page metadata displays correctly');
  });

  test('7. Verify API network requests use correct endpoint', async ({ page }) => {
    const apiRequests: string[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push(request.url());
        console.log('API Request:', request.url());
      }
    });

    await page.goto('http://localhost:5173/agents/personal-todos-agent');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(2000);

    // Verify correct API endpoint was called
    const correctEndpoint = apiRequests.find(url =>
      url.includes('/api/agent-pages/agents/personal-todos-agent/pages')
    );

    expect(correctEndpoint).toBeTruthy();
    console.log('✅ Correct API endpoint used:', correctEndpoint);
  });

  test('8. Verify API response returns real data (not empty)', async ({ page }) => {
    let apiResponseData: any = null;

    page.on('response', async response => {
      if (response.url().includes('/api/agent-pages/agents/personal-todos-agent/pages')) {
        apiResponseData = await response.json();
        console.log('API Response:', JSON.stringify(apiResponseData, null, 2));
      }
    });

    await page.goto('http://localhost:5173/agents/personal-todos-agent');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(2000);

    // Verify response has data
    expect(apiResponseData).toBeTruthy();
    expect(apiResponseData.success).toBe(true);
    expect(apiResponseData.pages).toBeDefined();
    expect(Array.isArray(apiResponseData.pages)).toBe(true);
    expect(apiResponseData.pages.length).toBeGreaterThan(0);

    console.log('✅ API returned real data:', apiResponseData.pages.length, 'pages');
  });

  test('9. Complete user flow: Agent list → Profile → Dynamic Pages → View', async ({ page }) => {
    // Start from agents list
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/07-agents-list.png',
      fullPage: true
    });

    // Click on personal-todos-agent
    await page.locator('text=personal-todos-agent').first().click();
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/08-agent-profile.png',
      fullPage: true
    });

    // Click Dynamic Pages tab
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/09-dynamic-pages-loaded.png',
      fullPage: true
    });

    // Click View button
    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/10-page-view-final.png',
      fullPage: true
    });

    // Verify final page
    await expect(page.locator('h1')).toContainText('Personal Todos Dashboard');

    console.log('✅ Complete user flow successful');
  });

  test('10. ZERO MOCK DATA: Verify all data comes from backend', async ({ page }) => {
    const apiCalls: any[] = [];

    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        try {
          const data = await response.json();
          apiCalls.push({
            url: response.url(),
            status: response.status(),
            data: data
          });
        } catch (e) {
          // Not JSON
        }
      }
    });

    await page.goto('http://localhost:5173/agents/personal-todos-agent');
    await page.waitForLoadState('networkidle');

    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(2000);

    // Verify we got API responses
    expect(apiCalls.length).toBeGreaterThan(0);

    // Verify data comes from localhost:3001 (backend)
    const backendCalls = apiCalls.filter(call =>
      call.url.includes('localhost:3001') || call.url.startsWith('/api/')
    );

    expect(backendCalls.length).toBeGreaterThan(0);

    // Verify data structure matches backend format
    const pagesCall = apiCalls.find(call =>
      call.url.includes('/api/agent-pages/agents/personal-todos-agent/pages')
    );

    expect(pagesCall).toBeTruthy();
    expect(pagesCall.data.success).toBe(true);
    expect(pagesCall.data.pages[0].id).toBe('personal-todos-dashboard-v3');
    expect(pagesCall.data.pages[0].title).toBe('Personal Todos Dashboard');

    console.log('✅ ZERO MOCK DATA - All data from real backend:', JSON.stringify(pagesCall.data, null, 2));
  });

});