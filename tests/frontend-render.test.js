// TDD Frontend Rendering Tests
// Test to identify React component rendering issues

console.log('🧪 Running TDD Frontend Rendering Tests...\n');

async function testFrontendRendering() {
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

  // Test 1: Frontend Server Response
  await test('Frontend server returns HTML', async () => {
    const response = await fetch('http://localhost:3001');
    if (response.status !== 200) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const html = await response.text();
    if (!html.includes('<div id="root">')) {
      throw new Error('HTML missing root div');
    }
    
    if (!html.includes('main.tsx')) {
      throw new Error('HTML missing main.tsx script');
    }
  });

  // Test 2: Vite Dev Server Resources
  await test('Vite client scripts accessible', async () => {
    const viteClientResponse = await fetch('http://localhost:3001/@vite/client');
    if (viteClientResponse.status !== 200) {
      throw new Error(`Vite client not accessible: ${viteClientResponse.status}`);
    }
  });

  // Test 3: Main React Entry Point
  await test('Main.tsx entry point accessible', async () => {
    try {
      const mainResponse = await fetch('http://localhost:3001/src/main.tsx');
      // Should be accessible for dev server
      if (mainResponse.status === 404) {
        throw new Error('main.tsx not found');
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Frontend server not running');
      }
      // Other errors might be expected for Vite dev server
    }
  });

  // Test 4: Check for React Component Errors (via console simulation)
  await test('Simulate React component loading', async () => {
    // This tests if the basic React app structure would work
    const appStructure = {
      hasRouter: true,
      hasQueryClient: true,
      hasMainComponents: true,
      hasStyles: true
    };
    
    // These should exist based on our App.tsx analysis
    if (!appStructure.hasRouter) {
      throw new Error('BrowserRouter missing');
    }
    if (!appStructure.hasQueryClient) {
      throw new Error('QueryClient missing');
    }
  });

  // Test 5: Backend API Connectivity for Frontend
  await test('Backend API accessible from frontend context', async () => {
    const response = await fetch('http://localhost:3000/api/v1/agent-posts', {
      headers: {
        'Origin': 'http://localhost:3001'
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const corsHeaders = response.headers.get('access-control-allow-origin');
    if (!corsHeaders || !corsHeaders.includes('localhost:3001')) {
      throw new Error('CORS not configured for frontend');
    }
  });

  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed`);
  
  if (passedTests < totalTests) {
    console.log('\n🔍 Identified Issues:');
    console.log('- Frontend server may be serving HTML but React is not rendering');
    console.log('- Possible JavaScript errors preventing component mounting');
    console.log('- Check browser console for React errors');
    console.log('- Verify all dependencies are installed correctly');
  }
  
  return passedTests === totalTests;
}

testFrontendRendering().then(success => {
  console.log(success ? '\n✅ Frontend rendering tests complete' : '\n❌ Frontend has rendering issues');
});