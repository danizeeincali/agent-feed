import { chromium, FullConfig } from '@playwright/test';

/**
 * Global Setup for Tripling Bug Reproduction Tests
 * Ensures proper environment and server readiness
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Tripling Bug Reproduction Test Environment');
  
  // Wait for servers to be ready
  await waitForServer('http://localhost:5173', 'Frontend');
  await waitForServer('http://localhost:3000', 'Backend');
  
  // Verify WebSocket connectivity
  await verifyWebSocketConnection();
  
  console.log('✅ Environment ready for tripling bug reproduction tests');
}

async function waitForServer(url: string, name: string, maxRetries: number = 30) {
  console.log(`⏳ Waiting for ${name} server at ${url}`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) { // 404 is OK for SPA routing
        console.log(`✅ ${name} server is ready`);
        return;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`❌ ${name} server at ${url} failed to start within ${maxRetries} seconds`);
}

async function verifyWebSocketConnection() {
  console.log('🔌 Verifying WebSocket connectivity');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173');
    
    // Test WebSocket connection capability
    const wsTest = await page.evaluate(() => {
      return new Promise((resolve) => {
        try {
          const ws = new WebSocket('ws://localhost:3000');
          
          ws.onopen = () => {
            ws.close();
            resolve({ success: true, error: null });
          };
          
          ws.onerror = (error) => {
            resolve({ success: false, error: 'WebSocket connection failed' });
          };
          
          // Timeout after 5 seconds
          setTimeout(() => {
            if (ws.readyState === WebSocket.CONNECTING) {
              ws.close();
              resolve({ success: false, error: 'WebSocket connection timeout' });
            }
          }, 5000);
        } catch (error) {
          resolve({ success: false, error: error.message });
        }
      });
    });
    
    if (wsTest.success) {
      console.log('✅ WebSocket connectivity verified');
    } else {
      console.log(`⚠️ WebSocket issue detected: ${wsTest.error}`);
      console.log('   Tests will proceed but may have connectivity issues');
    }
  } finally {
    await page.close();
    await browser.close();
  }
}

export default globalSetup;