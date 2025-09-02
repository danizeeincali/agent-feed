/**
 * NLD Integration Layer
 * Integrates NLD system with the main application and claude-flow
 */

import { failureDetector, FailurePattern } from '../detection/FailurePatternDetector';
import { neuralLearningSystem } from '../learning/NeuralLearningSystem';
import { tddFailurePatterns } from '../patterns/TDDFailurePatterns';
import { preventionSystem } from '../prevention/PreventionSystem';
import { resourceLeakDetector, ResourceLeakPattern } from '../detection/ResourceLeakDetector';
import { resourceLeakPrevention } from '../prevention/ResourceLeakPrevention';
import { resourceLeakPatternAnalyzer } from '../patterns/ResourceLeakPatterns';

export interface NLDIntegrationConfig {
  enableFailureDetection: boolean;
  enableLearning: boolean;
  enablePrevention: boolean;
  enableTDDAnalysis: boolean;
  claudeFlowIntegration: boolean;
  memoryNamespace: string;
  sessionId: string;
}

export interface NLDReport {
  sessionId: string;
  timestamp: number;
  totalFailures: number;
  preventedFailures: number;
  learnedPatterns: number;
  tddRecommendations: string[];
  effectivenessScore: number;
  stats: {
    detection: any;
    learning: any;
    prevention: any;
    tdd: any;
  };
}

export class NLDIntegration {
  private config: NLDIntegrationConfig;
  private isInitialized = false;
  private claudeFlowMemoryKey = 'nld-integration';

  constructor(config: Partial<NLDIntegrationConfig> = {}) {
    this.config = {
      enableFailureDetection: true,
      enableLearning: true,
      enablePrevention: true,
      enableTDDAnalysis: true,
      claudeFlowIntegration: true,
      memoryNamespace: 'nld-patterns',
      sessionId: `nld_${Date.now()}`,
      ...config
    };
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('Initializing NLD Integration System...');

    try {
      // Initialize failure detection if enabled
      if (this.config.enableFailureDetection) {
        this.initializeFailureDetection();
      }

      // Initialize learning system if enabled
      if (this.config.enableLearning) {
        this.initializeLearningSystem();
      }

      // Initialize prevention system if enabled
      if (this.config.enablePrevention) {
        this.initializePreventionSystem();
      }

      // Initialize TDD analysis if enabled
      if (this.config.enableTDDAnalysis) {
        this.initializeTDDAnalysis();
      }

      // Initialize Claude Flow integration if enabled
      if (this.config.claudeFlowIntegration) {
        await this.initializeClaudeFlowIntegration();
      }

      this.isInitialized = true;
      console.log('NLD Integration System initialized successfully');

      // Start periodic reporting
      this.startPeriodicReporting();

    } catch (error) {
      console.error('Failed to initialize NLD Integration System:', error);
      throw error;
    }
  }

  private initializeFailureDetection(): void {
    console.log('Initializing NLD Failure Detection...');
    
    // The failure detector is already a singleton and auto-initializes
    // We just need to ensure it's properly configured
    failureDetector.clearPatterns(); // Start fresh for this session
    
    console.log('NLD Failure Detection initialized');
  }

  private initializeLearningSystem(): void {
    console.log('Initializing NLD Learning System...');
    
    // Set up learning triggers
    this.setupLearningTriggers();
    
    console.log('NLD Learning System initialized');
  }

  private initializePreventionSystem(): void {
    console.log('Initializing NLD Prevention System...');
    
    // The prevention system is already initialized as singleton
    preventionSystem.setActive(true);
    
    console.log('NLD Prevention System initialized');
  }

  private initializeTDDAnalysis(): void {
    console.log('Initializing NLD TDD Analysis...');
    
    // TDD patterns system is already a singleton
    console.log('NLD TDD Analysis initialized');
  }

  private async initializeClaudeFlowIntegration(): Promise<void> {
    console.log('Initializing Claude Flow Integration...');

    try {
      // Store integration info in claude-flow memory
      const integrationData = {
        sessionId: this.config.sessionId,
        config: this.config,
        initialized: true,
        timestamp: Date.now()
      };

      // In a real implementation, this would use the claude-flow MCP tools
      localStorage.setItem(`claude_flow_${this.claudeFlowMemoryKey}`, JSON.stringify(integrationData));
      
      console.log('Claude Flow Integration initialized');
    } catch (error) {
      console.warn('Claude Flow integration failed, continuing without it:', error);
    }
  }

