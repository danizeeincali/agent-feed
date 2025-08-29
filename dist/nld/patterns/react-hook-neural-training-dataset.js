"use strict";
/**
 * React Hook Neural Training Dataset
 * NLD Neural Training Module for React Hook Side Effect patterns
 *
 * Exports training data for claude-flow neural system to learn and prevent
 * React Hook side effect bugs in render cycles
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reactHookNeuralTrainingDataset = exports.ReactHookNeuralTrainingDataset = void 0;
const react_hook_side_effect_detector_1 = require("./react-hook-side-effect-detector");
const nld_logger_1 = require("../utils/nld-logger");
class ReactHookNeuralTrainingDataset {
    trainingData = [];
    config;
    preventionStrategies;
    constructor(config = {}) {
        this.config = {
            maxSamples: 10000,
            balanceDataset: true,
            includeNegativeSamples: true,
            featureNormalization: true,
            crossValidationSplit: 0.2,
            ...config
        };
        this.preventionStrategies = new Map();
        this.initializePreventionStrategies();
        nld_logger_1.nldLogger.renderAttempt('ReactHookNeuralTrainingDataset', 'initialization', this.config);
    }
    /**
     * Initialize prevention strategies based on observed patterns
     */
    initializePreventionStrategies() {
        const strategies = [
            {
                name: 'useEffect-migration',
                description: 'Move side effects from render to useEffect hook',
                implementation: 'Replace side effects in hook body with useEffect calls',
                tddTestPattern: 'Test that side effects only occur after mount/update',
                effectiveness: 0.95
            },
            {
                name: 'rate-limit-removal',
                description: 'Remove rate limiting from render-triggered functions',
                implementation: 'Move rate limiting to event handlers or API layer',
                tddTestPattern: 'Test that UI remains responsive during rapid renders',
                effectiveness: 0.88
            },
            {
                name: 'state-isolation',
                description: 'Isolate state mutations from render cycle',
                implementation: 'Use reducers or separate state management',
                tddTestPattern: 'Test state changes only occur via dispatched actions',
                effectiveness: 0.92
            },
            {
                name: 'lazy-initialization',
                description: 'Defer expensive computations using useMemo/useCallback',
                implementation: 'Wrap expensive operations in memoization hooks',
                tddTestPattern: 'Test computations only run when dependencies change',
                effectiveness: 0.85
            },
            {
                name: 'event-delegation',
                description: 'Move event emissions to user interaction handlers',
                implementation: 'Replace render-time events with onClick/onChange handlers',
                tddTestPattern: 'Test events only fire on user interactions',
                effectiveness: 0.90
            }
        ];
        strategies.forEach(strategy => {
            this.preventionStrategies.set(strategy.name, strategy);
        });
    }
    /**
     * Convert pattern to neural training data point
     */
    createTrainingDataPoint(pattern, additionalContext = {}) {
        try {
            const preventionStrategy = this.selectPreventionStrategy(pattern);
            const dataPoint = {
                id: `training-${pattern.id}`,
                timestamp: new Date(),
                inputFeatures: {
                    componentName: pattern.componentName,
                    hookName: pattern.hookName,
                    renderCycleCount: pattern.renderCycleCount,
                    userActionCount: pattern.userActionCount,
                    renderToActionRatio: pattern.renderToActionRatio,
                    sideEffectType: pattern.sideEffectType,
                    sourceFileType: this.extractFileType(pattern.sourceLocation.file),
                    hookComplexityScore: additionalContext.hookComplexityScore || this.calculateComplexityScore(pattern),
                    componentSize: additionalContext.componentSize || 0,
                    dependencyCount: additionalContext.dependencyCount || 0
                },
                outputLabels: {
                    isPattern: true,
                    severity: pattern.severity,
                    patternType: `react-hook-${pattern.sideEffectType}`,
                    preventionStrategy: preventionStrategy.name,
                    tddTestRequired: this.shouldRequireTDDTest(pattern)
                },
                contextFeatures: {
                    symptom: pattern.symptom,
                    rootCause: pattern.rootCause,
                    stackTrace: pattern.stackTrace,
                    sourceLocation: pattern.sourceLocation
                },
                metadata: {
                    ...pattern.metadata,
                    preventionStrategy: preventionStrategy,
                    trainingDataVersion: '1.0.0',
                    generatedAt: new Date().toISOString()
                }
            };
            this.trainingData.push(dataPoint);
            nld_logger_1.nldLogger.renderSuccess('ReactHookNeuralTrainingDataset', 'training-data-point-created', {
                patternId: pattern.id,
                severity: pattern.severity,
                preventionStrategy: preventionStrategy.name
            });
            return dataPoint;
        }
        catch (error) {
            nld_logger_1.nldLogger.renderFailure('ReactHookNeuralTrainingDataset', error, {
                patternId: pattern.id
            });
            throw error;
        }
    }
    /**
     * Select appropriate prevention strategy based on pattern
     */
    selectPreventionStrategy(pattern) {
        switch (pattern.sideEffectType) {
            case 'rate-limiting':
                return this.preventionStrategies.get('rate-limit-removal');
            case 'state-mutation':
                return this.preventionStrategies.get('state-isolation');
            case 'api-call':
                return this.preventionStrategies.get('useEffect-migration');
            case 'dom-manipulation':
                return this.preventionStrategies.get('lazy-initialization');
            case 'event-emission':
                return this.preventionStrategies.get('event-delegation');
            default:
                return this.preventionStrategies.get('useEffect-migration');
        }
    }
    /**
     * Calculate hook complexity score
     */
    calculateComplexityScore(pattern) {
        let score = 0;
        // Base complexity
        score += pattern.renderCycleCount * 0.1;
        score += pattern.renderToActionRatio * 0.2;
        // Severity multiplier
        const severityMultipliers = {
            low: 1.0,
            medium: 1.5,
            high: 2.0,
            critical: 3.0
        };
        score *= severityMultipliers[pattern.severity];
        // Side effect type complexity
        const typeComplexity = {
            'rate-limiting': 0.8,
            'state-mutation': 1.0,
            'api-call': 0.9,
            'dom-manipulation': 0.7,
            'event-emission': 0.6
        };
        score *= typeComplexity[pattern.sideEffectType] || 1.0;
        return Math.min(score, 10.0); // Cap at 10
    }
    /**
     * Extract file type from path
     */
    extractFileType(filePath) {
        const extension = filePath.split('.').pop()?.toLowerCase();
        return extension || 'unknown';
    }
    /**
     * Determine if TDD test is required
     */
    shouldRequireTDDTest(pattern) {
        // High severity patterns always need TDD tests
        if (pattern.severity === 'high' || pattern.severity === 'critical') {
            return true;
        }
        // Rate limiting and state mutation patterns need TDD
        if (pattern.sideEffectType === 'rate-limiting' || pattern.sideEffectType === 'state-mutation') {
            return true;
        }
        // High render-to-action ratio needs TDD
        return pattern.renderToActionRatio > 3.0;
    }
    /**
     * Generate negative samples for balanced training
     */
    generateNegativeSamples(count) {
        const negativesamples = [];
        for (let i = 0; i < count; i++) {
            const sample = {
                id: `negative-sample-${Date.now()}-${i}`,
                timestamp: new Date(),
                inputFeatures: {
                    componentName: `HealthyComponent${i}`,
                    hookName: `useHealthyHook${i}`,
                    renderCycleCount: Math.floor(Math.random() * 3) + 1, // Low render count
                    userActionCount: Math.floor(Math.random() * 5) + 1,
                    renderToActionRatio: Math.random() * 0.8 + 0.2, // Low ratio
                    sideEffectType: 'none',
                    sourceFileType: 'tsx',
                    hookComplexityScore: Math.random() * 2, // Low complexity
                    componentSize: Math.floor(Math.random() * 100) + 50,
                    dependencyCount: Math.floor(Math.random() * 5)
                },
                outputLabels: {
                    isPattern: false,
                    severity: 'low',
                    patternType: 'healthy-hook',
                    preventionStrategy: 'none-required',
                    tddTestRequired: false
                },
                contextFeatures: {
                    symptom: 'No side effects detected',
                    rootCause: 'Proper React hook usage',
                    sourceLocation: {
                        file: `/healthy/Component${i}.tsx`,
                        line: 1,
                        column: 1
                    }
                },
                metadata: {
                    isNegativeSample: true,
                    generatedAt: new Date().toISOString()
                }
            };
            negativeSamples.push(sample);
        }
        nld_logger_1.nldLogger.renderSuccess('ReactHookNeuralTrainingDataset', 'negative-samples-generated', {
            count: negativeSamples.length
        });
        return negativeSamples;
    }
    /**
     * Process all detected patterns into training data
     */
    processAllPatterns() {
        const patterns = react_hook_side_effect_detector_1.reactHookSideEffectDetector.getPatterns();
        patterns.forEach(pattern => {
            this.createTrainingDataPoint(pattern);
        });
        // Add negative samples if configured
        if (this.config.includeNegativeSamples) {
            const negativeCount = Math.floor(patterns.length * 0.3); // 30% negative samples
            const negativeSamples = this.generateNegativeSamples(negativeCount);
            this.trainingData.push(...negativeSamples);
        }
        nld_logger_1.nldLogger.renderSuccess('ReactHookNeuralTrainingDataset', 'all-patterns-processed', {
            totalPatterns: patterns.length,
            trainingDataCount: this.trainingData.length
        });
    }
    /**
     * Export training dataset in claude-flow neural format
     */
    exportForClaudeFlowNeural() {
        try {
            // Normalize features if configured
            const processedData = this.config.featureNormalization
                ? this.normalizeFeatures(this.trainingData)
                : this.trainingData;
            // Split data for cross-validation
            const splitIndex = Math.floor(processedData.length * (1 - this.config.crossValidationSplit));
            const trainingSplit = processedData.slice(0, splitIndex);
            const validationSplit = processedData.slice(splitIndex);
            // Prepare inputs and outputs
            const inputs = processedData.map(point => point.inputFeatures);
            const outputs = processedData.map(point => point.outputLabels);
            const exportData = {
                metadata: {
                    exportTime: new Date(),
                    version: '1.0.0',
                    sampleCount: this.trainingData.length,
                    config: this.config,
                    preventionStrategies: Array.from(this.preventionStrategies.values())
                },
                trainingData: {
                    inputs,
                    outputs,
                    features: Object.keys(this.trainingData[0]?.inputFeatures || {}),
                    labels: Object.keys(this.trainingData[0]?.outputLabels || {})
                },
                crossValidation: {
                    trainingSplit: trainingSplit.map(point => ({
                        input: point.inputFeatures,
                        output: point.outputLabels
                    })),
                    validationSplit: validationSplit.map(point => ({
                        input: point.inputFeatures,
                        output: point.outputLabels
                    }))
                }
            };
            nld_logger_1.nldLogger.renderSuccess('ReactHookNeuralTrainingDataset', 'export-completed', {
                sampleCount: this.trainingData.length,
                trainingSamples: trainingSplit.length,
                validationSamples: validationSplit.length
            });
            return exportData;
        }
        catch (error) {
            nld_logger_1.nldLogger.renderFailure('ReactHookNeuralTrainingDataset', error);
            throw error;
        }
    }
    /**
     * Normalize feature values for better neural network training
     */
    normalizeFeatures(data) {
        // Calculate min/max for numeric features
        const numericFields = ['renderCycleCount', 'userActionCount', 'renderToActionRatio', 'hookComplexityScore'];
        const stats = new Map();
        // Calculate statistics
        numericFields.forEach(field => {
            const values = data.map(point => point.inputFeatures[field]).filter(val => typeof val === 'number');
            stats.set(field, {
                min: Math.min(...values),
                max: Math.max(...values)
            });
        });
        // Normalize data
        return data.map(point => {
            const normalizedInputs = { ...point.inputFeatures };
            numericFields.forEach(field => {
                const fieldStats = stats.get(field);
                if (fieldStats && typeof normalizedInputs[field] === 'number') {
                    const value = normalizedInputs[field];
                    const range = fieldStats.max - fieldStats.min;
                    normalizedInputs[field] = range > 0 ? (value - fieldStats.min) / range : 0;
                }
            });
            return {
                ...point,
                inputFeatures: normalizedInputs
            };
        });
    }
    /**
     * Get training data statistics
     */
    getStatistics() {
        const stats = {
            totalSamples: this.trainingData.length,
            patternDistribution: {},
            severityDistribution: {},
            preventionStrategyDistribution: {}
        };
        this.trainingData.forEach(point => {
            // Pattern type distribution
            const patternType = point.outputLabels.patternType;
            stats.patternDistribution[patternType] = (stats.patternDistribution[patternType] || 0) + 1;
            // Severity distribution
            const severity = point.outputLabels.severity;
            stats.severityDistribution[severity] = (stats.severityDistribution[severity] || 0) + 1;
            // Prevention strategy distribution
            const strategy = point.outputLabels.preventionStrategy;
            stats.preventionStrategyDistribution[strategy] = (stats.preventionStrategyDistribution[strategy] || 0) + 1;
        });
        return stats;
    }
    /**
     * Clear training data for memory management
     */
    clearTrainingData() {
        const count = this.trainingData.length;
        this.trainingData = [];
        nld_logger_1.nldLogger.renderSuccess('ReactHookNeuralTrainingDataset', 'training-data-cleared', {
            clearedCount: count
        });
    }
}
exports.ReactHookNeuralTrainingDataset = ReactHookNeuralTrainingDataset;
/**
 * Global training dataset instance
 */
exports.reactHookNeuralTrainingDataset = new ReactHookNeuralTrainingDataset({
    maxSamples: 5000,
    balanceDataset: true,
    includeNegativeSamples: true,
    featureNormalization: true,
    crossValidationSplit: 0.2
});
//# sourceMappingURL=react-hook-neural-training-dataset.js.map