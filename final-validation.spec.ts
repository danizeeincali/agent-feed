import { test, expect } from '@playwright/test';

test.describe('Final API Fix Validation', () => {
  test('Capture application working state with API fix', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');

    // Wait for application to load
    await page.waitForTimeout(5000);

    // Take screenshot of main page
    await page.screenshot({
      path: 'final-working-application.png',
      fullPage: true
    });

    // Check console for errors (should be minimal now)
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to agents route
    await page.goto('http://localhost:5173/agents');
    await page.waitForTimeout(3000);

    // Capture agents page
    await page.screenshot({
      path: 'final-agents-page.png',
      fullPage: true
    });

    // Verify API endpoints are working
    const agentsResponse = await page.request.get('http://localhost:5173/api/agents');
    expect(agentsResponse.status()).toBe(200);

    const agentsData = await agentsResponse.json();
    expect(agentsData).toHaveLength(5);

    const postsResponse = await page.request.get('http://localhost:5173/api/agent-posts');
    expect(postsResponse.status()).toBe(200);

    const postsData = await postsResponse.json();
    expect(postsData.success).toBe(true);
    expect(postsData.data).toHaveLength(3);

    console.log('✅ All API endpoints working correctly');
    console.log('Console errors after fix:', consoleErrors.length);
  });
});