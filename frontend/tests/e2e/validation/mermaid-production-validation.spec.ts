import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Mermaid Diagram Production Validation', () => {
  const BASE_URL = 'http://localhost:5173';
  const PAGE_URL = `${BASE_URL}/agents/page-builder-agent/pages/component-showcase-complete-v3`;
  const SCREENSHOT_DIR = '/tmp/mermaid-validation-screenshots';

  test.beforeAll(async () => {
    // Create screenshot directory
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('should verify Mermaid diagrams render on component showcase page', async ({ page }) => {
    // Set up console monitoring
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);

      if (msg.type() === 'error') {
        consoleErrors.push(text);
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(text);
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(`Page Error: ${error.message}`);
    });

    console.log('Navigating to:', PAGE_URL);

    // Navigate to the showcase page
    await page.goto(PAGE_URL, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Allow dynamic content to render

    // Take full page screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-full-page.png'),
      fullPage: true
    });
    console.log('✓ Captured full page screenshot');

    // Navigate to Tab 7 (Data Visualization - Diagrams)
    console.log('Clicking on Diagrams navigation...');

    // Try to find and click the diagrams nav item
    const diagramsNavSelector = '[href="#diagrams"], a:has-text("Data Visualization - Diagrams"), a:has-text("Diagrams")';
    const diagramsNav = await page.locator(diagramsNavSelector).first();

    if (await diagramsNav.count() > 0) {
      await diagramsNav.click();
      await page.waitForTimeout(1000);
      console.log('✓ Navigated to Diagrams section');
    } else {
      console.log('⚠ Could not find diagrams navigation link, trying to scroll to section');
      await page.evaluate(() => {
        const element = document.getElementById('diagrams');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
      await page.waitForTimeout(1000);
    }

    // Wait for Mermaid diagrams to render
    console.log('Waiting for Mermaid diagrams to render...');

    // Wait for at least one mermaid diagram to appear
    try {
      await page.waitForSelector('.mermaid-diagram', { timeout: 15000 });
      console.log('✓ Mermaid diagrams found on page');
    } catch (error) {
      console.error('✗ No Mermaid diagrams found within timeout');
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'error-no-mermaid-found.png'),
        fullPage: true
      });
    }

    // Additional wait for Mermaid rendering
    await page.waitForTimeout(3000);

    // Capture Tab 7 screenshot
    const diagramsSection = page.locator('#diagrams').first();
    if (await diagramsSection.count() > 0) {
      await diagramsSection.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-tab7-diagrams-section.png')
      });
      console.log('✓ Captured Tab 7 Diagrams section');
    }

    // Count Mermaid diagrams
    const mermaidDiagrams = await page.locator('.mermaid-diagram').count();
    console.log(`Found ${mermaidDiagrams} Mermaid diagram container(s)`);

    // Check for SVG elements (indicates successful rendering)
    const svgElements = await page.locator('.mermaid-diagram svg').count();
    console.log(`Found ${svgElements} SVG element(s) within Mermaid containers`);

    // Check for "Unknown Component" errors
    const unknownComponentErrors = await page.locator('text=Unknown Component: Mermaid').count();
    const unknownComponentText = await page.locator('text=/Unknown Component/i').count();

    console.log(`\n=== Validation Results ===`);
    console.log(`Mermaid containers: ${mermaidDiagrams}`);
    console.log(`SVG elements: ${svgElements}`);
    console.log(`"Unknown Component" errors: ${unknownComponentErrors}`);
    console.log(`Unknown component messages: ${unknownComponentText}`);

    // Capture individual diagram screenshots
    const diagrams = page.locator('.mermaid-diagram');
    const diagramCount = await diagrams.count();

    for (let i = 0; i < diagramCount; i++) {
      const diagram = diagrams.nth(i);
      await diagram.screenshot({
        path: path.join(SCREENSHOT_DIR, `03-diagram-${i + 1}.png`)
      });
      console.log(`✓ Captured diagram ${i + 1} screenshot`);
    }

    // Check for error messages
    const errorMessages = page.locator('.bg-red-50, [role="alert"]');
    const errorCount = await errorMessages.count();

    if (errorCount > 0) {
      console.log(`\n⚠ Found ${errorCount} error message(s):`);
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorMessages.nth(i).textContent();
        console.log(`  Error ${i + 1}: ${errorText?.substring(0, 200)}...`);

        await errorMessages.nth(i).screenshot({
          path: path.join(SCREENSHOT_DIR, `error-message-${i + 1}.png`)
        });
      }
    }

    // Capture browser console screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-final-state.png'),
      fullPage: true
    });

    // Log console output
    console.log(`\n=== Console Output ===`);
    console.log(`Total messages: ${consoleMessages.length}`);
    console.log(`Errors: ${consoleErrors.length}`);
    console.log(`Warnings: ${consoleWarnings.length}`);

    if (consoleErrors.length > 0) {
      console.log('\n=== Console Errors ===');
      consoleErrors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }

    if (consoleWarnings.length > 0) {
      console.log('\n=== Console Warnings ===');
      consoleWarnings.slice(0, 10).forEach((warning, i) => {
        console.log(`${i + 1}. ${warning}`);
      });
    }

    // Write detailed report
    const report = {
      timestamp: new Date().toISOString(),
      url: PAGE_URL,
      validation: {
        mermaidContainers: mermaidDiagrams,
        svgElements: svgElements,
        unknownComponentErrors: unknownComponentErrors,
        errorMessages: errorCount,
        expectedDiagrams: 3,
        pass: svgElements >= 3 && unknownComponentErrors === 0 && consoleErrors.length === 0
      },
      console: {
        totalMessages: consoleMessages.length,
        errors: consoleErrors,
        warnings: consoleWarnings.slice(0, 20),
        allMessages: consoleMessages.slice(-50)
      },
      screenshots: {
        directory: SCREENSHOT_DIR,
        files: fs.readdirSync(SCREENSHOT_DIR)
      }
    };

    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'validation-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log(`\n=== Validation Report ===`);
    console.log(JSON.stringify(report.validation, null, 2));
    console.log(`\nReport saved to: ${path.join(SCREENSHOT_DIR, 'validation-report.json')}`);

    // Assertions
    expect(svgElements, 'Should render at least 3 SVG diagrams').toBeGreaterThanOrEqual(3);
    expect(unknownComponentErrors, 'Should have no "Unknown Component" errors').toBe(0);
    expect(consoleErrors.filter(e => e.includes('Mermaid')).length, 'Should have no Mermaid-related errors').toBe(0);
  });
});
