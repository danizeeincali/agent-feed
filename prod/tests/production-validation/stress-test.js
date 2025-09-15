/**
 * Claude Code Stress Testing and Scalability Validation
 * Location: /workspaces/agent-feed/prod/tests/production-validation/
 *
 * Tests system behavior under high load and concurrent usage
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const EventEmitter = require('events');

class StressTestRunner extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxConcurrent = options.maxConcurrent || 10;
    this.testDuration = options.testDuration || 30000; // 30 seconds
    this.testDir = options.testDir || '/workspaces/agent-feed/prod';
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      responseTimes: [],
      errors: [],
      memoryUsage: [],
      cpuUsage: []
    };
  }

  async runStressTest() {
    console.log(`Starting stress test with ${this.maxConcurrent} concurrent instances for ${this.testDuration}ms`);

    const startTime = Date.now();
    const endTime = startTime + this.testDuration;
    const activeRequests = new Set();
    let requestId = 0;

    // Monitor system resources
    const resourceMonitor = setInterval(() => {
      const usage = process.memoryUsage();
      this.results.memoryUsage.push({
        timestamp: Date.now(),
        heap: usage.heapUsed,
        external: usage.external,
        rss: usage.rss
      });

      // Get CPU usage if available
      if (process.cpuUsage) {
        const cpuUsage = process.cpuUsage();
        this.results.cpuUsage.push({
          timestamp: Date.now(),
          user: cpuUsage.user,
          system: cpuUsage.system
        });
      }
    }, 1000);

    // Keep spawning requests until test duration ends
    while (Date.now() < endTime) {
      if (activeRequests.size < this.maxConcurrent) {
        const currentRequestId = ++requestId;
        const requestPromise = this.executeRequest(currentRequestId);
        activeRequests.add(requestPromise);

        requestPromise
          .then(result => {
            this.recordResult(result);
            activeRequests.delete(requestPromise);
          })
          .catch(error => {
            this.recordError(error, currentRequestId);
            activeRequests.delete(requestPromise);
          });
      }

      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('Waiting for remaining requests to complete...');

    // Wait for all active requests to complete
    await Promise.allSettled([...activeRequests]);

    clearInterval(resourceMonitor);

    // Calculate final statistics
    this.calculateFinalStats();

    return this.results;
  }

  async executeRequest(requestId) {
    const startTime = Date.now();
    const testOperations = [
      'Calculate factorial of 10',
      'List files in current directory',
      `Create temp file temp-${requestId}.txt with content "Request ${requestId}"`,
      'Show current date and time',
      'Calculate sum of numbers 1 to 100',
      'Generate 5 random numbers',
      `Echo "Processing request ${requestId}"`
    ];

    const operation = testOperations[requestId % testOperations.length];

    return new Promise((resolve, reject) => {
      const process = spawn('claude', [
        '--dangerously-skip-permissions',
        '-p',
        operation
      ], { cwd: this.testDir });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => stdout += data.toString());
      process.stderr.on('data', (data) => stderr += data.toString());

      const timeout = setTimeout(() => {
        process.kill();
        reject(new Error(`Request ${requestId} timed out`));
      }, 15000); // 15 second timeout

      process.on('close', (code) => {
        clearTimeout(timeout);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        resolve({
          requestId,
          code,
          stdout,
          stderr,
          responseTime,
          operation,
          success: code === 0
        });
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  recordResult(result) {
    this.results.totalRequests++;

    if (result.success) {
      this.results.successfulRequests++;
    } else {
      this.results.failedRequests++;
    }

    this.results.responseTimes.push(result.responseTime);
    this.results.maxResponseTime = Math.max(this.results.maxResponseTime, result.responseTime);
    this.results.minResponseTime = Math.min(this.results.minResponseTime, result.responseTime);

    this.emit('request-complete', result);
  }

  recordError(error, requestId) {
    this.results.totalRequests++;
    this.results.failedRequests++;
    this.results.errors.push({
      requestId,
      error: error.message,
      timestamp: Date.now()
    });

    this.emit('request-error', { requestId, error });
  }

  calculateFinalStats() {
    if (this.results.responseTimes.length > 0) {
      const sum = this.results.responseTimes.reduce((a, b) => a + b, 0);
      this.results.averageResponseTime = sum / this.results.responseTimes.length;

      // Calculate percentiles
      const sorted = this.results.responseTimes.sort((a, b) => a - b);
      this.results.p50 = sorted[Math.floor(sorted.length * 0.5)];
      this.results.p90 = sorted[Math.floor(sorted.length * 0.9)];
      this.results.p99 = sorted[Math.floor(sorted.length * 0.99)];
    }

    this.results.successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
    this.results.errorRate = (this.results.failedRequests / this.results.totalRequests) * 100;
  }

  getReport() {
    return {
      summary: {
        totalRequests: this.results.totalRequests,
        successfulRequests: this.results.successfulRequests,
        failedRequests: this.results.failedRequests,
        successRate: `${this.results.successRate.toFixed(2)}%`,
        errorRate: `${this.results.errorRate.toFixed(2)}%`
      },
      performance: {
        averageResponseTime: `${this.results.averageResponseTime.toFixed(2)}ms`,
        maxResponseTime: `${this.results.maxResponseTime}ms`,
        minResponseTime: `${this.results.minResponseTime}ms`,
        p50: `${this.results.p50}ms`,
        p90: `${this.results.p90}ms`,
        p99: `${this.results.p99}ms`
      },
      errors: this.results.errors.slice(0, 10), // First 10 errors for diagnosis
      resourceUsage: {
        peakMemory: Math.max(...this.results.memoryUsage.map(m => m.heap)),
        avgMemory: this.results.memoryUsage.reduce((sum, m) => sum + m.heap, 0) / this.results.memoryUsage.length,
        memoryGrowth: this.results.memoryUsage.length > 1 ?
          this.results.memoryUsage[this.results.memoryUsage.length - 1].heap - this.results.memoryUsage[0].heap : 0
      }
    };
  }
}

// Jest test wrapper
describe('Claude Code Stress Testing', () => {
  const testDir = '/workspaces/agent-feed/prod';

  beforeAll(async () => {
    // Ensure test directory exists
    try {
      await fs.access(testDir);
    } catch {
      throw new Error(`Test directory does not exist: ${testDir}`);
    }
  });

  afterAll(async () => {
    // Cleanup temp files
    try {
      const files = await fs.readdir(testDir);
      const tempFiles = files.filter(f => f.startsWith('temp-') && f.endsWith('.txt'));
      await Promise.all(tempFiles.map(f => fs.unlink(path.join(testDir, f)).catch(() => {})));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('Light load test - 5 concurrent instances for 15 seconds', async () => {
    const runner = new StressTestRunner({
      maxConcurrent: 5,
      testDuration: 15000,
      testDir
    });

    const results = await runner.runStressTest();
    const report = runner.getReport();

    console.log('Light Load Test Results:', JSON.stringify(report, null, 2));

    // Assertions for light load
    expect(report.summary.successRate).toMatch(/^(\d+(\.\d+)?)%$/);
    expect(parseFloat(report.summary.successRate)).toBeGreaterThan(90); // 90% success rate
    expect(parseFloat(report.performance.averageResponseTime)).toBeLessThan(10000); // 10s average
    expect(results.errors.length).toBeLessThan(results.totalRequests * 0.1); // Less than 10% errors
  }, 30000);

  test('Medium load test - 10 concurrent instances for 20 seconds', async () => {
    const runner = new StressTestRunner({
      maxConcurrent: 10,
      testDuration: 20000,
      testDir
    });

    const results = await runner.runStressTest();
    const report = runner.getReport();

    console.log('Medium Load Test Results:', JSON.stringify(report, null, 2));

    // Assertions for medium load
    expect(parseFloat(report.summary.successRate)).toBeGreaterThan(85); // 85% success rate
    expect(parseFloat(report.performance.averageResponseTime)).toBeLessThan(15000); // 15s average
  }, 45000);

  test('Heavy load test - 15 concurrent instances for 25 seconds', async () => {
    const runner = new StressTestRunner({
      maxConcurrent: 15,
      testDuration: 25000,
      testDir
    });

    let requestCount = 0;
    let errorCount = 0;

    runner.on('request-complete', (result) => {
      requestCount++;
      if (requestCount % 10 === 0) {
        console.log(`Completed ${requestCount} requests, ${errorCount} errors`);
      }
    });

    runner.on('request-error', () => {
      errorCount++;
    });

    const results = await runner.runStressTest();
    const report = runner.getReport();

    console.log('Heavy Load Test Results:', JSON.stringify(report, null, 2));

    // More lenient assertions for heavy load
    expect(parseFloat(report.summary.successRate)).toBeGreaterThan(75); // 75% success rate
    expect(parseFloat(report.performance.averageResponseTime)).toBeLessThan(20000); // 20s average
    expect(results.totalRequests).toBeGreaterThan(10); // Should handle at least 10 requests

    // Memory should not grow excessively
    if (report.resourceUsage.memoryGrowth > 0) {
      expect(report.resourceUsage.memoryGrowth).toBeLessThan(500 * 1024 * 1024); // 500MB growth
    }
  }, 60000);
});

module.exports = { StressTestRunner };