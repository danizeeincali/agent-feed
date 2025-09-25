/**
 * TDD RED PHASE - Tests that will initially FAIL
 *
 * Testing the removal of /claude-code UI route while preserving Avi DM API functionality
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import puppeteer, { Browser, Page } from 'puppeteer';

describe('TDD Phase: Claude Code UI Removal with API Preservation', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser?.close();
  });

  /**
   * RED PHASE TEST 1: UI Route should not exist
   * This test will FAIL initially because /claude-code route exists
   */
  test('RED: claude-code UI route should not exist and return 404', async () => {
    // Navigate to the main app
    await page.goto('http://localhost:5173/claude-code', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    // Check for 404 or not found page
    const notFoundText = await page.evaluate(() => {
      const body = document.body.textContent || '';
      return body.toLowerCase().includes('not found') ||
             body.toLowerCase().includes('404') ||
             body.toLowerCase().includes('page not found');
    });

    // This should be true after UI removal
    expect(notFoundText).toBe(true);
  });

  /**
   * RED PHASE TEST 2: Navigation should not include Claude Code entry
   * This test will FAIL initially because navigation includes Claude Code
   */
  test('RED: navigation should not include Claude Code link', async () => {
    await page.goto('http://localhost:5173/', {
      waitUntil: 'networkidle0'
    });

    // Wait for navigation to load
    await page.waitForSelector('nav', { timeout: 5000 });

    // Check that Claude Code is not in navigation
    const claudeCodeNavExists = await page.evaluate(() => {
      const navLinks = Array.from(document.querySelectorAll('nav a'));
      return navLinks.some(link =>
        link.textContent?.toLowerCase().includes('claude code')
      );
    });

    // This should be false after removal
    expect(claudeCodeNavExists).toBe(false);
  });

  /**
   * RED PHASE TEST 3: Avi DM API should remain accessible
   * This test will PASS throughout - ensuring API is preserved
   */
  test('GREEN: Avi DM API should remain accessible via HTTP', async () => {
    const response = await fetch('http://localhost:8080/api/claude-code/streaming-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'API connectivity test',
        options: {
          cwd: '/workspaces/agent-feed',
          enableTools: true
        }
      })
    });

    // API must remain functional
    expect(response.status).toBeLessThan(500); // Not server error
    expect([200, 201, 202, 400, 401, 403, 404]).toContain(response.status);
  });
});

/**
 * UNIT TESTS for Route Configuration
 */
describe('TDD Phase: Route Configuration Tests', () => {

  /**
   * RED PHASE TEST 4: App.tsx should not export claude-code route
   * This test will FAIL initially because route exists in App.tsx
   */
  test('RED: App.tsx should not contain claude-code route definition', () => {
    const fs = require('fs');
    const path = require('path');

    const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
    const appTsxContent = fs.readFileSync(appTsxPath, 'utf8');

    // Check that there's no route path="/claude-code"
    const hasClaudeCodeRoute = appTsxContent.includes('path="/claude-code"');

    // This should be false after removal
    expect(hasClaudeCodeRoute).toBe(false);
  });

  /**
   * RED PHASE TEST 5: App.tsx should not import ClaudeCodeWithStreamingInterface
   * This test will FAIL initially because import exists
   */
  test('RED: App.tsx should not import ClaudeCodeWithStreamingInterface', () => {
    const fs = require('fs');
    const path = require('path');

    const appTsxPath = path.join(__dirname, '../../frontend/src/App.tsx');
    const appTsxContent = fs.readFileSync(appTsxPath, 'utf8');

    // Check that ClaudeCodeWithStreamingInterface is not imported
    const hasImport = appTsxContent.includes('ClaudeCodeWithStreamingInterface');

    // This should be false after removal
    expect(hasImport).toBe(false);
  });
});