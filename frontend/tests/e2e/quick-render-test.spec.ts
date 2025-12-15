import { test, expect } from '@playwright/test';

test('comprehensive dashboard renders components (not JSON)', async ({ page }) => {
  // Navigate to the comprehensive dashboard page
  await page.goto('http://localhost:5173/agents/personal-todos-agent/pages/comprehensive-dashboard');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Critical check: Should NOT see "Page Data" heading (indicates JSON fallback)
  const pageDataHeading = page.locator('h3:has-text("Page Data")');
  await expect(pageDataHeading).not.toBeVisible();

  // Should see the page title
  await expect(page.locator('h1')).toContainText('Personal Todos');

  // Take screenshot
  await page.screenshot({ path: 'test-render-result.png', fullPage: true });

  console.log('✅ Page renders without JSON fallback');
});
