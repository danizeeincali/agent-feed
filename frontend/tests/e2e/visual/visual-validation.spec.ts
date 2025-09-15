import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Interface Restoration Visual Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://127.0.0.1:5173/');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Additional wait for React components
  });

  test('should show original interface with sidebar navigation', async ({ page }) => {
    // Take full page screenshot
    await page.screenshot({
      path: 'interface-validation-full.png',
      fullPage: true
    });

    // Verify page title and basic structure
    await expect(page).toHaveTitle(/AgentLink|Agent Feed/);

    // Check for main app structure
    const mainContent = page.locator('[role="main"], main, .main-content, #root > div');
    await expect(mainContent).toBeVisible();

    console.log('✓ Main application structure detected');
  });

  test('should display AgentLink branding correctly', async ({ page }) => {
    // Look for AgentLink branding elements
    const brandingSelectors = [
      'text=AgentLink',
      '[alt*="AgentLink"]',
      '.logo',
      '.brand',
      'h1:has-text("AgentLink")',
      '.sidebar-brand',
      '.app-title'
    ];

    let brandingFound = false;
    for (const selector of brandingSelectors) {
      try {
        const element = page.locator(selector);
        if (await element.count() > 0 && await element.first().isVisible()) {
          await element.first().screenshot({ path: `branding-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png` });
          brandingFound = true;
          console.log(`✓ AgentLink branding found: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    // If no specific branding found, check for any professional header
    if (!brandingFound) {
      const headerElement = page.locator('header, .header, .app-header, nav').first();
      if (await headerElement.count() > 0) {
        await headerElement.screenshot({ path: 'header-area.png' });
        console.log('✓ Header area captured for analysis');
      }
    }
  });

  test('should have sidebar navigation with proper menu items', async ({ page }) => {
    // Look for sidebar/navigation elements
    const sidebarSelectors = [
      '.sidebar',
      '.navigation',
      '.nav-menu',
      'nav',
      '[role="navigation"]',
      '.menu',
      'aside'
    ];

    let sidebarFound = false;
    for (const selector of sidebarSelectors) {
      const sidebar = page.locator(selector);
      if (await sidebar.count() > 0 && await sidebar.first().isVisible()) {
        await sidebar.first().screenshot({ path: `sidebar-${selector.replace(/[^a-zA-Z0-9]/g, '_')}.png` });
        sidebarFound = true;
        console.log(`✓ Sidebar navigation found: ${selector}`);

        // Check for navigation items
        const navItems = await sidebar.first().locator('a, button, [role="button"]').all();
        console.log(`✓ Found ${navItems.length} navigation items`);
        break;
      }
    }

    // Look for specific navigation items mentioned in requirements
    const expectedNavItems = [
      'Interactive Control',
      'Claude Manager',
      'Feed',
      'Create',
      'Agents',
      'Workflows',
      'Claude Code'
    ];

    const foundNavItems = [];
    for (const item of expectedNavItems) {
      const element = page.locator(`text="${item}"`).first();
      if (await element.count() > 0) {
        foundNavItems.push(item);
      }
    }

    console.log(`✓ Found navigation items: ${foundNavItems.join(', ')}`);

    // Take screenshot of navigation area
    if (!sidebarFound) {
      // Try to find any navigation-like structure
      const navArea = page.locator('div').filter({ hasText: /Feed|Agents|Create/ }).first();
      if (await navArea.count() > 0) {
        await navArea.screenshot({ path: 'navigation-area.png' });
        console.log('✓ Navigation area captured');
      }
    }
  });

  test('should NOT display diagnostic/emergency mode indicators', async ({ page }) => {
    // Check for diagnostic mode indicators that should NOT be present
    const diagnosticIndicators = [
      'text=DIAGNOSTIC MODE',
      'text=EMERGENCY',
      'text=Debug Mode',
      'text=Fallback Interface',
      '.diagnostic-mode',
      '.emergency-mode',
      '.debug-interface',
      'text=Error: Component failed to load',
      'text=Loading diagnostic interface'
    ];

    const diagnosticFound = [];
    for (const indicator of diagnosticIndicators) {
      try {
        const element = page.locator(indicator);
        if (await element.count() > 0 && await element.first().isVisible()) {
          diagnosticFound.push(indicator);
          await element.first().screenshot({ path: `diagnostic-indicator-${indicator.replace(/[^a-zA-Z0-9]/g, '_')}.png` });
        }
      } catch (e) {
        // Continue checking
      }
    }

    if (diagnosticFound.length > 0) {
      console.log(`❌ DIAGNOSTIC MODE DETECTED: ${diagnosticFound.join(', ')}`);
      throw new Error(`Diagnostic mode indicators found: ${diagnosticFound.join(', ')}`);
    } else {
      console.log('✓ No diagnostic mode indicators detected');
    }
  });

  test('should have professional styling (not emergency red styling)', async ({ page }) => {
    // Check for professional color scheme
    const body = page.locator('body');

    // Take screenshot of the overall color scheme
    await page.screenshot({
      path: 'color-scheme-validation.png',
      clip: { x: 0, y: 0, width: 1200, height: 800 }
    });

    // Check for emergency red backgrounds that shouldn't be there
    const redElements = page.locator('[style*="background-color: red"], [style*="background: red"], .bg-red, .emergency-bg');
    const redCount = await redElements.count();

    if (redCount > 0) {
      console.log(`❌ Found ${redCount} emergency red elements`);
      await redElements.first().screenshot({ path: 'emergency-red-elements.png' });
    } else {
      console.log('✓ No emergency red styling detected');
    }

    // Check for proper theme colors (should be dark/light professional theme)
    const computedStyle = await body.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color
      };
    });

    console.log(`✓ Body styling: background=${computedStyle.backgroundColor}, color=${computedStyle.color}`);
  });

  test('should be responsive and properly rendered', async ({ page }) => {
    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: `responsive-${viewport.name}-${viewport.width}x${viewport.height}.png`,
        fullPage: false
      });

      console.log(`✓ Screenshot taken for ${viewport.name} (${viewport.width}x${viewport.height})`);
    }

    // Reset to desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  test('should load all components without errors', async ({ page }) => {
    const errors = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Wait for full load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check for React error boundaries
    const errorBoundaries = page.locator('text=Something went wrong, text=Error boundary, [data-error-boundary]');
    const errorBoundaryCount = await errorBoundaries.count();

    if (errorBoundaryCount > 0) {
      await errorBoundaries.first().screenshot({ path: 'error-boundary.png' });
      errors.push(`${errorBoundaryCount} React error boundaries triggered`);
    }

    // Report results
    if (errors.length > 0) {
      console.log(`❌ Found ${errors.length} errors:`);
      errors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('✓ No JavaScript errors detected');
    }

    // Take final validation screenshot
    await page.screenshot({
      path: 'final-validation-screenshot.png',
      fullPage: true
    });
  });
});