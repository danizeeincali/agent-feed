import { execSync } from 'child_process';

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Clean up test database
    const dbName = process.env.DB_NAME || 'agent_feed_test';
    console.log(`🗑️ Cleaning up test database: ${dbName}`);
    
    try {
      execSync(`dropdb ${dbName}`, { stdio: 'pipe' });
      console.log('✅ Test database cleaned up');
    } catch (error) {
      console.log('📋 Test database cleanup skipped');
    }
    
    // Kill any remaining processes
    try {
      execSync('pkill -f "node.*test"', { stdio: 'pipe' });
    } catch (error) {
      // Ignore errors - processes might not exist
    }
    
    console.log('✅ Global teardown completed');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
  }
}