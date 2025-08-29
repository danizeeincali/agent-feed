/**
 * React Hook NLD Deployment Validator
 * Validates the deployment and functionality of React Hook Side Effect pattern detection
 */

import {
  ReactHookSideEffectDetector,
  ReactHookSideEffectPattern,
  reactHookSideEffectDetector
} from './react-hook-side-effect-detector';
import {
  ReactHookNeuralTrainingDataset,
  reactHookNeuralTrainingDataset
} from './react-hook-neural-training-dataset';
import {
  ClaudeFlowNeuralExporter,
  claudeFlowNeuralExporter
} from './claude-flow-neural-exporter';
import { nldLogger } from '../utils/nld-logger';

export interface ValidationResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface DeploymentValidationReport {
  validationTime: Date;
  overallStatus: 'passed' | 'failed' | 'warning';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: ValidationResult[];
  performance: {
    detectionLatency: number;
    trainingDataGeneration: number;
    exportTime: number;
  };
  recommendations: string[];
}

export class ReactHookNLDDeploymentValidator {
  private results: ValidationResult[] = [];

  constructor() {
    nldLogger.renderAttempt('ReactHookNLDDeploymentValidator', 'initialization');
  }

  /**
   * Run comprehensive validation of NLD deployment
   */
  public async validateDeployment(): Promise<DeploymentValidationReport> {
    try {
      nldLogger.renderAttempt('ReactHookNLDDeploymentValidator', 'deployment-validation-start');

      this.results = [];

      // Core functionality tests
      await this.validatePatternDetector();
      await this.validateTrainingDataset();
      await this.validateNeuralExporter();

      // Integration tests
      await this.validateEndToEndWorkflow();
      await this.validatePerformance();

      // Real-world pattern tests
      await this.validateRealWorldPatterns();

      // Generate report
      const report = this.generateValidationReport();

      nldLogger.renderSuccess('ReactHookNLDDeploymentValidator', 'deployment-validation-complete', {
        overallStatus: report.overallStatus,
        passedTests: report.passedTests,
        totalTests: report.totalTests
      });

      return report;
    } catch (error) {
      nldLogger.renderFailure('ReactHookNLDDeploymentValidator', error as Error);
      throw error;
    }
  }

  /**
   * Validate pattern detector functionality
   */
  private async validatePatternDetector(): Promise<void> {
    // Test 1: Basic pattern detection
    try {
      const pattern = reactHookSideEffectDetector.detectSideEffectPattern(
        'TestComponent',
        'useTestHook',
        {
          isRendering: true,
          hasUserAction: false,
          sideEffectType: 'rate-limiting',
          sourceLocation: { file: '/test/TestComponent.tsx', line: 10, column: 5 }
        }
      );

      this.addResult({
        testName: 'Pattern Detection - Basic Functionality',
        passed: pattern !== null,
        message: pattern ? 'Pattern detected successfully' : 'Pattern detection failed',
        details: { patternId: pattern?.id, severity: pattern?.severity }
      });
    } catch (error) {
      this.addResult({
        testName: 'Pattern Detection - Basic Functionality',
        passed: false,
        message: `Pattern detection threw error: ${error}`,
        details: { error }
      });
    }

    // Test 2: Rate limiting pattern detection
    try {
      // Simulate multiple renders
      let pattern: ReactHookSideEffectPattern | null = null;
      for (let i = 0; i < 12; i++) {
        pattern = reactHookSideEffectDetector.detectSideEffectPattern(
          'RateLimitComponent',
          'useTokenCostTracking',
          {
            isRendering: true,
            hasUserAction: i % 4 === 0, // Only 1 user action per 4 renders
            sideEffectType: 'rate-limiting',
            sourceLocation: { file: '/components/TokenCostAnalytics.tsx', line: 96, column: 10 },
            metadata: { renderCycle: i }
          }
        );
      }

      const rateLimitDetected = pattern && pattern.rateLimitingTriggered;
      this.addResult({
        testName: 'Pattern Detection - Rate Limiting',
        passed: rateLimitDetected || false,
        message: rateLimitDetected ? 'Rate limiting pattern detected correctly' : 'Rate limiting pattern not detected',
        details: { 
          patternDetected: !!pattern,
          rateLimitTriggered: rateLimitDetected,
          renderToActionRatio: pattern?.renderToActionRatio 
        }
      });
    } catch (error) {
      this.addResult({
        testName: 'Pattern Detection - Rate Limiting',
        passed: false,
        message: `Rate limiting test failed: ${error}`,
        details: { error }
      });
    }

    // Test 3: Pattern severity classification
    try {
      const highSeverityPattern = reactHookSideEffectDetector.detectSideEffectPattern(
        'CriticalComponent',
        'useCriticalHook',
        {
          isRendering: true,
          hasUserAction: false,
          sideEffectType: 'state-mutation',
          sourceLocation: { file: '/critical/Component.tsx', line: 15, column: 8 }
        }
      );

      // Generate multiple renders to trigger high severity
      for (let i = 0; i < 15; i++) {
        reactHookSideEffectDetector.detectSideEffectPattern(
          'CriticalComponent',
          'useCriticalHook',
          {
            isRendering: true,
            hasUserAction: false,
            sideEffectType: 'state-mutation',
            sourceLocation: { file: '/critical/Component.tsx', line: 15, column: 8 }
          }
        );
      }

      const patterns = reactHookSideEffectDetector.getPatternsBySeverity('critical');
      const hasCriticalPattern = patterns.length > 0;

      this.addResult({
        testName: 'Pattern Detection - Severity Classification',
        passed: hasCriticalPattern,
        message: hasCriticalPattern ? 'Critical severity patterns detected' : 'Severity classification failed',
        details: { criticalPatterns: patterns.length }
      });
    } catch (error) {
      this.addResult({
        testName: 'Pattern Detection - Severity Classification',
        passed: false,
        message: `Severity classification test failed: ${error}`,
        details: { error }
      });
    }
  }

