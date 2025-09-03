/**
 * Global setup for E2E tests
 * Ensures backend and frontend are ready before running tests
 */

import fetch from 'node-fetch';

async function waitForService(url, name, timeoutMs = 60000) {
  console.log(`⏳ Waiting for ${name} to be ready at ${url}...`);
  
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✅ ${name} is ready!`);
        return true;
      }
    } catch (error) {
      // Service not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`❌ ${name} failed to start within ${timeoutMs}ms`);
}

export default async function globalSetup() {
  console.log('🚀 Starting global setup for E2E tests...');
  
  try {
    // Wait for backend
    await waitForService('http://localhost:3000/health', 'Backend API');
    
    // Wait for frontend  
    await waitForService('http://localhost:5173', 'Frontend');
    
    // Additional setup time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Global setup completed successfully!');
  } catch (error) {
    console.error('❌ Global setup failed:', error.message);
    throw error;
  }
}