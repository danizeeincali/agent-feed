#!/usr/bin/env node
/**
 * Frontend API Connectivity Test
 * Tests the actual frontend API service and connectivity
 */

import fetch from 'node-fetch';
import { WebSocket } from 'ws';

const FRONTEND_PORT = 5173;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

console.log('🧪 Testing Frontend API Connectivity\n');

async function testFrontendAPIService() {
  console.log('1. Testing Frontend API Service Configuration...');

  try {
    // Test the analytics endpoints that RealAnalytics component uses
    const endpoints = [
      '/api/health',
      '/api/v1/agent-posts?limit=5',
      '/api/agents',
      '/api/stats',
      '/api/metrics/system?range=24h',
      '/api/analytics?range=24h'
    ];

    const results = [];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${FRONTEND_URL}${endpoint}`);
        const data = await response.json();

        const success = response.ok && (data.success !== false);
        results.push({
          endpoint,
          status: response.status,
          success,
          data: success ? 'OK' : (data.error || 'Unknown error')
        });

        console.log(`   ${success ? '✅' : '❌'} ${endpoint}: ${success ? 'OK' : response.status}`);
      } catch (error) {
        results.push({
          endpoint,
          status: 'ERROR',
          success: false,
          data: error.message
        });
        console.log(`   ❌ ${endpoint}: ${error.message}`);
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`\n   📊 Results: ${successCount}/${results.length} endpoints working\n`);

    return successCount === results.length;

  } catch (error) {
    console.log('   ❌ API service test failed:', error.message);
    return false;
  }
}

async function testWebSocketProxy() {
  console.log('2. Testing WebSocket Proxy Configuration...');

  return new Promise((resolve) => {
    try {
      // Test WebSocket connection through Vite proxy
      const ws = new WebSocket(`ws://localhost:${FRONTEND_PORT}/ws`);

      ws.on('open', () => {
        console.log('   ✅ WebSocket proxy connection: OK');

        // Send a test message
        ws.send(JSON.stringify({
          type: 'subscribe_status',
          data: 'test'
        }));

        setTimeout(() => {
          ws.close();
          resolve(true);
        }, 1000);
      });

      ws.on('message', (data) => {
        console.log('   📨 WebSocket message received:', data.toString().substring(0, 100));
      });

      ws.on('error', (error) => {
        console.log('   ❌ WebSocket proxy failed:', error.message);
        resolve(false);
      });

      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.log('   ⚠️ WebSocket proxy timeout');
          ws.close();
          resolve(false);
        }
      }, 5000);

    } catch (error) {
      console.log('   ❌ WebSocket test setup failed:', error.message);
      resolve(false);
    }
  });
}

async function testRealAnalyticsData() {
  console.log('3. Testing RealAnalytics Component Data...');

  try {
    // Test the specific endpoints that RealAnalytics component needs
    const systemMetricsResponse = await fetch(`${FRONTEND_URL}/api/metrics/system?range=24h`);
    const analyticsResponse = await fetch(`${FRONTEND_URL}/api/analytics?range=24h`);
    const feedStatsResponse = await fetch(`${FRONTEND_URL}/api/stats`);

    console.log(`   ✅ System metrics: ${systemMetricsResponse.ok ? 'OK' : 'Failed'}`);
    console.log(`   ✅ Analytics data: ${analyticsResponse.ok ? 'OK' : 'Failed'}`);
    console.log(`   ✅ Feed stats: ${feedStatsResponse.ok ? 'OK' : 'Failed'}`);

    if (feedStatsResponse.ok) {
      const feedStats = await feedStatsResponse.json();
      console.log(`   📊 Total agents: ${feedStats.totalAgents || 0}`);
      console.log(`   📊 System health: ${feedStats.systemHealth || 'N/A'}%`);
    }

    return systemMetricsResponse.ok && analyticsResponse.ok && feedStatsResponse.ok;

  } catch (error) {
    console.log('   ❌ RealAnalytics data test failed:', error.message);
    return false;
  }
}

async function testCRUDOperations() {
  console.log('4. Testing CRUD Operations...');

  try {
    // Test creating a post
    const createResponse = await fetch(`${FRONTEND_URL}/api/v1/agent-posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Frontend API Test Post',
        content: 'This post tests the frontend API connectivity and CRUD operations.',
        author_agent: 'APITester',
        metadata: {
          testRun: true,
          timestamp: new Date().toISOString()
        }
      })
    });

    const createResult = await createResponse.json();
    console.log(`   ✅ Create post: ${createResult.success ? 'OK' : 'Failed'}`);

    if (createResult.success && createResult.data) {
      const postId = createResult.data.id;

      // Test reading the post
      const readResponse = await fetch(`${FRONTEND_URL}/api/v1/agent-posts/${postId}`);
      const readResult = await readResponse.json();
      console.log(`   ✅ Read post: ${readResult.success ? 'OK' : 'Failed'}`);

      return createResult.success && readResult.success;
    }

    return createResult.success;

  } catch (error) {
    console.log('   ❌ CRUD operations test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = {
    apiService: await testFrontendAPIService(),
    websocket: await testWebSocketProxy(),
    realAnalytics: await testRealAnalyticsData(),
    crud: await testCRUDOperations()
  };

  console.log('\n📊 Frontend API Test Results:');
  console.log('='.repeat(50));
  console.log(`API Service:              ${results.apiService ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`WebSocket Proxy:          ${results.websocket ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`RealAnalytics Data:       ${results.realAnalytics ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`CRUD Operations:          ${results.crud ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(Boolean);
  console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ ISSUES DETECTED'}`);

  if (allPassed) {
    console.log('\n✨ Frontend API connectivity is working correctly!');
    console.log('   • All API endpoints are accessible through Vite proxy');
    console.log('   • WebSocket proxy is functioning');
    console.log('   • RealAnalytics component should work properly');
    console.log('   • CRUD operations are functional');
  } else {
    console.log('\n🔧 Issues detected:');
    if (!results.apiService) console.log('   • API service configuration needs review');
    if (!results.websocket) console.log('   • WebSocket proxy configuration needs fix');
    if (!results.realAnalytics) console.log('   • RealAnalytics component data endpoints failing');
    if (!results.crud) console.log('   • CRUD operations not working properly');
  }

  return allPassed;
}

// Export for use in other scripts
export { runAllTests };

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}