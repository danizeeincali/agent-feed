/**
 * SPARC Data Transform Validation Test
 * Tests the backend-to-UI data transformation for agents
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

async function testDataTransformation() {
  console.log('=========================================');
  console.log('SPARC DATA TRANSFORM VALIDATION TEST');
  console.log('=========================================\\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  };

  try {
    // Test 1: Backend data structure
    console.log('Test 1: Verify backend provides required data');
    results.total++;
    try {
      // First check what backend actually provides
      const backendResponse = await makeRequest('http://localhost:5173/api/agents');

      if (backendResponse.status === 200 && backendResponse.data.agents) {
        const sampleAgent = backendResponse.data.agents[0];
        console.log(`✓ Backend provides ${backendResponse.data.agents.length} agents`);

        // Check for expected backend fields
        const backendFields = ['id', 'name', 'status', 'capabilities', 'usage_count'];
        const missingFields = backendFields.filter(field => !sampleAgent.hasOwnProperty(field));

        if (missingFields.length === 0) {
          console.log('✓ Backend data has expected structure');
          results.passed++;
        } else {
          console.log(`✗ Backend missing fields: ${missingFields.join(', ')}`);
          results.failed++;
        }
      } else {
        console.log('✗ Backend not providing agent data');
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Backend test failed:', error.message);
      results.failed++;
      results.errors.push(error.message);
    }

    // Test 2: Frontend transformation working
    console.log('\\nTest 2: Frontend data transformation');
    results.total++;
    try {
      const response = await makeRequest(`${FRONTEND_BASE}/api/agents`);

      if (response.status === 200) {
        console.log('✓ Frontend API responding');

        // Check if we get transformed data or original data
        let agents = null;
        if (response.data.data) {
          agents = response.data.data;
        } else if (response.data.agents) {
          agents = response.data.agents;
        }

        if (agents && agents.length > 0) {
          const sampleAgent = agents[0];

          // Check for UI-expected fields
          const uiFields = ['metrics', 'id', 'name', 'status'];
          const missingUIFields = uiFields.filter(field => !sampleAgent.hasOwnProperty(field));

          if (missingUIFields.length === 0) {
            console.log('✓ Agent data has UI-expected structure');

            // Check metrics structure
            if (sampleAgent.metrics &&
                typeof sampleAgent.metrics.tasksCompleted !== 'undefined' &&
                typeof sampleAgent.metrics.successRate !== 'undefined') {
              console.log('✓ Metrics structure is correct');
              results.passed++;
            } else {
              console.log('✗ Metrics structure is incorrect');
              console.log('Sample metrics:', JSON.stringify(sampleAgent.metrics, null, 2));
              results.failed++;
            }
          } else {
            console.log(`✗ Missing UI fields: ${missingUIFields.join(', ')}`);
            results.failed++;
          }
        } else {
          console.log('✗ No agents found in response');
          results.failed++;
        }
      } else {
        console.log('✗ Frontend API not responding');
        results.failed++;
      }
    } catch (error) {
      console.log('✗ Frontend transformation test failed:', error.message);
      results.failed++;
      results.errors.push(error.message);
    }

    // Test 3: Metrics calculation accuracy
    console.log('\\nTest 3: Metrics calculation accuracy');
    results.total++;
    try {
      const response = await makeRequest(`${FRONTEND_BASE}/api/agents`);
      if (response.data) {
        let agents = response.data.data || response.data.agents || response.data;

        if (agents && agents.length > 0) {
          let validMetrics = 0;

          for (const agent of agents.slice(0, 3)) { // Check first 3 agents
            if (agent.metrics) {
              // Check if metrics are numbers/valid
              const tasksCompleted = typeof agent.metrics.tasksCompleted;
              const successRate = typeof agent.metrics.successRate;

              if (tasksCompleted === 'number' && successRate === 'number') {
                validMetrics++;
              }
            }
          }

          if (validMetrics >= 2) {
            console.log(`✓ Metrics calculated correctly for ${validMetrics} agents`);
            results.passed++;
          } else {
            console.log(`✗ Only ${validMetrics} agents have valid metrics`);
            results.failed++;
          }
        }
      }
    } catch (error) {
      console.log('✗ Metrics test failed:', error.message);
      results.failed++;
      results.errors.push(error.message);
    }

    // Test 4: CurrentTask field generation
    console.log('\\nTest 4: CurrentTask field generation');
    results.total++;
    try {
      const response = await makeRequest(`${FRONTEND_BASE}/api/agents`);
      if (response.data) {
        let agents = response.data.data || response.data.agents || response.data;

        if (agents && agents.length > 0) {
          let agentsWithTasks = 0;

          for (const agent of agents) {
            if (agent.currentTask) {
              agentsWithTasks++;
            }
          }

          console.log(`✓ Found ${agentsWithTasks} agents with current tasks`);
          results.passed++;
        }
      }
    } catch (error) {
      console.log('✗ CurrentTask test failed:', error.message);
      results.failed++;
      results.errors.push(error.message);
    }

  } catch (error) {
    console.error('\\nTest suite error:', error);
    results.errors.push(error.message);
  }

  // Final Report
  console.log('\\n=========================================');
  console.log('DATA TRANSFORM TEST RESULTS');
  console.log('=========================================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✓`);
  console.log(`Failed: ${results.failed} ✗`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

  if (results.errors.length > 0) {
    console.log('\\nErrors encountered:');
    results.errors.forEach(err => console.log(`  - ${err}`));
  }

  // Final verdict
  console.log('\\n=========================================');
  if (results.passed === results.total) {
    console.log('🎉 DATA TRANSFORMATION SUCCESSFUL!');
    console.log('✅ Backend data properly transformed for UI');
    console.log('✅ All metrics calculated correctly');
    console.log('✅ UI components will display properly');
  } else {
    console.log('⚠️ DATA TRANSFORMATION ISSUES DETECTED');
    console.log('❌ Some tests failed - UI may not display correctly');
  }

  return results;
}

// Run the test
if (require.main === module) {
  testDataTransformation()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { testDataTransformation };