  private setupLearningTriggers(): void {
    // Set up automatic learning from detected failures
    const originalCapturePattern = failureDetector.capturePattern;
    
    // Override the capture method to trigger learning
    (failureDetector as any).capturePattern = (pattern: FailurePattern) => {
      // Call original method
      originalCapturePattern.call(failureDetector, pattern);
      
      // Trigger learning
      if (this.config.enableLearning) {
        neuralLearningSystem.learnFromFailure(pattern);
      }
      
      // Trigger TDD analysis
      if (this.config.enableTDDAnalysis) {
        tddFailurePatterns.analyzeTDDFailure(pattern);
      }
      
      // Send to claude-flow if enabled
      if (this.config.claudeFlowIntegration) {
        this.sendToClaudeFlow(pattern);
      }
    };
  }

  private async sendToClaudeFlow(pattern: FailurePattern): Promise<void> {
    try {
      // In a real implementation, this would use the claude-flow neural training tools
      const trainingData = {
        pattern,
        sessionId: this.config.sessionId,
        timestamp: Date.now(),
        patternType: 'failure_pattern'
      };

      // Store in localStorage for now (in real implementation, use claude-flow MCP tools)
      const existingData = JSON.parse(localStorage.getItem('claude_flow_training_data') || '[]');
      existingData.push(trainingData);
      
      // Keep only last 1000 patterns
      const trimmedData = existingData.slice(-1000);
      localStorage.setItem('claude_flow_training_data', JSON.stringify(trimmedData));

      console.debug('Sent failure pattern to Claude Flow:', pattern.id);
    } catch (error) {
      console.warn('Failed to send pattern to Claude Flow:', error);
    }
  }

  public async captureUserFailureFeedback(
    feedback: string,
    originalTask: string,
    claudeSolution: string,
    userSuccess: boolean
  ): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    // Create failure pattern from user feedback
    const pattern: FailurePattern = {
      id: failureDetector.generateId(),
      type: 'user_interaction',
      context: {
        component: 'user_feedback',
        action: 'failure_report',
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        sessionId: this.config.sessionId
      },
      error: {
        message: `User reported: ${feedback}`
      },
      userFeedback: {
        trigger: feedback,
        confidence: this.calculateFeedbackConfidence(feedback, originalTask, claudeSolution),
        originalTask,
        claudeSolution
      }
    };

    // Process the pattern through the system
    failureDetector.capturePattern(pattern);

