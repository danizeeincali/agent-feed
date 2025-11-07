/**
 * E2E Test Utilities
 * Shared helper functions for Playwright tests
 */

import { Page, expect } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface TestContext {
  userId: string;
  username: string;
  sessionId: string;
}

/**
 * Wait for WebSocket connection to be established
 */
export async function waitForWebSocket(page: Page, timeout = 10000): Promise<void> {
  await page.waitForFunction(
    () => {
      // Check if socket.io is connected
      const win = window as any;
      return win.socket && win.socket.connected;
    },
    { timeout }
  );
}

/**
 * Create a post via UI
 */
export async function createPost(
  page: Page,
  content: string,
  title?: string
): Promise<void> {
  // Click the create post button
  await page.click('[data-testid="create-post-button"], button:has-text("Create Post")');

  // Wait for the form to appear
  await page.waitForSelector('[data-testid="post-content-input"], textarea', {
    state: 'visible',
  });

  // Fill in title if provided
  if (title) {
    const titleInput = page.locator('[data-testid="post-title-input"], input[placeholder*="Title"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill(title);
    }
  }

  // Fill in content
  await page.fill('[data-testid="post-content-input"], textarea', content);

  // Submit the post
  await page.click('[data-testid="submit-post-button"], button:has-text("Post"), button:has-text("Submit")');

  // Wait for post to appear in feed
  await page.waitForTimeout(1000);
}

/**
 * Wait for agent introduction post to appear
 */
export async function waitForAgentIntroduction(
  page: Page,
  agentId: string,
  timeout = 30000
): Promise<void> {
  await page.waitForSelector(
    `[data-agent-id="${agentId}"], [data-testid*="${agentId}"]`,
    { timeout, state: 'visible' }
  );
}

/**
 * Get engagement score from UI or API
 */
export async function getEngagementScore(page: Page): Promise<number> {
  try {
    // Try to get from UI first
    const scoreElement = page.locator('[data-testid="engagement-score"]').first();
    if (await scoreElement.isVisible()) {
      const text = await scoreElement.textContent();
      const match = text?.match(/\d+/);
      if (match) return parseInt(match[0], 10);
    }

    // Fall back to API call
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/engagement/score');
      const data = await res.json();
      return data.score || 0;
    });

    return response;
  } catch (error) {
    console.warn('Could not get engagement score:', error);
    return 0;
  }
}

/**
 * Increase engagement score by performing interactions
 */
export async function increaseEngagementScore(
  page: Page,
  targetScore: number
): Promise<void> {
  let currentScore = await getEngagementScore(page);

  while (currentScore < targetScore) {
    // Create a post to increase engagement
    await createPost(page, `Engagement post ${Date.now()}`, 'Engagement Test');
    await page.waitForTimeout(2000);

    // Check if an agent introduced
    const newPosts = await page.locator('[data-testid="post-card"]').count();
    if (newPosts > 0) {
      // Like the first post
      const likeButton = page.locator('[data-testid="like-button"]').first();
      if (await likeButton.isVisible()) {
        await likeButton.click();
        await page.waitForTimeout(1000);
      }
    }

    currentScore = await getEngagementScore(page);

    // Safety check to prevent infinite loop
    if (currentScore === 0) {
      console.warn('Engagement score not increasing, breaking loop');
      break;
    }
  }
}

/**
 * Take screenshot with metadata
 */
