/**
 * Playwright Global Teardown for WebSocket E2E Tests
 * Cleans up test environment after WebSocket connection testing
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting WebSocket E2E Test Environment Cleanup...');
  
  try {
    // Give servers time to clean up connections
    console.log('⏳ Allowing connection cleanup...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Log cleanup completion
    console.log('✅ WebSocket E2E Test Environment Cleanup Complete');
    
  } catch (error) {
    console.error('❌ Global teardown error:', error);
  }
}

export default globalTeardown;