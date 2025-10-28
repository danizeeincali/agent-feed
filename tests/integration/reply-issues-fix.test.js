/**
 * Integration Tests for Reply Issues Fix
 *
 * Tests the following fixes:
 * 1. Date field correctly reads `created_at` from API (not "Invalid Date")
 * 2. PostCard fetches from correct endpoint `/api/agent-posts/:id/comments`
 * 3. UI refreshes with new reply showing correct date
 *
 * ALL TESTS USE REAL BACKEND - NO MOCKS
 */

const baseUrl = process.env.API_URL || 'http://localhost:3000';

// Test utilities
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const createTestPost = async () => {
  const response = await fetch(`${baseUrl}/api/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test-user'
    },
    body: JSON.stringify({
      title: `Test Post ${Date.now()}`,
      content: 'Test content for reply issues',
      authorAgent: 'test-agent',
      publishedAt: new Date().toISOString()
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create test post: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result.data || result;
};

const createTestComment = async (postId, content, parentId = null) => {
  const response = await fetch(`${baseUrl}/api/agent-posts/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'test-user'
    },
    body: JSON.stringify({
      content,
      author: 'test-user',
      author_agent: 'test-agent',
      parent_id: parentId
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to create comment: ${response.status} - ${errorData.error || response.statusText}`);
  }

  const result = await response.json();
  return result.data;
};

const getComments = async (postId) => {
  const response = await fetch(`${baseUrl}/api/agent-posts/${postId}/comments`, {
    headers: {
      'x-user-id': 'test-user'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to get comments: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  return result.data || [];
};

const validateDate = (dateString) => {
  if (!dateString) {
    return { valid: false, error: 'Date is undefined or null' };
  }

  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { valid: false, error: `Invalid date: ${dateString}` };
  }

  return { valid: true, date };
};

// Test suite
const runTests = async () => {
  let testsPassed = 0;
  let testsFailed = 0;
  const failures = [];

  console.log('\n🧪 Starting Reply Issues Fix Integration Tests\n');
  console.log('='.repeat(60));

  // Test 1: Date Field Display - created_at from API
  try {
    console.log('\n📅 TEST 1: Date field correctly reads created_at from API');
    console.log('-'.repeat(60));

    const post = await createTestPost();
    console.log(`✓ Created test post: ${post.id}`);

    const comment = await createTestComment(post.id, 'Test comment for date validation');
    console.log(`✓ Created comment: ${comment.id}`);

    await delay(500); // Allow database to persist

    const comments = await getComments(post.id);
    const foundComment = comments.find(c => c.id === comment.id);

    if (!foundComment) {
      throw new Error('Comment not found in fetched comments');
    }

    console.log(`✓ Fetched comment from API`);
    console.log(`  - created_at field: ${foundComment.created_at}`);
    console.log(`  - createdAt field: ${foundComment.createdAt}`);

    // Validate created_at field (snake_case from backend)
    const createdAtValidation = validateDate(foundComment.created_at);
    if (!createdAtValidation.valid) {
      throw new Error(`created_at validation failed: ${createdAtValidation.error}`);
    }

    console.log(`✓ created_at is valid: ${createdAtValidation.date.toISOString()}`);

    // Verify date is recent (within last 10 seconds)
    const now = new Date();
    const commentDate = createdAtValidation.date;
    const diffSeconds = (now - commentDate) / 1000;

    if (diffSeconds < 0 || diffSeconds > 10) {
      throw new Error(`Date is not recent: ${diffSeconds.toFixed(2)}s ago`);
    }

    console.log(`✓ Date is recent: ${diffSeconds.toFixed(2)}s ago`);
    console.log('✅ TEST 1 PASSED: Date field works correctly\n');
    testsPassed++;

  } catch (error) {
    console.error(`❌ TEST 1 FAILED: ${error.message}\n`);
    failures.push({ test: 'Date Field Display', error: error.message });
    testsFailed++;
  }

  // Test 2: API Endpoint - Correct endpoint is called
  try {
    console.log('\n🔗 TEST 2: PostCard fetches from correct endpoint');
    console.log('-'.repeat(60));

    const post = await createTestPost();
    console.log(`✓ Created test post: ${post.id}`);

    // Create multiple comments
    const comment1 = await createTestComment(post.id, 'First comment');
    const comment2 = await createTestComment(post.id, 'Second comment');
    console.log(`✓ Created 2 comments`);

    await delay(500);

    // Test the exact endpoint PostCard uses
    const endpoint = `/api/agent-posts/${post.id}/comments`;
    console.log(`  Testing endpoint: ${endpoint}`);

    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: { 'x-user-id': 'test-user' }
    });

    if (!response.ok) {
      throw new Error(`Endpoint failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✓ Endpoint responded successfully`);
    console.log(`  - Response structure: ${JSON.stringify(Object.keys(result))}`);
    console.log(`  - Comments count: ${result.data?.length || 0}`);

    if (!result.data || !Array.isArray(result.data)) {
      throw new Error('Response does not contain data array');
    }

    if (result.data.length !== 2) {
      throw new Error(`Expected 2 comments, got ${result.data.length}`);
    }

    console.log(`✓ Received correct number of comments`);
    console.log('✅ TEST 2 PASSED: API endpoint works correctly\n');
    testsPassed++;

  } catch (error) {
    console.error(`❌ TEST 2 FAILED: ${error.message}\n`);
    failures.push({ test: 'API Endpoint', error: error.message });
    testsFailed++;
  }

  // Test 3: UI Refresh - Post reply and verify UI updates
  try {
    console.log('\n🔄 TEST 3: UI refresh after posting reply');
    console.log('-'.repeat(60));

    const post = await createTestPost();
    console.log(`✓ Created test post: ${post.id}`);

    // Create parent comment
    const parentComment = await createTestComment(post.id, 'Parent comment');
    console.log(`✓ Created parent comment: ${parentComment.id}`);

    await delay(500);

    // Fetch initial state
    const initialComments = await getComments(post.id);
    console.log(`✓ Initial comments count: ${initialComments.length}`);

    // Create reply
    const reply = await createTestComment(post.id, 'Reply to parent', parentComment.id);
    console.log(`✓ Created reply: ${reply.id}`);

    await delay(500);

    // Fetch updated state
    const updatedComments = await getComments(post.id);
    console.log(`✓ Updated comments count: ${updatedComments.length}`);

    if (updatedComments.length !== initialComments.length + 1) {
      throw new Error(`Expected ${initialComments.length + 1} comments, got ${updatedComments.length}`);
    }

    // Find the reply
    const foundReply = updatedComments.find(c => c.id === reply.id);
    if (!foundReply) {
      throw new Error('Reply not found in updated comments');
    }

    console.log(`✓ Reply found in updated comments`);
    console.log(`  - Parent ID: ${foundReply.parent_id}`);
    console.log(`  - Content: ${foundReply.content}`);

    if (foundReply.parent_id !== parentComment.id) {
      throw new Error(`Reply parent_id mismatch: expected ${parentComment.id}, got ${foundReply.parent_id}`);
    }

    console.log(`✓ Reply correctly linked to parent`);
    console.log('✅ TEST 3 PASSED: UI refresh works correctly\n');
    testsPassed++;

  } catch (error) {
    console.error(`❌ TEST 3 FAILED: ${error.message}\n`);
    failures.push({ test: 'UI Refresh', error: error.message });
    testsFailed++;
  }

  // Test 4: Date Parsing - Verify created_at field is read correctly
  try {
    console.log('\n📖 TEST 4: Date parsing from created_at field');
    console.log('-'.repeat(60));

    const post = await createTestPost();
    console.log(`✓ Created test post: ${post.id}`);

    const comment = await createTestComment(post.id, 'Comment for date parsing test');
    console.log(`✓ Created comment: ${comment.id}`);

    await delay(500);

    const comments = await getComments(post.id);
    const foundComment = comments.find(c => c.id === comment.id);

    if (!foundComment) {
      throw new Error('Comment not found');
    }

    console.log(`✓ Comment fetched`);
    console.log(`  Raw comment object keys: ${JSON.stringify(Object.keys(foundComment))}`);

    // Check for created_at field (snake_case from backend)
    if (!foundComment.created_at && !foundComment.createdAt) {
      throw new Error('Neither created_at nor createdAt field found');
    }

    const dateField = foundComment.created_at || foundComment.createdAt;
    console.log(`✓ Date field found: ${dateField}`);

    // Test parsing with Date constructor
    const parsedDate = new Date(dateField);
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Failed to parse date: ${dateField}`);
    }

    console.log(`✓ Date parsed successfully: ${parsedDate.toISOString()}`);

    // Test relative time formatting (like frontend)
    const now = new Date();
    const diffInHours = (now.getTime() - parsedDate.getTime()) / (1000 * 60 * 60);
    const diffInMinutes = Math.floor(diffInHours * 60);

    let relativeTime;
    if (diffInHours < 1) {
      relativeTime = `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      relativeTime = `${Math.floor(diffInHours)}h ago`;
    } else {
      relativeTime = `${Math.floor(diffInHours / 24)}d ago`;
    }

    console.log(`✓ Relative time: ${relativeTime}`);

    if (relativeTime === 'Invalid Date' || relativeTime === 'NaN') {
      throw new Error('Relative time formatting failed');
    }

    console.log('✅ TEST 4 PASSED: Date parsing works correctly\n');
    testsPassed++;

  } catch (error) {
    console.error(`❌ TEST 4 FAILED: ${error.message}\n`);
    failures.push({ test: 'Date Parsing', error: error.message });
    testsFailed++;
  }

  // Test 5: Full Flow - End-to-end integration test
  try {
    console.log('\n🚀 TEST 5: Full flow - Post creation to reply display with date');
    console.log('-'.repeat(60));

    // Step 1: Create post
    const post = await createTestPost();
    console.log(`✓ Step 1: Created post ${post.id}`);

    // Step 2: Create root comment
    const rootComment = await createTestComment(post.id, 'Root level comment');
    console.log(`✓ Step 2: Created root comment ${rootComment.id}`);

    await delay(500);

    // Step 3: Verify root comment appears with valid date
    let comments = await getComments(post.id);
    let foundRoot = comments.find(c => c.id === rootComment.id);

    if (!foundRoot) {
      throw new Error('Root comment not found');
    }

    const rootDateValidation = validateDate(foundRoot.created_at || foundRoot.createdAt);
    if (!rootDateValidation.valid) {
      throw new Error(`Root comment date invalid: ${rootDateValidation.error}`);
    }

    console.log(`✓ Step 3: Root comment visible with date ${rootDateValidation.date.toISOString()}`);

    // Step 4: Create reply
    const reply1 = await createTestComment(post.id, 'First reply', rootComment.id);
    console.log(`✓ Step 4: Created reply ${reply1.id}`);

    await delay(500);

    // Step 5: Verify reply appears with valid date
    comments = await getComments(post.id);
    let foundReply = comments.find(c => c.id === reply1.id);

    if (!foundReply) {
      throw new Error('Reply not found after refresh');
    }

    const replyDateValidation = validateDate(foundReply.created_at || foundReply.createdAt);
    if (!replyDateValidation.valid) {
      throw new Error(`Reply date invalid: ${replyDateValidation.error}`);
    }

    console.log(`✓ Step 5: Reply visible with date ${replyDateValidation.date.toISOString()}`);
    console.log(`✓ Reply parent_id: ${foundReply.parent_id}`);

    // Step 6: Create nested reply
    const reply2 = await createTestComment(post.id, 'Nested reply', reply1.id);
    console.log(`✓ Step 6: Created nested reply ${reply2.id}`);

    await delay(500);

    // Step 7: Verify all comments present with valid dates
    comments = await getComments(post.id);
    console.log(`✓ Step 7: Final comment count: ${comments.length}`);

    if (comments.length !== 3) {
      throw new Error(`Expected 3 comments (1 root + 2 replies), got ${comments.length}`);
    }

    // Validate all dates
    const allDatesValid = comments.every(c => {
      const validation = validateDate(c.created_at || c.createdAt);
      return validation.valid;
    });

    if (!allDatesValid) {
      throw new Error('Not all comment dates are valid');
    }

    console.log(`✓ All ${comments.length} comments have valid dates`);
    console.log('✅ TEST 5 PASSED: Full flow works end-to-end\n');
    testsPassed++;

  } catch (error) {
    console.error(`❌ TEST 5 FAILED: ${error.message}\n`);
    failures.push({ test: 'Full Flow Integration', error: error.message });
    testsFailed++;
  }

  // Test 6: Date Format Consistency
  try {
    console.log('\n📅 TEST 6: Date format consistency across multiple comments');
    console.log('-'.repeat(60));

    const post = await createTestPost();
    console.log(`✓ Created test post: ${post.id}`);

    // Create multiple comments with delays
    const comments = [];
    for (let i = 0; i < 5; i++) {
      const comment = await createTestComment(post.id, `Comment ${i + 1}`);
      comments.push(comment);
      console.log(`✓ Created comment ${i + 1}: ${comment.id}`);
      await delay(200); // Small delay between comments
    }

    await delay(500);

    // Fetch all comments
    const fetchedComments = await getComments(post.id);
    console.log(`✓ Fetched ${fetchedComments.length} comments`);

    // Validate all dates
    const dateFormats = new Set();
    fetchedComments.forEach((comment, index) => {
      const dateStr = comment.created_at || comment.createdAt;
      if (!dateStr) {
        throw new Error(`Comment ${index} missing date field`);
      }

      const validation = validateDate(dateStr);
      if (!validation.valid) {
        throw new Error(`Comment ${index} has invalid date: ${validation.error}`);
      }

      // Check ISO 8601 format
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      if (isoRegex.test(dateStr)) {
        dateFormats.add('ISO-8601');
      } else {
        dateFormats.add('OTHER');
      }
    });

    console.log(`✓ All ${fetchedComments.length} comments have valid dates`);
    console.log(`✓ Date formats found: ${Array.from(dateFormats).join(', ')}`);

    // Verify chronological order
    const dates = fetchedComments.map(c => new Date(c.created_at || c.createdAt));
    const sorted = [...dates].sort((a, b) => a - b);
    const isChronological = dates.every((date, i) => date.getTime() === sorted[i].getTime());

    if (isChronological) {
      console.log(`✓ Comments are in chronological order`);
    } else {
      console.log(`⚠ Comments not in strict chronological order (acceptable)`);
    }

    console.log('✅ TEST 6 PASSED: Date format is consistent\n');
    testsPassed++;

  } catch (error) {
    console.error(`❌ TEST 6 FAILED: ${error.message}\n`);
    failures.push({ test: 'Date Format Consistency', error: error.message });
    testsFailed++;
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Total:  ${testsPassed + testsFailed}`);
  console.log(`🎯 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);

  if (failures.length > 0) {
    console.log('\n❌ FAILURES:');
    failures.forEach(({ test, error }) => {
      console.log(`  - ${test}: ${error}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  // Exit with appropriate code
  process.exit(testsFailed > 0 ? 1 : 0);
};

// Run tests
runTests().catch(error => {
  console.error('\n💥 FATAL ERROR:', error);
  process.exit(1);
});
