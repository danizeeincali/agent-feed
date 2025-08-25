/**
 * NLD Database Management System
 * Handles persistent storage and analytics for UI patterns and failure data
 */

import { UIPattern, UIFailurePattern } from './nld-ui-capture';

export interface AnalyticsReport {
  summary: {
    totalPatterns: number;
    successRate: number;
    averageSessionLength: number;
    performanceMetrics: {
      avgDuration: number;
      maxDuration: number;
      minDuration: number;
    };
  };
  trends: {
    componentUsage: Array<{
      component: string;
      usage: number;
      errorRate: number;
    }>;
    userBehaviorInsights: string[];
  };
  predictions: {
    riskAreas: string[];
    recommendedOptimizations: string[];
  };
}

export interface DatabaseConfig {
  maxPatterns: number;
  maxFailurePatterns: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
}

export class NLDDatabaseManager {
  private config: DatabaseConfig;
  private dbName = 'nld-database';
  private version = 1;

  constructor(config: Partial<DatabaseConfig> = {}) {
    this.config = {
      maxPatterns: config.maxPatterns || 10000,
      maxFailurePatterns: config.maxFailurePatterns || 1000,
      compressionEnabled: config.compressionEnabled || false,
      encryptionEnabled: config.encryptionEnabled || false
    };
  }

  // Pattern management
  public async getPatterns(limit: number = 100): Promise<UIPattern[]> {
    try {
      const stored = localStorage.getItem('nld-patterns');
      if (!stored) return [];
      
      const patterns: UIPattern[] = JSON.parse(stored);
      
      // Convert timestamp strings back to Date objects
      const processedPatterns = patterns.map(p => ({
        ...p,
        timestamp: new Date(p.timestamp),
        context: {
          ...p.context,
          timestamp: new Date(p.context.timestamp)
        }
      }));

      return processedPatterns
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to load patterns from database:', error);
      return [];
    }
  }

