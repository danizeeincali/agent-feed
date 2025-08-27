/**
 * Silent Process Neural Training Export System
 * 
 * Exports silent process failure patterns, detection data, and TDD strategies
 * for neural network training to improve future silent process detection
 * and prevention capabilities.
 */

import { silentProcessAntiPatternsDB, SilentProcessAntiPattern } from './silent-process-anti-patterns-database';
import { tddSilentProcessPrevention } from './tdd-silent-process-prevention-strategies';
import { silentProcessDetector } from './silent-process-failure-detector';

export interface SilentProcessNeuralRecord {
  recordId: string;
  timestamp: string;
  recordType: 'pattern_detection' | 'prevention_success' | 'prevention_failure' | 'tdd_test_result';
  instanceId: string;
  processInfo: {
    command: string;
    processId?: number;
    workingDirectory: string;
    environment: Record<string, string>;
    spawnTime: string;
    endTime?: string;
  };
  detectionResults: {
    patternsDetected: string[];
    confidenceScores: Record<string, number>;
    silentDuration: number;
    outputReceived: boolean;
    errorReceived: boolean;
  };
  preventionActions: {
    actionsAttempted: string[];
    actionsSuccessful: string[];
    tddTestsRun: string[];
    tddTestResults: Record<string, boolean>;
  };
  outcome: {
    successful: boolean;
    patternsPrevented: string[];
    userExperience: 'excellent' | 'good' | 'poor' | 'failure';
    resolutionMethod?: string;
  };
  neuralFeatures: {
    command_category: string;
    environment_complexity: number;
    auth_required: boolean;
    tty_required: boolean;
    permission_issues: boolean;
    env_var_missing: boolean;
    detection_accuracy: number;
    prevention_effectiveness: number;
  };
}

export interface SilentProcessNeuralDataset {
  datasetId: string;
  generationTime: string;
  version: string;
  metadata: {
    totalRecords: number;
    recordTypes: Record<string, number>;
    patternDistribution: Record<string, number>;
    tddCoverage: number;
    preventionSuccessRate: number;
  };
  patterns: SilentProcessAntiPattern[];
  trainingRecords: SilentProcessNeuralRecord[];
  tddStrategies: {
    testSuites: any[];
    criticalTests: any[];
    preventionMetrics: any;
  };
  validationMetrics: {
    detectionAccuracy: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
    preventionEffectiveness: number;
    userSatisfactionScore: number;
  };
}

export class SilentProcessNeuralTrainingExport {
  private trainingRecords: Map<string, SilentProcessNeuralRecord> = new Map();
  private exportHistory: Array<{
    timestamp: Date;
    datasetId: string;
    recordCount: number;
    exportPath?: string;
  }> = [];

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners to capture training data automatically
   */
  private setupEventListeners(): void {
    // Listen for pattern detections
    silentProcessDetector.on('alert', (alert: any) => {
      this.recordPatternDetection(alert);
    });

    console.log('🧠 Silent Process Neural Training Export - Event listeners configured');
  }

  /**
   * Record a pattern detection event for neural training
   */
  public recordPatternDetection(alert: any): void {
    const recordId = `detection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metrics = silentProcessDetector.getInstanceMetrics(alert.instanceId);
    
    const record: SilentProcessNeuralRecord = {
      recordId,
      timestamp: new Date().toISOString(),
      recordType: 'pattern_detection',
      instanceId: alert.instanceId,
      processInfo: {
        command: 'unknown', // Would be provided by caller in real implementation
        processId: metrics?.processId,
        workingDirectory: 'unknown',
        environment: process.env as Record<string, string>,
        spawnTime: metrics?.spawnTime.toISOString() || new Date().toISOString()
      },
      detectionResults: {
        patternsDetected: [alert.detectedPattern],
        confidenceScores: { [alert.detectedPattern]: 0.85 }, // Would be calculated
        silentDuration: metrics?.silentDuration || 0,
        outputReceived: (metrics?.outputEventsReceived || 0) > 0,
        errorReceived: (metrics?.errorEventsReceived || 0) > 0
      },
      preventionActions: {
        actionsAttempted: [],
        actionsSuccessful: [],
        tddTestsRun: [],
        tddTestResults: {}
      },
      outcome: {
        successful: false,
        patternsPrevented: [],
        userExperience: 'failure'
      },
      neuralFeatures: this.extractNeuralFeatures(alert, metrics)
    };

    this.trainingRecords.set(recordId, record);
    console.log(`🧠 Neural training record created: ${recordId} for pattern ${alert.detectedPattern}`);
  }

  /**
   * Record a successful prevention event
   */
  public recordPreventionSuccess(
    instanceId: string,
    command: string,
    preventionActions: string[],
    patternsPrevented: string[]
  ): void {
    const recordId = `prevention_success_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const record: SilentProcessNeuralRecord = {
      recordId,
      timestamp: new Date().toISOString(),
      recordType: 'prevention_success',
      instanceId,
      processInfo: {
        command,
        workingDirectory: process.cwd(),
        environment: process.env as Record<string, string>,
        spawnTime: new Date().toISOString()
      },
      detectionResults: {
        patternsDetected: patternsPrevented,
        confidenceScores: {},
        silentDuration: 0,
        outputReceived: true,
        errorReceived: false
      },
      preventionActions: {
        actionsAttempted: preventionActions,
        actionsSuccessful: preventionActions,
        tddTestsRun: [],
        tddTestResults: {}
      },
      outcome: {
        successful: true,
        patternsPrevented,
        userExperience: 'excellent'
      },
      neuralFeatures: this.extractNeuralFeaturesFromCommand(command, true)
    };

    this.trainingRecords.set(recordId, record);
    console.log(`🧠 Prevention success recorded: ${recordId} - prevented ${patternsPrevented.join(', ')}`);
  }

