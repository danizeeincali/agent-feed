/**
 * Comprehensive Regression Test for Agents Feature
 * Zero mocks, 100% real functionality validation
 */

const http = require('http');

// Configuration
const BACKEND_BASE = 'http://localhost:5173';
const FRONTEND_BASE = 'http://localhost:3001';

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
            data: JSON.parse(data),
            raw: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: null,
            raw: data,
            error: e.message
          });
        }
      });
    }).on('error', reject);
  });
}

// Test suite
async function runComprehensiveTests() {
  console.log('====================================');
  console.log('AGENTS COMPREHENSIVE REGRESSION TEST');
  console.log('====================================\\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: [],
    timestamp: new Date().toISOString()
  };

  try {
    // Test 1: Backend API Health
    console.log('Test 1: Backend API Health Check');
    results.total++;
    try {
      const response = await makeRequest(`${BACKEND_BASE}/api/agents`);
      if (response.status === 200) {
        console.log('✓ Backend API is healthy');
        results.passed++;
      } else {
        console.log(`✗ Backend returned status ${response.status}`);
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Backend connection failed:', error.message);
      results.failed++;
      results.errors.push(error.message);
    }

    // Test 2: Real Agent Data Structure
    console.log('\\nTest 2: Real Agent Data Validation');
    results.total++;
    try {
      const response = await makeRequest(`${BACKEND_BASE}/api/agents`);
      if (response.data && response.data.agents) {
        const agents = response.data.agents;
        console.log(`✓ Found ${agents.length} real agents`);

        // Validate first agent structure
        if (agents.length > 0) {
          const agent = agents[0];
          const requiredFields = ['id', 'name', 'status', 'capabilities'];
          const missingFields = requiredFields.filter(field => !agent[field]);

          if (missingFields.length === 0) {
            console.log('✓ Agent data structure is valid');
            results.passed++;
          } else {
            console.log(`✗ Missing fields: ${missingFields.join(', ')}`);
            results.failed++;
          }
        }
      } else {
        console.log('✗ Invalid response structure');
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Test failed:', error.message);
      results.failed++;
    }

    // Test 3: No Mock Data Contamination
    console.log('\\nTest 3: Mock Data Detection');
    results.total++;
    try {
      const response = await makeRequest(`${BACKEND_BASE}/api/agents`);
      const mockIndicators = [
        'Chief of Staff Agent',
        'Personal Todos Agent',
        'Impact Filter Agent',
        'Mock agent data',
        'Simulate loading delay'
      ];

      let mockFound = false;
      if (response.raw) {
        for (const indicator of mockIndicators) {
          if (response.raw.includes(indicator)) {
            mockFound = true;
            console.log(`✗ Mock data detected: "${indicator}"`);
            break;
          }
        }
      }

      if (!mockFound) {
        console.log('✓ No mock data contamination');
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Test failed:', error.message);
      results.failed++;
    }

    // Test 4: Frontend Proxy
    console.log('\\nTest 4: Frontend Proxy Validation');
    results.total++;
    try {
      const response = await makeRequest(`${FRONTEND_BASE}/api/agents`);
      if (response.status === 200) {
        console.log('✓ Frontend proxy working');

        // Check if data matches backend
        const backendResponse = await makeRequest(`${BACKEND_BASE}/api/agents`);
        if (response.data && backendResponse.data) {
          const frontendCount = response.data.agents ? response.data.agents.length :
                                response.data.data ? response.data.data.length : 0;
          const backendCount = backendResponse.data.agents ? backendResponse.data.agents.length : 0;

          if (frontendCount === backendCount) {
            console.log(`✓ Data consistency verified (${frontendCount} agents)`);
            results.passed++;
          } else {
            console.log(`✗ Data mismatch: Frontend=${frontendCount}, Backend=${backendCount}`);
            results.failed++;
          }
        }
      } else {
        console.log(`✗ Frontend proxy returned ${response.status}`);
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Frontend proxy failed:', error.message);
      results.failed++;
    }

    // Test 5: Agent Status Values
    console.log('\\nTest 5: Agent Status Validation');
    results.total++;
    try {
      const response = await makeRequest(`${BACKEND_BASE}/api/agents`);
      if (response.data && response.data.agents) {
        const validStatuses = ['active', 'idle', 'busy', 'offline', 'inactive'];
        const invalidAgents = response.data.agents.filter(agent =>
          !validStatuses.includes(agent.status)
        );

        if (invalidAgents.length === 0) {
          console.log('✓ All agents have valid status values');
          results.passed++;
        } else {
          console.log(`✗ ${invalidAgents.length} agents with invalid status`);
          results.failed++;
        }
      }
    } catch (error) {
      console.log('✗ Test failed:', error.message);
      results.failed++;
    }

    // Test 6: Performance
    console.log('\\nTest 6: API Performance');
    results.total++;
    const perfStart = Date.now();
    try {
      await makeRequest(`${BACKEND_BASE}/api/agents`);
      const responseTime = Date.now() - perfStart;

      if (responseTime < 500) {
        console.log(`✓ Excellent performance: ${responseTime}ms`);
        results.passed++;
      } else if (responseTime < 1000) {
        console.log(`✓ Good performance: ${responseTime}ms`);
        results.passed++;
      } else {
        console.log(`✗ Slow response: ${responseTime}ms`);
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Performance test failed:', error.message);
      results.failed++;
    }

    // Test 7: Data Persistence
    console.log('\\nTest 7: Data Persistence Check');
    results.total++;
    try {
      const response1 = await makeRequest(`${BACKEND_BASE}/api/agents`);
      await new Promise(resolve => setTimeout(resolve, 500));
      const response2 = await makeRequest(`${BACKEND_BASE}/api/agents`);

      if (response1.data && response2.data) {
        const ids1 = response1.data.agents ?
          response1.data.agents.map(a => a.id).sort() : [];
        const ids2 = response2.data.agents ?
          response2.data.agents.map(a => a.id).sort() : [];

        if (JSON.stringify(ids1) === JSON.stringify(ids2)) {
          console.log('✓ Data is persistent across requests');
          results.passed++;
        } else {
          console.log('✗ Data changed between requests');
          results.failed++;
        }
      }
    } catch (error) {
      console.log('✗ Test failed:', error.message);
      results.failed++;
    }

    // Test 8: Agent Capabilities
    console.log('\\nTest 8: Agent Capabilities Validation');
    results.total++;
    try {
      const response = await makeRequest(`${BACKEND_BASE}/api/agents`);
      if (response.data && response.data.agents) {
        const agentsWithCapabilities = response.data.agents.filter(agent =>
          agent.capabilities && Array.isArray(agent.capabilities) && agent.capabilities.length > 0
        );

        if (agentsWithCapabilities.length === response.data.agents.length) {
          console.log('✓ All agents have defined capabilities');
          results.passed++;
        } else {
          console.log(`✗ ${response.data.agents.length - agentsWithCapabilities.length} agents missing capabilities`);
          results.failed++;
        }
      }
    } catch (error) {
      console.log('✗ Test failed:', error.message);
      results.failed++;
    }

  } catch (error) {
    console.error('\\nTest suite error:', error);
    results.errors.push(error.message);
  }

  // Final Report
  console.log('\\n====================================');
  console.log('REGRESSION TEST RESULTS');
  console.log('====================================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✓`);
  console.log(`Failed: ${results.failed} ✗`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log(`Timestamp: ${results.timestamp}`);

  if (results.errors.length > 0) {
    console.log('\\nErrors encountered:');
    results.errors.forEach(err => console.log(`  - ${err}`));
  }

  // Verdict
  console.log('\\n====================================');
  if (results.passed === results.total) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Agents feature is 100% real and functional');
    console.log('✅ No mock data contamination detected');
    console.log('✅ All APIs working correctly');
  } else if (results.passed >= results.total * 0.8) {
    console.log('✓ MOSTLY PASSED');
    console.log('⚠️ Some minor issues detected');
  } else {
    console.log('✗ REGRESSION DETECTED');
    console.log('⚠️ Critical issues found - review failed tests');
  }

  return results;
}

// Run tests
if (require.main === module) {
  runComprehensiveTests()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runComprehensiveTests };