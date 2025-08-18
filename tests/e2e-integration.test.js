// E2E Integration Test for AgentLink
// Tests the complete flow from backend API to frontend display

// Using native fetch in Node.js 18+

async function runE2ETests() {
  console.log('🚀 Running AgentLink E2E Integration Tests...\n');
  
  let passedTests = 0;
  let totalTests = 0;
  
  const test = async (description, testFn) => {
    totalTests++;
    try {
      await testFn();
      console.log(`✅ ${description}`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${description}`);
      console.log(`   Error: ${error.message}\n`);
    }
  };

  // Test 1: Backend API Health
  await test('Backend API responds correctly', async () => {
    const response = await fetch('http://localhost:3000/api/v1/agent-posts');
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error('API response success is false');
    }
    
    if (!Array.isArray(data.data)) {
      throw new Error('Data is not an array');
    }
  });

  // Test 2: CORS Configuration
  await test('CORS allows frontend origin', async () => {
    const response = await fetch('http://localhost:3000/api/v1/agent-posts', {
      headers: { 'Origin': 'http://localhost:3001' }
    });
    
    const corsHeader = response.headers.get('access-control-allow-origin');
    if (!corsHeader || !corsHeader.includes('localhost:3001')) {
      throw new Error(`CORS header doesn't include frontend origin: ${corsHeader}`);
    }
  });

  // Test 3: Welcome Posts Exist
  await test('Welcome posts are available', async () => {
    const response = await fetch('http://localhost:3000/api/v1/agent-posts');
    const data = await response.json();
    
    const welcomePosts = data.data.filter(post => 
      post.authorAgent === 'get-to-know-you-agent'
    );
    
    if (welcomePosts.length < 5) {
      throw new Error(`Expected 5+ welcome posts, found ${welcomePosts.length}`);
    }
  });

  // Test 4: Post Data Structure
  await test('Posts have correct data structure', async () => {
    const response = await fetch('http://localhost:3000/api/v1/agent-posts');
    const data = await response.json();
    
    if (data.data.length === 0) {
      throw new Error('No posts found');
    }
    
    const post = data.data[0];
    const requiredFields = ['id', 'title', 'content', 'authorAgent', 'publishedAt', 'metadata'];
    
    for (const field of requiredFields) {
      if (!(field in post)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  });

  // Test 5: Frontend API Configuration
  await test('Frontend can connect to correct backend URL', async () => {
    // This tests that frontend would connect to :3000 instead of :3002
    const backendResponse = await fetch('http://localhost:3000/api/v1/agent-posts');
    if (backendResponse.status !== 200) {
      throw new Error('Backend not responding on correct port');
    }
    
    // Test that wrong port fails
    try {
      await fetch('http://localhost:3002/api/v1/agent-posts');
      throw new Error('Port 3002 should not be responding');
    } catch (error) {
      if (error.code !== 'ECONNREFUSED') {
        throw error;
      }
      // Expected behavior - port 3002 should fail
    }
  });

  // Test 6: Frontend Availability
  await test('Frontend server is running', async () => {
    const response = await fetch('http://localhost:3001');
    if (response.status !== 200) {
      throw new Error(`Frontend not responding: ${response.status}`);
    }
    
    const html = await response.text();
    if (!html.includes('Agent Feed')) {
      throw new Error('Frontend HTML does not contain expected title');
    }
  });

  // Test 7: API Response Time
  await test('API responds within acceptable time', async () => {
    const start = Date.now();
    const response = await fetch('http://localhost:3000/api/v1/agent-posts');
    const duration = Date.now() - start;
    
    if (duration > 2000) {
      throw new Error(`API too slow: ${duration}ms`);
    }
    
    if (response.status !== 200) {
      throw new Error(`API error: ${response.status}`);
    }
  });

  // Results Summary
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! AgentLink is working correctly.');
    return true;
  } else {
    console.log('🚨 Some tests failed. Check the errors above.');
    return false;
  }
}

// Run the tests
runE2ETests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});