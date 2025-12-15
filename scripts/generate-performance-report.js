#!/usr/bin/env node

/**
 * Performance Report Generator
 * 
 * Generates comprehensive performance reports with visualizations
 * and actionable insights for the Claude AI response system.
 */

const fs = require('fs');
const path = require('path');

class PerformanceReportGenerator {
  constructor() {
    this.reportData = {
      metadata: {
        generated: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'test'
      },
      metrics: {},
      analysis: {},
      trends: {},
      recommendations: []
    };
  }

  async generate() {
    console.log('📊 Generating comprehensive performance report...');
    
    try {
      await this.collectMetrics();
      await this.analyzePerformance();
      await this.generateTrends();
      await this.createRecommendations();
      await this.exportReports();
      
      console.log('✅ Performance report generation completed');
      
    } catch (error) {
      console.error('💥 Report generation failed:', error);
      process.exit(1);
    }
  }

  async collectMetrics() {
    console.log('📈 Collecting performance metrics...');
    
    const metricsFiles = [
      'performance-results/response-times.json',
      'performance-results/memory-usage.json',
      'performance-results/cpu-usage.json',
      'performance-results/error-rates.json',
      'performance-results/throughput.json',
      'performance-results/claude-ai-metrics.json',
      'performance-results/sse-metrics.json'
    ];
    
    for (const file of metricsFiles) {
      if (fs.existsSync(file)) {
        try {
          const data = JSON.parse(fs.readFileSync(file, 'utf8'));
          const key = path.basename(file, '.json').replace('-', '_');
          this.reportData.metrics[key] = data;
        } catch (error) {
          console.warn(`⚠️  Failed to load ${file}:`, error.message);
        }
      }
    }
  }

  async analyzePerformance() {
    console.log('🔍 Analyzing performance data...');
    
    this.reportData.analysis = {
      responseTime: this.analyzeResponseTimes(),
      memoryUsage: this.analyzeMemoryUsage(),
      errorRates: this.analyzeErrorRates(),
      claudeAI: this.analyzeClaudeAIPerformance(),
      sse: this.analyzeSSEPerformance()
    };
  }

  analyzeResponseTimes() {
    const responseTimes = this.reportData.metrics.response_times || {};
    
    const analysis = {
      overview: {
        totalEndpoints: Object.keys(responseTimes).length,
        avgResponseTime: 0,
        slowestEndpoint: null,
        fastestEndpoint: null
      },
      distribution: {},
      alerts: []
    };
    
    let totalTime = 0;
    let slowestTime = 0;
    let fastestTime = Infinity;
    
    for (const [endpoint, metrics] of Object.entries(responseTimes)) {
      const avgTime = metrics.avg || 0;
      totalTime += avgTime;
      
      if (avgTime > slowestTime) {
        slowestTime = avgTime;
        analysis.overview.slowestEndpoint = { endpoint, time: avgTime };
      }
      
      if (avgTime < fastestTime) {
        fastestTime = avgTime;
        analysis.overview.fastestEndpoint = { endpoint, time: avgTime };
      }
      
      // Categorize response times
      if (avgTime < 100) {
        analysis.distribution.excellent = (analysis.distribution.excellent || 0) + 1;
      } else if (avgTime < 300) {
        analysis.distribution.good = (analysis.distribution.good || 0) + 1;
      } else if (avgTime < 1000) {
        analysis.distribution.acceptable = (analysis.distribution.acceptable || 0) + 1;
      } else {
        analysis.distribution.slow = (analysis.distribution.slow || 0) + 1;
        analysis.alerts.push({
          type: 'slow_response',
          endpoint,
          time: avgTime,
          severity: avgTime > 2000 ? 'critical' : 'warning'
        });
      }
    }
    
    analysis.overview.avgResponseTime = totalTime / Object.keys(responseTimes).length || 0;
    
    return analysis;
  }

  analyzeMemoryUsage() {
    const memoryData = this.reportData.metrics.memory_usage || {};
    
    return {
      peak: memoryData.peak || 0,
      average: memoryData.average || 0,
      growth: memoryData.growth || 0,
      leaks: this.detectMemoryLeaks(memoryData),
      efficiency: this.calculateMemoryEfficiency(memoryData)
    };
  }

