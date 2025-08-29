/**
 * React Hook Side Effect Pattern Detector
 * NLD Analysis Module for capturing render-cycle rate limiting bugs
 * 
 * Pattern: "React Hook Side Effect in Render Cycle"
 * - Symptom: Buttons disabled without user interaction
 * - Root Cause: Hook function with side effects called during render
 * - Detection: Rate limiting triggered by component renders vs user actions
 * - Classification: High severity UI blocking bug
 */

import { nldLogger } from '../utils/nld-logger';

export interface ReactHookSideEffectPattern {
  id: string;
  timestamp: Date;
  componentName: string;
  hookName: string;
  sideEffectType: 'state-mutation' | 'api-call' | 'dom-manipulation' | 'event-emission' | 'rate-limiting';
  symptom: string;
  rootCause: string;
  renderCycleCount: number;
  rateLimitingTriggered: boolean;
  userActionCount: number;
  renderToActionRatio: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  sourceLocation: {
    file: string;
    line: number;
    column: number;
  };
  stackTrace?: string;
  metadata: Record<string, any>;
}

export interface SideEffectDetectionConfig {
  maxRenderCycles: number;
  rateLimitThreshold: number;
  trackingWindowMs: number;
  enableStackTracing: boolean;
  componentWhitelist?: string[];
  hookWhitelist?: string[];
}

export class ReactHookSideEffectDetector {
  private patterns: ReactHookSideEffectPattern[] = [];
  private renderCounts = new Map<string, number>();
  private userActionCounts = new Map<string, number>();
  private config: SideEffectDetectionConfig;
  private trackingWindows = new Map<string, Date>();

  constructor(config: Partial<SideEffectDetectionConfig> = {}) {
    this.config = {
      maxRenderCycles: 10,
      rateLimitThreshold: 2.0, // render to action ratio
      trackingWindowMs: 5000,
      enableStackTracing: true,
      ...config
    };

    nldLogger.renderAttempt('ReactHookSideEffectDetector', 'initialization', this.config);
  }

  /**
   * Detect React Hook side effects during render cycle
   * Based on observed TokenCostAnalytics pattern with disabled state
   */
  public detectSideEffectPattern(
    componentName: string,
    hookName: string,
    context: {
      isRendering: boolean;
      hasUserAction: boolean;
      sideEffectType: ReactHookSideEffectPattern['sideEffectType'];
      sourceLocation: { file: string; line: number; column: number };
      metadata?: Record<string, any>;
    }
  ): ReactHookSideEffectPattern | null {
    try {
      const key = `${componentName}:${hookName}`;
      const now = new Date();

      // Initialize tracking if needed
      if (!this.trackingWindows.has(key)) {
        this.trackingWindows.set(key, now);
        this.renderCounts.set(key, 0);
        this.userActionCounts.set(key, 0);
      }

      // Reset window if expired
      const windowStart = this.trackingWindows.get(key)!;
      if (now.getTime() - windowStart.getTime() > this.config.trackingWindowMs) {
        this.trackingWindows.set(key, now);
        this.renderCounts.set(key, 0);
        this.userActionCounts.set(key, 0);
      }

      // Update counters
      if (context.isRendering) {
        this.renderCounts.set(key, this.renderCounts.get(key)! + 1);
      }
      if (context.hasUserAction) {
        this.userActionCounts.set(key, this.userActionCounts.get(key)! + 1);
      }

      const renderCount = this.renderCounts.get(key)!;
      const actionCount = this.userActionCounts.get(key)!;
      const ratio = actionCount > 0 ? renderCount / actionCount : renderCount;

      // Detect pattern conditions
      const isPatternDetected = this.isPatternDetected(
        componentName,
        hookName,
        context.sideEffectType,
        renderCount,
        ratio
      );

      if (isPatternDetected) {
        const pattern = this.createPattern(
          componentName,
          hookName,
          context,
          renderCount,
          actionCount,
          ratio
        );

        this.patterns.push(pattern);
        this.logPatternDetection(pattern);
        
        return pattern;
      }

      return null;
    } catch (error) {
      nldLogger.renderFailure('ReactHookSideEffectDetector', error as Error, {
        componentName,
        hookName,
        context
      });
      return null;
    }
  }

  /**
   * Check if pattern detection criteria are met
   */
  private isPatternDetected(
    componentName: string,
    hookName: string,
    sideEffectType: ReactHookSideEffectPattern['sideEffectType'],
    renderCount: number,
    ratio: number
  ): boolean {
    // Skip whitelisted components/hooks
    if (this.config.componentWhitelist?.includes(componentName) ||
        this.config.hookWhitelist?.includes(hookName)) {
      return false;
    }

    // Pattern conditions based on TokenCostAnalytics analysis
    const conditions = [
      renderCount > this.config.maxRenderCycles, // Excessive renders
      ratio > this.config.rateLimitThreshold,    // High render-to-action ratio
      sideEffectType === 'rate-limiting',        // Rate limiting detected
      sideEffectType === 'state-mutation'       // State mutations during render
    ];

    // Require at least 2 conditions to be true
    return conditions.filter(Boolean).length >= 2;
  }