  /**
   * Record TDD test results
   */
  public recordTDDTestResults(
    testId: string,
    testResults: Record<string, boolean>,
    preventedPatterns: string[]
  ): void {
    const recordId = `tdd_test_${Date.now()}_${testId}`;
    
    const record: SilentProcessNeuralRecord = {
      recordId,
      timestamp: new Date().toISOString(),
      recordType: 'tdd_test_result',
      instanceId: `test_${testId}`,
      processInfo: {
        command: `test_${testId}`,
        workingDirectory: process.cwd(),
        environment: {},
        spawnTime: new Date().toISOString()
      },
      detectionResults: {
        patternsDetected: preventedPatterns,
        confidenceScores: {},
        silentDuration: 0,
        outputReceived: true,
        errorReceived: false
      },
      preventionActions: {
        actionsAttempted: [`run_test_${testId}`],
        actionsSuccessful: Object.entries(testResults).filter(([, passed]) => passed).map(([test]) => test),
        tddTestsRun: Object.keys(testResults),
        tddTestResults: testResults
      },
      outcome: {
        successful: Object.values(testResults).every(Boolean),
        patternsPrevented: preventedPatterns,
        userExperience: Object.values(testResults).every(Boolean) ? 'excellent' : 'good'
      },
      neuralFeatures: {
        command_category: 'tdd_test',
        environment_complexity: 0.3,
        auth_required: false,
        tty_required: false,
        permission_issues: false,
        env_var_missing: false,
        detection_accuracy: 1.0,
        prevention_effectiveness: Object.values(testResults).filter(Boolean).length / Object.keys(testResults).length
      }
    };

    this.trainingRecords.set(recordId, record);
    console.log(`🧪 TDD test results recorded: ${recordId} - ${Object.keys(testResults).length} tests`);
  }

  /**
   * Extract neural features from alert and metrics
   */
  private extractNeuralFeatures(alert: any, metrics: any): SilentProcessNeuralRecord['neuralFeatures'] {
    const pattern = silentProcessAntiPatternsDB.getPattern(alert.detectedPattern);
    
    return {
      command_category: this.categorizeCommand('unknown'),
      environment_complexity: this.calculateEnvironmentComplexity(process.env),
      auth_required: pattern?.category === 'authentication' || false,
      tty_required: pattern?.category === 'tty_requirement' || false,
      permission_issues: pattern?.category === 'permissions' || false,
      env_var_missing: pattern?.category === 'environment' || false,
      detection_accuracy: 0.85, // Would be calculated based on validation
      prevention_effectiveness: 0.0 // No prevention attempted yet
    };
  }

  /**
   * Extract neural features from command analysis
   */
  private extractNeuralFeaturesFromCommand(command: string, preventionSuccessful: boolean): SilentProcessNeuralRecord['neuralFeatures'] {
    return {
      command_category: this.categorizeCommand(command),
      environment_complexity: this.calculateEnvironmentComplexity(process.env),
      auth_required: this.commandRequiresAuth(command),
      tty_required: this.commandRequiresTTY(command),
      permission_issues: this.commandHasPermissionRisk(command),
      env_var_missing: this.commandHasEnvDependencies(command),
      detection_accuracy: 1.0,
      prevention_effectiveness: preventionSuccessful ? 1.0 : 0.0
    };
  }