  analyzeErrorRates() {
    const errorRates = this.reportData.metrics.error_rates || {};
    
    const analysis = {
      overall: 0,
      byEndpoint: {},
      trends: {},
      criticalEndpoints: []
    };
    
    let totalErrors = 0;
    let totalRequests = 0;
    
    for (const [endpoint, data] of Object.entries(errorRates)) {
      const errorRate = data.rate || 0;
      const requests = data.total_requests || 0;
      
      analysis.byEndpoint[endpoint] = errorRate;
      totalErrors += data.errors || 0;
      totalRequests += requests;
      
      if (errorRate > 0.05) { // 5% error rate threshold
        analysis.criticalEndpoints.push({
          endpoint,
          errorRate,
          severity: errorRate > 0.1 ? 'critical' : 'warning'
        });
      }
    }
    
    analysis.overall = totalRequests > 0 ? totalErrors / totalRequests : 0;
    
    return analysis;
  }

  analyzeClaudeAIPerformance() {
    const claudeMetrics = this.reportData.metrics.claude_ai_metrics || {};
    
    return {
      responseQuality: claudeMetrics.response_quality || 0,
      processingTime: claudeMetrics.processing_time || 0,
      tokenUsage: claudeMetrics.token_usage || {},
      successRate: claudeMetrics.success_rate || 0,
      instanceHealth: claudeMetrics.instance_health || {},
      recommendations: this.generateClaudeRecommendations(claudeMetrics)
    };
  }

  analyzeSSEPerformance() {
    const sseMetrics = this.reportData.metrics.sse_metrics || {};
    
    return {
      connectionStability: sseMetrics.connection_stability || 0,
      reconnectionRate: sseMetrics.reconnection_rate || 0,
      messageDelivery: sseMetrics.message_delivery_rate || 0,
      latency: sseMetrics.message_latency || 0,
      issues: this.identifySSEIssues(sseMetrics)
    };
  }

  detectMemoryLeaks(memoryData) {
    // Simple memory leak detection based on growth patterns
    const leaks = [];
    
    if (memoryData.growth && memoryData.growth > 0.1) { // 10% growth threshold
      leaks.push({
        type: 'continuous_growth',
        rate: memoryData.growth,
        severity: memoryData.growth > 0.5 ? 'critical' : 'warning'
      });
    }
    
    return leaks;
  }

  calculateMemoryEfficiency(memoryData) {
    // Calculate memory efficiency score (0-100)
    const baselineMemory = 50 * 1024 * 1024; // 50MB baseline
    const currentMemory = memoryData.average || baselineMemory;
    
    return Math.max(0, Math.min(100, 100 - ((currentMemory - baselineMemory) / baselineMemory) * 100));
  }

  generateClaudeRecommendations(claudeMetrics) {
    const recommendations = [];
    
    if (claudeMetrics.token_usage && claudeMetrics.token_usage.efficiency < 0.8) {
      recommendations.push({
        type: 'token_optimization',
        message: 'Consider optimizing prompts to reduce token usage',
        priority: 'medium'
      });
    }
    
    if (claudeMetrics.processing_time > 2000) {
      recommendations.push({
        type: 'processing_optimization',
        message: 'Claude processing time is high, review request patterns',
        priority: 'high'
      });
    }
    
    return recommendations;
  }

  identifySSEIssues(sseMetrics) {
    const issues = [];
    
    if (sseMetrics.connection_stability < 0.95) {
      issues.push({
        type: 'connection_instability',
        value: sseMetrics.connection_stability,
        severity: 'warning'
      });
    }
    
    if (sseMetrics.message_latency > 1000) {
      issues.push({
        type: 'high_latency',
        value: sseMetrics.message_latency,
        severity: 'medium'
      });
    }
    
    return issues;
  }

  async generateTrends() {
    console.log('📈 Analyzing performance trends...');
    
    // Load historical data if available
    const historicalData = this.loadHistoricalData();
    
    this.reportData.trends = {
      responseTime: this.calculateTrend(historicalData, 'response_time'),
      memoryUsage: this.calculateTrend(historicalData, 'memory_usage'),
      errorRate: this.calculateTrend(historicalData, 'error_rate'),
      throughput: this.calculateTrend(historicalData, 'throughput')
    };
  }

  loadHistoricalData() {
    const historicalFile = 'performance-history.json';
    
    if (fs.existsSync(historicalFile)) {
      try {
        return JSON.parse(fs.readFileSync(historicalFile, 'utf8'));
      } catch (error) {
        console.warn('⚠️  Failed to load historical data:', error.message);
      }
    }
    
    return [];
  }