export async function takeScreenshotWithMetadata(
  page: Page,
  testName: string,
  stepName: string,
  metadata: Record<string, any> = {}
): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${testName}-${stepName}-${timestamp}.png`;
  const screenshotPath = join(process.cwd(), 'test-results', 'screenshots', fileName);

  // Ensure directory exists
  const dir = join(process.cwd(), 'test-results', 'screenshots');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Take screenshot
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // Save metadata
  const metadataPath = screenshotPath.replace('.png', '.json');
  writeFileSync(
    metadataPath,
    JSON.stringify(
      {
        testName,
        stepName,
        timestamp,
        url: page.url(),
        ...metadata,
      },
      null,
      2
    )
  );

  return screenshotPath;
}

/**
 * Check if Phase 1 is completed
 */
export async function isPhase1Completed(page: Page): Promise<boolean> {
  try {
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/user/phase');
      const data = await res.json();
      return data.phase1Completed || false;
    });
    return response;
  } catch (error) {
    console.warn('Could not check Phase 1 status:', error);
    return false;
  }
}

/**
 * Complete Phase 1 (answer get-to-know-you questions)
 */
export async function completePhase1(page: Page): Promise<void> {
  // Wait for get-to-know-you agent introduction
  await waitForAgentIntroduction(page, 'get-to-know-you-agent', 30000);

  // Take screenshot
  await takeScreenshotWithMetadata(
    page,
    'phase1-completion',
    'get-to-know-you-intro',
    { agent: 'get-to-know-you-agent' }
  );

  // Answer the questions by creating posts
  await createPost(page, 'I am a software developer working on AI projects', 'About Me');
  await page.waitForTimeout(2000);

  await createPost(page, 'My goals are to build innovative AI-powered applications', 'My Goals');
  await page.waitForTimeout(2000);

  // Wait for Phase 1 to be marked complete
  await page.waitForFunction(
    async () => {
      const res = await fetch('/api/user/phase');
      const data = await res.json();
      return data.phase1Completed === true;
    },
    { timeout: 30000 }
  );
}

/**
 * Wait for specific agent introduction
 */
export async function waitForSpecificAgent(
  page: Page,
  agentDisplayName: string,
  timeout = 30000
): Promise<void> {
  await page.waitForSelector(
    `text="${agentDisplayName}", [data-testid*="${agentDisplayName.toLowerCase().replace(/\s+/g, '-')}"]`,
    { timeout, state: 'visible' }
  );
}

/**
 * Click "Yes" button in agent introduction
 */
export async function clickYesButton(page: Page): Promise<void> {
  const yesButton = page.locator('button:has-text("Yes"), button:has-text("Show me")').first();
  await yesButton.waitFor({ state: 'visible' });
  await yesButton.click();
}

/**
 * Store test results in swarm memory
 */
export async function storeInSwarmMemory(
  key: string,
  data: Record<string, any>
): Promise<void> {
  const memoryPath = join(process.cwd(), '.swarm', 'memory.db');

  // Ensure directory exists
  const dir = join(process.cwd(), '.swarm');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Load existing memory
  let memory: Record<string, any> = {};
  if (existsSync(memoryPath)) {
    try {
      const content = readFileSync(memoryPath, 'utf-8');
      memory = JSON.parse(content);
    } catch (error) {
      console.warn('Could not load existing memory:', error);
    }
  }

  // Update memory
  memory[key] = {
    ...data,
    timestamp: Date.now(),
    updatedAt: new Date().toISOString(),
  };

  // Save memory
  writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
}

/**
 * Verify WebSocket real-time updates
 */
export async function verifyWebSocketUpdate(
  page: Page,
  eventType: string,
  timeout = 10000
): Promise<boolean> {
  return await page.waitForFunction(
    (type) => {
      const win = window as any;
      if (!win.socketEvents) win.socketEvents = [];

      // Check if event was received
      return win.socketEvents.some((event: any) => event.type === type);
    },
    eventType,
    { timeout }
  ).then(() => true)
   .catch(() => false);
}

/**
 * Setup WebSocket event listener
 */
export async function setupWebSocketListener(page: Page): Promise<void> {
  await page.evaluate(() => {
    const win = window as any;
    if (!win.socketEvents) win.socketEvents = [];

    if (win.socket) {
      win.socket.onAny((eventName: string, ...args: any[]) => {
        win.socketEvents.push({
          type: eventName,
          data: args,
          timestamp: Date.now(),
        });
      });
    }
  });
}

/**
 * Clear test data
 */
export async function clearTestData(page: Page): Promise<void> {
  // Clear local storage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Clear cookies
  await page.context().clearCookies();
}

/**
 * Login or setup test user
 */
export async function setupTestUser(page: Page): Promise<TestContext> {
  // Navigate to the app
  await page.goto('/');

  // Wait for app to load
  await page.waitForLoadState('networkidle');

  // Check if user is already logged in
  const isLoggedIn = await page.evaluate(() => {
    return !!localStorage.getItem('userId');
  });

  if (!isLoggedIn) {
    // Wait for automatic user creation
    await page.waitForTimeout(2000);
  }

  // Get user context
  const context = await page.evaluate(() => {
    return {
      userId: localStorage.getItem('userId') || '',
      username: localStorage.getItem('username') || 'testuser',
      sessionId: localStorage.getItem('sessionId') || '',
    };
  });

  return context as TestContext;
}
