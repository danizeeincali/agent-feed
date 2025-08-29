/**
 * API Versioning Anti-Patterns Database
 *
 * Comprehensive database of API versioning anti-patterns with emphasis on
 * endpoint mismatch detection and prevention strategies for future development.
 *
 * This database captures real-world patterns where API versioning inconsistencies
 * lead to partial functionality failures, particularly in SSE/real-time systems.
 */
export interface APIVersioningAntiPattern {
    id: string;
    name: string;
    category: 'path_mismatch' | 'protocol_mismatch' | 'version_gap' | 'configuration_drift';
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    symptoms: string[];
    rootCause: string;
    detectionCriteria: DetectionCriterion[];
    examples: AntiPatternExample[];
    impact: {
        technicalImpact: string[];
        businessImpact: string[];
        userExperience: string[];
        maintenanceOverhead: string;
    };
    prevention: PreventionStrategy[];
    remediation: RemediationStep[];
    metrics: {
        detectionAccuracy: number;
        falsePositiveRate: number;
        recurrenceRate: number;
        averageResolutionTime: string;
    };
    testingStrategies: TestingStrategy[];
    relatedPatterns: string[];
    occurrences: PatternOccurrence[];
}
export interface DetectionCriterion {
    type: 'static_analysis' | 'runtime_detection' | 'configuration_check' | 'integration_test';
    description: string;
    implementation: string;
    confidence: number;
    automationLevel: 'manual' | 'semi_automated' | 'fully_automated';
}
export interface AntiPatternExample {
    title: string;
    context: string;
    codeExample: {
        language: string;
        before: string;
        after: string;
    };
    explanation: string;
    realWorldImpact: string;
}
export interface PreventionStrategy {
    strategy: string;
    description: string;
    implementation: string;
    effectiveness: number;
    cost: 'low' | 'medium' | 'high';
    prerequisites: string[];
}
export interface RemediationStep {
    step: number;
    action: string;
    description: string;
    estimatedTime: string;
    risk: 'low' | 'medium' | 'high';
    validation: string;
}
export interface TestingStrategy {
    type: 'unit' | 'integration' | 'end_to_end' | 'contract' | 'performance';
    description: string;
    testPattern: string;
    coverage: string[];
    automationPotential: number;
}
export interface PatternOccurrence {
    timestamp: string;
    project: string;
    context: string;
    detectionMethod: string;
    resolution: string;
    timeToResolve: number;
    preventionMissed?: string;
}
/**
 * Main anti-patterns database manager
 */
export declare class APIVersioningAntiPatternsDatabase {
    private patterns;
    private databasePath;
    constructor(databasePath?: string);
    /**
     * Initialize database with known anti-patterns
     */
    private initializeDatabase;
    /**
     * Add core anti-patterns based on SSE endpoint mismatch analysis
     */
    private addCoreAntiPatterns;
    /**
     * Add new anti-pattern to database
     */
    addPattern(pattern: APIVersioningAntiPattern): void;
    /**
     * Get pattern by ID
     */
    getPattern(id: string): APIVersioningAntiPattern | undefined;
    /**
     * Get patterns by category
     */
    getPatternsByCategory(category: string): APIVersioningAntiPattern[];
    /**
     * Get patterns by severity
     */
    getPatternsBySeverity(severity: string): APIVersioningAntiPattern[];
    /**
     * Search patterns by symptoms
     */
    searchBySymptoms(searchTerm: string): APIVersioningAntiPattern[];
    /**
     * Record pattern occurrence
     */
    recordOccurrence(patternId: string, occurrence: Omit<PatternOccurrence, 'timestamp'>): void;
    /**
     * Get analytics for all patterns
     */
    getAnalytics(): any;
    /**
     * Generate detection rules for CI/CD integration
     */
    generateDetectionRules(): any;
    /**
     * Generate prevention playbook
     */
    generatePreventionPlaybook(): any;
    /**
     * Load existing patterns from storage
     */
    private loadExistingPatterns;
    /**
     * Save database to storage
     */
    private saveDatabase;
}
export declare const apiVersioningAntiPatternsDatabase: APIVersioningAntiPatternsDatabase;
//# sourceMappingURL=api-versioning-anti-patterns-database.d.ts.map