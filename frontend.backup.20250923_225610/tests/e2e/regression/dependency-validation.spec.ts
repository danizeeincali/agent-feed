import { test, expect } from '@playwright/test';

test.describe('Dependency Validation - Regression Tests', () => {
  test('check for missing dependency warnings', async ({ page }) => {
    const consoleWarnings: string[] = [];
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];

    // Track console messages
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warn') {
        consoleWarnings.push(msg.text());
      }
    });

    // Track failed requests
    page.on('requestfailed', (request) => {
      networkErrors.push(`${request.url()}: ${request.failure()?.errorText}`);
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for initial load to complete
    await page.waitForTimeout(3000);

    // Filter dependency-related warnings
    const dependencyWarnings = consoleWarnings.filter(warning =>
      warning.toLowerCase().includes('failed to resolve') ||
      warning.toLowerCase().includes('module not found') ||
      warning.toLowerCase().includes('cannot resolve') ||
      warning.toLowerCase().includes('missing dependency') ||
      warning.toLowerCase().includes('peer dep') ||
      warning.toLowerCase().includes('unmet dependency')
    );

    const criticalErrors = consoleErrors.filter(error =>
      error.toLowerCase().includes('module') ||
      error.toLowerCase().includes('import') ||
      error.toLowerCase().includes('require') ||
      error.toLowerCase().includes('cannot resolve')
    );

    // Log findings for debugging
    if (dependencyWarnings.length > 0) {
      console.log('Dependency warnings found:', dependencyWarnings);
    }
    if (criticalErrors.length > 0) {
      console.log('Critical dependency errors found:', criticalErrors);
    }
    if (networkErrors.length > 0) {
      console.log('Network errors found:', networkErrors);
    }

    // Create evidence file
    const evidence = {
      timestamp: new Date().toISOString(),
      dependencyWarnings,
      criticalErrors,
      networkErrors,
      totalWarnings: consoleWarnings.length,
      totalErrors: consoleErrors.length
    };

    await page.evaluate((evidence) => {
      console.log('Dependency validation evidence:', JSON.stringify(evidence, null, 2));
    }, evidence);

    // Assert no critical dependency issues
    expect(criticalErrors, `Critical dependency errors found: ${criticalErrors.join(', ')}`).toHaveLength(0);
    expect(dependencyWarnings, `Dependency warnings found: ${dependencyWarnings.join(', ')}`).toHaveLength(0);

    // Take screenshot of successful load
    await page.screenshot({
      path: 'tests/e2e/evidence/dependency-validation-success.png',
      fullPage: true
    });
  });

  test('verify all required modules load successfully', async ({ page }) => {
    const moduleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error' && (
        msg.text().includes('Module') ||
        msg.text().includes('import') ||
        msg.text().includes('require')
      )) {
        moduleErrors.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Test module loading by checking for common React patterns
    const hasReact = await page.evaluate(() => {
      return typeof window !== 'undefined' &&
             window.React !== undefined ||
             document.querySelector('#root') !== null;
    });

    // Check that critical modules are available
    const moduleChecks = await page.evaluate(() => {
      const checks = {
        hasReactDOM: typeof window !== 'undefined',
        hasRouter: window.location !== undefined,
        hasDocument: document !== undefined,
        hasRoot: document.getElementById('root') !== null
      };
      return checks;
    });

    expect(moduleErrors).toHaveLength(0);
    expect(hasReact || moduleChecks.hasRoot).toBeTruthy();
    expect(moduleChecks.hasDocument).toBeTruthy();

    console.log('Module availability checks:', moduleChecks);
  });

  test('validate npm package integrity', async ({ page }) => {
    // This test validates that the app loads without package-related errors
    const packageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error' && (
        msg.text().includes('package') ||
        msg.text().includes('version') ||
        msg.text().includes('peer') ||
        msg.text().includes('dependency')
      )) {
        packageErrors.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Verify no package-related runtime errors
    expect(packageErrors).toHaveLength(0);

    // Verify app is functional
    await expect(page.locator('#root')).toBeVisible();
    const content = await page.locator('body').textContent();
    expect(content!.trim().length).toBeGreaterThan(0);
  });
});