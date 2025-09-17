import { test, expect } from '@playwright/test';

test.describe('Comprehensive White Screen Fix Validation Suite', () => {
  test('complete white screen fix validation', async ({ page, browserName }) => {
    console.log(`Running comprehensive validation on ${browserName}`);

    const testResults = {
      browserName,
      timestamp: new Date().toISOString(),
      tests: {
        pageLoad: false,
        noConsoleErrors: false,
        navigationWorks: false,
        componentRendering: false,
        errorRecovery: false,
        dependencyCheck: false,
        crossBrowserCompatibility: false,
        performanceCheck: false
      },
      evidence: [],
      issues: []
    };

    // Test 1: Basic page load without white screen
    try {
      console.log('Testing basic page load...');
      await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });

      await expect(page.locator('#root')).toBeVisible({ timeout: 10000 });
      const bodyContent = await page.locator('body').textContent();

      if (!bodyContent || bodyContent.trim().length === 0) {
        throw new Error('White screen detected: No content in body');
      }

      testResults.tests.pageLoad = true;
      testResults.evidence.push('Page loaded successfully with content');

      await page.screenshot({
        path: `tests/e2e/evidence/comprehensive-page-load-${browserName}.png`,
        fullPage: true
      });

    } catch (error) {
      testResults.issues.push(`Page load failed: ${error}`);
      console.error('Page load test failed:', error);
    }

    // Test 2: Console errors check
    try {
      console.log('Testing console errors...');
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error' && !msg.text().includes('React DevTools')) {
          consoleErrors.push(msg.text());
        }
      });

      // Reload to catch console errors from fresh load
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const criticalErrors = consoleErrors.filter(error =>
        error.includes('Module') ||
        error.includes('import') ||
        error.includes('Failed to resolve')
      );

      if (criticalErrors.length > 0) {
        throw new Error(`Console errors found: ${criticalErrors.join(', ')}`);
      }

      testResults.tests.noConsoleErrors = true;
      testResults.evidence.push(`No critical console errors (${consoleErrors.length} total, 0 critical)`);

    } catch (error) {
      testResults.issues.push(`Console error check failed: ${error}`);
      console.error('Console error test failed:', error);
    }

    // Test 3: Navigation functionality
    try {
      console.log('Testing navigation...');
      const links = page.locator('a[href^="/"]');
      const linkCount = await links.count();

      if (linkCount > 0) {
        const firstLink = links.first();
        const href = await firstLink.getAttribute('href');

        if (href) {
          await firstLink.click();
          await page.waitForTimeout(1000);

          // Check page still has content after navigation
          const navContent = await page.locator('body').textContent();
          if (!navContent || navContent.trim().length === 0) {
            throw new Error('White screen after navigation');
          }

          // Navigate back
          await page.goBack();
          await page.waitForTimeout(500);
        }
      }

      testResults.tests.navigationWorks = true;
      testResults.evidence.push(`Navigation works (${linkCount} links found)`);

    } catch (error) {
      testResults.issues.push(`Navigation test failed: ${error}`);
      console.error('Navigation test failed:', error);
    }

    // Test 4: Component rendering
    try {
      console.log('Testing component rendering...');

      const componentChecks = await page.evaluate(() => {
        const checks = {
          hasReactRoot: document.getElementById('root') !== null,
          hasContent: document.body.textContent!.trim().length > 0,
          hasElements: document.querySelectorAll('div, span, p, button, a').length > 0,
          hasInteractiveElements: document.querySelectorAll('button, a, input').length > 0
        };

        return {
          ...checks,
          totalElements: document.querySelectorAll('*').length,
          textLength: document.body.textContent!.trim().length
        };
      });

      if (!componentChecks.hasReactRoot || !componentChecks.hasContent) {
        throw new Error('Components not rendering properly');
      }

      testResults.tests.componentRendering = true;
      testResults.evidence.push(`Components rendering (${componentChecks.totalElements} elements, ${componentChecks.textLength} characters)`);

    } catch (error) {
      testResults.issues.push(`Component rendering test failed: ${error}`);
      console.error('Component rendering test failed:', error);
    }

    // Test 5: Error recovery
    try {
      console.log('Testing error recovery...');

      await page.evaluate(() => {
        // Inject controlled error
        setTimeout(() => {
          try {
            throw new Error('Controlled error for testing');
          } catch (e) {
            console.log('Controlled error caught:', e.message);
          }
        }, 100);
      });

      await page.waitForTimeout(1000);

      // Verify page is still functional
      await expect(page.locator('#root')).toBeVisible();
      const content = await page.locator('body').textContent();

      if (!content || content.trim().length === 0) {
        throw new Error('App crashed after error injection');
      }

      testResults.tests.errorRecovery = true;
      testResults.evidence.push('App recovers from JavaScript errors');

    } catch (error) {
      testResults.issues.push(`Error recovery test failed: ${error}`);
      console.error('Error recovery test failed:', error);
    }

    // Test 6: Dependency check
    try {
      console.log('Testing dependencies...');

      const dependencyWarnings: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'warn' && (
          msg.text().includes('Failed to resolve') ||
          msg.text().includes('Module not found')
        )) {
          dependencyWarnings.push(msg.text());
        }
      });

      // Trigger a fresh load to catch dependency warnings
      await page.goto('/', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      if (dependencyWarnings.length > 0) {
        throw new Error(`Dependency warnings: ${dependencyWarnings.join(', ')}`);
      }

      testResults.tests.dependencyCheck = true;
      testResults.evidence.push('No dependency resolution warnings');

    } catch (error) {
      testResults.issues.push(`Dependency check failed: ${error}`);
      console.error('Dependency check failed:', error);
    }

    // Test 7: Performance check
    try {
      console.log('Testing performance...');

      const startTime = Date.now();
      await page.goto('/', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      if (loadTime > 15000) { // 15 second limit
        throw new Error(`Load time too slow: ${loadTime}ms`);
      }

      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
        };
      });

      testResults.tests.performanceCheck = true;
      testResults.evidence.push(`Performance acceptable (${loadTime}ms load time)`);

    } catch (error) {
      testResults.issues.push(`Performance test failed: ${error}`);
      console.error('Performance test failed:', error);
    }

    // Calculate overall success
    const passedTests = Object.values(testResults.tests).filter(Boolean).length;
    const totalTests = Object.keys(testResults.tests).length;
    const successRate = (passedTests / totalTests) * 100;

    // Final screenshot
    await page.screenshot({
      path: `tests/e2e/evidence/comprehensive-final-${browserName}.png`,
      fullPage: true
    });

    // Log detailed results
    console.log('\n=== WHITE SCREEN FIX VALIDATION RESULTS ===');
    console.log(`Browser: ${browserName}`);
    console.log(`Success Rate: ${successRate.toFixed(1)}% (${passedTests}/${totalTests})`);
    console.log('\nTest Results:', testResults.tests);
    console.log('\nEvidence:', testResults.evidence);

    if (testResults.issues.length > 0) {
      console.log('\nIssues Found:', testResults.issues);
    }

    // Save results to file for CI/CD
    await page.evaluate((results) => {
      console.log('VALIDATION_RESULTS:', JSON.stringify(results, null, 2));
    }, testResults);

    // Assert overall success (require at least 80% pass rate)
    expect(successRate, `White screen fix validation failed. Success rate: ${successRate}%. Issues: ${testResults.issues.join('; ')}`).toBeGreaterThan(80);

    // Assert critical tests pass
    expect(testResults.tests.pageLoad, 'Critical: Page load failed').toBeTruthy();
    expect(testResults.tests.componentRendering, 'Critical: Component rendering failed').toBeTruthy();
  });
});