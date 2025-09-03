#!/usr/bin/env node

/**
 * Comprehensive Performance Benchmarker for Agent Feed System
 * Implements distributed consensus protocol performance analysis
 */

const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const https = require('https');
const { performance } = require('perf_hooks');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ConsensusPerformanceBenchmarker {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000',
      fallbackUrl: config.fallbackUrl || 'http://localhost:3001',
      concurrency: config.concurrency || 10,
      duration: config.duration || 60000,
      warmup: config.warmup || 5000,
      ...config
    };
    
    this.metrics = new Map();
    this.benchmarkResults = new Map();
    this.isRunning = false;
    this.startTime = null;
  }

  // Core benchmarking framework
  async runComprehensiveBenchmarks() {
    console.log('🚀 Starting Comprehensive Performance Benchmarking');
    console.log('================================================');
    
    this.isRunning = true;
    this.startTime = Date.now();
    
    const results = {
      timestamp: new Date().toISOString(),
      environment: await this.getEnvironmentInfo(),
      benchmarks: {}
    };

    try {
      // 1. Database Performance
      console.log('\n📊 Running Database Performance Tests...');
      results.benchmarks.database = await this.runDatabaseBenchmarks();
      
      // 2. API Endpoint Performance
      console.log('\n🌐 Running API Endpoint Performance Tests...');
      results.benchmarks.api = await this.runAPIBenchmarks();
      
      // 3. Frontend Performance
      console.log('\n⚡ Running Frontend Performance Tests...');
      results.benchmarks.frontend = await this.runFrontendBenchmarks();
      
      // 4. System Integration Performance
      console.log('\n🔧 Running System Integration Tests...');
      results.benchmarks.integration = await this.runIntegrationBenchmarks();
      
      // 5. Load Testing Scenarios
      console.log('\n🏋️ Running Load Testing Scenarios...');
      results.benchmarks.loadTesting = await this.runLoadTestingScenarios();
      
      // Generate comprehensive analysis
      results.analysis = await this.generatePerformanceAnalysis(results.benchmarks);
      results.recommendations = await this.generateOptimizationRecommendations(results.benchmarks);
      results.compliance = this.validatePerformanceTargets(results.benchmarks);
      
      // Save results
      await this.saveResults(results);
      
      console.log('\n✅ Performance Benchmarking Complete!');
      this.printSummaryReport(results);
      
      return results;
      
    } catch (error) {
      console.error('❌ Benchmarking failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // Database Performance Benchmarks
  async runDatabaseBenchmarks() {
    const results = {
      connectionPool: await this.testConnectionPoolEfficiency(),
      queryPerformance: await this.testQueryPerformance(),
      concurrentRequests: await this.testConcurrentDatabaseRequests(),
      searchPerformance: await this.testSearchQueryPerformance(),
      indexOptimization: await this.validateIndexUsage()
    };
    
    return results;
  }

  async testConnectionPoolEfficiency() {
    console.log('  📊 Testing connection pool efficiency...');
    
    const metrics = {
      acquisitionTimes: [],
      poolUtilization: [],
      connectionReuse: 0,
      errors: 0
    };
    
    const testDuration = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < testDuration) {
      try {
        const acquisitionStart = performance.now();
        
        // Test connection acquisition
        const response = await this.makeRequest('/api/v1/agent-posts?limit=1');
        
        const acquisitionTime = performance.now() - acquisitionStart;
        metrics.acquisitionTimes.push(acquisitionTime);
        
        if (response.statusCode === 200) {
          metrics.connectionReuse++;
        } else {
          metrics.errors++;
        }
        
        await this.sleep(100); // 100ms between requests
        
      } catch (error) {
        metrics.errors++;
      }
    }
    
    return {
      averageAcquisitionTime: this.calculateAverage(metrics.acquisitionTimes),
      p95AcquisitionTime: this.calculatePercentile(metrics.acquisitionTimes, 95),
      successRate: metrics.connectionReuse / (metrics.connectionReuse + metrics.errors),
      totalConnections: metrics.acquisitionTimes.length,
      errors: metrics.errors
    };
  }

  async testQueryPerformance() {
    console.log('  🔍 Testing query performance...');
    
    const queryTests = [
      {
        name: 'simple_select',
        endpoint: '/api/v1/agent-posts?limit=10',
        target: 100 // ms
      },
      {
        name: 'complex_search',
        endpoint: '/api/v1/agent-posts/search?q=test&limit=20',
        target: 500 // ms
      },
      {
        name: 'aggregation_query',
        endpoint: '/api/v1/agent-posts?groupBy=type&limit=50',
        target: 300 // ms
      },
      {
        name: 'paginated_query',
        endpoint: '/api/v1/agent-posts?page=2&limit=25',
        target: 200 // ms
      }
    ];
    
    const results = {};
    
    for (const test of queryTests) {
      console.log(`    Testing ${test.name}...`);
      
      const measurements = [];
      const sampleSize = 100;
      
      // Warmup
      for (let i = 0; i < 10; i++) {
        await this.makeRequest(test.endpoint);
      }
      
      // Actual measurements
      for (let i = 0; i < sampleSize; i++) {
        const start = performance.now();
        const response = await this.makeRequest(test.endpoint);
        const duration = performance.now() - start;
        
        measurements.push({
          duration,
          success: response.statusCode === 200,
          size: response.data ? JSON.stringify(response.data).length : 0
        });
      }
      
      const successfulMeasurements = measurements.filter(m => m.success);
      const durations = successfulMeasurements.map(m => m.duration);
      
      results[test.name] = {
        average: this.calculateAverage(durations),
        p50: this.calculatePercentile(durations, 50),
        p95: this.calculatePercentile(durations, 95),
        p99: this.calculatePercentile(durations, 99),
        target: test.target,
        compliance: this.calculateAverage(durations) <= test.target,
        successRate: successfulMeasurements.length / measurements.length,
        sampleSize: measurements.length
      };
    }
    
    return results;
  }

  async testConcurrentDatabaseRequests() {
    console.log('  ⚡ Testing concurrent request handling...');
    
    const concurrencyLevels = [1, 5, 10, 25, 50];
    const results = {};
    
    for (const concurrency of concurrencyLevels) {
      console.log(`    Testing with ${concurrency} concurrent requests...`);
      
      const promises = [];
      const startTime = performance.now();
      
      for (let i = 0; i < concurrency; i++) {
        promises.push(this.measureConcurrentRequest(i));
      }
      
      const responses = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      const successful = responses.filter(r => r.success);
      const durations = successful.map(r => r.duration);
      
      results[`concurrency_${concurrency}`] = {
        totalTime,
        successRate: successful.length / responses.length,
        averageResponseTime: this.calculateAverage(durations),
        p95ResponseTime: this.calculatePercentile(durations, 95),
        throughput: (successful.length / totalTime) * 1000, // req/sec
        errors: responses.length - successful.length
      };
    }
    
    return results;
  }

  async measureConcurrentRequest(requestId) {
    const start = performance.now();
    try {
      const response = await this.makeRequest('/api/v1/agent-posts?limit=10');
      return {
        requestId,
        duration: performance.now() - start,
        success: response.statusCode === 200,
        statusCode: response.statusCode
      };
    } catch (error) {
      return {
        requestId,
        duration: performance.now() - start,
        success: false,
        error: error.message
      };
    }
  }

  // API Endpoint Performance Benchmarks
  async runAPIBenchmarks() {
    const endpoints = [
      { path: '/api/v1/agent-posts', method: 'GET', target: 200 },
      { path: '/api/v1/agent-posts/search?q=test', method: 'GET', target: 300 },
      { path: '/api/v1/agent-posts', method: 'POST', target: 250 },
      { path: '/api/v1/agent-posts/1/engage', method: 'POST', target: 150 }
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      console.log(`  🌐 Testing ${endpoint.method} ${endpoint.path}...`);
      
      const measurements = await this.measureEndpointPerformance(endpoint);
      results[`${endpoint.method}_${endpoint.path.replace(/[^a-zA-Z0-9]/g, '_')}`] = measurements;
    }
    
    return results;
  }

  async measureEndpointPerformance(endpoint) {
    const measurements = [];
    const sampleSize = 50;
    
    // Warmup
    for (let i = 0; i < 5; i++) {
      await this.makeRequest(endpoint.path, endpoint.method);
    }
    
    // Measurements
    for (let i = 0; i < sampleSize; i++) {
      const start = performance.now();
      const response = await this.makeRequest(endpoint.path, endpoint.method);
      const duration = performance.now() - start;
      
      measurements.push({
        duration,
        success: response.statusCode >= 200 && response.statusCode < 300,
        statusCode: response.statusCode,
        size: response.data ? JSON.stringify(response.data).length : 0
      });
    }
    
    const successful = measurements.filter(m => m.success);
    const durations = successful.map(m => m.duration);
    
    return {
      average: this.calculateAverage(durations),
      p50: this.calculatePercentile(durations, 50),
      p95: this.calculatePercentile(durations, 95),
      p99: this.calculatePercentile(durations, 99),
      target: endpoint.target,
      compliance: this.calculateAverage(durations) <= endpoint.target,
      successRate: successful.length / measurements.length,
      throughput: (successful.length / (this.calculateSum(durations) / 1000)),
      errors: measurements.length - successful.length
    };
  }

  // Load Testing Scenarios
  async runLoadTestingScenarios() {
    const scenarios = [
      {
        name: '10_concurrent_users',
        users: 10,
        duration: 30000,
        pattern: 'constant'
      },
      {
        name: '50_simultaneous_requests',
        users: 50,
        duration: 20000,
        pattern: 'burst'
      },
      {
        name: 'realtime_engagement_updates',
        users: 15,
        duration: 45000,
        pattern: 'engagement'
      }
    ];
    
    const results = {};
    
    for (const scenario of scenarios) {
      console.log(`  🏋️ Running ${scenario.name} scenario...`);
      results[scenario.name] = await this.executeLoadTestScenario(scenario);
    }
    
    return results;
  }

  async executeLoadTestScenario(scenario) {
    const users = [];
    const results = {
      requests: 0,
      successful: 0,
      errors: 0,
      responseTimes: [],
      throughput: 0,
      concurrentUsers: scenario.users
    };
    
    const startTime = Date.now();
    
    // Spawn virtual users
    for (let i = 0; i < scenario.users; i++) {
      users.push(this.simulateUser(i, scenario, results));
    }
    
    // Wait for all users to complete
    await Promise.all(users);
    
    const totalTime = Date.now() - startTime;
    results.throughput = (results.successful / totalTime) * 1000; // req/sec
    results.averageResponseTime = this.calculateAverage(results.responseTimes);
    results.p95ResponseTime = this.calculatePercentile(results.responseTimes, 95);
    results.successRate = results.successful / results.requests;
    
    return results;
  }

  async simulateUser(userId, scenario, results) {
    const endTime = Date.now() + scenario.duration;
    
    while (Date.now() < endTime) {
      try {
        const start = performance.now();
        
        // Different patterns for different scenarios
        let endpoint;
        switch (scenario.pattern) {
          case 'engagement':
            endpoint = Math.random() > 0.5 ? '/api/v1/agent-posts' : '/api/v1/agent-posts/1/engage';
            break;
          case 'burst':
            endpoint = '/api/v1/agent-posts?limit=20';
            break;
          default:
            endpoint = '/api/v1/agent-posts?limit=10';
        }
        
        const response = await this.makeRequest(endpoint, 'GET');
        const duration = performance.now() - start;
        
        results.requests++;
        results.responseTimes.push(duration);
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          results.successful++;
        } else {
          results.errors++;
        }
        
        // User think time
        await this.sleep(Math.random() * 1000 + 500); // 500-1500ms
        
      } catch (error) {
        results.requests++;
        results.errors++;
      }
    }
  }

  // Frontend Performance (simulated via API calls)
  async runFrontendBenchmarks() {
    return {
      apiClientEfficiency: await this.testAPIClientPerformance(),
      componentRenderTime: await this.simulateComponentPerformance(),
      stateManagementOverhead: await this.testStateManagement(),
      realTimeUpdates: await this.testRealTimePerformance()
    };
  }

  async testAPIClientPerformance() {
    console.log('  ⚡ Testing API client efficiency...');
    
    const scenarios = [
      { name: 'batch_requests', count: 10 },
      { name: 'sequential_requests', count: 10 },
      { name: 'parallel_requests', count: 10 }
    ];
    
    const results = {};
    
    for (const scenario of scenarios) {
      const start = performance.now();
      
      if (scenario.name === 'sequential_requests') {
        for (let i = 0; i < scenario.count; i++) {
          await this.makeRequest('/api/v1/agent-posts?limit=5');
        }
      } else {
        const promises = [];
        for (let i = 0; i < scenario.count; i++) {
          promises.push(this.makeRequest('/api/v1/agent-posts?limit=5'));
        }
        await Promise.all(promises);
      }
      
      const duration = performance.now() - start;
      results[scenario.name] = {
        totalTime: duration,
        averagePerRequest: duration / scenario.count,
        requestCount: scenario.count
      };
    }
    
    return results;
  }

  // System Integration Performance
  async runIntegrationBenchmarks() {
    return {
      hybridBackendPerformance: await this.testHybridBackend(),
      claudeTerminalPreservation: await this.testClaudeTerminalFunctionality(),
      concurrentUserHandling: await this.testConcurrentUsers(),
      resourceMonitoring: await this.monitorSystemResources()
    };
  }

  async testHybridBackend() {
    console.log('  🔧 Testing hybrid backend performance...');
    
    const databaseResponse = await this.measureRequestTime('/api/v1/agent-posts');
    const fallbackResponse = await this.measureRequestTime('/api/v1/agent-posts', 'GET', this.config.fallbackUrl);
    
    return {
      databaseMode: databaseResponse,
      fallbackMode: fallbackResponse,
      performanceDelta: databaseResponse.duration - fallbackResponse.duration,
      recommendation: databaseResponse.duration <= fallbackResponse.duration * 1.5 ? 'OPTIMAL' : 'NEEDS_OPTIMIZATION'
    };
  }

  // Utility Methods
  async makeRequest(endpoint, method = 'GET', baseUrl = this.config.baseUrl) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, baseUrl);
      const options = {
        method,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PerformanceBenchmarker/1.0'
        }
      };
      
      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsedData = data ? JSON.parse(data) : null;
            resolve({
              statusCode: res.statusCode,
              data: parsedData,
              headers: res.headers
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              data: data,
              headers: res.headers
            });
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      req.end();
    });
  }

  async measureRequestTime(endpoint, method = 'GET', baseUrl = this.config.baseUrl) {
    const start = performance.now();
    try {
      const response = await this.makeRequest(endpoint, method, baseUrl);
      const duration = performance.now() - start;
      return {
        duration,
        success: response.statusCode >= 200 && response.statusCode < 300,
        statusCode: response.statusCode
      };
    } catch (error) {
      return {
        duration: performance.now() - start,
        success: false,
        error: error.message
      };
    }
  }

  // Analysis and Reporting
  validatePerformanceTargets(benchmarks) {
    const targets = {
      'API response time': { target: 200, unit: 'ms' },
      'Database queries (simple)': { target: 100, unit: 'ms' },
      'Database queries (complex)': { target: 500, unit: 'ms' },
      'Throughput': { target: 50, unit: 'req/sec' }
    };
    
    const compliance = {};
    
    // Check API performance
    if (benchmarks.api) {
      for (const [endpoint, metrics] of Object.entries(benchmarks.api)) {
        const avgTime = metrics.average;
        compliance[`${endpoint}_response_time`] = {
          actual: avgTime,
          target: 200,
          compliant: avgTime <= 200,
          percentage: (200 / avgTime) * 100
        };
      }
    }
    
    // Check database performance
    if (benchmarks.database && benchmarks.database.queryPerformance) {
      for (const [query, metrics] of Object.entries(benchmarks.database.queryPerformance)) {
        compliance[`${query}_query_time`] = {
          actual: metrics.average,
          target: metrics.target,
          compliant: metrics.compliance,
          percentage: metrics.compliance ? 100 : (metrics.target / metrics.average) * 100
        };
      }
    }
    
    return compliance;
  }

  async generatePerformanceAnalysis(benchmarks) {
    const analysis = {
      summary: this.generateSummaryAnalysis(benchmarks),
      bottlenecks: this.identifyBottlenecks(benchmarks),
      trends: this.analyzeTrends(benchmarks),
      resourceUtilization: this.analyzeResourceUsage(benchmarks)
    };
    
    return analysis;
  }

  generateSummaryAnalysis(benchmarks) {
    const summary = {
      overallPerformance: 'GOOD', // EXCELLENT, GOOD, FAIR, POOR
      keyMetrics: {},
      criticalIssues: [],
      achievements: []
    };
    
    // Aggregate key metrics
    if (benchmarks.api) {
      const apiTimes = Object.values(benchmarks.api).map(m => m.average);
      summary.keyMetrics.averageAPIResponseTime = this.calculateAverage(apiTimes);
      summary.keyMetrics.apiSuccessRate = this.calculateAverage(
        Object.values(benchmarks.api).map(m => m.successRate)
      );
    }
    
    if (benchmarks.database) {
      if (benchmarks.database.queryPerformance) {
        const dbTimes = Object.values(benchmarks.database.queryPerformance).map(m => m.average);
        summary.keyMetrics.averageDbQueryTime = this.calculateAverage(dbTimes);
      }
    }
    
    // Determine overall performance rating
    const avgApiTime = summary.keyMetrics.averageAPIResponseTime || 0;
    const avgDbTime = summary.keyMetrics.averageDbQueryTime || 0;
    
    if (avgApiTime <= 150 && avgDbTime <= 75) {
      summary.overallPerformance = 'EXCELLENT';
    } else if (avgApiTime <= 200 && avgDbTime <= 100) {
      summary.overallPerformance = 'GOOD';
    } else if (avgApiTime <= 300 && avgDbTime <= 200) {
      summary.overallPerformance = 'FAIR';
    } else {
      summary.overallPerformance = 'POOR';
    }
    
    return summary;
  }

  identifyBottlenecks(benchmarks) {
    const bottlenecks = [];
    
    // API bottlenecks
    if (benchmarks.api) {
      for (const [endpoint, metrics] of Object.entries(benchmarks.api)) {
        if (metrics.average > 300) {
          bottlenecks.push({
            type: 'API_LATENCY',
            component: endpoint,
            severity: 'HIGH',
            impact: `Response time ${metrics.average.toFixed(2)}ms exceeds target`,
            recommendation: 'Optimize query or add caching'
          });
        }
        
        if (metrics.successRate < 0.95) {
          bottlenecks.push({
            type: 'API_RELIABILITY',
            component: endpoint,
            severity: 'HIGH',
            impact: `Success rate ${(metrics.successRate * 100).toFixed(1)}% below target`,
            recommendation: 'Investigate error causes and improve error handling'
          });
        }
      }
    }
    
    // Database bottlenecks
    if (benchmarks.database && benchmarks.database.concurrentRequests) {
      for (const [level, metrics] of Object.entries(benchmarks.database.concurrentRequests)) {
        if (metrics.throughput < 30) { // Below 30 req/sec
          bottlenecks.push({
            type: 'DATABASE_THROUGHPUT',
            component: level,
            severity: 'MEDIUM',
            impact: `Throughput ${metrics.throughput.toFixed(2)} req/sec below optimal`,
            recommendation: 'Consider connection pool optimization or query optimization'
          });
        }
      }
    }
    
    return bottlenecks;
  }

  async generateOptimizationRecommendations(benchmarks) {
    const recommendations = [];
    
    // Performance-based recommendations
    if (benchmarks.database) {
      if (benchmarks.database.connectionPool && benchmarks.database.connectionPool.averageAcquisitionTime > 50) {
        recommendations.push({
          category: 'DATABASE',
          priority: 'HIGH',
          title: 'Optimize Connection Pool Configuration',
          description: 'Connection acquisition time is high. Consider increasing pool size or optimizing connection reuse.',
          expectedImprovement: '20-30% faster database operations',
          implementation: 'Increase pool size from default to 20-30 connections'
        });
      }
    }
    
    if (benchmarks.api) {
      const slowEndpoints = Object.entries(benchmarks.api)
        .filter(([_, metrics]) => metrics.average > 200)
        .map(([endpoint]) => endpoint);
        
      if (slowEndpoints.length > 0) {
        recommendations.push({
          category: 'API',
          priority: 'HIGH',
          title: 'Implement Response Caching',
          description: `Slow endpoints detected: ${slowEndpoints.join(', ')}`,
          expectedImprovement: '40-60% faster response times',
          implementation: 'Add Redis caching for frequently requested data'
        });
      }
    }
    
    // Load testing recommendations
    if (benchmarks.loadTesting) {
      const concurrentUserTest = benchmarks.loadTesting['50_simultaneous_requests'];
      if (concurrentUserTest && concurrentUserTest.successRate < 0.9) {
        recommendations.push({
          category: 'SCALABILITY',
          priority: 'HIGH',
          title: 'Improve Concurrent Request Handling',
          description: 'System struggles under high concurrent load',
          expectedImprovement: 'Better user experience during peak usage',
          implementation: 'Implement request queuing and rate limiting'
        });
      }
    }
    
    return recommendations;
  }

  // Utility calculation methods
  calculateAverage(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }
  
  calculateSum(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0);
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

  async getEnvironmentInfo() {
    try {
      const { stdout: nodeVersion } = await execAsync('node --version');
      const { stdout: npmVersion } = await execAsync('npm --version');
      const { stdout: osInfo } = await execAsync('uname -a');
      
      return {
        node: nodeVersion.trim(),
        npm: npmVersion.trim(),
        os: osInfo.trim(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        error: 'Could not gather environment info',
        timestamp: new Date().toISOString()
      };
    }
  }

  async saveResults(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `performance-report-${timestamp}.json`;
    const filepath = path.join(__dirname, 'reports', filename);
    
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(results, null, 2));
    
    console.log(`\n📄 Performance report saved: ${filepath}`);
    return filepath;
  }

  printSummaryReport(results) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE BENCHMARK SUMMARY');
    console.log('='.repeat(60));
    
    if (results.analysis && results.analysis.summary) {
      const summary = results.analysis.summary;
      console.log(`\n🎯 Overall Performance: ${summary.overallPerformance}`);
      
      if (summary.keyMetrics.averageAPIResponseTime) {
        console.log(`⚡ Average API Response: ${summary.keyMetrics.averageAPIResponseTime.toFixed(2)}ms`);
      }
      
      if (summary.keyMetrics.averageDbQueryTime) {
        console.log(`🗄️  Average DB Query: ${summary.keyMetrics.averageDbQueryTime.toFixed(2)}ms`);
      }
      
      if (summary.keyMetrics.apiSuccessRate) {
        console.log(`✅ API Success Rate: ${(summary.keyMetrics.apiSuccessRate * 100).toFixed(1)}%`);
      }
    }
    
    // Compliance summary
    if (results.compliance) {
      console.log('\n🎯 TARGET COMPLIANCE:');
      let compliantCount = 0;
      let totalCount = 0;
      
      for (const [metric, compliance] of Object.entries(results.compliance)) {
        if (compliance.compliant) compliantCount++;
        totalCount++;
        
        const status = compliance.compliant ? '✅' : '❌';
        console.log(`  ${status} ${metric}: ${compliance.actual.toFixed(2)} (target: ${compliance.target})`);
      }
      
      console.log(`\n📈 Overall Compliance: ${compliantCount}/${totalCount} (${((compliantCount/totalCount)*100).toFixed(1)}%)`);
    }
    
    // Bottlenecks
    if (results.analysis && results.analysis.bottlenecks && results.analysis.bottlenecks.length > 0) {
      console.log('\n⚠️  IDENTIFIED BOTTLENECKS:');
      results.analysis.bottlenecks.forEach(bottleneck => {
        console.log(`  🚨 ${bottleneck.component}: ${bottleneck.impact}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// CLI Interface
if (require.main === module) {
  const benchmarker = new ConsensusPerformanceBenchmarker({
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    fallbackUrl: process.env.API_FALLBACK_URL || 'http://localhost:3001'
  });
  
  benchmarker.runComprehensiveBenchmarks()
    .then(results => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Benchmarking failed:', error);
      process.exit(1);
    });
}

module.exports = ConsensusPerformanceBenchmarker;