/**
 * NLD Connection Failure Pattern Detection System
 * Captures failure patterns and contexts for neural learning
 */

import { EventEmitter } from 'events';

export interface ConnectionFailureContext {
  connectionType: 'websocket' | 'http' | 'sse' | 'polling';
  endpoint: string;
  timestamp: number;
  networkConditions: NetworkConditions;
  clientInfo: ClientInfo;
  errorDetails: ErrorDetails;
  attemptHistory: ConnectionAttempt[];
  recoveryContext?: RecoveryContext;
}

export interface NetworkConditions {
  latency?: number;
  bandwidth?: number;
  connectionType: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'ethernet' | 'unknown';
  isOnline: boolean;
  effectiveType?: string;
}

export interface ClientInfo {
  userAgent: string;
  platform: string;
  isMobile: boolean;
  browserVersion?: string;
  supportedProtocols: string[];
}

export interface ErrorDetails {
  code: string | number;
  message: string;
  type: 'timeout' | 'network' | 'protocol' | 'auth' | 'server' | 'unknown';
  stack?: string;
  serverResponse?: any;
}

export interface ConnectionAttempt {
  attempt: number;
  timestamp: number;
  duration: number;
  success: boolean;
  error?: ErrorDetails;
  strategy: ConnectionStrategy;
}

export interface ConnectionStrategy {
  type: 'immediate' | 'exponential-backoff' | 'linear-backoff' | 'fibonacci' | 'custom';
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
  maxAttempts: number;
}

export interface RecoveryContext {
  recoveryStrategy: string;
  recoveryDuration: number;
  recoverySuccess: boolean;
  fallbacksUsed: string[];
}

export interface FailurePattern {
  id: string;
  pattern: string;
  frequency: number;
  contexts: ConnectionFailureContext[];
  successfulStrategies: ConnectionStrategy[];
  recommendations: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  lastSeen: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export class ConnectionFailureDetector extends EventEmitter {
  private patterns: Map<string, FailurePattern> = new Map();
  private activeConnections: Map<string, ConnectionAttempt[]> = new Map();
  private networkMonitor: NetworkMonitor;
  private patternAnalyzer: PatternAnalyzer;

  constructor() {
    super();
    this.networkMonitor = new NetworkMonitor();
    this.patternAnalyzer = new PatternAnalyzer();
    this.setupNetworkMonitoring();
  }

  /**
   * Capture connection failure event
   */
  captureFailure(context: ConnectionFailureContext): void {
    const patternKey = this.generatePatternKey(context);
    
    // Update or create pattern
    const existingPattern = this.patterns.get(patternKey);
    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.contexts.push(context);
      existingPattern.lastSeen = Date.now();
      existingPattern.trend = this.calculateTrend(existingPattern);
    } else {
      const newPattern: FailurePattern = {
        id: this.generatePatternId(),
        pattern: patternKey,
        frequency: 1,
        contexts: [context],
        successfulStrategies: [],
        recommendations: [],
        severity: this.calculateSeverity(context),
        lastSeen: Date.now(),
        trend: 'stable'
      };
      this.patterns.set(patternKey, newPattern);
    }

    // Emit pattern detection event
    this.emit('patternDetected', {
      pattern: this.patterns.get(patternKey),
      context
    });

    // Store for neural training
    this.storeForNeuralTraining(context, this.patterns.get(patternKey)!);
  }

  /**
   * Capture successful recovery
   */
  captureRecovery(connectionId: string, recoveryContext: RecoveryContext): void {
    const attempts = this.activeConnections.get(connectionId);
    if (attempts && attempts.length > 0) {
      const lastAttempt = attempts[attempts.length - 1];
      const patternKey = this.generatePatternKeyFromAttempt(lastAttempt);
      const pattern = this.patterns.get(patternKey);
      
      if (pattern) {
        pattern.successfulStrategies.push(lastAttempt.strategy);
        pattern.recommendations = this.generateRecommendations(pattern);
        
        this.emit('recoveryLearned', {
          pattern,
          recoveryContext,
          strategy: lastAttempt.strategy
        });
      }
    }
  }

  /**
   * Get adaptive retry strategy based on learned patterns
   */
  getAdaptiveStrategy(context: Partial<ConnectionFailureContext>): ConnectionStrategy {
    const patternKey = this.generatePatternKey(context as ConnectionFailureContext);
    const pattern = this.patterns.get(patternKey);
    
    if (pattern && pattern.successfulStrategies.length > 0) {
      // Return most successful strategy
      return this.selectBestStrategy(pattern.successfulStrategies);
    }

    // Return default adaptive strategy based on network conditions
    return this.getDefaultStrategy(context.networkConditions);
  }

