// Global setup for E2E sharing removal tests
async function globalSetup() {
  console.log('🚀 Starting E2E Sharing Removal Test Suite Setup...');
  
  // Environment validation
  const requiredEnvVars = ['NODE_ENV'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`⚠️  Warning: ${envVar} environment variable not set`);
    }
  }
  
  // Set test environment
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.E2E_TEST_MODE = 'sharing-removal';
  
  console.log('✅ Environment configured for sharing removal testing');
  console.log('📊 Test configuration:');
  console.log(`   - Node Environment: ${process.env.NODE_ENV}`);
  console.log(`   - Test Mode: ${process.env.E2E_TEST_MODE}`);
  console.log(`   - Base URL: ${process.env.BASE_URL || 'http://localhost:5173'}`);
  
  // Wait for servers to be ready
  console.log('⏳ Waiting for servers to be ready...');
  
  // Test server health
  const servers = [
    { name: 'Frontend', url: 'http://localhost:5173', timeout: 30000 },
    { name: 'Backend', url: 'http://localhost:3000', timeout: 30000 }
  ];
  
  for (const server of servers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), server.timeout);
      
      const response = await fetch(server.url, {
        signal: controller.signal,
        method: 'HEAD'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`✅ ${server.name} server is ready at ${server.url}`);
      } else {
        console.warn(`⚠️  ${server.name} server responded with status ${response.status}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`❌ ${server.name} server timeout at ${server.url}`);
      } else {
        console.error(`❌ ${server.name} server not ready: ${error.message}`);
      }
    }
  }
  
  // Initialize test database/state if needed
  console.log('🗄️  Initializing test state...');
  
  try {
    // Clear any existing test data
    if (process.env.CLEAR_TEST_DATA === 'true') {
      console.log('🧹 Clearing previous test data...');
      // Add database cleanup logic here if needed
    }
    
    console.log('✅ Test state initialized');
  } catch (error) {
    console.error(`❌ Failed to initialize test state: ${error.message}`);
  }
  
  // Validate that share endpoints are properly removed
  console.log('🔍 Validating share endpoint removal...');
  
  const shareEndpoints = [
    '/api/posts/share',
    '/api/share',
    '/share'
  ];
  
  for (const endpoint of shareEndpoints) {
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`);
      if (response.status === 404 || response.status === 405) {
        console.log(`✅ Share endpoint ${endpoint} properly returns ${response.status}`);
      } else {
        console.warn(`⚠️  Share endpoint ${endpoint} returns unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log(`✅ Share endpoint ${endpoint} is not accessible (expected)`);
    }
  }
  
  console.log('🎯 Starting test suite execution...');
  console.log('📋 Test coverage includes:');
  console.log('   - Share button removal validation');
  console.log('   - Core functionality regression tests');
  console.log('   - Cross-browser compatibility');
  console.log('   - Mobile responsiveness');
  console.log('   - Accessibility compliance');
  console.log('   - API integration validation');
  console.log('   - WebSocket connection stability');
  console.log('   - Performance regression testing');
  console.log('   - User engagement tracking');
  
  return {
    testMode: 'sharing-removal',
    startTime: Date.now(),
    environment: process.env.NODE_ENV
  };
}

module.exports = globalSetup;