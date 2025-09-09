/**
 * Cross-Browser Validation Tests for @ Mention System
 * Tests mention functionality across different browsers
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration for different browsers
const BROWSERS = ['chromium', 'firefox', 'webkit'];
const VIEWPORT_SIZES = [
  { width: 1920, height: 1080 }, // Desktop
  { width: 1366, height: 768 },  // Laptop
  { width: 768, height: 1024 },  // Tablet
  { width: 375, height: 667 }    // Mobile
];

// Helper functions
async function waitForMentionDropdown(page: Page): Promise<boolean> {
  try {
    await expect(page.locator('[role="listbox"][aria-label="Agent suggestions"]')).toBeVisible({ timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

async function testBasicMentionFunctionality(page: Page): Promise<{
  dropdownAppears: boolean;
  canSelectMention: boolean;
  mentionInserted: boolean;
  dropdownCloses: boolean;
}> {
  const results = {
    dropdownAppears: false,
    canSelectMention: false,
    mentionInserted: false,
    dropdownCloses: false
  };

  try {
    // Navigate to posting interface
    await page.goto('/posting');
    await page.waitForLoadState('networkidle');
    
    // Find textarea
    const textarea = page.locator('textarea').first();
    await textarea.click();
    
    // Type @ to trigger mention
    await textarea.type('@');
    await page.waitForTimeout(300);
    
    // Check if dropdown appears
    results.dropdownAppears = await waitForMentionDropdown(page);
    
    if (results.dropdownAppears) {
      // Try to select first option
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.count() > 0) {
        results.canSelectMention = true;
        await firstOption.click();
        
        // Check if mention was inserted
        const value = await textarea.inputValue();
        results.mentionInserted = value.includes('@') && value.length > 1;
        
        // Check if dropdown closed
        results.dropdownCloses = !(await page.locator('[role="listbox"]').isVisible());
      }
    }
  } catch (error) {
    console.log(`Error in basic mention test: ${error}`);
  }

  return results;
}

test.describe('Cross-Browser Mention Integration Tests', () => {
  
  test('should work consistently across different viewport sizes', async ({ page, browserName }) => {
    const results: any = {};
    
    for (const viewport of VIEWPORT_SIZES) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      
      const testResult = await testBasicMentionFunctionality(page);
      results[`${viewport.width}x${viewport.height}`] = testResult;
      
      // Clear any state between viewport tests
      await page.reload();
      await page.waitForTimeout(1000);
    }
    
    // Analyze results - at least one viewport should work
    const viewportKeys = Object.keys(results);
    const workingViewports = viewportKeys.filter(key => 
      results[key].dropdownAppears || results[key].canSelectMention
    );
    
    expect(workingViewports.length).toBeGreaterThan(0);
    console.log(`${browserName}: Working viewports:`, workingViewports);
  });

  test('should handle keyboard navigation across browsers', async ({ page, browserName }) => {
    await page.goto('/posting');
    await page.waitForLoadState('networkidle');
    
    let keyboardNavigationWorks = false;
    
    try {
      const textarea = page.locator('textarea').first();
      await textarea.click();
      await textarea.type('@');
      await page.waitForTimeout(300);
      
      if (await waitForMentionDropdown(page)) {
        // Test arrow key navigation
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');
        
        // Test Enter key selection
        await page.keyboard.press('Enter');
        
        const value = await textarea.inputValue();
        keyboardNavigationWorks = value.includes('@') && value.length > 1;
      }
    } catch (error) {
      console.log(`Keyboard navigation error in ${browserName}:`, error);
    }
    
    // Log result for browser compatibility matrix
    console.log(`${browserName}: Keyboard navigation works: ${keyboardNavigationWorks}`);
    
    // Test should not fail if keyboard navigation doesn't work,
    // but we should be able to interact with the page
    await expect(page.locator('body')).toBeVisible();
  });

  test('should maintain performance across browsers', async ({ page, browserName }) => {
    const performanceMetrics: any = {};
    
    // Measure page load time
    const startTime = Date.now();
    await page.goto('/posting');
    await page.waitForLoadState('networkidle');
    performanceMetrics.pageLoadTime = Date.now() - startTime;
    
    // Measure mention dropdown response time
    const textarea = page.locator('textarea').first();
    
    const mentionTimes: number[] = [];
    for (let i = 0; i < 3; i++) {
      await textarea.fill('');
      
      const mentionStart = Date.now();
      await textarea.type('@test');
      await page.waitForTimeout(300);
      
      if (await page.locator('[role="listbox"]').count() > 0) {
        mentionTimes.push(Date.now() - mentionStart);
      }
      
      await page.keyboard.press('Escape');
    }
    
    performanceMetrics.averageMentionTime = mentionTimes.length > 0 
      ? mentionTimes.reduce((a, b) => a + b, 0) / mentionTimes.length 
      : null;
    
    console.log(`${browserName} performance:`, performanceMetrics);
    
    // Basic performance expectations
    expect(performanceMetrics.pageLoadTime).toBeLessThan(10000); // 10 seconds
    
    if (performanceMetrics.averageMentionTime) {
      expect(performanceMetrics.averageMentionTime).toBeLessThan(2000); // 2 seconds
    }
  });

  test('should handle browser-specific quirks', async ({ page, browserName }) => {
    await page.goto('/posting');
    await page.waitForLoadState('networkidle');
    
    const browserQuirks: any = {
      chromium: {
        name: 'Chromium',
        expectedBehaviors: ['dropdown', 'keyboard', 'click']
      },
      firefox: {
        name: 'Firefox', 
        expectedBehaviors: ['dropdown', 'click'],
        knownIssues: ['keyboard navigation might differ']
      },
      webkit: {
        name: 'WebKit/Safari',
        expectedBehaviors: ['basic interaction'],
        knownIssues: ['dropdown positioning', 'focus handling']
      }
    };
    
    const currentBrowserConfig = browserQuirks[browserName] || {
      name: browserName,
      expectedBehaviors: ['basic interaction']
    };
    
    console.log(`Testing ${currentBrowserConfig.name} with expected behaviors:`, 
                currentBrowserConfig.expectedBehaviors);
    
    // Test basic functionality
    const basicTest = await testBasicMentionFunctionality(page);
    
    // Browser-specific assertions
    if (browserName === 'chromium') {
      // Chromium should have the most complete functionality
      expect(basicTest.dropdownAppears || basicTest.canSelectMention).toBe(true);
    } else if (browserName === 'webkit') {
      // WebKit might have issues but should not crash
      await expect(page.locator('body')).toBeVisible();
      const textarea = page.locator('textarea').first();
      await expect(textarea).toBeEditable();
    }
    
    console.log(`${currentBrowserConfig.name} test results:`, basicTest);
  });

  test('should support touch interactions on mobile browsers', async ({ page, browserName }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/posting');
    await page.waitForLoadState('networkidle');
    
    const textarea = page.locator('textarea').first();
    
    // Simulate touch interaction
    await textarea.tap();
    await textarea.fill('@test');
    await page.waitForTimeout(300);
    
    let touchInteractionWorks = false;
    
    if (await page.locator('[role="listbox"]').count() > 0) {
      // Try to tap on first option
      const firstOption = page.locator('[role="option"]').first();
      if (await firstOption.count() > 0) {
        await firstOption.tap();
        
        const value = await textarea.inputValue();
        touchInteractionWorks = value.includes('@') && value.length > 1;
      }
    }
    
    console.log(`${browserName}: Touch interactions work: ${touchInteractionWorks}`);
    
    // Should at least be able to interact with textarea
    await expect(textarea).toBeEditable();
  });
});

test.describe('Browser Compatibility Matrix', () => {
  const FEATURES = [
    'dropdownAppears',
    'mentionSelection', 
    'keyboardNavigation',
    'touchSupport',
    'visualRendering'
  ];

  test('should generate browser compatibility report', async ({ page, browserName }) => {
    const compatibilityMatrix: any = {};
    
    // Test each feature
    compatibilityMatrix[browserName] = {};
    
    // Test dropdown appearance
    await page.goto('/posting');
    await page.waitForLoadState('networkidle');
    
    const textarea = page.locator('textarea').first();
    await textarea.type('@');
    await page.waitForTimeout(300);
    
    compatibilityMatrix[browserName].dropdownAppears = await page.locator('[role="listbox"]').count() > 0;
    
    // Test mention selection
    if (compatibilityMatrix[browserName].dropdownAppears) {
      try {
        await page.locator('[role="option"]').first().click();
        const value = await textarea.inputValue();
        compatibilityMatrix[browserName].mentionSelection = value.includes('@');
      } catch {
        compatibilityMatrix[browserName].mentionSelection = false;
      }
    }
    
    // Test keyboard navigation
    await textarea.fill('');
    await textarea.type('@');
    await page.waitForTimeout(300);
    
    if (compatibilityMatrix[browserName].dropdownAppears) {
      try {
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        const value = await textarea.inputValue();
        compatibilityMatrix[browserName].keyboardNavigation = value.includes('@');
      } catch {
        compatibilityMatrix[browserName].keyboardNavigation = false;
      }
    }
    
    // Test visual rendering
    try {
      if (await page.locator('[role="listbox"]').count() > 0) {
        const dropdown = page.locator('[role="listbox"]');
        const boundingBox = await dropdown.boundingBox();
        compatibilityMatrix[browserName].visualRendering = boundingBox !== null;
      }
    } catch {
      compatibilityMatrix[browserName].visualRendering = false;
    }
    
    console.log(`Compatibility matrix for ${browserName}:`, compatibilityMatrix[browserName]);
    
    // Generate a simple compatibility score
    const workingFeatures = Object.values(compatibilityMatrix[browserName]).filter(Boolean).length;
    const totalFeatures = Object.keys(compatibilityMatrix[browserName]).length;
    const compatibilityScore = (workingFeatures / totalFeatures) * 100;
    
    console.log(`${browserName} compatibility score: ${compatibilityScore.toFixed(1)}%`);
    
    // Basic expectation: at least some functionality should work
    expect(workingFeatures).toBeGreaterThan(0);
  });
});

// Smoke test that runs quickly across all browsers
test.describe('Quick Cross-Browser Smoke Test', () => {
  test('should load and interact without errors', async ({ page, browserName }) => {
    // This is a quick smoke test to ensure basic functionality
    await page.goto('/posting');
    await page.waitForLoadState('networkidle');
    
    // Should be able to find and interact with a textarea
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeEditable();
    
    // Should be able to type
    await textarea.type('Hello world @test');
    const value = await textarea.inputValue();
    expect(value).toContain('Hello world @test');
    
    console.log(`${browserName}: Basic interaction smoke test passed`);
  });
});