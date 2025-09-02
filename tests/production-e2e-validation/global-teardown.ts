import { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting production E2E validation teardown...');
  
  try {
    // Kill any running processes
    await execAsync('pkill -f "node.*backend" || true');
    await execAsync('pkill -f "npm.*dev" || true');
    
    console.log('✅ Teardown complete');
  } catch (error) {
    console.error('❌ Teardown failed:', error);
  }
}

export default globalTeardown;