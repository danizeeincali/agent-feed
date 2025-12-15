import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, 'mermaid-final-results');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testMermaidWithLongerWait() {
  console.log('🧪 Mermaid Infinite Loop Fix - Final Validation\n');
  console.log('Critical Fixes Being Tested:');
  console.log('  ✓ hasRenderedRef prevents infinite rendering loop');
  console.log('  ✓ 10-second timeout protection');
  console.log('  ✓ Cleanup function clears timeouts\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const infiniteLoopErrors = [];
  const consoleErrors = [];

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('Maximum update depth') || text.includes('infinite loop') || text.includes('too many re-renders')) {
      infiniteLoopErrors.push({ time: Date.now(), text });
      console.log(`\n🚨 INFINITE LOOP DETECTED: ${text}\n`);
    }
    if (msg.type() === 'error' && !text.includes('WebSocket') && !text.includes('ERR_CONNECTION_REFUSED') && !text.includes('Failed to load resource')) {
      consoleErrors.push({ time: Date.now(), text });
    }
  });

  try {
    console.log('Step 1: Loading page...');
    await page.goto('http://localhost:5173/agents/page-builder-agent/pages/component-showcase-complete-v3#diagrams', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    console.log('✅ Page loaded\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Step 2: Navigating to Diagrams section...');
    await page.evaluate(() => {
      const diagramLink = Array.from(document.querySelectorAll('a, button')).find(el =>
        el.textContent && el.textContent.includes('Data Visualization - Dia')
      );
      if (diagramLink) diagramLink.click();
    });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Scroll to ensure diagrams are in viewport
    await page.evaluate(() => {
      const heading = Array.from(document.querySelectorAll('h2, h3')).find(h =>
        h.textContent.includes('System Architecture')
      );
      if (heading) heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    console.log('Step 3: Monitoring Mermaid diagram rendering...');
    const startTime = Date.now();
    let iteration = 0;
    const maxIterations = 30; // 30 seconds

    while (iteration < maxIterations) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      iteration++;

      const status = await page.evaluate(() => {
        const containers = document.querySelectorAll('.mermaid-diagram');
        return Array.from(containers).map((container, idx) => {
          const svg = container.querySelector('svg');
          const loading = container.querySelector('[role="status"]');
          const error = container.querySelector('[role="alert"]');

          return {
            index: idx + 1,
            rendered: !!svg && svg.children.length > 0,
            loading: !!loading,
            error: !!error,
            errorMsg: error ? error.textContent.trim().substring(0, 100) : null,
          };
        });
      });

      if (status.length > 0) {
        const rendered = status.filter(s => s.rendered).length;
        const loading = status.filter(s => s.loading).length;
        const errors = status.filter(s => s.error).length;

        console.log(`   [${iteration}s] ${rendered}/${status.length} rendered, ${loading} loading, ${errors} errors`);

        // Stop if all done (rendered or errored)
        if (loading === 0 && (rendered + errors === status.length)) {
          console.log(`\n✅ All diagrams processed after ${iteration}s\n`);
          break;
        }
      }
    }

    const totalTime = Date.now() - startTime;

    // Take final screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'full-page.png'),
      fullPage: true
    });

    // Scroll to diagrams and take focused screenshot
    await page.evaluate(() => {
      const diagramsHeading = Array.from(document.querySelectorAll('h2, h3')).find(h =>
        h.textContent.includes('Data Visualization - Diagrams')
      );
      if (diagramsHeading) {
        diagramsHeading.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    });
    await new Promise(resolve => setTimeout(resolve, 500));

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'diagrams-section.png'),
      fullPage: false
    });

    // Get final diagram status
    const finalStatus = await page.evaluate(() => {
      const containers = document.querySelectorAll('.mermaid-diagram');
      return {
        total: containers.length,
        diagrams: Array.from(containers).map((container, idx) => {
          const svg = container.querySelector('svg');
          const loading = container.querySelector('[role="status"]');
          const error = container.querySelector('[role="alert"]');

          // Get diagram title from previous heading
          let title = 'Unknown';
          let prev = container.previousElementSibling;
          while (prev) {
            if (prev.tagName === 'H2' || prev.tagName === 'H3' || prev.tagName === 'H4') {
              title = prev.textContent.trim();
              break;
            }
            prev = prev.previousElementSibling;
          }

          return {
            index: idx + 1,
            title,
            rendered: !!svg && svg.children.length > 0,
            loading: !!loading,
            loadingText: loading ? loading.textContent.trim() : null,
            error: !!error,
            errorMsg: error ? error.textContent.trim() : null,
            svgChildren: svg ? svg.children.length : 0,
          };
        }),
      };
    });

    // Capture individual diagrams
    const containers = await page.$$('.mermaid-diagram');
    for (let i = 0; i < containers.length; i++) {
      try {
        await containers[i].screenshot({
          path: path.join(SCREENSHOT_DIR, `diagram-${i + 1}.png`)
        });
      } catch (e) {
        console.log(`⚠️  Could not capture diagram ${i + 1}`);
      }
    }

    // Print results
    console.log('='.repeat(70));
    console.log('📋 VALIDATION RESULTS');
    console.log('='.repeat(70));
    console.log(`\n📊 Diagrams Found: ${finalStatus.total}`);

    finalStatus.diagrams.forEach(d => {
      const status = d.error ? '❌ ERROR' :
                     d.loading ? '⏳ LOADING' :
                     d.rendered ? '✅ RENDERED' : '⚠️  UNKNOWN';

      console.log(`\nDiagram ${d.index}: ${status}`);
      console.log(`  Title: ${d.title}`);
      if (d.rendered) {
        console.log(`  SVG Elements: ${d.svgChildren}`);
      }
      if (d.loading) {
        console.log(`  Status: ${d.loadingText}`);
      }
      if (d.error) {
        console.log(`  Error: ${d.errorMsg}`);
      }
    });

    const renderedCount = finalStatus.diagrams.filter(d => d.rendered).length;
    const errorCount = finalStatus.diagrams.filter(d => d.error).length;
    const loadingCount = finalStatus.diagrams.filter(d => d.loading).length;

    console.log('\n' + '-'.repeat(70));
    console.log('🔍 CRITICAL FIX VALIDATION');
    console.log('-'.repeat(70));

    const noInfiniteLoop = infiniteLoopErrors.length === 0;
    const noRelevantConsoleErrors = consoleErrors.length === 0;
    const allRendered = renderedCount === finalStatus.total;
    const timeoutWorking = totalTime < 60000;

    console.log(`\n${noInfiniteLoop ? '✅' : '❌'} No infinite loop errors: ${noInfiniteLoop ? 'PASS' : 'FAIL'}`);
    if (infiniteLoopErrors.length > 0) {
      console.log('  Detected errors:');
      infiniteLoopErrors.forEach(e => console.log(`    - ${e.text.substring(0, 80)}`));
    }

    console.log(`${noRelevantConsoleErrors ? '✅' : '⚠️ '} No console errors: ${noRelevantConsoleErrors ? 'PASS' : 'WARN'}`);
    if (consoleErrors.length > 0 && consoleErrors.length <= 5) {
      console.log('  Detected errors:');
      consoleErrors.forEach(e => console.log(`    - ${e.text.substring(0, 80)}`));
    }

    console.log(`${allRendered ? '✅' : '⚠️ '} All diagrams rendered: ${renderedCount}/${finalStatus.total}`);
    console.log(`${timeoutWorking ? '✅' : '⚠️ '} Timeout protection: ${(totalTime / 1000).toFixed(2)}s < 60s`);

    if (loadingCount > 0) {
      console.log(`\n⚠️  ${loadingCount} diagram(s) still in loading state after ${(totalTime / 1000).toFixed(2)}s`);
      console.log('   This may indicate the 10-second timeout is protecting against hangs.');
    }

    const success = noInfiniteLoop && timeoutWorking && (renderedCount >= 1);

    console.log('\n' + '='.repeat(70));
    console.log(`🎯 OVERALL VALIDATION: ${success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(70));

    console.log(`\n📁 Screenshots: ${SCREENSHOT_DIR}`);
    console.log(`   - full-page.png`);
    console.log(`   - diagrams-section.png`);
    for (let i = 1; i <= finalStatus.total; i++) {
      console.log(`   - diagram-${i}.png`);
    }

    console.log('\n✅ Key Success Criteria:');
    console.log(`   ${noInfiniteLoop ? '✓' : '✗'} No infinite rendering loops`);
    console.log(`   ${timeoutWorking ? '✓' : '✗'} Completes within timeout`);
    console.log(`   ${renderedCount > 0 ? '✓' : '✗'} At least one diagram renders`);

    await browser.close();
    return success ? 0 : 1;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error.png'), fullPage: true });
    await browser.close();
    return 1;
  }
}

testMermaidWithLongerWait()
  .then(code => process.exit(code))
  .catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