  public async storePattern(pattern: UIPattern): Promise<void> {
    try {
      const existing = await this.getPatterns(this.config.maxPatterns);
      const updated = [pattern, ...existing].slice(0, this.config.maxPatterns);
      
      localStorage.setItem('nld-patterns', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to store pattern:', error);
    }
  }

  public async getFailurePatterns(): Promise<UIFailurePattern[]> {
    try {
      const stored = localStorage.getItem('nld-failure-patterns');
      if (!stored) return [];

      const patterns: UIFailurePattern[] = JSON.parse(stored);
      
      // Convert timestamp strings back to Date objects
      return patterns.map(p => ({
        ...p,
        lastOccurrence: new Date(p.lastOccurrence),
        contexts: p.contexts.map(ctx => ({
          ...ctx,
          timestamp: new Date(ctx.timestamp),
          context: {
            ...ctx.context,
            timestamp: new Date(ctx.context.timestamp)
          }
        }))
      }));
    } catch (error) {
      console.error('Failed to load failure patterns:', error);
      return [];
    }
  }

  public async storeFailurePattern(failurePattern: UIFailurePattern): Promise<void> {
    try {
      const existing = await this.getFailurePatterns();
      const existingIndex = existing.findIndex(p => p.patternId === failurePattern.patternId);
      
      if (existingIndex >= 0) {
        existing[existingIndex] = failurePattern;
      } else {
        existing.push(failurePattern);
      }

      // Keep only the most recent failure patterns
      const trimmed = existing.slice(0, this.config.maxFailurePatterns);
      localStorage.setItem('nld-failure-patterns', JSON.stringify(trimmed));
    } catch (error) {
      console.error('Failed to store failure pattern:', error);
    }
  }

  // Analytics and reporting
  public async generateAnalyticsReport(): Promise<AnalyticsReport> {
    try {
      const patterns = await this.getPatterns(this.config.maxPatterns);
      const failurePatterns = await this.getFailurePatterns();

      if (patterns.length === 0) {
        return this.getEmptyReport();
      }

      const summary = this.generateSummary(patterns);
      const trends = this.analyzeTrends(patterns);
      const predictions = this.generatePredictions(patterns, failurePatterns);

      return {
        summary,
        trends,
        predictions
      };
    } catch (error) {
      console.error('Failed to generate analytics report:', error);
      return this.getEmptyReport();
    }
  }

  private generateSummary(patterns: UIPattern[]) {
    const successCount = patterns.filter(p => p.outcome === 'success').length;
    const durations = patterns
      .map(p => p.performanceMetrics?.duration || 0)
      .filter(d => d > 0);

    // Calculate session lengths (time between first and last pattern per session)
    const sessionLengths = this.calculateSessionLengths(patterns);

    return {
      totalPatterns: patterns.length,
      successRate: patterns.length > 0 ? successCount / patterns.length : 0,
      averageSessionLength: sessionLengths.length > 0 
        ? sessionLengths.reduce((sum, len) => sum + len, 0) / sessionLengths.length 
        : 0,
      performanceMetrics: {
        avgDuration: durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0,
        maxDuration: durations.length > 0 ? Math.max(...durations) : 0,
        minDuration: durations.length > 0 ? Math.min(...durations) : 0
      }
    };
  }

  private analyzeTrends(patterns: UIPattern[]) {
    // Component usage analysis
    const componentStats = new Map<string, { count: number; errors: number }>();
    
    patterns.forEach(pattern => {
      const component = pattern.context.component;
      const existing = componentStats.get(component) || { count: 0, errors: 0 };
      existing.count++;
      if (pattern.outcome === 'failure') {
        existing.errors++;
      }
      componentStats.set(component, existing);
    });

    const componentUsage = Array.from(componentStats.entries())
      .map(([component, stats]) => ({
        component,
        usage: stats.count,
        errorRate: stats.count > 0 ? stats.errors / stats.count : 0
      }))
      .sort((a, b) => b.usage - a.usage);

    // User behavior insights
    const insights = this.generateBehaviorInsights(patterns);

    return {
      componentUsage,
      userBehaviorInsights: insights
    };
  }

  private generatePredictions(patterns: UIPattern[], failurePatterns: UIFailurePattern[]) {
    const riskAreas: string[] = [];
    const recommendedOptimizations: string[] = [];

    // Identify risk areas
    const recentFailures = patterns
      .filter(p => p.outcome === 'failure')
      .filter(p => Date.now() - p.timestamp.getTime() < 24 * 60 * 60 * 1000); // Last 24 hours

    if (recentFailures.length > patterns.length * 0.1) {
      riskAreas.push('High recent failure rate detected');
    }

    const slowOperations = patterns.filter(p => 
      p.performanceMetrics?.duration && p.performanceMetrics.duration > 2000
    );
    if (slowOperations.length > patterns.length * 0.2) {
      riskAreas.push('Performance degradation detected');
    }

    const unresolvedFailures = failurePatterns.filter(f => !f.resolved);
    if (unresolvedFailures.length > 0) {
      riskAreas.push(`${unresolvedFailures.length} unresolved failure patterns`);
    }

    // Generate optimization recommendations
    if (slowOperations.length > 0) {
      recommendedOptimizations.push('Implement performance monitoring and optimization');
    }

    const memoryIssues = patterns.filter(p => 
      p.performanceMetrics?.memoryUsage && p.performanceMetrics.memoryUsage > 100 * 1024 * 1024
    );
    if (memoryIssues.length > 0) {
      recommendedOptimizations.push('Optimize memory usage and implement garbage collection');
    }

    const networkIssues = patterns.filter(p => 
      p.performanceMetrics?.networkLatency && p.performanceMetrics.networkLatency > 1000
    );
    if (networkIssues.length > 0) {
      recommendedOptimizations.push('Improve network connectivity and implement caching');
    }

    return {
      riskAreas,
      recommendedOptimizations
    };
  }

  private calculateSessionLengths(patterns: UIPattern[]): number[] {
    const sessionGroups = new Map<string, UIPattern[]>();
    
    patterns.forEach(pattern => {
      const sessionId = pattern.sessionId;
      if (!sessionGroups.has(sessionId)) {
        sessionGroups.set(sessionId, []);
      }
      sessionGroups.get(sessionId)!.push(pattern);
    });

    return Array.from(sessionGroups.values()).map(sessionPatterns => {
      if (sessionPatterns.length < 2) return 0;
      
      const sortedPatterns = sessionPatterns.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const firstPattern = sortedPatterns[0];
      const lastPattern = sortedPatterns[sortedPatterns.length - 1];
      
      return lastPattern.timestamp.getTime() - firstPattern.timestamp.getTime();
    }).filter(length => length > 0);
  }

  private generateBehaviorInsights(patterns: UIPattern[]): string[] {
    const insights: string[] = [];
    
    // Analyze action sequences
    const actionSequences = new Map<string, number>();
    for (let i = 0; i < patterns.length - 1; i++) {
      const current = patterns[i].action;
      const next = patterns[i + 1].action;
      const sequence = `${current} → ${next}`;
      actionSequences.set(sequence, (actionSequences.get(sequence) || 0) + 1);
    }

    const mostCommonSequence = Array.from(actionSequences.entries())
      .sort(([, a], [, b]) => b - a)[0];
    
    if (mostCommonSequence && mostCommonSequence[1] > 5) {
      insights.push(`Most common action sequence: ${mostCommonSequence[0]}`);
    }

    // Analyze error recovery patterns
    const errorRecoveries = patterns.filter((pattern, index) => {
      if (index === 0 || pattern.outcome !== 'success') return false;
      const previousPattern = patterns[index - 1];
      return previousPattern.outcome === 'failure';
    });

    if (errorRecoveries.length > 0) {
      insights.push(`Users successfully recover from ${errorRecoveries.length} errors`);
    }

    // Analyze usage patterns
    const hourlyUsage = new Map<number, number>();
    patterns.forEach(pattern => {
      const hour = pattern.timestamp.getHours();
      hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + 1);
    });

    const peakHour = Array.from(hourlyUsage.entries())
      .sort(([, a], [, b]) => b - a)[0];
    
    if (peakHour) {
      insights.push(`Peak usage hour: ${peakHour[0]}:00`);
    }

    return insights;
  }

