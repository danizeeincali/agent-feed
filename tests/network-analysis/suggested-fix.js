// SUGGESTED FIX for /workspaces/agent-feed/pages/agents.tsx
//
// Problem: Line 25 currently reads:
// const agentsList = data.agents || data.data || [];
//
// This expects the API to return an object like:
// { agents: [...] } or { data: [...] }
//
// But the API actually returns a direct array:
// [{id: 1, name: "Code Assistant"}, {id: 2, name: "Data Analyzer"}, ...]

// CURRENT CODE (Line 25):
const agentsList_BROKEN = data.agents || data.data || [];

// FIXED CODE (Line 25):
const agentsList_WORKING = Array.isArray(data) ? data : (data.agents || data.data || []);

// Alternative fix with more robust error handling:
const agentsList_ROBUST = (() => {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object') {
    return data.agents || data.data || [];
  }
  return [];
})();

// Demonstration of the difference:

// When API returns: [{id: 1, name: "Code Assistant"}, {id: 2, name: "Data Analyzer"}]
const apiResponse = [{id: 1, name: "Code Assistant"}, {id: 2, name: "Data Analyzer"}];

console.log("Current broken logic result:", apiResponse.agents || apiResponse.data || []);
// Output: [] (empty array - WRONG!)

console.log("Fixed logic result:", Array.isArray(apiResponse) ? apiResponse : (apiResponse.agents || apiResponse.data || []));
// Output: [{id: 1, name: "Code Assistant"}, {id: 2, name: "Data Analyzer"}] (correct data - RIGHT!)

// This fix will make the agents display correctly on the page.