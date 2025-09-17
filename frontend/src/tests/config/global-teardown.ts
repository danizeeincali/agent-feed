/**
 * Global Teardown for Comprehensive E2E Tests
 */

async function globalTeardown() {
  console.log('');
  console.log('🏁 Comprehensive E2E Test Suite Completed');
  console.log('📋 Results Summary:');
  console.log('  • Check test-results/comprehensive-e2e-report/index.html for detailed results');
  console.log('  • Console errors and performance metrics logged throughout tests');
  console.log('  • Video recordings available for failed tests in test-results/videos/');
  console.log('');
}

export default globalTeardown;