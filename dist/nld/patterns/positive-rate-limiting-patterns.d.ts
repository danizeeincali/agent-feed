/**
 * NLD Positive Rate Limiting Pattern Recognition System
 * Creates neural training data for successful rate limiting implementations
 * that prevent React hook side-effect bugs
 */
export interface PositiveRateLimitingPattern {
    id: string;
    timestamp: Date;
    patternName: string;
    category: 'graceful-degradation' | 'circuit-breaker' | 'debouncing' | 'throttling' | 'cleanup' | 'mock-fallback';
    implementation: {
        technique: string;
        codePattern: string;
        preventedIssues: string[];
        performanceGain: number;
        reliabilityScore: number;
    };
    beforeState: {
        problemDescription: string;
        symptoms: string[];
        errorRate: number;
        performanceImpact: number;
    };
    afterState: {
        solutionDescription: string;
        improvements: string[];
        errorReduction: number;
        performanceImprovement: number;
    };
    neuralWeight: number;
    applicableScenarios: string[];
    metadata: Record<string, any>;
}
export interface PatternRecognitionConfig {
    minReliabilityScore: number;
    minPerformanceGain: number;
    minNeuralWeight: number;
    enableAutoClassification: boolean;
    trackingEnabled: boolean;
}
export declare class PositiveRateLimitingPatternRecognition {
    private patterns;
    private config;
    constructor(config?: Partial<PatternRecognitionConfig>);
    /**
     * Recognize and catalog positive rate limiting patterns
     */
    recognizePattern(patternData: {
        name: string;
        category: PositiveRateLimitingPattern['category'];
        codeExample: string;
        problemSolved: string;
        implementation: {
            technique: string;
            preventedIssues: string[];
            performanceGain: number;
        };
        validation: {
            errorReduction: number;
            performanceImprovement: number;
        };
    }): PositiveRateLimitingPattern;
    /**
     * Analyze the current token cost tracking implementation for positive patterns
     */
    analyzeTokenCostTrackingPatterns(): Promise<PositiveRateLimitingPattern[]>;
    /**
     * Calculate reliability score based on pattern effectiveness
     */
    private calculateReliabilityScore;
    /**
     * Calculate neural weight for training importance
     */
    private calculateNeuralWeight;
    /**
     * Extract before state from problem description
     */
    private extractBeforeState;
    /**
     * Extract after state from validation data
     */
    private extractAfterState;
    /**
     * Extract symptoms from problem description
     */
    private extractSymptoms;
    /**
     * Extract applicable scenarios based on category and technique
     */
    private extractApplicableScenarios;
    /**
     * Check if pattern meets quality thresholds
     */
    private meetsQualityThresholds;
    /**
     * Log successful pattern recognition
     */
    private logPatternRecognition;
    /**
     * Get all recognized patterns
     */
    getPatterns(): PositiveRateLimitingPattern[];
    /**
     * Get patterns by category
     */
    getPatternsByCategory(category: PositiveRateLimitingPattern['category']): PositiveRateLimitingPattern[];
    /**
     * Export patterns for neural training
     */
    exportForNeuralTraining(): Promise<{
        metadata: {
            exportTime: Date;
            patternCount: number;
            categories: string[];
            averageReliability: number;
            averageNeuralWeight: number;
        };
        patterns: PositiveRateLimitingPattern[];
    }>;
    /**
     * Save patterns to file for persistence
     */
    savePatterns(workingDirectory: string): Promise<void>;
}
/**
 * Global pattern recognition instance
 */
export declare const positiveRateLimitingPatternRecognition: PositiveRateLimitingPatternRecognition;
//# sourceMappingURL=positive-rate-limiting-patterns.d.ts.map