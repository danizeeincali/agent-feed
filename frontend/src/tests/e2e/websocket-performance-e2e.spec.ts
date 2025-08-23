/**
 * WebSocket Performance E2E Tests
 * Comprehensive performance validation for WebSocket Hub functionality
 */

import { test, expect, Page } from '@playwright/test';
import { EnhancedWebSocketTestClient, LoadTestRunner, PerformanceMonitor } from './utils/websocket-test-helpers';
import { performance } from 'perf_hooks';

const PERFORMANCE_TEST_CONFIG = {
  HUB_URL: 'ws://localhost:8080',
  BACKEND_URL: 'http://localhost:3000',
  FRONTEND_URL: 'http://localhost:3001',
  
  // Performance thresholds
  THRESHOLDS: {
    CONNECTION_TIME: 2000,     // 2 seconds max
    MESSAGE_LATENCY: 1000,     // 1 second max
    THROUGHPUT_MIN: 10,        // 10 messages/sec minimum
    ERROR_RATE_MAX: 0.05,      // 5% maximum error rate
    MEMORY_LEAK_THRESHOLD: 100, // 100MB max memory increase
  },
  
  // Load test configurations
  LOAD_TESTS: {
    LIGHT: { clients: 5, messagesPerClient: 20, duration: 30000 },
    MEDIUM: { clients: 20, messagesPerClient: 50, duration: 60000 },
    HEAVY: { clients: 50, messagesPerClient: 100, duration: 120000 },
    STRESS: { clients: 100, messagesPerClient: 200, duration: 300000 }
  }
};

