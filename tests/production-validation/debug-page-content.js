const puppeteer = require('puppeteer');

async function debugPageContent() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Navigating to agents page...');
    await page.goto('http://localhost:5173/agents', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    console.log('Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Getting page content...');
    const content = await page.content();

    console.log('Page title:', await page.title());
    console.log('Page URL:', page.url());

    // Check for various possible selectors
    const h1 = await page.$eval('h1', el => el ? el.textContent : 'not found').catch(() => 'not found');
    console.log('H1 text:', h1);

    // Check if loading state
    const hasLoading = content.includes('Loading agents...');
    console.log('Has loading text:', hasLoading);

    const hasError = content.includes('Error:');
    console.log('Has error text:', hasError);

    // Look for different possible agent card patterns
    const patterns = [
      '[style*="border: 1px solid #ddd"]',
      '[style*="border"]',
      'div[style*="padding"]',
      '[style*="grid"]'
    ];

    for (const pattern of patterns) {
      const elements = await page.$$(pattern);
      console.log(`Selector "${pattern}": ${elements.length} elements found`);
    }

    // Get all divs with inline styles
    const styledDivs = await page.evaluate(() => {
      const divs = document.querySelectorAll('div[style]');
      return Array.from(divs).map(div => ({
        style: div.getAttribute('style'),
        textContent: div.textContent.substring(0, 100)
      }));
    });

    console.log('Styled divs found:', styledDivs.length);
    styledDivs.slice(0, 5).forEach((div, i) => {
      console.log(`Div ${i + 1}:`, div.style, '|', div.textContent.trim());
    });

    // Save full HTML for inspection
    require('fs').writeFileSync('/workspaces/agent-feed/tests/production-validation/debug-page.html', content);
    console.log('Full HTML saved to debug-page.html');

  } finally {
    await browser.close();
  }
}

debugPageContent().catch(console.error);