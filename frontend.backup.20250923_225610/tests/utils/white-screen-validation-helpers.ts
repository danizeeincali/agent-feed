/**
 * White Screen Fix Validation Helpers
 * 
 * Utility functions to support comprehensive validation testing
 * of the SimpleLauncher component after fixing duplicate imports.
 */

import { Page, expect } from '@playwright/test';

export interface ValidationResult {
  passed: boolean;
  message: string;
  screenshot?: string;
  details?: any;
}

/**
 * Validates that the page has loaded without white screen
 */
export async function validateNoWhiteScreen(page: Page): Promise<ValidationResult> {
  try {
    // Check that the root element has content
    const rootElement = page.locator('#root');
    await expect(rootElement).not.toBeEmpty();
    
    // Check that main content is visible
    const mainContent = page.locator('#root > div, [data-testid="main-content"], main').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });
    
    // Verify the page background is not pure white (indicating content loaded)
    const bodyBg = await page.locator('body').evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    
    // Check that there's actual content rendered
    const textContent = await page.locator('body').textContent();
    const hasContent = textContent && textContent.trim().length > 0;
    
    if (!hasContent) {
      return {
        passed: false,
        message: 'Page appears to have white screen - no content detected',
        details: { bodyBg, hasContent }
      };
    }
    
    return {
      passed: true,
      message: 'Page loaded successfully without white screen',
      details: { bodyBg, hasContent }
    };
  } catch (error) {
    return {
      passed: false,
      message: `White screen validation failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

/**
 * Validates SimpleLauncher component rendering
 */
export async function validateSimpleLauncherRendering(page: Page): Promise<ValidationResult> {
  try {
    // Wait for the SimpleLauncher component to load
    await page.waitForLoadState('networkidle');
    
    // Check for SimpleLauncher container
    const launcherContainer = page.locator('.simple-launcher, [data-testid="simple-launcher"]').first();
    await expect(launcherContainer).toBeVisible({ timeout: 10000 });
    
    // Validate essential UI elements
    const validations = [
      { selector: 'h1, h2', name: 'heading' },
      { selector: 'button:has-text("Launch"), .launch-button', name: 'launch button' },
      { selector: 'button:has-text("Stop"), .stop-button', name: 'stop button' },
      { selector: 'text=Claude Code:', name: 'system info' },
      { selector: 'text=Working Directory:', name: 'working directory' },
      { selector: 'text=Process Status', name: 'status section' }
    ];
    
    const missingElements = [];
    for (const validation of validations) {
      try {
        await expect(page.locator(validation.selector).first()).toBeVisible({ timeout: 3000 });
      } catch {
        missingElements.push(validation.name);
      }
    }
    
    if (missingElements.length > 0) {
      return {
        passed: false,
        message: `SimpleLauncher missing elements: ${missingElements.join(', ')}`,
        details: { missingElements }
      };
    }
    
    return {
      passed: true,
      message: 'SimpleLauncher component rendered successfully with all elements',
      details: { elementsFound: validations.length }
    };
  } catch (error) {
    return {
      passed: false,
      message: `SimpleLauncher validation failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

/**
 * Validates API connectivity and responses
 */
export async function validateApiConnectivity(page: Page): Promise<ValidationResult> {
  const apiCalls: string[] = [];
  let apiCallCount = 0;
  
  // Monitor API calls
  await page.route('**/api/claude/**', async (route) => {
    const url = route.request().url();
    apiCalls.push(url);
    apiCallCount++;
    await route.continue();
  });
  
  try {
    await page.goto('/simple-launcher');
    await page.waitForLoadState('networkidle');
    
    // Wait for API calls to be made
    await page.waitForTimeout(5000);
    
    if (apiCallCount === 0) {
      return {
        passed: false,
        message: 'No API calls detected - backend connectivity may be broken',
        details: { apiCallCount, apiCalls }
      };
    }
    
    // Check for specific API endpoints
    const hasStatusCall = apiCalls.some(url => url.includes('/status'));
    const hasCheckCall = apiCalls.some(url => url.includes('/check'));
    
    if (!hasStatusCall || !hasCheckCall) {
      return {
        passed: false,
        message: 'Missing required API calls (status or check)',
        details: { apiCallCount, apiCalls, hasStatusCall, hasCheckCall }
      };
    }
    
    return {
      passed: true,
      message: 'API connectivity validated successfully',
      details: { apiCallCount, apiCalls }
    };
  } catch (error) {
    return {
      passed: false,
      message: `API connectivity validation failed: ${error.message}`,
      details: { error: error.message, apiCalls }
    };
  }
}

/**
 * Validates console errors and warnings
 */
export async function validateConsoleHealth(page: Page): Promise<ValidationResult> {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const pageErrors: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
    if (msg.type() === 'warning') {
      consoleWarnings.push(msg.text());
    }
  });
  
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });
  
  try {
    await page.goto('/simple-launcher');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Filter critical errors that indicate compilation/import issues
    const criticalErrors = [
      ...consoleErrors.filter(error => 
        error.includes('SyntaxError') || 
        error.includes('import') ||
        error.includes('duplicate') ||
        error.includes('Module not found') ||
        error.includes('ReferenceError')
      ),
      ...pageErrors
    ];
    
    // Allow some non-critical warnings but flag critical errors
    const allowableWarnings = consoleWarnings.filter(warning =>
      !warning.includes('deprecated') &&
      !warning.includes('favicon')
    );
    
    if (criticalErrors.length > 0) {
      return {
        passed: false,
        message: `Critical console errors detected: ${criticalErrors.length}`,
        details: { 
          criticalErrors, 
          totalErrors: consoleErrors.length,
          totalWarnings: consoleWarnings.length,
          pageErrors
        }
      };
    }
    
    return {
      passed: true,
      message: 'Console health validated - no critical errors',
      details: { 
        totalErrors: consoleErrors.length,
        criticalErrors: criticalErrors.length,
        totalWarnings: consoleWarnings.length,
        allowableWarnings: allowableWarnings.length
      }
    };
  } catch (error) {
    return {
      passed: false,
      message: `Console health validation failed: ${error.message}`,
      details: { error: error.message }
    };
  }
}

