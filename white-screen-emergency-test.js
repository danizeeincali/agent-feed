// Emergency white screen validation - Node.js script
const { chromium } = require('playwright');

async function emergencyWhiteScreenTest() {
  console.log('🚨 EMERGENCY WHITE SCREEN TEST STARTING...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    const message = `${msg.type()}: ${msg.text()}`;
    consoleMessages.push(message);
    console.log('BROWSER:', message);
  });
  
  // Collect errors
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('PAGE ERROR:', error.message);
  });
  
  try {
    console.log('📍 Navigating to http://localhost:5173/');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 10000 });
    
    // Take screenshot immediately
    await page.screenshot({ path: 'white-screen-evidence.png', fullPage: true });
    console.log('📸 Screenshot saved: white-screen-evidence.png');
    
    // Check root element
    const rootExists = await page.locator('#root').count();
    console.log('🔍 Root element count:', rootExists);
    
    if (rootExists > 0) {
      const rootContent = await page.locator('#root').innerHTML();
      console.log('📄 Root content length:', rootContent.length);
      
      if (rootContent.length < 50) {
        console.error('❌ WHITE SCREEN CONFIRMED: Root is empty');
        console.log('Root HTML:', rootContent);
      } else {
        console.log('✅ Content found in root');
        console.log('Content preview:', rootContent.substring(0, 200) + '...');
      }
    } else {
      console.error('❌ CRITICAL: Root element not found');
    }
    
    // Check for React
    const reactCheck = await page.evaluate(() => {
      return {
        devtools: typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined',
        react: typeof window.React !== 'undefined',
        reactDOM: typeof window.ReactDOM !== 'undefined'
      };
    });
    console.log('⚛️ React status:', reactCheck);
    
    // Test SimpleLauncher route
    console.log('📍 Testing SimpleLauncher route...');
    await page.goto('http://localhost:5173/simple-launcher', { waitUntil: 'networkidle', timeout: 10000 });
    await page.screenshot({ path: 'simple-launcher-evidence.png', fullPage: true });
    
    const launcherExists = await page.locator('.simple-launcher').count();
    console.log('🚀 SimpleLauncher component count:', launcherExists);
    
    // Summary
    console.log('\n📋 TEST SUMMARY:');
    console.log('- Console messages:', consoleMessages.length);
    console.log('- Page errors:', errors.length);
    console.log('- Screenshots taken: 2');
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS FOUND:');
      errors.forEach((error, i) => console.log(`${i+1}. ${error}`));
    }
    
  } catch (error) {
    console.error('🚨 TEST FAILED:', error.message);
  }
  
  await browser.close();
  console.log('✅ Emergency test complete');
}

// Only run if called directly
if (require.main === module) {
  emergencyWhiteScreenTest().catch(console.error);
}

module.exports = { emergencyWhiteScreenTest };