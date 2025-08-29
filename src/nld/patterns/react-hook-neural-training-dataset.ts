/**
 * React Hook Neural Training Dataset
 * NLD Neural Training Module for React Hook Side Effect patterns
 * 
 * Exports training data for claude-flow neural system to learn and prevent
 * React Hook side effect bugs in render cycles
 */

import { ReactHookSideEffectPattern, reactHookSideEffectDetector } from './react-hook-side-effect-detector';
import { nldLogger } from '../utils/nld-logger';

export interface NeuralTrainingDataPoint {
  id: string;
  timestamp: Date;
  inputFeatures: {
    componentName: string;
    hookName: string;
    renderCycleCount: number;
    userActionCount: number;
    renderToActionRatio: number;
    sideEffectType: string;
    sourceFileType: string;
    hookComplexityScore: number;
    componentSize: number;
    dependencyCount: number;
  };
  outputLabels: {
    isPattern: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    patternType: string;
    preventionStrategy: string;
    tddTestRequired: boolean;
  };
  contextFeatures: {
    symptom: string;
    rootCause: string;
    stackTrace?: string;
    sourceLocation: {
      file: string;
      line: number;
      column: number;
    };
  };
  metadata: Record<string, any>;
}

export interface TrainingDatasetConfig {
  maxSamples: number;
  balanceDataset: boolean;
  includeNegativeSamples: boolean;
  featureNormalization: boolean;
  crossValidationSplit: number;
}

export interface PreventionStrategy {
  name: string;
  description: string;
  implementation: string;
  tddTestPattern: string;
  effectiveness: number; // 0-1 score
}

export class ReactHookNeuralTrainingDataset {
  private trainingData: NeuralTrainingDataPoint[] = [];
  private config: TrainingDatasetConfig;
  private preventionStrategies: Map<string, PreventionStrategy>;

  constructor(config: Partial<TrainingDatasetConfig> = {}) {
    this.config = {
      maxSamples: 10000,
      balanceDataset: true,
      includeNegativeSamples: true,
      featureNormalization: true,
      crossValidationSplit: 0.2,
      ...config
    };

    this.preventionStrategies = new Map();
    this.initializePreventionStrategies();

    nldLogger.renderAttempt('ReactHookNeuralTrainingDataset', 'initialization', this.config);
  }

  /**
   * Initialize prevention strategies based on observed patterns
   */
  private initializePreventionStrategies(): void {
    const strategies: PreventionStrategy[] = [
      {
        name: 'useEffect-migration',
        description: 'Move side effects from render to useEffect hook',
        implementation: 'Replace side effects in hook body with useEffect calls',
        tddTestPattern: 'Test that side effects only occur after mount/update',
        effectiveness: 0.95
      },
      {
        name: 'rate-limit-removal',
        description: 'Remove rate limiting from render-triggered functions',
        implementation: 'Move rate limiting to event handlers or API layer',
        tddTestPattern: 'Test that UI remains responsive during rapid renders',
        effectiveness: 0.88
      },
      {
        name: 'state-isolation',
        description: 'Isolate state mutations from render cycle',
        implementation: 'Use reducers or separate state management',
        tddTestPattern: 'Test state changes only occur via dispatched actions',
        effectiveness: 0.92
      },
      {
        name: 'lazy-initialization',
        description: 'Defer expensive computations using useMemo/useCallback',
        implementation: 'Wrap expensive operations in memoization hooks',
        tddTestPattern: 'Test computations only run when dependencies change',
        effectiveness: 0.85
      },
      {
        name: 'event-delegation',
        description: 'Move event emissions to user interaction handlers',
        implementation: 'Replace render-time events with onClick/onChange handlers',
        tddTestPattern: 'Test events only fire on user interactions',
        effectiveness: 0.90
      }
    ];

    strategies.forEach(strategy => {
      this.preventionStrategies.set(strategy.name, strategy);
    });
  }

