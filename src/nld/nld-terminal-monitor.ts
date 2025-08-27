/**
 * NLD Terminal Monitor
 * 
 * Main orchestrator for terminal pipe failure detection
 * Coordinates all NLD components and provides real-time monitoring
 * Integrates with existing backend systems to monitor actual Claude processes
 */

import { EventEmitter } from 'events';
import { TerminalPipeFailureDetector } from './terminal-pipe-failure-detector';
import { SSEEventFlowGapDetector } from './sse-event-flow-gap-detector';
import { TerminalAntiPatternsDatabase } from './terminal-anti-patterns-database';
import { TDDTerminalPreventionStrategies } from './tdd-terminal-prevention-strategies';
import { NeuralTrainingIntegration } from './neural-training-integration';
import * as fs from 'fs';
import * as path from 'path';

interface MonitoringSession {
  sessionId: string;
  instanceId: string;
  startTime: Date;
  processInfo: {
    pid: number;
    command: string;
    workingDirectory: string;
  };
  stats: {
    outputEvents: number;
    sseEventsSent: number;
    sseEventsReceived: number;
    failuresDetected: number;
    predictionsGenerated: number;
  };
}

interface NLDReport {
  sessionId: string;
  timestamp: string;
  summary: {
    totalFailures: number;
    criticalFailures: number;
    preventionOpportunities: number;
    neuralPredictionAccuracy: number;
  };
  detectedPatterns: Array<{
    pattern: string;
    confidence: number;
    severity: string;
    prevention: string;
  }>;
  recommendations: {
    immediateActions: string[];
    tddStrategies: string[];
    neuralInsights: string[];
  };
  effectiveness: {
    tddFactor: number;
    preventionSuccess: number;
    patternDetectionAccuracy: number;
  };
}

export class NLDTerminalMonitor extends EventEmitter {
  private pipeFailureDetector: TerminalPipeFailureDetector;
  private sseGapDetector: SSEEventFlowGapDetector;
  private antiPatternsDB: TerminalAntiPatternsDatabase;
  private tddStrategies: TDDTerminalPreventionStrategies;
  private neuralIntegration: NeuralTrainingIntegration;
  private activeSessions: Map<string, MonitoringSession> = new Map();
  private isMonitoring: boolean = false;

  constructor(private options = {
    logDirectory: '/workspaces/agent-feed/src/nld/patterns/terminal-pipe-failures',
    reportInterval: 60000, // 1 minute
    alertThreshold: 3, // Alert after 3 critical failures
    enableRealTimeAlerts: true,
    enableNeuralPrediction: true,
    autoGenerateTests: true
  }) {
    super();
    
    this.initializeComponents();
    this.setupEventHandlers();
  }

  /**
   * Initialize all NLD components
   */
  private initializeComponents(): void {
    this.pipeFailureDetector = new TerminalPipeFailureDetector({
      logDirectory: this.options.logDirectory,
      realTimeAlert: this.options.enableRealTimeAlerts
    });

    this.sseGapDetector = new SSEEventFlowGapDetector({
      logDirectory: this.options.logDirectory,
      realTimeAlert: this.options.enableRealTimeAlerts
    });

    this.antiPatternsDB = new TerminalAntiPatternsDatabase({
      logDirectory: this.options.logDirectory
    });

    this.tddStrategies = new TDDTerminalPreventionStrategies({
      logDirectory: this.options.logDirectory,
      generateTestFiles: this.options.autoGenerateTests
    });

    this.neuralIntegration = new NeuralTrainingIntegration({
      logDirectory: this.options.logDirectory,
      enablePrediction: this.options.enableNeuralPrediction
    });

    console.log('🚀 NLD Terminal Monitor initialized with all components');
  }

  /**
   * Setup event handlers between components
   */
  private setupEventHandlers(): void {
    // Pipe failure detection events
    this.pipeFailureDetector.on('criticalFailure', (failure) => {
      this.handleCriticalFailure(failure);
    });

    // SSE gap detection events
    this.sseGapDetector.on('criticalGap', (gap) => {
      this.handleSSEGap(gap);
    });

    // Neural training events
    this.neuralIntegration.on('trainingDataRecorded', (data) => {
      console.log(`🧠 Neural training data recorded: ${data.labels.failure_type}`);
    });

    // Start periodic reporting
    if (this.options.reportInterval > 0) {
      this.startPeriodicReporting();
    }
  }

