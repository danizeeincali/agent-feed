/**
 * TDD Prevention Strategies for API Endpoint Versioning Consistency
 *
 * Provides comprehensive Test-Driven Development strategies to prevent
 * API endpoint versioning inconsistencies and SSE/REST path mismatches.
 *
 * Integrates with the NLD system to provide proactive prevention through
 * testing patterns, validation frameworks, and automated quality gates.
 */
export interface TDDPreventionStrategy {
    id: string;
    name: string;
    category: 'unit_testing' | 'integration_testing' | 'contract_testing' | 'end_to_end_testing' | 'static_analysis';
    priority: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    problem: string;
    solution: string;
    testPatterns: TestPattern[];
    validationRules: ValidationRule[];
    automationLevel: 'manual' | 'semi_automated' | 'fully_automated';
    preventionEffectiveness: number;
    implementationCost: 'low' | 'medium' | 'high';
    maintenanceOverhead: 'low' | 'medium' | 'high';
    cicdIntegration: CICDIntegration;
    toolingRequirements: string[];
    realWorldExamples: RealWorldExample[];
    commonPitfalls: string[];
    successMetrics: string[];
}
export interface TestPattern {
    name: string;
    type: 'unit' | 'integration' | 'contract' | 'e2e';
    description: string;
    testCode: {
        language: 'typescript' | 'javascript' | 'bash';
        framework: string;
        code: string;
        setup?: string;
        teardown?: string;
    };
    coverageAreas: string[];
    failureScenarios: string[];
    executionFrequency: 'on_commit' | 'on_pr' | 'daily' | 'weekly';
    estimatedRuntime: string;
}
export interface ValidationRule {
    name: string;
    type: 'static_check' | 'runtime_validation' | 'configuration_check';
    description: string;
    implementation: {
        tool: string;
        command: string;
        configuration?: string;
    };
    triggers: string[];
    severity: 'error' | 'warning' | 'info';
    autoFix: boolean;
}
export interface CICDIntegration {
    platform: 'github_actions' | 'gitlab_ci' | 'jenkins' | 'azure_devops' | 'generic';
    configurationFile: string;
    stages: string[];
    failureBehavior: 'block_deployment' | 'warn_only' | 'advisory';
}
export interface RealWorldExample {
    title: string;
    context: string;
    problemDescription: string;
    tddSolution: string;
    outcome: string;
    lessonsLearned: string[];
}
/**
 * TDD Prevention Strategies Manager
 */
export declare class TDDEndpointVersioningPreventionStrategies {
    private strategies;
    private strategiesPath;
    constructor(strategiesPath?: string);
    /**
     * Initialize core TDD prevention strategies
     */
    private initializeStrategies;
    /**
     * Add new TDD strategy
     */
    addStrategy(strategy: TDDPreventionStrategy): void;
    /**
     * Get strategy by ID
     */
    getStrategy(id: string): TDDPreventionStrategy | undefined;
    /**
     * Get strategies by category
     */
    getStrategiesByCategory(category: string): TDDPreventionStrategy[];
    /**
     * Get strategies by priority
     */
    getStrategiesByPriority(priority: string): TDDPreventionStrategy[];
    /**
     * Generate comprehensive TDD implementation guide
     */
    generateImplementationGuide(): any;
    /**
     * Generate test suite from all strategies
     */
    generateTestSuite(): string;
    /**
     * Generate CI/CD configuration
     */
    generateCICDConfiguration(platform?: string): string;
    /**
     * Generate package.json test scripts
     */
    generateTestScripts(): any;
    /**
     * Helper methods
     */
    private estimateImplementationTime;
    private generateToolingSetup;
    /**
     * Save strategies to file
     */
    private saveStrategies;
    /**
     * Ensure strategies directory exists
     */
    private ensureStrategiesDirectory;
}
export declare const tddEndpointVersioningPreventionStrategies: TDDEndpointVersioningPreventionStrategies;
//# sourceMappingURL=tdd-endpoint-versioning-prevention-strategies.d.ts.map