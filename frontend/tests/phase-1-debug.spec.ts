import { test, expect, Page } from '@playwright/test';

/**
 * Debug test to understand the actual page structure
 */

test('Debug - Check Page Structure', async ({ page }) => {
  console.log('🔍 Starting debug test...');
  
  // Navigate to the app
  await page.goto('http://localhost:5173');
  console.log('✅ Navigated to app');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  console.log('✅ Page loaded');
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'tests/debug-screenshot.png', fullPage: true });
  console.log('✅ Screenshot taken');
  
  // Get page title
  const title = await page.title();
  console.log('📄 Page title:', title);
  
  // Get page content
  const content = await page.content();
  console.log('📝 Page has content length:', content.length);
  
  // Check if there are any visible elements
  const visibleElements = await page.$$eval('*', elements => 
    elements.filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }).length
  );
  console.log('👀 Visible elements count:', visibleElements);
  
  // Look for specific text content
  const hasStartPost = await page.locator('text=Start a post').count();
  console.log('🎯 "Start a post" elements:', hasStartPost);
  
  const hasAgentFeed = await page.locator('text=Agent Feed').count();
  console.log('🤖 "Agent Feed" elements:', hasAgentFeed);
  
  const hasCreatePost = await page.locator('text=Create').count();
  console.log('✏️ "Create" elements:', hasCreatePost);
  
  // Look for buttons
  const buttonCount = await page.locator('button').count();
  console.log('🔘 Button count:', buttonCount);
  
  // Look for inputs
  const inputCount = await page.locator('input').count();
  console.log('📝 Input count:', inputCount);
  
  // Look for specific placeholders
  const titleInput = await page.locator('input[placeholder*="title"]').count();
  console.log('📑 Title input count:', titleInput);
  
  // Check if there are any error messages
  const errorMessages = await page.locator('text=Error').count();
  console.log('❌ Error message count:', errorMessages);
  
  // Check for loading states
  const loadingStates = await page.locator('[data-testid="loading-state"]').count();
  console.log('⏳ Loading states:', loadingStates);
  
  // Get all button texts
  const buttons = await page.$$eval('button', elements => 
    elements.map(el => el.textContent?.trim()).filter(text => text && text.length > 0)
  );
  console.log('🔘 Button texts:', buttons);
  
  // Basic assertion to pass the test
  expect(title).toBeTruthy();
});