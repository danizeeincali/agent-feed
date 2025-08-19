/**
 * Performance and Load Testing Suite
 * Tests system performance under various load conditions
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { performance } from 'perf_hooks';
import { Worker } from 'worker_threads';
import { claudeCodeOrchestrator } from '@/orchestration/claude-code-orchestrator';
import { swarmCoordinator } from '@/orchestration/swarm-coordinator';
import { agentOrchestrator } from '@/orchestration/agent-orchestrator';
import { app } from '@/api/server';
import supertest from 'supertest';

interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  throughput: number;
  errorRate: number;
  timestamp: number;
}

interface LoadTestResult {
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  maxResponseTime: number;
  totalRequests: number;
  successfulRequests: number;
  errorRate: number;
  throughput: number;
  memoryPeak: number;
}

interface StressTestConfig {
  concurrentUsers: number;
  duration: number; // in milliseconds
  rampUpTime: number;
  requestsPerSecond: number;
  endpoint: string;
  payload?: any;
}

describe('Performance and Load Testing', () => {
  const request = supertest(app);
  let testSwarmId: string;
  let baselineMetrics: PerformanceMetrics;

  beforeAll(async () => {
    // Initialize services
    await claudeCodeOrchestrator.initialize();
    await swarmCoordinator.initialize();
    
    // Collect baseline metrics
    baselineMetrics = await collectPerformanceMetrics();
    
    // Create test swarm
    const swarm = await swarmCoordinator.initializeSwarm({
      topology: 'mesh',
      maxAgents: 20,
      userId: 'perf-test-user'
    });
    testSwarmId = swarm.id;
  });

  afterAll(async () => {
    if (testSwarmId) {
      await swarmCoordinator.destroySwarm(testSwarmId);
    }
  });

  describe('API Performance Tests', () => {
    test('should handle concurrent API requests efficiently', async () => {
      const concurrentRequests = 100;
      const endpoint = '/api/v1/feeds';
      
      const startTime = performance.now();
      const promises = Array.from({ length: concurrentRequests }, () =>
        request.get(endpoint).expect(200)
      );

      const results = await Promise.allSettled(promises);
      const endTime = performance.now();
      
      const successfulRequests = results.filter(r => r.status === 'fulfilled').length;
      const totalTime = endTime - startTime;
      const throughput = (successfulRequests / totalTime) * 1000; // requests per second

      expect(successfulRequests).toBeGreaterThan(95); // >95% success rate
      expect(throughput).toBeGreaterThan(50); // >50 requests/second
      expect(totalTime).toBeLessThan(10000); // <10 seconds total
    });

    test('should maintain performance under sustained load', async () => {
      const config: StressTestConfig = {
        concurrentUsers: 50,
        duration: 60000, // 1 minute
        rampUpTime: 10000, // 10 seconds
        requestsPerSecond: 10,
        endpoint: '/api/v1/agent-posts'
      };

      const loadTestResult = await runLoadTest(config);

      expect(loadTestResult.averageResponseTime).toBeLessThan(2000); // <2s average
      expect(loadTestResult.p95ResponseTime).toBeLessThan(5000); // <5s p95
      expect(loadTestResult.errorRate).toBeLessThan(0.05); // <5% error rate
      expect(loadTestResult.throughput).toBeGreaterThan(20); // >20 req/s
    });

    test('should handle websocket connections at scale', async () => {
      const connectionCount = 200;
      const connections: any[] = [];
      
      // Create multiple WebSocket connections
      const connectionPromises = Array.from({ length: connectionCount }, async (_, i) => {
        return new Promise((resolve, reject) => {
          const WebSocket = require('ws');
          const ws = new WebSocket('ws://localhost:3000/socket.io/?EIO=4&transport=websocket');
          
          ws.on('open', () => {
            connections.push(ws);
            ws.send(JSON.stringify({
              type: 'subscribe:feed',
              data: { feedId: `test-feed-${i % 10}` }
            }));
            resolve(ws);
          });
          
          ws.on('error', reject);
          
          setTimeout(() => reject(new Error('Connection timeout')), 10000);
        });
      });

      const startTime = performance.now();
      const results = await Promise.allSettled(connectionPromises);
      const endTime = performance.now();
      
      const successfulConnections = results.filter(r => r.status === 'fulfilled').length;
      const connectionTime = endTime - startTime;

      expect(successfulConnections).toBeGreaterThan(180); // >90% success rate
      expect(connectionTime).toBeLessThan(30000); // <30 seconds to establish all
      
      // Test message broadcasting
      const broadcastStart = performance.now();
      const testMessage = { type: 'test-broadcast', data: { timestamp: Date.now() } };
      
      // Broadcast to all connections
      connections.forEach(ws => {
        if (ws.readyState === 1) { // OPEN
          ws.send(JSON.stringify(testMessage));
        }
      });
      
      const broadcastEnd = performance.now();
      const broadcastTime = broadcastEnd - broadcastStart;
      
      expect(broadcastTime).toBeLessThan(5000); // <5 seconds for broadcast
      
      // Cleanup connections
      connections.forEach(ws => {
        if (ws.readyState === 1) {
          ws.close();
        }
      });
    });

    test('should handle large payload processing', async () => {
      const largePayload = {
        data: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          content: 'x'.repeat(1000), // 1KB per item
          metadata: {
            timestamp: Date.now(),
            processed: false,
            tags: Array.from({ length: 10 }, (_, j) => `tag-${j}`)
          }
        }))
      };

      const startTime = performance.now();
      const response = await request
        .post('/api/v1/agent-posts/bulk')
        .send(largePayload)
        .expect(200);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(30000); // <30 seconds for 10MB payload
      expect(response.body.processed).toBe(true);
      expect(response.body.itemCount).toBe(10000);
    });
  });

  describe('Agent Orchestration Performance', () => {
    test('should spawn multiple agents efficiently', async () => {
      const agentCount = 50;
      const agentTypes = ['coder', 'tester', 'reviewer', 'planner', 'researcher'];
      
      const startTime = performance.now();
      const spawnPromises = Array.from({ length: agentCount }, (_, i) =>
        agentOrchestrator.spawnAgent({
          swarmId: testSwarmId,
          type: agentTypes[i % agentTypes.length],
          name: `perf-test-agent-${i}`
        })
      );

      const results = await Promise.allSettled(spawnPromises);
      const endTime = performance.now();
      
      const successfulSpawns = results.filter(r => r.status === 'fulfilled').length;
      const spawnTime = endTime - startTime;
      const spawnRate = (successfulSpawns / spawnTime) * 1000; // agents per second

      expect(successfulSpawns).toBeGreaterThan(40); // >80% success rate
      expect(spawnRate).toBeGreaterThan(2); // >2 agents per second
      expect(spawnTime).toBeLessThan(30000); // <30 seconds total

      // Cleanup spawned agents
      const successfulAgents = results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<any>).value);

      await Promise.all(
        successfulAgents.map(agent => 
          agentOrchestrator.terminateAgent(agent.id).catch(() => {})
        )
      );
    });

    test('should handle high-frequency task orchestration', async () => {
      // Spawn agents for testing
      const agents = await Promise.all([
        agentOrchestrator.spawnAgent({
          swarmId: testSwarmId,
          type: 'coder',
          name: 'high-freq-coder'
        }),
        agentOrchestrator.spawnAgent({
          swarmId: testSwarmId,
          type: 'tester',
          name: 'high-freq-tester'
        })
      ]);

      const taskCount = 100;
      const tasks = Array.from({ length: taskCount }, (_, i) => ({
        id: `high-freq-task-${i}`,
        type: 'micro-task',
        priority: i % 3 === 0 ? 'high' : 'medium',
        estimatedDuration: 1000 + Math.random() * 2000 // 1-3 seconds
      }));

      const startTime = performance.now();
      const orchestrationPromises = tasks.map(task =>
        swarmCoordinator.orchestrateTask(testSwarmId, task)
      );

      const results = await Promise.allSettled(orchestrationPromises);
      const endTime = performance.now();

      const successfulTasks = results.filter(r => r.status === 'fulfilled').length;
      const orchestrationTime = endTime - startTime;
      const taskThroughput = (successfulTasks / orchestrationTime) * 1000;

      expect(successfulTasks).toBeGreaterThan(90); // >90% success rate
      expect(taskThroughput).toBeGreaterThan(5); // >5 tasks per second
      expect(orchestrationTime).toBeLessThan(60000); // <1 minute

      // Cleanup
      await Promise.all(
        agents.map(agent => agentOrchestrator.terminateAgent(agent.id))
      );
    });

    test('should maintain performance during agent scaling', async () => {
      const scalingSteps = [5, 10, 15, 20];
      const performanceResults = [];

      for (const targetAgentCount of scalingSteps) {
        const stepStartTime = performance.now();
        
        // Scale to target count
        await swarmCoordinator.scaleSwarm(testSwarmId, targetAgentCount);
        
        // Measure task execution performance
        const testTask = {
          id: `scaling-test-${targetAgentCount}`,
          type: 'performance-benchmark',
          estimatedDuration: 2000
        };

        const taskStart = performance.now();
        await swarmCoordinator.orchestrateTask(testSwarmId, testTask);
        const taskEnd = performance.now();
        
        const stepEndTime = performance.now();
        
        performanceResults.push({
          agentCount: targetAgentCount,
          scalingTime: stepEndTime - stepStartTime,
          taskExecutionTime: taskEnd - taskStart,
          memoryUsage: await getMemoryUsage()
        });
      }

      // Verify performance doesn't degrade significantly with scale
      const baselinePerf = performanceResults[0];
      const maxScalePerf = performanceResults[performanceResults.length - 1];

      // Task execution time shouldn't increase by more than 50%
      expect(maxScalePerf.taskExecutionTime).toBeLessThan(baselinePerf.taskExecutionTime * 1.5);
      
      // Memory usage should scale linearly (not exponentially)
      const memoryGrowthRatio = maxScalePerf.memoryUsage / baselinePerf.memoryUsage;
      const agentCountRatio = maxScalePerf.agentCount / baselinePerf.agentCount;
      expect(memoryGrowthRatio).toBeLessThan(agentCountRatio * 1.2); // Within 20% of linear
    });
  });

  describe('Memory and Resource Management', () => {
    test('should maintain memory usage under 2GB limit', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const memoryReadings = [];

      // Create intensive workload
      const heavyWorkload = Array.from({ length: 100 }, (_, i) => ({
        id: `memory-test-${i}`,
        type: 'memory-intensive',
        data: Buffer.alloc(10 * 1024 * 1024), // 10MB per task
        processLargeDataset: true
      }));

      // Process workload while monitoring memory
      for (let i = 0; i < heavyWorkload.length; i++) {
        await swarmCoordinator.processTask(testSwarmId, heavyWorkload[i]);
        
        if (i % 10 === 0) {
          const currentMemory = process.memoryUsage().heapUsed;
          memoryReadings.push(currentMemory);
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
      }

      const maxMemory = Math.max(...memoryReadings);
      const memoryIncrease = maxMemory - initialMemory;
      const maxMemoryMB = maxMemory / (1024 * 1024);

      expect(maxMemoryMB).toBeLessThan(2048); // <2GB total
      expect(memoryIncrease).toBeLessThan(1024 * 1024 * 1024); // <1GB increase
    });

    test('should handle memory leaks and cleanup efficiently', async () => {
      const iterations = 50;
      const memoryReadings = [];

      for (let i = 0; i < iterations; i++) {
        // Create and destroy resources
        const tempAgents = await Promise.all(
          Array.from({ length: 5 }, (_, j) =>
            agentOrchestrator.spawnAgent({
              swarmId: testSwarmId,
              type: 'coder',
              name: `temp-agent-${i}-${j}`
            })
          )
        );

        // Process some tasks
        await Promise.all(
          tempAgents.map(agent =>
            agentOrchestrator.executeTask({
              agentId: agent.id,
              action: 'memory-test',
              params: { data: new Array(1000).fill('test-data') }
            })
          )
        );

        // Cleanup
        await Promise.all(
          tempAgents.map(agent => agentOrchestrator.terminateAgent(agent.id))
        );

        // Record memory usage
        if (i % 5 === 0) {
          if (global.gc) global.gc();
          memoryReadings.push(process.memoryUsage().heapUsed);
        }
      }

      // Check for memory growth trend
      const initialMemory = memoryReadings[0];
      const finalMemory = memoryReadings[memoryReadings.length - 1];
      const memoryGrowth = (finalMemory - initialMemory) / initialMemory;

      // Memory growth should be minimal (<20%)
      expect(memoryGrowth).toBeLessThan(0.2);
    });

    test('should handle resource contention gracefully', async () => {
      const concurrentWorkloads = Array.from({ length: 10 }, (_, i) => ({
        name: `workload-${i}`,
        tasks: Array.from({ length: 20 }, (_, j) => ({
          id: `contention-task-${i}-${j}`,
          type: 'resource-intensive',
          cpuIntensive: true,
          memoryIntensive: true
        }))
      }));

      const startTime = performance.now();
      const workloadPromises = concurrentWorkloads.map(workload =>
        swarmCoordinator.processWorkload(testSwarmId, workload)
      );

      const results = await Promise.allSettled(workloadPromises);
      const endTime = performance.now();

      const successfulWorkloads = results.filter(r => r.status === 'fulfilled').length;
      const totalTime = endTime - startTime;

      // Should handle most workloads despite contention
      expect(successfulWorkloads).toBeGreaterThan(7); // >70% success
      expect(totalTime).toBeLessThan(120000); // <2 minutes

      // System should remain responsive
      const healthCheck = await request.get('/health').expect(200);
      expect(healthCheck.body.status).toBe('healthy');
    });
  });

  describe('Database Performance', () => {
    test('should handle concurrent database operations', async () => {
      const concurrentOperations = 200;
      const operations = [
        () => request.post('/api/v1/agent-posts').send({
          content: 'Performance test post',
          author: 'perf-test-user'
        }),
        () => request.get('/api/v1/agent-posts?limit=50'),
        () => request.post('/api/v1/comments').send({
          content: 'Test comment',
          postId: 'test-post-id'
        }),
        () => request.get('/api/v1/comments?postId=test-post-id')
      ];

      const startTime = performance.now();
      const promises = Array.from({ length: concurrentOperations }, () => {
        const operation = operations[Math.floor(Math.random() * operations.length)];
        return operation();
      });

      const results = await Promise.allSettled(promises);
      const endTime = performance.now();

      const successfulOps = results.filter(r => 
        r.status === 'fulfilled' && (r.value as any).status < 400
      ).length;
      
      const totalTime = endTime - startTime;
      const dbThroughput = (successfulOps / totalTime) * 1000;

      expect(successfulOps).toBeGreaterThan(180); // >90% success rate
      expect(dbThroughput).toBeGreaterThan(10); // >10 ops/second
      expect(totalTime).toBeLessThan(30000); // <30 seconds
    });

    test('should maintain query performance with large datasets', async () => {
      // Insert large dataset first
      const largeBatch = Array.from({ length: 10000 }, (_, i) => ({
        content: `Performance test post ${i}`,
        author: 'perf-test-user',
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 30) // Random within 30 days
      }));

      // Batch insert
      await request
        .post('/api/v1/agent-posts/bulk')
        .send({ posts: largeBatch })
        .expect(200);

      // Test various query patterns
      const queryTests = [
        { name: 'simple-select', query: '/api/v1/agent-posts?limit=100' },
        { name: 'filtered-search', query: '/api/v1/agent-posts?author=perf-test-user&limit=100' },
        { name: 'date-range', query: '/api/v1/agent-posts?fromDate=2024-01-01&limit=100' },
        { name: 'full-text-search', query: '/api/v1/search?q=performance&type=posts&limit=100' },
        { name: 'aggregation', query: '/api/v1/agent-posts/stats' }
      ];

      const queryResults = [];
      for (const queryTest of queryTests) {
        const startTime = performance.now();
        const response = await request.get(queryTest.query).expect(200);
        const endTime = performance.now();
        
        queryResults.push({
          name: queryTest.name,
          responseTime: endTime - startTime,
          resultCount: Array.isArray(response.body) ? response.body.length : 1
        });
      }

      // All queries should complete within acceptable time
      queryResults.forEach(result => {
        expect(result.responseTime).toBeLessThan(5000); // <5 seconds per query
      });

      // Complex queries shouldn't be more than 3x slower than simple ones
      const simpleQuery = queryResults.find(r => r.name === 'simple-select');
      const complexQuery = queryResults.find(r => r.name === 'full-text-search');
      
      expect(complexQuery.responseTime).toBeLessThan(simpleQuery.responseTime * 3);
    });
  });

  describe('Stress Testing and Breaking Points', () => {
    test('should identify system breaking points gracefully', async () => {
      const stressLevels = [50, 100, 200, 500, 1000];
      const breakingPointResults = [];

      for (const stressLevel of stressLevels) {
        try {
          const stressResult = await runStressTest({
            concurrentUsers: stressLevel,
            duration: 30000, // 30 seconds
            rampUpTime: 5000,
            requestsPerSecond: stressLevel / 5,
            endpoint: '/api/v1/agent-posts'
          });

          breakingPointResults.push({
            level: stressLevel,
            success: true,
            metrics: stressResult
          });

          // If error rate > 20%, consider this a breaking point
          if (stressResult.errorRate > 0.2) {
            break;
          }
        } catch (error) {
          breakingPointResults.push({
            level: stressLevel,
            success: false,
            error: error.message
          });
          break;
        }
      }

      // Should handle at least moderate load (100 concurrent users)
      expect(breakingPointResults.length).toBeGreaterThan(1);
      expect(breakingPointResults[1].success).toBe(true);

      // System should degrade gracefully, not crash
      const lastResult = breakingPointResults[breakingPointResults.length - 1];
      if (!lastResult.success) {
        expect(lastResult.error).not.toContain('crash');
        expect(lastResult.error).not.toContain('fatal');
      }
    });

    test('should recover after stress conditions', async () => {
      // Apply heavy stress
      await runStressTest({
        concurrentUsers: 500,
        duration: 60000,
        rampUpTime: 10000,
        requestsPerSecond: 100,
        endpoint: '/api/v1/agent-posts'
      }).catch(() => {}); // Ignore stress test failures

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 30000));

      // Test recovery with normal load
      const recoveryResult = await runStressTest({
        concurrentUsers: 50,
        duration: 30000,
        rampUpTime: 5000,
        requestsPerSecond: 10,
        endpoint: '/api/v1/agent-posts'
      });

      expect(recoveryResult.errorRate).toBeLessThan(0.1); // <10% error rate
      expect(recoveryResult.averageResponseTime).toBeLessThan(3000); // <3s average

      // System health should be restored
      const healthCheck = await request.get('/health').expect(200);
      expect(healthCheck.body.status).toBe('healthy');
    });
  });

  // Helper functions
  async function runLoadTest(config: StressTestConfig): Promise<LoadTestResult> {
    const results: number[] = [];
    const errors: any[] = [];
    const startTime = performance.now();

    // Simulate ramped load
    const totalRequests = (config.duration / 1000) * config.requestsPerSecond;
    const requestInterval = 1000 / config.requestsPerSecond;

    const promises = [];
    for (let i = 0; i < totalRequests; i++) {
      const delay = (i * requestInterval) + (Math.random() * config.rampUpTime);
      
      const promise = new Promise(async (resolve) => {
        await new Promise(r => setTimeout(r, delay));
        
        const requestStart = performance.now();
        try {
          const response = config.payload
            ? await request.post(config.endpoint).send(config.payload)
            : await request.get(config.endpoint);
          
          const requestEnd = performance.now();
          results.push(requestEnd - requestStart);
          resolve({ success: true, responseTime: requestEnd - requestStart });
        } catch (error) {
          errors.push(error);
          resolve({ success: false, error });
        }
      });

      promises.push(promise);
    }

    await Promise.all(promises);
    const endTime = performance.now();

    // Calculate metrics
    results.sort((a, b) => a - b);
    const totalTime = endTime - startTime;

    return {
      averageResponseTime: results.reduce((a, b) => a + b, 0) / results.length,
      p50ResponseTime: results[Math.floor(results.length * 0.5)],
      p95ResponseTime: results[Math.floor(results.length * 0.95)],
      p99ResponseTime: results[Math.floor(results.length * 0.99)],
      maxResponseTime: Math.max(...results),
      totalRequests: totalRequests,
      successfulRequests: results.length,
      errorRate: errors.length / totalRequests,
      throughput: (results.length / totalTime) * 1000,
      memoryPeak: await getMemoryUsage()
    };
  }

  async function runStressTest(config: StressTestConfig): Promise<LoadTestResult> {
    return runLoadTest(config);
  }

  async function collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      responseTime: 0, // Will be measured per request
      memoryUsage: memoryUsage.heapUsed,
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      throughput: 0, // Will be calculated
      errorRate: 0, // Will be calculated
      timestamp: Date.now()
    };
  }

  async function getMemoryUsage(): Promise<number> {
    return process.memoryUsage().heapUsed;
  }
});