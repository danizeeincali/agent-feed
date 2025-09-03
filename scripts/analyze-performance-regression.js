#!/usr/bin/env node

/**
 * Performance Regression Analysis Script
 * 
 * Analyzes performance metrics between current run and historical baselines
 * to detect regressions in Claude AI response system performance.
 */

const fs = require('fs');
const path = require('path');

class PerformanceRegressionAnalyzer {
  constructor() {
    this.thresholds = {
      responseTime: 1.3, // 30% increase is a regression
      memoryUsage: 1.5,  // 50% increase is a regression
      errorRate: 2.0,    // Double error rate is a regression
      throughput: 0.7    // 30% decrease is a regression
    };
    
    this.criticalEndpoints = [
      '/claude/query',
      '/claude/stream',
      '/sse/connect',
      '/health'
    ];
    
    this.results = {
      regressions: [],
      improvements: [],
      warnings: [],
      summary: {}
    };
  }

  async analyze() {
    console.log('🔍 Starting performance regression analysis...');
    
    try {
      const currentMetrics = await this.loadCurrentMetrics();
      const baselineMetrics = await this.loadBaselineMetrics();
      
      if (!baselineMetrics) {
        console.log('⚠️  No baseline metrics found, creating baseline from current run');
        await this.createBaseline(currentMetrics);
        return;
      }
      
      console.log('📊 Comparing current metrics against baseline...');
      
      this.analyzeResponseTimes(currentMetrics, baselineMetrics);
      this.analyzeMemoryUsage(currentMetrics, baselineMetrics);
      this.analyzeErrorRates(currentMetrics, baselineMetrics);
      this.analyzeThroughput(currentMetrics, baselineMetrics);
      this.analyzeClaudeSpecificMetrics(currentMetrics, baselineMetrics);
      
      await this.generateReport();
      
      if (this.results.regressions.length > 0) {
        console.log('❌ Performance regressions detected!');
        this.createRegressionFlag();
        process.exit(1);
      } else {
        console.log('✅ No performance regressions detected');
      }
      
    } catch (error) {
      console.error('💥 Analysis failed:', error);
      process.exit(1);
    }
  }

  async loadCurrentMetrics() {
    const metricsFiles = [
      'performance-results/response-times.json',
      'performance-results/memory-usage.json',
      'performance-results/error-rates.json',
      'performance-results/throughput.json',
      'performance-results/claude-ai-metrics.json'
    ];
    
    const metrics = {};
    
    for (const file of metricsFiles) {
      if (fs.existsSync(file)) {
        try {
          const data = JSON.parse(fs.readFileSync(file, 'utf8'));
          const key = path.basename(file, '.json').replace('-', '_');
          metrics[key] = data;
        } catch (error) {
          console.warn(`⚠️  Failed to load ${file}:`, error.message);
        }
      }
    }
    
    return metrics;
  }

  async loadBaselineMetrics() {
    const baselineFile = 'performance-baseline.json';
    
    if (!fs.existsSync(baselineFile)) {
      return null;
    }
    
    try {
      return JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
    } catch (error) {
      console.warn('⚠️  Failed to load baseline metrics:', error.message);
      return null;
    }
  }

  async createBaseline(metrics) {
    fs.writeFileSync('performance-baseline.json', JSON.stringify(metrics, null, 2));
    console.log('📝 Baseline metrics saved');
  }

  analyzeResponseTimes(current, baseline) {
    console.log('⏱️  Analyzing response times...');
    
    if (!current.response_times || !baseline.response_times) {
      console.warn('⚠️  Response time data missing');
      return;
    }
    
    for (const endpoint of this.criticalEndpoints) {
      const currentTime = current.response_times[endpoint];
      const baselineTime = baseline.response_times[endpoint];
      
      if (!currentTime || !baselineTime) continue;
      
      const ratio = currentTime.avg / baselineTime.avg;
      
      if (ratio > this.thresholds.responseTime) {
        this.results.regressions.push({
          type: 'response_time',
          endpoint,
          current: currentTime.avg,
          baseline: baselineTime.avg,
          ratio,
          severity: ratio > 2.0 ? 'critical' : 'high'
        });
      } else if (ratio < 0.8) {
        this.results.improvements.push({
          type: 'response_time',
          endpoint,
          improvement: (1 - ratio) * 100
        });
      }
    }
  }

  analyzeMemoryUsage(current, baseline) {
    console.log('💾 Analyzing memory usage...');
    
    if (!current.memory_usage || !baseline.memory_usage) {
      console.warn('⚠️  Memory usage data missing');
      return;
    }
    
    const currentMem = current.memory_usage.peak;
    const baselineMem = baseline.memory_usage.peak;
    const ratio = currentMem / baselineMem;
    
    if (ratio > this.thresholds.memoryUsage) {
      this.results.regressions.push({
        type: 'memory_usage',
        current: currentMem,
        baseline: baselineMem,
        ratio,
        severity: ratio > 2.0 ? 'critical' : 'medium'
      });
    }
  }

  analyzeErrorRates(current, baseline) {
    console.log('🚨 Analyzing error rates...');
    
    if (!current.error_rates || !baseline.error_rates) {
      console.warn('⚠️  Error rate data missing');
      return;
    }
    
    for (const endpoint of this.criticalEndpoints) {
      const currentRate = current.error_rates[endpoint] || 0;
      const baselineRate = baseline.error_rates[endpoint] || 0;
      
      if (baselineRate === 0 && currentRate > 0) {
        this.results.regressions.push({
          type: 'error_rate',
          endpoint,
          current: currentRate,
          baseline: baselineRate,
          severity: 'high'
        });
      } else if (baselineRate > 0) {
        const ratio = currentRate / baselineRate;
        if (ratio > this.thresholds.errorRate) {
          this.results.regressions.push({
            type: 'error_rate',
            endpoint,
            current: currentRate,
            baseline: baselineRate,
            ratio,
            severity: 'high'
          });
        }
      }
    }
  }

