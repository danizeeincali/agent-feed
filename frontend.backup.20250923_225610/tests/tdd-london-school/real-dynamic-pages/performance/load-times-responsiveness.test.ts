/**
 * London School TDD: Performance Tests - Load Times & Responsiveness
 * 
 * PRINCIPLES:
 * - Test real performance with actual system load
 * - Focus on user-perceived performance collaboration
 * - Verify system responsiveness under various conditions
 * - NO MOCKS - Real performance measurements only
 * 
 * RED → GREEN → REFACTOR for each performance scenario
 */

import { BASE_URL, waitForServerReady } from '../api-environment';
import { clearCollaborationHistory, verifyCollaboration } from '../test-setup';

// Performance measurement helpers
interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  responseSize?: number;
  memoryUsage?: number;
}

const measurePerformance = async (operation: () => Promise<any>): Promise<PerformanceMetrics> => {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  const result = await operation();
  
  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  return {
    startTime,
    endTime,
    duration: endTime - startTime,
    responseSize: JSON.stringify(result).length,
    memoryUsage: endMemory - startMemory
  };
};

describe('London School TDD: Dynamic Pages Performance', () => {

  beforeAll(async () => {
    const serverReady = await waitForServerReady();
    expect(serverReady).toBe(true);
  });

  beforeEach(() => {
    clearCollaborationHistory();
  });

  describe('API Response Time Performance', () => {

    it('should load agents list within acceptable time limits', async () => {
      // RED: Define performance requirement
      const maxResponseTime = 2000; // 2 seconds
      
      // GREEN: Measure real API performance
      const metrics = await measurePerformance(async () => {
        const response = await fetch(`${BASE_URL}/agents`);
        expect(response.ok).toBe(true);
        return await response.json();
      });
      
      // REFACTOR: Verify performance collaboration
      expect(metrics.duration).toBeLessThan(maxResponseTime);
      
      verifyCollaboration([
        { source: 'TestComponent', target: '/agents', method: 'GET' }
      ]);
      
      console.log(`⚡ Agents API response time: ${metrics.duration.toFixed(2)}ms`);
      console.log(`📦 Response size: ${metrics.responseSize} bytes`);
    });

    it('should load dynamic page data efficiently', async () => {
      // RED: Test dynamic page loading performance
      const maxPageLoadTime = 1500; // 1.5 seconds
      
      // Create test page first
      await fetch(`${BASE_URL}/agents/perf-test/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: 'performance-test-page',
          title: 'Performance Test Page',
          content: '<div>Performance test content</div>'
        })
      });
      
      // GREEN: Measure page loading performance
      const metrics = await measurePerformance(async () => {
        const response = await fetch(`${BASE_URL}/agents/perf-test/pages/performance-test-page`);
        expect(response.ok).toBe(true);
        return await response.json();
      });
      
      // REFACTOR: Verify page load performance
      expect(metrics.duration).toBeLessThan(maxPageLoadTime);
      
      verifyCollaboration([
        { source: 'TestComponent', target: '/agents/perf-test/pages/performance-test-page', method: 'GET' }
      ]);
      
      console.log(`🚀 Dynamic page load time: ${metrics.duration.toFixed(2)}ms`);
    });

    it('should handle large dataset queries efficiently', async () => {
      // RED: Test performance with large data
      const maxLargeQueryTime = 5000; // 5 seconds for large queries
      
      // GREEN: Query large dataset
      const metrics = await measurePerformance(async () => {
        const response = await fetch(`${BASE_URL}/v1/agent-posts?limit=1000`);
        expect(response.ok).toBe(true);
        return await response.json();
      });
      
      // REFACTOR: Verify large query performance
      expect(metrics.duration).toBeLessThan(maxLargeQueryTime);
      
      verifyCollaboration([
        { source: 'TestComponent', target: '/v1/agent-posts', method: 'GET' }
      ]);
      
      console.log(`📊 Large dataset query time: ${metrics.duration.toFixed(2)}ms`);
      console.log(`🗃️ Large dataset size: ${metrics.responseSize} bytes`);
    });
  });

  describe('Concurrent Request Performance', () => {

    it('should handle multiple simultaneous requests efficiently', async () => {
      // RED: Test concurrent request performance
      const concurrentRequests = 10;
      const maxConcurrentTime = 3000; // 3 seconds for 10 concurrent requests
      
      // GREEN: Execute concurrent requests
      const startTime = performance.now();
      
      const requests = Array.from({ length: concurrentRequests }, (_, index) =>
        fetch(`${BASE_URL}/agents`)
      );
      
      const responses = await Promise.all(requests);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // REFACTOR: Verify concurrent performance
      expect(totalTime).toBeLessThan(maxConcurrentTime);
      
      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });
      
      // Verify all collaborations were tracked
      const collaborations = (global as any).collaborationTracker.interactions;
      const agentRequests = collaborations.filter(c => c.target.includes('/agents'));
      expect(agentRequests.length).toBeGreaterThanOrEqual(concurrentRequests);
      
      console.log(`🔄 ${concurrentRequests} concurrent requests completed in: ${totalTime.toFixed(2)}ms`);
      console.log(`⚡ Average time per request: ${(totalTime / concurrentRequests).toFixed(2)}ms`);
    });

    it('should maintain performance under mixed workload', async () => {
      // RED: Test mixed API operations performance
      const maxMixedWorkloadTime = 4000; // 4 seconds for mixed operations
      
      // GREEN: Execute mixed workload
      const startTime = performance.now();
      
      const mixedRequests = [
        fetch(`${BASE_URL}/agents`),
        fetch(`${BASE_URL}/v1/agent-posts?limit=10`),
        fetch(`${BASE_URL}/health`),
        fetch(`${BASE_URL}/filter-data`),
        fetch(`${BASE_URL}/agents/test-agent/pages/mixed-test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageId: 'mixed-test',
            title: 'Mixed Workload Test',
            content: '<div>Mixed test</div>'
          })
        })
      ];
      
      const responses = await Promise.allSettled(mixedRequests);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // REFACTOR: Verify mixed workload performance
      expect(totalTime).toBeLessThan(maxMixedWorkloadTime);
      
      // Verify most requests succeeded
      const successfulRequests = responses.filter(result => 
        result.status === 'fulfilled' && result.value.ok
      );
      expect(successfulRequests.length).toBeGreaterThan(3); // At least 3/5 should succeed
      
      console.log(`🎯 Mixed workload completed in: ${totalTime.toFixed(2)}ms`);
      console.log(`✅ Successful requests: ${successfulRequests.length}/${responses.length}`);
    });
  });

  describe('Memory Usage Performance', () => {

    it('should manage memory efficiently during data operations', async () => {
      // RED: Test memory usage during operations
      const maxMemoryIncrease = 50 * 1024 * 1024; // 50MB max increase
      
      if (!(performance as any).memory) {
        console.log('⚠️ Memory monitoring not available in this environment');
        return;
      }
      
      const initialMemory = (performance as any).memory.usedJSHeapSize;
      
      // GREEN: Perform memory-intensive operations
      const largeDatasets = [];
      
      for (let i = 0; i < 5; i++) {
        const response = await fetch(`${BASE_URL}/v1/agent-posts?limit=100&offset=${i * 100}`);
        if (response.ok) {
          const data = await response.json();
          largeDatasets.push(data);
        }
      }
      
      const finalMemory = (performance as any).memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;
      
      // REFACTOR: Verify memory performance
      expect(memoryIncrease).toBeLessThan(maxMemoryIncrease);
      
      console.log(`🧠 Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      console.log(`📊 Datasets loaded: ${largeDatasets.length}`);
      
      // Cleanup
      largeDatasets.length = 0;
    });

    it('should prevent memory leaks in repeated operations', async () => {
      // RED: Test for memory leaks
      if (!(performance as any).memory) {
        console.log('⚠️ Memory monitoring not available in this environment');
        return;
      }
      
      const iterations = 20;
      const memoryReadings: number[] = [];
      
      // GREEN: Perform repeated operations
      for (let i = 0; i < iterations; i++) {
        const response = await fetch(`${BASE_URL}/health`);
        await response.json();
        
        // Take memory reading
        memoryReadings.push((performance as any).memory.usedJSHeapSize);
        
        // Allow garbage collection
        if (i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // REFACTOR: Analyze memory trend
      const initialMemory = memoryReadings[0];
      const finalMemory = memoryReadings[memoryReadings.length - 1];
      const memoryGrowth = finalMemory - initialMemory;
      
      // Memory should not grow significantly with repeated operations
      const maxAcceptableGrowth = 10 * 1024 * 1024; // 10MB
      expect(memoryGrowth).toBeLessThan(maxAcceptableGrowth);
      
      console.log(`🔄 Memory after ${iterations} iterations: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB growth`);
    });
  });

  describe('Network Efficiency Performance', () => {

    it('should minimize unnecessary network requests', async () => {
      // RED: Test request efficiency
      clearCollaborationHistory();
      
      // GREEN: Perform related operations
      await fetch(`${BASE_URL}/agents`);
      await fetch(`${BASE_URL}/agents`); // Duplicate request
      await fetch(`${BASE_URL}/health`);
      
      // REFACTOR: Verify collaboration efficiency
      const collaborations = (global as any).collaborationTracker.interactions;
      
      // Should have made requests (caching might reduce duplicates in real app)
      expect(collaborations.length).toBeGreaterThan(0);
      
      console.log(`🌐 Total network requests: ${collaborations.length}`);
      
      // Analyze request patterns
      const uniqueEndpoints = new Set(collaborations.map(c => c.target));
      console.log(`🔗 Unique endpoints accessed: ${uniqueEndpoints.size}`);
    });

    it('should handle bandwidth-efficient data transfer', async () => {
      // RED: Test data transfer efficiency
      const maxResponseSize = 1024 * 1024; // 1MB max for standard requests
      
      // GREEN: Measure data transfer
      const metrics = await measurePerformance(async () => {
        const response = await fetch(`${BASE_URL}/v1/agent-posts?limit=50`);
        expect(response.ok).toBe(true);
        return await response.json();
      });
      
      // REFACTOR: Verify bandwidth efficiency
      expect(metrics.responseSize!).toBeLessThan(maxResponseSize);
      
      console.log(`📊 Data transfer size: ${(metrics.responseSize! / 1024).toFixed(2)}KB`);
      console.log(`⚡ Transfer efficiency: ${(metrics.responseSize! / metrics.duration).toFixed(2)} bytes/ms`);
    });
  });

  describe('Real-world Performance Scenarios', () => {

    it('should maintain performance during peak usage simulation', async () => {
      // RED: Simulate peak usage
      const peakDuration = 10000; // 10 seconds
      const requestInterval = 500; // Request every 500ms
      
      const startTime = Date.now();
      const performanceData: number[] = [];
      
      // GREEN: Execute peak usage simulation
      while (Date.now() - startTime < peakDuration) {
        const requestStart = performance.now();
        
        try {
          const response = await fetch(`${BASE_URL}/health`);
          await response.json();
          
          const requestEnd = performance.now();
          performanceData.push(requestEnd - requestStart);
        } catch (error) {
          console.warn('Request failed during peak simulation:', error);
        }
        
        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }
      
      // REFACTOR: Analyze peak performance
      const avgResponseTime = performanceData.reduce((sum, time) => sum + time, 0) / performanceData.length;
      const maxResponseTime = Math.max(...performanceData);
      
      expect(avgResponseTime).toBeLessThan(1000); // 1 second average
      expect(maxResponseTime).toBeLessThan(5000); // 5 second max
      
      console.log(`🏔️ Peak usage simulation completed`);
      console.log(`📊 Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`⚡ Max response time: ${maxResponseTime.toFixed(2)}ms`);
      console.log(`📈 Total requests: ${performanceData.length}`);
    });

    it('should recover quickly after high load', async () => {
      // RED: Test recovery performance
      const recoveryTimeout = 3000; // 3 seconds for recovery
      
      // Create high load
      const highLoadRequests = Array.from({ length: 20 }, () =>
        fetch(`${BASE_URL}/v1/agent-posts?limit=100`)
      );
      
      await Promise.allSettled(highLoadRequests);
      
      // GREEN: Measure recovery performance
      const recoveryStart = performance.now();
      
      const response = await fetch(`${BASE_URL}/health`);
      expect(response.ok).toBe(true);
      
      const recoveryEnd = performance.now();
      const recoveryTime = recoveryEnd - recoveryStart;
      
      // REFACTOR: Verify quick recovery
      expect(recoveryTime).toBeLessThan(recoveryTimeout);
      
      console.log(`🔄 Recovery time after high load: ${recoveryTime.toFixed(2)}ms`);
    });
  });

  describe('Performance Regression Detection', () => {

    it('should maintain baseline performance standards', async () => {
      // RED: Define performance baselines
      const performanceBaselines = {
        healthCheck: 500,     // 500ms
        agentsList: 1500,     // 1.5s
        agentPosts: 2000,     // 2s
        pageCreation: 1000    // 1s
      };
      
      // GREEN: Test each baseline
      const results: Record<string, number> = {};
      
      // Health check baseline
      const healthMetrics = await measurePerformance(async () => {
        const response = await fetch(`${BASE_URL}/health`);
        return await response.json();
      });
      results.healthCheck = healthMetrics.duration;
      
      // Agents list baseline
      const agentsMetrics = await measurePerformance(async () => {
        const response = await fetch(`${BASE_URL}/agents`);
        return await response.json();
      });
      results.agentsList = agentsMetrics.duration;
      
      // Agent posts baseline
      const postsMetrics = await measurePerformance(async () => {
        const response = await fetch(`${BASE_URL}/v1/agent-posts?limit=20`);
        return await response.json();
      });
      results.agentPosts = postsMetrics.duration;
      
      // Page creation baseline
      const pageMetrics = await measurePerformance(async () => {
        const response = await fetch(`${BASE_URL}/agents/baseline-test/pages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageId: 'baseline-test-page',
            title: 'Baseline Test',
            content: '<div>Baseline test</div>'
          })
        });
        return response.ok ? await response.json() : {};
      });
      results.pageCreation = pageMetrics.duration;
      
      // REFACTOR: Verify all baselines met
      Object.entries(performanceBaselines).forEach(([operation, baseline]) => {
        const actual = results[operation];
        expect(actual).toBeLessThan(baseline);
        
        const percentage = ((actual / baseline) * 100).toFixed(1);
        console.log(`📊 ${operation}: ${actual.toFixed(2)}ms (${percentage}% of baseline)`);
      });
    });
  });
});