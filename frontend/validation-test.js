import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  
  console.log('🔍 Opening frontend at http://localhost:3000...');
  
  try {
    // Navigate to the frontend
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    
    console.log('✅ Page loaded successfully');
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Look for connection status text
    console.log('🔍 Checking connection status...');
    
    // Try to find connection status elements
    const connectionStatusText = await page.textContent('body', { timeout: 5000 }).catch(() => 'Not found');
    console.log('📄 Full page text includes:', connectionStatusText.substring(0, 500));
    
    // Check if "Connected" appears in the page
    const isConnected = connectionStatusText.includes('Connected');
    const isDisconnected = connectionStatusText.includes('Disconnected');
    
    console.log('🔌 Connection Status Check:');
    console.log('  - Contains "Connected":', isConnected);
    console.log('  - Contains "Disconnected":', isDisconnected);
    
    // Take screenshot for evidence
    const screenshotPath = '/workspaces/agent-feed/frontend/connection-status-screenshot.png';
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    console.log(`📸 Screenshot saved to: ${screenshotPath}`);
    
    // Try to click launch button and test functionality
    console.log('🚀 Testing Claude instance launcher...');
    
    // Look for launch button
    const launchButton = await page.locator('text=Launch Claude Instance').first().catch(() => null);
    if (launchButton) {
      console.log('✅ Launch button found');
      await launchButton.click();
      
      // Wait to see if it shows loading or actually works
      await page.waitForTimeout(2000);
      
      const afterClickText = await page.textContent('body');
      const isLoading = afterClickText.includes('loading');
      console.log('⏳ Shows loading after click:', isLoading);
    } else {
      console.log('❌ Launch button not found');
    }
    
    // Generate validation report
    const report = {
      timestamp: new Date().toISOString(),
      frontend_accessible: true,
      connection_status: {
        shows_connected: isConnected,
        shows_disconnected: isDisconnected,
        status: isConnected ? 'CONNECTED' : isDisconnected ? 'DISCONNECTED' : 'UNKNOWN'
      },
      launch_button_found: !!launchButton,
      screenshot_path: screenshotPath,
      validation_result: isConnected ? 'SUCCESS' : 'FAILURE'
    };
    
    console.log('📊 VALIDATION REPORT:');
    console.log(JSON.stringify(report, null, 2));
    
    // Save report
    fs.writeFileSync('/workspaces/agent-feed/frontend/validation-report.json', JSON.stringify(report, null, 2));
    
  } catch (error) {
    console.error('❌ Error during validation:', error.message);
    
    const errorReport = {
      timestamp: new Date().toISOString(),
      frontend_accessible: false,
      error: error.message,
      validation_result: 'FAILURE'
    };
    
    fs.writeFileSync('/workspaces/agent-feed/frontend/validation-report.json', JSON.stringify(errorReport, null, 2));
  }
  
  await browser.close();
})();