/**
 * Agent Discovery Performance Tests
 * London School TDD - Performance and Load Testing
 */

const { jest, describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { PerformanceMetricsFactory, AgentDataFactory } = require('../utils/test-factories');

// Performance Test Subject
class AgentDiscoveryPerformanceTest {
  constructor(discoveryService, webSocketService, cacheService) {
    this.discoveryService = discoveryService;
    this.webSocketService = webSocketService;
    this.cacheService = cacheService;
    this.metrics = new Map();
  }

  async measureDiscoveryPerformance(agentCount = 100) {
    const startTime = performance.now();
    
    try {
      const agents = await this.discoveryService.discoverAgents(agentCount);
      const endTime = performance.now();
      
      const metrics = {
        totalTime: endTime - startTime,
        agentsProcessed: agents.length,
        throughput: agents.length / ((endTime - startTime) / 1000),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };
      
      this.metrics.set('discovery', metrics);
      return metrics;
    } catch (error) {
      const endTime = performance.now();
      throw new Error(`Discovery failed after ${endTime - startTime}ms: ${error.message}`);
    }
  }

  async measureWebSocketPerformance(eventCount = 1000) {
    const startTime = performance.now();
    const receivedEvents = [];
    
    return new Promise((resolve, reject) => {
      let eventsReceived = 0;
      
      const eventHandler = (event) => {
        receivedEvents.push(event);
        eventsReceived++;
        
        if (eventsReceived === eventCount) {
          const endTime = performance.now();
          const metrics = {
            totalTime: endTime - startTime,
            eventsProcessed: eventsReceived,
            throughput: eventsReceived / ((endTime - startTime) / 1000),
            averageLatency: receivedEvents.reduce((sum, evt) => 
              sum + (evt.processedAt - evt.timestamp), 0) / eventsReceived,
            memoryUsage: process.memoryUsage()
          };
          
          this.metrics.set('websocket', metrics);
          resolve(metrics);
        }
      };
      
      this.webSocketService.onMessage('test-event', eventHandler);
      
      // Simulate events
      for (let i = 0; i < eventCount; i++) {
        setTimeout(() => {
          this.webSocketService.simulateEvent('test-event', {
            id: i,
            timestamp: performance.now(),
            processedAt: performance.now()
          });
        }, i % 10); // Spread events over time
      }
      
      // Timeout after reasonable time
      setTimeout(() => {
        reject(new Error(`Timeout: Only received ${eventsReceived}/${eventCount} events`));
      }, 30000);
    });
  }

  async measureCachePerformance(operationCount = 10000) {
    const startTime = performance.now();
    
    // Test cache write performance
    const writeStartTime = performance.now();
    for (let i = 0; i < operationCount; i++) {
      const agent = AgentDataFactory.create({ id: `agent-${i}` });
      await this.cacheService.set(`agent-${i}`, agent);
    }
    const writeEndTime = performance.now();
    
    // Test cache read performance
    const readStartTime = performance.now();
    const readResults = [];
    for (let i = 0; i < operationCount; i++) {
      const agent = await this.cacheService.get(`agent-${i}`);
      readResults.push(agent);
    }
    const readEndTime = performance.now();
    
    const totalTime = performance.now() - startTime;
    
    const metrics = {
      totalTime,
      writeTime: writeEndTime - writeStartTime,
      readTime: readEndTime - readStartTime,
      operationsPerSecond: (operationCount * 2) / (totalTime / 1000),
      writeOpsPerSecond: operationCount / ((writeEndTime - writeStartTime) / 1000),
      readOpsPerSecond: operationCount / ((readEndTime - readStartTime) / 1000),
      memoryUsage: process.memoryUsage()
    };
    
    this.metrics.set('cache', metrics);
    return metrics;
  }

  async measureConcurrentLoad(concurrentUsers = 50) {
    const promises = [];
    
    for (let i = 0; i < concurrentUsers; i++) {
      promises.push(this.simulateUserSession(i));
    }
    
    const startTime = performance.now();
    const results = await Promise.allSettled(promises);
    const endTime = performance.now();
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    const metrics = {
      totalTime: endTime - startTime,
      concurrentUsers,
      successfulSessions: successful,
      failedSessions: failed,
      successRate: successful / concurrentUsers,
      averageSessionTime: results
        .filter(r => r.status === 'fulfilled')
        .reduce((sum, r) => sum + r.value.sessionTime, 0) / successful,
      memoryUsage: process.memoryUsage()
    };
    
    this.metrics.set('concurrent', metrics);
    return metrics;
  }

  async simulateUserSession(userId) {
    const sessionStart = performance.now();
    
    try {
      // Simulate user discovering agents
      await this.discoveryService.discoverAgents();
      
      // Simulate user searching and filtering
      await this.discoveryService.searchAgents('personal');
      await this.discoveryService.filterAgents(['active']);
      
      // Simulate user selecting agents
      const agents = await this.discoveryService.getAgents();
      if (agents.length > 0) {
        await this.discoveryService.selectAgent(agents[0].id);
      }
      
      // Simulate real-time updates
      await this.webSocketService.subscribe('agent-status-change');
      
      const sessionEnd = performance.now();
      return {
        userId,
        sessionTime: sessionEnd - sessionStart,
        success: true
      };
    } catch (error) {
      const sessionEnd = performance.now();
      return {
        userId,
        sessionTime: sessionEnd - sessionStart,
        success: false,
        error: error.message
      };
    }
  }

  getMetricsSummary() {
    const summary = {};
    
    for (const [testType, metrics] of this.metrics) {
      summary[testType] = {
        ...metrics,
        performanceGrade: this.calculatePerformanceGrade(testType, metrics)
      };
    }
    
    return summary;
  }

  calculatePerformanceGrade(testType, metrics) {
    const thresholds = {
      discovery: {
        excellent: { totalTime: 1000, throughput: 100 },
        good: { totalTime: 3000, throughput: 50 },
        fair: { totalTime: 5000, throughput: 20 }
      },
      websocket: {
        excellent: { totalTime: 1000, throughput: 1000 },
        good: { totalTime: 3000, throughput: 500 },
        fair: { totalTime: 5000, throughput: 200 }
      },
      cache: {
        excellent: { operationsPerSecond: 10000 },
        good: { operationsPerSecond: 5000 },
        fair: { operationsPerSecond: 1000 }
      },
      concurrent: {
        excellent: { successRate: 0.99, averageSessionTime: 2000 },
        good: { successRate: 0.95, averageSessionTime: 5000 },
        fair: { successRate: 0.9, averageSessionTime: 10000 }
      }
    };

    const threshold = thresholds[testType];
    if (!threshold) return 'unknown';

    if (this.meetsThreshold(metrics, threshold.excellent)) return 'excellent';
    if (this.meetsThreshold(metrics, threshold.good)) return 'good';
    if (this.meetsThreshold(metrics, threshold.fair)) return 'fair';
    return 'poor';
  }

  meetsThreshold(metrics, threshold) {
    for (const [key, expectedValue] of Object.entries(threshold)) {
      if (key.includes('Time') && metrics[key] > expectedValue) return false;
      if (key.includes('Rate') && metrics[key] < expectedValue) return false;
      if (key.includes('PerSecond') && metrics[key] < expectedValue) return false;
      if (key === 'throughput' && metrics[key] < expectedValue) return false;
    }
    return true;
  }
}

// Mock Services for Performance Testing
class MockDiscoveryService {
  constructor() {
    this.discoverAgents = jest.fn();
    this.searchAgents = jest.fn();
    this.filterAgents = jest.fn();
    this.selectAgent = jest.fn();
    this.getAgents = jest.fn();
  }
}

class MockWebSocketService {
  constructor() {
    this.onMessage = jest.fn();
    this.subscribe = jest.fn();
    this.simulateEvent = jest.fn();
    this.messageHandlers = new Map();
  }
}

class MockCacheService {
  constructor() {
    this.cache = new Map();
    this.set = jest.fn().mockImplementation((key, value) => {
      this.cache.set(key, value);
      return Promise.resolve();
    });
    this.get = jest.fn().mockImplementation((key) => {
      return Promise.resolve(this.cache.get(key));
    });
  }
}

describe('Agent Discovery Performance Tests', () => {
  let performanceTest;
  let mockDiscoveryService;
  let mockWebSocketService;
  let mockCacheService;

  beforeEach(() => {
    mockDiscoveryService = new MockDiscoveryService();
    mockWebSocketService = new MockWebSocketService();
    mockCacheService = new MockCacheService();
    
    performanceTest = new AgentDiscoveryPerformanceTest(
      mockDiscoveryService,
      mockWebSocketService,
      mockCacheService
    );

    // Setup mock implementations
    mockDiscoveryService.discoverAgents.mockImplementation(async (count = 10) => {
      // Simulate processing time based on agent count
      await new Promise(resolve => setTimeout(resolve, count * 2));
      return AgentDataFactory.createMany(count);
    });

    mockDiscoveryService.searchAgents.mockResolvedValue([]);
    mockDiscoveryService.filterAgents.mockResolvedValue([]);
    mockDiscoveryService.selectAgent.mockResolvedValue({});
    mockDiscoveryService.getAgents.mockResolvedValue(AgentDataFactory.createMany(5));

    mockWebSocketService.onMessage.mockImplementation((eventType, handler) => {
      if (!mockWebSocketService.messageHandlers.has(eventType)) {
        mockWebSocketService.messageHandlers.set(eventType, new Set());
      }
      mockWebSocketService.messageHandlers.get(eventType).add(handler);
    });

    mockWebSocketService.simulateEvent.mockImplementation((eventType, data) => {
      const handlers = mockWebSocketService.messageHandlers.get(eventType);
      if (handlers) {
        handlers.forEach(handler => handler(data));
      }
    });

    mockWebSocketService.subscribe.mockResolvedValue();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Agent Discovery Performance', () => {
    it('should discover 10 agents within acceptable time limits', async () => {
      const metrics = await performanceTest.measureDiscoveryPerformance(10);

      expect(metrics.totalTime).toBeLessThan(1000); // Under 1 second
      expect(metrics.agentsProcessed).toBe(10);
      expect(metrics.throughput).toBeGreaterThan(10); // At least 10 agents per second
      expect(metrics.performanceGrade).not.toBe('poor');
    });

    it('should scale linearly with agent count', async () => {
      const metrics10 = await performanceTest.measureDiscoveryPerformance(10);
      const metrics50 = await performanceTest.measureDiscoveryPerformance(50);

      // Processing time should scale roughly linearly
      const scalingFactor = metrics50.totalTime / metrics10.totalTime;
      expect(scalingFactor).toBeLessThan(10); // Should not be worse than linear
      
      // Throughput should remain relatively stable
      const throughputRatio = metrics50.throughput / metrics10.throughput;
      expect(throughputRatio).toBeGreaterThan(0.5); // Should not degrade more than 50%
    });

    it('should handle large agent counts efficiently', async () => {
      const metrics = await performanceTest.measureDiscoveryPerformance(100);

      expect(metrics.totalTime).toBeLessThan(5000); // Under 5 seconds for 100 agents
      expect(metrics.agentsProcessed).toBe(100);
      expect(metrics.throughput).toBeGreaterThan(20); // Minimum throughput threshold
    });

    it('should maintain memory efficiency during discovery', async () => {
      const initialMemory = process.memoryUsage();
      await performanceTest.measureDiscoveryPerformance(50);
      
      const discoveryMetrics = performanceTest.metrics.get('discovery');
      const memoryIncrease = discoveryMetrics.memoryUsage.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB for 50 agents)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('WebSocket Performance', () => {
    it('should handle high-frequency events efficiently', async () => {
      const metrics = await performanceTest.measureWebSocketPerformance(1000);

      expect(metrics.totalTime).toBeLessThan(3000); // Under 3 seconds for 1000 events
      expect(metrics.eventsProcessed).toBe(1000);
      expect(metrics.throughput).toBeGreaterThan(300); // Minimum event throughput
      expect(metrics.averageLatency).toBeLessThan(10); // Low average latency
    });

    it('should maintain low latency under load', async () => {
      const metrics = await performanceTest.measureWebSocketPerformance(500);

      expect(metrics.averageLatency).toBeLessThan(20); // Max 20ms average latency
      expect(metrics.throughput).toBeGreaterThan(100); // Maintain throughput
    });

    it('should handle event bursts without dropping messages', async () => {
      const metrics = await performanceTest.measureWebSocketPerformance(100);

      expect(metrics.eventsProcessed).toBe(100); // All events processed
      expect(metrics.totalTime).toBeLessThan(1000); // Process quickly
    });
  });

  describe('Cache Performance', () => {
    it('should perform cache operations within acceptable time', async () => {
      const metrics = await performanceTest.measureCachePerformance(1000);

      expect(metrics.totalTime).toBeLessThan(2000); // Under 2 seconds for 2000 ops
      expect(metrics.operationsPerSecond).toBeGreaterThan(1000); // Min 1000 ops/sec
      expect(metrics.writeOpsPerSecond).toBeGreaterThan(500);
      expect(metrics.readOpsPerSecond).toBeGreaterThan(500);
    });

    it('should show read operations are faster than write operations', async () => {
      const metrics = await performanceTest.measureCachePerformance(500);

      expect(metrics.readTime).toBeLessThan(metrics.writeTime);
      expect(metrics.readOpsPerSecond).toBeGreaterThan(metrics.writeOpsPerSecond);
    });

    it('should scale cache operations efficiently', async () => {
      const metrics1k = await performanceTest.measureCachePerformance(1000);
      const metrics5k = await performanceTest.measureCachePerformance(5000);

      // Operations per second should not degrade significantly
      const degradation = metrics1k.operationsPerSecond / metrics5k.operationsPerSecond;
      expect(degradation).toBeLessThan(2); // Less than 50% degradation
    });
  });

  describe('Concurrent User Load', () => {
    it('should handle moderate concurrent load', async () => {
      const metrics = await performanceTest.measureConcurrentLoad(25);

      expect(metrics.successRate).toBeGreaterThan(0.9); // 90% success rate
      expect(metrics.averageSessionTime).toBeLessThan(5000); // Under 5 seconds per session
      expect(metrics.failedSessions).toBeLessThan(3); // Maximum 3 failed sessions
    });

    it('should handle high concurrent load gracefully', async () => {
      const metrics = await performanceTest.measureConcurrentLoad(50);

      expect(metrics.successRate).toBeGreaterThan(0.8); // 80% success rate under high load
      expect(metrics.totalTime).toBeLessThan(10000); // Complete within 10 seconds
    });

    it('should maintain system stability under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      await performanceTest.measureConcurrentLoad(30);
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory should not increase excessively
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regression in discovery', async () => {
      const baselineMetrics = await performanceTest.measureDiscoveryPerformance(50);
      
      // Simulate performance regression
      mockDiscoveryService.discoverAgents.mockImplementation(async (count = 10) => {
        await new Promise(resolve => setTimeout(resolve, count * 20)); // 10x slower
        return AgentDataFactory.createMany(count);
      });
      
      const regressionMetrics = await performanceTest.measureDiscoveryPerformance(50);
      
      const performanceRatio = regressionMetrics.totalTime / baselineMetrics.totalTime;
      expect(performanceRatio).toBeGreaterThan(5); // Detect significant regression
    });

    it('should track performance trends over time', async () => {
      const measurements = [];
      
      for (let i = 0; i < 5; i++) {
        const metrics = await performanceTest.measureDiscoveryPerformance(20);
        measurements.push(metrics.totalTime);
      }
      
      // Calculate performance stability (coefficient of variation)
      const mean = measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
      const variance = measurements.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / measurements.length;
      const coefficientOfVariation = Math.sqrt(variance) / mean;
      
      expect(coefficientOfVariation).toBeLessThan(0.3); // Less than 30% variation
    });
  });

  describe('Performance Grading and Reporting', () => {
    it('should calculate accurate performance grades', async () => {
      await performanceTest.measureDiscoveryPerformance(10);
      await performanceTest.measureWebSocketPerformance(100);
      await performanceTest.measureCachePerformance(1000);
      
      const summary = performanceTest.getMetricsSummary();
      
      expect(summary).toHaveProperty('discovery');
      expect(summary).toHaveProperty('websocket');
      expect(summary).toHaveProperty('cache');
      
      expect(['excellent', 'good', 'fair', 'poor']).toContain(summary.discovery.performanceGrade);
      expect(['excellent', 'good', 'fair', 'poor']).toContain(summary.websocket.performanceGrade);
      expect(['excellent', 'good', 'fair', 'poor']).toContain(summary.cache.performanceGrade);
    });

    it('should provide comprehensive performance metrics', async () => {
      await performanceTest.measureDiscoveryPerformance(25);
      
      const summary = performanceTest.getMetricsSummary();
      const discoveryMetrics = summary.discovery;
      
      expect(discoveryMetrics).toHaveProperty('totalTime');
      expect(discoveryMetrics).toHaveProperty('agentsProcessed');
      expect(discoveryMetrics).toHaveProperty('throughput');
      expect(discoveryMetrics).toHaveProperty('memoryUsage');
      expect(discoveryMetrics).toHaveProperty('performanceGrade');
      expect(discoveryMetrics).toHaveProperty('timestamp');
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform multiple discovery cycles
      for (let i = 0; i < 10; i++) {
        await performanceTest.measureDiscoveryPerformance(10);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // Less than 20MB
    });

    it('should cleanup WebSocket handlers properly', async () => {
      const initialHandlerCount = mockWebSocketService.messageHandlers.size;
      
      // Simulate multiple subscriptions and cleanup
      for (let i = 0; i < 5; i++) {
        await performanceTest.measureWebSocketPerformance(50);
      }
      
      // Handler count should not keep growing
      expect(mockWebSocketService.messageHandlers.size).toBe(initialHandlerCount);
    });
  });
});