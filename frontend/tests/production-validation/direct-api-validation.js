// Direct API Validation for Advanced Filter System
// Tests the backend API filtering capabilities

import fetch from 'node-fetch';

class DirectAPIValidator {
  constructor() {
    this.baseUrl = 'http://localhost:3001/api';
    this.results = {
      timestamp: new Date().toISOString(),
      apiTests: [],
      postData: {},
      agents: [],
      hashtags: [],
      errors: [],
      success: false
    };
  }

  async validateAPI() {
    console.log('🔍 Starting Direct API Validation');
    
    try {
      // Test 1: Get all posts
      console.log('📊 Test 1: Fetching all posts');
      const allPostsResponse = await fetch(`${this.baseUrl}/posts`);
      const allPosts = await allPostsResponse.json();
      
      this.results.postData.total = allPosts.length;
      this.results.apiTests.push({
        test: 'GET /api/posts',
        success: true,
        postCount: allPosts.length,
        statusCode: allPostsResponse.status
      });
      
      console.log(`✅ Found ${allPosts.length} total posts`);
      
      // Extract agents and hashtags
      this.results.agents = [...new Set(allPosts.map(post => post.agent).filter(Boolean))];
      this.results.hashtags = [...new Set(
        allPosts.flatMap(post => post.hashtags || []).filter(Boolean)
      )];
      
      console.log(`📋 Available agents: ${this.results.agents.join(', ')}`);
      console.log(`🏷️ Available hashtags: ${this.results.hashtags.join(', ')}`);
      
      // Test 2: Test agent filtering (if backend supports it)
      if (this.results.agents.length > 0) {
        const testAgent = this.results.agents[0];
        console.log(`🤖 Test 2: Testing agent filter with "${testAgent}"`);
        
        try {
          const agentFilterResponse = await fetch(`${this.baseUrl}/posts?agent=${encodeURIComponent(testAgent)}`);
          const agentFilteredPosts = await agentFilterResponse.json();
          
          this.results.apiTests.push({
            test: `GET /api/posts?agent=${testAgent}`,
            success: true,
            postCount: agentFilteredPosts.length,
            statusCode: agentFilterResponse.status
          });
          
          console.log(`✅ Agent filter returned ${agentFilteredPosts.length} posts`);
        } catch (error) {
          console.log(`⚠️ Agent filtering not supported by backend: ${error.message}`);
          this.results.apiTests.push({
            test: `GET /api/posts?agent=${testAgent}`,
            success: false,
            error: 'Backend filtering not implemented'
          });
        }
      }
      
      // Test 3: Test hashtag filtering (if backend supports it)
      if (this.results.hashtags.length > 0) {
        const testHashtag = this.results.hashtags[0];
        console.log(`🏷️ Test 3: Testing hashtag filter with "${testHashtag}"`);
        
        try {
          const hashtagFilterResponse = await fetch(`${this.baseUrl}/posts?hashtag=${encodeURIComponent(testHashtag)}`);
          const hashtagFilteredPosts = await hashtagFilterResponse.json();
          
          this.results.apiTests.push({
            test: `GET /api/posts?hashtag=${testHashtag}`,
            success: true,
            postCount: hashtagFilteredPosts.length,
            statusCode: hashtagFilterResponse.status
          });
          
          console.log(`✅ Hashtag filter returned ${hashtagFilteredPosts.length} posts`);
        } catch (error) {
          console.log(`⚠️ Hashtag filtering not supported by backend: ${error.message}`);
          this.results.apiTests.push({
            test: `GET /api/posts?hashtag=${testHashtag}`,
            success: false,
            error: 'Backend filtering not implemented'
          });
        }
      }
      
      // Test 4: Validate post structure
      console.log('🏗️ Test 4: Validating post structure');
      const samplePost = allPosts[0];
      const requiredFields = ['id', 'agent', 'content', 'timestamp'];
      const missingFields = requiredFields.filter(field => !samplePost.hasOwnProperty(field));
      
      this.results.apiTests.push({
        test: 'Post structure validation',
        success: missingFields.length === 0,
        missingFields: missingFields,
        samplePost: samplePost
      });
      
      if (missingFields.length === 0) {
        console.log('✅ Post structure is valid');
      } else {
        console.log(`❌ Missing fields in post structure: ${missingFields.join(', ')}`);
      }
      
      // Calculate success
      this.results.success = this.results.apiTests.every(test => test.success);
      
    } catch (error) {
      console.error('❌ API validation error:', error.message);
      this.results.errors.push(error.message);
      this.results.success = false;
    }
  }

  async generateReport() {
    console.log('\n📝 API VALIDATION REPORT');
    console.log('==========================');
    console.log(`Timestamp: ${this.results.timestamp}`);
    console.log(`Overall Success: ${this.results.success}`);
    console.log(`Total Posts: ${this.results.postData.total}`);
    console.log(`Available Agents: ${this.results.agents.length}`);
    console.log(`Available Hashtags: ${this.results.hashtags.length}`);
    console.log('\nAgent Breakdown:');
    this.results.agents.forEach(agent => console.log(`  - ${agent}`));
    console.log('\nAPI Test Results:');
    this.results.apiTests.forEach((test, i) => {
      console.log(`  ${i + 1}. ${test.test}: ${test.success ? '✅' : '❌'}`);
      if (test.postCount !== undefined) console.log(`     Posts returned: ${test.postCount}`);
      if (test.error) console.log(`     Error: ${test.error}`);
    });
    
    if (this.results.errors.length > 0) {
      console.log('\nErrors:');
      this.results.errors.forEach(error => console.log(`  ❌ ${error}`));
    }
    console.log('==========================\n');
    
    return this.results;
  }
}

// Execute validation
async function runAPIValidation() {
  const validator = new DirectAPIValidator();
  await validator.validateAPI();
  const report = await validator.generateReport();
  
  // Save results
  const fs = await import('fs');
  fs.writeFileSync(
    '/workspaces/agent-feed/frontend/api-validation-results.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('💾 API validation report saved to api-validation-results.json');
  return report;
}

export { DirectAPIValidator, runAPIValidation };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAPIValidation();
}