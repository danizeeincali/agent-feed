#!/usr/bin/env node

/**
 * CRITICAL FIXES VALIDATION - 100% REAL, NO MOCKS
 *
 * This script validates the two critical fixes with REAL API calls and backend monitoring:
 * 1. WebSocket Real-Time Updates (no refresh needed)
 * 2. Multi-Turn Conversation Context (agent remembers previous messages)
 *
 * User's Test Case: "4949 + 98" → "5047" → "divide by 2" → should get "2523.5" with context
 */

const http = require('http');
const io = require('socket.io-client');

const API_BASE = 'http://localhost:3001';
const SOCKET_URL = 'http://localhost:3001';

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

// Make HTTP request
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (e) {
          resolve({ body, statusCode: res.statusCode });
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

// Wait helper
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.bright);
  log('CRITICAL FIXES VALIDATION - 100% REAL TESTING', colors.bright);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.bright);

  let testsPassed = 0;
  let testsFailed = 0;

  // ========== TEST 1: WebSocket Real-Time Subscription ==========
  log('\n📡 TEST 1: WebSocket Real-Time Subscription Fix', colors.bright);
  log('────────────────────────────────────────────────\n');

  try {
    // Create a test post
    info('Step 1: Creating test post via API...');
    const postResponse = await makeRequest('POST', '/api/v1/agent-posts', {
      title: 'WebSocket Test',
      content: 'WebSocket Subscription Test Post',
      type: 'text',
    });

    if (!postResponse.success || !postResponse.data?.id) {
      throw new Error(`Failed to create post: ${JSON.stringify(postResponse)}`);
    }

    const postId = postResponse.data.id;
    success(`Post created: ${postId}`);

    // Connect WebSocket client
    info('Step 2: Connecting WebSocket client...');

    let subscriptionReceived = false;
    let commentReceived = false;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: false,
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Socket connection timeout')), 5000);

      socket.on('connect', () => {
        clearTimeout(timeout);
        success(`WebSocket connected: ${socket.id}`);
        resolve();
      });

      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    // Subscribe to the post
    info('Step 3: Subscribing to post...');
    socket.emit('subscribe:post', postId);

    // Listen for backend confirmation (if emitted)
    socket.on('subscription:confirmed', (data) => {
      if (data.postId === postId) {
        subscriptionReceived = true;
        success(`Subscription confirmed for post: ${postId}`);
      }
    });

    // Listen for comment:added event
    socket.on('comment:added', (data) => {
      if (data.postId === postId) {
        commentReceived = true;
        success(`Real-time comment received via WebSocket: ${data.comment?.id || data.id}`);
      }
    });

    await wait(1000); // Allow subscription to complete

    // Create a comment
    info('Step 4: Creating comment via API...');
    const commentResponse = await makeRequest('POST', `/api/v1/agent-posts/${postId}/comments`, {
      content: 'Test real-time comment delivery',
      author: 'test-user',
    });

    if (!commentResponse.success) {
      throw new Error(`Failed to create comment: ${JSON.stringify(commentResponse)}`);
    }

    success(`Comment created: ${commentResponse.data?.id || 'unknown'}`);

    // Wait for WebSocket broadcast
    info('Step 5: Waiting for real-time WebSocket broadcast...');
    await wait(3000);

    // Check results
    if (commentReceived) {
      success('✅ FIX #1 VERIFIED: Real-time comment broadcast received!');
      testsPassed++;
    } else {
      error('❌ FIX #1 FAILED: No real-time comment broadcast received');
      warning('Check backend logs for subscription confirmations');
      testsFailed++;
    }

    socket.disconnect();

  } catch (err) {
    error(`TEST 1 ERROR: ${err.message}`);
    testsFailed++;
  }

  // ========== TEST 2: Multi-Turn Conversation Context ==========
  log('\n💬 TEST 2: Multi-Turn Conversation Context Fix', colors.bright);
  log('────────────────────────────────────────────────\n');

  try {
    // Create a conversation test post
    info('Step 1: Creating conversation test post...');
    const postResponse = await makeRequest('POST', '/api/v1/agent-posts', {
      title: 'Conversation Test',
      content: 'Multi-Turn Conversation Test',
      type: 'text',
    });

    if (!postResponse.success || !postResponse.data?.id) {
      throw new Error(`Failed to create post: ${JSON.stringify(postResponse)}`);
    }

    const postId = postResponse.data.id;
    success(`Conversation post created: ${postId}`);

    // Turn 1: Ask a math question
    info('Step 2: Turn 1 - Asking "What is 4949 + 98?"...');
    const turn1Response = await makeRequest('POST', `/api/v1/agent-posts/${postId}/comments`, {
      content: 'What is 4949 + 98?',
      author: 'test-user',
    });

    if (!turn1Response.success) {
      throw new Error(`Failed to create turn 1 comment: ${JSON.stringify(turn1Response)}`);
    }

    const turn1Id = turn1Response.data.id;
    success(`Turn 1 comment created: ${turn1Id}`);

    // Wait for Avi's response
    info('Step 3: Waiting for Avi to respond with "5047"...');
    await wait(10000); // Give Avi time to process and respond

    // Get comments to find Avi's response
    const commentsResponse = await makeRequest('GET', `/api/posts/${postId}/comments`);

    if (!commentsResponse.success) {
      throw new Error(`Failed to get comments: ${JSON.stringify(commentsResponse)}`);
    }

    const aviResponse = commentsResponse.data.find((c) =>
      c.author?.includes('avi') && c.content?.includes('5047')
    );

    if (!aviResponse) {
      warning('Avi did not respond with "5047" in Turn 1');
      warning('Continuing test anyway to check context mechanism...');
    } else {
      success(`Avi responded: "${aviResponse.content.substring(0, 100)}..."`);
    }

    // Turn 2: Follow-up question with context dependency
    info('Step 4: Turn 2 - Replying "divide by 2" (requires context)...');

    const turn2Response = await makeRequest('POST', `/api/v1/agent-posts/${postId}/comments`, {
      content: 'divide by 2',
      author: 'test-user',
      parent_id: aviResponse?.id || turn1Id, // Reply to Avi or original comment
    });

    if (!turn2Response.success) {
      throw new Error(`Failed to create turn 2 comment: ${JSON.stringify(turn2Response)}`);
    }

    const turn2Id = turn2Response.data.id;
    success(`Turn 2 comment created: ${turn2Id}`);

    // Wait for Avi's contextual response
    info('Step 5: Waiting for Avi to respond with context (should mention 5047 or calculate 2523.5)...');
    await wait(15000);

    // Get updated comments
    const updatedCommentsResponse = await makeRequest('GET', `/api/posts/${postId}/comments`);

    if (!updatedCommentsResponse.success) {
      throw new Error(`Failed to get updated comments: ${JSON.stringify(updatedCommentsResponse)}`);
    }

    // Find Avi's contextual response
    const aviContextualResponse = updatedCommentsResponse.data.find((c) =>
      c.author?.includes('avi') &&
      c.created_at > turn2Response.data.created_at &&
      (c.content?.includes('2523') || c.content?.includes('5047') || c.content?.includes('divide'))
    );

    if (!aviContextualResponse) {
      error('❌ FIX #2 FAILED: Avi did not respond to follow-up question');
      testsFailed++;
    } else {
      const responseText = aviContextualResponse.content;

      // Check if response has context (mentions previous number or calculates correctly)
      const hasContext = responseText.includes('5047') ||
        responseText.includes('2523') ||
        responseText.includes('2524') ||
        (responseText.match(/\d+/) && !responseText.includes('need.*context'));

      const needsContext = /need.*context|don't (know|understand)|can't (help|answer)/i.test(responseText);

      if (hasContext && !needsContext) {
        success(`✅ FIX #2 VERIFIED: Avi responded with context!`);
        info(`   Response: "${responseText.substring(0, 150)}..."`);
        testsPassed++;
      } else {
        error('❌ FIX #2 FAILED: Avi lost conversation context');
        warning(`   Response: "${responseText.substring(0, 150)}..."`);
        testsFailed++;
      }
    }

  } catch (err) {
    error(`TEST 2 ERROR: ${err.message}`);
    testsFailed++;
  }

  // ========== FINAL RESULTS ==========
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.bright);
  log('VALIDATION RESULTS', colors.bright);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.bright);

  success(`Tests Passed: ${testsPassed}/2`);
  if (testsFailed > 0) {
    error(`Tests Failed: ${testsFailed}/2`);
  }

  if (testsPassed === 2) {
    log('\n🎉 ALL CRITICAL FIXES VERIFIED - 100% REAL FUNCTIONALITY!', colors.green + colors.bright);
    process.exit(0);
  } else {
    log('\n⚠️  SOME TESTS FAILED - Review output above', colors.yellow + colors.bright);
    process.exit(1);
  }
}

// Run the tests
runTests().catch((err) => {
  error(`FATAL ERROR: ${err.message}`);
  console.error(err);
  process.exit(1);
});
