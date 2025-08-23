/**
 * Test Claude Instance Launcher Status
 */

const { chromium } = require('playwright');

async function testClaudeLauncher() {
  console.log('🚀 Testing Claude Instance Launcher...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Navigate to frontend
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  // Wait for app to fully load
  await page.waitForTimeout(5000);
  
  const bodyText = await page.textContent('body');
  
  // Check for loading states
  const isLoading = bodyText.includes('loading') || bodyText.includes('Loading');
  const hasLauncher = bodyText.includes('launcher') || bodyText.includes('Launcher') || bodyText.includes('Claude');
  
  console.log('📄 Page loaded successfully');
  console.log(`🔍 Contains "loading": ${isLoading}`);
  console.log(`🔍 Contains launcher content: ${hasLauncher}`);
  
  // Look for specific UI elements
  const buttons = await page.$$('button');
  console.log(`🔘 Found ${buttons.length} buttons on page`);
  
  const loadingElements = await page.$$('[class*="loading"], [class*="Loading"], [data-testid*="loading"]');
  console.log(`⏳ Found ${loadingElements.length} loading elements`);
  
  // Check if any elements are stuck in loading state
  let stuckLoading = false;
  for (const element of loadingElements) {
    const text = await element.textContent();
    if (text && text.toLowerCase().includes('loading')) {
      console.log(`⚠️  Found stuck loading element: "${text}"`);
      stuckLoading = true;
    }
  }
  
  // Check console for errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  await page.waitForTimeout(2000);
  
  if (consoleErrors.length > 0) {
    console.log('❌ Console errors found:');
    consoleErrors.forEach(error => console.log(`   ${error}`));
  } else {
    console.log('✅ No console errors detected');
  }
  
  await browser.close();
  
  return {
    isLoading,
    hasLauncher,
    stuckLoading,
    buttonCount: buttons.length,
    loadingElementCount: loadingElements.length,
    hasErrors: consoleErrors.length > 0
  };
}

testClaudeLauncher()
  .then(result => {
    console.log('📊 Launcher Test Results:', result);
    
    if (result.stuckLoading) {
      console.log('❌ ISSUE: Found elements stuck in loading state');
    } else if (result.isLoading) {
      console.log('⚠️  Some loading indicators present (may be normal)');
    } else {
      console.log('✅ No stuck loading states detected');
    }
    
    if (result.hasErrors) {
      console.log('⚠️  Console errors detected - may need investigation');
    } else {
      console.log('✅ No console errors');
    }
  })
  .catch(console.error);