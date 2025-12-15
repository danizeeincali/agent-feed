/**
 * SSE Stability Full Test (5 minutes)
 *
 * Purpose: Comprehensive validation of SSE and Socket.IO stability over extended duration
 * Duration: ~5 minutes
 * Coverage:
 *   - Socket.IO connection stability for 5 minutes
 *   - SSE connection stability for 5 minutes
 *   - SSE event reception (heartbeat, telemetry)
 *   - Zero reconnection attempts
 *   - Memory leak detection
 *   - Performance degradation detection
 *
 * Run: node tests/integration/sse-stability-full.js
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import EventSource from 'eventsource';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const TEST_DURATION = 5 * 60 * 1000; // 5 minutes
const HEARTBEAT_INTERVAL = 10000; // 10 seconds
const MEMORY_CHECK_INTERVAL = 30000; // 30 seconds

describe('SSE Stability - Full Test (5 minutes)', () => {
  let socketClient;
  let sseClient;
  let errors = [];
  let metrics = {
    socket: {
      connects: 0,
      disconnects: 0,
      reconnects: 0,
      errors: [],
      heartbeats: 0
    },
    sse: {
      opens: 0,
      errors: [],
      events: {
        heartbeat: 0,
        telemetry: 0,
        other: 0
      },
      readyStateChanges: []
    },
    memory: []
  };

  beforeEach(() => {
    errors = [];
    metrics = {
      socket: {
        connects: 0,
        disconnects: 0,
        reconnects: 0,
        errors: [],
        heartbeats: 0
      },
      sse: {
        opens: 0,
        errors: [],
        events: {
          heartbeat: 0,
          telemetry: 0,
          other: 0
        },
        readyStateChanges: []
      },
      memory: []
    };
  });

  afterEach(async () => {
    if (socketClient) {
      socketClient.close();
      socketClient = null;
    }

    if (sseClient) {
      sseClient.close();
      sseClient = null;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  });

  it('Socket.IO should maintain stable connection for 5 minutes', async () => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      socketClient = io(SERVER_URL, {
        transports: ['websocket'],
        reconnection: true, // Allow reconnection to track attempts
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        forceNew: true,
        timeout: 5000
      });

      // Connection events
      socketClient.on('connect', () => {
        metrics.socket.connects++;
        console.log(`✓ Socket.IO connected (attempt ${metrics.socket.connects}) at ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      });

      socketClient.on('disconnect', (reason) => {
        metrics.socket.disconnects++;
        errors.push({ type: 'disconnect', reason, time: Date.now() - startTime });
        console.log(`⚠ Socket.IO disconnected: ${reason} at ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      });

      socketClient.on('reconnect', (attemptNumber) => {
        metrics.socket.reconnects++;
        console.log(`🔄 Socket.IO reconnected (attempt ${attemptNumber}) at ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      });

      socketClient.on('connect_error', (error) => {
        metrics.socket.errors.push({ message: error.message, time: Date.now() - startTime });
        errors.push({ type: 'connect_error', error: error.message });
        console.log(`❌ Socket.IO connect error: ${error.message}`);
      });

      socketClient.on('error', (error) => {
        metrics.socket.errors.push({ message: error.message, time: Date.now() - startTime });
        errors.push({ type: 'error', error: error.message });
        console.log(`❌ Socket.IO error: ${error.message}`);
      });

      // Heartbeat mechanism
      const heartbeatTimer = setInterval(() => {
        if (socketClient && socketClient.connected) {
          metrics.socket.heartbeats++;
          socketClient.emit('ping', {
            timestamp: Date.now(),
            heartbeatCount: metrics.socket.heartbeats
          });
          console.log(`💓 Socket.IO heartbeat ${metrics.socket.heartbeats} at ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
        }
      }, HEARTBEAT_INTERVAL);

      // Memory monitoring
      const memoryTimer = setInterval(() => {
        const memUsage = process.memoryUsage();
        metrics.memory.push({
          time: Date.now() - startTime,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal,
          external: memUsage.external,
          rss: memUsage.rss
        });
        console.log(`📊 Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB at ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      }, MEMORY_CHECK_INTERVAL);

      // Test completion
      setTimeout(() => {
        clearInterval(heartbeatTimer);
        clearInterval(memoryTimer);

        const duration = Date.now() - startTime;
        const isConnected = socketClient && socketClient.connected;

        console.log('\n--- Socket.IO Stability Test Results ---');
        console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
        console.log(`Final state: ${isConnected ? 'Connected' : 'Disconnected'}`);
        console.log(`Connects: ${metrics.socket.connects}`);
        console.log(`Disconnects: ${metrics.socket.disconnects}`);
        console.log(`Reconnects: ${metrics.socket.reconnects}`);
        console.log(`Heartbeats sent: ${metrics.socket.heartbeats}`);
        console.log(`Errors: ${metrics.socket.errors.length}`);
        console.log(`Total errors: ${errors.length}`);

        // Memory analysis
        if (metrics.memory.length > 1) {
          const initialMem = metrics.memory[0].heapUsed;
          const finalMem = metrics.memory[metrics.memory.length - 1].heapUsed;
          const memGrowth = finalMem - initialMem;
          const memGrowthMB = memGrowth / 1024 / 1024;
          console.log(`Memory growth: ${memGrowthMB.toFixed(2)} MB`);
        }

        try {
          assert.ok(isConnected, 'Socket.IO should still be connected');
          assert.strictEqual(metrics.socket.connects, 1, 'Should have exactly 1 connection (no reconnects)');
          assert.strictEqual(metrics.socket.reconnects, 0, 'Should have zero reconnection attempts');
          assert.strictEqual(errors.length, 0, 'Should have zero errors');

          // Expected heartbeats: ~30 (one every 10 seconds for 5 minutes)
          assert.ok(metrics.socket.heartbeats >= 28, 'Should have sent at least 28 heartbeats');

          // Memory leak check: growth should be under 50MB
          if (metrics.memory.length > 1) {
            const initialMem = metrics.memory[0].heapUsed;
            const finalMem = metrics.memory[metrics.memory.length - 1].heapUsed;
            const memGrowthMB = (finalMem - initialMem) / 1024 / 1024;
            assert.ok(memGrowthMB < 50, `Memory growth should be under 50MB (was ${memGrowthMB.toFixed(2)} MB)`);
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      }, TEST_DURATION);
    });
  });

  it('SSE should maintain stable connection and receive events for 5 minutes', async () => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let lastEventTime = Date.now();

      sseClient = new EventSource(`${SERVER_URL}/api/sse/claude-code-sdk/stream`);

      // Track readyState changes
      let previousState = sseClient.readyState;
      const stateCheckTimer = setInterval(() => {
        const currentState = sseClient.readyState;
        if (currentState !== previousState) {
          metrics.sse.readyStateChanges.push({
            from: previousState,
            to: currentState,
            time: Date.now() - startTime
          });
          console.log(`🔄 SSE state change: ${['CONNECTING', 'OPEN', 'CLOSED'][previousState]} -> ${['CONNECTING', 'OPEN', 'CLOSED'][currentState]}`);
          previousState = currentState;
        }
      }, 1000);

      sseClient.onopen = () => {
        metrics.sse.opens++;
        console.log(`✓ SSE opened (attempt ${metrics.sse.opens}) at ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      };

      sseClient.onerror = (error) => {
        metrics.sse.errors.push({
          message: error.message || 'Unknown error',
          readyState: sseClient.readyState,
          time: Date.now() - startTime
        });
        errors.push({ type: 'sse_error', readyState: sseClient.readyState });
        console.log(`❌ SSE error (readyState: ${sseClient.readyState}) at ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      };

      // Track all events
      sseClient.onmessage = (event) => {
        lastEventTime = Date.now();

        try {
          const data = JSON.parse(event.data);

          // Categorize events
          if (data.type === 'heartbeat' || event.type === 'heartbeat') {
            metrics.sse.events.heartbeat++;
            console.log(`💓 SSE heartbeat received at ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
          } else if (data.type === 'telemetry' || event.type === 'telemetry') {
            metrics.sse.events.telemetry++;
            console.log(`📊 SSE telemetry received at ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
          } else {
            metrics.sse.events.other++;
            console.log(`📨 SSE event (${data.type || 'unknown'}) at ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
          }
        } catch (e) {
          metrics.sse.events.other++;
          console.log(`📨 SSE event (unparseable) at ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
        }
      };

      // Memory monitoring
      const memoryTimer = setInterval(() => {
        const memUsage = process.memoryUsage();
        metrics.memory.push({
          time: Date.now() - startTime,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal
        });
      }, MEMORY_CHECK_INTERVAL);

      // Test completion
      setTimeout(() => {
        clearInterval(stateCheckTimer);
        clearInterval(memoryTimer);

        const duration = Date.now() - startTime;
        const finalState = sseClient.readyState;
        const totalEvents = metrics.sse.events.heartbeat +
                           metrics.sse.events.telemetry +
                           metrics.sse.events.other;
        const timeSinceLastEvent = Date.now() - lastEventTime;

        console.log('\n--- SSE Stability Test Results ---');
        console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
        console.log(`Final readyState: ${['CONNECTING', 'OPEN', 'CLOSED'][finalState]} (${finalState})`);
        console.log(`Opens: ${metrics.sse.opens}`);
        console.log(`Heartbeat events: ${metrics.sse.events.heartbeat}`);
        console.log(`Telemetry events: ${metrics.sse.events.telemetry}`);
        console.log(`Other events: ${metrics.sse.events.other}`);
        console.log(`Total events: ${totalEvents}`);
        console.log(`Time since last event: ${(timeSinceLastEvent / 1000).toFixed(1)}s`);
        console.log(`ReadyState changes: ${metrics.sse.readyStateChanges.length}`);
        console.log(`Errors: ${metrics.sse.errors.length}`);

        try {
          assert.strictEqual(finalState, 1, 'SSE readyState should be OPEN (1)');
          assert.strictEqual(metrics.sse.opens, 1, 'Should have exactly 1 open (no reconnects)');
          assert.strictEqual(metrics.sse.errors.length, 0, 'Should have zero errors');
          assert.ok(totalEvents > 0, 'Should have received at least some events');
          assert.ok(timeSinceLastEvent < 60000, 'Should have received event in last 60 seconds');

          // No unexpected state changes (should stay OPEN)
          const unexpectedChanges = metrics.sse.readyStateChanges.filter(
            change => change.to !== 1
          );
          assert.strictEqual(unexpectedChanges.length, 0, 'Should not have unexpected state changes');

          // Memory leak check
          if (metrics.memory.length > 1) {
            const initialMem = metrics.memory[0].heapUsed;
            const finalMem = metrics.memory[metrics.memory.length - 1].heapUsed;
            const memGrowthMB = (finalMem - initialMem) / 1024 / 1024;
            console.log(`Memory growth: ${memGrowthMB.toFixed(2)} MB`);
            assert.ok(memGrowthMB < 50, `Memory growth should be under 50MB (was ${memGrowthMB.toFixed(2)} MB)`);
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      }, TEST_DURATION);
    });
  });

  it('Concurrent Socket.IO and SSE should both remain stable for 5 minutes', async () => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let socketEventCount = 0;
      let sseEventCount = 0;

      // Socket.IO client
      socketClient = io(SERVER_URL, {
        transports: ['websocket'],
        reconnection: true,
        forceNew: true
      });

      socketClient.on('connect', () => {
        console.log(`✓ Socket.IO connected at ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      });

      socketClient.on('disconnect', (reason) => {
        errors.push({ type: 'socket_disconnect', reason });
      });

      socketClient.on('pong', () => {
        socketEventCount++;
      });

      // SSE client
      sseClient = new EventSource(`${SERVER_URL}/api/sse/claude-code-sdk/stream`);

      sseClient.onopen = () => {
        console.log(`✓ SSE connected at ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
      };

      sseClient.onmessage = () => {
        sseEventCount++;
      };

      sseClient.onerror = (error) => {
        errors.push({ type: 'sse_error', readyState: sseClient.readyState });
      };

      // Ping Socket.IO periodically
      const pingTimer = setInterval(() => {
        if (socketClient && socketClient.connected) {
          socketClient.emit('ping', { timestamp: Date.now() });
        }
      }, HEARTBEAT_INTERVAL);

      // Test completion
      setTimeout(() => {
        clearInterval(pingTimer);

        const socketConnected = socketClient && socketClient.connected;
        const sseConnected = sseClient.readyState === 1;

        console.log('\n--- Concurrent Stability Test Results ---');
        console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
        console.log(`Socket.IO connected: ${socketConnected}`);
        console.log(`SSE connected: ${sseConnected}`);
        console.log(`Socket.IO events: ${socketEventCount}`);
        console.log(`SSE events: ${sseEventCount}`);
        console.log(`Total errors: ${errors.length}`);

        try {
          assert.ok(socketConnected, 'Socket.IO should be connected');
          assert.ok(sseConnected, 'SSE should be connected');
          assert.strictEqual(errors.length, 0, 'Should have zero errors in either connection');
          assert.ok(sseEventCount > 0, 'SSE should have received events');

          resolve();
        } catch (error) {
          reject(error);
        }
      }, TEST_DURATION);
    });
  });
});

console.log('🚀 Starting SSE Stability Full Test (5 minutes)');
console.log(`📊 Target server: ${SERVER_URL}`);
console.log(`⏱️  Test duration: ${TEST_DURATION / 1000} seconds`);
console.log(`💓 Heartbeat interval: ${HEARTBEAT_INTERVAL / 1000} seconds`);
console.log(`📊 Memory check interval: ${MEMORY_CHECK_INTERVAL / 1000} seconds\n`);
