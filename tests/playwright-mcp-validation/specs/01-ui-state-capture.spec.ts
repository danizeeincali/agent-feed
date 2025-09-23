import { test, expect, Page, Browser } from '@playwright/test';
import * as fs from 'fs';

/**
 * UI State Capture Tests
 * Captures current broken state of the application for comparison
 */

test.describe('UI State Capture - Current Broken State', () => {
  let screenshotIndex = 0;

  test.beforeEach(async ({ page }) => {
    // Navigate to home page and wait for initial load
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Capture home page broken state', async ({ page }) => {
    await test.step('Wait for page elements', async () => {
      // Wait for main app container
      await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
    });

    await test.step('Capture full page screenshot', async () => {
      await page.screenshot({
        path: `test-results/broken-state/home-page-${++screenshotIndex}.png`,
        fullPage: true
      });
    });

    await test.step('Capture console errors', async () => {
      const consoleLogs = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleLogs.push({
            type: msg.type(),
            text: msg.text(),
            location: msg.location()
          });
        }
      });

      // Force page reload to capture console errors
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Save console errors to file
      if (consoleLogs.length > 0) {
        fs.writeFileSync(
          'test-results/broken-state/console-errors.json',
          JSON.stringify(consoleLogs, null, 2)
        );
      }
    });

    await test.step('Check for white screen condition', async () => {
      const bodyContent = await page.locator('body').textContent();
      const hasContent = bodyContent && bodyContent.trim().length > 0;

      if (!hasContent) {
        await page.screenshot({
          path: `test-results/broken-state/white-screen-detected-${++screenshotIndex}.png`,
          fullPage: true
        });
      }

      // Document the findings
      const stateReport = {
        timestamp: new Date().toISOString(),
        url: page.url(),
        title: await page.title(),
        hasContent,
        bodyTextLength: bodyContent?.length || 0,
        consoleErrors: fs.existsSync('test-results/broken-state/console-errors.json')
      };

      fs.writeFileSync(
        'test-results/broken-state/state-report.json',
        JSON.stringify(stateReport, null, 2)
      );
    });
  });

  test('Capture navigation menu state', async ({ page }) => {
    await test.step('Test sidebar visibility', async () => {
      // Check if sidebar is visible
      const sidebar = page.locator('[data-testid="sidebar"]').first();
      const isVisible = await sidebar.isVisible().catch(() => false);

      await page.screenshot({
        path: `test-results/broken-state/sidebar-state-${++screenshotIndex}.png`,
        fullPage: true
      });

      // Try to click navigation items if they exist
      const navItems = page.locator('nav a');
      const navCount = await navItems.count();

      const navState = {
        sidebarVisible: isVisible,
        navigationItemsCount: navCount,
        navigationItems: []
      };

      for (let i = 0; i < Math.min(navCount, 10); i++) {
        const item = navItems.nth(i);
        const text = await item.textContent();
        const href = await item.getAttribute('href');
        navState.navigationItems.push({ text, href });
      }

      fs.writeFileSync(
        'test-results/broken-state/navigation-state.json',
        JSON.stringify(navState, null, 2)
      );
    });
  });

  test('Capture all route states', async ({ page }) => {
    const routes = [
      '/',
      '/claude-manager',
      '/agents',
      '/workflows',
      '/analytics',
      '/claude-code',
      '/activity',
      '/settings',
      '/performance-monitor'
    ];

    const routeStates = [];

    for (const route of routes) {
      await test.step(`Capture state for route: ${route}`, async () => {
        try {
          await page.goto(route, { timeout: 15000 });
          await page.waitForLoadState('networkidle', { timeout: 10000 });

          // Capture screenshot
          await page.screenshot({
            path: `test-results/broken-state/route-${route.replace(/\//g, '_')}-${++screenshotIndex}.png`,
            fullPage: true
          });

          // Capture route state
          const routeState = {
            route,
            title: await page.title(),
            url: page.url(),
            loaded: true,
            hasErrors: false,
            elements: {
              hasHeader: await page.locator('[data-testid="header"]').isVisible().catch(() => false),
              hasMainContent: await page.locator('[data-testid="main-content"]').isVisible().catch(() => false),
              hasAppContainer: await page.locator('[data-testid="app-container"]').isVisible().catch(() => false)
            }
          };

          routeStates.push(routeState);

        } catch (error) {
          routeStates.push({
            route,
            loaded: false,
            error: error.message,
            hasErrors: true
          });

          await page.screenshot({
            path: `test-results/broken-state/route-error-${route.replace(/\//g, '_')}-${++screenshotIndex}.png`,
            fullPage: true
          });
        }
      });
    }

    // Save all route states
    fs.writeFileSync(
      'test-results/broken-state/all-routes-state.json',
      JSON.stringify(routeStates, null, 2)
    );
  });

  test('Capture component rendering issues', async ({ page }) => {
    await test.step('Check for React error boundaries', async () => {
      // Look for error boundary messages
      const errorBoundaries = page.locator('text=Something went wrong');
      const errorCount = await errorBoundaries.count();

      if (errorCount > 0) {
        await page.screenshot({
          path: `test-results/broken-state/error-boundaries-${++screenshotIndex}.png`,
          fullPage: true
        });
      }

      // Check for missing components or broken layouts
      const suspenseFallbacks = page.locator('text=Loading...');
      const fallbackCount = await suspenseFallbacks.count();

      const componentState = {
        errorBoundariesFound: errorCount,
        suspenseFallbacksFound: fallbackCount,
        timestamp: new Date().toISOString()
      };

      fs.writeFileSync(
        'test-results/broken-state/component-state.json',
        JSON.stringify(componentState, null, 2)
      );
    });
  });
});

test.afterAll(async () => {
  // Store results in memory for coordination
  const hookCommand = `npx claude-flow@alpha hooks post-edit --file "test-results/broken-state" --memory-key "swarm/playwright/broken-state-capture"`;

  try {
    const { exec } = require('child_process');
    exec(hookCommand, (error, stdout, stderr) => {
      if (error) {
        console.log('Could not store results in memory:', error.message);
      } else {
        console.log('✅ Broken state results stored in memory');
      }
    });
  } catch (error) {
    console.log('Coordination hook failed:', error.message);
  }
});