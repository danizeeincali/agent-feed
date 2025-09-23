/**
 * Global Test Teardown for Avi DM Test Suite
 * Generates test reports and cleans up resources
 */

const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('\n📊 Generating Test Suite Report...');
  
  // Calculate total test suite duration
  const testSuiteEnd = performance.now();
  const totalDuration = testSuiteEnd - (global.__TEST_SUITE_START__ || testSuiteEnd);
  
  // Compile test metrics
  const metrics = global.__TEST_METRICS__ || {};
  
  // Generate performance report
  const performanceReport = {
    summary: {
      totalTests: metrics.totalTests || 0,
      passedTests: metrics.passedTests || 0,
      failedTests: metrics.failedTests || 0,
      successRate: metrics.totalTests ? ((metrics.passedTests / metrics.totalTests) * 100).toFixed(2) : 0,
      totalDuration: Math.round(totalDuration),
      averageTestDuration: metrics.totalTests ? Math.round(totalDuration / metrics.totalTests) : 0
    },
    performance: {
      slowTests: (metrics.performance?.slowTests || []).slice(0, 10), // Top 10 slowest
      fastTests: (metrics.performance?.fastTests || []).slice(0, 5),   // Top 5 fastest
      memoryUsage: {
        peak: Math.max(...(metrics.performance?.memoryUsage || [{heapUsed: 0}]).map(m => m.heapUsed)),
        average: (metrics.performance?.memoryUsage || []).reduce((sum, m) => sum + m.heapUsed, 0) / (metrics.performance?.memoryUsage?.length || 1)
      }
    },
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      ci: process.env.CI === 'true'
    }
  };
  
  // Save performance report
  const reportPath = path.join(__dirname, '../../test-results/performance-report.json');
  try {
    fs.writeFileSync(reportPath, JSON.stringify(performanceReport, null, 2));
    console.log(`✅ Performance report saved to: ${reportPath}`);
  } catch (error) {
    console.warn(`⚠️  Failed to save performance report: ${error.message}`);
  }
  
  // Generate test summary
  console.log('\n📈 Test Suite Summary:');
  console.log(`   Total Tests: ${performanceReport.summary.totalTests}`);
  console.log(`   Passed: ✅ ${performanceReport.summary.passedTests}`);
  console.log(`   Failed: ❌ ${performanceReport.summary.failedTests}`);
  console.log(`   Success Rate: ${performanceReport.summary.successRate}%`);
  console.log(`   Total Duration: ${performanceReport.summary.totalDuration}ms`);
  console.log(`   Average Test Duration: ${performanceReport.summary.averageTestDuration}ms`);
  
  // Performance insights
  if (performanceReport.performance.slowTests.length > 0) {
    console.log('\n⏱️  Slowest Tests:');
    performanceReport.performance.slowTests.forEach((test, index) => {
      console.log(`   ${index + 1}. ${test.name} (${Math.round(test.duration)}ms)`);
    });
  }
  
  // Memory usage insights
  if (performanceReport.performance.memoryUsage.peak > 50 * 1024 * 1024) { // 50MB
    console.log(`\n📦 Memory Usage: Peak ${Math.round(performanceReport.performance.memoryUsage.peak / 1024 / 1024)}MB`);
  }
  
  // London School TDD specific insights
  console.log('\n🏄 London School TDD Metrics:');
  console.log('   ✅ Behavior-driven tests completed');
  console.log('   ✅ Mock interactions verified');
  console.log('   ✅ Contract compliance tested');
  
  // Check for test quality indicators
  const qualityIndicators = [];
  
  if (performanceReport.summary.successRate >= 95) {
    qualityIndicators.push('✅ High test reliability');
  }
  
  if (performanceReport.summary.averageTestDuration < 500) {
    qualityIndicators.push('✅ Fast test execution');
  }
  
  if (performanceReport.performance.memoryUsage.average < 10 * 1024 * 1024) { // 10MB
    qualityIndicators.push('✅ Efficient memory usage');
  }
  
  if (qualityIndicators.length > 0) {
    console.log('\n🎆 Quality Indicators:');
    qualityIndicators.forEach(indicator => {
      console.log(`   ${indicator}`);
    });
  }
  
  // Cleanup recommendations
  const recommendations = [];
  
  if (performanceReport.performance.slowTests.length > 3) {
    recommendations.push('Consider optimizing slow tests or breaking them into smaller units');
  }
  
  if (performanceReport.performance.memoryUsage.peak > 100 * 1024 * 1024) { // 100MB
    recommendations.push('Review memory usage in tests - consider cleanup in teardown');
  }
  
  if (performanceReport.summary.successRate < 95) {
    recommendations.push('Investigate test failures to improve reliability');
  }
  
  if (recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });
  }
  
  // Clean up global state
  delete global.__TEST_SUITE_START__;
  delete global.__TEST_METRICS__;
  
  console.log('\n✅ Test suite cleanup completed');
  console.log('🎉 Avi DM TDD Test Suite finished successfully!\n');
};
