/**
 * NLD Monitor - Real-time Pattern Detection System
 *
 * Automatically detects when Claude claims success but users experience failure,
 * captures the pattern data, and builds training datasets for TDD improvement.
 */
export interface TriggerCondition {
    phrase: string;
    context?: string;
    confidence: number;
}
export interface SessionContext {
    currentTask?: string;
    claudeResponses: Array<{
        timestamp: string;
        response: string;
        confidence: number;
    }>;
    userInteractions: Array<{
        timestamp: string;
        action: string;
        result: 'success' | 'failure' | 'partial';
    }>;
    technicalContext: {
        component?: string;
        operation?: string;
        expectedResult?: string;
        actualResult?: string;
    };
}
export declare class NLDMonitor {
    private isActive;
    private sessionContext;
    private failureTriggers;
    /**
     * Monitor user input for trigger conditions
     */
    monitorUserInput(userInput: string, context?: any): void;
    /**
     * Monitor Claude responses for confidence tracking
     */
    monitorClaudeResponse(response: string, confidence?: number): void;
    /**
     * Set technical context for current operation
     */
    setTechnicalContext(context: {
        component?: string;
        operation?: string;
        expectedResult?: string;
        actualResult?: string;
    }): void;
    /**
     * Detect and capture failure pattern
     */
    private detectFailurePattern;
    /**
     * Specialized capture for instance ID undefined pattern
     */
    private captureInstanceIdPattern;
    /**
     * Update context when success is detected
     */
    private updateSuccessContext;
    /**
     * Export training data for neural networks
     */
    private exportTrainingData;
    /**
     * Determine result from user input text
     */
    private determineResultFromInput;
    /**
     * Get current analytics
     */
    getAnalytics(): {
        sessionContext: SessionContext;
        trainingData: {
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
        tddTrends: {
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
        recommendations: {
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
    };
    /**
     * Reset session for new task
     */
    resetSession(): void;
    /**
     * Enable/disable monitoring
     */
    setActive(active: boolean): void;
}
export declare const nldMonitor: NLDMonitor;
/**
 * Integration hook for frontend components
 * Call this from your React components to monitor user interactions
 */
export declare function useNLDMonitoring(): {
    logUserInteraction: (input: string, context?: any) => void;
    logClaudeResponse: (response: string, confidence?: number) => void;
    setContext: (context: any) => void;
    getAnalytics: () => {
        sessionContext: SessionContext;
        trainingData: {
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
        tddTrends: {
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
        recommendations: {
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
    };
};
//# sourceMappingURL=nld-monitor.d.ts.map