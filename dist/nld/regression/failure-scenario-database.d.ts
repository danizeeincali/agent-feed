/**
 * Comprehensive Failure Scenario Database
 *
 * Maintains extensive database of Claude process failure scenarios
 * for training neural networks and improving regression detection.
 */
export interface FailureScenario {
    id: string;
    name: string;
    description: string;
    category: FailureCategory;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    triggerConditions: TriggerCondition[];
    symptoms: Symptom[];
    rootCause: string;
    affectedComponents: string[];
    preventionStrategy: string;
    recoveryProcedure: string;
    detectionSignatures: DetectionSignature[];
    realWorldOccurrences: OccurrenceRecord[];
    neuralTrainingFeatures: number[];
    validationTests: ValidationTest[];
}
export interface TriggerCondition {
    condition: string;
    parameters: Record<string, any>;
    likelihood: number;
    timeframe: string;
}
export interface Symptom {
    symptom: string;
    visibility: 'immediate' | 'delayed' | 'silent';
    severity: number;
    detectionMethod: string;
}
export interface DetectionSignature {
    signatureType: 'regex' | 'behavioral' | 'metric' | 'temporal';
    pattern: string | RegExp;
    confidence: number;
    falsePositiveRate: number;
}
export interface OccurrenceRecord {
    timestamp: Date;
    environment: string;
    triggeredBy: string;
    duration: number;
    resolved: boolean;
    resolutionMethod: string;
    impact: string;
}
export interface ValidationTest {
    testId: string;
    description: string;
    setup: string;
    execution: string;
    expectedOutcome: string;
    actualOutcome?: string;
    passed?: boolean;
}
export declare enum FailureCategory {
    PRINT_FLAG_REGRESSION = "PRINT_FLAG_REGRESSION",
    MOCK_CLAUDE_FALLBACK = "MOCK_CLAUDE_FALLBACK",
    AUTHENTICATION_FAILURE = "AUTHENTICATION_FAILURE",
    DIRECTORY_RESOLUTION = "DIRECTORY_RESOLUTION",
    PROCESS_SPAWNING = "PROCESS_SPAWNING",
    SSE_CONNECTION = "SSE_CONNECTION",
    PTY_CONFIGURATION = "PTY_CONFIGURATION",
    COMMAND_INJECTION = "COMMAND_INJECTION",
    RESOURCE_EXHAUSTION = "RESOURCE_EXHAUSTION",
    PERMISSION_ERRORS = "PERMISSION_ERRORS"
}
export declare class FailureScenarioDatabase {
    private scenarios;
    private categoryIndex;
    private severityIndex;
    private searchIndex;
    constructor();
    /**
     * Initialize comprehensive failure scenarios
     */
    private initializeFailureScenarios;
    /**
     * Build search and category indexes
     */
    private buildIndexes;
    /**
     * Get scenario by ID
     */
    getScenario(id: string): FailureScenario | null;
    /**
     * Get scenarios by category
     */
    getScenariosByCategory(category: FailureCategory): FailureScenario[];
    /**
     * Get scenarios by severity
     */
    getScenariosBySeverity(severity: string): FailureScenario[];
    /**
     * Search scenarios by keywords
     */
    searchScenarios(query: string): FailureScenario[];
    /**
     * Get all scenarios
     */
    getAllScenarios(): FailureScenario[];
    /**
     * Add new scenario
     */
    addScenario(scenario: FailureScenario): void;
    /**
     * Update scenario with real-world occurrence
     */
    addOccurrence(scenarioId: string, occurrence: OccurrenceRecord): boolean;
    /**
     * Get neural training dataset from all scenarios
     */
    getNeuralTrainingDataset(): any;
    /**
     * Get failure statistics
     */
    getStatistics(): any;
    /**
     * Validate scenario completeness
     */
    validateScenario(scenarioId: string): any;
}
export declare const failureScenarioDatabase: FailureScenarioDatabase;
//# sourceMappingURL=failure-scenario-database.d.ts.map