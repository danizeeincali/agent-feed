import { nldLogger } from '@/utils/nld-logger';

export interface RegressionPattern {
  id: string;
  type: 'failure' | 'performance' | 'error' | 'success';
  pattern: string;
  confidence: number;
  frequency: number;
  lastSeen: Date;
  impact: 'low' | 'medium' | 'high' | 'critical';
  context: {
    component?: string;
    testType?: string;
    environment?: string;
    metadata?: Record<string, any>;
  };
}

export interface PredictionResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  predictedFailures: string[];
  recommendations: string[];
  reasoning: string[];
}

export interface AnalysisMetrics {
  totalPatterns: number;
  accuracyRate: number;
  predictionSuccess: number;
  learningTrends: {
    improving: boolean;
    accuracy: number;
    confidence: number;
  };
}

/**
 * Advanced NLD-powered regression pattern analyzer
 * Learns from test outcomes to predict and prevent regressions
 */
export class RegressionPatternAnalyzer {
  private patterns: Map<string, RegressionPattern> = new Map();
  private historicalData: Array<{
    timestamp: Date;
    testResult: any;
    prediction?: PredictionResult;
    actualOutcome: boolean;
  }> = [];

  constructor(private config: {
    maxPatterns?: number;
    confidenceThreshold?: number;
    learningRate?: number;
    retentionPeriod?: number; // days
  } = {}) {
    this.config = {
      maxPatterns: 1000,
      confidenceThreshold: 0.7,
      learningRate: 0.1,
      retentionPeriod: 30,
      ...config
    };

    this.loadHistoricalPatterns();
  }

  /**
   * Analyze test results to identify patterns and learn
   */
  public analyzeTestResult(testResult: {
    testName: string;
    component: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: Error;
    metadata?: Record<string, any>;
  }): void {
    nldLogger.renderAttempt('RegressionPatternAnalyzer', 'analyzeTestResult', testResult);

    try {
      // Extract patterns from the test result
      const patterns = this.extractPatterns(testResult);
      
      // Update existing patterns or create new ones
      patterns.forEach(pattern => this.updatePattern(pattern));

      // Store for historical analysis
      this.historicalData.push({
        timestamp: new Date(),
        testResult,
        actualOutcome: testResult.status === 'passed'
      });

      // Cleanup old data
      this.cleanupHistoricalData();

      nldLogger.renderSuccess('RegressionPatternAnalyzer', 'analyzeTestResult');
    } catch (error) {
      nldLogger.renderFailure('RegressionPatternAnalyzer', error as Error, testResult);
      throw error;
    }
  }

  /**
   * Predict potential issues based on learned patterns
   */
  public predictRegressionRisk(changeContext: {
    files: string[];
    components: string[];
    testTypes: string[];
    metadata?: Record<string, any>;
  }): PredictionResult {
    nldLogger.renderAttempt('RegressionPatternAnalyzer', 'predictRegressionRisk', changeContext);

    try {
      const relevantPatterns = this.findRelevantPatterns(changeContext);
      const riskCalculation = this.calculateRisk(relevantPatterns, changeContext);
      
      const result: PredictionResult = {
        riskLevel: this.determineRiskLevel(riskCalculation.totalRisk),
        confidence: riskCalculation.confidence,
        predictedFailures: riskCalculation.predictedFailures,
        recommendations: this.generateRecommendations(relevantPatterns, changeContext),
        reasoning: riskCalculation.reasoning
      };

      nldLogger.renderSuccess('RegressionPatternAnalyzer', 'predictRegressionRisk');
      return result;
    } catch (error) {
      nldLogger.renderFailure('RegressionPatternAnalyzer', error as Error, changeContext);
      throw error;
    }
  }

  /**
   * Get comprehensive analysis metrics
   */
  public getAnalysisMetrics(): AnalysisMetrics {
    const totalPatterns = this.patterns.size;
    const recentPredictions = this.historicalData.filter(
      data => data.prediction && Date.now() - data.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    const accuracyRate = recentPredictions.length > 0 
      ? recentPredictions.filter(data => {
          const predicted = data.prediction!.riskLevel === 'high' || data.prediction!.riskLevel === 'critical';
          return predicted === !data.actualOutcome;
        }).length / recentPredictions.length
      : 0;

    return {
      totalPatterns,
      accuracyRate,
      predictionSuccess: accuracyRate,
      learningTrends: {
        improving: this.isAccuracyImproving(),
        accuracy: accuracyRate,
        confidence: this.getAverageConfidence()
      }
    };
  }

  /**
   * Get insights for specific component or test type
   */
  public getComponentInsights(component: string): {
    riskLevel: string;
    commonFailures: string[];
    recommendations: string[];
    trends: { improving: boolean; accuracy: number };
  } {
    const componentPatterns = Array.from(this.patterns.values())
      .filter(pattern => pattern.context.component === component);

    const failurePatterns = componentPatterns.filter(p => p.type === 'failure');
    const commonFailures = failurePatterns
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5)
      .map(p => p.pattern);

    const avgRisk = componentPatterns.reduce((sum, p) => {
      const riskScore = { low: 1, medium: 2, high: 3, critical: 4 }[p.impact];
      return sum + riskScore;
    }, 0) / componentPatterns.length || 0;

    return {
      riskLevel: avgRisk > 3 ? 'critical' : avgRisk > 2 ? 'high' : avgRisk > 1 ? 'medium' : 'low',
      commonFailures,
      recommendations: this.generateComponentRecommendations(componentPatterns),
      trends: {
        improving: this.isComponentImproving(component),
        accuracy: this.getComponentAccuracy(component)
      }
    };
  }

  private extractPatterns(testResult: any): RegressionPattern[] {
    const patterns: RegressionPattern[] = [];

    // Error pattern extraction
    if (testResult.error) {
      patterns.push({
        id: `error_${this.generatePatternId(testResult.error.message)}`,
        type: 'error',
        pattern: testResult.error.message,
        confidence: 0.8,
        frequency: 1,
        lastSeen: new Date(),
        impact: this.classifyErrorImpact(testResult.error),
        context: {
          component: testResult.component,
          testType: 'error',
          metadata: testResult.metadata
        }
      });
    }

    // Performance pattern extraction
    if (testResult.duration > 5000) {
      patterns.push({
        id: `perf_${testResult.component}_slow`,
        type: 'performance',
        pattern: `${testResult.component} slow execution`,
        confidence: 0.7,
        frequency: 1,
        lastSeen: new Date(),
        impact: testResult.duration > 10000 ? 'high' : 'medium',
        context: {
          component: testResult.component,
          testType: 'performance',
          metadata: { duration: testResult.duration }
        }
      });
    }

    // Success pattern extraction
    if (testResult.status === 'passed') {
      patterns.push({
        id: `success_${testResult.component}`,
        type: 'success',
        pattern: `${testResult.component} successful execution`,
        confidence: 0.6,
        frequency: 1,
        lastSeen: new Date(),
        impact: 'low',
        context: {
          component: testResult.component,
          testType: 'success',
          metadata: testResult.metadata
        }
      });
    }

    return patterns;
  }

  private updatePattern(pattern: RegressionPattern): void {
    const existing = this.patterns.get(pattern.id);
    
    if (existing) {
      // Update existing pattern with learning
      existing.frequency += 1;
      existing.lastSeen = pattern.lastSeen;
      existing.confidence = Math.min(1.0, existing.confidence + this.config.learningRate!);
      
      // Update impact based on frequency
      if (existing.frequency > 10 && existing.impact !== 'critical') {
        existing.impact = this.escalateImpact(existing.impact);
      }
    } else {
      // Add new pattern
      this.patterns.set(pattern.id, pattern);
      
      // Cleanup if we exceed max patterns
      if (this.patterns.size > this.config.maxPatterns!) {
        this.cleanupPatterns();
      }
    }
  }

  private findRelevantPatterns(changeContext: any): RegressionPattern[] {
    return Array.from(this.patterns.values()).filter(pattern => {
      // Check component relevance
      if (changeContext.components.includes(pattern.context.component)) {
        return true;
      }

      // Check file relevance - also check if component name appears in file path
      const relevantFiles = changeContext.files.some((file: string) => {
        return file.includes(pattern.context.component || '') ||
               pattern.context.metadata?.files?.includes(file);
      });

      return relevantFiles;
    });
  }

  private calculateRisk(patterns: RegressionPattern[], changeContext: any) {
    const failurePatterns = patterns.filter(p => p.type === 'failure' || p.type === 'error');
    const performancePatterns = patterns.filter(p => p.type === 'performance');

    let totalRisk = 0;
    let confidence = 0;
    const predictedFailures: string[] = [];
    const reasoning: string[] = [];

    // Calculate failure risk
    failurePatterns.forEach(pattern => {
      const riskScore = { low: 0.1, medium: 0.3, high: 0.6, critical: 0.9 }[pattern.impact];
      const patternRisk = riskScore * pattern.confidence * (pattern.frequency / 100);
      
      totalRisk += patternRisk;
      confidence += pattern.confidence;
      
      if (patternRisk > 0.3) {
        predictedFailures.push(pattern.pattern);
        reasoning.push(`High risk pattern detected: ${pattern.pattern} (confidence: ${pattern.confidence})`);
      }
    });

    // Calculate performance risk
    performancePatterns.forEach(pattern => {
      if (pattern.confidence > 0.7) {
        reasoning.push(`Performance degradation likely in ${pattern.context.component}`);
      }
    });

    return {
      totalRisk: Math.min(1.0, totalRisk),
      confidence: patterns.length > 0 ? confidence / patterns.length : 0,
      predictedFailures,
      reasoning
    };
  }

  private determineRiskLevel(totalRisk: number): 'low' | 'medium' | 'high' | 'critical' {
    if (totalRisk > 0.8) return 'critical';
    if (totalRisk > 0.6) return 'high';
    if (totalRisk > 0.3) return 'medium';
    return 'low';
  }

  private generateRecommendations(patterns: RegressionPattern[], changeContext: any): string[] {
    const recommendations: string[] = [];
    
    const errorPatterns = patterns.filter(p => p.type === 'error');
    if (errorPatterns.length > 0) {
      recommendations.push('Run comprehensive error handling tests before deployment');
      recommendations.push('Review error boundary implementations for affected components');
    }

    const perfPatterns = patterns.filter(p => p.type === 'performance');
    if (perfPatterns.length > 0) {
      recommendations.push('Run performance benchmarks to validate optimization');
      recommendations.push('Monitor memory usage during extended testing');
    }

    const highRiskComponents = patterns
      .filter(p => p.impact === 'critical' || p.impact === 'high')
      .map(p => p.context.component)
      .filter((c, i, arr) => arr.indexOf(c) === i);

    if (highRiskComponents.length > 0) {
      recommendations.push(`Focus testing on high-risk components: ${highRiskComponents.join(', ')}`);
    }

    return recommendations;
  }

  private generateComponentRecommendations(patterns: RegressionPattern[]): string[] {
    const recommendations: string[] = [];
    
    const errorFreq = patterns.filter(p => p.type === 'error').reduce((sum, p) => sum + p.frequency, 0);
    if (errorFreq > 10) {
      recommendations.push('Implement additional error handling and validation');
    }

    const perfIssues = patterns.filter(p => p.type === 'performance' && p.impact !== 'low');
    if (perfIssues.length > 0) {
      recommendations.push('Optimize component performance and consider lazy loading');
    }

    return recommendations;
  }

  private generatePatternId(input: string): string {
    return input.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50);
  }

  private classifyErrorImpact(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();
    
    if (message.includes('websocket') || message.includes('network')) return 'medium';
    if (message.includes('render') || message.includes('component')) return 'high';
    if (message.includes('crash') || message.includes('fatal')) return 'critical';
    
    return 'medium';
  }

  private escalateImpact(current: 'low' | 'medium' | 'high' | 'critical'): 'low' | 'medium' | 'high' | 'critical' {
    const escalation = { low: 'medium', medium: 'high', high: 'critical', critical: 'critical' };
    return escalation[current];
  }

  private isAccuracyImproving(): boolean {
    const recentData = this.historicalData.slice(-20);
    const olderData = this.historicalData.slice(-40, -20);
    
    if (recentData.length < 5 || olderData.length < 5) return false;
    
    const recentAccuracy = this.calculateAccuracy(recentData);
    const olderAccuracy = this.calculateAccuracy(olderData);
    
    return recentAccuracy > olderAccuracy;
  }

  private getAverageConfidence(): number {
    const patterns = Array.from(this.patterns.values());
    return patterns.length > 0 
      ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length 
      : 0;
  }

  private isComponentImproving(component: string): boolean {
    const componentData = this.historicalData.filter(
      data => data.testResult.component === component
    ).slice(-10);
    
    if (componentData.length < 5) return false;
    
    const recentFailures = componentData.slice(-5).filter(d => !d.actualOutcome).length;
    const olderFailures = componentData.slice(0, 5).filter(d => !d.actualOutcome).length;
    
    return recentFailures < olderFailures;
  }

  private getComponentAccuracy(component: string): number {
    const componentData = this.historicalData.filter(
      data => data.testResult.component === component && data.prediction
    );
    
    return this.calculateAccuracy(componentData);
  }

  private calculateAccuracy(data: any[]): number {
    if (data.length === 0) return 0;
    
    const correct = data.filter(d => {
      if (!d.prediction) return false;
      const predictedFailure = d.prediction.riskLevel === 'high' || d.prediction.riskLevel === 'critical';
      return predictedFailure === !d.actualOutcome;
    }).length;
    
    return correct / data.length;
  }

  private cleanupPatterns(): void {
    // Remove least used patterns that are older
    const patterns = Array.from(this.patterns.entries());
    patterns.sort((a, b) => {
      const scoreA = a[1].frequency * a[1].confidence;
      const scoreB = b[1].frequency * b[1].confidence;
      return scoreA - scoreB;
    });
    
    // Remove bottom 10%
    const toRemove = Math.floor(patterns.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.patterns.delete(patterns[i][0]);
    }
  }

  private cleanupHistoricalData(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionPeriod!);
    
    this.historicalData = this.historicalData.filter(
      data => data.timestamp > cutoffDate
    );
  }

  private loadHistoricalPatterns(): void {
    // In a real implementation, this would load from persistent storage
    // For now, we initialize with empty patterns
    nldLogger.renderAttempt('RegressionPatternAnalyzer', 'loadHistoricalPatterns', {});
    nldLogger.renderSuccess('RegressionPatternAnalyzer', 'loadHistoricalPatterns');
  }
}

export const regressionPatternAnalyzer = new RegressionPatternAnalyzer();