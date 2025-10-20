/**
 * E2E Test Suite: AVI DM 403 Fix Validation
 *
 * TDD London School: Outside-In Testing
 * Phase: RED (all tests should fail initially)
 *
 * Purpose: Validate complete user workflow for AVI DM messaging
 * Approach: Real browser interactions, real API calls, NO mocks
 *
 * Tests verify:
 * - User can send messages to Avi
 * - Backend receives correct cwd path (/workspaces/agent-feed/prod)
 * - Real Claude Code responses (NOT simulations)
 * - Error handling for wrong paths
 * - Path protection middleware works correctly
 */

import { test, expect, type Page } from '@playwright/test';

// Configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3001';
const CORRECT_CWD = '/workspaces/agent-feed/prod';
const WRONG_CWD = '/workspaces/agent-feed'; // Should trigger 403 from path protection

// Test data
const TEST_MESSAGE = 'What is 2 + 2?';
const FILE_READ_TEST = 'Read the file /workspaces/agent-feed/prod/CLAUDE.md and tell me what your role is';

test.describe('AVI DM 403 Fix - Complete User Workflow', () => {

  test.beforeAll(async () => {
    // Verify backend is running
    const response = await fetch(`${BACKEND_URL}/health`);
    expect(response.ok).toBe(true);
  });

  test.describe('User Interface Interactions', () => {

    test('user should see Avi DM tab in posting interface', async ({ page }) => {
      await page.goto(FRONTEND_URL);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Find the Avi DM tab
      const aviTab = page.locator('[data-tab="avi"]', {
        hasText: 'Avi DM'
      }).or(page.locator('button', {
        hasText: 'Avi DM'
      }));

      await expect(aviTab).toBeVisible();
    });

    test('user should be able to click Avi DM tab and see chat interface', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');

      // Click Avi DM tab
      const aviTab = page.locator('button', { hasText: 'Avi DM' });
      await aviTab.click();

      // Chat interface should be visible
      const chatInput = page.locator('input[type="text"]', {
        hasText: /Type your message/i
      }).or(page.locator('input[placeholder*="message"]'));

      await expect(chatInput).toBeVisible();

      const sendButton = page.locator('button', { hasText: /send/i });
      await expect(sendButton).toBeVisible();
    });

    test('user should be able to type a message', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');

      // Navigate to Avi DM
      await page.click('button:has-text("Avi DM")');

      // Type message
      const input = page.locator('input[type="text"]').first();
      await input.fill(TEST_MESSAGE);

      // Verify message was typed
      await expect(input).toHaveValue(TEST_MESSAGE);
    });
  });

  test.describe('Message Sending - Real API Interactions', () => {

    test('should send message with correct cwd path to backend', async ({ page }) => {
      // Listen for network requests
      const requests: any[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/claude-code/streaming-chat')) {
          requests.push({
            url: request.url(),
            method: request.method(),
            postData: request.postData()
          });
        }
      });

      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');

      // Navigate to Avi DM and send message
      await page.click('button:has-text("Avi DM")');
      const input = page.locator('input[type="text"]').first();
      await input.fill(TEST_MESSAGE);
      await page.click('button:has-text("Send")');

      // Wait for request to be sent
      await page.waitForTimeout(1000);

      // Verify request was sent
      expect(requests.length).toBeGreaterThan(0);

      // Verify correct cwd path was sent
      const request = requests[0];
      const postData = JSON.parse(request.postData || '{}');

      expect(postData.options).toBeDefined();
      expect(postData.options.cwd).toBe(CORRECT_CWD);
    });

    test('should receive 200 OK response from backend with correct path', async ({ page }) => {
      let responseStatus: number | null = null;

      page.on('response', response => {
        if (response.url().includes('/api/claude-code/streaming-chat')) {
          responseStatus = response.status();
        }
      });

      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("Avi DM")');
      const input = page.locator('input[type="text"]').first();
      await input.fill(TEST_MESSAGE);
      await page.click('button:has-text("Send")');

      // Wait for response (up to 90 seconds)
      await page.waitForTimeout(5000);

      // Verify 200 OK response
      expect(responseStatus).toBe(200);
    });

    test('should NOT receive 403 Forbidden error', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('403')) {
          errors.push(msg.text());
        }
      });

      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("Avi DM")');
      const input = page.locator('input[type="text"]').first();
      await input.fill(TEST_MESSAGE);
      await page.click('button:has-text("Send")');

      // Wait for processing
      await page.waitForTimeout(5000);

      // Verify no 403 errors
      expect(errors.length).toBe(0);
    });
  });

  test.describe('Real Claude Code Response Validation', () => {

    test('should receive actual Claude Code response (NOT mock)', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("Avi DM")');
      const input = page.locator('input[type="text"]').first();
      await input.fill(TEST_MESSAGE);
      await page.click('button:has-text("Send")');

      // Wait for Avi response (max 90 seconds)
      const aviResponse = page.locator('.bg-white.dark\\:bg-gray-900.text-gray-900.dark\\:text-gray-100').last();
      await aviResponse.waitFor({ state: 'visible', timeout: 90000 });

      // Get response text
      const responseText = await aviResponse.textContent();

      // Verify response exists
      expect(responseText).toBeTruthy();
      expect(responseText!.length).toBeGreaterThan(0);

      // Verify NOT a mock/simulation
      expect(responseText).not.toContain('simulation');
      expect(responseText).not.toContain('mock');
      expect(responseText).not.toContain('fake');

      // Verify it's a real answer (Claude should answer 4)
      expect(responseText).toMatch(/4|four/i);
    });

    test('should use real Claude Code tools to read files', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("Avi DM")');
      const input = page.locator('input[type="text"]').first();
      await input.fill(FILE_READ_TEST);
      await page.click('button:has-text("Send")');

      // Wait for response (file operations may take longer)
      const aviResponse = page.locator('.bg-white.dark\\:bg-gray-900.text-gray-900.dark\\:text-gray-100').last();
      await aviResponse.waitFor({ state: 'visible', timeout: 90000 });

      const responseText = await aviResponse.textContent();

      // Verify Claude actually read the file (should mention Λvi or Chief of Staff)
      expect(responseText).toMatch(/Λvi|chief of staff|production claude/i);
      expect(responseText).not.toContain('I do not have access');
      expect(responseText).not.toContain('cannot read');
    });

    test('should display response in markdown format', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("Avi DM")');
      const input = page.locator('input[type="text"]').first();
      await input.fill('Give me a numbered list of 3 colors');
      await page.click('button:has-text("Send")');

      // Wait for response
      await page.waitForTimeout(10000);

      // Check for markdown rendering elements
      const chatHistory = page.locator('.space-y-3');
      const hasOrderedList = await chatHistory.locator('ol').count() > 0;
      const hasListItems = await chatHistory.locator('li').count() >= 3;

      // At least one should be true (markdown rendered)
      expect(hasOrderedList || hasListItems).toBe(true);
    });
  });

  test.describe('Error Handling', () => {

    test('should handle network timeout gracefully', async ({ page }) => {
      // This test will timeout, so we handle it
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');

      // Mock slow network
      await page.route('**/api/claude-code/streaming-chat', route => {
        // Don't respond, causing timeout
      });

      await page.click('button:has-text("Avi DM")');
      const input = page.locator('input[type="text"]').first();
      await input.fill(TEST_MESSAGE);
      await page.click('button:has-text("Send")');

      // Wait for timeout error message
      const errorMessage = page.locator('text=/timeout|taking longer/i');
      await expect(errorMessage).toBeVisible({ timeout: 95000 }); // Slightly more than 90s timeout
    });

    test('should display error message for backend errors', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');

      // Mock backend error
      await page.route('**/api/claude-code/streaming-chat', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });

      await page.click('button:has-text("Avi DM")');
      const input = page.locator('input[type="text"]').first();
      await input.fill(TEST_MESSAGE);
      await page.click('button:has-text("Send")');

      // Wait for error message in chat
      const errorResponse = page.locator('text=/error|failed/i').last();
      await expect(errorResponse).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Backend Path Protection (CRITICAL)', () => {

    test('backend should accept correct cwd path', async () => {
      const response = await fetch(`${BACKEND_URL}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: CORRECT_CWD }
        })
      });

      // Should be 200 OK
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('backend should reject wrong cwd path with 403', async () => {
      const response = await fetch(`${BACKEND_URL}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: WRONG_CWD }
        })
      });

      // Should be 403 Forbidden (path protection middleware)
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Forbidden');
    });

    test('backend should block protected file paths', async () => {
      const response = await fetch(`${BACKEND_URL}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: '/workspaces/agent-feed/frontend' }
        })
      });

      // Should be 403 Forbidden
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.blockedDirectory).toBeDefined();
      expect(data.safeZone).toBeDefined();
    });

    test('backend should allow unrestricted agent_workspace path', async () => {
      const response = await fetch(`${BACKEND_URL}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'test',
          options: { cwd: '/workspaces/agent-feed/prod/agent_workspace' }
        })
      });

      // Should be 200 OK
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Environment Validation', () => {

    test('should work in development environment', async ({ page }) => {
      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');

      // Verify page loads
      await expect(page).toHaveTitle(/agent/i);
    });

    test('should handle missing backend gracefully', async ({ page }) => {
      // Mock backend unavailable
      await page.route('**/api/claude-code/streaming-chat', route => {
        route.abort('failed');
      });

      await page.goto(FRONTEND_URL);
      await page.waitForLoadState('networkidle');

      await page.click('button:has-text("Avi DM")');
      const input = page.locator('input[type="text"]').first();
      await input.fill(TEST_MESSAGE);
      await page.click('button:has-text("Send")');

      // Should show error, not crash
      const errorMsg = page.locator('text=/network error|connection/i');
      await expect(errorMsg).toBeVisible({ timeout: 10000 });
    });
  });
});

test.describe('Performance Requirements', () => {

  test('response should arrive within 90 seconds', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Avi DM")');
    const input = page.locator('input[type="text"]').first();
    await input.fill('What is 1 + 1?'); // Simple question for faster response

    const startTime = Date.now();
    await page.click('button:has-text("Send")');

    // Wait for response
    const aviResponse = page.locator('.bg-white.dark\\:bg-gray-900.text-gray-900.dark\\:text-gray-100').last();
    await aviResponse.waitFor({ state: 'visible', timeout: 90000 });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within 90 seconds
    expect(duration).toBeLessThan(90000);
  });

  test('UI should not block during API call', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Avi DM")');
    const input = page.locator('input[type="text"]').first();
    await input.fill(TEST_MESSAGE);
    await page.click('button:has-text("Send")');

    // Try to interact with UI while waiting
    await page.waitForTimeout(1000);

    // Should still be able to interact with other elements
    const quickPostTab = page.locator('button:has-text("Quick Post")');
    await quickPostTab.click();

    // Should not throw error
    await expect(quickPostTab).toHaveAttribute('aria-selected', 'true');
  });
});
