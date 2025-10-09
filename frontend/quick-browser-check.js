/**
 * Quick browser verification script
 * Tests actual rendering of charts and Mermaid diagrams
 */

import { chromium } from 'playwright';

async function verifyPage(url, pageName) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  console.log(`\n📊 Checking ${pageName}...`);
  console.log(`URL: ${url}`);

  try {
    // Navigate to page
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Check for errors in console
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for rendering
    await page.waitForTimeout(3000);

    // Check for SVG elements (charts and Mermaid both use SVG)
    const svgCount = await page.locator('svg').count();
    console.log(`✅ Found ${svgCount} SVG elements`);

    // Check for canvas elements (Chart.js uses canvas)
    const canvasCount = await page.locator('canvas').count();
    console.log(`✅ Found ${canvasCount} canvas elements`);

    // Check for Mermaid diagrams
    const mermaidCount = await page.locator('.mermaid-diagram').count();
    if (mermaidCount > 0) {
      console.log(`✅ Found ${mermaidCount} Mermaid diagrams`);
    }

    // Take screenshot
    const screenshotPath = `/tmp/e2e-screenshots/${pageName.replace(/\s+/g, '-').toLowerCase()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    // Check for errors
    if (errors.length > 0) {
      console.log(`⚠️  Console errors found:`, errors);
    } else {
      console.log(`✅ No console errors`);
    }

    return {
      success: svgCount > 0 || canvasCount > 0,
      svgCount,
      canvasCount,
      mermaidCount,
      errors,
      screenshot: screenshotPath
    };

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('🚀 Starting Quick Browser Verification\n');

  const pages = [
    {
      url: 'http://localhost:5173/agents/page-builder-agent/pages/charts-demo',
      name: 'Charts Demo'
    },
    {
      url: 'http://localhost:5173/agents/page-builder-agent/pages/mermaid-demo',
      name: 'Mermaid Demo'
    },
    {
      url: 'http://localhost:5173/agents/page-builder-agent/pages/charts-and-diagrams-showcase',
      name: 'Charts and Diagrams Showcase'
    }
  ];

  const results = [];

  for (const page of pages) {
    const result = await verifyPage(page.url, page.name);
    results.push({ ...page, ...result });
  }

  // Summary
  console.log('\n\n📊 VERIFICATION SUMMARY\n');
  console.log('═'.repeat(70));

  let allPassed = true;
  for (const result of results) {
    const status = result.success ? '✅ PASSED' : '❌ FAILED';
    console.log(`\n${status}: ${result.name}`);
    if (result.success) {
      console.log(`  - SVG elements: ${result.svgCount}`);
      console.log(`  - Canvas elements: ${result.canvasCount}`);
      if (result.mermaidCount > 0) {
        console.log(`  - Mermaid diagrams: ${result.mermaidCount}`);
      }
      console.log(`  - Screenshot: ${result.screenshot}`);
      if (result.errors && result.errors.length > 0) {
        console.log(`  - Console errors: ${result.errors.length}`);
        allPassed = false;
      }
    } else {
      console.log(`  - Error: ${result.error}`);
      allPassed = false;
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log(allPassed ? '\n✅ ALL PAGES VERIFIED SUCCESSFULLY!' : '\n⚠️  SOME ISSUES DETECTED');

  process.exit(allPassed ? 0 : 1);
}

main();
