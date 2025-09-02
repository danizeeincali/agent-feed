/**
 * NLD Failure Detection Engine
 * Automatically detects and learns from Claude instance synchronization failures
 */

export interface FailurePattern {
  id: string;
  timestamp: number;
  type: 'STALE_INSTANCE_ID' | 'CONNECTION_MISMATCH' | 'CACHE_DESYNC' | 'TIMEOUT_ERROR';
  context: {
    frontendInstanceId?: string;
    backendInstances?: string[];
    userAction?: string;
    errorMessage?: string;
    componentStack?: string[];
  };
  confidence: number;
  recoveryApplied?: string;
  userFeedback?: 'success' | 'failure' | 'partial';
  tddFactor: number; // 0-1 score based on test coverage
}

export interface NeuralPattern {
  pattern: string;
  frequency: number;
  successRate: number;
  recoveryStrategy: string;
  lastSeen: number;
  predictiveScore: number;
}

class FailureDetectionEngine {
  private patterns: Map<string, FailurePattern> = new Map();
  private neuralPatterns: Map<string, NeuralPattern> = new Map();
  private listeners: Array<(pattern: FailurePattern) => void> = [];
  private isActive: boolean = true;

  constructor() {
    this.initializeDetection();
    this.loadHistoricalPatterns();
  }

  /**
   * Initialize failure detection mechanisms
   */
  private initializeDetection(): void {
    // Monitor WebSocket connection errors
    this.setupWebSocketMonitoring();
    
    // Monitor API response patterns
    this.setupAPIResponseMonitoring();
    
    // Monitor component error boundaries
    this.setupComponentErrorMonitoring();
    
    // Monitor user interaction patterns
    this.setupUserInteractionMonitoring();
  }

