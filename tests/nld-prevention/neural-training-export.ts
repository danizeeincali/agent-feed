/**
 * NEURAL TRAINING DATA EXPORT SYSTEM
 * 
 * Consolidates and exports all documented failure patterns from agent-feed development
 * into structured neural training datasets for claude-flow integration.
 */

import fs from 'fs/promises';
import path from 'path';

interface NeuralTrainingRecord {
  recordId: string;
  timestamp: string;
  patternType: string;
  failureCategory: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  neuralWeight: number;
  claudeConfidence: number;
  userSuccessRate: number;
  effectivenessScore: number;
  tddFactor: number;
  context: {
    originalTask: string;
    component: string;
    environment: string;
    complexity: string;
  };
  failureSignature: {
    symptoms: string[];
    rootCause: string;
    detectionRules: string[];
    falseFixIndicators: string[];
  };
  prevention: {
    rules: string[];
    testPatterns: string[];
    successIndicators: string[];
  };
  historicalData: {
    occurrenceCount: number;
    lastOccurrence: string;
    resolutionSuccess: boolean;
    timeToResolve: number;
  };
}

interface ConsolidatedNeuralDataset {
  exportTimestamp: string;
  totalRecords: number;
  patternCategories: Record<string, number>;
  severityDistribution: Record<string, number>;
  trainingRecords: NeuralTrainingRecord[];
  metadata: {
    sourceFiles: string[];
    versionInfo: string;
    exportVersion: string;
  };
}

class NeuralTrainingExporter {
  private readonly sourceDirectory = '/workspaces/agent-feed/docs/nld-patterns';
  private readonly outputDirectory = '/workspaces/agent-feed/tests/nld-prevention/neural-exports';

  async consolidateAllFailurePatterns(): Promise<ConsolidatedNeuralDataset> {
    // Read all existing failure pattern files
    const sourceFiles = await this.findFailurePatternFiles();
    const trainingRecords: NeuralTrainingRecord[] = [];

    for (const filePath of sourceFiles) {
      try {
        const records = await this.processFailurePatternFile(filePath);
        trainingRecords.push(...records);
      } catch (error) {
        console.warn(`Failed to process file ${filePath}:`, error);
      }
    }

    // Calculate distribution statistics
    const patternCategories = this.calculatePatternDistribution(trainingRecords);
    const severityDistribution = this.calculateSeverityDistribution(trainingRecords);

    return {
      exportTimestamp: new Date().toISOString(),
      totalRecords: trainingRecords.length,
      patternCategories,
      severityDistribution,
      trainingRecords,
      metadata: {
        sourceFiles: sourceFiles.map(f => path.basename(f)),
        versionInfo: 'agent-feed-nld-v1.0.0',
        exportVersion: '2025-09-09'
      }
    };
  }

