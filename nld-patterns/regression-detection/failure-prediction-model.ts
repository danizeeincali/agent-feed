/**
 * NLD Failure Prediction Model - Real-time Pattern Detection
 * Monitors user interaction patterns and predicts failure probability
 */

export interface FailurePattern {
  patternId: string;
  description: string;
  indicators: string[];
  cascadePotential: 'LOW' | 'MEDIUM' | 'HIGH';
  successRate: number;
  confidence: number;
}

export interface UserInteractionData {
  timestamp: number;
  eventType: string;
  componentPath: string;
  stateSnapshot: any;
  previousState: any;
  errorContext?: string;
}

export interface PredictionResult {
  failureProbability: number;
  predictedPatterns: FailurePattern[];
  recommendedActions: string[];
  confidenceScore: number;
  preventionStrategies: string[];
}

export class FailurePredictionModel {
  private patterns: Map<string, FailurePattern> = new Map();
  private interactionHistory: UserInteractionData[] = [];
  private modelWeights: Map<string, number> = new Map();
  private successfulPatterns: Set<string> = new Set();
  
  constructor() {
    this.initializePatterns();
    this.initializeWeights();
  }

  /**
   * Initialize known failure patterns from analysis
   */
  private initializePatterns(): void {
    const knownPatterns: FailurePattern[] = [
      {
        patternId: 'WS_CONN_DROP_001',
        description: 'WebSocket connection drops during long operations',
        indicators: [
          'WebSocket.readyState === WebSocket.CLOSED',
          'scheduleReconnect called multiple times',
          'active command execution during disconnect'
        ],
        cascadePotential: 'HIGH',
        successRate: 0.68,
        confidence: 0.85
      },
      {
        patternId: 'LOAD_RACE_001',
        description: 'Loading animation completion race condition',
        indicators: [
          'isComplete state changes rapidly',
          'WebSocket message bursts during animation',
          'startTime === 0 while isActive === true'
        ],
        cascadePotential: 'LOW',
        successRate: 0.92,
        confidence: 0.78
      },
      {
        patternId: 'PERM_STATE_001',
        description: 'Permission dialog state corruption',
        indicators: [
          'permissionRequest.isActive during WebSocket disconnect',
          'requestId mismatch in response handling',
          'permission state not cleared on reconnection'
        ],
        cascadePotential: 'HIGH',
        successRate: 0.76,
        confidence: 0.82
      },
      {
        patternId: 'UI_SYNC_001',
        description: 'UI state synchronization failure',
        indicators: [
          'React state updates during WebSocket event bursts',
          'connectionState inconsistency with actual WebSocket state',
          'setState called after component unmount'
        ],
        cascadePotential: 'HIGH',
        successRate: 0.64,
        confidence: 0.90
      },
      {
        patternId: 'TIMEOUT_001',
        description: 'Excessive timeout usage causing memory leaks',
        indicators: [
          'setTimeout calls without clearTimeout cleanup',
          'Overlapping timeout callbacks',
          'Memory usage increasing during repeated operations'
        ],
        cascadePotential: 'MEDIUM',
        successRate: 0.72,
        confidence: 0.75
      }
    ];

    knownPatterns.forEach(pattern => {
      this.patterns.set(pattern.patternId, pattern);
    });
  }

  /**
   * Initialize model weights based on historical data
   */
  private initializeWeights(): void {
    this.modelWeights.set('websocket_state_transition', 0.25);
    this.modelWeights.set('permission_dialog_timing', 0.20);
    this.modelWeights.set('loading_animation_state', 0.15);
    this.modelWeights.set('timeout_overlap_factor', 0.18);
    this.modelWeights.set('react_state_batching', 0.22);
  }

  /**
   * Record user interaction for pattern analysis
   */
  recordInteraction(interaction: UserInteractionData): void {
    this.interactionHistory.push(interaction);
    
    // Keep only last 100 interactions to prevent memory bloat
    if (this.interactionHistory.length > 100) {
      this.interactionHistory = this.interactionHistory.slice(-100);
    }
    
    // Check if this interaction matches a previously successful pattern
    this.analyzeSuccessfulPattern(interaction);
  }

