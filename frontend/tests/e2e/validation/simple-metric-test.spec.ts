import { test, expect } from '@playwright/test';

test.describe('Metric Component Validation', () => {
  test('Check comprehensive dashboard for Metric validation errors', async ({ page }) => {
    await page.goto('http://localhost:5173/agents/personal-todos-agent/pages/comprehensive-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take a screenshot
    await page.screenshot({
      path: 'test-results/metric-validation-check.png',
      fullPage: true
    });

    // Find all validation errors
    const validationErrors = page.locator('[data-testid="validation-error"]');
    const errorCount = await validationErrors.count();

    console.log(`Found ${errorCount} validation errors`);

    // Get details of each error
    for (let i = 0; i < errorCount; i++) {
      const errorText = await validationErrors.nth(i).textContent();
      console.log(`Error ${i + 1}:`, errorText);
    }

    // Check if any errors mention Metric
    const bodyText = await page.textContent('body');
    const hasMetricError = bodyText?.includes('Metric');

    console.log('Has Metric error:', hasMetricError);

    if (hasMetricError) {
      // Extract specific error message
      const errorDetails = await page.locator('text=Component type').allTextContents();
      console.log('Error details:', errorDetails);
    }
  });
});