  /**
   * Convert pattern to neural training data point
   */
  public createTrainingDataPoint(
    pattern: ReactHookSideEffectPattern,
    additionalContext: {
      componentSize?: number;
      dependencyCount?: number;
      hookComplexityScore?: number;
    } = {}
  ): NeuralTrainingDataPoint {
    try {
      const preventionStrategy = this.selectPreventionStrategy(pattern);
      
      const dataPoint: NeuralTrainingDataPoint = {
        id: `training-${pattern.id}`,
        timestamp: new Date(),
        inputFeatures: {
          componentName: pattern.componentName,
          hookName: pattern.hookName,
          renderCycleCount: pattern.renderCycleCount,
          userActionCount: pattern.userActionCount,
          renderToActionRatio: pattern.renderToActionRatio,
          sideEffectType: pattern.sideEffectType,
          sourceFileType: this.extractFileType(pattern.sourceLocation.file),
          hookComplexityScore: additionalContext.hookComplexityScore || this.calculateComplexityScore(pattern),
          componentSize: additionalContext.componentSize || 0,
          dependencyCount: additionalContext.dependencyCount || 0
        },
        outputLabels: {
          isPattern: true,
          severity: pattern.severity,
          patternType: `react-hook-${pattern.sideEffectType}`,
          preventionStrategy: preventionStrategy.name,
          tddTestRequired: this.shouldRequireTDDTest(pattern)
        },
        contextFeatures: {
          symptom: pattern.symptom,
          rootCause: pattern.rootCause,
          stackTrace: pattern.stackTrace,
          sourceLocation: pattern.sourceLocation
        },
        metadata: {
          ...pattern.metadata,
          preventionStrategy: preventionStrategy,
          trainingDataVersion: '1.0.0',
          generatedAt: new Date().toISOString()
        }
      };

      this.trainingData.push(dataPoint);
      
      nldLogger.renderSuccess('ReactHookNeuralTrainingDataset', 'training-data-point-created', {
        patternId: pattern.id,
        severity: pattern.severity,
        preventionStrategy: preventionStrategy.name
      });

      return dataPoint;
    } catch (error) {
      nldLogger.renderFailure('ReactHookNeuralTrainingDataset', error as Error, {
        patternId: pattern.id
      });
      throw error;
    }
  }

  /**
   * Select appropriate prevention strategy based on pattern
   */
  private selectPreventionStrategy(pattern: ReactHookSideEffectPattern): PreventionStrategy {
    switch (pattern.sideEffectType) {
      case 'rate-limiting':
        return this.preventionStrategies.get('rate-limit-removal')!;
      case 'state-mutation':
        return this.preventionStrategies.get('state-isolation')!;
      case 'api-call':
        return this.preventionStrategies.get('useEffect-migration')!;
      case 'dom-manipulation':
        return this.preventionStrategies.get('lazy-initialization')!;
      case 'event-emission':
        return this.preventionStrategies.get('event-delegation')!;
      default:
        return this.preventionStrategies.get('useEffect-migration')!;
    }
  }

  /**
   * Calculate hook complexity score
   */
  private calculateComplexityScore(pattern: ReactHookSideEffectPattern): number {
    let score = 0;
    
    // Base complexity
    score += pattern.renderCycleCount * 0.1;
    score += pattern.renderToActionRatio * 0.2;
    
    // Severity multiplier
    const severityMultipliers = {
      low: 1.0,
      medium: 1.5,
      high: 2.0,
      critical: 3.0
    };
    score *= severityMultipliers[pattern.severity];
    
    // Side effect type complexity
    const typeComplexity = {
      'rate-limiting': 0.8,
      'state-mutation': 1.0,
      'api-call': 0.9,
      'dom-manipulation': 0.7,
      'event-emission': 0.6
    };
    score *= typeComplexity[pattern.sideEffectType] || 1.0;
    
    return Math.min(score, 10.0); // Cap at 10
  }

