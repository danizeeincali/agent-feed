/**
 * SPARC Performance Validation for Saved Posts
 * Real API performance testing with concurrent operations
 */

const BASE_URL = 'http://localhost:3000';

async function performanceTest() {
  console.log('🚀 SPARC Saved Posts Performance Validation');
  console.log('=' .repeat(60));
  
  const testUserId = 'perf-test-user';
  const testPostId = 'prod-post-2';
  const iterations = 50;
  
  console.log(`📊 Testing ${iterations} save/unsave cycles`);
  console.log(`🎯 Target: <100ms average per operation`);
  console.log('');

  // Test 1: Sequential Operations
  console.log('🔄 Sequential Operations Test');
  const sequentialStart = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    // Save operation
    const saveResponse = await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: `${testUserId}-seq-${i}` })
    });
    
    if (!saveResponse.ok) {
      console.error(`❌ Save failed for iteration ${i}`);
      continue;
    }
    
    // Unsave operation
    const unsaveResponse = await fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save?user_id=${testUserId}-seq-${i}`, {
      method: 'DELETE'
    });
    
    if (!unsaveResponse.ok) {
      console.error(`❌ Unsave failed for iteration ${i}`);
    }
  }
  
  const sequentialDuration = Date.now() - sequentialStart;
  const sequentialAvg = sequentialDuration / (iterations * 2);
  
  console.log(`   ✅ Completed in ${sequentialDuration}ms`);
  console.log(`   📈 Average: ${sequentialAvg.toFixed(2)}ms per operation`);
  console.log(`   🎯 Target met: ${sequentialAvg < 100 ? 'YES' : 'NO'}`);
  console.log('');

  // Test 2: Concurrent Save Operations
  console.log('⚡ Concurrent Save Operations Test');
  const concurrentStart = Date.now();
  
  const savePromises = Array.from({ length: iterations }, (_, i) =>
    fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: `${testUserId}-conc-${i}` })
    })
  );
  
  const saveResults = await Promise.all(savePromises);
  const concurrentSaveDuration = Date.now() - concurrentStart;
  const concurrentSaveAvg = concurrentSaveDuration / iterations;
  
  console.log(`   ✅ ${iterations} concurrent saves in ${concurrentSaveDuration}ms`);
  console.log(`   📈 Average: ${concurrentSaveAvg.toFixed(2)}ms per save`);
  console.log(`   🎯 Throughput: ${(iterations / concurrentSaveDuration * 1000).toFixed(2)} saves/second`);
  console.log('');

  // Test 3: Filter Performance
  console.log('🔍 Filter Performance Test');
  const filterStart = Date.now();
  
  for (let i = 0; i < 20; i++) {
    const filterResponse = await fetch(`${BASE_URL}/api/v1/agent-posts?filter=saved&user_id=${testUserId}-conc-${i}`);
    if (!filterResponse.ok) {
      console.error(`❌ Filter failed for iteration ${i}`);
    }
  }
  
  const filterDuration = Date.now() - filterStart;
  const filterAvg = filterDuration / 20;
  
  console.log(`   ✅ 20 filter queries in ${filterDuration}ms`);
  console.log(`   📈 Average: ${filterAvg.toFixed(2)}ms per query`);
  console.log(`   🎯 Filter performance: ${filterAvg < 50 ? 'EXCELLENT' : filterAvg < 100 ? 'GOOD' : 'ACCEPTABLE'}`);
  console.log('');

  // Cleanup concurrent test data
  console.log('🧹 Cleaning up test data...');
  const cleanupPromises = Array.from({ length: iterations }, (_, i) =>
    fetch(`${BASE_URL}/api/v1/agent-posts/${testPostId}/save?user_id=${testUserId}-conc-${i}`, {
      method: 'DELETE'
    })
  );
  
  await Promise.all(cleanupPromises);
  console.log('   ✅ Cleanup completed');
  console.log('');

  // Final Results
  console.log('📋 Performance Summary');
  console.log('=' .repeat(60));
  console.log(`Sequential Avg: ${sequentialAvg.toFixed(2)}ms per operation`);
  console.log(`Concurrent Avg: ${concurrentSaveAvg.toFixed(2)}ms per save`);
  console.log(`Filter Avg: ${filterAvg.toFixed(2)}ms per query`);
  console.log(`Throughput: ${(iterations / concurrentSaveDuration * 1000).toFixed(2)} operations/second`);
  
  const overallSuccess = sequentialAvg < 100 && concurrentSaveAvg < 200 && filterAvg < 100;
  console.log(`Overall Result: ${overallSuccess ? '✅ PASS' : '⚠️ NEEDS OPTIMIZATION'}`);
  
  return {
    sequentialAvg,
    concurrentSaveAvg,
    filterAvg,
    throughput: iterations / concurrentSaveDuration * 1000,
    overallSuccess
  };
}

// Run if called directly
if (typeof require !== 'undefined' && require.main === module) {
  performanceTest()
    .then((results) => {
      process.exit(results.overallSuccess ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Performance test failed:', error);
      process.exit(1);
    });
}

module.exports = { performanceTest };