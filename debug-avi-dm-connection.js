#!/usr/bin/env node
/**
 * Avi DM Claude Code Connection Diagnostic Tool
 * Comprehensive testing of the "Failed to fetch" error
 */

import fetch from 'node-fetch';
import { WebSocket } from 'ws';
import http from 'http';

const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

console.log('🔍 Avi DM Claude Code Connection Diagnostic Tool');
console.log('================================================\n');

// Test configuration
const tests = [
  {
    name: 'Backend Health Check',
    url: `${BACKEND_URL}/api/health`,
    method: 'GET'
  },
  {
    name: 'Claude Code Health',
    url: `${BACKEND_URL}/api/claude-code/health`,
    method: 'GET'
  },
  {
    name: 'Claude Code Streaming Chat',
    url: `${BACKEND_URL}/api/claude-code/streaming-chat`,
    method: 'POST',
    body: { message: 'test connection' }
  },
  {
    name: 'Agent Posts API',
    url: `${BACKEND_URL}/api/agent-posts`,
    method: 'GET'
  },
  {
    name: 'Frontend Availability',
    url: FRONTEND_URL,
    method: 'GET'
  }
];

async function runConnectionTest(test) {
  console.log(`\n🧪 Testing: ${test.name}`);
  console.log(`   URL: ${test.url}`);

  const startTime = Date.now();

  try {
    const options = {
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL,
        'Referer': FRONTEND_URL,
        'User-Agent': 'Avi-DM-Diagnostic/1.0'
      },
      timeout: 30000 // 30 second timeout
    };

    if (test.body) {
      options.body = JSON.stringify(test.body);
    }

    const response = await fetch(test.url, options);
    const duration = Date.now() - startTime;

    console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);

    // Log headers for CORS analysis
    console.log(`   📋 Response Headers:`);
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase().includes('cors') ||
          key.toLowerCase().includes('access-control') ||
          key.toLowerCase().includes('origin') ||
          key.toLowerCase().includes('content-type')) {
        console.log(`      ${key}: ${value}`);
      }
    }

    // Try to get response body
    const contentType = response.headers.get('content-type');
    let responseData;

    if (contentType && contentType.includes('application/json')) {
      try {
        responseData = await response.json();
        console.log(`   📄 Response Body (first 200 chars):`,
          JSON.stringify(responseData, null, 2).substring(0, 200) + '...');
      } catch (e) {
        console.log(`   ⚠️  Failed to parse JSON response: ${e.message}`);
      }
    } else {
      try {
        const text = await response.text();
        console.log(`   📄 Response Body (first 200 chars):`, text.substring(0, 200) + '...');
      } catch (e) {
        console.log(`   ⚠️  Failed to read response text: ${e.message}`);
      }
    }

    return {
      success: true,
      status: response.status,
      duration,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`   ❌ ERROR: ${error.message}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log(`   🔍 Error Type: ${error.constructor.name}`);

    if (error.code) {
      console.log(`   🔍 Error Code: ${error.code}`);
    }

    if (error.errno) {
      console.log(`   🔍 Error Errno: ${error.errno}`);
    }

    return {
      success: false,
      error: error.message,
      errorType: error.constructor.name,
      errorCode: error.code,
      duration
    };
  }
}

async function testCORSPreflight() {
  console.log(`\n🧪 Testing: CORS Preflight (OPTIONS))`);
  console.log(`   URL: ${BACKEND_URL}/api/claude-code/streaming-chat`);

  try {
    const response = await fetch(`${BACKEND_URL}/api/claude-code/streaming-chat`, {
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    console.log(`   ✅ CORS Preflight Status: ${response.status}`);
    console.log(`   📋 CORS Headers:`);

    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase().includes('access-control') || key.toLowerCase().includes('cors')) {
        console.log(`      ${key}: ${value}`);
      }
    }

    return response.status === 200 || response.status === 204;
  } catch (error) {
    console.log(`   ❌ CORS Preflight Error: ${error.message}`);
    return false;
  }
}

async function testNetworkConnectivity() {
  console.log(`\n🌐 Network Connectivity Tests`);

  const ports = [3000, 5173, 8080];

  for (const port of ports) {
    console.log(`\n   Testing port ${port}...`);

    try {
      const response = await fetch(`http://localhost:${port}`, {
        timeout: 5000,
        method: 'GET'
      });

      console.log(`   ✅ Port ${port}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`   ❌ Port ${port}: ${error.message}`);
    }
  }
}

async function testFromBrowserContext() {
  console.log(`\n🌐 Simulating Browser Request Context`);

  const browserHeaders = {
    'Accept': 'application/json, text/plain, */*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Content-Type': 'application/json',
    'Origin': FRONTEND_URL,
    'Pragma': 'no-cache',
    'Referer': `${FRONTEND_URL}/`,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'cross-site',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  };

  console.log(`   📤 Simulating exact browser request to Claude Code API...`);

  try {
    const response = await fetch(`${BACKEND_URL}/api/claude-code/streaming-chat`, {
      method: 'POST',
      headers: browserHeaders,
      body: JSON.stringify({
        message: 'Browser simulation test',
        options: {}
      }),
      timeout: 30000
    });

    console.log(`   ✅ Browser Simulation Status: ${response.status}`);

    const data = await response.json();
    console.log(`   📄 Response:`, JSON.stringify(data, null, 2).substring(0, 300) + '...');

    return true;
  } catch (error) {
    console.log(`   ❌ Browser Simulation Error: ${error.message}`);
    console.log(`   🔍 This is likely the same error users see in the browser`);
    return false;
  }
}

async function runDiagnostics() {
  console.log(`Starting comprehensive diagnostic tests...\n`);

  const results = [];

  // Run basic connectivity tests
  for (const test of tests) {
    const result = await runConnectionTest(test);
    results.push({ test: test.name, result });
  }

  // CORS testing
  const corsResult = await testCORSPreflight();
  results.push({ test: 'CORS Preflight', result: { success: corsResult } });

  // Network connectivity
  await testNetworkConnectivity();

  // Browser context simulation
  const browserResult = await testFromBrowserContext();
  results.push({ test: 'Browser Context Simulation', result: { success: browserResult } });

  // Summary
  console.log(`\n\n📊 DIAGNOSTIC SUMMARY`);
  console.log(`=====================`);

  let passCount = 0;
  let failCount = 0;

  results.forEach(({ test, result }) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test}`);

    if (result.success) {
      passCount++;
    } else {
      failCount++;
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
    }
  });

  console.log(`\n📈 Results: ${passCount} passed, ${failCount} failed`);

  // Recommendations
  console.log(`\n💡 RECOMMENDATIONS:`);

  if (failCount === 0) {
    console.log(`   ✅ All tests passed! The connection should be working.`);
    console.log(`   🔍 If users still see "Failed to fetch", check browser dev tools for:`);
    console.log(`      - Network tab for actual request failures`);
    console.log(`      - Console for JavaScript errors`);
    console.log(`      - Application tab for service worker issues`);
  } else {
    console.log(`   🔧 Issues detected. Priority fixes:`);

    results.forEach(({ test, result }) => {
      if (!result.success) {
        if (test.includes('CORS')) {
          console.log(`      - Fix CORS configuration in backend`);
        } else if (test.includes('Claude Code')) {
          console.log(`      - Check Claude Code SDK configuration and API keys`);
        } else if (test.includes('Backend')) {
          console.log(`      - Backend server may not be running or accessible`);
        } else if (test.includes('Frontend')) {
          console.log(`      - Frontend development server issues`);
        }
      }
    });
  }

  console.log(`\n🔍 For browser debugging:`);
  console.log(`   1. Open browser dev tools (F12)`);
  console.log(`   2. Go to Network tab`);
  console.log(`   3. Try to reproduce the error`);
  console.log(`   4. Look for failed requests to /api/claude-code endpoints`);
  console.log(`   5. Check request/response headers and error details`);

  process.exit(failCount > 0 ? 1 : 0);
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('❌ Diagnostic script failed:', error);
  process.exit(1);
});