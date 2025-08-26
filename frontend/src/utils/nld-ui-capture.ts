/**
 * NLD (Neural Learning Database) UI Capture System
 * Captures UI interaction patterns, tracks failure modes, and learns from user behavior
 * to provide proactive error prevention and performance optimization.
 */

// Core interfaces for pattern capture
export interface UIPattern {
  id: string;
  action: string;
  context: {
    component: string;
    viewport: { width: number; height: number };
    userAgent: string;
    timestamp: Date;
    sessionId: string;
    instanceId?: string;
    previousActions?: string[];
    errorContext?: any;
  };
  outcome: 'success' | 'failure' | 'timeout' | 'cancelled';
  errorDetails?: string;
  performanceMetrics?: {
    duration: number;
    memoryUsage?: number;
    networkLatency?: number;
  };
  timestamp: Date;
  sessionId: string;
}

export interface UIFailurePattern {
  patternId: string;
  failureType: 'websocket' | 'api' | 'ui' | 'performance' | 'navigation';
  frequency: number;
  lastOccurrence: Date;
  contexts: UIPattern[];
  preventionStrategy?: string;
  resolved: boolean;
}

export interface UserBehaviorProfile {
  sessionId: string;
  preferredViews: string[];
  commonSequences: string[][];
  errorRecoveryPatterns: string[];
  performancePreferences: {
    terminalMode: string;
    autoLaunch: boolean;
    diagnosticLevel: 'basic' | 'detailed' | 'verbose';
  };
}

export interface NLDRecommendation {
  type: 'optimization' | 'prevention' | 'enhancement';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  action: string;
  confidence: number;
}

