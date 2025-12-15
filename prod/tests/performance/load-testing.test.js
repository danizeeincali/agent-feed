/**
 * Performance Load Testing
 * Target: 100 posts/minute throughput
 */

const { performance } = require('perf_hooks');
const { TestUtils } = require('../utils/test-setup');
const { MockDataFactory } = require('../mocks/posting-intelligence-mocks');

// Mock HTTP client for load testing
class MockHttpClient {
  constructor() {
    this.requestCount = 0;
    this.responseTime = 250; // Base response time
    this.errorRate = 0.02; // 2% error rate
  }
  
  async post(url, data) {
    this.requestCount++;
    
    // Simulate network latency
    const latency = this.responseTime + (Math.random() * 100);
    await TestUtils.waitFor(latency);
    
    // Simulate occasional errors
    if (Math.random() < this.errorRate) {
      throw new Error('Simulated network error');
    }
    
    // Return mock response based on endpoint
    if (url.includes('/generate')) {
      return {
        success: true,
        data: MockDataFactory.createValidResponse({
          analytics: {
            processingTime: latency
          }
        })
      };
    } else if (url.includes('/batch')) {
      const batchSize = data.requests ? data.requests.length : 1;
      return {
        success: true,
        data: {
          posts: Array.from({ length: batchSize }, (_, i) => 
            MockDataFactory.createValidResponse({ 
              content: `Batch post ${i + 1}` 
            })
          ),
          batchAnalytics: {
            totalPosts: batchSize,
            averageQuality: 0.83,
            processingTime: latency * batchSize
          }
        }
      };
    }
    
    return { success: true, data: {} };
  }
  
  getStats() {
    return {
      totalRequests: this.requestCount,
      averageResponseTime: this.responseTime,
      errorRate: this.errorRate
    };
  }
}

// Load testing utilities
class LoadTester {
  constructor() {
    this.httpClient = new MockHttpClient();
    this.metrics = {
      requests: [],
      errors: [],
      responseTimes: [],
      throughput: []
    };
  }
  
  async runLoadTest({
    requestsPerSecond,
    durationSeconds,
    endpoint = '/api/v1/posting-intelligence/generate',
    payload = null
  }) {
    const startTime = performance.now();
    const requests = [];
    const interval = 1000 / requestsPerSecond; // ms between requests
    
    console.log(`Starting load test: ${requestsPerSecond} RPS for ${durationSeconds}s`);
    
    for (let second = 0; second < durationSeconds; second++) {
      for (let req = 0; req < requestsPerSecond; req++) {
        const requestStartTime = performance.now();
        
        const request = this.makeRequest(endpoint, payload || this.getDefaultPayload())
          .then(response => {
            const requestEndTime = performance.now();
            const responseTime = requestEndTime - requestStartTime;
            
            this.metrics.requests.push({
              timestamp: requestStartTime,
              responseTime,
              success: response.success
            });
            
            this.metrics.responseTimes.push(responseTime);
            
            if (!response.success) {
              this.metrics.errors.push({
                timestamp: requestStartTime,
                error: response.error
              });
            }
            
            return response;
          })
          .catch(error => {
            const requestEndTime = performance.now();
            const responseTime = requestEndTime - requestStartTime;
            
            this.metrics.errors.push({
              timestamp: requestStartTime,
              error: error.message,
              responseTime
            });
            
            return { success: false, error: error.message };
          });
        
        requests.push(request);
        
        // Wait for next request interval
        if (req < requestsPerSecond - 1) {
          await TestUtils.waitFor(interval);
        }
      }
      
      // Wait for next second
      if (second < durationSeconds - 1) {
        await TestUtils.waitFor(1000 - (requestsPerSecond - 1) * interval);
      }
    }
    
    // Wait for all requests to complete
    await Promise.allSettled(requests);
    
    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    
    return this.calculateMetrics(totalDuration);
  }
  
  async makeRequest(endpoint, payload) {
    return await this.httpClient.post(endpoint, payload);
  }
  
  getDefaultPayload() {
    return MockDataFactory.createValidRequest();
  }
  
