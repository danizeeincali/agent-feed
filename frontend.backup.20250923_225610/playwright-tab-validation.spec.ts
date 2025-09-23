import { test, expect } from '@playwright/test';

test('Playwright Integration: Validate tab functionality without activities.filter errors', async ({ page }) => {
  console.log('🎯 TESTING: Tab functionality with activities.filter fix');
  
  // Capture console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Navigate to dual-instance page
  await page.goto('http://127.0.0.1:3001/dual-instance');
  
  // Wait for component to load
  await page.waitForTimeout(3000);
  
  // Test Development tab click
  console.log('🔧 Testing Development tab click');
  const devTab = page.locator('text=Development').first();
  await devTab.click();
  await page.waitForTimeout(1000);
  
  // Test Production tab click  
  console.log('🏭 Testing Production tab click');
  const prodTab = page.locator('text=Production').first();
  await prodTab.click();
  await page.waitForTimeout(1000);
  
  // Test Overview tab click
  console.log('📊 Testing Overview tab click');
  const overviewTab = page.locator('text=Overview').first();
  await overviewTab.click();
  await page.waitForTimeout(1000);
  
  // Check for specific error we're fixing
  const hasFilterError = consoleErrors.some(error => 
    error.includes('activities.filter is not a function')
  );
  
  console.log('🐛 Console Errors Found:');
  consoleErrors.forEach(error => console.log(`  - ${error}`));
  
  console.log(`✅ Activities.filter error present: ${hasFilterError}`);
  console.log(`📊 Total console errors: ${consoleErrors.length}`);
  
  // Take screenshot for verification
  await page.screenshot({ 
    path: '/workspaces/agent-feed/frontend/tab-functionality-test.png',
    fullPage: true 
  });
  
  // Verify no activities.filter errors
  expect(hasFilterError).toBe(false);
  
  // Verify tabs are still functional
  expect(await page.locator('text=Dual Instance Monitor').isVisible()).toBe(true);
  
  console.log('✅ SUCCESS: Tab functionality working without filter errors');
});