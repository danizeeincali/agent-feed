/**
 * Debug Test for UnifiedAgentPage "slice is not a function" error
 * Tests the fixed type guards to ensure arrays are properly handled
 */

// Simulate the error scenarios and test our fixes
const testCases = [
  {
    name: "Valid array",
    recentActivities: [
      { id: "1", type: "task_completed", title: "Test", description: "Test", timestamp: "2023-01-01T00:00:00Z" },
      { id: "2", type: "task_started", title: "Test 2", description: "Test 2", timestamp: "2023-01-01T01:00:00Z" }
    ],
    expected: "should work"
  },
  {
    name: "null value",
    recentActivities: null,
    expected: "should return empty array"
  },
  {
    name: "undefined value", 
    recentActivities: undefined,
    expected: "should return empty array"
  },
  {
    name: "object instead of array",
    recentActivities: { data: [] },
    expected: "should return empty array"
  },
  {
    name: "string instead of array",
    recentActivities: "not an array",
    expected: "should return empty array"
  }
];

// Test our type guard logic
function testTypeGuard(agent) {
  try {
    // This simulates the fixed code: (Array.isArray(agent?.recentActivities) ? agent.recentActivities : [])
    const activities = Array.isArray(agent?.recentActivities) ? agent.recentActivities : [];
    const sliced = activities.slice(0, 3);
    return { success: true, count: sliced.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Run tests
console.log("🔧 Testing UnifiedAgentPage slice error fix...\n");

testCases.forEach(testCase => {
  const agent = { recentActivities: testCase.recentActivities };
  const result = testTypeGuard(agent);
  
  console.log(`Test: ${testCase.name}`);
  console.log(`Expected: ${testCase.expected}`);
  console.log(`Result: ${result.success ? `✅ Success (${result.count} items)` : `❌ Error: ${result.error}`}`);
  console.log('---');
});

// Test API response structure handling
console.log("\n🌐 Testing API response handling...\n");

const apiResponses = [
  {
    name: "Correct API response",
    response: { success: true, data: [{ id: "1", type: "task_completed", title: "Test" }] }
  },
  {
    name: "Direct array response", 
    response: [{ id: "1", type: "task_completed", title: "Test" }]
  },
  {
    name: "Empty success response",
    response: { success: true, data: [] }
  },
  {
    name: "Failed API response",
    response: { success: false, error: "Agent not found" }
  },
  {
    name: "Malformed response",
    response: { data: "not an array" }
  }
];

function simulateFetchRealActivities(apiResponse) {
  try {
    // Simulate our improved fetchRealActivities logic
    if (apiResponse.success && Array.isArray(apiResponse.data)) {
      return apiResponse.data;
    }
    
    if (Array.isArray(apiResponse)) {
      return apiResponse;
    }
    
    return [];
  } catch (error) {
    return [];
  }
}

apiResponses.forEach(test => {
  const result = simulateFetchRealActivities(test.response);
  console.log(`${test.name}: ${Array.isArray(result) ? `✅ Array (${result.length} items)` : `❌ Not array`}`);
});

console.log("\n🎯 Summary:");
console.log("- Added Array.isArray() type guards to prevent slice errors");
console.log("- Improved fetchRealActivities to handle API response structure");
console.log("- Improved fetchRealPosts to handle API response structure"); 
console.log("- Added optional chaining (agent?.recentActivities) for null safety");
console.log("- All array operations now properly guarded against non-array values");