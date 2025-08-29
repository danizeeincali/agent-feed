/**
 * SSE Event Flow Anti-Patterns Database
 * Comprehensive failure pattern database for SSE connection management
 */
export interface SSEAntiPattern {
    id: string;
    name: string;
    description: string;
    symptoms: string[];
    rootCause: string;
    impactLevel: 'low' | 'medium' | 'high' | 'critical';
    frequency: number;
    detectionSignatures: string[];
    preventionStrategies: string[];
    tddPreventionRate: number;
    realWorldExamples: {
        scenario: string;
        outcome: string;
        solution: string;
    }[];
}
export declare class SSEAntiPatternsDatabase {
    private patterns;
    constructor();
    private initializeKnownPatterns;
    /**
     * Retrieves anti-pattern by ID
     */
    getPattern(patternId: string): SSEAntiPattern | undefined;
    /**
     * Gets all patterns matching specific criteria
     */
    getPatternsByImpact(impactLevel: 'low' | 'medium' | 'high' | 'critical'): SSEAntiPattern[];
    /**
     * Finds patterns based on detection signatures
     */
    detectPatternsFromLogs(logs: string[]): {
        detectedPatterns: string[];
        confidenceScores: Map<string, number>;
        recommendations: string[];
    };
    /**
     * Generates TDD test strategies for detected patterns
     */
    generateTDDStrategies(patternIds: string[]): {
        testCases: string[];
        mockingStrategies: string[];
        integrationTests: string[];
    };
    /**
     * Updates pattern frequency based on detection
     */
    updatePatternFrequency(patternId: string, detected: boolean): void;
    /**
     * Exports database for neural network training
     */
    exportForTraining(): {
        antiPatterns: SSEAntiPattern[];
        trainingData: any[];
        metadata: {
            totalPatterns: number;
            criticalPatterns: number;
            avgTDDPreventionRate: number;
            mostCommonPatterns: string[];
        };
    };
}
//# sourceMappingURL=sse-event-flow-anti-patterns-database.d.ts.map