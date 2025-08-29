/**
 * Regression Pattern Detector - Advanced Pattern Recognition System
 *
 * Uses machine learning-like pattern recognition to detect regression patterns
 * in Claude process behavior before they cause system failures.
 */
export interface PatternDetectionResult {
    patternId: string;
    confidence: number;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    detectedAt: Date;
    evidence: string[];
    preventionAction: string;
    recoveryStrategy: string;
}
export interface PatternSignature {
    id: string;
    name: string;
    description: string;
    regexPatterns: RegExp[];
    behavioralPatterns: BehavioralPattern[];
    timeWindowMs: number;
    minConfidence: number;
    contextRequirements: string[];
}
export interface BehavioralPattern {
    eventSequence: string[];
    timingConstraints: TimingConstraint[];
    valueConstraints: ValueConstraint[];
}
export interface TimingConstraint {
    eventA: string;
    eventB: string;
    maxDeltaMs: number;
    minDeltaMs: number;
}
export interface ValueConstraint {
    field: string;
    expectedValue: any;
    operator: 'equals' | 'contains' | 'regex' | 'range';
    tolerance?: number;
}
export declare class RegressionPatternDetector {
    private patterns;
    private eventHistory;
    private detectionCache;
    private performanceMetrics;
    constructor();
    /**
     * Initialize advanced regression patterns with behavioral detection
     */
    private initializeAdvancedPatterns;
    /**
     * Perform comprehensive pattern detection on event
     */
    detectPatterns(event: any): PatternDetectionResult[];
    /**
     * Add event to rolling history
     */
    private addEventToHistory;
    /**
     * Detect single pattern against event and history
     */
    private detectSinglePattern;
    /**
     * Evaluate behavioral pattern against event history
     */
    private evaluateBehavioralPattern;
    /**
     * Check if event sequence exists in history
     */
    private checkEventSequence;
    /**
     * Check timing constraints
     */
    private checkTimingConstraints;
    /**
     * Check value constraints
     */
    private checkValueConstraints;
    /**
     * Get nested value from object using dot notation
     */
    private getNestedValue;
    /**
     * Evaluate single value constraint
     */
    private evaluateValueConstraint;
    /**
     * Determine severity based on pattern and confidence
     */
    private determineSeverity;
    /**
     * Get prevention action for pattern
     */
    private getPreventionAction;
    /**
     * Get recovery strategy for pattern
     */
    private getRecoveryStrategy;
    /**
     * Generate cache key for pattern detection result
     */
    private generateCacheKey;
    /**
     * Update performance metrics
     */
    private updatePerformanceMetrics;
    /**
     * Get performance statistics
     */
    getPerformanceMetrics(): any;
    /**
     * Clear cache and reset metrics
     */
    reset(): void;
}
export declare const regressionPatternDetector: RegressionPatternDetector;
//# sourceMappingURL=regression-pattern-detector.d.ts.map