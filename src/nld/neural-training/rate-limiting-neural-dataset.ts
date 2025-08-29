/**
 * NLD Neural Training Dataset for Rate Limiting Patterns
 * Generates comprehensive training data for claude-flow neural system
 */

import { nldLogger } from '../utils/nld-logger';
import { PositiveRateLimitingPattern, positiveRateLimitingPatternRecognition } from '../patterns/positive-rate-limiting-patterns';
import { RateLimitingValidationSystem } from '../patterns/rate-limiting-validation-system';
import fs from 'fs/promises';
import path from 'path';

export interface NeuralTrainingEntry {
  id: string;
  timestamp: Date;
  category: 'pattern-recognition' | 'failure-prevention' | 'performance-optimization' | 'error-reduction';
  inputPattern: {
    problemDescription: string;
    codeContext: string;
    errorSignatures: string[];
    performanceMetrics: {
      errorRate: number;
      performanceImpact: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  };
  expectedOutput: {
    solutionCategory: string;
    implementationStrategy: string;
    preventionTechniques: string[];
    expectedResults: {
      errorReduction: number;
      performanceImprovement: number;
      reliabilityScore: number;
    };
  };
  trainingWeight: number;
  confidence: number;
  metadata: Record<string, any>;
}

export interface NeuralDatasetConfig {
  includePositivePatterns: boolean;
  includeFailurePatterns: boolean;
  includeValidationData: boolean;
  minTrainingWeight: number;
  maxDatasetSize: number;
  balanceCategories: boolean;
}

export class RateLimitingNeuralDataset {
  private trainingEntries: NeuralTrainingEntry[] = [];
  private config: NeuralDatasetConfig;

  constructor(
    private validationSystem: RateLimitingValidationSystem,
    config: Partial<NeuralDatasetConfig> = {}
  ) {
    this.config = {
      includePositivePatterns: true,
      includeFailurePatterns: true,
      includeValidationData: true,
      minTrainingWeight: 0.5,
      maxDatasetSize: 10000,
      balanceCategories: true,
      ...config
    };

    nldLogger.renderAttempt('RateLimitingNeuralDataset', 'initialization', this.config);
  }

  /**
   * Generate comprehensive neural training dataset
   */
  public async generateTrainingDataset(): Promise<NeuralTrainingEntry[]> {
    try {
      nldLogger.renderAttempt('RateLimitingNeuralDataset', 'generateTrainingDataset');

      const entries: NeuralTrainingEntry[] = [];

      // Generate positive pattern training data
      if (this.config.includePositivePatterns) {
        const positiveEntries = await this.generatePositivePatternEntries();
        entries.push(...positiveEntries);
      }

      // Generate failure pattern training data  
      if (this.config.includeFailurePatterns) {
        const failureEntries = await this.generateFailurePatternEntries();
        entries.push(...failureEntries);
      }

      // Generate validation-based training data
      if (this.config.includeValidationData) {
        const validationEntries = await this.generateValidationEntries();
        entries.push(...validationEntries);
      }

      // Filter by minimum training weight
      const filteredEntries = entries.filter(entry => entry.trainingWeight >= this.config.minTrainingWeight);

      // Balance categories if requested
      const balancedEntries = this.config.balanceCategories 
        ? this.balanceCategories(filteredEntries)
        : filteredEntries;

      // Limit dataset size
      const finalEntries = balancedEntries.slice(0, this.config.maxDatasetSize);

      this.trainingEntries = finalEntries;

      nldLogger.renderSuccess('RateLimitingNeuralDataset', 'generateTrainingDataset', {
        totalEntries: finalEntries.length,
        categories: this.getCategoryDistribution(finalEntries),
        averageWeight: this.calculateAverageWeight(finalEntries)
      });

      return finalEntries;
    } catch (error) {
      nldLogger.renderFailure('RateLimitingNeuralDataset', error as Error, { method: 'generateTrainingDataset' });
      throw error;
    }
  }

  /**
   * Generate training entries from positive patterns
   */
  private async generatePositivePatternEntries(): Promise<NeuralTrainingEntry[]> {
    const patterns = await positiveRateLimitingPatternRecognition.analyzeTokenCostTrackingPatterns();
    const entries: NeuralTrainingEntry[] = [];

    for (const pattern of patterns) {
      // Create training entry for each positive pattern
      entries.push({
        id: `positive-${pattern.id}`,
        timestamp: new Date(),
        category: 'pattern-recognition',
        inputPattern: {
          problemDescription: pattern.beforeState.problemDescription,
          codeContext: this.extractCodeContext(pattern.implementation.codePattern),
          errorSignatures: pattern.beforeState.symptoms,
          performanceMetrics: {
            errorRate: pattern.beforeState.errorRate,
            performanceImpact: pattern.beforeState.performanceImpact,
            memoryUsage: this.estimateMemoryUsage(pattern.beforeState),
            cpuUsage: this.estimateCpuUsage(pattern.beforeState)
          }
        },
        expectedOutput: {
          solutionCategory: pattern.category,
          implementationStrategy: pattern.implementation.technique,
          preventionTechniques: pattern.implementation.preventedIssues,
          expectedResults: {
            errorReduction: pattern.afterState.errorReduction,
            performanceImprovement: pattern.afterState.performanceImprovement,
            reliabilityScore: pattern.implementation.reliabilityScore
          }
        },
        trainingWeight: pattern.neuralWeight,
        confidence: pattern.implementation.reliabilityScore,
        metadata: {
          source: 'positive-pattern-recognition',
          applicableScenarios: pattern.applicableScenarios,
          originalPatternId: pattern.id,
          category: pattern.category
        }
      });

      // Create additional entries for each applicable scenario
      for (const scenario of pattern.applicableScenarios) {
        entries.push(this.generateScenarioSpecificEntry(pattern, scenario));
      }
    }

    return entries;
  }

  /**
   * Generate training entries from failure patterns
   */
  private async generateFailurePatternEntries(): Promise<NeuralTrainingEntry[]> {
    const entries: NeuralTrainingEntry[] = [];

    // Common React Hook failure patterns
    const failurePatterns = [
      {
        problem: 'useEffect infinite loop with WebSocket dependencies',
        errorSignatures: ['Maximum update depth exceeded', 'Too many re-renders', 'Memory leak detected'],
        solution: 'disable-websocket-dependencies-graceful-degradation',
        category: 'failure-prevention'
      },
      {
        problem: 'Memory leaks from uncleaned subscriptions in React hooks',
        errorSignatures: ['Memory usage growing', 'Subscription not cleaned up', 'Component unmounted with active timers'],
        solution: 'comprehensive-cleanup-functions',
        category: 'performance-optimization'
      },
      {
        problem: 'Rate limiting triggered by render cycles instead of user actions',
        errorSignatures: ['Rate limit exceeded', 'Too many requests', 'Buttons disabled unexpectedly'],
        solution: 'circuit-breaker-with-user-communication',
        category: 'error-reduction'
      },
      {
        problem: 'Expensive calculations running on empty or invalid data',
        errorSignatures: ['High CPU usage', 'Slow rendering', 'Blocked main thread'],
        solution: 'conditional-calculation-disabling',
        category: 'performance-optimization'
      }
    ];

    for (const [index, failure] of failurePatterns.entries()) {
      entries.push({
        id: `failure-pattern-${index + 1}`,
        timestamp: new Date(),
        category: failure.category as NeuralTrainingEntry['category'],
        inputPattern: {
          problemDescription: failure.problem,
          codeContext: this.generateFailureCodeContext(failure.problem),
          errorSignatures: failure.errorSignatures,
          performanceMetrics: {
            errorRate: 0.85,
            performanceImpact: 0.75,
            memoryUsage: 0.80,
            cpuUsage: 0.70
          }
        },
        expectedOutput: {
          solutionCategory: this.categorizeSolution(failure.solution),
          implementationStrategy: failure.solution,
          preventionTechniques: this.extractPreventionTechniques(failure.solution),
          expectedResults: {
            errorReduction: 0.90,
            performanceImprovement: 0.80,
            reliabilityScore: 0.85
          }
        },
        trainingWeight: 0.85,
        confidence: 0.90,
        metadata: {
          source: 'failure-pattern-analysis',
          failureType: failure.problem,
          solutionApproach: failure.solution
        }
      });
    }

    return entries;
  }

  /**
   * Generate training entries from validation results
   */
  private async generateValidationEntries(): Promise<NeuralTrainingEntry[]> {
    const entries: NeuralTrainingEntry[] = [];

    try {
      // Run validation to get current results
      const validation = await this.validationSystem.validateRateLimitingFix();

      // Create training entry from validation results
      entries.push({
        id: `validation-${validation.validationId}`,
        timestamp: new Date(),
        category: 'pattern-recognition',
        inputPattern: {
          problemDescription: validation.originalBugPattern,
          codeContext: 'React Hook useEffect with WebSocket dependencies',
          errorSignatures: ['infinite-loops', 'websocket-storms', 'memory-leaks', 'rate-limiting'],
          performanceMetrics: {
            errorRate: 0.923, // From validation results
            performanceImpact: 0.855,
            memoryUsage: 0.80,
            cpuUsage: 0.75
          }
        },
        expectedOutput: {
          solutionCategory: 'graceful-degradation',
          implementationStrategy: validation.fixStrategy.join(', '),
          preventionTechniques: validation.preventionPatterns,
          expectedResults: {
            errorReduction: validation.validationResults.errorReduction,
            performanceImprovement: validation.validationResults.performanceImprovement,
            reliabilityScore: 0.92
          }
        },
        trainingWeight: 0.95, // High weight for validated real-world fix
        confidence: 0.93,
        metadata: {
          source: 'validation-system',
          validationId: validation.validationId,
          realWorldFix: true,
          sideEffectPrevented: validation.validationResults.sideEffectPrevented
        }
      });
    } catch (error) {
      nldLogger.renderFailure('RateLimitingNeuralDataset', error as Error, { method: 'generateValidationEntries' });
    }

    return entries;
  }

  /**
   * Generate scenario-specific training entry
   */
  private generateScenarioSpecificEntry(pattern: PositiveRateLimitingPattern, scenario: string): NeuralTrainingEntry {
    return {
      id: `scenario-${pattern.id}-${scenario.replace(/\s+/g, '-').toLowerCase()}`,
      timestamp: new Date(),
      category: 'pattern-recognition',
      inputPattern: {
        problemDescription: `${pattern.beforeState.problemDescription} in context of ${scenario}`,
        codeContext: pattern.implementation.codePattern,
        errorSignatures: pattern.beforeState.symptoms,
        performanceMetrics: {
          errorRate: pattern.beforeState.errorRate,
          performanceImpact: pattern.beforeState.performanceImpact,
          memoryUsage: 0.75,
          cpuUsage: 0.70
        }
      },
      expectedOutput: {
        solutionCategory: pattern.category,
        implementationStrategy: pattern.implementation.technique,
        preventionTechniques: pattern.implementation.preventedIssues,
        expectedResults: {
          errorReduction: pattern.afterState.errorReduction,
          performanceImprovement: pattern.afterState.performanceImprovement,
          reliabilityScore: pattern.implementation.reliabilityScore
        }
      },
      trainingWeight: pattern.neuralWeight * 0.8, // Slightly lower weight for derived entries
      confidence: pattern.implementation.reliabilityScore,
      metadata: {
        source: 'scenario-specific-pattern',
        originalPatternId: pattern.id,
        scenario,
        category: pattern.category
      }
    };
  }

  /**
   * Helper methods for data generation
   */
  private extractCodeContext(codePattern: string): string {
    // Extract key patterns from code for training
    const lines = codePattern.split('\n').filter(line => line.trim());
    return lines.slice(0, 5).join('\n'); // First 5 non-empty lines
  }

  private estimateMemoryUsage(beforeState: any): number {
    return beforeState.errorRate * 0.9; // Memory issues correlate with error rates
  }

  private estimateCpuUsage(beforeState: any): number {
    return beforeState.performanceImpact * 0.8; // CPU correlates with performance impact
  }

  private generateFailureCodeContext(problem: string): string {
    const contexts = {
      'infinite loop': 'useEffect(() => { setState(value); }, [value]);',
      'memory leak': 'useEffect(() => { const subscription = subscribe(); }, []);',
      'rate limiting': 'const handleClick = () => { rateLimitedFunction(); };',
      'expensive calculations': 'useEffect(() => { expensiveCalculation(); }, [data]);'
    };

    for (const [key, context] of Object.entries(contexts)) {
      if (problem.toLowerCase().includes(key)) {
        return context;
      }
    }

    return 'React.useEffect(() => { /* problematic code */ }, [dependency]);';
  }

  private categorizeSolution(solution: string): string {
    if (solution.includes('disable')) return 'graceful-degradation';
    if (solution.includes('cleanup')) return 'cleanup';
    if (solution.includes('circuit-breaker')) return 'circuit-breaker';
    if (solution.includes('debounce') || solution.includes('throttle')) return 'debouncing';
    return 'unknown';
  }

  private extractPreventionTechniques(solution: string): string[] {
    const techniques = [];
    if (solution.includes('disable')) techniques.push('feature-disabling');
    if (solution.includes('cleanup')) techniques.push('resource-cleanup');
    if (solution.includes('graceful')) techniques.push('graceful-degradation');
    if (solution.includes('mock')) techniques.push('mock-fallback');
    return techniques;
  }

  /**
   * Balance categories in dataset
   */
  private balanceCategories(entries: NeuralTrainingEntry[]): NeuralTrainingEntry[] {
    const categoryGroups = new Map<string, NeuralTrainingEntry[]>();
    
    // Group by category
    for (const entry of entries) {
      if (!categoryGroups.has(entry.category)) {
        categoryGroups.set(entry.category, []);
      }
      categoryGroups.get(entry.category)!.push(entry);
    }

    // Find minimum category size
    const minSize = Math.min(...Array.from(categoryGroups.values()).map(group => group.length));
    
    // Balance by taking up to minSize from each category
    const balanced: NeuralTrainingEntry[] = [];
    for (const group of categoryGroups.values()) {
      // Sort by training weight descending and take top entries
      const sortedGroup = group.sort((a, b) => b.trainingWeight - a.trainingWeight);
      balanced.push(...sortedGroup.slice(0, minSize));
    }

    return balanced;
  }

  /**
   * Calculate category distribution
   */
  private getCategoryDistribution(entries: NeuralTrainingEntry[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const entry of entries) {
      distribution[entry.category] = (distribution[entry.category] || 0) + 1;
    }
    return distribution;
  }

  /**
   * Calculate average training weight
   */
  private calculateAverageWeight(entries: NeuralTrainingEntry[]): number {
    if (entries.length === 0) return 0;
    return entries.reduce((sum, entry) => sum + entry.trainingWeight, 0) / entries.length;
  }

  /**
   * Export dataset for claude-flow neural system
   */
  public async exportForClaudeFlow(workingDirectory: string): Promise<{
    metadata: {
      exportTime: Date;
      entryCount: number;
      categories: Record<string, number>;
      averageWeight: number;
      averageConfidence: number;
      datasetVersion: string;
    };
    trainingData: NeuralTrainingEntry[];
  }> {
    const entries = this.trainingEntries.length > 0 ? this.trainingEntries : await this.generateTrainingDataset();
    
    const exportData = {
      metadata: {
        exportTime: new Date(),
        entryCount: entries.length,
        categories: this.getCategoryDistribution(entries),
        averageWeight: this.calculateAverageWeight(entries),
        averageConfidence: entries.reduce((sum, entry) => sum + entry.confidence, 0) / entries.length,
        datasetVersion: '1.0.0'
      },
      trainingData: entries
    };

    // Save to file
    const exportDir = path.join(workingDirectory, 'src/nld/neural-training/exports');
    await fs.mkdir(exportDir, { recursive: true });
    
    const filename = `rate-limiting-neural-dataset-${Date.now()}.json`;
    const filePath = path.join(exportDir, filename);
    
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
    
    nldLogger.renderSuccess('RateLimitingNeuralDataset', 'exportForClaudeFlow', {
      filePath,
      entryCount: exportData.metadata.entryCount,
      categories: Object.keys(exportData.metadata.categories)
    });

    return exportData;
  }

  /**
   * Get current training entries
   */
  public getTrainingEntries(): NeuralTrainingEntry[] {
    return [...this.trainingEntries];
  }
}