import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function diagnosePage() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Log console messages
  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type()}]:`, msg.text());
  });

  console.log('Navigating to page...');
  await page.goto('http://localhost:5173/agents/page-builder-agent/pages/component-showcase-complete-v3', {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  // Wait a bit for page to settle
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Get page structure
  const pageInfo = await page.evaluate(() => {
    const body = document.body.innerText.substring(0, 500);
    const tabs = Array.from(document.querySelectorAll('[role="tab"], button[id*="tab"]')).map(t => t.textContent.trim());
    const mermaidDivs = document.querySelectorAll('.mermaid-diagram, [class*="mermaid"]');
    const svgs = document.querySelectorAll('svg');
    const errors = document.querySelectorAll('[role="alert"]');
    const loading = document.querySelectorAll('[role="status"]');

    return {
      title: document.title,
      bodyPreview: body,
      tabsFound: tabs,
      mermaidDivsCount: mermaidDivs.length,
      svgCount: svgs.length,
      errorCount: errors.length,
      loadingCount: loading.length,
      mermaidDivClasses: Array.from(mermaidDivs).map(d => d.className),
    };
  });

  console.log('\n=== PAGE DIAGNOSTIC ===');
  console.log('Title:', pageInfo.title);
  console.log('Tabs found:', pageInfo.tabsFound);
  console.log('Mermaid divs:', pageInfo.mermaidDivsCount);
  console.log('SVG elements:', pageInfo.svgCount);
  console.log('Error elements:', pageInfo.errorCount);
  console.log('Loading elements:', pageInfo.loadingCount);
  console.log('Mermaid classes:', pageInfo.mermaidDivClasses);
  console.log('\nBody preview:', pageInfo.bodyPreview);

  // Take screenshot
  await page.screenshot({ path: 'diagnostic-screenshot.png', fullPage: true });
  console.log('\nScreenshot saved: diagnostic-screenshot.png');

  await browser.close();
}

diagnosePage().catch(console.error);
