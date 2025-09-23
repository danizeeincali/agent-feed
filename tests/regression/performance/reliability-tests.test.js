/**
 * Performance and Reliability Regression Tests
 * Tests system performance, scalability, and reliability under various conditions
 */

const request = require('supertest');
const { performance } = require('perf_hooks');

describe('Performance and Reliability Regression Tests', () => {
  let baseUrl;

  beforeAll(() => {
    baseUrl = global.testConfig.apiUrl;
  });

  describe('API Performance Tests', () => {
    test('should respond within acceptable time limits', async () => {
      const maxResponseTime = 2000; // 2 seconds
      const requestCount = 10;
      const responseTimes = [];

      for (let i = 0; i < requestCount; i++) {
        const startTime = performance.now();

        const response = await request(baseUrl)
          .get('/agents')
          .timeout(5000);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        expect(response.status).toBe(200);
        expect(responseTime).toBeLessThan(maxResponseTime);

        responseTimes.push(responseTime);
      }

      // Calculate performance metrics
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTimeActual = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      expect(avgResponseTime).toBeLessThan(maxResponseTime);
      expect(maxResponseTimeActual).toBeLessThan(maxResponseTime * 2); // Allow some variance

      console.log(`Performance metrics - Avg: ${avgResponseTime.toFixed(2)}ms, Max: ${maxResponseTimeActual.toFixed(2)}ms, Min: ${minResponseTime.toFixed(2)}ms`);
    });

    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 20;
      const maxTotalTime = 5000; // 5 seconds for all requests

      const startTime = performance.now();

      const requests = Array.from({ length: concurrentRequests }, () =>
        request(baseUrl)
          .get('/agents')
          .timeout(10000)
      );

      const responses = await Promise.all(requests);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(maxTotalTime);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toBeValidApiResponse();
      });

      console.log(`Concurrent requests completed in ${totalTime.toFixed(2)}ms`);
    });

    test('should maintain performance under stress', async () => {
      const stressTestDuration = 10000; // 10 seconds
      const requestInterval = 100; // Request every 100ms
      const maxFailureRate = 0.05; // 5% failure rate acceptable

      const results = [];
      const startTime = Date.now();

      while (Date.now() - startTime < stressTestDuration) {
        const requestStart = performance.now();

        try {
          const response = await request(baseUrl)
            .get('/agents')
            .timeout(3000);

          const requestEnd = performance.now();

          results.push({
            success: response.status === 200,
            responseTime: requestEnd - requestStart,
            status: response.status
          });
        } catch (error) {
          results.push({
            success: false,
            responseTime: null,
            error: error.message
          });
        }

        await global.testUtils.delay(requestInterval);
      }

      // Analyze results
      const successfulRequests = results.filter(r => r.success);
      const failureRate = (results.length - successfulRequests.length) / results.length;

      expect(failureRate).toBeLessThan(maxFailureRate);
      expect(successfulRequests.length).toBeGreaterThan(0);

      const avgResponseTime = successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length;
      expect(avgResponseTime).toBeLessThan(3000); // Should maintain reasonable response times

      console.log(`Stress test results - Requests: ${results.length}, Success rate: ${((1 - failureRate) * 100).toFixed(2)}%, Avg response: ${avgResponseTime.toFixed(2)}ms`);
    });

    test('should handle memory efficiently during long-running operations', async () => {
      const initialMemory = process.memoryUsage();
      const iterationCount = 100;

      for (let i = 0; i < iterationCount; i++) {
        const response = await request(baseUrl).get('/agents');
        expect(response.status).toBe(200);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Check memory usage periodically
        if (i % 20 === 0) {
          const currentMemory = process.memoryUsage();
          const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed;

          // Memory increase should be reasonable (less than 100MB)
          expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
        }
      }

      const finalMemory = process.memoryUsage();
      const totalMemoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      console.log(`Memory usage - Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB, Increase: ${(totalMemoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Scalability Tests', () => {
    test('should scale with increasing data volumes', async () => {
      // This test simulates increasing data by making multiple requests
      // and measuring if performance degrades
      const testSizes = [1, 5, 10, 20];
      const performanceResults = [];

      for (const size of testSizes) {
        const requests = Array.from({ length: size }, () =>
          request(baseUrl).get('/agents')
        );

        const startTime = performance.now();
        const responses = await Promise.all(requests);
        const endTime = performance.now();

        const totalTime = endTime - startTime;
        const avgTimePerRequest = totalTime / size;

        // All requests should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });

        performanceResults.push({
          size,
          totalTime,
          avgTimePerRequest
        });

        console.log(`Scale test ${size} requests: ${totalTime.toFixed(2)}ms total, ${avgTimePerRequest.toFixed(2)}ms average`);
      }

      // Performance should not degrade significantly with scale
      const firstAvg = performanceResults[0].avgTimePerRequest;
      const lastAvg = performanceResults[performanceResults.length - 1].avgTimePerRequest;

      // Last average should not be more than 3x the first
      expect(lastAvg).toBeLessThan(firstAvg * 3);
    });

    test('should handle large response payloads efficiently', async () => {
      const response = await request(baseUrl).get('/agents');
      expect(response.status).toBe(200);

      const responseSize = JSON.stringify(response.body).length;
      console.log(`Response payload size: ${(responseSize / 1024).toFixed(2)}KB`);

      // Response should be processed efficiently regardless of size
      expect(response.body).toBeValidApiResponse();

      // Very large responses (>1MB) might indicate a problem
      expect(responseSize).toBeLessThan(1024 * 1024); // 1MB limit
    });

    test('should maintain consistent performance across multiple sessions', async () => {
      const sessionCount = 5;
      const requestsPerSession = 10;
      const sessionResults = [];

      for (let session = 0; session < sessionCount; session++) {
        const sessionStart = performance.now();

        const sessionRequests = Array.from({ length: requestsPerSession }, () =>
          request(baseUrl).get('/agents')
        );

        const responses = await Promise.all(sessionRequests);
        const sessionEnd = performance.now();

        const sessionTime = sessionEnd - sessionStart;
        const avgSessionTime = sessionTime / requestsPerSession;

        // All requests should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });

        sessionResults.push({
          session,
          sessionTime,
          avgSessionTime
        });
      }

      // Calculate variance in performance across sessions
      const avgTimes = sessionResults.map(r => r.avgSessionTime);
      const overallAvg = avgTimes.reduce((sum, time) => sum + time, 0) / avgTimes.length;
      const variance = avgTimes.reduce((sum, time) => sum + Math.pow(time - overallAvg, 2), 0) / avgTimes.length;
      const standardDeviation = Math.sqrt(variance);

      // Standard deviation should be reasonable (less than 50% of average)
      expect(standardDeviation).toBeLessThan(overallAvg * 0.5);

      console.log(`Session consistency - Avg: ${overallAvg.toFixed(2)}ms, StdDev: ${standardDeviation.toFixed(2)}ms`);
    });
  });

  describe('Reliability Tests', () => {
    test('should recover from temporary failures', async () => {
      let failureInjected = false;

      // Simulate temporary failure
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation((...args) => {
        if (!failureInjected) {
          failureInjected = true;
          return Promise.reject(new Error('Temporary network failure'));
        }
        return originalFetch(...args);
      });

      try {
        // First request should fail
        await expect(request(baseUrl).get('/agents')).rejects.toThrow();

        // Subsequent requests should succeed
        const response = await request(baseUrl).get('/agents');
        expect(response.status).toBe(200);
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('should handle resource exhaustion gracefully', async () => {
      // Simulate resource exhaustion by making many concurrent requests
      const overloadRequests = 50;
      const timeout = 30000; // 30 seconds

      const requests = Array.from({ length: overloadRequests }, () =>
        request(baseUrl)
          .get('/agents')
          .timeout(timeout)
      );

      const results = await Promise.allSettled(requests);

      // Some requests may fail under overload, but system should not crash
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const failed = results.filter(r => r.status === 'rejected' || r.value?.status !== 200);

      // At least some requests should succeed
      expect(successful.length).toBeGreaterThan(0);

      console.log(`Resource exhaustion test - Successful: ${successful.length}, Failed: ${failed.length}`);

      // System should still be responsive after overload
      const recoveryResponse = await request(baseUrl).get('/agents');
      expect(recoveryResponse.status).toBe(200);
    });

    test('should maintain data consistency under concurrent access', async () => {
      const concurrentReads = 10;

      const requests = Array.from({ length: concurrentReads }, () =>
        request(baseUrl).get('/agents')
      );

      const responses = await Promise.all(requests);

      // All responses should be successful
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toBeValidApiResponse();
      });

      // Data should be consistent across all responses
      const firstResponseData = responses[0].body.data;
      responses.slice(1).forEach(response => {
        expect(response.body.data.length).toBe(firstResponseData.length);

        // Agent IDs should be the same
        const firstIds = firstResponseData.map(a => a.id).sort();
        const responseIds = response.body.data.map(a => a.id).sort();
        expect(responseIds).toEqual(firstIds);
      });
    });

    test('should handle edge cases and boundary conditions', async () => {
      const edgeCases = [
        { name: 'Empty accept header', headers: { 'Accept': '' } },
        { name: 'Unusual content type', headers: { 'Content-Type': 'application/x-custom' } },
        { name: 'Large header value', headers: { 'X-Large-Header': 'x'.repeat(1000) } },
        { name: 'Multiple accept types', headers: { 'Accept': 'application/json, text/plain, */*' } },
        { name: 'Case insensitive headers', headers: { 'CONTENT-TYPE': 'application/json' } }
      ];

      for (const edgeCase of edgeCases) {
        const response = await request(baseUrl)
          .get('/agents')
          .set(edgeCase.headers);

        // Should handle edge cases gracefully
        expect(response.status).toBe(200);
        expect(response.body).toBeValidApiResponse();

        console.log(`Edge case handled: ${edgeCase.name}`);
      }
    });

    test('should maintain uptime during extended operation', async () => {
      const testDuration = 30000; // 30 seconds
      const checkInterval = 2000; // Check every 2 seconds
      const startTime = Date.now();
      const uptimeChecks = [];

      while (Date.now() - startTime < testDuration) {
        const checkStart = performance.now();

        try {
          const response = await request(baseUrl)
            .get('/agents')
            .timeout(5000);

          const checkEnd = performance.now();

          uptimeChecks.push({
            timestamp: Date.now(),
            success: response.status === 200,
            responseTime: checkEnd - checkStart
          });
        } catch (error) {
          uptimeChecks.push({
            timestamp: Date.now(),
            success: false,
            error: error.message
          });
        }

        await global.testUtils.delay(checkInterval);
      }

      // Calculate uptime percentage
      const successfulChecks = uptimeChecks.filter(check => check.success);
      const uptimePercentage = (successfulChecks.length / uptimeChecks.length) * 100;

      // Should maintain high uptime (>95%)
      expect(uptimePercentage).toBeGreaterThan(95);

      console.log(`Uptime test - ${uptimePercentage.toFixed(2)}% uptime over ${testDuration / 1000} seconds`);
    });
  });

  describe('Resource Utilization Tests', () => {
    test('should handle file system operations efficiently', async () => {
      // This test focuses on the file-based agent discovery
      const fileSystemTestCount = 20;
      const fileSystemTimes = [];

      for (let i = 0; i < fileSystemTestCount; i++) {
        const startTime = performance.now();

        const response = await request(baseUrl).get('/agents');
        expect(response.status).toBe(200);

        const endTime = performance.now();
        fileSystemTimes.push(endTime - startTime);
      }

      const avgFileSystemTime = fileSystemTimes.reduce((sum, time) => sum + time, 0) / fileSystemTimes.length;

      // File system operations should be reasonably fast
      expect(avgFileSystemTime).toBeLessThan(1000); // Less than 1 second

      console.log(`File system operations average: ${avgFileSystemTime.toFixed(2)}ms`);
    });

    test('should manage memory usage efficiently', async () => {
      const memoryTestCount = 50;
      const memorySnapshots = [];

      for (let i = 0; i < memoryTestCount; i++) {
        const response = await request(baseUrl).get('/agents');
        expect(response.status).toBe(200);

        // Take memory snapshot every 10 requests
        if (i % 10 === 0) {
          const memUsage = process.memoryUsage();
          memorySnapshots.push({
            iteration: i,
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external
          });
        }
      }

      // Memory usage should not grow excessively
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];

      const heapGrowth = lastSnapshot.heapUsed - firstSnapshot.heapUsed;
      const heapGrowthMB = heapGrowth / 1024 / 1024;

      // Heap growth should be reasonable (less than 50MB)
      expect(heapGrowthMB).toBeLessThan(50);

      console.log(`Memory growth over ${memoryTestCount} requests: ${heapGrowthMB.toFixed(2)}MB`);
    });

    test('should handle CPU-intensive operations efficiently', async () => {
      // Simulate CPU-intensive scenario with many concurrent requests
      const cpuTestRequests = 30;
      const cpuTestStart = performance.now();

      const requests = Array.from({ length: cpuTestRequests }, () =>
        request(baseUrl).get('/agents')
      );

      const responses = await Promise.all(requests);
      const cpuTestEnd = performance.now();

      const totalCpuTime = cpuTestEnd - cpuTestStart;
      const avgCpuTimePerRequest = totalCpuTime / cpuTestRequests;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // CPU utilization should be efficient
      expect(avgCpuTimePerRequest).toBeLessThan(500); // Less than 500ms per request on average

      console.log(`CPU test - Total: ${totalCpuTime.toFixed(2)}ms, Avg per request: ${avgCpuTimePerRequest.toFixed(2)}ms`);
    });
  });

  describe('Network Performance Tests', () => {
    test('should handle various network conditions', async () => {
      const networkConditions = [
        { name: 'Normal', delay: 0 },
        { name: 'Slow network', delay: 500 },
        { name: 'Very slow network', delay: 1000 }
      ];

      for (const condition of networkConditions) {
        const startTime = performance.now();

        // Simulate network delay
        if (condition.delay > 0) {
          await global.testUtils.delay(condition.delay);
        }

        const response = await request(baseUrl)
          .get('/agents')
          .timeout(10000);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        expect(response.status).toBe(200);

        console.log(`${condition.name} - Response time: ${responseTime.toFixed(2)}ms`);
      }
    });

    test('should compress responses efficiently', async () => {
      const response = await request(baseUrl)
        .get('/agents')
        .set('Accept-Encoding', 'gzip, deflate');

      expect(response.status).toBe(200);

      // Check if compression is applied (this depends on server configuration)
      const contentEncoding = response.headers['content-encoding'];
      if (contentEncoding) {
        expect(['gzip', 'deflate', 'br']).toContain(contentEncoding);
        console.log(`Response compressed with: ${contentEncoding}`);
      }

      const responseSize = JSON.stringify(response.body).length;
      console.log(`Response size: ${responseSize} bytes`);
    });

    test('should handle keep-alive connections properly', async () => {
      // Make multiple requests in sequence to test connection reuse
      const keepAliveRequests = 5;
      const connectionTimes = [];

      for (let i = 0; i < keepAliveRequests; i++) {
        const startTime = performance.now();

        const response = await request(baseUrl)
          .get('/agents')
          .set('Connection', 'keep-alive');

        const endTime = performance.now();

        expect(response.status).toBe(200);
        connectionTimes.push(endTime - startTime);
      }

      // Later requests should be faster due to connection reuse
      const firstRequestTime = connectionTimes[0];
      const avgLaterRequestTime = connectionTimes.slice(1).reduce((sum, time) => sum + time, 0) / (connectionTimes.length - 1);

      console.log(`Keep-alive test - First: ${firstRequestTime.toFixed(2)}ms, Avg later: ${avgLaterRequestTime.toFixed(2)}ms`);

      // Later requests should generally be faster (allowing some variance)
      expect(avgLaterRequestTime).toBeLessThan(firstRequestTime * 1.5);
    });
  });
});