  analyzeThroughput(current, baseline) {
    console.log('📈 Analyzing throughput...');
    
    if (!current.throughput || !baseline.throughput) {
      console.warn('⚠️  Throughput data missing');
      return;
    }
    
    const currentThroughput = current.throughput.requests_per_second;
    const baselineThroughput = baseline.throughput.requests_per_second;
    const ratio = currentThroughput / baselineThroughput;
    
    if (ratio < this.thresholds.throughput) {
      this.results.regressions.push({
        type: 'throughput',
        current: currentThroughput,
        baseline: baselineThroughput,
        ratio,
        severity: ratio < 0.5 ? 'critical' : 'medium'
      });
    }
  }

  analyzeClaudeSpecificMetrics(current, baseline) {
    console.log('🤖 Analyzing Claude AI specific metrics...');
    
    if (!current.claude_ai_metrics || !baseline.claude_ai_metrics) {
      console.warn('⚠️  Claude AI metrics data missing');
      return;
    }
    
    const currentMetrics = current.claude_ai_metrics;
    const baselineMetrics = baseline.claude_ai_metrics;
    
    // Check SSE connection stability
    if (currentMetrics.sse_disconnection_rate > baselineMetrics.sse_disconnection_rate * 2) {
      this.results.regressions.push({
        type: 'sse_stability',
        current: currentMetrics.sse_disconnection_rate,
        baseline: baselineMetrics.sse_disconnection_rate,
        severity: 'high'
      });
    }
    
    // Check Claude response processing time
    if (currentMetrics.claude_processing_time > baselineMetrics.claude_processing_time * 1.5) {
      this.results.regressions.push({
        type: 'claude_processing',
        current: currentMetrics.claude_processing_time,
        baseline: baselineMetrics.claude_processing_time,
        severity: 'medium'
      });
    }
    
    // Check token usage efficiency
    if (currentMetrics.tokens_per_request > baselineMetrics.tokens_per_request * 1.2) {
      this.results.warnings.push({
        type: 'token_efficiency',
        current: currentMetrics.tokens_per_request,
        baseline: baselineMetrics.tokens_per_request,
        message: 'Token usage has increased, check for prompt optimization opportunities'
      });
    }
  }

  async generateReport() {
    console.log('📊 Generating performance report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_regressions: this.results.regressions.length,
        critical_regressions: this.results.regressions.filter(r => r.severity === 'critical').length,
        improvements: this.results.improvements.length,
        warnings: this.results.warnings.length
      },
      regressions: this.results.regressions,
      improvements: this.results.improvements,
      warnings: this.results.warnings,
      recommendations: this.generateRecommendations()
    };
    
    // Ensure reports directory exists
    if (!fs.existsSync('performance-reports')) {
      fs.mkdirSync('performance-reports', { recursive: true });
    }
    
    const reportFile = `performance-reports/regression-analysis-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`📝 Report saved to ${reportFile}`);
    
    // Create summary for CI
    this.createSummary(report);
    
    this.results.summary = report.summary;
  }

  generateRecommendations() {
    const recommendations = [];
    
    const responseTimeRegressions = this.results.regressions.filter(r => r.type === 'response_time');
    if (responseTimeRegressions.length > 0) {
      recommendations.push({
        category: 'Response Time',
        suggestion: 'Consider optimizing database queries, adding caching, or reviewing Claude API call patterns',
        priority: 'high'
      });
    }
    
    const memoryRegressions = this.results.regressions.filter(r => r.type === 'memory_usage');
    if (memoryRegressions.length > 0) {
      recommendations.push({
        category: 'Memory Usage',
        suggestion: 'Check for memory leaks, optimize data structures, or implement garbage collection improvements',
        priority: 'medium'
      });
    }
    
    const sseIssues = this.results.regressions.filter(r => r.type === 'sse_stability');
    if (sseIssues.length > 0) {
      recommendations.push({
        category: 'SSE Stability',
        suggestion: 'Review SSE connection handling, implement better reconnection logic, or check network timeout settings',
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  createSummary(report) {
    const summaryText = `# Performance Analysis Summary

## Overview
- **Total Regressions**: ${report.summary.total_regressions}
- **Critical Issues**: ${report.summary.critical_regressions}
- **Improvements**: ${report.summary.improvements}
- **Warnings**: ${report.summary.warnings}

## Status
${report.summary.total_regressions === 0 ? '✅ No performance regressions detected' : '❌ Performance regressions found'}

## Details
${this.results.regressions.map(r => `- **${r.type}**: ${r.endpoint || 'System'} (${(r.ratio * 100 - 100).toFixed(1)}% regression)`).join('\n')}

Generated: ${new Date().toLocaleString()}
`;

    fs.writeFileSync('performance-summary.md', summaryText);
  }

  createRegressionFlag() {
    fs.writeFileSync('performance-regression-detected.flag', JSON.stringify({
      detected: true,
      timestamp: new Date().toISOString(),
      count: this.results.regressions.length
    }));
  }
}

// Run analysis if called directly
if (require.main === module) {
  const analyzer = new PerformanceRegressionAnalyzer();
  analyzer.analyze();
}

module.exports = PerformanceRegressionAnalyzer;