// Global teardown for Playwright tests
async function globalTeardown(config) {
  console.log('Starting global teardown for Playwright tests...');

  // Add any cleanup logic here
  // For example: cleaning up test data, closing connections, etc.

  console.log('Global teardown completed');
}

module.exports = globalTeardown;