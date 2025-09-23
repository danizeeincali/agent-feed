/**
 * Regression Tests for Import Resolution and Compilation Errors
 * Validates that the duplicate import fix didn't break other functionality
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Import Resolution Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up basic error monitoring
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    (page as any).errors = errors;
  });

  test('CRITICAL: No duplicate identifier errors in browser console', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Check for duplicate identifier errors
    const duplicateErrors = errors.filter(error => 
      error.includes('Duplicate identifier') ||
      error.includes('already been declared') ||
      error.includes('Cannot redeclare')
    );

    expect(duplicateErrors).toHaveLength(0);
    
    if (duplicateErrors.length > 0) {
      console.error('Duplicate identifier errors found:', duplicateErrors);
    }
  });

  test('CRITICAL: SimpleLauncher component imports correctly', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && 
          (msg.text().includes('SimpleLauncher') || msg.text().includes('import'))) {
        errors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Verify no import errors related to SimpleLauncher
    expect(errors).toHaveLength(0);

    // Verify component renders properly
    await expect(page.locator('.simple-launcher')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Claude Code Launcher');
  });

  test('CRITICAL: All navigation routes work without import errors', async ({ page }) => {
    const routes = [
      '/',
      '/simple-launcher',
      '/agents',
      '/workflows', 
      '/analytics',
      '/settings'
    ];

    for (const route of routes) {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(`http://localhost:3000${route}`);
      await page.waitForLoadState('networkidle');
      
      // Check for import-related errors
      const importErrors = errors.filter(error =>
        error.includes('import') ||
        error.includes('Module not found') ||
        error.includes('Cannot resolve')
      );

      expect(importErrors, `Import errors on route ${route}`).toHaveLength(0);
      
      // Verify basic page structure loads
      await expect(page.locator('[data-testid="header"]')).toBeVisible();
    }
  });

  test('CRITICAL: React component compilation is clean', async ({ page }) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
      if (msg.type() === 'warning') {
        warnings.push(msg.text());
      }
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Navigate to all major components to trigger compilation
    const componentsToTest = [
      '/simple-launcher',
      '/agents',
      '/dual-instance',
      '/workflows',
      '/analytics'
    ];

    for (const component of componentsToTest) {
      await page.goto(`http://localhost:3000${component}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    // Check for React-specific compilation errors
    const reactErrors = errors.filter(error =>
      error.includes('React') ||
      error.includes('JSX') ||
      error.includes('TypeScript') ||
      error.includes('compilation failed')
    );

    expect(reactErrors).toHaveLength(0);

    // Check for critical warnings that might indicate issues
    const criticalWarnings = warnings.filter(warning =>
      warning.includes('duplicate') ||
      warning.includes('conflict') ||
      warning.includes('override')
    );

    expect(criticalWarnings).toHaveLength(0);
  });

  test('CRITICAL: TypeScript type resolution works correctly', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error' && 
          (msg.text().includes('type') || msg.text().includes('TypeScript'))) {
        errors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Wait for component to fully load and execute TypeScript
    await page.waitForTimeout(2000);

    // Verify no TypeScript type resolution errors
    const typeErrors = errors.filter(error =>
      error.includes('Property') && error.includes('does not exist') ||
      error.includes('Type') && error.includes('is not assignable') ||
      error.includes('Cannot find name')
    );

    expect(typeErrors).toHaveLength(0);

    // Verify SimpleLauncher functionality works (indicates types are correct)
    await expect(page.locator('.launch-button')).toBeVisible();
    await expect(page.locator('.stop-button')).toBeVisible();
  });

  test('CRITICAL: No conflicting module declarations', async ({ page }) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
      if (msg.type() === 'warning') warnings.push(msg.text());
    });

    // Test all main application entry points
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check for module conflict errors
    const moduleConflicts = [...errors, ...warnings].filter(msg =>
      msg.includes('Module') && (
        msg.includes('conflict') ||
        msg.includes('duplicate') ||
        msg.includes('already exists')
      )
    );

    expect(moduleConflicts).toHaveLength(0);
  });

  test('CRITICAL: Vite/Webpack bundle compilation is successful', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error' && 
          (msg.text().includes('chunk') || msg.text().includes('bundle'))) {
        errors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Navigate to SimpleLauncher to ensure its chunk loads
    await page.goto('http://localhost:3000/simple-launcher');
    await page.waitForLoadState('networkidle');

    // Check for bundle loading errors
    const bundleErrors = errors.filter(error =>
      error.includes('Loading chunk') ||
      error.includes('Failed to fetch') ||
      error.includes('ChunkLoadError')
    );

    expect(bundleErrors).toHaveLength(0);

    // Verify the component actually rendered (confirms bundle worked)
    await expect(page.locator('.simple-launcher')).toBeVisible();
  });

  test('VALIDATION: All critical components load without errors', async ({ page }) => {
    const componentErrors = new Map<string, string[]>();

    // Test each critical component individually
    const criticalRoutes = [
      { path: '/simple-launcher', name: 'SimpleLauncher' },
      { path: '/agents', name: 'AgentManager' },
      { path: '/dual-instance', name: 'DualInstance' },
      { path: '/', name: 'SocialMediaFeed' }
    ];

    for (const route of criticalRoutes) {
      const errors: string[] = [];
      
      // Reset error listener for each route
      page.removeAllListeners('console');
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(`http://localhost:3000${route.path}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      componentErrors.set(route.name, [...errors]);

      // Verify basic functionality
      await expect(page.locator('[data-testid="header"]')).toBeVisible();
    }

    // Report any errors found
    for (const [component, errors] of componentErrors) {
      expect(errors, `Errors in ${component} component`).toHaveLength(0);
    }
  });
});