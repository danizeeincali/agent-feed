/**
 * Browser Network Forensics Simulator
 * Simulates exact browser conditions to identify request/response mismatches
 */

import fetch from 'node-fetch';

// Simulate exact browser headers and request conditions
const simulateBrowserRequest = async (url, options = {}) => {
  console.log(`\n🔍 FORENSICS: Simulating browser request to ${url}`);

  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Origin': 'http://localhost:5173',
    'Referer': 'http://localhost:5173/',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Dest': 'empty',
    ...options.headers
  };

  const requestConfig = {
    method: options.method || 'GET',
    headers: browserHeaders,
    ...options
  };

  console.log('📋 Request Config:', {
    url,
    method: requestConfig.method,
    headers: requestConfig.headers ? Object.keys(requestConfig.headers) : [],
    body: requestConfig.body ? 'Present' : 'None'
  });

  try {
    const startTime = Date.now();
    const response = await fetch(url, requestConfig);
    const endTime = Date.now();

    console.log(`⏱️ Response Time: ${endTime - startTime}ms`);
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log('📨 Response Headers:', Object.fromEntries(response.headers.entries()));

    if (response.status === 404) {
      console.log('❌ 404 DETECTED - Route not found or not mounted');
      return { error: '404 Not Found', response };
    }

    if (response.status >= 400) {
      const errorText = await response.text();
      console.log(`❌ Error Response Body: ${errorText}`);
      return { error: errorText, response };
    }

    const contentType = response.headers.get('content-type');
    let responseData;

    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
      console.log('✅ JSON Response received');
    } else {
      responseData = await response.text();
      console.log('✅ Text Response received');
    }

    return { data: responseData, response };

  } catch (error) {
    console.error(`🚨 Network Error: ${error.message}`);

    if (error.code === 'ECONNREFUSED') {
      console.log('💀 ECONNREFUSED - Backend server not running on target port');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('⏰ ETIMEDOUT - Request timeout (backend hanging)');
    } else if (error.message.includes('fetch')) {
      console.log('🌐 FETCH ERROR - Network connectivity issue');
    }

    return { error: error.message, networkError: true };
  }
};

// Test suite for Claude Code endpoints
const runNetworkForensics = async () => {
  console.log('🔬 BROWSER NETWORK FORENSICS ANALYSIS');
  console.log('=====================================\n');

  const baseUrl = 'http://localhost:3000';
  const testCases = [
    {
      name: 'Health Check',
      url: `${baseUrl}/api/claude-code/health`,
      method: 'GET'
    },
    {
      name: 'Streaming Chat (Exact Frontend Call)',
      url: `${baseUrl}/api/claude-code/streaming-chat`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "Use tools to help with: test. Execute commands and show real output.",
        options: {
          cwd: '/workspaces/agent-feed',
          model: 'claude-sonnet-4-20250514',
          enableTools: true,
          forceToolUse: true
        }
      })
    },
    {
      name: 'Session Creation',
      url: `${baseUrl}/api/claude-code/session`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'test-session',
        config: { cwd: '/workspaces/agent-feed' }
      })
    },
    {
      name: 'Backend Route Test (Base API)',
      url: `${baseUrl}/api/health`,
      method: 'GET'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 TEST: ${testCase.name}`);
    console.log('='.repeat(50));

    const result = await simulateBrowserRequest(testCase.url, {
      method: testCase.method,
      headers: testCase.headers,
      body: testCase.body
    });

    if (result.error) {
      console.log(`❌ FAILURE: ${result.error}`);

      if (result.response && result.response.status === 404) {
        console.log('🔍 404 Analysis:');
        console.log('  - Route may not be mounted in Express app');
        console.log('  - Middleware chain may be blocking request');
        console.log('  - Route pattern mismatch');
      }
    } else {
      console.log(`✅ SUCCESS: Request completed`);
      if (result.data && typeof result.data === 'object') {
        console.log('📄 Response keys:', Object.keys(result.data));
      }
    }

    console.log('\n' + '-'.repeat(50));
  }

  // Analyze Vite proxy behavior
  console.log('\n🔧 VITE PROXY ANALYSIS');
  console.log('======================');

  const viteProxyTests = [
    {
      name: 'Frontend to Vite Dev Server',
      url: 'http://localhost:5173/api/claude-code/health',
      note: 'This should proxy to localhost:3000'
    }
  ];

  for (const test of viteProxyTests) {
    console.log(`\n🔄 PROXY TEST: ${test.name}`);
    console.log(`📍 URL: ${test.url}`);
    console.log(`📝 Note: ${test.note}`);

    const result = await simulateBrowserRequest(test.url, { method: 'GET' });

    if (result.error) {
      console.log(`❌ PROXY FAILURE: ${result.error}`);
      if (result.networkError) {
        console.log('🔍 This suggests Vite dev server is not running on port 5173');
      }
    } else {
      console.log(`✅ PROXY SUCCESS: Request proxied correctly`);
    }
  }

  console.log('\n📋 FORENSICS SUMMARY');
  console.log('====================');
  console.log('1. Direct backend calls reveal if routes are mounted');
  console.log('2. Proxy tests reveal if Vite is correctly forwarding');
  console.log('3. Browser simulation includes all real headers');
  console.log('4. Timeout analysis shows if backend is hanging');

};

// Run forensics if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runNetworkForensics().catch(console.error);
}

export { simulateBrowserRequest, runNetworkForensics };