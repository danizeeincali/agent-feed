/**
 * TDD London School: Performance Benchmarks for Claude Instance Endpoints
 * 
 * This test suite defines performance expectations and validates system behavior
 * under load using mock-driven scenarios to isolate performance characteristics.
 */

const request = require('supertest');
const express = require('express');
const { performance } = require('perf_hooks');

describe('Performance Benchmarks - London School TDD', () => {
  let app;
  let mockPerformanceCollector;
  let mockLoadBalancer;
  let mockResourceMonitor;
  let mockCacheManager;
  let performanceMetrics;

  beforeEach(() => {
    // Create performance monitoring mocks
    mockPerformanceCollector = {
      recordResponseTime: jest.fn(),
      recordThroughput: jest.fn(),
      recordResourceUsage: jest.fn(),
      recordConcurrency: jest.fn(),
      getMetrics: jest.fn()
    };

    mockLoadBalancer = {
      distributeLoad: jest.fn(),
      getHealthyInstances: jest.fn(),
      recordInstanceLoad: jest.fn()
    };

    mockResourceMonitor = {
      getCpuUsage: jest.fn(),
      getMemoryUsage: jest.fn(),
      getDiskIo: jest.fn(),
      getNetworkStats: jest.fn()
    };

    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      hit: jest.fn(),
      miss: jest.fn(),
      getStats: jest.fn()
    };

    performanceMetrics = {
      requests: [],
      startTime: performance.now()
    };

    // Set up Express app with performance monitoring
    app = express();
    app.use(express.json());
    setupPerformanceMiddleware(app);
    setupMockEndpoints(app);
  });

  describe('Response Time Benchmarks', () => {
    it('should meet SLA for instance creation - 95th percentile under 2000ms', async () => {
      // Arrange - Define performance expectations
      const SLA_TARGET_95TH = 2000; // 2 seconds
      const SAMPLE_SIZE = 100;
      const responseTimes = [];

      // Mock instance creation with varying response times
      let requestCount = 0;
      const mockCreateInstance = jest.fn().mockImplementation(async () => {
        requestCount++;
        // Simulate realistic response times with some outliers
        const baseTime = 500 + Math.random() * 1000; // 500-1500ms base
        const outlier = requestCount % 20 === 0 ? 3000 : 0; // 5% outliers
        
        await new Promise(resolve => setTimeout(resolve, baseTime + outlier));
        
        return {
          id: `instance-${requestCount}`,
          name: `benchmark-instance-${requestCount}`,
          status: 'running',
          createdAt: new Date().toISOString()
        };
      });

      // Act - Execute performance test
      const promises = Array(SAMPLE_SIZE).fill().map(async (_, i) => {
        const startTime = performance.now();
        
        const response = await request(app)
          .post('/api/v1/claude-live/prod/instances')
          .set('Authorization', 'Bearer benchmark-token')
          .send({ name: `benchmark-${i}` });
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        responseTimes.push(responseTime);
        
        return { response, responseTime };
      });

      const results = await Promise.all(promises);

      // Assert - Validate performance metrics
      responseTimes.sort((a, b) => a - b);
      const percentile95 = responseTimes[Math.floor(SAMPLE_SIZE * 0.95)];
      const median = responseTimes[Math.floor(SAMPLE_SIZE * 0.5)];
      const average = responseTimes.reduce((a, b) => a + b, 0) / SAMPLE_SIZE;

      console.log(`Performance Metrics:
        Average: ${average.toFixed(2)}ms
        Median: ${median.toFixed(2)}ms
        95th Percentile: ${percentile95.toFixed(2)}ms
        SLA Target (95th): ${SLA_TARGET_95TH}ms`);

      expect(percentile95).toBeLessThan(SLA_TARGET_95TH);
      expect(median).toBeLessThan(1000); // Median should be under 1 second
      
      // Verify all requests succeeded
      results.forEach(result => {
        expect(result.response.status).toBe(201);
      });

      // Verify performance monitoring interactions
      expect(mockPerformanceCollector.recordResponseTime).toHaveBeenCalledTimes(SAMPLE_SIZE);
    });

    it('should maintain performance under concurrent load', async () => {
      // Arrange - Define concurrency test parameters
      const CONCURRENT_USERS = 50;
      const REQUESTS_PER_USER = 10;
      const MAX_RESPONSE_TIME_UNDER_LOAD = 3000; // 3 seconds under load

      const concurrentResults = [];
      
      // Mock concurrent instance creation
      const mockConcurrentCreate = jest.fn().mockImplementation(async (config) => {
        // Simulate resource contention effects
        const currentLoad = mockLoadBalancer.recordInstanceLoad.mock.calls.length;
        const contentionDelay = Math.min(currentLoad * 10, 1000); // Max 1s contention
        
        await new Promise(resolve => setTimeout(resolve, 800 + contentionDelay));
        
        return {
          id: `concurrent-${Date.now()}-${Math.random()}`,
          name: config.name,
          status: 'running'
        };
      });

      // Act - Execute concurrent load test
      const userPromises = Array(CONCURRENT_USERS).fill().map(async (_, userId) => {
        const userRequests = Array(REQUESTS_PER_USER).fill().map(async (_, reqId) => {
          const startTime = performance.now();
          
          const response = await request(app)
            .post('/api/v1/claude-live/prod/instances')
            .set('Authorization', 'Bearer concurrent-token')
            .send({ name: `concurrent-${userId}-${reqId}` });
          
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          return { userId, reqId, response, responseTime };
        });
        
        return Promise.all(userRequests);
      });

      const userResults = await Promise.all(userPromises);
      const allResults = userResults.flat();

      // Assert - Validate concurrent performance
      const responseTimes = allResults.map(r => r.responseTime);
      const maxResponseTime = Math.max(...responseTimes);
      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      console.log(`Concurrent Load Test Results:
        Total Requests: ${allResults.length}
        Concurrent Users: ${CONCURRENT_USERS}
        Average Response Time: ${averageResponseTime.toFixed(2)}ms
        Max Response Time: ${maxResponseTime.toFixed(2)}ms
        Success Rate: ${(allResults.filter(r => r.response.status === 201).length / allResults.length * 100).toFixed(2)}%`);

      expect(maxResponseTime).toBeLessThan(MAX_RESPONSE_TIME_UNDER_LOAD);
      expect(averageResponseTime).toBeLessThan(2000); // Average should stay reasonable

      // Verify all requests succeeded
      allResults.forEach(result => {
        expect(result.response.status).toBe(201);
      });

      // Verify concurrency tracking
      expect(mockPerformanceCollector.recordConcurrency).toHaveBeenCalled();
    });
  });

  describe('Throughput Benchmarks', () => {
    it('should achieve minimum throughput of 100 requests/second for instance listing', async () => {
      // Arrange - Define throughput expectations  
      const MIN_THROUGHPUT = 100; // requests per second
      const TEST_DURATION = 10000; // 10 seconds
      const requestCounts = [];
      let totalRequests = 0;

      // Mock fast instance listing
      const mockInstances = Array(50).fill().map((_, i) => ({
        id: `list-instance-${i}`,
        name: `instance-${i}`,
        status: 'running'
      }));

      const mockListInstances = jest.fn().mockImplementation(async () => {
        // Simulate fast database query with caching
        const cacheKey = 'instance-list';
        const cached = mockCacheManager.get(cacheKey);
        
        if (cached) {
          mockCacheManager.hit(cacheKey);
          await new Promise(resolve => setTimeout(resolve, 10)); // Cache hit delay
          return cached;
        } else {
          mockCacheManager.miss(cacheKey);
          await new Promise(resolve => setTimeout(resolve, 50)); // Database query delay
          mockCacheManager.set(cacheKey, mockInstances);
          return mockInstances;
        }
      });

      // Set up cache hits for most requests
      mockCacheManager.get.mockReturnValue(mockInstances);

      // Act - Execute throughput test
      const startTime = Date.now();
      const endTime = startTime + TEST_DURATION;
      
      const requestPromises = [];
      
      while (Date.now() < endTime) {
        const batchPromises = Array(10).fill().map(async () => {
          const response = await request(app)
            .get('/api/v1/claude-live/prod/instances')
            .set('Authorization', 'Bearer throughput-token');
          
          totalRequests++;
          return response;
        });
        
        requestPromises.push(...batchPromises);
        
        // Small delay to prevent overwhelming the test
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const results = await Promise.all(requestPromises);
      const actualDuration = Date.now() - startTime;
      const actualThroughput = (totalRequests / actualDuration) * 1000; // requests per second

      // Assert - Validate throughput metrics
      console.log(`Throughput Test Results:
        Total Requests: ${totalRequests}
        Test Duration: ${actualDuration}ms
        Actual Throughput: ${actualThroughput.toFixed(2)} requests/second
        Target Throughput: ${MIN_THROUGHPUT} requests/second
        Cache Hit Ratio: ${mockCacheManager.hit.mock.calls.length / (mockCacheManager.hit.mock.calls.length + mockCacheManager.miss.mock.calls.length) * 100}%`);

      expect(actualThroughput).toBeGreaterThan(MIN_THROUGHPUT);
      
      // Verify all requests succeeded
      results.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify throughput monitoring
      expect(mockPerformanceCollector.recordThroughput).toHaveBeenCalled();
    });

    it('should handle burst traffic without degradation', async () => {
      // Arrange - Define burst test parameters
      const BURST_SIZE = 200; // requests in burst
      const BURST_DURATION = 5000; // 5 seconds
      const MAX_ERROR_RATE = 0.05; // 5% error rate allowed

      let successCount = 0;
      let errorCount = 0;

      // Mock burst handling with circuit breaker
      const mockHandleBurst = jest.fn().mockImplementation(async () => {
        const currentLoad = mockResourceMonitor.getCpuUsage();
        
        if (currentLoad > 80) {
          // Simulate circuit breaker or throttling
          throw new Error('System overloaded');
        }
        
        return { id: 'burst-instance', status: 'running' };
      });

      // Simulate increasing system load during burst
      let currentCpuUsage = 30;
      mockResourceMonitor.getCpuUsage.mockImplementation(() => {
        currentCpuUsage = Math.min(currentCpuUsage + 1, 90);
        return currentCpuUsage;
      });

      // Act - Execute burst test
      const burstPromises = Array(BURST_SIZE).fill().map(async (_, i) => {
        try {
          const response = await request(app)
            .post('/api/v1/claude-live/prod/instances')
            .set('Authorization', 'Bearer burst-token')
            .send({ name: `burst-${i}` });
          
          if (response.status === 201) {
            successCount++;
          } else {
            errorCount++;
          }
          
          return response;
        } catch (error) {
          errorCount++;
          throw error;
        }
      });

      const results = await Promise.allSettled(burstPromises);
      const actualErrorRate = errorCount / BURST_SIZE;

      // Assert - Validate burst handling
      console.log(`Burst Test Results:
        Burst Size: ${BURST_SIZE} requests
        Success Count: ${successCount}
        Error Count: ${errorCount}
        Error Rate: ${(actualErrorRate * 100).toFixed(2)}%
        Max Allowed Error Rate: ${MAX_ERROR_RATE * 100}%`);

      expect(actualErrorRate).toBeLessThan(MAX_ERROR_RATE);
      expect(successCount).toBeGreaterThan(BURST_SIZE * 0.9); // At least 90% success

      // Verify resource monitoring
      expect(mockResourceMonitor.getCpuUsage).toHaveBeenCalled();
    });
  });

  describe('Resource Usage Benchmarks', () => {
    it('should maintain memory usage within acceptable limits', async () => {
      // Arrange - Define memory usage limits
      const MAX_MEMORY_MB = 512; // 512 MB limit
      const REQUEST_COUNT = 1000;
      
      let currentMemoryUsage = 128; // Starting usage
      const memoryReadings = [];

      // Mock memory-intensive operations
      mockResourceMonitor.getMemoryUsage.mockImplementation(() => {
        // Simulate memory growth and garbage collection
        currentMemoryUsage += Math.random() * 2; // Growth
        if (currentMemoryUsage > 400) {
          currentMemoryUsage *= 0.7; // Garbage collection
        }
        memoryReadings.push(currentMemoryUsage);
        return currentMemoryUsage;
      });

      // Act - Execute memory usage test
      const memoryTestPromises = Array(REQUEST_COUNT).fill().map(async (_, i) => {
        const response = await request(app)
          .get('/api/v1/claude-live/prod/instances')
          .set('Authorization', 'Bearer memory-token');
        
        // Monitor memory usage periodically
        if (i % 50 === 0) {
          mockResourceMonitor.getMemoryUsage();
        }
        
        return response;
      });

      await Promise.all(memoryTestPromises);

      // Assert - Validate memory usage
      const maxMemoryUsage = Math.max(...memoryReadings);
      const avgMemoryUsage = memoryReadings.reduce((a, b) => a + b, 0) / memoryReadings.length;

      console.log(`Memory Usage Test Results:
        Max Memory Usage: ${maxMemoryUsage.toFixed(2)} MB
        Average Memory Usage: ${avgMemoryUsage.toFixed(2)} MB
        Memory Limit: ${MAX_MEMORY_MB} MB
        Memory Readings: ${memoryReadings.length}`);

      expect(maxMemoryUsage).toBeLessThan(MAX_MEMORY_MB);
      expect(avgMemoryUsage).toBeLessThan(MAX_MEMORY_MB * 0.8); // Should stay under 80% on average

      // Verify resource monitoring
      expect(mockResourceMonitor.getMemoryUsage).toHaveBeenCalled();
      expect(mockPerformanceCollector.recordResourceUsage).toHaveBeenCalled();
    });

    it('should efficiently handle database connections', async () => {
      // Arrange - Define connection pool parameters
      const MAX_DB_CONNECTIONS = 20;
      const CONCURRENT_REQUESTS = 100;
      
      let activeConnections = 0;
      let peakConnections = 0;
      const connectionMetrics = [];

      // Mock database connection management
      const mockDbQuery = jest.fn().mockImplementation(async () => {
        activeConnections++;
        peakConnections = Math.max(peakConnections, activeConnections);
        connectionMetrics.push(activeConnections);
        
        // Simulate query execution time
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        
        activeConnections--;
        return { success: true };
      });

      // Act - Execute database connection test
      const dbTestPromises = Array(CONCURRENT_REQUESTS).fill().map(async () => {
        return request(app)
          .get('/api/v1/claude-live/prod/activities')
          .set('Authorization', 'Bearer db-token');
      });

      await Promise.all(dbTestPromises);

      // Assert - Validate connection usage
      console.log(`Database Connection Test Results:
        Peak Connections: ${peakConnections}
        Max Allowed Connections: ${MAX_DB_CONNECTIONS}
        Connection Efficiency: ${(1 - peakConnections/MAX_DB_CONNECTIONS).toFixed(2)}`);

      expect(peakConnections).toBeLessThan(MAX_DB_CONNECTIONS);
      expect(activeConnections).toBe(0); // All connections should be released

      // Verify connection pool monitoring
      expect(mockPerformanceCollector.recordResourceUsage).toHaveBeenCalledWith(
        'database_connections',
        expect.any(Number)
      );
    });
  });

  describe('Caching Performance', () => {
    it('should achieve high cache hit ratio for frequently accessed data', async () => {
      // Arrange - Define cache performance expectations
      const MIN_CACHE_HIT_RATIO = 0.8; // 80% hit ratio
      const REQUEST_COUNT = 500;
      
      let cacheHits = 0;
      let cacheMisses = 0;

      // Mock caching behavior
      mockCacheManager.get.mockImplementation((key) => {
        if (Math.random() > 0.3) { // 70% cache hit simulation
          cacheHits++;
          return { cached: true, data: 'cached-data' };
        } else {
          cacheMisses++;
          return null;
        }
      });

      mockCacheManager.set.mockImplementation(() => {
        // Cache set operation
      });

      // Act - Execute cache performance test
      const cacheTestPromises = Array(REQUEST_COUNT).fill().map(async (_, i) => {
        const response = await request(app)
          .get('/api/v1/claude-live/prod/instances')
          .set('Authorization', 'Bearer cache-token');
        
        return response;
      });

      await Promise.all(cacheTestPromises);

      // Assert - Validate cache performance
      const totalCacheOperations = cacheHits + cacheMisses;
      const actualHitRatio = cacheHits / totalCacheOperations;

      console.log(`Cache Performance Test Results:
        Cache Hits: ${cacheHits}
        Cache Misses: ${cacheMisses}
        Hit Ratio: ${(actualHitRatio * 100).toFixed(2)}%
        Target Hit Ratio: ${(MIN_CACHE_HIT_RATIO * 100).toFixed(2)}%`);

      expect(actualHitRatio).toBeGreaterThan(MIN_CACHE_HIT_RATIO);
      
      // Verify cache usage
      expect(mockCacheManager.get).toHaveBeenCalledTimes(totalCacheOperations);
    });
  });

  // Helper function to set up performance monitoring middleware
  function setupPerformanceMiddleware(app) {
    // Request timing middleware
    app.use((req, res, next) => {
      const startTime = performance.now();
      
      res.on('finish', () => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        mockPerformanceCollector.recordResponseTime(req.route?.path || req.url, responseTime);
        mockPerformanceCollector.recordThroughput(req.method, 1);
        
        performanceMetrics.requests.push({
          url: req.url,
          method: req.method,
          responseTime,
          status: res.statusCode,
          timestamp: new Date().toISOString()
        });
      });
      
      next();
    });

    // Resource monitoring middleware
    app.use((req, res, next) => {
      const cpuUsage = mockResourceMonitor.getCpuUsage();
      const memoryUsage = mockResourceMonitor.getMemoryUsage();
      
      mockPerformanceCollector.recordResourceUsage('cpu', cpuUsage);
      mockPerformanceCollector.recordResourceUsage('memory', memoryUsage);
      
      next();
    });

    // Concurrency tracking middleware
    app.use((req, res, next) => {
      const activeConcurrency = performanceMetrics.requests.filter(
        r => Date.now() - new Date(r.timestamp).getTime() < 1000
      ).length;
      
      mockPerformanceCollector.recordConcurrency(activeConcurrency);
      next();
    });
  }

  // Helper function to set up mock endpoints with performance characteristics
  function setupMockEndpoints(app) {
    app.post('/api/v1/claude-live/prod/instances', async (req, res) => {
      // Simulate instance creation performance characteristics
      const baseDelay = 500; // Base creation time
      const variabilityDelay = Math.random() * 1000; // Variable processing time
      
      await new Promise(resolve => setTimeout(resolve, baseDelay + variabilityDelay));
      
      res.status(201).json({
        success: true,
        instance: {
          id: `perf-instance-${Date.now()}`,
          name: req.body.name,
          status: 'running'
        }
      });
    });

    app.get('/api/v1/claude-live/prod/instances', async (req, res) => {
      // Simulate list performance with caching
      const cacheKey = 'instances-list';
      const cached = mockCacheManager.get(cacheKey);
      
      if (cached) {
        await new Promise(resolve => setTimeout(resolve, 10)); // Cache hit delay
      } else {
        await new Promise(resolve => setTimeout(resolve, 100)); // Database query delay
        mockCacheManager.set(cacheKey, []);
      }
      
      res.json({
        success: true,
        instances: [],
        count: 0
      });
    });

    app.get('/api/v1/claude-live/prod/activities', async (req, res) => {
      // Simulate database-intensive operation
      await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 100));
      
      res.json({
        success: true,
        activities: [],
        count: 0
      });
    });
  }
});