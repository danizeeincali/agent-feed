/**
 * Global teardown for E2E tests
 * Cleanup after all tests complete
 */

import fetch from 'node-fetch';

async function cleanupInstances() {
  console.log('🧹 Cleaning up Claude instances...');
  
  try {
    // Get all instances
    const response = await fetch('http://localhost:3000/api/claude/instances');
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.instances) {
        // Delete test instances (those with 'test' in their names)
        const testInstances = data.instances.filter(instance => 
          instance.id && instance.id.includes('test')
        );
        
        console.log(`🧹 Found ${testInstances.length} test instances to cleanup`);
        
        const cleanupPromises = testInstances.map(async (instance) => {
          try {
            const deleteResponse = await fetch(
              `http://localhost:3000/api/claude/instances/${instance.id}`,
              { method: 'DELETE' }
            );
            console.log(`🗑️ Cleaned up instance ${instance.id}: ${deleteResponse.status}`);
          } catch (error) {
            console.warn(`⚠️ Failed to cleanup instance ${instance.id}:`, error.message);
          }
        });
        
        await Promise.all(cleanupPromises);
      }
    }
  } catch (error) {
    console.warn('⚠️ Instance cleanup failed:', error.message);
  }
}

export default async function globalTeardown() {
  console.log('🏁 Starting global teardown for E2E tests...');
  
  try {
    // Clean up test instances
    await cleanupInstances();
    
    // Wait a moment for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Global teardown completed successfully!');
  } catch (error) {
    console.error('❌ Global teardown failed:', error.message);
    // Don't throw - teardown failures shouldn't fail the test run
  }
}
