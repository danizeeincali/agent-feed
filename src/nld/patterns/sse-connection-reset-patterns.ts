/**
 * NLD Pattern Detection: SSE Connection Reset Failures
 * Automatically captures failure patterns when SSE connections drop immediately after establishment
 */

interface SSEConnectionResetPattern {
  id: string;
  timestamp: string;
  failureSignature: {
    connectionEstablished: boolean;
    immediateDisconnect: boolean;
    errorCode: string;
    connectionDuration: number; // milliseconds
    repeatCycle: boolean;
  };
  environmentContext: {
    userAgent: string;
    networkConditions: string;
    serverLoad: number;
    concurrentConnections: number;
  };
  analysisMetrics: {
    successRate: number;
    averageConnectionLifetime: number;
    reconnectionAttempts: number;
    tddUsage: boolean;
  };
}

interface AntiPatternSignature {
  pattern: string;
  frequency: number;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
  preventionStrategy: string;
}

export class SSEConnectionResetDetector {
  private patterns: Map<string, SSEConnectionResetPattern> = new Map();
  private antiPatterns: Map<string, AntiPatternSignature> = new Map();
  private monitoringActive: boolean = false;
  
  constructor() {
    this.initializeKnownAntiPatterns();
  }

  private initializeKnownAntiPatterns() {
    // Pattern 1: Immediate ECONNRESET after successful establishment
    this.antiPatterns.set('immediate-reset', {
      pattern: 'SSE_IMMEDIATE_ECONNRESET',
      frequency: 0.95,
      impactLevel: 'critical',
      rootCause: 'Server closes connection after single message exchange',
      preventionStrategy: 'Implement connection keep-alive mechanism with proper event handling'
    });

    // Pattern 2: Rapid connect/disconnect cycles
    this.antiPatterns.set('rapid-cycling', {
      pattern: 'SSE_RAPID_RECONNECTION_CYCLE',
      frequency: 0.85,
      impactLevel: 'high',
      rootCause: 'Frontend retry logic triggers new connections before proper cleanup',
      preventionStrategy: 'Add exponential backoff with connection state management'
    });

    // Pattern 3: Connection count dropping to zero after every input
    this.antiPatterns.set('zero-persistence', {
      pattern: 'SSE_ZERO_CONNECTION_PERSISTENCE', 
      frequency: 0.90,
      impactLevel: 'critical',
      rootCause: 'Server terminates connections instead of maintaining persistent state',
      preventionStrategy: 'Implement stateful connection management with session persistence'
    });
  }

  /**
   * Detects SSE connection reset failure patterns from real-time events
   */
  public detectFailurePattern(eventData: {
    type: 'connection_established' | 'connection_error' | 'connection_closed';
    instanceId: string;
    connectionId: string;
    timestamp: string;
    errorCode?: string;
    connectionDuration?: number;
    additionalData?: any;
  }): SSEConnectionResetPattern | null {
    
    const patternId = `${eventData.instanceId}-${Date.now()}`;
    
    // Analyze for immediate reset pattern
    if (eventData.type === 'connection_error' && 
        eventData.errorCode === 'ECONNRESET' && 
        eventData.connectionDuration && 
        eventData.connectionDuration < 1000) {
      
      const pattern: SSEConnectionResetPattern = {
        id: patternId,
        timestamp: eventData.timestamp,
        failureSignature: {
          connectionEstablished: true,
          immediateDisconnect: true,
          errorCode: 'ECONNRESET',
          connectionDuration: eventData.connectionDuration,
          repeatCycle: this.isRepeatingPattern(eventData.instanceId)
        },
        environmentContext: this.captureEnvironmentContext(),
        analysisMetrics: {
          successRate: this.calculateSuccessRate(eventData.instanceId),
          averageConnectionLifetime: eventData.connectionDuration,
          reconnectionAttempts: this.getReconnectionAttempts(eventData.instanceId),
          tddUsage: this.detectTDDUsage(eventData.additionalData)
        }
      };

      this.patterns.set(patternId, pattern);
      this.updateAntiPatternFrequency('immediate-reset');
      
      return pattern;
    }

    return null;
  }

  /**
   * Analyzes connection logs for reset patterns
   */
  public analyzeConnectionLogs(logs: string[]): {
    patternsDetected: string[];
    failureRate: number;
    recommendations: string[];
  } {
    const patternsDetected: string[] = [];
    let totalConnections = 0;
    let failedConnections = 0;

    logs.forEach(log => {
      if (log.includes('SSE connection established')) {
        totalConnections++;
      }
      
      if (log.includes('❌ SSE connection error: ECONNRESET')) {
        failedConnections++;
        patternsDetected.push('immediate-reset');
      }
      
      if (log.includes('📊 SSE connections remaining for') && log.includes(': 0')) {
        patternsDetected.push('zero-persistence');
      }
      
      if (log.includes('reconnecting') || log.includes('fallback to HTTP polling')) {
        patternsDetected.push('rapid-cycling');
      }
    });

    const failureRate = totalConnections > 0 ? failedConnections / totalConnections : 0;

    return {
      patternsDetected: [...new Set(patternsDetected)],
      failureRate,
      recommendations: this.generateRecommendations(patternsDetected)
    };
  }

