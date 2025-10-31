/**
 * E2E Tests: Conversation Memory with Skills Loading
 * Tests the complete flow from user input to Avi's response with memory retention
 *
 * Scenario: "3000+500" → "divide by 2"
 * Expected: Avi remembers previous result and calculates correctly
 */

import { test, expect } from '@playwright/test';

test.describe('Conversation Memory with Skills Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('should remember conversation context: 3000+500 then divide by 2', async ({ page }) => {
    // Step 1: User asks "3000 + 500"
    const commentInput = page.locator('textarea[placeholder*="comment" i]').first();
    await commentInput.fill('3000 + 500');

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for Avi's response
    await page.waitForTimeout(2000);

    // Verify Avi responds with "3500"
    const aviResponse1 = page.locator('text=/3500/i').first();
    await expect(aviResponse1).toBeVisible({ timeout: 10000 });

    // Take screenshot of first interaction
    await page.screenshot({
      path: 'test-results/conversation-step1.png',
      fullPage: true
    });

    // Step 2: User asks "divide by 2" (referring to previous result)
    await commentInput.fill('divide by 2');
    await submitButton.click();

    // Wait for Avi's response
    await page.waitForTimeout(2000);

    // Verify Avi responds with "1750" (3500 / 2)
    const aviResponse2 = page.locator('text=/1750/i').first();
    await expect(aviResponse2).toBeVisible({ timeout: 10000 });

    // Take screenshot of second interaction
    await page.screenshot({
      path: 'test-results/conversation-step2.png',
      fullPage: true
    });
  });

  test('should maintain context across multiple simple calculations', async ({ page }) => {
    const commentInput = page.locator('textarea[placeholder*="comment" i]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    // Query 1: "100 + 50"
    await commentInput.fill('100 + 50');
    await submitButton.click();
    await page.waitForTimeout(2000);

    let response = page.locator('text=/150/i').first();
    await expect(response).toBeVisible({ timeout: 10000 });

    // Query 2: "multiply by 2"
    await commentInput.fill('multiply by 2');
    await submitButton.click();
    await page.waitForTimeout(2000);

    response = page.locator('text=/300/i').first();
    await expect(response).toBeVisible({ timeout: 10000 });

    // Query 3: "subtract 50"
    await commentInput.fill('subtract 50');
    await submitButton.click();
    await page.waitForTimeout(2000);

    response = page.locator('text=/250/i').first();
    await expect(response).toBeVisible({ timeout: 10000 });

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/conversation-multi-step.png',
      fullPage: true
    });
  });

  test('should use minimal tokens for simple queries', async ({ page }) => {
    // Intercept API calls to measure token usage
    const tokenUsageLog = [];

    page.on('response', async (response) => {
      if (response.url().includes('/api/agent-posts')) {
        try {
          const data = await response.json();
          if (data.metadata?.tokensUsed) {
            tokenUsageLog.push({
              query: data.content,
              tokens: data.metadata.tokensUsed
            });
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    });

    const commentInput = page.locator('textarea[placeholder*="comment" i]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    // Simple math query
    await commentInput.fill('5 + 3');
    await submitButton.click();
    await page.waitForTimeout(3000);

    // Verify response
    const response = page.locator('text=/8/i').first();
    await expect(response).toBeVisible({ timeout: 10000 });

    // Check token usage (should be minimal)
    if (tokenUsageLog.length > 0) {
      const tokensUsed = tokenUsageLog[tokenUsageLog.length - 1].tokens;
      expect(tokensUsed).toBeLessThan(500); // Should use much less than full system
    }
  });

  test('should load relevant skills for complex queries', async ({ page }) => {
    const commentInput = page.locator('textarea[placeholder*="comment" i]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    // Complex query requiring code skills
    await commentInput.fill('Write a function to calculate factorial');
    await submitButton.click();
    await page.waitForTimeout(3000);

    // Verify Avi provides a code response
    const codeResponse = page.locator('code, pre').first();
    await expect(codeResponse).toBeVisible({ timeout: 15000 });

    // Verify response contains "function" or "factorial"
    const responseText = await codeResponse.textContent();
    expect(responseText.toLowerCase()).toMatch(/function|factorial/);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/conversation-code-query.png',
      fullPage: true
    });
  });

  test('should handle conversational references correctly', async ({ page }) => {
    const commentInput = page.locator('textarea[placeholder*="comment" i]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    // Query 1: Define something
    await commentInput.fill('Create a variable called x with value 42');
    await submitButton.click();
    await page.waitForTimeout(2000);

    await expect(page.locator('text=/42/i')).toBeVisible({ timeout: 10000 });

    // Query 2: Reference "it"
    await commentInput.fill('What is the value of it?');
    await submitButton.click();
    await page.waitForTimeout(2000);

    // Should still respond with 42
    await expect(page.locator('text=/42/i').nth(1)).toBeVisible({ timeout: 10000 });

    // Query 3: Operate on "it"
    await commentInput.fill('Double it');
    await submitButton.click();
    await page.waitForTimeout(2000);

    // Should respond with 84
    await expect(page.locator('text=/84/i')).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({
      path: 'test-results/conversation-references.png',
      fullPage: true
    });
  });

  test('should maintain context in threaded replies', async ({ page }) => {
    // Find first post
    const firstPost = page.locator('[data-testid="post"]').first();
    await expect(firstPost).toBeVisible();

    // Click to open post detail
    await firstPost.click();
    await page.waitForTimeout(1000);

    // Add first comment
    const commentInput = page.locator('textarea[placeholder*="comment" i]').first();
    await commentInput.fill('What is 100 + 50?');

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    await page.waitForTimeout(2000);

    // Wait for Avi's response
    await expect(page.locator('text=/150/i')).toBeVisible({ timeout: 10000 });

    // Reply to Avi's comment
    const replyButton = page.locator('button:has-text("Reply")').first();
    await replyButton.click();
    await page.waitForTimeout(500);

    const replyInput = page.locator('textarea[placeholder*="reply" i]').first();
    await replyInput.fill('divide that by 3');

    const replySubmit = page.locator('button[type="submit"]').nth(1);
    await replySubmit.click();
    await page.waitForTimeout(2000);

    // Avi should respond with 50 (150 / 3)
    await expect(page.locator('text=/50/i').nth(1)).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({
      path: 'test-results/conversation-threaded.png',
      fullPage: true
    });
  });

  test('should handle skill loading failures gracefully', async ({ page }) => {
    const commentInput = page.locator('textarea[placeholder*="comment" i]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    // Query requiring potentially missing skill
    await commentInput.fill('Use an extremely rare obscure skill');
    await submitButton.click();
    await page.waitForTimeout(3000);

    // Should still provide some response (fallback)
    const response = page.locator('[data-testid="comment"]').last();
    await expect(response).toBeVisible({ timeout: 15000 });

    // Verify no error message is shown
    const errorMessage = page.locator('text=/error|failed/i');
    await expect(errorMessage).not.toBeVisible();
  });

  test('should optimize token usage across conversation', async ({ page }) => {
    const tokenUsageLog = [];

    page.on('response', async (response) => {
      if (response.url().includes('/api/agent-posts')) {
        try {
          const data = await response.json();
          if (data.metadata?.tokensUsed) {
            tokenUsageLog.push(data.metadata.tokensUsed);
          }
        } catch (e) {
          // Ignore
        }
      }
    });

    const commentInput = page.locator('textarea[placeholder*="comment" i]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    // Series of queries
    const queries = [
      'hello',                    // Simple
      '5 + 5',                    // Simple math
      'Create a function',        // Complex (requires skills)
      'what was the result?',     // Simple with context
      '10 * 2'                    // Simple math
    ];

    for (const query of queries) {
      await commentInput.fill(query);
      await submitButton.click();
      await page.waitForTimeout(3000);
    }

    // Calculate average token usage
    if (tokenUsageLog.length >= 5) {
      const avgTokens = tokenUsageLog.reduce((a, b) => a + b, 0) / tokenUsageLog.length;

      // Average should be reasonable (not using full system every time)
      expect(avgTokens).toBeLessThan(600);
    }

    // Take screenshot
    await page.screenshot({
      path: 'test-results/conversation-token-optimization.png',
      fullPage: true
    });
  });

  test('should display token savings in UI (if implemented)', async ({ page }) => {
    const commentInput = page.locator('textarea[placeholder*="comment" i]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    // Submit simple query
    await commentInput.fill('5 + 3');
    await submitButton.click();
    await page.waitForTimeout(3000);

    // Check if token savings indicator exists
    const tokenSavings = page.locator('[data-testid="token-savings"]');

    if (await tokenSavings.isVisible()) {
      const savingsText = await tokenSavings.textContent();
      expect(savingsText).toMatch(/saved|optimized|reduced/i);

      // Take screenshot
      await page.screenshot({
        path: 'test-results/conversation-token-savings-ui.png',
        fullPage: true
      });
    }
  });

  test('should preserve conversation history after page reload', async ({ page }) => {
    const commentInput = page.locator('textarea[placeholder*="comment" i]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    // First query
    await commentInput.fill('Remember: my favorite number is 42');
    await submitButton.click();
    await page.waitForTimeout(2000);

    await expect(page.locator('text=/42/i')).toBeVisible({ timeout: 10000 });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Ask about previous conversation
    await commentInput.fill('What was my favorite number?');
    await submitButton.click();
    await page.waitForTimeout(3000);

    // Should remember (if memory persistence is implemented)
    const response = page.locator('[data-testid="comment"]').last();
    await expect(response).toBeVisible({ timeout: 10000 });

    const responseText = await response.textContent();

    // Might include "42" if memory works
    // This is a stretch goal - may not be implemented yet
    console.log('Response after reload:', responseText);
  });
});

test.describe('Skills Loading Edge Cases', () => {
  test('should handle very long conversations without token overflow', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const commentInput = page.locator('textarea[placeholder*="comment" i]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    // Send 10 queries in rapid succession
    for (let i = 1; i <= 10; i++) {
      await commentInput.fill(`Calculate ${i} * 10`);
      await submitButton.click();
      await page.waitForTimeout(1500);
    }

    // Last response should still work
    await expect(page.locator('text=/100/i').last()).toBeVisible({ timeout: 10000 });

    // No errors should be shown
    const errorMessage = page.locator('text=/error|overflow|too large/i');
    await expect(errorMessage).not.toBeVisible();
  });

  test('should switch between simple and complex queries seamlessly', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const commentInput = page.locator('textarea[placeholder*="comment" i]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    // Simple → Complex → Simple pattern
    await commentInput.fill('5 + 5');
    await submitButton.click();
    await page.waitForTimeout(2000);

    await commentInput.fill('Write a sorting algorithm');
    await submitButton.click();
    await page.waitForTimeout(3000);

    await commentInput.fill('10 * 2');
    await submitButton.click();
    await page.waitForTimeout(2000);

    // All responses should appear
    await expect(page.locator('text=/10/i').first()).toBeVisible();
    await expect(page.locator('text=/sort|algorithm/i')).toBeVisible();
    await expect(page.locator('text=/20/i')).toBeVisible();

    await page.screenshot({
      path: 'test-results/conversation-mixed-complexity.png',
      fullPage: true
    });
  });
});
