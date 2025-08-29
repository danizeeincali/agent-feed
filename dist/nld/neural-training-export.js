"use strict";
/**
 * Neural Training Data Export for Claude-Flow Integration
 *
 * Exports NLD pattern data in claude-flow neural network format
 * for training failure prediction models and TDD improvement.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.neuralTrainingExporter = exports.NeuralTrainingExporter = void 0;
exports.getNeuralTrainingData = getNeuralTrainingData;
exports.getTrainingMetrics = getTrainingMetrics;
const nlt_record_database_1 = require("./patterns/nlt-record-database");
const anti_patterns_database_1 = require("./patterns/anti-patterns-database");
const tdd_prevention_strategies_1 = require("./tdd-prevention-strategies");
class NeuralTrainingExporter {
    /**
     * Export complete neural training dataset
     */
    exportTrainingDataset() {
        const rawData = nlt_record_database_1.nldDatabase.exportNeuralTrainingData();
        const antiPatterns = anti_patterns_database_1.antiPatternsDatabase.exportDatabase();
        const tddStrategies = tdd_prevention_strategies_1.tddPreventionStrategies.exportStrategies();
        // Convert NLT records to neural training format
        const neuralRecords = rawData.dataset.map(record => this.convertToNeuralFormat(record));
        // Split data: 70% training, 15% validation, 15% test
        const shuffled = this.shuffleArray([...neuralRecords]);
        const trainSize = Math.floor(shuffled.length * 0.7);
        const valSize = Math.floor(shuffled.length * 0.15);
        return {
            version: '1.0.0',
            generatedAt: new Date().toISOString(),
            trainingData: shuffled.slice(0, trainSize),
            validationData: shuffled.slice(trainSize, trainSize + valSize),
            testData: shuffled.slice(trainSize + valSize),
            featureStats: this.calculateFeatureStats(neuralRecords),
            modelTargets: {
                primaryTarget: 'effectiveness_prediction',
                objectives: [
                    'predict_solution_effectiveness_before_implementation',
                    'identify_high_risk_failure_patterns',
                    'recommend_optimal_tdd_strategies',
                    'estimate_user_satisfaction_probability'
                ],
                evaluationMetrics: [
                    'effectiveness_prediction_accuracy',
                    'failure_detection_precision',
                    'failure_detection_recall',
                    'tdd_recommendation_relevance',
                    'user_satisfaction_correlation'
                ]
            },
            antiPatternMappings: this.createAntiPatternMappings(antiPatterns),
            tddStrategiesMappings: this.createTDDStrategyMappings(tddStrategies)
        };
    }
    /**
     * Convert NLT record to neural training format
     */
    convertToNeuralFormat(record) {
        const features = [
            // Technical features
            {
                name: 'claude_confidence',
                value: record.input_features.claude_confidence,
                weight: 2.0,
                category: 'TECHNICAL'
            },
            {
                name: 'task_complexity',
                value: this.encodeComplexity(record.input_features.complexity),
                weight: 1.5,
                category: 'TECHNICAL'
            },
            {
                name: 'domain_risk_score',
                value: this.calculateDomainRisk(record.input_features.task_domain),
                weight: 1.8,
                category: 'TECHNICAL'
            },
            // Pattern-specific features  
            {
                name: 'has_async_state_access',
                value: record.input_features.features.includes('async_callback_state_dependency') ? 1 : 0,
                weight: 3.0, // Critical pattern
                category: 'TECHNICAL'
            },
            {
                name: 'missing_validation',
                value: record.input_features.features.includes('missing_validation') ? 1 : 0,
                weight: 2.5,
                category: 'TECHNICAL'
            },
            {
                name: 'race_condition_potential',
                value: record.input_features.features.includes('connection_state_race') ? 1 : 0,
                weight: 3.0,
                category: 'TECHNICAL'
            },
            // Contextual features
            {
                name: 'frontend_complexity',
                value: record.input_features.task_domain.includes('React') ? 0.8 : 0.3,
                weight: 1.2,
                category: 'CONTEXTUAL'
            },
            {
                name: 'state_management_complexity',
                value: record.input_features.features.includes('undefined_parameter_passing') ? 0.9 : 0.2,
                weight: 1.7,
                category: 'CONTEXTUAL'
            },
            // Behavioral patterns
            {
                name: 'tdd_usage_score',
                value: record.output_labels.tdd_gap ? 0.2 : 0.8,
                weight: 2.0,
                category: 'BEHAVIORAL'
            },
            {
                name: 'error_handling_completeness',
                value: record.input_features.features.includes('missing_validation') ? 0.1 : 0.9,
                weight: 1.8,
                category: 'BEHAVIORAL'
            }
        ];
        return {
            id: `neural-${record.id}`,
            timestamp: new Date().toISOString(),
            features,
            labels: {
                effectivenessScore: record.output_labels.effectiveness_score,
                failureProbability: record.output_labels.user_outcome === 'complete_failure' ? 0.95 : 0.1,
                userSatisfaction: this.calculateUserSatisfaction(record.output_labels),
                tddGapSeverity: record.output_labels.tdd_gap ? 0.8 : 0.2,
                preventabilityScore: record.output_labels.preventable ? 0.9 : 0.3
            },
            metadata: {
                domain: record.input_features.task_domain,
                complexity: record.input_features.complexity,
                claudeConfidence: record.input_features.claude_confidence,
                actualOutcome: record.output_labels.user_outcome,
                patternType: record.input_features.solution_pattern
            },
            // Higher weight for critical failures to bias training
            weight: record.output_labels.effectiveness_score < 0.3 ? 3.0 : 1.0
        };
    }
    /**
     * Calculate feature statistics for normalization
     */
    calculateFeatureStats(records) {
        const featureValues = {};
        const featureTypes = {};
        records.forEach(record => {
            record.features.forEach(feature => {
                if (typeof feature.value === 'number') {
                    if (!featureValues[feature.name]) {
                        featureValues[feature.name] = [];
                    }
                    featureValues[feature.name].push(feature.value);
                }
                featureTypes[feature.category] = (featureTypes[feature.category] || 0) + 1;
            });
        });
        const featureRanges = {};
        Object.keys(featureValues).forEach(featureName => {
            const values = featureValues[featureName];
            featureRanges[featureName] = {
                min: Math.min(...values),
                max: Math.max(...values),
                mean: values.reduce((sum, val) => sum + val, 0) / values.length
            };
        });
        return {
            totalFeatures: Object.keys(featureValues).length,
            featureTypes,
            featureRanges
        };
    }
    /**
     * Helper functions for feature encoding
     */
    encodeComplexity(complexity) {
        switch (complexity) {
            case 'low': return 0.2;
            case 'medium': return 0.5;
            case 'high': return 0.8;
            case 'critical': return 1.0;
            default: return 0.5;
        }
    }
    calculateDomainRisk(domain) {
        const riskFactors = {
            'React': 0.7, // State management complexity
            'TypeScript': 0.4, // Type safety helps
            'Frontend': 0.6, // UI complexity
            'Backend': 0.5, // Server complexity
            'Database': 0.8, // Data consistency issues
            'API': 0.6, // Integration complexity
            'Async': 0.9, // Timing issues
            'Terminal': 0.7 // System integration
        };
        let risk = 0.5; // Base risk
        Object.keys(riskFactors).forEach(factor => {
            if (domain.includes(factor)) {
                risk = Math.max(risk, riskFactors[factor]);
            }
        });
        return risk;
    }
    calculateUserSatisfaction(labels) {
        // User satisfaction inversely correlated with failure
        switch (labels.user_outcome) {
            case 'success': return 0.9;
            case 'partial_failure': return 0.4;
            case 'complete_failure': return 0.1;
            default: return 0.5;
        }
    }
    /**
     * Create anti-pattern frequency mappings
     */
    createAntiPatternMappings(antiPatterns) {
        const mappings = {};
        antiPatterns.patterns.forEach((pattern) => {
            mappings[pattern.id] = pattern.occurrenceCount || 0;
        });
        return mappings;
    }
    /**
     * Create TDD strategy effectiveness mappings
     */
    createTDDStrategyMappings(strategies) {
        const mappings = {};
        strategies.strategies.forEach((strategy) => {
            // Estimate effectiveness based on priority and category
            let effectiveness = 0.5; // Base effectiveness
            switch (strategy.priority) {
                case 'CRITICAL':
                    effectiveness += 0.4;
                    break;
                case 'HIGH':
                    effectiveness += 0.3;
                    break;
                case 'MEDIUM':
                    effectiveness += 0.2;
                    break;
                case 'LOW':
                    effectiveness += 0.1;
                    break;
            }
            switch (strategy.category) {
                case 'UNIT':
                    effectiveness += 0.1;
                    break;
                case 'INTEGRATION':
                    effectiveness += 0.2;
                    break;
                case 'E2E':
                    effectiveness += 0.1;
                    break;
                case 'CONTRACT':
                    effectiveness += 0.15;
                    break;
                case 'PROPERTY':
                    effectiveness += 0.1;
                    break;
            }
            mappings[strategy.id] = Math.min(effectiveness, 1.0);
        });
        return mappings;
    }
    /**
     * Shuffle array for data splitting
     */
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    /**
     * Export for claude-flow neural system integration
     */
    exportForClaudeFlow() {
        const dataset = this.exportTrainingDataset();
        return {
            // Claude-flow specific format
            neural_dataset: {
                format_version: '2.0.0',
                dataset_type: 'nld_failure_prediction',
                model_architecture: 'transformer_with_attention',
                training_config: {
                    batch_size: 32,
                    learning_rate: 0.001,
                    epochs: 100,
                    validation_split: 0.15,
                    early_stopping: true,
                    regularization: 'dropout_0.3'
                },
                feature_engineering: {
                    normalization: 'min_max_scaling',
                    categorical_encoding: 'one_hot',
                    sequence_length: 'variable',
                    attention_mechanism: 'multi_head'
                },
                training_data: dataset.trainingData.map(record => ({
                    input: record.features.reduce((obj, feature) => {
                        obj[feature.name] = feature.value;
                        return obj;
                    }, {}),
                    output: record.labels,
                    weight: record.weight,
                    metadata: record.metadata
                })),
                evaluation_metrics: dataset.modelTargets.evaluationMetrics,
                model_objectives: {
                    primary: 'minimize_effectiveness_prediction_error',
                    secondary: [
                        'maximize_failure_detection_recall',
                        'optimize_tdd_recommendation_accuracy'
                    ]
                }
            },
            // Additional NLD-specific data
            nld_metadata: {
                patterns_detected: Object.keys(dataset.antiPatternMappings).length,
                prevention_strategies: Object.keys(dataset.tddStrategiesMappings).length,
                failure_types_covered: this.getFailureTypesCovered(),
                domain_coverage: this.getDomainCoverage(dataset)
            }
        };
    }
    getFailureTypesCovered() {
        return [
            'STATE_RACE_CONDITION',
            'UNDEFINED_PARAM_PROPAGATION',
            'ASYNC_TIMING_ISSUES',
            'MISSING_VALIDATION',
            'TYPE_SAFETY_GAPS'
        ];
    }
    getDomainCoverage(dataset) {
        const domains = new Set();
        dataset.trainingData.forEach(record => {
            domains.add(record.metadata.domain);
        });
        return {
            total_domains: domains.size,
            covered_domains: Array.from(domains),
            domain_distribution: this.calculateDomainDistribution(dataset)
        };
    }
    calculateDomainDistribution(dataset) {
        const distribution = {};
        dataset.trainingData.forEach(record => {
            const domain = record.metadata.domain;
            distribution[domain] = (distribution[domain] || 0) + 1;
        });
        return distribution;
    }
}
exports.NeuralTrainingExporter = NeuralTrainingExporter;
// Global exporter instance
exports.neuralTrainingExporter = new NeuralTrainingExporter();
/**
 * Direct integration with claude-flow neural system
 * This would be called by claude-flow to get training data
 */
function getNeuralTrainingData() {
    return exports.neuralTrainingExporter.exportForClaudeFlow();
}
/**
 * Export training metrics for performance tracking
 */
function getTrainingMetrics() {
    const dataset = exports.neuralTrainingExporter.exportTrainingDataset();
    return {
        dataset_size: dataset.trainingData.length + dataset.validationData.length + dataset.testData.length,
        feature_count: dataset.featureStats.totalFeatures,
        failure_rate: dataset.trainingData.filter(r => r.labels.failureProbability > 0.5).length / dataset.trainingData.length,
        effectiveness_distribution: {
            high: dataset.trainingData.filter(r => r.labels.effectivenessScore > 0.7).length,
            medium: dataset.trainingData.filter(r => r.labels.effectivenessScore >= 0.3 && r.labels.effectivenessScore <= 0.7).length,
            low: dataset.trainingData.filter(r => r.labels.effectivenessScore < 0.3).length
        },
        tdd_gap_percentage: dataset.trainingData.filter(r => r.labels.tddGapSeverity > 0.5).length / dataset.trainingData.length
    };
}
//# sourceMappingURL=neural-training-export.js.map