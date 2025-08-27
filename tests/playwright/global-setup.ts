import { chromium, FullConfig } from '@playwright/test';

/**
 * Global Setup for Claude Instance Frontend Testing
 * 
 * This setup ensures:
 * - Backend services are ready
 * - Frontend is accessible
 * - Claude CLI is available for testing
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Claude Instance Frontend Test Setup...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Verify backend is running
    console.log('📡 Checking backend connectivity...');
    const backendResponse = await page.goto('http://localhost:3000/api/health', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    if (!backendResponse?.ok()) {
      throw new Error(`Backend not available: ${backendResponse?.status()}`);
    }
    console.log('✅ Backend is ready');
    
    // Verify frontend is running
    console.log('🎨 Checking frontend connectivity...');
    const frontendResponse = await page.goto('http://localhost:3001', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    if (!frontendResponse?.ok()) {
      throw new Error(`Frontend not available: ${frontendResponse?.status()}`);
    }
    console.log('✅ Frontend is ready');
    
    // Wait for Claude Instance Manager to be available
    console.log('🤖 Checking Claude Instance Manager availability...');
    await page.waitForSelector('[data-testid="claude-instance-manager"]', {
      timeout: 15000
    });
    console.log('✅ Claude Instance Manager is ready');
    
    // Verify all 4 launch buttons are present
    const buttons = [
      'button:has-text("🚀 prod/claude")',
      'button:has-text("⚡ skip-permissions")', 
      'button:has-text("⚡ skip-permissions -c")',
      'button:has-text("↻ skip-permissions --resume")'
    ];
    
    for (const buttonSelector of buttons) {
      await page.waitForSelector(buttonSelector, { timeout: 10000 });
    }
    console.log('✅ All 4 Claude launch buttons are available');
    
    // Check that SSE connection capabilities are present
    console.log('📡 Verifying SSE connection capabilities...');
    const connectionStatus = await page.locator('.connection-status').first();
    await connectionStatus.waitFor({ timeout: 10000 });
    console.log('✅ SSE connection status indicator found');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('✅ Global setup completed successfully');
}

export default globalSetup;