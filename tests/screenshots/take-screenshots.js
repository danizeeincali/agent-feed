import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  console.log('Starting UI/UX validation with visual evidence...');

  try {
    // Desktop screenshots - Main page
    console.log('📸 Taking desktop screenshots of main page...');
    const desktopPage = await context.newPage();
    await desktopPage.setViewportSize({ width: 1920, height: 1080 });
    await desktopPage.goto('http://localhost:5173');
    await desktopPage.waitForLoadState('networkidle');
    await desktopPage.waitForTimeout(3000);

    // Take main page screenshots
    await desktopPage.screenshot({
      path: path.join(__dirname, 'main-page-desktop-full.png'),
      fullPage: true
    });

    await desktopPage.screenshot({
      path: path.join(__dirname, 'main-page-desktop-viewport.png')
    });

    // Check background gradient
    const bodyBg = await desktopPage.evaluate(() => {
      const styles = window.getComputedStyle(document.body);
      return {
        background: styles.background,
        backgroundImage: styles.backgroundImage
      };
    });
    console.log('Main page background styles:', bodyBg);

    // Desktop screenshots - Agents page
    console.log('📸 Taking desktop screenshots of agents page...');
    try {
      await desktopPage.goto('http://localhost:5173/agents/', { timeout: 15000 });
      await desktopPage.waitForLoadState('domcontentloaded');
      await desktopPage.waitForTimeout(5000);
    } catch (error) {
      console.log('⚠️ Agents page loading timeout, proceeding with screenshot anyway');
    }

    await desktopPage.screenshot({
      path: path.join(__dirname, 'agents-page-desktop-full.png'),
      fullPage: true
    });

    await desktopPage.screenshot({
      path: path.join(__dirname, 'agents-page-desktop-viewport.png')
    });

    // Check agents page background
    const agentsBg = await desktopPage.evaluate(() => {
      const styles = window.getComputedStyle(document.body);
      return {
        background: styles.background,
        backgroundImage: styles.backgroundImage
      };
    });
    console.log('Agents page background styles:', agentsBg);

    // Tablet responsive testing
    console.log('📱 Testing tablet responsive design...');
    const tabletPage = await context.newPage();
    await tabletPage.setViewportSize({ width: 768, height: 1024 });

    await tabletPage.goto('http://localhost:5173');
    await tabletPage.waitForLoadState('networkidle');
    await tabletPage.waitForTimeout(2000);
    await tabletPage.screenshot({
      path: path.join(__dirname, 'main-page-tablet.png'),
      fullPage: true
    });

    try {
      await tabletPage.goto('http://localhost:5173/agents/', { timeout: 10000 });
      await tabletPage.waitForLoadState('domcontentloaded');
      await tabletPage.waitForTimeout(3000);
    } catch (error) {
      console.log('⚠️ Agents page tablet loading timeout, proceeding with screenshot');
    }
    await tabletPage.screenshot({
      path: path.join(__dirname, 'agents-page-tablet.png'),
      fullPage: true
    });

    // Mobile responsive testing
    console.log('📱 Testing mobile responsive design...');
    const mobilePage = await context.newPage();
    await mobilePage.setViewportSize({ width: 375, height: 667 });

    await mobilePage.goto('http://localhost:5173');
    await mobilePage.waitForLoadState('networkidle');
    await mobilePage.waitForTimeout(2000);
    await mobilePage.screenshot({
      path: path.join(__dirname, 'main-page-mobile.png'),
      fullPage: true
    });

    try {
      await mobilePage.goto('http://localhost:5173/agents/', { timeout: 10000 });
      await mobilePage.waitForLoadState('domcontentloaded');
      await mobilePage.waitForTimeout(3000);
    } catch (error) {
      console.log('⚠️ Agents page mobile loading timeout, proceeding with screenshot');
    }
    await mobilePage.screenshot({
      path: path.join(__dirname, 'agents-page-mobile.png'),
      fullPage: true
    });

    // Component testing on agents page
    console.log('🧪 Testing components and styling...');
    try {
      await desktopPage.goto('http://localhost:5173/agents/', { timeout: 10000 });
      await desktopPage.waitForLoadState('domcontentloaded');
      await desktopPage.waitForTimeout(3000);
    } catch (error) {
      console.log('⚠️ Agents page component testing timeout, proceeding anyway');
    }

    // Look for cards
    const cardElements = await desktopPage.locator('.bg-white, [class*="card"], .shadow, .rounded').count();
    console.log(`Found ${cardElements} card-like elements`);

    // Look for interactive elements
    const buttons = await desktopPage.locator('button, [role="button"], .btn').count();
    console.log(`Found ${buttons} interactive button elements`);

    // Look for headings
    const headings = await desktopPage.locator('h1, h2, h3, h4, h5, h6').count();
    console.log(`Found ${headings} heading elements`);

    // Test hover effects if any buttons exist
    if (buttons > 0) {
      const firstButton = desktopPage.locator('button, [role="button"], .btn').first();
      await firstButton.hover();
      await desktopPage.waitForTimeout(1000);
      await desktopPage.screenshot({
        path: path.join(__dirname, 'button-hover-effect.png')
      });
    }

    // Typography test screenshot
    await desktopPage.screenshot({
      path: path.join(__dirname, 'typography-validation.png')
    });

    // Test error pages
    console.log('🚨 Testing error handling...');
    await desktopPage.goto('http://localhost:5173/non-existent-page');
    await desktopPage.waitForLoadState('networkidle');
    await desktopPage.waitForTimeout(2000);
    await desktopPage.screenshot({
      path: path.join(__dirname, 'error-404-page.png'),
      fullPage: true
    });

    // Navigation test
    console.log('🧭 Testing navigation between pages...');
    await desktopPage.goto('http://localhost:5173');
    await desktopPage.waitForLoadState('networkidle');
    await desktopPage.waitForTimeout(2000);

    // Look for agents link
    const agentsLink = desktopPage.locator('a[href="/agents"], a[href*="agents"]').first();
    const linkExists = await agentsLink.count() > 0;

    if (linkExists) {
      console.log('✅ Found agents navigation link');
      await agentsLink.click();
      await desktopPage.waitForLoadState('networkidle');
      await desktopPage.waitForTimeout(2000);

      const currentUrl = desktopPage.url();
      console.log('Navigation result URL:', currentUrl);

      await desktopPage.screenshot({
        path: path.join(__dirname, 'navigation-success.png'),
        fullPage: true
      });
    } else {
      console.log('ℹ️ No direct navigation link found - pages work independently');
    }

    console.log('✅ All screenshots and validation completed successfully!');
    console.log(`📁 Screenshots saved to: ${__dirname}`);

  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
  } finally {
    await browser.close();
  }
}

// Run the screenshot capture
takeScreenshots().catch(console.error);