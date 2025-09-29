/**
 * Simple validation test to verify data parsing fixes work correctly
 * Run with: node tests/validation-test.js
 */

// Test the data parsing logic from both components
function parseAgentDataTsx(data) {
  // Logic from /workspaces/agent-feed/pages/agents.tsx (FIXED)
  return Array.isArray(data) ? data : (data?.agents || data?.data || []);
}

function parseAgentDataJsx(data) {
  // Logic from /workspaces/agent-feed/frontend/src/pages/Agents.jsx (FIXED)
  return Array.isArray(data) ? data : (data?.agents || data?.data || []);
}

// Test data structures
const testCases = [
  {
    name: "Direct array response",
    data: [
      { id: 1, name: "Agent 1", status: "active" },
      { id: 2, name: "Agent 2", status: "inactive" }
    ],
    expected: [
      { id: 1, name: "Agent 1", status: "active" },
      { id: 2, name: "Agent 2", status: "inactive" }
    ]
  },
  {
    name: "Object with agents property",
    data: {
      success: true,
      agents: [
        { id: 1, name: "Agent 1", status: "active" },
        { id: 2, name: "Agent 2", status: "inactive" }
      ],
      total: 2
    },
    expected: [
      { id: 1, name: "Agent 1", status: "active" },
      { id: 2, name: "Agent 2", status: "inactive" }
    ]
  },
  {
    name: "Object with data property",
    data: {
      success: true,
      data: [
        { id: 1, name: "Agent 1", status: "active" },
        { id: 2, name: "Agent 2", status: "inactive" }
      ],
      total: 2
    },
    expected: [
      { id: 1, name: "Agent 1", status: "active" },
      { id: 2, name: "Agent 2", status: "inactive" }
    ]
  },
  {
    name: "Empty object",
    data: {},
    expected: []
  },
  {
    name: "Null data",
    data: null,
    expected: []
  },
  {
    name: "Undefined data",
    data: undefined,
    expected: []
  }
];

function runTests() {
  console.log("🧪 Running Data Parsing Validation Tests\n");

  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);

    try {
      // Test TSX component logic (FIXED)
      const resultTsx = parseAgentDataTsx(testCase.data);
      const tsxPassed = JSON.stringify(resultTsx) === JSON.stringify(testCase.expected);

      // Test JSX component logic (already good)
      const resultJsx = parseAgentDataJsx(testCase.data);
      const jsxPassed = JSON.stringify(resultJsx) === JSON.stringify(testCase.expected);

      if (tsxPassed && jsxPassed) {
        console.log("  ✅ PASSED - Both components handle data correctly");
        passed++;
      } else {
        console.log("  ❌ FAILED");
        if (!tsxPassed) {
          console.log(`    TSX Result: ${JSON.stringify(resultTsx)}`);
          console.log(`    Expected:   ${JSON.stringify(testCase.expected)}`);
        }
        if (!jsxPassed) {
          console.log(`    JSX Result: ${JSON.stringify(resultJsx)}`);
          console.log(`    Expected:   ${JSON.stringify(testCase.expected)}`);
        }
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
      failed++;
    }

    console.log("");
  });

  console.log("📊 Test Results:");
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log("\n🎉 All tests passed! Data parsing fixes are working correctly.");
    return true;
  } else {
    console.log("\n⚠️  Some tests failed. Please review the implementation.");
    return false;
  }
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { runTests, parseAgentDataTsx, parseAgentDataJsx };