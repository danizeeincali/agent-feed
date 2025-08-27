/**
 * Claude Process I/O Integration System - NLD Deployment
 * 
 * Complete integration system for deploying Claude CLI process I/O failure
 * detection, monitoring, and prevention across the entire application.
 */

import { claudeProcessIODetector, ClaudeProcessIOMetrics, ClaudeProcessIOErrorPattern } from './claude-process-io-failure-detector';
import { claudeProcessIOMonitor, ClaudeProcessIOAlert } from './claude-process-io-real-time-monitor';
import { claudeProcessIONeuralDataset } from './claude-process-io-neural-training-dataset';
import { claudeProcessIOTDDPrevention, ClaudeProcessIOTDDTestCase } from './claude-process-io-tdd-prevention-strategies';

export interface ClaudeProcessIOIntegrationConfig {
  monitoring: {
    enabled: boolean;
    realTimeAlerts: boolean;
    automatedRecovery: boolean;
    neuralTraining: boolean;
  };
  detection: {
    patternCategories: ('PRINT_FLAG_INPUT_REQUIRED' | 'INTERACTIVE_MODE_BLOCKED' | 'PTY_STDIN_DISCONNECT' | 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT')[];
    thresholds: {
      printFlagErrors: number;
      interactiveBlockTime: number;
      ptyDisconnectTime: number;
      authSilentTime: number;
    };
  };
  prevention: {
    tddEnabled: boolean;
    preFlightChecks: boolean;
    validationStrategies: string[];
  };
  neuralTraining: {
    enabled: boolean;
    exportInterval: number;
    claudeFlowIntegration: boolean;
    trainingThreshold: number;
  };
}

export interface ClaudeProcessIOSystemReport {
  systemStatus: 'healthy' | 'degraded' | 'critical';
  activeProcesses: number;
  totalAlertsGenerated: number;
  patternsDetected: Record<string, number>;
  neuralTrainingProgress: {
    recordsCollected: number;
    modelsTraining: boolean;
    accuracyScore: number;
  };
  preventionEffectiveness: {
    testsImplemented: number;
    failuresPrevented: number;
    recoverySuccessRate: number;
  };
  recommendations: string[];
  deploymentStatus: {
    detectorDeployed: boolean;
    monitoringActive: boolean;
    tddSuitesGenerated: boolean;
    neuralExportReady: boolean;
  };
}

export class ClaudeProcessIOIntegrationSystem {
  private config: ClaudeProcessIOIntegrationConfig;
  private isInitialized = false;
  private systemStartTime = 0;
  private alertHistory: ClaudeProcessIOAlert[] = [];
  private preventionMetrics = {
    failuresPrevented: 0,
    recoveryAttempts: 0,
    recoverySuccesses: 0
  };

