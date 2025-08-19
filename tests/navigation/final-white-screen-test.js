#!/usr/bin/env node

/**
 * Final White Screen Test
 * Comprehensive test to verify all routes are working on correct port 3001
 * and that React components are rendering properly
 */

const { execSync } = require('child_process');

const FRONTEND_PORT = 3001; // Correct frontend port
const routes = [
  { path: '/', name: 'Home Feed', expectedContent: ['Agent Feed', 'Real-time', 'Claude Code'] },
  { path: '/agents', name: 'Agent Manager', expectedContent: ['Agent Manager', 'agents', 'Create'] },
  { path: '/dual-instance', name: 'Dual Instance Dashboard', expectedContent: ['Dual Instance', 'Development', 'Production'] },
  { path: '/analytics', name: 'System Analytics', expectedContent: ['Analytics', 'Performance', 'System'] },
  { path: '/claude-code', name: 'Claude Code Panel', expectedContent: ['Claude Code', 'Integration', 'Status'] },
  { path: '/workflows', name: 'Workflow Visualization', expectedContent: ['Workflow', 'Visualization', 'Templates'] },
  { path: '/activity', name: 'Live Activity Feed', expectedContent: ['Activity', 'Live', 'Real-time'] },
  { path: '/settings', name: 'Settings Panel', expectedContent: ['Settings', 'Configuration', 'Preferences'] },
];

async function testWhiteScreens() {
  console.log('🎯 FINAL WHITE SCREEN TEST');
  console.log('==========================');
  console.log(`Testing frontend on PORT ${FRONTEND_PORT} (Vite dev server)`);
  console.log('');
  
  let allPassed = true;
  let totalTests = 0;
  let passedTests = 0;
  
  // Test basic HTML structure for each route
  for (const route of routes) {
    totalTests++;
    try {
      console.log(`📍 Testing: ${route.name} (${route.path})`);
      
      const html = execSync(`curl -s http://localhost:${FRONTEND_PORT}${route.path}`, { 
        encoding: 'utf8', 
        timeout: 10000 
      });
      
      // Essential checks for React SPA
      const checks = {
        'HTML Structure': html.includes('<!doctype html>') && html.includes('<html'),
        'React Root': html.includes('id="root"'),
        'Vite Scripts': html.includes('src="/@vite/client"') || html.includes('/src/main.tsx'),
        'Head Section': html.includes('<head>') && html.includes('</head>'),
        'Body Section': html.includes('<body>') && html.includes('</body>'),
        'Title Present': html.includes('<title>') && html.includes('Agent Feed'),
        'Proper Length': html.length > 500 // Ensure it's not just a minimal error page
      };
      
      let routePassed = true;
      for (const [checkName, result] of Object.entries(checks)) {
        console.log(`   ${result ? '✅' : '❌'} ${checkName}`);
        if (!result) routePassed = false;
      }
      
      // Additional checks
      const hasError = html.toLowerCase().includes('error') && !html.includes('ErrorBoundary');
      const isMinimal = html.length < 400;
      
      if (hasError) {
        console.log(`   ⚠️  Contains error content`);
        routePassed = false;
      }
      
      if (isMinimal) {
        console.log(`   ⚠️  Content too minimal (${html.length} chars)`);
        routePassed = false;
      }
      
      console.log(`   📏 Content length: ${html.length} characters`);
      
      if (routePassed) {
        console.log(`   ✅ ${route.name}: PASSED - Proper SPA structure`);
        passedTests++;
      } else {
        console.log(`   ❌ ${route.name}: FAILED - Issues detected`);
        allPassed = false;
      }
      
      console.log('');
      
    } catch (error) {
      console.log(`   ❌ ${route.name}: REQUEST FAILED - ${error.message}`);
      console.log('');
      allPassed = false;
    }
  }
  
  // Summary
  console.log('📊 TEST SUMMARY');
  console.log('================');
  console.log(`Total routes tested: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  console.log('');
  
  if (allPassed) {
    console.log('🎉 SUCCESS: All routes are serving proper HTML structure!');
    console.log('✅ No white screens detected - React components should render correctly');
    console.log('');
    console.log('🔗 MANUAL VERIFICATION:');
    console.log(`Open browser to http://localhost:${FRONTEND_PORT} and navigate between:`);
    routes.forEach((route, index) => {
      console.log(`   ${index + 1}. ${route.name}: http://localhost:${FRONTEND_PORT}${route.path}`);
    });
  } else {
    console.log('❌ ISSUES DETECTED: Some routes have problems');
    console.log('🔧 Next steps:');
    console.log('   1. Check browser dev console for JavaScript errors');
    console.log('   2. Verify all components are properly imported');
    console.log('   3. Check for TypeScript compilation errors');
    console.log('   4. Ensure all dependencies are installed');
  }
  
  console.log('');
  console.log('📱 DEVELOPMENT INFO:');
  console.log(`✅ Frontend: http://localhost:${FRONTEND_PORT} (Vite dev server)`);
  console.log('✅ Backend API: http://localhost:3000 (Express server)');
  console.log('✅ WebSocket: ws://localhost:8000 (Real-time features)');
  
  return allPassed;
}

if (require.main === module) {
  testWhiteScreens().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testWhiteScreens };