  calculateTrend(historicalData, metric) {
    if (!historicalData || historicalData.length < 2) {
      return { direction: 'stable', change: 0 };
    }
    
    const recent = historicalData.slice(-5); // Last 5 data points
    const values = recent.map(d => d[metric]).filter(v => v !== undefined);
    
    if (values.length < 2) {
      return { direction: 'stable', change: 0 };
    }
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;
    
    let direction = 'stable';
    if (change > 5) direction = 'increasing';
    if (change < -5) direction = 'decreasing';
    
    return { direction, change: Math.round(change * 100) / 100 };
  }

  async createRecommendations() {
    console.log('💡 Generating recommendations...');
    
    const recommendations = [];
    
    // Response time recommendations
    const responseAnalysis = this.reportData.analysis.responseTime;
    if (responseAnalysis.alerts.length > 0) {
      recommendations.push({
        category: 'Response Time',
        priority: 'high',
        issue: `${responseAnalysis.alerts.length} endpoints have slow response times`,
        recommendation: 'Implement caching, optimize database queries, or add load balancing',
        endpoints: responseAnalysis.alerts.map(a => a.endpoint)
      });
    }
    
    // Memory usage recommendations
    const memoryAnalysis = this.reportData.analysis.memoryUsage;
    if (memoryAnalysis.leaks.length > 0) {
      recommendations.push({
        category: 'Memory Usage',
        priority: 'medium',
        issue: 'Potential memory leaks detected',
        recommendation: 'Review object lifecycle, implement proper cleanup, check for circular references'
      });
    }
    
    // Error rate recommendations
    const errorAnalysis = this.reportData.analysis.errorRates;
    if (errorAnalysis.criticalEndpoints.length > 0) {
      recommendations.push({
        category: 'Error Handling',
        priority: 'critical',
        issue: `${errorAnalysis.criticalEndpoints.length} endpoints have high error rates`,
        recommendation: 'Review error handling, implement retries, check input validation',
        endpoints: errorAnalysis.criticalEndpoints.map(e => e.endpoint)
      });
    }
    
    // Claude AI specific recommendations
    const claudeAnalysis = this.reportData.analysis.claudeAI;
    recommendations.push(...claudeAnalysis.recommendations);
    
    this.reportData.recommendations = recommendations;
  }