  /**
   * Get intelligent troubleshooting suggestions
   */
  getTroubleshootingSuggestions(context: ConnectionFailureContext): string[] {
    const suggestions: string[] = [];
    
    // Network-based suggestions
    if (context.networkConditions.latency && context.networkConditions.latency > 1000) {
      suggestions.push('High latency detected. Consider increasing timeout values.');
    }
    
    if (context.networkConditions.connectionType === 'slow-2g') {
      suggestions.push('Slow network detected. Switch to polling transport.');
    }

    // Error-specific suggestions
    switch (context.errorDetails.type) {
      case 'timeout':
        suggestions.push('Configure exponential backoff with jitter for timeout errors.');
        break;
      case 'network':
        suggestions.push('Implement progressive fallback: WebSocket → SSE → Polling.');
        break;
      case 'protocol':
        suggestions.push('Check WebSocket upgrade headers and protocol compatibility.');
        break;
      case 'auth':
        suggestions.push('Verify authentication tokens and refresh mechanisms.');
        break;
    }

    // Pattern-based suggestions
    const patternKey = this.generatePatternKey(context);
    const pattern = this.patterns.get(patternKey);
    if (pattern) {
      suggestions.push(...pattern.recommendations);
    }

    return suggestions;
  }

  /**
   * Get connection performance metrics
   */
  getPerformanceMetrics(): ConnectionMetrics {
    const totalFailures = Array.from(this.patterns.values())
      .reduce((sum, pattern) => sum + pattern.frequency, 0);
    
    const criticalPatterns = Array.from(this.patterns.values())
      .filter(p => p.severity === 'critical').length;
    
    const trendsIncreasing = Array.from(this.patterns.values())
      .filter(p => p.trend === 'increasing').length;

    return {
      totalFailures,
      uniquePatterns: this.patterns.size,
      criticalPatterns,
      trendsIncreasing,
      networkConditions: this.networkMonitor.getCurrentConditions(),
      lastAnalysis: Date.now()
    };
  }

  private setupNetworkMonitoring(): void {
    this.networkMonitor.on('conditionChange', (conditions) => {
      this.emit('networkConditionChange', conditions);
    });
  }

  private generatePatternKey(context: ConnectionFailureContext): string {
    return `${context.connectionType}_${context.errorDetails.type}_${context.networkConditions.connectionType}`;
  }

  private generatePatternKeyFromAttempt(attempt: ConnectionAttempt): string {
    return `attempt_${attempt.strategy.type}_${attempt.error?.type || 'unknown'}`;
  }

  private generatePatternId(): string {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateSeverity(context: ConnectionFailureContext): 'low' | 'medium' | 'high' | 'critical' {
    if (context.attemptHistory.length > 5) return 'critical';
    if (context.errorDetails.type === 'auth') return 'high';
    if (context.networkConditions.connectionType === 'slow-2g') return 'medium';
    return 'low';
  }

  private calculateTrend(pattern: FailurePattern): 'increasing' | 'stable' | 'decreasing' {
    const recentContexts = pattern.contexts.slice(-10);
    if (recentContexts.length < 3) return 'stable';
    
    const recent = recentContexts.slice(-3).length;
    const older = recentContexts.slice(-6, -3).length;
    
    if (recent > older * 1.5) return 'increasing';
    if (recent < older * 0.5) return 'decreasing';
    return 'stable';
  }

  private selectBestStrategy(strategies: ConnectionStrategy[]): ConnectionStrategy {
    // Implement strategy selection based on success rates
    return strategies[0]; // Simplified
  }

  private getDefaultStrategy(conditions?: NetworkConditions): ConnectionStrategy {
    if (!conditions) {
      return {
        type: 'exponential-backoff',
        baseDelay: 1000,
        maxDelay: 30000,
        jitter: true,
        maxAttempts: 5
      };
    }

    switch (conditions.connectionType) {
      case 'slow-2g':
      case '2g':
        return {
          type: 'linear-backoff',
          baseDelay: 5000,
          maxDelay: 60000,
          jitter: true,
          maxAttempts: 3
        };
      default:
        return {
          type: 'exponential-backoff',
          baseDelay: 1000,
          maxDelay: 30000,
          jitter: true,
          maxAttempts: 5
        };
    }
  }

  private generateRecommendations(pattern: FailurePattern): string[] {
    const recommendations: string[] = [];
    
    if (pattern.severity === 'critical') {
      recommendations.push('Critical pattern detected. Consider circuit breaker implementation.');
    }
    
    if (pattern.trend === 'increasing') {
      recommendations.push('Increasing failure trend. Review infrastructure capacity.');
    }

    return recommendations;
  }

  private storeForNeuralTraining(context: ConnectionFailureContext, pattern: FailurePattern): void {
    // Store data for neural network training
    this.emit('neuralTrainingData', {
      type: 'connection_failure',
      context,
      pattern,
      timestamp: Date.now()
    });
  }
}

// Supporting classes
class NetworkMonitor extends EventEmitter {
  getCurrentConditions(): NetworkConditions {
    // Implementation would monitor actual network conditions
    return {
      connectionType: 'wifi',
      isOnline: navigator.onLine
    };
  }
}

class PatternAnalyzer {
  // Pattern analysis implementation
}

export interface ConnectionMetrics {
  totalFailures: number;
  uniquePatterns: number;
  criticalPatterns: number;
  trendsIncreasing: number;
  networkConditions: NetworkConditions;
  lastAnalysis: number;
}