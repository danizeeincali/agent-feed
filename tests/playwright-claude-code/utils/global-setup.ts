import { chromium, FullConfig } from '@playwright/test';

/**
 * Global Setup for Claude Code Integration Tests
 * 
 * Ensures the application and backend services are properly initialized
 * before running any tests.
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for Claude Code integration tests...');
  
  // Launch a browser to warm up the application
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for frontend to be available
    console.log('⏳ Waiting for frontend at http://localhost:5173...');
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    
    // Wait for backend API to be available
    console.log('⏳ Waiting for backend API at http://localhost:8080...');
    await page.goto('http://localhost:8080/health', { 
      timeout: 30000 
    });
    
    // Ensure Claude instances are available
    console.log('🤖 Checking Claude instances...');
    const response = await page.goto('http://localhost:8080/api/claude/instances');
    const instances = await response?.json();
    console.log(`Found ${instances?.length || 0} Claude instances`);
    
    // Create a test Claude instance if none exist
    if (!instances || instances.length === 0) {
      console.log('🔧 Creating test Claude instance...');
      await page.evaluate(async () => {
        const response = await fetch('/api/claude/instances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type: 'claude-interactive',
            name: 'Test Instance' 
          })
        });
        return response.json();
      });
    }
    
    // Verify WebSocket connection
    console.log('🔌 Testing WebSocket connection...');
    await page.evaluate(() => {
      return new Promise<void>((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:8080');
        ws.onopen = () => {
          ws.close();
          resolve();
        };
        ws.onerror = () => reject(new Error('WebSocket connection failed'));
        setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
      });
    });
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;