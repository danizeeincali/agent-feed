/**
 * SSE Stability Quick Validation Test (30 seconds)
 *
 * Purpose: Fast validation of SSE and Socket.IO connection stability
 * Duration: ~30 seconds
 * Coverage:
 *   - Socket.IO direct connection (no proxy)
 *   - Connection stability for 30 seconds
 *   - Zero "socket hang up" errors
 *   - SSE connection stability
 *   - EventSource readyState validation
 *
 * Run: node tests/integration/sse-stability-quick.js
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import EventSource from 'eventsource';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';
const TEST_DURATION = 30000; // 30 seconds
const HEARTBEAT_INTERVAL = 5000; // 5 seconds

describe('SSE Stability - Quick Validation', () => {
  let socketClient;
  let sseClient;
  let errors = [];
  let connectionEvents = [];

  beforeEach(() => {
    errors = [];
    connectionEvents = [];
  });

  afterEach(async () => {
    // Clean up Socket.IO client
    if (socketClient) {
      socketClient.close();
      socketClient = null;
    }

    // Clean up SSE client
    if (sseClient) {
      sseClient.close();
      sseClient = null;
    }

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  it('Socket.IO direct connection should stay open for 30 seconds with zero errors', async () => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let heartbeatCount = 0;

      // Create Socket.IO client with direct connection (no proxy)
      socketClient = io(SERVER_URL, {
        transports: ['websocket'], // Force WebSocket (no polling)
        reconnection: false, // Disable reconnection for this test
        forceNew: true,
        timeout: 5000
      });

      // Track connection events
      socketClient.on('connect', () => {
        connectionEvents.push({ event: 'connect', time: Date.now() - startTime });
        console.log('✓ Socket.IO connected');
      });

      socketClient.on('disconnect', (reason) => {
        connectionEvents.push({ event: 'disconnect', reason, time: Date.now() - startTime });
        errors.push({ type: 'disconnect', reason });
      });

      socketClient.on('connect_error', (error) => {
        connectionEvents.push({ event: 'connect_error', error: error.message, time: Date.now() - startTime });
        errors.push({ type: 'connect_error', error: error.message });
      });

      socketClient.on('error', (error) => {
        connectionEvents.push({ event: 'error', error: error.message, time: Date.now() - startTime });
        errors.push({ type: 'error', error: error.message });
      });

      // Set up heartbeat
      const heartbeatTimer = setInterval(() => {
        if (socketClient && socketClient.connected) {
          heartbeatCount++;
          socketClient.emit('ping', { timestamp: Date.now() });
          console.log(`  Heartbeat ${heartbeatCount} sent (${(Date.now() - startTime) / 1000}s)`);
        }
      }, HEARTBEAT_INTERVAL);

      // Test duration timer
      const testTimer = setTimeout(() => {
        clearInterval(heartbeatTimer);

        const duration = Date.now() - startTime;
        const isConnected = socketClient && socketClient.connected;

        console.log('\n--- Socket.IO Test Results ---');
        console.log(`Duration: ${duration}ms`);
        console.log(`Connected: ${isConnected}`);
        console.log(`Heartbeats sent: ${heartbeatCount}`);
        console.log(`Errors: ${errors.length}`);
        console.log(`Connection events:`, connectionEvents);

        // Assertions
        try {
          assert.ok(isConnected, 'Socket.IO should still be connected');
          assert.strictEqual(errors.length, 0, 'Should have zero errors');
          assert.ok(duration >= TEST_DURATION - 1000, 'Should run for full duration');

          // Check for "socket hang up" errors
          const hangUpErrors = errors.filter(e =>
            e.error && e.error.includes('socket hang up')
          );
          assert.strictEqual(hangUpErrors.length, 0, 'Should have zero "socket hang up" errors');

          resolve();
        } catch (error) {
          reject(error);
        }
      }, TEST_DURATION);

      // Handle initial connection failure
      const connectionTimeout = setTimeout(() => {
        if (!socketClient || !socketClient.connected) {
          clearInterval(heartbeatTimer);
          clearTimeout(testTimer);
          reject(new Error('Failed to establish Socket.IO connection within timeout'));
        }
      }, 5000);

      socketClient.on('connect', () => {
        clearTimeout(connectionTimeout);
      });
    });
  });

  it('SSE connection should stay open for 30 seconds with readyState = OPEN', async () => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let eventCount = 0;
      let readyStateChecks = [];

      // Create SSE client
      sseClient = new EventSource(`${SERVER_URL}/api/sse/claude-code-sdk/stream`, {
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });

      // Track connection events
      sseClient.onopen = () => {
        connectionEvents.push({ event: 'open', time: Date.now() - startTime });
        console.log('✓ SSE connection opened');
      };

      sseClient.onerror = (error) => {
        connectionEvents.push({
          event: 'error',
          readyState: sseClient.readyState,
          time: Date.now() - startTime
        });
        errors.push({
          type: 'sse_error',
          readyState: sseClient.readyState,
          error: error.message
        });
      };

      sseClient.onmessage = (event) => {
        eventCount++;
        console.log(`  SSE event received: ${eventCount} (${(Date.now() - startTime) / 1000}s)`);
      };

      // Check readyState every 5 seconds
      const readyStateTimer = setInterval(() => {
        const state = sseClient.readyState;
        readyStateChecks.push({
          time: Date.now() - startTime,
          state,
          stateName: ['CONNECTING', 'OPEN', 'CLOSED'][state]
        });
        console.log(`  SSE readyState: ${['CONNECTING', 'OPEN', 'CLOSED'][state]} (${state})`);
      }, HEARTBEAT_INTERVAL);

      // Test duration timer
      const testTimer = setTimeout(() => {
        clearInterval(readyStateTimer);

        const duration = Date.now() - startTime;
        const finalState = sseClient.readyState;

        console.log('\n--- SSE Test Results ---');
        console.log(`Duration: ${duration}ms`);
        console.log(`Final readyState: ${['CONNECTING', 'OPEN', 'CLOSED'][finalState]} (${finalState})`);
        console.log(`Events received: ${eventCount}`);
        console.log(`Errors: ${errors.length}`);
        console.log(`ReadyState checks:`, readyStateChecks);

        // Assertions
        try {
          assert.strictEqual(finalState, 1, 'SSE readyState should be OPEN (1)');
          assert.strictEqual(errors.length, 0, 'Should have zero errors');
          assert.ok(duration >= TEST_DURATION - 1000, 'Should run for full duration');

          // All readyState checks should be OPEN (except possibly the first)
          const openStates = readyStateChecks.filter(check => check.state === 1);
          assert.ok(openStates.length >= readyStateChecks.length - 1,
            'SSE should maintain OPEN state throughout test');

          resolve();
        } catch (error) {
          reject(error);
        }
      }, TEST_DURATION);

      // Handle initial connection failure
      const connectionTimeout = setTimeout(() => {
        if (sseClient.readyState !== 1) {
          clearInterval(readyStateTimer);
          clearTimeout(testTimer);
          reject(new Error('Failed to establish SSE connection within timeout'));
        }
      }, 5000);

      sseClient.onopen = () => {
        clearTimeout(connectionTimeout);
        connectionEvents.push({ event: 'open', time: Date.now() - startTime });
        console.log('✓ SSE connection opened');
      };
    });
  });

  it('Both Socket.IO and SSE should run concurrently without interference', async () => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let socketConnected = false;
      let sseConnected = false;
      let socketErrors = [];
      let sseErrors = [];

      // Create Socket.IO client
      socketClient = io(SERVER_URL, {
        transports: ['websocket'],
        reconnection: false,
        forceNew: true
      });

      socketClient.on('connect', () => {
        socketConnected = true;
        console.log('✓ Socket.IO connected (concurrent test)');
      });

      socketClient.on('error', (error) => {
        socketErrors.push(error.message);
      });

      socketClient.on('disconnect', () => {
        socketConnected = false;
      });

      // Create SSE client
      sseClient = new EventSource(`${SERVER_URL}/api/sse/claude-code-sdk/stream`);

      sseClient.onopen = () => {
        sseConnected = true;
        console.log('✓ SSE connected (concurrent test)');
      };

      sseClient.onerror = (error) => {
        sseErrors.push(error.message || 'SSE error');
      };

      // Test for 30 seconds
      setTimeout(() => {
        const duration = Date.now() - startTime;

        console.log('\n--- Concurrent Connection Test Results ---');
        console.log(`Duration: ${duration}ms`);
        console.log(`Socket.IO connected: ${socketConnected}`);
        console.log(`SSE connected: ${sseConnected && sseClient.readyState === 1}`);
        console.log(`Socket.IO errors: ${socketErrors.length}`);
        console.log(`SSE errors: ${sseErrors.length}`);

        try {
          assert.ok(socketConnected, 'Socket.IO should be connected');
          assert.ok(sseConnected && sseClient.readyState === 1, 'SSE should be connected');
          assert.strictEqual(socketErrors.length, 0, 'Socket.IO should have zero errors');
          assert.strictEqual(sseErrors.length, 0, 'SSE should have zero errors');

          resolve();
        } catch (error) {
          reject(error);
        }
      }, TEST_DURATION);
    });
  });
});

console.log('🚀 Starting SSE Stability Quick Validation Test');
console.log(`📊 Target server: ${SERVER_URL}`);
console.log(`⏱️  Test duration: ${TEST_DURATION / 1000} seconds\n`);
