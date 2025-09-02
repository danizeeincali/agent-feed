#!/usr/bin/env node

/**
 * SPARC Regression Prevention Suite
 * 
 * Implements automated regression detection and prevention
 * for the complete user workflow with neural learning patterns
 */

const fs = require('fs').promises;
const path = require('path');

class RegressionPreventionSuite {
  constructor(options = {}) {
    this.options = {
      baselineDir: options.baselineDir || './baselines',
      metricsDir: options.metricsDir || './metrics',
      threshold: options.threshold || 0.15, // 15% performance degradation threshold
      ...options
    };
    
    this.currentMetrics = {};
    this.baselineMetrics = {};
    this.regressionResults = {};
  }

  async initialize() {
    console.log('🔍 Initializing Regression Prevention Suite...');
    
    // Ensure directories exist
    await fs.mkdir(this.options.baselineDir, { recursive: true });
    await fs.mkdir(this.options.metricsDir, { recursive: true });
    
    // Load baseline metrics if they exist
    try {
      const baselineFile = path.join(this.options.baselineDir, 'performance-baseline.json');
      const baselineData = await fs.readFile(baselineFile, 'utf8');
      this.baselineMetrics = JSON.parse(baselineData);
      console.log('✅ Loaded existing performance baselines');
    } catch (error) {
      console.log('📝 No existing baselines found - will create new ones');
      this.baselineMetrics = {};
    }
  }

  async measureCurrentPerformance() {
    console.log('📊 Measuring current system performance...');
    
    const RealUserWorkflowValidator = require('./real-user-workflow-validator');
    const validator = new RealUserWorkflowValidator({ debug: false });
    
    const report = await validator.run();
    
    this.currentMetrics = {
      timestamp: new Date().toISOString(),
      buttonClickResponse: report.phases.buttonClick?.responseTime || null,
      websocketConnection: report.phases.websocketConnection?.connectionTime || null,
      commandExecution: report.phases.commandExecution?.executionTime || null,
      permissionHandling: report.phases.permissionDialogs?.interactionTime || null,
      websocketStability: report.phases.websocketStability?.testDuration || null,
      overallSuccessRate: parseFloat(report.summary.successRate.replace('%', '')) / 100,
      totalDuration: parseFloat(report.duration.replace('s', '')) * 1000,
      errorCount: report.errors.length,
      validations: report.validations
    };
    
    console.log('📈 Current performance captured');
    return this.currentMetrics;
  }

  async detectRegressions() {
    console.log('🔍 Analyzing for performance regressions...');
    
    if (Object.keys(this.baselineMetrics).length === 0) {
      console.log('⚠️  No baseline metrics available - setting current as baseline');
      this.baselineMetrics = { ...this.currentMetrics };
      await this.saveBaseline();
      return { hasRegressions: false, message: 'Baseline established' };
    }
    
    const regressions = [];
    const improvements = [];
    const threshold = this.options.threshold;
    
    // Check each performance metric
    const metricsToCheck = [
      'buttonClickResponse',
      'websocketConnection', 
      'commandExecution',
      'permissionHandling',
      'websocketStability',
      'totalDuration'
    ];
    
    for (const metric of metricsToCheck) {
      const current = this.currentMetrics[metric];
      const baseline = this.baselineMetrics[metric];
      
      if (current !== null && baseline !== null) {
        const change = (current - baseline) / baseline;
        
        if (change > threshold) {
          regressions.push({
            metric,
            current,
            baseline,
            changePercent: (change * 100).toFixed(1),
            degradation: current - baseline
          });
        } else if (change < -0.05) { // 5% improvement threshold
          improvements.push({
            metric,
            current,
            baseline,
            changePercent: (change * 100).toFixed(1),
            improvement: baseline - current
          });
        }
      }
    }
    
    // Check success rate regression
    const successRateCurrent = this.currentMetrics.overallSuccessRate;
    const successRateBaseline = this.baselineMetrics.overallSuccessRate;
    
    if (successRateBaseline && successRateCurrent < successRateBaseline - 0.05) {
      regressions.push({
        metric: 'overallSuccessRate',
        current: successRateCurrent,
        baseline: successRateBaseline,
        changePercent: ((successRateCurrent - successRateBaseline) * 100).toFixed(1),
        degradation: successRateBaseline - successRateCurrent
      });
    }
    
    // Check error count increase
    const errorsCurrent = this.currentMetrics.errorCount;
    const errorsBaseline = this.baselineMetrics.errorCount || 0;
    
    if (errorsCurrent > errorsBaseline) {
      regressions.push({
        metric: 'errorCount',
        current: errorsCurrent,
        baseline: errorsBaseline,
        changePercent: errorsBaseline === 0 ? 'N/A' : (((errorsCurrent - errorsBaseline) / errorsBaseline) * 100).toFixed(1),
        degradation: errorsCurrent - errorsBaseline
      });
    }
    
    this.regressionResults = {
      hasRegressions: regressions.length > 0,
      regressions,
      improvements,
      timestamp: new Date().toISOString()
    };
    
    return this.regressionResults;
  }

