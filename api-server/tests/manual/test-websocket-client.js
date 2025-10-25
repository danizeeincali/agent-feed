/**
 * Manual WebSocket Client Test
 *
 * This script connects to the WebSocket server and listens for ticket status updates.
 * Use this to manually verify WebSocket events are being emitted correctly.
 *
 * Usage:
 *   node tests/manual/test-websocket-client.js
 */

import { io } from 'socket.io-client';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

console.log('='.repeat(60));
console.log('WebSocket Client Test - Listening for Events');
console.log('='.repeat(60));
console.log(`Connecting to: ${SERVER_URL}`);
console.log('');

const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

socket.on('connect', () => {
  console.log('[CONNECTED] WebSocket connection established');
  console.log(`Socket ID: ${socket.id}`);
  console.log('');
  console.log('Listening for events...');
  console.log('-'.repeat(60));
});

socket.on('connected', (data) => {
  console.log('[SERVER MESSAGE]', data);
});

socket.on('ticket:status:update', (data) => {
  console.log('');
  console.log('[TICKET STATUS UPDATE]');
  console.log('  Post ID:', data.post_id);
  console.log('  Ticket ID:', data.ticket_id);
  console.log('  Status:', data.status);
  console.log('  Agent ID:', data.agent_id);
  console.log('  Timestamp:', data.timestamp);
  if (data.error) {
    console.log('  Error:', data.error);
  }
  console.log('-'.repeat(60));
});

socket.on('worker:lifecycle', (data) => {
  console.log('');
  console.log('[WORKER LIFECYCLE EVENT]');
  console.log('  Worker ID:', data.worker_id);
  console.log('  Ticket ID:', data.ticket_id);
  console.log('  Event Type:', data.event_type);
  console.log('  Timestamp:', data.timestamp);
  console.log('-'.repeat(60));
});

socket.on('disconnect', (reason) => {
  console.log('');
  console.log('[DISCONNECTED]', reason);
});

socket.on('connect_error', (error) => {
  console.error('[CONNECTION ERROR]', error.message);
});

socket.on('error', (error) => {
  console.error('[ERROR]', error);
});

// Subscribe to specific post (optional - uncomment to test)
// setTimeout(() => {
//   const postId = 'post-123';
//   console.log(`\n[SUBSCRIBING] to post: ${postId}`);
//   socket.emit('subscribe:post', postId);
// }, 1000);

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n\n[SHUTDOWN] Closing connection...');
  socket.disconnect();
  process.exit(0);
});

console.log('\nPress Ctrl+C to exit\n');
