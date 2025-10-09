import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, 'mermaid-validation');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function testMermaid() {
  console.log('🧪 Testing Mermaid Diagram Rendering Fix\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const consoleErrors = [];
  const infiniteLoopDetected = [];

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
    console.log('1️⃣ Navigating to page...');
    const startNav = Date.now();
    await page.goto('http://localhost:5173/agents/page-builder-agent/pages/component-showcase-complete-v3', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    console.log(`   ✅ Page loaded in ${Date.now() - startNav}ms\n`);

    // Screenshot 1: Initial load
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-initial-load.png'), fullPage: true });

    console.log('2️⃣ Looking for diagram tab...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Find tabs
    const tabs = await page.evaluate(() => {
      const tabButtons = Array.from(document.querySelectorAll('[role="tab"], button[id*="tab"]'));
      return tabButtons.map((tab, idx) => ({
        index: idx,
        text: tab.textContent.trim(),
        id: tab.id,
        ariaControls: tab.getAttribute('aria-controls'),
      }));
    });

    console.log(`   Found ${tabs.length} tabs:`);
    tabs.forEach(tab => console.log(`     - ${tab.text}`));

    // Find the diagram/visualization tab
    const diagramTab = tabs.find(t =>
      t.text.toLowerCase().includes('diagram') ||
      t.text.toLowerCase().includes('visualization') ||
      t.text.toLowerCase().includes('data')
    );

    if (diagramTab) {
      console.log(`\n3️⃣ Clicking tab: "${diagramTab.text}"...`);
      const tabButtons = await page.$$('[role="tab"], button[id*="tab"]');
      await tabButtons[diagramTab.index].click();
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`   ✅ Tab clicked\n`);
    } else {
      console.log('   ⚠️  Could not find diagram tab, proceeding anyway...\n');
    }

    // Screenshot 2: After clicking tab
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-after-tab-click.png'), fullPage: true });

    console.log('4️⃣ Waiting for Mermaid diagrams to render...');
    const renderStart = Date.now();

    // Wait for diagrams with proper timeout
    let attempts = 0;
    let lastCount = 0;
    const maxAttempts = 15; // 15 seconds

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;

      const diagramInfo = await page.evaluate(() => {
        const mermaidContainers = document.querySelectorAll('.mermaid-diagram');
        const rendered = Array.from(mermaidContainers).filter(c => {
          const svg = c.querySelector('svg');
          return svg && svg.children.length > 0;
        });
        const loading = Array.from(mermaidContainers).filter(c =>
          c.querySelector('[role="status"]')
        );
        const errors = Array.from(mermaidContainers).filter(c =>
          c.querySelector('[role="alert"]')
        );

        return {
          total: mermaidContainers.length,
          rendered: rendered.length,
          loading: loading.length,
          errors: errors.length,
          diagrams: Array.from(mermaidContainers).map((c, i) => {
            const svg = c.querySelector('svg');
            const error = c.querySelector('[role="alert"]');
            const loading = c.querySelector('[role="status"]');
            return {
              index: i + 1,
              hasRendered: !!svg && svg.children.length > 0,
              isLoading: !!loading,
              hasError: !!error,
              errorText: error ? error.textContent.substring(0, 100) : null,
            };
          }),
        };
      });

      if (diagramInfo.rendered > lastCount) {
        console.log(`   📊 ${diagramInfo.rendered}/${diagramInfo.total} diagrams rendered...`);
        lastCount = diagramInfo.rendered;
      }

      // Break if all rendered or we have errors
      if (diagramInfo.loading === 0 && (diagramInfo.rendered > 0 || diagramInfo.errors > 0)) {
        console.log(`\n   ✅ Rendering complete after ${Date.now() - renderStart}ms`);
        console.log(`   📊 Results: ${diagramInfo.rendered} rendered, ${diagramInfo.errors} errors, ${diagramInfo.loading} loading\n`);

        // Print diagram details
        console.log('5️⃣ Diagram Status:');
        diagramInfo.diagrams.forEach(d => {
          const status = d.hasError ? '❌ ERROR' : d.isLoading ? '⏳ LOADING' : d.hasRendered ? '✅ RENDERED' : '⚠️  UNKNOWN';
          console.log(`   Diagram ${d.index}: ${status}`);
          if (d.hasError) {
            console.log(`     Error: ${d.errorText}`);
          }
        });

        break;
      }

      if (attempts >= maxAttempts) {
        console.log(`\n   ⚠️  Timeout after ${attempts} seconds`);
        console.log(`   📊 Final state: ${diagramInfo.rendered} rendered, ${diagramInfo.errors} errors, ${diagramInfo.loading} still loading\n`);
      }
    }

    // Screenshot 3: After rendering
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-diagrams-rendered.png'), fullPage: true });

    // Get final stats
    const finalStats = await page.evaluate(() => {
      const containers = document.querySelectorAll('.mermaid-diagram');
      return Array.from(containers).map((c, i) => {
        const svg = c.querySelector('svg');
        return {
          index: i + 1,
          rendered: !!svg && svg.children.length > 0,
          width: svg ? svg.getAttribute('width') : null,
          height: svg ? svg.getAttribute('height') : null,
        };
      });
    });

    // Take individual diagram screenshots
    console.log('\n6️⃣ Capturing individual diagrams:');
    for (let i = 0; i < finalStats.length; i++) {
      const containers = await page.$$('.mermaid-diagram');
      if (containers[i]) {
        try {
          const filename = path.join(SCREENSHOT_DIR, `diagram-${i + 1}.png`);
          await containers[i].screenshot({ path: filename });
          console.log(`   📸 Diagram ${i + 1}: ${filename}`);
        } catch (e) {
          console.log(`   ⚠️  Could not capture diagram ${i + 1}`);
        }
      }
    }

    // Final results
    console.log('\n' + '='.repeat(60));
    console.log('📋 VALIDATION RESULTS');
    console.log('='.repeat(60));

    const totalRendered = finalStats.filter(d => d.rendered).length;
    const renderTime = Date.now() - renderStart;

    console.log(`✅ Diagrams Rendered: ${totalRendered}/${finalStats.length}`);
    console.log(`✅ Total Rendering Time: ${(renderTime / 1000).toFixed(2)}s`);
    console.log(`✅ Avg Time per Diagram: ${(renderTime / Math.max(totalRendered, 1) / 1000).toFixed(2)}s`);
    console.log(`✅ Infinite Loop Errors: ${infiniteLoopDetected.length === 0 ? 'None ✓' : infiniteLoopDetected.length + ' ✗'}`);
    console.log(`✅ Console Errors: ${consoleErrors.length === 0 ? 'None ✓' : consoleErrors.length + ' ✗'}`);

    const success = totalRendered > 0 && infiniteLoopDetected.length === 0 && renderTime < 30000;
    console.log(`\n🎯 OVERALL: ${success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(60));

    if (infiniteLoopDetected.length > 0) {
      console.log('\n🚨 INFINITE LOOP ERRORS:');
      infiniteLoopDetected.forEach(err => console.log(`  - ${err}`));
    }

    if (consoleErrors.length > 0 && consoleErrors.length < 10) {
      console.log('\n❌ CONSOLE ERRORS:');
      consoleErrors.forEach(err => console.log(`  - ${err.substring(0, 100)}`));
    }

    console.log(`\n📁 Screenshots saved to: ${SCREENSHOT_DIR}\n`);

    await browser.close();
    return success ? 0 : 1;

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
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
