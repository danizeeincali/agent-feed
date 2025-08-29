/**
 * NLD SSE Anti-Patterns Database
 *
 * Comprehensive database of SSE connection anti-patterns and prevention strategies
 * Focus on patterns where frontend connects to terminal stream (1 connection)
 * but status broadcasts have 0 connections, causing UI stuck on "starting"
 */
export interface SSEAntiPattern {
    id: string;
    name: string;
    category: 'connection_coordination' | 'status_broadcasting' | 'terminal_input' | 'ui_state_management' | 'error_recovery';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    symptoms: string[];
    rootCauses: string[];
    detectionMethod: string;
    preventionStrategies: string[];
    recoveryActions: string[];
    tddPatterns: {
        testScenarios: string[];
        mockingStrategies: string[];
        assertionPatterns: string[];
    };
    realWorldExamples: Array<{
        context: string;
        manifestation: string;
        impact: string;
        resolution: string;
    }>;
    metrics: {
        occurrenceRate: number;
        avgResolutionTime: number;
        userImpactScore: number;
        preventionEffectiveness: number;
    };
}
export declare class SSEAntiPatternsDatabase {
    private antiPatterns;
    /**
     * Get all anti-patterns
     */
    getAllPatterns(): SSEAntiPattern[];
    /**
     * Get patterns by category
     */
    getPatternsByCategory(category: SSEAntiPattern['category']): SSEAntiPattern[];
    /**
     * Get patterns by severity
     */
    getPatternsBySeverity(severity: SSEAntiPattern['severity']): SSEAntiPattern[];
    /**
     * Find patterns matching specific symptoms
     */
    findPatternsBySymptoms(symptoms: string[]): SSEAntiPattern[];
    /**
     * Get prevention strategies for specific failure scenario
     */
    getPreventionStrategies(scenario: string): string[];
    /**
     * Get recovery actions for specific failure scenario
     */
    getRecoveryActions(scenario: string): string[];
    /**
     * Get TDD patterns for specific anti-pattern
     */
    getTDDPatterns(antiPatternId: string): SSEAntiPattern['tddPatterns'] | null;
    /**
     * Add new anti-pattern to database
     */
    addAntiPattern(pattern: SSEAntiPattern): void;
    /**
     * Update existing anti-pattern
     */
    updateAntiPattern(id: string, updates: Partial<SSEAntiPattern>): boolean;
    /**
     * Get analytics on anti-patterns
     */
    getAnalytics(): {
        totalPatterns: number;
        categoryCounts: Record<string, number>;
        severityCounts: Record<string, number>;
        avgOccurrenceRate: number;
        avgResolutionTime: number;
        avgUserImpact: number;
        avgPreventionEffectiveness: number;
    };
    /**
     * Generate comprehensive report
     */
    generateReport(): {
        summary: any;
        criticalPatterns: SSEAntiPattern[];
        preventionRecommendations: string[];
        tddImplementationGuide: any;
    };
    private getTopPreventionStrategies;
    private generateTDDImplementationGuide;
}
//# sourceMappingURL=sse-anti-patterns-database.d.ts.map