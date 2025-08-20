/**
 * Visual Validation Agent - Browser Testing Script
 * Tests actual browser rendering to detect white screen issues
 */

import puppeteer from 'puppeteer';

async function testBrowserRendering() {
  console.log('🔍 Starting browser validation test...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    // Listen for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      errors.push(`Page Error: ${error.message}`);
    });

    console.log('📡 Navigating to http://localhost:3001...');
    
    // Navigate to the app
    const response = await page.goto('http://localhost:3001', {
      waitUntil: 'networkidle0',
      timeout: 10000
    });

    console.log(`📋 Response status: ${response.status()}`);

    // Wait for React to mount
    try {
      await page.waitForSelector('#root', { timeout: 5000 });
      console.log('✅ Root element found');
    } catch (e) {
      console.log('❌ Root element not found');
    }

    // Check if content is actually rendered
    const rootContent = await page.$eval('#root', el => el.innerHTML);
    console.log(`📦 Root content length: ${rootContent.length} characters`);
    
    if (rootContent.length < 100) {
      console.log('⚠️  Suspiciously short content - possible white screen');
      console.log('Root HTML:', rootContent.substring(0, 200));
    }

    // Look for specific React elements
    const hasAgentLink = await page.$('text=AgentLink') !== null;
    const hasHeader = await page.$('[data-testid="header"]') !== null;
    const hasFeed = await page.$('[data-testid="agent-feed"]') !== null;

    console.log('🔍 Element presence check:');
    console.log(`  - AgentLink text: ${hasAgentLink ? '✅' : '❌'}`);
    console.log(`  - Header element: ${hasHeader ? '✅' : '❌'}`);
    console.log(`  - Feed element: ${hasFeed ? '✅' : '❌'}`);

    // Take a screenshot
    await page.screenshot({ path: '/tmp/app-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved to /tmp/app-screenshot.png');

    // Log any JavaScript errors
    if (errors.length > 0) {
      console.log('🚨 JavaScript errors detected:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ No JavaScript errors detected');
    }

    // Final verdict
    const isWorking = hasAgentLink && hasHeader && hasFeed && rootContent.length > 100;
    console.log(`\n${isWorking ? '🎉 SUCCESS' : '💥 FAILURE'}: React app ${isWorking ? 'is rendering properly' : 'has white screen or rendering issues'}`);

    return { isWorking, errors, rootContent: rootContent.substring(0, 500) };

  } finally {
    await browser.close();
  }
}

// Run the test
testBrowserRendering()
  .then(result => {
    process.exit(result.isWorking ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Browser test failed:', error);
    process.exit(1);
  });