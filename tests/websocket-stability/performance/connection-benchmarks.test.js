/**
 * WebSocket Connection Performance Benchmarks
 * Tests performance characteristics and connection metrics
 */

const { TestServer, WebSocketTestClient, ConnectionMonitor, performanceUtils, sleep } = require('../utils/test-helpers');

describe('WebSocket Connection Performance Benchmarks', () => {
  let testServer;
  let wsClient;
  let connectionMonitor;

  beforeAll(async () => {
    connectionMonitor = new ConnectionMonitor();
    testServer = new TestServer(3001);
    await testServer.start();
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.stop();
    }
  });

  beforeEach(async () => {
    wsClient = new WebSocketTestClient('ws://localhost:3001');
    connectionMonitor.clear();
  });

  afterEach(async () => {
    if (wsClient) {
      await wsClient.disconnect();
    }
  });

  describe('Connection Establishment Performance', () => {
    test('WebSocket connection establishment time benchmark', async () => {
      const connectionAttempts = 10;
      const connectionTimes = [];

      for (let i = 0; i < connectionAttempts; i++) {
        const client = new WebSocketTestClient('ws://localhost:3001');
        
        const { result, duration } = await performanceUtils.measure(
          `connection-attempt-${i}`,
          () => client.connect()
        );

        connectionTimes.push(duration);
        
        connectionMonitor.logEvent('connection_benchmark', {
          attempt: i + 1,
          duration: duration,
          successful: true
        });

        await client.disconnect();
        await sleep(100); // Brief pause between attempts
      }

      // Calculate performance statistics
      const avgConnectionTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
      const minConnectionTime = Math.min(...connectionTimes);
      const maxConnectionTime = Math.max(...connectionTimes);
      
      // Performance assertions (adjust thresholds based on requirements)
      expect(avgConnectionTime).toBeLessThan(1000); // Average < 1 second
      expect(maxConnectionTime).toBeLessThan(2000); // Max < 2 seconds
      expect(minConnectionTime).toBeGreaterThan(0); // Sanity check

      connectionMonitor.logEvent('connection_benchmark_summary', {
        attempts: connectionAttempts,
        avgDuration: avgConnectionTime,
        minDuration: minConnectionTime,
        maxDuration: maxConnectionTime,
        allUnderThreshold: connectionTimes.every(t => t < 1000)
      });

      console.log(`[BENCHMARK] Connection establishment: avg=${avgConnectionTime.toFixed(2)}ms, min=${minConnectionTime.toFixed(2)}ms, max=${maxConnectionTime.toFixed(2)}ms`);
    });

    test('Message round-trip time benchmark', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('roundtrip_benchmark_started');

      const messageCount = 50;
      const roundTripTimes = [];

      for (let i = 0; i < messageCount; i++) {
        const command = {
          instanceId: 'roundtrip-benchmark',
          type: 'user_input',
          command: `echo "Benchmark message ${i}"`,
          timestamp: Date.now()
        };

        const { duration } = await performanceUtils.measure(
          `roundtrip-${i}`,
          async () => {
            await wsClient.sendMessage(command);
            return wsClient.waitForMessage(5000, msg => 
              msg.instanceId === command.instanceId
            );
          }
        );

        roundTripTimes.push(duration);
        
        if (i % 10 === 0) {
          connectionMonitor.logEvent('roundtrip_progress', {
            completed: i + 1,
            avgSoFar: roundTripTimes.reduce((a, b) => a + b, 0) / roundTripTimes.length
          });
        }

        await sleep(50); // Small delay between messages
      }

      // Calculate round-trip statistics
      const avgRoundTripTime = roundTripTimes.reduce((a, b) => a + b, 0) / roundTripTimes.length;
      const minRoundTripTime = Math.min(...roundTripTimes);
      const maxRoundTripTime = Math.max(...roundTripTimes);
      const medianRoundTripTime = roundTripTimes.sort((a, b) => a - b)[Math.floor(roundTripTimes.length / 2)];

      // Performance assertions
      expect(avgRoundTripTime).toBeLessThan(5000); // Average < 5 seconds
      expect(minRoundTripTime).toBeGreaterThan(0);
      expect(wsClient.isConnected).toBe(true); // Connection should remain stable

      connectionMonitor.logEvent('roundtrip_benchmark_summary', {
        messageCount: messageCount,
        avgDuration: avgRoundTripTime,
        minDuration: minRoundTripTime,
        maxDuration: maxRoundTripTime,
        medianDuration: medianRoundTripTime,
        connectionRemainedStable: wsClient.isConnected
      });

      console.log(`[BENCHMARK] Message round-trip: avg=${avgRoundTripTime.toFixed(2)}ms, median=${medianRoundTripTime.toFixed(2)}ms, min=${minRoundTripTime.toFixed(2)}ms, max=${maxRoundTripTime.toFixed(2)}ms`);
    });
  });

  describe('Throughput and Capacity Benchmarks', () => {
    test('Maximum concurrent message throughput', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('throughput_benchmark_started');

      const concurrentMessages = 20;
      const batchSize = 5;
      const batches = Math.ceil(concurrentMessages / batchSize);

      const allResults = [];
      const overallTimer = performanceUtils.createTimer();

      for (let batch = 0; batch < batches; batch++) {
        const batchMessages = [];
        
        // Create batch of concurrent messages
        for (let i = 0; i < batchSize && (batch * batchSize + i) < concurrentMessages; i++) {
          const messageIndex = batch * batchSize + i;
          batchMessages.push({
            instanceId: `throughput-test-${messageIndex}`,
            type: 'user_input',
            command: `echo "Throughput test message ${messageIndex}"`,
            timestamp: Date.now()
          });
        }

        connectionMonitor.logEvent('throughput_batch_started', {
          batchNumber: batch + 1,
          batchSize: batchMessages.length
        });

        // Send all messages in batch concurrently
        const batchTimer = performanceUtils.createTimer();
        
        const sendPromises = batchMessages.map(msg => wsClient.sendMessage(msg));
        await Promise.all(sendPromises);

        // Wait for all responses in batch
        const responsePromises = batchMessages.map(msg => 
          wsClient.waitForMessage(8000, response => 
            response.instanceId === msg.instanceId
          )
        );

        const responses = await Promise.all(responsePromises);
        const batchDuration = batchTimer();

        const batchResult = {
          batch: batch + 1,
          messageCount: batchMessages.length,
          duration: batchDuration,
          successfulResponses: responses.filter(r => r).length,
          throughput: (batchMessages.length / batchDuration) * 1000 // messages per second
        };

        allResults.push(batchResult);
        
        connectionMonitor.logEvent('throughput_batch_completed', batchResult);

        // Brief pause between batches
        await sleep(200);
      }

      const totalDuration = overallTimer();
      const totalMessages = concurrentMessages;
      const successfulMessages = allResults.reduce((sum, batch) => sum + batch.successfulResponses, 0);
      const overallThroughput = (successfulMessages / totalDuration) * 1000;

      // Verify connection stability throughout throughput test
      expect(wsClient.isConnected).toBe(true);
      expect(successfulMessages).toBe(totalMessages);

      connectionMonitor.logEvent('throughput_benchmark_summary', {
        totalMessages: totalMessages,
        successfulMessages: successfulMessages,
        totalDuration: totalDuration,
        overallThroughput: overallThroughput,
        avgBatchThroughput: allResults.reduce((sum, batch) => sum + batch.throughput, 0) / allResults.length,
        connectionStable: wsClient.isConnected
      });

      console.log(`[BENCHMARK] Throughput: ${successfulMessages}/${totalMessages} messages in ${totalDuration.toFixed(2)}ms (${overallThroughput.toFixed(2)} msg/sec)`);
    });

    test('Connection stability under sustained load', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('sustained_load_test_started');

      const testDuration = 30000; // 30 seconds
      const messageInterval = 500; // Send message every 500ms
      const startTime = Date.now();
      let messagesSent = 0;
      let responsesReceived = 0;
      let errors = 0;

      const loadTestTimer = performanceUtils.createTimer();

      while (Date.now() - startTime < testDuration) {
        try {
          const command = {
            instanceId: 'sustained-load-test',
            type: 'user_input',
            command: `echo "Sustained load message ${messagesSent}"`,
            timestamp: Date.now()
          };

          await wsClient.sendMessage(command);
          messagesSent++;

          // Try to get response with shorter timeout for load test
          try {
            const response = await wsClient.waitForMessage(3000, msg => 
              msg.instanceId === command.instanceId
            );
            
            if (response) {
              responsesReceived++;
            }
          } catch (responseError) {
            // Response timeout is acceptable under load
            connectionMonitor.logEvent('sustained_load_response_timeout', {
              messageNumber: messagesSent
            });
          }

          // Verify connection is still alive
          if (!wsClient.isConnected) {
            connectionMonitor.logEvent('connection_lost_during_load', {
              messagesSent,
              responsesReceived
            });
            break;
          }

          await sleep(messageInterval);

        } catch (error) {
          errors++;
          connectionMonitor.logEvent('sustained_load_error', {
            error: error.message,
            messageNumber: messagesSent
          });

          if (errors > 5) {
            // Too many errors, break
            break;
          }
        }
      }

      const totalLoadTestDuration = loadTestTimer();
      const responseRate = (responsesReceived / messagesSent) * 100;

      connectionMonitor.logEvent('sustained_load_test_completed', {
        duration: totalLoadTestDuration,
        messagesSent: messagesSent,
        responsesReceived: responsesReceived,
        errors: errors,
        responseRate: responseRate,
        finalConnectionState: wsClient.isConnected,
        averageMessageInterval: totalLoadTestDuration / messagesSent
      });

      // Verify connection survived sustained load
      expect(wsClient.isConnected).toBe(true);
      expect(messagesSent).toBeGreaterThan(0);
      expect(responseRate).toBeGreaterThan(50); // At least 50% response rate under load
      expect(errors).toBeLessThan(messagesSent * 0.1); // Less than 10% error rate

      console.log(`[BENCHMARK] Sustained load: ${messagesSent} messages sent, ${responsesReceived} responses (${responseRate.toFixed(1)}% rate), ${errors} errors over ${(totalLoadTestDuration/1000).toFixed(1)}s`);
    });
  });

  describe('Memory and Resource Usage', () => {
    test('WebSocket memory usage remains stable over time', async () => {
      await wsClient.connect();
      connectionMonitor.logEvent('memory_stability_test_started');

      // Record initial memory usage
      const initialMemory = process.memoryUsage();
      const messageCount = 100;
      const memoryCheckpoints = [];

      for (let i = 0; i < messageCount; i++) {
        const command = {
          instanceId: 'memory-stability-test',
          type: 'user_input',
          command: `echo "Memory test message ${i}"`,
          timestamp: Date.now()
        };

        await wsClient.sendMessage(command);
        await wsClient.waitForMessage(5000, msg => msg.instanceId === command.instanceId);

        // Check memory every 10 messages
        if (i % 10 === 0) {
          const currentMemory = process.memoryUsage();
          memoryCheckpoints.push({
            messageCount: i + 1,
            heapUsed: currentMemory.heapUsed,
            heapTotal: currentMemory.heapTotal,
            rss: currentMemory.rss
          });

          connectionMonitor.logEvent('memory_checkpoint', {
            messageCount: i + 1,
            heapUsedMB: Math.round(currentMemory.heapUsed / 1024 / 1024),
            connectionActive: wsClient.isConnected
          });
        }

        await sleep(50);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePercentage = (memoryIncrease / initialMemory.heapUsed) * 100;

      connectionMonitor.logEvent('memory_stability_test_completed', {
        messageCount: messageCount,
        initialMemoryMB: Math.round(initialMemory.heapUsed / 1024 / 1024),
        finalMemoryMB: Math.round(finalMemory.heapUsed / 1024 / 1024),
        memoryIncreaseMB: Math.round(memoryIncrease / 1024 / 1024),
        memoryIncreasePercentage: memoryIncreasePercentage,
        connectionStable: wsClient.isConnected
      });

      // Verify connection stability and reasonable memory usage
      expect(wsClient.isConnected).toBe(true);
      expect(memoryIncreasePercentage).toBeLessThan(50); // Less than 50% memory increase
      
      console.log(`[BENCHMARK] Memory stability: ${Math.round(memoryIncrease / 1024 / 1024)}MB increase (${memoryIncreasePercentage.toFixed(1)}%) over ${messageCount} messages`);
    });
  });
});