/**
 * CONVERSATION MEMORY VALIDATION - E2E TEST
 *
 * Purpose: Validate the conversation memory fix with REAL browser testing
 * This is NOT a mock test - uses real frontend and backend servers
 *
 * Test Scenarios:
 * 1. Math problem with follow-up: "5949+98" → "divide by 2"
 * 2. Deep threading: Multiple threaded replies maintaining context
 *
 * Expected Behavior:
 * - Avi should maintain conversation context in threaded replies
 * - Avi should respond with correct answer based on previous message
 * - Backend logs should show conversation chain retrieval
 */

import { test, expect, Page } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3001';
const SCREENSHOT_DIR = '/workspaces/agent-feed/frontend/tests/e2e/validation/screenshots';
const BACKEND_LOG_PATH = '/tmp/backend.log';
const TEST_RESULTS_DIR = '/workspaces/agent-feed/frontend/tests/e2e/validation/results';

// Ensure directories exist
mkdirSync(SCREENSHOT_DIR, { recursive: true });
mkdirSync(TEST_RESULTS_DIR, { recursive: true });

// Helper: Wait for Avi's response
async function waitForAviResponse(page: Page, postId: string, timeout = 60000): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Check for Avi's comment in the DOM
    const aviComment = await page.locator(`[data-testid="comment"][data-author="avi"]`).first();

    if (await aviComment.count() > 0) {
      const content = await aviComment.locator('[data-testid="comment-content"]').textContent();
      if (content) {
        return content.trim();
      }
    }

    // Wait and retry
    await page.waitForTimeout(1000);
  }

  throw new Error(`Avi did not respond within ${timeout}ms`);
}

// Helper: Wait for comment to appear
async function waitForComment(page: Page, expectedContent: string, timeout = 60000): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const comments = await page.locator('[data-testid="comment-content"]').allTextContents();
    const found = comments.some(text => text.toLowerCase().includes(expectedContent.toLowerCase()));

    if (found) {
      return true;
    }

    await page.waitForTimeout(1000);
  }

  return false;
}

// Helper: Get backend logs
function getBackendLogs(since: number = 0): string {
  try {
    const logs = readFileSync(BACKEND_LOG_PATH, 'utf-8');
    const lines = logs.split('\n');

    // If since timestamp provided, filter logs after that time
    if (since > 0) {
      // Simple heuristic: get last N lines (rough approximation)
      return lines.slice(-200).join('\n');
    }

    return logs;
  } catch (error) {
    return `Error reading backend logs: ${error}`;
  }
}

// Helper: Save test results
function saveTestResults(scenario: string, data: any) {
  const filename = join(TEST_RESULTS_DIR, `${scenario}-${Date.now()}.json`);
  writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`Test results saved to: ${filename}`);
}