  /**
   * Validate training dataset generation
   */
  private async validateTrainingDataset(): Promise<void> {
    // Test 1: Training data point creation
    try {
      const patterns = reactHookSideEffectDetector.getPatterns();
      if (patterns.length > 0) {
        const trainingPoint = reactHookNeuralTrainingDataset.createTrainingDataPoint(patterns[0]);
        
        this.addResult({
          testName: 'Training Dataset - Data Point Creation',
          passed: !!trainingPoint && trainingPoint.inputFeatures && trainingPoint.outputLabels,
          message: trainingPoint ? 'Training data point created successfully' : 'Failed to create training data point',
          details: { 
            hasInputFeatures: !!trainingPoint?.inputFeatures,
            hasOutputLabels: !!trainingPoint?.outputLabels,
            preventionStrategy: trainingPoint?.outputLabels.preventionStrategy
          }
        });
      } else {
        this.addResult({
          testName: 'Training Dataset - Data Point Creation',
          passed: false,
          message: 'No patterns available for training data creation',
          details: { availablePatterns: 0 }
        });
      }
    } catch (error) {
      this.addResult({
        testName: 'Training Dataset - Data Point Creation',
        passed: false,
        message: `Training data creation failed: ${error}`,
        details: { error }
      });
    }

    // Test 2: Negative sample generation
    try {
      const negativeSamples = reactHookNeuralTrainingDataset.generateNegativeSamples(10);
      const validNegativeSamples = negativeSamples.filter(sample => 
        sample.outputLabels.isPattern === false && 
        sample.outputLabels.severity === 'low'
      );

      this.addResult({
        testName: 'Training Dataset - Negative Samples',
        passed: validNegativeSamples.length === 10,
        message: `Generated ${validNegativeSamples.length}/10 valid negative samples`,
        details: { 
          requested: 10,
          generated: negativeSamples.length,
          valid: validNegativeSamples.length
        }
      });
    } catch (error) {
      this.addResult({
        testName: 'Training Dataset - Negative Samples',
        passed: false,
        message: `Negative sample generation failed: ${error}`,
        details: { error }
      });
    }

    // Test 3: Dataset statistics
    try {
      reactHookNeuralTrainingDataset.processAllPatterns();
      const statistics = reactHookNeuralTrainingDataset.getStatistics();
      
      const hasValidStats = statistics.totalSamples > 0 && 
                           Object.keys(statistics.severityDistribution).length > 0;

      this.addResult({
        testName: 'Training Dataset - Statistics Generation',
        passed: hasValidStats,
        message: hasValidStats ? 'Training dataset statistics generated' : 'Statistics generation failed',
        details: {
          totalSamples: statistics.totalSamples,
          severityTypes: Object.keys(statistics.severityDistribution).length,
          patternTypes: Object.keys(statistics.patternDistribution).length
        }
      });
    } catch (error) {
      this.addResult({
        testName: 'Training Dataset - Statistics Generation',
        passed: false,
        message: `Statistics generation failed: ${error}`,
        details: { error }
      });
    }
  }

