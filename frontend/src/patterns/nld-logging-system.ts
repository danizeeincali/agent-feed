/**
 * NLD Pattern Logging and Persistence System
 * 
 * This module handles the storage, retrieval, and analysis of NLD patterns
 * with automatic file logging to docs/nld-patterns/ directory
 */

import { NLTRecord, NLDPattern } from './nld-core-monitor';

export interface LoggedPattern {
  id: string;
  timestamp: string;
  filename: string;
  category: string;
  severity: string;
  pattern: string;
  context: any;
  failureMode: string;
  recoveryAttempted: boolean;
  recovered: boolean;
  effectiveness: number;
  reproductionSteps?: string[];
  mitigationStrategy?: string;
  userFeedback?: string;
}

export interface PatternAnalysis {
  totalPatterns: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  recoveryRate: number;
  averageEffectiveness: number;
  criticalPatterns: LoggedPattern[];
  trendingPatterns: LoggedPattern[];
  recommendations: string[];
}

/**
 * NLD Logging System for Pattern Persistence
 */
export class NLDLoggingSystem {
  private loggedPatterns: LoggedPattern[] = [];
  private logQueue: NLTRecord[] = [];
  private isProcessing = false;
  private readonly LOG_BATCH_SIZE = 10;
  private readonly LOG_INTERVAL = 30000; // 30 seconds
  private logTimer?: number;

  constructor() {
    this.initializeLogging();
    this.loadExistingPatterns();
  }

