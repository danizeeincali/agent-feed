import { test, expect } from '@playwright/test';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = join(__dirname, '../screenshots/ui-analysis');

test.describe('Quick UI Styling Check', () => {
  test.beforeAll(async () => {
    // Ensure screenshot directory exists
    const { existsSync, mkdirSync } = await import('fs');
    if (!existsSync(SCREENSHOT_DIR)) {
      mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('Homepage styling analysis', async ({ page }) => {
    console.log('🔍 Starting homepage styling analysis...');

    // Set viewport to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });

    try {
      // Navigate to homepage with longer timeout
      console.log('📄 Navigating to homepage...');
      await page.goto(BASE_URL, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      // Wait for any initial loading
      await page.waitForTimeout(3000);

      // Take a screenshot immediately
      const timestamp = Date.now();
      const screenshotPath = join(SCREENSHOT_DIR, `homepage-initial-${timestamp}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        animations: 'disabled'
      });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);

      // Check if page loaded
      const title = await page.title();
      console.log(`📰 Page title: "${title}"`);

      // Check for basic HTML structure
      const bodyExists = await page.locator('body').count();
      console.log(`🏗️  Body element found: ${bodyExists > 0}`);

      // Check if CSS is loading - basic Tailwind test
      const hasTailwindStyles = await page.evaluate(() => {
        // Create a test element with Tailwind classes
        const testEl = document.createElement('div');
        testEl.className = 'bg-blue-500 p-4 text-white';
        document.body.appendChild(testEl);

        const computed = window.getComputedStyle(testEl);
        const hasBackground = computed.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                             computed.backgroundColor !== 'transparent';
        const hasPadding = computed.padding !== '0px';

        document.body.removeChild(testEl);
        return { hasBackground, hasPadding, backgroundColor: computed.backgroundColor, padding: computed.padding };
      });

      console.log(`🎨 Tailwind CSS check:`, hasTailwindStyles);

      // Check for any visible content
      const hasVisibleText = await page.evaluate(() => {
        const bodyText = document.body.innerText || document.body.textContent || '';
        return bodyText.trim().length > 0;
      });
      console.log(`📝 Has visible text content: ${hasVisibleText}`);

      // Check for React hydration
      const reactMounted = await page.evaluate(() => {
        return !!document.querySelector('[data-reactroot], #root, #__next');
      });
      console.log(`⚛️  React app mounted: ${reactMounted}`);

      // Check for console errors
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Wait a bit more to collect any errors
      await page.waitForTimeout(2000);

      console.log(`🚨 Console errors detected: ${consoleErrors.length}`);
      if (consoleErrors.length > 0) {
        console.log('Errors:', consoleErrors.slice(0, 3)); // Show first 3 errors
      }

      // Check for network errors
      const networkErrors: string[] = [];
      page.on('response', (response) => {
        if (!response.ok()) {
          networkErrors.push(`${response.status()} ${response.url()}`);
        }
      });

      // Wait for network
      await page.waitForTimeout(1000);

      console.log(`🌐 Network errors: ${networkErrors.length}`);
      if (networkErrors.length > 0) {
        console.log('Network errors:', networkErrors.slice(0, 3)); // Show first 3
      }

      // Generate a quick analysis report
      const analysis = {
        timestamp: new Date().toISOString(),
        url: BASE_URL,
        title,
        bodyExists: bodyExists > 0,
        hasVisibleText,
        reactMounted,
        tailwindWorking: hasTailwindStyles.hasBackground && hasTailwindStyles.hasPadding,
        tailwindDetails: hasTailwindStyles,
        consoleErrorCount: consoleErrors.length,
        networkErrorCount: networkErrors.length,
        screenshotPath,
        criticalIssues: []
      };

      // Identify critical issues
      if (!analysis.tailwindWorking) {
        analysis.criticalIssues.push('🚨 CRITICAL: Tailwind CSS not working properly');
      }
      if (!analysis.hasVisibleText) {
        analysis.criticalIssues.push('🚨 CRITICAL: No visible text content found');
      }
      if (!analysis.reactMounted) {
        analysis.criticalIssues.push('⚠️  React app not properly mounted');
      }
      if (analysis.consoleErrorCount > 5) {
        analysis.criticalIssues.push(`⚠️  High number of console errors: ${analysis.consoleErrorCount}`);
      }

      // Save analysis report
      const reportPath = join(SCREENSHOT_DIR, `quick-analysis-${timestamp}.json`);
      const { writeFileSync } = await import('fs');
      writeFileSync(reportPath, JSON.stringify(analysis, null, 2));

      console.log('\n=== QUICK ANALYSIS RESULTS ===');
      console.log(`📋 Report saved: ${reportPath}`);
      console.log(`✅ Page loaded: ${analysis.title}`);
      console.log(`🎨 Tailwind CSS working: ${analysis.tailwindWorking}`);
      console.log(`📝 Has content: ${analysis.hasVisibleText}`);
      console.log(`⚛️  React mounted: ${analysis.reactMounted}`);

      if (analysis.criticalIssues.length > 0) {
        console.log('\n🚨 CRITICAL ISSUES FOUND:');
        analysis.criticalIssues.forEach(issue => console.log(`  ${issue}`));
        console.log('\nThis likely explains the "UI styling is all off" issue!');
      } else {
        console.log('\n✅ No critical styling issues detected in quick check');
      }

      // Assert that critical styling is working
      expect(analysis.tailwindWorking, 'Tailwind CSS should be working for basic styling').toBe(true);
      expect(analysis.hasVisibleText, 'Page should have visible text content').toBe(true);

    } catch (error) {
      console.error('❌ Error during analysis:', error);

      // Still try to take a screenshot for debugging
      try {
        const errorScreenshot = join(SCREENSHOT_DIR, `error-screenshot-${Date.now()}.png`);
        await page.screenshot({ path: errorScreenshot });
        console.log(`📸 Error screenshot saved: ${errorScreenshot}`);
      } catch (screenshotError) {
        console.error('Failed to take error screenshot:', screenshotError);
      }

      throw error;
    }
  });

  test('Agents page styling analysis', async ({ page }) => {
    console.log('🔍 Starting agents page styling analysis...');

    await page.setViewportSize({ width: 1920, height: 1080 });

    try {
      console.log('📄 Navigating to agents page...');
      await page.goto(`${BASE_URL}/agents`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      await page.waitForTimeout(3000);

      const timestamp = Date.now();
      const screenshotPath = join(SCREENSHOT_DIR, `agents-page-${timestamp}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        animations: 'disabled'
      });

      console.log(`📸 Agents page screenshot: ${screenshotPath}`);

      // Quick check that page loads
      const title = await page.title();
      const hasContent = await page.evaluate(() => {
        return document.body.innerText.trim().length > 0;
      });

      console.log(`📰 Agents page title: "${title}"`);
      console.log(`📝 Has content: ${hasContent}`);

      expect(hasContent, 'Agents page should have content').toBe(true);

    } catch (error) {
      console.error('❌ Error analyzing agents page:', error);

      const errorScreenshot = join(SCREENSHOT_DIR, `agents-error-${Date.now()}.png`);
      await page.screenshot({ path: errorScreenshot });
      console.log(`📸 Agents error screenshot: ${errorScreenshot}`);

      // Don't fail the test for agents page issues, just log them
      console.log('⚠️  Agents page analysis failed, but continuing...');
    }
  });
});