  /**
   * Detect stale instance ID pattern
   */
  detectStaleInstancePattern(
    frontendInstanceId: string, 
    backendInstances: string[],
    errorMessage?: string
  ): FailurePattern | null {
    
    const isStalePattern = !backendInstances.includes(frontendInstanceId);
    
    if (isStalePattern) {
      const pattern: FailurePattern = {
        id: `stale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type: 'STALE_INSTANCE_ID',
        context: {
          frontendInstanceId,
          backendInstances,
          errorMessage,
          componentStack: this.captureComponentStack()
        },
        confidence: this.calculateConfidence('STALE_INSTANCE_ID', {
          instanceMismatch: true,
          errorPatternMatch: this.matchesKnownError(errorMessage),
          timePattern: this.analyzeTimePattern()
        }),
        tddFactor: this.calculateTDDFactor()
      };

      this.recordPattern(pattern);
      this.notifyListeners(pattern);
      
      return pattern;
    }
    
    return null;
  }

  /**
   * Detect connection mismatch patterns
   */
  detectConnectionMismatch(
    attemptedConnection: string,
    availableConnections: string[],
    userAction?: string
  ): FailurePattern | null {
    
    const pattern: FailurePattern = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'CONNECTION_MISMATCH',
      context: {
        frontendInstanceId: attemptedConnection,
        backendInstances: availableConnections,
        userAction,
        componentStack: this.captureComponentStack()
      },
      confidence: this.calculateConfidence('CONNECTION_MISMATCH', {
        connectionFailure: true,
        userActionPattern: this.analyzeUserAction(userAction)
      }),
      tddFactor: this.calculateTDDFactor()
    };

    this.recordPattern(pattern);
    this.triggerAutoRecovery(pattern);
    
    return pattern;
  }

  /**
   * Capture user feedback for learning
   */
  captureUserFeedback(
    trigger: string,
    feedback: 'success' | 'failure' | 'partial',
    context?: any
  ): void {
    
    // Find recent patterns that might relate to this feedback
    const recentPatterns = Array.from(this.patterns.values())
      .filter(p => Date.now() - p.timestamp < 60000) // Last minute
      .sort((a, b) => b.timestamp - a.timestamp);

    if (recentPatterns.length > 0) {
      const pattern = recentPatterns[0];
      pattern.userFeedback = feedback;
      
      // Update neural patterns based on feedback
      this.updateNeuralPatterns(pattern, feedback);
      
      // If failure reported, trigger investigation
      if (feedback === 'failure' && trigger.includes('didn\'t work')) {
        this.triggerFailureInvestigation(pattern, context);
      }
    }
  }

  /**
   * Update neural patterns based on success/failure feedback
   */
  private updateNeuralPatterns(pattern: FailurePattern, feedback: string): void {
    const patternKey = this.generatePatternKey(pattern);
    
    if (this.neuralPatterns.has(patternKey)) {
      const neural = this.neuralPatterns.get(patternKey)!;
      neural.frequency++;
      neural.lastSeen = Date.now();
      
      // Update success rate based on feedback
      if (feedback === 'success') {
        neural.successRate = (neural.successRate + 1.0) / 2;
      } else if (feedback === 'failure') {
        neural.successRate = (neural.successRate + 0.0) / 2;
      } else {
        neural.successRate = (neural.successRate + 0.5) / 2;
      }
      
      neural.predictiveScore = this.calculatePredictiveScore(neural);
    } else {
      const neural: NeuralPattern = {
        pattern: patternKey,
        frequency: 1,
        successRate: feedback === 'success' ? 1.0 : 0.0,
        recoveryStrategy: this.determineRecoveryStrategy(pattern),
        lastSeen: Date.now(),
        predictiveScore: 0.5
      };
      
      this.neuralPatterns.set(patternKey, neural);
    }
  }

  /**
   * Calculate confidence score for pattern detection
   */
  private calculateConfidence(
    type: FailurePattern['type'], 
    factors: any
  ): number {
    let confidence = 0.5; // Base confidence
    
    switch (type) {
      case 'STALE_INSTANCE_ID':
        if (factors.instanceMismatch) confidence += 0.3;
        if (factors.errorPatternMatch) confidence += 0.2;
        if (factors.timePattern) confidence += 0.1;
        break;
      case 'CONNECTION_MISMATCH':
        if (factors.connectionFailure) confidence += 0.4;
        if (factors.userActionPattern) confidence += 0.1;
        break;
    }
    
    return Math.min(1.0, confidence);
  }

  /**
   * Calculate TDD factor based on test coverage and patterns
   */
  private calculateTDDFactor(): number {
    // Analyze if this failure type has corresponding tests
    // Higher score = better test coverage for this failure type
    // This would integrate with test framework data
    return 0.7; // Placeholder - would be calculated from actual test data
  }

  /**
   * Trigger automatic recovery based on pattern
   */
  private triggerAutoRecovery(pattern: FailurePattern): void {
    const neural = this.neuralPatterns.get(this.generatePatternKey(pattern));
    
    if (neural && neural.predictiveScore > 0.7) {
      // High confidence recovery
      this.executeRecoveryStrategy(neural.recoveryStrategy, pattern);
    } else {
      // Default recovery strategies
      switch (pattern.type) {
        case 'STALE_INSTANCE_ID':
          this.executeRecoveryStrategy('refresh_instance_list', pattern);
          break;
        case 'CONNECTION_MISMATCH':
          this.executeRecoveryStrategy('reconnect_with_validation', pattern);
          break;
      }
    }
  }

  /**
   * Execute recovery strategy
   */
  private executeRecoveryStrategy(strategy: string, pattern: FailurePattern): void {
    pattern.recoveryApplied = strategy;
    
    // Notify recovery system
    this.listeners.forEach(listener => listener(pattern));
  }

  /**
   * Setup monitoring systems
   */
  private setupWebSocketMonitoring(): void {
    // Monitor WebSocket events for connection patterns
    if (typeof window !== 'undefined') {
      const originalWebSocket = window.WebSocket;
      const self = this;
      
      window.WebSocket = class extends WebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols);
          
          this.addEventListener('error', (event) => {
            self.detectConnectionError(url, event);
          });
          
          this.addEventListener('close', (event) => {
            self.detectConnectionClose(url, event);
          });
        }
      };
    }
  }

  private setupAPIResponseMonitoring(): void {
    // Monitor fetch responses for instance-related errors
    if (typeof window !== 'undefined' && window.fetch) {
      const originalFetch = window.fetch;
      const self = this;
      
      window.fetch = async function(...args) {
        const response = await originalFetch(...args);
        
        if (!response.ok && args[0].toString().includes('claude-')) {
          self.detectAPIError(args[0].toString(), response.status, response.statusText);
        }
        
        return response;
      };
    }
  }

  private setupComponentErrorMonitoring(): void {
    // This would integrate with React error boundaries
    // For now, we'll set up a global error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        if (event.error && event.error.message.includes('claude-')) {
          this.detectComponentError(event.error);
        }
      });
    }
  }

  private setupUserInteractionMonitoring(): void {
    // Monitor user interactions that might trigger failures
    if (typeof window !== 'undefined') {
      ['click', 'submit'].forEach(eventType => {
        window.addEventListener(eventType, (event) => {
          this.analyzeUserInteraction(event);
        });
      });
    }
  }

  // Helper methods for monitoring
  private detectConnectionError(url: string, event: Event): void {
    // Implementation would analyze connection errors
  }

  private detectConnectionClose(url: string, event: CloseEvent): void {
    // Implementation would analyze connection closures
  }

  private detectAPIError(url: string, status: number, statusText: string): void {
    // Implementation would analyze API errors
  }

  private detectComponentError(error: Error): void {
    // Implementation would analyze component errors
  }

  private analyzeUserInteraction(event: Event): void {
    // Implementation would analyze user interactions
  }

  // Utility methods
  private captureComponentStack(): string[] {
    // Would integrate with React DevTools or error boundary data
    return ['ClaudeInstanceManager', 'Terminal', 'WebSocketProvider'];
  }

  private matchesKnownError(errorMessage?: string): boolean {
    if (!errorMessage) return false;
    
    const knownPatterns = [
      /Instance.*not running/i,
      /does not exist/i,
      /connection refused/i,
      /timeout/i
    ];
    
    return knownPatterns.some(pattern => pattern.test(errorMessage));
  }

  private analyzeTimePattern(): boolean {
    // Analyze if failures follow time patterns (cache expiry, etc.)
    return true; // Placeholder
  }

  private analyzeUserAction(action?: string): boolean {
    if (!action) return false;
    return ['connect', 'refresh', 'retry'].some(keyword => action.includes(keyword));
  }

  private generatePatternKey(pattern: FailurePattern): string {
    return `${pattern.type}_${pattern.context.frontendInstanceId || 'unknown'}`;
  }

  private determineRecoveryStrategy(pattern: FailurePattern): string {
    switch (pattern.type) {
      case 'STALE_INSTANCE_ID':
        return 'refresh_instance_list';
      case 'CONNECTION_MISMATCH':
        return 'reconnect_with_validation';
      default:
        return 'generic_retry';
    }
  }

  private calculatePredictiveScore(neural: NeuralPattern): number {
    const frequencyWeight = Math.min(neural.frequency / 10, 1.0);
    const successWeight = neural.successRate;
    const recencyWeight = this.calculateRecencyScore(neural.lastSeen);
    
    return (frequencyWeight + successWeight + recencyWeight) / 3;
  }

  private calculateRecencyScore(lastSeen: number): number {
    const hoursSince = (Date.now() - lastSeen) / (1000 * 60 * 60);
    return Math.max(0, 1 - (hoursSince / 168)); // Decay over a week
  }

  private triggerFailureInvestigation(pattern: FailurePattern, context?: any): void {
    // Trigger deep investigation of the failure
    console.warn('NLD: Investigating reported failure', { pattern, context });
    
    // This would trigger additional data collection
    this.deepAnalyzeFailure(pattern);
  }

  private deepAnalyzeFailure(pattern: FailurePattern): void {
    // Perform deep analysis of the failure pattern
    // This might involve checking logs, system state, etc.
  }

  private loadHistoricalPatterns(): void {
    // Load patterns from localStorage or IndexedDB
    try {
      const stored = localStorage.getItem('nld_patterns');
      if (stored) {
        const data = JSON.parse(stored);
        data.patterns?.forEach((p: FailurePattern) => {
          this.patterns.set(p.id, p);
        });
        data.neuralPatterns?.forEach((np: [string, NeuralPattern]) => {
          this.neuralPatterns.set(np[0], np[1]);
        });
      }
    } catch (error) {
      console.warn('NLD: Failed to load historical patterns', error);
    }
  }

  private recordPattern(pattern: FailurePattern): void {
    this.patterns.set(pattern.id, pattern);
    this.persistPatterns();
  }

  private persistPatterns(): void {
    try {
      const data = {
        patterns: Array.from(this.patterns.values()),
        neuralPatterns: Array.from(this.neuralPatterns.entries()),
        timestamp: Date.now()
      };
      localStorage.setItem('nld_patterns', JSON.stringify(data));
    } catch (error) {
      console.warn('NLD: Failed to persist patterns', error);
    }
  }

  private notifyListeners(pattern: FailurePattern): void {
    this.listeners.forEach(listener => {
      try {
        listener(pattern);
      } catch (error) {
        console.error('NLD: Listener error', error);
      }
    });
  }

  // Public API
  public addListener(listener: (pattern: FailurePattern) => void): void {
    this.listeners.push(listener);
  }

  public removeListener(listener: (pattern: FailurePattern) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  public getPatterns(): FailurePattern[] {
    return Array.from(this.patterns.values());
  }

  public getNeuralPatterns(): Map<string, NeuralPattern> {
    return new Map(this.neuralPatterns);
  }

  public exportTrainingData(): any {
    return {
      patterns: this.getPatterns(),
      neuralPatterns: Array.from(this.neuralPatterns.entries()),
      metadata: {
        totalPatterns: this.patterns.size,
        neuralPatterns: this.neuralPatterns.size,
        exportTime: Date.now()
      }
    };
  }

  public activate(): void {
    this.isActive = true;
  }

  public deactivate(): void {
    this.isActive = false;
  }

  public isActiveDetection(): boolean {
    return this.isActive;
  }
}

export default FailureDetectionEngine;