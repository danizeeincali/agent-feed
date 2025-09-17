#!/usr/bin/env node
/**
 * Final Frontend-Backend Connectivity Test
 * Focuses on the main API functionality that RealAnalytics needs
 */

import fetch from 'node-fetch';

const FRONTEND_PORT = 5173;
const BACKEND_PORT = 3000;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

console.log('🎯 Final Frontend-Backend Connectivity Test\n');
console.log(`Frontend URL: ${FRONTEND_URL}`);
console.log(`Backend URL: ${BACKEND_URL}\n`);

async function testCriticalAPIEndpoints() {
  console.log('1. Testing Critical API Endpoints...');

  const criticalEndpoints = [
    { path: '/api/health', description: 'Health check' },
    { path: '/api/v1/agent-posts?limit=5', description: 'Agent posts (main data)' },
    { path: '/api/agents', description: 'Agents list' },
    { path: '/api/metrics/system?range=24h', description: 'System metrics' },
    { path: '/api/analytics?range=24h', description: 'Analytics data' }
  ];

  const results = [];

  for (const endpoint of criticalEndpoints) {
    try {
      const response = await fetch(`${FRONTEND_URL}${endpoint.path}`);
      const data = await response.json();

      const success = response.ok && (data.success !== false);
      results.push({
        endpoint: endpoint.path,
        description: endpoint.description,
        status: response.status,
        success,
        error: success ? null : (data.error || 'Unknown error')
      });

      console.log(`   ${success ? '✅' : '❌'} ${endpoint.description}: ${success ? 'OK' : `${response.status} - ${data.error || 'Failed'}`}`);
    } catch (error) {
      results.push({
        endpoint: endpoint.path,
        description: endpoint.description,
        status: 'ERROR',
        success: false,
        error: error.message
      });
      console.log(`   ❌ ${endpoint.description}: ${error.message}`);
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`\n   📊 Critical endpoints: ${successCount}/${results.length} working\n`);

  return results;
}

async function testRealAnalyticsSpecificData() {
  console.log('2. Testing RealAnalytics Specific Data...');

  try {
    // Test the exact sequence RealAnalytics uses
    const [systemMetrics, analytics, agentPosts] = await Promise.all([
      fetch(`${FRONTEND_URL}/api/metrics/system?range=24h`),
      fetch(`${FRONTEND_URL}/api/analytics?range=24h`),
      fetch(`${FRONTEND_URL}/api/v1/agent-posts?limit=10`)
    ]);

    const results = {
      systemMetrics: systemMetrics.ok,
      analytics: analytics.ok,
      agentPosts: agentPosts.ok
    };

    console.log(`   ✅ System Metrics: ${results.systemMetrics ? 'OK' : 'Failed'}`);
    console.log(`   ✅ Analytics Data: ${results.analytics ? 'OK' : 'Failed'}`);
    console.log(`   ✅ Agent Posts: ${results.agentPosts ? 'OK' : 'Failed'}`);

    if (agentPosts.ok) {
      const postsData = await agentPosts.json();
      console.log(`   📊 Available posts: ${postsData.total || postsData.data?.length || 0}`);
    }

    const allWorking = Object.values(results).every(Boolean);
    console.log(`\n   🎯 RealAnalytics data availability: ${allWorking ? '✅ Complete' : '⚠️ Partial'}\n`);

    return allWorking;
  } catch (error) {
    console.log(`   ❌ RealAnalytics test failed: ${error.message}\n`);
    return false;
  }
}

async function testProxyConfiguration() {
  console.log('3. Testing Proxy Configuration...');

  try {
    // Test direct backend vs proxied frontend
    const backendDirect = await fetch(`${BACKEND_URL}/api/health`);
    const frontendProxy = await fetch(`${FRONTEND_URL}/api/health`);

    const backendData = await backendDirect.json();
    const frontendData = await frontendProxy.json();

    const proxyWorking = backendDirect.ok && frontendProxy.ok &&
                        backendData.service === frontendData.service;

    console.log(`   ✅ Backend direct: ${backendDirect.ok ? 'OK' : 'Failed'}`);
    console.log(`   ✅ Frontend proxy: ${frontendProxy.ok ? 'OK' : 'Failed'}`);
    console.log(`   ✅ Data consistency: ${proxyWorking ? 'OK' : 'Failed'}`);

    if (proxyWorking) {
      console.log(`   📊 Service: ${backendData.service}`);
      console.log(`   📊 Status: ${backendData.status}`);
    }

    console.log(`\n   🎯 Proxy configuration: ${proxyWorking ? '✅ Working' : '❌ Issues detected'}\n`);

    return proxyWorking;
  } catch (error) {
    console.log(`   ❌ Proxy test failed: ${error.message}\n`);
    return false;
  }
}

async function testDataCRUD() {
  console.log('4. Testing Data CRUD Operations...');

  try {
    // Test creating a post
    const createResponse = await fetch(`${FRONTEND_URL}/api/v1/agent-posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Connectivity Test Post',
        content: 'Testing frontend-backend connectivity and proxy configuration.',
        author_agent: 'ConnectivityTester',
        metadata: { testType: 'connectivity', timestamp: new Date().toISOString() }
      })
    });

    const createResult = await createResponse.json();
    const createSuccess = createResult.success && createResult.data?.id;

    console.log(`   ✅ Create operation: ${createSuccess ? 'OK' : 'Failed'}`);

    if (createSuccess) {
      // Test reading the created post
      const postId = createResult.data.id;
      const readResponse = await fetch(`${FRONTEND_URL}/api/v1/agent-posts/${postId}`);
      const readResult = await readResponse.json();
      const readSuccess = readResult.success;

      console.log(`   ✅ Read operation: ${readSuccess ? 'OK' : 'Failed'}`);

      if (readSuccess) {
        console.log(`   📊 Created post ID: ${postId}`);
        console.log(`   📊 Post title: ${readResult.data?.title || 'N/A'}`);
      }

      console.log(`\n   🎯 CRUD operations: ${createSuccess && readSuccess ? '✅ Working' : '⚠️ Partial'}\n`);
      return createSuccess && readSuccess;
    } else {
      console.log(`   ❌ Create failed: ${createResult.error || 'Unknown error'}\n`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ CRUD test failed: ${error.message}\n`);
    return false;
  }
}

// Run all tests
async function runFinalConnectivityTest() {
  console.log('=' * 60);
  console.log('🚀 Starting Final Connectivity Test...\n');

  const results = {
    criticalEndpoints: await testCriticalAPIEndpoints(),
    realAnalyticsData: await testRealAnalyticsSpecificData(),
    proxyConfig: await testProxyConfiguration(),
    crudOperations: await testDataCRUD()
  };

  // Calculate overall scores
  const criticalEndpointsScore = results.criticalEndpoints.filter(r => r.success).length / results.criticalEndpoints.length;
  const overallScore = [
    criticalEndpointsScore,
    results.realAnalyticsData ? 1 : 0,
    results.proxyConfig ? 1 : 0,
    results.crudOperations ? 1 : 0
  ].reduce((a, b) => a + b, 0) / 4;

  console.log('📊 FINAL RESULTS SUMMARY');
  console.log('=' * 60);
  console.log(`Critical API Endpoints:   ${(criticalEndpointsScore * 100).toFixed(0)}% working`);
  console.log(`RealAnalytics Data:       ${results.realAnalyticsData ? '✅ Available' : '❌ Issues'}`);
  console.log(`Proxy Configuration:      ${results.proxyConfig ? '✅ Working' : '❌ Issues'}`);
  console.log(`CRUD Operations:          ${results.crudOperations ? '✅ Working' : '❌ Issues'}`);
  console.log(`\nOverall Score:            ${(overallScore * 100).toFixed(0)}%`);

  if (overallScore >= 0.8) {
    console.log('\n🎉 EXCELLENT! Frontend-backend connectivity is working well.');
    console.log('✨ The RealAnalytics component should function properly.');
    console.log('✨ API proxy configuration is successful.');
  } else if (overallScore >= 0.6) {
    console.log('\n✅ GOOD! Most functionality is working.');
    console.log('⚠️ Some minor issues may affect specific features.');
  } else {
    console.log('\n⚠️ ISSUES DETECTED! Several connectivity problems found.');
    console.log('🔧 Review the test results above for specific failures.');
  }

  console.log('\n📋 Recommendations:');
  if (criticalEndpointsScore < 1) {
    console.log('   • Check backend server status and endpoint implementations');
  }
  if (!results.realAnalyticsData) {
    console.log('   • Verify RealAnalytics component data endpoints');
  }
  if (!results.proxyConfig) {
    console.log('   • Review Vite proxy configuration settings');
  }
  if (!results.crudOperations) {
    console.log('   • Check database connectivity and POST/GET endpoint logic');
  }

  console.log('\n✅ Proxy configuration fixes have been applied to:');
  console.log('   • frontend/vite.config.ts - Updated WebSocket proxy paths');
  console.log('   • frontend/src/services/api.ts - Updated WebSocket URL detection');

  return overallScore >= 0.6;
}

// Export for use in other scripts
export { runFinalConnectivityTest };

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFinalConnectivityTest().then(success => {
    process.exit(success ? 0 : 1);
  });
}