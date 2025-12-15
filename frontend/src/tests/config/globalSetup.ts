/**
 * Global Test Setup
 * 
 * Global setup for Playwright E2E tests including server startup,
 * database initialization, and test environment preparation.
 */

import { chromium, FullConfig } from '@playwright/test';

export default async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');

  try {
    // Start browser for setup tasks
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('🔍 Checking server availability...');
    
    // Check if frontend server is running
    try {
      await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
      console.log('✅ Frontend server is running on port 3001');
    } catch (error) {
      console.error('❌ Frontend server not available:', error);
      throw new Error('Frontend server must be running on port 3001');
    }

    // Check if backend server is running
    try {
      const response = await page.request.get('http://localhost:3000/health');
      if (response.ok()) {
        console.log('✅ Backend server is running on port 3000');
      } else {
        console.warn('⚠️ Backend server health check failed');
      }
    } catch (error) {
      console.warn('⚠️ Backend server not available, some tests may fail');
    }

    // Test WebSocket connectivity
    try {
      await page.evaluate(() => {
        return new Promise<void>((resolve, reject) => {
          const ws = new WebSocket('ws://localhost:3000');
          
          ws.onopen = () => {
            console.log('WebSocket connection test successful');
            ws.close();
            resolve();
          };
          
          ws.onerror = (error) => {
            reject(new Error('WebSocket connection failed'));
          };
          
          ws.onclose = () => {
            resolve();
          };
          
          // Timeout after 5 seconds
          setTimeout(() => {
            if (ws.readyState !== WebSocket.OPEN) {
              ws.close();
              reject(new Error('WebSocket connection timeout'));
            }
          }, 5000);
        });
      });
      
      console.log('✅ WebSocket connectivity test passed');
    } catch (error) {
      console.warn('⚠️ WebSocket connectivity test failed:', error);
    }

    // Set up test data if needed
    console.log('📋 Setting up test data...');
    
    // Clear any existing test data
    await page.evaluate(() => {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear any IndexedDB data if used
      if (window.indexedDB) {
        // Implementation would depend on actual usage
      }
    });

    // Set up default test configuration
    await page.evaluate(() => {
      localStorage.setItem('test-mode', 'true');
      localStorage.setItem('terminal-settings', JSON.stringify({
        fontSize: 14,
        theme: 'dark',
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
        cursorBlink: true,
        scrollback: 1000
      }));
    });

    console.log('✅ Test data setup complete');

    // Clean up
    await page.close();
    await context.close();
    await browser.close();

    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    process.exit(1);
  }
}

// Helper function to wait for server with retries
async function waitForServer(url: string, maxRetries: number = 10): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const browser = await chromium.launch();
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto(url, { waitUntil: 'networkidle', timeout: 5000 });
      
      await page.close();
      await context.close();
      await browser.close();
      
      return true;
    } catch (error) {
      console.log(`Attempt ${i + 1}/${maxRetries} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return false;
}