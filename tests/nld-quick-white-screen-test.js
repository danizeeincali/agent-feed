/**
 * NLD Quick White Screen Test - Simple validation
 */

const puppeteer = require('puppeteer');

async function testWhiteScreen() {
  console.log('🔍 NLD: Quick white screen regression test...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('🚨 Browser Error:', msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.error('🚨 Page Error:', error.message);
    });
    
    // Navigate to the app
    console.log('📍 Navigating to http://localhost:3003...');
    await page.goto('http://localhost:3003', { waitUntil: 'networkidle0', timeout: 10000 });
    
    // Wait for potential rendering
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ 
      path: '/workspaces/agent-feed/tests/nld-white-screen-current.png',
      fullPage: true 
    });
    
    // Check for content
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasContent = bodyText && bodyText.trim().length > 10;
    
    const title = await page.title();
    
    console.log('🔍 Analysis Results:', {
      title,
      hasContent,
      bodyTextLength: bodyText?.length || 0,
      bodyPreview: bodyText?.substring(0, 100) || 'NO CONTENT'
    });
    
    // NLD Pattern Detection
    if (!hasContent) {
      console.error('🚨 NLD PATTERN CONFIRMED: White screen detected');
      console.error('🎯 FAILURE MODE: React application not rendering');
    } else {
      console.log('✅ NLD: Application rendering successfully');
    }
    
  } catch (error) {
    console.error('🚨 NLD Test Error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run test
testWhiteScreen().catch(console.error);