import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright MCP validation suite
 * Prepares test environment and captures baseline state
 */
async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up Playwright MCP validation environment...');

  try {
    // Launch browser for initial setup
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Wait for application to be ready
    console.log('⏳ Waiting for application to be ready...');
    let retries = 30;
    let appReady = false;

    while (retries > 0 && !appReady) {
      try {
        await page.goto('http://localhost:3000', { timeout: 5000 });
        await page.waitForSelector('[data-testid="app-root"]', { timeout: 5000 });
        appReady = true;
        console.log('✅ Application is ready for testing');
      } catch (error) {
        retries--;
        console.log(`⏳ Waiting for app... (${retries} retries left)`);
        await page.waitForTimeout(2000);
      }
    }

    if (!appReady) {
      throw new Error('❌ Application failed to start within timeout period');
    }

    // Capture initial application state
    console.log('📸 Capturing baseline application state...');
    await page.screenshot({
      path: 'test-results/baseline-app-state.png',
      fullPage: true
    });

    // Test basic navigation to ensure routes are working
    console.log('🧭 Testing basic navigation...');
    const navigationRoutes = [
      '/',
      '/claude-manager',
      '/agents',
      '/analytics',
      '/settings'
    ];

    for (const route of navigationRoutes) {
      try {
        await page.goto(`http://localhost:3000${route}`, { timeout: 10000 });
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        console.log(`✅ Route ${route} is accessible`);
      } catch (error) {
        console.log(`⚠️  Route ${route} may have issues: ${error.message}`);
      }
    }

    await browser.close();
    console.log('🎯 Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;