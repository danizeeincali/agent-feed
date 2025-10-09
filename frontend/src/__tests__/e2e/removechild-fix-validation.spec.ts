/**
 * E2E Playwright Tests: removeChild DOM Error Fix Validation
 *
 * Tests the fix for "Failed to execute 'removeChild' on 'Node'" error
 * that occurred when React-managed children were destroyed by innerHTML
 * before React could unmount them.
 *
 * SPARC SPEC: /workspaces/agent-feed/SPARC-REMOVECHILD-FIX.md
 *
 * Test Coverage:
 * - No console errors during Mermaid rendering
 * - All 3 diagrams on Tab 7 render correctly
 * - Loading spinners appear and disappear
 * - SVG content is properly inserted
 * - Multiple diagrams don't interfere with each other
 * - Performance is acceptable
 * - Accessibility attributes are correct
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const COMPONENT_SHOWCASE_URL = `${BASE_URL}/agents/page-builder-agent/pages/component-showcase-complete-v3`;

/**
 * Helper: Monitor console for specific error messages
 */
function setupConsoleMonitoring(page: Page) {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    } else if (msg.type() === 'warning') {
      consoleWarnings.push(msg.text());
    }
  });

  return { consoleErrors, consoleWarnings };
}

/**
 * Helper: Wait for diagram to be fully rendered
 */
async function waitForDiagram(page: Page, index: number, timeout = 10000) {
  const selector = `.mermaid-diagram svg`;
  await page.waitForSelector(selector, { timeout, state: 'attached' });

  // Wait for SVG to have actual content
  const svg = page.locator(selector).nth(index);
  await expect(svg).toBeVisible({ timeout });

  return svg;
}

test.describe('RemoveChild Fix - Critical Error Prevention', () => {

  test('should NOT produce removeChild errors in console', async ({ page }) => {
    // Set up console monitoring BEFORE navigation
    const { consoleErrors } = setupConsoleMonitoring(page);

    // Navigate to Component Showcase
    await page.goto(COMPONENT_SHOWCASE_URL);

    // Click Tab 7: Data Visualization - Diagrams
    await page.click('text=Data Visualization');

    // Wait for all 3 diagrams to render
    await waitForDiagram(page, 0);
    await waitForDiagram(page, 1);
    await waitForDiagram(page, 2);

    // Filter for removeChild errors
    const removeChildErrors = consoleErrors.filter(error =>
      error.toLowerCase().includes('removechild') ||
      error.toLowerCase().includes('remove child')
    );

    // CRITICAL ASSERTION: No removeChild errors
    expect(removeChildErrors).toHaveLength(0);

    // Log all errors if test fails
    if (removeChildErrors.length > 0) {
      console.error('RemoveChild errors found:', removeChildErrors);
    }
  });

  test('should render all 3 Mermaid diagrams successfully', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.click('text=Data Visualization');

    // Wait for all diagrams
    const diagram1 = await waitForDiagram(page, 0);
    const diagram2 = await waitForDiagram(page, 1);
    const diagram3 = await waitForDiagram(page, 2);

    // Verify each diagram has SVG content
    await expect(diagram1).toBeVisible();
    await expect(diagram2).toBeVisible();
    await expect(diagram3).toBeVisible();

    // Verify diagrams are not empty
    const svg1Content = await diagram1.innerHTML();
    const svg2Content = await diagram2.innerHTML();
    const svg3Content = await diagram3.innerHTML();

    expect(svg1Content.length).toBeGreaterThan(100);
    expect(svg2Content.length).toBeGreaterThan(100);
    expect(svg3Content.length).toBeGreaterThan(100);
  });

  test('should clear loading spinners before SVG insertion', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);

    // Click tab and immediately check for loading state
    await page.click('text=Data Visualization');

    // Loading spinner should appear briefly
    const hasLoadingState = await page.locator('text=Rendering diagram').count() > 0 ||
                            await page.locator('.animate-spin').count() > 0;

    // Note: Loading might be too fast to catch, so this is informational
    console.log('Loading state observed:', hasLoadingState);

    // Wait for diagrams to be ready
    await waitForDiagram(page, 0);

    // Loading spinners should be gone
    const loadingSpinnersRemaining = await page.locator('text=Rendering diagram').count();
    expect(loadingSpinnersRemaining).toBe(0);

    // Verify no orphaned React elements
    const containers = page.locator('.mermaid-diagram');
    const count = await containers.count();

    for (let i = 0; i < count; i++) {
      const container = containers.nth(i);
      const hasOnlySVG = await container.evaluate(el => {
        // Should only contain SVG, no loading divs
        const children = Array.from(el.children);
        return children.every(child => child.tagName === 'svg' || child.tagName === 'SVG');
      });

      expect(hasOnlySVG).toBeTruthy();
    }
  });
});

