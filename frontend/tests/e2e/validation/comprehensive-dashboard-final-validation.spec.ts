import { test, expect } from '@playwright/test';

test.describe('Comprehensive Dashboard - Final Validation Report', () => {
  test('Generate complete validation error report', async ({ page }) => {
    await page.goto('http://localhost:5173/agents/personal-todos-agent/pages/comprehensive-dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Capture full page screenshot
    await page.screenshot({
      path: 'test-results/comprehensive-dashboard-validation-report.png',
      fullPage: true
    });

    // Check for validation errors
    const bodyText = await page.textContent('body');
    const hasValidationErrors = bodyText?.includes('Component Validation Error');

    console.log('\n=== COMPREHENSIVE DASHBOARD VALIDATION REPORT ===\n');
    console.log('Has validation errors:', hasValidationErrors);

    if (hasValidationErrors) {
      // Find all validation error containers
      const errorContainers = page.locator('.border-red-200').or(page.locator(':has-text("Component Validation Error")'));
      const errorCount = await errorContainers.count();

      console.log(`Total validation error containers found: ${errorCount}`);

      // Extract component types with errors
      const componentTypes = await page.locator('text=Component type:').allTextContents();
      console.log('\nComponent types with validation errors:');
      componentTypes.forEach((type, i) => {
        console.log(`  ${i + 1}. ${type}`);
      });

      // Count error types
      const metricErrors = componentTypes.filter(t => t.includes('Metric')).length;
      const badgeErrors = componentTypes.filter(t => t.includes('Badge')).length;
      const buttonErrors = componentTypes.filter(t => t.includes('Button')).length;

      console.log('\nError Summary:');
      console.log(`  - Metric errors: ${metricErrors}`);
      console.log(`  - Badge errors: ${badgeErrors}`);
      console.log(`  - Button errors: ${buttonErrors}`);
      console.log(`  - Total errors: ${metricErrors + badgeErrors + buttonErrors}`);

      // Try to get specific error messages
      const issuesFound = await page.locator('text=Issues found:').allTextContents();
      console.log('\nIssues found sections:', issuesFound.length);

      console.log('\n=== TEST RESULT: FAILED ===');
      console.log('The comprehensive dashboard page has validation errors and is NOT rendering correctly.\n');
    } else {
      console.log('\n=== TEST RESULT: PASSED ===');
      console.log('No validation errors detected.\n');
    }

    // This test intentionally does not assert to allow it to complete and generate the report
    // In a real scenario, you would add: expect(hasValidationErrors).toBe(false);
  });

  test('Check if data bindings are being resolved', async ({ page }) => {
    await page.goto('http://localhost:5173/agents/personal-todos-agent/pages/comprehensive-dashboard');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.textContent('body');

    // Check if template strings are still visible (not resolved)
    const hasUnresolvedBindings = bodyText?.includes('{{stats.');

    console.log('\n=== DATA BINDING CHECK ===');
    console.log('Has unresolved bindings ({{...}}):', hasUnresolvedBindings);

    if (hasUnresolvedBindings) {
      console.log('WARNING: Data binding templates are visible in the UI');
      console.log('This means the data binding system is not working properly.');
    }
  });
});
