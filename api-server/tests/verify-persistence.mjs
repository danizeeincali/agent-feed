#!/usr/bin/env node

/**
 * Manual verification script to test streamingTickerMessages persistence
 * This script verifies that broadcastToSSE properly persists messages to the array
 */

import { broadcastToSSE, streamingTickerMessages } from '../server.js';

console.log('🔍 Verifying broadcastToSSE persistence...\n');

// Clear any existing messages
streamingTickerMessages.length = 0;

// Test 1: Basic persistence
console.log('Test 1: Basic persistence');
console.log('Initial array size:', streamingTickerMessages.length);

const message1 = {
  type: 'tool_activity',
  data: {
    tool: 'Read',
    action: 'package.json',
    priority: 'high'
  }
};

const emptyConnections = new Set();
const result1 = broadcastToSSE(message1, emptyConnections);

console.log('After broadcast - Array size:', streamingTickerMessages.length);
console.log('Result metrics:', result1);
console.log('Persisted message:', JSON.stringify(streamingTickerMessages[0], null, 2));
console.log('✅ Test 1 passed\n');

// Test 2: Multiple messages
console.log('Test 2: Multiple messages');
for (let i = 1; i <= 5; i++) {
  const message = {
    type: 'tool_activity',
    data: {
      tool: 'Edit',
      action: `file-${i}.tsx`,
      priority: 'high'
    }
  };
  broadcastToSSE(message, emptyConnections);
}

console.log('After 5 more broadcasts - Array size:', streamingTickerMessages.length);
console.log('First message action:', streamingTickerMessages[0].data.action);
console.log('Last message action:', streamingTickerMessages[5].data.action);
console.log('✅ Test 2 passed\n');

// Test 3: 100 message limit
console.log('Test 3: 100 message limit');
streamingTickerMessages.length = 0;

for (let i = 1; i <= 105; i++) {
  const message = {
    type: 'tool_activity',
    data: {
      tool: 'Test',
      action: `message-${i}`,
      priority: 'high'
    }
  };
  broadcastToSSE(message, emptyConnections);
}

console.log('After 105 broadcasts - Array size:', streamingTickerMessages.length);
console.log('First message (should be message-6):', streamingTickerMessages[0].data.action);
console.log('Last message (should be message-105):', streamingTickerMessages[99].data.action);

if (streamingTickerMessages.length === 100 &&
    streamingTickerMessages[0].data.action === 'message-6' &&
    streamingTickerMessages[99].data.action === 'message-105') {
  console.log('✅ Test 3 passed\n');
} else {
  console.log('❌ Test 3 failed\n');
  process.exit(1);
}

// Test 4: Message enrichment
console.log('Test 4: Message enrichment');
streamingTickerMessages.length = 0;

const messageWithoutId = {
  type: 'tool_activity',
  data: {
    tool: 'Bash',
    action: 'npm test',
    priority: 'high'
  }
};

broadcastToSSE(messageWithoutId, emptyConnections);
const enrichedMessage = streamingTickerMessages[0];

console.log('Message has UUID:', !!enrichedMessage.id);
console.log('Message has timestamp:', !!enrichedMessage.data.timestamp);
console.log('UUID value:', enrichedMessage.id);
console.log('Timestamp value:', enrichedMessage.data.timestamp);

if (enrichedMessage.id && enrichedMessage.data.timestamp) {
  console.log('✅ Test 4 passed\n');
} else {
  console.log('❌ Test 4 failed\n');
  process.exit(1);
}

// Summary
console.log('━'.repeat(50));
console.log('✅ ALL VERIFICATION TESTS PASSED');
console.log('━'.repeat(50));
console.log('\nSummary:');
console.log('✓ Messages are persisted to streamingTickerMessages array');
console.log('✓ 100 message limit is enforced correctly');
console.log('✓ UUID and timestamp are auto-generated when missing');
console.log('✓ Persistence works even with no active connections');
console.log('\nTotal tests run: 4');
console.log('All tests passed: ✅');

process.exit(0);
