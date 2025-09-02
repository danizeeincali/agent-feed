/**
 * Comprehensive Production Validation Suite
 * Orchestrates all validation tests to ensure 100% system reliability
 */

const { RealBrowserValidator } = require('./browser/real-browser-test');
const { WebSocketValidator } = require('./websocket/connection-validator');
const { ClaudeAPIValidator } = require('./api/claude-api-validator');
const { MemoryLeakDetector } = require('./memory/memory-leak-detector');
const { ConnectionStateChecker } = require('./performance/connection-state-checker');
const { RaceConditionDetector } = require('./performance/race-condition-detector');
const { PerformanceBenchmark } = require('./performance/performance-benchmark');
const { WorkflowValidator } = require('./e2e/workflow-validator');
const { StabilityMonitor } = require('./e2e/stability-monitor');
const { ErrorRecoveryTester } = require('./e2e/error-recovery-tester');

class ProductionValidationSuite {
  constructor(config = {}) {
    this.config = {
      frontendUrl: config.frontendUrl || 'http://localhost:5173',
      backendUrl: config.backendUrl || 'http://localhost:3001',
      wsUrl: config.wsUrl || 'ws://localhost:3001',
      apiUrl: config.apiUrl || 'http://localhost:3001/api',
      
      // Test configuration
      runParallel: config.runParallel !== false,
      detailedReports: config.detailedReports !== false,
      skipSlowTests: config.skipSlowTests || false,
      
      // Reliability thresholds
      minReliabilityScore: config.minReliabilityScore || 95,
      maxErrorRate: config.maxErrorRate || 0.05, // 5%
      maxResponseTime: config.maxResponseTime || 5000, // 5 seconds
      minStabilityScore: config.minStabilityScore || 90,
      
      ...config
    };
    
    this.validationResults = {};
    this.overallScore = 0;
    this.startTime = null;
  }

  async runFullValidationSuite() {
    const suiteId = `production-validation-${Date.now()}`;
    console.log(`\n🚀 Starting Comprehensive Production Validation Suite: ${suiteId}\n`);
    console.log(`Configuration:`);
    console.log(`  Frontend URL: ${this.config.frontendUrl}`);
    console.log(`  Backend URL: ${this.config.backendUrl}`);
    console.log(`  WebSocket URL: ${this.config.wsUrl}`);
    console.log(`  API URL: ${this.config.apiUrl}`);
    console.log(`  Parallel Execution: ${this.config.runParallel}`);
    console.log(`  Skip Slow Tests: ${this.config.skipSlowTests}\n`);

    this.startTime = Date.now();
    
    const results = {
      suiteId,
      timestamp: new Date().toISOString(),
      config: this.config,
      validationResults: {},
      summary: {},
      overallScore: 0,
      passed: false,
      duration: 0
    };

    try {
      // Phase 1: Quick Health Check
      console.log('📋 Phase 1: System Health Check');
      const healthCheck = await this.performHealthCheck();
      results.validationResults.healthCheck = healthCheck;
      
      if (!healthCheck.systemHealthy) {
        throw new Error('System health check failed. Cannot proceed with validation.');
      }

      // Phase 2: Core Component Validation
      console.log('\n🔧 Phase 2: Core Component Validation');
      if (this.config.runParallel) {
        await this.runCoreValidationInParallel(results);
      } else {
        await this.runCoreValidationSequentially(results);
      }

      // Phase 3: Integration Testing
      console.log('\n🔗 Phase 3: Integration and Workflow Testing');
      await this.runIntegrationTests(results);

      // Phase 4: Performance and Reliability Testing
      if (!this.config.skipSlowTests) {
        console.log('\n⚡ Phase 4: Performance and Reliability Testing');
        await this.runPerformanceTests(results);
      }

      // Phase 5: Final System Validation
      console.log('\n✅ Phase 5: Final System Validation');
      await this.runFinalValidation(results);

      // Calculate overall results
      results.duration = Date.now() - this.startTime;
      results.summary = this.generateValidationSummary(results.validationResults);
      results.overallScore = this.calculateOverallScore(results.validationResults);
      results.passed = this.evaluateOverallSuccess(results);
      
      console.log('\n' + '='.repeat(80));
      this.printValidationSummary(results);
      console.log('='.repeat(80) + '\n');

      return results;

    } catch (error) {
      console.error(`❌ Production validation suite failed: ${error.message}`);
      
      return {
        ...results,
        error: error.message,
        duration: Date.now() - this.startTime,
        passed: false,
        overallScore: 0
      };
    }
  }

  async performHealthCheck() {
    console.log('  🔍 Checking system availability...');
    
    const healthResults = {
      systemHealthy: false,
      components: {},
      issues: []
    };

    try {
      // Check frontend availability
      const axios = require('axios');
      
      try {
        const frontendResponse = await axios.get(this.config.frontendUrl, { timeout: 10000 });
        healthResults.components.frontend = {
          available: frontendResponse.status === 200,
          responseTime: Date.now()
        };
      } catch (error) {
        healthResults.components.frontend = { available: false, error: error.message };
        healthResults.issues.push(`Frontend not available: ${error.message}`);
      }

      // Check backend health
      try {
        const backendResponse = await axios.get(`${this.config.backendUrl}/health`, { timeout: 10000 });
        healthResults.components.backend = {
          available: backendResponse.status === 200,
          health: backendResponse.data
        };
      } catch (error) {
        healthResults.components.backend = { available: false, error: error.message };
        healthResults.issues.push(`Backend not available: ${error.message}`);
      }

      // Check WebSocket availability
      const WebSocket = require('ws');
      try {
        await new Promise((resolve, reject) => {
          const ws = new WebSocket(this.config.wsUrl);
          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket connection timeout'));
          }, 10000);

          ws.on('open', () => {
            clearTimeout(timeout);
            ws.close();
            resolve();
          });

          ws.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
        
        healthResults.components.websocket = { available: true };
      } catch (error) {
        healthResults.components.websocket = { available: false, error: error.message };
        healthResults.issues.push(`WebSocket not available: ${error.message}`);
      }

      healthResults.systemHealthy = Object.values(healthResults.components)
        .every(component => component.available);

      if (healthResults.systemHealthy) {
        console.log('  ✅ All system components are healthy');
      } else {
        console.log(`  ❌ System health issues detected: ${healthResults.issues.length} issues`);
        healthResults.issues.forEach(issue => console.log(`    • ${issue}`));
      }

      return healthResults;

    } catch (error) {
      healthResults.issues.push(`Health check error: ${error.message}`);
      return healthResults;
    }
  }

  async runCoreValidationInParallel(results) {
    console.log('  🔄 Running core validations in parallel...');
    
    const coreValidations = [
      {
        name: 'browserValidation',
        test: async () => {
          const validator = new RealBrowserValidator(this.config);
          await validator.initialize();
          const result = await validator.validateCompleteWorkflow();
          await validator.cleanup();
          return result;
        }
      },
      {
        name: 'websocketValidation', 
        test: async () => {
          const validator = new WebSocketValidator(this.config);
          return await validator.validateSingleConnection();
        }
      },
      {
        name: 'apiValidation',
        test: async () => {
          const validator = new ClaudeAPIValidator(this.config);
          return await validator.validateBasicAPIResponse();
        }
      },
      {
        name: 'memoryValidation',
        test: async () => {
          const detector = new MemoryLeakDetector(this.config);
          detector.startMonitoring();
          
          // Run some operations while monitoring
          await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
          
          detector.stopMonitoring();
          return await detector.analyzeLeaks();
        }
      }
    ];

    const promises = coreValidations.map(async (validation) => {
      try {
        console.log(`    • Starting ${validation.name}...`);
        const result = await validation.test();
        console.log(`    ✅ ${validation.name} completed`);
        return { name: validation.name, result, success: true };
      } catch (error) {
        console.log(`    ❌ ${validation.name} failed: ${error.message}`);
        return { name: validation.name, error: error.message, success: false };
      }
    });

    const coreResults = await Promise.allSettled(promises);
    
    coreResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.validationResults[result.value.name] = result.value.result;
      } else {
        results.validationResults[result.value?.name || 'unknown'] = {
          error: result.reason.message,
          success: false
        };
      }
    });
  }

  async runCoreValidationSequentially(results) {
    console.log('  📋 Running core validations sequentially...');
    
    // Browser Validation
    console.log('    🖥️  Browser validation...');
    try {
      const browserValidator = new RealBrowserValidator(this.config);
      await browserValidator.initialize();
      results.validationResults.browserValidation = await browserValidator.validateCompleteWorkflow();
      await browserValidator.cleanup();
      console.log('    ✅ Browser validation completed');
    } catch (error) {
      console.log(`    ❌ Browser validation failed: ${error.message}`);
      results.validationResults.browserValidation = { success: false, error: error.message };
    }

    // WebSocket Validation
    console.log('    🔌 WebSocket validation...');
    try {
      const wsValidator = new WebSocketValidator(this.config);
      results.validationResults.websocketValidation = await wsValidator.validateSingleConnection();
      console.log('    ✅ WebSocket validation completed');
    } catch (error) {
      console.log(`    ❌ WebSocket validation failed: ${error.message}`);
      results.validationResults.websocketValidation = { success: false, error: error.message };
    }

    // API Validation
    console.log('    🤖 Claude API validation...');
    try {
      const apiValidator = new ClaudeAPIValidator(this.config);
      results.validationResults.apiValidation = await apiValidator.validateBasicAPIResponse();
      console.log('    ✅ API validation completed');
    } catch (error) {
      console.log(`    ❌ API validation failed: ${error.message}`);
      results.validationResults.apiValidation = { success: false, error: error.message };
    }
  }

  async runIntegrationTests(results) {
    // Connection State Consistency
    console.log('  🔄 Connection state consistency...');
    try {
      const stateChecker = new ConnectionStateChecker(this.config);
      results.validationResults.stateConsistency = await stateChecker.validateStateConsistency();
      console.log('  ✅ State consistency validation completed');
    } catch (error) {
      console.log(`  ❌ State consistency failed: ${error.message}`);
      results.validationResults.stateConsistency = { success: false, error: error.message };
    }

    // Workflow Validation
    console.log('  📋 End-to-end workflow validation...');
    try {
      const workflowValidator = new WorkflowValidator(this.config);
      results.validationResults.workflowValidation = await workflowValidator.validateCompleteWorkflows();
      console.log('  ✅ Workflow validation completed');
    } catch (error) {
      console.log(`  ❌ Workflow validation failed: ${error.message}`);
      results.validationResults.workflowValidation = { success: false, error: error.message };
    }
  }

  async runPerformanceTests(results) {
    // Race Condition Detection
    console.log('  ⚡ Race condition detection...');
    try {
      const raceDetector = new RaceConditionDetector(this.config);
      results.validationResults.raceConditionDetection = await raceDetector.detectRaceConditions();
      console.log('  ✅ Race condition detection completed');
    } catch (error) {
      console.log(`  ❌ Race condition detection failed: ${error.message}`);
      results.validationResults.raceConditionDetection = { success: false, error: error.message };
    }

    // Performance Benchmark
    console.log('  🚀 Performance benchmarking...');
    try {
      const perfBenchmark = new PerformanceBenchmark(this.config);
      results.validationResults.performanceBenchmark = await perfBenchmark.runComprehensiveBenchmark();
      perfBenchmark.cleanup();
      console.log('  ✅ Performance benchmarking completed');
    } catch (error) {
      console.log(`  ❌ Performance benchmarking failed: ${error.message}`);
      results.validationResults.performanceBenchmark = { passed: false, error: error.message };
    }

    // Stability Monitoring
    console.log('  📊 Stability monitoring...');
    try {
      const stabilityMonitor = new StabilityMonitor(this.config);
      results.validationResults.stabilityMonitoring = await stabilityMonitor.startStabilityMonitoring();
      console.log('  ✅ Stability monitoring completed');
    } catch (error) {
      console.log(`  ❌ Stability monitoring failed: ${error.message}`);
      results.validationResults.stabilityMonitoring = { success: false, error: error.message };
    }
  }

  async runFinalValidation(results) {
    // Error Recovery Testing
    console.log('  🚨 Error recovery testing...');
    try {
      const errorRecoveryTester = new ErrorRecoveryTester(this.config);
      results.validationResults.errorRecovery = await errorRecoveryTester.testErrorRecoveryMechanisms();
      console.log('  ✅ Error recovery testing completed');
    } catch (error) {
      console.log(`  ❌ Error recovery testing failed: ${error.message}`);
      results.validationResults.errorRecovery = { success: false, error: error.message };
    }

    // Memory Leak Detection (if not already run)
    if (!results.validationResults.memoryValidation) {
      console.log('  💾 Memory leak detection...');
      try {
        const memoryDetector = new MemoryLeakDetector(this.config);
        memoryDetector.startMonitoring();
        
        // Run brief memory test
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        memoryDetector.stopMonitoring();
        results.validationResults.memoryValidation = await memoryDetector.analyzeLeaks();
        console.log('  ✅ Memory leak detection completed');
      } catch (error) {
        console.log(`  ❌ Memory leak detection failed: ${error.message}`);
        results.validationResults.memoryValidation = { success: false, error: error.message };
      }
    }
  }

  generateValidationSummary(validationResults) {
    const summary = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      testResults: {},
      criticalIssues: [],
      warnings: [],
      recommendations: []
    };

    Object.entries(validationResults).forEach(([testName, result]) => {
      summary.totalTests++;
      
      const testPassed = this.determineTestSuccess(result);
      if (testPassed) {
        summary.passedTests++;
      } else {
        summary.failedTests++;
      }

      summary.testResults[testName] = {
        passed: testPassed,
        score: this.calculateTestScore(result),
        issues: this.extractIssues(result),
        duration: result.duration || 0
      };

      // Collect critical issues
      if (!testPassed && this.isCriticalTest(testName)) {
        summary.criticalIssues.push({
          test: testName,
          issue: result.error || 'Test failed',
          impact: 'high'
        });
      }
    });

    summary.successRate = summary.totalTests > 0 
      ? (summary.passedTests / summary.totalTests) * 100 
      : 0;

    return summary;
  }

  determineTestSuccess(result) {
    if (result.success !== undefined) return result.success;
    if (result.passed !== undefined) return result.passed;
    if (result.stable !== undefined) return result.stable;
    if (result.recovered !== undefined) return result.recovered;
    if (result.error) return false;
    return true;
  }

  isCriticalTest(testName) {
    const criticalTests = [
      'browserValidation',
      'websocketValidation', 
      'apiValidation',
      'workflowValidation',
      'stateConsistency'
    ];
    return criticalTests.includes(testName);
  }

  calculateTestScore(result) {
    if (result.score !== undefined) return result.score;
    if (result.successRate !== undefined) return parseFloat(result.successRate);
    if (result.overallScore !== undefined) return parseFloat(result.overallScore);
    if (this.determineTestSuccess(result)) return 100;
    return 0;
  }

  extractIssues(result) {
    const issues = [];
    
    if (result.error) issues.push(result.error);
    if (result.issues) issues.push(...result.issues);
    if (result.inconsistencies) issues.push(...result.inconsistencies.map(i => i.type));
    if (result.raceConditions) issues.push(...result.raceConditions.map(r => r.type));
    
    return issues;
  }

  calculateOverallScore(validationResults) {
    const weights = {
      browserValidation: 0.20,
      websocketValidation: 0.15,
      apiValidation: 0.15,
      workflowValidation: 0.15,
      stateConsistency: 0.10,
      performanceBenchmark: 0.10,
      stabilityMonitoring: 0.10,
      errorRecovery: 0.05
    };

    let weightedScore = 0;
    let totalWeight = 0;

    Object.entries(validationResults).forEach(([testName, result]) => {
      const weight = weights[testName] || 0.05; // Default weight for unlisted tests
      const score = this.calculateTestScore(result);
      
      weightedScore += score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? (weightedScore / totalWeight) : 0;
  }

  evaluateOverallSuccess(results) {
    const summary = results.summary;
    const overallScore = results.overallScore;
    
    // Must pass critical tests
    const criticalTestsPassed = ['browserValidation', 'websocketValidation', 'apiValidation']
      .every(testName => 
        !results.validationResults[testName] || 
        this.determineTestSuccess(results.validationResults[testName])
      );

    // Overall score must meet threshold
    const scoreThresholdMet = overallScore >= this.config.minReliabilityScore;
    
    // Success rate must be acceptable
    const successRateAcceptable = summary.successRate >= 80; // 80% of tests must pass
    
    // No critical issues
    const noCriticalIssues = summary.criticalIssues.length === 0;

    return criticalTestsPassed && scoreThresholdMet && successRateAcceptable && noCriticalIssues;
  }

  printValidationSummary(results) {
    const summary = results.summary;
    
    console.log(`📊 PRODUCTION VALIDATION SUMMARY`);
    console.log(`   Suite ID: ${results.suiteId}`);
    console.log(`   Duration: ${this.formatDuration(results.duration)}`);
    console.log(`   Overall Score: ${results.overallScore.toFixed(1)}%`);
    console.log(`   Status: ${results.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log();
    
    console.log(`📈 Test Results:`);
    console.log(`   Total Tests: ${summary.totalTests}`);
    console.log(`   Passed: ${summary.passedTests}`);
    console.log(`   Failed: ${summary.failedTests}`);
    console.log(`   Success Rate: ${summary.successRate.toFixed(1)}%`);
    console.log();

    if (summary.criticalIssues.length > 0) {
      console.log(`🚨 Critical Issues:`);
      summary.criticalIssues.forEach(issue => {
        console.log(`   • ${issue.test}: ${issue.issue}`);
      });
      console.log();
    }

    console.log(`📋 Individual Test Results:`);
    Object.entries(summary.testResults).forEach(([testName, result]) => {
      const status = result.passed ? '✅' : '❌';
      const score = result.score ? `(${result.score.toFixed(1)}%)` : '';
      const duration = result.duration ? `[${this.formatDuration(result.duration)}]` : '';
      console.log(`   ${status} ${testName} ${score} ${duration}`);
      
      if (result.issues.length > 0) {
        result.issues.forEach(issue => {
          console.log(`       • ${issue}`);
        });
      }
    });

    if (!results.passed) {
      console.log();
      console.log(`💡 Recommendations:`);
      console.log(`   • Review and fix failed tests before deployment`);
      console.log(`   • Address all critical issues immediately`);
      console.log(`   • Consider performance optimizations if scores are low`);
      console.log(`   • Implement monitoring for identified issues`);
    } else {
      console.log();
      console.log(`🎉 System is production-ready!`);
      console.log(`   • All critical tests passed`);
      console.log(`   • Performance meets requirements`);
      console.log(`   • Error recovery mechanisms are functional`);
      console.log(`   • Connection stability is excellent`);
    }
  }

  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  async generateDetailedReport(results) {
    if (!this.config.detailedReports) {
      return null;
    }

    const reportPath = `/workspaces/agent-feed/tests/production-validation/reports/validation-report-${Date.now()}.json`;
    
    const detailedReport = {
      ...results,
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      },
      environment: {
        frontendUrl: this.config.frontendUrl,
        backendUrl: this.config.backendUrl,
        wsUrl: this.config.wsUrl,
        apiUrl: this.config.apiUrl
      }
    };

    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      // Ensure reports directory exists
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      
      // Write detailed report
      await fs.writeFile(reportPath, JSON.stringify(detailedReport, null, 2));
      
      console.log(`📄 Detailed report saved: ${reportPath}`);
      return reportPath;
    } catch (error) {
      console.error(`❌ Failed to save detailed report: ${error.message}`);
      return null;
    }
  }
}

// Export for use in other scripts
module.exports = { ProductionValidationSuite };

// If run directly, execute the validation suite
if (require.main === module) {
  const suite = new ProductionValidationSuite();
  
  suite.runFullValidationSuite()
    .then(async (results) => {
      if (suite.config.detailedReports) {
        await suite.generateDetailedReport(results);
      }
      
      // Exit with appropriate code
      process.exit(results.passed ? 0 : 1);
    })
    .catch((error) => {
      console.error(`💥 Validation suite crashed: ${error.message}`);
      process.exit(1);
    });
}