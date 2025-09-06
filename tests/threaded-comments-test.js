/**
 * Threaded Comments System Test
 * Validates the complete threaded comment API implementation
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api/v1';
const TEST_POST_ID = 'prod-post-1';

class ThreadedCommentTester {
  constructor() {
    this.testResults = [];
  }

  async runTest(testName, testFn) {
    try {
      console.log(`🧪 Testing: ${testName}`);
      await testFn();
      this.testResults.push({ name: testName, status: 'PASS' });
      console.log(`✅ PASS: ${testName}`);
    } catch (error) {
      this.testResults.push({ name: testName, status: 'FAIL', error: error.message });
      console.error(`❌ FAIL: ${testName} - ${error.message}`);
    }
    console.log('');
  }

  async testGetThreadedComments() {
    const response = await fetch(`${API_BASE}/agent-posts/${TEST_POST_ID}/comments/thread`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`);
    }

    if (!data.success || !Array.isArray(data.data)) {
      throw new Error('Response should have success=true and data array');
    }

    if (data.type !== 'threaded') {
      throw new Error(`Expected type='threaded', got '${data.type}'`);
    }

    console.log(`   Found ${data.total} root comments`);
    
    // Validate thread structure
    const validateThreadStructure = (comments, expectedDepth = 0) => {
      for (const comment of comments) {
        if (comment.depth !== expectedDepth) {
          throw new Error(`Expected depth ${expectedDepth}, got ${comment.depth} for comment ${comment.id}`);
        }
        
        if (comment.replies && comment.replies.length > 0) {
          validateThreadStructure(comment.replies, expectedDepth + 1);
        }
      }
    };

    validateThreadStructure(data.data);
    console.log('   ✓ Thread structure is valid');
  }

  async testGetFlatComments() {
    const response = await fetch(`${API_BASE}/agent-posts/${TEST_POST_ID}/comments`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`);
    }

    if (!data.success || !Array.isArray(data.data)) {
      throw new Error('Response should have success=true and data array');
    }

    console.log(`   Found ${data.total} flattened comments (type: ${data.type})`);
    
    // Validate flat structure
    for (const comment of data.data) {
      if (comment.replies && comment.replies.length > 0) {
        throw new Error(`Flat comments should not have replies array, but comment ${comment.id} does`);
      }
      
      if (typeof comment.depth !== 'number') {
        throw new Error(`All flat comments should have a depth property, but comment ${comment.id} doesn't`);
      }
    }

    console.log('   ✓ Flat structure is valid');
  }

  async testCreateRootComment() {
    const commentData = {
      content: 'This is a test root comment from the automated test suite.',
      authorAgent: 'TestAgent'
    };

    const response = await fetch(`${API_BASE}/agent-posts/${TEST_POST_ID}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commentData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`);
    }

    if (!data.success || !data.data) {
      throw new Error('Response should have success=true and data object');
    }

    const comment = data.data;
    if (comment.content !== commentData.content) {
      throw new Error('Comment content does not match');
    }

    if (comment.author !== commentData.authorAgent) {
      throw new Error('Comment author does not match');
    }

    if (comment.parentId !== null) {
      throw new Error('Root comment should have parentId=null');
    }

    console.log(`   ✓ Created root comment: ${comment.id}`);
    return comment;
  }

  async testCreateReply() {
    // First create a root comment to reply to
    const rootComment = await this.testCreateRootComment();

    const replyData = {
      content: 'This is a test reply to the root comment.',
      authorAgent: 'TestReplyAgent',
      postId: TEST_POST_ID
    };

    const response = await fetch(`${API_BASE}/comments/${rootComment.id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(replyData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`);
    }

    if (!data.success || !data.data) {
      throw new Error('Response should have success=true and data object');
    }

    const reply = data.data;
    if (reply.content !== replyData.content) {
      throw new Error('Reply content does not match');
    }

    if (reply.parentId !== rootComment.id) {
      throw new Error('Reply parentId should match root comment id');
    }

    if (reply.depth !== 1) {
      throw new Error('Reply depth should be 1');
    }

    console.log(`   ✓ Created reply: ${reply.id} (depth: ${reply.depth})`);
    return reply;
  }

  async testGetCommentReplies() {
    // Create a comment with replies first
    const rootComment = await this.testCreateRootComment();
    const reply1 = await this.createTestReply(rootComment.id, 'First reply');
    const reply2 = await this.createTestReply(rootComment.id, 'Second reply');

    const response = await fetch(`${API_BASE}/comments/${rootComment.id}/replies?limit=10&offset=0`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`);
    }

    if (!data.success || !Array.isArray(data.data)) {
      throw new Error('Response should have success=true and data array');
    }

    if (data.data.length < 2) {
      throw new Error('Should have at least 2 replies');
    }

    if (!data.pagination) {
      throw new Error('Response should include pagination info');
    }

    console.log(`   ✓ Retrieved ${data.data.length} replies with pagination`);
  }

  async testGenerateAgentResponse() {
    // Create a root comment first
    const rootComment = await this.testCreateRootComment();

    const response = await fetch(`${API_BASE}/comments/${rootComment.id}/generate-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error}`);
    }

    if (!data.success || !data.data) {
      throw new Error('Response should have success=true and data object');
    }

    const generatedReply = data.data;
    if (!generatedReply.content || generatedReply.content.trim().length === 0) {
      throw new Error('Generated reply should have content');
    }

    if (generatedReply.author === rootComment.author) {
      throw new Error('Generated reply should be from a different agent');
    }

    if (generatedReply.parentId !== rootComment.id) {
      throw new Error('Generated reply should be a reply to the root comment');
    }

    console.log(`   ✓ Generated agent response from ${generatedReply.author}`);
    console.log(`   Content: "${generatedReply.content}"`);
  }

  async createTestReply(parentCommentId, content) {
    const replyData = {
      content: content,
      authorAgent: 'TestReplyAgent',
      postId: TEST_POST_ID
    };

    const response = await fetch(`${API_BASE}/comments/${parentCommentId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(replyData)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Failed to create test reply: ${data.error}`);
    }

    return data.data;
  }

  async runAllTests() {
    console.log('🚀 Starting Threaded Comments System Tests');
    console.log('=' .repeat(50));

    await this.runTest('Get Threaded Comments', () => this.testGetThreadedComments());
    await this.runTest('Get Flat Comments (Legacy)', () => this.testGetFlatComments());
    await this.runTest('Create Root Comment', () => this.testCreateRootComment());
    await this.runTest('Create Reply', () => this.testCreateReply());
    await this.runTest('Get Comment Replies', () => this.testGetCommentReplies());
    await this.runTest('Generate Agent Response', () => this.testGenerateAgentResponse());

    console.log('=' .repeat(50));
    console.log('🏁 Test Results Summary:');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
      console.log('\\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   - ${r.name}: ${r.error}`));
    }

    console.log(`\\n📊 Success Rate: ${Math.round((passed / this.testResults.length) * 100)}%`);
    
    return failed === 0;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ThreadedCommentTester();
  
  console.log('⏳ Waiting 3 seconds for server to be ready...');
  setTimeout(async () => {
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
  }, 3000);
}

export { ThreadedCommentTester };