import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Warm up the development server
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3001';
    
    console.log(`📡 Warming up server at ${baseURL}...`);
    
    // Try to reach the server with retries
    let retries = 10;
    while (retries > 0) {
      try {
        await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 10000 });
        console.log('✅ Server is ready');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error('❌ Server warmup failed:', error);
          throw error;
        }
        console.log(`⏳ Retrying server connection... (${retries} attempts left)`);
        await page.waitForTimeout(2000);
      }
    }
    
    // Preload critical resources
    console.log('🔄 Preloading critical resources...');
    
    // Navigate to key pages to warm up the app
    const keyRoutes = ['/', '/agents', '/dual-instance'];
    for (const route of keyRoutes) {
      try {
        await page.goto(`${baseURL}${route}`, { 
          waitUntil: 'networkidle',
          timeout: 15000 
        });
        await page.waitForTimeout(1000);
      } catch (error) {
        console.warn(`⚠️  Could not preload route ${route}:`, error.message);
      }
    }
    
    console.log('✅ Global setup completed');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;