#!/usr/bin/env node
/**
 * Browser-Specific "Failed to fetch" Testing
 * Simulates exact browser conditions that might cause fetch failures
 */

import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

console.log('🔍 Browser Simulation Test for "Failed to fetch" Error');
console.log('=====================================================\n');

// Different request scenarios that could cause "Failed to fetch"
const testScenarios = [
  {
    name: 'Normal Request',
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'test' })
    }
  },
  {
    name: 'Request with Origin Header',
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      },
      body: JSON.stringify({ message: 'test' })
    }
  },
  {
    name: 'Request with Full Browser Headers',
    options: {
      method: 'POST',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL,
        'Referer': `${FRONTEND_URL}/`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'User-Agent': 'Mozilla/5.0 (compatible) Node.js-Test/1.0'
      },
      body: JSON.stringify({ message: 'browser simulation test' })
    }
  },
  {
    name: 'Request with Timeout (5s)',
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': FRONTEND_URL
      },
      body: JSON.stringify({ message: 'timeout test' }),
      timeout: 5000
    }
  },
  {
    name: 'Request with Very Short Timeout (100ms)',
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'fast timeout test' }),
      timeout: 100
    }
  }
];

async function testScenario(scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  console.log(`   URL: ${BACKEND_URL}/api/claude-code/streaming-chat`);

  const startTime = Date.now();

  try {
    const response = await fetch(`${BACKEND_URL}/api/claude-code/streaming-chat`, scenario.options);
    const duration = Date.now() - startTime;

    console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);

    // Check for specific response patterns
    const data = await response.json();

    if (data.success) {
      console.log(`   📄 Success: ${data.message ? data.message.substring(0, 50) + '...' : 'No message'}`);
    } else {
      console.log(`   ❌ API Error: ${data.error || 'Unknown error'}`);
    }

    return { success: true, duration, status: response.status };

  } catch (error) {
    const duration = Date.now() - startTime;

    console.log(`   ❌ FETCH ERROR: ${error.message}`);
    console.log(`   ⏱️  Duration: ${duration}ms`);
    console.log(`   🔍 Error Type: ${error.constructor.name}`);

    // Check if this matches the browser "Failed to fetch" pattern
    if (error.message.includes('fetch') || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.log(`   ⚠️  THIS MATCHES BROWSER "Failed to fetch" PATTERN!`);
    }

    return { success: false, error: error.message, duration, errorType: error.constructor.name };
  }
}

async function testLoadBalancing() {
  console.log(`\n🔄 Testing Load/Timing Issues`);

  // Test rapid consecutive requests (could cause server overload)
  console.log(`   Testing rapid consecutive requests...`);

  const rapidRequests = [];
  for (let i = 0; i < 5; i++) {
    rapidRequests.push(
      fetch(`${BACKEND_URL}/api/claude-code/health`, {
        headers: { 'Origin': FRONTEND_URL }
      })
    );
  }

  try {
    const responses = await Promise.all(rapidRequests);
    console.log(`   ✅ All ${responses.length} rapid requests succeeded`);

    responses.forEach((response, index) => {
      console.log(`      Request ${index + 1}: ${response.status}`);
    });

  } catch (error) {
    console.log(`   ❌ Rapid requests failed: ${error.message}`);
  }
}

