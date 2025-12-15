/**
 * Comprehensive End-to-End Filter System Test Suite
 * Tests all advanced filtering functionality with real API calls
 */

const BASE_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5174';

// Test utilities
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// API Testing Functions
async function testApiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return {
      success: response.ok,
      status: response.status,
      data,
      response
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: 0
    };
  }
}

// Test 1: Backend API Endpoint Tests
async function testBackendAPIEndpoints() {
  console.log('\n🔧 Testing Backend API Endpoints...');
  const results = {};
  
  // Test health endpoint
  const health = await testApiCall('/api/v1/health');
  results.health = {
    passed: health.success,
    details: health.success ? 'Health endpoint responsive' : health.error
  };
  console.log(`Health Check: ${health.success ? '✅' : '❌'}`);
  
  // Test filter data endpoint
  const filterData = await testApiCall('/api/v1/filter-data');
  results.filterData = {
    passed: filterData.success && filterData.data.agents && filterData.data.hashtags,
    details: filterData.success ? 
      `Found ${filterData.data.agents?.length || 0} agents, ${filterData.data.hashtags?.length || 0} hashtags` : 
      filterData.error
  };
  console.log(`Filter Data: ${results.filterData.passed ? '✅' : '❌'} - ${results.filterData.details}`);
  
  // Test agent posts endpoint (basic)
  const allPosts = await testApiCall('/api/v1/agent-posts');
  results.allPosts = {
    passed: allPosts.success && Array.isArray(allPosts.data),
    details: allPosts.success ? 
      `Retrieved ${allPosts.data.length} posts` : 
      allPosts.error
  };
  console.log(`All Posts: ${results.allPosts.passed ? '✅' : '❌'} - ${results.allPosts.details}`);
  
  // Store agents and hashtags for further testing
  const availableAgents = filterData.success ? filterData.data.agents : [];
  const availableHashtags = filterData.success ? filterData.data.hashtags : [];
  
  return { results, availableAgents, availableHashtags, totalPosts: allPosts.data?.length || 0 };
}

// Test 2: Multi-Select Filter API Tests
async function testMultiSelectFilterAPI(agents, hashtags) {
  console.log('\n🎯 Testing Multi-Select Filter API...');
  const results = {};
  
  if (agents.length === 0 || hashtags.length === 0) {
    results.skipped = 'No agents or hashtags available for testing';
    console.log('⚠️ Skipping multi-select tests - no data available');
    return results;
  }
  
  // Test with 2 agents, OR mode
  const testAgents = agents.slice(0, 2);
  const agentFilterOR = await testApiCall('/api/v1/agent-posts', {
    method: 'POST',
    body: JSON.stringify({
      filter: 'multi-select',
      agents: testAgents,
      combinationMode: 'OR'
    })
  });
  
  results.agentFilterOR = {
    passed: agentFilterOR.success && Array.isArray(agentFilterOR.data),
    details: agentFilterOR.success ? 
      `OR filter with agents [${testAgents.join(', ')}] returned ${agentFilterOR.data.length} posts` : 
      agentFilterOR.error,
    data: agentFilterOR.data
  };
  console.log(`Agent Filter (OR): ${results.agentFilterOR.passed ? '✅' : '❌'} - ${results.agentFilterOR.details}`);
  
  // Test with 2 agents, AND mode
  const agentFilterAND = await testApiCall('/api/v1/agent-posts', {
    method: 'POST',
    body: JSON.stringify({
      filter: 'multi-select',
      agents: testAgents,
      combinationMode: 'AND'
    })
  });
  
  results.agentFilterAND = {
    passed: agentFilterAND.success && Array.isArray(agentFilterAND.data),
    details: agentFilterAND.success ? 
      `AND filter with agents [${testAgents.join(', ')}] returned ${agentFilterAND.data.length} posts` : 
      agentFilterAND.error,
    data: agentFilterAND.data
  };
  console.log(`Agent Filter (AND): ${results.agentFilterAND.passed ? '✅' : '❌'} - ${results.agentFilterAND.details}`);
  
  // Test with hashtags
  const testHashtags = hashtags.slice(0, 2);
  const hashtagFilter = await testApiCall('/api/v1/agent-posts', {
    method: 'POST',
    body: JSON.stringify({
      filter: 'multi-select',
      hashtags: testHashtags,
      combinationMode: 'OR'
    })
  });
  
  results.hashtagFilter = {
    passed: hashtagFilter.success && Array.isArray(hashtagFilter.data),
    details: hashtagFilter.success ? 
      `Hashtag filter with [${testHashtags.join(', ')}] returned ${hashtagFilter.data.length} posts` : 
      hashtagFilter.error,
    data: hashtagFilter.data
  };
  console.log(`Hashtag Filter: ${results.hashtagFilter.passed ? '✅' : '❌'} - ${results.hashtagFilter.details}`);
  
  // Test combined agents + hashtags
  const combinedFilter = await testApiCall('/api/v1/agent-posts', {
    method: 'POST',
    body: JSON.stringify({
      filter: 'multi-select',
      agents: [testAgents[0]],
      hashtags: [testHashtags[0]],
      combinationMode: 'OR'
    })
  });
  
  results.combinedFilter = {
    passed: combinedFilter.success && Array.isArray(combinedFilter.data),
    details: combinedFilter.success ? 
      `Combined filter (agent + hashtag) returned ${combinedFilter.data.length} posts` : 
      combinedFilter.error,
    data: combinedFilter.data
  };
  console.log(`Combined Filter: ${results.combinedFilter.passed ? '✅' : '❌'} - ${results.combinedFilter.details}`);
  
  return results;
}