  private generateRecommendations(patterns: string[]): string[] {
    const recommendations: string[] = [];

    if (patterns.includes('immediate-reset')) {
      recommendations.push('Implement connection persistence mechanism in server-side SSE handler');
      recommendations.push('Add proper connection state management to prevent premature termination');
    }

    if (patterns.includes('zero-persistence')) {
      recommendations.push('Review server connection cleanup logic - avoid closing connections after single exchange');
      recommendations.push('Implement session-based connection tracking');
    }

    if (patterns.includes('rapid-cycling')) {
      recommendations.push('Add exponential backoff to frontend reconnection logic');
      recommendations.push('Implement connection state validation before creating new connections');
    }

    return recommendations;
  }

  private isRepeatingPattern(instanceId: string): boolean {
    // Check if this instance has had similar failures recently
    const recentPatterns = Array.from(this.patterns.values())
      .filter(p => p.timestamp > new Date(Date.now() - 60000).toISOString())
      .filter(p => p.id.startsWith(instanceId));
    
    return recentPatterns.length > 2;
  }

  private captureEnvironmentContext() {
    return {
      userAgent: 'Claude-Code-SSE-Monitor',
      networkConditions: 'stable',
      serverLoad: Math.random(), // Would be real metrics in production
      concurrentConnections: this.patterns.size
    };
  }

  private calculateSuccessRate(instanceId: string): number {
    const instancePatterns = Array.from(this.patterns.values())
      .filter(p => p.id.startsWith(instanceId));
    
    if (instancePatterns.length === 0) return 1.0;
    
    const failures = instancePatterns.filter(p => p.failureSignature.immediateDisconnect);
    return 1 - (failures.length / instancePatterns.length);
  }

  private getReconnectionAttempts(instanceId: string): number {
    return Array.from(this.patterns.values())
      .filter(p => p.id.startsWith(instanceId)).length;
  }

  private detectTDDUsage(additionalData: any): boolean {
    // Analyze if TDD patterns were used in the implementation
    if (!additionalData) return false;
    
    return additionalData.hasTests || 
           additionalData.implementationMethod === 'TDD' ||
           additionalData.codeReviewed === true;
  }

  private updateAntiPatternFrequency(patternKey: string) {
    const pattern = this.antiPatterns.get(patternKey);
    if (pattern) {
      pattern.frequency = Math.min(pattern.frequency + 0.01, 1.0);
      this.antiPatterns.set(patternKey, pattern);
    }
  }

  /**
   * Generates NLT (Neuro-Learning Testing) record for training
   */
  public generateNLTRecord(patternId: string): any {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return null;

    return {
      recordId: `NLT-${patternId}`,
      taskType: 'SSE Connection Management',
      failureMode: 'Connection Reset Loop',
      claudeSuccess: false,
      userSuccess: false,
      effectiveness: pattern.analysisMetrics.successRate,
      tddFactor: pattern.analysisMetrics.tddUsage ? 0.8 : 0.2,
      patternClassification: 'SSE_CONNECTION_INSTABILITY',
      training_data: {
        input_context: 'SSE connection establishment for real-time communication',
        expected_behavior: 'Persistent connection maintained across multiple interactions',
        actual_behavior: 'Immediate disconnection after each message exchange',
        error_signature: pattern.failureSignature,
        prevention_strategy: this.generatePreventionStrategy(pattern)
      }
    };
  }

  private generatePreventionStrategy(pattern: SSEConnectionResetPattern): string[] {
    const strategies = [];

    if (pattern.failureSignature.immediateDisconnect) {
      strategies.push('Implement server-side connection keep-alive mechanism');
      strategies.push('Add proper SSE event loop without premature connection termination');
    }

    if (pattern.failureSignature.connectionDuration < 500) {
      strategies.push('Add connection establishment delay to ensure proper handshake');
      strategies.push('Implement connection state validation before message exchange');
    }

    if (pattern.failureSignature.repeatCycle) {
      strategies.push('Add exponential backoff for reconnection attempts');
      strategies.push('Implement connection pooling to reduce connection churn');
    }

    return strategies;
  }

  /**
   * Export patterns for neural network training
   */
  public exportForTraining(): {
    patterns: SSEConnectionResetPattern[];
    antiPatterns: AntiPatternSignature[];
    trainingMetrics: any;
  } {
    return {
      patterns: Array.from(this.patterns.values()),
      antiPatterns: Array.from(this.antiPatterns.values()),
      trainingMetrics: {
        totalPatternsDetected: this.patterns.size,
        criticalPatterns: Array.from(this.antiPatterns.values())
          .filter(p => p.impactLevel === 'critical').length,
        avgSuccessRate: this.calculateOverallSuccessRate(),
        tddUsageRate: this.calculateTDDUsageRate()
      }
    };
  }

  private calculateOverallSuccessRate(): number {
    const rates = Array.from(this.patterns.values())
      .map(p => p.analysisMetrics.successRate);
    
    return rates.length > 0 ? 
      rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0;
  }

  private calculateTDDUsageRate(): number {
    const patterns = Array.from(this.patterns.values());
    const tddUsage = patterns.filter(p => p.analysisMetrics.tddUsage).length;
    
    return patterns.length > 0 ? tddUsage / patterns.length : 0;
  }
}