/**
 * Quick Frontend WebSocket Connection Test
 * Tests if frontend can properly connect to backend WebSocket on port 3001
 */

const { chromium } = require('playwright');

async function testFrontendConnection() {
  console.log('🧪 Testing Frontend WebSocket Connection...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Listen for console messages from the frontend
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('WebSocket') || text.includes('Connection') || text.includes('connected') || text.includes('Connected')) {
      console.log(`📱 Frontend: ${text}`);
    }
  });
  
  // Navigate to frontend
  console.log('📡 Navigating to http://localhost:3000...');
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('✅ Frontend loaded successfully');
    
    // Wait for potential WebSocket connections to establish
    await page.waitForTimeout(5000);
    
    // Check for connection status elements
    const connectionElements = await page.$$('[data-testid*="connection"], [class*="connection"], [class*="Connection"]');
    console.log(`🔍 Found ${connectionElements.length} connection-related elements`);
    
    // Look for connection status text
    const bodyText = await page.textContent('body');
    if (bodyText.includes('Connected')) {
      console.log('✅ Connection Status: Connected found on page');
    } else if (bodyText.includes('Disconnected')) {
      console.log('❌ Connection Status: Disconnected found on page');
    } else {
      console.log('❓ Connection status not clearly visible');
    }
    
    // Check if Claude instance launcher is present and not stuck in loading
    const launcherElements = await page.$$('[data-testid*="launcher"], [class*="launcher"], [class*="Launcher"]');
    console.log(`🚀 Found ${launcherElements.length} launcher-related elements`);
    
    // Wait a bit more to see if connections establish
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('❌ Error testing frontend:', error.message);
  }
  
  await browser.close();
  console.log('🏁 Frontend connection test completed');
}

// Run the test
testFrontendConnection().catch(console.error);