  /**
   * Start monitoring a Claude instance
   */
  public startMonitoring(instanceId: string, processInfo: {
    pid: number;
    command: string;
    workingDirectory: string;
  }): string {
    const sessionId = `nld-${instanceId}-${Date.now()}`;
    
    const session: MonitoringSession = {
      sessionId,
      instanceId,
      startTime: new Date(),
      processInfo,
      stats: {
        outputEvents: 0,
        sseEventsSent: 0,
        sseEventsReceived: 0,
        failuresDetected: 0,
        predictionsGenerated: 0
      }
    };

    this.activeSessions.set(sessionId, session);
    this.isMonitoring = true;

    console.log(`📊 NLD monitoring started for instance ${instanceId}`);
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Process: ${processInfo.command} (PID: ${processInfo.pid})`);
    console.log(`   Working Directory: ${processInfo.workingDirectory}`);

    // Generate prediction for this instance
    if (this.options.enableNeuralPrediction) {
      this.generateFailurePrediction(sessionId, processInfo);
    }

    this.emit('monitoringStarted', { sessionId, instanceId, processInfo });
    return sessionId;
  }

  /**
   * Monitor real process output
   */
  public monitorProcessOutput(sessionId: string, outputData: {
    instanceId: string;
    stdout?: string;
    stderr?: string;
    pid: number;
    workingDirectory: string;
    command: string;
  }): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.stats.outputEvents++;

    // Monitor with pipe failure detector
    this.pipeFailureDetector.monitorRealProcessOutput(outputData.instanceId, {
      pid: outputData.pid,
      stdout: outputData.stdout || '',
      stderr: outputData.stderr || '',
      workingDirectory: outputData.workingDirectory,
      command: outputData.command
    });

    // Check for anti-patterns
    const output = (outputData.stdout || '') + (outputData.stderr || '');
    const detectedPatterns = this.antiPatternsDB.detectAntiPatterns(output, {
      processRunning: true,
      workingDirectory: outputData.workingDirectory
    });

    // Record patterns for neural training
    if (detectedPatterns.length > 0) {
      detectedPatterns.forEach(({ pattern, confidence }) => {
        this.neuralIntegration.recordFailurePattern(sessionId, {
          type: pattern.category,
          severity: pattern.severity,
          instanceId: outputData.instanceId,
          realProcessData: outputData,
          tddfactor: pattern.tddfactor,
          evidenceScore: confidence
        }, {
          instanceType: 'unknown', // Could be inferred
          command: outputData.command
        });
      });
    }
  }

  /**
   * Monitor frontend display output
   */
  public monitorFrontendDisplay(sessionId: string, displayData: {
    instanceId: string;
    output: string;
    workingDirectory?: string;
    responseType: 'mock' | 'real' | 'unknown';
  }): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Monitor with pipe failure detector
    this.pipeFailureDetector.monitorFrontendDisplay(displayData.instanceId, displayData);

    // Check for mock data patterns
    const detectedPatterns = this.antiPatternsDB.detectAntiPatterns(displayData.output, {
      responseType: displayData.responseType,
      workingDirectory: displayData.workingDirectory
    });

    if (detectedPatterns.length > 0) {
      session.stats.failuresDetected++;
      
      console.log(`🚨 NLD: Frontend anti-patterns detected in session ${sessionId}`);
      detectedPatterns.forEach(({ pattern, confidence }) => {
        console.log(`   - ${pattern.name} (confidence: ${confidence})`);
      });
    }
  }

  /**
   * Monitor SSE events
   */
  public monitorSSEEvent(sessionId: string, eventData: {
    instanceId: string;
    type: string;
    sent: boolean;
    received?: boolean;
    connectionId: string;
    data: any;
  }): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    if (eventData.sent) {
      session.stats.sseEventsSent++;
    }
    if (eventData.received) {
      session.stats.sseEventsReceived++;
    }

    // Monitor with SSE gap detector
    this.sseGapDetector.recordEventSent(eventData.instanceId, {
      type: eventData.type,
      data: eventData.data,
      connectionId: eventData.connectionId
    });

    if (eventData.received) {
      this.sseGapDetector.recordEventReceived(eventData.instanceId, {
        type: eventData.type,
        connectionId: eventData.connectionId
      });
    }
  }

  /**
   * Generate failure prediction for instance
   */
  private async generateFailurePrediction(sessionId: string, processInfo: any): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      const features = {
        has_real_process: true,
        process_pid_exists: processInfo.pid > 0,
        stdout_handler_attached: true, // Assume true for now
        stderr_handler_attached: true,
        working_directory_correct: processInfo.workingDirectory.startsWith('/workspaces/agent-feed')
      };

      const prediction = await this.neuralIntegration.predictFailure(features);
      session.stats.predictionsGenerated++;

      if (prediction.failure_probability > 0.7) {
        console.log(`⚠️ NLD: High failure probability for session ${sessionId}`);
        console.log(`   Predicted Type: ${prediction.predicted_failure_type}`);
        console.log(`   Probability: ${prediction.failure_probability}`);
        console.log(`   Preventive Actions:`, prediction.preventive_actions);
        
        this.emit('highFailureRisk', { sessionId, prediction });
      }

    } catch (error) {
      console.error('Failed to generate failure prediction:', error);
    }
  }

  /**
   * Handle critical failure
   */
  private handleCriticalFailure(failure: any): void {
    console.log(`🚨 NLD: Critical terminal pipe failure detected!`);
    console.log(`   Type: ${failure.failureType}`);
    console.log(`   Instance: ${failure.instanceId}`);
    console.log(`   Evidence Score: ${failure.evidenceScore}`);

    // Find related session
    const relatedSession = Array.from(this.activeSessions.values())
      .find(s => s.instanceId === failure.instanceId);

    if (relatedSession) {
      relatedSession.stats.failuresDetected++;
    }

    // Generate immediate TDD recommendations
    const strategies = this.tddStrategies.getStrategiesForFailure(failure.failureType);
    console.log(`💡 TDD Prevention Strategies:`, strategies.map(s => s.name));

    this.emit('criticalFailureDetected', { failure, strategies });
  }

  /**
   * Handle SSE event flow gaps
   */
  private handleSSEGap(gap: any): void {
    console.log(`🚨 NLD: SSE Event Flow Gap detected!`);
    console.log(`   Type: ${gap.gapType}`);
    console.log(`   Gap Size: ${gap.gapSize} events`);
    console.log(`   Affected Connections: ${gap.affectedConnections.length}`);

    this.emit('sseGapDetected', gap);
  }

  /**
   * Generate comprehensive NLD report
   */
  public generateReport(sessionId: string): NLDReport {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const pipeStats = this.pipeFailureDetector.getFailureStats();
    const gapStats = this.sseGapDetector.getGapStats();
    const antiPatternStats = this.antiPatternsDB.getStatistics();
    const neuralStats = this.neuralIntegration.getTrainingStats();

    const report: NLDReport = {
      sessionId,
      timestamp: new Date().toISOString(),
      summary: {
        totalFailures: pipeStats.totalFailures + gapStats.totalGaps,
        criticalFailures: pipeStats.bySeverity.critical || 0,
        preventionOpportunities: this.calculatePreventionOpportunities(pipeStats),
        neuralPredictionAccuracy: neuralStats.modelMetrics.accuracy
      },
      detectedPatterns: this.summarizeDetectedPatterns(pipeStats, gapStats),
      recommendations: {
        immediateActions: this.generateImmediateActions(pipeStats, gapStats),
        tddStrategies: this.generateTDDRecommendations(pipeStats),
        neuralInsights: this.generateNeuralInsights(neuralStats)
      },
      effectiveness: {
        tddFactor: pipeStats.averageTDDFactor,
        preventionSuccess: this.calculatePreventionSuccess(session),
        patternDetectionAccuracy: pipeStats.averageEvidenceScore
      }
    };

    // Save report to file
    this.saveReport(report);
    
    return report;
  }

  /**
   * Helper methods for report generation
   */
  private calculatePreventionOpportunities(stats: any): number {
    return Object.entries(stats.byType)
      .filter(([_, count]) => (count as number) > 0)
      .length;
  }

  private summarizeDetectedPatterns(pipeStats: any, gapStats: any): any[] {
    const patterns = [];
    
    for (const [type, count] of Object.entries(pipeStats.byType)) {
      if ((count as number) > 0) {
        patterns.push({
          pattern: type,
          confidence: 0.8, // Simplified
          severity: 'medium',
          prevention: `TDD strategies available for ${type}`
        });
      }
    }

    for (const [type, count] of Object.entries(gapStats.byType)) {
      if ((count as number) > 0) {
        patterns.push({
          pattern: `sse_${type}`,
          confidence: 0.7,
          severity: 'high',
          prevention: `Event flow monitoring for ${type}`
        });
      }
    }

    return patterns;
  }

  private generateImmediateActions(pipeStats: any, gapStats: any): string[] {
    const actions = [];

    if (pipeStats.bySeverity.critical > 0) {
      actions.push('Review critical pipe connection failures immediately');
    }

    if (gapStats.averageGapSize > 10) {
      actions.push('Investigate SSE event delivery issues');
    }

    if (pipeStats.byType.mock_data_detected > 0) {
      actions.push('Remove mock data from production terminal displays');
    }

    return actions;
  }

  private generateTDDRecommendations(pipeStats: any): string[] {
    const recommendations = [];

    if (pipeStats.averageTDDFactor < 0.7) {
      recommendations.push('Increase TDD coverage for terminal pipe functionality');
    }

    recommendations.push('Implement contract tests for process output validation');
    recommendations.push('Add integration tests for SSE event flow');

    return recommendations;
  }

  private generateNeuralInsights(neuralStats: any): string[] {
    const insights = [];

    insights.push(`Model accuracy: ${(neuralStats.modelMetrics.accuracy * 100).toFixed(1)}%`);
    insights.push(`Training samples: ${neuralStats.totalSamples}`);
    
    if (neuralStats.averageTDDFactor > 0.8) {
      insights.push('High TDD factor indicates good prevention potential');
    }

    return insights;
  }

  private calculatePreventionSuccess(session: MonitoringSession): number {
    if (session.stats.failuresDetected === 0) return 1.0;
    return 1.0 - (session.stats.failuresDetected / session.stats.outputEvents);
  }

  /**
   * Save report to file
   */
  private saveReport(report: NLDReport): void {
    const reportPath = path.join(
      this.options.logDirectory, 
      `nld-report-${report.sessionId}-${Date.now()}.json`
    );
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📋 NLD report saved: ${reportPath}`);
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting(): void {
    setInterval(() => {
      this.activeSessions.forEach((session, sessionId) => {
        try {
          const report = this.generateReport(sessionId);
          this.emit('periodicReport', report);
        } catch (error) {
          console.error(`Failed to generate periodic report for ${sessionId}:`, error);
        }
      });
    }, this.options.reportInterval);
  }

