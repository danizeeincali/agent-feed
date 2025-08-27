import { FullConfig } from '@playwright/test';

/**
 * Global Teardown for Claude Instance Frontend Testing
 * 
 * Cleans up any running Claude instances and test artifacts
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Claude Instance Frontend Test Teardown...');
  
  try {
    // Clean up any running Claude instances via API
    console.log('🛑 Cleaning up running Claude instances...');
    
    const fetch = (await import('node-fetch')).default;
    
    try {
      const instancesResponse = await fetch('http://localhost:3000/api/claude/instances');
      const instancesData = await instancesResponse.json();
      
      if (instancesData.success && instancesData.instances?.length > 0) {
        console.log(`Found ${instancesData.instances.length} running instances to clean up`);
        
        for (const instance of instancesData.instances) {
          try {
            await fetch(`http://localhost:3000/api/claude/instances/${instance.id}`, {
              method: 'DELETE'
            });
            console.log(`✅ Cleaned up instance: ${instance.id}`);
          } catch (error) {
            console.warn(`⚠️ Failed to clean up instance ${instance.id}:`, error);
          }
        }
      } else {
        console.log('✅ No running instances to clean up');
      }
    } catch (error) {
      console.warn('⚠️ Could not connect to backend for cleanup:', error);
    }
    
    // Wait a moment for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Global teardown completed');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw - teardown failures shouldn't fail the test run
  }
}

export default globalTeardown;