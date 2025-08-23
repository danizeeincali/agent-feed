/**
 * WebSocket Connection Debug Test
 * This script tests the frontend WebSocket connection to verify status display
 */

const { chromium } = require('playwright');

async function testWebSocketConnection() {
  console.log('🔍 Testing WebSocket connection status display...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the application
    console.log('📡 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Wait for the app to load
    await page.waitForTimeout(3000);
    
    // Look for connection status indicators
    console.log('🔍 Looking for connection status elements...');
    
    // Check for various connection status patterns
    const connectionElements = await page.locator('text=/Connection Status|Connected|Disconnected|Live|Offline/i').all();
    console.log(`Found ${connectionElements.length} connection status elements`);
    
    for (let i = 0; i < connectionElements.length; i++) {
      const element = connectionElements[i];
      const text = await element.textContent();
      console.log(`  ${i + 1}. "${text}"`);
    }
    
    // Check for specific ConnectionStatus component
    const connectionStatusComponent = page.locator('[class*="ConnectionStatus"], .connection-status');
    const count = await connectionStatusComponent.count();
    if (count > 0) {
      console.log(`📊 Found ${count} ConnectionStatus components`);
      for (let i = 0; i < count; i++) {
        const text = await connectionStatusComponent.nth(i).textContent();
        console.log(`  Component ${i + 1}: "${text}"`);
      }
    }
    
    // Check for WebSocket status in sidebar
    const sidebar = page.locator('.sidebar, [class*="sidebar"], nav');
    if (await sidebar.count() > 0) {
      const sidebarText = await sidebar.first().textContent();
      console.log('📋 Sidebar content includes:', sidebarText.includes('Connected') ? 'Connected' : 'Disconnected or not found');
    }
    
    // Wait and check again after a moment
    console.log('⏱️  Waiting 5 seconds for connection to establish...');
    await page.waitForTimeout(5000);
    
    const updatedElements = await page.locator('text=/Connection Status|Connected|Disconnected|Live|Offline/i').all();
    console.log(`🔄 After waiting, found ${updatedElements.length} connection status elements`);
    
    for (let i = 0; i < updatedElements.length; i++) {
      const element = updatedElements[i];
      const text = await element.textContent();
      console.log(`  ${i + 1}. "${text}"`);
    }
    
    console.log('✅ Test completed - check the results above');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testWebSocketConnection().catch(console.error);