// Core NLD capture class
export class NLDUICapture {
  private patterns: UIPattern[] = [];
  private failurePatterns: Map<string, UIFailurePattern> = new Map();
  private userProfiles: Map<string, UserBehaviorProfile> = new Map();
  private sessionId: string;
  private currentContext: Partial<UIPattern['context']> = {};
  private actionSequence: string[] = [];
  private performanceObserver?: PerformanceObserver;
  private isCapturing: boolean = true;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeCapture();
    this.setupPerformanceMonitoring();
  }

  private generateSessionId(): string {
    return `nld-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeCapture(): void {
    // Set up global context
    this.currentContext = {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      userAgent: navigator.userAgent,
      timestamp: new Date(),
      sessionId: this.sessionId,
      previousActions: []
    };

    // Monitor viewport changes
    window.addEventListener('resize', () => {
      this.currentContext.viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
    });

    // Monitor page visibility for session continuity
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.capturePattern('session_pause', 'system', 'success');
      } else {
        this.capturePattern('session_resume', 'system', 'success');
      }
    });
  }

  private setupPerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation' || entry.entryType === 'measure') {
            this.capturePerformanceMetrics(entry);
          }
        });
      });
      
      this.performanceObserver.observe({ entryTypes: ['navigation', 'measure'] });
    }
  }

  private capturePerformanceMetrics(entry: PerformanceEntry): void {
    const perfPattern: UIPattern = {
      id: this.generatePatternId(),
      action: `performance_${entry.entryType}`,
      context: {
        ...this.currentContext,
        component: 'performance-monitor',
        errorContext: {
          entryType: entry.entryType,
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime
        }
      } as UIPattern['context'],
      outcome: entry.duration > 1000 ? 'timeout' : 'success',
      performanceMetrics: {
        duration: entry.duration,
        memoryUsage: (performance as any).memory?.usedJSHeapSize
      },
      timestamp: new Date(),
      sessionId: this.sessionId
    };

    this.storePattern(perfPattern);
  }

  // Main pattern capture method
  public capturePattern(
    action: string,
    component: string,
    outcome: UIPattern['outcome'],
    errorDetails?: string,
    additionalContext?: any
  ): string {
    if (!this.isCapturing) return '';

    const patternId = this.generatePatternId();
    const startTime = performance.now();

    const pattern: UIPattern = {
      id: patternId,
      action,
      context: {
        ...this.currentContext,
        component,
        previousActions: [...this.actionSequence].slice(-5), // Last 5 actions
        errorContext: additionalContext,
        timestamp: new Date(),
        sessionId: this.sessionId
      } as UIPattern['context'],
      outcome,
      errorDetails,
      performanceMetrics: {
        duration: performance.now() - startTime,
        memoryUsage: (performance as any).memory?.usedJSHeapSize,
        networkLatency: this.getNetworkLatency()
      },
      timestamp: new Date(),
      sessionId: this.sessionId
    };

    // Update action sequence
    this.actionSequence.push(action);
    if (this.actionSequence.length > 20) {
      this.actionSequence = this.actionSequence.slice(-20);
    }

    this.storePattern(pattern);
    
    // Analyze for failure patterns
    if (outcome === 'failure') {
      this.analyzeFailurePattern(pattern);
    }

    // Update user behavior profile
    this.updateUserProfile(pattern);

    return patternId;
  }

  private generatePatternId(): string {
    return `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }

  private getNetworkLatency(): number {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return navigation ? navigation.responseEnd - navigation.requestStart : 0;
  }

  private storePattern(pattern: UIPattern): void {
    this.patterns.push(pattern);
    
    // Keep only last 1000 patterns in memory
    if (this.patterns.length > 1000) {
      this.patterns = this.patterns.slice(-1000);
    }

    // Store in localStorage for persistence
    try {
      const stored = JSON.parse(localStorage.getItem('nld-patterns') || '[]');
      stored.push(pattern);
      localStorage.setItem('nld-patterns', JSON.stringify(stored.slice(-500)));
    } catch (error) {
      console.warn('NLD: Failed to persist pattern to localStorage:', error);
    }
  }

  private analyzeFailurePattern(pattern: UIPattern): void {
    const key = `${pattern.context.component}_${pattern.action}`;
    let failurePattern = this.failurePatterns.get(key);

    if (!failurePattern) {
      failurePattern = {
        patternId: key,
        failureType: this.classifyFailureType(pattern),
        frequency: 0,
        lastOccurrence: pattern.timestamp,
        contexts: [],
        resolved: false
      };
      this.failurePatterns.set(key, failurePattern);
    }

    failurePattern.frequency++;
    failurePattern.lastOccurrence = pattern.timestamp;
    failurePattern.contexts.push(pattern);

    // Keep only last 10 contexts
    if (failurePattern.contexts.length > 10) {
      failurePattern.contexts = failurePattern.contexts.slice(-10);
    }

    // Generate prevention strategy for recurring failures
    if (failurePattern.frequency >= 3) {
      failurePattern.preventionStrategy = this.generatePreventionStrategy(failurePattern);
    }
  }

  private classifyFailureType(pattern: UIPattern): UIFailurePattern['failureType'] {
    const action = pattern.action.toLowerCase();
    const error = pattern.errorDetails?.toLowerCase() || '';

    if (action.includes('websocket') || error.includes('websocket')) return 'websocket';
    if (action.includes('api') || error.includes('fetch') || error.includes('xhr')) return 'api';
    if (action.includes('navigation') || action.includes('route')) return 'navigation';
    if (pattern.performanceMetrics?.duration && pattern.performanceMetrics.duration > 5000) return 'performance';
    return 'ui';
  }

  private generatePreventionStrategy(failurePattern: UIFailurePattern): string {
    switch (failurePattern.failureType) {
      case 'websocket':
        return 'Implement connection retry logic and health checks';
      case 'api':
        return 'Add request timeout and error boundary handling';
      case 'performance':
        return 'Implement lazy loading and component virtualization';
      case 'navigation':
        return 'Add route validation and fallback mechanisms';
      case 'ui':
      default:
        return 'Add input validation and error state handling';
    }
  }

  private updateUserProfile(pattern: UIPattern): void {
    let profile = this.userProfiles.get(this.sessionId);
    
    if (!profile) {
      profile = {
        sessionId: this.sessionId,
        preferredViews: [],
        commonSequences: [],
        errorRecoveryPatterns: [],
        performancePreferences: {
          terminalMode: 'expanded',
          autoLaunch: false,
          diagnosticLevel: 'basic'
        }
      };
      this.userProfiles.set(this.sessionId, profile);
    }

    // Track preferred views
    if (pattern.action.includes('view_switch') || pattern.action.includes('mode_select')) {
      const view = pattern.context.errorContext?.mode || pattern.context.errorContext?.view;
      if (view && !profile.preferredViews.includes(view)) {
        profile.preferredViews.push(view);
      }
    }

    // Track common action sequences
    if (this.actionSequence.length >= 3) {
      const sequence = this.actionSequence.slice(-3);
      const sequenceKey = sequence.join('->');
      const existingSequence = profile.commonSequences.find(seq => seq.join('->') === sequenceKey);
      if (!existingSequence) {
        profile.commonSequences.push(sequence);
      }
    }

    // Track error recovery patterns
    if (pattern.outcome === 'success' && this.actionSequence.length >= 2) {
      const previousAction = this.actionSequence[this.actionSequence.length - 2];
      if (previousAction && previousAction.includes('error') || previousAction.includes('failure')) {
        profile.errorRecoveryPatterns.push(`${previousAction}->${pattern.action}`);
      }
    }
  }

  // Public methods for UI components to use
  public captureButtonClick(buttonId: string, component: string, success: boolean = true): string {
    return this.capturePattern(
      `button_click_${buttonId}`,
      component,
      success ? 'success' : 'failure'
    );
  }

  public captureToggleAction(toggleId: string, newState: boolean, component: string): string {
    return this.capturePattern(
      `toggle_${toggleId}`,
      component,
      'success',
      undefined,
      { newState, toggleId }
    );
  }

  public captureViewSwitch(fromView: string, toView: string, component: string): string {
    return this.capturePattern(
      'view_switch',
      component,
      'success',
      undefined,
      { fromView, toView }
    );
  }

  public captureApiCall(endpoint: string, method: string, success: boolean, duration: number, error?: string): string {
    return this.capturePattern(
      `api_call_${method}_${endpoint}`,
      'api',
      success ? 'success' : 'failure',
      error,
      { endpoint, method, duration }
    );
  }

  public captureWebSocketEvent(eventType: string, success: boolean, data?: any, error?: string): string {
    // Enhanced WebSocket error capture for NLD patterns
    if (!success && eventType === 'connection') {
      this.captureWebSocketConnectionFailure(error || 'WebSocket connection failed', data?.url || 'unknown', data?.component || 'websocket');
    }
    
    return this.capturePattern(
      `websocket_${eventType}`,
      'websocket',
      success ? 'success' : 'failure',
      error,
      { eventType, data }
    );
  }

  // Specific NLD pattern capture methods for connection failures
  public captureWebSocketConnectionFailure(error: string, url: string, component: string): string {
    return this.capturePattern(
      'websocket_connection_failure',
      component,
      'failure',
      error,
      {
        patternId: 'NLD-CONN-001',
        url,
        failureType: 'websocket_error',
        preventionStrategies: [
          'Implement health check before WebSocket connection',
          'Add exponential backoff retry logic',
          'Validate WebSocket URL format',
          'Implement transport fallback to HTTP polling'
        ],
        detectionTrigger: 'WebSocket onerror event'
      }
    );
  }

  public captureInstanceCreationFailure(error: string, url: string, method: string, component: string): string {
    return this.capturePattern(
      'instance_creation_failure',
      component,
      'failure',
      error,
      {
        patternId: 'NLD-API-001',
        url,
        method,
        failureType: 'api_failure',
        preventionStrategies: [
          'Add pre-request health check validation',
          'Implement request timeout with retry logic',
          'Parse and display detailed error messages',
          'Add client-side rate limiting prevention'
        ],
        detectionTrigger: 'fetch() exception or non-200 response'
      }
    );
  }

  public captureCommunicationBreakdown(details: any, component: string): string {
    return this.capturePattern(
      'communication_breakdown',
      component,
      'failure',
      'Complete communication breakdown between frontend and backend',
      {
        patternId: 'NLD-COMM-001',
        details,
        failureType: 'communication_breakdown',
        preventionStrategies: [
          'Implement multi-endpoint health check system',
          'Add dynamic service discovery',
          'Validate CORS configuration',
          'Implement communication protocol fallback'
        ],
        detectionTrigger: 'Multiple consecutive API failures across endpoints'
      }
    );
  }

  public capturePerformanceIssue(component: string, metric: string, value: number, threshold: number): string {
    return this.capturePattern(
      `performance_issue_${metric}`,
      component,
      value > threshold ? 'failure' : 'success',
      value > threshold ? `${metric} exceeded threshold: ${value} > ${threshold}` : undefined,
      { metric, value, threshold }
    );
  }

  public captureNavigationAction(action: string, path: string, success: boolean, error?: string): string {
    return this.capturePattern(
      `navigation_${action}`,
      'router',
      success ? 'success' : 'failure',
      error,
      { path, action }
    );
  }

  // Analytics and recommendations
  public getFailurePatterns(): UIFailurePattern[] {
    return Array.from(this.failurePatterns.values());
  }

  public getUserProfile(sessionId?: string): UserBehaviorProfile | undefined {
    return this.userProfiles.get(sessionId || this.sessionId);
  }

  public generateRecommendations(): NLDRecommendation[] {
    const recommendations: NLDRecommendation[] = [];
    
    // Analyze failure patterns
    this.failurePatterns.forEach((pattern) => {
      if (pattern.frequency >= 3 && !pattern.resolved) {
        recommendations.push({
          type: 'prevention',
          priority: pattern.frequency > 5 ? 'high' : 'medium',
          message: `Recurring ${pattern.failureType} failure detected in ${pattern.patternId}`,
          action: pattern.preventionStrategy || 'Manual investigation required',
          confidence: Math.min(pattern.frequency / 10, 0.9)
        });
      }
    });

    // Analyze user preferences
    const profile = this.getUserProfile();
    if (profile) {
      if (profile.preferredViews.length > 0) {
        recommendations.push({
          type: 'optimization',
          priority: 'low',
          message: `Consider defaulting to ${profile.preferredViews[0]} view`,
          action: 'Update default view preference',
          confidence: 0.7
        });
      }

      if (profile.commonSequences.length > 0) {
        recommendations.push({
          type: 'enhancement',
          priority: 'medium',
          message: 'Common action sequences detected',
          action: 'Consider adding shortcut buttons or automated workflows',
          confidence: 0.6
        });
      }
    }

    // Performance recommendations
    const performancePatterns = this.patterns.filter(p => 
      p.performanceMetrics?.duration && p.performanceMetrics.duration > 1000
    );

    if (performancePatterns.length > 5) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        message: 'Multiple slow operations detected',
        action: 'Implement loading states and optimize component rendering',
        confidence: 0.8
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  public exportPatterns(): { patterns: UIPattern[], failurePatterns: UIFailurePattern[], profiles: UserBehaviorProfile[] } {
    return {
      patterns: this.patterns,
      failurePatterns: Array.from(this.failurePatterns.values()),
      profiles: Array.from(this.userProfiles.values())
    };
  }

  public clearPatterns(): void {
    this.patterns = [];
    this.failurePatterns.clear();
    localStorage.removeItem('nld-patterns');
  }

  public pauseCapture(): void {
    this.isCapturing = false;
  }

  public resumeCapture(): void {
    this.isCapturing = true;
  }

  public destroy(): void {
    this.performanceObserver?.disconnect();
    this.clearPatterns();
  }
}

// Global instance
export const nldCapture = new NLDUICapture();

// Convenience hooks for React components
export const useNLDCapture = () => {
  return {
    captureButtonClick: nldCapture.captureButtonClick.bind(nldCapture),
    captureToggleAction: nldCapture.captureToggleAction.bind(nldCapture),
    captureViewSwitch: nldCapture.captureViewSwitch.bind(nldCapture),
    captureApiCall: nldCapture.captureApiCall.bind(nldCapture),
    captureWebSocketEvent: nldCapture.captureWebSocketEvent.bind(nldCapture),
    capturePerformanceIssue: nldCapture.capturePerformanceIssue.bind(nldCapture),
    captureNavigationAction: nldCapture.captureNavigationAction.bind(nldCapture),
    getRecommendations: nldCapture.generateRecommendations.bind(nldCapture),
    exportPatterns: nldCapture.exportPatterns.bind(nldCapture)
  };
};