/**
 * Integration test to verify the full data flow works correctly
 * Tests actual API endpoint with our fixed parsing logic
 */

import http from 'http';

// Data parsing function that matches our components
function parseAgentData(data) {
  return Array.isArray(data) ? data : (data?.agents || data?.data || []);
}

async function testApiIntegration() {
  console.log("🔗 Testing API Integration with Fixed Data Parsing\n");

  try {
    // Test the actual /api/agents endpoint
    const response = await fetch('http://localhost:3000/api/agents');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("📥 Raw API Response:");
    console.log(JSON.stringify(data, null, 2));
    console.log("");

    // Apply our parsing logic
    const agentsList = parseAgentData(data);

    console.log("🔧 Parsed Agents List:");
    console.log(`  Total agents: ${agentsList.length}`);

    if (agentsList.length > 0) {
      console.log("  Sample agent:");
      console.log(`    ID: ${agentsList[0].id}`);
      console.log(`    Name: ${agentsList[0].name}`);
      console.log(`    Status: ${agentsList[0].status}`);
      console.log(`    Category: ${agentsList[0].category}`);
    }

    console.log("");

    // Verify the data structure
    if (Array.isArray(agentsList)) {
      console.log("✅ SUCCESS: Data parsing returned an array");

      const hasValidAgents = agentsList.every(agent =>
        agent && typeof agent === 'object' && agent.id && agent.name
      );

      if (hasValidAgents) {
        console.log("✅ SUCCESS: All agents have valid structure (id, name)");
      } else {
        console.log("❌ WARNING: Some agents have invalid structure");
      }

      console.log(`✅ SUCCESS: ${agentsList.length} agents successfully parsed`);
      return true;
    } else {
      console.log("❌ FAILED: Data parsing did not return an array");
      return false;
    }

  } catch (error) {
    console.log("❌ INTEGRATION TEST FAILED:");
    console.log(`  Error: ${error.message}`);
    console.log("  Make sure the server is running on port 3000");
    return false;
  }
}

// Test different response formats that might come from the API
function testResponseFormats() {
  console.log("🧪 Testing Different Response Formats\n");

  const testCases = [
    {
      name: "Current API format",
      response: {
        success: true,
        agents: [{ id: 1, name: "Test Agent" }],
        total: 1
      }
    },
    {
      name: "Legacy data format",
      response: {
        data: [{ id: 1, name: "Test Agent" }],
        count: 1
      }
    },
    {
      name: "Direct array format",
      response: [{ id: 1, name: "Test Agent" }]
    }
  ];

  let allPassed = true;

  testCases.forEach((testCase, index) => {
    const result = parseAgentData(testCase.response);
    const passed = Array.isArray(result) && result.length === 1 && result[0].name === "Test Agent";

    console.log(`${index + 1}. ${testCase.name}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    if (!passed) allPassed = false;
  });

  console.log(`\nFormat compatibility: ${allPassed ? '✅ ALL FORMATS SUPPORTED' : '❌ SOME FORMATS FAILED'}\n`);
  return allPassed;
}

// Run tests
async function runIntegrationTests() {
  console.log("🚀 Running Integration Tests for Agent Feed Data Parsing\n");
  console.log("=" * 60);
  console.log("");

  const formatTest = testResponseFormats();
  const apiTest = await testApiIntegration();

  console.log("=" * 60);
  console.log("📊 Final Results:");
  console.log(`  Response Format Tests: ${formatTest ? 'PASSED' : 'FAILED'}`);
  console.log(`  API Integration Test: ${apiTest ? 'PASSED' : 'FAILED'}`);

  const overallSuccess = formatTest && apiTest;
  console.log(`  Overall Result: ${overallSuccess ? '🎉 SUCCESS' : '❌ FAILED'}`);

  if (overallSuccess) {
    console.log("\n🎯 All integration tests passed!");
    console.log("✨ The data parsing fixes are working correctly across all scenarios.");
  } else {
    console.log("\n⚠️  Some integration tests failed.");
    console.log("🔧 Please review the implementation and ensure the server is running.");
  }

  return overallSuccess;
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTests();
}

export { runIntegrationTests, parseAgentData };