  /**
   * Create detailed pattern record
   */
  private createPattern(
    componentName: string,
    hookName: string,
    context: {
      sideEffectType: ReactHookSideEffectPattern['sideEffectType'];
      sourceLocation: { file: string; line: number; column: number };
      metadata?: Record<string, any>;
    },
    renderCount: number,
    actionCount: number,
    ratio: number
  ): ReactHookSideEffectPattern {
    const symptom = this.generateSymptom(context.sideEffectType, ratio);
    const rootCause = this.generateRootCause(context.sideEffectType, hookName);
    const severity = this.calculateSeverity(context.sideEffectType, ratio);

    return {
      id: `react-hook-side-effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      componentName,
      hookName,
      sideEffectType: context.sideEffectType,
      symptom,
      rootCause,
      renderCycleCount: renderCount,
      rateLimitingTriggered: context.sideEffectType === 'rate-limiting',
      userActionCount: actionCount,
      renderToActionRatio: ratio,
      severity,
      sourceLocation: context.sourceLocation,
      stackTrace: this.config.enableStackTracing ? this.captureStackTrace() : undefined,
      metadata: {
        trackingWindowMs: this.config.trackingWindowMs,
        detectionTime: new Date().toISOString(),
        ...context.metadata
      }
    };
  }

  /**
   * Generate human-readable symptom description
   */
  private generateSymptom(sideEffectType: ReactHookSideEffectPattern['sideEffectType'], ratio: number): string {
    switch (sideEffectType) {
      case 'rate-limiting':
        return `Buttons disabled without user interaction due to render-cycle rate limiting (ratio: ${ratio.toFixed(2)})`;
      case 'state-mutation':
        return `Component state mutated during render causing infinite re-render loop`;
      case 'api-call':
        return `API calls triggered during render cycle causing performance degradation`;
      case 'dom-manipulation':
        return `DOM manipulation in render cycle causing layout thrashing`;
      case 'event-emission':
        return `Event emissions during render causing cascade effects`;
      default:
        return `Unknown side effect pattern in render cycle`;
    }
  }

  /**
   * Generate root cause analysis
   */
  private generateRootCause(sideEffectType: ReactHookSideEffectPattern['sideEffectType'], hookName: string): string {
    switch (sideEffectType) {
      case 'rate-limiting':
        return `${hookName} hook contains side effects that trigger rate limiting mechanism during component render`;
      case 'state-mutation':
        return `${hookName} hook mutates state synchronously during render phase instead of using useEffect`;
      case 'api-call':
        return `${hookName} hook makes API calls during render instead of deferring to useEffect or event handlers`;
      case 'dom-manipulation':
        return `${hookName} hook manipulates DOM directly during render phase`;
      case 'event-emission':
        return `${hookName} hook emits events during render causing unintended side effects`;
      default:
        return `${hookName} hook contains unidentified side effects during render phase`;
    }
  }

  /**
   * Calculate severity based on impact
   */
  private calculateSeverity(
    sideEffectType: ReactHookSideEffectPattern['sideEffectType'],
    ratio: number
  ): ReactHookSideEffectPattern['severity'] {
    // High severity for UI blocking patterns
    if (sideEffectType === 'rate-limiting' && ratio > 5.0) return 'critical';
    if (sideEffectType === 'state-mutation' && ratio > 3.0) return 'critical';
    
    // Medium to high based on ratio
    if (ratio > 4.0) return 'high';
    if (ratio > 2.5) return 'medium';
    
    return 'low';
  }

  /**
   * Capture stack trace for debugging
   */
  private captureStackTrace(): string {
    try {
      const stack = new Error().stack;
      return stack?.split('\n').slice(2, 10).join('\n') || 'Stack trace not available';
    } catch {
      return 'Stack trace capture failed';
    }
  }

  /**
   * Log pattern detection for NLD analysis
   */
  private logPatternDetection(pattern: ReactHookSideEffectPattern): void {
    nldLogger.renderFailure(
      'ReactHookSideEffectDetector',
      new Error(`React Hook Side Effect Pattern Detected: ${pattern.symptom}`),
      {
        patternId: pattern.id,
        componentName: pattern.componentName,
        hookName: pattern.hookName,
        severity: pattern.severity,
        renderToActionRatio: pattern.renderToActionRatio,
        sourceLocation: pattern.sourceLocation
      }
    );
  }

  /**
   * Get all detected patterns
   */
  public getPatterns(): ReactHookSideEffectPattern[] {
    return [...this.patterns];
  }

  /**
   * Get patterns by severity
   */
  public getPatternsBySeverity(severity: ReactHookSideEffectPattern['severity']): ReactHookSideEffectPattern[] {
    return this.patterns.filter(pattern => pattern.severity === severity);
  }

  /**
   * Clear old patterns for memory management
   */
  public cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - maxAge);
    const beforeCount = this.patterns.length;
    
    this.patterns = this.patterns.filter(pattern => pattern.timestamp > cutoff);
    
    nldLogger.renderSuccess('ReactHookSideEffectDetector', 'cleanup', {
      beforeCount,
      afterCount: this.patterns.length,
      removed: beforeCount - this.patterns.length
    });
  }

  /**
   * Export patterns for neural training
   */
  public exportTrainingData(): {
    metadata: {
      exportTime: Date;
      patternCount: number;
      config: SideEffectDetectionConfig;
    };
    patterns: ReactHookSideEffectPattern[];
  } {
    return {
      metadata: {
        exportTime: new Date(),
        patternCount: this.patterns.length,
        config: this.config
      },
      patterns: this.getPatterns()
    };
  }
}

/**
 * Global detector instance for singleton pattern
 */
export const reactHookSideEffectDetector = new ReactHookSideEffectDetector({
  maxRenderCycles: 8,
  rateLimitThreshold: 2.5,
  trackingWindowMs: 10000,
  enableStackTracing: true
});

/**
 * Helper function to detect patterns in React components
 */
export function detectReactHookSideEffect(
  componentName: string,
  hookName: string,
  context: {
    isRendering: boolean;
    hasUserAction: boolean;
    sideEffectType: ReactHookSideEffectPattern['sideEffectType'];
    sourceLocation: { file: string; line: number; column: number };
    metadata?: Record<string, any>;
  }
): ReactHookSideEffectPattern | null {
  return reactHookSideEffectDetector.detectSideEffectPattern(componentName, hookName, context);
}