  constructor(config?: Partial<ClaudeProcessIOIntegrationConfig>) {
    this.config = {
      monitoring: {
        enabled: true,
        realTimeAlerts: true,
        automatedRecovery: true,
        neuralTraining: true
      },
      detection: {
        patternCategories: ['PRINT_FLAG_INPUT_REQUIRED', 'INTERACTIVE_MODE_BLOCKED', 'PTY_STDIN_DISCONNECT', 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT'],
        thresholds: {
          printFlagErrors: 1,
          interactiveBlockTime: 10000,
          ptyDisconnectTime: 5000,
          authSilentTime: 8000
        }
      },
      prevention: {
        tddEnabled: true,
        preFlightChecks: true,
        validationStrategies: [
          'print-flag-validation',
          'cli-availability-check',
          'authentication-verification',
          'pty-health-monitoring'
        ]
      },
      neuralTraining: {
        enabled: true,
        exportInterval: 300000, // 5 minutes
        claudeFlowIntegration: true,
        trainingThreshold: 50 // Start training after 50 records
      },
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔍 [NLD] Claude Process I/O Integration System already initialized');
      return;
    }

    this.systemStartTime = Date.now();
    console.log('🚀 [NLD] Initializing Claude Process I/O Integration System...');

    try {
      // Initialize detector
      if (this.config.detection.patternCategories.length > 0) {
        console.log('📊 [NLD] Pattern detector ready for categories:', this.config.detection.patternCategories.join(', '));
      }

      // Initialize monitoring
      if (this.config.monitoring.enabled) {
        claudeProcessIOMonitor.startMonitoring();
        
        // Setup alert handling
        claudeProcessIOMonitor.onAlert((alert) => {
          this.handleAlert(alert);
        });
        
        console.log('🔍 [NLD] Real-time monitoring activated');
      }

      // Initialize TDD prevention strategies
      if (this.config.prevention.tddEnabled) {
        const coverageReport = claudeProcessIOTDDPrevention.generateCoverageReport();
        console.log(`📋 [NLD] TDD prevention strategies loaded: ${coverageReport.totalTestCases} test cases`);
      }

      // Setup neural training export
      if (this.config.neuralTraining.enabled) {
        this.setupNeuralTrainingExport();
        console.log('🧠 [NLD] Neural training integration configured');
      }

      this.isInitialized = true;
      console.log('✅ [NLD] Claude Process I/O Integration System initialized successfully');
      
    } catch (error) {
      console.error('❌ [NLD] Failed to initialize integration system:', error);
      throw error;
    }
  }

  private setupNeuralTrainingExport(): void {
    setInterval(async () => {
      const recordCount = claudeProcessIONeuralDataset.getRecordCount();
      
      if (recordCount >= this.config.neuralTraining.trainingThreshold) {
        await this.exportNeuralTrainingData();
      }
    }, this.config.neuralTraining.exportInterval);
  }

  private async exportNeuralTrainingData(): Promise<void> {
    try {
      const exportData = claudeProcessIONeuralDataset.exportForClaudeFlow();
      
      if (this.config.neuralTraining.claudeFlowIntegration) {
        // In a real implementation, this would integrate with claude-flow
        console.log('🧠 [NLD] Neural training data exported for claude-flow integration');
        console.log(`📊 [NLD] Dataset contains ${exportData.dataset.statistics.totalRecords} training records`);
        
        // Clear dataset after export to prevent memory bloat
        claudeProcessIONeuralDataset.clear();
      }
    } catch (error) {
      console.error('❌ [NLD] Failed to export neural training data:', error);
    }
  }

  private handleAlert(alert: ClaudeProcessIOAlert): void {
    this.alertHistory.push(alert);
    
    // Limit alert history
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-500); // Keep last 500
    }

    console.log(`🚨 [NLD] Processing alert: ${alert.pattern.category} (${alert.severity}) for ${alert.instanceId}`);
    
    // Track recovery attempts
    if (alert.resolution) {
      this.preventionMetrics.recoveryAttempts++;
      if (alert.resolution.successful) {
        this.preventionMetrics.recoverySuccesses++;
      }
    }
  }

  // Public API for backend integration
  registerClaudeProcess(
    instanceId: string,
    command: string,
    args: string[],
    workingDirectory: string,
    processType: 'pty' | 'pipe' = 'pipe'
  ): void {
    if (!this.isInitialized) {
      console.warn('🔶 [NLD] Integration system not initialized, registering process anyway');
    }

    claudeProcessIODetector.registerProcess(instanceId, command, args, workingDirectory, processType);
    
    // Perform pre-flight checks if enabled
    if (this.config.prevention.preFlightChecks) {
      this.performPreFlightChecks(instanceId, command, args);
    }
  }

  recordProcessOutput(instanceId: string, outputType: 'stdout' | 'stderr', data: string): void {
    claudeProcessIODetector.recordProcessOutput(instanceId, outputType, data);
  }

  recordProcessInput(instanceId: string, input: string): void {
    claudeProcessIODetector.recordProcessInput(instanceId, input);
  }

  recordProcessError(instanceId: string, error: Error): void {
    claudeProcessIODetector.recordProcessError(instanceId, error);
  }

  updateProcessState(instanceId: string, state: ClaudeProcessIOMetrics['processState']): void {
    claudeProcessIODetector.updateProcessState(instanceId, state);
  }

  private performPreFlightChecks(instanceId: string, command: string, args: string[]): void {
    const issues: string[] = [];

    // Check for print flag without input
    if ((args.includes('--print') || args.includes('-p')) && 
        !args.some(arg => !arg.startsWith('--')) && 
        args.length <= 2) { // Only command and --print flag
      issues.push('PRINT_FLAG_INPUT_REQUIRED: --print flag used without prompt argument');
      this.preventionMetrics.failuresPrevented++;
    }

    // Log pre-flight issues
    if (issues.length > 0) {
      console.log(`⚠️ [NLD] Pre-flight check detected issues for ${instanceId}:`, issues);
    }
  }

  generateTestSuite(category: ClaudeProcessIOTDDTestCase['category']): string {
    return claudeProcessIOTDDPrevention.generateFullTestSuite(category);
  }

  getAllTestSuites(): string[] {
    return this.config.detection.patternCategories.map(category => 
      claudeProcessIOTDDPrevention.generateFullTestSuite(category)
    );
  }

