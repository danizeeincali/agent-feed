/**
 * Playwright Global Setup for API Connectivity Tests
 * Ensures servers are running before tests begin
 */

import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🔧 Setting up API Connectivity Tests...');

  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Wait for servers to be ready
  await waitForServer(API_BASE_URL, 'Backend');
  await waitForServer(FRONTEND_URL, 'Frontend', false); // Frontend is optional

  console.log('✅ Global setup completed');
}

/**
 * Wait for a server to be ready
 */
async function waitForServer(url, name, required = true) {
  const maxAttempts = 15;
  const delay = 2000;

  console.log(`⏳ Waiting for ${name} server at ${url}...`);

  for (let i = 0; i < maxAttempts; i++) {
    try {
      // Use a simpler fetch approach
      const { default: fetch } = await import('node-fetch');

      const healthUrl = url.includes('/api/') ? url : `${url}/api/health`;
      const response = await fetch(healthUrl, {
        timeout: 5000,
        method: 'GET'
      });

      if (response.ok) {
        console.log(`✅ ${name} server is ready`);
        return true;
      }

      console.log(`⏳ ${name} server responded with status ${response.status}, retrying...`);
    } catch (error) {
      console.log(`⏳ ${name} server not ready (attempt ${i + 1}/${maxAttempts}): ${error.message}`);
    }

    if (i < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  if (required) {
    throw new Error(`${name} server at ${url} did not become ready within ${maxAttempts * delay / 1000} seconds`);
  } else {
    console.log(`⚠️ ${name} server at ${url} is not ready, but continuing (not required)`);
    return false;
  }
}

/**
 * Verify browser can access servers
 */
async function verifyBrowserAccess() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

    // Test API access from browser context
    const result = await page.evaluate(async (apiUrl) => {
      try {
        const response = await fetch(`${apiUrl}/api/health`);
        return {
          success: true,
          status: response.status,
          ok: response.ok
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }, API_BASE_URL);

    if (result.success && result.ok) {
      console.log('✅ Browser can access API endpoints');
    } else {
      console.log(`⚠️ Browser API access test failed: ${JSON.stringify(result)}`);
    }
  } catch (error) {
    console.log(`⚠️ Browser verification failed: ${error.message}`);
  } finally {
    await browser.close();
  }
}

export default globalSetup;