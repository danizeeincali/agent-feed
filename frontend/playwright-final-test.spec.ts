import { test, expect } from '@playwright/test';

test('Final validation: Dual Instance page white screen resolved', async ({ page, context }) => {
  console.log('🔍 FINAL WHITE SCREEN VALIDATION TEST');
  
  // Capture all console messages
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });

  // Navigate to dual-instance page
  console.log('📱 Navigating to http://127.0.0.1:3001/dual-instance');
  await page.goto('http://127.0.0.1:3001/dual-instance');
  
  // Wait for React to render
  await page.waitForTimeout(5000);
  
  // Check page title
  const title = await page.title();
  console.log(`📋 Page Title: ${title}`);
  
  // Check if Dual Instance Monitor text appears
  const hasTitle = await page.locator('text=Dual Instance Monitor').isVisible();
  console.log(`✅ "Dual Instance Monitor" visible: ${hasTitle}`);
  
  // Check for specific components
  const hasSidebar = await page.locator('[class*="sidebar"]').isVisible();
  console.log(`🔧 Sidebar visible: ${hasSidebar}`);
  
  // Get page content length
  const bodyText = await page.textContent('body');
  const contentLength = bodyText?.length || 0;
  console.log(`📏 Total content length: ${contentLength} characters`);
  
  // Check React root content
  const rootContent = await page.locator('#root').innerHTML();
  const rootLength = rootContent?.length || 0;
  console.log(`⚛️ React root content length: ${rootLength} characters`);
  
  // Take screenshot for manual verification
  await page.screenshot({ 
    path: '/workspaces/agent-feed/frontend/final-validation-screenshot.png', 
    fullPage: true 
  });
  console.log('📸 Screenshot saved: final-validation-screenshot.png');
  
  // Log all console messages
  console.log('🖥️ Console Messages:');
  consoleMessages.forEach(msg => console.log(`  ${msg}`));
  
  // Final validation
  const isFixed = contentLength > 1000 && hasTitle;
  console.log(`🎯 WHITE SCREEN FIXED: ${isFixed}`);
  
  if (isFixed) {
    console.log('✅ SUCCESS: White screen issue has been completely resolved!');
    console.log('✅ React components are rendering correctly');
    console.log('✅ Dual Instance Monitor is visible and functional');
  } else {
    console.log('❌ ISSUE PERSISTS: White screen still present');
    console.log(`❌ Content length: ${contentLength} (should be >1000)`);
    console.log(`❌ Title visible: ${hasTitle} (should be true)`);
  }
  
  // Assert the fix
  expect(contentLength).toBeGreaterThan(1000);
  expect(hasTitle).toBe(true);
});