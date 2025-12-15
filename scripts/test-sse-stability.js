#!/usr/bin/env node

/**
 * SSE Connection Stability Monitoring Script
 *
 * This script creates a long-lived SSE connection and monitors:
 * - Connection uptime
 * - Keepalive intervals
 * - Heartbeat events
 * - Connection errors
 * - Health metrics
 */

import { EventSource } from 'eventsource';

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:3001';
const SSE_ENDPOINT = `${API_BASE}/api/streaming-ticker/stream`;
const MONITOR_DURATION = parseInt(process.env.DURATION || '300000'); // 5 minutes default

console.log('🚀 SSE Connection Stability Monitor');
console.log('=====================================');
console.log(`📡 Endpoint: ${SSE_ENDPOINT}`);
console.log(`⏱️  Duration: ${MONITOR_DURATION / 1000}s`);
console.log('');

let connectionStartTime = null;
let connectionId = null;
let heartbeatCount = 0;
let eventCount = 0;
let errorCount = 0;
let lastHeartbeatTime = null;
let eventTypes = {};

const eventSource = new EventSource(SSE_ENDPOINT);

eventSource.onopen = () => {
  connectionStartTime = Date.now();
  console.log('✅ SSE connection opened');
  console.log('');
};

eventSource.onerror = (error) => {
  errorCount++;
  const elapsed = Date.now() - connectionStartTime;
  console.error(`❌ ERROR #${errorCount} at ${(elapsed / 1000).toFixed(2)}s:`, error.type || 'Unknown error');

  if (eventSource.readyState === EventSource.CLOSED) {
    console.error('🔌 Connection CLOSED by server (this should NOT happen with keepalive!)');
    process.exit(1);
  }
};

eventSource.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    const elapsed = Date.now() - connectionStartTime;

    eventCount++;
    eventTypes[data.type] = (eventTypes[data.type] || 0) + 1;

    // Connection event
    if (data.type === 'connection') {
      connectionId = data.data.connectionId;
      console.log(`🔗 Connection ID: ${connectionId}`);
      console.log(`📅 Timestamp: ${new Date(data.data.timestamp).toISOString()}`);
      console.log('');
    }

    // Heartbeat event
    if (data.type === 'heartbeat') {
      heartbeatCount++;
      lastHeartbeatTime = Date.now();
      const uptime = data.data.uptime || 0;
      const timeSinceLast = heartbeatCount > 1 ? elapsed - (uptime - 45000) : 0;

      console.log(`💓 Heartbeat #${heartbeatCount}`);
      console.log(`   Uptime: ${(uptime / 1000).toFixed(2)}s`);
      console.log(`   Elapsed: ${(elapsed / 1000).toFixed(2)}s`);
      console.log(`   Connection: ${data.data.connectionId}`);
      console.log('');
    }

    // Other events
    if (data.type !== 'connection' && data.type !== 'heartbeat') {
      console.log(`📨 Event: ${data.type} (${(elapsed / 1000).toFixed(2)}s)`);
    }
  } catch (parseError) {
    console.error('❌ Parse error:', parseError.message);
  }
};

// Status updates every 30 seconds
const statusInterval = setInterval(() => {
  if (!connectionStartTime) return;

  const elapsed = Date.now() - connectionStartTime;
  const elapsedSeconds = Math.floor(elapsed / 1000);
  const expectedHeartbeats = Math.floor(elapsed / 45000);
  const timeSinceLastHeartbeat = lastHeartbeatTime ? Date.now() - lastHeartbeatTime : null;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Status Update (${elapsedSeconds}s)`);
  console.log(`   Connection: ${connectionId ? 'ACTIVE' : 'PENDING'}`);
  console.log(`   Heartbeats: ${heartbeatCount}/${expectedHeartbeats} expected`);
  console.log(`   Events: ${eventCount} total`);
  console.log(`   Errors: ${errorCount}`);
  if (timeSinceLastHeartbeat !== null) {
    console.log(`   Last heartbeat: ${(timeSinceLastHeartbeat / 1000).toFixed(1)}s ago`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}, 30000);

// Finish monitoring after duration
setTimeout(() => {
  clearInterval(statusInterval);

  const totalDuration = Date.now() - connectionStartTime;
  const totalSeconds = (totalDuration / 1000).toFixed(2);
  const expectedHeartbeats = Math.floor(totalDuration / 45000);

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('🏁 FINAL RESULTS');
  console.log('═══════════════════════════════════════════');
  console.log(`Duration: ${totalSeconds}s`);
  console.log(`Connection ID: ${connectionId}`);
  console.log(`Total Events: ${eventCount}`);
  console.log(`Heartbeats: ${heartbeatCount}/${expectedHeartbeats} expected`);
  console.log(`Errors: ${errorCount}`);
  console.log('');
  console.log('Event Types:');
  Object.entries(eventTypes).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
  console.log('');

  // Validate results
  const success = (
    connectionId &&
    heartbeatCount >= expectedHeartbeats - 1 &&
    errorCount === 0 &&
    totalDuration >= MONITOR_DURATION
  );

  if (success) {
    console.log('✅ SSE CONNECTION STABILITY TEST PASSED');
    console.log('   - Connection remained stable');
    console.log('   - Keepalive mechanism working');
    console.log('   - Heartbeats received consistently');
    console.log('   - No errors detected');
    eventSource.close();
    process.exit(0);
  } else {
    console.log('❌ SSE CONNECTION STABILITY TEST FAILED');
    if (!connectionId) console.log('   - Connection was not established');
    if (heartbeatCount < expectedHeartbeats - 1) {
      console.log(`   - Missing heartbeats (${heartbeatCount}/${expectedHeartbeats})`);
    }
    if (errorCount > 0) console.log(`   - ${errorCount} errors detected`);
    if (totalDuration < MONITOR_DURATION) {
      console.log(`   - Test ended prematurely (${totalSeconds}s/${MONITOR_DURATION / 1000}s)`);
    }
    eventSource.close();
    process.exit(1);
  }
}, MONITOR_DURATION);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n🛑 Monitoring stopped by user');
  eventSource.close();
  process.exit(0);
});
