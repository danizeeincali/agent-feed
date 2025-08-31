const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Global setup for production validation tests
 * Ensures servers are ready and logs are accessible
 */
async function globalSetup(config) {
  console.log('🚀 Starting production validation setup...');
  
  // Create test results directory
  const testResultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }
  
  // Setup log monitoring
  const logFile = '/workspaces/agent-feed/logs/combined.log';
  if (!fs.existsSync(path.dirname(logFile))) {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
  }
  
  // Create log file if it doesn't exist
  if (!fs.existsSync(logFile)) {
    fs.writeFileSync(logFile, `[${new Date().toISOString()}] Production validation test started\n`);
  }
  
  // Wait for servers to be ready
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('⏳ Waiting for frontend server (localhost:5173)...');
    
    let frontendReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        const response = await page.goto('http://localhost:5173', { timeout: 5000 });
        if (response && response.status() === 200) {
          frontendReady = true;
          console.log('✅ Frontend server ready');
          break;
        }
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (!frontendReady) {
      throw new Error('Frontend server not responding on localhost:5173');
    }
    
    console.log('⏳ Waiting for backend server (localhost:3000)...');
    
    let backendReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        const response = await page.request.get('http://localhost:3000/health');
        if (response && response.status() === 200) {
          backendReady = true;
          console.log('✅ Backend server ready');
          break;
        }
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (!backendReady) {
      console.log('⚠️ Backend server not responding, will test without API validation');
    }
    
    // Validate frontend is serving the correct application
    await page.goto('http://localhost:5173');
    const title = await page.title();
    
    if (!title.toLowerCase().includes('agent') && !title.toLowerCase().includes('claude')) {
      console.log('⚠️ Frontend might not be serving the correct application');
      console.log('Page title:', title);
    }
    
    // Store server status for tests
    const serverStatus = {
      frontend: frontendReady,
      backend: backendReady,
      timestamp: Date.now()
    };
    
    fs.writeFileSync(
      path.join(testResultsDir, 'server-status.json'),
      JSON.stringify(serverStatus, null, 2)
    );
    
    console.log('🎯 Production validation setup completed successfully!');
    console.log(`Frontend: ${frontendReady ? '✅' : '❌'}`);
    console.log(`Backend: ${backendReady ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = globalSetup;