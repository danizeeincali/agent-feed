/**
 * PRODUCTION VALIDATION: Advanced Filter API Testing
 * Comprehensive backend endpoint validation for multi-select filtering bug
 */

import http from 'http';
import https from 'https';

class APIProductionValidator {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.results = {
      testsPassed: 0,
      testsFailed: 0,
      criticalIssues: [],
      warnings: [],
      apiCalls: [],
      databaseValidation: {},
      filterValidation: {}
    };
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const timestamp = new Date().toISOString();
    
    console.log(`📡 ${options.method || 'GET'} ${url}`);
    
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      
      const data = await response.json();
      
      const result = {
        timestamp,
        url,
        method: options.method || 'GET',
        status: response.status,
        success: response.ok,
        data: data,
        headers: Object.fromEntries(response.headers.entries())
      };
      
      this.results.apiCalls.push(result);
      
      console.log(`   Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
      console.log(`   Response keys: ${Object.keys(data).join(', ')}`);
      
      return result;
      
    } catch (error) {
      const result = {
        timestamp,
        url,
        method: options.method || 'GET',
        status: 0,
        success: false,
        error: error.message,
        data: null
      };
      
      this.results.apiCalls.push(result);
      console.log(`   ERROR: ${error.message} ❌`);
      
      return result;
    }
  }

  async validateDatabaseIntegrity() {
    console.log('\n🗄️ DATABASE INTEGRITY VALIDATION');
    console.log('='.repeat(50));
    
    // Test 1: Health Check
    const health = await this.makeRequest('/health');
    if (health.success && health.data.database?.available) {
      console.log(`✅ Database: ${health.data.database.type} - Ready`);
      this.results.testsPassed++;
      this.results.databaseValidation.healthy = true;
      this.results.databaseValidation.type = health.data.database.type;
    } else {
      console.error('❌ Database health check failed');
      this.results.testsFailed++;
      this.results.criticalIssues.push('Database not available or unhealthy');
      return false;
    }
    
    // Test 2: Get all posts
    const posts = await this.makeRequest('/api/v1/agent-posts?limit=50');
    if (posts.success && Array.isArray(posts.data.data)) {
      const postCount = posts.data.data.length;
      console.log(`✅ Retrieved ${postCount} posts from database`);
      this.results.testsPassed++;
      this.results.databaseValidation.totalPosts = postCount;
      
      // Analyze post structure
      if (postCount > 0) {
        const samplePost = posts.data.data[0];
        const requiredFields = ['id', 'title', 'content', 'authorAgent', 'publishedAt'];
        const missingFields = requiredFields.filter(field => !samplePost[field]);
        
        if (missingFields.length === 0) {
          console.log('✅ Post structure is valid');
          this.results.testsPassed++;
        } else {
          console.error(`❌ Missing fields in posts: ${missingFields.join(', ')}`);
          this.results.testsFailed++;
          this.results.criticalIssues.push(`Missing post fields: ${missingFields.join(', ')}`);
        }
        
        // Extract available agents and hashtags
        const agents = [...new Set(posts.data.data.map(p => p.authorAgent))];
        const hashtags = [...new Set(posts.data.data.flatMap(p => p.tags || []))];
        
        console.log(`✅ Available agents: ${agents.length} (${agents.slice(0, 3).join(', ')}${agents.length > 3 ? '...' : ''})`);
        console.log(`✅ Available hashtags: ${hashtags.length} (${hashtags.slice(0, 3).join(', ')}${hashtags.length > 3 ? '...' : ''})`);
        
        this.results.databaseValidation.agents = agents;
        this.results.databaseValidation.hashtags = hashtags;
        this.results.testsPassed += 2;
      }
    } else {
      console.error('❌ Failed to retrieve posts or invalid data structure');
      this.results.testsFailed++;
      this.results.criticalIssues.push('Cannot retrieve posts from database');
      return false;
    }
    
    // Test 3: Filter data endpoint
    const filterData = await this.makeRequest('/api/v1/filter-data');
    if (filterData.success && filterData.data.agents && filterData.data.hashtags) {
      console.log(`✅ Filter data endpoint working: ${filterData.data.agents.length} agents, ${filterData.data.hashtags.length} hashtags`);
      this.results.testsPassed++;
    } else {
      console.error('❌ Filter data endpoint failed');
      this.results.testsFailed++;
      this.results.criticalIssues.push('Filter data endpoint not working');
    }
    
    return true;
  }

  async validateFilterEndpoints() {
    console.log('\n🎯 ADVANCED FILTER ENDPOINT VALIDATION');
    console.log('='.repeat(50));
    
    if (!this.results.databaseValidation.agents || this.results.databaseValidation.agents.length === 0) {
      console.error('❌ No agents available for testing - skipping filter tests');
      return false;
    }
    
    const testAgent = this.results.databaseValidation.agents[0];
    const testHashtag = this.results.databaseValidation.hashtags?.[0];
    
    // Test 1: Single agent filter
    console.log(`\n🔍 Testing single agent filter: ${testAgent}`);
    const agentFilter = await this.makeRequest(`/api/v1/agent-posts?filter=by-agent&agent=${encodeURIComponent(testAgent)}`);
    
    if (agentFilter.success) {
      const filteredCount = agentFilter.data.data?.length || 0;
      console.log(`✅ Agent filter returned ${filteredCount} posts`);
      
      if (filteredCount > 0) {
        // Verify all posts are from the correct agent
        const allCorrectAgent = agentFilter.data.data.every(post => post.authorAgent === testAgent);
        if (allCorrectAgent) {
          console.log('✅ All filtered posts are from correct agent');
          this.results.testsPassed++;
        } else {
          console.error('❌ Some filtered posts are from wrong agent');
          this.results.testsFailed++;
          this.results.criticalIssues.push('Agent filter returning incorrect posts');
        }
      }
      this.results.testsPassed++;
    } else {
      console.error('❌ Agent filter failed');
      this.results.testsFailed++;
      this.results.criticalIssues.push('Agent filter endpoint not working');
    }
    
    // Test 2: Multi-select filter (CRITICAL TEST)
    console.log(`\n🎯 CRITICAL TEST: Multi-select filter`);
    const multiSelectUrl = `/api/v1/agent-posts?filter=multi-select&agents=${encodeURIComponent(testAgent)}&mode=AND`;
    const multiSelect = await this.makeRequest(multiSelectUrl);
    
    if (multiSelect.success) {
      const filteredCount = multiSelect.data.data?.length || 0;
      console.log(`📊 Multi-select filter returned ${filteredCount} posts`);
      
      if (filteredCount === 0 && this.results.databaseValidation.totalPosts > 0) {
        console.error('❌ CRITICAL BUG CONFIRMED: Multi-select filter returns zero results');
        this.results.criticalIssues.push('CRITICAL: Multi-select filter shows zero results when posts exist');
        this.results.testsFailed++;
        
        // Detailed analysis
        console.log('🔍 DEBUGGING MULTI-SELECT FILTER:');
        console.log(`   Request URL: ${multiSelectUrl}`);
        console.log(`   Agent param: ${testAgent}`);
        console.log(`   Total posts in DB: ${this.results.databaseValidation.totalPosts}`);
        console.log(`   Expected: > 0, Got: ${filteredCount}`);
        
      } else if (filteredCount > 0) {
        console.log('✅ Multi-select filter working correctly');
        this.results.testsPassed++;
      } else {
        console.log('⚠️ Multi-select returned 0 results - might be expected if no posts match filter');
        this.results.warnings.push('Multi-select filter returned 0 results');
      }
    } else {
      console.error('❌ Multi-select filter request failed');
      this.results.testsFailed++;
      this.results.criticalIssues.push('Multi-select filter endpoint failed');
    }
    
    // Test 3: Test various multi-select combinations
    console.log(`\n🔄 Testing multi-select combinations...`);
    
    const combinations = [
      {
        name: 'Agent + Hashtag (AND)',
        params: `filter=multi-select&agents=${encodeURIComponent(testAgent)}&hashtags=${testHashtag || 'test'}&mode=AND`
      },
      {
        name: 'Agent + Hashtag (OR)', 
        params: `filter=multi-select&agents=${encodeURIComponent(testAgent)}&hashtags=${testHashtag || 'test'}&mode=OR`
      },
      {
        name: 'Multiple Agents (AND)',
        params: `filter=multi-select&agents=${encodeURIComponent(testAgent)},${encodeURIComponent(this.results.databaseValidation.agents[1] || testAgent)}&mode=AND`
      }
    ];
    
    for (const combo of combinations) {
      const result = await this.makeRequest(`/api/v1/agent-posts?${combo.params}`);
      const count = result.success ? (result.data.data?.length || 0) : 0;
      console.log(`   ${combo.name}: ${count} results ${result.success ? '✅' : '❌'}`);
      
      if (result.success) {
        this.results.testsPassed++;
      } else {
        this.results.testsFailed++;
        this.results.criticalIssues.push(`${combo.name} filter failed`);
      }
    }
    
    return true;
  }

  async validateResetFunctionality() {
    console.log('\n🔄 RESET FUNCTIONALITY VALIDATION');
    console.log('='.repeat(50));
    
    // Test 1: Get all posts (simulating reset)
    const allPosts = await this.makeRequest('/api/v1/agent-posts?filter=all');
    
    if (allPosts.success) {
      const totalCount = allPosts.data.data?.length || 0;
      console.log(`✅ Reset to "all posts" returns ${totalCount} posts`);
      
      if (totalCount === this.results.databaseValidation.totalPosts) {
        console.log('✅ Reset returns same count as initial load');
        this.results.testsPassed++;
      } else {
        console.error(`❌ Reset count mismatch: expected ${this.results.databaseValidation.totalPosts}, got ${totalCount}`);
        this.results.testsFailed++;
        this.results.criticalIssues.push('Reset functionality returns incorrect post count');
      }
      this.results.testsPassed++;
    } else {
      console.error('❌ Reset to all posts failed');
      this.results.testsFailed++;
      this.results.criticalIssues.push('Cannot reset to show all posts');
    }
    
    // Test 2: Verify no filter parameters work
    const noFilterPosts = await this.makeRequest('/api/v1/agent-posts');
    if (noFilterPosts.success && noFilterPosts.data.data?.length === this.results.databaseValidation.totalPosts) {
      console.log('✅ Default endpoint (no filters) works correctly');
      this.results.testsPassed++;
    } else {
      console.error('❌ Default endpoint inconsistent with reset');
      this.results.testsFailed++;
    }
  }

  async testFilterParameterMapping() {
    console.log('\n🔗 FILTER PARAMETER MAPPING VALIDATION');
    console.log('='.repeat(50));
    
    const testCases = [
      {
        name: 'Frontend multi-select to backend mapping',
        description: 'Testing if frontend FilterOptions map correctly to backend parameters',
        frontendParams: {
          type: 'multi-select',
          agents: [this.results.databaseValidation.agents[0]],
          hashtags: this.results.databaseValidation.hashtags?.slice(0, 1) || [],
          combinationMode: 'AND'
        }
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🧪 ${testCase.name}`);
      