test.describe('Conversation Memory Validation - Real Browser Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Check servers are running
    const backendHealth = await fetch(`${BACKEND_URL}/health`);
    expect(backendHealth.ok).toBe(true);

    // Navigate to frontend
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    // Wait for app to be ready
    await page.waitForSelector('body', { state: 'visible' });
  });

  test('Scenario 1: Math problem with follow-up (5949+98 → divide by 2)', async ({ page }) => {
    const testStartTime = Date.now();
    const results: any = {
      scenario: 'math-follow-up',
      steps: [],
      screenshots: [],
      consoleLogs: [],
      backendLogs: ''
    };

    // Capture console logs
    page.on('console', (msg) => {
      results.consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
    });

    console.log('\n🧪 Starting Scenario 1: Math problem with follow-up');

    try {
      // Step 1: Create post with math question
      console.log('Step 1: Creating post "what is 5949+98?"');

      await page.goto(`${FRONTEND_URL}/#/new-post`);
      await page.waitForLoadState('networkidle');

      // Fill in the post form
      const titleInput = page.locator('input[name="title"], input[placeholder*="Title"]').first();
      await titleInput.fill('Math Question Test');

      const contentInput = page.locator('textarea[name="content"], textarea[placeholder*="content"]').first();
      await contentInput.fill('what is 5949+98?');

      // Submit the post
      const submitButton = page.locator('button[type="submit"], button:has-text("Post"), button:has-text("Create")').first();
      await submitButton.click();

      // Wait for redirect to post page
      await page.waitForURL(/\/#\/.*/, { timeout: 10000 });
      const postUrl = page.url();
      const postId = postUrl.split('/').pop()?.replace('#', '') || '';

      console.log(`✅ Post created with ID: ${postId}`);
      results.steps.push({
        step: 1,
        action: 'Create post',
        postId,
        timestamp: Date.now()
      });

      // Take screenshot
      const screenshot1 = join(SCREENSHOT_DIR, `step1-post-created-${Date.now()}.png`);
      await page.screenshot({ path: screenshot1, fullPage: true });
      results.screenshots.push(screenshot1);
      console.log(`📸 Screenshot saved: ${screenshot1}`);

      // Step 2: Wait for Avi's response
      console.log('Step 2: Waiting for Avi\'s response...');

      await page.waitForTimeout(3000); // Give backend time to process

      // Wait for Avi's comment to appear
      let aviResponse1 = '';
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds

      while (attempts < maxAttempts) {
        const comments = await page.locator('[data-testid="comment"]').all();

        for (const comment of comments) {
          const author = await comment.getAttribute('data-author');
          if (author === 'avi' || author?.toLowerCase().includes('avi')) {
            const content = await comment.locator('[data-testid="comment-content"]').textContent();
            if (content && content.trim()) {
              aviResponse1 = content.trim();
              break;
            }
          }
        }

        if (aviResponse1) break;

        await page.waitForTimeout(1000);
        attempts++;
      }

      console.log(`✅ Avi responded: "${aviResponse1.substring(0, 100)}..."`);
      results.steps.push({
        step: 2,
        action: 'Avi responds to initial question',
        response: aviResponse1,
        timestamp: Date.now()
      });

      // Take screenshot
      const screenshot2 = join(SCREENSHOT_DIR, `step2-avi-responds-${Date.now()}.png`);
      await page.screenshot({ path: screenshot2, fullPage: true });
      results.screenshots.push(screenshot2);
      console.log(`📸 Screenshot saved: ${screenshot2}`);

      // Verify Avi's response contains the correct answer (6047)
      const containsCorrectAnswer = aviResponse1.includes('6047') ||
                                    aviResponse1.includes('six thousand') ||
                                    /6[,\s]?047/.test(aviResponse1);

      expect(containsCorrectAnswer).toBe(true);
      console.log('✅ Avi\'s response contains correct answer (6047)');

      // Step 3: Reply to Avi with "now divide by 2"
      console.log('Step 3: Replying to Avi: "now divide by 2"');

      await page.waitForTimeout(2000);

      // Find Avi's comment and click reply
      const aviComment = page.locator('[data-testid="comment"][data-author*="avi"]').first();
      const replyButton = aviComment.locator('button:has-text("Reply"), button[aria-label*="Reply"]').first();

      if (await replyButton.count() > 0) {
        await replyButton.click();
      } else {
        // Alternative: look for reply input near Avi's comment
        console.log('Reply button not found, looking for reply input...');
      }

      // Find reply input and type message
      const replyInput = page.locator('textarea[placeholder*="reply"], textarea[name="reply"], input[placeholder*="reply"]').first();
      await replyInput.fill('now divide by 2');

      // Submit reply
      const replySubmitButton = page.locator('button:has-text("Reply"), button:has-text("Send"), button[type="submit"]').last();
      await replySubmitButton.click();

      await page.waitForTimeout(1000);

      console.log('✅ Reply sent to Avi');
      results.steps.push({
        step: 3,
        action: 'User replies to Avi',
        message: 'now divide by 2',
        timestamp: Date.now()
      });

      // Step 4: Wait for Avi's second response WITH CONTEXT
      console.log('Step 4: Waiting for Avi\'s response with context...');

      await page.waitForTimeout(3000);

      // Wait for new comment from Avi
      let aviResponse2 = '';
      attempts = 0;

      while (attempts < maxAttempts) {
        const comments = await page.locator('[data-testid="comment"]').all();

        // Look for the SECOND comment from Avi (should be different from first)
        let aviComments = [];
        for (const comment of comments) {
          const author = await comment.getAttribute('data-author');
          if (author === 'avi' || author?.toLowerCase().includes('avi')) {
            const content = await comment.locator('[data-testid="comment-content"]').textContent();
            if (content && content.trim()) {
              aviComments.push(content.trim());
            }
          }
        }

        if (aviComments.length > 1) {
          aviResponse2 = aviComments[aviComments.length - 1]; // Get last comment
          break;
        }

        await page.waitForTimeout(1000);
        attempts++;
      }

      console.log(`✅ Avi responded (second time): "${aviResponse2.substring(0, 100)}..."`);
      results.steps.push({
        step: 4,
        action: 'Avi responds with context',
        response: aviResponse2,
        timestamp: Date.now()
      });

      // Take screenshot
      const screenshot3 = join(SCREENSHOT_DIR, `step3-avi-with-context-${Date.now()}.png`);
      await page.screenshot({ path: screenshot3, fullPage: true });
      results.screenshots.push(screenshot3);
      console.log(`📸 Screenshot saved: ${screenshot3}`);

      // CRITICAL VERIFICATION: Check if Avi maintained context
      const hasContextAnswer = aviResponse2.includes('3023.5') ||
                               aviResponse2.includes('3023') ||
                               aviResponse2.includes('3,023') ||
                               /3[,\s]?023\.?5?/.test(aviResponse2);

      const lostContext = aviResponse2.toLowerCase().includes("i don't see") ||
                          aviResponse2.toLowerCase().includes("what value") ||
                          aviResponse2.toLowerCase().includes("which number");

      results.steps.push({
        step: 5,
        action: 'Verification',
        hasContextAnswer,
        lostContext,
        expectedAnswer: '3023.5',
        actualResponse: aviResponse2
      });

      // Capture backend logs
      results.backendLogs = getBackendLogs(testStartTime);

      // Check for conversation chain logs
      const hasConversationChainLogs = results.backendLogs.includes('💬 Conversation chain') ||
                                       results.backendLogs.includes('🔗 Built conversation chain');

      results.backendAnalysis = {
        hasConversationChainLogs,
        logsSample: results.backendLogs.split('\n').filter((line: string) =>
          line.includes('💬') || line.includes('🔗') || line.includes('conversation')
        ).slice(-20)
      };

      // Save results
      saveTestResults('scenario1-math-followup', results);

      // ASSERTIONS
      console.log('\n🎯 Running assertions...');

      if (lostContext) {
        console.error('❌ FAILED: Avi lost context - responded with "I don\'t see..."');
        console.error(`   Response: ${aviResponse2}`);
        expect(lostContext).toBe(false);
      }

      if (!hasContextAnswer) {
        console.error('❌ FAILED: Avi did not provide correct answer (3023.5)');
        console.error(`   Response: ${aviResponse2}`);
        expect(hasContextAnswer).toBe(true);
      }

      console.log('✅ PASSED: Avi maintained conversation context');
      console.log(`   Expected: 3023.5 or similar`);
      console.log(`   Got: ${aviResponse2}`);

      if (!hasConversationChainLogs) {
        console.warn('⚠️ WARNING: Backend logs do not show conversation chain retrieval');
        console.warn('   This may indicate the fix is not working properly');
      }

    } catch (error) {
      results.error = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      };

      // Capture error screenshot
      const errorScreenshot = join(SCREENSHOT_DIR, `error-scenario1-${Date.now()}.png`);
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      results.screenshots.push(errorScreenshot);

      // Capture backend logs
      results.backendLogs = getBackendLogs(testStartTime);

      // Save results even on error
      saveTestResults('scenario1-math-followup-ERROR', results);

      throw error;
    }
  });

  test('Scenario 2: Deep threading (multiple levels)', async ({ page }) => {
    const testStartTime = Date.now();
    const results: any = {
      scenario: 'deep-threading',
      steps: [],
      screenshots: [],
      consoleLogs: [],
      backendLogs: ''
    };

    // Capture console logs
    page.on('console', (msg) => {
      results.consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
    });

    console.log('\n🧪 Starting Scenario 2: Deep threading test');

    try {
      // Step 1: Create post
      console.log('Step 1: Creating post "what is 100+200?"');

      await page.goto(`${FRONTEND_URL}/#/new-post`);
      await page.waitForLoadState('networkidle');

      const titleInput = page.locator('input[name="title"], input[placeholder*="Title"]').first();
      await titleInput.fill('Deep Threading Test');

      const contentInput = page.locator('textarea[name="content"], textarea[placeholder*="content"]').first();
      await contentInput.fill('what is 100+200?');

      const submitButton = page.locator('button[type="submit"], button:has-text("Post"), button:has-text("Create")').first();
      await submitButton.click();

      await page.waitForURL(/\/#\/.*/, { timeout: 10000 });
      const postUrl = page.url();
      const postId = postUrl.split('/').pop()?.replace('#', '') || '';

      console.log(`✅ Post created with ID: ${postId}`);

      // Screenshot
      const screenshot1 = join(SCREENSHOT_DIR, `step1-deep-thread-post-${Date.now()}.png`);
      await page.screenshot({ path: screenshot1, fullPage: true });
      results.screenshots.push(screenshot1);

      // Step 2: Wait for "300" response
      console.log('Step 2: Waiting for Avi to respond with "300"...');

      await page.waitForTimeout(3000);

      let aviResponse1 = await waitForFirstAviResponse(page);
      console.log(`✅ Avi responded: "${aviResponse1}"`);

      expect(aviResponse1.includes('300')).toBe(true);

      results.steps.push({
        level: 1,
        question: '100+200',
        expectedAnswer: '300',
        actualAnswer: aviResponse1,
        success: aviResponse1.includes('300')
      });

      // Screenshot
      const screenshot2 = join(SCREENSHOT_DIR, `step2-deep-thread-level1-${Date.now()}.png`);
      await page.screenshot({ path: screenshot2, fullPage: true });
      results.screenshots.push(screenshot2);

      // Step 3: Reply "multiply by 2"
      console.log('Step 3: Replying "multiply by 2"...');

      await replyToLastAviComment(page, 'multiply by 2');
      await page.waitForTimeout(3000);

      let aviResponse2 = await waitForNewAviResponse(page, aviResponse1);
      console.log(`✅ Avi responded: "${aviResponse2}"`);

      expect(aviResponse2.includes('600')).toBe(true);

      results.steps.push({
        level: 2,
        question: 'multiply by 2',
        expectedAnswer: '600',
        actualAnswer: aviResponse2,
        success: aviResponse2.includes('600')
      });

      // Screenshot
      const screenshot3 = join(SCREENSHOT_DIR, `step3-deep-thread-level2-${Date.now()}.png`);
      await page.screenshot({ path: screenshot3, fullPage: true });
      results.screenshots.push(screenshot3);

      // Step 4: Reply "divide by 3"
      console.log('Step 4: Replying "divide by 3"...');

      await replyToLastAviComment(page, 'divide by 3');
      await page.waitForTimeout(3000);

      let aviResponse3 = await waitForNewAviResponse(page, aviResponse2);
      console.log(`✅ Avi responded: "${aviResponse3}"`);

      expect(aviResponse3.includes('200')).toBe(true);

      results.steps.push({
        level: 3,
        question: 'divide by 3',
        expectedAnswer: '200',
        actualAnswer: aviResponse3,
        success: aviResponse3.includes('200')
      });

      // Final screenshot
      const screenshot4 = join(SCREENSHOT_DIR, `step4-deep-thread-level3-${Date.now()}.png`);
      await page.screenshot({ path: screenshot4, fullPage: true });
      results.screenshots.push(screenshot4);

      // Capture backend logs
      results.backendLogs = getBackendLogs(testStartTime);

      // Verify conversation chain in logs
      const chainLogs = results.backendLogs.split('\n').filter((line: string) =>
        line.includes('💬 Conversation chain') || line.includes('🔗 Built conversation chain')
      );

      results.backendAnalysis = {
        conversationChainLogs: chainLogs,
        hasMultipleLevels: chainLogs.length >= 2
      };

      // Save results
      saveTestResults('scenario2-deep-threading', results);

      console.log('✅ PASSED: Deep threading test - all levels maintained context');

    } catch (error) {
      results.error = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      };

      const errorScreenshot = join(SCREENSHOT_DIR, `error-scenario2-${Date.now()}.png`);
      await page.screenshot({ path: errorScreenshot, fullPage: true });
      results.screenshots.push(errorScreenshot);

      results.backendLogs = getBackendLogs(testStartTime);
      saveTestResults('scenario2-deep-threading-ERROR', results);

      throw error;
    }
  });
});

