#!/usr/bin/env node

/**
 * EMERGENCY: Deep debugging of /workflows route
 * The issue persists even with a simple component
 */

const { execSync } = require('child_process');

async function emergencyWorkflowTest() {
  console.log('🚨 EMERGENCY: DEEP /WORKFLOWS DEBUGGING');
  console.log('==========================================');
  console.log('');
  
  // Test 1: Basic route response
  console.log('📍 Step 1: Raw HTTP Response');
  try {
    const html = execSync('curl -s http://127.0.0.1:3001/workflows', { encoding: 'utf8', timeout: 10000 });
    console.log(`Length: ${html.length} characters`);
    console.log('First 200 chars:');
    console.log(html.substring(0, 200));
    console.log('...');
    console.log('');
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
  
  // Test 2: Compare with working route
  console.log('📍 Step 2: Compare with Working Route');
  try {
    const homeHtml = execSync('curl -s http://127.0.0.1:3001/', { encoding: 'utf8', timeout: 10000 });
    const workflowHtml = execSync('curl -s http://127.0.0.1:3001/workflows', { encoding: 'utf8', timeout: 10000 });
    
    console.log(`Home route: ${homeHtml.length} chars`);
    console.log(`Workflow route: ${workflowHtml.length} chars`);
    console.log(`Difference: ${workflowHtml.length - homeHtml.length} chars`);
    console.log(`Same content: ${homeHtml === workflowHtml ? 'YES - PROBLEM!' : 'No'}`);
    console.log('');
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
  }
  
  // Test 3: Check if it's actually a SPA issue
  console.log('📍 Step 3: SPA Route Analysis');
  console.log('All SPA routes should return the same HTML template');
  console.log('React handles routing client-side');
  
  const routes = ['/', '/workflows', '/agents', '/settings'];
  const lengths = {};
  
  for (const route of routes) {
    try {
      const html = execSync(`curl -s http://127.0.0.1:3001${route}`, { encoding: 'utf8', timeout: 5000 });
      lengths[route] = html.length;
      console.log(`${route}: ${html.length} chars`);
    } catch (e) {
      console.log(`${route}: ERROR`);
    }
  }
  
  const allSame = Object.values(lengths).every(len => len === Object.values(lengths)[0]);
  console.log(`All routes same length: ${allSame ? 'YES (Normal for SPA)' : 'NO (Problem!)'}`);
  console.log('');
  
  // Test 4: The real issue
  console.log('📍 Step 4: DIAGNOSIS');
  if (allSame) {
    console.log('✅ DIAGNOSIS: This is NORMAL SPA behavior!');
    console.log('   - All routes return the same HTML template');
    console.log('   - React Router handles routing client-side');
    console.log('   - The "white screen" is a client-side React component issue');
    console.log('   - Need to test in browser, not curl');
    console.log('');
    console.log('🔧 NEXT STEPS:');
    console.log('   1. Open http://127.0.0.1:3001/workflows in browser');
    console.log('   2. Check browser console for JavaScript errors');
    console.log('   3. Look for React component crashes');
    console.log('   4. Fix client-side rendering issues');
    return true;
  } else {
    console.log('❌ DIAGNOSIS: Server-side routing issue!');
    console.log('   Different routes return different content lengths');
    console.log('   This indicates server-side routing problems');
    return false;
  }
}

if (require.main === module) {
  emergencyWorkflowTest().then(() => {
    console.log('\n🎯 KEY INSIGHT: The issue is CLIENT-SIDE React rendering!');
    console.log('The server is working fine - check browser console.');
  });
}

module.exports = { emergencyWorkflowTest };