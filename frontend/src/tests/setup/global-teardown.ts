/**
 * Global Teardown for Playwright E2E Tests
 * Cleanup tasks after all tests complete
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Playwright Global Teardown...');

  try {
    // Clean up any global resources
    await cleanupTestData();

    // Log test completion
    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw - teardown failures shouldn't fail the build
  }
}

async function cleanupTestData() {
  // Clean up any test files or data created during tests
  console.log('🗑️ Cleaning up test data...');

  // Any cleanup logic would go here
  // For example: removing test files, clearing test databases, etc.
}

export default globalTeardown;