      // Simulate how frontend maps to backend URL
      const { frontendParams } = testCase;
      let backendUrl = '/api/v1/agent-posts?filter=multi-select';
      
      if (frontendParams.agents?.length > 0) {
        backendUrl += `&agents=${frontendParams.agents.map(encodeURIComponent).join(',')}`;
      }
      if (frontendParams.hashtags?.length > 0) {
        backendUrl += `&hashtags=${frontendParams.hashtags.map(encodeURIComponent).join(',')}`;
      }
      if (frontendParams.combinationMode) {
        backendUrl += `&mode=${frontendParams.combinationMode}`;
      }
      
      console.log(`   Generated URL: ${backendUrl}`);
      
      const result = await this.makeRequest(backendUrl);
      if (result.success) {
        console.log(`   ✅ Parameter mapping successful: ${result.data.data?.length || 0} results`);
        this.results.testsPassed++;
      } else {
        console.log(`   ❌ Parameter mapping failed`);
        this.results.testsFailed++;
        this.results.criticalIssues.push('Frontend to backend parameter mapping broken');
      }
    }
  }

  async analyzeRootCause() {
    console.log('\n🔍 ROOT CAUSE ANALYSIS');
    console.log('='.repeat(50));
    
    // Check backend logs for errors
    console.log('📋 Checking for common multi-select filter issues:');
    
    const issues = [];
    
    // Issue 1: Check if multi-select filter is implemented
    const multiSelectCalls = this.results.apiCalls.filter(call => 
      call.url.includes('filter=multi-select')
    );
    
    if (multiSelectCalls.length === 0) {
      issues.push('No multi-select filter API calls were made');
    } else {
      const failedCalls = multiSelectCalls.filter(call => !call.success);
      if (failedCalls.length > 0) {
        issues.push(`${failedCalls.length} multi-select API calls failed`);
      }
    }
    
    // Issue 2: Parameter handling
    const emptyResultCalls = multiSelectCalls.filter(call => 
      call.success && (call.data?.data?.length === 0)
    );
    
    if (emptyResultCalls.length > 0) {
      issues.push('Multi-select filters return empty results despite data existing');
    }
    
    // Issue 3: URL parameter issues  
    const malformedUrls = this.results.apiCalls.filter(call =>
      call.url.includes('filter=multi-select') && 
      (!call.url.includes('agents=') && !call.url.includes('hashtags='))
    );
    
    if (malformedUrls.length > 0) {
      issues.push('Multi-select URLs generated without proper agent/hashtag parameters');
    }
    
    if (issues.length > 0) {
      console.log('❌ ROOT CAUSES IDENTIFIED:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    } else {
      console.log('✅ No obvious root causes found in API layer');
    }
    
    return issues;
  }

  generateComprehensiveReport() {
    console.log('\n📋 COMPREHENSIVE PRODUCTION VALIDATION REPORT');
    console.log('='.repeat(70));
    
    // Summary statistics
    console.log(`\n📊 VALIDATION SUMMARY:`);
    console.log(`   Tests Executed: ${this.results.testsPassed + this.results.testsFailed}`);
    console.log(`   Tests Passed: ${this.results.testsPassed} ✅`);
    console.log(`   Tests Failed: ${this.results.testsFailed} ❌`);
    console.log(`   Critical Issues: ${this.results.criticalIssues.length} 🚨`);
    console.log(`   Warnings: ${this.results.warnings.length} ⚠️`);
    console.log(`   API Calls Made: ${this.results.apiCalls.length} 📡`);
    
    // Database validation results
    if (this.results.databaseValidation.healthy) {
      console.log(`\n🗄️ DATABASE STATUS:`);
      console.log(`   Type: ${this.results.databaseValidation.type}`);
      console.log(`   Total Posts: ${this.results.databaseValidation.totalPosts}`);
      console.log(`   Agents Available: ${this.results.databaseValidation.agents?.length || 0}`);
      console.log(`   Hashtags Available: ${this.results.databaseValidation.hashtags?.length || 0}`);
    }
    
    // Critical issues
    if (this.results.criticalIssues.length > 0) {
      console.log(`\n🚨 CRITICAL ISSUES REQUIRING IMMEDIATE FIXES:`);
      this.results.criticalIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }
    
    // API call analysis
    const successfulCalls = this.results.apiCalls.filter(call => call.success);
    const failedCalls = this.results.apiCalls.filter(call => !call.success);
    
    console.log(`\n📡 API CALL ANALYSIS:`);
    console.log(`   Successful: ${successfulCalls.length}/${this.results.apiCalls.length}`);
    console.log(`   Failed: ${failedCalls.length}/${this.results.apiCalls.length}`);
    
    if (failedCalls.length > 0) {
      console.log(`\n❌ FAILED API CALLS:`);
      failedCalls.forEach((call, index) => {
        console.log(`   ${index + 1}. ${call.method} ${call.url}`);
        console.log(`      Status: ${call.status}, Error: ${call.error || 'Unknown'}`);
      });
    }
    
    // Filter-specific analysis
    const filterCalls = this.results.apiCalls.filter(call => 
      call.url.includes('filter=') || call.url.includes('agent-posts')
    );
    
    console.log(`\n🎯 FILTER ENDPOINT ANALYSIS:`);
    console.log(`   Filter-related calls: ${filterCalls.length}`);
    
    const multiSelectCalls = filterCalls.filter(call => call.url.includes('multi-select'));
    if (multiSelectCalls.length > 0) {
      console.log(`   Multi-select calls: ${multiSelectCalls.length}`);
      multiSelectCalls.forEach((call, index) => {
        const resultCount = call.data?.data?.length || 0;
        console.log(`      ${index + 1}. ${resultCount} results - ${call.success ? '✅' : '❌'}`);
        console.log(`         URL: ${call.url}`);
      });
    }
    
    // Overall assessment
    const criticalIssuesFound = this.results.criticalIssues.length > 0;
    const majorFailures = this.results.testsFailed > this.results.testsPassed;
    
    console.log(`\n🎯 FINAL ASSESSMENT:`);
    
    if (criticalIssuesFound || majorFailures) {
      console.log('❌ PRODUCTION SYSTEM REQUIRES IMMEDIATE FIXES');
      console.log('\n🔧 RECOMMENDED ACTIONS:');
      
      if (this.results.criticalIssues.some(issue => issue.includes('Multi-select filter shows zero results'))) {
        console.log('   1. Fix multi-select filter backend implementation');
        console.log('   2. Check SQL query generation for multi-select parameters');
        console.log('   3. Validate parameter parsing in backend endpoints');
      }
      
      if (this.results.criticalIssues.some(issue => issue.includes('reset'))) {
        console.log('   4. Fix filter reset functionality to properly return all posts');
      }
      
      console.log('   5. Add comprehensive error logging for filter operations');
      console.log('   6. Implement filter parameter validation');
      console.log('   7. Add unit tests for filter combinations');
      
    } else {
      console.log('✅ PRODUCTION SYSTEM IS HEALTHY');
      console.log('   All critical functionality working as expected');
    }
    
    // Success rate
    const successRate = this.results.testsPassed + this.results.testsFailed > 0 
      ? Math.round((this.results.testsPassed / (this.results.testsPassed + this.results.testsFailed)) * 100)
      : 0;
      
    console.log(`\n📈 SUCCESS RATE: ${successRate}%`);
    
    if (successRate < 80) {
      console.log('🚨 SUCCESS RATE BELOW ACCEPTABLE THRESHOLD (80%)');
    }
  }
}

