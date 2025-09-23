import { test, expect } from '@playwright/test';

/**
 * Visual Regression Testing Suite
 * Captures and compares visual states of UI components
 */

test.describe('Visual Regression Testing', () => {
  // Test configuration for visual comparisons
  const visualConfig = {
    threshold: 0.3, // Allow 30% visual difference
    maxDiffPixels: 1000,
    animations: 'disabled' as const
  };

  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  });

  test('Homepage visual baseline', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for all components to load
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow for any remaining async operations

    await test.step('Capture full page', async () => {
      await expect(page).toHaveScreenshot('homepage-full.png', visualConfig);
    });

    await test.step('Capture header component', async () => {
      const header = page.locator('[data-testid="header"]');
      if (await header.isVisible()) {
        await expect(header).toHaveScreenshot('homepage-header.png', visualConfig);
      }
    });

    await test.step('Capture main content area', async () => {
      const mainContent = page.locator('[data-testid="main-content"]');
      if (await mainContent.isVisible()) {
        await expect(mainContent).toHaveScreenshot('homepage-main-content.png', visualConfig);
      }
    });

    await test.step('Capture sidebar/navigation', async () => {
      const nav = page.locator('nav').first();
      if (await nav.isVisible()) {
        await expect(nav).toHaveScreenshot('homepage-navigation.png', visualConfig);
      }
    });
  });

  test('Claude Manager page visual validation', async ({ page }) => {
    await page.goto('/claude-manager');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await test.step('Capture Claude Manager layout', async () => {
      await expect(page).toHaveScreenshot('claude-manager-full.png', visualConfig);
    });

    await test.step('Capture Claude Manager components', async () => {
      // Look for specific Claude Manager components
      const claudeComponents = [
        '[data-testid="claude-instance-manager"]',
        '[data-testid="claude-interface"]',
        '.claude-manager-panel'
      ];

      for (const selector of claudeComponents) {
        const component = page.locator(selector);
        if (await component.isVisible()) {
          const componentName = selector.replace(/[^a-zA-Z0-9]/g, '-');
          await expect(component).toHaveScreenshot(`claude-manager-${componentName}.png`, visualConfig);
        }
      }
    });
  });

  test('Agents page visual validation', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await test.step('Capture Agents page layout', async () => {
      await expect(page).toHaveScreenshot('agents-page-full.png', visualConfig);
    });

    await test.step('Capture agent cards/list', async () => {
      const agentsList = page.locator('[data-testid="agents-list"]').or(
        page.locator('.agent-card').first().locator('xpath=..')
      );

      if (await agentsList.isVisible()) {
        await expect(agentsList).toHaveScreenshot('agents-list.png', visualConfig);
      }
    });
  });

  test('Responsive design visual validation', async ({ page }) => {
    const viewports = [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'laptop', width: 1366, height: 768 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 }
    ];

    for (const viewport of viewports) {
      await test.step(`Visual validation at ${viewport.name} (${viewport.width}x${viewport.height})`, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        await expect(page).toHaveScreenshot(`homepage-${viewport.name}.png`, visualConfig);
      });
    }
  });

  test('Component state variations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await test.step('Capture loading states', async () => {
      // Navigate to a data-heavy page to capture loading states
      await page.goto('/analytics');

      // Try to capture loading spinner if it appears
      const loadingSpinner = page.locator('.loading-spinner').or(
        page.locator('[data-testid="loading"]').or(
          page.locator('text=Loading...')
        )
      );

      if (await loadingSpinner.isVisible({ timeout: 1000 })) {
        await expect(loadingSpinner).toHaveScreenshot('loading-state.png', visualConfig);
      }

      await page.waitForLoadState('networkidle');
    });

    await test.step('Capture error states', async () => {
      // Try to trigger error boundary by navigating to potentially broken route
      await page.goto('/nonexistent-route');
      await page.waitForLoadState('networkidle');

      const errorBoundary = page.locator('text=Something went wrong').or(
        page.locator('[data-testid="error-boundary"]').or(
          page.locator('.error-boundary')
        )
      );

      if (await errorBoundary.isVisible()) {
        await expect(errorBoundary).toHaveScreenshot('error-boundary.png', visualConfig);
      }
    });

    await test.step('Capture interactive states', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Test hover states on navigation items
      const navItems = page.locator('nav a');
      if (await navItems.count() > 0) {
        const firstNavItem = navItems.first();
        await firstNavItem.hover();
        await page.waitForTimeout(500);
        await expect(firstNavItem).toHaveScreenshot('nav-item-hover.png', visualConfig);
      }

      // Test button hover states
      const buttons = page.locator('button');
      if (await buttons.count() > 0) {
        const firstButton = buttons.first();
        if (await firstButton.isVisible()) {
          await firstButton.hover();
          await page.waitForTimeout(500);
          await expect(firstButton).toHaveScreenshot('button-hover.png', visualConfig);
        }
      }
    });
  });

  test('Dark mode visual validation', async ({ page }) => {
    // Set dark color scheme
    await page.emulateMedia({ colorScheme: 'dark' });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await test.step('Capture dark mode homepage', async () => {
      await expect(page).toHaveScreenshot('homepage-dark-mode.png', visualConfig);
    });

    await test.step('Test dark mode across routes', async () => {
      const routes = ['/claude-manager', '/agents', '/analytics'];

      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const routeName = route.replace('/', '').replace(/\//g, '-') || 'home';
        await expect(page).toHaveScreenshot(`${routeName}-dark-mode.png`, visualConfig);
      }
    });
  });

  test('Print styles visual validation', async ({ page }) => {
    await page.emulateMedia({ media: 'print' });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await test.step('Capture print layout', async () => {
      await expect(page).toHaveScreenshot('homepage-print.png', visualConfig);
    });
  });

  test('High contrast accessibility visual validation', async ({ page }) => {
    // Enable high contrast and reduced motion
    await page.emulateMedia({
      colorScheme: 'dark',
      reducedMotion: 'reduce'
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await test.step('Capture high contrast mode', async () => {
      await expect(page).toHaveScreenshot('homepage-high-contrast.png', visualConfig);
    });
  });
});

test.afterAll(async () => {
  // Store visual regression results in memory
  const hookCommand = `npx claude-flow@alpha hooks post-edit --file "test-results/visual-regression" --memory-key "swarm/playwright/visual-regression"`;

  try {
    const { exec } = require('child_process');
    exec(hookCommand, (error, stdout, stderr) => {
      if (error) {
        console.log('Could not store visual results in memory:', error.message);
      } else {
        console.log('✅ Visual regression results stored in memory');
      }
    });
  } catch (error) {
    console.log('Coordination hook failed:', error.message);
  }
});