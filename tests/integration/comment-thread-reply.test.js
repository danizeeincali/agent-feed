/**
 * CommentThread Reply Functionality - Comprehensive Integration Tests
 *
 * Tests the fixed CommentThread.tsx component with REAL backend API
 * Backend: POST /api/agent-posts/:postId/comments
 * Database: SQLite with parent_id foreign key
 *
 * NO MOCKS - All tests use real backend running on localhost:3001
 */

const http = require('http');
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const path = require('path');

// Configuration
const API_HOST = 'localhost';
const API_PORT = 3001;
const API_BASE_URL = `http://${API_HOST}:${API_PORT}`;
const DB_PATH = path.join(__dirname, '../../database.db');

// Test data
const TEST_POST_ID = `test-post-${Date.now()}`;
const TEST_USER = 'test-user-comment-thread';
const TEST_AGENT = 'test-agent-reply-handler';

// Database helper
let db;
function connectDB() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

function dbRun(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function closeDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    } else {
      resolve();
    }
  });
}

// HTTP helper for API calls
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': TEST_USER,
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(response);
        } catch (err) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test utilities
async function createTestPost() {
  const response = await makeRequest('POST', '/api/agent-posts', {
    title: 'Test Post for Comment Threading',
    content: 'This post is for testing comment reply functionality',
    author_agent: TEST_AGENT,
    platform: 'test',
    custom_id: TEST_POST_ID
  });

  if (response.status !== 201) {
    throw new Error(`Failed to create test post: ${response.status}`);
  }

  return response.body.data;
}

async function createComment(postId, content, parentId = null) {
  const response = await makeRequest('POST', `/api/agent-posts/${postId}/comments`, {
    content,
    author: TEST_USER,
    author_agent: TEST_AGENT,
    parent_id: parentId
  });

  return response;
}

async function getCommentFromDB(commentId) {
  return await dbGet('SELECT * FROM comments WHERE id = ?', [commentId]);
}

async function getCommentsByPostId(postId) {
  return await dbAll('SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC', [postId]);
}

async function cleanup() {
  try {
    // Delete test comments
    await dbRun('DELETE FROM comments WHERE post_id = ?', [TEST_POST_ID]);

    // Delete test post
    await dbRun('DELETE FROM agent_posts WHERE custom_id = ?', [TEST_POST_ID]);

    console.log('✅ Test cleanup completed');
  } catch (error) {
    console.error('⚠️  Cleanup error:', error.message);
  }
}

// =============================================================================
// TEST SUITE
// =============================================================================