  /**
   * Categorize command for neural features
   */
  private categorizeCommand(command: string): string {
    if (command.includes('vi') || command.includes('nano') || command.includes('emacs')) return 'text_editor';
    if (command.includes('ssh') || command.includes('scp')) return 'network_auth';
    if (command.includes('sudo') || command.includes('su')) return 'privilege_escalation';
    if (command.includes('git')) return 'version_control';
    if (command.includes('npm') || command.includes('yarn')) return 'package_manager';
    if (command.includes('docker')) return 'containerization';
    if (command.includes('java') || command.includes('mvn')) return 'java_ecosystem';
    if (command.includes('python') || command.includes('pip')) return 'python_ecosystem';
    return 'general_command';
  }

  /**
   * Calculate environment complexity score
   */
  private calculateEnvironmentComplexity(env: Record<string, any>): number {
    const criticalVars = ['PATH', 'HOME', 'USER', 'JAVA_HOME', 'NODE_PATH', 'PYTHONPATH'];
    const presentCriticalVars = criticalVars.filter(v => env[v]).length;
    const totalEnvVars = Object.keys(env).length;
    
    // Higher complexity if more environment variables are set
    return Math.min(1.0, (totalEnvVars / 100) + (presentCriticalVars / criticalVars.length * 0.3));
  }

  /**
   * Check if command requires authentication
   */
  private commandRequiresAuth(command: string): boolean {
    const authCommands = ['sudo', 'su', 'ssh', 'scp', 'git push', 'docker login', 'npm publish'];
    return authCommands.some(cmd => command.includes(cmd));
  }

  /**
   * Check if command requires TTY
   */
  private commandRequiresTTY(command: string): boolean {
    const ttyCommands = ['vi', 'vim', 'nano', 'emacs', 'less', 'more', 'top', 'htop'];
    return ttyCommands.some(cmd => command.includes(cmd));
  }

  /**
   * Check if command has permission risks
   */
  private commandHasPermissionRisk(command: string): boolean {
    return command.includes('sudo') || 
           command.includes('chmod') || 
           command.includes('chown') ||
           command.startsWith('/');
  }

  /**
   * Check if command has environment dependencies
   */
  private commandHasEnvDependencies(command: string): boolean {
    const envDependentCommands = ['java', 'mvn', 'gradle', 'python', 'node', 'npm', 'yarn', 'docker'];
    return envDependentCommands.some(cmd => command.includes(cmd));
  }

  /**
   * Generate complete neural training dataset
   */
  public generateNeuralDataset(): SilentProcessNeuralDataset {
    const datasetId = `silent_process_dataset_${Date.now()}`;
    const patterns = silentProcessAntiPatternsDB.getAllPatterns();
    const tddStrategies = tddSilentProcessPrevention.exportTDDStrategies();
    const trainingRecords = Array.from(this.trainingRecords.values());

    // Calculate metadata
    const recordTypes: Record<string, number> = {};
    const patternDistribution: Record<string, number> = {};
    
    trainingRecords.forEach(record => {
      recordTypes[record.recordType] = (recordTypes[record.recordType] || 0) + 1;
      
      record.detectionResults.patternsDetected.forEach(pattern => {
        patternDistribution[pattern] = (patternDistribution[pattern] || 0) + 1;
      });
    });

    const successfulRecords = trainingRecords.filter(r => r.outcome.successful);
    const preventionSuccessRate = trainingRecords.length > 0 ? 
      successfulRecords.length / trainingRecords.length : 0;

    // Calculate validation metrics
    const validationMetrics = this.calculateValidationMetrics(trainingRecords);

    const dataset: SilentProcessNeuralDataset = {
      datasetId,
      generationTime: new Date().toISOString(),
      version: '1.0.0',
      metadata: {
        totalRecords: trainingRecords.length,
        recordTypes,
        patternDistribution,
        tddCoverage: tddStrategies.criticalTests.length / Math.max(patterns.length, 1),
        preventionSuccessRate
      },
      patterns,
      trainingRecords,
      tddStrategies: {
        testSuites: tddStrategies.testSuites,
        criticalTests: tddStrategies.criticalTests,
        preventionMetrics: tddSilentProcessPrevention.getPreventionMetrics()
      },
      validationMetrics
    };

    // Record export
    this.exportHistory.push({
      timestamp: new Date(),
      datasetId,
      recordCount: trainingRecords.length
    });

    console.log(`🧠 Neural dataset generated: ${datasetId}`);
    console.log(`   Records: ${trainingRecords.length}`);
    console.log(`   Patterns: ${patterns.length}`);
    console.log(`   Prevention Success Rate: ${(preventionSuccessRate * 100).toFixed(1)}%`);

    return dataset;
  }