    // Calculate effectiveness score
    if (this.config.enableLearning) {
      const effectivenessScore = neuralLearningSystem.calculateEffectivenessScore(
        pattern.id,
        userSuccess ? 1.0 : 0.0,
        0.8, // Assume Claude confidence of 0.8
        {
          wasUsed: this.detectTDDUsage(claudeSolution),
          testCoverage: this.estimateTestCoverage(claudeSolution),
          testQuality: this.estimateTestQuality(claudeSolution),
          failurePreventionScore: userSuccess ? 1.0 : 0.3
        }
      );

      console.log('NLD Effectiveness Score:', effectivenessScore);
    }
  }

  private calculateFeedbackConfidence(
    feedback: string,
    originalTask: string,
    claudeSolution: string
  ): number {
    let confidence = 0.5;

    // Increase confidence for explicit failure indicators
    const failureKeywords = ['failed', 'broken', 'error', "didn't work", 'not working'];
    const foundKeywords = failureKeywords.filter(keyword => 
      feedback.toLowerCase().includes(keyword)
    );
    confidence += foundKeywords.length * 0.15;

    // Increase confidence if feedback is detailed
    if (feedback.length > 50) confidence += 0.1;
    if (feedback.includes('expected') || feedback.includes('should')) confidence += 0.1;

    // Increase confidence if task and solution context are provided
    if (originalTask && claudeSolution) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private detectTDDUsage(solution: string): boolean {
    const tddKeywords = ['test', 'spec', 'describe', 'it(', 'expect', 'assert', 'mock'];
    return tddKeywords.some(keyword => solution.toLowerCase().includes(keyword));
  }

  private estimateTestCoverage(solution: string): number {
    // Simple heuristic to estimate test coverage
    const codeLines = solution.split('\n').filter(line => 
      line.trim() && !line.trim().startsWith('//')
    ).length;
    
    const testLines = solution.split('\n').filter(line => 
      line.includes('test') || line.includes('spec') || 
      line.includes('expect') || line.includes('assert')
    ).length;

    if (codeLines === 0) return 0;
    return Math.min(testLines / codeLines, 1.0);
  }

  private estimateTestQuality(solution: string): number {
    let quality = 0.5;

    // Check for good testing practices
    if (solution.includes('describe') && solution.includes('it(')) quality += 0.2;
    if (solution.includes('beforeEach') || solution.includes('afterEach')) quality += 0.1;
    if (solution.includes('mock') || solution.includes('spy')) quality += 0.1;
    if (solution.includes('expect(')) quality += 0.1;

    return Math.min(quality, 1.0);
  }

  private startPeriodicReporting(): void {
    // Generate reports every 5 minutes
    setInterval(() => {
      this.generateReport();
    }, 300000);

    // Also generate initial report
    setTimeout(() => {
      this.generateReport();
    }, 10000);
  }

  public async generateReport(): Promise<NLDReport> {
    if (!this.isInitialized) await this.initialize();

    const failures = failureDetector.getPatterns();
    const preventionStats = preventionSystem.getPreventionStats();
    const learningStats = neuralLearningSystem.getLearningStats();
    const tddStats = tddFailurePatterns.getTDDStats();

    const report: NLDReport = {
      sessionId: this.config.sessionId,
      timestamp: Date.now(),
      totalFailures: failures.length,
      preventedFailures: preventionStats.successfulPreventions,
      learnedPatterns: learningStats.totalPatterns,
      tddRecommendations: this.generateTDDRecommendations(failures),
      effectivenessScore: this.calculateOverallEffectiveness(preventionStats, learningStats),
      stats: {
        detection: {
          totalPatterns: failures.length,
          patternsByType: failures.reduce((acc, p) => {
            acc[p.type] = (acc[p.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          userReportedFailures: failures.filter(p => p.userFeedback).length
        },
        learning: learningStats,
        prevention: preventionStats,
        tdd: tddStats
      }
    };

    // Store report
    this.storeReport(report);

    // Send to claude-flow if enabled
    if (this.config.claudeFlowIntegration) {
      await this.sendReportToClaudeFlow(report);
    }

    console.log('Generated NLD Report:', report);
    return report;
  }

  private generateTDDRecommendations(failures: FailurePattern[]): string[] {
    const recommendations: string[] = [];

    // Analyze failure patterns for TDD recommendations
    const tddPreventableFailures = failures.filter(f => 
      f.type === 'component_lifecycle' || 
      f.type === 'ui_state' || 
      f.type === 'api_call' ||
      f.error.message.includes('undefined') ||
      f.error.message.includes('null')
    );

    if (tddPreventableFailures.length > 0) {
      recommendations.push(`${tddPreventableFailures.length} failures could have been prevented with TDD`);
    }

    const userReportedFailures = failures.filter(f => f.userFeedback).length;
    if (userReportedFailures > 0) {
      recommendations.push(`${userReportedFailures} user-reported failures suggest inadequate testing`);
    }

    const apiFailures = failures.filter(f => f.type === 'api_call').length;
    if (apiFailures > 0) {
      recommendations.push(`${apiFailures} API failures suggest need for better integration testing`);
    }

    const componentFailures = failures.filter(f => f.type === 'component_lifecycle').length;
    if (componentFailures > 0) {
      recommendations.push(`${componentFailures} component failures suggest need for component testing`);
    }

    return recommendations;
  }

  private calculateOverallEffectiveness(preventionStats: any, learningStats: any): number {
    const preventionRate = preventionStats.totalPreventions > 0 ? 
      preventionStats.successfulPreventions / preventionStats.totalPreventions : 0;
    
    const learningRate = learningStats.totalPatterns > 0 ? 
      learningStats.averagePreventionProbability : 0;

    return (preventionRate + learningRate) / 2;
  }

  private storeReport(report: NLDReport): void {
    try {
      const reports = JSON.parse(localStorage.getItem('nld_reports') || '[]');
      reports.push(report);
      
      // Keep only last 50 reports
      const trimmedReports = reports.slice(-50);
      localStorage.setItem('nld_reports', JSON.stringify(trimmedReports));
    } catch (error) {
      console.warn('Failed to store NLD report:', error);
    }
  }

  private async sendReportToClaudeFlow(report: NLDReport): Promise<void> {
    try {
      // In real implementation, this would use claude-flow MCP tools
      const reportData = {
        type: 'nld_report',
        report,
        sessionId: this.config.sessionId,
        timestamp: Date.now()
      };

      localStorage.setItem(`claude_flow_report_${report.timestamp}`, JSON.stringify(reportData));
      console.debug('Sent NLD report to Claude Flow');
    } catch (error) {
      console.warn('Failed to send report to Claude Flow:', error);
    }
  }

  // Wrapper methods for integrating with existing components
  public wrapWithFailureDetection<T extends (...args: any[]) => any>(
    component: string,
    action: string,
    fn: T
  ): T {
    return (async (...args: any[]) => {
      try {
        // Apply prevention if enabled
        if (this.config.enablePrevention) {
          return await preventionSystem.preventFailure(component, action, { args }, () => fn(...args));
        } else {
          return await fn(...args);
        }
      } catch (error) {
        // Capture failure
        failureDetector.detectComponentFailure(component, action, error as Error);
        throw error;
      }
    }) as T;
  }

  public wrapAPICall<T extends (...args: any[]) => Promise<any>>(
    endpoint: string,
    fn: T
  ): T {
    return (async (...args: any[]) => {
      try {
        if (this.config.enablePrevention) {
          return await preventionSystem.preventFailure('API', endpoint, { args }, () => fn(...args));
        } else {
          return await fn(...args);
        }
      } catch (error) {
        failureDetector.detectAPIFailure(`API call to ${endpoint} failed: ${error.message}`);
        throw error;
      }
    }) as T;
  }

  public wrapSSEConnection(url: string, options?: EventSourceInit): EventSource {
    try {
      const eventSource = new EventSource(url, options);
      
      // Wrap error handler
      const originalOnError = eventSource.onerror;
      eventSource.onerror = (event) => {
        failureDetector.detectSSEFailure(`SSE connection to ${url} failed`);
        if (originalOnError) originalOnError.call(eventSource, event);
      };

      return eventSource;
    } catch (error) {
      failureDetector.detectSSEFailure(`Failed to create SSE connection to ${url}: ${error.message}`);
      throw error;
    }
  }

  // Configuration methods
  public updateConfig(newConfig: Partial<NLDIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update subsystem states based on new config
    if (!newConfig.enablePrevention) {
      preventionSystem.setActive(false);
    } else if (newConfig.enablePrevention) {
      preventionSystem.setActive(true);
    }
  }

  public getConfig(): NLDIntegrationConfig {
    return { ...this.config };
  }

  public isSystemInitialized(): boolean {
    return this.isInitialized;
  }

  // Export methods for analysis and debugging
  public exportAllData(): string {
    return JSON.stringify({
      config: this.config,
      failures: failureDetector.getPatterns(),
      learningData: neuralLearningSystem.exportTrainingData(),
      preventionData: preventionSystem.exportPreventionData(),
      tddData: tddFailurePatterns.getTDDPatterns(),
      reports: JSON.parse(localStorage.getItem('nld_reports') || '[]')
    }, null, 2);
  }

  public reset(): void {
    failureDetector.clearPatterns();
    localStorage.removeItem('nld_learning_patterns');
    localStorage.removeItem('nld_training_data');
    localStorage.removeItem('nld_prevention_rules');
    localStorage.removeItem('nld_tdd_patterns');
    localStorage.removeItem('nld_reports');
    this.isInitialized = false;
    console.log('NLD Integration System reset');
  }
}

// Global singleton instance
export const nldIntegration = new NLDIntegration();

// Auto-initialize on module load
nldIntegration.initialize().catch(error => {
  console.error('Failed to auto-initialize NLD Integration:', error);
});