async function runTests() {
  console.log('\n🧪 CommentThread Reply Functionality - Integration Tests\n');
  console.log('=' .repeat(70));

  let testsPassed = 0;
  let testsFailed = 0;
  let post;

  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to SQLite database\n');

    // Setup: Create test post
    console.log('📝 Setting up test post...');
    post = await createTestPost();
    console.log(`✅ Test post created: ${post.id}\n`);

    // =============================================================================
    // TEST 1: API Endpoint Validation
    // =============================================================================
    console.log('TEST 1: API Endpoint Validation');
    console.log('-'.repeat(70));

    try {
      const response = await createComment(post.id, 'Test comment for endpoint validation');

      if (response.status === 201) {
        console.log('✅ POST /api/agent-posts/:postId/comments endpoint is accessible');
        console.log(`   Response: ${JSON.stringify(response.body, null, 2)}`);
        testsPassed++;
      } else {
        throw new Error(`Expected 201, got ${response.status}`);
      }
    } catch (error) {
      console.error('❌ FAILED:', error.message);
      testsFailed++;
    }
    console.log('');

    // =============================================================================
    // TEST 2: Create Top-Level Comment
    // =============================================================================
    console.log('TEST 2: Create Top-Level Comment (parent_id = null)');
    console.log('-'.repeat(70));

    try {
      const response = await createComment(post.id, 'This is a top-level comment', null);

      if (response.status === 201 && response.body.success) {
        const commentId = response.body.data.id;
        const dbComment = await getCommentFromDB(commentId);

        if (dbComment && dbComment.parent_id === null) {
          console.log('✅ Top-level comment created successfully');
          console.log(`   Comment ID: ${commentId}`);
          console.log(`   parent_id in DB: ${dbComment.parent_id} (should be null)`);
          console.log(`   Content: "${dbComment.content}"`);
          testsPassed++;
        } else {
          throw new Error(`parent_id should be null, got: ${dbComment?.parent_id}`);
        }
      } else {
        throw new Error(`Failed to create comment: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ FAILED:', error.message);
      testsFailed++;
    }
    console.log('');

    // =============================================================================
    // TEST 3: Create Reply with parent_id
    // =============================================================================
    console.log('TEST 3: Create Reply with parent_id (Threading Test)');
    console.log('-'.repeat(70));

    try {
      // First create parent comment
      const parentResponse = await createComment(post.id, 'Parent comment for threading test');

      if (parentResponse.status !== 201) {
        throw new Error(`Failed to create parent comment: ${parentResponse.status}`);
      }

      const parentId = parentResponse.body.data.id;
      console.log(`   Created parent comment: ${parentId}`);

      // Now create reply
      const replyResponse = await createComment(post.id, 'This is a reply to the parent', parentId);

      if (replyResponse.status === 201 && replyResponse.body.success) {
        const replyId = replyResponse.body.data.id;
        const dbReply = await getCommentFromDB(replyId);

        if (dbReply && dbReply.parent_id === parentId) {
          console.log('✅ Reply created successfully with correct parent_id');
          console.log(`   Reply ID: ${replyId}`);
          console.log(`   parent_id in DB: ${dbReply.parent_id}`);
          console.log(`   Expected parent_id: ${parentId}`);
          console.log(`   Match: ${dbReply.parent_id === parentId ? 'YES' : 'NO'}`);
          testsPassed++;
        } else {
          throw new Error(`parent_id mismatch: expected ${parentId}, got ${dbReply?.parent_id}`);
        }
      } else {
        throw new Error(`Failed to create reply: ${replyResponse.status}`);
      }
    } catch (error) {
      console.error('❌ FAILED:', error.message);
      testsFailed++;
    }
    console.log('');

    // =============================================================================
    // TEST 4: Nested Reply Chain (3 levels deep)
    // =============================================================================
    console.log('TEST 4: Nested Reply Chain (3 levels deep)');
    console.log('-'.repeat(70));

    try {
      // Level 1: Top-level comment
      const level1Response = await createComment(post.id, 'Level 1 comment');
      const level1Id = level1Response.body.data.id;
      console.log(`   Level 1 created: ${level1Id}`);

      // Level 2: Reply to level 1
      const level2Response = await createComment(post.id, 'Level 2 reply', level1Id);
      const level2Id = level2Response.body.data.id;
      console.log(`   Level 2 created: ${level2Id} (parent: ${level1Id})`);

      // Level 3: Reply to level 2
      const level3Response = await createComment(post.id, 'Level 3 nested reply', level2Id);
      const level3Id = level3Response.body.data.id;
      console.log(`   Level 3 created: ${level3Id} (parent: ${level2Id})`);

      // Verify the chain in database
      const level1DB = await getCommentFromDB(level1Id);
      const level2DB = await getCommentFromDB(level2Id);
      const level3DB = await getCommentFromDB(level3Id);

      const chain = [
        { level: 1, id: level1Id, parentId: level1DB.parent_id, expected: null },
        { level: 2, id: level2Id, parentId: level2DB.parent_id, expected: level1Id },
        { level: 3, id: level3Id, parentId: level3DB.parent_id, expected: level2Id }
      ];

      let chainValid = true;
      chain.forEach(item => {
        const match = item.parentId === item.expected;
        console.log(`   Level ${item.level}: parent_id=${item.parentId}, expected=${item.expected} - ${match ? '✓' : '✗'}`);
        if (!match) chainValid = false;
      });

      if (chainValid) {
        console.log('✅ Nested reply chain verified successfully');
        testsPassed++;
      } else {
        throw new Error('Nested reply chain has incorrect parent_id values');
      }
    } catch (error) {
      console.error('❌ FAILED:', error.message);
      testsFailed++;
    }
    console.log('');

    // =============================================================================
    // TEST 5: Error Handling - Missing Content
    // =============================================================================
    console.log('TEST 5: Error Handling - Missing Content');
    console.log('-'.repeat(70));

    try {
      const response = await createComment(post.id, '', null);

      if (response.status === 400) {
        console.log('✅ API correctly rejects empty content with 400 status');
        console.log(`   Error message: ${response.body.error}`);
        testsPassed++;
      } else {
        throw new Error(`Expected 400, got ${response.status}`);
      }
    } catch (error) {
      console.error('❌ FAILED:', error.message);
      testsFailed++;
    }
    console.log('');

    // =============================================================================
    // TEST 6: Error Handling - Invalid parent_id
    // =============================================================================
    console.log('TEST 6: Error Handling - Invalid parent_id (Foreign Key Constraint)');
    console.log('-'.repeat(70));

    try {
      const response = await createComment(post.id, 'Reply to non-existent parent', 'non-existent-parent-id');

      // Should fail due to foreign key constraint
      if (response.status >= 400) {
        console.log('✅ API correctly rejects invalid parent_id');
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${response.body.error || response.body.details}`);
        testsPassed++;
      } else {
        throw new Error(`Expected error status, got ${response.status}`);
      }
    } catch (error) {
      console.error('❌ FAILED:', error.message);
      testsFailed++;
    }
    console.log('');

    // =============================================================================
    // TEST 7: Database Integrity - Foreign Key Cascade
    // =============================================================================
    console.log('TEST 7: Database Integrity - Foreign Key CASCADE on DELETE');
    console.log('-'.repeat(70));

    try {
      // Create parent and reply
      const parentResponse = await createComment(post.id, 'Parent to be deleted');
      const parentId = parentResponse.body.data.id;

      const replyResponse = await createComment(post.id, 'Reply that should cascade', parentId);
      const replyId = replyResponse.body.data.id;

      console.log(`   Created parent: ${parentId}`);
      console.log(`   Created reply: ${replyId}`);

      // Delete parent
      await dbRun('DELETE FROM comments WHERE id = ?', [parentId]);
      console.log(`   Deleted parent comment: ${parentId}`);

      // Check if reply was cascaded
      const replyAfterDelete = await getCommentFromDB(replyId);

      if (!replyAfterDelete) {
        console.log('✅ Foreign key CASCADE working correctly');
        console.log('   Reply was deleted when parent was deleted');
        testsPassed++;
      } else {
        throw new Error('Reply still exists after parent deletion - CASCADE not working');
      }
    } catch (error) {
      console.error('❌ FAILED:', error.message);
      testsFailed++;
    }
    console.log('');

    // =============================================================================
    // TEST 8: Integration - Full Comment Thread Structure
    // =============================================================================
    console.log('TEST 8: Integration - Full Comment Thread Structure');
    console.log('-'.repeat(70));

    try {
      // Create a complex thread structure
      const comments = [];

      // Top-level comments
      for (let i = 1; i <= 3; i++) {
        const response = await createComment(post.id, `Top-level comment ${i}`);
        comments.push({ id: response.body.data.id, level: 0, content: `Top-level comment ${i}` });
      }

      // Replies to first top-level comment
      const firstTopLevel = comments[0].id;
      for (let i = 1; i <= 2; i++) {
        const response = await createComment(post.id, `Reply ${i} to first comment`, firstTopLevel);
        comments.push({ id: response.body.data.id, level: 1, parentId: firstTopLevel, content: `Reply ${i}` });
      }

      console.log(`   Created ${comments.length} comments in thread structure`);

      // Verify all comments in database
      const dbComments = await getCommentsByPostId(post.id);

      console.log(`   Database contains ${dbComments.length} comments for post ${post.id}`);

      // Count by parent_id
      const topLevel = dbComments.filter(c => c.parent_id === null).length;
      const replies = dbComments.filter(c => c.parent_id !== null).length;

      console.log(`   Top-level comments: ${topLevel}`);
      console.log(`   Replies (with parent_id): ${replies}`);

      if (topLevel >= 3 && replies >= 2) {
        console.log('✅ Full thread structure created and verified');
        testsPassed++;
      } else {
        throw new Error(`Expected at least 3 top-level and 2 replies, got ${topLevel} and ${replies}`);
      }
    } catch (error) {
      console.error('❌ FAILED:', error.message);
      testsFailed++;
    }
    console.log('');

    // =============================================================================
    // TEST 9: API Response Format Validation
    // =============================================================================
    console.log('TEST 9: API Response Format Validation');
    console.log('-'.repeat(70));

    try {
      const response = await createComment(post.id, 'Response format test');

      const requiredFields = ['success', 'data', 'message'];
      const dataFields = ['id', 'post_id', 'content', 'author', 'parent_id', 'created_at'];

      let allFieldsPresent = true;

      // Check top-level response fields
      requiredFields.forEach(field => {
        if (!(field in response.body)) {
          console.log(`   ✗ Missing field: ${field}`);
          allFieldsPresent = false;
        } else {
          console.log(`   ✓ Field present: ${field}`);
        }
      });

      // Check data object fields
      dataFields.forEach(field => {
        if (!(field in response.body.data)) {
          console.log(`   ✗ Missing data field: ${field}`);
          allFieldsPresent = false;
        } else {
          console.log(`   ✓ Data field present: ${field}`);
        }
      });

      if (allFieldsPresent) {
        console.log('✅ API response format is correct');
        testsPassed++;
      } else {
        throw new Error('API response missing required fields');
      }
    } catch (error) {
      console.error('❌ FAILED:', error.message);
      testsFailed++;
    }
    console.log('');

    // =============================================================================
    // TEST 10: Performance - Multiple Concurrent Replies
    // =============================================================================
    console.log('TEST 10: Performance - Multiple Concurrent Replies');
    console.log('-'.repeat(70));

    try {
      // Create parent
      const parentResponse = await createComment(post.id, 'Parent for concurrent replies');
      const parentId = parentResponse.body.data.id;

      const startTime = Date.now();

      // Create 5 concurrent replies
      const promises = [];
      for (let i = 1; i <= 5; i++) {
        promises.push(createComment(post.id, `Concurrent reply ${i}`, parentId));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const allSuccessful = results.every(r => r.status === 201);

      console.log(`   Created 5 concurrent replies in ${duration}ms`);
      console.log(`   Average: ${(duration / 5).toFixed(2)}ms per reply`);
      console.log(`   All successful: ${allSuccessful ? 'YES' : 'NO'}`);

      if (allSuccessful) {
        console.log('✅ Concurrent replies handled successfully');
        testsPassed++;
      } else {
        throw new Error('Some concurrent replies failed');
      }
    } catch (error) {
      console.error('❌ FAILED:', error.message);
      testsFailed++;
    }
    console.log('');

  } catch (error) {
    console.error('❌ Test suite error:', error);
  } finally {
    // Cleanup
    await cleanup();
    await closeDB();

    // Summary
    console.log('='.repeat(70));
    console.log('\n📊 TEST SUMMARY\n');
    console.log(`Total Tests: ${testsPassed + testsFailed}`);
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
    console.log('');

    if (testsFailed === 0) {
      console.log('🎉 ALL TESTS PASSED!\n');
      process.exit(0);
    } else {
      console.log('⚠️  SOME TESTS FAILED\n');
      process.exit(1);
    }
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
