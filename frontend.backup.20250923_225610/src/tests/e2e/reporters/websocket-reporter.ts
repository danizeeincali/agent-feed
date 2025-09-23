/**
 * Custom WebSocket Test Reporter
 * Specialized reporter for WebSocket Hub E2E test metrics and analysis
 */

import { Reporter, FullConfig, Suite, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import fs from 'fs/promises';
import path from 'path';

interface WebSocketTestMetrics {
  connectionTime?: number;
  messageLatency?: number[];
  throughput?: number;
  errorRate?: number;
  reconnectionCount?: number;
  totalMessages?: number;
  successfulMessages?: number;
  failedMessages?: number;
}

interface TestCaseWithMetrics extends TestCase {
  webSocketMetrics?: WebSocketTestMetrics;
}

class WebSocketReporter implements Reporter {
  private config!: FullConfig;
  private suite!: Suite;
  private results: Map<string, TestResult> = new Map();
  private startTime!: number;
  private metrics: Map<string, WebSocketTestMetrics> = new Map();

  onBegin(config: FullConfig, suite: Suite) {
    this.config = config;
    this.suite = suite;
    this.startTime = Date.now();
    
    console.log('\n🔌 WebSocket Hub E2E Test Reporter Started');
    console.log(`📊 Running ${suite.allTests().length} WebSocket tests`);
    console.log(`⚙️ Configuration: ${config.projects.length} project(s)\n`);
  }

  onTestBegin(test: TestCase) {
    const projectName = test.parent.project()?.name || 'default';
    console.log(`🚀 Starting: ${test.title} [${projectName}]`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.results.set(test.id, result);
    
    const projectName = test.parent.project()?.name || 'default';
    const status = this.getStatusIcon(result.status);
    const duration = result.duration;
    
    console.log(`${status} Finished: ${test.title} [${projectName}] (${duration}ms)`);
    
    // Extract WebSocket metrics from test attachments or stdout
    this.extractWebSocketMetrics(test, result);
    
    if (result.status === 'failed') {
      console.log(`   ❌ Error: ${result.error?.message || 'Unknown error'}`);
      
      // Log WebSocket specific errors
      if (result.error?.message?.includes('WebSocket')) {
        console.log(`   🔌 WebSocket Error Details: ${result.error.message}`);
      }
    }
    
    // Log performance metrics if available
    const metrics = this.metrics.get(test.id);
    if (metrics) {
      this.logTestMetrics(test.title, metrics);
    }
  }

  onStdOut(chunk: Buffer, test?: TestCase) {
    // Extract metrics from stdout
    const output = chunk.toString();
    
    if (test && output.includes('WEBSOCKET_METRICS:')) {
      try {
        const metricsMatch = output.match(/WEBSOCKET_METRICS:\s*(\{.*\})/);
        if (metricsMatch) {
          const metrics = JSON.parse(metricsMatch[1]);
          this.metrics.set(test.id, { ...this.metrics.get(test.id), ...metrics });
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }
  }

  onStdErr(chunk: Buffer, test?: TestCase) {
    const error = chunk.toString();
    
    if (error.includes('WebSocket') || error.includes('Connection')) {
      console.log(`🔌 WebSocket Error: ${error.trim()}`);
    }
  }

  async onEnd(result: FullResult) {
    const duration = Date.now() - this.startTime;
    const totalTests = this.results.size;
    const passedTests = Array.from(this.results.values()).filter(r => r.status === 'passed').length;
    const failedTests = Array.from(this.results.values()).filter(r => r.status === 'failed').length;
    const skippedTests = Array.from(this.results.values()).filter(r => r.status === 'skipped').length;
    
    console.log('\n📈 WebSocket Hub E2E Test Summary');
    console.log('═══════════════════════════════════════');
    console.log(`⏱️  Total Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏭️  Skipped: ${skippedTests}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    // Generate comprehensive metrics report
    await this.generateMetricsReport(result, duration);
    
    // Generate performance analysis
    await this.generatePerformanceAnalysis();
    
    // Generate recommendations
    await this.generateRecommendations();
    
    console.log('\n🎯 WebSocket Hub E2E Test Reporter Complete\n');
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      case 'timedOut': return '⏰';
      default: return '❓';
    }
  }

  private extractWebSocketMetrics(test: TestCase, result: TestResult) {
    // Extract metrics from test attachments
    const metrics: WebSocketTestMetrics = {};
    
    // Look for performance attachments
    result.attachments.forEach(attachment => {
      if (attachment.name.includes('performance') || attachment.name.includes('metrics')) {
        try {
          if (attachment.body) {
            const data = JSON.parse(attachment.body.toString());
            Object.assign(metrics, data);
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
    });
    
    // Extract from stdout/stderr
    if (result.stdout) {
      result.stdout.forEach(output => {
        if (output.includes('Connection Time:')) {
          const match = output.match(/Connection Time:\s*(\d+\.?\d*)ms/);
          if (match) metrics.connectionTime = parseFloat(match[1]);
        }
        
        if (output.includes('Throughput:')) {
          const match = output.match(/Throughput:\s*(\d+\.?\d*)\s*msg\/sec/);
          if (match) metrics.throughput = parseFloat(match[1]);
        }
        
        if (output.includes('Error Rate:')) {
          const match = output.match(/Error Rate:\s*(\d+\.?\d*)%/);
          if (match) metrics.errorRate = parseFloat(match[1]) / 100;
        }
      });
    }
    
    if (Object.keys(metrics).length > 0) {
      this.metrics.set(test.id, metrics);
    }
  }

  private logTestMetrics(testTitle: string, metrics: WebSocketTestMetrics) {
    console.log(`   📊 Metrics for "${testTitle}":`);
    
    if (metrics.connectionTime) {
      console.log(`   🔗 Connection Time: ${metrics.connectionTime.toFixed(2)}ms`);
    }
    
    if (metrics.messageLatency && metrics.messageLatency.length > 0) {
      const avgLatency = metrics.messageLatency.reduce((sum, lat) => sum + lat, 0) / metrics.messageLatency.length;
      console.log(`   ⚡ Avg Message Latency: ${avgLatency.toFixed(2)}ms`);
    }
    
    if (metrics.throughput) {
      console.log(`   🚀 Throughput: ${metrics.throughput.toFixed(2)} msg/sec`);
    }
    
    if (metrics.errorRate !== undefined) {
      console.log(`   ⚠️  Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
    }
    
    if (metrics.totalMessages) {
      console.log(`   📨 Total Messages: ${metrics.totalMessages}`);
    }
    
    if (metrics.successfulMessages && metrics.totalMessages) {
      const successRate = (metrics.successfulMessages / metrics.totalMessages) * 100;
      console.log(`   ✅ Success Rate: ${successRate.toFixed(1)}%`);
    }
  }

  private async generateMetricsReport(result: FullResult, duration: number) {
    const reportDir = path.join(process.cwd(), 'test-results', 'websocket-hub-e2e');
    const reportPath = path.join(reportDir, 'metrics-report.json');
    
    const allMetrics = Array.from(this.metrics.entries()).map(([testId, metrics]) => {
      const test = this.findTestById(testId);
      const result = this.results.get(testId);
      
      return {
        testId,
        testTitle: test?.title || 'Unknown',
        projectName: test?.parent.project()?.name || 'default',
        status: result?.status || 'unknown',
        duration: result?.duration || 0,
        metrics
      };
    });
    
    const report = {
      summary: {
        timestamp: new Date().toISOString(),
        totalDuration: duration,
        totalTests: this.results.size,
        environment: process.env.NODE_ENV || 'test'
      },
      aggregateMetrics: this.calculateAggregateMetrics(),
      testResults: allMetrics,
      performanceThresholds: {
        maxConnectionTime: 5000,
        maxLatency: 1000,
        minThroughput: 10,
        maxErrorRate: 0.05
      },
      recommendations: this.generateBasicRecommendations()
    };
    
    try {
      await fs.mkdir(reportDir, { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Metrics report generated: ${reportPath}`);
    } catch (error) {
      console.error('Failed to generate metrics report:', error);
    }
  }

  private calculateAggregateMetrics() {
    const allMetrics = Array.from(this.metrics.values());
    
    if (allMetrics.length === 0) {
      return null;
    }
    
    const connectionTimes = allMetrics.map(m => m.connectionTime).filter(Boolean) as number[];
    const throughputs = allMetrics.map(m => m.throughput).filter(Boolean) as number[];
    const errorRates = allMetrics.map(m => m.errorRate).filter(Boolean) as number[];
    const latencies = allMetrics.flatMap(m => m.messageLatency || []);
    
    return {
      connectionTime: {
        avg: connectionTimes.reduce((sum, time) => sum + time, 0) / connectionTimes.length,
        min: Math.min(...connectionTimes),
        max: Math.max(...connectionTimes),
        count: connectionTimes.length
      },
      throughput: {
        avg: throughputs.reduce((sum, tp) => sum + tp, 0) / throughputs.length,
        min: Math.min(...throughputs),
        max: Math.max(...throughputs),
        count: throughputs.length
      },
      errorRate: {
        avg: errorRates.reduce((sum, rate) => sum + rate, 0) / errorRates.length,
        min: Math.min(...errorRates),
        max: Math.max(...errorRates),
        count: errorRates.length
      },
      messageLatency: latencies.length > 0 ? {
        avg: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
        min: Math.min(...latencies),
        max: Math.max(...latencies),
        p95: latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)],
        count: latencies.length
      } : null
    };
  }

  private async generatePerformanceAnalysis() {
    const analysisDir = path.join(process.cwd(), 'test-results', 'websocket-hub-e2e');
    const analysisPath = path.join(analysisDir, 'performance-analysis.md');
    
    const aggregateMetrics = this.calculateAggregateMetrics();
    
    if (!aggregateMetrics) {
      return;
    }
    
    const analysis = `# WebSocket Hub Performance Analysis

## Executive Summary
Generated on: ${new Date().toISOString()}

## Connection Performance
- **Average Connection Time**: ${aggregateMetrics.connectionTime?.avg.toFixed(2)}ms
- **Fastest Connection**: ${aggregateMetrics.connectionTime?.min.toFixed(2)}ms
- **Slowest Connection**: ${aggregateMetrics.connectionTime?.max.toFixed(2)}ms

## Message Throughput
- **Average Throughput**: ${aggregateMetrics.throughput?.avg.toFixed(2)} msg/sec
- **Peak Throughput**: ${aggregateMetrics.throughput?.max.toFixed(2)} msg/sec
- **Minimum Throughput**: ${aggregateMetrics.throughput?.min.toFixed(2)} msg/sec

## Message Latency
${aggregateMetrics.messageLatency ? `
- **Average Latency**: ${aggregateMetrics.messageLatency.avg.toFixed(2)}ms
- **95th Percentile**: ${aggregateMetrics.messageLatency.p95.toFixed(2)}ms
- **Maximum Latency**: ${aggregateMetrics.messageLatency.max.toFixed(2)}ms
` : '- No latency data available'}

## Error Rates
- **Average Error Rate**: ${(aggregateMetrics.errorRate?.avg * 100).toFixed(2)}%
- **Maximum Error Rate**: ${(aggregateMetrics.errorRate?.max * 100).toFixed(2)}%

## Performance Assessment
${this.generatePerformanceAssessment(aggregateMetrics)}

## Recommendations
${this.generatePerformanceRecommendations(aggregateMetrics)}
`;
    
    try {
      await fs.writeFile(analysisPath, analysis);
      console.log(`📊 Performance analysis generated: ${analysisPath}`);
    } catch (error) {
      console.error('Failed to generate performance analysis:', error);
    }
  }

  private generatePerformanceAssessment(metrics: any): string {
    const assessments = [];
    
    // Connection time assessment
    if (metrics.connectionTime?.avg > 5000) {
      assessments.push('🔴 **Connection Performance**: POOR - Average connection time exceeds 5 seconds');
    } else if (metrics.connectionTime?.avg > 2000) {
      assessments.push('🟡 **Connection Performance**: FAIR - Connection time could be improved');
    } else {
      assessments.push('🟢 **Connection Performance**: GOOD - Fast connection establishment');
    }
    
    // Throughput assessment
    if (metrics.throughput?.avg < 10) {
      assessments.push('🔴 **Throughput**: POOR - Below minimum threshold of 10 msg/sec');
    } else if (metrics.throughput?.avg < 50) {
      assessments.push('🟡 **Throughput**: FAIR - Moderate message processing rate');
    } else {
      assessments.push('🟢 **Throughput**: EXCELLENT - High message processing rate');
    }
    
    // Latency assessment
    if (metrics.messageLatency?.avg > 1000) {
      assessments.push('🔴 **Latency**: POOR - High average latency');
    } else if (metrics.messageLatency?.avg > 500) {
      assessments.push('🟡 **Latency**: FAIR - Moderate latency');
    } else {
      assessments.push('🟢 **Latency**: EXCELLENT - Low latency communication');
    }
    
    // Error rate assessment
    if (metrics.errorRate?.avg > 0.05) {
      assessments.push('🔴 **Reliability**: POOR - Error rate above 5%');
    } else if (metrics.errorRate?.avg > 0.01) {
      assessments.push('🟡 **Reliability**: GOOD - Low error rate');
    } else {
      assessments.push('🟢 **Reliability**: EXCELLENT - Very low error rate');
    }
    
    return assessments.join('\n');
  }

  private generatePerformanceRecommendations(metrics: any): string {
    const recommendations = [];
    
    if (metrics.connectionTime?.avg > 2000) {
      recommendations.push('- Optimize WebSocket connection establishment process');
      recommendations.push('- Consider connection pooling or keep-alive strategies');
    }
    
    if (metrics.throughput?.avg < 50) {
      recommendations.push('- Investigate message processing bottlenecks');
      recommendations.push('- Consider message batching or compression');
    }
    
    if (metrics.messageLatency?.avg > 500) {
      recommendations.push('- Reduce message processing overhead');
      recommendations.push('- Optimize network routing and server response times');
    }
    
    if (metrics.errorRate?.avg > 0.01) {
      recommendations.push('- Improve error handling and retry mechanisms');
      recommendations.push('- Investigate root causes of connection failures');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('- Performance is within acceptable thresholds');
      recommendations.push('- Continue monitoring for regression detection');
    }
    
    return recommendations.join('\n');
  }

  private generateBasicRecommendations(): string[] {
    const recommendations = [];
    const passRate = Array.from(this.results.values()).filter(r => r.status === 'passed').length / this.results.size;
    
    if (passRate < 0.95) {
      recommendations.push('Improve test stability - success rate below 95%');
    }
    
    if (this.metrics.size < this.results.size * 0.8) {
      recommendations.push('Enhance metrics collection - missing data from some tests');
    }
    
    return recommendations;
  }

  private async generateRecommendations() {
    // Additional recommendation generation logic would go here
    console.log('📝 Detailed recommendations available in metrics report');
  }

  private findTestById(testId: string): TestCase | undefined {
    const allTests = this.suite.allTests();
    return allTests.find(test => test.id === testId);
  }
}

export default WebSocketReporter;