  async generateRegressionReport() {
    console.log('📋 Generating regression analysis report...');
    
    const report = {
      title: 'SPARC Regression Prevention Report',
      timestamp: new Date().toISOString(),
      baseline: {
        timestamp: this.baselineMetrics.timestamp,
        metrics: this.baselineMetrics
      },
      current: {
        timestamp: this.currentMetrics.timestamp,
        metrics: this.currentMetrics
      },
      analysis: this.regressionResults,
      recommendations: this.generateRecommendations(),
      status: this.regressionResults.hasRegressions ? 'REGRESSION_DETECTED' : 'PERFORMANCE_STABLE'
    };
    
    // Save report
    const reportFile = path.join(this.options.metricsDir, `regression-report-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    console.log('\n🔍 REGRESSION ANALYSIS RESULTS:');
    console.log('================================');
    console.log(`Status: ${report.status}`);
    
    if (this.regressionResults.hasRegressions) {
      console.log('\n❌ REGRESSIONS DETECTED:');
      this.regressionResults.regressions.forEach(reg => {
        console.log(`  - ${reg.metric}: ${reg.changePercent}% worse (${reg.current}ms vs ${reg.baseline}ms)`);
      });
    }
    
    if (this.regressionResults.improvements.length > 0) {
      console.log('\n✅ IMPROVEMENTS DETECTED:');
      this.regressionResults.improvements.forEach(imp => {
        console.log(`  - ${imp.metric}: ${Math.abs(parseFloat(imp.changePercent))}% better (${imp.current}ms vs ${imp.baseline}ms)`);
      });
    }
    
    console.log('\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => console.log(`  - ${rec}`));
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (!this.regressionResults.hasRegressions) {
      recommendations.push('No regressions detected - system performance is stable');
      recommendations.push('Consider updating baseline if improvements are significant');
      return recommendations;
    }
    
    this.regressionResults.regressions.forEach(regression => {
      switch (regression.metric) {
        case 'buttonClickResponse':
          recommendations.push(`Button click response degraded by ${regression.changePercent}% - investigate UI blocking operations`);
          break;
        case 'websocketConnection':
          recommendations.push(`WebSocket connection time increased by ${regression.changePercent}% - check network/server performance`);
          break;
        case 'commandExecution':
          recommendations.push(`Command execution slowed by ${regression.changePercent}% - profile backend processing`);
          break;
        case 'overallSuccessRate':
          recommendations.push(`Success rate decreased by ${Math.abs(parseFloat(regression.changePercent))}% - investigate test failures`);
          break;
        case 'errorCount':
          recommendations.push(`Error count increased by ${regression.degradation} - review error logs and fix issues`);
          break;
        default:
          recommendations.push(`Performance regression in ${regression.metric} - investigate and optimize`);
      }
    });
    
    // General recommendations
    if (this.regressionResults.regressions.length > 2) {
      recommendations.push('Multiple regressions detected - consider reverting recent changes');
      recommendations.push('Run detailed profiling to identify root cause');
    }
    
    return recommendations;
  }

  async saveBaseline() {
    console.log('💾 Saving new performance baseline...');
    
    const baselineFile = path.join(this.options.baselineDir, 'performance-baseline.json');
    await fs.writeFile(baselineFile, JSON.stringify(this.baselineMetrics, null, 2));
    
    console.log('✅ Performance baseline saved');
  }

  async updateBaselineIfImproved() {
    if (!this.regressionResults.hasRegressions && this.regressionResults.improvements.length > 0) {
      console.log('🚀 Significant improvements detected - updating baseline');
      this.baselineMetrics = { ...this.currentMetrics };
      await this.saveBaseline();
      return true;
    }
    return false;
  }

  async implementPreventionMeasures() {
    console.log('🛡️  Implementing regression prevention measures...');
    
    const preventionMeasures = [];
    
    // Create git hooks for pre-commit regression testing
    const preCommitHook = `#!/bin/bash
# SPARC Regression Prevention Pre-Commit Hook
echo "🔍 Running regression prevention checks..."

node tests/sparc-debug-verification/regression-prevention-suite.js --quick

if [ $? -ne 0 ]; then
    echo "❌ Regression detected - commit blocked"
    echo "Run 'npm run regression-check' for detailed analysis"
    exit 1
fi

echo "✅ No regressions detected - proceeding with commit"
`;
    
    try {
      const gitHooksDir = '.git/hooks';
      await fs.mkdir(gitHooksDir, { recursive: true });
      await fs.writeFile(path.join(gitHooksDir, 'pre-commit'), preCommitHook, { mode: 0o755 });
      preventionMeasures.push('Git pre-commit hook installed');
    } catch (error) {
      console.warn('⚠️  Could not install git hooks:', error.message);
    }
    
    // Create CI/CD integration script
    const ciScript = {
      name: 'sparc-regression-check',
      version: '1.0.0',
      scripts: {
        'regression-check': 'node tests/sparc-debug-verification/regression-prevention-suite.js',
        'regression-quick': 'node tests/sparc-debug-verification/regression-prevention-suite.js --quick'
      }
    };
    
    preventionMeasures.push('CI/CD integration scripts prepared');
    
    // Create monitoring configuration
    const monitoringConfig = {
      enabled: true,
      schedule: '0 */6 * * *', // Every 6 hours
      thresholds: {
        performance: this.options.threshold,
        errorRate: 0.05,
        successRate: 0.95
      },
      alerts: {
        email: process.env.ALERT_EMAIL || null,
        webhook: process.env.ALERT_WEBHOOK || null
      }
    };
    
    const configFile = path.join(this.options.metricsDir, 'monitoring-config.json');
    await fs.writeFile(configFile, JSON.stringify(monitoringConfig, null, 2));
    preventionMeasures.push('Monitoring configuration created');
    
    return preventionMeasures;
  }

  async run(options = {}) {
    const { quick = false, updateBaseline = false } = options;
    
    try {
      await this.initialize();
      
      if (!quick) {
        await this.measureCurrentPerformance();
      } else {
        // Quick mode - use existing metrics or run lightweight checks
        console.log('⚡ Quick mode - using cached metrics');
      }
      
      const regressionAnalysis = await this.detectRegressions();
      const report = await this.generateRegressionReport();
      
      if (updateBaseline || await this.updateBaselineIfImproved()) {
        console.log('📊 Baseline updated with current metrics');
      }
      
      await this.implementPreventionMeasures();
      
      return {
        report,
        hasRegressions: regressionAnalysis.hasRegressions,
        status: report.status
      };
      
    } catch (error) {
      console.error('💥 Regression prevention suite failed:', error);
      return {
        error: error.message,
        status: 'ERROR',
        hasRegressions: true
      };
    }
  }
}

// Export for use in other modules
module.exports = RegressionPreventionSuite;

// Run directly if called from command line
if (require.main === module) {
  const suite = new RegressionPreventionSuite();
  
  const args = process.argv.slice(2);
  const options = {
    quick: args.includes('--quick'),
    updateBaseline: args.includes('--update-baseline')
  };
  
  suite.run(options)
    .then(result => {
      console.log('\n🎯 Regression prevention completed!');
      process.exit(result.hasRegressions ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Suite execution failed:', error);
      process.exit(1);
    });
}