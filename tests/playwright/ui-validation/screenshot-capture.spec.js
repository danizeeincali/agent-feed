const { test, expect } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

const SCREENSHOT_DIR = '/workspaces/agent-feed/tests/playwright/ui-validation/screenshots';

test.describe('Error State Screenshot Capture', () => {
  test.beforeAll(async () => {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  });

  test('Capture root page error state', async ({ page }) => {
    console.log('📸 Capturing root page error state...');

    try {
      await page.goto('http://localhost:3000/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
    } catch (error) {
      console.log('Expected navigation error:', error.message);
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'root-page-error.png'),
      fullPage: true
    });

    console.log('✅ Root page screenshot captured');
  });

  test('Capture agents page error state', async ({ page }) => {
    console.log('📸 Capturing agents page error state...');

    try {
      await page.goto('http://localhost:3000/agents', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
    } catch (error) {
      console.log('Expected navigation error:', error.message);
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'agents-page-error.png'),
      fullPage: true
    });

    console.log('✅ Agents page screenshot captured');
  });

  test('Test different viewport sizes', async ({ page }) => {
    console.log('📸 Capturing error states at different viewport sizes...');

    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1366, height: 768, name: 'desktop-standard' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      try {
        await page.goto('http://localhost:3000/agents', { timeout: 30000 });
      } catch (error) {
        console.log(`Expected error for ${viewport.name}:`, error.message);
      }

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `agents-error-${viewport.name}.png`),
        fullPage: true
      });

      console.log(`✅ ${viewport.name} screenshot captured`);
    }
  });
});