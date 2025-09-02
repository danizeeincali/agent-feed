/**
 * Performance Benchmarking Suite
 * Comprehensive performance testing for production validation
 */

const WebSocket = require('ws');
const axios = require('axios');
const { performance, PerformanceObserver } = require('perf_hooks');

class PerformanceBenchmark {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:5173',
      wsUrl: config.wsUrl || 'ws://localhost:3001',
      apiUrl: config.apiUrl || 'http://localhost:3001/api',
      
      // Benchmark parameters
      warmupIterations: config.warmupIterations || 10,
      benchmarkIterations: config.benchmarkIterations || 100,
      concurrentUsers: config.concurrentUsers || 20,
      testDuration: config.testDuration || 60000, // 1 minute
      
      // Performance thresholds
      connectionTimeThreshold: config.connectionTimeThreshold || 1000, // 1s
      responseTimeThreshold: config.responseTimeThreshold || 5000, // 5s
      throughputThreshold: config.throughputThreshold || 10, // req/s
      memoryGrowthThreshold: config.memoryGrowthThreshold || 50 * 1024 * 1024, // 50MB
      
      ...config
    };
    
    this.metrics = {
      connectionTimes: [],
      responseTimes: [],
      throughput: [],
      memorySnapshots: [],
      errorRates: [],
      concurrencyMetrics: []
    };
    
    this.setupPerformanceObserver();
  }

  setupPerformanceObserver() {
    this.perfObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'measure') {
          this.metrics.performanceMeasures = this.metrics.performanceMeasures || [];
          this.metrics.performanceMeasures.push({
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            timestamp: Date.now()
          });
        }
      });
    });
    
    this.perfObserver.observe({ entryTypes: ['measure'] });
  }

  async runComprehensiveBenchmark() {
    const benchmarkId = `benchmark-${Date.now()}`;
    console.log(`🚀 Starting comprehensive performance benchmark: ${benchmarkId}`);
    
    const results = {
      benchmarkId,
      timestamp: new Date().toISOString(),
      config: this.config,
      results: {}
    };

    try {
      // Warmup phase
      console.log('🔥 Running warmup phase...');
      await this.runWarmup();
      
      // Connection performance
      console.log('🔌 Benchmarking connection performance...');
      results.results.connectionPerformance = await this.benchmarkConnectionPerformance();
      
      // API response performance
      console.log('🤖 Benchmarking API response performance...');
      results.results.apiPerformance = await this.benchmarkAPIPerformance();
      
      // Throughput testing
      console.log('📊 Benchmarking throughput...');
      results.results.throughputPerformance = await this.benchmarkThroughput();
      
      // Concurrent user testing
      console.log('👥 Benchmarking concurrent user performance...');
      results.results.concurrencyPerformance = await this.benchmarkConcurrency();
      
      // Memory performance
      console.log('💾 Benchmarking memory performance...');
      results.results.memoryPerformance = await this.benchmarkMemoryUsage();
      
      // Stability under load
      console.log('⚖️  Benchmarking stability under sustained load...');
      results.results.stabilityPerformance = await this.benchmarkStability();

      // Generate performance report
      results.summary = this.generatePerformanceSummary();
      results.passed = this.evaluatePerformanceThresholds(results.results);
      
      return results;

    } catch (error) {
      console.error(`❌ Benchmark failed: ${error.message}`);
      return {
        ...results,
        error: error.message,
        passed: false
      };
    }
  }

  async runWarmup() {
    const warmupPromises = [];
    
    for (let i = 0; i < this.config.warmupIterations; i++) {
      warmupPromises.push(this.performWarmupOperation());
    }
    
    await Promise.allSettled(warmupPromises);
    console.log('✅ Warmup completed');
  }

  async performWarmupOperation() {
    try {
      // Warm up WebSocket connection
      const ws = new WebSocket(this.config.wsUrl);
      await new Promise((resolve) => {
        ws.on('open', () => {
          ws.close();
          resolve();
        });
        ws.on('error', () => resolve());
      });
      
      // Warm up API
      await axios.get(`${this.config.apiUrl}/health`).catch(() => {});
      
    } catch (error) {
      // Ignore warmup errors
    }
  }

  async benchmarkConnectionPerformance() {
    console.log('📏 Measuring WebSocket connection performance...');
    
    const connectionTimes = [];
    const promises = [];

    for (let i = 0; i < this.config.benchmarkIterations; i++) {
      promises.push(this.measureConnectionTime(`conn-${i}`));
    }

    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    
    successful.forEach(result => {
      if (result.connectionTime) {
        connectionTimes.push(result.connectionTime);
      }
    });

    const stats = this.calculateStatistics(connectionTimes);

    return {
      totalAttempts: this.config.benchmarkIterations,
      successfulConnections: successful.length,
      failedConnections: this.config.benchmarkIterations - successful.length,
      successRate: (successful.length / this.config.benchmarkIterations) * 100,
      connectionTimeStats: stats,
      thresholdMet: stats.average < this.config.connectionTimeThreshold
    };
  }

  async measureConnectionTime(connectionId) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      performance.mark(`connection-start-${connectionId}`);
      
      const ws = new WebSocket(this.config.wsUrl);
      
      const timeout = setTimeout(() => {
        ws.close();
        resolve({ connectionId, connectionTime: null, timedOut: true });
      }, 10000);

      ws.on('open', () => {
        clearTimeout(timeout);
        const connectionTime = Date.now() - startTime;
        performance.mark(`connection-end-${connectionId}`);
        performance.measure(
          `connection-${connectionId}`, 
          `connection-start-${connectionId}`, 
          `connection-end-${connectionId}`
        );
        
        ws.close();
        resolve({ connectionId, connectionTime, success: true });
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        resolve({ connectionId, connectionTime: null, error: error.message });
      });
    });
  }

  async benchmarkAPIPerformance() {
    console.log('🤖 Measuring API response performance...');
    
    const responseTimes = [];
    const testMessages = [
      'Hello, test message 1',
      'What is 2+2?',
      'Tell me about Node.js',
      'How are you doing?',
      'Goodbye'
    ];

    for (let i = 0; i < this.config.benchmarkIterations; i++) {
      const message = testMessages[i % testMessages.length];
      const result = await this.measureAPIResponseTime(message, `api-${i}`);
      
      if (result.responseTime) {
        responseTimes.push(result.responseTime);
      }
    }

    const stats = this.calculateStatistics(responseTimes);

    return {
      totalRequests: this.config.benchmarkIterations,
      successfulRequests: responseTimes.length,
      failedRequests: this.config.benchmarkIterations - responseTimes.length,
      successRate: (responseTimes.length / this.config.benchmarkIterations) * 100,
      responseTimeStats: stats,
      thresholdMet: stats.average < this.config.responseTimeThreshold
    };
  }

  async measureAPIResponseTime(message, requestId) {
    try {
      const startTime = Date.now();
      performance.mark(`api-start-${requestId}`);
      
      const response = await axios.post(`${this.config.apiUrl}/chat`, {
        message,
        sessionId: requestId
      }, {
        timeout: 30000
      });
      
      const responseTime = Date.now() - startTime;
      performance.mark(`api-end-${requestId}`);
      performance.measure(`api-${requestId}`, `api-start-${requestId}`, `api-end-${requestId}`);
      
      return {
        requestId,
        responseTime,
        success: true,
        statusCode: response.status,
        responseLength: response.data.response ? response.data.response.length : 0
      };
      
    } catch (error) {
      return {
        requestId,
        responseTime: null,
        success: false,
        error: error.message
      };
    }
  }

  async benchmarkThroughput() {
    console.log('📈 Measuring system throughput...');
    
    const throughputResults = [];
    const testDuration = 30000; // 30 seconds
    const startTime = Date.now();
    
    let requestCount = 0;
    const requestPromises = [];

    // Send requests continuously for the test duration
    const sendRequests = async () => {
      while (Date.now() - startTime < testDuration) {
        const promise = this.measureAPIResponseTime(
          `Throughput test message ${requestCount}`, 
          `throughput-${requestCount}`
        );
        requestPromises.push(promise);
        requestCount++;
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };

    await sendRequests();
    const results = await Promise.allSettled(requestPromises);
    
    const successful = results.filter(r => 
      r.status === 'fulfilled' && r.value.success
    ).length;
    
    const actualDuration = Date.now() - startTime;
    const throughput = (successful / actualDuration) * 1000; // requests per second

    return {
      testDuration: actualDuration,
      totalRequests: requestCount,
      successfulRequests: successful,
      failedRequests: requestCount - successful,
      throughput: throughput.toFixed(2),
      thresholdMet: throughput >= this.config.throughputThreshold
    };
  }

  async benchmarkConcurrency() {
    console.log('👥 Measuring concurrent user performance...');
    
    const concurrentResults = [];
    const userPromises = [];

    // Simulate concurrent users
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      userPromises.push(this.simulateConcurrentUser(`user-${i}`));
    }

    const startTime = Date.now();
    const results = await Promise.allSettled(userPromises);
    const totalTime = Date.now() - startTime;

    const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed = results.length - successful.length;

    // Calculate concurrency metrics
    const responseTimes = successful
      .filter(user => user.operations)
      .flatMap(user => user.operations.map(op => op.responseTime))
      .filter(time => time !== null);

    const stats = responseTimes.length > 0 ? this.calculateStatistics(responseTimes) : null;

    return {
      concurrentUsers: this.config.concurrentUsers,
      successfulUsers: successful.length,
      failedUsers: failed,
      totalTime,
      responseTimeStats: stats,
      averageUserCompletionTime: successful.length > 0 
        ? successful.reduce((sum, user) => sum + user.totalTime, 0) / successful.length
        : 0,
      systemStability: failed / this.config.concurrentUsers < 0.1 // Less than 10% failure
    };
  }

  async simulateConcurrentUser(userId) {
    const operations = [];
    const startTime = Date.now();
    
    try {
      // Each user performs multiple operations
      for (let i = 0; i < 5; i++) {
        const operation = await this.measureAPIResponseTime(
          `User ${userId} operation ${i}`,
          `${userId}-op-${i}`
        );
        operations.push(operation);
        
        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      return {
        userId,
        success: true,
        operations,
        totalTime: Date.now() - startTime,
        completedOperations: operations.filter(op => op.success).length
      };

    } catch (error) {
      return {
        userId,
        success: false,
        error: error.message,
        totalTime: Date.now() - startTime,
        operations
      };
    }
  }

  async benchmarkMemoryUsage() {
    console.log('💾 Measuring memory performance...');
    
    const memorySnapshots = [];
    const testDuration = 30000; // 30 seconds
    const startTime = Date.now();
    
    // Initial memory snapshot
    memorySnapshots.push({
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      phase: 'initial'
    });

    // Create some load while monitoring memory
    const loadPromises = [];
    for (let i = 0; i < 20; i++) {
      loadPromises.push(this.createMemoryLoad(`load-${i}`));
    }

    // Monitor memory during load
    const memoryMonitor = setInterval(() => {
      memorySnapshots.push({
        timestamp: Date.now(),
        memory: process.memoryUsage(),
        phase: 'under_load'
      });
    }, 1000);

    await Promise.allSettled(loadPromises);
    
    // Wait a bit more and take final snapshot
    setTimeout(() => {
      clearInterval(memoryMonitor);
      memorySnapshots.push({
        timestamp: Date.now(),
        memory: process.memoryUsage(),
        phase: 'after_load'
      });
    }, 5000);

    await new Promise(resolve => setTimeout(resolve, 6000));

    const initialHeap = memorySnapshots[0].memory.heapUsed;
    const finalHeap = memorySnapshots[memorySnapshots.length - 1].memory.heapUsed;
    const heapGrowth = finalHeap - initialHeap;

    const maxHeap = Math.max(...memorySnapshots.map(s => s.memory.heapUsed));
    const avgHeap = memorySnapshots.reduce((sum, s) => sum + s.memory.heapUsed, 0) / memorySnapshots.length;

    return {
      initialMemory: this.formatBytes(initialHeap),
      finalMemory: this.formatBytes(finalHeap),
      memoryGrowth: this.formatBytes(heapGrowth),
      maxMemoryUsed: this.formatBytes(maxHeap),
      averageMemoryUsed: this.formatBytes(avgHeap),
      memoryGrowthBytes: heapGrowth,
      thresholdMet: heapGrowth < this.config.memoryGrowthThreshold,
      snapshots: memorySnapshots
    };
  }

  async createMemoryLoad(loadId) {
    // Simulate memory-intensive operations
    const ws = new WebSocket(this.config.wsUrl);
    
    return new Promise((resolve) => {
      ws.on('open', () => {
        // Send multiple messages
        for (let i = 0; i < 10; i++) {
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'memory_load_test',
              loadId,
              data: 'x'.repeat(1000), // 1KB of data
              sequence: i
            }));
          }, i * 100);
        }

        setTimeout(() => {
          ws.close();
          resolve({ loadId, success: true });
        }, 2000);
      });

      ws.on('error', () => {
        resolve({ loadId, success: false });
      });
    });
  }

  async benchmarkStability() {
    console.log('⚖️  Measuring system stability under sustained load...');
    
    const stabilityMetrics = {
      startTime: Date.now(),
      errors: [],
      responseTimeHistory: [],
      memoryHistory: [],
      connectionFailures: 0,
      apiFailures: 0
    };

    const testDuration = this.config.testDuration;
    const endTime = Date.now() + testDuration;
    
    // Continuous low-level load
    const loadInterval = setInterval(async () => {
      try {
        // Test API
        const apiResult = await this.measureAPIResponseTime(
          'Stability test message',
          `stability-${Date.now()}`
        );
        
        if (apiResult.success) {
          stabilityMetrics.responseTimeHistory.push({
            timestamp: Date.now(),
            responseTime: apiResult.responseTime
          });
        } else {
          stabilityMetrics.apiFailures++;
          stabilityMetrics.errors.push({
            type: 'api_failure',
            error: apiResult.error,
            timestamp: Date.now()
          });
        }

        // Test WebSocket connection
        const connectionResult = await this.measureConnectionTime(`stability-${Date.now()}`);
        if (!connectionResult.success) {
          stabilityMetrics.connectionFailures++;
          stabilityMetrics.errors.push({
            type: 'connection_failure',
            error: connectionResult.error,
            timestamp: Date.now()
          });
        }

      } catch (error) {
        stabilityMetrics.errors.push({
          type: 'stability_test_error',
          error: error.message,
          timestamp: Date.now()
        });
      }
    }, 5000); // Every 5 seconds

    // Memory monitoring
    const memoryInterval = setInterval(() => {
      stabilityMetrics.memoryHistory.push({
        timestamp: Date.now(),
        memory: process.memoryUsage()
      });
    }, 10000); // Every 10 seconds

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, testDuration));
    
    clearInterval(loadInterval);
    clearInterval(memoryInterval);

    const actualDuration = Date.now() - stabilityMetrics.startTime;
    const totalOperations = stabilityMetrics.responseTimeHistory.length + stabilityMetrics.connectionFailures + stabilityMetrics.apiFailures;
    const errorRate = totalOperations > 0 ? (stabilityMetrics.errors.length / totalOperations) * 100 : 0;

    return {
      testDuration: actualDuration,
      totalOperations,
      successfulOperations: stabilityMetrics.responseTimeHistory.length,
      totalErrors: stabilityMetrics.errors.length,
      errorRate: errorRate.toFixed(2) + '%',
      connectionFailures: stabilityMetrics.connectionFailures,
      apiFailures: stabilityMetrics.apiFailures,
      averageResponseTime: stabilityMetrics.responseTimeHistory.length > 0
        ? stabilityMetrics.responseTimeHistory.reduce((sum, r) => sum + r.responseTime, 0) / stabilityMetrics.responseTimeHistory.length
        : 0,
      systemStable: errorRate < 5, // Less than 5% error rate
      memoryStable: this.analyzeMemoryStability(stabilityMetrics.memoryHistory)
    };
  }

  analyzeMemoryStability(memoryHistory) {
    if (memoryHistory.length < 2) return true;

    const heapUsages = memoryHistory.map(m => m.memory.heapUsed);
    const initialHeap = heapUsages[0];
    const finalHeap = heapUsages[heapUsages.length - 1];
    const growth = finalHeap - initialHeap;
    const growthPercentage = (growth / initialHeap) * 100;

    return {
      stable: growthPercentage < 20, // Less than 20% growth
      initialHeap: this.formatBytes(initialHeap),
      finalHeap: this.formatBytes(finalHeap),
      growth: this.formatBytes(growth),
      growthPercentage: growthPercentage.toFixed(2) + '%'
    };
  }

  calculateStatistics(values) {
    if (values.length === 0) {
      return { average: 0, min: 0, max: 0, median: 0, p95: 0, p99: 0 };
    }

    const sorted = values.sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      average: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  generatePerformanceSummary() {
    return {
      testConfiguration: {
        iterations: this.config.benchmarkIterations,
        concurrentUsers: this.config.concurrentUsers,
        testDuration: this.config.testDuration
      },
      thresholds: {
        connectionTime: this.config.connectionTimeThreshold + 'ms',
        responseTime: this.config.responseTimeThreshold + 'ms',
        throughput: this.config.throughputThreshold + ' req/s',
        memoryGrowth: this.formatBytes(this.config.memoryGrowthThreshold)
      }
    };
  }

  evaluatePerformanceThresholds(results) {
    const checks = [
      results.connectionPerformance?.thresholdMet !== false,
      results.apiPerformance?.thresholdMet !== false,
      results.throughputPerformance?.thresholdMet !== false,
      results.memoryPerformance?.thresholdMet !== false,
      results.concurrencyPerformance?.systemStability !== false,
      results.stabilityPerformance?.systemStable !== false
    ];

    return checks.every(check => check === true);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  cleanup() {
    if (this.perfObserver) {
      this.perfObserver.disconnect();
    }
  }
}

module.exports = { PerformanceBenchmark };