  private getEmptyReport(): AnalyticsReport {
    return {
      summary: {
        totalPatterns: 0,
        successRate: 0,
        averageSessionLength: 0,
        performanceMetrics: {
          avgDuration: 0,
          maxDuration: 0,
          minDuration: 0
        }
      },
      trends: {
        componentUsage: [],
        userBehaviorInsights: []
      },
      predictions: {
        riskAreas: [],
        recommendedOptimizations: []
      }
    };
  }

  // Database maintenance
  public async clearAllData(): Promise<void> {
    try {
      localStorage.removeItem('nld-patterns');
      localStorage.removeItem('nld-failure-patterns');
      localStorage.removeItem('nld-user-profiles');
    } catch (error) {
      console.error('Failed to clear database:', error);
    }
  }

  public async exportData(): Promise<string> {
    try {
      const patterns = await this.getPatterns(this.config.maxPatterns);
      const failurePatterns = await this.getFailurePatterns();
      
      const exportData = {
        timestamp: new Date().toISOString(),
        version: this.version,
        config: this.config,
        data: {
          patterns,
          failurePatterns
        }
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw new Error('Export failed');
    }
  }

  public async importData(jsonData: string): Promise<boolean> {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.data || !importData.data.patterns) {
        throw new Error('Invalid import data format');
      }

      // Store imported patterns
      if (importData.data.patterns.length > 0) {
        localStorage.setItem('nld-patterns', JSON.stringify(importData.data.patterns));
      }

      // Store imported failure patterns
      if (importData.data.failurePatterns && importData.data.failurePatterns.length > 0) {
        localStorage.setItem('nld-failure-patterns', JSON.stringify(importData.data.failurePatterns));
      }

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  public async getDatabaseStats(): Promise<{
    patterns: number;
    failurePatterns: number;
    storageUsed: number;
    storageLimit: number;
  }> {
    try {
      const patterns = await this.getPatterns();
      const failurePatterns = await this.getFailurePatterns();
      
      // Estimate storage usage
      const patternsSize = JSON.stringify(patterns).length * 2; // UTF-16 encoding
      const failurePatternsSize = JSON.stringify(failurePatterns).length * 2;
      const storageUsed = patternsSize + failurePatternsSize;

      return {
        patterns: patterns.length,
        failurePatterns: failurePatterns.length,
        storageUsed,
        storageLimit: 5 * 1024 * 1024 // 5MB localStorage limit estimate
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return {
        patterns: 0,
        failurePatterns: 0,
        storageUsed: 0,
        storageLimit: 0
      };
    }
  }
}

export const nldDatabase = new NLDDatabaseManager();