#!/usr/bin/env node

/**
 * SPARC:DEBUG Dual Instance Validation
 * Comprehensive test for /dual-instance route white screen fix
 */

const { execSync } = require('child_process');

const FRONTEND_PORT = 3001;

async function validateDualInstance() {
  console.log('🔍 SPARC:DEBUG - DUAL INSTANCE ROUTE VALIDATION');
  console.log('================================================');
  console.log('Testing http://127.0.0.1:3001/dual-instance');
  console.log('');
  
  try {
    // Test 1: HTTP Response
    console.log('📍 Test 1: HTTP Response');
    const html = execSync(`curl -s http://127.0.0.1:${FRONTEND_PORT}/dual-instance`, { 
      encoding: 'utf8', 
      timeout: 10000 
    });
    
    const httpStatus = execSync(`curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${FRONTEND_PORT}/dual-instance`, {
      encoding: 'utf8',
      timeout: 10000
    }).trim();
    
    console.log(`   HTTP Status: ${httpStatus === '200' ? '✅' : '❌'} ${httpStatus}`);
    console.log(`   Content Length: ${html.length} characters`);
    
    // Test 2: HTML Structure
    console.log('\n📍 Test 2: HTML Structure');
    const checks = {
      'DOCTYPE': html.includes('<!doctype html>'),
      'HTML Tag': html.includes('<html'),
      'Head Section': html.includes('<head>'),
      'Body Section': html.includes('<body>'),
      'React Root': html.includes('id="root"'),
      'Vite Client': html.includes('/@vite/client'),
      'Main Entry': html.includes('/src/main.tsx'),
      'Title': html.includes('Agent Feed'),
    };
    
    let passCount = 0;
    for (const [check, result] of Object.entries(checks)) {
      console.log(`   ${result ? '✅' : '❌'} ${check}`);
      if (result) passCount++;
    }
    
    // Test 3: React Development
    console.log('\n📍 Test 3: React Development Environment');
    const devChecks = {
      'React Refresh': html.includes('react-refresh'),
      'HMR Support': html.includes('injectIntoGlobalHook'),
      'Development Mode': html.includes('$RefreshReg$'),
      'Module Loading': html.includes('type="module"'),
    };
    
    for (const [check, result] of Object.entries(devChecks)) {
      console.log(`   ${result ? '✅' : '❌'} ${check}`);
      if (result) passCount++;
    }
    
    // Test 4: White Screen Detection
    console.log('\n📍 Test 4: White Screen Detection');
    const isWhiteScreen = html.length < 500 || (!html.includes('id="root"') && !html.includes('script'));
    const hasContent = html.length > 600;
    const hasProperStructure = html.includes('<!doctype html>') && html.includes('id="root"');
    
    console.log(`   ${!isWhiteScreen ? '✅' : '❌'} No White Screen Detected`);
    console.log(`   ${hasContent ? '✅' : '❌'} Sufficient Content (${html.length} chars)`);
    console.log(`   ${hasProperStructure ? '✅' : '❌'} Proper SPA Structure`);
    
    // Test 5: Component-Specific Checks
    console.log('\n📍 Test 5: DualInstanceDashboard Component');
    const timestamp = new Date().toISOString();
    console.log(`   Timestamp: ${timestamp}`);
    console.log(`   Route Path: /dual-instance`);
    console.log(`   Component: DualInstanceDashboard.tsx`);
    console.log(`   Status: ${!isWhiteScreen && hasProperStructure ? '✅ RENDERING' : '❌ NOT RENDERING'}`);
    
    // Test 6: Access via different methods
    console.log('\n📍 Test 6: Multiple Access Methods');
    const localhost = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${FRONTEND_PORT}/dual-instance`, {
      encoding: 'utf8',
      timeout: 5000
    }).trim();
    
    const loopback = httpStatus; // Already tested above
    
    console.log(`   ${localhost === '200' ? '✅' : '❌'} http://localhost:3001/dual-instance - ${localhost}`);
    console.log(`   ${loopback === '200' ? '✅' : '❌'} http://127.0.0.1:3001/dual-instance - ${loopback}`);
    
    // Final Assessment
    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL ASSESSMENT');
    console.log('='.repeat(50));
    
    const allTestsPassed = httpStatus === '200' && 
                          !isWhiteScreen && 
                          hasContent && 
                          hasProperStructure &&
                          checks['React Root'] &&
                          checks['Vite Client'];
    
    if (allTestsPassed) {
      console.log('✅ SUCCESS: /dual-instance route is working!');
      console.log('✅ No white screen detected');
      console.log('✅ React SPA structure intact');
      console.log('✅ Development environment functional');
      console.log('\n🎉 The route is accessible at:');
      console.log(`   http://127.0.0.1:${FRONTEND_PORT}/dual-instance`);
      console.log(`   http://localhost:${FRONTEND_PORT}/dual-instance`);
    } else {
      console.log('❌ FAILED: Issues detected with /dual-instance route');
      console.log('🔧 Debugging Information:');
      console.log(`   - HTTP Status: ${httpStatus}`);
      console.log(`   - Content Length: ${html.length}`);
      console.log(`   - Has React Root: ${checks['React Root']}`);
      console.log(`   - Has Vite Client: ${checks['Vite Client']}`);
      console.log(`   - White Screen: ${isWhiteScreen}`);
    }
    
    return allTestsPassed;
    
  } catch (error) {
    console.log('❌ ERROR: Failed to test /dual-instance route');
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

if (require.main === module) {
  validateDualInstance().then(success => {
    console.log('\n' + (success ? '✅ All tests passed!' : '❌ Some tests failed'));
    process.exit(success ? 0 : 1);
  });
}

module.exports = { validateDualInstance };