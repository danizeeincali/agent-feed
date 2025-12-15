#!/usr/bin/env node

/**
 * Test script to verify frontend can access all Claude SDK analytics API endpoints
 */

const endpoints = [
  '/api/claude-sdk/cost-tracking',
  '/api/claude-sdk/analytics',
  '/api/claude-sdk/token-usage',
  '/api/claude-sdk/optimization',
  '/api/filter-data'
];

const API_BASE_URL = 'http://localhost:3000';

async function testEndpoint(endpoint) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173' // Simulate frontend origin
      }
    });

    const contentType = response.headers.get('content-type');
    const corsHeader = response.headers.get('access-control-allow-origin');

    let data;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      endpoint,
      status: response.status,
      ok: response.ok,
      contentType,
      corsEnabled: !!corsHeader,
      corsOrigin: corsHeader,
      hasData: !!data,
      dataType: typeof data,
      success: data?.success,
      responseSize: JSON.stringify(data).length
    };
  } catch (error) {
    return {
      endpoint,
      status: 'ERROR',
      error: error.message,
      ok: false
    };
  }
}

async function runTests() {
  console.log('🧪 Testing Claude SDK Analytics API Endpoints\n');
  console.log('Frontend Origin: http://localhost:5173');
  console.log('Backend URL: ' + API_BASE_URL);
  console.log('=' .repeat(60));

  const results = [];

  for (const endpoint of endpoints) {
    console.log(`\n📡 Testing: ${endpoint}`);
    const result = await testEndpoint(endpoint);
    results.push(result);

    if (result.ok) {
      console.log(`✅ Status: ${result.status}`);
      console.log(`✅ CORS: ${result.corsEnabled ? '✓' : '✗'} (${result.corsOrigin || 'None'})`);
      console.log(`✅ Content-Type: ${result.contentType}`);
      console.log(`✅ Response Size: ${result.responseSize} bytes`);
      console.log(`✅ Success Field: ${result.success}`);
    } else {
      console.log(`❌ Status: ${result.status}`);
      console.log(`❌ Error: ${result.error || 'Unknown error'}`);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('📊 SUMMARY');
  console.log('=' .repeat(60));

  const successful = results.filter(r => r.ok);
  const failed = results.filter(r => !r.ok);
  const corsEnabled = results.filter(r => r.corsEnabled);

  console.log(`Total Endpoints: ${results.length}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`🌐 CORS Enabled: ${corsEnabled.length}`);

  if (failed.length > 0) {
    console.log('\n❌ FAILED ENDPOINTS:');
    failed.forEach(result => {
      console.log(`  - ${result.endpoint}: ${result.error || result.status}`);
    });
  }

  const allWorking = successful.length === results.length;
  const allCorsEnabled = corsEnabled.length === results.length;

  console.log('\n🎯 FRONTEND COMPATIBILITY:');
  console.log(`All endpoints accessible: ${allWorking ? '✅ YES' : '❌ NO'}`);
  console.log(`CORS properly configured: ${allCorsEnabled ? '✅ YES' : '❌ NO'}`);

  if (allWorking && allCorsEnabled) {
    console.log('\n🎉 All tests passed! Frontend should be able to access all endpoints.');
  } else {
    console.log('\n⚠️  Some issues found. Check failed endpoints above.');
  }

  return { allWorking, allCorsEnabled, results };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests, testEndpoint };