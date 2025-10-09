/**
 * Mermaid Infinite Loop Fix Validation Test
 *
 * This script validates that:
 * 1. Mermaid diagrams render successfully
 * 2. No infinite rendering loops occur
 * 3. Rendering completes within timeout (10 seconds)
 * 4. No console errors related to maximum update depth
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = 'http://localhost:5173';
const PAGE_PATH = '/agents/page-builder-agent/pages/component-showcase-complete-v3';
const SCREENSHOT_DIR = path.join(__dirname, 'validation-screenshots');
const MAX_WAIT_TIME = 30000; // 30 seconds max
const EXPECTED_DIAGRAMS = 3;

// Create screenshots directory
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Results object
const validationResults = {
  timestamp: new Date().toISOString(),
  success: false,
  tests: {
    pageLoaded: false,
    diagramsRendered: false,
    noInfiniteLoop: false,
    renderingTime: null,
    noConsoleErrors: false,
  },
  diagrams: [],
  errors: [],
  consoleMessages: [],
  screenshots: [],
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runValidation() {
  console.log('🚀 Starting Mermaid Infinite Loop Fix Validation...\n');

  let browser;
  let page;

  try {
    // Launch browser
    console.log('📱 Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Collect console messages
    page.on('console', msg => {
      const text = msg.text();
      validationResults.consoleMessages.push({
        type: msg.type(),
        text: text,
        timestamp: Date.now(),
      });

      // Check for error patterns
      if (text.includes('Maximum update depth exceeded') ||
          text.includes('infinite loop') ||
          text.includes('too many re-renders')) {
        validationResults.errors.push({
          type: 'INFINITE_LOOP_ERROR',
          message: text,
        });
      }
    });

    // Collect page errors
    page.on('pageerror', error => {
      validationResults.errors.push({
        type: 'PAGE_ERROR',
        message: error.message,
      });
    });

    // Navigate to the page
    console.log(`🌐 Navigating to ${BASE_URL}${PAGE_PATH}...`);
    const startTime = Date.now();

    const response = await page.goto(`${BASE_URL}${PAGE_PATH}`, {
      waitUntil: 'networkidle2',
      timeout: MAX_WAIT_TIME,
    });

    if (!response || !response.ok()) {
      throw new Error(`Failed to load page: ${response?.status()}`);
    }

    validationResults.tests.pageLoaded = true;
    console.log('✅ Page loaded successfully\n');

    // Take initial screenshot
    const initialScreenshot = path.join(SCREENSHOT_DIR, '01-page-loaded.png');
    await page.screenshot({ path: initialScreenshot, fullPage: true });
    validationResults.screenshots.push(initialScreenshot);
    console.log(`📸 Screenshot saved: ${initialScreenshot}`);

    // Wait for Tab 7 to be available and click it
    console.log('\n🔍 Looking for Tab 7: Data Visualization...');
    await sleep(2000); // Give time for page to settle

    // Try to find and click Tab 7
    try {
      const tab7Button = await page.waitForSelector('button:has-text("Tab 7"), button:has-text("Data Visualization"), [role="tab"]:has-text("Data Visualization")', {
        timeout: 10000,
      });

      if (tab7Button) {
        await tab7Button.click();
        console.log('✅ Clicked Tab 7: Data Visualization');
        await sleep(2000); // Wait for tab content to load
      }
    } catch (e) {
      console.log('⚠️  Could not find Tab 7 button, checking for diagrams anyway...');
    }

    // Take screenshot after navigation
    const tab7Screenshot = path.join(SCREENSHOT_DIR, '02-tab7-view.png');
    await page.screenshot({ path: tab7Screenshot, fullPage: true });
    validationResults.screenshots.push(tab7Screenshot);
    console.log(`📸 Screenshot saved: ${tab7Screenshot}`);

    // Wait for Mermaid diagrams to render
    console.log('\n⏳ Waiting for Mermaid diagrams to render...');
    const diagramStartTime = Date.now();

    // Wait up to 20 seconds for diagrams to appear
    let diagramsFound = 0;
    let attempts = 0;
    const maxAttempts = 20; // 20 seconds

    while (diagramsFound < EXPECTED_DIAGRAMS && attempts < maxAttempts) {
      await sleep(1000);
      attempts++;

      // Check for rendered SVG diagrams
      const svgCount = await page.evaluate(() => {
        const containers = document.querySelectorAll('.mermaid-diagram');
        return Array.from(containers).filter(container => {
          const svg = container.querySelector('svg');
          return svg && svg.children.length > 0;
        }).length;
      });

      if (svgCount > diagramsFound) {
        diagramsFound = svgCount;
        console.log(`  Found ${svgCount}/${EXPECTED_DIAGRAMS} rendered diagrams...`);
      }

      // Check if any diagrams are still loading
      const stillLoading = await page.evaluate(() => {
        const loadingElements = document.querySelectorAll('.mermaid-diagram [role="status"]');
        return loadingElements.length;
      });

      if (stillLoading === 0 && diagramsFound >= EXPECTED_DIAGRAMS) {
        break;
      }
    }

    const renderingTime = Date.now() - diagramStartTime;
    validationResults.tests.renderingTime = renderingTime;

    console.log(`\n⏱️  Total rendering time: ${(renderingTime / 1000).toFixed(2)}s`);

    // Get diagram information
    const diagrams = await page.evaluate(() => {
      const containers = document.querySelectorAll('.mermaid-diagram');
      return Array.from(containers).map((container, index) => {
        const svg = container.querySelector('svg');
        const error = container.querySelector('[role="alert"]');
        const loading = container.querySelector('[role="status"]');

        return {
          index: index + 1,
          hasError: !!error,
          errorMessage: error ? error.textContent.trim() : null,
          isLoading: !!loading,
          hasRendered: !!svg && svg.children.length > 0,
          svgWidth: svg ? svg.getAttribute('width') : null,
          svgHeight: svg ? svg.getAttribute('height') : null,
        };
      });
    });

    validationResults.diagrams = diagrams;

    console.log('\n📊 Diagram Status:');
    diagrams.forEach(diagram => {
      const status = diagram.hasError ? '❌ ERROR' :
                     diagram.isLoading ? '⏳ LOADING' :
                     diagram.hasRendered ? '✅ RENDERED' : '⚠️  UNKNOWN';
      console.log(`  Diagram ${diagram.index}: ${status}`);
      if (diagram.hasError) {
        console.log(`    Error: ${diagram.errorMessage}`);
      }
      if (diagram.hasRendered) {
        console.log(`    Size: ${diagram.svgWidth} × ${diagram.svgHeight}`);
      }
    });

    // Check if all diagrams rendered successfully
    const allRendered = diagrams.every(d => d.hasRendered);
    const noneLoading = diagrams.every(d => !d.isLoading);
    const noErrors = diagrams.every(d => !d.hasError);

    validationResults.tests.diagramsRendered = allRendered && noneLoading && noErrors;

    // Take screenshot of diagrams
    const diagramsScreenshot = path.join(SCREENSHOT_DIR, '03-diagrams-rendered.png');
    await page.screenshot({ path: diagramsScreenshot, fullPage: true });
    validationResults.screenshots.push(diagramsScreenshot);
    console.log(`\n📸 Screenshot saved: ${diagramsScreenshot}`);

    // Take individual diagram screenshots
    for (let i = 0; i < diagrams.length; i++) {
      try {
        const containers = await page.$$('.mermaid-diagram');
        if (containers[i]) {
          const diagramScreenshot = path.join(SCREENSHOT_DIR, `04-diagram-${i + 1}.png`);
          await containers[i].screenshot({ path: diagramScreenshot });
          validationResults.screenshots.push(diagramScreenshot);
          console.log(`📸 Diagram ${i + 1} screenshot: ${diagramScreenshot}`);
        }
      } catch (e) {
        console.log(`⚠️  Could not capture diagram ${i + 1}: ${e.message}`);
      }
    }

    // Check for infinite loop errors
    const infiniteLoopErrors = validationResults.errors.filter(e =>
      e.type === 'INFINITE_LOOP_ERROR'
    );
    validationResults.tests.noInfiniteLoop = infiniteLoopErrors.length === 0;

    // Check for console errors
    const consoleErrors = validationResults.consoleMessages.filter(m =>
      m.type === 'error' && !m.text.includes('WebSocket')
    );
    validationResults.tests.noConsoleErrors = consoleErrors.length === 0;

    // Overall success
    validationResults.success =
      validationResults.tests.pageLoaded &&
      validationResults.tests.diagramsRendered &&
      validationResults.tests.noInfiniteLoop &&
      validationResults.tests.renderingTime < 10000 && // Under 10 seconds per diagram
      validationResults.tests.noConsoleErrors;

    console.log('\n' + '='.repeat(60));
    console.log('📋 VALIDATION RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Page Loaded: ${validationResults.tests.pageLoaded}`);
    console.log(`✅ Diagrams Rendered: ${validationResults.tests.diagramsRendered}`);
    console.log(`✅ No Infinite Loop: ${validationResults.tests.noInfiniteLoop}`);
    console.log(`✅ Rendering Time: ${(validationResults.tests.renderingTime / 1000).toFixed(2)}s (< 10s per diagram)`);
    console.log(`✅ No Console Errors: ${validationResults.tests.noConsoleErrors}`);
    console.log(`\n🎯 OVERALL SUCCESS: ${validationResults.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(60) + '\n');

    // Save results to JSON
    const resultsPath = path.join(SCREENSHOT_DIR, 'validation-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(validationResults, null, 2));
    console.log(`💾 Results saved to: ${resultsPath}\n`);

  } catch (error) {
    console.error('\n❌ Validation failed with error:', error);
    validationResults.errors.push({
      type: 'VALIDATION_ERROR',
      message: error.message,
      stack: error.stack,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return validationResults;
}

// Run the validation
runValidation()
  .then(results => {
    process.exit(results.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