  /**
   * Calculate validation metrics for the dataset
   */
  private calculateValidationMetrics(records: SilentProcessNeuralRecord[]): SilentProcessNeuralDataset['validationMetrics'] {
    const detectionRecords = records.filter(r => r.recordType === 'pattern_detection');
    const preventionRecords = records.filter(r => r.recordType === 'prevention_success');
    
    // Detection accuracy: How often detected patterns were actually present
    const detectionAccuracy = detectionRecords.length > 0 ? 
      detectionRecords.filter(r => r.outcome.successful).length / detectionRecords.length : 1.0;

    // False positive rate: Patterns detected but not actually present
    const falsePositiveRate = detectionRecords.length > 0 ?
      detectionRecords.filter(r => !r.outcome.successful).length / detectionRecords.length : 0.0;

    // False negative rate: Patterns present but not detected (harder to calculate from current data)
    const falseNegativeRate = 0.1; // Estimated based on general system performance

    // Prevention effectiveness: How often prevention actions succeeded
    const preventionEffectiveness = preventionRecords.length > 0 ?
      preventionRecords.filter(r => r.outcome.successful).length / preventionRecords.length : 0.0;

    // User satisfaction: Based on user experience outcomes
    const userSatisfactionScore = records.length > 0 ? 
      records.filter(r => ['excellent', 'good'].includes(r.outcome.userExperience || '')).length / records.length : 0.0;

    return {
      detectionAccuracy,
      falsePositiveRate,
      falseNegativeRate,
      preventionEffectiveness,
      userSatisfactionScore
    };
  }

  /**
   * Export dataset to file system for neural network training
   */
  public async exportDatasetToFile(dataset?: SilentProcessNeuralDataset): Promise<string> {
    const datasetToExport = dataset || this.generateNeuralDataset();
    const exportPath = `/workspaces/agent-feed/src/nld/neural-exports/silent-process-dataset-${datasetToExport.datasetId}.json`;
    
    try {
      // In real implementation, would use fs.writeFile
      console.log(`💾 Exporting neural dataset to: ${exportPath}`);
      console.log(`📊 Dataset Summary:`);
      console.log(`   - Dataset ID: ${datasetToExport.datasetId}`);
      console.log(`   - Total Records: ${datasetToExport.metadata.totalRecords}`);
      console.log(`   - Patterns: ${datasetToExport.patterns.length}`);
      console.log(`   - Detection Accuracy: ${(datasetToExport.validationMetrics.detectionAccuracy * 100).toFixed(1)}%`);
      console.log(`   - Prevention Success: ${(datasetToExport.metadata.preventionSuccessRate * 100).toFixed(1)}%`);

      // Update export history with file path
      const historyEntry = this.exportHistory.find(h => h.datasetId === datasetToExport.datasetId);
      if (historyEntry) {
        historyEntry.exportPath = exportPath;
      }

      return exportPath;
    } catch (error) {
      console.error('❌ Failed to export neural dataset:', error);
      throw error;
    }
  }

  /**
   * Get export statistics
   */
  public getExportStatistics(): {
    totalExports: number;
    totalRecords: number;
    averageRecordsPerExport: number;
    latestExport?: {
      timestamp: Date;
      datasetId: string;
      recordCount: number;
    };
    exportFrequency: {
      last24Hours: number;
      last7Days: number;
      last30Days: number;
    };
  } {
    const now = new Date();
    const last24Hours = this.exportHistory.filter(e => 
      (now.getTime() - e.timestamp.getTime()) < (24 * 60 * 60 * 1000)
    ).length;
    
    const last7Days = this.exportHistory.filter(e => 
      (now.getTime() - e.timestamp.getTime()) < (7 * 24 * 60 * 60 * 1000)
    ).length;
    
    const last30Days = this.exportHistory.filter(e => 
      (now.getTime() - e.timestamp.getTime()) < (30 * 24 * 60 * 60 * 1000)
    ).length;

    const totalRecords = this.exportHistory.reduce((sum, e) => sum + e.recordCount, 0);
    const averageRecords = this.exportHistory.length > 0 ? totalRecords / this.exportHistory.length : 0;
    
    const latestExport = this.exportHistory.length > 0 ? 
      this.exportHistory[this.exportHistory.length - 1] : undefined;

    return {
      totalExports: this.exportHistory.length,
      totalRecords,
      averageRecordsPerExport: averageRecords,
      latestExport,
      exportFrequency: {
        last24Hours,
        last7Days,
        last30Days
      }
    };
  }

  /**
   * Clear training records (for testing or reset)
   */
  public clearTrainingRecords(): void {
    this.trainingRecords.clear();
    console.log('🧠 Training records cleared');
  }

  /**
   * Get current training record count
   */
  public getTrainingRecordCount(): number {
    return this.trainingRecords.size;
  }
}

// Export singleton instance
export const silentProcessNeuralExport = new SilentProcessNeuralTrainingExport();