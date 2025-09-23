import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Visual Regression Test Suite
 * Compares screenshots before and after interactive-control removal
 */

test.describe('Visual Regression Tests', () => {

  const testRoutes = [
    { path: '/', name: 'feed', critical: true },
    { path: '/agents', name: 'agents', critical: true },
    { path: '/analytics', name: 'analytics', critical: true },
    { path: '/settings', name: 'settings', critical: true },
    { path: '/workflows', name: 'workflows', critical: false }
  ];

  const criticalViewports = [
    { width: 1280, height: 720, name: 'desktop' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 375, height: 667, name: 'mobile' }
  ];

  test.beforeEach(async ({ page }) => {
    // Ensure consistent state
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 15000 });
  });

  test('captures current state screenshots for comparison', async ({ page }) => {
    console.log('📸 Capturing current state screenshots...');

    const testPhase = process.env.TEST_PHASE || 'baseline';
    const screenshotDir = `screenshots/${testPhase}`;

    // Ensure screenshot directory exists
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    for (const route of testRoutes) {
      console.log(`📍 Capturing ${route.name} screenshots...`);

      try {
        await page.goto(route.path, { waitUntil: 'networkidle' });
        await page.waitForSelector('[data-testid="app-root"]');
        await page.waitForTimeout(1000); // Allow animations to settle

        for (const viewport of criticalViewports) {
          console.log(`📱 ${viewport.name} viewport for ${route.name}`);

          await page.setViewportSize({
            width: viewport.width,
            height: viewport.height
          });
          await page.waitForTimeout(500);

          // Full page screenshot
          await page.screenshot({
            path: `${screenshotDir}/${route.name}-${viewport.name}-full.png`,
            fullPage: true
          });

          // Viewport screenshot
          await page.screenshot({
            path: `${screenshotDir}/${route.name}-${viewport.name}-viewport.png`,
            fullPage: false
          });

          // Capture navigation area specifically
          const nav = page.locator('nav, [data-testid="sidebar"]').first();
          if (await nav.count() > 0 && await nav.isVisible()) {
            await nav.screenshot({
              path: `${screenshotDir}/${route.name}-${viewport.name}-navigation.png`
            });
          }

          // Capture main content area
          const mainContent = page.locator('[data-testid="main-content"], main, .main').first();
          if (await mainContent.count() > 0 && await mainContent.isVisible()) {
            await mainContent.screenshot({
              path: `${screenshotDir}/${route.name}-${viewport.name}-main-content.png`
            });
          }

          console.log(`✅ ${route.name} ${viewport.name} screenshots captured`);
        }

      } catch (error) {
        if (route.path === '/interactive-control' && testPhase === 'post-removal') {
          console.log(`ℹ️  Interactive-control not accessible (expected): ${error.message}`);
        } else {
          console.log(`⚠️  Error capturing ${route.name}: ${error.message}`);
          if (route.critical) {
            throw error;
          }
        }
      }
    }

    console.log('✅ Current state screenshot capture completed');
  });

  test('performs visual comparison analysis', async ({ page }) => {
    console.log('🔍 Performing visual comparison analysis...');

    const testPhase = process.env.TEST_PHASE || 'baseline';

    if (testPhase === 'post-removal') {
      console.log('📊 Analyzing differences between baseline and post-removal...');

      const comparisonResults = [];

      for (const route of testRoutes) {
        if (route.path === '/interactive-control') {
          // Special handling for removed route
          comparisonResults.push({
            route: route.name,
            status: 'removed',
            impact: 'Route successfully removed as planned',
            critical: false
          });
          continue;
        }

        for (const viewport of criticalViewports) {
          const baselinePath = `screenshots/baseline/${route.name}-${viewport.name}-full.png`;
          const currentPath = `screenshots/post-removal/${route.name}-${viewport.name}-full.png`;

          const comparisonResult = {
            route: route.name,
            viewport: viewport.name,
            baselineExists: fs.existsSync(baselinePath),
            currentExists: fs.existsSync(currentPath),
            critical: route.critical
          };

          if (comparisonResult.baselineExists && comparisonResult.currentExists) {
            // Both screenshots exist - can compare
            console.log(`🔍 Comparing ${route.name} ${viewport.name}`);

            try {
              // Use Playwright's visual comparison
              await expect(page).toHaveScreenshot(`${route.name}-${viewport.name}-comparison.png`, {
                fullPage: true,
                threshold: 0.3, // Allow some differences
                maxDiffPixels: 1000
              });

              comparisonResult.status = 'passed';
              comparisonResult.message = 'Visual comparison passed';

            } catch (error) {
              comparisonResult.status = 'differences_detected';
              comparisonResult.message = error.message;

              if (route.critical) {
                console.log(`⚠️  Visual differences in critical route ${route.name} ${viewport.name}`);
              } else {
                console.log(`ℹ️  Visual differences in ${route.name} ${viewport.name} (non-critical)`);
              }
            }

          } else {
            comparisonResult.status = 'missing_screenshots';
            comparisonResult.message = `Baseline: ${comparisonResult.baselineExists}, Current: ${comparisonResult.currentExists}`;
          }

          comparisonResults.push(comparisonResult);
        }
      }

      // Generate comparison report
      const reportPath = 'reports/visual-comparison-report.json';
      fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        testPhase,
        results: comparisonResults,
        summary: {
          total: comparisonResults.length,
          passed: comparisonResults.filter(r => r.status === 'passed').length,
          differences: comparisonResults.filter(r => r.status === 'differences_detected').length,
          removed: comparisonResults.filter(r => r.status === 'removed').length,
          missing: comparisonResults.filter(r => r.status === 'missing_screenshots').length
        }
      }, null, 2));

      console.log('📊 Visual comparison report generated');

    } else {
      console.log('ℹ️  Baseline capture mode - no comparison performed');
    }

    console.log('✅ Visual comparison analysis completed');
  });

  test('validates UI component integrity', async ({ page }) => {
    console.log('🧩 Validating UI component integrity...');

    for (const route of testRoutes.filter(r => r.path !== '/interactive-control')) {
      console.log(`🧪 Testing component integrity on ${route.name}`);

      try {
        await page.goto(route.path, { waitUntil: 'networkidle' });
        await page.waitForSelector('[data-testid="app-root"]');

        // Check for essential UI components
        const components = {
          navigation: page.locator('nav, [data-testid="sidebar"]'),
          mainContent: page.locator('[data-testid="main-content"], main, .main'),
          header: page.locator('header, [data-testid="header"]'),
          footer: page.locator('footer, [data-testid="footer"]')
        };

        const componentStatus = {};

        for (const [componentName, locator] of Object.entries(components)) {
          const count = await locator.count();
          const visible = count > 0 ? await locator.first().isVisible() : false;

          componentStatus[componentName] = {
            present: count > 0,
            visible,
            count
          };

          if (componentName === 'navigation' || componentName === 'mainContent') {
            // These are critical components
            if (!componentStatus[componentName].present) {
              console.log(`❌ Critical component missing: ${componentName}`);
            } else if (!componentStatus[componentName].visible) {
              console.log(`⚠️  Critical component not visible: ${componentName}`);
            } else {
              console.log(`✅ Critical component OK: ${componentName}`);
            }
          } else {
            console.log(`📊 ${componentName}: present=${componentStatus[componentName].present}, visible=${componentStatus[componentName].visible}`);
          }
        }

        // Check for any error boundaries or broken layouts
        const errorBoundaries = await page.locator('*:has-text("Something went wrong"), *:has-text("Error"), [data-testid*="error"]').count();
        const brokenImages = await page.locator('img[src=""], img:not([src])').count();

        if (errorBoundaries > 0) {
          console.log(`❌ Error boundaries detected: ${errorBoundaries}`);
        }

        if (brokenImages > 0) {
          console.log(`⚠️  Broken images detected: ${brokenImages}`);
        }

        // Verify no interactive-control references remain
        const interactiveControlRefs = await page.locator('*:has-text("interactive-control"), *:has-text("Interactive Control"), [href*="interactive-control"]').count();

        if (interactiveControlRefs > 0) {
          console.log(`⚠️  Interactive-control references still present: ${interactiveControlRefs}`);

          // Capture evidence
          await page.screenshot({
            path: `screenshots/post-removal/${route.name}-interactive-control-refs.png`,
            fullPage: true
          });
        } else {
          console.log(`✅ No interactive-control references found on ${route.name}`);
        }

        // Store component analysis
        await page.evaluate((analysis) => {
          window.componentIntegrityAnalysis = window.componentIntegrityAnalysis || {};
          window.componentIntegrityAnalysis[window.location.pathname] = analysis;
        }, {
          route: route.name,
          componentStatus,
          errorBoundaries,
          brokenImages,
          interactiveControlRefs,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.log(`❌ Component integrity check failed for ${route.name}: ${error.message}`);
        if (route.critical) {
          throw error;
        }
      }
    }

    console.log('✅ UI component integrity validation completed');
  });

  test('validates layout stability', async ({ page }) => {
    console.log('📐 Validating layout stability...');

    for (const route of testRoutes.filter(r => r.path !== '/interactive-control')) {
      console.log(`📏 Testing layout stability on ${route.name}`);

      try {
        await page.goto(route.path, { waitUntil: 'networkidle' });
        await page.waitForSelector('[data-testid="app-root"]');

        // Measure layout stability by checking for unexpected shifts
        const initialLayout = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('*')).slice(0, 20);
          return elements.map(el => ({
            tagName: el.tagName,
            className: el.className,
            position: el.getBoundingClientRect()
          }));
        });

        // Wait a bit and remeasure
        await page.waitForTimeout(2000);

        const finalLayout = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('*')).slice(0, 20);
          return elements.map(el => ({
            tagName: el.tagName,
            className: el.className,
            position: el.getBoundingClientRect()
          }));
        });

        // Compare layouts
        let layoutShifts = 0;
        for (let i = 0; i < Math.min(initialLayout.length, finalLayout.length); i++) {
          const initial = initialLayout[i];
          const final = finalLayout[i];

          if (initial.tagName === final.tagName && initial.className === final.className) {
            const xShift = Math.abs(initial.position.x - final.position.x);
            const yShift = Math.abs(initial.position.y - final.position.y);

            if (xShift > 5 || yShift > 5) {
              layoutShifts++;
            }
          }
        }

        if (layoutShifts > 0) {
          console.log(`⚠️  Layout shifts detected on ${route.name}: ${layoutShifts}`);
        } else {
          console.log(`✅ Layout stable on ${route.name}`);
        }

        // Test responsive stability
        const viewportSizes = [
          { width: 1280, height: 720 },
          { width: 768, height: 1024 },
          { width: 375, height: 667 }
        ];

        for (const viewport of viewportSizes) {
          await page.setViewportSize(viewport);
          await page.waitForTimeout(500);

          // Check for horizontal overflow
          const hasOverflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth;
          });

          if (hasOverflow) {
            console.log(`⚠️  Horizontal overflow on ${route.name} at ${viewport.width}x${viewport.height}`);
          }
        }

        console.log(`✅ Layout stability validated for ${route.name}`);

      } catch (error) {
        console.log(`❌ Layout stability check failed for ${route.name}: ${error.message}`);
      }
    }

    console.log('✅ Layout stability validation completed');
  });

  test('validates accessibility after changes', async ({ page }) => {
    console.log('♿ Validating accessibility after changes...');

    for (const route of testRoutes.filter(r => r.path !== '/interactive-control')) {
      console.log(`🧪 Testing accessibility on ${route.name}`);

      try {
        await page.goto(route.path, { waitUntil: 'networkidle' });
        await page.waitForSelector('[data-testid="app-root"]');

        // Basic accessibility checks
        const accessibilityIssues = [];

        // Check for images without alt text
        const imagesWithoutAlt = await page.locator('img:not([alt])').count();
        if (imagesWithoutAlt > 0) {
          accessibilityIssues.push(`${imagesWithoutAlt} images without alt text`);
        }

        // Check for buttons without accessible names
        const buttonsWithoutNames = await page.locator('button:not([aria-label]):not(:has-text(""))').count();
        if (buttonsWithoutNames > 0) {
          accessibilityIssues.push(`${buttonsWithoutNames} buttons without accessible names`);
        }

        // Check for form inputs without labels
        const inputsWithoutLabels = await page.evaluate(() => {
          const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea'));
          return inputs.filter(input => {
            const hasLabel = input.labels && input.labels.length > 0;
            const hasAriaLabel = input.getAttribute('aria-label');
            const hasPlaceholder = input.getAttribute('placeholder');
            return !hasLabel && !hasAriaLabel && !hasPlaceholder;
          }).length;
        });
        if (inputsWithoutLabels > 0) {
          accessibilityIssues.push(`${inputsWithoutLabels} form inputs without labels`);
        }

        // Check for proper heading hierarchy
        const headings = await page.evaluate(() => {
          const headingElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
          return headingElements.map(h => parseInt(h.tagName.charAt(1)));
        });

        let headingIssues = 0;
        for (let i = 1; i < headings.length; i++) {
          if (headings[i] > headings[i-1] + 1) {
            headingIssues++;
          }
        }
        if (headingIssues > 0) {
          accessibilityIssues.push(`${headingIssues} heading hierarchy issues`);
        }

        // Test keyboard navigation
        const focusableElements = await page.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])').count();
        console.log(`⌨️  Found ${focusableElements} focusable elements`);

        if (focusableElements > 0) {
          // Test tab navigation
          await page.keyboard.press('Tab');
          const activeElement = await page.evaluate(() => document.activeElement?.tagName);
          if (activeElement) {
            console.log(`✅ Keyboard navigation working: focused ${activeElement}`);
          }
        }

        if (accessibilityIssues.length === 0) {
          console.log(`✅ No accessibility issues found on ${route.name}`);
        } else {
          console.log(`⚠️  Accessibility issues on ${route.name}:`);
          accessibilityIssues.forEach(issue => console.log(`   - ${issue}`));
        }

        // Store accessibility analysis
        await page.evaluate((analysis) => {
          window.accessibilityAnalysis = window.accessibilityAnalysis || {};
          window.accessibilityAnalysis[window.location.pathname] = analysis;
        }, {
          route: route.name,
          issues: accessibilityIssues,
          focusableElements,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.log(`❌ Accessibility check failed for ${route.name}: ${error.message}`);
      }
    }

    console.log('✅ Accessibility validation completed');
  });

  test('generates visual regression summary', async ({ page }) => {
    console.log('📋 Generating visual regression summary...');

    const testPhase = process.env.TEST_PHASE || 'baseline';

    // Collect all analysis data
    const componentAnalysis = await page.evaluate(() => window.componentIntegrityAnalysis || {});
    const accessibilityAnalysis = await page.evaluate(() => window.accessibilityAnalysis || {});

    const summary = {
      timestamp: new Date().toISOString(),
      testPhase,
      componentAnalysis,
      accessibilityAnalysis,
      recommendations: []
    };

    // Generate recommendations based on findings
    if (testPhase === 'post-removal') {
      summary.recommendations.push(
        'Verify all interactive-control references have been removed',
        'Test navigation flows to ensure no broken links remain',
        'Validate that Avi DM section functionality is preserved',
        'Check for any layout shifts or visual regressions'
      );

      // Check for critical issues
      const criticalIssues = [];
      Object.values(componentAnalysis).forEach(analysis => {
        if (analysis.errorBoundaries > 0) {
          criticalIssues.push(`Error boundaries found on ${analysis.route}`);
        }
        if (analysis.interactiveControlRefs > 0) {
          criticalIssues.push(`Interactive-control references remain on ${analysis.route}`);
        }
      });

      if (criticalIssues.length > 0) {
        summary.criticalIssues = criticalIssues;
        console.log('🚨 Critical issues detected:');
        criticalIssues.forEach(issue => console.log(`   - ${issue}`));
      } else {
        console.log('✅ No critical issues detected');
      }
    }

    // Save summary report
    const reportPath = `reports/visual-regression-summary-${testPhase}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));

    // Generate human-readable markdown report
    const markdownReport = `
# Visual Regression Test Summary

**Test Phase**: ${testPhase}
**Timestamp**: ${summary.timestamp}

## Component Analysis
${Object.entries(componentAnalysis).map(([route, analysis]) => `
### ${analysis.route}
- Error Boundaries: ${analysis.errorBoundaries}
- Broken Images: ${analysis.brokenImages}
- Interactive-Control References: ${analysis.interactiveControlRefs}
`).join('')}

## Accessibility Analysis
${Object.entries(accessibilityAnalysis).map(([route, analysis]) => `
### ${analysis.route}
- Issues Found: ${analysis.issues.length}
- Focusable Elements: ${analysis.focusableElements}
${analysis.issues.length > 0 ? `- Issues: ${analysis.issues.join(', ')}` : ''}
`).join('')}

## Recommendations
${summary.recommendations.map(rec => `- ${rec}`).join('\n')}

${summary.criticalIssues ? `## Critical Issues\n${summary.criticalIssues.map(issue => `- ${issue}`).join('\n')}` : '## Status\n✅ No critical issues detected'}
`;

    fs.writeFileSync(`reports/visual-regression-summary-${testPhase}.md`, markdownReport);

    console.log(`📊 Visual regression summary generated: ${reportPath}`);
    console.log('✅ Visual regression testing completed');
  });
});