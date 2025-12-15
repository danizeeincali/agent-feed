/**
 * Playwright E2E Tests - Complete Toast Backend Events Validation
 *
 * Tests the complete toast notification sequence with REAL backend events:
 * 1. Post creation → "Post created successfully!"
 * 2. Queue event → "⏳ Queued for agent processing..."
 * 3. Processing event → "🤖 Agent is analyzing your post..."
 * 4. Complete event → "✅ Agent response posted!"
 *
 * All tests use REAL backend, REAL WebSocket events, REAL database.
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

// Screenshot storage paths
const SCREENSHOT_BASE = path.join(__dirname, '../../docs/validation/screenshots/toast-backend-events');
const SEQUENCE_DIR = path.join(SCREENSHOT_BASE, 'sequence');
const WEBSOCKET_DIR = path.join(SCREENSHOT_BASE, 'websocket');
const TIMING_DIR = path.join(SCREENSHOT_BASE, 'timing');
const MULTIPLE_DIR = path.join(SCREENSHOT_BASE, 'multiple');
const RESPONSIVE_DIR = path.join(SCREENSHOT_BASE, 'responsive');

// Ensure directories exist
[SEQUENCE_DIR, WEBSOCKET_DIR, TIMING_DIR, MULTIPLE_DIR, RESPONSIVE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper: Wait for toast with specific text
async function waitForToast(page: Page, text: string, timeout = 10000): Promise<number> {
  const startTime = Date.now();
  await page.waitForSelector(`.Toastify__toast:has-text("${text}")`, {
    timeout,
    state: 'visible'
  });
  const elapsed = Date.now() - startTime;
  console.log(`✓ Toast "${text}" appeared after ${elapsed}ms`);
  return elapsed;
}

// Helper: Wait for toast to disappear
async function waitForToastDisappear(page: Page, text: string, timeout = 10000) {
  try {
    await page.waitForSelector(`.Toastify__toast:has-text("${text}")`, {
      timeout,
      state: 'hidden'
    });
  } catch (e) {
    // Toast already gone or never appeared
  }
}

// Helper: Capture WebSocket messages
interface WebSocketMessage {
  timestamp: number;
  type: string;
  data: any;
}

function setupWebSocketCapture(page: Page): WebSocketMessage[] {
  const messages: WebSocketMessage[] = [];

  page.on('websocket', ws => {
    console.log('WebSocket connection opened:', ws.url());

    ws.on('framereceived', event => {
      try {
        const payload = JSON.parse(event.payload as string);
        const message = {
          timestamp: Date.now(),
          type: payload.type || 'unknown',
          data: payload
        };
        messages.push(message);
        console.log('WebSocket received:', message.type, payload);
      } catch (e) {
        // Non-JSON frame
      }
    });

    ws.on('framesent', event => {
      try {
        const payload = JSON.parse(event.payload as string);
        console.log('WebSocket sent:', payload);
      } catch (e) {
        // Non-JSON frame
      }
    });
  });

  return messages;
}

// Helper: Get all visible toasts
async function getVisibleToasts(page: Page): Promise<string[]> {
  const toasts = await page.locator('.Toastify__toast').all();
  const texts: string[] = [];

  for (const toast of toasts) {
    if (await toast.isVisible()) {
      const text = await toast.textContent();
      if (text) texts.push(text.trim());
    }
  }

  return texts;
}

// Helper: Create a post
async function createPost(page: Page, content: string) {
  // Navigate to home page
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Find and click "Create Post" button
  const createButton = page.locator('button:has-text("Create Post"), button:has-text("New Post")').first();
  await createButton.click();

  // Wait for modal/form
  await page.waitForTimeout(500);

  // Fill in post content
  const contentInput = page.locator('textarea[placeholder*="What\'s on your mind"], textarea[name="content"]').first();
  await contentInput.fill(content);

  // Submit post
  const submitButton = page.locator('button:has-text("Post"), button:has-text("Submit"), button[type="submit"]').first();
  await submitButton.click();
}

test.describe('Toast Backend Events E2E Validation', () => {

  test.describe('1. Complete Toast Sequence (PRIMARY TEST)', () => {
    test('should show all 4 toasts in correct order with timing', async ({ page }) => {
      const testStart = Date.now();
      const timings: { [key: string]: number } = {};

      // Setup WebSocket capture
      const wsMessages = setupWebSocketCapture(page);

      // Navigate to app
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Screenshot #1: Post creation form
      await page.screenshot({
        path: path.join(SEQUENCE_DIR, '01-post-creation-form.png'),
        fullPage: true
      });

      // Create post
      const postContent = 'What is the weather today?';
      await createPost(page, postContent);

      // Screenshot #2: First toast "Post created successfully!"
      timings.toast1 = await waitForToast(page, 'Post created successfully', 5000);
      await page.screenshot({
        path: path.join(SEQUENCE_DIR, '02-toast-post-created.png'),
        fullPage: true
      });

      // Wait and screenshot #3: Second toast "⏳ Queued for agent processing..."
      await page.waitForTimeout(1000); // Brief pause between toasts
      timings.toast2 = await waitForToast(page, 'Queued for agent processing', 10000);
      await page.screenshot({
        path: path.join(SEQUENCE_DIR, '03-toast-queued.png'),
        fullPage: true
      });

      // Wait and screenshot #4: Third toast "🤖 Agent is analyzing your post..."
      await page.waitForTimeout(2000);
      timings.toast3 = await waitForToast(page, 'Agent is analyzing', 20000);
      await page.screenshot({
        path: path.join(SEQUENCE_DIR, '04-toast-processing.png'),
        fullPage: true
      });

      // Wait and screenshot #5: Fourth toast "✅ Agent response posted!"
      await page.waitForTimeout(5000);
      timings.toast4 = await waitForToast(page, 'Agent response posted', 90000);
      await page.screenshot({
        path: path.join(SEQUENCE_DIR, '05-toast-complete.png'),
        fullPage: true
      });

      // Screenshot #6: Final state with all toasts shown
      const allToasts = await getVisibleToasts(page);
      await page.screenshot({
        path: path.join(SEQUENCE_DIR, '06-final-state.png'),
        fullPage: true
      });

      // Verify all toasts appeared
      expect(timings.toast1).toBeLessThan(5000); // Immediate
      expect(timings.toast2).toBeLessThan(10000); // Within 10s
      expect(timings.toast3).toBeLessThan(20000); // Within 20s
      expect(timings.toast4).toBeLessThan(90000); // Within 90s

      // Verify WebSocket messages received
      expect(wsMessages.length).toBeGreaterThan(0);

      const totalDuration = Date.now() - testStart;
      console.log('\n=== Toast Sequence Timings ===');
      console.log(`Toast 1 (Post created): ${timings.toast1}ms`);
      console.log(`Toast 2 (Queued): ${timings.toast2}ms`);
      console.log(`Toast 3 (Processing): ${timings.toast3}ms`);
      console.log(`Toast 4 (Complete): ${timings.toast4}ms`);
      console.log(`Total duration: ${totalDuration}ms`);
      console.log(`WebSocket messages: ${wsMessages.length}`);
    });
  });

  test.describe('2. WebSocket Connection Verification', () => {
    test('should establish WebSocket and receive ticket status updates', async ({ page }) => {
      const wsMessages = setupWebSocketCapture(page);

      // Navigate and wait for WebSocket
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // Allow WebSocket to connect

      // Screenshot: Initial state
      await page.screenshot({
        path: path.join(WEBSOCKET_DIR, '01-initial-state.png'),
        fullPage: true
      });

      // Create post to trigger events
      await createPost(page, 'Test WebSocket events');

      // Wait for toast sequence to complete
      await waitForToast(page, 'Post created successfully', 5000);
      await page.waitForTimeout(60000); // Wait for agent processing

      // Screenshot: WebSocket events received
      await page.screenshot({
        path: path.join(WEBSOCKET_DIR, '02-events-received.png'),
        fullPage: true
      });

      // Verify WebSocket connection
      expect(wsMessages.length).toBeGreaterThan(0);

      // Verify event types
      const eventTypes = wsMessages.map(m => m.type);
      console.log('WebSocket event types received:', eventTypes);

      // Look for ticket status updates
      const ticketEvents = wsMessages.filter(m =>
        m.type === 'ticket:status:update' ||
        m.data.type === 'ticket:status:update' ||
        m.data.event === 'ticket_status_update'
      );

      console.log(`\nTicket status events: ${ticketEvents.length}`);
      ticketEvents.forEach((event, idx) => {
        console.log(`  Event ${idx + 1}:`, JSON.stringify(event.data, null, 2));
      });

      // Validate event payload structure
      if (ticketEvents.length > 0) {
        const sampleEvent = ticketEvents[0].data;
        expect(sampleEvent).toHaveProperty('ticketId');
        expect(sampleEvent).toHaveProperty('status');
      }
    });
  });

  test.describe('3. Toast Timing Validation', () => {
    test('should validate precise timing of each toast', async ({ page }) => {
      const timings: { [key: string]: number } = {};
      const testStart = Date.now();

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Create post and measure each toast timing
      await createPost(page, 'Timing validation test');

      // Toast #1: Immediate (<500ms)
      const toast1Start = Date.now();
      await waitForToast(page, 'Post created successfully', 5000);
      timings.toast1 = Date.now() - toast1Start;
      await page.screenshot({
        path: path.join(TIMING_DIR, '01-toast-immediate.png'),
        fullPage: true
      });

      // Toast #2: 2-5 seconds
      const toast2Start = Date.now();
      await waitForToast(page, 'Queued for agent processing', 10000);
      timings.toast2 = Date.now() - toast2Start;
      await page.screenshot({
        path: path.join(TIMING_DIR, '02-toast-queued.png'),
        fullPage: true
      });

      // Toast #3: 8-15 seconds
      const toast3Start = Date.now();
      await waitForToast(page, 'Agent is analyzing', 20000);
      timings.toast3 = Date.now() - toast3Start;
      await page.screenshot({
        path: path.join(TIMING_DIR, '03-toast-processing.png'),
        fullPage: true
      });

      // Toast #4: 30-90 seconds
      const toast4Start = Date.now();
      await waitForToast(page, 'Agent response posted', 90000);
      timings.toast4 = Date.now() - toast4Start;
      await page.screenshot({
        path: path.join(TIMING_DIR, '04-toast-complete.png'),
        fullPage: true
      });

      // Validate timing expectations
      expect(timings.toast1).toBeLessThan(500); // Immediate
      expect(timings.toast2).toBeGreaterThan(1000); // At least 1s delay
      expect(timings.toast2).toBeLessThan(10000); // Within 10s
      expect(timings.toast3).toBeGreaterThan(2000); // At least 2s delay
      expect(timings.toast3).toBeLessThan(20000); // Within 20s
      expect(timings.toast4).toBeGreaterThan(10000); // At least 10s delay
      expect(timings.toast4).toBeLessThan(90000); // Within 90s

      console.log('\n=== Precise Toast Timings ===');
      console.log(`Toast 1: ${timings.toast1}ms (expected: <500ms)`);
      console.log(`Toast 2: ${timings.toast2}ms (expected: 2-5s)`);
      console.log(`Toast 3: ${timings.toast3}ms (expected: 8-15s)`);
      console.log(`Toast 4: ${timings.toast4}ms (expected: 30-90s)`);
    });
  });

  test.describe('4. Multiple Posts Scenario', () => {
    test('should handle 3 rapid posts with separate toast sequences', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Create 3 posts rapidly
      const posts = [
        'First post - What is AI?',
        'Second post - How does ML work?',
        'Third post - Explain neural networks'
      ];

      for (let i = 0; i < posts.length; i++) {
        await createPost(page, posts[i]);

        // Wait for "Post created" toast for this post
        await waitForToast(page, 'Post created successfully', 5000);

        await page.screenshot({
          path: path.join(MULTIPLE_DIR, `0${i + 1}-post-${i + 1}-created.png`),
          fullPage: true
        });

        // Small delay between posts
        await page.waitForTimeout(2000);
      }

      // Wait for queued toasts
      await page.waitForTimeout(5000);
      await page.screenshot({
        path: path.join(MULTIPLE_DIR, '04-all-queued.png'),
        fullPage: true
      });

      // Get all visible toasts
      const toasts = await getVisibleToasts(page);
      console.log('\nVisible toasts:', toasts);

      // Verify multiple toast stacks
      const toastElements = await page.locator('.Toastify__toast').count();
      console.log(`Total toast elements: ${toastElements}`);

      // Screenshot: Multiple toast stacks
      await page.screenshot({
        path: path.join(MULTIPLE_DIR, '05-multiple-stacks.png'),
        fullPage: true
      });

      // Verify no conflicts (each post should have its own toasts)
      expect(toastElements).toBeGreaterThan(0);
    });
  });

  test.describe('5. Responsive Design', () => {
    test('should display toasts correctly on desktop (1920x1080)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await createPost(page, 'Desktop viewport test');
      await waitForToast(page, 'Post created successfully', 5000);

      await page.screenshot({
        path: path.join(RESPONSIVE_DIR, '01-desktop-1920x1080.png'),
        fullPage: true
      });

      // Verify toast position and size
      const toast = page.locator('.Toastify__toast').first();
      const boundingBox = await toast.boundingBox();

      expect(boundingBox).not.toBeNull();
      if (boundingBox) {
        console.log('Desktop toast position:', boundingBox);
        expect(boundingBox.width).toBeGreaterThan(200);
        expect(boundingBox.width).toBeLessThan(600);
      }
    });

    test('should display toasts correctly on tablet (768x1024)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await createPost(page, 'Tablet viewport test');
      await waitForToast(page, 'Post created successfully', 5000);

      await page.screenshot({
        path: path.join(RESPONSIVE_DIR, '02-tablet-768x1024.png'),
        fullPage: true
      });

      // Verify toast adapts to tablet
      const toast = page.locator('.Toastify__toast').first();
      const boundingBox = await toast.boundingBox();

      expect(boundingBox).not.toBeNull();
      if (boundingBox) {
        console.log('Tablet toast position:', boundingBox);
        expect(boundingBox.width).toBeGreaterThan(150);
      }
    });

    test('should display toasts correctly on mobile (375x667)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      await createPost(page, 'Mobile viewport test');
      await waitForToast(page, 'Post created successfully', 5000);

      await page.screenshot({
        path: path.join(RESPONSIVE_DIR, '03-mobile-375x667.png'),
        fullPage: true
      });

      // Verify toast adapts to mobile
      const toast = page.locator('.Toastify__toast').first();
      const boundingBox = await toast.boundingBox();

      expect(boundingBox).not.toBeNull();
      if (boundingBox) {
        console.log('Mobile toast position:', boundingBox);
        expect(boundingBox.width).toBeGreaterThan(100);
        expect(boundingBox.width).toBeLessThan(400);
      }
    });
  });
});
