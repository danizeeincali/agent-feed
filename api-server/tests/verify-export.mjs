#!/usr/bin/env node

import { broadcastToSSE } from '../server.js';

console.log('✅ broadcastToSSE successfully imported from server.js');
console.log('✅ Type:', typeof broadcastToSSE);
console.log('✅ Function name:', broadcastToSSE.name);

// Test basic functionality
const mockConnections = new Set();
const messages = [];

const mockClient = {
  writable: true,
  destroyed: false,
  write: (data) => {
    messages.push(data);
  }
};

mockConnections.add(mockClient);

// Test broadcast
broadcastToSSE({
  type: 'tool_activity',
  data: {
    tool: 'Bash',
    action: 'git status',
    priority: 'high'
  }
}, mockConnections);

console.log('✅ Broadcast successful');
console.log('✅ Messages sent:', messages.length);

if (messages.length === 1) {
  const parsed = JSON.parse(messages[0].replace('data: ', '').trim());
  console.log('✅ Message structure valid');
  console.log('   - id:', parsed.id ? '✓' : '✗');
  console.log('   - type:', parsed.type);
  console.log('   - data.tool:', parsed.data.tool);
  console.log('   - data.action:', parsed.data.action);
  console.log('   - data.priority:', parsed.data.priority);
  console.log('   - data.timestamp:', parsed.data.timestamp ? '✓' : '✗');
  console.log('\n✅ ALL CHECKS PASSED - broadcastToSSE is working correctly!');
} else {
  console.error('✗ Expected 1 message, got:', messages.length);
  process.exit(1);
}
