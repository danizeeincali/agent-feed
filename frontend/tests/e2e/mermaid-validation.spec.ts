import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = '/tmp/mermaid-fix-validation';
const RESULTS_FILE = path.join(SCREENSHOT_DIR, 'results.json');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const results = {
  timestamp: new Date().toISOString(),
  url: 'http://localhost:5173/agent/component-showcase-complete-v3',
  testResults: [] as any[],
  consoleErrors: [] as any[],
  consoleWarnings: [] as any[],
  screenshots: [] as any[],
  summary: {
    total: 3,
    passed: 0,
    failed: 0,
    renderTimes: [] as any[]
  }
};

test.describe('Mermaid Diagram Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console messages
    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();

      if (type === 'error' && !text.includes('WebSocket')) {
        results.consoleErrors.push({ type, text, timestamp: new Date().toISOString() });
        console.log(`❌ Console Error: ${text}`);
      } else if (type === 'warning' && !text.includes('WebSocket')) {
        results.consoleWarnings.push({ type, text, timestamp: new Date().toISOString() });
      }
    });

    // Capture page errors
    page.on('pageerror', error => {
      results.consoleErrors.push({ type: 'pageerror', text: error.message, timestamp: new Date().toISOString() });
      console.log(`❌ Page Error: ${error.message}`);
    });
  });

  test('should render all 3 Mermaid diagrams successfully', async ({ page }) => {
    console.log('\n🚀 Starting Mermaid Diagram Validation...\n');

    // Navigate to the component showcase page
    console.log('📍 Navigating to component showcase page...');
    await page.goto('http://localhost:5173/agent/component-showcase-complete-v3', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Take initial screenshot
    const initialScreenshot = path.join(SCREENSHOT_DIR, '01-page-loaded.png');
    await page.screenshot({ path: initialScreenshot, fullPage: false });
    results.screenshots.push({ name: 'Initial page load', path: initialScreenshot });
    console.log('✅ Page loaded successfully\n');

    // Find and click on the Diagrams tab
    console.log('🔍 Looking for "Data Visualization - Diagrams" tab...');

    // Try to find the tab by text content
    const diagramsTab = page.locator('a, button').filter({ hasText: /diagram/i }).first();
    await expect(diagramsTab).toBeVisible({ timeout: 10000 });
    await diagramsTab.click();
    await page.waitForTimeout(2000);

    console.log('✅ Clicked on Diagrams tab\n');

    // Take screenshot of the diagrams tab
    const tabScreenshot = path.join(SCREENSHOT_DIR, '02-diagrams-tab.png');
    await page.screenshot({ path: tabScreenshot, fullPage: true });
    results.screenshots.push({ name: 'Diagrams tab view', path: tabScreenshot });

    console.log('🎯 Testing Mermaid Diagrams...\n');

    // Define expected diagrams
    const expectedDiagrams = [
      { name: 'System Architecture Flowchart', type: 'flowchart', index: 0 },
      { name: 'API Interaction Sequence Diagram', type: 'sequence', index: 1 },
      { name: 'Data Model Class Diagram', type: 'class', index: 2 }
    ];

    // Find all Mermaid diagram containers
    const diagramContainers = page.locator('.mermaid-diagram').all();
    const count = await (await diagramContainers).length;
    console.log(`📊 Found ${count} diagram container(s)\n`);

    // Test each diagram
    for (const diagram of expectedDiagrams) {
      console.log(`\n--- Testing ${diagram.index + 1}/${expectedDiagrams.length}: ${diagram.name} ---`);

      const testResult = {
        name: diagram.name,
        type: diagram.type,
        success: false,
        renderTime: null as number | null,
        error: null as string | null,
        screenshotPath: null as string | null,
        dimensions: null as any
      };

      try {
        const diagramElement = page.locator('.mermaid-diagram').nth(diagram.index);
        await expect(diagramElement).toBeVisible({ timeout: 5000 });

        const startTime = Date.now();

        // Wait for loading state to disappear
        const loadingIndicator = diagramElement.locator('text=Rendering diagram...');
        const isLoading = await loadingIndicator.isVisible().catch(() => false);

        if (isLoading) {
          console.log('⏳ Diagram is rendering, waiting...');
          await loadingIndicator.waitFor({ state: 'detached', timeout: 15000 });
        }

        // Check for error state
        const errorAlert = diagramElement.locator('[role="alert"]');
        const hasError = await errorAlert.isVisible().catch(() => false);

        if (hasError) {
          const errorText = await errorAlert.textContent();
          testResult.error = errorText || 'Unknown error';
          console.log(`❌ Diagram failed: ${testResult.error}`);
          results.summary.failed++;
        } else {
          // Check for SVG (successful render)
          const svgElement = diagramElement.locator('svg');
          await expect(svgElement).toBeVisible({ timeout: 5000 });

          const renderTime = Date.now() - startTime;
          testResult.success = true;
          testResult.renderTime = renderTime;
          results.summary.passed++;
          results.summary.renderTimes.push({ diagram: diagram.name, time: renderTime });

          console.log(`✅ Successfully rendered in ${renderTime}ms`);

          // Take screenshot of this specific diagram
          const screenshotPath = path.join(SCREENSHOT_DIR, `03-diagram-${diagram.index + 1}-${diagram.type}.png`);
          await diagramElement.screenshot({ path: screenshotPath });
          testResult.screenshotPath = screenshotPath;
          results.screenshots.push({ name: diagram.name, path: screenshotPath });

          // Get SVG dimensions
          const svgBox = await svgElement.boundingBox();
          if (svgBox) {
            testResult.dimensions = { width: Math.round(svgBox.width), height: Math.round(svgBox.height) };
            console.log(`   Dimensions: ${testResult.dimensions.width}x${testResult.dimensions.height}px`);
          }
        }
      } catch (error: any) {
        testResult.error = error.message;
        console.log(`❌ Test error: ${error.message}`);
        results.summary.failed++;
      }

      results.testResults.push(testResult);
    }

    // Take final full-page screenshot
    console.log('\n📸 Taking final screenshots...');
    const finalScreenshot = path.join(SCREENSHOT_DIR, '04-final-full-view.png');
    await page.screenshot({ path: finalScreenshot, fullPage: true });
    results.screenshots.push({ name: 'Final full page view', path: finalScreenshot });

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.summary.passed}/${results.summary.total}`);
    console.log(`❌ Failed: ${results.summary.failed}/${results.summary.total}`);

    if (results.summary.renderTimes.length > 0) {
      console.log('\n⏱️  Render Times:');
      results.summary.renderTimes.forEach(rt => {
        console.log(`   ${rt.diagram}: ${rt.time}ms`);
      });
      const avgTime = results.summary.renderTimes.reduce((sum, rt) => sum + rt.time, 0) / results.summary.renderTimes.length;
      console.log(`   Average: ${Math.round(avgTime)}ms`);
    }

    console.log('\n📋 Console Summary:');
    console.log(`   Errors: ${results.consoleErrors.length} (excluding WebSocket)`);
    console.log(`   Warnings: ${results.consoleWarnings.length} (excluding WebSocket)`);

    console.log('\n📸 Screenshots saved:');
    results.screenshots.forEach(ss => {
      console.log(`   ${ss.name}: ${ss.path}`);
    });

    console.log('\n📁 Results saved to:', RESULTS_FILE);
    console.log('='.repeat(60) + '\n');

    // Save results to JSON
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

    // Assert all diagrams passed
    expect(results.summary.passed).toBe(results.summary.total);
    expect(results.summary.failed).toBe(0);
  });
});
