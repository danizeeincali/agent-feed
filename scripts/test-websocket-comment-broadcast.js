#!/usr/bin/env node
/**
 * WebSocket Comment Broadcasting Test Script
 *
 * Tests real-time comment:created event broadcasting
 * Run this while the API server is running (npm run dev)
 */

import { io } from 'socket.io-client';
import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3001';

// Test data
const testPostId = `test-post-${Date.now()}`;
const testUserId = `test-user-${Date.now()}`;

console.log('🧪 WebSocket Comment Broadcasting Test\n');
console.log(`API URL: ${API_URL}`);
console.log(`Socket URL: ${SOCKET_URL}`);
console.log(`Test Post ID: ${testPostId}`);
console.log(`Test User ID: ${testUserId}\n`);

// Step 1: Create WebSocket connection
console.log('Step 1: Connecting to WebSocket server...');
const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  path: '/socket.io/'
});

let receivedEvent = false;

socket.on('connect', async () => {
  console.log('✅ Connected to WebSocket server (socket ID:', socket.id, ')\n');

  // Step 2: Subscribe to post updates
  console.log('Step 2: Subscribing to post updates...');
  socket.emit('subscribe:post', testPostId);
  console.log(`✅ Subscribed to room: post:${testPostId}\n`);

  // Step 3: Setup event listener
  console.log('Step 3: Setting up comment:created event listener...');
  socket.on('comment:created', (data) => {
    receivedEvent = true;
    console.log('\n🎉 Received comment:created event!');
    console.log('Event Payload:');
    console.log(JSON.stringify(data, null, 2));

    // Validate payload structure
    console.log('\n✅ Payload Validation:');
    console.log(`  - Has postId: ${!!data.postId}`);
    console.log(`  - Has comment: ${!!data.comment}`);
    console.log(`  - Comment has id: ${!!data.comment?.id}`);
    console.log(`  - Comment has content: ${!!data.comment?.content}`);
    console.log(`  - Comment has content_type: ${!!data.comment?.content_type}`);
    console.log(`  - Comment has author_agent: ${!!data.comment?.author_agent}`);
    console.log(`  - Comment has user_id: ${!!data.comment?.user_id}`);
    console.log(`  - Comment has created_at: ${!!data.comment?.created_at}`);

    // Disconnect and exit
    setTimeout(() => {
      console.log('\n✅ Test completed successfully!');
      socket.disconnect();
      process.exit(0);
    }, 1000);
  });
  console.log('✅ Event listener registered\n');

  // Step 4: Create test post (prerequisite for comment)
  console.log('Step 4: Creating test post...');
  try {
    const postResponse = await fetch(`${API_URL}/api/agent-posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId
      },
      body: JSON.stringify({
        id: testPostId,
        title: 'WebSocket Test Post',
        content: 'This post is for testing WebSocket comment broadcasting',
        author: testUserId,
        authorAgent: testUserId
      })
    });

    if (!postResponse.ok) {
      throw new Error(`Failed to create post: ${postResponse.status} ${postResponse.statusText}`);
    }

    const postResult = await postResponse.json();
    console.log(`✅ Test post created: ${postResult.id || testPostId}\n`);
  } catch (error) {
    console.error('❌ Failed to create test post:', error.message);
    socket.disconnect();
    process.exit(1);
  }

  // Step 5: Create test comment (should trigger WebSocket broadcast)
  console.log('Step 5: Creating test comment (should trigger WebSocket broadcast)...');
  try {
    const commentResponse = await fetch(`${API_URL}/api/agent-posts/${testPostId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': testUserId
      },
      body: JSON.stringify({
        content: 'This is a test comment to verify WebSocket broadcasting works correctly!',
        author: testUserId
      })
    });

    if (!commentResponse.ok) {
      throw new Error(`Failed to create comment: ${commentResponse.status} ${commentResponse.statusText}`);
    }

    const commentResult = await commentResponse.json();
    console.log('✅ Comment created successfully');
    console.log(`   Comment ID: ${commentResult.comment?.id}`);
    console.log(`   Author: ${commentResult.comment?.author_agent}`);
    console.log(`   Content: ${commentResult.comment?.content?.substring(0, 50)}...`);
    console.log('\n⏳ Waiting for WebSocket event...');
  } catch (error) {
    console.error('❌ Failed to create comment:', error.message);
    socket.disconnect();
    process.exit(1);
  }

  // Timeout if no event received
  setTimeout(() => {
    if (!receivedEvent) {
      console.error('\n❌ TIMEOUT: No comment:created event received after 5 seconds');
      console.error('   Possible issues:');
      console.error('   - WebSocket service not initialized on server');
      console.error('   - Broadcasting not called in comment creation endpoint');
      console.error('   - Room subscription failed');
      socket.disconnect();
      process.exit(1);
    }
  }, 5000);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log(`\n🔌 Disconnected from WebSocket server (reason: ${reason})`);
});

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  socket.disconnect();
  process.exit(0);
});
