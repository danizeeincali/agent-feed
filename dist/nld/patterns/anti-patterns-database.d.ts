/**
 * Anti-Patterns Database for NLD System
 *
 * Comprehensive database of failure patterns that cause Claude to claim success
 * while users experience actual failure. Each pattern includes prevention strategies.
 */
export interface AntiPattern {
    id: string;
    name: string;
    description: string;
    category: 'TIMING' | 'STATE_MANAGEMENT' | 'TYPE_SAFETY' | 'API_INTEGRATION' | 'VALIDATION';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    frequency: 'RARE' | 'OCCASIONAL' | 'COMMON' | 'VERY_COMMON';
    technicalDetails: {
        location: string;
        rootCause: string;
        triggerConditions: string[];
        affectedComponents: string[];
    };
    userImpact: {
        symptom: string;
        userExperience: string;
        businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    };
    detection: {
        automaticTriggers: string[];
        manualIndicators: string[];
        logPatterns: string[];
    };
    prevention: {
        tddPatterns: string[];
        codeReviews: string[];
        typeChecks: string[];
        runtime_validation: string[];
    };
    occurrenceCount: number;
    lastSeen: string;
    examples: string[];
}
export declare class AntiPatternsDatabase {
    private patterns;
    constructor();
    /**
     * Initialize database with known anti-patterns
     */
    private initializeKnownPatterns;
    /**
     * Add a new pattern to the database
     */
    addPattern(pattern: AntiPattern): void;
    /**
     * Record an occurrence of a pattern
     */
    recordOccurrence(patternId: string, details?: any): void;
    /**
     * Get pattern by ID
     */
    getPattern(id: string): AntiPattern | undefined;
    /**
     * Get all patterns by category
     */
    getPatternsByCategory(category: AntiPattern['category']): AntiPattern[];
    /**
     * Get patterns by severity
     */
    getPatternsBySeverity(severity: AntiPattern['severity']): AntiPattern[];
    /**
     * Get most common patterns
     */
    getMostCommonPatterns(limit?: number): AntiPattern[];
    /**
     * Search patterns by description or technical details
     */
    searchPatterns(query: string): AntiPattern[];
    /**
     * Generate prevention report for a specific failure
     */
    generatePreventionReport(failureDescription: string): any;
    /**
     * Generate recommended actions based on patterns
     */
    private generateRecommendedActions;
    /**
     * Identify TDD gaps from patterns
     */
    private identifyTDDGaps;
    /**
     * Export database for analysis
     */
    exportDatabase(): any;
}
export declare const antiPatternsDatabase: AntiPatternsDatabase;
//# sourceMappingURL=anti-patterns-database.d.ts.map