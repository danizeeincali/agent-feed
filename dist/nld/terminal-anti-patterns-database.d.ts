/**
 * Terminal Anti-Patterns Database
 *
 * Comprehensive database of anti-patterns that occur in terminal pipe failures:
 * - Mock data responses instead of real Claude process output
 * - Hardcoded strings in frontend terminal displays
 * - Broken stdout/stderr event handlers
 * - SSE broadcasting failures
 * - Working directory mismatches
 */
export interface AntiPattern {
    id: string;
    name: string;
    category: 'mock_data' | 'hardcoded_response' | 'broken_pipe' | 'sse_failure' | 'directory_mismatch';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    symptoms: string[];
    causes: string[];
    detectionRules: {
        patterns: string[];
        contextRules: string[];
        evidenceThreshold: number;
    };
    tddfactor: number;
    preventionStrategies: string[];
    realWorldExamples: Array<{
        scenario: string;
        output: string;
        expectedOutput: string;
        impact: string;
    }>;
    neuralFeatures: Record<string, any>;
}
export declare class TerminalAntiPatternsDatabase {
    private options;
    private antiPatterns;
    private patternFrequency;
    constructor(options?: {
        logDirectory: string;
        autoUpdate: boolean;
    });
    /**
     * Initialize comprehensive anti-pattern database
     */
    private initializeAntiPatterns;
    /**
     * Add an anti-pattern to the database
     */
    private addAntiPattern;
    /**
     * Detect anti-patterns in given output
     */
    detectAntiPatterns(output: string, context?: any): Array<{
        pattern: AntiPattern;
        confidence: number;
        matchedRules: string[];
    }>;
    /**
     * Evaluate a specific pattern against output and context
     */
    private evaluatePattern;
    /**
     * Evaluate context rules
     */
    private evaluateContextRule;
    /**
     * Calculate pattern-specific confidence boosts
     */
    private calculatePatternSpecificConfidence;
    /**
     * Check if output contains process-specific information
     */
    private containsProcessSpecificOutput;
    /**
     * Get anti-pattern by ID
     */
    getAntiPattern(id: string): AntiPattern | undefined;
    /**
     * Get all anti-patterns by category
     */
    getAntiPatternsByCategory(category: AntiPattern['category']): AntiPattern[];
    /**
     * Get anti-pattern statistics
     */
    getStatistics(): {
        totalPatterns: number;
        byCategory: Record<string, number>;
        bySeverity: Record<string, number>;
        mostFrequent: Array<{
            id: string;
            frequency: number;
            pattern: AntiPattern;
        }>;
        averageTDDFactor: number;
    };
    /**
     * Export patterns for neural training
     */
    exportForNeuralTraining(): string;
    /**
     * Save database to file
     */
    saveDatabase(): void;
}
//# sourceMappingURL=terminal-anti-patterns-database.d.ts.map