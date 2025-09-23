/**
 * Mobile Global Setup
 * Setup configuration for mobile testing environment
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up mobile testing environment...');

  // Create a browser instance for setup
  const browser = await chromium.launch();
  const context = await browser.newContext({
    // Mobile simulation settings
    viewport: { width: 375, height: 667 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  try {
    // Check if the development server is running
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(baseURL, { timeout: 10000 });
    
    // Verify mobile compatibility
    const isMobileReady = await page.evaluate(() => {
      // Check for mobile viewport meta tag
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (!viewportMeta) return false;
      
      // Check for touch events support
      const hasTouchSupport = 'ontouchstart' in window;
      
      // Check for responsive CSS classes (Tailwind)
      const hasResponsiveCSS = document.querySelector('html')?.classList.contains('h-full') || 
                              document.querySelector('body')?.classList.contains('min-h-screen');
      
      return {
        viewport: !!viewportMeta,
        touch: hasTouchSupport,
        responsive: hasResponsiveCSS
      };
    });
    
    console.log('📱 Mobile readiness check:', isMobileReady);
    
    // Setup test data if needed
    console.log('📋 Setting up mobile test data...');
    
    // Create screenshots directory
    await page.evaluate(() => {
      // Any browser-side setup needed
      console.log('Mobile test environment initialized');
    });
    
  } catch (error) {
    console.error('❌ Mobile setup failed:', error);
    throw error;
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }

  console.log('✅ Mobile testing environment setup complete!');
}

export default globalSetup;