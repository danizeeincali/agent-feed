/**
 * Global Teardown for London School TDD Tests
 * 
 * Cleanup after all tests complete
 */

export default async function globalTeardown() {
  console.log('🧹 Cleaning up London School TDD environment...');
  
  // Clean up global state
  delete (global as any).mockCallHistory;
  delete (global as any).interactionTracker;
  
  // Log final summary
  const memoryUsage = process.memoryUsage();
  console.log(`📊 Final memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
  
  console.log('✅ London School TDD cleanup complete');
}