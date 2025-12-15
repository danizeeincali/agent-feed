import { FullConfig } from '@playwright/test';

/**
 * Global Teardown for E2E Tests
 * Runs once after all test suites complete
 */
async function globalTeardown(config: FullConfig) {
  console.log('\n🧹 Starting Global Teardown for E2E Tests');

  try {
    // Cleanup operations can go here
    // For example:
    // - Clear test data
    // - Reset database state
    // - Close connections
    // - Save test artifacts

    console.log('   Cleaning up test artifacts...');

    // Note: Playwright automatically handles cleanup of:
    // - Browser contexts
    // - Pages
    // - Videos
    // - Screenshots
    // - Traces

    console.log('✅ Global Teardown Complete\n');
  } catch (error) {
    console.error('❌ Global Teardown Failed:', error);
    // Don't throw - we don't want to fail tests due to cleanup issues
  }
}

export default globalTeardown;
