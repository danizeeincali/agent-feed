/**
 * Test WebSocket Connection Status in Browser
 */

const { chromium } = require('playwright');

async function testConnectionStatus() {
  console.log('🔍 Testing Frontend Connection Status...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Navigate to frontend
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  
  // Wait for app to initialize
  await page.waitForTimeout(3000);
  
  // Check for connection status in the page
  const bodyText = await page.textContent('body');
  
  if (bodyText.includes('Connected')) {
    console.log('✅ Found "Connected" status on page');
  } else if (bodyText.includes('Disconnected')) {
    console.log('❌ Found "Disconnected" status on page');
  } else {
    console.log('❓ Connection status not visible in page text');
  }
  
  // Try to find Connection Status component specifically
  const connectionStatusElements = await page.$$('[data-testid*="connection"], .connection-status, .Connection');
  console.log(`🔍 Found ${connectionStatusElements.length} potential connection status elements`);
  
  // Check console for WebSocket messages
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('WebSocket') || text.includes('Connected') || text.includes('connect')) {
      consoleMessages.push(text);
    }
  });
  
  // Wait for potential connections
  await page.waitForTimeout(2000);
  
  console.log('📝 Relevant console messages:');
  consoleMessages.forEach(msg => console.log(`   ${msg}`));
  
  await browser.close();
  
  return {
    hasConnectedText: bodyText.includes('Connected'),
    hasDisconnectedText: bodyText.includes('Disconnected'),
    connectionElements: connectionStatusElements.length,
    consoleMessages: consoleMessages.length
  };
}

testConnectionStatus()
  .then(result => {
    console.log('📊 Test Results:', result);
    if (result.hasConnectedText) {
      console.log('🎉 SUCCESS: Frontend shows connected status');
    } else if (result.hasDisconnectedText) {
      console.log('⚠️  ISSUE: Frontend shows disconnected status');
    } else {
      console.log('❓ UNCLEAR: Connection status not found');
    }
  })
  .catch(console.error);