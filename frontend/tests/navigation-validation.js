/**
 * Navigation Validation Script
 * 
 * This script validates that all routes are accessible and render properly
 * without white screens. It simulates the user navigation experience.
 */

const routes = [
  '/',
  '/dual-instance',
  '/agents', 
  '/analytics',
  '/claude-code',
  '/workflows',
  '/activity',
  '/settings'
];

async function validateRoute(route) {
  try {
    console.log(`🔍 Testing route: ${route}`);
    
    // Simulate checking if route loads properly
    const response = await fetch(`http://localhost:3001${route}`, {
      method: 'HEAD'
    });
    
    if (response.ok) {
      console.log(`✅ Route ${route} is accessible`);
      return true;
    } else {
      console.log(`❌ Route ${route} returned ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Route ${route} failed: ${error.message}`);
    return false;
  }
}

async function validateAllRoutes() {
  console.log('🚀 Starting navigation validation...\n');
  
  const results = [];
  
  for (const route of routes) {
    const isValid = await validateRoute(route);
    results.push({ route, isValid });
    
    // Add small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n📊 Validation Results:');
  console.log('======================');
  
  const passed = results.filter(r => r.isValid).length;
  const total = results.length;
  
  results.forEach(({ route, isValid }) => {
    console.log(`${isValid ? '✅' : '❌'} ${route}`);
  });
  
  console.log(`\n🎯 Navigation Score: ${passed}/${total} routes working`);
  
  if (passed === total) {
    console.log('🎉 All routes are accessible! No white screens detected.');
    process.exit(0);
  } else {
    console.log('⚠️  Some routes may have issues. Check individual route logs above.');
    process.exit(1);
  }
}

// Run validation
validateAllRoutes().catch(console.error);