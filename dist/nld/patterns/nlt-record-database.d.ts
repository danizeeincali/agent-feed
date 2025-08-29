/**
 * NLT (Neuro-Learning Testing) Record Database
 *
 * Captures real-world failure patterns where Claude claims success
 * but users experience actual failure. Used for TDD improvement.
 */
export interface NLTRecord {
    id: string;
    timestamp: string;
    taskContext: {
        originalTask: string;
        domain: string;
        complexity: 'low' | 'medium' | 'high' | 'critical';
    };
    claudeResponse: {
        proposedSolution: string;
        confidenceLevel: number;
        claimedSuccess: boolean;
    };
    userExperience: {
        actualOutcome: 'success' | 'partial_failure' | 'complete_failure';
        userFeedback: string;
        errorDescription?: string;
    };
    failureAnalysis: {
        rootCause: string;
        failureType: string;
        preventable: boolean;
        tddGap: boolean;
    };
    effectivenessScore: number;
    neuralTrainingData: {
        pattern: string;
        classification: string;
        features: string[];
    };
}
export declare class NLTDatabase {
    private records;
    private patterns;
    /**
     * Auto-captures when user feedback indicates failure
     * Triggered by phrases: "didn't work", "failed", "broken", etc.
     */
    captureFailurePattern(triggerPhrase: string, sessionContext: any): Promise<string>;
    /**
     * Export training data for claude-flow neural networks
     */
    exportNeuralTrainingData(): {
        dataset: {
            id: string;
            input_features: {
                task_domain: string;
                complexity: "low" | "medium" | "high" | "critical";
                claude_confidence: number;
                solution_pattern: string;
                features: string[];
            };
            output_labels: {
                effectiveness_score: number;
                failure_type: string;
                preventable: boolean;
                tdd_gap: boolean;
                user_outcome: "success" | "partial_failure" | "complete_failure";
            };
            weight: number;
        }[];
        metadata: {
            total_records: number;
            failure_rate: number;
            avg_effectiveness: number;
            tdd_gap_percentage: number;
        };
    };
    /**
     * Generate TDD improvement recommendations
     */
    generateTDDRecommendations(): {
        critical_gaps: {
            pattern: string;
            description: string;
            test_coverage_needed: string;
            prevention_strategy: string;
        }[];
        recommended_tests: {
            name: string;
            test: string;
        }[];
        anti_patterns: {
            raceCondition: {
                description: string;
                location: string;
                problem: string;
                frequency: string;
            };
            stateAsyncMismatch: {
                description: string;
                location: string;
                problem: string;
                frequency: string;
            };
            missingFallback: {
                description: string;
                location: string;
                problem: string;
                frequency: string;
            };
        };
        metrics: {
            effectivenessScore: number;
            failureType: string;
            impactLevel: string;
            userExperience: string;
            tddscore: string;
            preventability: string;
            recurrenceRisk: string;
        };
    };
    private calculateFailureRate;
    private calculateAverageEffectiveness;
    private calculateTDDGapPercentage;
    /**
     * Get record by ID for detailed analysis
     */
    getRecord(id: string): NLTRecord | undefined;
    /**
     * Get all records matching pattern
     */
    getRecordsByPattern(pattern: string): NLTRecord[];
    /**
     * Get historical trends for TDD effectiveness
     */
    getTDDEffectivenessTrends(): {
        timeline: {
            timestamp: string;
            effectiveness: number;
            had_tdd: boolean;
        }[];
        tdd_correlation: {
            with_tdd_avg: number;
            without_tdd_avg: number;
        };
    };
    private calculateEffectivenessWithTDD;
    private calculateEffectivenessWithoutTDD;
}
export declare const nldDatabase: NLTDatabase;
//# sourceMappingURL=nlt-record-database.d.ts.map