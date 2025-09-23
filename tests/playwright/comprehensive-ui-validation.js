import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, '../screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

test.describe('Comprehensive UI/UX Validation', () => {

  test.describe('Main Page Testing', () => {
    test('Desktop Main Page - Visual Validation', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('http://localhost:5173');

      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Capture full page screenshot
      await page.screenshot({
        path: path.join(screenshotsDir, 'main-page-desktop-full.png'),
        fullPage: true
      });

      // Capture viewport screenshot
      await page.screenshot({
        path: path.join(screenshotsDir, 'main-page-desktop-viewport.png')
      });

      // Validate purple gradient background
      const body = await page.locator('body');
      const bodyStyles = await body.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          background: styles.background,
          backgroundImage: styles.backgroundImage
        };
      });

      expect(bodyStyles.backgroundImage).toContain('gradient');
      console.log('Main page background styles:', bodyStyles);
    });

    test('Tablet Main Page - Responsive Design', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:5173');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: path.join(screenshotsDir, 'main-page-tablet.png'),
        fullPage: true
      });

      // Test responsive navigation
      const nav = await page.locator('nav');
      if (await nav.count() > 0) {
        const navVisible = await nav.isVisible();
        console.log('Navigation visible on tablet:', navVisible);
      }
    });

    test('Mobile Main Page - Mobile Responsive', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:5173');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: path.join(screenshotsDir, 'main-page-mobile.png'),
        fullPage: true
      });

      // Test mobile layout
      const content = await page.locator('[data-testid="main-content"], main, .container').first();
      if (await content.count() > 0) {
        const contentWidth = await content.boundingBox();
        console.log('Main content width on mobile:', contentWidth?.width);
      }
    });
  });

  test.describe('Agents Page Testing', () => {
    test('Desktop Agents Page - Visual Validation', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('http://localhost:5173/agents');

      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Capture full page screenshot
      await page.screenshot({
        path: path.join(screenshotsDir, 'agents-page-desktop-full.png'),
        fullPage: true
      });

      // Capture viewport screenshot
      await page.screenshot({
        path: path.join(screenshotsDir, 'agents-page-desktop-viewport.png')
      });

      // Validate purple gradient background
      const body = await page.locator('body');
      const bodyStyles = await body.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          background: styles.background,
          backgroundImage: styles.backgroundImage
        };
      });

      expect(bodyStyles.backgroundImage).toContain('gradient');
      console.log('Agents page background styles:', bodyStyles);
    });

    test('Tablet Agents Page - Responsive Design', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:5173/agents');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: path.join(screenshotsDir, 'agents-page-tablet.png'),
        fullPage: true
      });
    });

    test('Mobile Agents Page - Mobile Responsive', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:5173/agents');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: path.join(screenshotsDir, 'agents-page-mobile.png'),
        fullPage: true
      });
    });
  });

  test.describe('Component Testing', () => {
    test('White Cards, Shadows, and Hover Effects', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('http://localhost:5173/agents');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Look for card components
      const cards = await page.locator('.bg-white, [class*="card"], .shadow, .rounded').all();

      if (cards.length > 0) {
        console.log(`Found ${cards.length} card-like elements`);

        // Test first card's styling
        const firstCard = cards[0];
        const cardStyles = await firstCard.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            backgroundColor: styles.backgroundColor,
            boxShadow: styles.boxShadow,
            borderRadius: styles.borderRadius
          };
        });

        console.log('Card styling:', cardStyles);

        // Test hover effect if interactive
        await firstCard.hover();
        await page.waitForTimeout(1000);

        await page.screenshot({
          path: path.join(screenshotsDir, 'card-hover-effect.png')
        });
      }
    });

    test('Typography Consistency', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('http://localhost:5173/agents');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Check various text elements
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      const paragraphs = await page.locator('p').all();

      console.log(`Found ${headings.length} headings and ${paragraphs.length} paragraphs`);

      if (headings.length > 0) {
        const headingStyles = await headings[0].evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            fontFamily: styles.fontFamily,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight,
            color: styles.color
          };
        });

        console.log('Heading typography:', headingStyles);
      }

      await page.screenshot({
        path: path.join(screenshotsDir, 'typography-validation.png')
      });
    });

    test('Interactive Elements Testing', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('http://localhost:5173/agents');

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Test buttons
      const buttons = await page.locator('button, [role="button"], .btn').all();
      console.log(`Found ${buttons.length} interactive buttons`);

      if (buttons.length > 0) {
        const buttonStyles = await buttons[0].evaluate(el => {
          const styles = window.getComputedStyle(el);
          return {
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            padding: styles.padding,
            borderRadius: styles.borderRadius
          };
        });

        console.log('Button styling:', buttonStyles);

        // Test button hover
        await buttons[0].hover();
        await page.waitForTimeout(1000);

        await page.screenshot({
          path: path.join(screenshotsDir, 'button-hover-effect.png')
        });
      }

      // Test navigation links
      const navLinks = await page.locator('a, nav a').all();
      console.log(`Found ${navLinks.length} navigation links`);

      await page.screenshot({
        path: path.join(screenshotsDir, 'interactive-elements.png')
      });
    });
  });

  test.describe('Error State Testing', () => {
    test('Error Boundaries and Fallback Components', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Test 404 page
      await page.goto('http://localhost:5173/non-existent-page');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: path.join(screenshotsDir, 'error-404-page.png'),
        fullPage: true
      });

      // Check for error message or 404 content
      const errorContent = await page.locator('text=404, text="Not Found", text="Page not found"').first();
      if (await errorContent.count() > 0) {
        console.log('404 error page detected');
      }

      // Test loading states on agents page
      await page.goto('http://localhost:5173/agents');

      // Capture immediate state (might show loading)
      await page.screenshot({
        path: path.join(screenshotsDir, 'loading-state.png')
      });

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Capture final loaded state
      await page.screenshot({
        path: path.join(screenshotsDir, 'loaded-state.png'),
        fullPage: true
      });
    });
  });

  test.describe('Cross-Page Navigation', () => {
    test('Navigation Between Pages', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Start at main page
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Look for navigation to agents page
      const agentsLink = await page.locator('a[href="/agents"], a[href*="agents"], text="Agents"').first();

      if (await agentsLink.count() > 0) {
        console.log('Found agents navigation link');
        await agentsLink.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // Verify navigation worked
        expect(page.url()).toContain('agents');

        await page.screenshot({
          path: path.join(screenshotsDir, 'navigation-success.png'),
          fullPage: true
        });
      } else {
        console.log('No agents navigation link found - testing direct navigation');
        await page.goto('http://localhost:5173/agents');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        await page.screenshot({
          path: path.join(screenshotsDir, 'direct-navigation.png'),
          fullPage: true
        });
      }
    });
  });
});