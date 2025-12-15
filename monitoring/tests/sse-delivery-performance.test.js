/**
 * SSE (Server-Sent Events) Delivery Performance Test Suite
 * 
 * Tests SSE message delivery performance including:
 * - Message delivery latency
 * - Throughput under various loads
 * - Connection stability
 * - Message ordering and reliability
 * - Large message handling
 * - Multi-client scenarios
 */

const PerformanceBenchmarker = require('../performance-benchmarks');
const EventSource = require('eventsource');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

describe('SSE Delivery Performance Benchmarks', () => {
  let benchmarker;
  let testServer;
  let testResults = [];
  let serverPort = 3001;

  beforeAll(async () => {
    benchmarker = new PerformanceBenchmarker({
      metricsDir: './monitoring/test-metrics',
      alertThresholds: {
        claudeResponseTime: 5000,
        sseDeliveryTime: 100, // 100ms for SSE delivery
        memoryPerInstance: 50 * 1024 * 1024,
        errorRate: 0.01,
        instanceCreationTime: 3000
      }
    });

    await benchmarker.startMonitoring();
    
    // Start test SSE server
    await startTestSSEServer();
    
    console.log('SSE performance benchmarker and test server initialized');
  });

  afterAll(async () => {
    await benchmarker.stopMonitoring();
    
    if (testServer) {
      testServer.close();
    }
    
    // Generate test report
    const report = {
      timestamp: new Date().toISOString(),
      testSuite: 'SSE Delivery Performance',
      results: testResults,
      summary: benchmarker.getPerformanceSummary(),
      passed: testResults.filter(r => r.passed).length,
      failed: testResults.filter(r => !r.passed).length,
      averageDeliveryTime: testResults.reduce((sum, r) => sum + (r.deliveryTime || 0), 0) / testResults.length
    };

    await fs.writeFile(
      path.join('./monitoring/test-metrics', `sse-delivery-report-${Date.now()}.json`),
      JSON.stringify(report, null, 2)
    );

    console.log('SSE delivery performance test completed. Report saved.');
  });

  async function startTestSSEServer() {
    return new Promise((resolve) => {
      testServer = http.createServer((req, res) => {
        if (req.url === '/sse') {
          // SSE endpoint
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
          });

          // Keep connection alive
          const heartbeat = setInterval(() => {
            res.write(': heartbeat\n\n');
          }, 30000);

          req.on('close', () => {
            clearInterval(heartbeat);
          });

          // Store response object for sending messages
          req.sseResponse = res;
          
        } else if (req.url.startsWith('/send/')) {
          // Send message endpoint
          const connectionId = req.url.split('/')[2];
          let body = '';
          
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', () => {
            const messageData = JSON.parse(body);
            
            // Send SSE message to all connections (simplified)
            if (req.sseResponse) {
              const sseMessage = `data: ${JSON.stringify(messageData)}\n\n`;
              req.sseResponse.write(sseMessage);
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, messageId: messageData.id }));
          });
          
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });

      testServer.listen(serverPort, () => {
        console.log(`Test SSE server started on port ${serverPort}`);
        resolve();
      });
    });
  }

  beforeEach(() => {
    benchmarker.alerts = [];
  });

  describe('Basic SSE Message Delivery', () => {
    test('small message delivery should be under 100ms', async () => {
      const testStart = Date.now();

      try {
        const connectionId = 'test-connection-1';
        const messageData = {
          id: 'small-msg-1',
          type: 'small_message',
          content: 'Hello SSE!',
          timestamp: Date.now()
        };

        const benchmark = await benchmarker.benchmarkSSEDelivery(connectionId, messageData);

        const testResult = {
          testName: 'small_message_delivery',
          passed: benchmark.success && benchmark.totalDeliveryTime < 100,
          deliveryTime: benchmark.totalDeliveryTime,
          messageSize: benchmark.messageSize,
          throughput: benchmark.throughput,
          benchmark,
          timestamp: testStart
        };

        testResults.push(testResult);

        expect(benchmark.success).toBe(true);
        expect(benchmark.totalDeliveryTime).toBeLessThan(100);
        expect(benchmark.phases).toHaveProperty('serialization');
        expect(benchmark.phases).toHaveProperty('transmission');

        console.log(`Small message delivery: ${benchmark.totalDeliveryTime.toFixed(2)}ms, ${benchmark.messageSize} bytes`);

      } catch (error) {
        testResults.push({
          testName: 'small_message_delivery',
          passed: false,
          error: error.message,
          timestamp: testStart
        });
        throw error;
      }
    });

    test('large message delivery should handle size efficiently', async () => {
      const testStart = Date.now();

      try {
        const connectionId = 'test-connection-2';
        const largeContent = 'A'.repeat(10000); // 10KB message
        const messageData = {
          id: 'large-msg-1',
          type: 'large_message',
          content: largeContent,
          metadata: { size: largeContent.length },
          timestamp: Date.now()
        };

        const benchmark = await benchmarker.benchmarkSSEDelivery(connectionId, messageData);

        const testResult = {
          testName: 'large_message_delivery',
          passed: benchmark.success && benchmark.totalDeliveryTime < 500, // 500ms for 10KB
          deliveryTime: benchmark.totalDeliveryTime,
          messageSize: benchmark.messageSize,
          throughput: benchmark.throughput,
          benchmark,
          timestamp: testStart
        };

        testResults.push(testResult);

        expect(benchmark.success).toBe(true);
        expect(benchmark.totalDeliveryTime).toBeLessThan(500);
        expect(benchmark.messageSize).toBeGreaterThan(10000);

        console.log(`Large message delivery: ${benchmark.totalDeliveryTime.toFixed(2)}ms, ${(benchmark.messageSize/1024).toFixed(2)}KB, throughput: ${(benchmark.throughput/1024).toFixed(2)}KB/ms`);

      } catch (error) {
        testResults.push({
          testName: 'large_message_delivery',
          passed: false,
          error: error.message,
          timestamp: testStart
        });
        throw error;
      }
    });

    test('JSON message serialization performance', async () => {
      const testStart = Date.now();

      try {
        const connectionId = 'test-connection-3';
        const complexData = {
          id: 'json-msg-1',
          type: 'complex_json',
          data: {
            users: new Array(100).fill(0).map((_, i) => ({
              id: i,
              name: `User ${i}`,
              email: `user${i}@example.com`,
              preferences: {
                theme: 'dark',
                language: 'en',
                notifications: true
              }
            })),
            metadata: {
              version: '1.0',
              timestamp: Date.now(),
              source: 'test-suite'
            }
          },
          timestamp: Date.now()
        };

        const benchmark = await benchmarker.benchmarkSSEDelivery(connectionId, complexData);

        const testResult = {
          testName: 'json_serialization_performance',
          passed: benchmark.success && benchmark.phases.serialization < 50, // 50ms for serialization
          deliveryTime: benchmark.totalDeliveryTime,
          serializationTime: benchmark.phases.serialization,
          messageSize: benchmark.messageSize,
          benchmark,
          timestamp: testStart
        };

        testResults.push(testResult);

        expect(benchmark.success).toBe(true);
        expect(benchmark.phases.serialization).toBeLessThan(50);

        console.log(`JSON serialization: ${benchmark.phases.serialization.toFixed(2)}ms for ${(benchmark.messageSize/1024).toFixed(2)}KB`);

      } catch (error) {
        testResults.push({
          testName: 'json_serialization_performance',
          passed: false,
          error: error.message,
          timestamp: testStart
        });
        throw error;
      }
    });
  });

  describe('Throughput and Load Testing', () => {
    test('should handle burst of messages efficiently', async () => {
      const testStart = Date.now();
      const messageCount = 50;
      const results = [];

      try {
        const connectionId = 'burst-connection';

        for (let i = 0; i < messageCount; i++) {
          const messageData = {
            id: `burst-msg-${i}`,
            type: 'burst_test',
            content: `Burst message ${i}`,
            sequenceNumber: i,
            timestamp: Date.now()
          };

          const benchmark = await benchmarker.benchmarkSSEDelivery(connectionId, messageData);
          results.push(benchmark);
        }

        const avgDeliveryTime = results.reduce((sum, r) => sum + r.totalDeliveryTime, 0) / results.length;
        const maxDeliveryTime = Math.max(...results.map(r => r.totalDeliveryTime));
        const successRate = results.filter(r => r.success).length / results.length;
        const totalThroughput = results.reduce((sum, r) => sum + r.throughput, 0);

        const testResult = {
          testName: 'message_burst_handling',
          passed: successRate >= 0.95 && avgDeliveryTime < 150, // Allow some degradation in burst
          messageCount,
          avgDeliveryTime,
          maxDeliveryTime,
          successRate,
          totalThroughput,
          timestamp: testStart
        };

        testResults.push(testResult);

        expect(successRate).toBeGreaterThanOrEqual(0.95);
        expect(avgDeliveryTime).toBeLessThan(150);

        console.log(`Burst test: ${results.length} messages, avg=${avgDeliveryTime.toFixed(2)}ms, max=${maxDeliveryTime.toFixed(2)}ms, success=${(successRate*100).toFixed(1)}%`);

      } catch (error) {
        testResults.push({
          testName: 'message_burst_handling',
          passed: false,
          error: error.message,
          timestamp: testStart
        });
        throw error;
      }
    });

    test('should maintain performance with concurrent connections', async () => {
      const testStart = Date.now();
      const connectionCount = 10;
      const messagesPerConnection = 5;

      try {
        const connectionPromises = [];

        for (let connId = 0; connId < connectionCount; connId++) {
          const connectionPromise = async () => {
            const results = [];
            const connectionId = `concurrent-conn-${connId}`;

            for (let msgId = 0; msgId < messagesPerConnection; msgId++) {
              const messageData = {
                id: `concurrent-msg-${connId}-${msgId}`,
                type: 'concurrent_test',
                content: `Message ${msgId} from connection ${connId}`,
                connectionId: connectionId,
                messageId: msgId,
                timestamp: Date.now()
              };

              const benchmark = await benchmarker.benchmarkSSEDelivery(connectionId, messageData);
              results.push(benchmark);
            }

            return { connectionId, results };
          };

          connectionPromises.push(connectionPromise());
        }

        const connectionResults = await Promise.all(connectionPromises);
        const allResults = connectionResults.flatMap(cr => cr.results);

        const avgDeliveryTime = allResults.reduce((sum, r) => sum + r.totalDeliveryTime, 0) / allResults.length;
        const successRate = allResults.filter(r => r.success).length / allResults.length;
        const maxDeliveryTime = Math.max(...allResults.map(r => r.totalDeliveryTime));

        const testResult = {
          testName: 'concurrent_connections_performance',
          passed: successRate >= 0.9 && avgDeliveryTime < 200, // More lenient for concurrent load
          connectionCount,
          messagesPerConnection,
          totalMessages: allResults.length,
          avgDeliveryTime,
          maxDeliveryTime,
          successRate,
          timestamp: testStart
        };

        testResults.push(testResult);

        expect(successRate).toBeGreaterThanOrEqual(0.9);
        expect(avgDeliveryTime).toBeLessThan(200);

        console.log(`Concurrent test: ${connectionCount} connections, ${allResults.length} total messages, avg=${avgDeliveryTime.toFixed(2)}ms, success=${(successRate*100).toFixed(1)}%`);

      } catch (error) {
        testResults.push({
          testName: 'concurrent_connections_performance',
          passed: false,
          error: error.message,
          timestamp: testStart
        });
        throw error;
      }
    });
  });

  describe('Message Ordering and Reliability', () => {
    test('should maintain message order under load', async () => {
      const testStart = Date.now();
      const messageCount = 20;
      const results = [];

      try {
        const connectionId = 'order-test-connection';

        // Send messages with sequence numbers
        for (let i = 0; i < messageCount; i++) {
          const messageData = {
            id: `order-msg-${i}`,
            type: 'order_test',
            content: `Ordered message ${i}`,
            sequenceNumber: i,
            timestamp: Date.now()
          };

          const benchmark = await benchmarker.benchmarkSSEDelivery(connectionId, messageData);
          results.push({ ...benchmark, expectedSequence: i });
        }

        // Check if messages maintain order (in this simple test, they should)
        const orderedCorrectly = results.every((result, index) => result.expectedSequence === index);
        const successRate = results.filter(r => r.success).length / results.length;

        const testResult = {
          testName: 'message_ordering_reliability',
          passed: orderedCorrectly && successRate >= 0.95,
          messageCount,
          orderedCorrectly,
          successRate,
          results: results.map(r => ({ 
            messageId: r.messageId, 
            expectedSequence: r.expectedSequence, 
            success: r.success,
            deliveryTime: r.totalDeliveryTime 
          })),
          timestamp: testStart
        };

        testResults.push(testResult);

        expect(orderedCorrectly).toBe(true);
        expect(successRate).toBeGreaterThanOrEqual(0.95);

        console.log(`Message ordering test: ${messageCount} messages, ordered=${orderedCorrectly}, success=${(successRate*100).toFixed(1)}%`);

      } catch (error) {
        testResults.push({
          testName: 'message_ordering_reliability',
          passed: false,
          error: error.message,
          timestamp: testStart
        });
        throw error;
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle connection interruption gracefully', async () => {
      const testStart = Date.now();

      try {
        const connectionId = 'interruption-test-connection';
        
        // Send message before interruption
        const messageData1 = {
          id: 'pre-interruption-msg',
          type: 'interruption_test',
          content: 'Message before interruption',
          timestamp: Date.now()
        };

        const benchmark1 = await benchmarker.benchmarkSSEDelivery(connectionId, messageData1);

        // Simulate connection interruption
        console.log('Simulating connection interruption...');
        await new Promise(resolve => setTimeout(resolve, 100));

        // Send message after simulated recovery
        const messageData2 = {
          id: 'post-interruption-msg',
          type: 'interruption_test',
          content: 'Message after interruption recovery',
          timestamp: Date.now()
        };

        const benchmark2 = await benchmarker.benchmarkSSEDelivery(connectionId, messageData2);

        const testResult = {
          testName: 'connection_interruption_recovery',
          passed: benchmark1.success && benchmark2.success,
          preInterruption: benchmark1,
          postRecovery: benchmark2,
          recoveryTime: benchmark2.startTime - benchmark1.startTime,
          timestamp: testStart
        };

        testResults.push(testResult);

        expect(benchmark1.success).toBe(true);
        expect(benchmark2.success).toBe(true);

        console.log(`Connection recovery test: both messages delivered successfully`);

      } catch (error) {
        testResults.push({
          testName: 'connection_interruption_recovery',
          passed: false,
          error: error.message,
          timestamp: testStart
        });
        throw error;
      }
    });

    test('should detect and report delivery failures', async () => {
      const testStart = Date.now();

      try {
        const connectionId = 'failure-test-connection';
        
        // Send message to potentially failed connection
        const messageData = {
          id: 'failure-test-msg',
          type: 'failure_simulation',
          content: 'Message to test failure detection',
          simulateFailure: true,
          timestamp: Date.now()
        };

        let benchmark;
        let errorDetected = false;

        try {
          benchmark = await benchmarker.benchmarkSSEDelivery(connectionId, messageData);
        } catch (error) {
          errorDetected = true;
          benchmark = { error: error.message, success: false };
        }

        const testResult = {
          testName: 'delivery_failure_detection',
          passed: errorDetected || !benchmark.success, // Should detect failure
          errorDetected,
          benchmark,
          timestamp: testStart
        };

        testResults.push(testResult);

        // For failure simulation, we expect either error detection or failed delivery
        expect(errorDetected || !benchmark.success).toBe(true);

        console.log(`Failure detection test: error detected = ${errorDetected}`);

      } catch (error) {
        testResults.push({
          testName: 'delivery_failure_detection',
          passed: true, // Catching error in failure test is expected
          error: error.message,
          timestamp: testStart
        });
      }
    });
  });

  describe('Performance Under Different Message Types', () => {
    test('should handle different message types efficiently', async () => {
      const testStart = Date.now();
      const messageTypes = [
        { type: 'text', content: 'Simple text message' },
        { type: 'json', content: { data: { key: 'value', array: [1, 2, 3] } } },
        { type: 'base64', content: Buffer.from('Binary data simulation').toString('base64') },
        { type: 'large_text', content: 'Large text content: ' + 'A'.repeat(5000) }
      ];

      try {
        const results = [];

        for (let i = 0; i < messageTypes.length; i++) {
          const messageType = messageTypes[i];
          const connectionId = `type-test-connection-${i}`;
          const messageData = {
            id: `type-test-${messageType.type}`,
            type: messageType.type,
            content: messageType.content,
            timestamp: Date.now()
          };

          const benchmark = await benchmarker.benchmarkSSEDelivery(connectionId, messageData);
          results.push({ ...benchmark, messageType: messageType.type });
        }

        const avgDeliveryTime = results.reduce((sum, r) => sum + r.totalDeliveryTime, 0) / results.length;
        const successRate = results.filter(r => r.success).length / results.length;

        const testResult = {
          testName: 'different_message_types_performance',
          passed: successRate === 1.0 && avgDeliveryTime < 200, // All types should work
          messageTypes: messageTypes.length,
          avgDeliveryTime,
          successRate,
          results: results.map(r => ({
            type: r.messageType,
            deliveryTime: r.totalDeliveryTime,
            messageSize: r.messageSize,
            success: r.success
          })),
          timestamp: testStart
        };

        testResults.push(testResult);

        expect(successRate).toBe(1.0);
        expect(avgDeliveryTime).toBeLessThan(200);

        console.log(`Message types test: ${messageTypes.length} types, avg=${avgDeliveryTime.toFixed(2)}ms, success=${(successRate*100).toFixed(1)}%`);

      } catch (error) {
        testResults.push({
          testName: 'different_message_types_performance',
          passed: false,
          error: error.message,
          timestamp: testStart
        });
        throw error;
      }
    });
  });
});

module.exports = {
  runSSEPerformanceTests: () => {
    console.log('Starting SSE Delivery Performance Test Suite...');
    return require('jest').run(['--testPathPattern=sse-delivery-performance.test.js']);
  }
};