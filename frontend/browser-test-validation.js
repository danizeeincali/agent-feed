// Comprehensive Browser Validation Script
// This script validates WebSocket connections and UI functionality

console.log('🚀 Starting comprehensive production validation...');

// Test 1: WebSocket Connection Validation
async function testWebSocketConnection() {
  console.log('\n📡 Testing WebSocket Connection...');
  
  return new Promise((resolve) => {
    const ws = new WebSocket('ws://localhost:8080');
    const timeout = setTimeout(() => {
      console.log('❌ WebSocket connection timeout');
      resolve({ success: false, error: 'Connection timeout' });
    }, 5000);
    
    ws.onopen = () => {
      console.log('✅ WebSocket connection established');
      clearTimeout(timeout);
      ws.close();
      resolve({ success: true });
    };
    
    ws.onerror = (error) => {
      console.log('❌ WebSocket connection error:', error);
      clearTimeout(timeout);
      resolve({ success: false, error: error.message || 'Connection failed' });
    };
  });
}

// Test 2: Frontend Response Validation
async function testFrontendResponse() {
  console.log('\n🌐 Testing Frontend Response...');
  
  try {
    const response = await fetch('http://localhost:3000');
    const html = await response.text();
    
    const hasReact = html.includes('react') || html.includes('React');
    const hasVite = html.includes('vite') || html.includes('Vite');
    const hasWebSocket = html.includes('websocket') || html.includes('WebSocket');
    
    console.log(`Frontend Status: ${response.status}`);
    console.log(`Has React: ${hasReact}`);
    console.log(`Has Vite: ${hasVite}`);
    console.log(`Has WebSocket refs: ${hasWebSocket}`);
    
    return {
      success: response.status === 200,
      status: response.status,
      hasReact,
      hasVite,
      hasWebSocket
    };
  } catch (error) {
    console.log('❌ Frontend request failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 3: Backend Health Check
async function testBackendHealth() {
  console.log('\n🏥 Testing Backend Health...');
  
  try {
    const healthCheck = await fetch('http://localhost:8080/health');
    const healthData = await healthCheck.json();
    
    console.log('Backend Health:', healthData);
    
    return {
      success: healthCheck.status === 200,
      data: healthData
    };
  } catch (error) {
    console.log('❌ Backend health check failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 4: API Endpoints Validation
async function testAPIEndpoints() {
  console.log('\n🔌 Testing API Endpoints...');
  
  const endpoints = [
    'http://localhost:8080/api/v1/claude-live/prod/agents',
    'http://localhost:8080/api/v1/claude-live/prod/status'
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      
      console.log(`✅ ${endpoint}: ${response.status}`);
      results.push({
        endpoint,
        success: response.status < 400,
        status: response.status,
        data
      });
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.message}`);
      results.push({
        endpoint,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

// Test 5: Performance Metrics
async function testPerformanceMetrics() {
  console.log('\n⚡ Testing Performance Metrics...');
  
  const startTime = performance.now();
  
  // Test frontend load time
  const frontendStart = performance.now();
  const frontendResponse = await fetch('http://localhost:3000');
  const frontendTime = performance.now() - frontendStart;
  
  // Test backend response time
  const backendStart = performance.now();
  try {
    const backendResponse = await fetch('http://localhost:8080/health');
    const backendTime = performance.now() - backendStart;
    
    console.log(`Frontend load time: ${frontendTime.toFixed(2)}ms`);
    console.log(`Backend response time: ${backendTime.toFixed(2)}ms`);
    
    return {
      frontendTime,
      backendTime,
      totalTime: performance.now() - startTime
    };
  } catch (error) {
    console.log('Backend performance test failed:', error.message);
    return {
      frontendTime,
      backendTime: null,
      totalTime: performance.now() - startTime,
      error: error.message
    };
  }
}

// Main validation function
async function runComprehensiveValidation() {
  console.log('🎯 COMPREHENSIVE PRODUCTION VALIDATION REPORT');
  console.log('=' .repeat(60));
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };
  
  // Run all tests
  results.tests.websocket = await testWebSocketConnection();
  results.tests.frontend = await testFrontendResponse();
  results.tests.backend = await testBackendHealth();
  results.tests.endpoints = await testAPIEndpoints();
  results.tests.performance = await testPerformanceMetrics();
  
  // Calculate overall success rate
  const totalTests = Object.keys(results.tests).length;
  const successfulTests = Object.values(results.tests).filter(test => 
    Array.isArray(test) ? test.every(t => t.success) : test.success
  ).length;
  
  results.successRate = (successfulTests / totalTests) * 100;
  
  console.log('\n📊 VALIDATION SUMMARY:');
  console.log('=' .repeat(40));
  console.log(`Overall Success Rate: ${results.successRate.toFixed(1)}%`);
  console.log(`Successful Tests: ${successfulTests}/${totalTests}`);
  
  // Detailed results
  console.log('\n📋 DETAILED RESULTS:');
  for (const [testName, result] of Object.entries(results.tests)) {
    const status = Array.isArray(result) 
      ? result.every(r => r.success) ? '✅' : '❌'
      : result.success ? '✅' : '❌';
    console.log(`${status} ${testName}: ${Array.isArray(result) ? `${result.filter(r => r.success).length}/${result.length} passed` : result.success ? 'PASS' : 'FAIL'}`);
  }
  
  console.log('\n🎉 VALIDATION COMPLETE');
  
  return results;
}

// Run validation
runComprehensiveValidation().catch(console.error);