  /**
   * Validate neural exporter functionality
   */
  private async validateNeuralExporter(): Promise<void> {
    // Test 1: Claude-flow export format
    try {
      const exportData = reactHookNeuralTrainingDataset.exportForClaudeFlowNeural();
      
      const hasRequiredFields = exportData.metadata && 
                               exportData.trainingData && 
                               exportData.crossValidation;

      this.addResult({
        testName: 'Neural Exporter - Claude-flow Format',
        passed: hasRequiredFields,
        message: hasRequiredFields ? 'Claude-flow export format valid' : 'Export format validation failed',
        details: {
          hasMetadata: !!exportData.metadata,
          hasTrainingData: !!exportData.trainingData,
          hasCrossValidation: !!exportData.crossValidation,
          sampleCount: exportData.metadata?.sampleCount
        }
      });
    } catch (error) {
      this.addResult({
        testName: 'Neural Exporter - Claude-flow Format',
        passed: false,
        message: `Export format validation failed: ${error}`,
        details: { error }
      });
    }

    // Test 2: File export capability
    try {
      const exportedFiles = await claudeFlowNeuralExporter.exportReactHookPatterns();
      const validExports = exportedFiles.filter(file => file && file.length > 0);

      this.addResult({
        testName: 'Neural Exporter - File Export',
        passed: validExports.length >= 3, // Expect at least JSON, config, and summary files
        message: `Exported ${validExports.length} files successfully`,
        details: {
          expectedMinFiles: 3,
          actualFiles: validExports.length,
          files: exportedFiles
        }
      });
    } catch (error) {
      this.addResult({
        testName: 'Neural Exporter - File Export',
        passed: false,
        message: `File export failed: ${error}`,
        details: { error }
      });
    }
  }

  /**
   * Validate end-to-end workflow
   */
  private async validateEndToEndWorkflow(): Promise<void> {
    try {
      const startTime = Date.now();

      // Step 1: Detect patterns
      const initialPatterns = reactHookSideEffectDetector.getPatterns().length;
      
      // Add test patterns
      const testPattern = reactHookSideEffectDetector.detectSideEffectPattern(
        'WorkflowTestComponent',
        'useWorkflowTest',
        {
          isRendering: true,
          hasUserAction: false,
          sideEffectType: 'rate-limiting',
          sourceLocation: { file: '/test/workflow.tsx', line: 20, column: 3 }
        }
      );

      // Step 2: Generate training data
      reactHookNeuralTrainingDataset.processAllPatterns();
      const statistics = reactHookNeuralTrainingDataset.getStatistics();

      // Step 3: Export for claude-flow
      const exportedFiles = await claudeFlowNeuralExporter.exportReactHookPatterns();

      const endTime = Date.now();
      const workflowTime = endTime - startTime;

      const workflowSuccess = testPattern && 
                             statistics.totalSamples > 0 && 
                             exportedFiles.length > 0;

      this.addResult({
        testName: 'End-to-End Workflow',
        passed: workflowSuccess,
        message: workflowSuccess ? 'Complete workflow executed successfully' : 'Workflow validation failed',
        details: {
          patternDetected: !!testPattern,
          trainingDataGenerated: statistics.totalSamples > 0,
          filesExported: exportedFiles.length,
          executionTimeMs: workflowTime
        }
      });
    } catch (error) {
      this.addResult({
        testName: 'End-to-End Workflow',
        passed: false,
        message: `End-to-end workflow failed: ${error}`,
        details: { error }
      });
    }
  }

  /**
   * Validate performance characteristics
   */
  private async validatePerformance(): Promise<void> {
    try {
      // Test pattern detection performance
      const detectionStartTime = Date.now();
      for (let i = 0; i < 100; i++) {
        reactHookSideEffectDetector.detectSideEffectPattern(
          'PerformanceTest',
          'usePerformanceHook',
          {
            isRendering: true,
            hasUserAction: i % 10 === 0,
            sideEffectType: 'state-mutation',
            sourceLocation: { file: '/perf/test.tsx', line: i, column: 1 }
          }
        );
      }
      const detectionTime = Date.now() - detectionStartTime;

      // Test training data generation performance
      const trainingStartTime = Date.now();
      reactHookNeuralTrainingDataset.processAllPatterns();
      const trainingTime = Date.now() - trainingStartTime;

      // Performance thresholds (in milliseconds)
      const detectionThreshold = 1000; // 1 second for 100 detections
      const trainingThreshold = 5000;  // 5 seconds for training data processing

      const performanceGood = detectionTime < detectionThreshold && trainingTime < trainingThreshold;

      this.addResult({
        testName: 'Performance Validation',
        passed: performanceGood,
        message: performanceGood ? 'Performance within acceptable limits' : 'Performance below threshold',
        details: {
          detectionTimeMs: detectionTime,
          trainingTimeMs: trainingTime,
          detectionThreshold: detectionThreshold,
          trainingThreshold: trainingThreshold,
          detectionsPerSecond: Math.round(100 / (detectionTime / 1000))
        }
      });
    } catch (error) {
      this.addResult({
        testName: 'Performance Validation',
        passed: false,
        message: `Performance validation failed: ${error}`,
        details: { error }
      });
    }
  }

