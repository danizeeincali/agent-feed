"use strict";
/**
 * Claude Flow Neural Exporter
 * NLD Integration Module for exporting React Hook patterns to claude-flow neural system
 *
 * Exports training data in claude-flow compatible format for neural pattern learning
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeFlowNeuralExporter = exports.ClaudeFlowNeuralExporter = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const react_hook_neural_training_dataset_1 = require("./react-hook-neural-training-dataset");
const react_hook_side_effect_detector_1 = require("./react-hook-side-effect-detector");
const nld_logger_1 = require("../utils/nld-logger");
class ClaudeFlowNeuralExporter {
    config;
    constructor(config = {}) {
        this.config = {
            outputDirectory: '/workspaces/agent-feed/.claude-flow/neural/patterns',
            exportFormat: 'json',
            includeMetadata: true,
            compressOutput: false,
            batchSize: 1000,
            maxFileSize: 50,
            ...config
        };
        this.ensureOutputDirectory();
        nld_logger_1.nldLogger.renderAttempt('ClaudeFlowNeuralExporter', 'initialization', this.config);
    }
    /**
     * Ensure output directory exists
     */
    ensureOutputDirectory() {
        try {
            if (!(0, fs_1.existsSync)(this.config.outputDirectory)) {
                (0, fs_1.mkdirSync)(this.config.outputDirectory, { recursive: true });
            }
            nld_logger_1.nldLogger.renderSuccess('ClaudeFlowNeuralExporter', 'output-directory-ensured', {
                directory: this.config.outputDirectory
            });
        }
        catch (error) {
            nld_logger_1.nldLogger.renderFailure('ClaudeFlowNeuralExporter', error);
            throw error;
        }
    }
    /**
     * Export React Hook patterns for claude-flow neural system
     */
    async exportReactHookPatterns() {
        try {
            nld_logger_1.nldLogger.renderAttempt('ClaudeFlowNeuralExporter', 'export-react-hook-patterns');
            // Process all detected patterns into training data
            react_hook_neural_training_dataset_1.reactHookNeuralTrainingDataset.processAllPatterns();
            // Get training dataset
            const trainingDataset = react_hook_neural_training_dataset_1.reactHookNeuralTrainingDataset.exportForClaudeFlowNeural();
            const statistics = react_hook_neural_training_dataset_1.reactHookNeuralTrainingDataset.getStatistics();
            // Create neural pattern export
            const neuralExport = this.createNeuralPatternExport(trainingDataset, statistics);
            // Export in different formats
            const exportedFiles = [];
            // Primary JSON export for claude-flow
            const jsonFile = await this.exportAsJSON(neuralExport);
            exportedFiles.push(jsonFile);
            // Training data CSV for analysis
            if (this.config.exportFormat === 'csv' || this.config.includeMetadata) {
                const csvFile = await this.exportAsCSV(trainingDataset);
                exportedFiles.push(csvFile);
            }
            // Claude-flow neural configuration
            const configFile = await this.exportNeuralConfig(neuralExport);
            exportedFiles.push(configFile);
            // Pattern summary report
            const summaryFile = await this.exportPatternSummary(statistics, neuralExport);
            exportedFiles.push(summaryFile);
            nld_logger_1.nldLogger.renderSuccess('ClaudeFlowNeuralExporter', 'export-completed', {
                filesExported: exportedFiles.length,
                totalPatterns: statistics.totalSamples,
                outputDirectory: this.config.outputDirectory
            });
            return exportedFiles;
        }
        catch (error) {
            nld_logger_1.nldLogger.renderFailure('ClaudeFlowNeuralExporter', error);
            throw error;
        }
    }
    /**
     * Create neural pattern export structure
     */
    createNeuralPatternExport(trainingDataset, statistics) {
        const inputDimensions = trainingDataset.trainingData.features.length;
        const outputDimensions = trainingDataset.trainingData.labels.length;
        return {
            version: '1.0.0',
            exportTime: new Date(),
            patternType: 'react-hook-side-effect',
            trainingData: trainingDataset,
            metadata: {
                totalPatterns: statistics.totalSamples,
                severityDistribution: statistics.severityDistribution,
                preventionStrategies: trainingDataset.metadata.preventionStrategies,
                qualityMetrics: {
                    dataBalance: this.calculateDataBalance(statistics),
                    featureCoverage: this.calculateFeatureCoverage(trainingDataset),
                    labelConsistency: this.calculateLabelConsistency(trainingDataset)
                }
            },
            claudeFlowConfig: {
                neuralNetworkType: 'classification',
                inputDimensions,
                outputDimensions,
                recommendedArchitecture: [
                    'input-layer',
                    `dense-${inputDimensions * 2}-relu`,
                    `dense-${inputDimensions}-relu`,
                    'dropout-0.3',
                    `dense-${Math.ceil(outputDimensions / 2)}-relu`,
                    `dense-${outputDimensions}-softmax`
                ],
                trainingParameters: {
                    learningRate: 0.001,
                    batchSize: 32,
                    epochs: 100,
                    validationSplit: 0.2,
                    optimizer: 'adam',
                    loss: 'categorical_crossentropy',
                    metrics: ['accuracy', 'precision', 'recall'],
                    earlyStopping: {
                        monitor: 'val_accuracy',
                        patience: 10,
                        minDelta: 0.001
                    }
                }
            }
        };
    }
    /**
     * Export as JSON for claude-flow neural system
     */
    async exportAsJSON(neuralExport) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `react-hook-patterns-${timestamp}.json`;
        const filepath = (0, path_1.join)(this.config.outputDirectory, filename);
        try {
            const jsonData = JSON.stringify(neuralExport, null, 2);
            (0, fs_1.writeFileSync)(filepath, jsonData, 'utf8');
            nld_logger_1.nldLogger.renderSuccess('ClaudeFlowNeuralExporter', 'json-export', {
                filename,
                size: jsonData.length,
                patterns: neuralExport.metadata.totalPatterns
            });
            return filepath;
        }
        catch (error) {
            nld_logger_1.nldLogger.renderFailure('ClaudeFlowNeuralExporter', error, { filepath });
            throw error;
        }
    }
    /**
     * Export training data as CSV
     */
    async exportAsCSV(trainingDataset) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `react-hook-training-data-${timestamp}.csv`;
        const filepath = (0, path_1.join)(this.config.outputDirectory, filename);
        try {
            // Create CSV header
            const inputFeatures = trainingDataset.trainingData.features;
            const outputLabels = trainingDataset.trainingData.labels;
            const header = [...inputFeatures, ...outputLabels].join(',');
            // Create CSV rows
            const rows = trainingDataset.trainingData.inputs.map((input, index) => {
                const output = trainingDataset.trainingData.outputs[index];
                const inputValues = inputFeatures.map((feature) => input[feature] || '');
                const outputValues = outputLabels.map((label) => output[label] || '');
                return [...inputValues, ...outputValues].join(',');
            });
            const csvContent = [header, ...rows].join('\n');
            (0, fs_1.writeFileSync)(filepath, csvContent, 'utf8');
            nld_logger_1.nldLogger.renderSuccess('ClaudeFlowNeuralExporter', 'csv-export', {
                filename,
                rows: rows.length,
                columns: inputFeatures.length + outputLabels.length
            });
            return filepath;
        }
        catch (error) {
            nld_logger_1.nldLogger.renderFailure('ClaudeFlowNeuralExporter', error, { filepath });
            throw error;
        }
    }
    /**
     * Export neural network configuration for claude-flow
     */
    async exportNeuralConfig(neuralExport) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `claude-flow-neural-config-${timestamp}.json`;
        const filepath = (0, path_1.join)(this.config.outputDirectory, filename);
        try {
            const config = {
                patternType: neuralExport.patternType,
                neuralNetwork: neuralExport.claudeFlowConfig,
                integration: {
                    hookName: 'useReactHookPatternDetection',
                    triggerEvents: ['component-render', 'hook-execution', 'state-change'],
                    outputActions: ['prevent-side-effect', 'suggest-refactor', 'add-tdd-test'],
                    confidenceThreshold: 0.75
                },
                deployment: {
                    environment: 'development',
                    enableRealTimeDetection: true,
                    logLevel: 'debug',
                    maxPatternCacheSize: 1000
                }
            };
            (0, fs_1.writeFileSync)(filepath, JSON.stringify(config, null, 2), 'utf8');
            nld_logger_1.nldLogger.renderSuccess('ClaudeFlowNeuralExporter', 'config-export', {
                filename,
                configSections: Object.keys(config).length
            });
            return filepath;
        }
        catch (error) {
            nld_logger_1.nldLogger.renderFailure('ClaudeFlowNeuralExporter', error, { filepath });
            throw error;
        }
    }
    /**
     * Export pattern analysis summary
     */
    async exportPatternSummary(statistics, neuralExport) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `pattern-analysis-summary-${timestamp}.md`;
        const filepath = (0, path_1.join)(this.config.outputDirectory, filename);
        try {
            const summary = `# React Hook Side Effect Pattern Analysis

## Export Summary
- **Export Time**: ${neuralExport.exportTime.toISOString()}
- **Pattern Type**: ${neuralExport.patternType}
- **Total Patterns**: ${statistics.totalSamples}
- **Data Quality Score**: ${(neuralExport.metadata.qualityMetrics.dataBalance * 100).toFixed(1)}%

## Pattern Distribution

### By Severity
${Object.entries(statistics.severityDistribution)
                .map(([severity, count]) => `- **${severity}**: ${count} patterns`)
                .join('\n')}

### By Prevention Strategy
${Object.entries(statistics.preventionStrategyDistribution)
                .map(([strategy, count]) => `- **${strategy}**: ${count} patterns`)
                .join('\n')}

## Neural Network Configuration
- **Architecture**: ${neuralExport.claudeFlowConfig.recommendedArchitecture.join(' → ')}
- **Input Dimensions**: ${neuralExport.claudeFlowConfig.inputDimensions}
- **Output Dimensions**: ${neuralExport.claudeFlowConfig.outputDimensions}
- **Training Parameters**: ${JSON.stringify(neuralExport.claudeFlowConfig.trainingParameters, null, 2)}

## Quality Metrics
- **Data Balance**: ${(neuralExport.metadata.qualityMetrics.dataBalance * 100).toFixed(1)}%
- **Feature Coverage**: ${(neuralExport.metadata.qualityMetrics.featureCoverage * 100).toFixed(1)}%
- **Label Consistency**: ${(neuralExport.metadata.qualityMetrics.labelConsistency * 100).toFixed(1)}%

## Prevention Strategies
${neuralExport.metadata.preventionStrategies
                .map((strategy) => `### ${strategy.name}
- **Description**: ${strategy.description}
- **Implementation**: ${strategy.implementation}
- **TDD Pattern**: ${strategy.tddTestPattern}
- **Effectiveness**: ${(strategy.effectiveness * 100).toFixed(1)}%`)
                .join('\n\n')}

## Integration Instructions

1. **Copy exported files to claude-flow neural directory**
2. **Update claude-flow configuration with neural config**
3. **Train neural network using training data**
4. **Deploy pattern detection in development environment**
5. **Monitor and refine based on real-world patterns**

## Files Exported
- Training Data: \`react-hook-training-data-${timestamp}.csv\`
- Neural Config: \`claude-flow-neural-config-${timestamp}.json\`
- Pattern Export: \`react-hook-patterns-${timestamp}.json\`

Generated by NLD Agent at ${new Date().toISOString()}
`;
            (0, fs_1.writeFileSync)(filepath, summary, 'utf8');
            nld_logger_1.nldLogger.renderSuccess('ClaudeFlowNeuralExporter', 'summary-export', {
                filename,
                sections: 7
            });
            return filepath;
        }
        catch (error) {
            nld_logger_1.nldLogger.renderFailure('ClaudeFlowNeuralExporter', error, { filepath });
            throw error;
        }
    }
    /**
     * Calculate data balance metric
     */
    calculateDataBalance(statistics) {
        const counts = Object.values(statistics.severityDistribution);
        if (counts.length === 0)
            return 0;
        const total = counts.reduce((sum, count) => sum + count, 0);
        const averageCount = total / counts.length;
        // Calculate balance as 1 - coefficient of variation
        const variance = counts.reduce((sum, count) => sum + Math.pow(count - averageCount, 2), 0) / counts.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = averageCount > 0 ? stdDev / averageCount : 0;
        return Math.max(0, 1 - coefficientOfVariation);
    }
    /**
     * Calculate feature coverage metric
     */
    calculateFeatureCoverage(trainingDataset) {
        if (!trainingDataset.trainingData.inputs.length)
            return 0;
        const features = trainingDataset.trainingData.features;
        let coveredFeatures = 0;
        features.forEach((feature) => {
            const hasValidValues = trainingDataset.trainingData.inputs.some((input) => {
                const value = input[feature];
                return value !== null && value !== undefined && value !== '';
            });
            if (hasValidValues)
                coveredFeatures++;
        });
        return features.length > 0 ? coveredFeatures / features.length : 0;
    }
    /**
     * Calculate label consistency metric
     */
    calculateLabelConsistency(trainingDataset) {
        if (!trainingDataset.trainingData.outputs.length)
            return 0;
        // Check for consistent labeling patterns
        let consistentLabels = 0;
        const totalOutputs = trainingDataset.trainingData.outputs.length;
        trainingDataset.trainingData.outputs.forEach((output) => {
            const hasConsistentLabels = output.isPattern !== undefined &&
                output.severity !== undefined &&
                output.patternType !== undefined;
            if (hasConsistentLabels)
                consistentLabels++;
        });
        return totalOutputs > 0 ? consistentLabels / totalOutputs : 0;
    }
    /**
     * Get export statistics
     */
    getExportStatistics() {
        const patterns = react_hook_side_effect_detector_1.reactHookSideEffectDetector.getPatterns();
        return {
            totalPatterns: patterns.length,
            lastExportTime: patterns.length > 0 ? new Date() : null,
            exportDirectory: this.config.outputDirectory
        };
    }
}
exports.ClaudeFlowNeuralExporter = ClaudeFlowNeuralExporter;
/**
 * Global exporter instance
 */
exports.claudeFlowNeuralExporter = new ClaudeFlowNeuralExporter();
//# sourceMappingURL=claude-flow-neural-exporter.js.map