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
export declare class ReactHookSideEffectDetector {
    private patterns;
    private renderCounts;
    private userActionCounts;
    private config;
    private trackingWindows;
    constructor(config?: Partial<SideEffectDetectionConfig>);
    /**
     * Detect React Hook side effects during render cycle
     * Based on observed TokenCostAnalytics pattern with disabled state
     */
    detectSideEffectPattern(componentName: string, hookName: string, context: {
        isRendering: boolean;
        hasUserAction: boolean;
        sideEffectType: ReactHookSideEffectPattern['sideEffectType'];
        sourceLocation: {
            file: string;
            line: number;
            column: number;
        };
        metadata?: Record<string, any>;
    }): ReactHookSideEffectPattern | null;
    /**
     * Check if pattern detection criteria are met
     */
    private isPatternDetected;
    /**
     * Create detailed pattern record
     */
    private createPattern;
    /**
     * Generate human-readable symptom description
     */
    private generateSymptom;
    /**
     * Generate root cause analysis
     */
    private generateRootCause;
    /**
     * Calculate severity based on impact
     */
    private calculateSeverity;
    /**
     * Capture stack trace for debugging
     */
    private captureStackTrace;
    /**
     * Log pattern detection for NLD analysis
     */
    private logPatternDetection;
    /**
     * Get all detected patterns
     */
    getPatterns(): ReactHookSideEffectPattern[];
    /**
     * Get patterns by severity
     */
    getPatternsBySeverity(severity: ReactHookSideEffectPattern['severity']): ReactHookSideEffectPattern[];
    /**
     * Clear old patterns for memory management
     */
    cleanup(maxAge?: number): void;
    /**
     * Export patterns for neural training
     */
    exportTrainingData(): {
        metadata: {
            exportTime: Date;
            patternCount: number;
            config: SideEffectDetectionConfig;
        };
        patterns: ReactHookSideEffectPattern[];
    };
}
/**
 * Global detector instance for singleton pattern
 */
export declare const reactHookSideEffectDetector: ReactHookSideEffectDetector;
/**
 * Helper function to detect patterns in React components
 */
export declare function detectReactHookSideEffect(componentName: string, hookName: string, context: {
    isRendering: boolean;
    hasUserAction: boolean;
    sideEffectType: ReactHookSideEffectPattern['sideEffectType'];
    sourceLocation: {
        file: string;
        line: number;
        column: number;
    };
    metadata?: Record<string, any>;
}): ReactHookSideEffectPattern | null;
//# sourceMappingURL=react-hook-side-effect-detector.d.ts.map