  async exportReports() {
    console.log('📄 Exporting performance reports...');
    
    // Ensure reports directory exists
    if (!fs.existsSync('performance-reports')) {
      fs.mkdirSync('performance-reports', { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // JSON report
    const jsonFile = `performance-reports/performance-report-${timestamp}.json`;
    fs.writeFileSync(jsonFile, JSON.stringify(this.reportData, null, 2));
    
    // HTML report
    const htmlFile = `performance-reports/performance-report-${timestamp}.html`;
    fs.writeFileSync(htmlFile, this.generateHTMLReport());
    
    // Markdown summary
    const mdFile = `performance-reports/performance-summary-${timestamp}.md`;
    fs.writeFileSync(mdFile, this.generateMarkdownSummary());
    
    // Update latest links
    if (fs.existsSync(jsonFile)) {
      try {
        if (fs.existsSync('performance-reports/latest.json')) {
          fs.unlinkSync('performance-reports/latest.json');
        }
        fs.symlinkSync(path.basename(jsonFile), 'performance-reports/latest.json');
      } catch (error) {
        // Fallback: copy file
        fs.copyFileSync(jsonFile, 'performance-reports/latest.json');
      }
    }
    
    console.log(`📊 Reports generated:
    - JSON: ${jsonFile}
    - HTML: ${htmlFile}
    - Markdown: ${mdFile}`);
  }

  generateHTMLReport() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Claude AI Performance Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .metric-card { background: white; border: 1px solid #e9ecef; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .alert { padding: 12px; border-radius: 4px; margin: 10px 0; }
        .alert-warning { background: #fff3cd; border: 1px solid #ffeaa7; }
        .alert-critical { background: #f8d7da; border: 1px solid #f5c6cb; }
        .recommendations { background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; }
        .chart-placeholder { background: #f8f9fa; height: 200px; display: flex; align-items: center; justify-content: center; border-radius: 4px; color: #6c757d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🤖 Claude AI Performance Report</h1>
        <p><strong>Generated:</strong> ${this.reportData.metadata.generated}</p>
        <p><strong>Environment:</strong> ${this.reportData.metadata.environment}</p>
    </div>

    <div class="metric-card">
        <h2>📊 Performance Overview</h2>
        <div class="chart-placeholder">Performance metrics visualization would appear here</div>
    </div>

    <div class="metric-card">
        <h2>⏱️ Response Times</h2>
        <p><strong>Average:</strong> ${Math.round(this.reportData.analysis.responseTime?.overview?.avgResponseTime || 0)}ms</p>
        <p><strong>Slowest Endpoint:</strong> ${this.reportData.analysis.responseTime?.overview?.slowestEndpoint?.endpoint || 'N/A'}</p>
        ${this.reportData.analysis.responseTime?.alerts?.map(alert => 
          `<div class="alert alert-${alert.severity}">${alert.endpoint}: ${alert.time}ms</div>`
        ).join('') || ''}
    </div>

    <div class="metric-card">
        <h2>💾 Memory Usage</h2>
        <p><strong>Peak:</strong> ${Math.round((this.reportData.analysis.memoryUsage?.peak || 0) / 1024 / 1024)}MB</p>
        <p><strong>Average:</strong> ${Math.round((this.reportData.analysis.memoryUsage?.average || 0) / 1024 / 1024)}MB</p>
        <p><strong>Efficiency Score:</strong> ${this.reportData.analysis.memoryUsage?.efficiency || 0}%</p>
    </div>

    <div class="metric-card">
        <h2>🤖 Claude AI Performance</h2>
        <p><strong>Success Rate:</strong> ${((this.reportData.analysis.claudeAI?.successRate || 0) * 100).toFixed(1)}%</p>
        <p><strong>Processing Time:</strong> ${this.reportData.analysis.claudeAI?.processingTime || 0}ms</p>
    </div>

    ${this.reportData.recommendations.length > 0 ? `
    <div class="recommendations">
        <h2>💡 Recommendations</h2>
        <ul>
        ${this.reportData.recommendations.map(rec => 
          `<li><strong>${rec.category}</strong>: ${rec.recommendation}</li>`
        ).join('')}
        </ul>
    </div>
    ` : ''}

    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e9ecef; color: #6c757d;">
        <p>Generated by Claude AI Performance Monitoring System</p>
    </footer>
</body>
</html>`;
  }

  generateMarkdownSummary() {
    return `# Claude AI Performance Report

**Generated:** ${this.reportData.metadata.generated}
**Environment:** ${this.reportData.metadata.environment}

## 📊 Performance Summary

### Response Times
- **Average Response Time:** ${Math.round(this.reportData.analysis.responseTime?.overview?.avgResponseTime || 0)}ms
- **Slowest Endpoint:** ${this.reportData.analysis.responseTime?.overview?.slowestEndpoint?.endpoint || 'N/A'}
- **Alerts:** ${this.reportData.analysis.responseTime?.alerts?.length || 0}

### Memory Usage
- **Peak Memory:** ${Math.round((this.reportData.analysis.memoryUsage?.peak || 0) / 1024 / 1024)}MB
- **Average Memory:** ${Math.round((this.reportData.analysis.memoryUsage?.average || 0) / 1024 / 1024)}MB
- **Efficiency Score:** ${this.reportData.analysis.memoryUsage?.efficiency || 0}%

### Claude AI Metrics
- **Success Rate:** ${((this.reportData.analysis.claudeAI?.successRate || 0) * 100).toFixed(1)}%
- **Processing Time:** ${this.reportData.analysis.claudeAI?.processingTime || 0}ms

### Error Rates
- **Overall Error Rate:** ${((this.reportData.analysis.errorRates?.overall || 0) * 100).toFixed(2)}%
- **Critical Endpoints:** ${this.reportData.analysis.errorRates?.criticalEndpoints?.length || 0}

## 💡 Recommendations

${this.reportData.recommendations.map(rec => `
### ${rec.category} (Priority: ${rec.priority})
**Issue:** ${rec.issue}
**Recommendation:** ${rec.recommendation}
${rec.endpoints ? `**Affected Endpoints:** ${rec.endpoints.join(', ')}` : ''}
`).join('')}

## 📈 Trends

${Object.entries(this.reportData.trends).map(([metric, trend]) => `
- **${metric.replace('_', ' ').toUpperCase()}:** ${trend.direction} (${trend.change > 0 ? '+' : ''}${trend.change}%)
`).join('')}

---
*Generated by Claude AI Performance Monitoring System*`;
  }
}

// Run report generation if called directly
if (require.main === module) {
  const generator = new PerformanceReportGenerator();
  generator.generate();
}

module.exports = PerformanceReportGenerator;