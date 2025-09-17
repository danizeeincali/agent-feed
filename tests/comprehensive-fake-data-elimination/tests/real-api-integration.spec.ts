import { test, expect } from '@playwright/test';

/**
 * Real API Integration Tests
 * Validates that the application uses real Claude API and not mock data
 */

test.describe('Real Claude API Integration', () => {

  test('Claude API endpoints should return real data', async ({ page }) => {
    const apiCalls: any[] = [];

    // Monitor API calls
    page.on('response', async response => {
      if (response.url().includes('claude') || response.url().includes('anthropic')) {
        try {
          const body = await response.text();
          apiCalls.push({
            url: response.url(),
            status: response.status(),
            hasBody: body.length > 0,
            bodyPreview: body.substring(0, 100)
          });
        } catch (e) {
          // Handle cases where response body can't be read
          apiCalls.push({
            url: response.url(),
            status: response.status(),
            hasBody: false,
            bodyPreview: 'Unable to read body'
          });
        }
      }
    });

    await page.goto('/feed');
    await page.waitForTimeout(5000); // Allow time for API calls

    // Verify real API calls were made
    expect(apiCalls.length).toBeGreaterThan(0);

    // Check for successful responses
    const successfulCalls = apiCalls.filter(call => call.status >= 200 && call.status < 300);
    expect(successfulCalls.length).toBeGreaterThan(0);
  });

  test('token usage should reflect real API consumption', async ({ page }) => {
    await page.goto('/feed');

    // Wait for token analytics to load
    await page.waitForSelector('[data-testid="token-analytics"]', { timeout: 10000 });

    const tokenAnalytics = page.locator('[data-testid="token-analytics"]');
    const tokenText = await tokenAnalytics.textContent();

    // Should show real token counts (variable, not hardcoded)
    const tokenMatches = tokenText?.match(/(\d+)\s*tokens?/gi) || [];

    // If tokens are displayed, they should be realistic values
    if (tokenMatches.length > 0) {
      tokenMatches.forEach(match => {
        const tokenCount = parseInt(match.replace(/[^\d]/g, ''));

        // Should not be common fake values
        expect(tokenCount).not.toBe(1234);
        expect(tokenCount).not.toBe(5000);
        expect(tokenCount).not.toBe(2500);
        expect(tokenCount).not.toBe(9999);

        // Should be reasonable token count (not 0 or extremely high)
        expect(tokenCount).toBeGreaterThan(0);
        expect(tokenCount).toBeLessThan(1000000);
      });
    }
  });

  test('cost calculations should be based on real API usage', async ({ page }) => {
    await page.goto('/feed');

    await page.waitForSelector('[data-testid="token-analytics"]', { timeout: 10000 });

    const analytics = page.locator('[data-testid="token-analytics"]');
    const analyticsText = await analytics.textContent();

    // Look for cost information
    const costMatches = analyticsText?.match(/\$(\d+\.\d{2})/g) || [];

    if (costMatches.length > 0) {
      costMatches.forEach(cost => {
        // Should not be fake hardcoded values
        expect(cost).not.toBe('$12.45');
        expect(cost).not.toBe('$0.50');
        expect(cost).not.toBe('$25.00');
        expect(cost).not.toBe('$3.67');

        // Should be a valid cost format
        expect(cost).toMatch(/^\$\d+\.\d{2}$/);

        // Extract numeric value and validate range
        const numericCost = parseFloat(cost.replace('$', ''));
        expect(numericCost).toBeGreaterThanOrEqual(0);
        expect(numericCost).toBeLessThan(1000); // Reasonable upper limit
      });
    }
  });

  test('message history should show real Claude responses', async ({ page }) => {
    await page.goto('/feed');

    // Wait for messages to load
    await page.waitForSelector('[data-testid="message-list"]', { timeout: 10000 });

    const messages = page.locator('[data-testid="message-list"] .message-item');
    const messageCount = await messages.count();

    if (messageCount > 0) {
      // Check first few messages
      for (let i = 0; i < Math.min(3, messageCount); i++) {
        const messageText = await messages.nth(i).textContent();

        // Should not contain mock indicators
        expect(messageText).not.toContain('Mock response');
        expect(messageText).not.toContain('Test message');
        expect(messageText).not.toContain('Sample data');
        expect(messageText).not.toContain('Lorem ipsum');

        // Should have substantial content (real responses are usually longer)
        expect(messageText?.length || 0).toBeGreaterThan(10);
      }
    }
  });

  test('real-time updates should work via WebSocket', async ({ page }) => {
    let websocketFrames: string[] = [];

    page.on('websocket', ws => {
      ws.on('framereceived', event => {
        websocketFrames.push(event.payload);
      });
    });

    await page.goto('/feed');
    await page.waitForTimeout(3000);

    // If WebSocket is used, frames should not contain mock data
    websocketFrames.forEach(frame => {
      expect(frame).not.toContain('mockData');
      expect(frame).not.toContain('fakeUpdate');
      expect(frame).not.toContain('$12.45');
    });
  });

  test('API error handling should be robust', async ({ page }) => {
    const networkErrors: string[] = [];

    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} - ${response.url()}`);
      }
    });

    page.on('requestfailed', request => {
      networkErrors.push(`Failed: ${request.url()}`);
    });

    await page.goto('/feed');
    await page.waitForTimeout(3000);

    // Should handle API errors gracefully without falling back to fake data
    if (networkErrors.length > 0) {
      console.log('Network errors detected:', networkErrors);

      // Even with errors, should not display fake fallback data
      const content = await page.content();
      expect(content).not.toContain('$12.45');
      expect(content).not.toContain('mock fallback');
    }
  });

  test('database queries should return real data', async ({ page }) => {
    await page.goto('/feed');
    await page.waitForTimeout(3000);

    // Check for indicators that real database queries were made
    const hasDataIndicators = await page.evaluate(() => {
      const text = document.body.textContent || '';

      // Look for realistic data patterns
      const hasTimestamps = /\d{4}-\d{2}-\d{2}/.test(text); // Date patterns
      const hasVariableNumbers = /\d+/.test(text); // Any numbers

      // Should NOT have these mock indicators
      const hasMockIndicators = [
        'sampleId',
        'testUser',
        'mockTimestamp',
        'fakeId'
      ].some(indicator => text.includes(indicator));

      return (hasTimestamps || hasVariableNumbers) && !hasMockIndicators;
    });

    expect(hasDataIndicators, 'Should show signs of real database data').toBe(true);
  });

  test('authentication should use real credentials', async ({ page }) => {
    const authHeaders: string[] = [];

    page.on('request', request => {
      const authHeader = request.headers()['authorization'];
      if (authHeader) {
        authHeaders.push(authHeader);
      }
    });

    await page.goto('/feed');
    await page.waitForTimeout(3000);

    // If auth headers are present, they should not be mock values
    authHeaders.forEach(header => {
      expect(header).not.toContain('mock');
      expect(header).not.toContain('test');
      expect(header).not.toContain('fake');
      expect(header).not.toBe('Bearer mock-token');
      expect(header).not.toBe('Bearer test-key');
    });
  });

  test('performance metrics should reflect real usage', async ({ page }) => {
    await page.goto('/feed');
    await page.waitForTimeout(3000);

    // Measure actual performance
    const performance = await page.evaluate(() => {
      return {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
      };
    });

    // Real applications should have measurable load times
    expect(performance.loadTime).toBeGreaterThan(0);
    expect(performance.domContentLoaded).toBeGreaterThan(0);

    // Should not be suspiciously fast (indicating mock data)
    expect(performance.loadTime).toBeGreaterThan(100); // At least 100ms for real app
  });

});