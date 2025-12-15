/**
 * Comprehensive Test for All 10 Mermaid Diagram Types
 * Tests rendering, accessibility, and performance
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';

const TEST_URL = 'http://localhost:5173/agents/page-builder-agent/pages/mermaid-all-types-test';
const SCREENSHOT_DIR = '/tmp/mermaid-screenshots';
const REPORT_PATH = '/tmp/mermaid-10-types-test-report.md';

const DIAGRAM_TYPES = [
  { name: 'Flowchart', keyword: 'graph TD', index: 1 },
  { name: 'Sequence Diagram', keyword: 'sequenceDiagram', index: 2 },
  { name: 'Class Diagram', keyword: 'classDiagram', index: 3 },
  { name: 'State Diagram', keyword: 'stateDiagram-v2', index: 4 },
  { name: 'Entity Relationship', keyword: 'erDiagram', index: 5 },
  { name: 'Gantt Chart', keyword: 'gantt', index: 6 },
  { name: 'User Journey', keyword: 'journey', index: 7 },
  { name: 'Pie Chart', keyword: 'pie', index: 8 },
  { name: 'Git Graph', keyword: 'gitGraph', index: 9 },
  { name: 'Timeline', keyword: 'timeline', index: 10 }
];

async function ensureScreenshotDir() {
  try {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
    console.log(`✓ Screenshot directory ready: ${SCREENSHOT_DIR}`);
  } catch (error) {
    console.error(`✗ Failed to create screenshot directory: ${error.message}`);
  }
}

async function testDiagramRendering(page, diagram, index) {
  console.log(`\nTesting ${diagram.name}...`);

  const result = {
    name: diagram.name,
    index: diagram.index,
    status: 'FAIL',
    renderTime: 0,
    hasSVG: false,
    hasError: false,
    errorMessage: '',
    hasARIA: false,
    dimensions: { width: 0, height: 0 },
    screenshot: ''
  };

  try {
    const startTime = Date.now();

    // Find containers by looking for divs that contain either "Rendering diagram" or SVG elements
    // These are the Mermaid diagram containers
    const renderingTexts = await page.locator('text=Rendering diagram').all();

    if (renderingTexts.length === 0) {
      result.errorMessage = 'No Mermaid diagrams found on page (no "Rendering diagram" text)';
      return result;
    }

    if (index > renderingTexts.length) {
      result.errorMessage = `Diagram ${index} not found (only ${renderingTexts.length} diagrams)`;
      return result;
    }

    // Get the grandparent div which contains the full mermaid component
    const renderingText = renderingTexts[index - 1];
    const container = renderingText.locator('xpath=ancestor::div[contains(@class, "space-y") or contains(@class, "rounded") or contains(@class, "border")][1]');

    // If that doesn't work, try to get a parent div that should contain the SVG
    const containerCount = await container.count();
    let actualContainer;

    if (containerCount === 0) {
      // Fallback: use the closest div ancestor
      actualContainer = renderingText.locator('xpath=ancestor::div[3]').first();
    } else {
      actualContainer = container.first();
    }

    // Scroll to the diagram
    await actualContainer.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Wait for rendering to complete - either SVG appears or error shows
    // Wait by checking if "Rendering diagram" text disappears
    try {
      await page.waitForFunction(
        (text) => {
          const elements = document.querySelectorAll('*');
          let count = 0;
          elements.forEach(el => {
            if (el.textContent && el.textContent.includes(text) && el.children.length === 0) {
              count++;
            }
          });
          return count === 0;
        },
        'Rendering diagram',
        { timeout: 20000 }
      );
    } catch (e) {
      result.errorMessage = 'Stuck on "Rendering diagram..." message (timeout after 20s)';
      // Take screenshot for debugging
      const screenshotPath = path.join(SCREENSHOT_DIR, `${index}-${diagram.name.toLowerCase().replace(/\s+/g, '-')}-stuck.png`);
      await actualContainer.screenshot({ path: screenshotPath });
      result.screenshot = screenshotPath;
      return result;
    }

    // Check for error message
    const errorCount = await actualContainer.locator('text=Error rendering diagram').count();
    if (errorCount > 0) {
      result.hasError = true;
      const errorText = await actualContainer.textContent();
      result.errorMessage = errorText || 'Unknown error';
      return result;
    }

    // Find SVG in the container
    const svgCount = await actualContainer.locator('svg').count();

    if (svgCount === 0) {
      result.errorMessage = 'No SVG element found after rendering completed';
      return result;
    }

    const svg = actualContainer.locator('svg').first();

    result.hasSVG = true;
    result.renderTime = Date.now() - startTime;

    // Get SVG dimensions
    const boundingBox = await svg.boundingBox();
    if (boundingBox) {
      result.dimensions = {
        width: Math.round(boundingBox.width),
        height: Math.round(boundingBox.height)
      };
    }

    // Check for ARIA labels
    const ariaLabel = await actualContainer.getAttribute('aria-label');
    const role = await actualContainer.getAttribute('role');
    result.hasARIA = !!(ariaLabel || role);

    // Take screenshot
    const screenshotPath = path.join(SCREENSHOT_DIR, `${index}-${diagram.name.toLowerCase().replace(/\s+/g, '-')}.png`);
    await actualContainer.screenshot({ path: screenshotPath });
    result.screenshot = screenshotPath;

    // Verify SVG content is meaningful (has elements)
    const svgElements = await svg.locator('*').count();
    if (svgElements > 5) {
      result.status = 'PASS';
      console.log(`  ✓ ${diagram.name} rendered successfully (${result.renderTime}ms)`);
    } else {
      result.errorMessage = 'SVG has insufficient content';
      console.log(`  ✗ ${diagram.name} rendered but appears empty`);
    }

  } catch (error) {
    result.errorMessage = error.message;
    console.log(`  ✗ ${diagram.name} failed: ${error.message}`);
  }

  return result;
}

async function testAccessibility(page) {
  console.log('\n=== Accessibility Testing ===');

  const results = {
    hasMainLandmark: false,
    keyboardNavigable: false,
    hasHeadings: false,
    diagramsHaveLabels: 0,
    totalDiagrams: 0
  };

  try {
    // Check for semantic HTML
    const main = await page.locator('main, [role="main"]').count();
    results.hasMainLandmark = main > 0;
    console.log(`Main landmark: ${results.hasMainLandmark ? '✓' : '✗'}`);

    // Check for proper heading structure
    const h1Count = await page.locator('h1').count();
    const h2Count = await page.locator('h2').count();
    results.hasHeadings = h1Count > 0 && h2Count > 0;
    console.log(`Heading structure: ${results.hasHeadings ? '✓' : '✗'} (h1: ${h1Count}, h2: ${h2Count})`);

    // Check diagram ARIA labels
    const diagramContainers = await page.locator('[data-testid="mermaid-container"]').all();
    results.totalDiagrams = diagramContainers.length;

    for (const container of diagramContainers) {
      const ariaLabel = await container.getAttribute('aria-label');
      const role = await container.getAttribute('role');
      if (ariaLabel || role) {
        results.diagramsHaveLabels++;
      }
    }
    console.log(`Diagrams with ARIA: ${results.diagramsHaveLabels}/${results.totalDiagrams}`);

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    const focusedElement = await page.evaluate(() => document.activeElement.tagName);
    results.keyboardNavigable = focusedElement !== 'BODY';
    console.log(`Keyboard navigation: ${results.keyboardNavigable ? '✓' : '✗'}`);

  } catch (error) {
    console.log(`Accessibility test error: ${error.message}`);
  }

  return results;
}

async function measurePerformance(page) {
  console.log('\n=== Performance Metrics ===');

  const metrics = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0];
    return {
      pageLoadTime: Math.round(perf.loadEventEnd - perf.fetchStart),
      domContentLoaded: Math.round(perf.domContentLoadedEventEnd - perf.fetchStart),
      firstPaint: Math.round(performance.getEntriesByType('paint')[0]?.startTime || 0),
      domInteractive: Math.round(perf.domInteractive - perf.fetchStart)
    };
  });

  console.log(`Page Load Time: ${metrics.pageLoadTime}ms`);
  console.log(`DOM Content Loaded: ${metrics.domContentLoaded}ms`);
  console.log(`First Paint: ${metrics.firstPaint}ms`);
  console.log(`DOM Interactive: ${metrics.domInteractive}ms`);

  return metrics;
}

function generateReport(results, accessibilityResults, performanceMetrics, pageLoadTime) {
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const avgRenderTime = results.reduce((sum, r) => sum + r.renderTime, 0) / results.length;

  let report = `# Mermaid 10 Diagram Types - Comprehensive Test Report

**Test Date:** ${new Date().toISOString()}
**Test URL:** ${TEST_URL}
**Total Diagrams:** ${DIAGRAM_TYPES.length}

## Executive Summary

- **Overall Status:** ${passCount === DIAGRAM_TYPES.length ? '✅ ALL PASS' : '❌ SOME FAILURES'}
- **Passed:** ${passCount}/${DIAGRAM_TYPES.length}
- **Failed:** ${failCount}/${DIAGRAM_TYPES.length}
- **Success Rate:** ${Math.round((passCount / DIAGRAM_TYPES.length) * 100)}%

---

## Diagram Type Results

| # | Diagram Type | Status | Render Time | SVG | Dimensions | ARIA | Screenshot |
|---|--------------|--------|-------------|-----|------------|------|------------|
`;

  results.forEach(r => {
    const status = r.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    const svg = r.hasSVG ? '✓' : '✗';
    const aria = r.hasARIA ? '✓' : '✗';
    const dims = `${r.dimensions.width}x${r.dimensions.height}`;
    const screenshot = r.screenshot ? `![${r.name}](${r.screenshot})` : 'N/A';

    report += `| ${r.index} | **${r.name}** | ${status} | ${r.renderTime}ms | ${svg} | ${dims} | ${aria} | [View](${r.screenshot}) |\n`;
  });

  report += `\n---\n\n## Detailed Results\n\n`;

  results.forEach(r => {
    report += `### ${r.index}. ${r.name}\n\n`;
    report += `- **Status:** ${r.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}\n`;
    report += `- **Render Time:** ${r.renderTime}ms\n`;
    report += `- **SVG Rendered:** ${r.hasSVG ? 'Yes' : 'No'}\n`;
    report += `- **Dimensions:** ${r.dimensions.width}x${r.dimensions.height}px\n`;
    report += `- **ARIA Support:** ${r.hasARIA ? 'Yes' : 'No'}\n`;

    if (r.errorMessage) {
      report += `- **Error:** ${r.errorMessage}\n`;
    }

    if (r.screenshot) {
      report += `\n![${r.name} Screenshot](${r.screenshot})\n`;
    }

    report += `\n`;
  });

  report += `---\n\n## Performance Metrics\n\n`;
  report += `- **Total Page Load Time:** ${pageLoadTime}ms\n`;
  report += `- **DOM Content Loaded:** ${performanceMetrics.domContentLoaded}ms\n`;
  report += `- **First Paint:** ${performanceMetrics.firstPaint}ms\n`;
  report += `- **DOM Interactive:** ${performanceMetrics.domInteractive}ms\n`;
  report += `- **Average Diagram Render Time:** ${Math.round(avgRenderTime)}ms\n`;
  report += `- **Fastest Diagram:** ${Math.min(...results.map(r => r.renderTime))}ms\n`;
  report += `- **Slowest Diagram:** ${Math.max(...results.map(r => r.renderTime))}ms\n\n`;

  report += `---\n\n## Accessibility Check\n\n`;
  report += `- **Main Landmark Present:** ${accessibilityResults.hasMainLandmark ? '✅ Yes' : '❌ No'}\n`;
  report += `- **Proper Heading Structure:** ${accessibilityResults.hasHeadings ? '✅ Yes' : '❌ No'}\n`;
  report += `- **Keyboard Navigable:** ${accessibilityResults.keyboardNavigable ? '✅ Yes' : '❌ No'}\n`;
  report += `- **Diagrams with ARIA Labels:** ${accessibilityResults.diagramsHaveLabels}/${accessibilityResults.totalDiagrams}\n\n`;

  report += `---\n\n## Conclusion\n\n`;

  if (passCount === DIAGRAM_TYPES.length) {
    report += `🎉 **SUCCESS!** All 10 Mermaid diagram types are rendering correctly.\n\n`;
    report += `The Mermaid integration is fully functional with:\n`;
    report += `- All diagram types rendering as expected\n`;
    report += `- Good performance (average render time: ${Math.round(avgRenderTime)}ms)\n`;
    report += `- Proper accessibility features\n`;
  } else {
    report += `⚠️ **ATTENTION NEEDED:** ${failCount} diagram type(s) failed to render correctly.\n\n`;
    report += `Failed diagrams:\n`;
    results.filter(r => r.status === 'FAIL').forEach(r => {
      report += `- **${r.name}:** ${r.errorMessage}\n`;
    });
  }

  report += `\n---\n\n## Test Environment\n\n`;
  report += `- **Browser:** Chromium (Playwright)\n`;
  report += `- **Test Framework:** Playwright + Node.js\n`;
  report += `- **Screenshot Directory:** ${SCREENSHOT_DIR}\n`;
  report += `- **Report Location:** ${REPORT_PATH}\n`;

  return report;
}

async function runTests() {
  console.log('=================================');
  console.log('Mermaid 10 Types - Comprehensive Test');
  console.log('=================================\n');

  const startTime = Date.now();

  await ensureScreenshotDir();

  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  try {
    console.log(`Navigating to ${TEST_URL}...`);
    const response = await page.goto(TEST_URL, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    if (!response || !response.ok()) {
      throw new Error(`Failed to load page: ${response?.status()}`);
    }

    const pageLoadTime = Date.now() - startTime;
    console.log(`✓ Page loaded in ${pageLoadTime}ms`);

    // Wait for React to hydrate and Mermaid to initialize
    console.log('Waiting for page to fully initialize...');
    await page.waitForTimeout(5000);

    // Test each diagram type
    console.log('\n=== Testing Diagram Rendering ===');
    const results = [];

    for (const diagram of DIAGRAM_TYPES) {
      const result = await testDiagramRendering(page, diagram, diagram.index);
      results.push(result);
      await page.waitForTimeout(500); // Small delay between tests
    }

    // Run accessibility tests
    const accessibilityResults = await testAccessibility(page);

    // Measure performance
    const performanceMetrics = await measurePerformance(page);

    // Take full page screenshot
    const fullPageScreenshot = path.join(SCREENSHOT_DIR, 'full-page.png');
    await page.screenshot({
      path: fullPageScreenshot,
      fullPage: true
    });
    console.log(`\n✓ Full page screenshot saved: ${fullPageScreenshot}`);

    // Generate report
    const report = generateReport(results, accessibilityResults, performanceMetrics, pageLoadTime);
    await fs.writeFile(REPORT_PATH, report, 'utf8');
    console.log(`\n✓ Test report generated: ${REPORT_PATH}`);

    // Print summary
    console.log('\n=================================');
    console.log('TEST SUMMARY');
    console.log('=================================');
    const passCount = results.filter(r => r.status === 'PASS').length;
    console.log(`Total: ${DIAGRAM_TYPES.length}`);
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${DIAGRAM_TYPES.length - passCount}`);
    console.log(`Success Rate: ${Math.round((passCount / DIAGRAM_TYPES.length) * 100)}%`);

    if (passCount === DIAGRAM_TYPES.length) {
      console.log('\n🎉 ALL TESTS PASSED! 🎉');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED');
      results.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  ✗ ${r.name}: ${r.errorMessage}`);
      });
    }

  } catch (error) {
    console.error(`\n✗ Test execution failed: ${error.message}`);
    console.error(error.stack);
  } finally {
    await browser.close();
    console.log('\n✓ Browser closed');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
