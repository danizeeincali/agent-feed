import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Global Setup for Interactive Control Removal Validation
 * Prepares test environment and captures baseline state
 */
async function globalSetup(config) {
  console.log('🚀 Starting Playwright UI/UX Validation Setup...');

  // Ensure directories exist
  const dirs = [
    './screenshots/baseline',
    './screenshots/post-removal',
    './reports',
    './test-results',
    './configs'
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });

  // Launch browser for baseline capture
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  console.log('📸 Capturing baseline screenshots...');

  try {
    // Wait for application to be ready
    await page.goto(config.use.baseURL, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="app-root"]', { timeout: 30000 });

    // Store application state info
    const appState = {
      timestamp: new Date().toISOString(),
      baseURL: config.use.baseURL,
      userAgent: await page.evaluate(() => navigator.userAgent),
      routes: []
    };

    // Test routes to validate before removal
    const routes = [
      { path: '/', name: 'feed' },
      { path: '/interactive-control', name: 'interactive-control' },
      { path: '/agents', name: 'agents' },
      { path: '/analytics', name: 'analytics' },
      { path: '/settings', name: 'settings' },
      { path: '/workflows', name: 'workflows' }
    ];

    for (const route of routes) {
      try {
        console.log(`📍 Testing route: ${route.path}`);
        await page.goto(`${config.use.baseURL}${route.path}`, {
          waitUntil: 'networkidle',
          timeout: 15000
        });

        await page.waitForSelector('[data-testid="app-root"]', { timeout: 10000 });

        // Capture route state
        const routeState = {
          path: route.path,
          name: route.name,
          accessible: true,
          hasContent: true,
          timestamp: new Date().toISOString()
        };

        // Take baseline screenshot
        await page.screenshot({
          path: `./screenshots/baseline/${route.name}-desktop.png`,
          fullPage: true
        });

        appState.routes.push(routeState);
        console.log(`✅ Baseline captured for ${route.name}`);

      } catch (error) {
        console.log(`⚠️  Route ${route.path} not accessible: ${error.message}`);
        appState.routes.push({
          path: route.path,
          name: route.name,
          accessible: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Save baseline state
    fs.writeFileSync(
      './configs/baseline-state.json',
      JSON.stringify(appState, null, 2)
    );
    console.log('💾 Baseline state saved');

  } catch (error) {
    console.error('❌ Error during baseline setup:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('🎯 Baseline setup completed successfully');
}

export default globalSetup;