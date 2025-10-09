import { test, expect } from '@playwright/test';

/**
 * Mermaid Infinite Loop Fix Verification Test
 *
 * This test verifies that the Mermaid diagram rendering fix is working correctly:
 * - No infinite loops
 * - No "Maximum update depth exceeded" errors
 * - All 3 diagrams render successfully
 * - Render time < 10 seconds per diagram
 */

test.describe('Mermaid Diagram Fix Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console error capture
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Navigate to the showcase page
    await page.goto('http://localhost:5173/agent/page-builder-agent-component-showcase-complete-v3', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
  });

  test('Tab 7: All 3 Mermaid diagrams should render successfully', async ({ page }) => {
    console.log('🔍 Starting Mermaid diagram verification...');

    // Click on Tab 7 (Data Visualization - Diagrams)
    const diagramsTab = page.locator('text=Data Visualization - Diagrams');
    await diagramsTab.click();
    console.log('✅ Clicked on Tab 7: Data Visualization - Diagrams');

    // Wait for the diagrams section to be visible
    await page.waitForSelector('[id="diagrams"]', { timeout: 5000 });
    console.log('✅ Diagrams section is visible');

    // Wait a bit for React to settle
    await page.waitForTimeout(2000);

    // Check for the 3 Mermaid diagram containers
    const mermaidContainers = page.locator('.mermaid-diagram');
    const count = await mermaidContainers.count();
    console.log(`📊 Found ${count} Mermaid diagram containers`);

    expect(count).toBe(3);

    // Verify each diagram has rendered (no "Rendering..." text)
    for (let i = 0; i < count; i++) {
      const container = mermaidContainers.nth(i);

      // Check if still rendering
      const isRendering = await container.locator('text=Rendering diagram').count();
      console.log(`📊 Diagram ${i + 1}: Rendering spinner count = ${isRendering}`);

      // Check for SVG (successful render)
      const hasSvg = await container.locator('svg').count();
      console.log(`📊 Diagram ${i + 1}: SVG count = ${hasSvg}`);

      // Check for error state
      const hasError = await page.locator('.bg-red-50, .bg-red-900\\/20').count();
      console.log(`📊 Diagram ${i + 1}: Error state count = ${hasError}`);

      expect(isRendering).toBe(0);
      expect(hasSvg).toBeGreaterThan(0);
      expect(hasError).toBe(0);
    }

    console.log('✅ All 3 diagrams rendered successfully!');
  });

  test('Tab 7: Diagrams should render within acceptable time', async ({ page }) => {
    console.log('⏱️ Testing diagram render time...');

    // Click on Tab 7
    const diagramsTab = page.locator('text=Data Visualization - Diagrams');
    await diagramsTab.click();

    const startTime = Date.now();

    // Wait for all 3 SVGs to appear
    await page.waitForSelector('.mermaid-diagram svg', { timeout: 10000 });

    // Wait for all 3 to be present
    await page.waitForFunction(
      () => document.querySelectorAll('.mermaid-diagram svg').length === 3,
      { timeout: 10000 }
    );

    const endTime = Date.now();
    const renderTime = endTime - startTime;

    console.log(`⏱️ Total render time: ${renderTime}ms`);
    console.log(`⏱️ Average per diagram: ${Math.round(renderTime / 3)}ms`);

    // Should render within 10 seconds total
    expect(renderTime).toBeLessThan(10000);
  });

  test('Tab 7: No React infinite loop errors in console', async ({ page }) => {
    console.log('🔍 Checking for React errors...');

    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Click on Tab 7
    const diagramsTab = page.locator('text=Data Visualization - Diagrams');
    await diagramsTab.click();

    // Wait for diagrams to render
    await page.waitForTimeout(5000);

    // Filter for React-specific errors
    const reactErrors = consoleErrors.filter(error =>
      error.includes('Maximum update depth') ||
      error.includes('Too many re-renders') ||
      error.includes('infinite loop')
    );

    console.log(`📋 Total console errors: ${consoleErrors.length}`);
    console.log(`❌ React infinite loop errors: ${reactErrors.length}`);

    if (reactErrors.length > 0) {
      console.log('❌ React errors found:');
      reactErrors.forEach(error => console.log(`   - ${error}`));
    }

    expect(reactErrors.length).toBe(0);
  });

  test('Tab 7: Take screenshots of rendered diagrams', async ({ page }) => {
    console.log('📸 Taking screenshots...');

    // Click on Tab 7
    const diagramsTab = page.locator('text=Data Visualization - Diagrams');
    await diagramsTab.click();

    // Wait for diagrams to render
    await page.waitForSelector('.mermaid-diagram svg', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Take full tab screenshot
    await page.screenshot({
      path: '/workspaces/agent-feed/frontend/mermaid-verification-full.png',
      fullPage: true
    });
    console.log('✅ Full page screenshot saved');

    // Take individual diagram screenshots
    const mermaidContainers = page.locator('.mermaid-diagram');
    const count = await mermaidContainers.count();

    for (let i = 0; i < count; i++) {
      const container = mermaidContainers.nth(i);
      await container.screenshot({
        path: `/workspaces/agent-feed/frontend/mermaid-diagram-${i + 1}.png`
      });
      console.log(`✅ Diagram ${i + 1} screenshot saved`);
    }
  });

  test('Tab 7: Verify specific diagram content', async ({ page }) => {
    console.log('🔍 Verifying diagram content...');

    // Click on Tab 7
    const diagramsTab = page.locator('text=Data Visualization - Diagrams');
    await diagramsTab.click();

    // Wait for diagrams
    await page.waitForSelector('.mermaid-diagram svg', { timeout: 10000 });

    // Check for System Architecture diagram
    const systemArchDiagram = page.locator('#system-architecture-diagram').first();
    const hasSystemArchSvg = await systemArchDiagram.locator('svg').count();
    console.log(`✅ System Architecture Diagram: ${hasSystemArchSvg > 0 ? 'RENDERED' : 'FAILED'}`);
    expect(hasSystemArchSvg).toBeGreaterThan(0);

    // Check for API Sequence diagram
    const apiSeqDiagram = page.locator('#api-sequence-diagram').first();
    const hasApiSeqSvg = await apiSeqDiagram.locator('svg').count();
    console.log(`✅ API Sequence Diagram: ${hasApiSeqSvg > 0 ? 'RENDERED' : 'FAILED'}`);
    expect(hasApiSeqSvg).toBeGreaterThan(0);

    // Check for Data Model Class diagram
    const dataModelDiagram = page.locator('#data-model-class-diagram').first();
    const hasDataModelSvg = await dataModelDiagram.locator('svg').count();
    console.log(`✅ Data Model Class Diagram: ${hasDataModelSvg > 0 ? 'RENDERED' : 'FAILED'}`);
    expect(hasDataModelSvg).toBeGreaterThan(0);

    console.log('✅ All 3 specific diagrams verified!');
  });
});