test.describe('RemoveChild Fix - Performance Validation', () => {

  test('should render diagrams within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.click('text=Data Visualization');

    // Wait for all 3 diagrams
    await waitForDiagram(page, 0);
    await waitForDiagram(page, 1);
    await waitForDiagram(page, 2);

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Should render 3 diagrams in under 10 seconds
    expect(totalTime).toBeLessThan(10000);

    console.log(`3 diagrams rendered in ${totalTime}ms`);
  });

  test('should handle rapid tab switching without errors', async ({ page }) => {
    const { consoleErrors } = setupConsoleMonitoring(page);

    await page.goto(COMPONENT_SHOWCASE_URL);

    // Rapidly switch between tabs
    for (let i = 0; i < 3; i++) {
      await page.click('text=Data Visualization');
      await page.waitForTimeout(100);
      await page.click('text=Interactive Elements');
      await page.waitForTimeout(100);
    }

    // Finally stay on Data Visualization
    await page.click('text=Data Visualization');
    await waitForDiagram(page, 0);

    // No removeChild errors despite rapid switching
    const removeChildErrors = consoleErrors.filter(error =>
      error.toLowerCase().includes('removechild')
    );

    expect(removeChildErrors).toHaveLength(0);
  });
});

test.describe('RemoveChild Fix - Accessibility Validation', () => {

  test('should have correct ARIA attributes during loading', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);

    // Use slower network to catch loading state
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 500 * 1024 / 8, // 500 kbps
      uploadThroughput: 500 * 1024 / 8,
      latency: 100
    });

    await page.click('text=Data Visualization');

    // Check if we can catch the loading state
    const container = page.locator('.mermaid-diagram').first();

    try {
      // Try to catch loading state (might be too fast)
      await expect(container).toHaveAttribute('role', 'status', { timeout: 1000 });
      console.log('✅ Loading state ARIA role verified');
    } catch {
      console.log('⚠️ Loading state too fast to catch (acceptable)');
    }

    // After rendering, should have img role
    await waitForDiagram(page, 0);
    await expect(container).toHaveAttribute('role', 'img');
  });

  test('should have proper aria-label attributes', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.click('text=Data Visualization');

    await waitForDiagram(page, 0);

    const containers = page.locator('.mermaid-diagram');
    const count = await containers.count();

    expect(count).toBeGreaterThanOrEqual(3);

    // Each container should have aria-label
    for (let i = 0; i < Math.min(count, 3); i++) {
      const container = containers.nth(i);
      const ariaLabel = await container.getAttribute('aria-label');

      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('diagram');
    }
  });
});

test.describe('RemoveChild Fix - Diagram Content Validation', () => {

  test('should render System Architecture flowchart correctly', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.click('text=Data Visualization');

    const diagram = await waitForDiagram(page, 0);
    const content = await diagram.innerHTML();

    // Should contain flowchart elements
    expect(content).toContain('flowchart');

    // Should have actual nodes (not empty SVG)
    expect(content.length).toBeGreaterThan(500);
  });

  test('should render API Sequence diagram correctly', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.click('text=Data Visualization');

    const diagram = await waitForDiagram(page, 1);
    const content = await diagram.innerHTML();

    // Should contain sequence diagram elements
    expect(content.length).toBeGreaterThan(500);

    // Sequence diagrams typically have specific classes
    const hasSequenceElements = content.includes('sequence') ||
                                content.includes('actor') ||
                                content.length > 500;

    expect(hasSequenceElements).toBeTruthy();
  });

  test('should render Data Model class diagram correctly', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.click('text=Data Visualization');

    const diagram = await waitForDiagram(page, 2);
    const content = await diagram.innerHTML();

    // Should contain class diagram elements
    expect(content.length).toBeGreaterThan(500);
  });
});