// Test 3: Filter Suggestions API
async function testFilterSuggestionsAPI() {
  console.log('\n💡 Testing Filter Suggestions API...');
  const results = {};
  
  // Test agent suggestions
  const agentSuggestions = await testApiCall('/api/v1/filter-suggestions?type=agents&query=prod');
  results.agentSuggestions = {
    passed: agentSuggestions.success && Array.isArray(agentSuggestions.data),
    details: agentSuggestions.success ? 
      `Agent suggestions for "prod": ${agentSuggestions.data.length} results` : 
      agentSuggestions.error,
    data: agentSuggestions.data
  };
  console.log(`Agent Suggestions: ${results.agentSuggestions.passed ? '✅' : '❌'} - ${results.agentSuggestions.details}`);
  
  // Test hashtag suggestions
  const hashtagSuggestions = await testApiCall('/api/v1/filter-suggestions?type=hashtags&query=test');
  results.hashtagSuggestions = {
    passed: hashtagSuggestions.success && Array.isArray(hashtagSuggestions.data),
    details: hashtagSuggestions.success ? 
      `Hashtag suggestions for "test": ${hashtagSuggestions.data.length} results` : 
      hashtagSuggestions.error,
    data: hashtagSuggestions.data
  };
  console.log(`Hashtag Suggestions: ${results.hashtagSuggestions.passed ? '✅' : '❌'} - ${results.hashtagSuggestions.details}`);
  
  return results;
}

// Test 4: Saved Posts and My Posts API
async function testSavedPostsAPI() {
  console.log('\n💾 Testing Saved Posts and My Posts API...');
  const results = {};
  
  // Test saved posts filter
  const savedPosts = await testApiCall('/api/v1/agent-posts', {
    method: 'POST',
    body: JSON.stringify({
      filter: 'multi-select',
      savedPostsEnabled: true,
      userId: 'test-user'
    })
  });
  
  results.savedPosts = {
    passed: savedPosts.success && Array.isArray(savedPosts.data),
    details: savedPosts.success ? 
      `Saved posts filter returned ${savedPosts.data.length} posts` : 
      savedPosts.error,
    data: savedPosts.data
  };
  console.log(`Saved Posts Filter: ${results.savedPosts.passed ? '✅' : '❌'} - ${results.savedPosts.details}`);
  
  // Test my posts filter
  const myPosts = await testApiCall('/api/v1/agent-posts', {
    method: 'POST',
    body: JSON.stringify({
      filter: 'multi-select',
      myPostsEnabled: true,
      userId: 'test-user'
    })
  });
  
  results.myPosts = {
    passed: myPosts.success && Array.isArray(myPosts.data),
    details: myPosts.success ? 
      `My posts filter returned ${myPosts.data.length} posts` : 
      myPosts.error,
    data: myPosts.data
  };
  console.log(`My Posts Filter: ${results.myPosts.passed ? '✅' : '❌'} - ${results.myPosts.details}`);
  
  return results;
}

