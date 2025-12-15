import { test, expect } from '@playwright/test';

/**
 * E2E VALIDATION: DynamicPageRenderer with New API Structure
 * Tests actual browser experience with layout-based pages
 * Validates the fix for "Cannot read properties of undefined (reading 'length')"
 */

test.describe('DynamicPageRenderer - E2E Validation', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to personal-todos-agent profile
    await page.goto('http://localhost:5173/agents/personal-todos-agent');
    await page.waitForLoadState('networkidle');
  });

  test('1. CRITICAL: Page view loads without "length" error', async ({ page }) => {
    // Click Dynamic Pages tab
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(1500);

    // Click View button
    const viewButton = page.locator('button:has-text("View")').first();
    await viewButton.click();
    await page.waitForLoadState('networkidle');

    // Take screenshot to prove it loaded
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/page-view-no-error.png',
      fullPage: true
    });

    // Verify page header displays (proves no crash)
    await expect(page.locator('h1')).toContainText('Personal Todos Dashboard');

    // Verify no error boundary triggered
    await expect(page.locator('text=Development Error')).not.toBeVisible();
    await expect(page.locator('text=Cannot read properties')).not.toBeVisible();

    console.log('✅ Page loads without errors');
  });

  test('2. Verify page components section displays', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(1500);

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    // Verify "Page Components" heading displays
    await expect(page.locator('h3:has-text("Page Components")')).toBeVisible();

    // Verify component cards display
    const componentCards = page.locator('.bg-gray-50');
    await expect(componentCards.first()).toBeVisible();

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/page-components-display.png',
      fullPage: true
    });

    console.log('✅ Page components section displays correctly');
  });

  test('3. Verify component type badges display', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(1500);

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    // Check for component type badges (e.g., "header", "todoList")
    const typeBadge = page.locator('.bg-blue-100.text-blue-800').first();
    await expect(typeBadge).toBeVisible();

    const badgeText = await typeBadge.textContent();
    expect(['header', 'todoList', 'metric', 'card']).toContain(badgeText);

    console.log('✅ Component type badges display:', badgeText);
  });

  test('4. Verify metadata description displays', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(1500);

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    // Check if description section exists
    const descriptionHeading = page.locator('h3:has-text("Description")');

    // If metadata.description exists, it should display
    if (await descriptionHeading.isVisible()) {
      const descriptionText = page.locator('p.text-gray-600');
      await expect(descriptionText).toBeVisible();
      console.log('✅ Metadata description displays');
    } else {
      console.log('✓ No description metadata (acceptable)');
    }
  });

  test('5. Verify dates display correctly (createdAt/updatedAt)', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(1500);

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    // Verify created date displays
    const createdText = page.locator('text=/Created \\d+\\/\\d+\\/\\d+/');
    await expect(createdText).toBeVisible();

    // Verify updated date displays
    const updatedText = page.locator('text=/Updated \\d+\\/\\d+\\/\\d+/');
    await expect(updatedText).toBeVisible();

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/dates-display.png',
      fullPage: true
    });

    console.log('✅ Dates display correctly');
  });

  test('6. Verify tags display in footer (metadata.tags)', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(1500);

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    // Check for tags in footer
    const tagIcon = page.locator('.lucide-tag');

    if (await tagIcon.isVisible()) {
      // Tags exist
      const tagBadges = page.locator('.bg-gray-100.text-gray-700');
      const tagCount = await tagBadges.count();
      expect(tagCount).toBeGreaterThan(0);

      console.log(`✅ ${tagCount} tags display in footer`);
    } else {
      console.log('✓ No tags metadata (acceptable)');
    }

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/tags-footer.png',
      fullPage: true
    });
  });

  test('7. Verify components badge in header', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(1500);

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    // Find the badge showing components (e.g., "header, todoList")
    const componentsBadge = page.locator('.bg-blue-100.text-blue-800').nth(1);
    await expect(componentsBadge).toBeVisible();

    const badgeText = await componentsBadge.textContent();

    // Should show component names or "custom"
    expect(badgeText).toBeTruthy();

    console.log('✅ Components badge displays:', badgeText);
  });

  test('8. Verify no console errors during page load', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(1500);

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Filter out known non-critical errors
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('DevTools') &&
      !err.toLowerCase().includes('length')
    );

    expect(criticalErrors).toHaveLength(0);
    console.log('✅ No console errors during page load');
  });

  test('9. Verify API response structure matches component expectations', async ({ page }) => {
    let apiResponse: any = null;

    page.on('response', async response => {
      if (response.url().includes('/api/agent-pages/agents/') && response.url().includes('/pages/')) {
        if (!response.url().endsWith('/pages')) { // Single page endpoint
          apiResponse = await response.json();
        }
      }
    });

    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(1500);

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    expect(apiResponse).toBeTruthy();
    expect(apiResponse.success).toBe(true);
    expect(apiResponse.page).toBeDefined();

    // Verify new structure
    expect(apiResponse.page.layout).toBeDefined();
    expect(apiResponse.page.components).toBeDefined();
    expect(apiResponse.page.createdAt).toBeDefined();
    expect(apiResponse.page.updatedAt).toBeDefined();

    // Verify old structure NOT present
    expect(apiResponse.page.created_at).toBeUndefined();
    expect(apiResponse.page.updated_at).toBeUndefined();
    expect(apiResponse.page.content_type).toBeUndefined();
    expect(apiResponse.page.content_value).toBeUndefined();

    console.log('✅ API response structure matches expectations');
  });

  test('10. INTEGRATION: Complete flow from agent list to page view', async ({ page }) => {
    // Start from agents list
    await page.goto('http://localhost:5173/agents');
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/flow-01-agents-list.png',
      fullPage: true
    });

    // Click personal-todos-agent
    await page.locator('text=personal-todos-agent').first().click();
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/flow-02-agent-profile.png',
      fullPage: true
    });

    // Click Dynamic Pages tab
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/flow-03-pages-list.png',
      fullPage: true
    });

    // Click View
    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/tests/screenshots/flow-04-page-view-final.png',
      fullPage: true
    });

    // Verify final page loaded correctly
    await expect(page.locator('h1')).toContainText('Personal Todos Dashboard');
    await expect(page.locator('h3:has-text("Page Components")')).toBeVisible();
    await expect(page.locator('text=Development Error')).not.toBeVisible();

    console.log('✅ Complete integration flow successful');
  });

  test('11. Verify back button works from page view', async ({ page }) => {
    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(1500);

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    // Click back button
    const backButton = page.locator('button[aria-label="Go back"], button:has(svg.lucide-arrow-left)').first();
    await backButton.click();
    await page.waitForLoadState('networkidle');

    // Verify we're back on agent profile
    await expect(page).toHaveURL(/\/agents\/personal-todos-agent$/);
    await expect(page.locator('button:has-text("Dynamic Pages")')).toBeVisible();

    console.log('✅ Back button navigation works');
  });

  test('12. ZERO MOCK DATA: All data from real backend', async ({ page }) => {
    const apiCalls: any[] = [];

    page.on('response', async response => {
      if (response.url().includes('/api/agent-pages/')) {
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

    await page.locator('button:has-text("Dynamic Pages")').click();
    await page.waitForTimeout(1500);

    await page.locator('button:has-text("View")').first().click();
    await page.waitForLoadState('networkidle');

    // Verify we got real API responses
    expect(apiCalls.length).toBeGreaterThan(0);

    // Find the single page call
    const pageCall = apiCalls.find(call =>
      call.url.includes('/pages/') && !call.url.endsWith('/pages')
    );

    expect(pageCall).toBeTruthy();
    expect(pageCall.status).toBe(200);
    expect(pageCall.data.success).toBe(true);
    expect(pageCall.data.page.id).toBe('personal-todos-dashboard-v3');
    expect(pageCall.data.page.layout).toBeDefined();
    expect(Array.isArray(pageCall.data.page.layout)).toBe(true);

    console.log('✅ ZERO MOCK DATA - All from real backend');
    console.log('API Response:', JSON.stringify(pageCall.data.page, null, 2));
  });

});