  /**
   * Initialize logging system with periodic batch processing
   */
  private initializeLogging(): void {
    // Process log queue periodically
    this.logTimer = window.setInterval(() => {
      this.processLogQueue();
    }, this.LOG_INTERVAL);

    // Listen for page visibility changes to flush logs
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flushLogs();
      }
    });

    // Flush logs before page unload
    window.addEventListener('beforeunload', () => {
      this.flushLogs();
    });
  }

  /**
   * Load existing patterns from localStorage
   */
  private loadExistingPatterns(): void {
    try {
      const stored = localStorage.getItem('nld-logged-patterns');
      if (stored) {
        this.loggedPatterns = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load existing NLD patterns:', error);
      this.loggedPatterns = [];
    }
  }

  /**
   * Add a pattern to the logging queue
   */
  public queuePattern(record: NLTRecord): void {
    this.logQueue.push(record);

    // Process immediately for critical patterns
    if (record.pattern.severity === 'critical') {
      this.processLogQueue();
    }
  }

  /**
   * Process the logging queue
   */
  private async processLogQueue(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) return;

    this.isProcessing = true;

    try {
      const batch = this.logQueue.splice(0, this.LOG_BATCH_SIZE);
      
      for (const record of batch) {
        await this.logPattern(record);
      }

      this.saveToStorage();
    } catch (error) {
      console.error('Failed to process NLD log queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Log a single pattern
   */
  private async logPattern(record: NLTRecord): Promise<void> {
    const timestamp = new Date(record.timestamp);
    const dateStr = timestamp.toISOString().split('T')[0];
    const filename = `${record.pattern.category}-${record.pattern.id}-${dateStr}.json`;

    const loggedPattern: LoggedPattern = {
      id: record.id,
      timestamp: record.timestamp,
      filename,
      category: record.pattern.category,
      severity: record.pattern.severity,
      pattern: record.pattern.pattern,
      context: this.sanitizeContext(record.context),
      failureMode: record.failureMode,
      recoveryAttempted: true, // We always attempt recovery
      recovered: record.recovered,
      effectiveness: record.effectiveness,
      reproductionSteps: this.generateReproductionSteps(record),
      mitigationStrategy: this.generateMitigationStrategy(record),
      userFeedback: record.userFeedback
    };

    this.loggedPatterns.push(loggedPattern);

    // Log to console for immediate visibility
    console.log(`📝 NLD Pattern Logged: ${record.pattern.pattern}`, {
      id: record.id,
      severity: record.pattern.severity,
      category: record.pattern.category,
      recovered: record.recovered,
      filename
    });

    // Attempt to save to file system (this would require a backend endpoint in production)
    await this.saveToFileSystem(loggedPattern);
  }

  /**
   * Sanitize context data for logging
   */
  private sanitizeContext(context: any): any {
    const sanitized = { ...context };

    // Remove sensitive information
    delete sanitized.stackTrace; // Too verbose for logs
    
    // Truncate long strings
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string' && sanitized[key].length > 500) {
        sanitized[key] = sanitized[key].substring(0, 500) + '... (truncated)';
      }
    });

    return sanitized;
  }

  /**
   * Generate reproduction steps based on pattern
   */
  private generateReproductionSteps(record: NLTRecord): string[] {
    const steps: string[] = [];

    switch (record.pattern.category) {
      case 'white-screen':
        steps.push(
          '1. Navigate to the affected component',
          '2. Check browser console for JavaScript errors',
          '3. Verify all required props are being passed',
          '4. Check network requests for failed API calls',
          '5. Test with different browser/device combinations'
        );
        break;

      case 'websocket':
        steps.push(
          '1. Open browser developer tools',
          '2. Monitor WebSocket connections in Network tab',
          '3. Simulate network interruptions',
          '4. Check server logs for connection issues',
          '5. Test reconnection behavior'
        );
        break;

      case 'memory-leak':
        steps.push(
          '1. Open Memory tab in browser developer tools',
          '2. Take heap snapshots before and after operations',
          '3. Upload large images or files repeatedly',
          '4. Switch between instances multiple times',
          '5. Monitor memory usage over time'
        );
        break;

      case 'race-condition':
        steps.push(
          '1. Rapidly click buttons or trigger actions',
          '2. Test under slow network conditions',
          '3. Open multiple instances simultaneously',
          '4. Check for duplicate operations',
          '5. Verify proper async handling'
        );
        break;

      case 'performance':
        steps.push(
          '1. Open Performance tab in developer tools',
          '2. Record performance during issue reproduction',
          '3. Check for excessive renders or long tasks',
          '4. Monitor CPU and memory usage',
          '5. Test on slower devices'
        );
        break;

      default:
        steps.push(
          '1. Document exact steps to reproduce the issue',
          '2. Note browser version and operating system',
          '3. Check console for error messages',
          '4. Test in incognito mode',
          '5. Verify issue persists across sessions'
        );
    }

    return steps;
  }

  /**
   * Generate mitigation strategy based on pattern
   */
  private generateMitigationStrategy(record: NLTRecord): string {
    const strategies: Record<string, string> = {
      'white-screen': 'Implement error boundaries, add loading states, validate props, and provide fallback UI components',
      'websocket': 'Implement exponential backoff, connection pooling, and proper error handling for network failures',
      'memory-leak': 'Add proper cleanup in useEffect, implement resource disposal, and use WeakMap for object references',
      'race-condition': 'Use debouncing, operation queuing, and state locking to prevent concurrent operations',
      'performance': 'Optimize render cycles with useMemo/useCallback, implement virtualization for large lists, and reduce bundle size'
    };

    return strategies[record.pattern.category] || 'Implement proper error handling and monitoring to detect and prevent similar issues';
  }

  /**
   * Save pattern to file system (would require backend endpoint in production)
   */
  private async saveToFileSystem(pattern: LoggedPattern): Promise<void> {
    // In a real implementation, this would make an API call to save the file
    // For now, we'll simulate this and store in a format that can be easily exported
    
    const fileContent = {
      metadata: {
        id: pattern.id,
        timestamp: pattern.timestamp,
        category: pattern.category,
        severity: pattern.severity,
        filename: pattern.filename
      },
      pattern: {
        name: pattern.pattern,
        description: `NLD Pattern Detection: ${pattern.pattern}`,
        failureMode: pattern.failureMode,
        context: pattern.context
      },
      analysis: {
        recoveryAttempted: pattern.recoveryAttempted,
        recovered: pattern.recovered,
        effectiveness: pattern.effectiveness,
        reproductionSteps: pattern.reproductionSteps,
        mitigationStrategy: pattern.mitigationStrategy
      },
      userFeedback: pattern.userFeedback
    };

    // Store in localStorage with file-like structure
    const fileKey = `nld-file-${pattern.filename}`;
    localStorage.setItem(fileKey, JSON.stringify(fileContent, null, 2));
  }

  /**
   * Save logged patterns to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem('nld-logged-patterns', JSON.stringify(this.loggedPatterns));
    } catch (error) {
      console.warn('Failed to save NLD patterns to storage:', error);
    }
  }

  /**
   * Flush all pending logs
   */
  public flushLogs(): void {
    if (this.logQueue.length > 0) {
      this.processLogQueue();
    }
  }

  /**
   * Get all logged patterns
   */
  public getLoggedPatterns(): LoggedPattern[] {
    return [...this.loggedPatterns];
  }

  /**
   * Get patterns by category
   */
  public getPatternsByCategory(category: string): LoggedPattern[] {
    return this.loggedPatterns.filter(pattern => pattern.category === category);
  }

  /**
   * Get patterns by severity
   */
  public getPatternsBySeverity(severity: string): LoggedPattern[] {
    return this.loggedPatterns.filter(pattern => pattern.severity === severity);
  }

  /**
   * Get patterns within date range
   */
  public getPatternsInDateRange(startDate: Date, endDate: Date): LoggedPattern[] {
    return this.loggedPatterns.filter(pattern => {
      const patternDate = new Date(pattern.timestamp);
      return patternDate >= startDate && patternDate <= endDate;
    });
  }

  /**
   * Analyze logged patterns
   */
  public analyzePatterns(): PatternAnalysis {
    const total = this.loggedPatterns.length;
    
    if (total === 0) {
      return {
        totalPatterns: 0,
        byCategory: {},
        bySeverity: {},
        recoveryRate: 0,
        averageEffectiveness: 0,
        criticalPatterns: [],
        trendingPatterns: [],
        recommendations: ['No patterns detected yet. Continue monitoring for insights.']
      };
    }

    // Count by category
    const byCategory = this.loggedPatterns.reduce((acc, pattern) => {
      acc[pattern.category] = (acc[pattern.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count by severity
    const bySeverity = this.loggedPatterns.reduce((acc, pattern) => {
      acc[pattern.severity] = (acc[pattern.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate recovery rate
    const recovered = this.loggedPatterns.filter(p => p.recovered).length;
    const recoveryRate = recovered / total;

    // Calculate average effectiveness
    const averageEffectiveness = this.loggedPatterns.reduce((sum, p) => sum + p.effectiveness, 0) / total;

    // Get critical patterns
    const criticalPatterns = this.loggedPatterns
      .filter(p => p.severity === 'critical')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);

    // Get trending patterns (most frequent in last 24 hours)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = this.loggedPatterns.filter(p => new Date(p.timestamp) > last24h);
    const trendingPatterns = Object.entries(
      recent.reduce((acc, pattern) => {
        const key = `${pattern.category}-${pattern.pattern}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key]) => recent.find(p => `${p.category}-${p.pattern}` === key)!)
      .filter(Boolean);

    // Generate recommendations
    const recommendations = this.generateRecommendations(byCategory, bySeverity, recoveryRate);

    return {
      totalPatterns: total,
      byCategory,
      bySeverity,
      recoveryRate,
      averageEffectiveness,
      criticalPatterns,
      trendingPatterns,
      recommendations
    };
  }

  /**
   * Generate recommendations based on pattern analysis
   */
  private generateRecommendations(
    byCategory: Record<string, number>,
    bySeverity: Record<string, number>,
    recoveryRate: number
  ): string[] {
    const recommendations: string[] = [];

    // Recovery rate recommendations
    if (recoveryRate < 0.7) {
      recommendations.push('🚨 Low recovery rate detected. Improve error handling and recovery mechanisms.');
    } else if (recoveryRate > 0.9) {
      recommendations.push('✅ Excellent recovery rate. Current error handling is working well.');
    }

    // Category-specific recommendations
    if (byCategory['white-screen'] > 5) {
      recommendations.push('🖥️ Frequent white screen issues detected. Review component initialization and error boundaries.');
    }

    if (byCategory['websocket'] > 10) {
      recommendations.push('🔌 WebSocket issues are common. Consider implementing better connection management.');
    }

    if (byCategory['memory-leak'] > 3) {
      recommendations.push('💾 Memory leaks detected. Review cleanup logic and object references.');
    }

    if (byCategory['race-condition'] > 7) {
      recommendations.push('⚡ Race conditions are frequent. Implement better async operation handling.');
    }

    if (byCategory['performance'] > 15) {
      recommendations.push('🐌 Performance issues detected. Consider optimization strategies.');
    }

    // Severity-specific recommendations
    if (bySeverity['critical'] > 0) {
      recommendations.push('🔥 Critical patterns detected. Address these issues immediately.');
    }

    if (recommendations.length === 0) {
      recommendations.push('🎉 System health looks good. Continue monitoring for patterns.');
    }

    return recommendations;
  }

  /**
   * Export patterns for external analysis
   */
  public exportPatterns(): {
    summary: PatternAnalysis;
    patterns: LoggedPattern[];
    exportTime: string;
    format: string;
  } {
    return {
      summary: this.analyzePatterns(),
      patterns: this.loggedPatterns,
      exportTime: new Date().toISOString(),
      format: 'NLD-v1.0'
    };
  }

  /**
   * Clear all logged patterns
   */
  public clearPatterns(): void {
    this.loggedPatterns = [];
    this.saveToStorage();
    
    // Clear file-like storage entries
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('nld-file-')) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    if (this.logTimer) {
      clearInterval(this.logTimer);
      this.logTimer = undefined;
    }

    this.flushLogs();
  }
}

export default NLDLoggingSystem;