  /**
   * Validate real-world pattern scenarios
   */
  private async validateRealWorldPatterns(): Promise<void> {
    // Test TokenCostAnalytics pattern
    try {
      const tokenPattern = reactHookSideEffectDetector.detectSideEffectPattern(
        'TokenCostAnalytics',
        'useTokenCostTracking',
        {
          isRendering: true,
          hasUserAction: false,
          sideEffectType: 'rate-limiting',
          sourceLocation: { file: '/components/TokenCostAnalytics.tsx', line: 96, column: 10 },
          metadata: { 
            realWorldExample: true,
            description: 'Button disabled without user interaction due to render-cycle rate limiting'
          }
        }
      );

      this.addResult({
        testName: 'Real-World Pattern - TokenCostAnalytics',
        passed: !!tokenPattern,
        message: tokenPattern ? 'Real-world pattern detected successfully' : 'Failed to detect known real-world pattern',
        details: {
          patternId: tokenPattern?.id,
          severity: tokenPattern?.severity,
          symptom: tokenPattern?.symptom
        }
      });
    } catch (error) {
      this.addResult({
        testName: 'Real-World Pattern - TokenCostAnalytics',
        passed: false,
        message: `Real-world pattern validation failed: ${error}`,
        details: { error }
      });
    }
  }

  /**
   * Add validation result
   */
  private addResult(result: Omit<ValidationResult, 'timestamp'>): void {
    this.results.push({
      ...result,
      timestamp: new Date()
    });
  }

  /**
   * Generate comprehensive validation report
   */
  private generateValidationReport(): DeploymentValidationReport {
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.filter(r => !r.passed).length;
    const totalTests = this.results.length;

    const overallStatus: 'passed' | 'failed' | 'warning' = 
      failedTests === 0 ? 'passed' :
      failedTests > totalTests / 2 ? 'failed' : 'warning';

    // Extract performance metrics
    const performanceResult = this.results.find(r => r.testName === 'Performance Validation');
    const performance = {
      detectionLatency: performanceResult?.details?.detectionTimeMs || 0,
      trainingDataGeneration: performanceResult?.details?.trainingTimeMs || 0,
      exportTime: 0 // Will be updated if available
    };

    // Generate recommendations
    const recommendations = this.generateRecommendations();

    return {
      validationTime: new Date(),
      overallStatus,
      totalTests,
      passedTests,
      failedTests,
      results: this.results,
      performance,
      recommendations
    };
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedTests = this.results.filter(r => !r.passed);

    if (failedTests.length === 0) {
      recommendations.push('✅ All tests passed. NLD deployment is ready for production use.');
      recommendations.push('🚀 Consider enabling real-time pattern detection in development environment.');
    } else {
      recommendations.push(`⚠️ ${failedTests.length} tests failed. Review failures before production deployment.`);
      
      failedTests.forEach(test => {
        recommendations.push(`❌ ${test.testName}: ${test.message}`);
      });
    }

    const performanceResult = this.results.find(r => r.testName === 'Performance Validation');
    if (performanceResult && !performanceResult.passed) {
      recommendations.push('🐌 Performance optimization needed. Consider reducing pattern detection frequency.');
    }

    recommendations.push('📊 Monitor pattern detection accuracy in real-world usage.');
    recommendations.push('🔄 Regularly update training dataset with new pattern discoveries.');
    recommendations.push('🧪 Implement TDD tests for identified high-severity patterns.');

    return recommendations;
  }
}

/**
 * Run validation and export results
 */
export async function runNLDValidation(): Promise<DeploymentValidationReport> {
  const validator = new ReactHookNLDDeploymentValidator();
  return await validator.validateDeployment();
}

/**
 * Export validation report for review
 */
export async function exportValidationReport(report: DeploymentValidationReport): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `/workspaces/agent-feed/src/nld/patterns/nld-validation-report-${timestamp}.json`;
  
  try {
    const fs = await import('fs');
    fs.writeFileSync(filename, JSON.stringify(report, null, 2), 'utf8');
    
    nldLogger.renderSuccess('ReactHookNLDDeploymentValidator', 'validation-report-exported', {
      filename,
      overallStatus: report.overallStatus,
      totalTests: report.totalTests
    });
    
    return filename;
  } catch (error) {
    nldLogger.renderFailure('ReactHookNLDDeploymentValidator', error as Error);
    throw error;
  }
}