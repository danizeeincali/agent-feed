/**
 * Claude Process I/O Neural Training Dataset - NLD System
 * 
 * Generates comprehensive training datasets for neural network learning
 * of Claude CLI process I/O failure patterns and prevention strategies.
 */

import { ClaudeProcessIOMetrics, ClaudeProcessIOErrorPattern } from './claude-process-io-failure-detector';

export interface ClaudeProcessIONeuralRecord {
  recordId: string;
  timestamp: number;
  sessionContext: {
    instanceId: string;
    command: string;
    args: string[];
    workingDirectory: string;
    processType: 'pty' | 'pipe';
    environmentContext: Record<string, any>;
  };
  inputFeatures: {
    // Command configuration features
    hasPromptArgument: number; // 0 or 1
    hasPrintFlag: number; // 0 or 1
    hasSkipPermissions: number; // 0 or 1
    hasInteractiveFlag: number; // 0 or 1
    argumentCount: number;
    
    // Process state features
    processType: number; // 0=pipe, 1=pty
    spawnTime: number; // normalized
    initializationDuration: number; // normalized
    
    // I/O activity features
    stdinInputs: number; // normalized
    stdoutOutputs: number; // normalized
    stderrOutputs: number; // normalized
    interactivePrompts: number; // normalized
    silentDuration: number; // normalized
    lastActivityAge: number; // normalized
    
    // Connection state features
    stdinConnected: number; // 0 or 1
    stdoutActive: number; // 0 or 1
    stderrActive: number; // 0 or 1
    
    // Authentication features
    authenticationSucceeded: number; // 0 or 1
    authenticationTime: number; // normalized, -1 if N/A
  };
  outputLabels: {
    // Failure pattern predictions (0-1 probability)
    printFlagInputRequired: number;
    interactiveModeBlocked: number;
    ptyStdinDisconnect: number;
    authSuccessNoOutput: number;
    
    // Process health score (0-1)
    healthScore: number;
    
    // Recovery success probability (0-1)
    recoveryProbability: number;
  };
  actualOutcome: {
    patternDetected: ClaudeProcessIOErrorPattern['category'] | null;
    resolutionSuccessful: boolean;
    recoveryStrategy: string | null;
    finalProcessState: ClaudeProcessIOMetrics['processState'];
  };
  trainingMetadata: {
    datasetVersion: string;
    featureVersion: string;
    labelQuality: 'high' | 'medium' | 'low';
    userFeedback?: 'correct' | 'incorrect' | 'partial';
  };
}

export interface ClaudeProcessIONeuralDataset {
  datasetId: string;
  version: string;
  createdAt: number;
  records: ClaudeProcessIONeuralRecord[];
  statistics: {
    totalRecords: number;
    successfulProcesses: number;
    failedProcesses: number;
    patternDistribution: Record<string, number>;
    featureRanges: Record<string, { min: number; max: number; avg: number }>;
  };
  neuralArchitectureSpec: {
    inputFeatures: number;
    hiddenLayers: number[];
    outputNeurons: number;
    activationFunction: string;
    lossFunction: string;
    optimizationStrategy: string;
  };
}

export class ClaudeProcessIONeuralTrainingDataset {
  private records: ClaudeProcessIONeuralRecord[] = [];
  private featureNormalizers: Map<string, { min: number; max: number; range: number }> = new Map();
  private currentDatasetVersion = '1.0.0';

  addProcessSession(
    metrics: ClaudeProcessIOMetrics, 
    patterns: ClaudeProcessIOErrorPattern[], 
    actualOutcome: ClaudeProcessIONeuralRecord['actualOutcome'],
    userFeedback?: 'correct' | 'incorrect' | 'partial'
  ): void {
    const record = this.createNeuralRecord(metrics, patterns, actualOutcome, userFeedback);
    this.records.push(record);
    this.updateFeatureNormalizers(record);
    
    console.log(`📊 [NLD] Added neural training record: ${record.recordId}`);
  }

