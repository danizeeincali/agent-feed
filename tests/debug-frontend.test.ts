import { test, expect } from '@playwright/test';

test('Debug frontend loading', async ({ page }) => {
  console.log('=== Starting frontend debug ===');
  
  // Capture console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('❌ Console error:', msg.text());
    } else if (msg.type() === 'warning') {
      console.log('⚠️ Console warning:', msg.text());
    } else {
      console.log('📝 Console log:', msg.text());
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log('🚨 Page error:', error.message);
  });

  console.log('🔄 Navigating to http://localhost:3001');
  await page.goto('http://localhost:3001');
  
  console.log('⏳ Waiting 5 seconds for page to load...');
  await page.waitForTimeout(5000);
  
  // Take screenshot
  await page.screenshot({ 
    path: 'tests/screenshots/frontend-debug.png', 
    fullPage: true 
  });
  
  // Check what's in the page
  const bodyContent = await page.evaluate(() => {
    return {
      innerHTML: document.body.innerHTML.substring(0, 500),
      textContent: document.body.textContent?.trim() || '',
      hasRoot: !!document.getElementById('root'),
      rootContent: document.getElementById('root')?.innerHTML.substring(0, 200) || 'EMPTY'
    };
  });
  
  console.log('📄 Body content:', bodyContent);
  
  // Check if React app loaded
  const reactLoaded = await page.evaluate(() => {
    return !!(window as any).React || !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  });
  
  console.log('⚛️ React loaded:', reactLoaded);
  
  // Check specific elements
  const elements = {
    root: await page.locator('#root').count(),
    articles: await page.locator('article').count(),
    divs: await page.locator('div').count(),
    anyText: await page.locator('text=Agent Feed').count()
  };
  
  console.log('🔍 Element counts:', elements);
  console.log('❌ Console errors found:', consoleErrors.length);
  
  if (consoleErrors.length > 0) {
    console.log('💥 All console errors:');
    consoleErrors.forEach((error, i) => console.log(`${i + 1}. ${error}`));
  }
  
  // This test is just for debugging, always pass
  expect(true).toBe(true);
});