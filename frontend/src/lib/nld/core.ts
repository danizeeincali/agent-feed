/**
 * Neural Learning Detection (NLD) Core System
 * Detects and learns from connection failure patterns
 */

export interface NLDEvent {
  id: string;
  timestamp: number;
  type: 'connection' | 'disconnection' | 'error' | 'timeout' | 'retry' | 'user_action';
  data: Record<string, any>;
  context: {
    url?: string;
    duration?: number;
    errorCode?: string;
    userAgent?: string;
    sessionId: string;
    previousEvents: string[];
  };
}

export interface FailurePattern {
  id: string;
  type: 'connection_loop' | 'race_condition' | 'timeout_cascade' | 'state_violation' | 'user_confusion';
  severity: 'low' | 'medium' | 'high' | 'critical';
  frequency: number;
  description: string;
  events: NLDEvent[];
  detectedAt: number;
  confidence: number;
  metadata: Record<string, any>;
}

export interface NLDRecord {
  recordId: string;
  taskContext: string;
  failureType: string;
  userFeedback?: string;
  correctedSolution?: string;
  effectivenessScore: number;
  tddFactor: number;
  createdAt: number;
}

export class NLDCore {
  private events: NLDEvent[] = [];
  private patterns: FailurePattern[] = [];
  private records: NLDRecord[] = [];
  private sessionId: string;
  private maxEvents = 1000;
  private patternDetectionInterval = 5000; // 5 seconds
  private isAnalyzing = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startPatternDetection();
    this.initializeEventListeners();
  }

  /**
   * Capture a connection-related event
   */
  captureEvent(
    type: NLDEvent['type'],
    data: Record<string, any>,
    context: Partial<NLDEvent['context']> = {}
  ): void {
    const event: NLDEvent = {
      id: this.generateEventId(),
      timestamp: Date.now(),
      type,
      data,
      context: {
        sessionId: this.sessionId,
        previousEvents: this.getRecentEventIds(5),
        ...context
      }
    };

    this.events.push(event);
    
    // Maintain sliding window of events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Trigger immediate analysis for critical events
    if (this.isCriticalEvent(event)) {
      this.analyzePatterns();
    }

    console.log('[NLD] Event captured:', {
      type: event.type,
      timestamp: event.timestamp,
      data: event.data
    });
  }

  /**
   * Analyze events for failure patterns
   */
  analyzePatterns(): void {
    if (this.isAnalyzing) return;
    this.isAnalyzing = true;

    try {
      const recentEvents = this.getRecentEvents(50);
      
      // Run all pattern detectors
      const newPatterns = [
        ...this.detectConnectionLoops(recentEvents),
        ...this.detectRaceConditions(recentEvents),
        ...this.detectTimeoutCascades(recentEvents),
        ...this.detectStateViolations(recentEvents),
        ...this.detectUserConfusion(recentEvents)
      ];

      // Add new unique patterns
      newPatterns.forEach(pattern => {
        if (!this.isDuplicatePattern(pattern)) {
          this.patterns.push(pattern);
          this.onPatternDetected(pattern);
        }
      });

      // Clean up old patterns
      this.cleanupOldPatterns();

    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Detect rapid connect/disconnect loops
   */
  private detectConnectionLoops(events: NLDEvent[]): FailurePattern[] {
    const patterns: FailurePattern[] = [];
    const connectionEvents = events.filter(e => 
      e.type === 'connection' || e.type === 'disconnection'
    );

    // Look for rapid connection cycles within 10 seconds
    const timeWindow = 10000;
    const minCycles = 3;

    for (let i = 0; i < connectionEvents.length - (minCycles * 2); i++) {
      const startEvent = connectionEvents[i];
      const endTime = startEvent.timestamp + timeWindow;
      const windowEvents = connectionEvents.slice(i).filter(e => 
        e.timestamp <= endTime
      );

      // Count connect/disconnect pairs
      let cycles = 0;
      let isConnected = startEvent.type === 'connection';
      
      for (let j = 1; j < windowEvents.length; j++) {
        const event = windowEvents[j];
        if (event.type === 'connection' && !isConnected) {
          isConnected = true;
        } else if (event.type === 'disconnection' && isConnected) {
          isConnected = false;
          cycles++;
        }
      }

      if (cycles >= minCycles) {
        patterns.push({
          id: this.generatePatternId(),
          type: 'connection_loop',
          severity: cycles > 5 ? 'high' : 'medium',
          frequency: cycles,
          description: `Detected ${cycles} rapid connection cycles in ${timeWindow/1000}s`,
          events: windowEvents,
          detectedAt: Date.now(),
          confidence: Math.min(cycles / 10, 1),
          metadata: { cycles, timeWindow }
        });
      }
    }

    return patterns;
  }

  /**
   * Detect race conditions in connection attempts
   */
  private detectRaceConditions(events: NLDEvent[]): FailurePattern[] {
    const patterns: FailurePattern[] = [];
    const connectionAttempts = events.filter(e => e.type === 'connection');

    // Look for simultaneous connection attempts
    const raceWindow = 100; // 100ms window

    for (let i = 0; i < connectionAttempts.length - 1; i++) {
      const current = connectionAttempts[i];
      const simultaneous = connectionAttempts.slice(i + 1).filter(e => 
        Math.abs(e.timestamp - current.timestamp) <= raceWindow
      );

      if (simultaneous.length > 0) {
        const raceEvents = [current, ...simultaneous];
        patterns.push({
          id: this.generatePatternId(),
          type: 'race_condition',
          severity: 'medium',
          frequency: simultaneous.length + 1,
          description: `Detected ${simultaneous.length + 1} simultaneous connection attempts`,
          events: raceEvents,
          detectedAt: Date.now(),
          confidence: Math.min(simultaneous.length / 3, 1),
          metadata: { raceWindow, simultaneousAttempts: simultaneous.length + 1 }
        });
      }
    }

    return patterns;
  }

  /**
   * Detect timeout failure cascades
   */
  private detectTimeoutCascades(events: NLDEvent[]): FailurePattern[] {
    const patterns: FailurePattern[] = [];
    const timeoutEvents = events.filter(e => e.type === 'timeout');

    // Look for cascading timeouts
    const cascadeWindow = 30000; // 30 seconds
    const minTimeouts = 3;

    if (timeoutEvents.length >= minTimeouts) {
      for (let i = 0; i < timeoutEvents.length - minTimeouts + 1; i++) {
        const startEvent = timeoutEvents[i];
        const endTime = startEvent.timestamp + cascadeWindow;
        const cascadeEvents = timeoutEvents.slice(i).filter(e => 
          e.timestamp <= endTime
        );

        if (cascadeEvents.length >= minTimeouts) {
          patterns.push({
            id: this.generatePatternId(),
            type: 'timeout_cascade',
            severity: cascadeEvents.length > 5 ? 'high' : 'medium',
            frequency: cascadeEvents.length,
            description: `Detected ${cascadeEvents.length} cascading timeouts`,
            events: cascadeEvents,
            detectedAt: Date.now(),
            confidence: Math.min(cascadeEvents.length / 10, 1),
            metadata: { cascadeWindow, timeoutCount: cascadeEvents.length }
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect state machine violations
   */
  private detectStateViolations(events: NLDEvent[]): FailurePattern[] {
    const patterns: FailurePattern[] = [];
    const stateEvents = events.filter(e => 
      e.data.state || e.data.previousState || e.data.expectedState
    );

    // Define valid state transitions
    const validTransitions = new Map([
      ['disconnected', new Set(['connecting', 'error'])],
      ['connecting', new Set(['connected', 'disconnected', 'error'])],
      ['connected', new Set(['disconnecting', 'error'])],
      ['disconnecting', new Set(['disconnected', 'error'])],
      ['error', new Set(['disconnected', 'connecting'])]
    ]);

    // Check for invalid transitions
    for (let i = 0; i < stateEvents.length - 1; i++) {
      const current = stateEvents[i];
      const next = stateEvents[i + 1];
      
      const currentState = current.data.state || current.data.newState;
      const nextState = next.data.state || next.data.newState;

      if (currentState && nextState) {
        const allowedTransitions = validTransitions.get(currentState);
        if (allowedTransitions && !allowedTransitions.has(nextState)) {
          patterns.push({
            id: this.generatePatternId(),
            type: 'state_violation',
            severity: 'high',
            frequency: 1,
            description: `Invalid state transition: ${currentState} → ${nextState}`,
            events: [current, next],
            detectedAt: Date.now(),
            confidence: 0.9,
            metadata: { 
              invalidTransition: `${currentState} → ${nextState}`,
              timeBetween: next.timestamp - current.timestamp
            }
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect user confusion patterns
   */
  private detectUserConfusion(events: NLDEvent[]): FailurePattern[] {
    const patterns: FailurePattern[] = [];
    const userActions = events.filter(e => e.type === 'user_action');

    // Look for rapid repeated actions (user confusion indicator)
    const confusionWindow = 5000; // 5 seconds
    const minActions = 3;

    for (let i = 0; i < userActions.length - minActions + 1; i++) {
      const startEvent = userActions[i];
      const endTime = startEvent.timestamp + confusionWindow;
      const windowActions = userActions.slice(i).filter(e => 
        e.timestamp <= endTime && e.data.action === startEvent.data.action
      );

      if (windowActions.length >= minActions) {
        patterns.push({
          id: this.generatePatternId(),
          type: 'user_confusion',
          severity: 'medium',
          frequency: windowActions.length,
          description: `User repeated "${startEvent.data.action}" ${windowActions.length} times rapidly`,
          events: windowActions,
          detectedAt: Date.now(),
          confidence: Math.min(windowActions.length / 5, 1),
          metadata: { 
            action: startEvent.data.action,
            repetitions: windowActions.length,
            timeWindow: confusionWindow
          }
        });
      }
    }

    return patterns;
  }

  /**
   * Store NLT record for neural training
   */
  storeNLTRecord(
    taskContext: string,
    failureType: string,
    userFeedback?: string,
    correctedSolution?: string
  ): string {
    const record: NLDRecord = {
      recordId: this.generateRecordId(),
      taskContext,
      failureType,
      userFeedback,
      correctedSolution,
      effectivenessScore: this.calculateEffectivenessScore(),
      tddFactor: this.calculateTDDFactor(),
      createdAt: Date.now()
    };

    this.records.push(record);
    console.log('[NLD] NLT Record stored:', record.recordId);
    return record.recordId;
  }

  /**
   * Generate preventive measures based on detected patterns
   */
  generatePreventiveMeasures(pattern: FailurePattern): string[] {
    const measures: string[] = [];

    switch (pattern.type) {
      case 'connection_loop':
        measures.push(
          'Implement exponential backoff for reconnection attempts',
          'Add circuit breaker pattern to prevent rapid reconnections',
          'Show user feedback during connection attempts',
          'Limit maximum reconnection attempts per session'
        );
        break;

      case 'race_condition':
        measures.push(
          'Implement connection state synchronization',
          'Add mutex/lock for connection operations',
          'Debounce connection attempts',
          'Queue connection requests instead of parallel execution'
        );
        break;

      case 'timeout_cascade':
        measures.push(
          'Implement adaptive timeout values',
          'Add connection health monitoring',
          'Use progressive timeout increases',
          'Implement fallback connection strategies'
        );
        break;

      case 'state_violation':
        measures.push(
          'Add state transition validation',
          'Implement state machine with guards',
          'Add logging for state changes',
          'Create state recovery mechanisms'
        );
        break;

      case 'user_confusion':
        measures.push(
          'Add loading states and progress indicators',
          'Implement user action debouncing',
          'Provide clear feedback messages',
          'Add help tooltips for connection issues'
        );
        break;
    }

    return measures;
  }

  // Helper methods
  private generateSessionId(): string {
    return `nld-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePatternId(): string {
    return `pat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRecordId(): string {
    return `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getRecentEventIds(count: number): string[] {
    return this.events.slice(-count).map(e => e.id);
  }

  private getRecentEvents(count: number): NLDEvent[] {
    return this.events.slice(-count);
  }

  private isCriticalEvent(event: NLDEvent): boolean {
    return event.type === 'error' || 
           event.type === 'timeout' ||
           (event.data.severity === 'high');
  }

  private isDuplicatePattern(pattern: FailurePattern): boolean {
    const recentPatterns = this.patterns.filter(p => 
      Date.now() - p.detectedAt < 60000 // 1 minute
    );

    return recentPatterns.some(p => 
      p.type === pattern.type && 
      Math.abs(p.detectedAt - pattern.detectedAt) < 10000 // 10 seconds
    );
  }

  private cleanupOldPatterns(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoff = Date.now() - maxAge;
    this.patterns = this.patterns.filter(p => p.detectedAt > cutoff);
  }

  private calculateEffectivenessScore(): number {
    // Calculate based on recent success/failure ratio
    const recentEvents = this.getRecentEvents(20);
    const successes = recentEvents.filter(e => e.type === 'connection').length;
    const failures = recentEvents.filter(e => e.type === 'error' || e.type === 'timeout').length;
    
    if (successes + failures === 0) return 0.5;
    return successes / (successes + failures);
  }

  private calculateTDDFactor(): number {
    // Simple TDD factor - can be enhanced based on actual TDD usage
    return 0.7; // Default value, should be calculated based on test coverage
  }

  private startPatternDetection(): void {
    setInterval(() => {
      if (this.events.length > 0) {
        this.analyzePatterns();
      }
    }, this.patternDetectionInterval);
  }

  private initializeEventListeners(): void {
    // Listen for window events that might indicate connection issues
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.captureEvent('connection', { source: 'network', online: true });
      });

      window.addEventListener('offline', () => {
        this.captureEvent('disconnection', { source: 'network', online: false });
      });

      window.addEventListener('beforeunload', () => {
        this.exportTrainingData();
      });
    }
  }

  private onPatternDetected(pattern: FailurePattern): void {
    console.warn('[NLD] Pattern detected:', {
      type: pattern.type,
      severity: pattern.severity,
      description: pattern.description,
      confidence: pattern.confidence
    });

    // Emit custom event for UI components to react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nld:pattern-detected', {
        detail: pattern
      }));
    }
  }

  /**
   * Export training data for neural networks
   */
  exportTrainingData(): any {
    return {
      sessionId: this.sessionId,
      events: this.events,
      patterns: this.patterns,
      records: this.records,
      exportedAt: Date.now()
    };
  }

  // Public getters
  getPatterns(): FailurePattern[] {
    return [...this.patterns];
  }

  getRecords(): NLDRecord[] {
    return [...this.records];
  }

  getEvents(): NLDEvent[] {
    return [...this.events];
  }
}

// Global NLD instance
export const nld = new NLDCore();