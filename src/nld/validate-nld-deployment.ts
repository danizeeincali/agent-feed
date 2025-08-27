/**
 * NLD System Deployment Validation
 * 
 * Comprehensive validation suite to ensure NLD terminal monitoring system 
 * is properly deployed and functioning correctly
 */

import { NLDTerminalMonitor } from './nld-terminal-monitor';
import { TerminalPipeFailureDetector } from './terminal-pipe-failure-detector';
import { SSEEventFlowGapDetector } from './sse-event-flow-gap-detector';
import { TerminalAntiPatternsDatabase } from './terminal-anti-patterns-database';
import { TDDTerminalPreventionStrategies } from './tdd-terminal-prevention-strategies';
import { NeuralTrainingIntegration } from './neural-training-integration';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  component: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

interface ValidationReport {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'critical';
  validationResults: ValidationResult[];
  systemStats: {
    componentsHealthy: number;
    totalComponents: number;
    criticalIssues: number;
    warnings: number;
  };
  recommendations: string[];
}

export class NLDDeploymentValidator {
  private validationResults: ValidationResult[] = [];
  private logDirectory: string;

  constructor(logDirectory = '/workspaces/agent-feed/src/nld/patterns/terminal-pipe-failures') {
    this.logDirectory = logDirectory;
  }

  /**
   * Run comprehensive validation of NLD system
   */
  public async validateDeployment(): Promise<ValidationReport> {
    console.log('🔍 Starting NLD system deployment validation...\n');
    
    this.validationResults = [];

    // Component validation tests
    await this.validateDirectoryStructure();
    await this.validateComponentInitialization();
    await this.validateAntiPatternsDatabase();
    await this.validateTerminalPipeDetection();
    await this.validateSSEEventFlowDetection();
    await this.validateTDDStrategies();
    await this.validateNeuralIntegration();
    await this.validateMainMonitor();
    await this.validateIntegrationFlow();

    // Generate final report
    const report = this.generateValidationReport();
    await this.saveValidationReport(report);

    return report;
  }

  /**
   * Validate directory structure and permissions
   */
  private async validateDirectoryStructure(): Promise<void> {
    console.log('📁 Validating directory structure...');

    const requiredDirectories = [
      this.logDirectory,
      path.join(this.logDirectory, '../'),
      '/workspaces/agent-feed/neural-exports'
    ];

    for (const dir of requiredDirectories) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Check write permissions
        const testFile = path.join(dir, 'test-write.tmp');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);

