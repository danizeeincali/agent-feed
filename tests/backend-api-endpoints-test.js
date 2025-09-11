#!/usr/bin/env node
/**
 * Quick test for the new backend API endpoints
 * Tests the /api/agents/:agentId/activities and /api/agents/:agentId/posts endpoints
 */

const http = require('http');
const { spawn } = require('child_process');

// Start the backend server
console.log('🚀 Starting backend server for testing...');
const serverProcess = spawn('node', ['simple-backend.js'], {
  cwd: '/workspaces/agent-feed',
  stdio: 'pipe'
});

let serverReady = false;

serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  if (output.includes('🚀 Server running on port')) {
    serverReady = true;
    runTests();
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

// Helper function to make HTTP requests
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:3001${path}`, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data
          });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(5000, () => {
      reject(new Error('Request timeout'));
    });
  });
}

async function runTests() {
  console.log('🧪 Running API endpoint tests...');
  
  try {
    // Test 1: Get list of agents first
    console.log('\n1️⃣ Testing GET /api/agents');
    const agentsResponse = await makeRequest('/api/agents');
    console.log(`   Status: ${agentsResponse.statusCode}`);
    
    if (agentsResponse.statusCode === 200 && agentsResponse.data.success) {
      const agents = agentsResponse.data.data;
      console.log(`   ✅ Found ${agents.length} agents`);
      
      if (agents.length > 0) {
        const testAgent = agents[0];
        console.log(`   📋 Testing with agent: ${testAgent.id} (${testAgent.name})`);
        
        // Test 2: Get agent activities
        console.log('\n2️⃣ Testing GET /api/agents/:agentId/activities');
        const activitiesResponse = await makeRequest(`/api/agents/${testAgent.id}/activities`);
        console.log(`   Status: ${activitiesResponse.statusCode}`);
        
        if (activitiesResponse.statusCode === 200 && activitiesResponse.data.success) {
          const activities = activitiesResponse.data.data;
          console.log(`   ✅ Retrieved ${activities.length} activities`);
          if (activities.length > 0) {
            console.log(`   📊 Sample activity: ${activities[0].title}`);
          }
        } else {
          console.log(`   ❌ Activities endpoint failed: ${JSON.stringify(activitiesResponse.data)}`);
        }
        
        // Test 3: Get agent posts
        console.log('\n3️⃣ Testing GET /api/agents/:agentId/posts');
        const postsResponse = await makeRequest(`/api/agents/${testAgent.id}/posts`);
        console.log(`   Status: ${postsResponse.statusCode}`);
        
        if (postsResponse.statusCode === 200 && postsResponse.data.success) {
          const posts = postsResponse.data.data;
          console.log(`   ✅ Retrieved ${posts.length} posts`);
          if (posts.length > 0) {
            console.log(`   📝 Sample post: ${posts[0].title}`);
          }
        } else {
          console.log(`   ❌ Posts endpoint failed: ${JSON.stringify(postsResponse.data)}`);
        }
        
        // Test 4: Test with non-existent agent
        console.log('\n4️⃣ Testing with non-existent agent ID');
        const notFoundResponse = await makeRequest('/api/agents/non-existent-id/activities');
        console.log(`   Status: ${notFoundResponse.statusCode}`);
        
        if (notFoundResponse.statusCode === 404) {
          console.log('   ✅ Correctly returns 404 for non-existent agent');
        } else {
          console.log(`   ❌ Expected 404, got ${notFoundResponse.statusCode}`);
        }
      } else {
        console.log('   ⚠️ No agents found to test with');
      }
    } else {
      console.log(`   ❌ Failed to get agents: ${JSON.stringify(agentsResponse.data)}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n✅ Test completed');
  
  // Clean up
  serverProcess.kill();
  process.exit(0);
}

// Timeout fallback
setTimeout(() => {
  if (!serverReady) {
    console.error('❌ Server failed to start within timeout');
    serverProcess.kill();
    process.exit(1);
  }
}, 10000);