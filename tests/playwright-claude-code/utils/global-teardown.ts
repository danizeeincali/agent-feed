import { FullConfig } from '@playwright/test';

/**
 * Global Teardown for Claude Code Integration Tests
 * 
 * Performs cleanup operations after all tests have completed.
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for Claude Code integration tests...');
  
  try {
    // Add any cleanup operations here
    console.log('📊 Collecting test metrics...');
    
    // Log test completion
    const timestamp = new Date().toISOString();
    console.log(`✅ Global teardown completed at ${timestamp}`);
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here to avoid masking test failures
  }
}

export default globalTeardown;