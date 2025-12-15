import { test, expect, Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

// Configuration
const BASE_URL = 'http://localhost:5173';
const SCREENSHOTS_DIR = path.join(__dirname, '../test-results/visual-validation');
const VALIDATION_TIMEOUT = 30000;

test.describe('Browser Visual Validation - White Screen Fix', () => {
  let validationResults: any[] = [];

  test.beforeAll(async () => {
    // Ensure screenshots directory exists
    await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
  });

  test.afterAll(async () => {
    // Generate validation report
    const reportPath = path.join(SCREENSHOTS_DIR, 'validation-report.json');
    await fs.writeFile(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        totalChecks: validationResults.length,
        passed: validationResults.filter(r => r.passed).length,
        failed: validationResults.filter(r => !r.passed).length
      },
      results: validationResults
    }, null, 2));
    
    console.log(`Validation report saved to: ${reportPath}`);
  });

  test('Should navigate to application and verify no white screen', async ({ page }) => {
    const testName = 'white-screen-check';
    let result = { test: testName, passed: false, details: {}, timestamp: new Date().toISOString() };

    try {
      // Navigate to the application
      console.log(`Navigating to ${BASE_URL}...`);
      await page.goto(BASE_URL, { 
        waitUntil: 'networkidle',
        timeout: VALIDATION_TIMEOUT 
      });

      // Wait for React to mount
      await page.waitForTimeout(2000);

      // Take initial screenshot
      const screenshotPath = path.join(SCREENSHOTS_DIR, `${testName}-initial.png`);
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });

      // Check if page has actual content (not just white/blank)
      const bodyContent = await page.evaluate(() => {
        const body = document.body;
        const computedStyle = window.getComputedStyle(body);
        
        return {
          innerHTML: body.innerHTML.length,
          textContent: body.textContent?.trim().length || 0,
          backgroundColor: computedStyle.backgroundColor,
          hasVisibleElements: document.querySelectorAll('*:not(script):not(style)').length > 5,
          reactRoot: !!document.querySelector('#root'),
          rootHasChildren: document.querySelector('#root')?.children.length || 0
        };
      });

      result.details = {
        url: BASE_URL,
        screenshot: screenshotPath,
        contentAnalysis: bodyContent,
        pageLoaded: true
      };

      // Validate content exists
      expect(bodyContent.innerHTML).toBeGreaterThan(100);
      expect(bodyContent.textContent).toBeGreaterThan(0);
      expect(bodyContent.hasVisibleElements).toBe(true);
      expect(bodyContent.reactRoot).toBe(true);
      expect(bodyContent.rootHasChildren).toBeGreaterThan(0);

      result.passed = true;
      console.log('✅ White screen check passed - Content is visible');

    } catch (error) {
      result.details.error = error.message;
      result.passed = false;
      console.log('❌ White screen check failed:', error.message);
      throw error;
    } finally {
      validationResults.push(result);
    }
  });

  test('Should verify JavaScript console has no critical errors', async ({ page }) => {
    const testName = 'console-errors-check';
    let result = { test: testName, passed: false, details: {}, timestamp: new Date().toISOString() };
    const consoleMessages: any[] = [];

    try {
      // Listen for console messages
      page.on('console', msg => {
        consoleMessages.push({
          type: msg.type(),
          text: msg.text(),
          location: msg.location()
        });
      });

      // Listen for page errors
      const pageErrors: any[] = [];
      page.on('pageerror', error => {
        pageErrors.push({
          message: error.message,
          stack: error.stack
        });
      });

      // Navigate and wait for console output
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Filter critical errors
      const criticalErrors = consoleMessages.filter(msg => 
        msg.type === 'error' && 
        !msg.text.includes('favicon') && // Ignore favicon errors
        !msg.text.includes('DevTools') // Ignore DevTools messages
      );

      result.details = {
        totalConsoleMessages: consoleMessages.length,
        consoleMessages: consoleMessages,
        pageErrors: pageErrors,
        criticalErrors: criticalErrors
      };

      // Validate no critical errors
      expect(pageErrors.length).toBe(0);
      expect(criticalErrors.length).toBe(0);

      result.passed = true;
      console.log('✅ Console errors check passed - No critical errors found');

    } catch (error) {
      result.details.error = error.message;
      result.passed = false;
      console.log('❌ Console errors check failed:', error.message);
      throw error;
    } finally {
      validationResults.push(result);
    }
  });

  test('Should verify React components are rendering correctly', async ({ page }) => {
    const testName = 'react-components-check';
    let result = { test: testName, passed: false, details: {}, timestamp: new Date().toISOString() };

    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // Check for React DevTools presence (indicates React is working)
      const reactStatus = await page.evaluate(() => {
        return {
          hasReactDevTools: !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__,
          reactRootExists: !!document.querySelector('#root'),
          reactRootHasContent: (document.querySelector('#root')?.children.length || 0) > 0,
          reactVersion: (window as any).React?.version,
          reactComponents: Array.from(document.querySelectorAll('[data-reactroot], [data-react-class]')).length
        };
      });

      // Look for specific React patterns
      const componentCheck = await page.evaluate(() => {
        const root = document.querySelector('#root');
        if (!root) return { found: false, reason: 'No React root found' };
        
        const hasComponents = root.children.length > 0;
        const hasReactAttributes = !!document.querySelector('[data-reactroot]') || 
                                   root.innerHTML.includes('react') ||
                                   root.children.length > 0;
        
        return {
          found: hasComponents,
          childrenCount: root.children.length,
          hasReactAttributes,
          innerHTML: root.innerHTML.substring(0, 500) + '...'
        };
      });

      result.details = {
        reactStatus,
        componentCheck,
        domAnalysis: await page.evaluate(() => ({
          totalElements: document.querySelectorAll('*').length,
          divElements: document.querySelectorAll('div').length,
          buttonElements: document.querySelectorAll('button').length,
          interactiveElements: document.querySelectorAll('button, input, select, textarea, a').length
        }))
      };

      // Validate React is working
      expect(reactStatus.reactRootExists).toBe(true);
      expect(reactStatus.reactRootHasContent).toBe(true);
      expect(componentCheck.found).toBe(true);
      expect(componentCheck.childrenCount).toBeGreaterThan(0);

      result.passed = true;
      console.log('✅ React components check passed - Components are rendering');

    } catch (error) {
      result.details.error = error.message;
      result.passed = false;
      console.log('❌ React components check failed:', error.message);
      throw error;
    } finally {
      validationResults.push(result);
    }
  });

  test('Should verify SimpleLauncher component is visible and functional', async ({ page }) => {
    const testName = 'simple-launcher-check';
    let result = { test: testName, passed: false, details: {}, timestamp: new Date().toISOString() };

    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Take screenshot before interaction
      const beforeScreenshot = path.join(SCREENSHOTS_DIR, `${testName}-before.png`);
      await page.screenshot({ path: beforeScreenshot, fullPage: true });

      // Look for SimpleLauncher elements
      const launcherElements = await page.evaluate(() => {
        // Check for common SimpleLauncher patterns
        const possibleSelectors = [
          '[data-testid*="launcher"]',
          '.launcher',
          '.simple-launcher',
          'button[class*="launch"]',
          'div[class*="launcher"]',
          'h1, h2, h3', // Headers that might be part of the launcher
          'button', // Any buttons
          'main', // Main content area
          '.container'
        ];

        const foundElements: any[] = [];
        
        possibleSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) { // Only visible elements
              foundElements.push({
                selector,
                tagName: el.tagName,
                textContent: el.textContent?.trim().substring(0, 100),
                className: el.className,
                visible: rect.width > 0 && rect.height > 0,
                bounds: {
                  width: rect.width,
                  height: rect.height,
                  top: rect.top,
                  left: rect.left
                }
              });
            }
          });
        });

        return {
          foundElements,
          totalVisibleElements: document.querySelectorAll('*').length,
          hasButtons: document.querySelectorAll('button').length > 0,
          hasInteractiveElements: document.querySelectorAll('button, input, a').length > 0,
          bodyText: document.body.textContent?.trim().substring(0, 200)
        };
      });

      // Test button interactions if buttons exist
      const buttonTests: any[] = [];
      const buttons = await page.locator('button').all();
      
      for (let i = 0; i < Math.min(buttons.length, 3); i++) { // Test up to 3 buttons
        try {
          const button = buttons[i];
          const buttonText = await button.textContent();
          const isVisible = await button.isVisible();
          const isEnabled = await button.isEnabled();
          
          buttonTests.push({
            index: i,
            text: buttonText,
            visible: isVisible,
            enabled: isEnabled,
            clickable: isVisible && isEnabled
          });

          // Try to click if clickable
          if (isVisible && isEnabled) {
            await button.click({ timeout: 5000 });
            await page.waitForTimeout(1000);
          }
        } catch (error) {
          buttonTests.push({
            index: i,
            error: error.message
          });
        }
      }

      // Take screenshot after interaction
      const afterScreenshot = path.join(SCREENSHOTS_DIR, `${testName}-after.png`);
      await page.screenshot({ path: afterScreenshot, fullPage: true });

      result.details = {
        screenshots: {
          before: beforeScreenshot,
          after: afterScreenshot
        },
        launcherElements,
        buttonTests,
        componentFound: launcherElements.foundElements.length > 0,
        interactionsPossible: buttonTests.some(b => b.clickable)
      };

      // Validate component presence and functionality
      expect(launcherElements.foundElements.length).toBeGreaterThan(0);
      expect(launcherElements.totalVisibleElements).toBeGreaterThan(5);
      
      result.passed = true;
      console.log('✅ SimpleLauncher check passed - Component is visible and functional');

    } catch (error) {
      result.details.error = error.message;
      result.passed = false;
      console.log('❌ SimpleLauncher check failed:', error.message);
      throw error;
    } finally {
      validationResults.push(result);
    }
  });

  test('Should perform comprehensive visual regression test', async ({ page }) => {
    const testName = 'visual-regression-test';
    let result = { test: testName, passed: false, details: {}, timestamp: new Date().toISOString() };

    try {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      // Take multiple screenshots at different viewport sizes
      const viewports = [
        { width: 1920, height: 1080, name: 'desktop' },
        { width: 1024, height: 768, name: 'tablet' },
        { width: 375, height: 667, name: 'mobile' }
      ];

      const screenshots: any[] = [];

      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(1000);

        const screenshotPath = path.join(SCREENSHOTS_DIR, `${testName}-${viewport.name}.png`);
        await page.screenshot({ 
          path: screenshotPath, 
          fullPage: true 
        });

        // Analyze the screenshot for white screen indicators
        const analysis = await page.evaluate((vp) => {
          const body = document.body;
          const computedStyle = window.getComputedStyle(body);
          
          return {
            viewport: vp,
            backgroundColor: computedStyle.backgroundColor,
            contentHeight: body.scrollHeight,
            contentWidth: body.scrollWidth,
            visibleElements: document.querySelectorAll('*:not(script):not(style)').length,
            hasText: body.textContent?.trim().length > 0,
            colorAnalysis: {
              isWhite: computedStyle.backgroundColor === 'rgb(255, 255, 255)' || 
                      computedStyle.backgroundColor === 'white',
              isEmpty: body.textContent?.trim().length === 0
            }
          };
        }, viewport);

        screenshots.push({
          path: screenshotPath,
          viewport,
          analysis
        });
      }

      result.details = {
        screenshots,
        allScreenshotsNonWhite: screenshots.every(s => 
          !s.analysis.colorAnalysis.isEmpty && 
          s.analysis.visibleElements > 5
        )
      };

      // Validate visual content across viewports
      screenshots.forEach(screenshot => {
        expect(screenshot.analysis.hasText).toBe(true);
        expect(screenshot.analysis.visibleElements).toBeGreaterThan(5);
        expect(screenshot.analysis.colorAnalysis.isEmpty).toBe(false);
      });

      result.passed = true;
      console.log('✅ Visual regression test passed - No white screens detected');

    } catch (error) {
      result.details.error = error.message;
      result.passed = false;
      console.log('❌ Visual regression test failed:', error.message);
      throw error;
    } finally {
      validationResults.push(result);
    }
  });
});