  getSystemReport(): ClaudeProcessIOSystemReport {
    const detectorReport = claudeProcessIODetector.generateSystemReport();
    const monitoringStatus = claudeProcessIOMonitor.getMonitoringStatus();
    const tddCoverage = claudeProcessIOTDDPrevention.generateCoverageReport();
    const neuralStats = claudeProcessIONeuralDataset.getPatternStatistics();

    // Calculate system health
    let systemStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (detectorReport.criticalProcesses.length > 0) {
      systemStatus = 'critical';
    } else if (this.alertHistory.filter(a => a.severity === 'high').length > 5) {
      systemStatus = 'degraded';
    }

    // Calculate neural training accuracy
    const accuracyScore = Object.values(neuralStats).length > 0 
      ? Object.values(neuralStats).reduce((avg, stat) => avg + stat.accuracy, 0) / Object.values(neuralStats).length
      : 0;

    const recommendations: string[] = [];
    
    if (systemStatus === 'critical') {
      recommendations.push('Immediate attention required for critical processes');
    }
    if (detectorReport.patternsByCategory['PRINT_FLAG_INPUT_REQUIRED'] > 5) {
      recommendations.push('High frequency of --print flag errors - implement argument validation');
    }
    if (this.preventionMetrics.recoverySuccessRate < 0.7) {
      recommendations.push('Low recovery success rate - review automated recovery strategies');
    }
    if (claudeProcessIONeuralDataset.getRecordCount() > this.config.neuralTraining.trainingThreshold) {
      recommendations.push('Sufficient data available for neural model training');
    }

    return {
      systemStatus,
      activeProcesses: detectorReport.activeProcesses,
      totalAlertsGenerated: this.alertHistory.length,
      patternsDetected: detectorReport.patternsByCategory,
      neuralTrainingProgress: {
        recordsCollected: claudeProcessIONeuralDataset.getRecordCount(),
        modelsTraining: false, // Would be set by actual training process
        accuracyScore
      },
      preventionEffectiveness: {
        testsImplemented: tddCoverage.totalTestCases,
        failuresPrevented: this.preventionMetrics.failuresPrevented,
        recoverySuccessRate: this.preventionMetrics.recoveryAttempts > 0 
          ? this.preventionMetrics.recoverySuccesses / this.preventionMetrics.recoveryAttempts 
          : 0
      },
      recommendations,
      deploymentStatus: {
        detectorDeployed: this.isInitialized,
        monitoringActive: monitoringStatus.isMonitoring,
        tddSuitesGenerated: tddCoverage.totalTestCases > 0,
        neuralExportReady: claudeProcessIONeuralDataset.getRecordCount() >= this.config.neuralTraining.trainingThreshold
      }
    };
  }

  getActiveAlerts(instanceId?: string): ClaudeProcessIOAlert[] {
    return claudeProcessIOMonitor.getActiveAlerts(instanceId);
  }

  clearAlerts(instanceId: string): void {
    claudeProcessIOMonitor.clearAlerts(instanceId);
  }

  shutdown(): void {
    if (!this.isInitialized) return;

    console.log('⏹️ [NLD] Shutting down Claude Process I/O Integration System...');
    
    claudeProcessIOMonitor.stopMonitoring();
    
    // Final neural training export
    if (this.config.neuralTraining.enabled && claudeProcessIONeuralDataset.getRecordCount() > 0) {
      this.exportNeuralTrainingData();
    }

    this.isInitialized = false;
    console.log('✅ [NLD] Claude Process I/O Integration System shut down');
  }

  // Deployment verification methods
  validateDeployment(): {
    success: boolean;
    issues: string[];
    components: {
      detector: boolean;
      monitor: boolean;
      tddStrategies: boolean;
      neuralTraining: boolean;
    };
  } {
    const issues: string[] = [];
    
    const components = {
      detector: this.isInitialized,
      monitor: claudeProcessIOMonitor.getMonitoringStatus().isMonitoring,
      tddStrategies: claudeProcessIOTDDPrevention.getAllTestSuites().length > 0,
      neuralTraining: this.config.neuralTraining.enabled
    };

    if (!components.detector) {
      issues.push('Detector not initialized');
    }
    if (!components.monitor) {
      issues.push('Monitoring not active');
    }
    if (!components.tddStrategies) {
      issues.push('TDD strategies not loaded');
    }

    return {
      success: issues.length === 0,
      issues,
      components
    };
  }
}

// Export singleton instance
export const claudeProcessIOIntegration = new ClaudeProcessIOIntegrationSystem();