// Simple test to check if server is responding and app is loading
console.log('🔍 Testing server and app loading...');

async function simpleTest() {
  try {
    // Test 1: Check server response
    const response = await fetch('http://localhost:3001/');
    const html = await response.text();
    
    console.log(`📋 Server status: ${response.status}`);
    console.log(`📦 HTML length: ${html.length} characters`);
    
    // Test 2: Check if main.tsx is accessible
    const mainResponse = await fetch('http://localhost:3001/src/main.tsx');
    const mainContent = await mainResponse.text();
    
    console.log(`📋 main.tsx status: ${mainResponse.status}`);
    console.log(`📦 main.tsx length: ${mainContent.length} characters`);
    
    if (mainResponse.status === 200 && mainContent.includes('React')) {
      console.log('✅ React app files are loading correctly');
    } else {
      console.log('❌ Issue with React app files');
    }
    
    // Test 3: Look for key elements in HTML
    const hasRoot = html.includes('id="root"');
    const hasMainScript = html.includes('/src/main.tsx');
    
    console.log(`🔍 HTML structure check:`);
    console.log(`  - Root element: ${hasRoot ? '✅' : '❌'}`);
    console.log(`  - Main script: ${hasMainScript ? '✅' : '❌'}`);
    
    if (hasRoot && hasMainScript && response.status === 200) {
      console.log('🎉 SUCCESS: Server is working and HTML is correct');
      console.log('🎯 The white screen issue may be in React component rendering, not server setup');
    } else {
      console.log('💥 FAILURE: Server or HTML structure issues detected');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

simpleTest();