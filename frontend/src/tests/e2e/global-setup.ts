import { chromium, FullConfig } from '@playwright/test';

/**
 * Global Setup for E2E Tests
 * Runs once before all test suites
 */
async function globalSetup(config: FullConfig) {
  console.log('\n🚀 Starting Global Setup for E2E Tests');

  try {
    // Check if backend is available
    const browser = await chromium.launch();
    const page = await browser.newPage();

    console.log('   Checking backend server...');
    try {
      const response = await page.goto('http://localhost:3001/health', {
        timeout: 5000,
        waitUntil: 'networkidle',
      });

      if (response?.ok()) {
        console.log('   ✓ Backend server is running');
      } else {
        console.warn('   ⚠ Backend server responded with non-OK status');
      }
    } catch (error) {
      console.warn('   ⚠ Could not connect to backend server');
      console.warn('   Make sure the backend is running on port 3001');
    }

    // Check if frontend is available
    console.log('   Checking frontend server...');
    try {
      const response = await page.goto('http://localhost:5173', {
        timeout: 5000,
        waitUntil: 'networkidle',
      });

      if (response?.ok()) {
        console.log('   ✓ Frontend server is running');
      } else {
        console.warn('   ⚠ Frontend server responded with non-OK status');
      }
    } catch (error) {
      console.warn('   ⚠ Could not connect to frontend server');
      console.warn('   Make sure the frontend is running on port 5173');
    }

    await browser.close();

    console.log('✅ Global Setup Complete\n');
  } catch (error) {
    console.error('❌ Global Setup Failed:', error);
    throw error;
  }
}

export default globalSetup;
