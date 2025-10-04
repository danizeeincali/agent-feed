import { test, expect } from '@playwright/test';

test.describe('Claude Code SSE Integration E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to feed
    await page.goto('http://localhost:5173/');

    // Open Avi DM tab - using button selector since tabs don't have role="tab"
    await page.getByRole('button', { name: /avi dm/i }).click();
    await expect(page.getByPlaceholder(/type your message to avi/i)).toBeVisible();
  });

  test('should display real Claude tool execution activity', async ({ page }) => {
    // Send message that will trigger tool executions
    const input = page.getByPlaceholder(/type your message to avi/i);
    await input.fill('read the file /workspaces/agent-feed/package.json');

    await page.getByRole('button', { name: /send/i }).click();

    // Wait for typing indicator
    await expect(page.locator('text=/Avi/')).toBeVisible({ timeout: 5000 });

    // Screenshot: Initial typing indicator
    await page.screenshot({
      path: 'test-results/claude-sse/typing-indicator-initial.png'
    });

    // Wait for activity text to appear
    // Should see: "Avi - Claude(Processing request)"
    await expect(
      page.locator('text=/Avi.*-.*Claude/i')
    ).toBeVisible({ timeout: 10000 });

    // Screenshot: Processing activity
    await page.screenshot({
      path: 'test-results/claude-sse/activity-processing.png'
    });

    // Wait for Read tool activity
    // Should see: "Avi - Read(package.json)"
    await expect(
      page.locator('text=/Avi.*-.*Read/i')
    ).toBeVisible({ timeout: 15000 });

    // Screenshot: Read tool activity
    await page.screenshot({
      path: 'test-results/claude-sse/activity-read-tool.png'
    });

    // Verify activity text format
    const activityText = await page.locator('text=/Avi.*-/').first().textContent();
    expect(activityText).toMatch(/Avi\s*-\s*.+/);

    console.log('✓ Activity text found:', activityText);

    // Wait for response (activity indicator should disappear)
    await expect(page.locator('text=/Avi.*-/')).not.toBeVisible({ timeout: 30000 });

    // Screenshot: Response complete
    await page.screenshot({
      path: 'test-results/claude-sse/response-complete.png'
    });
  });

  test('should show multiple tool activities in sequence', async ({ page }) => {
    // Send message that triggers multiple tools
    const input = page.getByPlaceholder(/type your message to avi/i);
    await input.fill('run git status and then npm test');

    await page.getByRole('button', { name: /send/i }).click();

    // Collect all activity updates
    const activities: string[] = [];

    // Monitor for activity changes
    const activityLocator = page.locator('text=/Avi.*-/').first();

    for (let i = 0; i < 5; i++) {
      try {
        const text = await activityLocator.textContent({ timeout: 5000 });
        if (text && !activities.includes(text)) {
          activities.push(text);
          console.log(`Activity ${i + 1}:`, text);

          // Screenshot each unique activity
          await page.screenshot({
            path: `test-results/claude-sse/activity-${i + 1}.png`
          });
        }
        await page.waitForTimeout(1000);
      } catch {
        break;
      }
    }

    // Verify multiple activities were captured
    expect(activities.length).toBeGreaterThan(1);
    console.log('✓ Total activities captured:', activities.length);
  });

  test('should handle SSE connection properly', async ({ page }) => {
    // Monitor network for SSE connection
    const sseRequests: any[] = [];

    page.on('request', req => {
      if (req.url().includes('/api/streaming-ticker/stream')) {
        sseRequests.push({
          url: req.url(),
          method: req.method()
        });
      }
    });

    // Send message
    const input = page.getByPlaceholder(/type your message to avi/i);
    await input.fill('test');
    await page.getByRole('button', { name: /send/i }).click();

    // Wait a bit for SSE connection
    await page.waitForTimeout(2000);

    // Verify SSE connection was established
    expect(sseRequests.length).toBeGreaterThan(0);
    expect(sseRequests[0].url).toContain('userId=avi-dm-user');

    console.log('✓ SSE connection established:', sseRequests[0].url);
  });

  test('should not show console errors during tool execution', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Send message
    const input = page.getByPlaceholder(/type your message to avi/i);
    await input.fill('test message');
    await page.getByRole('button', { name: /send/i }).click();

    // Wait for processing
    await page.waitForTimeout(10000);

    // Verify no errors (filter out known non-critical errors)
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('WebSocket') &&
      !err.includes('404')
    );

    expect(criticalErrors.length).toBe(0);

    if (criticalErrors.length > 0) {
      console.log('❌ Critical errors found:', criticalErrors);
    } else {
      console.log('✓ No critical console errors');
    }
  });

  test('should truncate long activity text at 80 chars', async ({ page }) => {
    // Send message that will generate long activity
    const input = page.getByPlaceholder(/type your message to avi/i);
    await input.fill('create a very long task with an extremely detailed description that should be truncated');

    await page.getByRole('button', { name: /send/i }).click();

    // Wait for activity
    await expect(page.locator('text=/Avi.*-/')).toBeVisible({ timeout: 10000 });

    // Get activity text
    const activityText = await page.locator('text=/Avi.*-/').first().textContent();

    // Remove "Avi - " prefix
    const activityOnly = activityText?.replace(/^Avi\s*-\s*/, '') || '';

    // Verify truncation
    expect(activityOnly.length).toBeLessThanOrEqual(83); // 80 + "..."

    console.log('✓ Activity text length:', activityOnly.length);
    console.log('✓ Activity text:', activityOnly);
  });
});
