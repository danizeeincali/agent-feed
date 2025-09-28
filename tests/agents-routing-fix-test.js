/**
 * SPARC Routing Fix Validation Test
 * Tests the API routing fix for AgentDashboard.tsx
 * Zero mocks, 100% real functionality validation
 */

const http = require('http');

// Configuration
const FRONTEND_BASE = 'http://localhost:3001';

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

async function testRoutingFix() {
  console.log('=====================================');
  console.log('SPARC ROUTING FIX VALIDATION TEST');
  console.log('=====================================\\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  };

  try {
    // Test 1: Frontend API endpoint accessibility
    console.log('Test 1: Frontend /api/agents endpoint');
    results.total++;
    try {
      const response = await makeRequest(`${FRONTEND_BASE}/api/agents`);

      if (response.status === 200) {
        console.log('✓ Frontend API responds with 200 OK');

        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          console.log(`✓ Response contains data.data array with ${response.data.data.length} agents`);
          results.passed++;
        } else if (response.data && response.data.agents && Array.isArray(response.data.agents)) {
          console.log(`✓ Response contains data.agents array with ${response.data.agents.length} agents`);
          results.passed++;
        } else {
          console.log('✗ Invalid response structure');
          results.failed++;
        }
      } else {
        console.log(`✗ Frontend API returned status ${response.status}`);
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Frontend API request failed:', error.message);
      results.failed++;
      results.errors.push(error.message);
    }

    // Test 2: No routing errors
    console.log('\\nTest 2: No "Endpoint not found" errors');
    results.total++;
    try {
      const response = await makeRequest(`${FRONTEND_BASE}/api/agents`);

      if (response.raw && response.raw.includes('Endpoint not found')) {
        console.log('✗ Still getting "Endpoint not found" error');
        results.failed++;
      } else {
        console.log('✓ No "Endpoint not found" errors detected');
        results.passed++;
      }
    } catch (error) {
      console.log('✗ Test failed:', error.message);
      results.failed++;
    }

    // Test 3: Agent data structure validation
    console.log('\\nTest 3: Agent data structure validation');
    results.total++;
    try {
      const response = await makeRequest(`${FRONTEND_BASE}/api/agents`);

      if (response.data) {
        const agents = response.data.data || response.data.agents || response.data;

        if (Array.isArray(agents) && agents.length > 0) {
          const firstAgent = agents[0];
          const requiredFields = ['id', 'name', 'status'];
          const missingFields = requiredFields.filter(field => !firstAgent[field]);

          if (missingFields.length === 0) {
            console.log(`✓ Agent data structure valid (${agents.length} agents)`);
            results.passed++;
          } else {
            console.log(`✗ Missing required fields: ${missingFields.join(', ')}`);
            results.failed++;
          }
        } else {
          console.log('✗ No valid agent data found');
          results.failed++;
        }
      } else {
        console.log('✗ No response data');
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Test failed:', error.message);
      results.failed++;
    }

    // Test 4: Response performance
    console.log('\\nTest 4: API response performance');
    results.total++;
    const startTime = Date.now();
    try {
      await makeRequest(`${FRONTEND_BASE}/api/agents`);
      const responseTime = Date.now() - startTime;

      if (responseTime < 1000) {
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

    // Test 5: No mock data contamination
    console.log('\\nTest 5: Mock data contamination check');
    results.total++;
    try {
      const response = await makeRequest(`${FRONTEND_BASE}/api/agents`);
      const mockIndicators = [
        'Chief of Staff Agent',
        'Impact Filter Agent',
        'Mock agent data'
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

  } catch (error) {
    console.error('\\nTest suite error:', error);
    results.errors.push(error.message);
  }

  // Final Report
  console.log('\\n=====================================');
  console.log('ROUTING FIX TEST RESULTS');
  console.log('=====================================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✓`);
  console.log(`Failed: ${results.failed} ✗`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  if (results.errors.length > 0) {
    console.log('\\nErrors encountered:');
    results.errors.forEach(err => console.log(`  - ${err}`));
  }

  // Final verdict
  console.log('\\n=====================================');
  if (results.passed === results.total) {
    console.log('🎉 ROUTING FIX SUCCESSFUL!');
    console.log('✅ All API calls working correctly');
    console.log('✅ No "Endpoint not found" errors');
    console.log('✅ Real agent data flowing properly');
  } else {
    console.log('⚠️ ROUTING ISSUES DETECTED');
    console.log('❌ Some tests failed - review errors above');
  }

  return results;
}

// Run the test
if (require.main === module) {
  testRoutingFix()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testRoutingFix };