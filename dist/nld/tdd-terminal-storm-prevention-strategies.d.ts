/**
 * TDD Terminal Storm Prevention Strategies
 * Test-driven development patterns to prevent terminal escape sequence storms
 * Part of NLD (Neuro-Learning Development) system
 */
import { EventEmitter } from 'events';
interface TDDTestCase {
    testId: string;
    testName: string;
    testType: 'unit' | 'integration' | 'e2e' | 'stress';
    category: 'pty_config' | 'process_spawn' | 'sse_connection' | 'button_debouncing' | 'terminal_io';
    description: string;
    scenario: string;
    expectedBehavior: string;
    testImplementation: string;
    assertionStrategy: string;
    mockingStrategy: string;
    preventedFailureType: string[];
    relatedPatterns: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
}
interface PreventionStrategy {
    strategyId: string;
    strategyName: string;
    targetPattern: string;
    preventionApproach: 'debouncing' | 'validation' | 'lifecycle_management' | 'state_tracking' | 'resource_limiting';
    tddTestCases: TDDTestCase[];
    implementationGuidelines: string[];
    validationCriteria: string[];
    monitoringMetrics: string[];
    successThreshold: number;
}
export declare class TDDTerminalStormPreventionStrategies extends EventEmitter {
    private strategies;
    private testCaseLibrary;
    private storageFile;
    constructor(storageDir: string);
    /**
     * Initialize built-in prevention strategies
     */
    private initializeStrategies;
    /**
     * Add a new prevention strategy
     */
    addStrategy(strategy: PreventionStrategy): void;
    /**
     * Get strategies for specific pattern
     */
    getStrategiesForPattern(pattern: string): PreventionStrategy[];
    /**
     * Generate TDD test suite for pattern
     */
    generateTDDTestSuite(pattern: string): string;
    /**
     * Generate generic test suite for unknown patterns
     */
    private generateGenericTestSuite;
    /**
     * Validate strategy effectiveness
     */
    validateStrategyEffectiveness(strategyId: string, metrics: Record<string, number>): {
        isEffective: boolean;
        score: number;
        recommendations: string[];
    };
    /**
     * Get test cases by category
     */
    getTestCasesByCategory(category: TDDTestCase['category']): TDDTestCase[];
    /**
     * Get test cases by priority
     */
    getTestCasesByPriority(priority: TDDTestCase['priority']): TDDTestCase[];
    /**
     * Generate comprehensive prevention report
     */
    generatePreventionReport(): string;
    /**
     * Get test case category breakdown
     */
    private getTestCaseCategoryBreakdown;
    /**
     * Load existing strategies from storage
     */
    private loadExistingStrategies;
    /**
     * Persist strategies to storage
     */
    private persistStrategies;
    /**
     * Get all strategies
     */
    getAllStrategies(): PreventionStrategy[];
    /**
     * Get all test cases
     */
    getAllTestCases(): TDDTestCase[];
}
export default TDDTerminalStormPreventionStrategies;
//# sourceMappingURL=tdd-terminal-storm-prevention-strategies.d.ts.map