test.describe('WebSocket Performance E2E Tests', () => {
  let page: Page;
  let performanceMonitor: PerformanceMonitor;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    performanceMonitor = new PerformanceMonitor();
    
    await page.goto(PERFORMANCE_TEST_CONFIG.FRONTEND_URL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Connection Performance', () => {
    test('should establish connections within performance thresholds', async () => {
      const connectionTimes = [];
      const testCount = 10;

      for (let i = 0; i < testCount; i++) {
        const client = new EnhancedWebSocketTestClient(
          `${PERFORMANCE_TEST_CONFIG.HUB_URL}?test=${i}`
        );

        const endMeasure = performanceMonitor.startMeasurement('connection');
        
        try {
          await client.connect();
          const connectionTime = endMeasure();
          connectionTimes.push(connectionTime);
          
          console.log(`WEBSOCKET_METRICS: {"connectionTime": ${connectionTime}}`);
          
          client.disconnect();
        } catch (error) {
          console.error(`Connection ${i} failed:`, error);
        }
      }

      // Calculate statistics
      const avgConnectionTime = connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length;
      const maxConnectionTime = Math.max(...connectionTimes);
      const minConnectionTime = Math.min(...connectionTimes);

      console.log(`Connection Performance Results:`);
      console.log(`Average: ${avgConnectionTime.toFixed(2)}ms`);
      console.log(`Min: ${minConnectionTime.toFixed(2)}ms`);
      console.log(`Max: ${maxConnectionTime.toFixed(2)}ms`);

      // Performance assertions
      expect(avgConnectionTime).toBeLessThan(PERFORMANCE_TEST_CONFIG.THRESHOLDS.CONNECTION_TIME);
      expect(maxConnectionTime).toBeLessThan(PERFORMANCE_TEST_CONFIG.THRESHOLDS.CONNECTION_TIME * 1.5);
      expect(connectionTimes.length).toBe(testCount); // All connections should succeed
    });

    test('should handle concurrent connections efficiently', async () => {
      const concurrentConnections = 25;
      const clients: EnhancedWebSocketTestClient[] = [];
      const connectionPromises: Promise<number>[] = [];

      const startTime = performance.now();

      // Create concurrent connections
      for (let i = 0; i < concurrentConnections; i++) {
        const client = new EnhancedWebSocketTestClient(
          `${PERFORMANCE_TEST_CONFIG.HUB_URL}?concurrent=${i}`
        );
        clients.push(client);

        const connectionPromise = (async () => {
          const endMeasure = performanceMonitor.startMeasurement('concurrent_connection');
          await client.connect();
          return endMeasure();
        })();

        connectionPromises.push(connectionPromise);
      }

      // Wait for all connections
      const connectionTimes = await Promise.all(connectionPromises);
      const totalTime = performance.now() - startTime;

      console.log(`Concurrent Connection Results:`);
      console.log(`Total clients: ${concurrentConnections}`);
      console.log(`Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`Average per connection: ${(connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length).toFixed(2)}ms`);
      console.log(`Connections per second: ${(concurrentConnections / (totalTime / 1000)).toFixed(2)}`);

      console.log(`WEBSOCKET_METRICS: {"concurrentConnections": ${concurrentConnections}, "totalTime": ${totalTime}, "connectionsPerSecond": ${concurrentConnections / (totalTime / 1000)}}`);

      // Verify all connections are established
      const connectedCount = clients.filter(client => client.isConnected()).length;
      expect(connectedCount).toBe(concurrentConnections);

      // Clean up
      clients.forEach(client => client.disconnect());

      // Performance threshold
      expect(totalTime).toBeLessThan(concurrentConnections * 200); // Max 200ms per connection overhead
    });

    test('should maintain connection stability under load', async () => {
      const client = new EnhancedWebSocketTestClient(PERFORMANCE_TEST_CONFIG.HUB_URL, {
        autoReconnect: true,
        maxReconnectAttempts: 5,
        heartbeatInterval: 5000
      });

      await client.connect();
      expect(client.isConnected()).toBe(true);

      let disconnectionCount = 0;
      let reconnectionCount = 0;

      client.on('disconnected', () => {
        disconnectionCount++;
        console.log(`Disconnection #${disconnectionCount}`);
      });

      client.on('reconnected', () => {
        reconnectionCount++;
        console.log(`Reconnection #${reconnectionCount}`);
      });

      // Run stability test for 30 seconds
      const stabilityDuration = 30000;
      const startTime = Date.now();
      let messagesSent = 0;
      let messagesReceived = 0;

      client.on('messageSent', () => messagesSent++);
      client.on('messageReceived', () => messagesReceived++);

      // Send periodic messages
      const messageInterval = setInterval(async () => {
        if (client.isConnected()) {
          await client.send('stability_test', {
            timestamp: Date.now(),
            messageId: messagesSent
          });
        }
      }, 1000);

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, stabilityDuration));
      clearInterval(messageInterval);

      const actualDuration = Date.now() - startTime;
      const stability = ((actualDuration - (disconnectionCount * 5000)) / actualDuration) * 100;

      console.log(`Stability Test Results:`);
      console.log(`Duration: ${actualDuration}ms`);
      console.log(`Messages sent: ${messagesSent}`);
      console.log(`Messages received: ${messagesReceived}`);
      console.log(`Disconnections: ${disconnectionCount}`);
      console.log(`Reconnections: ${reconnectionCount}`);
      console.log(`Stability: ${stability.toFixed(2)}%`);

      console.log(`WEBSOCKET_METRICS: {"stability": ${stability}, "disconnections": ${disconnectionCount}, "reconnections": ${reconnectionCount}}`);

      // Stability assertions
      expect(stability).toBeGreaterThan(95); // 95% uptime minimum
      expect(disconnectionCount).toBeLessThanOrEqual(2); // Max 2 disconnections in 30 seconds

      client.disconnect();
    });
  });

  test.describe('Message Throughput and Latency', () => {
    test('should achieve minimum throughput requirements', async () => {
      const client = new EnhancedWebSocketTestClient(PERFORMANCE_TEST_CONFIG.HUB_URL);
      await client.connect();

      const testDuration = 30000; // 30 seconds
      const messageInterval = 100; // Send message every 100ms
      const startTime = performance.now();
      
      let messagesSent = 0;
      let messagesAcked = 0;
      const latencies: number[] = [];

      client.on('messageReceived', (message) => {
        if (message.type === 'throughput_ack') {
          messagesAcked++;
          const latency = Date.now() - message.data.originalTimestamp;
          latencies.push(latency);
        }
      });

      // Send messages at regular intervals
      const sendMessages = async () => {
        while (performance.now() - startTime < testDuration) {
          if (client.isConnected()) {
            await client.send('throughput_test', {
              messageId: messagesSent,
              originalTimestamp: Date.now()
            });
            messagesSent++;
          }
          await new Promise(resolve => setTimeout(resolve, messageInterval));
        }
      };

      await sendMessages();

      // Wait for final acknowledgments
      await new Promise(resolve => setTimeout(resolve, 2000));

      const actualDuration = performance.now() - startTime;
      const throughput = (messagesAcked / (actualDuration / 1000));
      const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

      console.log(`Throughput Test Results:`);
      console.log(`Messages sent: ${messagesSent}`);
      console.log(`Messages acknowledged: ${messagesAcked}`);
      console.log(`Throughput: ${throughput.toFixed(2)} msg/sec`);
      console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`95th percentile latency: ${p95Latency.toFixed(2)}ms`);
      console.log(`Max latency: ${maxLatency.toFixed(2)}ms`);

      console.log(`WEBSOCKET_METRICS: {"throughput": ${throughput}, "averageLatency": ${avgLatency}, "p95Latency": ${p95Latency}, "messageLatency": ${JSON.stringify(latencies)}}`);

      // Performance assertions
      expect(throughput).toBeGreaterThan(PERFORMANCE_TEST_CONFIG.THRESHOLDS.THROUGHPUT_MIN);
      expect(avgLatency).toBeLessThan(PERFORMANCE_TEST_CONFIG.THRESHOLDS.MESSAGE_LATENCY);
      expect(p95Latency).toBeLessThan(PERFORMANCE_TEST_CONFIG.THRESHOLDS.MESSAGE_LATENCY * 1.5);
      expect(messagesAcked / messagesSent).toBeGreaterThan(0.95); // 95% message success rate

      client.disconnect();
    });

    test('should handle message bursts efficiently', async () => {
      const client = new EnhancedWebSocketTestClient(PERFORMANCE_TEST_CONFIG.HUB_URL);
      await client.connect();

      const burstSize = 100;
      const burstCount = 5;
      const burstResults: any[] = [];

      for (let burst = 0; burst < burstCount; burst++) {
        const burstStart = performance.now();
        const burstPromises: Promise<void>[] = [];

        // Send burst of messages
        for (let i = 0; i < burstSize; i++) {
          burstPromises.push(
            client.send('burst_test', {
              burstId: burst,
              messageId: i,
              timestamp: Date.now()
            }, { expectResponse: true, timeout: 5000 })
              .then(() => {})
              .catch(error => console.error(`Burst ${burst}, Message ${i} failed:`, error))
          );
        }

        const results = await Promise.allSettled(burstPromises);
        const burstDuration = performance.now() - burstStart;
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        const burstThroughput = successCount / (burstDuration / 1000);

        burstResults.push({
          burstId: burst,
          duration: burstDuration,
          successCount,
          throughput: burstThroughput
        });

        console.log(`Burst ${burst}: ${successCount}/${burstSize} messages in ${burstDuration.toFixed(2)}ms (${burstThroughput.toFixed(2)} msg/sec)`);

        // Wait between bursts
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const avgThroughput = burstResults.reduce((sum, result) => sum + result.throughput, 0) / burstResults.length;
      const avgSuccessRate = burstResults.reduce((sum, result) => sum + (result.successCount / burstSize), 0) / burstResults.length;

      console.log(`Burst Test Summary:`);
      console.log(`Average throughput: ${avgThroughput.toFixed(2)} msg/sec`);
      console.log(`Average success rate: ${(avgSuccessRate * 100).toFixed(1)}%`);

      console.log(`WEBSOCKET_METRICS: {"burstThroughput": ${avgThroughput}, "burstSuccessRate": ${avgSuccessRate}}`);

      // Performance assertions
      expect(avgThroughput).toBeGreaterThan(PERFORMANCE_TEST_CONFIG.THRESHOLDS.THROUGHPUT_MIN * 2); // Burst should be faster
      expect(avgSuccessRate).toBeGreaterThan(0.9); // 90% success rate for bursts

      client.disconnect();
    });
  });

  test.describe('Load Testing', () => {
    test('should handle light load efficiently', async () => {
      const loadConfig = PERFORMANCE_TEST_CONFIG.LOAD_TESTS.LIGHT;
      const loadTestRunner = new LoadTestRunner();

      const results = await loadTestRunner.runLoadTest({
        url: PERFORMANCE_TEST_CONFIG.HUB_URL,
        clientCount: loadConfig.clients,
        messagesPerClient: loadConfig.messagesPerClient,
        messageType: 'load_test_light'
      });

      console.log('Light Load Test Results:', results);
      console.log(`WEBSOCKET_METRICS: ${JSON.stringify(results)}`);

      // Light load assertions
      expect(results.successfulMessages / results.totalMessages).toBeGreaterThan(0.98); // 98% success rate
      expect(results.errorRate).toBeLessThan(PERFORMANCE_TEST_CONFIG.THRESHOLDS.ERROR_RATE_MAX);
      expect(results.throughput).toBeGreaterThan(PERFORMANCE_TEST_CONFIG.THRESHOLDS.THROUGHPUT_MIN);
      expect(results.averageLatency).toBeLessThan(PERFORMANCE_TEST_CONFIG.THRESHOLDS.MESSAGE_LATENCY);
    });

    test('should handle medium load with acceptable performance', async () => {
      const loadConfig = PERFORMANCE_TEST_CONFIG.LOAD_TESTS.MEDIUM;
      const loadTestRunner = new LoadTestRunner();

      const results = await loadTestRunner.runLoadTest({
        url: PERFORMANCE_TEST_CONFIG.HUB_URL,
        clientCount: loadConfig.clients,
        messagesPerClient: loadConfig.messagesPerClient,
        messageType: 'load_test_medium'
      });

      console.log('Medium Load Test Results:', results);
      console.log(`WEBSOCKET_METRICS: ${JSON.stringify(results)}`);

      // Medium load assertions (slightly relaxed thresholds)
      expect(results.successfulMessages / results.totalMessages).toBeGreaterThan(0.95); // 95% success rate
      expect(results.errorRate).toBeLessThan(PERFORMANCE_TEST_CONFIG.THRESHOLDS.ERROR_RATE_MAX * 1.5);
      expect(results.throughput).toBeGreaterThan(PERFORMANCE_TEST_CONFIG.THRESHOLDS.THROUGHPUT_MIN * 0.8);
      expect(results.averageLatency).toBeLessThan(PERFORMANCE_TEST_CONFIG.THRESHOLDS.MESSAGE_LATENCY * 1.2);
    });

    test.skip('should handle heavy load gracefully', async () => {
      // Heavy load test - skip by default, enable for performance validation
      const loadConfig = PERFORMANCE_TEST_CONFIG.LOAD_TESTS.HEAVY;
      const loadTestRunner = new LoadTestRunner();

      const results = await loadTestRunner.runLoadTest({
        url: PERFORMANCE_TEST_CONFIG.HUB_URL,
        clientCount: loadConfig.clients,
        messagesPerClient: loadConfig.messagesPerClient,
        messageType: 'load_test_heavy'
      });

      console.log('Heavy Load Test Results:', results);
      console.log(`WEBSOCKET_METRICS: ${JSON.stringify(results)}`);

      // Heavy load assertions (more relaxed thresholds)
      expect(results.successfulMessages / results.totalMessages).toBeGreaterThan(0.9); // 90% success rate
      expect(results.errorRate).toBeLessThan(PERFORMANCE_TEST_CONFIG.THRESHOLDS.ERROR_RATE_MAX * 2);
      expect(results.throughput).toBeGreaterThan(PERFORMANCE_TEST_CONFIG.THRESHOLDS.THROUGHPUT_MIN * 0.5);
    });
  });

  test.describe('Memory and Resource Usage', () => {
    test('should not exhibit memory leaks during extended operation', async () => {
      const client = new EnhancedWebSocketTestClient(PERFORMANCE_TEST_CONFIG.HUB_URL);
      await client.connect();

      // Monitor browser memory
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null;
      });

      console.log('Initial memory:', initialMemory);

      // Send many messages over time
      const testDuration = 60000; // 1 minute
      const messageInterval = 500; // Every 500ms
      const startTime = Date.now();
      let messageCount = 0;

      const messageLoop = setInterval(async () => {
        if (Date.now() - startTime > testDuration) {
          clearInterval(messageLoop);
          return;
        }

        if (client.isConnected()) {
          await client.send('memory_test', {
            messageId: messageCount++,
            timestamp: Date.now(),
            data: 'x'.repeat(1000) // 1KB payload
          });
        }
      }, messageInterval);

      // Wait for test completion
      await new Promise(resolve => setTimeout(resolve, testDuration + 5000));

      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        } : null;
      });

      console.log('Final memory:', finalMemory);

      if (initialMemory && finalMemory) {
        const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100;

        console.log(`Memory usage results:`);
        console.log(`Messages sent: ${messageCount}`);
        console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Memory increase percentage: ${memoryIncreasePercent.toFixed(2)}%`);

        console.log(`WEBSOCKET_METRICS: {"memoryIncrease": ${memoryIncrease}, "memoryIncreasePercent": ${memoryIncreasePercent}, "messageCount": ${messageCount}}`);

        // Memory leak assertions
        expect(memoryIncrease).toBeLessThan(PERFORMANCE_TEST_CONFIG.THRESHOLDS.MEMORY_LEAK_THRESHOLD * 1024 * 1024); // 100MB max increase
        expect(memoryIncreasePercent).toBeLessThan(50); // 50% max increase
      }

      client.disconnect();
    });

    test('should efficiently manage WebSocket connections', async () => {
      const connectionCount = 10;
      const clients: EnhancedWebSocketTestClient[] = [];

      // Create multiple connections
      for (let i = 0; i < connectionCount; i++) {
        const client = new EnhancedWebSocketTestClient(`${PERFORMANCE_TEST_CONFIG.HUB_URL}?resource=${i}`);
        await client.connect();
        clients.push(client);
      }

      // Send messages from all clients
      const messagePromises = clients.map(async (client, index) => {
        const messages = [];
        for (let msgId = 0; msgId < 10; msgId++) {
          messages.push(
            client.send('resource_test', {
              clientId: index,
              messageId: msgId,
              timestamp: Date.now()
            })
          );
        }
        return Promise.all(messages);
      });

      await Promise.all(messagePromises);

      // Check resource usage
      const resourceStats = clients.map(client => ({
        connected: client.isConnected(),
        stats: client.getConnectionStats(),
        metrics: client.getPerformanceMetrics()
      }));

      console.log('Resource management results:', {
        totalConnections: connectionCount,
        activeConnections: resourceStats.filter(stat => stat.connected).length,
        totalMessagesSent: resourceStats.reduce((sum, stat) => sum + stat.stats.messagesSent, 0),
        totalMessagesReceived: resourceStats.reduce((sum, stat) => sum + stat.stats.messagesReceived, 0)
      });

      // Verify all connections are active
      expect(resourceStats.every(stat => stat.connected)).toBe(true);

      // Clean up
      clients.forEach(client => client.disconnect());

      // Verify cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      expect(clients.every(client => !client.isConnected())).toBe(true);
    });
  });

  test.describe('Browser Performance Integration', () => {
    test('should maintain UI responsiveness during WebSocket activity', async () => {
      // Create WebSocket connection in browser
      await page.evaluate(async () => {
        const ws = new WebSocket('ws://localhost:8080');
        await new Promise((resolve, reject) => {
          ws.onopen = resolve;
          ws.onerror = reject;
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });
        (window as any).testWebSocket = ws;
      });

      // Measure UI responsiveness
      const responsivenessBefore = await page.evaluate(() => {
        const start = performance.now();
        // Simulate UI work
        for (let i = 0; i < 100000; i++) {
          document.createElement('div');
        }
        return performance.now() - start;
      });

      // Send many WebSocket messages
      await page.evaluate(() => {
        const ws = (window as any).testWebSocket;
        for (let i = 0; i < 100; i++) {
          ws.send(JSON.stringify({
            type: 'ui_performance_test',
            messageId: i,
            timestamp: Date.now()
          }));
        }
      });

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Measure UI responsiveness after
      const responsivenessAfter = await page.evaluate(() => {
        const start = performance.now();
        // Simulate UI work
        for (let i = 0; i < 100000; i++) {
          document.createElement('div');
        }
        return performance.now() - start;
      });

      const responsivenessDiff = responsivenessAfter - responsivenessBefore;
      console.log(`UI Responsiveness:`);
      console.log(`Before: ${responsivenessBefore.toFixed(2)}ms`);
      console.log(`After: ${responsivenessAfter.toFixed(2)}ms`);
      console.log(`Difference: ${responsivenessDiff.toFixed(2)}ms`);

      console.log(`WEBSOCKET_METRICS: {"uiResponsivenessBefore": ${responsivenessBefore}, "uiResponsivenessAfter": ${responsivenessAfter}}`);

      // UI should remain responsive (difference should be minimal)
      expect(Math.abs(responsivenessDiff)).toBeLessThan(50); // Less than 50ms difference

      // Clean up
      await page.evaluate(() => {
        if ((window as any).testWebSocket) {
          (window as any).testWebSocket.close();
        }
      });
    });
  });
});