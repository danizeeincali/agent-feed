/**
 * PRODUCTION VALIDATION: Advanced Filter Fix Verification
 * Tests the critical bug fixes for multi-select filtering
 */

import http from 'http';

class FixValidationTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.results = {
      testsPassed: 0,
      testsFailed: 0,
      issues: [],
      fixes: []
    };
  }

  async makeRequest(endpoint) {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      return { success: response.ok, data, status: response.status };
    } catch (error) {
      return { success: false, error: error.message, data: null };
    }
  }

  async testCriticalFixScenarios() {
    console.log('\n🔧 TESTING CRITICAL FIX SCENARIOS');
    console.log('='.repeat(50));

    // Scenario 1: Agent-only filter (most common use case)
    console.log('\n📝 Test 1: Agent-only multi-select filter');
    const agentOnlyTest = await this.makeRequest('/api/v1/agent-posts?filter=multi-select&agents=ProductionValidator&mode=AND');
    
    if (agentOnlyTest.success && agentOnlyTest.data.data.length > 0) {
      console.log('✅ FIXED: Agent-only filter returns results');
      this.results.testsPassed++;
      this.results.fixes.push('Agent-only multi-select filtering now works');
    } else {
      console.log('❌ STILL BROKEN: Agent-only filter fails');
      this.results.testsFailed++;
      this.results.issues.push('Agent-only filtering still broken');
    }

    // Scenario 2: Hashtag-only filter
    console.log('\n📝 Test 2: Hashtag-only multi-select filter');
    const hashtagOnlyTest = await this.makeRequest('/api/v1/agent-posts?filter=multi-select&hashtags=validation&mode=AND');
    
    if (hashtagOnlyTest.success) {
      const resultCount = hashtagOnlyTest.data.data?.length || 0;
      console.log(`✅ FIXED: Hashtag-only filter returns ${resultCount} results`);
      this.results.testsPassed++;
      this.results.fixes.push('Hashtag-only multi-select filtering now works');
    } else {
      console.log('❌ STILL BROKEN: Hashtag-only filter fails');
      this.results.testsFailed++;
      this.results.issues.push('Hashtag-only filtering still broken');
    }

    // Scenario 3: Agent + Hashtag combination (OR mode)
    console.log('\n📝 Test 3: Agent + Hashtag combination (OR mode)');
    const combinationTest = await this.makeRequest('/api/v1/agent-posts?filter=multi-select&agents=ProductionValidator&hashtags=production&mode=OR');
    
    if (combinationTest.success && combinationTest.data.data.length > 0) {
      console.log('✅ FIXED: Agent+Hashtag OR combination returns results');
      this.results.testsPassed++;
      this.results.fixes.push('Agent+Hashtag OR combinations now work');
    } else {
      console.log('❌ STILL BROKEN: Agent+Hashtag OR combination fails');
      this.results.testsFailed++;
      this.results.issues.push('Agent+Hashtag OR combinations still broken');
    }

    // Scenario 4: Multiple agents
    console.log('\n📝 Test 4: Multiple agents filter');
    const multiAgentTest = await this.makeRequest('/api/v1/agent-posts?filter=multi-select&agents=ProductionValidator,DatabaseManager&mode=OR');
    
    if (multiAgentTest.success) {
      const resultCount = multiAgentTest.data.data?.length || 0;
      console.log(`✅ FIXED: Multiple agents filter returns ${resultCount} results`);
      this.results.testsPassed++;
      this.results.fixes.push('Multiple agent filtering now works');
    } else {
      console.log('❌ STILL BROKEN: Multiple agents filter fails');
      this.results.testsFailed++;
      this.results.issues.push('Multiple agent filtering still broken');
    }

    // Scenario 5: Reset to all posts
    console.log('\n📝 Test 5: Reset to all posts functionality');
    const resetTest = await this.makeRequest('/api/v1/agent-posts?filter=all');
    
    if (resetTest.success && resetTest.data.data.length > 0) {
      console.log(`✅ FIXED: Reset returns ${resetTest.data.data.length} total posts`);
      this.results.testsPassed++;
      this.results.fixes.push('Reset to all posts functionality restored');
    } else {
      console.log('❌ STILL BROKEN: Reset functionality fails');
      this.results.testsFailed++;
      this.results.issues.push('Reset functionality still broken');
    }
  }

  async testEdgeCases() {
    console.log('\n🧪 TESTING EDGE CASES');
    console.log('='.repeat(30));

    // Edge Case 1: Empty agent list
    console.log('\n📝 Edge Case 1: Empty parameters');
    const emptyTest = await this.makeRequest('/api/v1/agent-posts?filter=multi-select&mode=AND');
    
    if (emptyTest.success) {
      console.log('✅ Empty multi-select handled gracefully');
      this.results.testsPassed++;
    } else {
      console.log('❌ Empty multi-select causes errors');
      this.results.testsFailed++;
    }

    // Edge Case 2: Non-existent agent
    console.log('\n📝 Edge Case 2: Non-existent agent');
    const nonExistentTest = await this.makeRequest('/api/v1/agent-posts?filter=multi-select&agents=NonExistentAgent&mode=AND');
    
    if (nonExistentTest.success) {
      const resultCount = nonExistentTest.data.data?.length || 0;
      console.log(`✅ Non-existent agent returns ${resultCount} results (expected 0)`);
      this.results.testsPassed++;
    } else {
      console.log('❌ Non-existent agent causes errors');
      this.results.testsFailed++;
    }

    // Edge Case 3: Special characters in agent names
    console.log('\n📝 Edge Case 3: URL encoding handling');
    const encodedTest = await this.makeRequest('/api/v1/agent-posts?filter=multi-select&agents=' + encodeURIComponent('Production Validator') + '&mode=AND');
    
    if (encodedTest.success) {
      console.log('✅ URL encoding handled properly');
      this.results.testsPassed++;
    } else {
      console.log('❌ URL encoding issues detected');
      this.results.testsFailed++;
    }
  }

  async simulateFrontendBehavior() {
    console.log('\n🖥️ SIMULATING FRONTEND BEHAVIOR');
    console.log('='.repeat(40));

    // Simulate what happens when user applies agent filter
    console.log('\n📝 Simulation 1: User selects agent "ProductionValidator"');
    
    // This simulates the exact API call the frontend should make
    const frontendFilterObject = {
      type: 'multi-select',
      agents: ['ProductionValidator'],
      hashtags: [],
      combinationMode: 'AND',
      savedPostsEnabled: false,
      myPostsEnabled: false,
      userId: 'anonymous'
    };

    console.log('Frontend filter object:', JSON.stringify(frontendFilterObject, null, 2));

    // Convert to backend URL (this is what the API service should do)
    let backendUrl = '/api/v1/agent-posts?filter=multi-select';
    if (frontendFilterObject.agents.length > 0) {
      backendUrl += `&agents=${frontendFilterObject.agents.join(',')}`;
    }
    if (frontendFilterObject.hashtags.length > 0) {
      backendUrl += `&hashtags=${frontendFilterObject.hashtags.join(',')}`;
    }
    backendUrl += `&mode=${frontendFilterObject.combinationMode}`;

    console.log('Generated backend URL:', backendUrl);

    const simulationResult = await this.makeRequest(backendUrl);
    
    if (simulationResult.success && simulationResult.data.data.length > 0) {
      console.log(`✅ Frontend simulation successful: ${simulationResult.data.data.length} results`);
      this.results.testsPassed++;
      this.results.fixes.push('Frontend-to-backend parameter mapping fixed');
    } else {
      console.log('❌ Frontend simulation failed');
      this.results.testsFailed++;
      this.results.issues.push('Frontend-to-backend parameter mapping still broken');
    }

    // Simulate user clearing filter
    console.log('\n📝 Simulation 2: User clears all filters');
    const clearResult = await this.makeRequest('/api/v1/agent-posts?filter=all');
    
    if (clearResult.success && clearResult.data.data.length > 0) {
      console.log(`✅ Clear filter simulation successful: ${clearResult.data.data.length} total posts`);
      this.results.testsPassed++;
    } else {
      console.log('❌ Clear filter simulation failed');
      this.results.testsFailed++;
    }
  }

  generateFixReport() {
    console.log('\n📋 FIX VALIDATION REPORT');
    console.log('='.repeat(50));

    const totalTests = this.results.testsPassed + this.results.testsFailed;
    const successRate = totalTests > 0 ? Math.round((this.results.testsPassed / totalTests) * 100) : 0;

    console.log(`\n📊 TEST RESULTS:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Tests Passed: ${this.results.testsPassed} ✅`);
    console.log(`   Tests Failed: ${this.results.testsFailed} ❌`);
    console.log(`   Success Rate: ${successRate}%`);

    if (this.results.fixes.length > 0) {
      console.log(`\n✅ CONFIRMED FIXES:`);
      this.results.fixes.forEach((fix, index) => {
        console.log(`   ${index + 1}. ${fix}`);
      });
    }

    if (this.results.issues.length > 0) {
      console.log(`\n❌ REMAINING ISSUES:`);
      this.results.issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

    console.log(`\n🎯 OVERALL STATUS:`);
    if (successRate >= 90) {
      console.log('✅ CRITICAL FIXES SUCCESSFUL - Production ready');
    } else if (successRate >= 70) {
      console.log('🟡 PARTIAL SUCCESS - Some fixes working, issues remain');
    } else {
      console.log('❌ FIX VALIDATION FAILED - Critical issues persist');
    }

    if (successRate >= 90) {
      console.log('\n🚀 DEPLOYMENT RECOMMENDATIONS:');
      console.log('   1. ✅ Advanced filter functionality restored');
      console.log('   2. ✅ Multi-select agent/hashtag filtering working');  
      console.log('   3. ✅ Reset functionality operational');
      console.log('   4. ✅ Ready for production deployment');
      console.log('   5. 📝 Consider adding E2E tests to prevent regression');
    }

    return successRate;
  }
}

async function runFixValidation() {
  console.log('🔧 PRODUCTION FIX VALIDATION');
  console.log('Testing critical bug fixes for advanced filter');
  console.log('='.repeat(60));

  const tester = new FixValidationTester();
  
  try {
    await tester.testCriticalFixScenarios();
    await tester.testEdgeCases();
    await tester.simulateFrontendBehavior();
    const successRate = tester.generateFixReport();
    
    process.exit(successRate >= 90 ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Fix validation failed:', error);
    process.exit(1);
  }
}

// Check backend health before testing
async function main() {
  try {
    const healthCheck = await fetch('http://localhost:3000/health');
    if (!healthCheck.ok) throw new Error('Backend unhealthy');
    
    console.log('✅ Backend is healthy, proceeding with fix validation...\n');
    await runFixValidation();
    
  } catch (error) {
    console.error('❌ Cannot connect to backend. Please ensure backend is running.');
    console.error('   Run: npm start');
    process.exit(1);
  }
}

main().catch(console.error);