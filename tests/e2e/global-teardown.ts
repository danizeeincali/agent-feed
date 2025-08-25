import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Global test teardown...');
  console.log('✅ Test cleanup complete');
  return Promise.resolve();
}

export default globalTeardown;