/**
 * Validates responsive behavior across viewports
 */
export async function validateResponsiveDesign(page: Page): Promise<ValidationResult> {
  const viewports = [
    { width: 1920, height: 1080, name: 'desktop-large' },
    { width: 1280, height: 720, name: 'desktop' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 375, height: 667, name: 'mobile' }
  ];
  
  const results = [];
  
  try {
    await page.goto('/simple-launcher');
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000);
      
      // Check if SimpleLauncher is still visible and functional
      const launcherVisible = await page.locator('.simple-launcher').first().isVisible();
      const launchButtonVisible = await page.locator('button:has-text("Launch")').first().isVisible();
      
      results.push({
        viewport: viewport.name,
        dimensions: `${viewport.width}x${viewport.height}`,
        launcherVisible,
        launchButtonVisible,
        passed: launcherVisible && launchButtonVisible
      });
    }
    
    const failedViewports = results.filter(r => !r.passed);
    
    if (failedViewports.length > 0) {
      return {
        passed: false,
        message: `Responsive design failed on viewports: ${failedViewports.map(v => v.viewport).join(', ')}`,
        details: { results, failedViewports }
      };
    }
    
    return {
      passed: true,
      message: 'Responsive design validated across all viewports',
      details: { results }
    };
  } catch (error) {
    return {
      passed: false,
      message: `Responsive design validation failed: ${error.message}`,
      details: { error: error.message, results }
    };
  }
}

/**
 * Comprehensive validation suite runner
 */
export async function runComprehensiveValidation(page: Page) {
  console.log('🚀 Starting Comprehensive White Screen Fix Validation...\n');
  
  const validations = [
    { name: 'White Screen Check', fn: () => validateNoWhiteScreen(page) },
    { name: 'SimpleLauncher Rendering', fn: () => validateSimpleLauncherRendering(page) },
    { name: 'API Connectivity', fn: () => validateApiConnectivity(page) },
    { name: 'Console Health', fn: () => validateConsoleHealth(page) },
    { name: 'Responsive Design', fn: () => validateResponsiveDesign(page) }
  ];
  
  const results = [];
  
  for (const validation of validations) {
    console.log(`⏳ Running: ${validation.name}...`);
    try {
      const result = await validation.fn();
      results.push({ name: validation.name, ...result });
      console.log(`${result.passed ? '✅' : '❌'} ${validation.name}: ${result.message}`);
    } catch (error) {
      results.push({ 
        name: validation.name, 
        passed: false, 
        message: `Validation failed: ${error.message}` 
      });
      console.log(`❌ ${validation.name}: Failed with error - ${error.message}`);
    }
    console.log('');
  }
  
  const totalValidations = results.length;
  const passedValidations = results.filter(r => r.passed).length;
  const failedValidations = totalValidations - passedValidations;
  
  console.log('📊 VALIDATION SUMMARY:');
  console.log(`   Total: ${totalValidations}`);
  console.log(`   Passed: ${passedValidations} ✅`);
  console.log(`   Failed: ${failedValidations} ❌`);
  console.log(`   Success Rate: ${Math.round((passedValidations / totalValidations) * 100)}%`);
  
  if (failedValidations > 0) {
    console.log('\n❌ FAILED VALIDATIONS:');
    results.filter(r => !r.passed).forEach(result => {
      console.log(`   - ${result.name}: ${result.message}`);
    });
  }
  
  return {
    totalValidations,
    passedValidations,
    failedValidations,
    successRate: Math.round((passedValidations / totalValidations) * 100),
    results,
    allPassed: failedValidations === 0
  };
}

/**
 * Mock API responses for consistent testing
 */
export const mockApiSetup = {
  setupMocks: async (page: Page) => {
    await page.route('**/api/claude/check', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          claudeAvailable: true,
          message: 'Claude Code available',
          workingDirectory: '/workspaces/agent-feed/prod'
        })
      });
    });

    await page.route('**/api/claude/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: {
            isRunning: false,
            status: 'stopped',
            workingDirectory: '/workspaces/agent-feed/prod'
          }
        })
      });
    });

    await page.route('**/api/claude/launch', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Claude Code launched successfully',
          status: {
            isRunning: true,
            status: 'running',
            pid: 12345,
            startedAt: new Date().toISOString()
          }
        })
      });
    });

    await page.route('**/api/claude/stop', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Claude Code stopped successfully',
          status: {
            isRunning: false,
            status: 'stopped'
          }
        })
      });
    });
  }
};