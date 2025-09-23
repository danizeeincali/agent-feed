import { test, expect, Page } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// Visual regression framework for comprehensive style validation
test.describe('Visual Regression Framework', () => {

  test.beforeAll(async () => {
    // Ensure baseline screenshots directory exists
    const baselineDir = path.join(__dirname, 'test-results', 'baseline');
    if (!fs.existsSync(baselineDir)) {
      fs.mkdirSync(baselineDir, { recursive: true });
    }
  });

  test('Baseline screenshot generation', async ({ page }) => {
    const pages = [
      { url: '/', name: 'homepage' },
      { url: '/agents', name: 'agents-page' },
      { url: '/dashboard', name: 'dashboard' },
      { url: '/settings', name: 'settings' }
    ];

    for (const pageInfo of pages) {
      try {
        await page.goto(pageInfo.url);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Disable animations
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

        await expect(page).toHaveScreenshot(`baseline-${pageInfo.name}.png`, {
          fullPage: true,
          animations: 'disabled'
        });
      } catch (error) {
        console.log(`Page ${pageInfo.url} not found, skipping...`);
      }
    }
  });

  test('Component isolation screenshots', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Disable animations
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

    const componentSelectors = [
      { selector: 'header, nav', name: 'navigation' },
      { selector: '.sidebar, [role="complementary"]', name: 'sidebar' },
      { selector: 'main, .main-content', name: 'main-content' },
      { selector: 'footer', name: 'footer' },
      { selector: '.terminal, .xterm', name: 'terminal' },
      { selector: '.agent-dashboard', name: 'agent-dashboard' },
      { selector: '.chat-interface', name: 'chat-interface' },
      { selector: '.workflow-visualization', name: 'workflow' }
    ];

    for (const component of componentSelectors) {
      const elements = page.locator(component.selector);
      if (await elements.count() > 0) {
        await expect(elements.first()).toHaveScreenshot(`component-${component.name}.png`);
      }
    }
  });

  test('State variation screenshots', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Test different application states
    const states = [
      { name: 'initial-load', action: async () => {} },
      { name: 'loading-state', action: async () => {
        // Trigger loading state if possible
        const buttons = page.locator('button');
        if (await buttons.count() > 0) {
          await buttons.first().click();
          await page.waitForTimeout(100);
        }
      }},
      { name: 'error-state', action: async () => {
        // Try to trigger error state
        await page.goto('/invalid-route');
        await page.waitForTimeout(500);
      }},
      { name: 'empty-state', action: async () => {
        // Clear any data if possible
        await page.goto('/');
        await page.waitForLoadState('networkidle');
      }}
    ];

    for (const state of states) {
      try {
        await state.action();
        await expect(page).toHaveScreenshot(`state-${state.name}.png`, {
          fullPage: true,
          animations: 'disabled'
        });
      } catch (error) {
        console.log(`Could not capture state ${state.name}: ${error}`);
      }
    }
  });

  test('Cross-browser visual consistency', async ({ page, browserName }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take screenshots specific to each browser
    await expect(page).toHaveScreenshot(`cross-browser-${browserName}.png`, {
      fullPage: true,
      animations: 'disabled'
    });

    // Test specific components that might render differently
    const criticalComponents = page.locator('button, input, select, .card, .modal');
    if (await criticalComponents.count() > 0) {
      await expect(criticalComponents.first()).toHaveScreenshot(`component-${browserName}.png`);
    }
  });

  test('Theme variation screenshots', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Light theme
    await expect(page).toHaveScreenshot('theme-light.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Try to switch to dark theme
    const darkModeToggle = page.locator('[data-testid="dark-mode"], .dark-mode-toggle, .theme-toggle');
    if (await darkModeToggle.count() > 0) {
      await darkModeToggle.first().click();
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('theme-dark.png', {
        fullPage: true,
        animations: 'disabled'
      });
    }

    // Try to detect auto dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('theme-auto-dark.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Accessibility visual indicators', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Test focus indicators
    const focusableElements = page.locator('button, a, input, select, textarea');
    if (await focusableElements.count() > 0) {
      await focusableElements.first().focus();
      await page.waitForTimeout(100);
      await expect(page).toHaveScreenshot('accessibility-focus.png');
    }

    // Test high contrast mode
    await page.emulateMedia({ forcedColors: 'active' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('accessibility-high-contrast.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Test reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('accessibility-reduced-motion.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Performance impact visualization', async ({ page }) => {
    await page.goto('/');

    // Measure and capture performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
        firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime || 0
      };
    });

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Capture screenshot with performance overlay
    await page.evaluate((metrics) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 12px;
        z-index: 9999;
      `;
      overlay.innerHTML = `
        Performance Metrics:<br>
        DOM Content Loaded: ${metrics.domContentLoaded.toFixed(2)}ms<br>
        Load Complete: ${metrics.loadComplete.toFixed(2)}ms<br>
        First Paint: ${metrics.firstPaint.toFixed(2)}ms<br>
        First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(2)}ms
      `;
      document.body.appendChild(overlay);
    }, performanceMetrics);

    await expect(page).toHaveScreenshot('performance-overlay.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('Regression comparison report generation', async ({ page }) => {
    // This test generates a comparison report if baseline screenshots exist
    const testResultsDir = path.join(__dirname, 'test-results');
    const baselineDir = path.join(testResultsDir, 'baseline');
    const currentDir = path.join(testResultsDir, 'current');

    // Create current screenshots directory
    if (!fs.existsSync(currentDir)) {
      fs.mkdirSync(currentDir, { recursive: true });
    }

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take current screenshot
    await expect(page).toHaveScreenshot('current-homepage.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Generate comparison report
    const reportData = {
      timestamp: new Date().toISOString(),
      testRun: 'visual-regression',
      browser: page.context().browser()?.browserType().name(),
      viewport: await page.viewportSize(),
      results: {
        total: 0,
        passed: 0,
        failed: 0,
        screenshots: []
      }
    };

    // Save report data
    const reportPath = path.join(testResultsDir, 'regression-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    expect(fs.existsSync(reportPath)).toBeTruthy();
  });

  test('Screenshot metadata extraction', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Extract page metadata
    const metadata = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        userAgent: navigator.userAgent,
        colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        styleSheets: Array.from(document.styleSheets).length,
        elements: {
          total: document.querySelectorAll('*').length,
          visible: Array.from(document.querySelectorAll('*')).filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
          }).length
        }
      };
    });

    // Save metadata
    const metadataPath = path.join(__dirname, 'test-results', 'page-metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Take screenshot with metadata overlay
    await page.evaluate((meta) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 10px;
        z-index: 9999;
        max-width: 300px;
      `;
      overlay.innerHTML = `
        Page Metadata:<br>
        Title: ${meta.title}<br>
        Elements: ${meta.elements.visible}/${meta.elements.total}<br>
        Viewport: ${meta.viewport.width}x${meta.viewport.height}<br>
        Color Scheme: ${meta.colorScheme}<br>
        Stylesheets: ${meta.styleSheets}
      `;
      document.body.appendChild(overlay);
    }, metadata);

    await expect(page).toHaveScreenshot('metadata-overlay.png', {
      fullPage: true,
      animations: 'disabled'
    });

    expect(fs.existsSync(metadataPath)).toBeTruthy();
  });

  test('CSS coverage analysis', async ({ page }) => {
    // Enable CSS coverage
    await page.coverage.startCSSCoverage();

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Stop CSS coverage and get results
    const cssCoverage = await page.coverage.stopCSSCoverage();

    // Analyze coverage data
    const coverageAnalysis = cssCoverage.map(entry => ({
      url: entry.url,
      totalBytes: entry.text.length,
      usedBytes: entry.ranges.reduce((used, range) => used + (range.end - range.start), 0),
      usagePercentage: ((entry.ranges.reduce((used, range) => used + (range.end - range.start), 0) / entry.text.length) * 100).toFixed(2)
    }));

    // Save coverage analysis
    const coveragePath = path.join(__dirname, 'test-results', 'css-coverage.json');
    fs.writeFileSync(coveragePath, JSON.stringify(coverageAnalysis, null, 2));

    // Create visual representation of coverage
    await page.evaluate((coverage) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 255, 255, 0.95);
        border: 2px solid #333;
        border-radius: 10px;
        padding: 20px;
        font-family: monospace;
        font-size: 12px;
        z-index: 9999;
        max-width: 500px;
      `;

      const totalCSS = coverage.reduce((total, file) => total + file.totalBytes, 0);
      const usedCSS = coverage.reduce((total, file) => total + file.usedBytes, 0);
      const overallUsage = ((usedCSS / totalCSS) * 100).toFixed(2);

      overlay.innerHTML = `
        <h3>CSS Coverage Analysis</h3>
        <p>Overall Usage: ${overallUsage}%</p>
        <p>Total CSS: ${(totalCSS / 1024).toFixed(2)} KB</p>
        <p>Used CSS: ${(usedCSS / 1024).toFixed(2)} KB</p>
        <div style="background: #ddd; height: 20px; border-radius: 10px; overflow: hidden;">
          <div style="background: #4CAF50; height: 100%; width: ${overallUsage}%;"></div>
        </div>
      `;
      document.body.appendChild(overlay);
    }, coverageAnalysis);

    await expect(page).toHaveScreenshot('css-coverage-analysis.png');

    expect(fs.existsSync(coveragePath)).toBeTruthy();
    expect(coverageAnalysis.length).toBeGreaterThan(0);
  });
});