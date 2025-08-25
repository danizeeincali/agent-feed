/**
 * WebSocket Performance Benchmarks
 * Comprehensive performance testing and metrics collection
 * 
 * TDD Requirements:
 * ✅ Test WebSocket connection latency and throughput
 * ✅ Test message processing performance
 * ✅ Test memory usage under sustained load
 * ✅ Test concurrent connection performance scaling
 */

const WebSocket = require('ws');
const { spawn } = require('child_process');
const { performance } = require('perf_hooks');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

describe('WebSocket Performance Benchmarks', () => {
  let serverProcess;
  const TERMINAL_PORT = 3002;
  const TERMINAL_HOST = 'localhost';
  const BENCHMARK_RESULTS = [];

  beforeAll(async () => {
    // Start server with performance optimizations
    serverProcess = spawn('node', ['backend-terminal-server.js'], {
      cwd: '/workspaces/agent-feed',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        TERMINAL_PORT: TERMINAL_PORT,
        NODE_OPTIONS: '--max-old-space-size=8192'
      }
    });

    // Wait for server startup
    await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(new Error('Server startup timeout')), 20000);

      serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Terminal WebSocket Server running')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      serverProcess.on('exit', (code) => {
        if (code !== 0) {
          clearTimeout(timeout);
          reject(new Error(`Server exited with code ${code}`));
        }
      });
    });

    // Warm up server
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 30000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await new Promise(resolve => {
        serverProcess.on('exit', resolve);
        setTimeout(() => {
          if (!serverProcess.killed) {
            serverProcess.kill('SIGKILL');
          }
          resolve();
        }, 10000);
      });
    }

    // Save benchmark results
    if (BENCHMARK_RESULTS.length > 0) {
      const resultsPath = path.join(__dirname, 'benchmark-results.json');
      fs.writeFileSync(resultsPath, JSON.stringify(BENCHMARK_RESULTS, null, 2));
      console.log(`Benchmark results saved to: ${resultsPath}`);
    }
  });

  describe('Connection Performance Benchmarks', () => {
    test('should measure single connection establishment time', async () => {
      const iterations = 10;
      const connectionTimes = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        await new Promise((resolve, reject) => {
          const ws = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error(`Connection ${i} timeout`));
          }, 10000);

          ws.on('open', () => {
            const connectionTime = performance.now() - startTime;
            connectionTimes.push(connectionTime);
            
            ws.send(JSON.stringify({
              type: 'init',
              cols: 80,
              rows: 24,
              clientId: `perf-test-${i}`
            }));
          });

          ws.on('message', (data) => {
            try {
              const message = JSON.parse(data.toString());
              if (message.type === 'init_ack') {
                clearTimeout(timeout);
                ws.close();
                resolve();
              }
            } catch (error) {
              // Ignore non-JSON
            }
          });

          ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        // Small delay between connections
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Calculate statistics
      const avgConnectionTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;
      const minConnectionTime = Math.min(...connectionTimes);
      const maxConnectionTime = Math.max(...connectionTimes);
      const medianConnectionTime = connectionTimes.sort((a, b) => a - b)[Math.floor(connectionTimes.length / 2)];

      const benchmark = {
        test: 'Single Connection Establishment',
        iterations,
        avgTime: avgConnectionTime,
        minTime: minConnectionTime,
        maxTime: maxConnectionTime,
        medianTime: medianConnectionTime,
        times: connectionTimes,
        timestamp: new Date().toISOString()
      };

      BENCHMARK_RESULTS.push(benchmark);

      console.log('Single Connection Performance:');
      console.log(`Average: ${avgConnectionTime.toFixed(2)}ms`);
      console.log(`Min: ${minConnectionTime.toFixed(2)}ms`);
      console.log(`Max: ${maxConnectionTime.toFixed(2)}ms`);
      console.log(`Median: ${medianConnectionTime.toFixed(2)}ms`);

      // Performance assertions
      expect(avgConnectionTime).toBeLessThan(1000); // < 1 second average
      expect(maxConnectionTime).toBeLessThan(3000); // < 3 seconds max
    }, 60000);

    test('should measure concurrent connection establishment performance', async () => {
      const connectionCounts = [5, 10, 20, 30];
      const concurrentResults = [];

      for (const count of connectionCounts) {
        const startTime = performance.now();
        const connectionPromises = [];

        for (let i = 0; i < count; i++) {
          const connectionPromise = new Promise((resolve, reject) => {
            const connectionStart = performance.now();
            const ws = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
            const timeout = setTimeout(() => {
              reject(new Error(`Concurrent connection ${i} timeout`));
            }, 15000);

            ws.on('open', () => {
              ws.send(JSON.stringify({
                type: 'init',
                cols: 80,
                rows: 24,
                clientId: `concurrent-${count}-${i}`
              }));
            });

            ws.on('message', (data) => {
              try {
                const message = JSON.parse(data.toString());
                if (message.type === 'init_ack') {
                  const connectionTime = performance.now() - connectionStart;
                  clearTimeout(timeout);
                  ws.close();
                  resolve(connectionTime);
                }
              } catch (error) {
                // Ignore non-JSON
              }
            });

            ws.on('error', (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });

          connectionPromises.push(connectionPromise);
        }

        const individualTimes = await Promise.all(connectionPromises);
        const totalTime = performance.now() - startTime;

        const avgIndividualTime = individualTimes.reduce((a, b) => a + b, 0) / individualTimes.length;
        const maxIndividualTime = Math.max(...individualTimes);
        const throughput = count / (totalTime / 1000); // connections per second

        const result = {
          connectionCount: count,
          totalTime,
          avgIndividualTime,
          maxIndividualTime,
          throughput,
          individualTimes
        };

        concurrentResults.push(result);

        console.log(`Concurrent Connections (${count}):`);
        console.log(`Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`Average individual: ${avgIndividualTime.toFixed(2)}ms`);
        console.log(`Max individual: ${maxIndividualTime.toFixed(2)}ms`);
        console.log(`Throughput: ${throughput.toFixed(2)} conn/sec`);

        // Wait between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      BENCHMARK_RESULTS.push({
        test: 'Concurrent Connection Establishment',
        results: concurrentResults,
        timestamp: new Date().toISOString()
      });

      // Performance assertions
      const highestThroughput = Math.max(...concurrentResults.map(r => r.throughput));
      expect(highestThroughput).toBeGreaterThan(2); // At least 2 connections per second
      
      const avgPerformance = concurrentResults[concurrentResults.length - 1];
      expect(avgPerformance.avgIndividualTime).toBeLessThan(8000); // < 8 seconds average for largest test
    }, 120000);
  });

  describe('Message Processing Performance', () => {
    test('should measure message round-trip latency', async () => {
      const ws = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
      
      // Establish connection
      await new Promise(resolve => {
        ws.on('open', () => {
          ws.send(JSON.stringify({
            type: 'init',
            cols: 80,
            rows: 24,
            clientId: 'latency-test'
          }));
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.type === 'init_ack') {
              resolve();
            }
          } catch (error) {
            // Continue for non-JSON
            resolve();
          }
        });
      });

      // Measure message latencies
      const messageCount = 50;
      const latencies = [];

      for (let i = 0; i < messageCount; i++) {
        const messageLatency = await new Promise((resolve) => {
          const sendTime = performance.now();
          let responseReceived = false;

          const messageHandler = (data) => {
            if (!responseReceived) {
              const latency = performance.now() - sendTime;
              latencies.push(latency);
              responseReceived = true;
              resolve(latency);
            }
          };

          ws.on('message', messageHandler);

          // Send test message
          ws.send(JSON.stringify({
            type: 'input',
            data: `echo "latency-test-${i}"\\n`,
            timestamp: Date.now()
          }));

          // Timeout for response
          setTimeout(() => {
            if (!responseReceived) {
              ws.off('message', messageHandler);
              responseReceived = true;
              resolve(5000); // Timeout latency
            }
          }, 5000);
        });

        // Small delay between messages
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      ws.close();

      // Calculate latency statistics
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const minLatency = Math.min(...latencies);
      const maxLatency = Math.max(...latencies);
      const medianLatency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)];

      // Calculate percentiles
      const p95Index = Math.floor(latencies.length * 0.95);
      const p99Index = Math.floor(latencies.length * 0.99);
      const p95Latency = latencies[p95Index];
      const p99Latency = latencies[p99Index];

      const benchmark = {
        test: 'Message Round-trip Latency',
        messageCount,
        avgLatency,
        minLatency,
        maxLatency,
        medianLatency,
        p95Latency,
        p99Latency,
        latencies,
        timestamp: new Date().toISOString()
      };

      BENCHMARK_RESULTS.push(benchmark);

      console.log('Message Latency Performance:');
      console.log(`Average: ${avgLatency.toFixed(2)}ms`);
      console.log(`Min: ${minLatency.toFixed(2)}ms`);
      console.log(`Max: ${maxLatency.toFixed(2)}ms`);
      console.log(`Median: ${medianLatency.toFixed(2)}ms`);
      console.log(`95th percentile: ${p95Latency.toFixed(2)}ms`);
      console.log(`99th percentile: ${p99Latency.toFixed(2)}ms`);

      // Performance assertions
      expect(avgLatency).toBeLessThan(500); // < 500ms average
      expect(p95Latency).toBeLessThan(1000); // < 1s for 95% of messages
      expect(p99Latency).toBeLessThan(2000); // < 2s for 99% of messages
    }, 90000);

    test('should measure message throughput performance', async () => {
      const connections = [];
      const connectionCount = 10;
      const messagesPerConnection = 20;
      const totalMessages = connectionCount * messagesPerConnection;

      try {
        // Establish connections
        for (let i = 0; i < connectionCount; i++) {
          const ws = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
          connections.push(ws);

          await new Promise(resolve => {
            ws.on('open', () => {
              ws.send(JSON.stringify({
                type: 'init',
                cols: 80,
                rows: 24,
                clientId: `throughput-${i}`
              }));
            });

            ws.on('message', (data) => {
              try {
                const message = JSON.parse(data.toString());
                if (message.type === 'init_ack') {
                  resolve();
                }
              } catch (error) {
                resolve(); // Continue for non-JSON
              }
            });
          });
        }

        // Measure throughput
        const startTime = performance.now();
        let messagesReceived = 0;
        const messagePromises = [];

        connections.forEach((ws, connIndex) => {
          for (let msgIndex = 0; msgIndex < messagesPerConnection; msgIndex++) {
            const messagePromise = new Promise((resolve) => {
              const messageHandler = (data) => {
                messagesReceived++;
                resolve();
              };

              ws.on('message', messageHandler);

              ws.send(JSON.stringify({
                type: 'input',
                data: `echo "throughput-${connIndex}-${msgIndex}"\\n`,
                timestamp: Date.now()
              }));
            });

            messagePromises.push(messagePromise);
          }
        });

        // Wait for all messages
        await Promise.all(messagePromises);
        const endTime = performance.now();

        const totalTime = endTime - startTime;
        const throughput = totalMessages / (totalTime / 1000); // messages per second

        const benchmark = {
          test: 'Message Throughput',
          connectionCount,
          messagesPerConnection,
          totalMessages,
          totalTime,
          throughput,
          timestamp: new Date().toISOString()
        };

        BENCHMARK_RESULTS.push(benchmark);

        console.log('Message Throughput Performance:');
        console.log(`Total messages: ${totalMessages}`);
        console.log(`Total time: ${totalTime.toFixed(2)}ms`);
        console.log(`Throughput: ${throughput.toFixed(2)} msg/sec`);

        // Performance assertions
        expect(throughput).toBeGreaterThan(5); // At least 5 messages per second
        expect(totalTime).toBeLessThan(60000); // Complete within 60 seconds

      } finally {
        // Clean up connections
        connections.forEach(ws => {
          if (ws.readyState === ws.OPEN) {
            ws.close();
          }
        });
      }
    }, 120000);
  });

  describe('Resource Usage Benchmarks', () => {
    test('should measure memory usage under sustained load', async () => {
      const initialHealth = await fetch(`http://${TERMINAL_HOST}:${TERMINAL_PORT}/health`);
      const initialData = await initialHealth.json();
      const initialMemory = initialData.memory;

      console.log('Initial Memory Usage:', initialMemory);

      const connections = [];
      const connectionCount = 25;
      const sustainedDuration = 30000; // 30 seconds
      const memorySnapshots = [initialMemory];

      try {
        // Establish connections
        for (let i = 0; i < connectionCount; i++) {
          const ws = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
          connections.push(ws);

          await new Promise(resolve => {
            ws.on('open', () => {
              ws.send(JSON.stringify({
                type: 'init',
                cols: 80,
                rows: 24,
                clientId: `memory-${i}`
              }));
            });

            ws.on('message', (data) => {
              try {
                const message = JSON.parse(data.toString());
                if (message.type === 'init_ack') {
                  resolve();
                }
              } catch (error) {
                resolve();
              }
            });
          });
        }

        // Monitor memory usage during sustained activity
        const memoryMonitor = setInterval(async () => {
          try {
            const health = await fetch(`http://${TERMINAL_HOST}:${TERMINAL_PORT}/health`);
            const data = await health.json();
            memorySnapshots.push(data.memory);
          } catch (error) {
            console.error('Memory monitoring error:', error.message);
          }
        }, 5000);

        // Generate sustained activity
        const activityPromise = new Promise(resolve => {
          let messagesSent = 0;
          const activityInterval = setInterval(() => {
            connections.forEach((ws, index) => {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({
                  type: 'input',
                  data: `echo "sustained-${index}-${messagesSent}"\\n`,
                  timestamp: Date.now()
                }));
              }
            });
            messagesSent++;

            if (messagesSent >= sustainedDuration / 2000) {
              clearInterval(activityInterval);
              resolve();
            }
          }, 2000);
        });

        await activityPromise;
        clearInterval(memoryMonitor);

        // Final memory check
        const finalHealth = await fetch(`http://${TERMINAL_HOST}:${TERMINAL_PORT}/health`);
        const finalData = await finalHealth.json();
        const finalMemory = finalData.memory;

        console.log('Final Memory Usage:', finalMemory);

        // Analyze memory usage
        const heapUsedGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
        const heapUsedGrowthMB = heapUsedGrowth / (1024 * 1024);
        const heapUsedGrowthPercent = (heapUsedGrowth / initialMemory.heapUsed) * 100;

        const maxHeapUsed = Math.max(...memorySnapshots.map(m => m.heapUsed));
        const maxHeapUsedMB = maxHeapUsed / (1024 * 1024);

        const benchmark = {
          test: 'Memory Usage Under Load',
          connectionCount,
          sustainedDuration,
          initialMemory,
          finalMemory,
          heapUsedGrowth,
          heapUsedGrowthMB,
          heapUsedGrowthPercent,
          maxHeapUsed,
          maxHeapUsedMB,
          memorySnapshots,
          timestamp: new Date().toISOString()
        };

        BENCHMARK_RESULTS.push(benchmark);

        console.log('Memory Usage Analysis:');
        console.log(`Heap growth: ${heapUsedGrowthMB.toFixed(2)}MB (${heapUsedGrowthPercent.toFixed(2)}%)`);
        console.log(`Max heap used: ${maxHeapUsedMB.toFixed(2)}MB`);

        // Memory usage assertions
        expect(maxHeapUsedMB).toBeLessThan(1024); // Less than 1GB
        expect(heapUsedGrowthPercent).toBeLessThan(300); // Less than 300% growth

      } finally {
        connections.forEach(ws => {
          if (ws.readyState === ws.OPEN) {
            ws.close();
          }
        });
      }
    }, 60000);

    test('should measure connection scaling performance', async () => {
      const scalingLevels = [10, 25, 50, 75];
      const scalingResults = [];

      for (const level of scalingLevels) {
        const startTime = performance.now();
        const connections = [];
        const establishmentTimes = [];

        try {
          // Establish connections at this scale
          for (let i = 0; i < level; i++) {
            const connectionStart = performance.now();
            
            const connectionPromise = new Promise((resolve, reject) => {
              const ws = new WebSocket(`ws://${TERMINAL_HOST}:${TERMINAL_PORT}/terminal`);
              const timeout = setTimeout(() => {
                reject(new Error(`Scaling connection ${i} timeout`));
              }, 20000);

              ws.on('open', () => {
                connections.push(ws);
                ws.send(JSON.stringify({
                  type: 'init',
                  cols: 80,
                  rows: 24,
                  clientId: `scaling-${level}-${i}`
                }));
              });

              ws.on('message', (data) => {
                try {
                  const message = JSON.parse(data.toString());
                  if (message.type === 'init_ack') {
                    const establishmentTime = performance.now() - connectionStart;
                    establishmentTimes.push(establishmentTime);
                    clearTimeout(timeout);
                    resolve();
                  }
                } catch (error) {
                  // Ignore non-JSON
                }
              });

              ws.on('error', (error) => {
                clearTimeout(timeout);
                reject(error);
              });
            });

            await connectionPromise;
          }

          const totalTime = performance.now() - startTime;
          const avgEstablishmentTime = establishmentTimes.reduce((a, b) => a + b, 0) / establishmentTimes.length;
          const maxEstablishmentTime = Math.max(...establishmentTimes);

          // Get server resource usage
          const health = await fetch(`http://${TERMINAL_HOST}:${TERMINAL_PORT}/health`);
          const healthData = await health.json();

          const result = {
            level,
            totalTime,
            avgEstablishmentTime,
            maxEstablishmentTime,
            successfulConnections: connections.length,
            memoryUsage: healthData.memory,
            timestamp: new Date().toISOString()
          };

          scalingResults.push(result);

          console.log(`Scaling Level ${level}:`);
          console.log(`Total time: ${totalTime.toFixed(2)}ms`);
          console.log(`Avg establishment: ${avgEstablishmentTime.toFixed(2)}ms`);
          console.log(`Max establishment: ${maxEstablishmentTime.toFixed(2)}ms`);
          console.log(`Successful: ${connections.length}/${level}`);
          console.log(`Memory used: ${(healthData.memory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

        } finally {
          // Clean up connections
          connections.forEach(ws => {
            if (ws.readyState === ws.OPEN) {
              ws.close();
            }
          });

          // Wait for cleanup
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      BENCHMARK_RESULTS.push({
        test: 'Connection Scaling Performance',
        scalingResults,
        timestamp: new Date().toISOString()
      });

      // Scaling performance assertions
      const highestLevel = scalingResults[scalingResults.length - 1];
      expect(highestLevel.successfulConnections).toBeGreaterThan(scalingLevels[scalingLevels.length - 1] * 0.8); // At least 80% success
      expect(highestLevel.avgEstablishmentTime).toBeLessThan(10000); // < 10 seconds average at highest scale

    }, 300000); // 5 minutes timeout for scaling test
  });
});