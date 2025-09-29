/**
 * Quick validation script to test the API connectivity test setup
 * This script verifies that the test infrastructure is working correctly
 */

async function validateTestSetup() {
  console.log('🔍 Validating API Connectivity Test Setup...\n');

  const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

  // Import fetch for Node.js
  const { default: fetch } = await import('node-fetch');

  let allChecks = [];

  // Check 1: Backend Health
  try {
    console.log('1. Testing backend health endpoint...');
    const response = await fetch(`${API_BASE_URL}/api/health`, { timeout: 5000 });

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Backend health check passed');
      console.log(`   📊 Status: ${data.status || 'unknown'}`);
      allChecks.push({ name: 'Backend Health', status: 'PASS' });
    } else {
      console.log(`   ❌ Backend health check failed (${response.status})`);
      allChecks.push({ name: 'Backend Health', status: 'FAIL', error: `HTTP ${response.status}` });
    }
  } catch (error) {
    console.log(`   ❌ Backend health check failed: ${error.message}`);
    allChecks.push({ name: 'Backend Health', status: 'FAIL', error: error.message });
  }

  // Check 2: Agents endpoint
  try {
    console.log('\n2. Testing agents endpoint...');
    const response = await fetch(`${API_BASE_URL}/api/agents`, { timeout: 5000 });

    if (response.ok) {
      const agents = await response.json();
      console.log('   ✅ Agents endpoint accessible');
      console.log(`   📊 Returned ${agents.length} agents`);
      allChecks.push({ name: 'Agents Endpoint', status: 'PASS', data: `${agents.length} agents` });
    } else {
      console.log(`   ❌ Agents endpoint failed (${response.status})`);
      allChecks.push({ name: 'Agents Endpoint', status: 'FAIL', error: `HTTP ${response.status}` });
    }
  } catch (error) {
    console.log(`   ❌ Agents endpoint failed: ${error.message}`);
    allChecks.push({ name: 'Agents Endpoint', status: 'FAIL', error: error.message });
  }

  // Check 3: Agent Posts endpoint
  try {
    console.log('\n3. Testing agent-posts endpoint...');
    const response = await fetch(`${API_BASE_URL}/api/agent-posts`, { timeout: 5000 });

    if (response.ok) {
      const posts = await response.json();
      console.log('   ✅ Agent-posts endpoint accessible');
      console.log(`   📊 Returned ${posts.length} posts`);
      allChecks.push({ name: 'Agent Posts Endpoint', status: 'PASS', data: `${posts.length} posts` });
    } else {
      console.log(`   ❌ Agent-posts endpoint failed (${response.status})`);
      allChecks.push({ name: 'Agent Posts Endpoint', status: 'FAIL', error: `HTTP ${response.status}` });
    }
  } catch (error) {
    console.log(`   ❌ Agent-posts endpoint failed: ${error.message}`);
    allChecks.push({ name: 'Agent Posts Endpoint', status: 'FAIL', error: error.message });
  }

  // Check 4: CORS Headers
  try {
    console.log('\n4. Testing CORS configuration...');
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'OPTIONS',
      headers: { 'Origin': FRONTEND_URL },
      timeout: 5000
    });

    const corsHeader = response.headers.get('access-control-allow-origin');
    if (corsHeader) {
      console.log('   ✅ CORS headers present');
      console.log(`   📊 Allow-Origin: ${corsHeader}`);
      allChecks.push({ name: 'CORS Configuration', status: 'PASS', data: corsHeader });
    } else {
      console.log('   ⚠️ CORS headers not found (may still work)');
      allChecks.push({ name: 'CORS Configuration', status: 'WARN', error: 'No CORS headers' });
    }
  } catch (error) {
    console.log(`   ⚠️ CORS check failed: ${error.message}`);
    allChecks.push({ name: 'CORS Configuration', status: 'WARN', error: error.message });
  }

  // Check 5: Frontend accessibility (optional)
  try {
    console.log('\n5. Testing frontend accessibility...');
    const response = await fetch(FRONTEND_URL, { timeout: 5000 });

    if (response.ok) {
      console.log('   ✅ Frontend is accessible');
      allChecks.push({ name: 'Frontend Access', status: 'PASS' });
    } else {
      console.log(`   ⚠️ Frontend not accessible (${response.status}) - optional`);
      allChecks.push({ name: 'Frontend Access', status: 'WARN', error: `HTTP ${response.status}` });
    }
  } catch (error) {
    console.log(`   ⚠️ Frontend not accessible: ${error.message} - optional`);
    allChecks.push({ name: 'Frontend Access', status: 'WARN', error: error.message });
  }

  // Summary
  console.log('\n📊 Validation Summary');
  console.log('====================');

  const passed = allChecks.filter(c => c.status === 'PASS').length;
  const warned = allChecks.filter(c => c.status === 'WARN').length;
  const failed = allChecks.filter(c => c.status === 'FAIL').length;

  allChecks.forEach(check => {
    const icon = check.status === 'PASS' ? '✅' : check.status === 'WARN' ? '⚠️' : '❌';
    const extra = check.data ? ` (${check.data})` : check.error ? ` (${check.error})` : '';
    console.log(`${icon} ${check.name}: ${check.status}${extra}`);
  });

  console.log(`\nResults: ${passed} passed, ${warned} warnings, ${failed} failed`);

  if (failed === 0) {
    console.log('\n🎉 Test setup validation PASSED!');
    console.log('You can now run the full API connectivity test suite.');
    console.log('\nNext steps:');
    console.log('  ./tests/api-connectivity/run-api-tests.sh');
    return true;
  } else {
    console.log('\n💥 Test setup validation FAILED!');
    console.log('Please fix the failed checks before running tests.');
    console.log('\nTroubleshooting:');
    console.log('  - Ensure backend server is running: node simple-backend.js');
    console.log('  - Check if ports 3000 and 5173 are available');
    console.log('  - Verify database connectivity');
    return false;
  }
}

// Run validation
validateTestSetup()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Validation script error:', error);
    process.exit(1);
  });