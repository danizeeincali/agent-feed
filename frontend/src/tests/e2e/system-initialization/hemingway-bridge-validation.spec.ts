/**
 * E2E Tests: Hemingway Bridge Validation
 * Playwright tests for engagement bridge system
 *
 * Coverage:
 * - AC-5: At least 1 bridge always active
 * - Bridge visibility and engagement
 * - Priority waterfall in action
 *
 * Test Suite: 4 E2E tests
 */

import { test, expect } from '@playwright/test';

test.describe('Hemingway Bridge Validation E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article');
  });

  test('AC-5: At least 1 engagement bridge visible at all times', async ({ page }) => {
    // New user should see initial onboarding bridge
    const pageContent = await page.textContent('body');

    // Should have some engagement point visible
    // Could be: question, CTA, onboarding prompt, etc.
    const hasEngagement = pageContent?.includes('?') || // Questions
                         pageContent?.toLowerCase().includes('get started') ||
                         pageContent?.toLowerCase().includes('what should i call you') ||
                         pageContent?.toLowerCase().includes('tell me') ||
                         pageContent?.toLowerCase().includes('let\'s');

    // AC-5: At least 1 bridge always active
    expect(hasEngagement).toBe(true);

    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/27-initial-bridge.png',
      fullPage: true
    });

    console.log('✓ Initial engagement bridge visible (AC-5)');
  });

  test('AC-5: Bridge persists after user interactions', async ({ page }) => {
    // Interact with the system (provide name if possible)
    const input = page.locator('input[type="text"], textarea').first();

    if (await input.isVisible()) {
      await input.fill('Test User');

      const submitButton = page.locator('button:has-text("Send"), button:has-text("Submit")').first();
      await submitButton.click();

      await page.waitForTimeout(2000);

      // After interaction, should still have engagement point
      const afterContent = await page.textContent('body');

      const stillHasEngagement = afterContent?.includes('?') ||
                                afterContent?.toLowerCase().includes('next') ||
                                afterContent?.toLowerCase().includes('what brings you') ||
                                afterContent?.includes('!');

      // AC-5: Bridge still active after interaction
      expect(stillHasEngagement).toBe(true);

      await page.screenshot({
        path: './docs/test-results/system-initialization/screenshots/28-bridge-after-interaction.png',
        fullPage: true
      });

      console.log('✓ Bridge persists after interaction (AC-5)');
    }
  });

  test('Bridges provide clear next steps', async ({ page }) => {
    await page.waitForTimeout(1000);

    const posts = await page.locator('article').all();

    // At least one post should have clear next step or CTA
    let hasNextStep = false;

    for (const post of posts) {
      const content = await post.textContent();

      const isNextStep = content?.includes('?') || // Question
                        content?.toLowerCase().includes('get started') ||
                        content?.toLowerCase().includes('next') ||
                        content?.toLowerCase().includes('click') ||
                        content?.toLowerCase().includes('try');

      if (isNextStep) {
        hasNextStep = true;
        break;
      }
    }

    expect(hasNextStep).toBe(true);

    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/29-clear-next-steps.png',
      fullPage: true
    });

    console.log('✓ Bridges provide clear next steps');
  });

  test('Bridge content is contextually relevant', async ({ page }) => {
    // For a new user, bridge should be about onboarding
    const pageContent = await page.textContent('body');

    // Should have onboarding-related content
    const isRelevant = pageContent?.toLowerCase().includes('get to know you') ||
                      pageContent?.toLowerCase().includes('what should i call you') ||
                      pageContent?.toLowerCase().includes('welcome') ||
                      pageContent?.toLowerCase().includes('let\'s get started');

    expect(isRelevant).toBe(true);

    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/30-contextual-bridge.png',
      fullPage: true
    });

    console.log('✓ Bridge content is contextually relevant');
  });
});

test.describe('Bridge Priority Waterfall', () => {
  test('Priority 1: Continue thread bridges appear for unanswered questions', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article');

    // Onboarding post should have unanswered question
    const pageContent = await page.textContent('body');

    const hasUnansweredQuestion = pageContent?.toLowerCase().includes('what should i call you') &&
                                 !pageContent?.toLowerCase().includes('answered');

    expect(hasUnansweredQuestion).toBe(true);

    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/31-priority1-continue.png',
      fullPage: true
    });

    console.log('✓ Priority 1 bridge (continue thread) present');
  });

  test('Bridges update as user progresses', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('article');

    // Capture initial bridge state
    const initialContent = await page.textContent('body');
    const initialBridge = initialContent?.toLowerCase().includes('what should i call you');

    await page.screenshot({
      path: './docs/test-results/system-initialization/screenshots/32-bridge-before.png',
      fullPage: true
    });

    // Interact if possible
    const input = page.locator('input, textarea').first();

    if (await input.isVisible()) {
      await input.fill('Sarah');

      const submit = page.locator('button:has-text("Send"), button:has-text("Submit")').first();
      await submit.click();

      await page.waitForTimeout(2000);

      // Bridge should update to next step
      const afterContent = await page.textContent('body');
      const newBridge = afterContent?.toLowerCase().includes('what brings you') ||
                       afterContent?.toLowerCase().includes('use case');

      await page.screenshot({
        path: './docs/test-results/system-initialization/screenshots/33-bridge-after.png',
        fullPage: true
      });

      // Bridge should have changed
      expect(initialBridge !== newBridge).toBe(true);

      console.log('✓ Bridge updates as user progresses');
    }
  });
});