async function testServerCapacity() {
  console.log(`\n⚡ Testing Server Capacity Under Load`);

  // Test if server can handle multiple simultaneous requests
  const loadTestRequests = [];
  const startTime = Date.now();

  for (let i = 0; i < 10; i++) {
    loadTestRequests.push(
      fetch(`${BACKEND_URL}/api/claude-code/streaming-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': FRONTEND_URL
        },
        body: JSON.stringify({ message: `Load test ${i + 1}` }),
        timeout: 30000
      }).then(async response => {
        const data = await response.json();
        return { index: i + 1, status: response.status, success: data.success };
      }).catch(error => {
        return { index: i + 1, error: error.message };
      })
    );
  }

  try {
    const results = await Promise.allSettled(loadTestRequests);
    const totalTime = Date.now() - startTime;

    console.log(`   ⏱️  Total time for 10 requests: ${totalTime}ms`);
    console.log(`   📊 Results:`);

    let successCount = 0;
    let errorCount = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success !== false) {
        successCount++;
        console.log(`      Request ${index + 1}: ✅ Success (${result.value.status})`);
      } else {
        errorCount++;
        const error = result.reason || result.value?.error || 'Unknown error';
        console.log(`      Request ${index + 1}: ❌ Failed (${error})`);
      }
    });

    console.log(`   📈 Summary: ${successCount} succeeded, ${errorCount} failed`);

    if (errorCount > 0) {
      console.log(`   ⚠️  Server capacity issues detected! This could cause "Failed to fetch" errors.`);
    }

  } catch (error) {
    console.log(`   ❌ Load test failed: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('Starting browser simulation tests...\n');

  // Run individual scenario tests
  const results = [];
  for (const scenario of testScenarios) {
    const result = await testScenario(scenario);
    results.push({ scenario: scenario.name, result });
  }

  // Test load and capacity
  await testLoadBalancing();
  await testServerCapacity();

  // Summary
  console.log(`\n\n📊 FINAL ANALYSIS`);
  console.log(`==================`);

  const failed = results.filter(r => !r.result.success);
  const succeeded = results.filter(r => r.result.success);

  console.log(`✅ Successful scenarios: ${succeeded.length}`);
  console.log(`❌ Failed scenarios: ${failed.length}`);

  if (failed.length > 0) {
    console.log(`\n🔍 FAILURE ANALYSIS:`);
    failed.forEach(({ scenario, result }) => {
      console.log(`   - ${scenario}: ${result.error} (${result.duration}ms)`);
    });

    console.log(`\n💡 LIKELY CAUSES OF "Failed to fetch":`);

    const timeouts = failed.filter(f => f.result.error?.includes('timeout') || f.result.duration > 5000);
    if (timeouts.length > 0) {
      console.log(`   🕒 TIMEOUT ISSUES: ${timeouts.length} scenarios timed out`);
      console.log(`      - Backend responses are too slow (>5s)`);
      console.log(`      - Claude Code SDK taking too long to process`);
    }

    const connectionErrors = failed.filter(f => f.result.error?.includes('ECONNREFUSED') || f.result.error?.includes('ENOTFOUND'));
    if (connectionErrors.length > 0) {
      console.log(`   🌐 CONNECTION ISSUES: Backend not accessible`);
    }

    const fetchErrors = failed.filter(f => f.result.error?.includes('fetch'));
    if (fetchErrors.length > 0) {
      console.log(`   📡 FETCH API ISSUES: Browser-specific fetch problems`);
    }

  } else {
    console.log(`\n✅ ALL TESTS PASSED!`);
    console.log(`   If users still see "Failed to fetch", the issue is likely:`);
    console.log(`   1. Browser-specific (try different browser)`);
    console.log(`   2. Network/firewall blocking requests`);
    console.log(`   3. Frontend JavaScript error preventing proper fetch`);
    console.log(`   4. Service worker or cache interference`);
  }

  console.log(`\n🔧 DEBUGGING STEPS FOR USERS:`);
  console.log(`   1. Open browser DevTools (F12)`);
  console.log(`   2. Go to Network tab`);
  console.log(`   3. Try to reproduce the error`);
  console.log(`   4. Look for:`);
  console.log(`      - Red failed requests to /api/claude-code/*`);
  console.log(`      - Status codes 4xx/5xx`);
  console.log(`      - "CORS error" messages`);
  console.log(`      - Long request times (>30s)`);
  console.log(`   5. Check Console tab for JavaScript errors`);
  console.log(`   6. Disable browser extensions temporarily`);
  console.log(`   7. Try incognito/private browsing mode`);

  process.exit(failed.length > 0 ? 1 : 0);
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});