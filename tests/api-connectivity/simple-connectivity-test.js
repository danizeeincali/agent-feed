/**
 * Simple API Connectivity Test
 * Quick validation that the main endpoints are working
 */

import fetch from 'node-fetch';

async function testApiConnectivity() {
  const API_BASE_URL = 'http://localhost:3000';

  console.log('🔍 Testing API Connectivity...\n');

  // Test 1: Agents endpoint
  try {
    console.log('1. Testing /api/agents...');
    const response = await fetch(`${API_BASE_URL}/api/agents`);

    if (response.ok) {
      const agents = await response.json();
      console.log(`   ✅ SUCCESS: /api/agents returned ${agents.length} agents`);

      if (agents.length > 0) {
        console.log(`   📊 Sample agent: ${agents[0].name} (ID: ${agents[0].id})`);
      }
    } else {
      console.log(`   ❌ FAILED: /api/agents returned status ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR: /api/agents failed - ${error.message}`);
  }

  // Test 2: Agent Posts endpoint
  try {
    console.log('\n2. Testing /api/agent-posts...');
    const response = await fetch(`${API_BASE_URL}/api/agent-posts`);

    if (response.ok) {
      const contentType = response.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        const posts = await response.json();
        console.log(`   ✅ SUCCESS: /api/agent-posts returned ${posts.length} posts (JSON)`);
      } else {
        console.log(`   ℹ️ INFO: /api/agent-posts returned HTML (frontend routing)`);
      }
    } else {
      console.log(`   ❌ FAILED: /api/agent-posts returned status ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR: /api/agent-posts failed - ${error.message}`);
  }

  // Test 3: V1 Agent Posts endpoint
  try {
    console.log('\n3. Testing /api/v1/agent-posts...');
    const response = await fetch(`${API_BASE_URL}/api/v1/agent-posts`);

    if (response.ok) {
      const posts = await response.json();
      console.log(`   ✅ SUCCESS: /api/v1/agent-posts returned ${posts.length} posts`);

      if (posts.length > 0) {
        console.log(`   📊 Sample post content length: ${posts[0].content?.length || 0} chars`);
      }
    } else {
      console.log(`   ❌ FAILED: /api/v1/agent-posts returned status ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR: /api/v1/agent-posts failed - ${error.message}`);
  }

  // Test 4: Streaming ticker endpoint
  try {
    console.log('\n4. Testing /api/streaming-ticker...');
    const response = await fetch(`${API_BASE_URL}/api/streaming-ticker`);

    console.log(`   ℹ️ INFO: /api/streaming-ticker returned status ${response.status}`);
    console.log(`   📊 Response indicates endpoint is ${response.status < 500 ? 'reachable' : 'not working'}`);
  } catch (error) {
    console.log(`   ❌ ERROR: /api/streaming-ticker failed - ${error.message}`);
  }

  // Test 5: CORS check
  try {
    console.log('\n5. Testing CORS headers...');
    const response = await fetch(`${API_BASE_URL}/api/agents`, {
      method: 'OPTIONS',
      headers: { 'Origin': 'http://localhost:5173' }
    });

    const corsHeader = response.headers.get('access-control-allow-origin');

    if (corsHeader) {
      console.log(`   ✅ SUCCESS: CORS headers present (${corsHeader})`);
    } else {
      console.log(`   ⚠️ WARNING: No CORS headers found (may still work)`);
    }
  } catch (error) {
    console.log(`   ❌ ERROR: CORS check failed - ${error.message}`);
  }

  console.log('\n🎯 API Connectivity Test Complete!');
  console.log('Run the full test suite with: ./tests/api-connectivity/run-api-tests.sh');
}

testApiConnectivity().catch(console.error);