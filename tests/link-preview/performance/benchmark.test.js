/**
 * Performance Benchmarks and Load Testing for Link Preview Service
 * Focus: Performance thresholds, load handling, and resource optimization
 */

import { jest } from '@jest/globals';
import { linkPreviewService } from '../../../src/services/LinkPreviewService.js';
import { databaseService } from '../../../src/database/DatabaseService.js';
import { measureExecutionTime } from '../setup.js';

describe('Link Preview Performance Benchmarks', () => {
  beforeAll(async () => {
    await databaseService.initialize();
    // Clear cache for clean performance testing
    await linkPreviewService.clearExpiredCache();
  });

  afterAll(async () => {
    await databaseService.close();
  });

  describe('Response Time Benchmarks', () => {
    test('should fetch generic URL previews within performance thresholds', async () => {
      const testUrls = [
        'https://httpbin.org/html',
        'https://httpbin.org/json',
        'https://example.com'
      ];

      const performanceResults = [];

      for (const url of testUrls) {
        const { result, executionTime } = await measureExecutionTime(
          () => linkPreviewService.getLinkPreview(url)
        );

        performanceResults.push({
          url,
          executionTime,
          success: !result.error,
          cached: false
        });

        // Performance assertions
        expect(executionTime).toBeLessThan(10000); // 10 second max
        expect(result).toBeDefined();

        // Test cache performance
        const { result: cachedResult, executionTime: cacheTime } = await measureExecutionTime(
          () => linkPreviewService.getLinkPreview(url)
        );

        performanceResults.push({
          url: `${url} (cached)`,
          executionTime: cacheTime,
          success: !cachedResult.error,
          cached: true
        });

        // Cache should be significantly faster
        expect(cacheTime).toBeLessThan(executionTime * 0.1); // 90% faster
        expect(cacheTime).toBeLessThan(500); // Under 500ms for cache hits
      }

      // Log performance results
      console.table(performanceResults);

      // Overall performance metrics
      const avgFreshTime = performanceResults
        .filter(r => !r.cached)
        .reduce((sum, r) => sum + r.executionTime, 0) / testUrls.length;
      
      const avgCacheTime = performanceResults
        .filter(r => r.cached)
        .reduce((sum, r) => sum + r.executionTime, 0) / testUrls.length;

      expect(avgFreshTime).toBeLessThan(8000); // Average under 8 seconds
      expect(avgCacheTime).toBeLessThan(200); // Average cache under 200ms
    });

    test('should handle YouTube previews within acceptable timeframes', async () => {
      const youtubeUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://youtube.com/embed/dQw4w9WgXcQ'
      ];

      const youtubeResults = [];

      for (const url of youtubeUrls) {
        const { result, executionTime } = await measureExecutionTime(
          () => linkPreviewService.getLinkPreview(url)
        );

        youtubeResults.push({
          url,
          executionTime,
          success: result.type === 'video' && !result.error,
          fallback: result.fallback === true
        });

        // YouTube should be faster due to oEmbed API
        expect(executionTime).toBeLessThan(8000);
        expect(result.type).toBe('video');
      }

      console.table(youtubeResults);
    });
  });

  describe('Concurrent Load Testing', () => {
    test('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const testUrl = 'https://httpbin.org/html';

      const startTime = Date.now();
      
      // Create concurrent requests
      const promises = Array(concurrentRequests).fill(null).map((_, index) =>
        measureExecutionTime(() => 
          linkPreviewService.getLinkPreview(`${testUrl}?req=${index}`)
        )
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Performance assertions
      expect(totalTime).toBeLessThan(15000); // All requests within 15 seconds

      // Check individual request performance
      results.forEach(({ result, executionTime }, index) => {
        expect(result).toBeDefined();
        expect(executionTime).toBeLessThan(12000); // Individual request under 12s
        expect(result.error).toBeUndefined();
      });

      // Calculate performance metrics
      const executionTimes = results.map(r => r.executionTime);
      const avgTime = executionTimes.reduce((sum, time) => sum + time, 0) / concurrentRequests;
      const maxTime = Math.max(...executionTimes);
      const minTime = Math.min(...executionTimes);

      console.log('Concurrent Load Test Results:', {
        concurrentRequests,
        totalTime,
        avgTime,
        maxTime,
        minTime,
        throughput: concurrentRequests / (totalTime / 1000) // requests per second
      });

      expect(avgTime).toBeLessThan(10000);
      expect(maxTime).toBeLessThan(15000);
    });

    test('should maintain performance under sustained load', async () => {
      const sustainedDuration = 30000; // 30 seconds
      const requestInterval = 1000; // 1 request per second
      const maxConcurrent = 5;

      const startTime = Date.now();
      const results = [];
      let requestCount = 0;
      let activeRequests = 0;

      const makeRequest = async () => {
        if (activeRequests >= maxConcurrent) return;
        
        activeRequests++;
        requestCount++;
        
        const { result, executionTime } = await measureExecutionTime(
          () => linkPreviewService.getLinkPreview(`https://httpbin.org/html?sustained=${requestCount}`)
        );

        results.push({
          requestId: requestCount,
          executionTime,
          success: !result.error,
          timestamp: Date.now() - startTime
        });

        activeRequests--;
      };

      // Start sustained load
      const interval = setInterval(() => {
        if (Date.now() - startTime > sustainedDuration) {
          clearInterval(interval);
          return;
        }
        makeRequest();
      }, requestInterval);

      // Wait for completion
      await new Promise(resolve => {
        const checkComplete = () => {
          if (Date.now() - startTime > sustainedDuration && activeRequests === 0) {
            resolve();
          } else {
            setTimeout(checkComplete, 100);
          }
        };
        checkComplete();
      });

      // Analyze sustained load results
      const successRate = results.filter(r => r.success).length / results.length;
      const avgResponseTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;

      console.log('Sustained Load Test Results:', {
        duration: sustainedDuration,
        totalRequests: results.length,
        successRate,
        avgResponseTime,
        requestsPerSecond: results.length / (sustainedDuration / 1000)
      });

      // Performance assertions
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate
      expect(avgResponseTime).toBeLessThan(8000); // Average under 8 seconds
      expect(results.length).toBeGreaterThan(20); // At least 20 requests processed
    });
  });

  describe('Memory and Resource Usage', () => {
    test('should manage memory efficiently during high load', async () => {
      const initialMemory = process.memoryUsage();
      const requestCount = 50;
      const batchSize = 10;

      for (let batch = 0; batch < requestCount / batchSize; batch++) {
        const batchPromises = Array(batchSize).fill(null).map((_, index) =>
          linkPreviewService.getLinkPreview(`https://httpbin.org/html?batch=${batch}&req=${index}`)
        );

        await Promise.all(batchPromises);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        // Check memory usage after each batch
        const currentMemory = process.memoryUsage();
        const memoryIncrease = currentMemory.heapUsed - initialMemory.heapUsed;

        // Memory should not grow excessively
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB max increase
      }

      const finalMemory = process.memoryUsage();
      console.log('Memory Usage:', {
        initial: Math.round(initialMemory.heapUsed / 1024 / 1024) + 'MB',
        final: Math.round(finalMemory.heapUsed / 1024 / 1024) + 'MB',
        increase: Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024) + 'MB'
      });
    });

    test('should clean up resources properly', async () => {
      // Test connection pool cleanup
      const connectionsBefore = process.listenerCount('beforeExit');
      
      // Make requests that create connections
      const requests = Array(20).fill(null).map((_, index) =>
        linkPreviewService.getLinkPreview(`https://httpbin.org/html?cleanup=${index}`)
      );

      await Promise.all(requests);

      // Allow time for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));

      const connectionsAfter = process.listenerCount('beforeExit');

      // Should not accumulate connections
      expect(connectionsAfter).toBeLessThanOrEqual(connectionsBefore + 5);
    });
  });

  describe('Cache Performance Optimization', () => {
    test('should optimize cache hit ratios under load', async () => {
      const urls = [
        'https://httpbin.org/html',
        'https://httpbin.org/json',
        'https://httpbin.org/xml'
      ];

      const cacheStats = {
        hits: 0,
        misses: 0,
        totalRequests: 0
      };

      // Make multiple requests with repeated URLs to test cache efficiency
      const requests = [];
      for (let i = 0; i < 30; i++) {
        const url = urls[i % urls.length]; // Cycle through URLs
        requests.push(async () => {
          const startTime = Date.now();
          const result = await linkPreviewService.getLinkPreview(url);
          const executionTime = Date.now() - startTime;

          cacheStats.totalRequests++;
          
          // Determine if this was likely a cache hit (very fast response)
          if (executionTime < 500 && !result.error) {
            cacheStats.hits++;
          } else {
            cacheStats.misses++;
          }

          return { result, executionTime, url };
        });
      }

      // Execute requests in batches to simulate realistic load
      const batchSize = 5;
      const results = [];

      for (let i = 0; i < requests.length; i += batchSize) {
        const batch = requests.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(req => req()));
        results.push(...batchResults);

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Calculate cache efficiency
      const hitRatio = cacheStats.hits / cacheStats.totalRequests;

      console.log('Cache Performance:', {
        totalRequests: cacheStats.totalRequests,
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRatio: Math.round(hitRatio * 100) + '%'
      });

      // Performance assertions
      expect(hitRatio).toBeGreaterThan(0.6); // At least 60% cache hit ratio
      expect(cacheStats.totalRequests).toBe(30);

      // Verify cache hits are actually faster
      const hitTimes = results.filter(r => r.executionTime < 500).map(r => r.executionTime);
      const missTimes = results.filter(r => r.executionTime >= 500).map(r => r.executionTime);

      if (hitTimes.length > 0 && missTimes.length > 0) {
        const avgHitTime = hitTimes.reduce((sum, time) => sum + time, 0) / hitTimes.length;
        const avgMissTime = missTimes.reduce((sum, time) => sum + time, 0) / missTimes.length;

        expect(avgHitTime).toBeLessThan(avgMissTime * 0.1); // Cache hits should be 90% faster
      }
    });

    test('should handle cache expiration efficiently', async () => {
      const testUrl = 'https://httpbin.org/html?expiration=test';

      // First request - cache miss
      const { executionTime: firstTime } = await measureExecutionTime(
        () => linkPreviewService.getLinkPreview(testUrl)
      );

      // Second request - cache hit
      const { executionTime: secondTime } = await measureExecutionTime(
        () => linkPreviewService.getLinkPreview(testUrl)
      );

      expect(secondTime).toBeLessThan(firstTime * 0.1);

      // Manually expire cache entry
      await databaseService.db.prepare(`
        UPDATE link_preview_cache 
        SET cached_at = datetime('now', '-8 days') 
        WHERE url = ?
      `).run(testUrl);

      // Third request - should be cache miss again due to expiration
      const { executionTime: thirdTime } = await measureExecutionTime(
        () => linkPreviewService.getLinkPreview(testUrl)
      );

      // Should be slower again due to cache expiration
      expect(thirdTime).toBeGreaterThan(secondTime * 10);
      expect(thirdTime).toBeLessThan(15000); // But still within limits
    });
  });

  describe('Scalability Testing', () => {
    test('should scale linearly with increased load', async () => {
      const loadLevels = [5, 10, 20, 40];
      const scalabilityResults = [];

      for (const concurrency of loadLevels) {
        const startTime = Date.now();

        const promises = Array(concurrency).fill(null).map((_, index) =>
          linkPreviewService.getLinkPreview(`https://httpbin.org/html?scale=${concurrency}&req=${index}`)
        );

        await Promise.all(promises);

        const totalTime = Date.now() - startTime;
        const throughput = concurrency / (totalTime / 1000); // requests per second

        scalabilityResults.push({
          concurrency,
          totalTime,
          throughput,
          avgTimePerRequest: totalTime / concurrency
        });

        console.log(`Load Level ${concurrency}: ${Math.round(throughput * 100) / 100} req/s`);
      }

      console.table(scalabilityResults);

      // Verify reasonable scalability
      const minThroughput = Math.min(...scalabilityResults.map(r => r.throughput));
      const maxThroughput = Math.max(...scalabilityResults.map(r => r.throughput));

      // Throughput should not degrade by more than 80% at higher loads
      expect(minThroughput).toBeGreaterThan(maxThroughput * 0.2);
    });
  });

  describe('Error Recovery Performance', () => {
    test('should recover quickly from transient failures', async () => {
      const testUrl = 'https://httpbin.org/status/503'; // Service unavailable

      // Measure error handling performance
      const errorResults = [];
      
      for (let i = 0; i < 5; i++) {
        const { result, executionTime } = await measureExecutionTime(
          () => linkPreviewService.getLinkPreview(`${testUrl}?attempt=${i}`)
        );

        errorResults.push({
          attempt: i + 1,
          executionTime,
          hasError: !!result.error
        });

        // Even error cases should complete quickly
        expect(executionTime).toBeLessThan(5000);
        expect(result.error).toBeDefined();
      }

      console.table(errorResults);

      // Average error handling time should be reasonable
      const avgErrorTime = errorResults.reduce((sum, r) => sum + r.executionTime, 0) / errorResults.length;
      expect(avgErrorTime).toBeLessThan(3000);
    });
  });
});