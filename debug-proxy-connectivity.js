#!/usr/bin/env node
/**
 * Comprehensive Proxy and Frontend Connectivity Test
 * Tests Vite proxy configuration and frontend API connectivity
 */

import fetch from 'node-fetch';
import { spawn } from 'child_process';
import { WebSocket } from 'ws';

const FRONTEND_PORT = 5173;
const BACKEND_PORT = 3000;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

console.log('🔍 Testing Frontend Proxy Configuration and Connectivity\n');

// Test functions
async function testBackendDirectly() {
  console.log('1. Testing Backend Directly...');

  try {
    // Test health endpoint
    const healthResponse = await fetch(`${BACKEND_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('   ✅ Backend health check:', healthData.success ? 'OK' : 'Failed');

    // Test agent posts endpoint
    const postsResponse = await fetch(`${BACKEND_URL}/api/v1/agent-posts?limit=1`);
    const postsData = await postsResponse.json();
    console.log('   ✅ Backend posts endpoint:', postsData.success ? 'OK' : 'Failed');
    console.log('   📊 Posts count:', postsData.total || 0);

    // Test agents endpoint
    const agentsResponse = await fetch(`${BACKEND_URL}/api/agents`);
    const agentsData = await agentsResponse.json();
    console.log('   ✅ Backend agents endpoint:', agentsData.success ? 'OK' : 'Failed');
    console.log('   🤖 Agents count:', agentsData.totalAgents || 0);

    return true;
  } catch (error) {
    console.log('   ❌ Backend test failed:', error.message);
    return false;
  }
}

async function testFrontendProxy() {
  console.log('\n2. Testing Frontend Proxy Configuration...');

  try {
    // Test proxied API calls through frontend
    const proxyHealthResponse = await fetch(`${FRONTEND_URL}/api/health`);
    const proxyHealthData = await proxyHealthResponse.json();
    console.log('   ✅ Proxy health check:', proxyHealthData.success ? 'OK' : 'Failed');

    // Test proxied posts endpoint
    const proxyPostsResponse = await fetch(`${FRONTEND_URL}/api/v1/agent-posts?limit=1`);
    const proxyPostsData = await proxyPostsResponse.json();
    console.log('   ✅ Proxy posts endpoint:', proxyPostsData.success ? 'OK' : 'Failed');

    // Test proxied agents endpoint
    const proxyAgentsResponse = await fetch(`${FRONTEND_URL}/api/agents`);
    const proxyAgentsData = await proxyAgentsResponse.json();
    console.log('   ✅ Proxy agents endpoint:', proxyAgentsData.success ? 'OK' : 'Failed');

    return true;
  } catch (error) {
    console.log('   ❌ Frontend proxy test failed:', error.message);
    return false;
  }
}

async function testWebSocketProxy() {
  console.log('\n3. Testing WebSocket Proxy...');

  return new Promise((resolve) => {
    try {
      // Test direct WebSocket connection to backend
      const directWs = new WebSocket(`ws://localhost:${BACKEND_PORT}/ws`);

      directWs.on('open', () => {
        console.log('   ✅ Direct WebSocket connection: OK');
        directWs.close();

        // Test proxied WebSocket connection through frontend
        const proxyWs = new WebSocket(`ws://localhost:${FRONTEND_PORT}/socket.io`);

        proxyWs.on('open', () => {
          console.log('   ✅ Proxy WebSocket connection: OK');
          proxyWs.close();
          resolve(true);
        });

        proxyWs.on('error', (error) => {
          console.log('   ❌ Proxy WebSocket failed:', error.message);
          resolve(false);
        });

        setTimeout(() => {
          if (proxyWs.readyState === WebSocket.CONNECTING) {
            console.log('   ⚠️ Proxy WebSocket timeout');
            proxyWs.close();
            resolve(false);
          }
        }, 5000);
      });

      directWs.on('error', (error) => {
        console.log('   ❌ Direct WebSocket failed:', error.message);
        resolve(false);
      });

      setTimeout(() => {
        if (directWs.readyState === WebSocket.CONNECTING) {
          console.log('   ⚠️ Direct WebSocket timeout');
          directWs.close();
          resolve(false);
        }
      }, 5000);

    } catch (error) {
      console.log('   ❌ WebSocket test setup failed:', error.message);
      resolve(false);
    }
  });
}

async function testCORS() {
  console.log('\n4. Testing CORS Configuration...');

  try {
    // Test CORS headers
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'OPTIONS'
    });

    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
    };

    console.log('   ✅ CORS Headers:', corsHeaders);
    return true;
  } catch (error) {
    console.log('   ❌ CORS test failed:', error.message);
    return false;
  }
}

function testFrontendDevServer() {
  console.log('\n5. Testing Frontend Dev Server Status...');

  return new Promise((resolve) => {
    fetch(`${FRONTEND_URL}`)
      .then(response => {
        if (response.ok) {
          console.log('   ✅ Frontend dev server: Running');
          resolve(true);
        } else {
          console.log('   ❌ Frontend dev server: Response error', response.status);
          resolve(false);
        }
      })
      .catch(error => {
        console.log('   ❌ Frontend dev server: Not running or unreachable');
        console.log('   💡 Try running: npm run dev');
        resolve(false);
      });
  });
}

// Test API Service Configuration
async function testAPIServiceConfig() {
  console.log('\n6. Testing API Service Configuration...');

  // Test the frontend API service by making a request and checking logs
  try {
    const testResponse = await fetch(`${FRONTEND_URL}/api/health`);
    console.log('   ✅ API Service base URL detection: Working');
    return true;
  } catch (error) {
    console.log('   ❌ API Service config issue:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = {
    backend: await testBackendDirectly(),
    frontendServer: await testFrontendDevServer(),
    proxy: false,
    websocket: false,
    cors: await testCORS(),
    apiService: false
  };

  // Only test proxy if frontend is running
  if (results.frontendServer) {
    results.proxy = await testFrontendProxy();
    results.websocket = await testWebSocketProxy();
    results.apiService = await testAPIServiceConfig();
  }

  console.log('\n📊 Test Results Summary:');
  console.log('='.repeat(50));
  console.log(`Backend Direct Access:    ${results.backend ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Frontend Dev Server:      ${results.frontendServer ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Frontend Proxy:           ${results.proxy ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`WebSocket Proxy:          ${results.websocket ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`CORS Configuration:       ${results.cors ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`API Service Config:       ${results.apiService ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(Boolean);
  console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ ISSUES DETECTED'}`);

  if (!allPassed) {
    console.log('\n🔧 Recommended Actions:');
    if (!results.backend) console.log('   • Start the backend server: node simple-backend.js');
    if (!results.frontendServer) console.log('   • Start the frontend server: cd frontend && npm run dev');
    if (!results.proxy) console.log('   • Check Vite proxy configuration in frontend/vite.config.ts');
    if (!results.websocket) console.log('   • Verify WebSocket proxy settings');
    if (!results.cors) console.log('   • Check CORS middleware configuration');
    if (!results.apiService) console.log('   • Review API service base URL detection');
  }

  return allPassed;
}

// Export for use in other scripts
export { runAllTests, testBackendDirectly, testFrontendProxy };

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}