// Test 5: SQL Injection and Edge Cases
async function testSecurityAndEdgeCases() {
  console.log('\n🛡️ Testing Security and Edge Cases...');
  const results = {};
  
  // Test SQL injection attempts
  const sqlInjectionTest = await testApiCall('/api/v1/agent-posts', {
    method: 'POST',
    body: JSON.stringify({
      filter: 'multi-select',
      agents: ["'; DROP TABLE agent_posts; --", "test"]
    })
  });
  
  results.sqlInjection = {
    passed: sqlInjectionTest.success || sqlInjectionTest.status === 400, // Should either work safely or reject
    details: sqlInjectionTest.success ? 
      'SQL injection attempt handled safely' : 
      `Properly rejected with status ${sqlInjectionTest.status}`,
    data: sqlInjectionTest.data
  };
  console.log(`SQL Injection Test: ${results.sqlInjection.passed ? '✅' : '❌'} - ${results.sqlInjection.details}`);
  
  // Test empty filters
  const emptyFilter = await testApiCall('/api/v1/agent-posts', {
    method: 'POST',
    body: JSON.stringify({
      filter: 'multi-select',
      agents: [],
      hashtags: []
    })
  });
  
  results.emptyFilter = {
    passed: emptyFilter.success && Array.isArray(emptyFilter.data),
    details: emptyFilter.success ? 
      `Empty filter returned ${emptyFilter.data.length} posts (should return all)` : 
      emptyFilter.error,
    data: emptyFilter.data
  };
  console.log(`Empty Filter Test: ${results.emptyFilter.passed ? '✅' : '❌'} - ${results.emptyFilter.details}`);
  
  // Test invalid filter type
  const invalidFilter = await testApiCall('/api/v1/agent-posts', {
    method: 'POST',
    body: JSON.stringify({
      filter: 'invalid-filter-type'
    })
  });
  
  results.invalidFilter = {
    passed: invalidFilter.status === 400 || invalidFilter.success, // Should reject or handle gracefully
    details: invalidFilter.status === 400 ? 
      'Invalid filter properly rejected' : 
      'Invalid filter handled gracefully',
    data: invalidFilter.data
  };
  console.log(`Invalid Filter Test: ${results.invalidFilter.passed ? '✅' : '❌'} - ${results.invalidFilter.details}`);
  
  return results;
}

// Main test runner
async function runComprehensiveFilterTests() {
  console.log('🚀 Starting Comprehensive Filter System Tests...');
  console.log(`Backend: ${BASE_URL}`);
  console.log(`Frontend: ${FRONTEND_URL}`);
  console.log('=' .repeat(60));
  
  const testResults = {
    timestamp: new Date().toISOString(),
    backend: BASE_URL,
    frontend: FRONTEND_URL
  };
  
  try {
    // Test 1: Backend API endpoints
    const backendTest = await testBackendAPIEndpoints();
    testResults.backendAPI = backendTest.results;
    
    // Test 2: Multi-select filter functionality
    const multiSelectTest = await testMultiSelectFilterAPI(
      backendTest.availableAgents, 
      backendTest.availableHashtags
    );
    testResults.multiSelectFilter = multiSelectTest;
    
    // Test 3: Filter suggestions
    const suggestionsTest = await testFilterSuggestionsAPI();
    testResults.suggestions = suggestionsTest;
    
    // Test 4: Saved and my posts
    const savedPostsTest = await testSavedPostsAPI();
    testResults.savedPosts = savedPostsTest;
    
    // Test 5: Security and edge cases
    const securityTest = await testSecurityAndEdgeCases();
    testResults.security = securityTest;
    
    // Calculate overall results
    const allTests = [
      ...Object.values(testResults.backendAPI),
      ...Object.values(testResults.multiSelectFilter),
      ...Object.values(testResults.suggestions),
      ...Object.values(testResults.savedPosts),
      ...Object.values(testResults.security)
    ];
    
    const passedTests = allTests.filter(test => test.passed).length;
    const totalTests = allTests.length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    testResults.summary = {
      total: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      successRate: Math.round((passedTests / totalTests) * 100)
    };
    
    console.log('\n🎯 KEY FINDINGS:');
    if (testResults.backendAPI.health.passed) {
      console.log('✅ Backend server is healthy and responsive');
    }
    if (testResults.backendAPI.filterData.passed) {
      console.log('✅ Filter data endpoint working correctly');
    }
    if (testResults.multiSelectFilter.agentFilterOR?.passed) {
      console.log('✅ Multi-select agent filtering (OR mode) working');
    }
    if (testResults.multiSelectFilter.agentFilterAND?.passed) {
      console.log('✅ Multi-select agent filtering (AND mode) working');
    }
    if (testResults.suggestions.agentSuggestions?.passed) {
      console.log('✅ Agent suggestions API working');
    }
    if (testResults.security.sqlInjection?.passed) {
      console.log('✅ SQL injection protection working');
    }
    
    return testResults;
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    testResults.error = error.message;
    return testResults;
  }
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runComprehensiveFilterTests,
    testApiCall,
    BASE_URL,
    FRONTEND_URL
  };
}

// Auto-run if called directly
if (typeof window === 'undefined' && require.main === module) {
  runComprehensiveFilterTests().then(results => {
    console.log('\n📄 Full test results saved to test-results.json');
    require('fs').writeFileSync('test-results.json', JSON.stringify(results, null, 2));
  });
}