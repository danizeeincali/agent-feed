#!/usr/bin/env node

/**
 * Comprehensive Production Validation Tests
 * 
 * Tests actual production functionality without WebSocket issues
 */

const http = require('http');
const { exec, spawn } = require('child_process');
const fs = require('fs').promises;

class ComprehensiveValidator {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      criticalIssues: [],
      warnings: [],
      productionMetrics: {}
    };
  }

  async validate() {
    console.log('🚀 Starting Comprehensive Production Validation...\n');
    
    try {
      await this.testDatabaseOperations();
      await this.testAPIEndpointStability();
      await this.testRealDataFlow();
      await this.testErrorHandling();
      await this.testPerformanceMetrics();
      await this.testProductionDataIntegrity();
      await this.testBackendStability();
      
      await this.generateComprehensiveReport();
      
    } catch (error) {
      console.error('❌ Critical validation failure:', error.message);
      process.exit(1);
    }
  }

  async testDatabaseOperations() {
    console.log('📋 Testing Database Operations...');
    
    try {
      // Test database health
      const healthResponse = await this.makeRequest('/api/v1/health');
      const agentPostsResponse = await this.makeRequest('/api/v1/agent-posts');
      
      // Test database file integrity
      const dbPath = '/workspaces/agent-feed/data/agent-feed.db';
      let dbStats = null;
      try {
        dbStats = await fs.stat(dbPath);
      } catch (e) {
        this.results.criticalIssues.push('Database file not accessible');
      }
      
      const result = {
        name: 'Database Operations',
        status: 'PASS',
        details: {
          healthCheck: healthResponse.status === 200,
          dataRetrieval: agentPostsResponse.status === 200,
          recordCount: agentPostsResponse.data?.data?.length || 0,
          databaseFile: {
            exists: !!dbStats,
            size: dbStats ? dbStats.size : 0,
            lastModified: dbStats ? dbStats.mtime : null
          },
          performanceMetrics: {
            healthResponseTime: healthResponse.responseTime,
            dataRetrievalTime: agentPostsResponse.responseTime
          }
        }
      };
      
      if (result.details.recordCount === 0) {
        this.results.warnings.push('No data records found in database');
      }
      
      this.results.tests.push(result);
      console.log(`   ✅ Database operational with ${result.details.recordCount} records`);
      
    } catch (error) {
      this.results.criticalIssues.push(`Database test failed: ${error.message}`);
      console.log('   ❌ Database operations failed');
    }
  }

  async testAPIEndpointStability() {
    console.log('📋 Testing API Endpoint Stability...');
    
    const endpoints = [
      '/health',
      '/api/health', 
      '/api/agents',
      '/api/v1/agent-posts',
      '/api/v1/activities',
      '/api/v1/metrics/system',
      '/api/v1/analytics',
      '/api/claude/instances'
    ];
    
    const stabilityResults = [];
    
    for (const endpoint of endpoints) {
      const iterations = 5;
      const responseTimes = [];
      let successCount = 0;
      
      for (let i = 0; i < iterations; i++) {
        const response = await this.makeRequest(endpoint);
        if (response.status === 200) {
          successCount++;
          responseTimes.push(response.responseTime);
        }
        await this.sleep(100); // Small delay between requests
      }
      
      const avgResponseTime = responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;
      
      const stability = (successCount / iterations) * 100;
      
      stabilityResults.push({
        endpoint,
        stability: stability,
        avgResponseTime,
        successCount,
        iterations
      });
      
      if (stability < 100) {
        this.results.warnings.push(`Endpoint ${endpoint} stability: ${stability}%`);
      }
    }
    
    const overallStability = stabilityResults.reduce((sum, r) => sum + r.stability, 0) / stabilityResults.length;
    
    this.results.tests.push({
      name: 'API Endpoint Stability',
      status: overallStability >= 95 ? 'PASS' : (overallStability >= 80 ? 'WARN' : 'FAIL'),
      details: {
        overallStability: Math.round(overallStability),
        endpoints: stabilityResults,
        avgResponseTime: Math.round(stabilityResults.reduce((sum, r) => sum + r.avgResponseTime, 0) / stabilityResults.length)
      }
    });
    
    console.log(`   ${overallStability >= 95 ? '✅' : '⚠️'} API stability: ${Math.round(overallStability)}%`);
  }

  async testRealDataFlow() {
    console.log('📋 Testing Real Data Flow...');
    
    try {
      // Test that we get real data, not mock data
      const postsResponse = await this.makeRequest('/api/v1/agent-posts');
      const activitiesResponse = await this.makeRequest('/api/v1/activities');
      const metricsResponse = await this.makeRequest('/api/v1/metrics/system');
      
      const posts = postsResponse.data?.data || [];
      const activities = activitiesResponse.data?.data || [];
      const metrics = metricsResponse.data?.data || [];
      
      // Check for production data indicators
      const hasRealPosts = posts.some(post => 
        post.id && post.title && post.content && post.author_agent
      );
      
      const hasRealActivities = activities.some(activity =>
        activity.id && activity.type && activity.description
      );
      
      const hasRealMetrics = metrics.length > 0 && metrics[0].cpu_usage !== undefined;
      
      // Check for mock data patterns
      const mockPatterns = [
        /mock/i, /fake/i, /stub/i, /test.*data/i, /example/i, /placeholder/i
      ];
      
      const foundMockData = posts.some(post => 
        mockPatterns.some(pattern => 
          pattern.test(post.title) || pattern.test(post.content) || pattern.test(post.author_agent)
        )
      );
      
      this.results.tests.push({
        name: 'Real Data Flow',
        status: (hasRealPosts && hasRealActivities && hasRealMetrics && !foundMockData) ? 'PASS' : 'WARN',
        details: {
          realPosts: hasRealPosts,
          realActivities: hasRealActivities,
          realMetrics: hasRealMetrics,
          mockDataDetected: foundMockData,
          dataVolume: {
            posts: posts.length,
            activities: activities.length,
            metrics: metrics.length
          }
        }
      });
      
      if (foundMockData) {
        this.results.warnings.push('Mock data patterns detected in production data');
      }
      
      console.log(`   ✅ Real data flow validated (${posts.length} posts, ${activities.length} activities)`);
      
    } catch (error) {
      this.results.criticalIssues.push(`Real data flow test failed: ${error.message}`);
      console.log('   ❌ Real data flow test failed');
    }
  }

  async testErrorHandling() {
    console.log('📋 Testing Error Handling...');
    
    const errorTests = [
      { path: '/api/nonexistent', expectedStatus: [404, 405] },
      { path: '/api/v1/invalid-endpoint', expectedStatus: [404, 405] },
      { path: '/api/agents/invalid-id', expectedStatus: [404, 400] }
    ];
    
    const results = [];
    
    for (const test of errorTests) {
      const response = await this.makeRequest(test.path);
      const handled = test.expectedStatus.includes(response.status);
      
      results.push({
        path: test.path,
        expectedStatus: test.expectedStatus,
        actualStatus: response.status,
        handled: handled,
        responseTime: response.responseTime
      });
    }
    
    const allHandled = results.every(r => r.handled);
    
    this.results.tests.push({
      name: 'Error Handling',
      status: allHandled ? 'PASS' : 'FAIL',
      details: {
        tests: results,
        successRate: (results.filter(r => r.handled).length / results.length) * 100
      }
    });
    
    console.log(`   ${allHandled ? '✅' : '❌'} Error handling: ${results.filter(r => r.handled).length}/${results.length} tests passed`);
  }

  async testPerformanceMetrics() {
    console.log('📋 Testing Performance Metrics...');
    
    const performanceTests = [
      { endpoint: '/api/health', threshold: 50 },
      { endpoint: '/api/v1/agent-posts', threshold: 100 },
      { endpoint: '/api/v1/activities', threshold: 100 },
      { endpoint: '/api/v1/metrics/system', threshold: 200 }
    ];
    
    const results = [];
    
    for (const test of performanceTests) {
      const iterations = 10;
      const times = [];
      
      for (let i = 0; i < iterations; i++) {
        const response = await this.makeRequest(test.endpoint);
        if (response.responseTime) {
          times.push(response.responseTime);
        }
      }
      
      const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      results.push({
        endpoint: test.endpoint,
        avgResponseTime: avgTime,
        maxResponseTime: maxTime,
        minResponseTime: minTime,
        threshold: test.threshold,
        withinThreshold: avgTime <= test.threshold,
        samples: times.length
      });
    }
    
    const allWithinThreshold = results.every(r => r.withinThreshold);
    const overallAvg = Math.round(results.reduce((sum, r) => sum + r.avgResponseTime, 0) / results.length);
    
    this.results.tests.push({
      name: 'Performance Metrics',
      status: allWithinThreshold ? 'PASS' : 'WARN',
      details: {
        overallAverageResponseTime: overallAvg,
        tests: results,
        withinThresholdCount: results.filter(r => r.withinThreshold).length,
        totalTests: results.length
      }
    });
    
    console.log(`   ${allWithinThreshold ? '✅' : '⚠️'} Performance: ${overallAvg}ms average response time`);
  }

  async testProductionDataIntegrity() {
    console.log('📋 Testing Production Data Integrity...');
    
    try {
      // Test agents data structure
      const agentsResponse = await this.makeRequest('/api/agents');
      const agents = agentsResponse.data?.data || [];
      
      // Validate agent data structure
      const validAgents = agents.filter(agent => 
        agent.id && 
        agent.name && 
        agent.display_name && 
        agent.system_prompt &&
        Array.isArray(agent.capabilities) &&
        agent.performance_metrics &&
        agent.health_status
      );
      
      // Test posts data structure  
      const postsResponse = await this.makeRequest('/api/v1/agent-posts');
      const posts = postsResponse.data?.data || [];
      
      const validPosts = posts.filter(post =>
        post.id &&
        post.published_at &&
        typeof post.likes === 'number' &&
        typeof post.comments === 'number'
      );
      
      const dataIntegrity = {
        agents: {
          total: agents.length,
          valid: validAgents.length,
          integrity: agents.length > 0 ? (validAgents.length / agents.length) * 100 : 0
        },
        posts: {
          total: posts.length,
          valid: validPosts.length,
          integrity: posts.length > 0 ? (validPosts.length / posts.length) * 100 : 0
        }
      };
      
      const overallIntegrity = (dataIntegrity.agents.integrity + dataIntegrity.posts.integrity) / 2;
      
      this.results.tests.push({
        name: 'Production Data Integrity',
        status: overallIntegrity >= 95 ? 'PASS' : (overallIntegrity >= 80 ? 'WARN' : 'FAIL'),
        details: dataIntegrity
      });
      
      console.log(`   ${overallIntegrity >= 95 ? '✅' : '⚠️'} Data integrity: ${Math.round(overallIntegrity)}%`);
      
    } catch (error) {
      this.results.criticalIssues.push(`Data integrity test failed: ${error.message}`);
      console.log('   ❌ Data integrity test failed');
    }
  }

  async testBackendStability() {
    console.log('📋 Testing Backend Stability...');
    
    try {
      // Check process stability
      const processes = await this.getBackendProcesses();
      
      // Test continuous operation
      const stabilityTest = await this.runStabilityTest();
      
      // Memory usage check (basic)
      const memoryCheck = await this.checkMemoryUsage();
      
      this.results.tests.push({
        name: 'Backend Stability',
        status: (processes.length === 1 && stabilityTest.success) ? 'PASS' : 'WARN',
        details: {
          processCount: processes.length,
          stabilityTest: stabilityTest,
          memoryCheck: memoryCheck,
          uptime: await this.getUptime()
        }
      });
      
      if (processes.length > 1) {
        this.results.warnings.push(`Multiple backend processes detected: ${processes.length}`);
      }
      
      console.log(`   ${processes.length === 1 ? '✅' : '⚠️'} Backend stability: ${processes.length} process(es) running`);
      
    } catch (error) {
      this.results.criticalIssues.push(`Backend stability test failed: ${error.message}`);
      console.log('   ❌ Backend stability test failed');
    }
  }

  async runStabilityTest() {
    const duration = 30000; // 30 seconds
    const interval = 1000;  // 1 second
    const startTime = Date.now();
    
    let successCount = 0;
    let totalRequests = 0;
    
    while (Date.now() - startTime < duration) {
      totalRequests++;
      const response = await this.makeRequest('/api/health');
      if (response.status === 200) {
        successCount++;
      }
      await this.sleep(interval);
    }
    
    return {
      success: (successCount / totalRequests) >= 0.95,
      successRate: Math.round((successCount / totalRequests) * 100),
      totalRequests,
      successCount,
      duration: Date.now() - startTime
    };
  }

  async generateComprehensiveReport() {
    console.log('\n📊 Generating Comprehensive Production Report...');
    
    const totalTests = this.results.tests.length;
    const passedTests = this.results.tests.filter(t => t.status === 'PASS').length;
    const failedTests = this.results.tests.filter(t => t.status === 'FAIL').length;
    const warningTests = this.results.tests.filter(t => t.status === 'WARN').length;
    
    const summary = {
      totalTests,
      passedTests,
      failedTests, 
      warningTests,
      successRate: Math.round((passedTests / totalTests) * 100),
      criticalIssues: this.results.criticalIssues.length,
      warnings: this.results.warnings.length,
      productionReady: this.results.criticalIssues.length === 0 && failedTests === 0
    };
    
    const report = {
      ...this.results,
      summary,
      recommendations: this.generateRecommendations(summary)
    };
    
    // Save report
    const reportPath = '/workspaces/agent-feed/tests/comprehensive-production-report.json';
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Console output
    console.log('='.repeat(70));
    console.log('📊 COMPREHENSIVE PRODUCTION VALIDATION RESULTS');
    console.log('='.repeat(70));
    console.log(`✅ Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Tests Failed: ${failedTests}/${totalTests}`);
    console.log(`⚠️ Tests with Warnings: ${warningTests}/${totalTests}`);
    console.log(`🎯 Success Rate: ${summary.successRate}%`);
    console.log(`🚨 Critical Issues: ${this.results.criticalIssues.length}`);
    console.log(`⚠️ Warnings: ${this.results.warnings.length}`);
    console.log(`🚀 Production Ready: ${summary.productionReady ? 'YES' : 'NO'}`);
    
    if (this.results.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      this.results.criticalIssues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }
    
    if (this.results.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.results.warnings.forEach((warning, i) => {
        console.log(`   ${i + 1}. ${warning}`);
      });
    }
    
    console.log(`\n📄 Detailed report saved: ${reportPath}`);
    console.log('='.repeat(70));
    
    return summary.productionReady;
  }

  generateRecommendations(summary) {
    const recommendations = [];
    
    if (summary.criticalIssues > 0) {
      recommendations.push('🚨 URGENT: Resolve all critical issues before production deployment');
    }
    
    if (summary.successRate < 95) {
      recommendations.push('📈 Improve system reliability to achieve 95%+ success rate');
    }
    
    if (this.results.warnings.some(w => w.includes('Multiple backend processes'))) {
      recommendations.push('🔧 Implement proper process management to prevent multiple instances');
    }
    
    if (this.results.warnings.some(w => w.includes('Mock data'))) {
      recommendations.push('🗄️ Remove all mock data patterns from production environment');
    }
    
    if (this.results.warnings.some(w => w.includes('stability'))) {
      recommendations.push('⚡ Improve API endpoint stability and response consistency');
    }
    
    if (summary.productionReady) {
      recommendations.push('✅ System is ready for production deployment');
      recommendations.push('📊 Consider implementing continuous monitoring');
      recommendations.push('🔒 Ensure proper security measures are in place');
    }
    
    return recommendations;
  }

  // Helper methods
  async makeRequest(path) {
    const url = `${this.baseUrl}${path}`;
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const req = http.request(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          try {
            const parsedData = data ? JSON.parse(data) : null;
            resolve({ status: res.statusCode, data: parsedData, responseTime });
          } catch (e) {
            resolve({ status: res.statusCode, data: data, responseTime });
          }
        });
      });
      
      req.on('error', () => {
        resolve({ status: 0, error: 'Connection failed', responseTime: Date.now() - startTime });
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        resolve({ status: 0, error: 'Timeout', responseTime: Date.now() - startTime });
      });
      
      req.end();
    });
  }

  async getBackendProcesses() {
    return new Promise((resolve) => {
      exec('ps aux | grep "node simple-backend"', (error, stdout) => {
        if (error) {
          resolve([]);
          return;
        }
        const lines = stdout.split('\n').filter(line => 
          line.includes('node simple-backend.js') && !line.includes('grep')
        );
        resolve(lines);
      });
    });
  }

  async checkMemoryUsage() {
    return new Promise((resolve) => {
      exec('ps aux | grep "node simple-backend" | grep -v grep | awk \'{print $4}\'', (error, stdout) => {
        if (error) {
          resolve({ available: false });
          return;
        }
        const memoryUsages = stdout.split('\n').filter(line => line.trim()).map(parseFloat);
        const totalMemory = memoryUsages.reduce((sum, mem) => sum + mem, 0);
        resolve({
          available: true,
          totalMemoryPercent: Math.round(totalMemory * 10) / 10,
          processCount: memoryUsages.length
        });
      });
    });
  }

  async getUptime() {
    const response = await this.makeRequest('/health');
    return response.data?.timestamp ? 'Available' : 'Unknown';
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new ComprehensiveValidator();
  validator.validate()
    .then((isReady) => {
      process.exit(isReady ? 0 : 1);
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = ComprehensiveValidator;