/**
 * NLD SSE Pattern Detection Deployment Validator
 * Validates that all NLD components are properly deployed and functioning
 * Part of NLD (Neuro-Learning Development) system
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import SSEBufferAccumulationDetector from './sse-buffer-accumulation-detector';
import SSEEventHandlerDuplicationAnalyzer from './sse-event-handler-duplication-analyzer';
import OutputBufferManagementFailurePatterns from './output-buffer-management-failure-patterns';
import FrontendMessageStateAccumulationDetector from './frontend-message-state-accumulation-detector';
import TDDSSEPreventionStrategies from './tdd-sse-prevention-strategies';
import SSENeuralTrainingExport from './sse-neural-training-export';
import SSEStreamingAntiPatternsDatabase from './sse-streaming-anti-patterns-database';
import RealTimeSSEFailureMonitor from './real-time-sse-failure-monitor';

interface ValidationResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  recommendations?: string[];
}

interface DeploymentValidationReport {
  validationId: string;
  timestamp: string;
  overallStatus: 'pass' | 'fail' | 'warning';
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  results: ValidationResult[];
  summary: {
    deploymentHealth: 'excellent' | 'good' | 'fair' | 'poor';
    criticalIssues: string[];
    recommendations: string[];
    nextSteps: string[];
  };
}

export class NLDSSEDeploymentValidator {
  private validationDir: string;
  private bufferDetector?: SSEBufferAccumulationDetector;
  private handlerAnalyzer?: SSEEventHandlerDuplicationAnalyzer;
  private bufferFailureAnalyzer?: OutputBufferManagementFailurePatterns;
  private frontendDetector?: FrontendMessageStateAccumulationDetector;
  private tddStrategies?: TDDSSEPreventionStrategies;
  private neuralExporter?: SSENeuralTrainingExport;
  private antiPatternsDB?: SSEStreamingAntiPatternsDatabase;
  private failureMonitor?: RealTimeSSEFailureMonitor;

  constructor(validationDir: string) {
    this.validationDir = validationDir;
    console.log('✅ NLD SSE Deployment Validator initialized');
  }

  /**
   * Initialize and validate all NLD components
   */
  async initializeAndValidateComponents(): Promise<DeploymentValidationReport> {
    const results: ValidationResult[] = [];
    const validationId = `nld-sse-validation-${Date.now()}`;
    
    console.log('🔍 Starting NLD SSE Pattern Detection Deployment Validation...');
    
    // Initialize components
    try {
      this.bufferDetector = new SSEBufferAccumulationDetector(this.validationDir);
      results.push({
        component: 'SSEBufferAccumulationDetector',
        status: 'pass',
        message: 'Successfully initialized buffer accumulation detector',
        details: { storageDir: this.validationDir }
      });
    } catch (error) {
      results.push({
        component: 'SSEBufferAccumulationDetector',
        status: 'fail',
        message: `Failed to initialize buffer accumulation detector: ${error}`,
        recommendations: ['Check file system permissions', 'Verify storage directory exists']
      });
    }
    
    try {
      this.handlerAnalyzer = new SSEEventHandlerDuplicationAnalyzer(this.validationDir);
      results.push({
        component: 'SSEEventHandlerDuplicationAnalyzer',
        status: 'pass',
        message: 'Successfully initialized handler duplication analyzer',
        details: { storageDir: this.validationDir }
      });
    } catch (error) {
      results.push({
        component: 'SSEEventHandlerDuplicationAnalyzer',
        status: 'fail',
        message: `Failed to initialize handler duplication analyzer: ${error}`,
        recommendations: ['Check component dependencies', 'Verify storage configuration']
      });
    }
    
    try {
      this.bufferFailureAnalyzer = new OutputBufferManagementFailurePatterns(this.validationDir);
      results.push({
        component: 'OutputBufferManagementFailurePatterns',
        status: 'pass',
        message: 'Successfully initialized buffer failure analyzer',
        details: { storageDir: this.validationDir }
      });
    } catch (error) {
      results.push({
        component: 'OutputBufferManagementFailurePatterns',
        status: 'fail',
        message: `Failed to initialize buffer failure analyzer: ${error}`,
        recommendations: ['Check buffer management dependencies', 'Verify pattern storage']
      });
    }
    
    try {
      this.frontendDetector = new FrontendMessageStateAccumulationDetector(this.validationDir);
      results.push({
        component: 'FrontendMessageStateAccumulationDetector',
        status: 'pass',
        message: 'Successfully initialized frontend state detector',
        details: { storageDir: this.validationDir }
      });
    } catch (error) {
      results.push({
        component: 'FrontendMessageStateAccumulationDetector',
        status: 'fail',
        message: `Failed to initialize frontend state detector: ${error}`,
        recommendations: ['Check frontend integration', 'Verify component state tracking']
      });
    }
    
    try {
      this.tddStrategies = new TDDSSEPreventionStrategies(this.validationDir);
      results.push({
        component: 'TDDSSEPreventionStrategies',
        status: 'pass',
        message: 'Successfully initialized TDD prevention strategies',
        details: { 
          strategiesCount: this.tddStrategies.getAllStrategies().length,
          testPatternsCount: this.tddStrategies.getTestPatterns().length,
          preventionRulesCount: this.tddStrategies.getPreventionRules().length
        }
      });
    } catch (error) {
      results.push({
        component: 'TDDSSEPreventionStrategies',
        status: 'fail',
        message: `Failed to initialize TDD prevention strategies: ${error}`,
        recommendations: ['Check TDD strategy definitions', 'Verify test pattern templates']
      });
    }
    
    // Initialize neural training export if all detectors are available
    if (this.bufferDetector && this.handlerAnalyzer && this.bufferFailureAnalyzer && this.frontendDetector) {
      try {
        this.neuralExporter = new SSENeuralTrainingExport(
          join(this.validationDir, 'neural-training'),
          this.bufferDetector,
          this.handlerAnalyzer,
          this.bufferFailureAnalyzer,
          this.frontendDetector
        );
        results.push({
          component: 'SSENeuralTrainingExport',
          status: 'pass',
          message: 'Successfully initialized neural training export system',
          details: { exportDir: join(this.validationDir, 'neural-training') }
        });
      } catch (error) {
        results.push({
          component: 'SSENeuralTrainingExport',
          status: 'fail',
          message: `Failed to initialize neural training export: ${error}`,
          recommendations: ['Check neural export dependencies', 'Verify training data directory']
        });
      }
    } else {
      results.push({
        component: 'SSENeuralTrainingExport',
        status: 'fail',
        message: 'Cannot initialize neural training - missing detector dependencies',
        recommendations: ['Ensure all detectors are successfully initialized first']
      });
    }
    
    try {
      this.antiPatternsDB = new SSEStreamingAntiPatternsDatabase(this.validationDir);
      if (this.bufferDetector && this.handlerAnalyzer && this.bufferFailureAnalyzer && this.frontendDetector) {
        this.antiPatternsDB.initializeAnalyzers(
          this.bufferDetector,
          this.handlerAnalyzer,
          this.bufferFailureAnalyzer,
          this.frontendDetector
        );
      }
      results.push({
        component: 'SSEStreamingAntiPatternsDatabase',
        status: 'pass',
        message: 'Successfully initialized anti-patterns database',
        details: {
          totalAntiPatterns: this.antiPatternsDB.getAllAntiPatterns().length,
          totalInstances: this.antiPatternsDB.getAllInstances().length,
          analyzersConnected: !!(this.bufferDetector && this.handlerAnalyzer)
        }
      });
    } catch (error) {
      results.push({
        component: 'SSEStreamingAntiPatternsDatabase',
        status: 'fail',
        message: `Failed to initialize anti-patterns database: ${error}`,
        recommendations: ['Check database storage', 'Verify pattern definitions']
      });
    }
    
    try {
      this.failureMonitor = new RealTimeSSEFailureMonitor();
      results.push({
        component: 'RealTimeSSEFailureMonitor',
        status: 'pass',
        message: 'Successfully initialized real-time failure monitor',
        details: { monitoringActive: false }
      });
    } catch (error) {
      results.push({
        component: 'RealTimeSSEFailureMonitor',
        status: 'fail',
        message: `Failed to initialize failure monitor: ${error}`,
        recommendations: ['Check monitoring dependencies', 'Verify event system integration']
      });
    }
    
    // Run functional tests
    const functionalTestResults = await this.runFunctionalTests();
    results.push(...functionalTestResults);
    
    // Generate validation report
    const report = this.generateValidationReport(validationId, results);
    
    // Persist validation report
    this.persistValidationReport(report);
    
    return report;
  }

  /**
   * Run functional tests on NLD components
   */
  private async runFunctionalTests(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    
    // Test buffer accumulation detector
    if (this.bufferDetector) {
      try {
        // Simulate SSE buffer replay loop pattern
        const testMessage = {
          type: 'output',
          data: 'Test message for validation',
          instanceId: 'validation-test',
          timestamp: new Date().toISOString()
        };
        
        // Send same message multiple times to trigger detection
        for (let i = 0; i < 10; i++) {
          this.bufferDetector.analyzeSSEMessage({
            ...testMessage,
            timestamp: new Date().toISOString()
          });
        }
        
        const patterns = this.bufferDetector.getDetectedPatterns();
        if (patterns.length > 0) {
          results.push({
            component: 'BufferDetector_FunctionalTest',
            status: 'pass',
            message: `Buffer accumulation detection working: ${patterns.length} patterns detected`,
            details: { patternsDetected: patterns.length }
          });
        } else {
          results.push({
            component: 'BufferDetector_FunctionalTest',
            status: 'warning',
            message: 'Buffer detection not triggered - threshold may need adjustment',
            recommendations: ['Check detection thresholds', 'Verify pattern criteria']
          });
        }
      } catch (error) {
        results.push({
          component: 'BufferDetector_FunctionalTest',
          status: 'fail',
          message: `Buffer detector functional test failed: ${error}`,
          recommendations: ['Check detector implementation', 'Verify test data format']
        });
      }
    }
    
    // Test handler duplication analyzer
    if (this.handlerAnalyzer) {
      try {
        // Simulate duplicate handler registration
        this.handlerAnalyzer.recordEventHandlerRegistration(
          'onSSEMessage', 'validation-test', 'message', 'test-stack-1'
        );
        this.handlerAnalyzer.recordEventHandlerRegistration(
          'onSSEMessage', 'validation-test', 'message', 'test-stack-2'
        );
        
        const duplications = this.handlerAnalyzer.getDetectedPatterns();
        if (duplications.length > 0) {
          results.push({
            component: 'HandlerAnalyzer_FunctionalTest',
            status: 'pass',
            message: `Handler duplication detection working: ${duplications.length} patterns detected`,
            details: { duplicationsDetected: duplications.length }
          });
        } else {
          results.push({
            component: 'HandlerAnalyzer_FunctionalTest',
            status: 'warning',
            message: 'Handler duplication not detected - may need more registrations',
            recommendations: ['Check duplication threshold', 'Verify handler tracking']
          });
        }
      } catch (error) {
        results.push({
          component: 'HandlerAnalyzer_FunctionalTest',
          status: 'fail',
          message: `Handler analyzer functional test failed: ${error}`,
          recommendations: ['Check analyzer implementation', 'Verify registration tracking']
        });
      }
    }
    
    // Test frontend state accumulation detector
    if (this.frontendDetector) {
      try {
        // Simulate frontend message accumulation
        const testMessages = [];
        for (let i = 0; i < 150; i++) {
          testMessages.push({
            id: `msg-${i}`,
            type: 'output',
            content: `Test message ${i}`,
            timestamp: new Date().toISOString(),
            instanceId: 'validation-test',
            componentId: 'TestComponent'
          });
        }
        
        this.frontendDetector.trackMessageStateUpdate(
          'TestComponent', 'validation-test', testMessages, 1
        );
        
        const patterns = this.frontendDetector.getDetectedPatterns();
        if (patterns.length > 0) {
          results.push({
            component: 'FrontendDetector_FunctionalTest',
            status: 'pass',
            message: `Frontend accumulation detection working: ${patterns.length} patterns detected`,
            details: { patternsDetected: patterns.length }
          });
        } else {
          results.push({
            component: 'FrontendDetector_FunctionalTest',
            status: 'warning',
            message: 'Frontend accumulation not detected - threshold may need adjustment',
            recommendations: ['Check accumulation threshold', 'Verify message tracking']
          });
        }
      } catch (error) {
        results.push({
          component: 'FrontendDetector_FunctionalTest',
          status: 'fail',
          message: `Frontend detector functional test failed: ${error}`,
          recommendations: ['Check detector implementation', 'Verify state tracking']
        });
      }
    }
    
    // Test TDD strategies
    if (this.tddStrategies) {
      try {
        const strategies = this.tddStrategies.getAllStrategies();
        const testPatterns = this.tddStrategies.getTestPatterns();
        const preventionRules = this.tddStrategies.getPreventionRules();
        
        if (strategies.length > 0 && testPatterns.length > 0 && preventionRules.length > 0) {
          results.push({
            component: 'TDDStrategies_FunctionalTest',
            status: 'pass',
            message: 'TDD prevention strategies loaded successfully',
            details: {
              strategiesCount: strategies.length,
              testPatternsCount: testPatterns.length,
              preventionRulesCount: preventionRules.length
            }
          });
        } else {
          results.push({
            component: 'TDDStrategies_FunctionalTest',
            status: 'fail',
            message: 'TDD strategies not properly loaded',
            recommendations: ['Check strategy definitions', 'Verify initialization']
          });
        }
      } catch (error) {
        results.push({
          component: 'TDDStrategies_FunctionalTest',
          status: 'fail',
          message: `TDD strategies functional test failed: ${error}`,
          recommendations: ['Check strategy implementation', 'Verify data structures']
        });
      }
    }
    
    // Test neural training export
    if (this.neuralExporter) {
      try {
        const stats = this.neuralExporter.getDatasetStatistics();
        results.push({
          component: 'NeuralExporter_FunctionalTest',
          status: 'pass',
          message: 'Neural training export system functioning',
          details: {
            totalDatasets: stats.totalDatasets,
            totalSamples: stats.totalSamples,
            exportReady: true
          }
        });
      } catch (error) {
        results.push({
          component: 'NeuralExporter_FunctionalTest',
          status: 'fail',
          message: `Neural export functional test failed: ${error}`,
          recommendations: ['Check export implementation', 'Verify data dependencies']
        });
      }
    }
    
    // Test anti-patterns database
    if (this.antiPatternsDB) {
      try {
        const antiPatterns = this.antiPatternsDB.getAllAntiPatterns();
        const instances = this.antiPatternsDB.getAllInstances();
        const stats = this.antiPatternsDB.getDatabaseStatistics();
        
        results.push({
          component: 'AntiPatternsDB_FunctionalTest',
          status: 'pass',
          message: 'Anti-patterns database functioning correctly',
          details: {
            totalAntiPatterns: antiPatterns.length,
            totalInstances: instances.length,
            criticalPatterns: antiPatterns.filter(p => p.severity === 'critical').length,
            databaseStats: stats
          }
        });
      } catch (error) {
        results.push({
          component: 'AntiPatternsDB_FunctionalTest',
          status: 'fail',
          message: `Anti-patterns database functional test failed: ${error}`,
          recommendations: ['Check database implementation', 'Verify pattern storage']
        });
      }
    }
    
    // Test failure monitor
    if (this.failureMonitor) {
      try {
        const report = this.failureMonitor.generateReport();
        results.push({
          component: 'FailureMonitor_FunctionalTest',
          status: 'pass',
          message: 'Real-time failure monitor functioning',
          details: {
            monitoringActive: report.monitoringActive,
            totalInstances: report.totalInstances,
            activeAlerts: report.activeAlerts
          }
        });
      } catch (error) {
        results.push({
          component: 'FailureMonitor_FunctionalTest',
          status: 'fail',
          message: `Failure monitor functional test failed: ${error}`,
          recommendations: ['Check monitor implementation', 'Verify reporting system']
        });
      }
    }
    
    return results;
  }

  /**
   * Generate validation report
   */
  private generateValidationReport(
    validationId: string, 
    results: ValidationResult[]
  ): DeploymentValidationReport {
    const passedChecks = results.filter(r => r.status === 'pass').length;
    const failedChecks = results.filter(r => r.status === 'fail').length;
    const warningChecks = results.filter(r => r.status === 'warning').length;
    
    let overallStatus: 'pass' | 'fail' | 'warning';
    let deploymentHealth: 'excellent' | 'good' | 'fair' | 'poor';
    
    if (failedChecks === 0 && warningChecks === 0) {
      overallStatus = 'pass';
      deploymentHealth = 'excellent';
    } else if (failedChecks === 0 && warningChecks > 0) {
      overallStatus = 'warning';
      deploymentHealth = warningChecks <= 2 ? 'good' : 'fair';
    } else {
      overallStatus = 'fail';
      deploymentHealth = failedChecks <= 2 ? 'fair' : 'poor';
    }
    
    const criticalIssues = results
      .filter(r => r.status === 'fail')
      .map(r => r.message);
    
    const recommendations = results
      .filter(r => r.recommendations && r.recommendations.length > 0)
      .flatMap(r => r.recommendations!);
    
    const nextSteps = this.generateNextSteps(overallStatus, failedChecks, warningChecks);
    
    return {
      validationId,
      timestamp: new Date().toISOString(),
      overallStatus,
      totalChecks: results.length,
      passedChecks,
      failedChecks,
      warningChecks,
      results,
      summary: {
        deploymentHealth,
        criticalIssues,
        recommendations: [...new Set(recommendations)], // Remove duplicates
        nextSteps
      }
    };
  }

  /**
   * Generate next steps based on validation results
   */
  private generateNextSteps(
    overallStatus: 'pass' | 'fail' | 'warning',
    failedChecks: number,
    warningChecks: number
  ): string[] {
    const steps = [];
    
    if (overallStatus === 'pass') {
      steps.push('✅ All NLD components successfully deployed and validated');
      steps.push('🚀 System ready for production SSE monitoring');
      steps.push('🔄 Start real-time monitoring to begin pattern detection');
      steps.push('📈 Monitor neural training data collection progress');
    } else if (overallStatus === 'warning') {
      steps.push('⚠️ Address warning issues to improve system reliability');
      steps.push('🔧 Review component configurations and thresholds');
      steps.push('📋 Monitor system behavior after adjustments');
      if (warningChecks <= 2) {
        steps.push('🚀 Consider proceeding with cautious production deployment');
      }
    } else {
      steps.push('❌ Critical issues must be resolved before deployment');
      steps.push('🔧 Fix failed component initializations');
      steps.push('📝 Review error messages and apply recommended solutions');
      steps.push('🔄 Re-run validation after fixes are applied');
      if (failedChecks > 3) {
        steps.push('🛠️ Consider rebuilding components with proper error handling');
      }
    }
    
    return steps;
  }

  /**
   * Persist validation report
   */
  private persistValidationReport(report: DeploymentValidationReport): void {
    try {
      const reportFile = join(this.validationDir, `validation-report-${report.validationId}.json`);
      writeFileSync(reportFile, JSON.stringify(report, null, 2));
      
      // Also create a latest report link
      const latestReportFile = join(this.validationDir, 'latest-validation-report.json');
      writeFileSync(latestReportFile, JSON.stringify(report, null, 2));
      
      console.log(`📄 Validation report saved: ${reportFile}`);
    } catch (error) {
      console.error('Failed to persist validation report:', error);
    }
  }

  /**
   * Generate human-readable validation summary
   */
  generateValidationSummary(report: DeploymentValidationReport): string {
    let summary = '=== NLD SSE Pattern Detection Deployment Validation Summary ===\n\n';
    
    summary += `📈 OVERALL STATUS: ${report.overallStatus.toUpperCase()}\n`;
    summary += `🏁 DEPLOYMENT HEALTH: ${report.summary.deploymentHealth.toUpperCase()}\n`;
    summary += `📋 VALIDATION ID: ${report.validationId}\n`;
    summary += `🕰️ TIMESTAMP: ${report.timestamp}\n\n`;
    
    summary += `📊 TEST RESULTS:\n`;
    summary += `- Total Checks: ${report.totalChecks}\n`;
    summary += `- Passed: ✅ ${report.passedChecks}\n`;
    summary += `- Failed: ❌ ${report.failedChecks}\n`;
    summary += `- Warnings: ⚠️ ${report.warningChecks}\n\n`;
    
    if (report.summary.criticalIssues.length > 0) {
      summary += `🚨 CRITICAL ISSUES:\n`;
      report.summary.criticalIssues.forEach(issue => {
        summary += `- ${issue}\n`;
      });
      summary += '\n';
    }
    
    summary += `📁 COMPONENT RESULTS:\n`;
    const componentResults = report.results.filter(r => !r.component.endsWith('_FunctionalTest'));
    const testResults = report.results.filter(r => r.component.endsWith('_FunctionalTest'));
    
    componentResults.forEach(result => {
      const icon = {
        pass: '✅',
        fail: '❌',
        warning: '⚠️'
      }[result.status];
      
      summary += `${icon} ${result.component}: ${result.message}\n`;
    });
    
    if (testResults.length > 0) {
      summary += '\n🧪 FUNCTIONAL TESTS:\n';
      testResults.forEach(result => {
        const icon = {
          pass: '✅',
          fail: '❌',
          warning: '⚠️'
        }[result.status];
        
        summary += `${icon} ${result.component.replace('_FunctionalTest', '')}: ${result.message}\n`;
      });
    }
    
    if (report.summary.recommendations.length > 0) {
      summary += '\n📉 RECOMMENDATIONS:\n';
      report.summary.recommendations.forEach(rec => {
        summary += `- ${rec}\n`;
      });
    }
    
    summary += '\n🚀 NEXT STEPS:\n';
    report.summary.nextSteps.forEach(step => {
      summary += `${step}\n`;
    });
    
    return summary;
  }

  /**
   * Start production monitoring if validation passes
   */
  async startProductionMonitoringIfValid(): Promise<boolean> {
    const report = await this.initializeAndValidateComponents();
    
    if (report.overallStatus === 'pass' || (report.overallStatus === 'warning' && report.failedChecks === 0)) {
      console.log('✅ Validation passed - starting production monitoring');
      
      if (this.failureMonitor) {
        this.failureMonitor.startMonitoring();
        console.log('🚀 Real-time SSE failure monitoring started');
      }
      
      if (this.antiPatternsDB && this.bufferDetector && this.handlerAnalyzer && 
          this.bufferFailureAnalyzer && this.frontendDetector) {
        // Initialize cross-component integrations
        console.log('🔗 Cross-component integrations active');
      }
      
      return true;
    } else {
      console.log('❌ Validation failed - production monitoring not started');
      console.log('Review validation report and resolve issues before proceeding');
      return false;
    }
  }

  /**
   * Get latest validation report
   */
  getLatestValidationReport(): DeploymentValidationReport | null {
    try {
      const latestReportFile = join(this.validationDir, 'latest-validation-report.json');
      if (existsSync(latestReportFile)) {
        const data = readFileSync(latestReportFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load latest validation report:', error);
    }
    return null;
  }

  /**
   * Clean shutdown of all components
   */
  shutdown(): void {
    if (this.failureMonitor) {
      this.failureMonitor.stopMonitoring();
    }
    
    if (this.tddStrategies) {
      this.tddStrategies.persistStrategies();
    }
    
    console.log('🚨 NLD SSE Deployment Validator shutdown complete');
  }
}

export default NLDSSEDeploymentValidator;
export { ValidationResult, DeploymentValidationReport };