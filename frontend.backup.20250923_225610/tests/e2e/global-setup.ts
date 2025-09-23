import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');
  
  // Create browser instance for initial setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for dev server to be ready
    console.log('📡 Waiting for dev server at http://localhost:5173...');
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds timeout
    
    while (attempts < maxAttempts) {
      try {
        await page.goto('http://localhost:5173', { 
          timeout: 2000,
          waitUntil: 'domcontentloaded'
        });
        console.log('✅ Dev server is ready!');
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error(`Dev server not ready after ${maxAttempts} seconds`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Pre-warm application routes
    console.log('🔄 Pre-warming application routes...');
    const routes = [
      '/',
      '/posting',
      '/dashboard',
      '/agents',
      '/settings'
    ];
    
    for (const route of routes) {
      try {
        await page.goto(`http://localhost:5173${route}`, {
          timeout: 10000,
          waitUntil: 'networkidle'
        });
        console.log(`✅ Pre-warmed route: ${route}`);
      } catch (error) {
        console.warn(`⚠️  Could not pre-warm route ${route}:`, error);
      }
    }
    
    // Initialize test data if needed
    console.log('📊 Initializing test data...');
    
    // Check if the app has any initialization requirements
    await page.evaluate(() => {
      // Clear any existing local storage for clean tests
      localStorage.clear();
      sessionStorage.clear();
      
      // Set up test environment flags
      window.__TEST_ENV__ = true;
      window.__E2E_RUNNING__ = true;
      
      // Disable analytics and tracking in test mode
      window.__DISABLE_ANALYTICS__ = true;
    });
    
    console.log('✅ Global setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;