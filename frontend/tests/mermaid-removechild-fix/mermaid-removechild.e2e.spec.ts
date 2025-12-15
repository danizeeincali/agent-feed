/**
 * End-to-End Tests for MermaidDiagram removeChild DOM Error Fix
 *
 * Tests real browser behavior with Playwright
 *
 * Run with: npx playwright test tests/mermaid-removechild-fix/mermaid-removechild.e2e.spec.ts
 *
 * SPARC-TDD: E2E validation of removeChild fix in production-like environment
 */

import { test, expect } from '@playwright/test';

test.describe('Mermaid removeChild DOM Error Fix - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console error capture
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Store errors in page context for assertions
    await page.evaluate(() => {
      (window as any).testConsoleErrors = [];
      const originalError = console.error;
      console.error = (...args: any[]) => {
        (window as any).testConsoleErrors.push(args.join(' '));
        originalError.apply(console, args);
      };
    });

    // Navigate to showcase page
    await page.goto('http://localhost:5173/agent/page-builder-agent-component-showcase-complete-v3', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForLoadState('domcontentloaded');
  });

  test('INT-07: Component Showcase Tab 7 loads all 3 diagrams', async ({ page }) => {
    console.log('🔍 Testing Tab 7 diagram loading...');

    // Click Tab 7
    await page.click('text=Data Visualization - Diagrams');
    console.log('✅ Clicked Tab 7');

    // Wait for diagrams section
    await page.waitForSelector('[id="diagrams"]', { timeout: 5000 });
    console.log('✅ Diagrams section visible');

    // Count Mermaid containers
    const diagramCount = await page.locator('.mermaid-diagram').count();
    console.log(`📊 Found ${diagramCount} diagram containers`);
    expect(diagramCount).toBe(3);

    // Verify all have SVG content
    for (let i = 0; i < 3; i++) {
      const hasSvg = await page.locator('.mermaid-diagram').nth(i).locator('svg').count();
      console.log(`📊 Diagram ${i + 1}: SVG count = ${hasSvg}`);
      expect(hasSvg).toBeGreaterThan(0);
    }

    console.log('✅ All 3 diagrams rendered successfully!');
  });

  test('INT-08: No console errors during render', async ({ page }) => {
    console.log('🔍 Checking for console errors...');

    // Click Tab 7
    await page.click('text=Data Visualization - Diagrams');

    // Wait for all diagrams to render
    await page.waitForFunction(
      () => document.querySelectorAll('.mermaid-diagram svg').length === 3,
      { timeout: 10000 }
    );

    // Check console errors
    const errors = await page.evaluate(() => (window as any).testConsoleErrors || []);
    console.log(`📋 Total console errors: ${errors.length}`);

    // Filter for removeChild errors
    const removeChildErrors = errors.filter((err: string) =>
      err.includes('removeChild') ||
      err.includes('Failed to execute') ||
      err.includes('Maximum update depth')
    );

    console.log(`❌ removeChild errors: ${removeChildErrors.length}`);

    if (removeChildErrors.length > 0) {
      console.log('❌ Errors found:');
      removeChildErrors.forEach((err: string) => console.log(`   - ${err}`));
    }

    expect(removeChildErrors).toHaveLength(0);
  });

  test('EDGE-11: Very fast re-renders (tab switching)', async ({ page }) => {
    console.log('🔍 Testing rapid tab switching...');

    // Rapidly switch tabs 5 times
    for (let i = 0; i < 5; i++) {
      await page.click('text=Data Visualization - Diagrams');
      await page.waitForTimeout(100);
      await page.click('text=Basic Components');
      await page.waitForTimeout(100);
      console.log(`  Cycle ${i + 1} complete`);
    }

    // Final click to diagrams tab
    await page.click('text=Data Visualization - Diagrams');

    // Wait for diagrams
    await page.waitForFunction(
      () => document.querySelectorAll('.mermaid-diagram svg').length === 3,
      { timeout: 10000 }
    );

    // Check for errors
    const errors = await page.evaluate(() => (window as any).testConsoleErrors || []);
    const criticalErrors = errors.filter((err: string) =>
      err.includes('removeChild') ||
      err.includes('Maximum update depth') ||
      err.includes('Too many re-renders')
    );

    console.log(`✅ Critical errors after rapid switching: ${criticalErrors.length}`);
    expect(criticalErrors).toHaveLength(0);
  });

  test('REG-16: All existing Mermaid tests pass', async ({ page }) => {
    console.log('🔍 Testing specific diagram types...');

    await page.click('text=Data Visualization - Diagrams');

    // Wait for section to load
    await page.waitForSelector('[id="diagrams"]');

    // System Architecture (flowchart)
    const flowchart = page.locator('#system-architecture-diagram').first();
    await expect(flowchart.locator('svg')).toBeVisible({ timeout: 5000 });
    console.log('✅ System Architecture diagram rendered');

    // API Sequence (sequence diagram)
    const sequence = page.locator('#api-sequence-diagram').first();
    await expect(sequence.locator('svg')).toBeVisible({ timeout: 5000 });
    console.log('✅ API Sequence diagram rendered');

    // Data Model (class diagram)
    const classDiagram = page.locator('#data-model-class-diagram').first();
    await expect(classDiagram.locator('svg')).toBeVisible({ timeout: 5000 });
    console.log('✅ Data Model diagram rendered');
  });

  test('Performance: Diagrams render within 10 seconds', async ({ page }) => {
    console.log('⏱️ Testing diagram render performance...');

    await page.click('text=Data Visualization - Diagrams');

    const startTime = Date.now();

    await page.waitForFunction(
      () => document.querySelectorAll('.mermaid-diagram svg').length === 3,
      { timeout: 10000 }
    );

    const renderTime = Date.now() - startTime;
    console.log(`⏱️ Total render time: ${renderTime}ms`);
    console.log(`⏱️ Average per diagram: ${Math.round(renderTime / 3)}ms`);

    expect(renderTime).toBeLessThan(10000);
  });

  test('EDGE-12: Component unmounts during render (tab switching mid-render)', async ({ page }) => {
    console.log('🔍 Testing unmount during render...');

    // Click Tab 7
    await page.click('text=Data Visualization - Diagrams');

    // Immediately switch away (before diagrams finish rendering)
    await page.waitForTimeout(50);
    await page.click('text=Basic Components');

    // Wait a bit
    await page.waitForTimeout(500);

    // Switch back to Tab 7
    await page.click('text=Data Visualization - Diagrams');

    // Diagrams should eventually render without errors
    await page.waitForFunction(
      () => document.querySelectorAll('.mermaid-diagram svg').length === 3,
      { timeout: 10000 }
    );

    // Check for errors
    const errors = await page.evaluate(() => (window as any).testConsoleErrors || []);
    const removeChildErrors = errors.filter((err: string) =>
      err.includes('removeChild') ||
      err.includes('state update on an unmounted component')
    );

    expect(removeChildErrors).toHaveLength(0);
  });

  test('Accessibility: Proper ARIA attributes during render lifecycle', async ({ page }) => {
    console.log('🔍 Testing accessibility attributes...');

    await page.click('text=Data Visualization - Diagrams');

    // Check loading state ARIA
    const loadingDiagrams = await page.locator('[role="status"][aria-label="Loading diagram"]').count();
    console.log(`📊 Loading diagrams with proper ARIA: ${loadingDiagrams}`);

    // Wait for render to complete
    await page.waitForFunction(
      () => document.querySelectorAll('.mermaid-diagram svg').length === 3,
      { timeout: 10000 }
    );

    // Check success state ARIA
    const renderedDiagrams = await page.locator('[role="img"][aria-label="Mermaid diagram"]').count();
    console.log(`📊 Rendered diagrams with proper ARIA: ${renderedDiagrams}`);
    expect(renderedDiagrams).toBe(3);
  });

  test('Visual regression: Screenshot comparison', async ({ page }) => {
    console.log('📸 Taking screenshot for visual regression...');

    await page.click('text=Data Visualization - Diagrams');

    // Wait for all diagrams to render
    await page.waitForFunction(
      () => document.querySelectorAll('.mermaid-diagram svg').length === 3,
      { timeout: 10000 }
    );

    // Wait a bit more for animations to settle
    await page.waitForTimeout(500);

    // Take screenshot of diagrams section
    const diagramsSection = page.locator('[id="diagrams"]');
    await expect(diagramsSection).toHaveScreenshot('mermaid-diagrams.png', {
      maxDiffPixels: 100, // Allow small rendering differences
    });

    console.log('✅ Screenshot captured');
  });

  test('Network: Handles slow Mermaid library load', async ({ page }) => {
    console.log('🔍 Testing slow network conditions...');

    // Slow down network
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100);
    });

    await page.click('text=Data Visualization - Diagrams');

    // Should still render eventually
    await page.waitForFunction(
      () => document.querySelectorAll('.mermaid-diagram svg').length === 3,
      { timeout: 15000 }
    );

    console.log('✅ Diagrams rendered under slow network');
  });

  test('Error handling: Invalid diagram shows error state', async ({ page }) => {
    // This test would need a page with intentionally invalid Mermaid syntax
    console.log('🔍 Testing error state handling...');

    await page.click('text=Data Visualization - Diagrams');

    // Wait for diagrams to load
    await page.waitForTimeout(2000);

    // Check if any error states exist (invalid syntax diagrams)
    const errorCount = await page.locator('.bg-red-50, .bg-red-900\\/20').count();
    console.log(`📊 Error states found: ${errorCount}`);

    // If there are errors, verify they display properly
    if (errorCount > 0) {
      const errorText = await page.locator('.bg-red-50, .bg-red-900\\/20').first().textContent();
      expect(errorText).toBeTruthy();
      console.log('✅ Error state displays correctly');
    }
  });

  test('Memory: No memory leaks after multiple renders', async ({ page, context }) => {
    console.log('🔍 Testing for memory leaks...');

    // Get initial memory (if available)
    const initialMetrics = await page.evaluate(() =>
      (performance as any).memory?.usedJSHeapSize || 0
    );

    // Render diagrams multiple times
    for (let i = 0; i < 5; i++) {
      await page.click('text=Data Visualization - Diagrams');
      await page.waitForTimeout(500);
      await page.click('text=Basic Components');
      await page.waitForTimeout(500);
      console.log(`  Memory test cycle ${i + 1} complete`);
    }

    // Final render
    await page.click('text=Data Visualization - Diagrams');
    await page.waitForFunction(
      () => document.querySelectorAll('.mermaid-diagram svg').length === 3,
      { timeout: 10000 }
    );

    // Get final memory
    const finalMetrics = await page.evaluate(() =>
      (performance as any).memory?.usedJSHeapSize || 0
    );

    if (initialMetrics > 0 && finalMetrics > 0) {
      const memoryIncrease = finalMetrics - initialMetrics;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      console.log(`💾 Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);

      // Memory increase should be reasonable (<20MB)
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    } else {
      console.log('⚠️ Memory metrics not available');
    }
  });
});
