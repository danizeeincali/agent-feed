import { chromium } from 'playwright';

async function fullConsoleCheck() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Capture ALL console messages
  const consoleMessages = [];
  page.on('console', async msg => {
    const args = await Promise.all(msg.args().map(arg => arg.jsonValue().catch(() => arg.toString())));
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      args: args
    });
  });

  // Capture page errors
  const pageErrors = [];
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack
    });
  });

  console.log('Loading page...\n');
  await page.goto('http://localhost:5173/agents/page-builder-agent/pages/mermaid-all-types-test', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  console.log('Waiting 35 seconds for diagrams to render...\n');
  await page.waitForTimeout(35000);

  // Print all Mermaid-related console messages
  console.log('=== ALL CONSOLE MESSAGES ===\n');
  consoleMessages.forEach((msg, i) => {
    const text = msg.text.toLowerCase();
    if (text.includes('mermaid') || text.includes('render') || text.includes('diagram') || text.includes('error') && !text.includes('websocket')) {
      console.log(`[${i}] [${msg.type}] ${msg.text}`);
      if (msg.args.length > 1) {
        console.log('    Args:', JSON.stringify(msg.args, null, 2));
      }
    }
  });

  console.log('\n=== PAGE ERRORS ===\n');
  pageErrors.forEach(err => {
    console.log(err.message);
    if (err.stack) {
      console.log(err.stack.substring(0, 500));
    }
  });

  await page.screenshot({ path: '/tmp/debug-console.png', fullPage: true });
  await browser.close();

  console.log('\n✓ Done');
}

fullConsoleCheck().catch(console.error);
