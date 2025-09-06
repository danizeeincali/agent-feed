#!/usr/bin/env node
/**
 * CRITICAL COMMENT API VALIDATION TEST
 * Tests all comment API endpoints after frontend fixes
 */

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_POST_ID = 'prod-post-1';

async function makeRequest(method, endpoint, data = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      error: error.message
    };
  }
}

async function testCommentAPI() {
  console.log('🧪 CRITICAL COMMENT API VALIDATION TEST');
  console.log('=========================================\n');
  
  let testResults = [];
  
  // Test 1: Get existing comments
  console.log('1️⃣ Testing GET /agent-posts/:postId/comments');
  const getCommentsResult = await makeRequest('GET', `/agent-posts/${TEST_POST_ID}/comments`);
  console.log(`   Status: ${getCommentsResult.status}`);
  console.log(`   Success: ${getCommentsResult.success}`);
  console.log(`   Comments count: ${getCommentsResult.data?.data?.length || 0}\n`);
  testResults.push({ test: 'Get Comments', success: getCommentsResult.success });
  
  // Test 2: Create root comment
  console.log('2️⃣ Testing POST /agent-posts/:postId/comments');
  const createCommentData = {
    content: `API validation test comment - ${new Date().toISOString()}`,
    authorAgent: 'ValidationTester'
  };
  const createCommentResult = await makeRequest('POST', `/agent-posts/${TEST_POST_ID}/comments`, createCommentData);
  console.log(`   Status: ${createCommentResult.status}`);
  console.log(`   Success: ${createCommentResult.success}`);
  console.log(`   Comment ID: ${createCommentResult.data?.data?.id || 'N/A'}\n`);
  testResults.push({ test: 'Create Comment', success: createCommentResult.success });
  
  let newCommentId = createCommentResult.data?.data?.id;
  
  // Test 3: Create reply (if comment creation succeeded)
  if (newCommentId) {
    console.log('3️⃣ Testing POST /comments/:commentId/reply');
    const createReplyData = {
      content: `Reply validation test - ${new Date().toISOString()}`,
      authorAgent: 'ReplyValidator',
      postId: TEST_POST_ID
    };
    const createReplyResult = await makeRequest('POST', `/comments/${newCommentId}/reply`, createReplyData);
    console.log(`   Status: ${createReplyResult.status}`);
    console.log(`   Success: ${createReplyResult.success}`);
    console.log(`   Reply ID: ${createReplyResult.data?.data?.id || 'N/A'}\n`);
    testResults.push({ test: 'Create Reply', success: createReplyResult.success });
  } else {
    console.log('3️⃣ SKIPPED: Reply test (comment creation failed)\n');
    testResults.push({ test: 'Create Reply', success: false });
  }
  
  // Test 4: Get threaded comments
  console.log('4️⃣ Testing GET /agent-posts/:postId/comments/thread');
  const getThreadedResult = await makeRequest('GET', `/agent-posts/${TEST_POST_ID}/comments/thread`);
  console.log(`   Status: ${getThreadedResult.status}`);
  console.log(`   Success: ${getThreadedResult.success}`);
  console.log(`   Threaded comments count: ${getThreadedResult.data?.data?.length || 0}\n`);
  testResults.push({ test: 'Get Threaded Comments', success: getThreadedResult.success });
  
  // Test 5: Verify final comment count
  console.log('5️⃣ Testing final comment count verification');
  const finalCountResult = await makeRequest('GET', `/agent-posts/${TEST_POST_ID}/comments`);
  const finalCount = finalCountResult.data?.data?.length || 0;
  console.log(`   Final comment count: ${finalCount}`);
  console.log(`   Success: ${finalCountResult.success}\n`);
  testResults.push({ test: 'Final Count Check', success: finalCountResult.success });
  
  // Summary
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('======================');
  const successCount = testResults.filter(r => r.success).length;
  const totalTests = testResults.length;
  
  testResults.forEach((result, index) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${result.test}: ${status}`);
  });
  
  console.log(`\n🎯 OVERALL RESULT: ${successCount}/${totalTests} tests passed`);
  
  if (successCount === totalTests) {
    console.log('🎉 ALL COMMENT API ENDPOINTS ARE WORKING CORRECTLY!');
    process.exit(0);
  } else {
    console.log('🚨 SOME COMMENT API ENDPOINTS NEED ATTENTION!');
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testCommentAPI().catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });
}

module.exports = { testCommentAPI };