#!/usr/bin/env node

/**
 * Comprehensive Performance Benchmark for Agent Feed System
 * Validates all performance targets for the persistent feed data system
 */

const http = require('http');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;

class AgentFeedPerformanceBenchmark {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.fallbackUrl = 'http://localhost:3001';
    this.results = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform
      },
      tests: {},
      summary: {}
    };
  }

  async runComprehensiveBenchmark() {
    console.log('🚀 AGENT FEED PERFORMANCE BENCHMARK SUITE');
    console.log('=========================================');
    console.log(`Primary: ${this.baseUrl}`);
    console.log(`Fallback: ${this.fallbackUrl}`);
    
    try {
      // 1. Health Check
      console.log('\n🔍 1. System Health Check...');
      this.results.tests.healthCheck = await this.testHealthCheck();
      
      // 2. API Endpoint Performance
      console.log('\n🌐 2. API Endpoint Performance...');
      this.results.tests.apiPerformance = await this.testAPIEndpointPerformance();
      
      // 3. Database Performance (if available)
      console.log('\n🗄️  3. Database Performance...');
      this.results.tests.databasePerformance = await this.testDatabasePerformance();
      
      // 4. Concurrent Request Handling
      console.log('\n⚡ 4. Concurrent Request Handling...');
      this.results.tests.concurrentHandling = await this.testConcurrentHandling();
      
      // 5. Load Testing Scenarios
      console.log('\n🏋️ 5. Load Testing Scenarios...');
      this.results.tests.loadTesting = await this.testLoadScenarios();
      
      // 6. System Integration Performance
      console.log('\n🔧 6. System Integration Performance...');
      this.results.tests.systemIntegration = await this.testSystemIntegration();
      
      // 7. Frontend Performance Simulation
      console.log('\n⚡ 7. Frontend Performance Simulation...');
      this.results.tests.frontendSimulation = await this.testFrontendPerformance();
      
      // Generate Analysis
      this.results.analysis = this.generatePerformanceAnalysis();
      this.results.compliance = this.validatePerformanceTargets();
      this.results.recommendations = this.generateRecommendations();
      
      // Save and Display Results
      await this.saveResults();
      this.displayComprehensiveReport();
      
      console.log('\n✅ Performance benchmarking completed successfully!');
      return this.results;
      
    } catch (error) {
      console.error('\n❌ Performance benchmarking failed:', error);
      throw error;
    }
  }

  async testHealthCheck() {
    console.log('  Testing system availability...');
    
    const results = {};
    
    // Primary server health
    try {
      const start = performance.now();
      const response = await this.makeRequest('/health');
      const duration = performance.now() - start;
      
      results.primary = {
        available: response.statusCode >= 200 && response.statusCode < 400,
        responseTime: duration,
        statusCode: response.statusCode,
        status: response.statusCode >= 200 && response.statusCode < 400 ? '✅ ONLINE' : '❌ OFFLINE'
      };
    } catch (error) {
      results.primary = {
        available: false,
        error: error.message,
        status: '❌ OFFLINE'
      };
    }
    
    // Fallback server health
    try {
      const start = performance.now();
      const response = await this.makeRequest('/health', 'GET', this.fallbackUrl);
      const duration = performance.now() - start;
      
      results.fallback = {
        available: response.statusCode >= 200 && response.statusCode < 400,
        responseTime: duration,
        statusCode: response.statusCode,
        status: response.statusCode >= 200 && response.statusCode < 400 ? '✅ ONLINE' : '❌ OFFLINE'
      };
    } catch (error) {
      results.fallback = {
        available: false,
        error: error.message,
        status: '❌ OFFLINE'
      };
    }
    
    console.log(`    Primary: ${results.primary.status} ${results.primary.responseTime ? `(${results.primary.responseTime.toFixed(2)}ms)` : ''}`);
    console.log(`    Fallback: ${results.fallback.status} ${results.fallback.responseTime ? `(${results.fallback.responseTime.toFixed(2)}ms)` : ''}`);
    
    return results;
  }

  async testAPIEndpointPerformance() {
    const endpoints = [
      { path: '/api/v1/agent-posts', name: 'List Posts', target: 200 },
      { path: '/api/v1/agent-posts?limit=10', name: 'Limited Posts', target: 150 },
      { path: '/api/v1/agent-posts/search?q=test', name: 'Search Posts', target: 300 },
      { path: '/api/v1/agent-posts?page=2&limit=20', name: 'Paginated Posts', target: 200 },
      { path: '/health', name: 'Health Check', target: 50 }
    ];
    
    const results = {};
    
    for (const endpoint of endpoints) {
      console.log(`  Testing ${endpoint.name}...`);
      
      const measurements = await this.measureEndpointPerformance(endpoint);
      results[endpoint.name.toLowerCase().replace(/\s+/g, '_')] = measurements;
      
      const avgTime = measurements.averageResponseTime || 0;
      const compliance = avgTime <= endpoint.target;
      const status = compliance ? '✅' : '❌';
      
      console.log(`    ${status} Avg: ${avgTime.toFixed(2)}ms | Target: ${endpoint.target}ms | Success: ${(measurements.successRate * 100).toFixed(1)}%`);
    }
    
    return results;
  }

  async measureEndpointPerformance(endpoint) {
    const measurements = [];
    const sampleSize = 30;
    
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
        const start = performance.now();
        const response = await this.makeRequest(endpoint.path);
        const duration = performance.now() - start;
        
        measurements.push({
          responseTime: duration,
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
      
      await this.sleep(25); // Small delay between requests
    }
    
    const successful = measurements.filter(m => m.success);
    const responseTimes = successful.map(m => m.responseTime);
    
    if (responseTimes.length > 0) {
      return {
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
      return {
        error: 'No successful requests',
        successRate: 0,
        totalRequests: measurements.length,
        target: endpoint.target,
        compliance: false
      };
    }
  }

  async testDatabasePerformance() {
    console.log('  Simulating database query performance...');
    
    // Since we don't have direct database access, we'll test database-dependent endpoints
    const dbEndpoints = [
      { path: '/api/v1/agent-posts', name: 'Query All Posts', target: 100, type: 'simple' },
      { path: '/api/v1/agent-posts/search?q=performance', name: 'Full-text Search', target: 500, type: 'complex' },
      { path: '/api/v1/agent-posts?limit=50', name: 'Large Result Set', target: 200, type: 'aggregate' }
    ];
    
    const results = {};
    
    for (const endpoint of dbEndpoints) {
      console.log(`    Testing ${endpoint.name} (${endpoint.type})...`);
      
      const measurements = [];
      const sampleSize = 20;
      
      for (let i = 0; i < sampleSize; i++) {
        try {
          const start = performance.now();
          const response = await this.makeRequest(endpoint.path);
          const duration = performance.now() - start;
          
          measurements.push({
            duration,
            success: response.statusCode >= 200 && response.statusCode < 400
          });
        } catch (error) {
          measurements.push({
            duration: 0,
            success: false
          });
        }
      }
      
      const successful = measurements.filter(m => m.success);
      const durations = successful.map(m => m.duration);
      
      if (durations.length > 0) {
        const avgTime = this.calculateAverage(durations);
        const compliance = avgTime <= endpoint.target;
        
        results[endpoint.type] = {
          name: endpoint.name,
          averageTime: avgTime,
          p95Time: this.calculatePercentile(durations, 95),
          target: endpoint.target,
          compliance,
          successRate: successful.length / measurements.length,
          status: compliance ? '✅ COMPLIANT' : '❌ SLOW'
        };
        
        console.log(`      ${results[endpoint.type].status} | Avg: ${avgTime.toFixed(2)}ms | Target: ${endpoint.target}ms`);
      }
    }
    
    return results;
  }

  async testConcurrentHandling() {
    const concurrencyLevels = [10, 25, 50];
    const results = {};
    
    for (const level of concurrencyLevels) {
      console.log(`  Testing ${level} concurrent users...`);
      
      const promises = [];
      const startTime = performance.now();
      
      for (let i = 0; i < level; i++) {
        promises.push(this.makeConcurrentRequest(i));
      }
      
      const responses = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      
      const successful = responses.filter(r => r.success);
      const responseTimes = successful.map(r => r.responseTime);
      
      const throughput = (successful.length / totalTime) * 1000; // req/sec
      const successRate = successful.length / responses.length;
      const avgResponseTime = this.calculateAverage(responseTimes);
      
      results[`${level}_users`] = {
        concurrency: level,
        successRate,
        throughput,
        averageResponseTime: avgResponseTime,
        p95ResponseTime: this.calculatePercentile(responseTimes, 95),
        totalRequests: responses.length,
        errors: responses.length - successful.length
      };
      
      const status = successRate >= 0.95 && throughput >= 20 ? '✅' : '❌';
      console.log(`    ${status} Success: ${(successRate * 100).toFixed(1)}% | Throughput: ${throughput.toFixed(2)} req/s`);
    }
    
    return results;
  }

  async makeConcurrentRequest(requestId) {
    try {
      const start = performance.now();
      const response = await this.makeRequest('/api/v1/agent-posts?limit=10');
      const duration = performance.now() - start;
      
      return {
        requestId,
        responseTime: duration,
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

  async testLoadScenarios() {
    const scenarios = [
      { name: 'Light Load', users: 10, duration: 15000 },
      { name: 'Moderate Load', users: 25, duration: 20000 },
      { name: 'Heavy Load', users: 50, duration: 15000 }
    ];
    
    const results = {};
    
    for (const scenario of scenarios) {
      console.log(`  Testing ${scenario.name} (${scenario.users} users, ${scenario.duration/1000}s)...`);
      
      const scenarioResult = await this.runLoadScenario(scenario);
      results[scenario.name.toLowerCase().replace(' ', '_')] = scenarioResult;
      
      const status = scenarioResult.successRate >= 0.90 && scenarioResult.throughput >= 30 ? '✅' : '❌';
      console.log(`    ${status} Success: ${(scenarioResult.successRate * 100).toFixed(1)}% | Throughput: ${scenarioResult.throughput.toFixed(2)} req/s`);
    }
    
    return results;
  }

  async runLoadScenario(scenario) {
    const promises = [];
    const startTime = Date.now();
    
    // Spawn virtual users
    for (let i = 0; i < scenario.users; i++) {
      promises.push(this.simulateVirtualUser(i, scenario.duration));
    }
    
    const userResults = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    // Aggregate results
    let totalRequests = 0;
    let totalSuccessful = 0;
    let allResponseTimes = [];
    
    userResults.forEach(userResult => {
      totalRequests += userResult.requests;
      totalSuccessful += userResult.successful;
      allResponseTimes.push(...userResult.responseTimes);
    });
    
    return {
      users: scenario.users,
      duration: scenario.duration,
      totalRequests,
      totalSuccessful,
      successRate: totalSuccessful / totalRequests,
      throughput: (totalSuccessful / totalTime) * 1000,
      averageResponseTime: this.calculateAverage(allResponseTimes),
      p95ResponseTime: this.calculatePercentile(allResponseTimes, 95)
    };
  }

  async simulateVirtualUser(userId, duration) {
    const endTime = Date.now() + duration;
    const userResult = {
      userId,
      requests: 0,
      successful: 0,
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
        const start = performance.now();
        const response = await this.makeRequest(endpoint);
        const duration = performance.now() - start;
        
        userResult.requests++;
        if (response.statusCode >= 200 && response.statusCode < 400) {
          userResult.successful++;
          userResult.responseTimes.push(duration);
        }
        
        // User think time
        await this.sleep(Math.random() * 500 + 200);
        
      } catch (error) {
        userResult.requests++;
      }
    }
    
    return userResult;
  }

  async testSystemIntegration() {
    console.log('  Testing system integration performance...');
    
    const results = {};
    
    // Claude Terminal functionality preservation test
    try {
      const terminalResponse = await this.makeRequest('/api/claude/instances');
      results.claudeTerminal = {
        available: terminalResponse.statusCode >= 200 && terminalResponse.statusCode < 400,
        responseTime: 0, // We'll measure this in the makeRequest method
        status: terminalResponse.statusCode >= 200 && terminalResponse.statusCode < 400 ? '✅ PRESERVED' : '❌ IMPAIRED'
      };
    } catch (error) {
      results.claudeTerminal = {
        available: false,
        error: error.message,
        status: '❌ UNAVAILABLE'
      };
    }
    
    // Hybrid backend performance comparison
    if (this.results.tests.healthCheck?.primary?.available && this.results.tests.healthCheck?.fallback?.available) {
      const primaryTime = this.results.tests.healthCheck.primary.responseTime;
      const fallbackTime = this.results.tests.healthCheck.fallback.responseTime;
      
      results.hybridPerformance = {
        primaryTime,
        fallbackTime,
        performanceDelta: primaryTime - fallbackTime,
        recommendation: primaryTime <= fallbackTime * 1.5 ? 'PRIMARY_OPTIMAL' : 'INVESTIGATE_PRIMARY',
        status: primaryTime <= fallbackTime * 1.5 ? '✅ OPTIMAL' : '⚠️  NEEDS_OPTIMIZATION'
      };
    }
    
    // Memory usage monitoring
    const memoryUsage = process.memoryUsage();
    results.resourceUsage = {
      memoryMB: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
      uptime: process.uptime(),
      status: memoryUsage.heapUsed < 512 * 1024 * 1024 ? '✅ EFFICIENT' : '⚠️  HIGH_USAGE'
    };
    
    console.log(`    Claude Terminal: ${results.claudeTerminal?.status || 'UNKNOWN'}`);
    console.log(`    Hybrid Backend: ${results.hybridPerformance?.status || 'UNKNOWN'}`);
    console.log(`    Memory Usage: ${results.resourceUsage.status} (${results.resourceUsage.memoryMB}MB)`);
    
    return results;
  }

  async testFrontendPerformance() {
    console.log('  Simulating frontend performance characteristics...');
    
    const results = {};
    
    // API client efficiency simulation
    console.log('    Testing API client patterns...');
    
    // Sequential requests (bad pattern)
    const sequentialStart = performance.now();
    for (let i = 0; i < 5; i++) {
      await this.makeRequest('/api/v1/agent-posts?limit=5');
    }
    const sequentialTime = performance.now() - sequentialStart;
    
    // Parallel requests (good pattern)
    const parallelStart = performance.now();
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(this.makeRequest('/api/v1/agent-posts?limit=5'));
    }
    await Promise.all(promises);
    const parallelTime = performance.now() - parallelStart;
    
    results.apiClientEfficiency = {
      sequentialTime,
      parallelTime,
      improvement: ((sequentialTime - parallelTime) / sequentialTime * 100).toFixed(1),
      status: parallelTime < sequentialTime * 0.8 ? '✅ EFFICIENT' : '⚠️  INEFFICIENT'
    };
    
    // Simulated component render performance
    const renderTests = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      const response = await this.makeRequest('/api/v1/agent-posts?limit=20');
      const fetchTime = performance.now() - start;
      
      // Simulate render time (processing JSON data)
      const renderStart = performance.now();
      if (response.data && Array.isArray(response.data)) {
        // Simulate React component processing
        const processedData = response.data.map(post => ({
          ...post,
          displayDate: new Date(post.created_at || Date.now()).toLocaleDateString()
        }));
      }
      const renderTime = performance.now() - renderStart;
      
      renderTests.push({
        fetchTime,
        renderTime,
        totalTime: fetchTime + renderTime
      });
    }
    
    const avgTotalTime = this.calculateAverage(renderTests.map(t => t.totalTime));
    const targetRenderTime = 16; // 60fps target
    
    results.componentRenderTime = {
      averageTotalTime: avgTotalTime,
      averageFetchTime: this.calculateAverage(renderTests.map(t => t.fetchTime)),
      averageRenderTime: this.calculateAverage(renderTests.map(t => t.renderTime)),
      target: targetRenderTime,
      compliance: avgTotalTime <= targetRenderTime,
      status: avgTotalTime <= targetRenderTime ? '✅ SMOOTH_60FPS' : '⚠️  FRAME_DROPS'
    };
    
    // Real-time update simulation
    const realTimeTests = [];
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      // Simulate engagement update
      const response = await this.makeRequest('/health'); // Using health as a fast endpoint
      const updateLatency = performance.now() - start;
      realTimeTests.push(updateLatency);
    }
    
    const avgUpdateLatency = this.calculateAverage(realTimeTests);
    results.realTimeUpdates = {
      averageLatency: avgUpdateLatency,
      target: 100, // 100ms for good UX
      compliance: avgUpdateLatency <= 100,
      status: avgUpdateLatency <= 100 ? '✅ RESPONSIVE' : '⚠️  SLOW'
    };
    
    console.log(`    API Client: ${results.apiClientEfficiency.status} (${results.apiClientEfficiency.improvement}% improvement with parallel)`);
    console.log(`    Render Time: ${results.componentRenderTime.status} (${avgTotalTime.toFixed(2)}ms)`);
    console.log(`    Real-time Updates: ${results.realTimeUpdates.status} (${avgUpdateLatency.toFixed(2)}ms)`);
    
    return results;
  }

  generatePerformanceAnalysis() {
    const analysis = {
      overallRating: 'UNKNOWN',
      score: 0,
      strengths: [],
      weaknesses: [],
      criticalIssues: []
    };
    
    let score = 100;
    let criticalIssueCount = 0;
    
    // Analyze API performance
    if (this.results.tests.apiPerformance) {
      const apiResults = Object.values(this.results.tests.apiPerformance)
        .filter(r => r.averageResponseTime);
      
      if (apiResults.length > 0) {
        const avgApiTime = this.calculateAverage(apiResults.map(r => r.averageResponseTime));
        const avgSuccessRate = this.calculateAverage(apiResults.map(r => r.successRate));
        
        if (avgApiTime <= 200) {
          analysis.strengths.push('API response times meet target (<200ms)');
        } else {
          analysis.weaknesses.push(`API response times exceed target (${avgApiTime.toFixed(2)}ms)`);
          score -= Math.min(20, (avgApiTime - 200) / 10);
        }
        
        if (avgSuccessRate >= 0.95) {
          analysis.strengths.push('High API reliability (≥95% success rate)');
        } else {
          analysis.criticalIssues.push(`Low API reliability (${(avgSuccessRate * 100).toFixed(1)}% success rate)`);
          score -= 25;
          criticalIssueCount++;
        }
      }
    }
    
    // Analyze load testing results
    if (this.results.tests.loadTesting) {
      const loadResults = Object.values(this.results.tests.loadTesting);
      if (loadResults.length > 0) {
        const maxThroughput = Math.max(...loadResults.map(r => r.throughput));
        const minSuccessRate = Math.min(...loadResults.map(r => r.successRate));
        
        if (maxThroughput >= 50) {
          analysis.strengths.push(`High throughput capability (${maxThroughput.toFixed(2)} req/s)`);
        } else if (maxThroughput >= 30) {
          analysis.weaknesses.push(`Moderate throughput (${maxThroughput.toFixed(2)} req/s, target: 50)`);
          score -= 10;
        } else {
          analysis.criticalIssues.push(`Low throughput (${maxThroughput.toFixed(2)} req/s)`);
          score -= 20;
          criticalIssueCount++;
        }
        
        if (minSuccessRate < 0.90) {
          analysis.criticalIssues.push('System reliability degrades under load');
          score -= 15;
          criticalIssueCount++;
        }
      }
    }
    
    // Analyze concurrent handling
    if (this.results.tests.concurrentHandling) {
      const highConcurrency = this.results.tests.concurrentHandling['50_users'];
      if (highConcurrency) {
        if (highConcurrency.successRate >= 0.95) {
          analysis.strengths.push('Excellent concurrent user handling');
        } else if (highConcurrency.successRate >= 0.90) {
          analysis.weaknesses.push('Minor issues with high concurrency');
          score -= 5;
        } else {
          analysis.criticalIssues.push('Poor performance under high concurrency');
          score -= 15;
          criticalIssueCount++;
        }
      }
    }
    
    // Analyze database performance
    if (this.results.tests.databasePerformance) {
      const dbResults = Object.values(this.results.tests.databasePerformance);
      const compliantQueries = dbResults.filter(r => r.compliance).length;
      const totalQueries = dbResults.length;
      
      if (compliantQueries === totalQueries && totalQueries > 0) {
        analysis.strengths.push('Database queries meet performance targets');
      } else if (compliantQueries / totalQueries >= 0.7) {
        analysis.weaknesses.push('Some database queries are slow');
        score -= 10;
      } else {
        analysis.criticalIssues.push('Database performance below targets');
        score -= 20;
        criticalIssueCount++;
      }
    }
    
    analysis.score = Math.max(0, score);
    
    // Determine overall rating
    if (analysis.score >= 90 && criticalIssueCount === 0) {
      analysis.overallRating = 'EXCELLENT';
    } else if (analysis.score >= 75 && criticalIssueCount <= 1) {
      analysis.overallRating = 'GOOD';
    } else if (analysis.score >= 60 && criticalIssueCount <= 2) {
      analysis.overallRating = 'FAIR';
    } else {
      analysis.overallRating = 'POOR';
    }
    
    return analysis;
  }

  validatePerformanceTargets() {
    const targets = {
      apiResponseTime: { target: 200, unit: 'ms' },
      databaseQuerySimple: { target: 100, unit: 'ms' },
      databaseQueryComplex: { target: 500, unit: 'ms' },
      throughput: { target: 50, unit: 'req/sec' },
      memoryUsage: { target: 512, unit: 'MB' },
      successRate: { target: 0.95, unit: '%' }
    };
    
    const compliance = {};
    let compliantCount = 0;
    let totalChecks = 0;
    
    // API Response Time Compliance
    if (this.results.tests.apiPerformance) {
      const apiResults = Object.values(this.results.tests.apiPerformance)
        .filter(r => r.averageResponseTime);
      
      if (apiResults.length > 0) {
        const avgTime = this.calculateAverage(apiResults.map(r => r.averageResponseTime));
        const compliant = avgTime <= targets.apiResponseTime.target;
        
        compliance.apiResponseTime = {
          actual: parseFloat(avgTime.toFixed(2)),
          target: targets.apiResponseTime.target,
          unit: targets.apiResponseTime.unit,
          compliant,
          status: compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'
        };
        
        if (compliant) compliantCount++;
        totalChecks++;
      }
    }
    
    // Database Query Performance Compliance
    if (this.results.tests.databasePerformance) {
      const simpleQuery = this.results.tests.databasePerformance.simple;
      const complexQuery = this.results.tests.databasePerformance.complex;
      
      if (simpleQuery) {
        const compliant = simpleQuery.averageTime <= targets.databaseQuerySimple.target;
        compliance.databaseSimpleQuery = {
          actual: parseFloat(simpleQuery.averageTime.toFixed(2)),
          target: targets.databaseQuerySimple.target,
          unit: targets.databaseQuerySimple.unit,
          compliant,
          status: compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'
        };
        
        if (compliant) compliantCount++;
        totalChecks++;
      }
      
      if (complexQuery) {
        const compliant = complexQuery.averageTime <= targets.databaseQueryComplex.target;
        compliance.databaseComplexQuery = {
          actual: parseFloat(complexQuery.averageTime.toFixed(2)),
          target: targets.databaseQueryComplex.target,
          unit: targets.databaseQueryComplex.unit,
          compliant,
          status: compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'
        };
        
        if (compliant) compliantCount++;
        totalChecks++;
      }
    }
    
    // Throughput Compliance
    if (this.results.tests.loadTesting) {
      const loadResults = Object.values(this.results.tests.loadTesting);
      if (loadResults.length > 0) {
        const maxThroughput = Math.max(...loadResults.map(r => r.throughput));
        const compliant = maxThroughput >= targets.throughput.target;
        
        compliance.throughput = {
          actual: parseFloat(maxThroughput.toFixed(2)),
          target: targets.throughput.target,
          unit: targets.throughput.unit,
          compliant,
          status: compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'
        };
        
        if (compliant) compliantCount++;
        totalChecks++;
      }
    }
    
    // Memory Usage Compliance
    if (this.results.tests.systemIntegration?.resourceUsage) {
      const memoryMB = parseFloat(this.results.tests.systemIntegration.resourceUsage.memoryMB);
      const compliant = memoryMB <= targets.memoryUsage.target;
      
      compliance.memoryUsage = {
        actual: memoryMB,
        target: targets.memoryUsage.target,
        unit: targets.memoryUsage.unit,
        compliant,
        status: compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'
      };
      
      if (compliant) compliantCount++;
      totalChecks++;
    }
    
    return {
      details: compliance,
      overallCompliance: totalChecks > 0 ? compliantCount / totalChecks : 0,
      compliantCount,
      totalChecks,
      status: totalChecks > 0 ? 
        (compliantCount / totalChecks >= 0.8 ? 'EXCELLENT' : 
         compliantCount / totalChecks >= 0.6 ? 'GOOD' : 
         compliantCount / totalChecks >= 0.4 ? 'FAIR' : 'POOR') : 'UNKNOWN'
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    // API Performance Recommendations
    if (this.results.tests.apiPerformance) {
      const slowEndpoints = Object.entries(this.results.tests.apiPerformance)
        .filter(([name, result]) => result.averageResponseTime > 200)
        .map(([name]) => name);
      
      if (slowEndpoints.length > 0) {
        recommendations.push({
          category: 'API_PERFORMANCE',
          priority: 'HIGH',
          title: 'Optimize Slow API Endpoints',
          description: `Endpoints exceeding 200ms target: ${slowEndpoints.join(', ')}`,
          actions: [
            'Implement response caching (Redis)',
            'Optimize database queries with EXPLAIN ANALYZE',
            'Add database indexes on frequently queried columns',
            'Consider response compression for large payloads'
          ]
        });
      }
    }
    
    // Database Performance Recommendations  
    if (this.results.tests.databasePerformance) {
      const slowQueries = Object.values(this.results.tests.databasePerformance)
        .filter(q => !q.compliance);
      
      if (slowQueries.length > 0) {
        recommendations.push({
          category: 'DATABASE_OPTIMIZATION',
          priority: 'HIGH',
          title: 'Optimize Database Query Performance',
          description: 'Database queries are not meeting performance targets',
          actions: [
            'Add indexes on search columns (title, content)',
            'Implement connection pooling optimization',
            'Use EXPLAIN ANALYZE to identify slow queries',
            'Consider query result caching',
            'Optimize JOIN operations and WHERE clauses'
          ]
        });
      }
    }
    
    // Load Testing Recommendations
    if (this.results.tests.loadTesting) {
      const poorLoadResults = Object.values(this.results.tests.loadTesting)
        .filter(r => r.successRate < 0.90 || r.throughput < 30);
      
      if (poorLoadResults.length > 0) {
        recommendations.push({
          category: 'SCALABILITY',
          priority: 'HIGH',
          title: 'Improve System Scalability',
          description: 'System performance degrades under load',
          actions: [
            'Implement load balancing',
            'Increase connection pool size',
            'Add request queuing and rate limiting',
            'Optimize resource usage and memory management',
            'Consider horizontal scaling strategies'
          ]
        });
      }
    }
    
    // Frontend Performance Recommendations
    if (this.results.tests.frontendSimulation) {
      const frontendIssues = [];
      
      if (!this.results.tests.frontendSimulation.componentRenderTime?.compliance) {
        frontendIssues.push('Component render times exceed 16ms target');
      }
      
      if (!this.results.tests.frontendSimulation.realTimeUpdates?.compliance) {
        frontendIssues.push('Real-time update latency exceeds 100ms target');
      }
      
      if (frontendIssues.length > 0) {
        recommendations.push({
          category: 'FRONTEND_PERFORMANCE',
          priority: 'MEDIUM',
          title: 'Optimize Frontend Performance',
          description: frontendIssues.join('; '),
          actions: [
            'Implement React.memo for component optimization',
            'Use virtual scrolling for large lists',
            'Implement proper state management (React Query/SWR)',
            'Optimize bundle size with code splitting',
            'Add service worker for caching'
          ]
        });
      }
    }
    
    // System Integration Recommendations
    if (this.results.tests.systemIntegration) {
      const resourceUsage = this.results.tests.systemIntegration.resourceUsage;
      
      if (resourceUsage && parseFloat(resourceUsage.memoryMB) > 256) {
        recommendations.push({
          category: 'RESOURCE_OPTIMIZATION',
          priority: 'MEDIUM',
          title: 'Optimize Memory Usage',
          description: `High memory usage detected: ${resourceUsage.memoryMB}MB`,
          actions: [
            'Profile memory usage to identify leaks',
            'Implement proper garbage collection strategies',
            'Optimize data structures and caching',
            'Consider memory-efficient algorithms'
          ]
        });
      }
    }
    
    // General Performance Recommendations
    if (this.results.analysis && this.results.analysis.score < 80) {
      recommendations.push({
        category: 'GENERAL_OPTIMIZATION',
        priority: 'HIGH',
        title: 'Comprehensive Performance Optimization Required',
        description: `Overall performance score: ${this.results.analysis.score}/100`,
        actions: [
          'Implement comprehensive monitoring and alerting',
          'Set up performance budgets and CI/CD checks',
          'Regular performance testing in CI pipeline',
          'Implement APM (Application Performance Monitoring)',
          'Consider CDN for static assets'
        ]
      });
    }
    
    return recommendations;
  }

  async makeRequest(path, method = 'GET', baseUrl = this.baseUrl) {
    return new Promise((resolve) => {
      const url = new URL(path, baseUrl);
      const startTime = performance.now();
      
      const options = {
        method,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AgentFeedBenchmarker/1.0'
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
    const filename = `agent-feed-performance-report-${timestamp}.json`;
    
    try {
      await fs.writeFile(filename, JSON.stringify(this.results, null, 2));
      console.log(`\n📄 Performance report saved: ${filename}`);
    } catch (error) {
      console.log(`\n⚠️  Could not save report: ${error.message}`);
    }
  }

  displayComprehensiveReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 AGENT FEED PERFORMANCE BENCHMARK REPORT');
    console.log('='.repeat(80));
    
    // Overall Analysis
    if (this.results.analysis) {
      console.log(`\n🎯 OVERALL PERFORMANCE: ${this.results.analysis.overallRating}`);
      console.log(`📈 Performance Score: ${this.results.analysis.score}/100`);
      
      if (this.results.analysis.strengths.length > 0) {
        console.log('\n🏆 STRENGTHS:');
        this.results.analysis.strengths.forEach(strength => {
          console.log(`  ⭐ ${strength}`);
        });
      }
      
      if (this.results.analysis.weaknesses.length > 0) {
        console.log('\n⚠️  AREAS FOR IMPROVEMENT:');
        this.results.analysis.weaknesses.forEach(weakness => {
          console.log(`  🔸 ${weakness}`);
        });
      }
      
      if (this.results.analysis.criticalIssues.length > 0) {
        console.log('\n🚨 CRITICAL ISSUES:');
        this.results.analysis.criticalIssues.forEach(issue => {
          console.log(`  ❌ ${issue}`);
        });
      }
    }
    
    // Compliance Summary
    if (this.results.compliance) {
      console.log(`\n🎯 PERFORMANCE TARGET COMPLIANCE: ${this.results.compliance.status}`);
      console.log(`📊 Compliance Rate: ${this.results.compliance.compliantCount}/${this.results.compliance.totalChecks} (${(this.results.compliance.overallCompliance * 100).toFixed(1)}%)`);
      
      if (this.results.compliance.details) {
        console.log('\n📋 DETAILED COMPLIANCE:');
        Object.entries(this.results.compliance.details).forEach(([metric, details]) => {
          console.log(`  ${details.status} ${metric}: ${details.actual}${details.unit} (target: ${details.target}${details.unit})`);
        });
      }
    }
    
    // Key Metrics Summary
    console.log('\n📊 KEY PERFORMANCE METRICS:');
    
    // API Performance Summary
    if (this.results.tests.apiPerformance) {
      const apiResults = Object.values(this.results.tests.apiPerformance)
        .filter(r => r.averageResponseTime);
      
      if (apiResults.length > 0) {
        const avgTime = this.calculateAverage(apiResults.map(r => r.averageResponseTime));
        const avgSuccess = this.calculateAverage(apiResults.map(r => r.successRate));
        console.log(`  🌐 API Average Response Time: ${avgTime.toFixed(2)}ms`);
        console.log(`  ✅ API Success Rate: ${(avgSuccess * 100).toFixed(1)}%`);
      }
    }
    
    // Load Testing Summary
    if (this.results.tests.loadTesting) {
      const loadResults = Object.values(this.results.tests.loadTesting);
      if (loadResults.length > 0) {
        const maxThroughput = Math.max(...loadResults.map(r => r.throughput));
        console.log(`  🚀 Maximum Throughput: ${maxThroughput.toFixed(2)} req/s`);
      }
    }
    
    // System Integration Summary
    if (this.results.tests.systemIntegration) {
      const resourceUsage = this.results.tests.systemIntegration.resourceUsage;
      if (resourceUsage) {
        console.log(`  💾 Memory Usage: ${resourceUsage.memoryMB}MB`);
      }
      
      const claudeTerminal = this.results.tests.systemIntegration.claudeTerminal;
      if (claudeTerminal) {
        console.log(`  🤖 Claude Terminal: ${claudeTerminal.status}`);
      }
    }
    
    // Top Recommendations
    if (this.results.recommendations && this.results.recommendations.length > 0) {
      console.log('\n💡 TOP PERFORMANCE RECOMMENDATIONS:');
      this.results.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`\n  ${index + 1}. ${rec.title} (${rec.priority} Priority)`);
        console.log(`     Category: ${rec.category}`);
        console.log(`     ${rec.description}`);
        if (rec.actions && rec.actions.length > 0) {
          console.log(`     Actions:`);
          rec.actions.slice(0, 2).forEach(action => {
            console.log(`       • ${action}`);
          });
        }
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`📋 Benchmark completed at: ${this.results.timestamp}`);
    console.log('='.repeat(80));
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

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI Interface
if (require.main === module) {
  const benchmarker = new AgentFeedPerformanceBenchmark();
  
  benchmarker.runComprehensiveBenchmark()
    .then(results => {
      const overallRating = results.analysis?.overallRating || 'UNKNOWN';
      const complianceRate = results.compliance ? 
        `${results.compliance.compliantCount}/${results.compliance.totalChecks}` : 'N/A';
      
      console.log(`\n🎉 Performance benchmarking completed!`);
      console.log(`📊 Overall Rating: ${overallRating}`);
      console.log(`🎯 Compliance: ${complianceRate}`);
      
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Performance benchmarking failed:', error);
      process.exit(1);
    });
}

module.exports = AgentFeedPerformanceBenchmark;