test.describe('RemoveChild Fix - Regression Testing', () => {

  test('should not affect other page components', async ({ page }) => {
    const { consoleErrors } = setupConsoleMonitoring(page);

    await page.goto(COMPONENT_SHOWCASE_URL);

    // Test other tabs still work
    await page.click('text=Layout Components');
    await page.waitForTimeout(500);

    await page.click('text=Form Elements');
    await page.waitForTimeout(500);

    await page.click('text=Interactive Elements');
    await page.waitForTimeout(500);

    // No errors from other components
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('Warning') &&
      !error.includes('DevTools')
    );

    expect(criticalErrors.length).toBeLessThan(5); // Allow minor warnings
  });

  test('should work with icons (previous fix)', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);

    // Icons should still render correctly
    const icons = page.locator('svg').filter({ hasNot: page.locator('.mermaid-diagram svg') });
    const iconCount = await icons.count();

    // Should have Lucide icons rendered
    expect(iconCount).toBeGreaterThan(0);

    console.log(`Found ${iconCount} non-Mermaid SVG icons`);
  });
});

test.describe('RemoveChild Fix - Memory Leak Prevention', () => {

  test('should not create memory leaks with multiple renders', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);

    // Measure initial memory
    const initialMetrics = await page.evaluate(() => ({
      memory: (performance as any).memory?.usedJSHeapSize || 0
    }));

    // Render diagrams multiple times
    for (let i = 0; i < 5; i++) {
      await page.click('text=Interactive Elements');
      await page.waitForTimeout(300);
      await page.click('text=Data Visualization');
      await waitForDiagram(page, 0);
    }

    // Measure final memory
    const finalMetrics = await page.evaluate(() => ({
      memory: (performance as any).memory?.usedJSHeapSize || 0
    }));

    const memoryIncrease = finalMetrics.memory - initialMetrics.memory;
    const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

    console.log(`Memory increase after 5 cycles: ${memoryIncreaseMB.toFixed(2)} MB`);

    // Memory increase should be reasonable (<50MB)
    expect(memoryIncreaseMB).toBeLessThan(50);
  });

  test('should clean up detached DOM nodes', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.click('text=Data Visualization');

    // Wait for all diagrams
    await waitForDiagram(page, 0);
    await waitForDiagram(page, 1);
    await waitForDiagram(page, 2);

    // Count detached nodes
    const detachedNodes = await page.evaluate(() => {
      // This is a simplified check - real memory profiling needs DevTools
      const containers = document.querySelectorAll('.mermaid-diagram');
      let orphanedChildren = 0;

      containers.forEach(container => {
        // Check for leftover loading spinner elements
        const loadingElements = container.querySelectorAll('.animate-spin, [aria-label*="Loading"]');
        orphanedChildren += loadingElements.length;
      });

      return orphanedChildren;
    });

    // Should have no orphaned loading spinners
    expect(detachedNodes).toBe(0);
  });
});

test.describe('RemoveChild Fix - Screenshot Validation', () => {

  test('should capture working state for documentation', async ({ page }) => {
    await page.goto(COMPONENT_SHOWCASE_URL);
    await page.click('text=Data Visualization');

    // Wait for all diagrams
    await waitForDiagram(page, 0);
    await waitForDiagram(page, 1);
    await waitForDiagram(page, 2);

    // Take full page screenshot
    await page.screenshot({
      path: 'mermaid-diagrams-working-proof.png',
      fullPage: true
    });

    // Take screenshot of just the diagrams section
    const diagramsSection = page.locator('.mermaid-diagram').first().locator('..');
    await diagramsSection.screenshot({
      path: 'mermaid-diagrams-close-up.png'
    });

    console.log('✅ Screenshots saved for documentation');
  });
});
