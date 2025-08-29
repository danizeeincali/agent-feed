/**
 * NLD Pattern: Mixed API Versioning Anti-Pattern Detector
 *
 * PATTERN DETECTION:
 * - Symptom: Some API calls succeed while others fail due to inconsistent versioning
 * - Root Cause: Partial API versioning migration leaving some endpoints unversioned
 * - Detection: Frontend uses both /api/ and /api/v1/ paths for related operations
 * - Classification: Integration consistency bug affecting user workflow
 *
 * REAL WORLD FAILURE MODES:
 * 1. Frontend fetches instances from /api/v1/claude/instances but sends input to /api/claude/instances
 * 2. Mixed redirect patterns cause 404s on critical operations
 * 3. User experiences partial functionality - some features work, others silently fail
 * 4. Integration tests pass individually but fail when combined
 */
export interface MixedVersioningPattern {
    id: string;
    timestamp: Date;
    detectionTrigger: string;
    endpointPairs: Array<{
        versionedEndpoint: string;
        unversionedEndpoint: string;
        usageContext: string;
        failureMode: 'redirect_404' | 'path_mismatch' | 'undefined_param' | 'cors_failure';
    }>;
    impactAssessment: {
        userWorkflowBroken: boolean;
        partialFunctionalityLoss: boolean;
        silentFailures: boolean;
        testSuitePassed: boolean;
    };
    rootCauseAnalysis: {
        migrationIncomplete: boolean;
        backendRedirectInconsistent: boolean;
        frontendEndpointHardcoded: boolean;
        environmentSpecificBehavior: boolean;
    };
    preventionStrategy: {
        unifiedEndpointMapping: string[];
        backendVersionRedirectRules: string[];
        frontendEndpointConfigFile: string;
        integrationTestScenarios: string[];
    };
}
export declare class MixedAPIVersioningDetector {
    private patterns;
    private readonly patternStorePath;
    private readonly neuralTrainingPath;
    constructor();
    /**
     * Detect mixed API versioning patterns from codebase analysis
     */
    detectMixedVersioningPatterns(codebaseFiles: string[]): Promise<MixedVersioningPattern[]>;
    /**
     * Extract API endpoints from file content
     */
    private extractAPIEndpoints;
    /**
     * Normalize endpoint path for comparison
     */
    private normalizeEndpointPath;
    /**
     * Create comprehensive mixed versioning pattern analysis
     */
    private createMixedVersioningPattern;
    /**
     * Determine specific failure mode for endpoint pair
     */
    private determineFailureMode;
    /**
     * Assess if mixed versioning breaks user workflows
     */
    private assessWorkflowImpact;
    /**
     * Assess if failures are silent (no user feedback)
     */
    private assessSilentFailures;
    /**
     * Check for redirect inconsistencies
     */
    private hasRedirectInconsistencies;
    /**
     * Check for hardcoded endpoints in source
     */
    private hasHardcodedEndpoints;
    /**
     * Generate unified endpoint mapping strategy
     */
    private generateUnifiedMapping;
    /**
     * Generate backend redirect rules
     */
    private generateRedirectRules;
    /**
     * Generate frontend endpoint config
     */
    private generateEndpointConfig;
    /**
     * Generate comprehensive integration test scenarios
     */
    private generateIntegrationTests;
    /**
     * Export neural training dataset for preventing similar failures
     */
    exportNeuralTrainingDataset(): Promise<void>;
    /**
     * Persist detected patterns to storage
     */
    private persistPatterns;
    /**
     * Load existing patterns from storage
     */
    loadPatterns(): Promise<void>;
    /**
     * Get comprehensive prevention strategies
     */
    getPreventionStrategies(): {
        immediate: string[];
        longTerm: string[];
        tddApproaches: string[];
    };
    /**
     * Generate summary report of detected patterns
     */
    generateSummaryReport(): {
        totalPatterns: number;
        criticalImpactCount: number;
        mostCommonFailureMode: string;
        preventionPriority: string[];
    };
}
export default MixedAPIVersioningDetector;
//# sourceMappingURL=mixed-api-versioning-anti-pattern-detector.d.ts.map