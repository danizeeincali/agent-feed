/**
 * Custom Jest Results Processor for London School TDD
 * 
 * Processes test results to highlight interaction testing metrics
 * and behavioral contract compliance
 */

module.exports = (results) => {
  // Count different types of tests
  const testCounts = {
    contractTests: 0,
    interactionTests: 0,
    behaviorTests: 0,
    resourceLeakTests: 0,
    lifecycleTests: 0
  };

  // Analyze test results
  if (results.testResults) {
    results.testResults.forEach(testFile => {
      if (testFile.testResults) {
        testFile.testResults.forEach(test => {
          const testName = test.fullName || test.title || '';
          
          if (testName.includes('Contract') || testName.includes('contract')) {
            testCounts.contractTests++;
          }
          
          if (testName.includes('Interaction') || testName.includes('interaction')) {
            testCounts.interactionTests++;
          }
          
          if (testName.includes('Behavior') || testName.includes('behavior')) {
            testCounts.behaviorTests++;
          }
          
          if (testName.includes('Resource Leak') || testName.includes('leak')) {
            testCounts.resourceLeakTests++;
          }
          
          if (testName.includes('Lifecycle') || testName.includes('lifecycle')) {
            testCounts.lifecycleTests++;
          }
        });
      }
    });
  }

  // Add London School metrics to results
  results.londonSchoolMetrics = testCounts;

  // Log London School specific summary
  console.log('\n📋 London School TDD Results Summary:');
  console.log(`🔗 Contract Tests: ${testCounts.contractTests}`);
  console.log(`🤝 Interaction Tests: ${testCounts.interactionTests}`);
  console.log(`🎭 Behavior Tests: ${testCounts.behaviorTests}`);
  console.log(`🔌 Resource Leak Tests: ${testCounts.resourceLeakTests}`);
  console.log(`♻️  Lifecycle Tests: ${testCounts.lifecycleTests}`);

  const totalLondonSchoolTests = Object.values(testCounts).reduce((sum, count) => sum + count, 0);
  console.log(`📊 Total London School Tests: ${totalLondonSchoolTests}`);

  return results;
};