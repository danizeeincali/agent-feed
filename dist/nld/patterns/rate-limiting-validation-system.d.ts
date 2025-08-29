/**
 * NLD Rate Limiting Validation System
 * Validates that React Hook Side Effect patterns are no longer triggered
 * after implementing proper rate limiting fixes
 */
export interface RateLimitingPattern {
    id: string;
    timestamp: Date;
    patternType: 'useEffect-infinite-loop' | 'websocket-reconnect-storm' | 'state-update-cascade' | 'api-call-burst';
    severity: 'low' | 'medium' | 'high' | 'critical';
    component: string;
    trigger: string;
    fixImplemented: boolean;
    validationStatus: 'pass' | 'fail' | 'pending';
    rateLimitingMechanism: string[];
    preventionScore: number;
    metadata: Record<string, any>;
}
export interface RateLimitingValidation {
    validationId: string;
    timestamp: Date;
    originalBugPattern: string;
    fixStrategy: string[];
    validationResults: {
        sideEffectPrevented: boolean;
        performanceImprovement: number;
        memoryLeaksPrevented: boolean;
        errorReduction: number;
    };
    preventionPatterns: string[];
    neuralTrainingData: any[];
}
export declare class RateLimitingValidationSystem {
    private workingDirectory;
    private validationHistory;
    private detectedPatterns;
    constructor(workingDirectory?: string);
    /**
     * Validate that the rate limiting fix prevents React Hook Side Effect patterns
     */
    validateRateLimitingFix(): Promise<RateLimitingValidation>;
    /**
     * Analyze the current implementation for rate limiting patterns
     */
    private analyzeCurrentImplementation;
    /**
     * Detect remaining side effect patterns in the codebase
     */
    private detectSideEffectPatterns;
    /**
     * Validate rate limiting mechanisms are properly implemented
     */
    private validateRateLimitingMechanisms;
    /**
     * Calculate prevention effectiveness score
     */
    private calculatePreventionScore;
    /**
     * Calculate performance improvement metrics
     */
    private calculatePerformanceImprovement;
    /**
     * Calculate error reduction metrics
     */
    private calculateErrorReduction;
    /**
     * Generate neural training data for claude-flow system
     */
    private generateNeuralTrainingData;
    /**
     * Persist validation results for future analysis
     */
    private persistValidation;
    /**
     * Get validation history
     */
    getValidationHistory(): RateLimitingValidation[];
    /**
     * Get detected patterns
     */
    getDetectedPatterns(): RateLimitingPattern[];
}
//# sourceMappingURL=rate-limiting-validation-system.d.ts.map