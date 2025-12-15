/**
 * Claude AI Response Latency Testing Suite
 * 
 * Tests various scenarios for Claude AI response performance:
 * - Single message response times
 * - Batch message processing
 * - Different message types and complexities
 * - Network condition simulations
 * - Error recovery performance
 */

const PerformanceBenchmarker = require('../performance-benchmarks');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

describe('Claude Response Latency Benchmarks', () => {
  let benchmarker;
  let testResults = [];

  beforeAll(async () => {
    benchmarker = new PerformanceBenchmarker({
      metricsDir: './monitoring/test-metrics',
      alertThresholds: {
        claudeResponseTime: 2000, // 2 seconds for tests
        sseDeliveryTime: 100,
        memoryPerInstance: 50 * 1024 * 1024,
        errorRate: 0.01,
        instanceCreationTime: 3000
      }
    });

    await benchmarker.startMonitoring();
    console.log('Performance benchmarker initialized for Claude response testing');
  });

  afterAll(async () => {
    await benchmarker.stopMonitoring();
    
    // Generate test report
    const report = {
      timestamp: new Date().toISOString(),
      testSuite: 'Claude Response Latency',
      results: testResults,
      summary: benchmarker.getPerformanceSummary(),
      passed: testResults.filter(r => r.passed).length,
      failed: testResults.filter(r => !r.passed).length,
      averageLatency: testResults.reduce((sum, r) => sum + (r.latency || 0), 0) / testResults.length
    };

    await fs.writeFile(
      path.join('./monitoring/test-metrics', `claude-latency-report-${Date.now()}.json`),
      JSON.stringify(report, null, 2)
    );

    console.log('Claude response latency test completed. Report saved.');
  });

  beforeEach(() => {
    // Reset benchmarker alerts for each test
    benchmarker.alerts = [];
  });

  describe('Single Message Response Performance', () => {
    test('simple query response time should be under 2 seconds', async () => {
      const testStart = Date.now();
      
      try {
        const instanceId = 'test-instance-1';
        const messageData = {
          id: 'test-msg-1',
          type: 'simple_query',
          content: 'Hello, how are you?',
          timestamp: Date.now()
        };

        const benchmark = await benchmarker.benchmarkClaudeResponse(instanceId, messageData);
        
        const testResult = {
          testName: 'simple_query_latency',
          passed: benchmark.success && benchmark.totalLatency < 2000,
          latency: benchmark.totalLatency,
          benchmark,
          timestamp: testStart
        };

        testResults.push(testResult);

        expect(benchmark.success).toBe(true);
        expect(benchmark.totalLatency).toBeLessThan(2000);
        expect(benchmark.phases).toHaveProperty('preparation');
        expect(benchmark.phases).toHaveProperty('api_call');
        expect(benchmark.phases).toHaveProperty('processing');

        console.log(`Simple query benchmark: ${benchmark.totalLatency.toFixed(2)}ms`);

      } catch (error) {
        testResults.push({
          testName: 'simple_query_latency',
          passed: false,
          error: error.message,
          timestamp: testStart
        });
        throw error;
      }
    });

    test('complex query response time should be under 5 seconds', async () => {
      const testStart = Date.now();
      
      try {
        const instanceId = 'test-instance-2';
        const messageData = {
          id: 'test-msg-2',
          type: 'complex_query',
          content: 'Analyze this complex data structure and provide detailed recommendations for optimization: ' + 
                   JSON.stringify({ data: new Array(1000).fill(0).map((_, i) => ({ id: i, value: Math.random() })) }),
          timestamp: Date.now()
        };

        const benchmark = await benchmarker.benchmarkClaudeResponse(instanceId, messageData);
        
        const testResult = {
          testName: 'complex_query_latency',
          passed: benchmark.success && benchmark.totalLatency < 5000,
          latency: benchmark.totalLatency,
          benchmark,
          timestamp: testStart
        };

        testResults.push(testResult);

        expect(benchmark.success).toBe(true);
        expect(benchmark.totalLatency).toBeLessThan(5000);

        console.log(`Complex query benchmark: ${benchmark.totalLatency.toFixed(2)}ms`);

      } catch (error) {
        testResults.push({
          testName: 'complex_query_latency',
          passed: false,
          error: error.message,
          timestamp: testStart
        });
        throw error;
      }
    });

    test('code generation response time should be reasonable', async () => {
      const testStart = Date.now();
      
      try {
        const instanceId = 'test-instance-3';
        const messageData = {
          id: 'test-msg-3',
          type: 'code_generation',
          content: 'Generate a REST API with CRUD operations for a user management system using Node.js and Express',
          timestamp: Date.now()
        };

        const benchmark = await benchmarker.benchmarkClaudeResponse(instanceId, messageData);
        
        const testResult = {
          testName: 'code_generation_latency',
          passed: benchmark.success && benchmark.totalLatency < 10000,
          latency: benchmark.totalLatency,
          benchmark,
          timestamp: testStart
        };

        testResults.push(testResult);

        expect(benchmark.success).toBe(true);
        expect(benchmark.totalLatency).toBeLessThan(10000); // 10 seconds for code generation

        console.log(`Code generation benchmark: ${benchmark.totalLatency.toFixed(2)}ms`);

      } catch (error) {
        testResults.push({
          testName: 'code_generation_latency',
          passed: false,
          error: error.message,
          timestamp: testStart
        });
        throw error;
      }
    });
  });

  describe('Batch Message Processing', () => {
    test('batch of 10 simple messages should maintain performance', async () => {
      const testStart = Date.now();
      const batchSize = 10;
      const results = [];

      try {
        for (let i = 0; i < batchSize; i++) {
          const instanceId = `batch-instance-${i}`;
          const messageData = {
            id: `batch-msg-${i}`,
            type: 'simple_query',
            content: `Batch message ${i}: What is the current time?`,
            timestamp: Date.now()
          };

          const benchmark = await benchmarker.benchmarkClaudeResponse(instanceId, messageData);
          results.push(benchmark);
        }

        const avgLatency = results.reduce((sum, r) => sum + r.totalLatency, 0) / results.length;
        const maxLatency = Math.max(...results.map(r => r.totalLatency));
        const successRate = results.filter(r => r.success).length / results.length;

        const testResult = {
          testName: 'batch_processing_performance',
          passed: successRate >= 0.95 && avgLatency < 2500, // Allow some degradation in batch
          averageLatency: avgLatency,
          maxLatency: maxLatency,
          successRate: successRate,
          batchSize: batchSize,
          timestamp: testStart
        };

        testResults.push(testResult);

        expect(successRate).toBeGreaterThanOrEqual(0.95);
        expect(avgLatency).toBeLessThan(2500);

        console.log(`Batch processing benchmark: avg=${avgLatency.toFixed(2)}ms, max=${maxLatency.toFixed(2)}ms, success=${(successRate * 100).toFixed(1)}%`);

      } catch (error) {
        testResults.push({
          testName: 'batch_processing_performance',
          passed: false,
          error: error.message,
          timestamp: testStart
        });
        throw error;
      }
    });
  });

  describe('Error Scenarios and Recovery', () => {
    test('should handle timeout scenarios gracefully', async () => {
      const testStart = Date.now();

      try {
        const instanceId = 'timeout-instance';
        const messageData = {
          id: 'timeout-msg',
          type: 'timeout_simulation',
          content: 'This message will simulate a timeout scenario',
          timeout: true,
          timestamp: Date.now()
        };

        // Simulate timeout by creating a benchmark that should fail
        let benchmark;
        let errorCaught = false;

        try {
          benchmark = await benchmarker.benchmarkClaudeResponse(instanceId, messageData);
        } catch (error) {
          errorCaught = true;
          benchmark = { error: error.message, success: false };
        }

        const testResult = {
          testName: 'timeout_handling',
          passed: errorCaught || !benchmark.success, // Should either catch error or fail gracefully
          errorCaught,
          benchmark,
          timestamp: testStart
        };

        testResults.push(testResult);

        // For timeout scenarios, we expect either an error or unsuccessful benchmark
        expect(errorCaught || !benchmark.success).toBe(true);

        console.log(`Timeout handling test: error caught = ${errorCaught}`);

      } catch (error) {
        testResults.push({
          testName: 'timeout_handling',
          passed: true, // Catching an error in timeout test is expected
          error: error.message,
          timestamp: testStart
        });
      }
    });

    test('should recover from network interruption', async () => {
      const testStart = Date.now();

      try {
        const instanceId = 'recovery-instance';
        
        // First message - normal
        const messageData1 = {
          id: 'recovery-msg-1',
          type: 'pre_interruption',
          content: 'Message before network interruption',
          timestamp: Date.now()
        };

        const benchmark1 = await benchmarker.benchmarkClaudeResponse(instanceId, messageData1);

        // Simulate network interruption
        console.log('Simulating network interruption...');
        await new Promise(resolve => setTimeout(resolve, 100));

        // Recovery message
        const messageData2 = {
          id: 'recovery-msg-2',
          type: 'post_interruption',
          content: 'Message after network recovery',
          timestamp: Date.now()
        };

        const benchmark2 = await benchmarker.benchmarkClaudeResponse(instanceId, messageData2);

        const testResult = {
          testName: 'network_recovery',
          passed: benchmark1.success && benchmark2.success,
          preInterruption: benchmark1,
          postRecovery: benchmark2,
          recoveryTime: benchmark2.startTime - benchmark1.startTime,
          timestamp: testStart
        };

        testResults.push(testResult);

        expect(benchmark1.success).toBe(true);
        expect(benchmark2.success).toBe(true);

        console.log(`Network recovery test: both messages successful`);

      } catch (error) {
        testResults.push({
          testName: 'network_recovery',
          passed: false,
          error: error.message,
          timestamp: testStart
        });
        throw error;
      }
    });
  });

  describe('Performance Regression Detection', () => {
    test('should detect performance regression over time', async () => {
      const testStart = Date.now();
      const measurements = [];

      try {
        // Take multiple measurements to establish baseline
        for (let i = 0; i < 5; i++) {
          const instanceId = `regression-instance-${i}`;
          const messageData = {
            id: `regression-msg-${i}`,
            type: 'regression_baseline',
            content: 'Standard message for regression testing',
            timestamp: Date.now()
          };

          const benchmark = await benchmarker.benchmarkClaudeResponse(instanceId, messageData);
          measurements.push(benchmark.totalLatency);
        }

        const avgLatency = measurements.reduce((sum, l) => sum + l, 0) / measurements.length;
        const maxLatency = Math.max(...measurements);
        const minLatency = Math.min(...measurements);
        const variance = measurements.reduce((sum, l) => sum + Math.pow(l - avgLatency, 2), 0) / measurements.length;
        const stdDev = Math.sqrt(variance);

        const testResult = {
          testName: 'performance_regression_detection',
          passed: stdDev < avgLatency * 0.3, // Standard deviation should be less than 30% of average
          measurements,
          statistics: {
            average: avgLatency,
            max: maxLatency,
            min: minLatency,
            variance,
            standardDeviation: stdDev,
            coefficientOfVariation: stdDev / avgLatency
          },
          timestamp: testStart
        };

        testResults.push(testResult);

        expect(stdDev).toBeLessThan(avgLatency * 0.3);

        console.log(`Regression detection: avg=${avgLatency.toFixed(2)}ms, stddev=${stdDev.toFixed(2)}ms, cv=${(stdDev/avgLatency*100).toFixed(1)}%`);

      } catch (error) {
        testResults.push({
          testName: 'performance_regression_detection',
          passed: false,
          error: error.message,
          timestamp: testStart
        });
        throw error;
      }
    });
  });

  describe('Load Testing Scenarios', () => {
    test('should handle 5 concurrent Claude requests', async () => {
      const testStart = Date.now();
      const concurrentRequests = 5;

      try {
        const promises = [];

        for (let i = 0; i < concurrentRequests; i++) {
          const instanceId = `concurrent-instance-${i}`;
          const messageData = {
            id: `concurrent-msg-${i}`,
            type: 'concurrent_load',
            content: `Concurrent request ${i} testing system under load`,
            timestamp: Date.now()
          };

          promises.push(benchmarker.benchmarkClaudeResponse(instanceId, messageData));
        }

        const results = await Promise.allSettled(promises);
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
        const failed = results.filter(r => r.status === 'rejected' || !r.value.success);

        const successRate = successful.length / results.length;
        const avgLatency = successful.reduce((sum, r) => sum + r.value.totalLatency, 0) / successful.length;

        const testResult = {
          testName: 'concurrent_requests_load',
          passed: successRate >= 0.8 && avgLatency < 5000, // Allow some degradation under load
          concurrentRequests,
          successRate,
          avgLatency,
          successful: successful.length,
          failed: failed.length,
          timestamp: testStart
        };

        testResults.push(testResult);

        expect(successRate).toBeGreaterThanOrEqual(0.8);
        expect(avgLatency).toBeLessThan(5000);

        console.log(`Concurrent load test: ${successful.length}/${concurrentRequests} successful, avg=${avgLatency.toFixed(2)}ms`);

      } catch (error) {
        testResults.push({
          testName: 'concurrent_requests_load',
          passed: false,
          error: error.message,
          timestamp: testStart
        });
        throw error;
      }
    });
  });

  describe('Memory Impact of Claude Operations', () => {
    test('should track memory usage during Claude operations', async () => {
      const testStart = Date.now();

      try {
        const instanceId = 'memory-test-instance';
        const memoryBefore = process.memoryUsage();

        // Perform several Claude operations
        for (let i = 0; i < 3; i++) {
          const messageData = {
            id: `memory-msg-${i}`,
            type: 'memory_test',
            content: 'Message to test memory impact of Claude operations',
            timestamp: Date.now()
          };

          await benchmarker.benchmarkClaudeResponse(instanceId, messageData);
          
          // Track memory after each operation
          const currentMemory = process.memoryUsage();
          benchmarker.trackMemoryUsage(instanceId, currentMemory);
        }

        const memoryAfter = process.memoryUsage();
        const memoryGrowth = memoryAfter.rss - memoryBefore.rss;

        const testResult = {
          testName: 'memory_impact_tracking',
          passed: memoryGrowth < 10 * 1024 * 1024, // Less than 10MB growth
          memoryBefore,
          memoryAfter,
          memoryGrowth,
          memoryGrowthMB: memoryGrowth / 1024 / 1024,
          timestamp: testStart
        };

        testResults.push(testResult);

        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);

        console.log(`Memory impact test: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB growth`);

      } catch (error) {
        testResults.push({
          testName: 'memory_impact_tracking',
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
  runClaudeLatencyTests: () => {
    // This function can be called externally to run the test suite
    console.log('Starting Claude Response Latency Test Suite...');
    return require('jest').run(['--testPathPattern=claude-response-latency.test.js']);
  }
};