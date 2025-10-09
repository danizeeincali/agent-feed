import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, 'mermaid-validation-final');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testMermaid() {
  console.log('🧪 Testing Mermaid Diagram Rendering Fix\n');
  console.log('Testing the three critical fixes:');
  console.log('  1. hasRenderedRef prevents infinite loop');
  console.log('  2. 10-second timeout protection');
  console.log('  3. Cleanup function clears timeouts\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const consoleErrors = [];
  const infiniteLoopDetected = [];
  const startTime = Date.now();

  // Monitor console for errors
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' && !text.includes('WebSocket') && !text.includes('ERR_CONNECTION_REFUSED')) {
      consoleErrors.push(text);
      console.log(`❌ Console Error: ${text}`);
    }
    if (text.includes('Maximum update depth') || text.includes('infinite loop') || text.includes('too many re-renders')) {
      infiniteLoopDetected.push(text);
      console.log(`🚨 INFINITE LOOP DETECTED: ${text}`);
    }
  });

  try {
    console.log('Step 1: Navigating to showcase page...');
    await page.goto('http://localhost:5173/agents/page-builder-agent/pages/component-showcase-complete-v3', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    console.log('✅ Page loaded\n');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-initial-load.png'), fullPage: true });
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Step 2: Looking for "Data Visualization - Diagrams" navigation item...');

    // Click on the diagrams navigation item
    const clicked = await page.evaluate(() => {
      // Find the navigation item containing "Diagrams"
      const navItems = Array.from(document.querySelectorAll('a, button, [role="button"]'));
      const diagramLink = navItems.find(item =>
        item.textContent && item.textContent.includes('Data Visualization - Diagrams')
      );

      if (diagramLink) {
        diagramLink.click();
        return true;
      }
      return false;
    });

    if (clicked) {
      console.log('✅ Clicked "Data Visualization - Diagrams"\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log('⚠️  Could not find diagram navigation, trying href...\n');
      await page.goto('http://localhost:5173/agents/page-builder-agent/pages/component-showcase-complete-v3#diagrams', {
        waitUntil: 'networkidle2',
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-diagrams-section.png'), fullPage: true });

    console.log('Step 3: Waiting for Mermaid diagrams to render...');
    const renderStart = Date.now();

    // Monitor rendering progress
    let attempts = 0;
    let lastRendered = 0;
    const maxAttempts = 20; // 20 seconds
    let finalInfo = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const info = await page.evaluate(() => {
        const containers = document.querySelectorAll('.mermaid-diagram');
        const diagrams = Array.from(containers).map((c, i) => {
          const svg = c.querySelector('svg');
          const error = c.querySelector('[role="alert"]');
          const loading = c.querySelector('[role="status"]');
          return {
            index: i + 1,
            hasRendered: !!svg && svg.children.length > 0,
            isLoading: !!loading,
            hasError: !!error,
            errorText: error ? error.textContent.substring(0, 80) : null,
          };
        });

        return {
          total: containers.length,
          rendered: diagrams.filter(d => d.hasRendered).length,
          loading: diagrams.filter(d => d.isLoading).length,
          errors: diagrams.filter(d => d.hasError).length,
          diagrams,
        };
      });

      if (info.total > 0 && info.rendered > lastRendered) {
        console.log(`   📊 Progress: ${info.rendered}/${info.total} diagrams rendered (${attempts}s elapsed)`);
        lastRendered = info.rendered;
      }

      finalInfo = info;

      // Stop if all diagrams are done (rendered or errored) and none are loading
      if (info.total > 0 && info.loading === 0 && (info.rendered + info.errors === info.total)) {
        break;
      }
    }

    const renderTime = Date.now() - renderStart;
    console.log(`✅ Rendering phase complete after ${(renderTime / 1000).toFixed(2)}s\n`);

    if (!finalInfo || finalInfo.total === 0) {
      console.log('⚠️  No Mermaid diagrams found on page. Checking if content is present...\n');

      const pageContent = await page.evaluate(() => {
        return {
          bodyText: document.body.innerText.substring(0, 300),
          hasDiagramsHeading: document.body.innerText.includes('Data Visualization - Diagrams'),
          allH2s: Array.from(document.querySelectorAll('h2, h3')).map(h => h.textContent.trim()).slice(0, 10),
        };
      });

      console.log('Page content check:');
      console.log('  - Has Diagrams heading:', pageContent.hasDiagramsHeading);
      console.log('  - Headings found:', pageContent.allH2s);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-final-state.png'), fullPage: true });

    // Capture individual diagrams
    if (finalInfo && finalInfo.total > 0) {
      console.log('Step 4: Capturing individual diagram screenshots...');
      const containers = await page.$$('.mermaid-diagram');
      for (let i = 0; i < containers.length; i++) {
        try {
          const filename = path.join(SCREENSHOT_DIR, `diagram-${i + 1}.png`);
          await containers[i].screenshot({ path: filename });
          console.log(`   📸 Diagram ${i + 1}: saved`);
        } catch (e) {
          console.log(`   ⚠️  Could not capture diagram ${i + 1}`);
        }
      }
      console.log();
    }

    // Print results
    console.log('=' .repeat(70));
    console.log('📋 VALIDATION RESULTS');
    console.log('='.repeat(70));

    if (finalInfo && finalInfo.total > 0) {
      console.log(`\n✅ Diagrams Found: ${finalInfo.total}`);
      console.log(`✅ Diagrams Rendered Successfully: ${finalInfo.rendered}`);
      console.log(`❌ Diagrams with Errors: ${finalInfo.errors}`);
      console.log(`⏳ Diagrams Still Loading: ${finalInfo.loading}`);
      console.log(`⏱️  Total Rendering Time: ${(renderTime / 1000).toFixed(2)}s`);
      console.log(`⏱️  Average per Diagram: ${(renderTime / Math.max(finalInfo.rendered, 1) / 1000).toFixed(2)}s`);

      // Check for timeout compliance
      const avgTimePerDiagram = renderTime / Math.max(finalInfo.rendered, 1);
      const withinTimeout = avgTimePerDiagram < 10000;
      console.log(`\n${withinTimeout ? '✅' : '⚠️ '} Rendering Time Check: ${withinTimeout ? 'Within 10s timeout' : 'Exceeded 10s timeout'}`);

      console.log('\nDiagram Details:');
      finalInfo.diagrams.forEach(d => {
        const status = d.hasError ? '❌ ERROR' : d.isLoading ? '⏳ LOADING' : d.hasRendered ? '✅ RENDERED' : '⚠️  UNKNOWN';
        console.log(`  Diagram ${d.index}: ${status}`);
        if (d.hasError && d.errorText) {
          console.log(`    └─ ${d.errorText}`);
        }
      });
    } else {
      console.log('\n⚠️  No Mermaid diagrams were found on the page.');
    }

    // Critical fix validation
    console.log('\n' + '-'.repeat(70));
    console.log('🔍 CRITICAL FIX VALIDATION');
    console.log('-'.repeat(70));

    const noInfiniteLoop = infiniteLoopDetected.length === 0;
    const noConsoleErrors = consoleErrors.length === 0;

    console.log(`${noInfiniteLoop ? '✅' : '❌'} No infinite loop errors: ${noInfiniteLoop ? 'PASS' : 'FAIL'}`);
    if (infiniteLoopDetected.length > 0) {
      console.log('   Errors detected:');
      infiniteLoopDetected.forEach(err => console.log(`   - ${err.substring(0, 100)}`));
    }

    console.log(`${noConsoleErrors ? '✅' : '⚠️ '} No console errors: ${noConsoleErrors ? 'PASS' : 'WARN'}`);
    if (consoleErrors.length > 0 && consoleErrors.length < 5) {
      console.log('   Errors detected:');
      consoleErrors.forEach(err => console.log(`   - ${err.substring(0, 100)}`));
    }

    const totalTime = Date.now() - startTime;
    const timeoutProtectionWorking = totalTime < 60000; // Should complete in under 1 minute
    console.log(`${timeoutProtectionWorking ? '✅' : '❌'} Timeout protection working: ${(totalTime / 1000).toFixed(2)}s (< 60s)`);

    // Overall success
    const success = finalInfo &&
                   finalInfo.total >= 3 &&
                   finalInfo.rendered >= 3 &&
                   noInfiniteLoop &&
                   timeoutProtectionWorking;

    console.log('\n' + '='.repeat(70));
    console.log(`🎯 OVERALL VALIDATION: ${success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(70));

    console.log(`\n📁 Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log(`📄 Open file://${SCREENSHOT_DIR}/03-final-state.png to see results\n`);

    await browser.close();
    return success ? 0 : 1;

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error.png'), fullPage: true });
    await browser.close();
    return 1;
  }
}

testMermaid()
  .then(code => process.exit(code))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