        this.addResult('DirectoryStructure', 'pass', `Directory accessible: ${dir}`);
      } catch (error) {
        this.addResult('DirectoryStructure', 'fail', 
          `Directory not accessible: ${dir}`, { error: error.message });
      }
    }
  }

  /**
   * Validate component initialization
   */
  private async validateComponentInitialization(): Promise<void> {
    console.log('🚀 Validating component initialization...');

    try {
      // Test TerminalPipeFailureDetector
      const pipeDetector = new TerminalPipeFailureDetector({
        logDirectory: this.logDirectory,
        realTimeAlert: false // Disable alerts during testing
      });
      this.addResult('PipeDetector', 'pass', 'TerminalPipeFailureDetector initialized');

      // Test SSEEventFlowGapDetector
      const sseDetector = new SSEEventFlowGapDetector({
        logDirectory: this.logDirectory,
        realTimeAlert: false
      });
      this.addResult('SSEDetector', 'pass', 'SSEEventFlowGapDetector initialized');

      // Test AntiPatternsDatabase
      const antiPatternsDB = new TerminalAntiPatternsDatabase({
        logDirectory: this.logDirectory
      });
      const dbStats = antiPatternsDB.getStatistics();
      if (dbStats.totalPatterns > 0) {
        this.addResult('AntiPatternsDB', 'pass', 
          `AntiPatternsDatabase initialized with ${dbStats.totalPatterns} patterns`);
      } else {
        this.addResult('AntiPatternsDB', 'fail', 
          'AntiPatternsDatabase has no patterns loaded');
      }

      // Test TDD Prevention Strategies
      const tddStrategies = new TDDTerminalPreventionStrategies({
        logDirectory: this.logDirectory,
        generateTestFiles: false // Don't generate during validation
      });
      const strategies = tddStrategies.getAllStrategies();
      if (strategies.length > 0) {
        this.addResult('TDDStrategies', 'pass', 
          `TDD strategies loaded: ${strategies.length} strategies`);
      } else {
        this.addResult('TDDStrategies', 'fail', 'No TDD strategies loaded');
      }

      // Test Neural Integration
      const neuralIntegration = new NeuralTrainingIntegration({
        logDirectory: this.logDirectory,
        enablePrediction: true
      });
      this.addResult('NeuralIntegration', 'pass', 'NeuralTrainingIntegration initialized');

    } catch (error) {
      this.addResult('ComponentInit', 'fail', 
        'Component initialization failed', { error: error.message });
    }
  }

  /**
   * Validate anti-patterns database functionality
   */
  private async validateAntiPatternsDatabase(): Promise<void> {
    console.log('🗃️ Validating anti-patterns database...');

    try {
      const antiPatternsDB = new TerminalAntiPatternsDatabase({
        logDirectory: this.logDirectory
      });

      // Test mock data detection
      const mockOutput = 'HTTP/SSE mode active - WebSocket eliminated!';
      const mockPatterns = antiPatternsDB.detectAntiPatterns(mockOutput);
      
      if (mockPatterns.length > 0 && mockPatterns[0].pattern.category === 'mock_data') {
        this.addResult('MockDetection', 'pass', 
          `Mock data pattern detected correctly: ${mockPatterns[0].pattern.name}`);
      } else {
        this.addResult('MockDetection', 'fail', 
          'Failed to detect mock data patterns');
      }

      // Test hardcoded response detection
      const hardcodedOutput = 'total 8\\ndrwxr-xr-x 2 claude claude 4096';
      const hardcodedPatterns = antiPatternsDB.detectAntiPatterns(hardcodedOutput);
      
      if (hardcodedPatterns.length > 0) {
        this.addResult('HardcodedDetection', 'pass', 
          `Hardcoded pattern detected: ${hardcodedPatterns[0].pattern.name}`);
      } else {
        this.addResult('HardcodedDetection', 'warning', 
          'Hardcoded pattern detection may need tuning');
      }

      // Test database statistics
      const stats = antiPatternsDB.getStatistics();
      if (stats.totalPatterns >= 5) { // Should have at least 5 main patterns
        this.addResult('DBCompleteness', 'pass', 
          `Database contains ${stats.totalPatterns} patterns across ${Object.keys(stats.byCategory).length} categories`);
      } else {
        this.addResult('DBCompleteness', 'warning', 
          'Database may be incomplete - fewer patterns than expected');
      }

    } catch (error) {
      this.addResult('AntiPatternsValidation', 'fail', 
        'Anti-patterns database validation failed', { error: error.message });
    }
  }

  /**
   * Validate terminal pipe failure detection
   */
  private async validateTerminalPipeDetection(): Promise<void> {
    console.log('🔍 Validating terminal pipe failure detection...');

    try {
      const detector = new TerminalPipeFailureDetector({
        logDirectory: this.logDirectory,
        realTimeAlert: false
      });

      // Test real process output monitoring
      detector.monitorRealProcessOutput('test-instance', {
        pid: 12345,
        stdout: 'Claude Code\\nWorking directory: /workspaces/agent-feed\\n$ ',
        stderr: '',
        workingDirectory: '/workspaces/agent-feed',
        command: 'claude'
      });

      // Test frontend display monitoring with mock data
      detector.monitorFrontendDisplay('test-instance', {
        output: 'HTTP/SSE mode active - WebSocket eliminated!',
        workingDirectory: '/mock/directory',
        responseType: 'mock'
      });

      // Check if failure was detected
      await new Promise(resolve => setTimeout(resolve, 100)); // Allow detection to process

      const stats = detector.getFailureStats();
      if (stats.totalFailures > 0) {
        this.addResult('PipeFailureDetection', 'pass', 
          `Pipe failure detection working: ${stats.totalFailures} failures detected`);
      } else {
        this.addResult('PipeFailureDetection', 'warning', 
          'Pipe failure detection may not be triggering correctly');
      }

      detector.cleanup('test-instance');

    } catch (error) {
      this.addResult('PipeDetectionValidation', 'fail', 
        'Terminal pipe detection validation failed', { error: error.message });
    }
  }

  /**
   * Validate SSE event flow detection
   */
  private async validateSSEEventFlowDetection(): Promise<void> {
    console.log('📡 Validating SSE event flow detection...');

    try {
      const detector = new SSEEventFlowGapDetector({
        logDirectory: this.logDirectory,
        realTimeAlert: false
      });

      const instanceId = 'test-sse-instance';
      const connectionId = 'test-connection';

      // Simulate sending events without receiving them (should detect gap)
      for (let i = 0; i < 5; i++) {
        detector.recordEventSent(instanceId, {
          type: 'output',
          data: `test-output-${i}`,
          connectionId
        });
      }

      // Only receive some events (create gap)
      detector.recordEventReceived(instanceId, {
        type: 'output',
        connectionId
      });

      // Allow gap detection to run
      await new Promise(resolve => setTimeout(resolve, 1100)); // Wait for detection interval

      const stats = detector.getGapStats();
      if (stats.totalGaps > 0) {
        this.addResult('SSEGapDetection', 'pass', 
          `SSE gap detection working: ${stats.totalGaps} gaps detected`);
      } else {
        this.addResult('SSEGapDetection', 'warning', 
          'SSE gap detection may need adjustment');
      }

      detector.cleanup(instanceId);

    } catch (error) {
      this.addResult('SSEDetectionValidation', 'fail', 
        'SSE event flow detection validation failed', { error: error.message });
    }
  }

  /**
   * Validate TDD prevention strategies
   */
  private async validateTDDStrategies(): Promise<void> {
    console.log('🛡️ Validating TDD prevention strategies...');

    try {
      const strategies = new TDDTerminalPreventionStrategies({
        logDirectory: this.logDirectory,
        generateTestFiles: false
      });

      // Test strategy retrieval for different failure patterns
      const mockDataStrategies = strategies.getStrategiesForFailure('mock_data_detected');
      const pipeFailureStrategies = strategies.getStrategiesForFailure('broken_pipe');

      if (mockDataStrategies.length > 0) {
        this.addResult('TDDMockStrategies', 'pass', 
          `Mock data prevention strategies: ${mockDataStrategies.length} strategies`);
      } else {
        this.addResult('TDDMockStrategies', 'fail', 
          'No strategies found for mock data prevention');
      }

      if (pipeFailureStrategies.length > 0) {
        this.addResult('TDDPipeStrategies', 'pass', 
          `Pipe failure prevention strategies: ${pipeFailureStrategies.length} strategies`);
      } else {
        this.addResult('TDDPipeStrategies', 'fail', 
          'No strategies found for pipe failure prevention');
      }

      // Test code generation
      const testCode = strategies.generateTestCode('mock_data_detected');
      if (testCode.length > 100 && !testCode.includes('No prevention strategies')) {
        this.addResult('TDDCodeGeneration', 'pass', 
          'TDD test code generation working');
      } else {
        this.addResult('TDDCodeGeneration', 'fail', 
          'TDD test code generation not working properly');
      }

    } catch (error) {
      this.addResult('TDDValidation', 'fail', 
        'TDD strategies validation failed', { error: error.message });
    }
  }

  /**
   * Validate neural training integration
   */
  private async validateNeuralIntegration(): Promise<void> {
    console.log('🧠 Validating neural training integration...');

    try {
      const neuralIntegration = new NeuralTrainingIntegration({
        logDirectory: this.logDirectory,
        enablePrediction: true
      });

      // Test failure pattern recording
      neuralIntegration.recordFailurePattern('test-session', {
        type: 'mock_data_detected',
        severity: 'high',
        instanceId: 'test-neural-instance',
        tddfactor: 0.8,
        evidenceScore: 0.9
      }, {
        instanceType: 'test',
        command: 'pwd'
      });

      // Test prediction generation
      const prediction = await neuralIntegration.predictFailure({
        output_contains_mock_patterns: true,
        has_real_process: false,
        working_directory_correct: false
      });

      if (prediction.failure_probability > 0 && prediction.predicted_failure_type !== 'unknown') {
        this.addResult('NeuralPrediction', 'pass', 
          `Neural prediction working: ${prediction.failure_probability} probability for ${prediction.predicted_failure_type}`);
      } else {
        this.addResult('NeuralPrediction', 'warning', 
          'Neural prediction may need improvement');
      }

      // Test training statistics
      const stats = neuralIntegration.getTrainingStats();
      if (stats.totalSamples > 0) {
        this.addResult('NeuralTrainingData', 'pass', 
          `Neural training data recorded: ${stats.totalSamples} samples`);
      } else {
        this.addResult('NeuralTrainingData', 'warning', 
          'No neural training data recorded yet');
      }

    } catch (error) {
      this.addResult('NeuralValidation', 'fail', 
        'Neural training integration validation failed', { error: error.message });
    }
  }

  /**
   * Validate main NLD monitor
   */
  private async validateMainMonitor(): Promise<void> {
    console.log('📊 Validating main NLD monitor...');

    try {
      const monitor = new NLDTerminalMonitor({
        logDirectory: this.logDirectory,
        reportInterval: 0, // Disable periodic reports during testing
        enableRealTimeAlerts: false,
        enableNeuralPrediction: true
      });

      // Test monitoring start
      const sessionId = monitor.startMonitoring('test-monitor-instance', {
        pid: 99999,
        command: 'claude --test',
        workingDirectory: '/workspaces/agent-feed'
      });

      if (sessionId) {
        this.addResult('MonitorStart', 'pass', 
          `Monitor started successfully: session ${sessionId}`);
      } else {
        this.addResult('MonitorStart', 'fail', 
          'Failed to start monitoring session');
      }

      // Test process output monitoring
      monitor.monitorProcessOutput(sessionId, {
        instanceId: 'test-monitor-instance',
        stdout: 'Real Claude output',
        pid: 99999,
        workingDirectory: '/workspaces/agent-feed',
        command: 'claude --test'
      });

      // Test frontend display monitoring
      monitor.monitorFrontendDisplay(sessionId, {
        instanceId: 'test-monitor-instance',
        output: 'HTTP/SSE mode active', // Should trigger mock detection
        responseType: 'mock'
      });

      // Test status retrieval
      const status = monitor.getStatus();
      if (status.isMonitoring && status.activeSessions > 0) {
        this.addResult('MonitorStatus', 'pass', 
          `Monitor status healthy: ${status.activeSessions} active sessions`);
      } else {
        this.addResult('MonitorStatus', 'warning', 
          'Monitor status may not be updating correctly');
      }

      // Test report generation
      const report = monitor.generateReport(sessionId);
      if (report && report.timestamp) {
        this.addResult('ReportGeneration', 'pass', 
          'Report generation working');
      } else {
        this.addResult('ReportGeneration', 'fail', 
          'Report generation failed');
      }

      // Cleanup
      monitor.stopMonitoring(sessionId);

    } catch (error) {
      this.addResult('MonitorValidation', 'fail', 
        'Main monitor validation failed', { error: error.message });
    }
  }

  /**
   * Validate integration flow between components
   */
  private async validateIntegrationFlow(): Promise<void> {
    console.log('🔗 Validating integration flow...');

    try {
      // Test complete flow from detection to neural training
      const monitor = new NLDTerminalMonitor({
        logDirectory: this.logDirectory,
        reportInterval: 0,
        enableRealTimeAlerts: false,
        enableNeuralPrediction: true
      });

      let criticalFailureDetected = false;
      let neuralDataRecorded = false;

      // Set up event listeners
      monitor.on('criticalFailureDetected', () => {
        criticalFailureDetected = true;
      });

      monitor.on('monitoringStarted', () => {
        // Event handling working
      });

      const sessionId = monitor.startMonitoring('integration-test', {
        pid: 88888,
        command: 'claude --integration-test',
        workingDirectory: '/workspaces/agent-feed'
      });

      // Trigger mock data detection (should flow through all systems)
      monitor.monitorFrontendDisplay(sessionId, {
        instanceId: 'integration-test',
        output: 'HTTP/SSE mode active - WebSocket eliminated!',
        responseType: 'mock'
      });

      // Allow processing time
      await new Promise(resolve => setTimeout(resolve, 500));

      const finalReport = monitor.generateReport(sessionId);
      
      if (finalReport.summary.totalFailures > 0) {
        this.addResult('IntegrationFlow', 'pass', 
          `Integration flow working: ${finalReport.summary.totalFailures} failures detected and processed`);
      } else {
        this.addResult('IntegrationFlow', 'warning', 
          'Integration flow may need adjustment');
      }

      monitor.stopMonitoring(sessionId);

    } catch (error) {
      this.addResult('IntegrationValidation', 'fail', 
        'Integration flow validation failed', { error: error.message });
    }
  }

  /**
   * Add validation result
   */
  private addResult(component: string, status: 'pass' | 'fail' | 'warning', 
                   message: string, details?: any): void {
    this.validationResults.push({
      component,
      status,
      message,
      details
    });

    const statusIcon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${statusIcon} ${component}: ${message}`);
  }

  /**
   * Generate validation report
   */
  private generateValidationReport(): ValidationReport {
    const passed = this.validationResults.filter(r => r.status === 'pass').length;
    const failed = this.validationResults.filter(r => r.status === 'fail').length;
    const warnings = this.validationResults.filter(r => r.status === 'warning').length;

    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (failed > 0) {
      overallStatus = 'critical';
    } else if (warnings > 2) {
      overallStatus = 'degraded';
    }

    const recommendations: string[] = [];
    
    if (failed > 0) {
      recommendations.push('Address critical validation failures immediately');
    }
    if (warnings > 0) {
      recommendations.push('Review and tune warning conditions');
    }
    if (passed === this.validationResults.length) {
      recommendations.push('NLD system is ready for production deployment');
    }

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      validationResults: this.validationResults,
      systemStats: {
        componentsHealthy: passed,
        totalComponents: this.validationResults.length,
        criticalIssues: failed,
        warnings
      },
      recommendations
    };
  }

  /**
   * Save validation report
   */
  private async saveValidationReport(report: ValidationReport): Promise<void> {
    const reportPath = path.join(this.logDirectory, `nld-validation-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📋 Validation report saved: ${reportPath}`);
    console.log(`\n📊 Validation Summary:`);
    console.log(`   Overall Status: ${report.overallStatus.toUpperCase()}`);
    console.log(`   Components Healthy: ${report.systemStats.componentsHealthy}/${report.systemStats.totalComponents}`);
    console.log(`   Critical Issues: ${report.systemStats.criticalIssues}`);
    console.log(`   Warnings: ${report.systemStats.warnings}`);
    
    if (report.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:`);
      report.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
  }
}

// CLI execution
if (require.main === module) {
  const validator = new NLDDeploymentValidator();
  validator.validateDeployment()
    .then(report => {
      console.log('\n🎉 NLD system validation complete!');
      process.exit(report.overallStatus === 'critical' ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    });
}