// Execute comprehensive validation
async function runAPIValidation() {
  const validator = new APIProductionValidator();
  
  try {
    console.log('🚀 Starting comprehensive API production validation...\n');
    
    // Step 1: Database validation
    const dbHealthy = await validator.validateDatabaseIntegrity();
    if (!dbHealthy) {
      console.error('❌ Database validation failed - cannot continue with filter tests');
      return;
    }
    
    // Step 2: Filter endpoint validation
    await validator.validateFilterEndpoints();
    
    // Step 3: Reset functionality validation
    await validator.validateResetFunctionality();
    
    // Step 4: Parameter mapping validation
    await validator.testFilterParameterMapping();
    
    // Step 5: Root cause analysis
    await validator.analyzeRootCause();
    
    // Step 6: Generate comprehensive report
    validator.generateComprehensiveReport();
    
  } catch (error) {
    console.error('❌ API validation failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Main execution
async function main() {
  console.log('🎯 PRODUCTION VALIDATION: Advanced Filter API Testing');
  console.log('Testing backend endpoints: http://localhost:3000/api/v1/');
  console.log('='.repeat(80));

  // Check backend health
  try {
    const response = await fetch('http://localhost:3000/health');
    if (!response.ok) {
      throw new Error('Backend unhealthy');
    }
    console.log('✅ Backend is running and healthy\n');
  } catch (error) {
    console.error('❌ Backend is not available. Please start the backend first.');
    console.error('   Run: npm start');
    process.exit(1);
  }

  await runAPIValidation();
}

main().catch(console.error);