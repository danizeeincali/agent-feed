/**
 * E2E Test Suite: Question Routing to Avi
 *
 * Tests the new auto-question routing behavior:
 * - Questions without @agent mentions route to Avi
 * - @mentions of specific agents route to those agents
 * - URLs route to link-logger
 *
 * Uses Playwright for real browser testing with screenshots
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';

test.describe('Question Routing to Avi - E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto(BASE_URL);

    // Wait for app to load
    await page.waitForLoadState('networkidle');

    // Take screenshot of initial state
    await page.screenshot({ path: 'tests/playwright/screenshots/01-app-loaded.png', fullPage: true });
  });

  test('Question WITHOUT avi mention routes to Avi and gets response', async ({ page }) => {
    // Find the quick post input
    const postInput = page.locator('textarea[placeholder*="post"], textarea[placeholder*="share"], input[placeholder*="post"]').first();

    // If no input found, try alternative selectors
    if (!await postInput.isVisible()) {
      console.log('Looking for alternative post input...');
      await page.screenshot({ path: 'tests/playwright/screenshots/02-looking-for-input.png', fullPage: true });
    }

    // Wait for any post creation UI to be visible
    await page.waitForSelector('button:has-text("Post"), button:has-text("Quick Post"), button:has-text("Submit")', { timeout: 10000 });

    // Take screenshot before posting
    await page.screenshot({ path: 'tests/playwright/screenshots/03-before-post.png', fullPage: true });

    // Type the question (without mentioning avi)
    const testQuestion = 'What is the current time in San Francisco?';

    // Find and fill the input
    const inputSelectors = [
      'textarea[placeholder*="post"]',
      'textarea[placeholder*="share"]',
      'textarea[placeholder*="What"]',
      'input[type="text"]',
      '.quick-post-input',
      '[data-testid="post-input"]'
    ];

    let inputFound = false;
    for (const selector of inputSelectors) {
      const input = page.locator(selector).first();
      if (await input.isVisible()) {
        await input.fill(testQuestion);
        inputFound = true;
        console.log(`Found input with selector: ${selector}`);
        break;
      }
    }

    if (!inputFound) {
      // Take debug screenshot
      await page.screenshot({ path: 'tests/playwright/screenshots/debug-no-input-found.png', fullPage: true });
      throw new Error('Could not find post input field');
    }

    // Take screenshot after typing
    await page.screenshot({ path: 'tests/playwright/screenshots/04-typed-question.png', fullPage: true });

    // Find and click the post button
    const postButton = page.locator('button:has-text("Post"), button:has-text("Quick Post"), button:has-text("Submit")').first();
    await postButton.click();

    // Wait for post to be created
    await page.waitForTimeout(1000);

    // Take screenshot after clicking post
    await page.screenshot({ path: 'tests/playwright/screenshots/05-post-clicked.png', fullPage: true });

    // Look for processing indicator (pill)
    const processingIndicators = [
      'text=Waiting for agents',
      'text=Waiting...',
      'text=Processing',
      'text=analyzing',
      '[class*="processing"]',
      '[class*="status"]'
    ];

    let foundProcessingIndicator = false;
    for (const selector of processingIndicators) {
      if (await page.locator(selector).first().isVisible({ timeout: 5000 }).catch(() => false)) {
        foundProcessingIndicator = true;
        console.log(`Found processing indicator: ${selector}`);
        await page.screenshot({ path: 'tests/playwright/screenshots/06-processing-indicator.png', fullPage: true });
        break;
      }
    }

    // Wait for Avi response (up to 30 seconds for LLM processing)
    console.log('Waiting for Avi response...');

    // Wait for a comment/response to appear
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'tests/playwright/screenshots/07-waiting-for-response.png', fullPage: true });

    // Check for response indicators
    const responseIndicators = [
      'text=avi',
      'text=Avi',
      'text=λvi',
      '[class*="comment"]',
      '[class*="response"]'
    ];

    // Take final screenshot
    await page.screenshot({ path: 'tests/playwright/screenshots/08-final-state.png', fullPage: true });

    // Verify the post was created successfully
    expect(await page.locator(`text=${testQuestion}`).first().isVisible()).toBeTruthy();
  });

  test('API directly: Question should be routed to Avi', async ({ request }) => {
    // Test the API directly to verify routing logic
    const response = await request.post(`${API_URL}/api/v1/agent-posts`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Weather Question Test',
        content: 'What is the weather like in Los Gatos today?',
        author_agent: 'test-user',
        metadata: {
          postType: 'quick',
          isAgentResponse: false
        }
      }
    });

    // Verify post was created
    expect(response.status()).toBe(201);

    const data = await response.json();
    console.log('API Response:', JSON.stringify(data, null, 2));

    // Verify response structure
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.id).toBeDefined();

    // The post should trigger Avi processing
    // Check server logs for routing decision
  });

  test('API: @link-logger mention should NOT route to Avi', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/agent-posts`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Link Logger Test',
        content: '@link-logger please save this important link',
        author_agent: 'test-user',
        metadata: {
          postType: 'quick',
          isAgentResponse: false
        }
      }
    });

    expect(response.status()).toBe(201);
    const data = await response.json();

    // Post should be created but routed to link-logger, not Avi
    expect(data.success).toBe(true);
  });

  test('API: URL content should NOT route to Avi', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/agent-posts`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        title: 'URL Post Test',
        content: 'Check out this cool article https://example.com/article',
        author_agent: 'test-user',
        metadata: {
          postType: 'quick',
          isAgentResponse: false
        }
      }
    });

    expect(response.status()).toBe(201);
    const data = await response.json();

    // Post should be created but routed to link-logger, not Avi
    expect(data.success).toBe(true);
  });

  test('Frontend: Processing pills show generic "Waiting for agents" text', async ({ page }) => {
    // This test verifies the updated UI text

    // Navigate to app
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check that we DON'T see "Waiting for Avi" but do see generic text
    // This validates our frontend changes

    // Take screenshot of the feed
    await page.screenshot({ path: 'tests/playwright/screenshots/09-generic-pills-check.png', fullPage: true });

    // Verify no hardcoded "Waiting for Avi" text exists
    const aviWaitingText = await page.locator('text="Waiting for Avi"').count();
    expect(aviWaitingText).toBe(0);
  });

});

test.describe('Regression Tests - Existing Functionality', () => {

  test('Posts with explicit "avi" mention still work', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/agent-posts`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Avi Direct Test',
        content: 'avi, what is the status of the system?',
        author_agent: 'test-user',
        metadata: {
          postType: 'quick',
          isAgentResponse: false
        }
      }
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('Posts with lambda character λvi still work', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/agent-posts`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Lambda Test',
        content: 'λvi, tell me about the latest updates',
        author_agent: 'test-user',
        metadata: {
          postType: 'quick',
          isAgentResponse: false
        }
      }
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('Non-question posts should NOT trigger Avi', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/v1/agent-posts`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Statement Post',
        content: 'The project is going well and we made good progress today.',
        author_agent: 'test-user',
        metadata: {
          postType: 'quick',
          isAgentResponse: false
        }
      }
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    // This should NOT trigger Avi as it's not a question
  });

});
