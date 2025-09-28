/**
 * TDD London School Test Suite for Real Agents API
 * Zero mocks, 100% real functionality validation
 */

const http = require('http');

// Test configuration
const API_BASE = 'http://localhost:5173';
const BACKEND_BASE = 'http://localhost:3001';

// Test helpers
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    }).on('error', reject);
  });
}

async function validateAgent(agent) {
  const errors = [];

  // Required fields validation
  if (!agent.id) errors.push('Agent missing id');
  if (!agent.name) errors.push('Agent missing name');
  if (!agent.type) errors.push('Agent missing type');
  if (!agent.status) errors.push('Agent missing status');
  if (!Array.isArray(agent.capabilities)) errors.push('Agent capabilities not an array');
  if (!agent.metrics) errors.push('Agent missing metrics');

  // Status validation
  const validStatuses = ['active', 'idle', 'busy', 'offline'];
  if (agent.status && !validStatuses.includes(agent.status)) {
    errors.push(`Invalid status: ${agent.status}`);
  }

  // Metrics validation
  if (agent.metrics) {
    if (typeof agent.metrics.tasksCompleted !== 'number') {
      errors.push('Invalid tasksCompleted metric');
    }
    if (typeof agent.metrics.successRate !== 'number') {
      errors.push('Invalid successRate metric');
    }
    if (typeof agent.metrics.responseTime !== 'number') {
      errors.push('Invalid responseTime metric');
    }
    if (!agent.metrics.lastActive) {
      errors.push('Missing lastActive timestamp');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Test Suite
async function runTests() {
  console.log('=================================');
  console.log('AGENTS API - TDD VALIDATION SUITE');
  console.log('=================================\\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  };

  try {
    // Test 1: Backend API endpoint exists
    console.log('Test 1: Backend /api/agents endpoint');
    results.total++;
    try {
      const response = await makeRequest(`${BACKEND_BASE}/api/agents`);
      if (response.status === 200) {
        console.log('✓ Backend endpoint returns 200 OK');
        results.passed++;

        // Validate response structure
        if (response.data.agents && Array.isArray(response.data.agents)) {
          console.log(`✓ Response contains agents array with ${response.data.agents.length} agents`);

          // Validate each agent
          let allValid = true;
          for (const agent of response.data.agents) {
            const validation = await validateAgent(agent);
            if (!validation.valid) {
              allValid = false;
              console.log(`✗ Agent ${agent.id} validation failed:`, validation.errors);
              results.errors.push(...validation.errors);
            }
          }

          if (allValid) {
            console.log('✓ All agents have valid structure');
          }
        } else {
          console.log('✗ Response missing agents array');
          results.errors.push('Response missing agents array');
          results.failed++;
        }
      } else {
        console.log(`✗ Backend endpoint returned ${response.status}`);
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Failed to connect to backend:', error.message);
      results.failed++;
    }

    // Test 2: Frontend proxy to backend
    console.log('\\nTest 2: Frontend proxy /api/agents');
    results.total++;
    try {
      const response = await makeRequest(`${API_BASE}/api/agents`);
      if (response.status === 200) {
        console.log('✓ Frontend proxy returns 200 OK');
        results.passed++;

        if (response.data.agents && response.data.agents.length > 0) {
          console.log(`✓ Received ${response.data.agents.length} real agents`);

          // Display sample agents
          console.log('\\nSample agents (first 3):');
          response.data.agents.slice(0, 3).forEach(agent => {
            console.log(`  - ${agent.name} (${agent.type}): ${agent.status}`);
          });
        }
      } else {
        console.log(`✗ Frontend proxy returned ${response.status}`);
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Failed to connect through proxy:', error.message);
      results.failed++;
    }

    // Test 3: No mock data contamination
    console.log('\\nTest 3: Verify no mock data contamination');
    results.total++;
    try {
      const response = await makeRequest(`${API_BASE}/api/agents`);
      if (response.status === 200 && response.data.agents) {
        // Check for known mock agent names
        const mockAgentNames = [
          'Chief of Staff Agent',
          'Personal Todos Agent',
          'Impact Filter Agent'
        ];

        const hasMockData = response.data.agents.some(agent =>
          mockAgentNames.includes(agent.name)
        );

        if (!hasMockData) {
          console.log('✓ No mock data detected in response');
          results.passed++;
        } else {
          console.log('✗ Mock data contamination detected');
          results.failed++;
        }
      } else {
        console.log('✗ Could not verify mock data status');
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Test failed:', error.message);
      results.failed++;
    }

    // Test 4: Agent data persistence
    console.log('\\nTest 4: Agent data persistence');
    results.total++;
    try {
      const response1 = await makeRequest(`${API_BASE}/api/agents`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      const response2 = await makeRequest(`${API_BASE}/api/agents`);

      if (response1.data.agents && response2.data.agents) {
        const ids1 = response1.data.agents.map(a => a.id).sort();
        const ids2 = response2.data.agents.map(a => a.id).sort();

        if (JSON.stringify(ids1) === JSON.stringify(ids2)) {
          console.log('✓ Agent data is persistent across requests');
          results.passed++;
        } else {
          console.log('✗ Agent data changed between requests');
          results.failed++;
        }
      } else {
        console.log('✗ Could not verify persistence');
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Test failed:', error.message);
      results.failed++;
    }

    // Test 5: Response time performance
    console.log('\\nTest 5: API response time performance');
    results.total++;
    const startTime = Date.now();
    try {
      await makeRequest(`${API_BASE}/api/agents`);
      const responseTime = Date.now() - startTime;

      if (responseTime < 500) {
        console.log(`✓ Excellent response time: ${responseTime}ms`);
        results.passed++;
      } else if (responseTime < 1000) {
        console.log(`✓ Good response time: ${responseTime}ms`);
        results.passed++;
      } else {
        console.log(`✗ Slow response time: ${responseTime}ms`);
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Performance test failed:', error.message);
      results.failed++;
    }

  } catch (error) {
    console.error('\\nTest suite error:', error);
    results.errors.push(error.message);
  }

  // Final Report
  console.log('\\n=================================');
  console.log('TEST RESULTS SUMMARY');
  console.log('=================================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✓`);
  console.log(`Failed: ${results.failed} ✗`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  if (results.errors.length > 0) {
    console.log('\\nErrors encountered:');
    results.errors.forEach(err => console.log(`  - ${err}`));
  }

  if (results.passed === results.total) {
    console.log('\\n🎉 ALL TESTS PASSED! Agents API is 100% real and functional!');
  } else {
    console.log('\\n⚠️ Some tests failed. Please review the errors above.');
  }

  return results;
}

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, validateAgent };