  private createNeuralRecord(
    metrics: ClaudeProcessIOMetrics,
    patterns: ClaudeProcessIOErrorPattern[],
    actualOutcome: ClaudeProcessIONeuralRecord['actualOutcome'],
    userFeedback?: 'correct' | 'incorrect' | 'partial'
  ): ClaudeProcessIONeuralRecord {
    const currentTime = Date.now();
    const initializationDuration = (metrics.firstOutputTime || currentTime) - metrics.spawnTime;
    const authTime = metrics.authenticationTime ? metrics.authenticationTime - metrics.spawnTime : -1;

    return {
      recordId: `claude-io-${metrics.instanceId}-${currentTime}`,
      timestamp: currentTime,
      sessionContext: {
        instanceId: metrics.instanceId,
        command: metrics.command,
        args: [...metrics.args],
        workingDirectory: metrics.workingDirectory,
        processType: metrics.processType,
        environmentContext: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        }
      },
      inputFeatures: {
        // Command configuration
        hasPromptArgument: metrics.args.some(arg => !arg.startsWith('--')) ? 1 : 0,
        hasPrintFlag: (metrics.args.includes('--print') || metrics.args.includes('-p')) ? 1 : 0,
        hasSkipPermissions: metrics.args.includes('--dangerously-skip-permissions') ? 1 : 0,
        hasInteractiveFlag: (!metrics.args.includes('--print') && !metrics.args.includes('-p')) ? 1 : 0,
        argumentCount: metrics.args.length,
        
        // Process state
        processType: metrics.processType === 'pty' ? 1 : 0,
        spawnTime: metrics.spawnTime,
        initializationDuration,
        
        // I/O activity
        stdinInputs: metrics.sessionMetrics.inputsSent,
        stdoutOutputs: metrics.sessionMetrics.outputsReceived,
        stderrOutputs: patterns.filter(p => p.errorMessage).length,
        interactivePrompts: metrics.sessionMetrics.interactivePrompts,
        silentDuration: metrics.sessionMetrics.silentDuration,
        lastActivityAge: currentTime - metrics.sessionMetrics.lastActivity,
        
        // Connection state
        stdinConnected: metrics.stdinConnected ? 1 : 0,
        stdoutActive: metrics.stdoutActive ? 1 : 0,
        stderrActive: metrics.stderrActive ? 1 : 0,
        
        // Authentication
        authenticationSucceeded: metrics.authenticationTime ? 1 : 0,
        authenticationTime: authTime
      },
      outputLabels: {
        printFlagInputRequired: this.calculatePatternProbability('PRINT_FLAG_INPUT_REQUIRED', patterns),
        interactiveModeBlocked: this.calculatePatternProbability('INTERACTIVE_MODE_BLOCKED', patterns),
        ptyStdinDisconnect: this.calculatePatternProbability('PTY_STDIN_DISCONNECT', patterns),
        authSuccessNoOutput: this.calculatePatternProbability('AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT', patterns),
        healthScore: this.calculateHealthScore(metrics, patterns),
        recoveryProbability: actualOutcome.resolutionSuccessful ? 1 : 0
      },
      actualOutcome,
      trainingMetadata: {
        datasetVersion: this.currentDatasetVersion,
        featureVersion: '1.0.0',
        labelQuality: patterns.length > 0 ? (userFeedback === 'correct' ? 'high' : 'medium') : 'low',
        userFeedback
      }
    };
  }

  private calculatePatternProbability(category: ClaudeProcessIOErrorPattern['category'], patterns: ClaudeProcessIOErrorPattern[]): number {
    const matchingPatterns = patterns.filter(p => p.category === category);
    if (matchingPatterns.length === 0) return 0;
    
    // Weight by severity and recency
    return Math.min(1, matchingPatterns.reduce((score, pattern) => {
      const severityWeight = { critical: 1.0, high: 0.8, medium: 0.6, low: 0.4 }[pattern.severity];
      const recencyWeight = Math.max(0.1, 1 - (Date.now() - pattern.detectedAt) / 60000); // Decay over 1 minute
      return score + (severityWeight * recencyWeight);
    }, 0));
  }

  private calculateHealthScore(metrics: ClaudeProcessIOMetrics, patterns: ClaudeProcessIOErrorPattern[]): number {
    let score = 1.0;
    
    // Deduct for error patterns
    patterns.forEach(pattern => {
      const severityPenalty = { critical: 0.5, high: 0.3, medium: 0.2, low: 0.1 }[pattern.severity];
      score -= severityPenalty;
    });
    
    // Deduct for process state issues
    if (metrics.processState === 'failed') score -= 0.4;
    if (metrics.processState === 'silent') score -= 0.2;
    
    // Deduct for I/O issues
    if (!metrics.stdoutActive && metrics.sessionMetrics.outputsReceived === 0) score -= 0.2;
    if (!metrics.stdinConnected) score -= 0.1;
    
    // Boost for healthy activity
    if (metrics.sessionMetrics.outputsReceived > 0) score += 0.1;
    if (metrics.authenticationTime) score += 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  private updateFeatureNormalizers(record: ClaudeProcessIONeuralRecord): void {
    const features = record.inputFeatures;
    Object.entries(features).forEach(([feature, value]) => {
      if (typeof value === 'number' && !isNaN(value)) {
        const current = this.featureNormalizers.get(feature) || { min: value, max: value, range: 0 };
        const updated = {
          min: Math.min(current.min, value),
          max: Math.max(current.max, value),
          range: 0
        };
        updated.range = updated.max - updated.min || 1;
        this.featureNormalizers.set(feature, updated);
      }
    });
  }

  normalizeRecord(record: ClaudeProcessIONeuralRecord): ClaudeProcessIONeuralRecord {
    const normalizedRecord = { ...record };
    const features = { ...record.inputFeatures };
    
    Object.entries(features).forEach(([feature, value]) => {
      if (typeof value === 'number' && !isNaN(value)) {
        const normalizer = this.featureNormalizers.get(feature);
        if (normalizer && normalizer.range > 0) {
          features[feature as keyof typeof features] = (value - normalizer.min) / normalizer.range;
        }
      }
    });
    
    normalizedRecord.inputFeatures = features;
    return normalizedRecord;
  }

  generateDataset(): ClaudeProcessIONeuralDataset {
    const normalizedRecords = this.records.map(record => this.normalizeRecord(record));
    
    // Calculate statistics
    const patternDistribution: Record<string, number> = {};
    const featureRanges: Record<string, { min: number; max: number; avg: number }> = {};
    
    normalizedRecords.forEach(record => {
      if (record.actualOutcome.patternDetected) {
        patternDistribution[record.actualOutcome.patternDetected] = 
          (patternDistribution[record.actualOutcome.patternDetected] || 0) + 1;
      }
    });

    Array.from(this.featureNormalizers.entries()).forEach(([feature, stats]) => {
      featureRanges[feature] = {
        min: stats.min,
        max: stats.max,
        avg: (stats.min + stats.max) / 2
      };
    });

    return {
      datasetId: `claude-io-training-${Date.now()}`,
      version: this.currentDatasetVersion,
      createdAt: Date.now(),
      records: normalizedRecords,
      statistics: {
        totalRecords: normalizedRecords.length,
        successfulProcesses: normalizedRecords.filter(r => r.actualOutcome.finalProcessState === 'interactive').length,
        failedProcesses: normalizedRecords.filter(r => r.actualOutcome.finalProcessState === 'failed').length,
        patternDistribution,
        featureRanges
      },
      neuralArchitectureSpec: {
        inputFeatures: Object.keys(normalizedRecords[0]?.inputFeatures || {}).length,
        hiddenLayers: [64, 32, 16], // Recommended architecture
        outputNeurons: 6, // 4 pattern types + health score + recovery probability
        activationFunction: 'relu',
        lossFunction: 'binary_crossentropy',
        optimizationStrategy: 'adam'
      }
    };
  }

  exportForClaudeFlow(): {
    dataset: ClaudeProcessIONeuralDataset;
    claudeFlowConfig: {
      modelType: 'process-io-failure-prediction';
      trainingParams: Record<string, any>;
      validationSplit: number;
      epochs: number;
    };
  } {
    const dataset = this.generateDataset();
    
    return {
      dataset,
      claudeFlowConfig: {
        modelType: 'process-io-failure-prediction',
        trainingParams: {
          learningRate: 0.001,
          batchSize: 32,
          dropoutRate: 0.2,
          regularization: 'l2',
          earlyStopping: true
        },
        validationSplit: 0.2,
        epochs: 100
      }
    };
  }

  clear(): void {
    this.records = [];
    this.featureNormalizers.clear();
  }

  getRecordCount(): number {
    return this.records.length;
  }

  getPatternStatistics(): Record<string, { count: number; accuracy: number }> {
    const stats: Record<string, { count: number; accuracy: number }> = {};
    
    this.records.forEach(record => {
      if (record.actualOutcome.patternDetected) {
        const pattern = record.actualOutcome.patternDetected;
        if (!stats[pattern]) {
          stats[pattern] = { count: 0, accuracy: 0 };
        }
        stats[pattern].count++;
        stats[pattern].accuracy += record.actualOutcome.resolutionSuccessful ? 1 : 0;
      }
    });

    // Calculate accuracy percentages
    Object.keys(stats).forEach(pattern => {
      stats[pattern].accuracy = stats[pattern].accuracy / stats[pattern].count;
    });

    return stats;
  }
}

// Export singleton instance
export const claudeProcessIONeuralDataset = new ClaudeProcessIONeuralTrainingDataset();