/**
 * NLD Intelligent Troubleshooting Engine
 * Provides intelligent troubleshooting suggestions based on learned patterns
 */
import { EventEmitter } from 'events';
import { ConnectionFailureContext } from './connection-failure-detector';
import { ConnectionLearningDatabase } from './learning-database';
export interface TroubleshootingRequest {
    context: ConnectionFailureContext;
    userDescription?: string;
    previousAttempts?: string[];
    urgency: 'low' | 'medium' | 'high' | 'critical';
}
export interface TroubleshootingSuggestion {
    id: string;
    title: string;
    description: string;
    category: 'immediate' | 'configuration' | 'infrastructure' | 'code';
    priority: number;
    confidence: number;
    estimated_effort: 'low' | 'medium' | 'high';
    estimated_time: number;
    success_probability: number;
    steps: TroubleshootingStep[];
    prerequisites: string[];
    related_patterns: string[];
    resources: TroubleshootingResource[];
}
export interface TroubleshootingStep {
    order: number;
    action: string;
    command?: string;
    expected_result: string;
    verification: string;
    fallback?: string;
}
export interface TroubleshootingResource {
    type: 'documentation' | 'tool' | 'diagnostic' | 'monitoring';
    title: string;
    url?: string;
    description: string;
}
export interface TroubleshootingResult {
    suggestions: TroubleshootingSuggestion[];
    quick_fixes: TroubleshootingSuggestion[];
    preventive_measures: string[];
    monitoring_recommendations: string[];
    escalation_paths: string[];
    confidence_score: number;
    estimated_resolution_time: number;
}
export interface DiagnosticTest {
    name: string;
    description: string;
    test_function: (context: ConnectionFailureContext) => Promise<DiagnosticResult>;
    applicable_conditions: string[];
}
export interface DiagnosticResult {
    test_name: string;
    passed: boolean;
    result: any;
    interpretation: string;
    recommended_actions: string[];
}
export declare class TroubleshootingEngine extends EventEmitter {
    private learningDatabase;
    private suggestionTemplates;
    private diagnosticTests;
    private knowledgeBase;
    constructor(learningDatabase: ConnectionLearningDatabase);
    /**
     * Generate troubleshooting suggestions for a connection failure
     */
    generateSuggestions(request: TroubleshootingRequest): Promise<TroubleshootingResult>;
    /**
     * Run specific diagnostic test
     */
    runDiagnostic(testName: string, context: ConnectionFailureContext): Promise<DiagnosticResult>;
    /**
     * Get suggestion template by ID
     */
    getSuggestionTemplate(id: string): TroubleshootingSuggestion | undefined;
    /**
     * Add custom troubleshooting suggestion template
     */
    addSuggestionTemplate(suggestion: TroubleshootingSuggestion): void;
    /**
     * Add custom diagnostic test
     */
    addDiagnosticTest(test: DiagnosticTest): void;
    /**
     * Learn from successful troubleshooting results
     */
    learnFromSuccess(originalRequest: TroubleshootingRequest, successfulSuggestion: TroubleshootingSuggestion, actualResolutionTime: number): Promise<void>;
    private runDiagnostics;
    private findSimilarPatterns;
    private compileSuggestions;
    private getErrorSpecificSuggestions;
    private createTimeoutSuggestions;
    private createNetworkSuggestions;
    private createProtocolSuggestions;
    private createAuthSuggestions;
    private createServerSuggestions;
    private getDiagnosticBasedSuggestions;
    private getPatternBasedSuggestions;
    private getNetworkSpecificSuggestions;
    private adjustPrioritiesForUrgency;
    private generatePreventiveMeasures;
    private generateMonitoringRecommendations;
    private generateEscalationPaths;
    private calculateOverallConfidence;
    private estimateResolutionTime;
    private evaluateCondition;
    private initializeSuggestionTemplates;
    private initializeDiagnosticTests;
    private initializeKnowledgeBase;
}
//# sourceMappingURL=troubleshooting-engine.d.ts.map