// Helper functions for scenario 2
async function waitForFirstAviResponse(page: Page): Promise<string> {
  for (let i = 0; i < 60; i++) {
    const comments = await page.locator('[data-testid="comment"]').all();

    for (const comment of comments) {
      const author = await comment.getAttribute('data-author');
      if (author?.toLowerCase().includes('avi')) {
        const content = await comment.locator('[data-testid="comment-content"]').textContent();
        if (content?.trim()) {
          return content.trim();
        }
      }
    }

    await page.waitForTimeout(1000);
  }

  throw new Error('Avi did not respond');
}

async function waitForNewAviResponse(page: Page, previousResponse: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    const comments = await page.locator('[data-testid="comment"]').all();

    let aviComments: string[] = [];
    for (const comment of comments) {
      const author = await comment.getAttribute('data-author');
      if (author?.toLowerCase().includes('avi')) {
        const content = await comment.locator('[data-testid="comment-content"]').textContent();
        if (content?.trim()) {
          aviComments.push(content.trim());
        }
      }
    }

    // Look for a new response (different from previous)
    const newResponse = aviComments.find(c => c !== previousResponse);
    if (newResponse && aviComments.length > aviComments.indexOf(previousResponse) + 1) {
      return aviComments[aviComments.length - 1];
    }

    await page.waitForTimeout(1000);
  }

  throw new Error('Avi did not respond with new message');
}

async function replyToLastAviComment(page: Page, message: string) {
  const aviComments = page.locator('[data-testid="comment"][data-author*="avi"]');
  const lastComment = aviComments.last();

  const replyButton = lastComment.locator('button:has-text("Reply"), button[aria-label*="Reply"]').first();

  if (await replyButton.count() > 0) {
    await replyButton.click();
    await page.waitForTimeout(500);
  }

  const replyInput = page.locator('textarea[placeholder*="reply"], textarea[name="reply"], input[placeholder*="reply"]').last();
  await replyInput.fill(message);

  const submitButton = page.locator('button:has-text("Reply"), button:has-text("Send"), button[type="submit"]').last();
  await submitButton.click();

  await page.waitForTimeout(1000);
}