  private async findFailurePatternFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.sourceDirectory);
      return files
        .filter(file => file.endsWith('.json') && (
          file.includes('failure') || 
          file.includes('neural-training') ||
          file.includes('anti-pattern') ||
          file.includes('comment-mention') ||
          file.includes('component-integration')
        ))
        .map(file => path.join(this.sourceDirectory, file));
    } catch (error) {
      console.warn('Could not read source directory:', error);
      return [];
    }
  }

  private async processFailurePatternFile(filePath: string): Promise<NeuralTrainingRecord[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    const records: NeuralTrainingRecord[] = [];

    // Extract neural training record based on file structure
    if (data.nld_analysis || data.nld_record_id) {
      records.push(this.extractFromNLDAnalysis(data, filePath));
    } else if (data.recordId || data.patternType) {
      records.push(this.extractFromPatternRecord(data, filePath));
    } else if (data.failurePatterns) {
      // Multiple patterns in one file
      for (const pattern of data.failurePatterns) {
        records.push(this.extractFromFailurePattern(pattern, filePath));
      }
    }

    return records.filter(record => record !== null);
  }

  private extractFromNLDAnalysis(data: any, filePath: string): NeuralTrainingRecord {
    const baseId = data.nld_analysis?.record_id || data.nld_record_id || path.basename(filePath, '.json');
    
    return {
      recordId: baseId,
      timestamp: data.nld_analysis?.timestamp || data.timestamp || new Date().toISOString(),
      patternType: data.nld_analysis?.failure_type || data.failure_pattern || 'unknown_pattern',
      failureCategory: data.nld_analysis?.pattern_category || data.problem_analysis?.root_cause || 'component_failure',
      severity: this.normalizeSeverity(data.nld_analysis?.severity || 'MEDIUM'),
      neuralWeight: data.neural_training_export?.prevention_learning_weight || 0.8,
      claudeConfidence: data.failure_pattern_data?.claude_solution?.confidence_level || 0.85,
      userSuccessRate: data.failure_pattern_data?.effectiveness_score || 0.0,
      effectivenessScore: data.effectiveness_score || 0.0,
      tddFactor: data.tdd_factor || 0.1,
      context: {
        originalTask: data.failure_pattern_data?.original_task || data.taskContext?.originalTask || 'Unknown task',
        component: this.extractComponentName(data),
        environment: 'browser',
        complexity: this.assessComplexity(data)
      },
      failureSignature: {
        symptoms: this.extractSymptoms(data),
        rootCause: data.problem_analysis?.root_cause || data.anti_patterns_identified?.primary_anti_pattern || 'Unknown',
        detectionRules: this.extractDetectionRules(data),
        falseFixIndicators: this.extractFalseFixIndicators(data)
      },
      prevention: {
        rules: this.extractPreventionRules(data),
        testPatterns: this.extractTestPatterns(data),
        successIndicators: this.extractSuccessIndicators(data)
      },
      historicalData: {
        occurrenceCount: 1,
        lastOccurrence: data.timestamp || new Date().toISOString(),
        resolutionSuccess: data.effectiveness_score > 0.5,
        timeToResolve: this.estimateResolutionTime(data)
      }
    };
  }

  private extractFromPatternRecord(data: any, filePath: string): NeuralTrainingRecord {
    return {
      recordId: data.recordId || path.basename(filePath, '.json'),
      timestamp: data.timestamp || new Date().toISOString(),
      patternType: data.patternType || 'unknown_pattern',
      failureCategory: data.failureCategory || 'integration_failure',
      severity: this.normalizeSeverity(data.severity || 'MEDIUM'),
      neuralWeight: data.neuralWeight || 0.7,
      claudeConfidence: data.taskContext?.claudeConfidence === 'HIGH' ? 0.9 : 0.7,
      userSuccessRate: data.taskContext?.successRate || 0.0,
      effectivenessScore: data.effectivenessScore || 0.0,
      tddFactor: data.tddImplicationScore || 0.2,
      context: {
        originalTask: data.taskContext?.originalTask || 'Unknown task',
        component: data.taskContext?.components?.working?.[0] || 'Unknown component',
        environment: 'browser',
        complexity: 'HIGH'
      },
      failureSignature: {
        symptoms: data.failurePatterns?.map((p: any) => p.description) || [],
        rootCause: data.failurePatterns?.[0]?.rootCause || 'Unknown',
        detectionRules: this.extractDetectionRules(data),
        falseFixIndicators: []
      },
      prevention: {
        rules: data.preventionRules?.map((r: any) => r.description || r.rule) || [],
        testPatterns: data.recommendedTDDPatterns || [],
        successIndicators: []
      },
      historicalData: {
        occurrenceCount: 1,
        lastOccurrence: data.timestamp || new Date().toISOString(),
        resolutionSuccess: data.effectivenessScore > 0.3,
        timeToResolve: 3600000 // 1 hour default
      }
    };
  }

  private extractFromFailurePattern(pattern: any, filePath: string): NeuralTrainingRecord {
    return {
      recordId: `${path.basename(filePath, '.json')}-${pattern.type}`,
      timestamp: new Date().toISOString(),
      patternType: pattern.type || 'unknown_pattern',
      failureCategory: 'anti_pattern',
      severity: this.normalizeSeverity(pattern.severity || 'MEDIUM'),
      neuralWeight: 0.8,
      claudeConfidence: 0.8,
      userSuccessRate: 0.0,
      effectivenessScore: 0.0,
      tddFactor: 0.1,
      context: {
        originalTask: pattern.description || 'Pattern analysis',
        component: pattern.component || 'Unknown',
        environment: 'browser',
        complexity: 'MEDIUM'
      },
      failureSignature: {
        symptoms: [pattern.description],
        rootCause: pattern.rootCause || pattern.description,
        detectionRules: [],
        falseFixIndicators: []
      },
      prevention: {
        rules: [],
        testPatterns: [],
        successIndicators: []
      },
      historicalData: {
        occurrenceCount: 1,
        lastOccurrence: new Date().toISOString(),
        resolutionSuccess: false,
        timeToResolve: 7200000 // 2 hours default
      }
    };
  }

  private normalizeSeverity(severity: any): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    if (typeof severity === 'string') {
      const upper = severity.toUpperCase();
      if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(upper)) {
        return upper as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      }
    }
    return 'MEDIUM';
  }

  private extractComponentName(data: any): string {
    return data.failure_pattern_data?.actual_user_experience?.failure_component?.name ||
           data.component ||
           data.taskContext?.components?.failing?.[0] ||
           'Unknown component';
  }

  private assessComplexity(data: any): string {
    const hasMultipleComponents = data.taskContext?.components?.failing?.length > 1;
    const hasNestedFailures = data.anti_patterns_identified?.specific_failures?.length > 2;
    const hasHighNeuralWeight = (data.neural_training_export?.prevention_learning_weight || 0) > 0.8;
    
    if (hasMultipleComponents || hasNestedFailures || hasHighNeuralWeight) {
      return 'HIGH';
    }
    return 'MEDIUM';
  }

  private extractSymptoms(data: any): string[] {
    const symptoms: string[] = [];
    
    // From trigger conditions
    if (data.trigger_conditions?.detected_phrases) {
      symptoms.push(...data.trigger_conditions.detected_phrases);
    }
    
    // From failure behavior
    if (data.failure_pattern_data?.actual_user_experience?.failure_component?.behavior) {
      symptoms.push(data.failure_pattern_data.actual_user_experience.failure_component.behavior);
    }
    
    // From problem analysis
    if (data.problem_analysis?.symptom) {
      symptoms.push(data.problem_analysis.symptom);
    }
    
    return symptoms.filter(Boolean);
  }

  private extractDetectionRules(data: any): string[] {
    const rules: string[] = [];
    
    if (data.neural_training_data?.anti_patterns?.component_discovery_failure?.detection_rules) {
      rules.push(...data.neural_training_data.anti_patterns.component_discovery_failure.detection_rules);
    }
    
    if (data.prevention_strategies?.before_fixing) {
      rules.push(...data.prevention_strategies.before_fixing);
    }
    
    return rules.filter(Boolean);
  }

  private extractFalseFixIndicators(data: any): string[] {
    const indicators: string[] = [];
    
    if (data.anti_pattern_identification?.false_fix_indicators) {
      indicators.push(...data.anti_pattern_identification.false_fix_indicators);
    }
    
    return indicators.filter(Boolean);
  }

  private extractPreventionRules(data: any): string[] {
    const rules: string[] = [];
    
    if (data.tdd_enhancement_recommendations?.immediate_fixes) {
      rules.push(...data.tdd_enhancement_recommendations.immediate_fixes.map((f: any) => f.fix));
    }
    
    if (data.neural_training_export?.prevention_strategies) {
      rules.push(...data.neural_training_export.prevention_strategies.map((s: any) => s.implementation));
    }
    
    if (data.prevention_strategies?.validation_rules) {
      rules.push(...data.prevention_strategies.validation_rules);
    }
    
    return rules.filter(Boolean);
  }

  private extractTestPatterns(data: any): string[] {
    const patterns: string[] = [];
    
    if (data.neural_training_export?.test_patterns) {
      patterns.push(...data.neural_training_export.test_patterns.map((p: any) => p.assertion));
    }
    
    if (data.recommendedTDDPatterns) {
      patterns.push(...data.recommendedTDDPatterns);
    }
    
    return patterns.filter(Boolean);
  }

  private extractSuccessIndicators(data: any): string[] {
    const indicators: string[] = [];
    
    if (data.prediction_model?.success_indicators) {
      indicators.push(...data.prediction_model.success_indicators);
    }
    
    if (data.successPattern?.characteristics) {
      indicators.push(JSON.stringify(data.successPattern.characteristics));
    }
    
    return indicators.filter(Boolean);
  }

  private estimateResolutionTime(data: any): number {
    // Estimate based on severity and complexity
    const severity = data.nld_analysis?.severity || 'MEDIUM';
    const baseTime = {
      'CRITICAL': 4 * 3600000, // 4 hours
      'HIGH': 2 * 3600000,     // 2 hours  
      'MEDIUM': 1 * 3600000,   // 1 hour
      'LOW': 0.5 * 3600000     // 30 minutes
    };
    
    return baseTime[severity] || baseTime['MEDIUM'];
  }

  private calculatePatternDistribution(records: NeuralTrainingRecord[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const record of records) {
      distribution[record.patternType] = (distribution[record.patternType] || 0) + 1;
    }
    
    return distribution;
  }

  private calculateSeverityDistribution(records: NeuralTrainingRecord[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const record of records) {
      distribution[record.severity] = (distribution[record.severity] || 0) + 1;
    }
    
    return distribution;
  }

  async exportNeuralTrainingData(dataset: ConsolidatedNeuralDataset): Promise<void> {
    // Ensure output directory exists
    await fs.mkdir(this.outputDirectory, { recursive: true });

    // Export complete dataset
    const completeDatasetPath = path.join(this.outputDirectory, 'complete-neural-training-dataset.json');
    await fs.writeFile(completeDatasetPath, JSON.stringify(dataset, null, 2));

    // Export claude-flow compatible format
    const claudeFlowFormat = this.convertToClaudeFlowFormat(dataset);
    const claudeFlowPath = path.join(this.outputDirectory, 'claude-flow-neural-patterns.json');
    await fs.writeFile(claudeFlowPath, JSON.stringify(claudeFlowFormat, null, 2));

    // Export summary statistics
    const summaryPath = path.join(this.outputDirectory, 'training-data-summary.json');
    const summary = {
      exportDate: dataset.exportTimestamp,
      totalRecords: dataset.totalRecords,
      patternCategories: dataset.patternCategories,
      severityDistribution: dataset.severityDistribution,
      averageEffectivenessScore: dataset.trainingRecords.reduce((sum, r) => sum + r.effectivenessScore, 0) / dataset.totalRecords,
      highRiskPatterns: dataset.trainingRecords.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH').length,
      tddRecommendedPatterns: dataset.trainingRecords.filter(r => r.tddFactor < 0.3).length
    };
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

    console.log(`Neural training data exported to ${this.outputDirectory}`);
    console.log(`Total records: ${dataset.totalRecords}`);
    console.log(`Pattern categories: ${Object.keys(dataset.patternCategories).length}`);
    console.log(`High-risk patterns: ${summary.highRiskPatterns}`);
  }

  private convertToClaudeFlowFormat(dataset: ConsolidatedNeuralDataset): any {
    return {
      version: '1.0.0',
      type: 'anti-pattern-prevention',
      source: 'agent-feed-nld',
      exportTimestamp: dataset.exportTimestamp,
      patterns: dataset.trainingRecords.map(record => ({
        id: record.recordId,
        type: record.patternType,
        category: record.failureCategory,
        weight: record.neuralWeight,
        input: {
          task: record.context.originalTask,
          component: record.context.component,
          complexity: record.context.complexity,
          symptoms: record.failureSignature.symptoms
        },
        output: {
          success: record.effectivenessScore > 0.5,
          confidence: record.claudeConfidence,
          userSatisfaction: record.userSuccessRate
        },
        training: {
          detectionRules: record.failureSignature.detectionRules,
          preventionRules: record.prevention.rules,
          testPatterns: record.prevention.testPatterns
        },
        metadata: {
          severity: record.severity,
          tddFactor: record.tddFactor,
          lastOccurrence: record.historicalData.lastOccurrence,
          resolutionTime: record.historicalData.timeToResolve
        }
      }))
    };
  }
}

// Export function for use in tests
export async function exportAllNeuralTrainingData(): Promise<ConsolidatedNeuralDataset> {
  const exporter = new NeuralTrainingExporter();
  const dataset = await exporter.consolidateAllFailurePatterns();
  await exporter.exportNeuralTrainingData(dataset);
  return dataset;
}

// CLI execution
if (require.main === module) {
  exportAllNeuralTrainingData()
    .then(dataset => {
      console.log('Neural training data export completed successfully');
      console.log(`Exported ${dataset.totalRecords} training records`);
    })
    .catch(error => {
      console.error('Failed to export neural training data:', error);
      process.exit(1);
    });
}