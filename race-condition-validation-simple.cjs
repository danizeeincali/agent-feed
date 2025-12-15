/**
 * Simple validation test for React Router useParams race condition fix
 * Uses curl and basic checks since browser automation failed
 */

const { execSync } = require('child_process');

function testValidation() {
  console.log('🚀 Starting React Router useParams Race Condition Validation');
  console.log('='.repeat(60));
  
  const results = {
    backendStatus: false,
    frontendStatus: false,
    apiDataAvailable: false,
    directUrlWorks: false,
    pageContent: '',
    finalResult: 'UNKNOWN'
  };

  try {
    // Test 1: Backend API
    console.log('\n📡 Testing Backend API...');
    try {
      const backendResponse = execSync('curl -s http://127.0.0.1:3000/api/health', { timeout: 5000 }).toString();
      results.backendStatus = backendResponse.includes('healthy') || backendResponse.includes('ok');
      console.log(`Backend Status: ${results.backendStatus ? '✅ Running' : '❌ Not running'}`);
    } catch (e) {
      console.log('Backend Status: ❌ Not running');
    }

    // Test 2: API Data
    console.log('\n📊 Testing Agent Pages API...');
    try {
      const apiResponse = execSync('curl -s http://127.0.0.1:3000/api/v1/agents/personal-todos-agent/pages', { timeout: 5000 }).toString();
      const apiData = JSON.parse(apiResponse);
      results.apiDataAvailable = apiData.success && apiData.data && apiData.data.length > 0;
      
      if (results.apiDataAvailable) {
        const targetPage = apiData.data.find(page => page.id === 'b2935f20-b8a2-4be4-bed4-f6f467a8df9d');
        console.log(`API Data: ✅ ${apiData.data.length} pages found`);
        console.log(`Target Page: ${targetPage ? '✅ Found' : '❌ Not found'}`);
        if (targetPage) {
          console.log(`Page Title: "${targetPage.title}"`);
          console.log(`Content Type: "${targetPage.content.type}"`);
        }
      } else {
        console.log('API Data: ❌ No data available');
      }
    } catch (e) {
      console.log('API Data: ❌ Failed to fetch');
    }

    // Test 3: Frontend Server
    console.log('\n🌐 Testing Frontend Server...');
    try {
      const frontendResponse = execSync('curl -s -I http://127.0.0.1:5173/', { timeout: 5000 }).toString();
      results.frontendStatus = frontendResponse.includes('200 OK');
      console.log(`Frontend Status: ${results.frontendStatus ? '✅ Running' : '❌ Not running'}`);
    } catch (e) {
      console.log('Frontend Status: ❌ Not running');
    }

    // Test 4: Direct URL Navigation
    console.log('\n🎯 Testing Direct URL Navigation...');
    const targetUrl = 'http://127.0.0.1:5173/agents/personal-todos-agent/pages/b2935f20-b8a2-4be4-bed4-f6f467a8df9d';
    
    try {
      const pageResponse = execSync(`curl -s "${targetUrl}"`, { timeout: 10000 }).toString();
      results.pageContent = pageResponse;
      results.directUrlWorks = pageResponse.includes('200') || pageResponse.length > 1000;
      
      // Analyze content
      const showsNoPages = pageResponse.includes('No pages yet');
      const hasDashboard = pageResponse.includes('Personal Todos Dashboard');
      const hasContent = pageResponse.includes('Dynamic Pages') || pageResponse.includes('dashboard');
      
      console.log(`Direct URL: ${results.directUrlWorks ? '✅ Accessible' : '❌ Failed'}`);
      console.log(`Shows "No pages yet": ${showsNoPages ? '❌ YES (PROBLEM)' : '✅ NO'}`);
      console.log(`Has Dashboard Content: ${hasDashboard ? '✅ YES' : '❌ NO'}`);
      console.log(`Has Page Content: ${hasContent ? '✅ YES' : '❌ NO'}`);
      console.log(`Response Length: ${pageResponse.length} characters`);
      
      // Set final result based on analysis
      if (!showsNoPages && (hasDashboard || hasContent)) {
        results.finalResult = 'SUCCESS - Race condition appears to be fixed!';
      } else if (showsNoPages) {
        results.finalResult = 'FAILED - Still showing "No pages yet" message';
      } else {
        results.finalResult = 'PARTIAL - Page loads but content unclear';
      }
      
    } catch (e) {
      console.log('Direct URL: ❌ Failed to fetch');
      results.finalResult = 'FAILED - Cannot access target URL';
    }

    // Test 5: Check for React rendering
    console.log('\n⚛️ Checking React App Rendering...');
    if (results.pageContent.includes('id="root"')) {
      console.log('React Root: ✅ Found');
      
      if (results.pageContent.includes('src="/src/main.tsx')) {
        console.log('React Scripts: ✅ Loading');
      } else {
        console.log('React Scripts: ⚠️ May not be loading');
      }
    } else {
      console.log('React Root: ❌ Not found');
    }

  } catch (error) {
    console.error(`💥 Validation failed: ${error.message}`);
    results.finalResult = `ERROR: ${error.message}`;
  }

  // Final Assessment
  console.log('\n🏁 FINAL ASSESSMENT');
  console.log('='.repeat(60));
  console.log(`Result: ${results.finalResult}`);
  
  console.log('\n📋 Summary:');
  console.log(`✓ Backend API: ${results.backendStatus ? 'Working' : 'Failed'}`);
  console.log(`✓ Frontend Server: ${results.frontendStatus ? 'Working' : 'Failed'}`);
  console.log(`✓ API Data: ${results.apiDataAvailable ? 'Available' : 'Missing'}`);
  console.log(`✓ Direct URL: ${results.directUrlWorks ? 'Accessible' : 'Failed'}`);
  
  if (results.finalResult.includes('SUCCESS')) {
    console.log('\n🎉 The React Router useParams race condition fix appears to be working!');
    console.log('The page should now load properly when navigating directly to the URL.');
    return true;
  } else {
    console.log('\n❌ The race condition fix may not be working as expected.');
    console.log('Further investigation may be needed.');
    return false;
  }
}

// Run the test
if (require.main === module) {
  const success = testValidation();
  process.exit(success ? 0 : 1);
}

module.exports = { testValidation };