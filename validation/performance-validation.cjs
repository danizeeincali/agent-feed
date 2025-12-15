#!/usr/bin/env node

/**
 * Performance Validation Script
 * Tests real performance metrics and loading times
 */

const http = require('http');
const fs = require('fs').promises;

class PerformanceValidator {
  constructor(baseUrl = 'http://localhost:5173') {
    this.baseUrl = baseUrl;
    this.results = {
      timestamp: new Date().toISOString(),
      metrics: {},
      summary: {
        loadTimeMs: 0,
        responseTimeMs: 0,
        totalSize: 0,
        recommendations: []
      }
    };
  }

  async measureLoadTime() {
    console.log('⚡ Measuring application load time...');

    const iterations = 5;
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();

      await new Promise((resolve, reject) => {
        const req = http.request(this.baseUrl, { method: 'GET' }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const endTime = Date.now();
            times.push(endTime - startTime);
            resolve();
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        req.setTimeout(10000);
        req.end();
      });

      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    this.results.metrics.loadTime = {
      average: avgTime,
      minimum: minTime,
      maximum: maxTime,
      samples: times
    };

    console.log(`📊 Load time - Avg: ${avgTime.toFixed(1)}ms, Min: ${minTime}ms, Max: ${maxTime}ms`);

    return avgTime;
  }

  async measureResponseSizes() {
    console.log('📏 Measuring response sizes...');

    const endpoints = [
      '/',
      '/vite.svg',
      '/api/health',
      '/api/agents'
    ];

    const sizes = {};
    let totalSize = 0;

    for (const endpoint of endpoints) {
      try {
        const url = endpoint.startsWith('/') ? this.baseUrl + endpoint : endpoint;

        await new Promise((resolve, reject) => {
          const req = http.request(url, { method: 'GET' }, (res) => {
            let size = 0;
            res.on('data', chunk => size += chunk.length);
            res.on('end', () => {
              sizes[endpoint] = size;
              totalSize += size;
              console.log(`  ${endpoint}: ${size} bytes`);
              resolve();
            });
          });

          req.on('error', (err) => {
            sizes[endpoint] = 0;
            console.log(`  ${endpoint}: Error - ${err.message}`);
            resolve(); // Don't fail on individual endpoint errors
          });

          req.setTimeout(5000);
          req.end();
        });

      } catch (error) {
        sizes[endpoint] = 0;
        console.log(`  ${endpoint}: Error - ${error.message}`);
      }
    }

    this.results.metrics.responseSizes = sizes;
    this.results.summary.totalSize = totalSize;

    console.log(`📊 Total response size: ${totalSize} bytes`);
    return totalSize;
  }

  async measureConcurrentLoad() {
    console.log('🚀 Testing concurrent load handling...');

    const concurrentRequests = 10;
    const startTime = Date.now();

    const promises = Array.from({ length: concurrentRequests }, () =>
      new Promise((resolve) => {
        const reqStartTime = Date.now();
        const req = http.request(this.baseUrl, { method: 'GET' }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({
              success: true,
              time: Date.now() - reqStartTime,
              status: res.statusCode
            });
          });
        });

        req.on('error', () => {
          resolve({
            success: false,
            time: Date.now() - reqStartTime,
            status: 0
          });
        });

        req.setTimeout(10000);
        req.end();
      })
    );

    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    const successful = results.filter(r => r.success).length;
    const avgResponseTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.time, 0) / successful;

    this.results.metrics.concurrentLoad = {
      totalRequests: concurrentRequests,
      successful: successful,
      failed: concurrentRequests - successful,
      totalTime: totalTime,
      averageResponseTime: avgResponseTime,
      results: results
    };

    console.log(`📊 Concurrent load - ${successful}/${concurrentRequests} successful, avg: ${avgResponseTime.toFixed(1)}ms`);

    return { successful, avgResponseTime };
  }

  async testMemoryUsage() {
    console.log('💾 Checking memory constraints...');

    const memUsage = process.memoryUsage();

    this.results.metrics.memoryUsage = {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      timestamp: new Date().toISOString()
    };

    const heapUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
    console.log(`📊 Memory usage - Heap: ${heapUsedMB}MB`);

    return memUsage;
  }

  generateRecommendations() {
    const recommendations = [];

    // Load time recommendations
    if (this.results.metrics.loadTime?.average > 2000) {
      recommendations.push('Consider optimizing load time (currently > 2 seconds)');
    }

    // Size recommendations
    if (this.results.summary.totalSize > 1024 * 1024) { // 1MB
      recommendations.push('Consider reducing bundle size (currently > 1MB)');
    }

    // Concurrent load recommendations
    const concurrentMetrics = this.results.metrics.concurrentLoad;
    if (concurrentMetrics && concurrentMetrics.successful < concurrentMetrics.totalRequests * 0.9) {
      recommendations.push('Improve concurrent request handling (success rate < 90%)');
    }

    // Memory recommendations
    const memoryMB = this.results.metrics.memoryUsage?.heapUsed / 1024 / 1024;
    if (memoryMB > 100) {
      recommendations.push('Monitor memory usage (currently high)');
    }

    return recommendations;
  }

  async runAllTests() {
    console.log('⚡ Starting Performance Validation...');
    console.log(`📍 Target: ${this.baseUrl}\n`);

    try {
      const loadTime = await this.measureLoadTime();
      const totalSize = await this.measureResponseSizes();
      const concurrentResults = await this.measureConcurrentLoad();
      const memoryUsage = await this.testMemoryUsage();

      this.results.summary.loadTimeMs = loadTime;
      this.results.summary.responseTimeMs = concurrentResults.avgResponseTime;
      this.results.summary.recommendations = this.generateRecommendations();

      // Performance thresholds
      const performanceScore = this.calculatePerformanceScore();
      this.results.summary.score = performanceScore;
      this.results.summary.grade = this.getPerformanceGrade(performanceScore);

      console.log('\n' + '='.repeat(50));
      console.log('⚡ PERFORMANCE VALIDATION SUMMARY');
      console.log('='.repeat(50));
      console.log(`Load Time: ${loadTime.toFixed(1)}ms`);
      console.log(`Response Time: ${concurrentResults.avgResponseTime.toFixed(1)}ms`);
      console.log(`Total Size: ${(totalSize / 1024).toFixed(1)}KB`);
      console.log(`Performance Score: ${performanceScore}/100`);
      console.log(`Grade: ${this.results.summary.grade}`);

      if (this.results.summary.recommendations.length > 0) {
        console.log('\n📋 RECOMMENDATIONS:');
        this.results.summary.recommendations.forEach((rec, i) => {
          console.log(`  ${i + 1}. ${rec}`);
        });
      }

      // Save report
      const reportPath = 'validation/performance-validation-report.json';
      await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
      console.log(`\n📄 Performance report saved to: ${reportPath}`);

      return performanceScore >= 70; // Pass if score >= 70

    } catch (error) {
      console.error('❌ Performance validation failed:', error);
      return false;
    }
  }

  calculatePerformanceScore() {
    let score = 100;

    // Load time scoring (30 points)
    const loadTime = this.results.metrics.loadTime?.average || 0;
    if (loadTime > 5000) score -= 30;
    else if (loadTime > 3000) score -= 20;
    else if (loadTime > 1000) score -= 10;

    // Concurrent load scoring (30 points)
    const concurrent = this.results.metrics.concurrentLoad;
    if (concurrent) {
      const successRate = concurrent.successful / concurrent.totalRequests;
      if (successRate < 0.5) score -= 30;
      else if (successRate < 0.8) score -= 20;
      else if (successRate < 0.95) score -= 10;
    }

    // Response time scoring (20 points)
    const responseTime = this.results.summary.responseTimeMs || 0;
    if (responseTime > 2000) score -= 20;
    else if (responseTime > 1000) score -= 10;
    else if (responseTime > 500) score -= 5;

    // Size scoring (20 points)
    const sizeMB = this.results.summary.totalSize / (1024 * 1024);
    if (sizeMB > 5) score -= 20;
    else if (sizeMB > 2) score -= 10;
    else if (sizeMB > 1) score -= 5;

    return Math.max(0, score);
  }

  getPerformanceGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}

async function main() {
  const validator = new PerformanceValidator();
  const passed = await validator.runAllTests();
  process.exit(passed ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = PerformanceValidator;