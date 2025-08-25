import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Global test setup...');
  
  // Wait for servers to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('✅ Test environment ready');
  return Promise.resolve();
}

export default globalSetup;