  /**
   * Extract file type from path
   */
  private extractFileType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }

  /**
   * Determine if TDD test is required
   */
  private shouldRequireTDDTest(pattern: ReactHookSideEffectPattern): boolean {
    // High severity patterns always need TDD tests
    if (pattern.severity === 'high' || pattern.severity === 'critical') {
      return true;
    }

    // Rate limiting and state mutation patterns need TDD
    if (pattern.sideEffectType === 'rate-limiting' || pattern.sideEffectType === 'state-mutation') {
      return true;
    }

    // High render-to-action ratio needs TDD
    return pattern.renderToActionRatio > 3.0;
  }

  /**
   * Generate negative samples for balanced training
   */
  public generateNegativeSamples(count: number): NeuralTrainingDataPoint[] {
    const negativesamples: NeuralTrainingDataPoint[] = [];

    for (let i = 0; i < count; i++) {
      const sample: NeuralTrainingDataPoint = {
        id: `negative-sample-${Date.now()}-${i}`,
        timestamp: new Date(),
        inputFeatures: {
          componentName: `HealthyComponent${i}`,
          hookName: `useHealthyHook${i}`,
          renderCycleCount: Math.floor(Math.random() * 3) + 1, // Low render count
          userActionCount: Math.floor(Math.random() * 5) + 1,
          renderToActionRatio: Math.random() * 0.8 + 0.2, // Low ratio
          sideEffectType: 'none',
          sourceFileType: 'tsx',
          hookComplexityScore: Math.random() * 2, // Low complexity
          componentSize: Math.floor(Math.random() * 100) + 50,
          dependencyCount: Math.floor(Math.random() * 5)
        },
        outputLabels: {
          isPattern: false,
          severity: 'low',
          patternType: 'healthy-hook',
          preventionStrategy: 'none-required',
          tddTestRequired: false
        },
        contextFeatures: {
          symptom: 'No side effects detected',
          rootCause: 'Proper React hook usage',
          sourceLocation: {
            file: `/healthy/Component${i}.tsx`,
            line: 1,
            column: 1
          }
        },
        metadata: {
          isNegativeSample: true,
          generatedAt: new Date().toISOString()
        }
      };

      negativeSamples.push(sample);
    }

    nldLogger.renderSuccess('ReactHookNeuralTrainingDataset', 'negative-samples-generated', {
      count: negativeSamples.length
    });

    return negativeSamples;
  }

  /**
   * Process all detected patterns into training data
   */
  public processAllPatterns(): void {
    const patterns = reactHookSideEffectDetector.getPatterns();
    
    patterns.forEach(pattern => {
      this.createTrainingDataPoint(pattern);
    });

    // Add negative samples if configured
    if (this.config.includeNegativeSamples) {
      const negativeCount = Math.floor(patterns.length * 0.3); // 30% negative samples
      const negativeSamples = this.generateNegativeSamples(negativeCount);
      this.trainingData.push(...negativeSamples);
    }

    nldLogger.renderSuccess('ReactHookNeuralTrainingDataset', 'all-patterns-processed', {
      totalPatterns: patterns.length,
      trainingDataCount: this.trainingData.length
    });
  }

  /**
   * Export training dataset in claude-flow neural format
   */
  public exportForClaudeFlowNeural(): {
    metadata: {
      exportTime: Date;
      version: string;
      sampleCount: number;
      config: TrainingDatasetConfig;
      preventionStrategies: PreventionStrategy[];
    };
    trainingData: {
      inputs: any[];
      outputs: any[];
      features: string[];
      labels: string[];
    };
    crossValidation: {
      trainingSplit: any[];
      validationSplit: any[];
    };
  } {
    try {
      // Normalize features if configured
      const processedData = this.config.featureNormalization 
        ? this.normalizeFeatures(this.trainingData)
        : this.trainingData;

      // Split data for cross-validation
      const splitIndex = Math.floor(processedData.length * (1 - this.config.crossValidationSplit));
      const trainingSplit = processedData.slice(0, splitIndex);
      const validationSplit = processedData.slice(splitIndex);

      // Prepare inputs and outputs
      const inputs = processedData.map(point => point.inputFeatures);
      const outputs = processedData.map(point => point.outputLabels);

      const exportData = {
        metadata: {
          exportTime: new Date(),
          version: '1.0.0',
          sampleCount: this.trainingData.length,
          config: this.config,
          preventionStrategies: Array.from(this.preventionStrategies.values())
        },
        trainingData: {
          inputs,
          outputs,
          features: Object.keys(this.trainingData[0]?.inputFeatures || {}),
          labels: Object.keys(this.trainingData[0]?.outputLabels || {})
        },
        crossValidation: {
          trainingSplit: trainingSplit.map(point => ({
            input: point.inputFeatures,
            output: point.outputLabels
          })),
          validationSplit: validationSplit.map(point => ({
            input: point.inputFeatures,
            output: point.outputLabels
          }))
        }
      };

      nldLogger.renderSuccess('ReactHookNeuralTrainingDataset', 'export-completed', {
        sampleCount: this.trainingData.length,
        trainingSamples: trainingSplit.length,
        validationSamples: validationSplit.length
      });

      return exportData;
    } catch (error) {
      nldLogger.renderFailure('ReactHookNeuralTrainingDataset', error as Error);
      throw error;
    }
  }

  /**
   * Normalize feature values for better neural network training
   */
  private normalizeFeatures(data: NeuralTrainingDataPoint[]): NeuralTrainingDataPoint[] {
    // Calculate min/max for numeric features
    const numericFields = ['renderCycleCount', 'userActionCount', 'renderToActionRatio', 'hookComplexityScore'];
    const stats = new Map<string, { min: number; max: number }>();

    // Calculate statistics
    numericFields.forEach(field => {
      const values = data.map(point => (point.inputFeatures as any)[field]).filter(val => typeof val === 'number');
      stats.set(field, {
        min: Math.min(...values),
        max: Math.max(...values)
      });
    });

    // Normalize data
    return data.map(point => {
      const normalizedInputs = { ...point.inputFeatures };
      
      numericFields.forEach(field => {
        const fieldStats = stats.get(field);
        if (fieldStats && typeof (normalizedInputs as any)[field] === 'number') {
          const value = (normalizedInputs as any)[field];
          const range = fieldStats.max - fieldStats.min;
          (normalizedInputs as any)[field] = range > 0 ? (value - fieldStats.min) / range : 0;
        }
      });

      return {
        ...point,
        inputFeatures: normalizedInputs
      };
    });
  }

  /**
   * Get training data statistics
   */
  public getStatistics(): {
    totalSamples: number;
    patternDistribution: Record<string, number>;
    severityDistribution: Record<string, number>;
    preventionStrategyDistribution: Record<string, number>;
  } {
    const stats = {
      totalSamples: this.trainingData.length,
      patternDistribution: {} as Record<string, number>,
      severityDistribution: {} as Record<string, number>,
      preventionStrategyDistribution: {} as Record<string, number>
    };

    this.trainingData.forEach(point => {
      // Pattern type distribution
      const patternType = point.outputLabels.patternType;
      stats.patternDistribution[patternType] = (stats.patternDistribution[patternType] || 0) + 1;

      // Severity distribution
      const severity = point.outputLabels.severity;
      stats.severityDistribution[severity] = (stats.severityDistribution[severity] || 0) + 1;

      // Prevention strategy distribution
      const strategy = point.outputLabels.preventionStrategy;
      stats.preventionStrategyDistribution[strategy] = (stats.preventionStrategyDistribution[strategy] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clear training data for memory management
   */
  public clearTrainingData(): void {
    const count = this.trainingData.length;
    this.trainingData = [];
    
    nldLogger.renderSuccess('ReactHookNeuralTrainingDataset', 'training-data-cleared', {
      clearedCount: count
    });
  }
}

/**
 * Global training dataset instance
 */
export const reactHookNeuralTrainingDataset = new ReactHookNeuralTrainingDataset({
  maxSamples: 5000,
  balanceDataset: true,
  includeNegativeSamples: true,
  featureNormalization: true,
  crossValidationSplit: 0.2
});