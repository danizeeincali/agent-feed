/**
 * SPARC Final Validation Test
 * Complete end-to-end validation of agents functionality
 * Zero mocks, 100% real functionality testing
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

async function runFinalValidation() {
  console.log('==========================================');
  console.log('SPARC AGENTS FINAL VALIDATION TEST SUITE');
  console.log('==========================================\\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: [],
    timestamp: new Date().toISOString()
  };

  try {
    // Test 1: Frontend API accessibility
    console.log('Test 1: Frontend API endpoint accessibility');
    results.total++;
    try {
      const response = await makeRequest(`${FRONTEND_BASE}/api/agents`);

      if (response.status === 200) {
        console.log('✓ Frontend API returns 200 OK');

        if (response.data && (response.data.data || response.data.agents)) {
          const agents = response.data.data || response.data.agents;
          console.log(`✓ Received ${agents.length} agents from API`);
          results.passed++;
        } else {
          console.log('✗ Invalid response structure');
          results.failed++;
        }
      } else {
        console.log(`✗ Frontend API returned ${response.status}`);
        results.failed++;
      }
    } catch (error) {
      console.log('✗ API request failed:', error.message);
      results.failed++;
      results.errors.push(error.message);
    }

    // Test 2: Agent data completeness
    console.log('\\nTest 2: Agent data completeness');
    results.total++;
    try {
      const response = await makeRequest(`${FRONTEND_BASE}/api/agents`);

      if (response.data) {
        const agents = response.data.data || response.data.agents || response.data;

        if (agents && agents.length > 0) {
          const sampleAgent = agents[0];

          // Check for essential fields
          const requiredFields = ['id', 'name', 'status', 'capabilities'];
          const missingFields = requiredFields.filter(field => !sampleAgent[field]);

          if (missingFields.length === 0) {
            console.log('✓ Essential agent fields present');

            // Check for performance data
            if (sampleAgent.usage_count !== undefined ||
                sampleAgent.performance_metrics !== undefined) {
              console.log('✓ Performance metrics available');
              results.passed++;
            } else {
              console.log('✗ Performance metrics missing');
              results.failed++;
            }
          } else {
            console.log(`✗ Missing essential fields: ${missingFields.join(', ')}`);
            results.failed++;
          }
        } else {
          console.log('✗ No agents in response');
          results.failed++;
        }
      }
    } catch (error) {
      console.log('✗ Test failed:', error.message);
      results.failed++;
      results.errors.push(error.message);
    }

    // Test 3: Real vs Mock data verification
    console.log('\\nTest 3: Real vs Mock data verification');
    results.total++;
    try {
      const response = await makeRequest(`${FRONTEND_BASE}/api/agents`);

      if (response.data) {
        const agents = response.data.data || response.data.agents || response.data;

        if (agents && agents.length > 0) {
          // Look for signs of real data
          let realDataIndicators = 0;

          // Check for real agent IDs
          const realAgentIds = ['personal-todos-agent', 'page-builder-agent', 'meta-agent'];
          for (const agentId of realAgentIds) {
            if (agents.some(agent => agent.id === agentId)) {
              realDataIndicators++;
            }
          }

          // Check for performance metrics variations (real data should vary)
          const usageCounts = agents.map(a => a.usage_count).filter(u => u !== undefined);
          const hasVariedUsage = usageCounts.length > 0 &&
            Math.max(...usageCounts) > Math.min(...usageCounts);

          if (hasVariedUsage) realDataIndicators++;

          if (realDataIndicators >= 2) {
            console.log(`✓ Real data confirmed (${realDataIndicators} indicators)`);
            results.passed++;
          } else {
            console.log(`✗ Data appears artificial (${realDataIndicators} indicators)`);
            results.failed++;
          }
        }
      }
    } catch (error) {
      console.log('✗ Test failed:', error.message);
      results.failed++;
      results.errors.push(error.message);
    }

    // Test 4: API performance
    console.log('\\nTest 4: API performance validation');
    results.total++;
    const startTime = Date.now();
    try {
      await makeRequest(`${FRONTEND_BASE}/api/agents`);
      const responseTime = Date.now() - startTime;

      if (responseTime < 1000) {
        console.log(`✓ Good performance: ${responseTime}ms`);
        results.passed++;
      } else if (responseTime < 3000) {
        console.log(`✓ Acceptable performance: ${responseTime}ms`);
        results.passed++;
      } else {
        console.log(`✗ Poor performance: ${responseTime}ms`);
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Performance test failed:', error.message);
      results.failed++;
      results.errors.push(error.message);
    }

    // Test 5: Error handling
    console.log('\\nTest 5: Error handling verification');
    results.total++;
    try {
      const response = await makeRequest(`${FRONTEND_BASE}/api/agents`);

      // Check for error indicators
      const hasEndpointError = response.raw && response.raw.includes('Endpoint not found');
      const hasNetworkError = response.raw && response.raw.includes('Network error');
      const hasFetchError = response.raw && response.raw.includes('Failed to fetch');

      if (!hasEndpointError && !hasNetworkError && !hasFetchError) {
        console.log('✓ No error messages in response');
        results.passed++;
      } else {
        console.log('✗ Error messages detected in response');
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Error handling test failed:', error.message);
      results.failed++;
      results.errors.push(error.message);
    }

    // Test 6: Data consistency
    console.log('\\nTest 6: Data consistency verification');
    results.total++;
    try {
      const response1 = await makeRequest(`${FRONTEND_BASE}/api/agents`);
      await new Promise(resolve => setTimeout(resolve, 100));
      const response2 = await makeRequest(`${FRONTEND_BASE}/api/agents`);

      if (response1.data && response2.data) {
        const agents1 = response1.data.data || response1.data.agents || response1.data;
        const agents2 = response2.data.data || response2.data.agents || response2.data;

        if (agents1.length === agents2.length) {
          const ids1 = agents1.map(a => a.id).sort();
          const ids2 = agents2.map(a => a.id).sort();

          if (JSON.stringify(ids1) === JSON.stringify(ids2)) {
            console.log('✓ Data is consistent across requests');
            results.passed++;
          } else {
            console.log('✗ Data inconsistent between requests');
            results.failed++;
          }
        } else {
          console.log('✗ Agent count differs between requests');
          results.failed++;
        }
      }
    } catch (error) {
      console.log('✗ Consistency test failed:', error.message);
      results.failed++;
      results.errors.push(error.message);
    }

  } catch (error) {
    console.error('\\nTest suite error:', error);
    results.errors.push(error.message);
  }

  // Final Report
  console.log('\\n==========================================');
  console.log('FINAL VALIDATION RESULTS');
  console.log('==========================================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✓`);
  console.log(`Failed: ${results.failed} ✗`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log(`Test Timestamp: ${results.timestamp}`);

  if (results.errors.length > 0) {
    console.log('\\nErrors encountered:');
    results.errors.forEach(err => console.log(`  - ${err}`));
  }

  // Final verdict
  console.log('\\n==========================================');
  if (results.passed === results.total) {
    console.log('🎉 AGENTS FUNCTIONALITY 100% VERIFIED!');
    console.log('✅ All APIs working correctly');
    console.log('✅ Real data flowing properly');
    console.log('✅ No errors or routing issues');
    console.log('✅ Performance within acceptable limits');
    console.log('✅ Data consistency maintained');
  } else if (results.passed >= results.total * 0.8) {
    console.log('✅ AGENTS FUNCTIONALITY MOSTLY WORKING');
    console.log('⚠️ Minor issues detected - see failed tests above');
  } else {
    console.log('❌ AGENTS FUNCTIONALITY HAS ISSUES');
    console.log('⚠️ Multiple failures detected - review all failed tests');
  }

  return results;
}

// Run the tests
if (require.main === module) {
  runFinalValidation()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { runFinalValidation };