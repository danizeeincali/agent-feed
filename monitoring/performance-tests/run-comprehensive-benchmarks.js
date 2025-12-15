#!/usr/bin/env node

/**
 * Comprehensive Performance Benchmark Orchestrator
 * Coordinates all performance testing components and generates unified reports
 */

const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const { performance } = require('perf_hooks');

// Import performance testing modules
const ConsensusPerformanceBenchmarker = require('./performance-benchmarker');
const DatabasePerformanceAnalyzer = require('./database/db-performance-analyzer');
const DistributedLoadTestRunner = require('./load-testing/load-test-runner');

class ComprehensivePerformanceSuite {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || process.env.API_BASE_URL || 'http://localhost:3000',
      fallbackUrl: config.fallbackUrl || process.env.API_FALLBACK_URL || 'http://localhost:3001',
      databaseUrl: config.databaseUrl || process.env.DATABASE_URL,
      outputDir: config.outputDir || path.join(__dirname, 'reports'),
      parallel: config.parallel !== false, // Enable parallel execution by default
      ...config
    };
    
    this.results = {};
    this.startTime = null;
    this.endTime = null;
  }

  async runComprehensiveBenchmarks() {
    console.log('🚀 Starting Comprehensive Performance Benchmark Suite');
    console.log('====================================================');
    console.log(`Base URL: ${this.config.baseUrl}`);
    console.log(`Fallback URL: ${this.config.fallbackUrl}`);
    console.log(`Output Directory: ${this.config.outputDir}`);
    console.log(`Parallel Execution: ${this.config.parallel}`);
    
    this.startTime = Date.now();
    
    try {
      // Ensure output directory exists
      await fs.mkdir(this.config.outputDir, { recursive: true });
      
      // Pre-flight checks
      console.log('\n🔍 Running pre-flight checks...');
      const preflightResults = await this.runPreflightChecks();
      
      if (!preflightResults.allPassed) {
        console.log('❌ Pre-flight checks failed. Aborting benchmark suite.');
        return null;
      }
      
      // Run benchmark components
      if (this.config.parallel) {
        await this.runBenchmarksParallel();
      } else {
        await this.runBenchmarksSequential();
      }
      
      this.endTime = Date.now();
      
      // Generate unified report
      const unifiedReport = await this.generateUnifiedReport();
      
      // Save and display results
      await this.saveResults(unifiedReport);
      this.displaySummary(unifiedReport);
      
      console.log('\n✅ Comprehensive performance benchmarking completed successfully!');
      return unifiedReport;
      
    } catch (error) {
      console.error('❌ Benchmark suite failed:', error);
      throw error;
    }
  }

  async runPreflightChecks() {
    const checks = {
      primaryServer: false,
      fallbackServer: false,
      database: false,
      nodeVersion: false,
      systemResources: false
    };
    
    // Check primary server
    try {
      const response = await this.makeHealthCheck(this.config.baseUrl);
      checks.primaryServer = response.ok;
      console.log(`  ✅ Primary server (${this.config.baseUrl}): ${response.status}`);
    } catch (error) {
      console.log(`  ❌ Primary server (${this.config.baseUrl}): ${error.message}`);
    }
    
    // Check fallback server
    try {
      const response = await this.makeHealthCheck(this.config.fallbackUrl);
      checks.fallbackServer = response.ok;
      console.log(`  ✅ Fallback server (${this.config.fallbackUrl}): ${response.status}`);
    } catch (error) {
      console.log(`  ❌ Fallback server (${this.config.fallbackUrl}): ${error.message}`);
    }
    
    // Check database connectivity (if configured)
    if (this.config.databaseUrl) {
      try {
        const dbAnalyzer = new DatabasePerformanceAnalyzer();
        const connectionTest = await dbAnalyzer.testConnection();
        checks.database = connectionTest.success;
        console.log(`  ✅ Database: Connected to ${connectionTest.database}`);
        await dbAnalyzer.close();
      } catch (error) {
        console.log(`  ❌ Database: ${error.message}`);
      }
    } else {
      checks.database = true; // Skip if not configured
      console.log(`  ⚠️  Database: Not configured, skipping check`);
    }
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    checks.nodeVersion = majorVersion >= 14;
    console.log(`  ${checks.nodeVersion ? '✅' : '❌'} Node.js: ${nodeVersion}`);
    
    // Check system resources
    const memoryUsage = process.memoryUsage();
    const availableMemory = memoryUsage.heapTotal;
    checks.systemResources = availableMemory > 50 * 1024 * 1024; // At least 50MB
    console.log(`  ${checks.systemResources ? '✅' : '❌'} Memory: ${(availableMemory / 1024 / 1024).toFixed(2)}MB available`);
    
    const allPassed = Object.values(checks).every(check => check);
    console.log(`\n${allPassed ? '✅' : '❌'} Pre-flight checks: ${allPassed ? 'PASSED' : 'FAILED'}`);
    
    return { checks, allPassed };
  }

  async runBenchmarksParallel() {
    console.log('\n⚡ Running benchmarks in parallel...');
    
    const benchmarkPromises = [
      this.runConsensusBenchmarks(),
      this.runDatabaseBenchmarks(),
      this.runLoadTestBenchmarks()
    ];
    
    // Add resource monitoring
    const resourceMonitor = this.startResourceMonitoring();
    
    try {
      const [consensusResults, databaseResults, loadTestResults] = await Promise.all(benchmarkPromises);
      
      this.results.consensus = consensusResults;
      this.results.database = databaseResults;
      this.results.loadTest = loadTestResults;
      
    } finally {
      clearInterval(resourceMonitor);
    }
  }

  async runBenchmarksSequential() {
    console.log('\n🔄 Running benchmarks sequentially...');
    
    // Start resource monitoring
    const resourceMonitor = this.startResourceMonitoring();
    
    try {
      // 1. Consensus Performance Benchmarks
      console.log('\n1️⃣ Running Consensus Performance Benchmarks...');
      this.results.consensus = await this.runConsensusBenchmarks();
      
      // 2. Database Performance Analysis
      console.log('\n2️⃣ Running Database Performance Analysis...');
      this.results.database = await this.runDatabaseBenchmarks();
      
      // 3. Load Testing
      console.log('\n3️⃣ Running Load Testing Scenarios...');
      this.results.loadTest = await this.runLoadTestBenchmarks();
      
    } finally {
      clearInterval(resourceMonitor);
    }
  }

  async runConsensusBenchmarks() {
    try {
      const benchmarker = new ConsensusPerformanceBenchmarker({
        baseUrl: this.config.baseUrl,
        fallbackUrl: this.config.fallbackUrl
      });
      
      return await benchmarker.runComprehensiveBenchmarks();
    } catch (error) {
      console.error('❌ Consensus benchmarks failed:', error.message);
      return { error: error.message, timestamp: new Date().toISOString() };
    }
  }

  async runDatabaseBenchmarks() {
    try {
      if (!this.config.databaseUrl) {
        console.log('  ⚠️  Database benchmarks skipped (no database configured)');
        return { skipped: true, reason: 'No database configured' };
      }
      
      const analyzer = new DatabasePerformanceAnalyzer();
      const results = await analyzer.analyze();
      await analyzer.close();
      
      return results;
    } catch (error) {
      console.error('❌ Database benchmarks failed:', error.message);
      return { error: error.message, timestamp: new Date().toISOString() };
    }
  }

  async runLoadTestBenchmarks() {
    try {
      const loadTester = new DistributedLoadTestRunner({
        baseUrl: this.config.baseUrl
      });
      
      return await loadTester.runAllScenarios();
    } catch (error) {
      console.error('❌ Load test benchmarks failed:', error.message);
      return { error: error.message, timestamp: new Date().toISOString() };
    }
  }

  startResourceMonitoring() {
    const resourceUsage = [];
    this.results.resourceUsage = resourceUsage;
    
    return setInterval(() => {
      const usage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      resourceUsage.push({
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
    }, 5000);
  }

  async generateUnifiedReport() {
    console.log('\n📊 Generating unified performance report...');
    
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        duration: this.endTime - this.startTime,
        configuration: this.config,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      summary: this.generateExecutiveSummary(),
      results: this.results,
      analysis: this.generateCrossComponentAnalysis(),
      recommendations: this.generateUnifiedRecommendations(),
      compliance: this.validateOverallCompliance()
    };
    
    return report;
  }

  generateExecutiveSummary() {
    const summary = {
      overallRating: 'UNKNOWN',
      keyMetrics: {},
      criticalIssues: [],
      achievements: [],
      performanceScore: 0
    };
    
    // Collect key metrics from all components
    if (this.results.consensus && this.results.consensus.analysis) {
      const consensusAnalysis = this.results.consensus.analysis;
      if (consensusAnalysis.summary && consensusAnalysis.summary.keyMetrics) {
        summary.keyMetrics.apiResponseTime = consensusAnalysis.summary.keyMetrics.averageAPIResponseTime;
        summary.keyMetrics.apiSuccessRate = consensusAnalysis.summary.keyMetrics.apiSuccessRate;
      }
    }
    
    if (this.results.database && this.results.database.queryPerformance) {
      const dbQueries = Object.values(this.results.database.queryPerformance);
      if (dbQueries.length > 0) {
        const avgDbTime = dbQueries.reduce((sum, q) => sum + (q.averageTime || 0), 0) / dbQueries.length;
        summary.keyMetrics.databaseQueryTime = avgDbTime;
      }
    }
    
    if (this.results.loadTest && this.results.loadTest.summary) {
      summary.keyMetrics.maxThroughput = this.results.loadTest.summary.maxThroughputAchieved;
      summary.keyMetrics.loadTestSuccessRate = this.results.loadTest.summary.overallSuccessRate;
    }
    
    // Calculate performance score (0-100)
    let score = 100;
    
    // API response time penalty
    if (summary.keyMetrics.apiResponseTime > 200) {
      score -= Math.min(20, (summary.keyMetrics.apiResponseTime - 200) / 10);
    }
    
    // Database query time penalty
    if (summary.keyMetrics.databaseQueryTime > 100) {
      score -= Math.min(15, (summary.keyMetrics.databaseQueryTime - 100) / 20);
    }
    
    // Success rate penalty
    if (summary.keyMetrics.apiSuccessRate < 0.95) {
      score -= (0.95 - summary.keyMetrics.apiSuccessRate) * 100;
    }
    
    if (summary.keyMetrics.loadTestSuccessRate < 0.90) {
      score -= (0.90 - summary.keyMetrics.loadTestSuccessRate) * 50;
    }
    
    // Throughput bonus
    if (summary.keyMetrics.maxThroughput > 50) {
      score += Math.min(10, (summary.keyMetrics.maxThroughput - 50) / 5);
    }
    
    summary.performanceScore = Math.max(0, Math.min(100, score));
    
    // Determine overall rating
    if (summary.performanceScore >= 90) {
      summary.overallRating = 'EXCELLENT';
    } else if (summary.performanceScore >= 75) {
      summary.overallRating = 'GOOD';
    } else if (summary.performanceScore >= 60) {
      summary.overallRating = 'FAIR';
    } else {
      summary.overallRating = 'POOR';
    }
    
    // Identify critical issues
    if (summary.keyMetrics.apiResponseTime > 500) {
      summary.criticalIssues.push('API response times consistently above 500ms');
    }
    
    if (summary.keyMetrics.apiSuccessRate < 0.90) {
      summary.criticalIssues.push('API success rate below 90%');
    }
    
    if (summary.keyMetrics.maxThroughput < 20) {
      summary.criticalIssues.push('Maximum throughput below 20 req/s');
    }
    
    // Identify achievements
    if (summary.keyMetrics.apiResponseTime <= 200) {
      summary.achievements.push('API response times consistently under 200ms target');
    }
    
    if (summary.keyMetrics.databaseQueryTime <= 100) {
      summary.achievements.push('Database queries consistently under 100ms');
    }
    
    if (summary.keyMetrics.maxThroughput >= 50) {
      summary.achievements.push('Maximum throughput exceeds 50 req/s target');
    }
    
    return summary;
  }

  generateCrossComponentAnalysis() {
    const analysis = {
      correlations: [],
      bottlenecks: [],
      systemBehavior: {}
    };
    
    // Analyze correlations between components
    if (this.results.consensus && this.results.database) {
      const apiTimes = this.results.consensus.analysis?.summary?.keyMetrics?.averageAPIResponseTime || 0;
      const dbTimes = this.results.database.queryPerformance ? 
        Object.values(this.results.database.queryPerformance)
          .reduce((sum, q) => sum + (q.averageTime || 0), 0) / 
        Object.values(this.results.database.queryPerformance).length : 0;
      
      if (apiTimes > 0 && dbTimes > 0) {
        const correlation = dbTimes / apiTimes;
        analysis.correlations.push({
          type: 'API_DATABASE_CORRELATION',
          description: `Database queries account for ${(correlation * 100).toFixed(1)}% of API response time`,
          impact: correlation > 0.7 ? 'HIGH' : correlation > 0.4 ? 'MEDIUM' : 'LOW'
        });
      }
    }
    
    // Identify system bottlenecks
    const bottleneckSources = [];
    
    if (this.results.consensus?.analysis?.bottlenecks) {
      bottleneckSources.push(...this.results.consensus.analysis.bottlenecks);
    }
    
    if (this.results.database?.recommendations) {
      bottleneckSources.push(...this.results.database.recommendations
        .filter(r => r.priority === 'HIGH')
        .map(r => ({ type: 'DATABASE', ...r })));
    }
    
    if (this.results.loadTest?.recommendations) {
      bottleneckSources.push(...this.results.loadTest.recommendations
        .filter(r => r.priority === 'HIGH')
        .map(r => ({ type: 'LOAD_TEST', ...r })));
    }
    
    analysis.bottlenecks = bottleneckSources;
    
    return analysis;
  }

  generateUnifiedRecommendations() {
    const recommendations = [];
    
    // Collect recommendations from all components
    if (this.results.consensus?.recommendations) {
      recommendations.push(...this.results.consensus.recommendations.map(r => ({
        ...r,
        source: 'CONSENSUS_BENCHMARKS'
      })));
    }
    
    if (this.results.database?.recommendations) {
      recommendations.push(...this.results.database.recommendations.map(r => ({
        ...r,
        source: 'DATABASE_ANALYSIS'
      })));
    }
    
    if (this.results.loadTest?.recommendations) {
      recommendations.push(...this.results.loadTest.recommendations.map(r => ({
        ...r,
        source: 'LOAD_TESTING'
      })));
    }
    
    // Sort by priority and potential impact
    const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    recommendations.sort((a, b) => {
      return priorityOrder[b.priority || 'LOW'] - priorityOrder[a.priority || 'LOW'];
    });
    
    // Add cross-component recommendations
    const summary = this.generateExecutiveSummary();
    
    if (summary.performanceScore < 75) {
      recommendations.unshift({
        category: 'SYSTEM_OPTIMIZATION',
        priority: 'HIGH',
        title: 'Comprehensive Performance Optimization Required',
        description: `Overall performance score is ${summary.performanceScore.toFixed(1)}`,
        suggestion: 'Address database optimization, API response caching, and load balancing',
        source: 'UNIFIED_ANALYSIS'
      });
    }
    
    return recommendations;
  }

  validateOverallCompliance() {
    const targets = {
      apiResponseTime: 200, // ms
      databaseQueryTime: 100, // ms
      throughput: 50, // req/s
      successRate: 0.95
    };
    
    const compliance = {
      overall: 'UNKNOWN',
      details: {},
      score: 0
    };
    
    const summary = this.generateExecutiveSummary();
    let compliantCount = 0;
    let totalChecks = 0;
    
    // API Response Time
    if (summary.keyMetrics.apiResponseTime !== undefined) {
      const compliant = summary.keyMetrics.apiResponseTime <= targets.apiResponseTime;
      compliance.details.apiResponseTime = {
        actual: summary.keyMetrics.apiResponseTime,
        target: targets.apiResponseTime,
        compliant
      };
      if (compliant) compliantCount++;
      totalChecks++;
    }
    
    // Database Query Time
    if (summary.keyMetrics.databaseQueryTime !== undefined) {
      const compliant = summary.keyMetrics.databaseQueryTime <= targets.databaseQueryTime;
      compliance.details.databaseQueryTime = {
        actual: summary.keyMetrics.databaseQueryTime,
        target: targets.databaseQueryTime,
        compliant
      };
      if (compliant) compliantCount++;
      totalChecks++;
    }
    
    // Throughput
    if (summary.keyMetrics.maxThroughput !== undefined) {
      const compliant = summary.keyMetrics.maxThroughput >= targets.throughput;
      compliance.details.throughput = {
        actual: summary.keyMetrics.maxThroughput,
        target: targets.throughput,
        compliant
      };
      if (compliant) compliantCount++;
      totalChecks++;
    }
    
    // Success Rate
    if (summary.keyMetrics.apiSuccessRate !== undefined) {
      const compliant = summary.keyMetrics.apiSuccessRate >= targets.successRate;
      compliance.details.successRate = {
        actual: summary.keyMetrics.apiSuccessRate,
        target: targets.successRate,
        compliant
      };
      if (compliant) compliantCount++;
      totalChecks++;
    }
    
    // Calculate overall compliance
    if (totalChecks > 0) {
      compliance.score = compliantCount / totalChecks;
      
      if (compliance.score >= 0.9) {
        compliance.overall = 'EXCELLENT';
      } else if (compliance.score >= 0.75) {
        compliance.overall = 'GOOD';
      } else if (compliance.score >= 0.5) {
        compliance.overall = 'FAIR';
      } else {
        compliance.overall = 'POOR';
      }
    }
    
    return compliance;
  }

  async saveResults(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `comprehensive-performance-report-${timestamp}.json`;
    const filepath = path.join(this.config.outputDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    
    // Also save a summary report
    const summaryFilename = `performance-summary-${timestamp}.json`;
    const summaryFilepath = path.join(this.config.outputDir, summaryFilename);
    
    const summaryReport = {
      metadata: report.metadata,
      summary: report.summary,
      compliance: report.compliance,
      topRecommendations: report.recommendations.slice(0, 5)
    };
    
    await fs.writeFile(summaryFilepath, JSON.stringify(summaryReport, null, 2));
    
    console.log(`\n📄 Comprehensive report saved: ${filepath}`);
    console.log(`📄 Summary report saved: ${summaryFilepath}`);
    
    return { fullReport: filepath, summaryReport: summaryFilepath };
  }

  displaySummary(report) {
    console.log('\n' + '='.repeat(70));
    console.log('📊 COMPREHENSIVE PERFORMANCE BENCHMARK SUMMARY');
    console.log('='.repeat(70));
    
    const summary = report.summary;
    
    console.log(`\n🎯 Overall Rating: ${summary.overallRating}`);
    console.log(`📈 Performance Score: ${summary.performanceScore.toFixed(1)}/100`);
    console.log(`⏱️  Total Duration: ${(report.metadata.duration / 1000 / 60).toFixed(2)} minutes`);
    
    // Key Metrics
    console.log('\n📊 KEY METRICS:');
    if (summary.keyMetrics.apiResponseTime) {
      console.log(`   ⚡ API Response Time: ${summary.keyMetrics.apiResponseTime.toFixed(2)}ms`);
    }
    if (summary.keyMetrics.databaseQueryTime) {
      console.log(`   🗄️  Database Query Time: ${summary.keyMetrics.databaseQueryTime.toFixed(2)}ms`);
    }
    if (summary.keyMetrics.maxThroughput) {
      console.log(`   🚀 Max Throughput: ${summary.keyMetrics.maxThroughput.toFixed(2)} req/s`);
    }
    if (summary.keyMetrics.apiSuccessRate) {
      console.log(`   ✅ API Success Rate: ${(summary.keyMetrics.apiSuccessRate * 100).toFixed(1)}%`);
    }
    
    // Compliance
    if (report.compliance) {
      console.log(`\n🎯 COMPLIANCE: ${report.compliance.overall} (${(report.compliance.score * 100).toFixed(1)}%)`);
      
      for (const [metric, details] of Object.entries(report.compliance.details)) {
        const status = details.compliant ? '✅' : '❌';
        console.log(`   ${status} ${metric}: ${details.actual} (target: ${details.target})`);
      }
    }
    
    // Critical Issues
    if (summary.criticalIssues.length > 0) {
      console.log('\n⚠️  CRITICAL ISSUES:');
      summary.criticalIssues.forEach(issue => {
        console.log(`   🚨 ${issue}`);
      });
    }
    
    // Achievements
    if (summary.achievements.length > 0) {
      console.log('\n🏆 ACHIEVEMENTS:');
      summary.achievements.forEach(achievement => {
        console.log(`   ⭐ ${achievement}`);
      });
    }
    
    // Top Recommendations
    if (report.recommendations && report.recommendations.length > 0) {
      console.log('\n💡 TOP RECOMMENDATIONS:');
      report.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec.title} (${rec.priority})`);
        console.log(`      ${rec.description}`);
      });
    }
    
    console.log('\n' + '='.repeat(70));
  }

  async makeHealthCheck(url) {
    return new Promise((resolve, reject) => {
      const http = require('http');
      const https = require('https');
      
      const client = url.startsWith('https') ? https : http;
      const healthUrl = new URL('/health', url);
      
      const req = client.request(healthUrl, { timeout: 5000 }, (res) => {
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode });
      });
      
      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Health check timeout')));
      req.end();
    });
  }
}

// CLI Interface
if (require.main === module) {
  const config = {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
    fallbackUrl: process.env.API_FALLBACK_URL || 'http://localhost:3001',
    databaseUrl: process.env.DATABASE_URL,
    parallel: process.env.PARALLEL_EXECUTION !== 'false'
  };
  
  const suite = new ComprehensivePerformanceSuite(config);
  
  suite.runComprehensiveBenchmarks()
    .then(report => {
      if (report) {
        console.log('\n🎉 All performance benchmarks completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Performance benchmarks failed pre-flight checks.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Comprehensive performance benchmarking failed:', error);
      process.exit(1);
    });
}

module.exports = ComprehensivePerformanceSuite;