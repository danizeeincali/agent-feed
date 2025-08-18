// Simple Playwright verification for white screen fix
const { chromium } = require('playwright');

async function verifyWhiteScreenFixed() {
  console.log('🎯 Verifying white screen issue has been resolved...\n');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Test original port 3001 (if running)
    console.log('📡 Testing original frontend port 3001...');
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle', timeout: 10000 });
    
    // Check for white screen indicators
    const hasTitle = await page.title();
    console.log(`✅ Page title: "${hasTitle}"`);
    
    const rootExists = await page.locator('#root').isVisible();
    console.log(`✅ Root element visible: ${rootExists}`);
    
    const hasContent = await page.evaluate(() => {
      const body = document.body;
      return body && body.innerText.trim().length > 0;
    });
    console.log(`✅ Page has content: ${hasContent}`);
    
    // Check if API loads
    const response = await page.waitForResponse(
      response => response.url().includes('/api/v1/agent-posts'),
      { timeout: 5000 }
    ).catch(() => null);
    
    if (response) {
      console.log(`✅ API response: ${response.status()}`);
    }
    
    // Take screenshot for verification
    await page.screenshot({ path: '/workspaces/agent-feed/tests/white-screen-verification.png' });
    console.log('✅ Screenshot saved for manual verification');
    
    console.log('\n🎉 WHITE SCREEN VERIFICATION COMPLETE');
    console.log('📊 Results:');
    console.log(`   Title: ${hasTitle ? '✅' : '❌'} ${hasTitle}`);
    console.log(`   Root Element: ${rootExists ? '✅' : '❌'}`);
    console.log(`   Content: ${hasContent ? '✅' : '❌'}`);
    console.log(`   API: ${response ? '✅' : '❌'}`);
    
    const allGood = hasTitle && rootExists && hasContent;
    console.log(`\n🏁 Overall Status: ${allGood ? '✅ NO WHITE SCREEN' : '❌ ISSUES DETECTED'}`);
    
    return allGood;
    
  } catch (error) {
    console.log(`❌ Error during verification: ${error.message}`);
    return false;
  } finally {
    await browser.close();
  }
}

// Run verification
verifyWhiteScreenFixed().then(success => {
  console.log(`\n🎯 Final Result: ${success ? 'WHITE SCREEN ISSUE RESOLVED' : 'FURTHER INVESTIGATION NEEDED'}`);
  process.exit(success ? 0 : 1);
});