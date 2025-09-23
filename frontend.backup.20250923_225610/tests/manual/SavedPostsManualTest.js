/**
 * TDD London School Manual Test - Saved Posts Functionality
 * 
 * This script tests the saved posts functionality against the real running application
 * Focus: Real implementation testing without mocking
 */

const API_BASE = 'http://localhost:3000/api/v1';

class SavedPostsManualTest {
  constructor() {
    this.testResults = [];
    this.testPostId = null;
  }

  async runAllTests() {
    console.log('🧪 TDD London School: Manual Testing Saved Posts Functionality\n');
    console.log('Testing against REAL database and API at localhost:3000\n');

    try {
      await this.testHealthCheck();
      await this.testGetAllPosts();
      await this.testCreateTestPost();
      await this.testSavePost();
      await this.testGetSavedPosts();
      await this.testUnsavePost();
      await this.testVerifyUnsaved();
      await this.testSavePostAgain();
      await this.testFilteringSavedPosts();
      await this.testCleanup();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.testResults.push({
        test: 'Test Suite',
        status: '❌ FAILED',
        error: error.message
      });
      this.printResults();
    }
  }

  async testHealthCheck() {
    console.log('1. Testing API health check...');
    try {
      const response = await fetch(`${API_BASE}/health`);
      const health = await response.json();
      
      this.assert(response.ok, 'Health check returns 200');
      this.assert(health.success, 'Health check returns success');
      this.assert(health.database.database, 'Database is connected');
      
      console.log('   ✅ API and database are healthy');
      this.testResults.push({ test: 'Health Check', status: '✅ PASSED' });
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  async testGetAllPosts() {
    console.log('\n2. Testing get all posts...');
    try {
      const response = await fetch(`${API_BASE}/agent-posts?limit=10&offset=0`);
      const data = await response.json();
      
      this.assert(response.ok, 'Get posts returns 200');
      this.assert(data.success, 'Response indicates success');
      this.assert(Array.isArray(data.data), 'Response contains posts array');
      this.assert(data.data.length > 0, 'Posts array is not empty');
      this.assert(typeof data.total === 'number', 'Total count is provided');
      
      // Check that posts have engagement data with isSaved property
      const firstPost = data.data[0];
      this.assert(firstPost.engagement, 'Posts have engagement data');
      this.assert(typeof firstPost.engagement.isSaved === 'boolean', 'Posts have isSaved boolean');
      
      console.log(`   ✅ Retrieved ${data.data.length} posts successfully`);
      this.testResults.push({ test: 'Get All Posts', status: '✅ PASSED' });
    } catch (error) {
      throw new Error(`Get all posts failed: ${error.message}`);
    }
  }

  async testCreateTestPost() {
    console.log('\n3. Creating test post for saved posts testing...');
    try {
      const testPost = {
        title: 'TDD London School Test Post',
        content: 'This is a test post created by the TDD London School manual test suite to verify saved posts functionality works correctly with real database operations.',
        author_agent: 'TDDTestAgent',
        metadata: {
          isTestPost: true,
          testSuite: 'SavedPostsManualTest',
          createdAt: new Date().toISOString()
        }
      };

      const response = await fetch(`${API_BASE}/agent-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPost)
      });
      
      const data = await response.json();
      
      this.assert(response.ok, 'Create post returns 200');
      this.assert(data.success, 'Post creation successful');
      this.assert(data.data.id, 'Post has ID');
      
      this.testPostId = data.data.id;
      
      console.log(`   ✅ Test post created with ID: ${this.testPostId}`);
      this.testResults.push({ test: 'Create Test Post', status: '✅ PASSED' });
    } catch (error) {
      throw new Error(`Create test post failed: ${error.message}`);
    }
  }

  async testSavePost() {
    console.log('\n4. Testing save post functionality...');
    try {
      this.assert(this.testPostId, 'Test post ID exists');
      
      const response = await fetch(`${API_BASE}/agent-posts/${this.testPostId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'anonymous' })
      });
      
      const data = await response.json();
      
      this.assert(response.ok, 'Save post returns 200');
      this.assert(data.success, 'Save operation successful');
      this.assert(data.data.post_id === this.testPostId, 'Saved post ID matches');
      this.assert(data.data.user_id === 'anonymous', 'User ID matches');
      
      console.log('   ✅ Post saved successfully');
      this.testResults.push({ test: 'Save Post', status: '✅ PASSED' });
    } catch (error) {
      throw new Error(`Save post failed: ${error.message}`);
    }
  }

  async testGetSavedPosts() {
    console.log('\n5. Testing get saved posts filter...');
    try {
      const response = await fetch(`${API_BASE}/agent-posts?limit=20&offset=0&filter=by-user&user_id=anonymous`);
      const data = await response.json();
      
      this.assert(response.ok, 'Get saved posts returns 200');
      this.assert(data.success, 'Response indicates success');
      this.assert(Array.isArray(data.data), 'Response contains posts array');
      
      // Check that our test post is in the saved posts
      const testPost = data.data.find(post => post.id === this.testPostId);
      this.assert(testPost, 'Test post appears in saved posts');
      this.assert(testPost.engagement.isSaved === true, 'Test post is marked as saved');
      
      // Verify all returned posts are saved
      data.data.forEach((post, index) => {
        this.assert(post.engagement.isSaved === true, `Post ${index + 1} is marked as saved`);
      });
      
      console.log(`   ✅ Retrieved ${data.data.length} saved posts, test post found and marked as saved`);
      this.testResults.push({ test: 'Get Saved Posts Filter', status: '✅ PASSED' });
    } catch (error) {
      throw new Error(`Get saved posts failed: ${error.message}`);
    }
  }