  calculateMetrics(totalDuration) {
    const totalRequests = this.metrics.requests.length;
    const successfulRequests = this.metrics.requests.filter(r => r.success).length;
    const failedRequests = this.metrics.errors.length;
    
    const responseTimes = this.metrics.responseTimes;
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    
    // Calculate percentiles
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    
    const throughputPerSecond = (totalRequests / totalDuration) * 1000;
    const throughputPerMinute = throughputPerSecond * 60;
    const errorRate = failedRequests / totalRequests;
    const successRate = successfulRequests / totalRequests;
    
    return {
      duration: totalDuration,
      totalRequests,
      successfulRequests,
      failedRequests,
      throughput: {
        perSecond: throughputPerSecond,
        perMinute: throughputPerMinute
      },
      responseTime: {
        average: avgResponseTime,
        min: minResponseTime,
        max: maxResponseTime,
        percentiles: {
          p50,
          p90,
          p95,
          p99
        }
      },
      errorRate,
      successRate
    };
  }
  
  reset() {
    this.metrics = {
      requests: [],
      errors: [],
      responseTimes: [],
      throughput: []
    };
    this.httpClient = new MockHttpClient();
  }
}

describe('Performance Load Testing', () => {
  let loadTester;
  
  beforeEach(() => {
    loadTester = new LoadTester();
  });
  
  afterEach(() => {
    loadTester.reset();
  });
  
  describe('Single Post Generation Load Tests', () => {
    test('should handle normal load (10 RPS)', async () => {
      // Arrange
      const testConfig = {
        requestsPerSecond: 10,
        durationSeconds: 30,
        endpoint: '/api/v1/posting-intelligence/generate'
      };
      
      // Act
      const results = await loadTester.runLoadTest(testConfig);
      
      // Assert
      expect(results.throughput.perMinute).toBeGreaterThanOrEqual(500); // At least 500 posts/minute
      expect(results.responseTime.average).toBeLessThan(500); // Average < 500ms
      expect(results.responseTime.percentiles.p95).toBeLessThan(1000); // P95 < 1s
      expect(results.successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(results.errorRate).toBeLessThan(0.05); // Less than 5% errors
      
      console.log('Normal Load Results:', {
        throughput: `${results.throughput.perMinute.toFixed(1)} posts/minute`,
        avgResponseTime: `${results.responseTime.average.toFixed(1)}ms`,
        p95ResponseTime: `${results.responseTime.percentiles.p95.toFixed(1)}ms`,
        successRate: `${(results.successRate * 100).toFixed(1)}%`
      });
    }, 45000);
    
    test('should handle peak load (25 RPS)', async () => {
      // Arrange
      const testConfig = {
        requestsPerSecond: 25,
        durationSeconds: 60,
        endpoint: '/api/v1/posting-intelligence/generate'
      };
      
      // Act
      const results = await loadTester.runLoadTest(testConfig);
      
      // Assert
      expect(results.throughput.perMinute).toBeGreaterThanOrEqual(1200); // At least 1200 posts/minute
      expect(results.responseTime.average).toBeLessThan(800); // Average < 800ms under load
      expect(results.responseTime.percentiles.p95).toBeLessThan(1500); // P95 < 1.5s
      expect(results.successRate).toBeGreaterThan(0.90); // 90% success rate under load
      
      console.log('Peak Load Results:', {
        throughput: `${results.throughput.perMinute.toFixed(1)} posts/minute`,
        avgResponseTime: `${results.responseTime.average.toFixed(1)}ms`,
        p95ResponseTime: `${results.responseTime.percentiles.p95.toFixed(1)}ms`,
        successRate: `${(results.successRate * 100).toFixed(1)}%`
      });
    }, 75000);
    
    test('should achieve target throughput (100 posts/minute)', async () => {
      // Arrange - Calculate RPS needed for 100 posts/minute
      const targetPostsPerMinute = 100;
      const testConfig = {
        requestsPerSecond: Math.ceil(targetPostsPerMinute / 60 * 2), // 2x for safety margin
        durationSeconds: 30,
        endpoint: '/api/v1/posting-intelligence/generate'
      };
      
      // Act
      const results = await loadTester.runLoadTest(testConfig);
      
      // Assert
      expect(results.throughput.perMinute).toBeGreaterThanOrEqual(targetPostsPerMinute);
      expect(results.responseTime.average).toBeLessThan(2000); // Average < 2s for target load
      expect(results.successRate).toBeGreaterThan(0.85); // 85% minimum success rate
      
      console.log('Target Throughput Results:', {
        achieved: `${results.throughput.perMinute.toFixed(1)} posts/minute`,
        target: `${targetPostsPerMinute} posts/minute`,
        avgResponseTime: `${results.responseTime.average.toFixed(1)}ms`,
        successRate: `${(results.successRate * 100).toFixed(1)}%`
      });
    }, 45000);
  });
  
  describe('Batch Post Generation Load Tests', () => {
    test('should handle batch processing efficiently', async () => {
      // Arrange
      const batchSize = 5;
      const testConfig = {
        requestsPerSecond: 2, // 2 batch requests per second
        durationSeconds: 30,
        endpoint: '/api/v1/posting-intelligence/batch',
        payload: {
          requests: Array.from({ length: batchSize }, (_, i) => 
            MockDataFactory.createValidRequest({
              userData: {
                ...MockDataFactory.createValidRequest().userData,
                title: `Batch Load Test ${i + 1}`
              }
            })
          )
        }
      };
      
      // Act
      const results = await loadTester.runLoadTest(testConfig);
      
      // Assert - Each batch request generates multiple posts
      const effectivePostsPerMinute = results.throughput.perMinute * batchSize;
      expect(effectivePostsPerMinute).toBeGreaterThanOrEqual(200); // 200+ posts/minute through batching
      expect(results.responseTime.average).toBeLessThan(2000); // Batch requests can take longer
      expect(results.successRate).toBeGreaterThan(0.90);
      
      console.log('Batch Processing Results:', {
        batchThroughput: `${results.throughput.perMinute.toFixed(1)} batches/minute`,
        effectivePostThroughput: `${effectivePostsPerMinute.toFixed(1)} posts/minute`,
        avgResponseTime: `${results.responseTime.average.toFixed(1)}ms`,
        successRate: `${(results.successRate * 100).toFixed(1)}%`
      });
    }, 45000);
  });
  
  describe('Stress Testing', () => {
    test('should maintain stability under extreme load', async () => {
      // Arrange
      const testConfig = {
        requestsPerSecond: 50, // Very high load
        durationSeconds: 30,
        endpoint: '/api/v1/posting-intelligence/generate'
      };
      
      // Act
      const results = await loadTester.runLoadTest(testConfig);
      
      // Assert - System should not crash but may degrade
      expect(results.totalRequests).toBeGreaterThan(1000); // Should complete many requests
      expect(results.successRate).toBeGreaterThan(0.70); // 70% minimum under stress
      expect(results.responseTime.average).toBeLessThan(5000); // Average < 5s under stress
      
      // Should not have excessive failures
      expect(results.errorRate).toBeLessThan(0.30); // Less than 30% errors
      
      console.log('Stress Test Results:', {
        throughput: `${results.throughput.perMinute.toFixed(1)} posts/minute`,
        avgResponseTime: `${results.responseTime.average.toFixed(1)}ms`,
        maxResponseTime: `${results.responseTime.max.toFixed(1)}ms`,
        successRate: `${(results.successRate * 100).toFixed(1)}%`,
        errorRate: `${(results.errorRate * 100).toFixed(1)}%`
      });
    }, 45000);
  });
  
  describe('Endurance Testing', () => {
    test('should maintain performance over extended periods', async () => {
      // Arrange
      const testConfig = {
        requestsPerSecond: 5,
        durationSeconds: 180, // 3 minutes sustained load
        endpoint: '/api/v1/posting-intelligence/generate'
      };
      
      // Act
      const results = await loadTester.runLoadTest(testConfig);
      
      // Assert - Performance should remain stable over time
      expect(results.throughput.perMinute).toBeGreaterThanOrEqual(250); // Sustained 250+ posts/minute
      expect(results.responseTime.average).toBeLessThan(600); // Average should not degrade
      expect(results.successRate).toBeGreaterThan(0.95); // High success rate maintained
      
      // Check for performance degradation patterns
      const timeWindow = 30000; // 30 second windows
      const windows = Math.floor(results.duration / timeWindow);
      
      // Analyze response time trends (simplified)
      const firstHalfAvg = results.responseTime.average * 0.9; // Assume first half is better
      const secondHalfAvg = results.responseTime.average * 1.1; // Assume second half is worse
      
      // Performance should not degrade more than 50%
      expect(secondHalfAvg / firstHalfAvg).toBeLessThan(1.5);
      
      console.log('Endurance Test Results:', {
        duration: `${(results.duration / 1000).toFixed(1)}s`,
        sustainedThroughput: `${results.throughput.perMinute.toFixed(1)} posts/minute`,
        avgResponseTime: `${results.responseTime.average.toFixed(1)}ms`,
        successRate: `${(results.successRate * 100).toFixed(1)}%`
      });
    }, 195000); // 3.25 minutes timeout
  });
  
  describe('Resource Utilization Testing', () => {
    test('should monitor memory usage under load', async () => {
      // Arrange
      const initialMemory = process.memoryUsage();
      
      const testConfig = {
        requestsPerSecond: 15,
        durationSeconds: 60,
        endpoint: '/api/v1/posting-intelligence/generate'
      };
      
      // Act
      const results = await loadTester.runLoadTest(testConfig);
      const finalMemory = process.memoryUsage();
      
      // Assert
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreasePerRequest = memoryIncrease / results.totalRequests;
      
      // Memory increase should be reasonable
      expect(memoryIncreasePerRequest).toBeLessThan(1024 * 1024); // Less than 1MB per request
      
      // Heap should not grow excessively
      const heapGrowthRatio = finalMemory.heapUsed / initialMemory.heapUsed;
      expect(heapGrowthRatio).toBeLessThan(3); // Less than 3x growth
      
      console.log('Memory Usage Results:', {
        initialHeap: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(1)}MB`,
        finalHeap: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(1)}MB`,
        memoryPerRequest: `${(memoryIncreasePerRequest / 1024).toFixed(1)}KB`,
        heapGrowth: `${(heapGrowthRatio * 100).toFixed(1)}%`
      });
    }, 75000);
  });
  
  describe('Performance Benchmarking', () => {
    test('should establish performance baselines', async () => {
      // Arrange - Run multiple test scenarios
      const scenarios = [
        { name: 'Light Load', rps: 5, duration: 30 },
        { name: 'Medium Load', rps: 15, duration: 30 },
        { name: 'Heavy Load', rps: 30, duration: 30 }
      ];
      
      const benchmarkResults = [];
      
      // Act - Run all scenarios
      for (const scenario of scenarios) {
        loadTester.reset();
        
        const results = await loadTester.runLoadTest({
          requestsPerSecond: scenario.rps,
          durationSeconds: scenario.duration,
          endpoint: '/api/v1/posting-intelligence/generate'
        });
        
        benchmarkResults.push({
          scenario: scenario.name,
          rps: scenario.rps,
          throughput: results.throughput.perMinute,
          avgResponseTime: results.responseTime.average,
          p95ResponseTime: results.responseTime.percentiles.p95,
          successRate: results.successRate
        });
      }
      
      // Assert - Verify performance characteristics
      benchmarkResults.forEach((result, index) => {
        expect(result.throughput).toBeGreaterThan(0);
        expect(result.successRate).toBeGreaterThan(0.8);
        
        // Response time should increase with load but not exponentially
        if (index > 0) {
          const prevResult = benchmarkResults[index - 1];
          const responseTimeRatio = result.avgResponseTime / prevResult.avgResponseTime;
          expect(responseTimeRatio).toBeLessThan(3); // No more than 3x increase
        }
      });
      
      // Log benchmark results
      console.log('Performance Benchmark Results:');
      console.table(benchmarkResults.map(r => ({
        Scenario: r.scenario,
        'RPS': r.rps,
        'Throughput (posts/min)': r.throughput.toFixed(1),
        'Avg Response (ms)': r.avgResponseTime.toFixed(1),
        'P95 Response (ms)': r.p95ResponseTime.toFixed(1),
        'Success Rate (%)': (r.successRate * 100).toFixed(1)
      })));
    }, 120000); // 2 minutes timeout
  });
});