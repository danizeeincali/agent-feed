#!/usr/bin/env node

/**
 * Advanced Load Testing Framework
 * Implements comprehensive load testing scenarios for distributed systems
 */

const http = require('http');
const https = require('https');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

class DistributedLoadTestRunner {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000',
      maxWorkers: config.maxWorkers || require('os').cpus().length,
      reportInterval: config.reportInterval || 5000,
      warmupDuration: config.warmupDuration || 10000,
      ...config
    };
    
    this.workers = [];
    this.results = {
      requests: 0,
      successful: 0,
      errors: 0,
      responseTimes: [],
      throughput: 0,
      errorTypes: {},
      statusCodes: {}
    };
    
    this.scenarios = this.getLoadTestScenarios();
  }

  async runAllScenarios() {
    console.log('🏋️ Starting Distributed Load Testing Framework');
    console.log('===============================================');
    
    const allResults = {};
    
    for (const [scenarioName, scenario] of Object.entries(this.scenarios)) {
      console.log(`\n🎯 Running scenario: ${scenarioName}`);
      console.log(`   Users: ${scenario.users}, Duration: ${scenario.duration}ms, Pattern: ${scenario.pattern}`);
      
      const scenarioResults = await this.runScenario(scenario);
      allResults[scenarioName] = scenarioResults;
      
      // Brief pause between scenarios
      console.log('   ⏸️  Cooling down for 5 seconds...');
      await this.sleep(5000);
    }
    
    // Generate comprehensive report
    const report = await this.generateLoadTestReport(allResults);
    await this.saveReport(report);
    
    console.log('\n✅ Load testing completed successfully!');
    return report;
  }

  async runScenario(scenario) {
    const results = {
      scenario: scenario,
      startTime: Date.now(),
      requests: 0,
      successful: 0,
      errors: 0,
      responseTimes: [],
      throughput: 0,
      errorTypes: {},
      statusCodes: {},
      resourceUsage: [],
      workers: []
    };
    
    // Start resource monitoring
    const resourceMonitor = this.startResourceMonitoring(results);
    
    try {
      // Warmup phase
      if (scenario.warmup) {
        console.log('     🔥 Warming up...');
        await this.warmupPhase(scenario);
      }
      
      // Main load test phase
      console.log('     🚀 Starting main load test...');
      await this.executeLoadTest(scenario, results);
      
      // Calculate final metrics
      results.endTime = Date.now();
      results.totalDuration = results.endTime - results.startTime;
      results.throughput = (results.successful / results.totalDuration) * 1000; // req/sec
      
      if (results.responseTimes.length > 0) {
        results.averageResponseTime = this.calculateAverage(results.responseTimes);
        results.p50ResponseTime = this.calculatePercentile(results.responseTimes, 50);
        results.p95ResponseTime = this.calculatePercentile(results.responseTimes, 95);
        results.p99ResponseTime = this.calculatePercentile(results.responseTimes, 99);
        results.maxResponseTime = Math.max(...results.responseTimes);
        results.minResponseTime = Math.min(...results.responseTimes);
      }
      
      results.successRate = results.successful / results.requests;
      results.errorRate = results.errors / results.requests;
      
    } finally {
      // Stop resource monitoring
      clearInterval(resourceMonitor);
    }
    
    return results;
  }

  async executeLoadTest(scenario, results) {
    const workerPromises = [];
    const workersToSpawn = Math.min(scenario.users, this.config.maxWorkers);
    const usersPerWorker = Math.ceil(scenario.users / workersToSpawn);
    
    console.log(`     👥 Spawning ${workersToSpawn} workers (${usersPerWorker} users each)`);
    
    // Spawn worker threads
    for (let i = 0; i < workersToSpawn; i++) {
      const workerConfig = {
        workerId: i,
        users: i === workersToSpawn - 1 ? 
          scenario.users - (i * usersPerWorker) : // Last worker gets remaining users
          usersPerWorker,
        duration: scenario.duration,
        pattern: scenario.pattern,
        endpoints: scenario.endpoints,
        baseUrl: this.config.baseUrl,
        thinkTime: scenario.thinkTime || [500, 2000] // min, max think time
      };
      
      const workerPromise = this.spawnLoadTestWorker(workerConfig);
      workerPromises.push(workerPromise);
    }
    
    // Start progress reporting
    const progressReporter = this.startProgressReporting(results, scenario.duration);
    
    // Wait for all workers to complete
    const workerResults = await Promise.all(workerPromises);
    
    // Stop progress reporting
    clearInterval(progressReporter);
    
    // Aggregate results from all workers
    this.aggregateWorkerResults(results, workerResults);
    
    console.log(`     ✅ Completed: ${results.requests} requests, ${results.successful} successful`);
  }

  async spawnLoadTestWorker(config) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData: { isWorker: true, config }
      });
      
      const workerResults = {
        workerId: config.workerId,
        requests: 0,
        successful: 0,
        errors: 0,
        responseTimes: [],
        errorTypes: {},
        statusCodes: {}
      };
      
      worker.on('message', (message) => {
        switch (message.type) {
          case 'request_completed':
            workerResults.requests++;
            if (message.data.success) {
              workerResults.successful++;
              workerResults.responseTimes.push(message.data.responseTime);
            } else {
              workerResults.errors++;
            }
            
            // Track status codes
            const statusCode = message.data.statusCode || 'unknown';
            workerResults.statusCodes[statusCode] = (workerResults.statusCodes[statusCode] || 0) + 1;
            
            // Track error types
            if (message.data.error) {
              const errorType = message.data.error.code || 'unknown';
              workerResults.errorTypes[errorType] = (workerResults.errorTypes[errorType] || 0) + 1;
            }
            break;
            
          case 'worker_completed':
            worker.terminate();
            resolve(workerResults);
            break;
            
          case 'worker_error':
            worker.terminate();
            reject(new Error(message.error));
            break;
        }
      });
      
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }

  startProgressReporting(results, duration) {
    const startTime = Date.now();
    
    return setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const progress = Math.min(100, (elapsed / duration) * 100);
      
      const currentThroughput = results.requests > 0 ? 
        (results.successful / elapsed) * 1000 : 0;
      
      process.stdout.write(
        `\r     📊 Progress: ${progress.toFixed(1)}% | ` +
        `Requests: ${results.requests} | ` +
        `Success: ${results.successful} | ` +
        `Errors: ${results.errors} | ` +
        `Throughput: ${currentThroughput.toFixed(1)} req/s | ` +
        `Remaining: ${Math.ceil(remaining / 1000)}s`
      );
      
      if (remaining === 0) {
        console.log(); // New line after completion
      }
    }, 1000);
  }

  startResourceMonitoring(results) {
    return setInterval(async () => {
      try {
        const usage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        results.resourceUsage.push({
          timestamp: Date.now(),
          memory: {
            rss: usage.rss,
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            external: usage.external
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          }
        });
      } catch (error) {
        // Ignore monitoring errors
      }
    }, 5000);
  }

  aggregateWorkerResults(results, workerResults) {
    for (const workerResult of workerResults) {
      results.requests += workerResult.requests;
      results.successful += workerResult.successful;
      results.errors += workerResult.errors;
      results.responseTimes.push(...workerResult.responseTimes);
      
      // Merge status codes
      for (const [code, count] of Object.entries(workerResult.statusCodes)) {
        results.statusCodes[code] = (results.statusCodes[code] || 0) + count;
      }
      
      // Merge error types
      for (const [type, count] of Object.entries(workerResult.errorTypes)) {
        results.errorTypes[type] = (results.errorTypes[type] || 0) + count;
      }
      
      results.workers.push({
        workerId: workerResult.workerId,
        requests: workerResult.requests,
        successful: workerResult.successful,
        errors: workerResult.errors,
        averageResponseTime: this.calculateAverage(workerResult.responseTimes)
      });
    }
  }

  getLoadTestScenarios() {
    return {
      'baseline_performance': {
        users: 1,
        duration: 30000,
        pattern: 'constant',
        endpoints: [
          { path: '/api/v1/agent-posts', weight: 0.8 },
          { path: '/api/v1/agent-posts/search?q=test', weight: 0.2 }
        ],
        warmup: true,
        thinkTime: [1000, 2000]
      },
      
      'moderate_load': {
        users: 10,
        duration: 60000,
        pattern: 'constant',
        endpoints: [
          { path: '/api/v1/agent-posts', weight: 0.6 },
          { path: '/api/v1/agent-posts/search?q=test', weight: 0.3 },
          { path: '/api/v1/agent-posts/1', weight: 0.1 }
        ],
        warmup: true,
        thinkTime: [500, 1500]
      },
      
      'high_concurrency': {
        users: 50,
        duration: 45000,
        pattern: 'ramp_up',
        endpoints: [
          { path: '/api/v1/agent-posts', weight: 0.5 },
          { path: '/api/v1/agent-posts/search?q=performance', weight: 0.3 },
          { path: '/api/v1/agent-posts?page=2', weight: 0.2 }
        ],
        warmup: true,
        thinkTime: [200, 800]
      },
      
      'stress_test': {
        users: 100,
        duration: 30000,
        pattern: 'burst',
        endpoints: [
          { path: '/api/v1/agent-posts', weight: 0.7 },
          { path: '/api/v1/agent-posts/search?q=load', weight: 0.3 }
        ],
        warmup: false,
        thinkTime: [100, 500]
      },
      
      'endurance_test': {
        users: 25,
        duration: 300000, // 5 minutes
        pattern: 'constant',
        endpoints: [
          { path: '/api/v1/agent-posts', weight: 0.4 },
          { path: '/api/v1/agent-posts/search?q=endurance', weight: 0.3 },
          { path: '/api/v1/agent-posts?limit=50', weight: 0.3 }
        ],
        warmup: true,
        thinkTime: [1000, 3000]
      }
    };
  }

  async generateLoadTestReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(results),
      scenarios: results,
      recommendations: this.generateLoadTestRecommendations(results),
      compliance: this.validateLoadTestTargets(results)
    };
    
    return report;
  }

  generateSummary(results) {
    const summary = {
      totalScenarios: Object.keys(results).length,
      overallRating: 'GOOD',
      keyFindings: [],
      criticalIssues: []
    };
    
    // Analyze key metrics across scenarios
    let totalRequests = 0;
    let totalSuccessful = 0;
    let maxThroughput = 0;
    let avgResponseTimes = [];
    
    for (const [scenarioName, result] of Object.entries(results)) {
      totalRequests += result.requests;
      totalSuccessful += result.successful;
      maxThroughput = Math.max(maxThroughput, result.throughput);
      
      if (result.averageResponseTime) {
        avgResponseTimes.push(result.averageResponseTime);
      }
      
      // Check for critical issues
      if (result.successRate < 0.95) {
        summary.criticalIssues.push(
          `${scenarioName}: Low success rate (${(result.successRate * 100).toFixed(1)}%)`
        );
      }
      
      if (result.averageResponseTime > 1000) {
        summary.criticalIssues.push(
          `${scenarioName}: High response time (${result.averageResponseTime.toFixed(2)}ms)`
        );
      }
    }
    
    summary.overallSuccessRate = totalSuccessful / totalRequests;
    summary.maxThroughputAchieved = maxThroughput;
    summary.averageResponseTime = this.calculateAverage(avgResponseTimes);
    
    // Determine overall rating
    if (summary.overallSuccessRate >= 0.99 && summary.averageResponseTime <= 200) {
      summary.overallRating = 'EXCELLENT';
    } else if (summary.overallSuccessRate >= 0.95 && summary.averageResponseTime <= 500) {
      summary.overallRating = 'GOOD';
    } else if (summary.overallSuccessRate >= 0.90 && summary.averageResponseTime <= 1000) {
      summary.overallRating = 'FAIR';
    } else {
      summary.overallRating = 'POOR';
    }
    
    // Key findings
    if (maxThroughput >= 50) {
      summary.keyFindings.push('System handles high throughput well (>50 req/s)');
    }
    
    if (summary.averageResponseTime <= 200) {
      summary.keyFindings.push('Response times consistently under target (200ms)');
    }
    
    return summary;
  }

  generateLoadTestRecommendations(results) {
    const recommendations = [];
    
    // Analyze each scenario for issues
    for (const [scenarioName, result] of Object.entries(results)) {
      if (result.errorRate > 0.05) {
        recommendations.push({
          category: 'RELIABILITY',
          priority: 'HIGH',
          scenario: scenarioName,
          title: 'High Error Rate Detected',
          description: `Error rate is ${(result.errorRate * 100).toFixed(1)}% in ${scenarioName}`,
          suggestion: 'Investigate error causes and implement better error handling'
        });
      }
      
      if (result.p99ResponseTime > result.p50ResponseTime * 10) {
        recommendations.push({
          category: 'PERFORMANCE',
          priority: 'MEDIUM',
          scenario: scenarioName,
          title: 'High Response Time Variability',
          description: `P99 response time is ${(result.p99ResponseTime / result.p50ResponseTime).toFixed(1)}x higher than median`,
          suggestion: 'Optimize slow queries and implement response caching'
        });
      }
      
      if (result.throughput < 10) {
        recommendations.push({
          category: 'SCALABILITY',
          priority: 'HIGH',
          scenario: scenarioName,
          title: 'Low Throughput',
          description: `Throughput is only ${result.throughput.toFixed(2)} req/s`,
          suggestion: 'Scale infrastructure or optimize application performance'
        });
      }
    }
    
    return recommendations;
  }

  validateLoadTestTargets(results) {
    const targets = {
      throughput: 50, // req/sec
      responseTime: 200, // ms
      successRate: 0.95,
      p95ResponseTime: 500 // ms
    };
    
    const compliance = {};
    
    for (const [scenarioName, result] of Object.entries(results)) {
      compliance[scenarioName] = {
        throughput: {
          actual: result.throughput,
          target: targets.throughput,
          compliant: result.throughput >= targets.throughput
        },
        responseTime: {
          actual: result.averageResponseTime,
          target: targets.responseTime,
          compliant: result.averageResponseTime <= targets.responseTime
        },
        successRate: {
          actual: result.successRate,
          target: targets.successRate,
          compliant: result.successRate >= targets.successRate
        },
        p95ResponseTime: {
          actual: result.p95ResponseTime,
          target: targets.p95ResponseTime,
          compliant: result.p95ResponseTime <= targets.p95ResponseTime
        }
      };
    }
    
    return compliance;
  }

  async saveReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `load-test-report-${timestamp}.json`;
    const filepath = path.join(__dirname, 'reports', filename);
    
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Load test report saved: ${filepath}`);
  }

  // Utility methods
  calculateAverage(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
  
  calculatePercentile(numbers, percentile) {
    if (!numbers || numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async warmupPhase(scenario) {
    const warmupRequests = Math.min(10, scenario.users);
    const promises = [];
    
    for (let i = 0; i < warmupRequests; i++) {
      promises.push(this.makeRequest('/api/v1/agent-posts'));
      await this.sleep(100);
    }
    
    await Promise.all(promises);
  }

  async makeRequest(endpoint) {
    return new Promise((resolve) => {
      const url = new URL(endpoint, this.config.baseUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.request(url, { timeout: 30000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      });
      
      req.on('error', (error) => resolve({ error }));
      req.on('timeout', () => resolve({ error: new Error('timeout') }));
      req.end();
    });
  }
}

// Worker thread implementation
if (!isMainThread && workerData && workerData.isWorker) {
  const config = workerData.config;
  
  async function runWorker() {
    const endTime = Date.now() + config.duration;
    
    // Simulate multiple users
    const userPromises = [];
    for (let i = 0; i < config.users; i++) {
      userPromises.push(simulateUser(i, endTime, config));
    }
    
    await Promise.all(userPromises);
    parentPort.postMessage({ type: 'worker_completed' });
  }
  
  async function simulateUser(userId, endTime, config) {
    while (Date.now() < endTime) {
      try {
        const endpoint = selectEndpoint(config.endpoints);
        const start = performance.now();
        
        const response = await makeWorkerRequest(endpoint, config.baseUrl);
        const responseTime = performance.now() - start;
        
        parentPort.postMessage({
          type: 'request_completed',
          data: {
            userId,
            responseTime,
            success: response.statusCode >= 200 && response.statusCode < 300,
            statusCode: response.statusCode,
            error: response.error
          }
        });
        
        // Think time
        const thinkTime = Math.random() * (config.thinkTime[1] - config.thinkTime[0]) + config.thinkTime[0];
        await sleep(thinkTime);
        
      } catch (error) {
        parentPort.postMessage({
          type: 'request_completed',
          data: {
            userId,
            responseTime: 0,
            success: false,
            error: error
          }
        });
      }
    }
  }
  
  function selectEndpoint(endpoints) {
    const random = Math.random();
    let cumulative = 0;
    
    for (const endpoint of endpoints) {
      cumulative += endpoint.weight;
      if (random <= cumulative) {
        return endpoint.path;
      }
    }
    
    return endpoints[0].path;
  }
  
  function makeWorkerRequest(endpoint, baseUrl) {
    return new Promise((resolve) => {
      const url = new URL(endpoint, baseUrl);
      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.request(url, { timeout: 30000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      });
      
      req.on('error', (error) => resolve({ error }));
      req.on('timeout', () => resolve({ error: new Error('timeout') }));
      req.end();
    });
  }
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  runWorker().catch(error => {
    parentPort.postMessage({ type: 'worker_error', error: error.message });
  });
}

// CLI interface
if (require.main === module && isMainThread) {
  const loadTester = new DistributedLoadTestRunner({
    baseUrl: process.env.LOAD_TEST_URL || 'http://localhost:3000'
  });
  
  loadTester.runAllScenarios()
    .then(report => {
      console.log('\n🎉 Load testing completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Load testing failed:', error);
      process.exit(1);
    });
}

module.exports = DistributedLoadTestRunner;