  /**
   * Predict failure probability based on current interaction patterns
   */
  predictFailure(currentState: any): PredictionResult {
    const recentInteractions = this.interactionHistory.slice(-10);
    const detectedPatterns: FailurePattern[] = [];
    let totalFailureProbability = 0;
    let confidenceSum = 0;

    // Analyze each known pattern
    for (const [patternId, pattern] of this.patterns) {
      const patternScore = this.calculatePatternScore(pattern, recentInteractions, currentState);
      
      if (patternScore > 0.3) { // Threshold for pattern detection
        detectedPatterns.push(pattern);
        totalFailureProbability += (1 - pattern.successRate) * patternScore * pattern.confidence;
        confidenceSum += pattern.confidence;
      }
    }

    // Normalize probability
    const failureProbability = Math.min(totalFailureProbability, 1.0);
    const confidenceScore = confidenceSum > 0 ? confidenceSum / detectedPatterns.length : 0;

    return {
      failureProbability,
      predictedPatterns: detectedPatterns,
      recommendedActions: this.generateRecommendations(detectedPatterns),
      confidenceScore,
      preventionStrategies: this.generatePreventionStrategies(detectedPatterns)
    };
  }

  /**
   * Calculate how well current state matches a failure pattern
   */
  private calculatePatternScore(
    pattern: FailurePattern, 
    recentInteractions: UserInteractionData[], 
    currentState: any
  ): number {
    let score = 0;
    const indicatorMatches = pattern.indicators.map(indicator => 
      this.checkIndicatorMatch(indicator, recentInteractions, currentState)
    );

    // Count how many indicators are present
    const matchCount = indicatorMatches.filter(match => match).length;
    score = matchCount / pattern.indicators.length;

    // Apply pattern-specific weights
    switch (pattern.patternId) {
      case 'WS_CONN_DROP_001':
        score *= this.modelWeights.get('websocket_state_transition') || 1;
        break;
      case 'PERM_STATE_001':
        score *= this.modelWeights.get('permission_dialog_timing') || 1;
        break;
      case 'LOAD_RACE_001':
        score *= this.modelWeights.get('loading_animation_state') || 1;
        break;
      case 'TIMEOUT_001':
        score *= this.modelWeights.get('timeout_overlap_factor') || 1;
        break;
      case 'UI_SYNC_001':
        score *= this.modelWeights.get('react_state_batching') || 1;
        break;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Check if a specific indicator matches current conditions
   */
  private checkIndicatorMatch(
    indicator: string, 
    recentInteractions: UserInteractionData[], 
    currentState: any
  ): boolean {
    // WebSocket state indicators
    if (indicator.includes('WebSocket.readyState === WebSocket.CLOSED')) {
      return currentState.websocket?.readyState === 3; // WebSocket.CLOSED
    }
    
    if (indicator.includes('scheduleReconnect called multiple times')) {
      const reconnectCalls = recentInteractions.filter(i => 
        i.eventType === 'websocket_reconnect'
      ).length;
      return reconnectCalls > 2;
    }

    // Permission state indicators
    if (indicator.includes('permissionRequest.isActive during WebSocket disconnect')) {
      return currentState.permissionRequest?.isActive && 
             currentState.websocket?.readyState !== 1;
    }

    // Loading animation indicators
    if (indicator.includes('isComplete state changes rapidly')) {
      const loadingStateChanges = recentInteractions.filter(i => 
        i.eventType === 'loading_state_change'
      ).length;
      return loadingStateChanges > 3;
    }

    // Timeout indicators
    if (indicator.includes('setTimeout calls without clearTimeout cleanup')) {
      const timeoutCalls = recentInteractions.filter(i => 
        i.eventType === 'timeout_created'
      ).length;
      const timeoutClears = recentInteractions.filter(i => 
        i.eventType === 'timeout_cleared'
      ).length;
      return timeoutCalls > timeoutClears + 2;
    }

    // React state indicators
    if (indicator.includes('React state updates during WebSocket event bursts')) {
      const stateUpdates = recentInteractions.filter(i => 
        i.eventType === 'state_update' && i.timestamp > Date.now() - 1000
      ).length;
      return stateUpdates > 5;
    }

    return false;
  }

  /**
   * Generate specific recommendations based on detected patterns
   */
  private generateRecommendations(patterns: FailurePattern[]): string[] {
    const recommendations: string[] = [];

    patterns.forEach(pattern => {
      switch (pattern.patternId) {
        case 'WS_CONN_DROP_001':
          recommendations.push('Implement WebSocket heartbeat mechanism');
          recommendations.push('Add exponential backoff to reconnection logic');
          break;
        case 'PERM_STATE_001':
          recommendations.push('Clear permission state on WebSocket disconnect');
          recommendations.push('Validate requestId before processing responses');
          break;
        case 'LOAD_RACE_001':
          recommendations.push('Debounce loading animation state updates');
          recommendations.push('Add animation state cleanup on unmount');
          break;
        case 'UI_SYNC_001':
          recommendations.push('Batch React state updates during WebSocket events');
          recommendations.push('Add error boundary for state synchronization');
          break;
        case 'TIMEOUT_001':
          recommendations.push('Implement timeout handle registry');
          recommendations.push('Add automatic cleanup on component unmount');
          break;
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Generate prevention strategies
   */
  private generatePreventionStrategies(patterns: FailurePattern[]): string[] {
    const strategies: string[] = [];
    
    const highRiskPatterns = patterns.filter(p => p.cascadePotential === 'HIGH');
    
    if (highRiskPatterns.length > 0) {
      strategies.push('Implement real-time health monitoring');
      strategies.push('Add automatic failure recovery mechanisms');
      strategies.push('Enable predictive connection management');
    }

    strategies.push('Monitor pattern frequency changes');
    strategies.push('Update model weights based on success rates');
    
    return strategies;
  }

  /**
   * Track when a previously failing pattern starts succeeding
   */
  private analyzeSuccessfulPattern(interaction: UserInteractionData): void {
    // If an interaction completes successfully and was previously flagged as risky,
    // update our understanding of the pattern
    if (interaction.eventType === 'operation_completed' && !interaction.errorContext) {
      this.successfulPatterns.add(`${interaction.componentPath}:${interaction.eventType}`);
    }
  }

  /**
   * Update model based on actual outcomes
   */
  updateModelWeights(patternId: string, actualOutcome: 'success' | 'failure'): void {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    // Simple learning: adjust success rate based on actual outcome
    const learningRate = 0.1;
    if (actualOutcome === 'success') {
      pattern.successRate = Math.min(1.0, pattern.successRate + learningRate);
    } else {
      pattern.successRate = Math.max(0.0, pattern.successRate - learningRate);
    }

    this.patterns.set(patternId, pattern);
  }

  /**
   * Export current model state for neural network training
   */
  exportTrainingData(): any {
    return {
      patterns: Array.from(this.patterns.entries()),
      weights: Array.from(this.modelWeights.entries()),
      interactionHistory: this.interactionHistory,
      successfulPatterns: Array.from(this.successfulPatterns),
      modelMetrics: this.calculateModelMetrics()
    };
  }

  /**
   * Calculate current model performance metrics
   */
  private calculateModelMetrics(): any {
    const totalPatterns = this.patterns.size;
    const highConfidencePatterns = Array.from(this.patterns.values())
      .filter(p => p.confidence > 0.8).length;
    
    return {
      totalPatterns,
      highConfidencePatterns,
      averageSuccessRate: Array.from(this.patterns.values())
        .reduce((sum, p) => sum + p.successRate, 0) / totalPatterns,
      interactionSampleSize: this.interactionHistory.length
    };
  }
}

// Singleton instance for global pattern tracking
export const failurePredictionModel = new FailurePredictionModel();