  /**
   * Stop monitoring a session
   */
  public stopMonitoring(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Generate final report
    const finalReport = this.generateReport(sessionId);
    
    // Cleanup
    this.pipeFailureDetector.cleanup(session.instanceId);
    this.sseGapDetector.cleanup(session.instanceId);
    this.activeSessions.delete(sessionId);

    console.log(`📊 NLD monitoring stopped for session ${sessionId}`);
    this.emit('monitoringStopped', { sessionId, finalReport });
  }

  /**
   * Get current monitoring status
   */
  public getStatus(): {
    isMonitoring: boolean;
    activeSessions: number;
    totalFailures: number;
    totalPredictions: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
  } {
    const totalFailures = Array.from(this.activeSessions.values())
      .reduce((sum, s) => sum + s.stats.failuresDetected, 0);

    const totalPredictions = Array.from(this.activeSessions.values())
      .reduce((sum, s) => sum + s.stats.predictionsGenerated, 0);

    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (totalFailures > 10) systemHealth = 'critical';
    else if (totalFailures > 3) systemHealth = 'warning';

    return {
      isMonitoring: this.isMonitoring,
      activeSessions: this.activeSessions.size,
      totalFailures,
      totalPredictions,
      systemHealth
    };
  }

  /**
   * Export all NLD data for analysis
   */
  public exportData(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      activeSessions: Object.fromEntries(this.activeSessions),
      pipeFailureStats: this.pipeFailureDetector.getFailureStats(),
      sseGapStats: this.sseGapDetector.getGapStats(),
      antiPatternStats: this.antiPatternsDB.getStatistics(),
      neuralStats: this.neuralIntegration.getTrainingStats(),
      status: this.getStatus()
    };

    const exportPath = path.join(this.options.logDirectory, `nld-export-${Date.now()}.json`);
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
    
    console.log(`📦 NLD data exported: ${exportPath}`);
    return exportPath;
  }
}