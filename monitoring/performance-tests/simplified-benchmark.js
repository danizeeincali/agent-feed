#!/usr/bin/env node

/**
 * Simplified Performance Benchmark Runner
 * Focused on API and system performance validation
 */

const http = require('http');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

class SimplifiedPerformanceBenchmark {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000',
      fallbackUrl: config.fallbackUrl || 'http://localhost:3001',
      duration: config.duration || 30000,
      concurrency: config.concurrency || 10,
      ...config
    };
    
    this.results = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      tests: {}
    };
  }

  async runBenchmarks() {
    console.log('🚀 Starting Simplified Performance Benchmarks');
    console.log('==============================================');
    console.log(`Primary Server: ${this.config.baseUrl}`);
    console.log(`Fallback Server: ${this.config.fallbackUrl}`);
    
    try {
      // Health check
      console.log('\n🔍 Running health checks...');
      const healthCheck = await this.performHealthChecks();
      this.results.healthCheck = healthCheck;
      
      // API Performance Tests
      console.log('\n🌐 Testing API Performance...');
      this.results.tests.apiPerformance = await this.testAPIPerformance();
      
      // Load Testing
      console.log('\n⚡ Testing Load Performance...');
      this.results.tests.loadPerformance = await this.testLoadPerformance();
      
      // Response Time Distribution
      console.log('\n📊 Analyzing Response Time Distribution...');
      this.results.tests.responseDistribution = await this.testResponseDistribution();
      
      // Concurrent User Simulation
      console.log('\n👥 Testing Concurrent Users...');
      this.results.tests.concurrentUsers = await this.testConcurrentUsers();
      
      // System Integration
      console.log('\n🔧 Testing System Integration...');
      this.results.tests.systemIntegration = await this.testSystemIntegration();
      
      // Generate Analysis
      this.results.analysis = this.generateAnalysis();
      this.results.compliance = this.validateCompliance();
      this.results.recommendations = this.generateRecommendations();
      
      // Save and display results
      await this.saveResults();
      this.displaySummary();
      
      console.log('\n✅ Performance benchmarking completed successfully!');
      return this.results;
      
    } catch (error) {
      console.error('❌ Benchmarking failed:', error);
      throw error;
    }
  }

  async performHealthChecks() {
    const checks = {};
    
    // Primary server health
    try {
      const response = await this.makeRequest('/health');
      checks.primaryServer = {
        available: response.statusCode >= 200 && response.statusCode < 400,
        responseTime: response.responseTime,
        statusCode: response.statusCode
      };
      console.log(`  ✅ Primary server: ${response.statusCode} (${response.responseTime.toFixed(2)}ms)`);
    } catch (error) {
      checks.primaryServer = {
        available: false,
        error: error.message
      };
      console.log(`  ❌ Primary server: ${error.message}`);
    }
    
    // Fallback server health
    try {
      const response = await this.makeRequest('/health', 'GET', this.config.fallbackUrl);
      checks.fallbackServer = {
        available: response.statusCode >= 200 && response.statusCode < 400,
        responseTime: response.responseTime,
        statusCode: response.statusCode
      };
      console.log(`  ✅ Fallback server: ${response.statusCode} (${response.responseTime.toFixed(2)}ms)`);
    } catch (error) {
      checks.fallbackServer = {
        available: false,
        error: error.message
      };
      console.log(`  ❌ Fallback server: ${error.message}`);
    }
    
    return checks;
  }

  async testAPIPerformance() {
    const endpoints = [
      { path: '/api/v1/agent-posts', name: 'list_posts', target: 200 },
      { path: '/api/v1/agent-posts?limit=10', name: 'list_posts_limited', target: 150 },
      { path: '/api/v1/agent-posts/search?q=test', name: 'search_posts', target: 300 },
      { path: '/health', name: 'health_check', target: 50 }
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      console.log(`  Testing ${endpoint.name}...`);
      
      const measurements = [];
      const sampleSize = 25;
      
      // Warmup
      for (let i = 0; i < 3; i++) {
        try {
          await this.makeRequest(endpoint.path);
        } catch (error) {
          // Ignore warmup errors
        }
      }
      
      // Actual measurements
      for (let i = 0; i < sampleSize; i++) {
        try {
          const response = await this.makeRequest(endpoint.path);
          measurements.push({
            responseTime: response.responseTime,
            success: response.statusCode >= 200 && response.statusCode < 400,
            statusCode: response.statusCode,
            size: response.data ? JSON.stringify(response.data).length : 0
          });
        } catch (error) {
          measurements.push({
            responseTime: 0,
            success: false,
            error: error.message
          });
        }
        
        // Small delay between requests
        await this.sleep(50);
      }
      
      const successful = measurements.filter(m => m.success);
      const responseTimes = successful.map(m => m.responseTime);
      
      if (responseTimes.length > 0) {
        results[endpoint.name] = {
          averageResponseTime: this.calculateAverage(responseTimes),
          medianResponseTime: this.calculatePercentile(responseTimes, 50),
          p95ResponseTime: this.calculatePercentile(responseTimes, 95),
          p99ResponseTime: this.calculatePercentile(responseTimes, 99),
          minResponseTime: Math.min(...responseTimes),
          maxResponseTime: Math.max(...responseTimes),
          successRate: successful.length / measurements.length,
          totalRequests: measurements.length,
          target: endpoint.target,
          compliance: this.calculateAverage(responseTimes) <= endpoint.target,
          throughput: (successful.length / (this.calculateSum(responseTimes) / 1000)).toFixed(2)
        };
      } else {
        results[endpoint.name] = {
          error: 'No successful requests',
          successRate: 0,
          totalRequests: measurements.length
        };
      }
    }
    
    return results;
  }

  async testLoadPerformance() {
    const scenarios = [
      { name: 'light_load', users: 5, duration: 15000 },
      { name: 'moderate_load', users: 10, duration: 15000 },
      { name: 'heavy_load', users: 20, duration: 10000 }
    ];
    
    const results = {};
    
    for (const scenario of scenarios) {
      console.log(`  Testing ${scenario.name} (${scenario.users} users, ${scenario.duration/1000}s)...`);
      
      const startTime = Date.now();
      const promises = [];
      
      // Start virtual users
      for (let i = 0; i < scenario.users; i++) {
        promises.push(this.simulateUser(i, scenario.duration));
      }
      
      const userResults = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // Aggregate results
      let totalRequests = 0;
      let totalSuccessful = 0;
      let totalErrors = 0;
      const allResponseTimes = [];
      
      userResults.forEach(userResult => {
        totalRequests += userResult.requests;
        totalSuccessful += userResult.successful;
        totalErrors += userResult.errors;
        allResponseTimes.push(...userResult.responseTimes);
      });
      
      results[scenario.name] = {
        users: scenario.users,
        duration: scenario.duration,
        totalRequests,
        totalSuccessful,
        totalErrors,
        successRate: totalSuccessful / totalRequests,
        errorRate: totalErrors / totalRequests,
        throughput: (totalSuccessful / totalTime) * 1000, // req/sec
        averageResponseTime: this.calculateAverage(allResponseTimes),
        p95ResponseTime: this.calculatePercentile(allResponseTimes, 95),
        userResults: userResults.map(ur => ({
          userId: ur.userId,
          requests: ur.requests,
          successful: ur.successful,
          errors: ur.errors,
          averageResponseTime: this.calculateAverage(ur.responseTimes)
        }))
      };
    }
    
    return results;
  }

  async simulateUser(userId, duration) {
    const endTime = Date.now() + duration;
    const userResults = {
      userId,
      requests: 0,
      successful: 0,
      errors: 0,
      responseTimes: []
    };
    
    const endpoints = [
      '/api/v1/agent-posts',
      '/api/v1/agent-posts?limit=10',
      '/health'
    ];
    
    while (Date.now() < endTime) {
      try {
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        const response = await this.makeRequest(endpoint);
        
        userResults.requests++;
        if (response.statusCode >= 200 && response.statusCode < 400) {
          userResults.successful++;
          userResults.responseTimes.push(response.responseTime);
        } else {
          userResults.errors++;
        }
        
        // User think time (100-500ms)
        await this.sleep(Math.random() * 400 + 100);
        
      } catch (error) {
        userResults.requests++;
        userResults.errors++;
      }
    }
    
    return userResults;
  }

  async testResponseDistribution() {
    console.log('  Measuring response time distribution...');
    
    const measurements = [];
    const sampleSize = 100;
    
    for (let i = 0; i < sampleSize; i++) {
      try {
        const response = await this.makeRequest('/api/v1/agent-posts?limit=5');
        if (response.statusCode >= 200 && response.statusCode < 400) {
          measurements.push(response.responseTime);
        }
      } catch (error) {
        // Skip failed requests
      }
      
      if (i % 20 === 0) {
        process.stdout.write(`.`);
      }
    }
    
    console.log(); // New line
    
    if (measurements.length === 0) {
      return { error: 'No successful measurements' };
    }
    
    const sorted = [...measurements].sort((a, b) => a - b);
    
    return {
      sampleSize: measurements.length,
      mean: this.calculateAverage(measurements),
      median: this.calculatePercentile(measurements, 50),
      standardDeviation: this.calculateStandardDeviation(measurements),
      percentiles: {
        p10: this.calculatePercentile(measurements, 10),
        p25: this.calculatePercentile(measurements, 25),
        p50: this.calculatePercentile(measurements, 50),
        p75: this.calculatePercentile(measurements, 75),
        p90: this.calculatePercentile(measurements, 90),
        p95: this.calculatePercentile(measurements, 95),
        p99: this.calculatePercentile(measurements, 99)
      },
      min: sorted[0],
      max: sorted[sorted.length - 1],
      distribution: this.analyzeDistribution(measurements)
    };
  }

  async testConcurrentUsers() {
    const concurrencyLevels = [1, 5, 10, 15];
    const results = {};
    
    for (const level of concurrencyLevels) {
      console.log(`  Testing ${level} concurrent users...`);
      
      const promises = [];
      const startTime = Date.now();
      
      for (let i = 0; i < level; i++) {
        promises.push(this.makeConcurrentRequest(i));
      }
      
      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      const successful = responses.filter(r => r.success);
      const responseTimes = successful.map(r => r.responseTime);
      
      results[`level_${level}`] = {
        concurrency: level,
        totalTime,
        successRate: successful.length / responses.length,
        averageResponseTime: this.calculateAverage(responseTimes),
        p95ResponseTime: this.calculatePercentile(responseTimes, 95),
        throughput: (successful.length / totalTime) * 1000, // req/sec
        errors: responses.length - successful.length
      };
    }
    
    return results;
  }

  async makeConcurrentRequest(requestId) {
    try {
      const response = await this.makeRequest('/api/v1/agent-posts?limit=10');
      return {
        requestId,
        responseTime: response.responseTime,
        success: response.statusCode >= 200 && response.statusCode < 400,
        statusCode: response.statusCode
      };
    } catch (error) {
      return {
        requestId,
        responseTime: 0,
        success: false,
        error: error.message
      };
    }
  }

  async testSystemIntegration() {
    const results = {};
    
    // Primary vs Fallback performance comparison
    console.log('  Comparing primary vs fallback server performance...');
    
    try {
      const primaryResponse = await this.makeRequest('/api/v1/agent-posts', 'GET', this.config.baseUrl);
      const fallbackResponse = await this.makeRequest('/api/v1/agent-posts', 'GET', this.config.fallbackUrl);
      
      results.serverComparison = {
        primary: {
          responseTime: primaryResponse.responseTime,
          statusCode: primaryResponse.statusCode,
          available: primaryResponse.statusCode >= 200 && primaryResponse.statusCode < 400
        },
        fallback: {
          responseTime: fallbackResponse.responseTime,
          statusCode: fallbackResponse.statusCode,
          available: fallbackResponse.statusCode >= 200 && fallbackResponse.statusCode < 400
        },
        performanceDelta: primaryResponse.responseTime - fallbackResponse.responseTime,
        recommendation: primaryResponse.responseTime <= fallbackResponse.responseTime * 1.2 ? 'PRIMARY_OPTIMAL' : 'INVESTIGATE_PRIMARY'
      };
    } catch (error) {
      results.serverComparison = {
        error: error.message
      };
    }
    
    // Memory usage monitoring
    const memoryUsage = process.memoryUsage();
    results.resourceUsage = {
      memory: {
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external
      },
      uptime: process.uptime()
    };
    
    return results;
  }

  generateAnalysis() {
    const analysis = {
      overallPerformance: 'UNKNOWN',
      keyFindings: [],
      bottlenecks: [],
      strengths: []
    };
    
    // Analyze API performance
    if (this.results.tests.apiPerformance) {
      const apiResults = this.results.tests.apiPerformance;
      const avgResponseTimes = Object.values(apiResults)
        .filter(r => r.averageResponseTime)
        .map(r => r.averageResponseTime);
      
      if (avgResponseTimes.length > 0) {
        const overallAvgResponseTime = this.calculateAverage(avgResponseTimes);
        
        if (overallAvgResponseTime <= 200) {
          analysis.strengths.push('API response times consistently under 200ms target');
          analysis.overallPerformance = 'GOOD';
        } else if (overallAvgResponseTime <= 500) {
          analysis.keyFindings.push('API response times acceptable but could be optimized');
          analysis.overallPerformance = 'FAIR';
        } else {
          analysis.bottlenecks.push('API response times exceed acceptable thresholds');
          analysis.overallPerformance = 'POOR';
        }
        
        // Check for high variability
        const maxResponseTime = Math.max(...Object.values(apiResults).map(r => r.maxResponseTime || 0));
        const minResponseTime = Math.min(...Object.values(apiResults).map(r => r.minResponseTime || Infinity));
        
        if (maxResponseTime > minResponseTime * 10) {
          analysis.bottlenecks.push('High response time variability detected');
        }
      }
    }
    
    // Analyze load performance
    if (this.results.tests.loadPerformance) {
      const loadResults = this.results.tests.loadPerformance;
      const successRates = Object.values(loadResults).map(r => r.successRate);
      const avgSuccessRate = this.calculateAverage(successRates);
      
      if (avgSuccessRate >= 0.95) {
        analysis.strengths.push('System maintains high reliability under load');
      } else if (avgSuccessRate >= 0.90) {
        analysis.keyFindings.push('Minor reliability issues under heavy load');
      } else {
        analysis.bottlenecks.push('Significant reliability degradation under load');
      }
      
      // Check throughput
      const throughputs = Object.values(loadResults).map(r => r.throughput);
      const maxThroughput = Math.max(...throughputs);
      
      if (maxThroughput >= 50) {
        analysis.strengths.push(`High throughput achieved: ${maxThroughput.toFixed(2)} req/s`);
      } else if (maxThroughput >= 20) {
        analysis.keyFindings.push(`Moderate throughput: ${maxThroughput.toFixed(2)} req/s`);
      } else {
        analysis.bottlenecks.push(`Low throughput: ${maxThroughput.toFixed(2)} req/s`);
      }
    }
    
    return analysis;
  }

  validateCompliance() {
    const targets = {
      apiResponseTime: 200, // ms
      throughput: 50, // req/sec
      successRate: 0.95,
      p95ResponseTime: 500 // ms
    };
    
    const compliance = {};
    let compliantChecks = 0;
    let totalChecks = 0;
    
    // Check API performance compliance
    if (this.results.tests.apiPerformance) {
      const apiResults = Object.values(this.results.tests.apiPerformance)
        .filter(r => r.averageResponseTime);
      
      if (apiResults.length > 0) {
        const avgResponseTime = this.calculateAverage(apiResults.map(r => r.averageResponseTime));
        const avgSuccessRate = this.calculateAverage(apiResults.map(r => r.successRate));
        const avgP95 = this.calculateAverage(apiResults.map(r => r.p95ResponseTime));
        
        compliance.apiResponseTime = {
          actual: avgResponseTime,
          target: targets.apiResponseTime,
          compliant: avgResponseTime <= targets.apiResponseTime
        };
        
        compliance.apiSuccessRate = {
          actual: avgSuccessRate,
          target: targets.successRate,
          compliant: avgSuccessRate >= targets.successRate
        };
        
        compliance.apiP95ResponseTime = {
          actual: avgP95,
          target: targets.p95ResponseTime,
          compliant: avgP95 <= targets.p95ResponseTime
        };
        
        if (compliance.apiResponseTime.compliant) compliantChecks++;
        if (compliance.apiSuccessRate.compliant) compliantChecks++;
        if (compliance.apiP95ResponseTime.compliant) compliantChecks++;
        totalChecks += 3;
      }
    }
    
    // Check load performance compliance
    if (this.results.tests.loadPerformance) {
      const loadResults = Object.values(this.results.tests.loadPerformance);
      const maxThroughput = Math.max(...loadResults.map(r => r.throughput));
      
      compliance.throughput = {
        actual: maxThroughput,
        target: targets.throughput,
        compliant: maxThroughput >= targets.throughput
      };
      
      if (compliance.throughput.compliant) compliantChecks++;
      totalChecks++;
    }
    
    return {
      details: compliance,
      overallCompliance: totalChecks > 0 ? compliantChecks / totalChecks : 0,
      status: totalChecks > 0 ? 
        (compliantChecks / totalChecks >= 0.8 ? 'GOOD' : 
         compliantChecks / totalChecks >= 0.6 ? 'FAIR' : 'POOR') : 'UNKNOWN'
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    // API performance recommendations
    if (this.results.tests.apiPerformance) {
      const slowEndpoints = Object.entries(this.results.tests.apiPerformance)
        .filter(([name, result]) => result.averageResponseTime > 200)
        .map(([name]) => name);
      
      if (slowEndpoints.length > 0) {
        recommendations.push({
          category: 'API_PERFORMANCE',
          priority: 'HIGH',
          title: 'Optimize Slow API Endpoints',
          description: `Endpoints with high response times: ${slowEndpoints.join(', ')}`,
          suggestion: 'Implement caching, database query optimization, or response compression'
        });
      }
    }
    
    // Load performance recommendations
    if (this.results.tests.loadPerformance) {
      const heavyLoadResult = this.results.tests.loadPerformance.heavy_load;
      if (heavyLoadResult && heavyLoadResult.successRate < 0.90) {
        recommendations.push({
          category: 'SCALABILITY',
          priority: 'HIGH',
          title: 'Improve System Reliability Under Load',
          description: `Success rate drops to ${(heavyLoadResult.successRate * 100).toFixed(1)}% under heavy load`,
          suggestion: 'Implement load balancing, connection pooling, or request queuing'
        });
      }
    }
    
    // Response time variability
    if (this.results.tests.responseDistribution) {
      const distribution = this.results.tests.responseDistribution;
      if (distribution.percentiles && distribution.percentiles.p99 > distribution.mean * 5) {
        recommendations.push({
          category: 'CONSISTENCY',
          priority: 'MEDIUM',
          title: 'Reduce Response Time Variability',
          description: 'High tail latency detected (P99 >> average)',
          suggestion: 'Investigate and optimize slow queries, implement circuit breakers'
        });
      }
    }
    
    return recommendations;
  }

  async makeRequest(path, method = 'GET', baseUrl = this.config.baseUrl) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const startTime = performance.now();
      
      const options = {
        method,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SimplifiedBenchmarker/1.0'
        }
      };
      
      const req = http.request(url, options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const responseTime = performance.now() - startTime;
          try {
            const parsedData = data ? JSON.parse(data) : null;
            resolve({
              statusCode: res.statusCode,
              data: parsedData,
              responseTime,
              headers: res.headers
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              data: data,
              responseTime,
              headers: res.headers
            });
          }
        });
      });
      
      req.on('error', (error) => {
        const responseTime = performance.now() - startTime;
        resolve({
          statusCode: 0,
          error: error.message,
          responseTime
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        const responseTime = performance.now() - startTime;
        resolve({
          statusCode: 0,
          error: 'Request timeout',
          responseTime
        });
      });
      
      req.end();
    });
  }

  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `simplified-performance-report-${timestamp}.json`;
    const reportsDir = path.join(__dirname, 'reports');
    
    await fs.mkdir(reportsDir, { recursive: true });
    
    const filepath = path.join(reportsDir, filename);
    await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
    
    console.log(`\n📄 Performance report saved: ${filepath}`);
    
    // Also save a summary
    const summaryFilename = `performance-summary-${timestamp}.txt`;
    const summaryFilepath = path.join(reportsDir, summaryFilename);
    const summaryText = this.generateTextSummary();
    
    await fs.writeFile(summaryFilepath, summaryText);
    console.log(`📄 Summary report saved: ${summaryFilepath}`);
    
    return { fullReport: filepath, summary: summaryFilepath };
  }

  generateTextSummary() {
    const lines = [];
    lines.push('SIMPLIFIED PERFORMANCE BENCHMARK SUMMARY');
    lines.push('========================================');
    lines.push('');
    lines.push(`Timestamp: ${this.results.timestamp}`);
    lines.push(`Environment: Node.js ${this.results.environment.nodeVersion} on ${this.results.environment.platform}`);
    lines.push('');
    
    // Analysis summary
    if (this.results.analysis) {
      lines.push(`Overall Performance: ${this.results.analysis.overallPerformance}`);
      lines.push('');
      
      if (this.results.analysis.strengths.length > 0) {
        lines.push('STRENGTHS:');
        this.results.analysis.strengths.forEach(strength => {
          lines.push(`  ✅ ${strength}`);
        });
        lines.push('');
      }
      
      if (this.results.analysis.bottlenecks.length > 0) {
        lines.push('BOTTLENECKS:');
        this.results.analysis.bottlenecks.forEach(bottleneck => {
          lines.push(`  ⚠️  ${bottleneck}`);
        });
        lines.push('');
      }
    }
    
    // API Performance
    if (this.results.tests.apiPerformance) {
      lines.push('API PERFORMANCE:');
      Object.entries(this.results.tests.apiPerformance).forEach(([name, result]) => {
        if (result.averageResponseTime) {
          lines.push(`  ${name}: ${result.averageResponseTime.toFixed(2)}ms avg (${(result.successRate * 100).toFixed(1)}% success)`);
        }
      });
      lines.push('');
    }
    
    // Compliance
    if (this.results.compliance) {
      lines.push(`COMPLIANCE: ${this.results.compliance.status} (${(this.results.compliance.overallCompliance * 100).toFixed(1)}%)`);
      Object.entries(this.results.compliance.details).forEach(([metric, details]) => {
        const status = details.compliant ? '✅' : '❌';
        lines.push(`  ${status} ${metric}: ${details.actual} (target: ${details.target})`);
      });
      lines.push('');
    }
    
    // Top recommendations
    if (this.results.recommendations && this.results.recommendations.length > 0) {
      lines.push('TOP RECOMMENDATIONS:');
      this.results.recommendations.slice(0, 3).forEach((rec, index) => {
        lines.push(`  ${index + 1}. ${rec.title} (${rec.priority})`);
        lines.push(`     ${rec.description}`);
      });
    }
    
    return lines.join('\n');
  }

  displaySummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SIMPLIFIED PERFORMANCE BENCHMARK SUMMARY');
    console.log('='.repeat(60));
    
    if (this.results.analysis) {
      console.log(`\n🎯 Overall Performance: ${this.results.analysis.overallPerformance}`);
      
      if (this.results.analysis.strengths.length > 0) {
        console.log('\n🏆 STRENGTHS:');
        this.results.analysis.strengths.forEach(strength => {
          console.log(`  ⭐ ${strength}`);
        });
      }
      
      if (this.results.analysis.bottlenecks.length > 0) {
        console.log('\n⚠️  BOTTLENECKS:');
        this.results.analysis.bottlenecks.forEach(bottleneck => {
          console.log(`  🚨 ${bottleneck}`);
        });
      }
    }
    
    if (this.results.compliance) {
      console.log(`\n🎯 Compliance: ${this.results.compliance.status} (${(this.results.compliance.overallCompliance * 100).toFixed(1)}%)`);
    }
    
    console.log('\n' + '='.repeat(60));
  }

  // Utility methods
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

  calculateStandardDeviation(numbers) {
    if (!numbers || numbers.length === 0) return 0;
    const mean = this.calculateAverage(numbers);
    const squareDiffs = numbers.map(n => (n - mean) ** 2);
    const avgSquareDiff = this.calculateAverage(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }

  analyzeDistribution(numbers) {
    const mean = this.calculateAverage(numbers);
    const stdDev = this.calculateStandardDeviation(numbers);
    
    return {
      mean,
      standardDeviation: stdDev,
      coefficientOfVariation: mean > 0 ? stdDev / mean : 0,
      isConsistent: stdDev < mean * 0.2 // Less than 20% coefficient of variation
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI Interface
if (require.main === module) {
  const benchmarker = new SimplifiedPerformanceBenchmark({
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    fallbackUrl: process.env.API_FALLBACK_URL || 'http://localhost:3001'
  });
  
  benchmarker.runBenchmarks()
    .then(results => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Simplified benchmarking failed:', error);
      process.exit(1);
    });
}

module.exports = SimplifiedPerformanceBenchmark;