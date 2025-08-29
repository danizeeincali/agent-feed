"use strict";
/**
 * NLT (Neuro-Learning Testing) Record Database
 *
 * Captures real-world failure patterns where Claude claims success
 * but users experience actual failure. Used for TDD improvement.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.nldDatabase = exports.NLTDatabase = void 0;
const instance_id_undefined_pattern_1 = require("./instance-id-undefined-pattern");
class NLTDatabase {
    records = new Map();
    patterns = new instance_id_undefined_pattern_1.InstanceIdUndefinedPattern();
    /**
     * Auto-captures when user feedback indicates failure
     * Triggered by phrases: "didn't work", "failed", "broken", etc.
     */
    async captureFailurePattern(triggerPhrase, sessionContext) {
        const recordId = `NLT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // Instance ID undefined bug pattern
        if (triggerPhrase.includes("undefined") ||
            triggerPhrase.includes("terminal") ||
            triggerPhrase.includes("connection")) {
            const record = {
                id: recordId,
                timestamp: new Date().toISOString(),
                taskContext: {
                    originalTask: "Frontend terminal connection for Claude instances",
                    domain: "React/TypeScript Frontend",
                    complexity: "medium"
                },
                claudeResponse: {
                    proposedSolution: "HTTP/SSE connection with state management",
                    confidenceLevel: 0.85,
                    claimedSuccess: true
                },
                userExperience: {
                    actualOutcome: "complete_failure",
                    userFeedback: "Instance ID shows as undefined in terminal connection",
                    errorDescription: "Backend creates instance with ID 'claude-2643', frontend receives it, but terminal connection sends 'undefined'"
                },
                failureAnalysis: {
                    rootCause: "Race condition between async connection state and synchronous emit",
                    failureType: "STATE_RACE_CONDITION",
                    preventable: true,
                    tddGap: true
                },
                effectivenessScore: this.patterns.calculateEffectivenessScore(),
                neuralTrainingData: {
                    pattern: "ASYNC_STATE_RACE_CONDITION",
                    classification: "TIMING_CRITICAL_FRONTEND_BUG",
                    features: [
                        "async_callback_state_dependency",
                        "immediate_synchronous_access",
                        "missing_validation",
                        "undefined_parameter_passing",
                        "connection_state_race"
                    ]
                }
            };
            this.records.set(recordId, record);
            // Store pattern data
            this.patterns.capturePattern({
                triggerCondition: triggerPhrase,
                creationFlow: {
                    backendResponse: { instanceId: "claude-2643", success: true },
                    frontendReceived: { instanceId: "claude-2643" },
                    selectedInstanceState: "claude-2643",
                    terminalConnectionPayload: { instanceId: undefined }
                },
                stateTransitions: [
                    {
                        timestamp: new Date().toISOString(),
                        action: "instance_creation",
                        selectedInstance: null,
                        actualInstanceId: "claude-2643"
                    },
                    {
                        timestamp: new Date().toISOString(),
                        action: "setSelectedInstance",
                        selectedInstance: "claude-2643",
                        actualInstanceId: "claude-2643"
                    },
                    {
                        timestamp: new Date().toISOString(),
                        action: "connectSSE_called",
                        selectedInstance: "claude-2643",
                        actualInstanceId: "claude-2643"
                    },
                    {
                        timestamp: new Date().toISOString(),
                        action: "emit_terminal_input",
                        selectedInstance: "claude-2643",
                        actualInstanceId: undefined // BUG: connectionState not yet set
                    }
                ],
                failurePoint: {
                    location: "useHTTPSSE.ts:87",
                    expected: "claude-2643",
                    actual: "undefined"
                }
            });
            return recordId;
        }
        return recordId;
    }
    /**
     * Export training data for claude-flow neural networks
     */
    exportNeuralTrainingData() {
        const trainingData = Array.from(this.records.values()).map(record => ({
            id: record.id,
            input_features: {
                task_domain: record.taskContext.domain,
                complexity: record.taskContext.complexity,
                claude_confidence: record.claudeResponse.confidenceLevel,
                solution_pattern: record.neuralTrainingData.pattern,
                features: record.neuralTrainingData.features
            },
            output_labels: {
                effectiveness_score: record.effectivenessScore,
                failure_type: record.failureAnalysis.failureType,
                preventable: record.failureAnalysis.preventable,
                tdd_gap: record.failureAnalysis.tddGap,
                user_outcome: record.userExperience.actualOutcome
            },
            weight: record.effectivenessScore < 0.3 ? 2.0 : 1.0 // Higher weight for critical failures
        }));
        return {
            dataset: trainingData,
            metadata: {
                total_records: this.records.size,
                failure_rate: this.calculateFailureRate(),
                avg_effectiveness: this.calculateAverageEffectiveness(),
                tdd_gap_percentage: this.calculateTDDGapPercentage()
            }
        };
    }
    /**
     * Generate TDD improvement recommendations
     */
    generateTDDRecommendations() {
        const antiPatterns = this.patterns.getAntiPatterns();
        const prevention = this.patterns.generateTDDPrevention();
        return {
            critical_gaps: [
                {
                    pattern: "async_state_access_race_condition",
                    description: "Accessing async state before initialization complete",
                    test_coverage_needed: "Unit tests for async state transitions",
                    prevention_strategy: "Always validate state or use direct parameters"
                },
                {
                    pattern: "undefined_parameter_propagation",
                    description: "Passing undefined values to API endpoints",
                    test_coverage_needed: "Input validation tests for all API calls",
                    prevention_strategy: "Add TypeScript strict checks and runtime validation"
                }
            ],
            recommended_tests: prevention.testPatterns,
            anti_patterns: antiPatterns,
            metrics: this.patterns.getFailureMetrics()
        };
    }
    calculateFailureRate() {
        const totalFailures = Array.from(this.records.values())
            .filter(r => r.userExperience.actualOutcome !== 'success').length;
        return this.records.size > 0 ? totalFailures / this.records.size : 0;
    }
    calculateAverageEffectiveness() {
        const scores = Array.from(this.records.values()).map(r => r.effectivenessScore);
        return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    }
    calculateTDDGapPercentage() {
        const tddGaps = Array.from(this.records.values())
            .filter(r => r.failureAnalysis.tddGap).length;
        return this.records.size > 0 ? tddGaps / this.records.size : 0;
    }
    /**
     * Get record by ID for detailed analysis
     */
    getRecord(id) {
        return this.records.get(id);
    }
    /**
     * Get all records matching pattern
     */
    getRecordsByPattern(pattern) {
        return Array.from(this.records.values())
            .filter(r => r.neuralTrainingData.pattern === pattern);
    }
    /**
     * Get historical trends for TDD effectiveness
     */
    getTDDEffectivenessTrends() {
        const records = Array.from(this.records.values())
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return {
            timeline: records.map(r => ({
                timestamp: r.timestamp,
                effectiveness: r.effectivenessScore,
                had_tdd: !r.failureAnalysis.tddGap
            })),
            tdd_correlation: {
                with_tdd_avg: this.calculateEffectivenessWithTDD(),
                without_tdd_avg: this.calculateEffectivenessWithoutTDD()
            }
        };
    }
    calculateEffectivenessWithTDD() {
        const withTDD = Array.from(this.records.values())
            .filter(r => !r.failureAnalysis.tddGap);
        return withTDD.length > 0
            ? withTDD.reduce((sum, r) => sum + r.effectivenessScore, 0) / withTDD.length
            : 0;
    }
    calculateEffectivenessWithoutTDD() {
        const withoutTDD = Array.from(this.records.values())
            .filter(r => r.failureAnalysis.tddGap);
        return withoutTDD.length > 0
            ? withoutTDD.reduce((sum, r) => sum + r.effectivenessScore, 0) / withoutTDD.length
            : 0;
    }
}
exports.NLTDatabase = NLTDatabase;
// Singleton instance for global pattern collection
exports.nldDatabase = new NLTDatabase();
//# sourceMappingURL=nlt-record-database.js.map