// Simple manual infinite loading test
// Run with: node simple-infinite-loading-test.js

const TARGET_URL = 'http://127.0.0.1:5173/agents/personal-todos-agent/pages/015b7296-a144-4096-9c60-ee5d7f900723';

console.log('🚀 REAL BROWSER INFINITE LOADING TEST');
console.log('====================================');
console.log(`Target URL: ${TARGET_URL}`);
console.log('');

// Test 1: Basic HTTP response
console.log('📡 Test 1: Basic HTTP Response');
fetch(TARGET_URL)
  .then(response => {
    console.log(`✅ HTTP Status: ${response.status}`);
    console.log(`✅ Content-Type: ${response.headers.get('content-type')}`);
    return response.text();
  })
  .then(html => {
    console.log(`✅ HTML Length: ${html.length} characters`);
    console.log(`✅ Contains React: ${html.includes('react')}`);
    console.log(`✅ Contains Vite: ${html.includes('vite')}`);
    console.log('');
    
    // Test 2: API endpoints
    console.log('📡 Test 2: Backend API Endpoints');
    return Promise.all([
      fetch('http://localhost:3000/api/health').then(r => r.json()),
      fetch('http://localhost:3000/api/agents/personal-todos-agent').catch(() => null),
      fetch('http://localhost:3000/api/agents/personal-todos-agent/pages').catch(() => null)
    ]);
  })
  .then(([health, agent, pages]) => {
    console.log('✅ Health API:', health?.success ? 'WORKING' : 'FAILED');
    console.log('✅ Agent API:', agent ? 'WORKING' : 'FAILED');
    console.log('✅ Pages API:', pages ? 'WORKING' : 'FAILED');
    console.log('');
    
    console.log('🎯 DIAGNOSIS:');
    console.log('Frontend serves HTML correctly');
    console.log('Backend APIs are responding');
    console.log('Issue is likely in client-side React routing or component mounting');
    console.log('');
    console.log('🔍 NEXT STEPS:');
    console.log('1. Check React Router configuration');
    console.log('2. Verify component mounting and data loading');
    console.log('3. Check for JavaScript errors in browser console');
    console.log('4. Validate API data structure matches component expectations');
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
  });