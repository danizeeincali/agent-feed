/**
 * Global Setup for Playwright E2E Tests
 * Configures test environment and shared resources
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright Global Setup...');

  // Create browser for setup tasks
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Health check - verify app is running
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    console.log(`📍 Testing connection to: ${baseURL}`);

    const response = await page.goto(baseURL, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    if (!response || !response.ok()) {
      throw new Error(`❌ App not accessible at ${baseURL}. Status: ${response?.status()}`);
    }

    console.log('✅ App is accessible and responding');

    // Setup test data or authentication if needed
    await setupTestEnvironment(page);

    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function setupTestEnvironment(page: any) {
  // Clear any existing data
  await page.evaluate(() => {
    // Clear localStorage
    try {
      localStorage.clear();
    } catch (e) {
      console.log('Could not clear localStorage:', e);
    }

    // Clear sessionStorage
    try {
      sessionStorage.clear();
    } catch (e) {
      console.log('Could not clear sessionStorage:', e);
    }

    // Clear cookies
    try {
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    } catch (e) {
      console.log('Could not clear cookies:', e);
    }
  });

  // Set up test configuration
  await page.evaluate(() => {
    // Set test mode flag
    (window as any).__PLAYWRIGHT_TEST_MODE__ = true;

    // Mock environment variables if needed
    (window as any).process = {
      env: {
        NODE_ENV: 'test',
        PLAYWRIGHT_TEST: 'true'
      }
    };

    // Set up analytics test configuration
    localStorage.setItem('analytics_test_config', JSON.stringify({
      enableRealTimeTracking: false, // Disable for consistent testing
      mockData: true,
      testMode: true
    }));
  });

  console.log('🔧 Test environment configured');
}

export default globalSetup;