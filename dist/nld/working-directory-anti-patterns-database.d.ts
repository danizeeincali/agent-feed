/**
 * Working Directory Anti-Patterns Database
 * Comprehensive database of working directory configuration failures
 * and TDD prevention strategies
 */
export interface AntiPatternRecord {
    id: string;
    name: string;
    category: string;
    description: string;
    symptoms: string[];
    antiPatternCode: string;
    correctPatternCode: string;
    preventionStrategy: string;
    tddStrategy: string;
    realWorldExample: {
        context: string;
        userExpectation: string;
        actualBehavior: string;
        impact: string;
    };
    detectionRules: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    frequency: number;
    lastDetected: string;
}
export declare class WorkingDirectoryAntiPatternsDatabase {
    private antiPatterns;
    private dbPath;
    constructor(dbPath?: string);
    /**
     * Initialize comprehensive anti-patterns database
     */
    private initializeAntiPatterns;
    /**
     * Record detection of an anti-pattern
     */
    recordDetection(antiPatternId: string, context?: any): Promise<void>;
    /**
     * Get anti-patterns by category
     */
    getPatternsByCategory(category: string): AntiPatternRecord[];
    /**
     * Get anti-patterns by severity
     */
    getPatternsBySeverity(severity: string): AntiPatternRecord[];
    /**
     * Get most frequently detected patterns
     */
    getMostFrequentPatterns(limit?: number): AntiPatternRecord[];
    /**
     * Generate TDD prevention strategies for all patterns
     */
    getTDDPreventionStrategies(): Array<{
        patternName: string;
        testStrategy: string;
        preventionCode: string;
    }>;
    /**
     * Export anti-patterns for external analysis
     */
    exportForAnalysis(): Promise<{
        patterns: AntiPatternRecord[];
        summary: {
            totalPatterns: number;
            categoryCounts: Record<string, number>;
            severityCounts: Record<string, number>;
            topDetected: Array<{
                name: string;
                frequency: number;
            }>;
        };
        exportPath: string;
    }>;
    /**
     * Load existing data from database
     */
    private loadExistingData;
    /**
     * Save data to database
     */
    private saveData;
    /**
     * Get all anti-patterns
     */
    getAllPatterns(): AntiPatternRecord[];
}
//# sourceMappingURL=working-directory-anti-patterns-database.d.ts.map