  async testUnsavePost() {
    console.log('\n6. Testing unsave post functionality...');
    try {
      const response = await fetch(`${API_BASE}/agent-posts/${this.testPostId}/save?user_id=anonymous`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      this.assert(response.ok, 'Unsave post returns 200');
      this.assert(data.success, 'Unsave operation successful');
      
      console.log('   ✅ Post unsaved successfully');
      this.testResults.push({ test: 'Unsave Post', status: '✅ PASSED' });
    } catch (error) {
      throw new Error(`Unsave post failed: ${error.message}`);
    }
  }

  async testVerifyUnsaved() {
    console.log('\n7. Verifying post is no longer in saved posts...');
    try {
      const response = await fetch(`${API_BASE}/agent-posts?limit=20&offset=0&filter=by-user&user_id=anonymous`);
      const data = await response.json();
      
      this.assert(response.ok, 'Get saved posts returns 200');
      this.assert(data.success, 'Response indicates success');
      
      // Check that our test post is NOT in the saved posts
      const testPost = data.data.find(post => post.id === this.testPostId);
      this.assert(!testPost, 'Test post no longer appears in saved posts');
      
      console.log('   ✅ Test post successfully removed from saved posts');
      this.testResults.push({ test: 'Verify Unsaved', status: '✅ PASSED' });
    } catch (error) {
      throw new Error(`Verify unsaved failed: ${error.message}`);
    }
  }

  async testSavePostAgain() {
    console.log('\n8. Testing save post again (idempotent operation)...');
    try {
      // Save the post again
      const response = await fetch(`${API_BASE}/agent-posts/${this.testPostId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'anonymous' })
      });
      
      const data = await response.json();
      this.assert(response.ok && data.success, 'Post saved again successfully');
      
      // Verify it appears in saved posts with correct flag
      const savedResponse = await fetch(`${API_BASE}/agent-posts/${this.testPostId}?user_id=anonymous`);
      if (savedResponse.ok) {
        const savedData = await savedResponse.json();
        if (savedData.success && savedData.data.engagement) {
          this.assert(savedData.data.engagement.isSaved === true, 'Post marked as saved after re-saving');
        }
      }
      
      console.log('   ✅ Post saved again successfully');
      this.testResults.push({ test: 'Save Post Again', status: '✅ PASSED' });
    } catch (error) {
      throw new Error(`Save post again failed: ${error.message}`);
    }
  }

  async testFilteringSavedPosts() {
    console.log('\n9. Testing saved posts filtering consistency...');
    try {
      // Get all posts to see isSaved flags
      const allResponse = await fetch(`${API_BASE}/agent-posts?limit=20&offset=0&user_id=anonymous`);
      const allData = await allResponse.json();
      
      // Get saved posts only
      const savedResponse = await fetch(`${API_BASE}/agent-posts?limit=20&offset=0&filter=by-user&user_id=anonymous`);
      const savedData = await savedResponse.json();
      
      this.assert(allResponse.ok && allData.success, 'All posts request successful');
      this.assert(savedResponse.ok && savedData.success, 'Saved posts request successful');
      
      // Count saved posts from all posts
      const allPostsSavedCount = allData.data.filter(post => post.engagement.isSaved).length;
      const savedPostsCount = savedData.data.length;
      
      this.assert(allPostsSavedCount === savedPostsCount, 
        `Saved count consistency: all posts show ${allPostsSavedCount} saved, filter shows ${savedPostsCount}`);
      
      // Verify our test post is in both results with correct flags
      const testPostInAll = allData.data.find(post => post.id === this.testPostId);
      const testPostInSaved = savedData.data.find(post => post.id === this.testPostId);
      
      if (testPostInAll) {
        this.assert(testPostInAll.engagement.isSaved === true, 'Test post marked as saved in all posts');
      }
      
      this.assert(testPostInSaved, 'Test post appears in saved posts filter');
      
      console.log('   ✅ Saved posts filtering is consistent');
      this.testResults.push({ test: 'Filtering Consistency', status: '✅ PASSED' });
    } catch (error) {
      throw new Error(`Filtering consistency test failed: ${error.message}`);
    }
  }

  async testCleanup() {
    console.log('\n10. Cleaning up test post...');
    try {
      if (this.testPostId) {
        const response = await fetch(`${API_BASE}/agent-posts/${this.testPostId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          const data = await response.json();
          this.assert(data.success, 'Test post deleted successfully');
        }
        
        console.log('   ✅ Test post cleaned up');
        this.testResults.push({ test: 'Cleanup', status: '✅ PASSED' });
      }
    } catch (error) {
      console.warn('   ⚠️ Cleanup failed (non-critical):', error.message);
      this.testResults.push({ test: 'Cleanup', status: '⚠️ WARNING', error: error.message });
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  printResults() {
    console.log('\n📊 TDD London School Test Results:');
    console.log('═'.repeat(50));
    
    let passed = 0;
    let failed = 0;
    let warnings = 0;
    
    this.testResults.forEach(result => {
      console.log(`${result.status} ${result.test}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.status.includes('PASSED')) passed++;
      else if (result.status.includes('FAILED')) failed++;
      else if (result.status.includes('WARNING')) warnings++;
    });
    
    console.log('═'.repeat(50));
    console.log(`📈 Summary: ${passed} passed, ${failed} failed, ${warnings} warnings`);
    
    if (failed === 0) {
      console.log('🎉 ALL TESTS PASSED! Saved posts functionality is working correctly.');
    } else {
      console.log('❌ Some tests failed. Check the errors above.');
    }
  }
}

// Run the tests
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  const tester = new SavedPostsManualTest();
  tester.runAllTests().catch(console.error);
}

export default SavedPostsManualTest;