/**
 * Playwright Global Setup for WebSocket E2E Tests
 * Prepares test environment for WebSocket connection testing
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting WebSocket E2E Test Environment Setup...');
  
  // Launch browser for environment verification
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for backend server
    console.log('⏳ Waiting for backend server on port 3002...');
    let backendReady = false;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (!backendReady && attempts < maxAttempts) {
      try {
        const response = await page.request.get('http://localhost:3002/health');
        if (response.status() === 200) {
          const health = await response.json();
          if (health.status === 'healthy') {
            backendReady = true;
            console.log('✅ Backend server is healthy');
          }
        }
      } catch (error) {
        attempts++;
        console.log(`⏳ Backend server not ready, attempt ${attempts}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (!backendReady) {
      throw new Error('Backend server failed to start within timeout');
    }
    
    // Wait for frontend server
    console.log('⏳ Waiting for frontend server on port 5173...');
    let frontendReady = false;
    attempts = 0;
    
    while (!frontendReady && attempts < maxAttempts) {
      try {
        const response = await page.request.get('http://localhost:5173');
        if (response.status() === 200) {
          frontendReady = true;
          console.log('✅ Frontend server is ready');
        }
      } catch (error) {
        attempts++;
        console.log(`⏳ Frontend server not ready, attempt ${attempts}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (!frontendReady) {
      console.warn('⚠️ Frontend server not responding, tests may fail');
    }
    
    // Verify WebSocket connectivity
    console.log('🔌 Testing WebSocket connectivity...');
    await page.goto('http://localhost:5173');
    
    // Monitor console for WebSocket connection attempts
    let wsConnected = false;
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('WebSocket') || text.includes('Socket.IO')) {
        console.log('🔍 WebSocket activity detected:', text);
        if (text.includes('connected') || text.includes('Connected')) {
          wsConnected = true;
        }
      }
    });
    
    // Wait for page load and potential WebSocket connections
    await page.waitForTimeout(5000);
    
    if (wsConnected) {
      console.log('✅ WebSocket connectivity verified');
    } else {
      console.warn('⚠️ WebSocket connectivity not confirmed, but proceeding with tests');
    }
    
    console.log('🎯 WebSocket E2E Test Environment Ready!');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;