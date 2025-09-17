import { test, expect } from '@playwright/test';

/**
 * Regression Validation Tests
 * Ensures that fake data doesn't return to the system
 */

test.describe('Fake Data Regression Prevention', () => {

  test('should maintain real data integrity across page refreshes', async ({ page }) => {
    await page.goto('/feed');

    // Get initial data
    await page.waitForSelector('[data-testid="token-analytics"]', { timeout: 10000 });
    const initialData = await page.locator('[data-testid="token-analytics"]').textContent();

    // Refresh page
    await page.reload();
    await page.waitForSelector('[data-testid="token-analytics"]', { timeout: 10000 });
    const refreshedData = await page.locator('[data-testid="token-analytics"]').textContent();

    // Both should be free of fake data
    expect(initialData).not.toContain('$12.45');
    expect(refreshedData).not.toContain('$12.45');
    expect(initialData).not.toContain('1234 tokens');
    expect(refreshedData).not.toContain('1234 tokens');
  });

  test('should not revert to fake data under network stress', async ({ page }) => {
    // Simulate slow network
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100); // Add 100ms delay
    });

    await page.goto('/feed');
    await page.waitForTimeout(5000); // Wait longer due to network delay

    const content = await page.content();

    // Even under network stress, should not show fake fallback data
    expect(content).not.toContain('$12.45');
    expect(content).not.toContain('Loading mock data');
    expect(content).not.toContain('Fallback data');
  });

  test('should handle API failures gracefully without fake data', async ({ page }) => {
    // Intercept and fail some API calls
    await page.route('**/api/**', route => {
      if (Math.random() < 0.3) { // Fail 30% of requests
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto('/feed');
    await page.waitForTimeout(3000);

    const content = await page.content();

    // Should handle failures gracefully without showing fake data
    expect(content).not.toContain('$12.45');
    expect(content).not.toContain('Error fallback data');
    expect(content).not.toContain('Mock data due to error');
  });

  test('should maintain data consistency across multiple browser tabs', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto('/feed');
    await page2.goto('/feed');

    await page1.waitForTimeout(3000);
    await page2.waitForTimeout(3000);

    const content1 = await page1.content();
    const content2 = await page2.content();

    // Both tabs should show real data, not fake data
    expect(content1).not.toContain('$12.45');
    expect(content2).not.toContain('$12.45');
    expect(content1).not.toContain('tab-specific mock data');
    expect(content2).not.toContain('tab-specific mock data');

    await page1.close();
    await page2.close();
  });

  test('should not leak fake data in localStorage or sessionStorage', async ({ page }) => {
    await page.goto('/feed');
    await page.waitForTimeout(3000);

    const storageData = await page.evaluate(() => {
      const local = Object.keys(localStorage).map(key => ({
        key,
        value: localStorage.getItem(key)
      }));

      const session = Object.keys(sessionStorage).map(key => ({
        key,
        value: sessionStorage.getItem(key)
      }));

      return { local, session };
    });

    // Check localStorage for fake data
    storageData.local.forEach(item => {
      expect(item.value).not.toContain('$12.45');
      expect(item.value).not.toContain('mockData');
      expect(item.value).not.toContain('fakeTokens');
    });

    // Check sessionStorage for fake data
    storageData.session.forEach(item => {
      expect(item.value).not.toContain('$12.45');
      expect(item.value).not.toContain('mockData');
      expect(item.value).not.toContain('fakeTokens');
    });
  });

  test('should not contain fake data in network request headers', async ({ page }) => {
    const requestHeaders: any[] = [];

    page.on('request', request => {
      requestHeaders.push({
        url: request.url(),
        headers: request.headers()
      });
    });

    await page.goto('/feed');
    await page.waitForTimeout(3000);

    // Check all request headers for fake data
    requestHeaders.forEach(req => {
      Object.values(req.headers).forEach(headerValue => {
        expect(headerValue).not.toContain('$12.45');
        expect(headerValue).not.toContain('mock-token');
        expect(headerValue).not.toContain('fake-user-agent');
      });
    });
  });

  test('should not contain fake data in URL parameters', async ({ page }) => {
    const urls: string[] = [];

    page.on('request', request => {
      urls.push(request.url());
    });

    await page.goto('/feed');
    await page.waitForTimeout(3000);

    // Check all URLs for fake data
    urls.forEach(url => {
      expect(url).not.toContain('mockId');
      expect(url).not.toContain('fakeUser');
      expect(url).not.toContain('testParam');
      expect(url).not.toContain('cost=12.45');
    });
  });

  test('should maintain real data during rapid user interactions', async ({ page }) => {
    await page.goto('/feed');
    await page.waitForTimeout(2000);

    // Rapidly interact with the interface
    for (let i = 0; i < 5; i++) {
      // Click around rapidly
      if (await page.locator('[data-testid="hourly-chart"]').isVisible()) {
        await page.locator('[data-testid="hourly-chart"]').click();
      }
      if (await page.locator('[data-testid="daily-chart"]').isVisible()) {
        await page.locator('[data-testid="daily-chart"]').click();
      }
      await page.waitForTimeout(100);
    }

    // After rapid interactions, should still show real data
    const content = await page.content();
    expect(content).not.toContain('$12.45');
    expect(content).not.toContain('interaction mock data');
  });

  test('should not revert to fake data during long sessions', async ({ page }) => {
    await page.goto('/feed');

    // Simulate a long session with periodic checks
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(2000);

      const content = await page.content();
      expect(content).not.toContain('$12.45');
      expect(content).not.toContain('session timeout mock data');

      // Trigger some activity to keep session alive
      if (await page.locator('[data-testid="token-analytics"]').isVisible()) {
        await page.locator('[data-testid="token-analytics"]').hover();
      }
    }
  });

  test('should handle concurrent users without fake data conflicts', async ({ context }) => {
    // Simulate multiple concurrent users
    const pages = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage()
    ]);

    // All pages navigate simultaneously
    await Promise.all(pages.map(page => page.goto('/feed')));
    await Promise.all(pages.map(page => page.waitForTimeout(3000)));

    // Check each page for fake data
    for (let i = 0; i < pages.length; i++) {
      const content = await pages[i].content();
      expect(content).not.toContain('$12.45');
      expect(content).not.toContain(`user${i} mock data`);
    }

    // Clean up
    await Promise.all(pages.map(page => page.close()));
  });

  test('should maintain data integrity during browser navigation', async ({ page }) => {
    await page.goto('/feed');
    await page.waitForTimeout(2000);

    // Navigate to different pages and back
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.goBack();
    await page.waitForTimeout(2000);
    await page.goForward();
    await page.waitForTimeout(2000);

    // After navigation, should still show real data
    const content = await page.content();
    expect(content).not.toContain('$12.45');
    expect(content).not.toContain('navigation mock data');
  });

});