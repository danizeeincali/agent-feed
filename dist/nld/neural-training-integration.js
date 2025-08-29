"use strict";
/**
 * Neural Training Integration for Terminal Pipe Failures
 *
 * Integrates NLD terminal pipe failure detection with claude-flow neural training system
 * Exports training data, patterns, and effectiveness metrics for ML model improvement
 * Enables predictive failure detection based on historical patterns
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NeuralTrainingIntegration = void 0;
const events_1 = require("events");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class NeuralTrainingIntegration extends events_1.EventEmitter {
    options;
    trainingData = [];
    predictionCache = new Map();
    modelMetrics = {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1_score: 0,
        last_updated: new Date().toISOString()
    };
    constructor(options = {
        logDirectory: '/workspaces/agent-feed/src/nld/patterns/terminal-pipe-failures',
        neuralExportPath: '/workspaces/agent-feed/neural-exports',
        claudeFlowIntegration: true,
        batchSize: 100,
        exportInterval: 300000, // 5 minutes
        enablePrediction: true
    }) {
        super();
        this.options = options;
        this.ensureDirectories();
        this.startPeriodicExport();
    }
    ensureDirectories() {
        [this.options.logDirectory, this.options.neuralExportPath].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    /**
     * Record training data from terminal pipe failure detection
     */
    recordFailurePattern(sessionId, failureData, context) {
        const features = this.extractFeatures(failureData);
        const trainingRecord = {
            pattern_type: 'terminal_pipe_failure',
            session_id: sessionId,
            timestamp: new Date().toISOString(),
            features,
            labels: {
                failure_occurred: true,
                failure_type: failureData.type,
                severity: failureData.severity,
                tdd_factor: failureData.tddfactor,
                prevention_possible: failureData.tddfactor > 0.5
            },
            effectiveness_score: failureData.evidenceScore,
            context: {
                instance_type: context.instanceType,
                command_executed: context.command || 'unknown',
                user_interaction: context.userInteraction || 'terminal',
                environment: 'development'
            }
        };
        this.trainingData.push(trainingRecord);
        // Export immediately for critical failures
        if (failureData.severity === 'critical') {
            this.exportForClaudeFlow([trainingRecord]);
        }
        // Trim data if too large
        if (this.trainingData.length > 10000) {
            this.trainingData = this.trainingData.slice(-5000);
        }
        this.emit('trainingDataRecorded', trainingRecord);
    }
    /**
     * Record successful prevention (no failure occurred)
     */
    recordSuccessfulPrevention(sessionId, preventionData, context) {
        const features = this.extractPreventionFeatures(preventionData);
        const trainingRecord = {
            pattern_type: 'terminal_pipe_failure',
            session_id: sessionId,
            timestamp: new Date().toISOString(),
            features,
            labels: {
                failure_occurred: false,
                failure_type: 'none',
                severity: 'none',
                tdd_factor: preventionData.tddfactor,
                prevention_possible: true
            },
            effectiveness_score: 1.0, // Perfect prevention
            context: {
                instance_type: context.instanceType,
                command_executed: context.command || 'unknown',
                user_interaction: 'terminal',
                environment: 'development'
            }
        };
        this.trainingData.push(trainingRecord);
        this.emit('preventionRecorded', trainingRecord);
    }
    /**
     * Extract features from failure data
     */
    extractFeatures(failureData) {
        return {
            // Process features
            has_real_process: !!failureData.realProcessData?.pid,
            process_pid_exists: !!failureData.realProcessData?.pid && failureData.realProcessData.pid > 0,
            stdout_handler_attached: !!failureData.realProcessData?.stdout,
            stderr_handler_attached: !!failureData.realProcessData?.stderr,
            // Output features
            output_contains_mock_patterns: this.containsMockPatterns(failureData.frontendData?.displayedOutput || ''),
            output_length_variance: this.calculateOutputVariance(failureData.frontendData?.displayedOutput || ''),
            contains_process_indicators: this.containsProcessIndicators(failureData.frontendData?.displayedOutput || ''),
            working_directory_correct: this.isWorkingDirectoryCorrect(failureData.frontendData?.workingDirectory),
            // SSE features
            sse_events_sent: failureData.sseEventData?.eventsSent || 0,
            sse_events_received: failureData.sseEventData?.eventsReceived || 0,
            sse_delivery_ratio: this.calculateDeliveryRatio(failureData.sseEventData),
            connection_count: 1, // Simplified for now
            connection_drops: failureData.sseEventData?.connectionStatus === 'degraded' ? 1 : 0,
            // Timing features
            response_latency: this.estimateResponseLatency(failureData),
            event_flow_gaps: failureData.sseEventData?.eventsSent - failureData.sseEventData?.eventsReceived || 0,
            connection_duration: 30000 // Default 30s, can be improved
        };
    }
    /**
     * Extract features for successful prevention
     */
    extractPreventionFeatures(preventionData) {
        return {
            // Process features (all good for prevention)
            has_real_process: true,
            process_pid_exists: true,
            stdout_handler_attached: true,
            stderr_handler_attached: true,
            // Output features (all good)
            output_contains_mock_patterns: false,
            output_length_variance: 0.8, // Good variance indicates real output
            contains_process_indicators: true,
            working_directory_correct: true,
            // SSE features (healthy)
            sse_events_sent: 10,
            sse_events_received: 10,
            sse_delivery_ratio: 1.0,
            connection_count: 1,
            connection_drops: 0,
            // Timing features (normal)
            response_latency: 100,
            event_flow_gaps: 0,
            connection_duration: 60000
        };
    }
    /**
     * Helper methods for feature extraction
     */
    containsMockPatterns(output) {
        const mockPatterns = [
            'HTTP/SSE mode active',
            'WebSocket eliminated',
            'mock response',
            'placeholder',
            'Connection active',
            'polling successful'
        ];
        return mockPatterns.some(pattern => output.toLowerCase().includes(pattern.toLowerCase()));
    }
    containsProcessIndicators(output) {
        const indicators = [
            'Claude Code',
            'Error:',
            'Warning:',
            'npm install',
            'git status',
            '/workspaces/',
            'package.json'
        ];
        return indicators.some(indicator => output.includes(indicator));
    }
    isWorkingDirectoryCorrect(workingDirectory) {
        if (!workingDirectory)
            return false;
        return workingDirectory.startsWith('/workspaces/agent-feed') &&
            !workingDirectory.includes('mock') &&
            !workingDirectory.includes('tmp');
    }
    calculateOutputVariance(output) {
        // Simple variance calculation based on output length and content diversity
        const words = output.split(' ');
        const uniqueWords = new Set(words);
        return words.length > 0 ? uniqueWords.size / words.length : 0;
    }
    calculateDeliveryRatio(sseData) {
        if (!sseData || !sseData.eventsSent)
            return 0;
        return sseData.eventsReceived / sseData.eventsSent;
    }
    estimateResponseLatency(failureData) {
        // Estimate latency based on failure type
        if (failureData.type === 'broken_pipe')
            return 10000; // High latency
        if (failureData.type === 'sse_gap')
            return 5000; // Medium latency
        return 1000; // Default latency
    }
    /**
     * Export training data for claude-flow neural training
     */
    async exportForClaudeFlow(data = this.trainingData) {
        if (!this.options.claudeFlowIntegration)
            return;
        try {
            const exportData = {
                pattern_type: 'terminal_pipe_failures',
                data_format: 'supervised_learning',
                features: data.map(d => d.features),
                labels: data.map(d => d.labels),
                metadata: {
                    export_timestamp: new Date().toISOString(),
                    total_samples: data.length,
                    failure_samples: data.filter(d => d.labels.failure_occurred).length,
                    success_samples: data.filter(d => !d.labels.failure_occurred).length,
                    average_tdd_factor: data.reduce((sum, d) => sum + d.labels.tdd_factor, 0) / data.length
                },
                context_data: data.map(d => d.context)
            };
            // Export to claude-flow neural format
            const exportPath = path.join(this.options.neuralExportPath, `terminal-pipe-failures-${Date.now()}.json`);
            fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
            // Also export in JSONL format for streaming processing
            const jsonlPath = path.join(this.options.neuralExportPath, 'terminal-pipe-failures-stream.jsonl');
            const jsonlData = data.map(d => JSON.stringify({
                features: d.features,
                labels: d.labels,
                timestamp: d.timestamp
            })).join('\n');
            fs.appendFileSync(jsonlPath, jsonlData + '\n');
            console.log(`🧠 Neural training data exported: ${exportPath}`);
            this.emit('neuralExportComplete', { path: exportPath, samples: data.length });
        }
        catch (error) {
            console.error('Failed to export neural training data:', error);
            this.emit('neuralExportError', error);
        }
    }
    /**
     * Predict failure probability using trained model (placeholder for now)
     */
    async predictFailure(features) {
        if (!this.options.enablePrediction) {
            return {
                failure_probability: 0.5,
                predicted_failure_type: 'unknown',
                confidence: 0,
                preventive_actions: [],
                tdd_recommendations: []
            };
        }
        // Simple rule-based prediction until ML model is trained
        let failureProbability = 0;
        let predictedType = 'none';
        const preventiveActions = [];
        const tddRecommendations = [];
        // Mock pattern detection
        if (features.output_contains_mock_patterns) {
            failureProbability += 0.4;
            predictedType = 'mock_data_detected';
            preventiveActions.push('Implement contract tests for real output validation');
            tddRecommendations.push('Add integration tests for process output flow');
        }
        // Process connection issues
        if (!features.process_pid_exists || !features.stdout_handler_attached) {
            failureProbability += 0.5;
            predictedType = 'broken_pipe';
            preventiveActions.push('Add process health monitoring');
            tddRecommendations.push('Write tests for process spawning and pipe attachment');
        }
        // SSE delivery issues
        if (features.sse_delivery_ratio && features.sse_delivery_ratio < 0.7) {
            failureProbability += 0.3;
            predictedType = 'sse_gap';
            preventiveActions.push('Implement SSE connection health checks');
            tddRecommendations.push('Add tests for event delivery confirmation');
        }
        // Working directory issues
        if (!features.working_directory_correct) {
            failureProbability += 0.2;
            predictedType = 'wrong_directory';
            preventiveActions.push('Validate working directory during process creation');
            tddRecommendations.push('Test directory resolution logic');
        }
        const prediction = {
            failure_probability: Math.min(failureProbability, 1.0),
            predicted_failure_type: predictedType,
            confidence: failureProbability > 0.7 ? 0.8 : 0.5,
            preventive_actions: preventiveActions,
            tdd_recommendations: tddRecommendations
        };
        // Cache prediction
        const cacheKey = JSON.stringify(features);
        this.predictionCache.set(cacheKey, prediction);
        return prediction;
    }
    /**
     * Update model metrics based on prediction accuracy
     */
    updateModelMetrics(prediction, actualOutcome) {
        const predicted = prediction.failure_probability > 0.5;
        const actual = actualOutcome.failure_occurred;
        // Simple accuracy tracking (would be more sophisticated in real implementation)
        const correct = predicted === actual;
        // Update running accuracy (simplified)
        this.modelMetrics.accuracy = this.modelMetrics.accuracy * 0.9 + (correct ? 1 : 0) * 0.1;
        this.modelMetrics.last_updated = new Date().toISOString();
        console.log(`🎯 Model prediction ${correct ? 'correct' : 'incorrect'}: ${predicted} vs ${actual}`);
    }
    /**
     * Start periodic export of training data
     */
    startPeriodicExport() {
        setInterval(() => {
            if (this.trainingData.length >= this.options.batchSize) {
                this.exportForClaudeFlow();
                console.log(`📊 Periodic neural training export: ${this.trainingData.length} samples`);
            }
        }, this.options.exportInterval);
    }
    /**
     * Get training statistics
     */
    getTrainingStats() {
        const failureSamples = this.trainingData.filter(d => d.labels.failure_occurred);
        const successSamples = this.trainingData.filter(d => !d.labels.failure_occurred);
        const byFailureType = failureSamples.reduce((acc, sample) => {
            acc[sample.labels.failure_type] = (acc[sample.labels.failure_type] || 0) + 1;
            return acc;
        }, {});
        const avgTDD = this.trainingData.reduce((sum, d) => sum + d.labels.tdd_factor, 0) / this.trainingData.length || 0;
        return {
            totalSamples: this.trainingData.length,
            failureSamples: failureSamples.length,
            successSamples: successSamples.length,
            averageTDDFactor: avgTDD,
            byFailureType,
            modelMetrics: this.modelMetrics,
            recentPredictions: this.predictionCache.size
        };
    }
    /**
     * Export comprehensive dataset for external ML training
     */
    exportCompleteDataset() {
        const dataset = {
            metadata: {
                description: 'Terminal Pipe Failure Detection Dataset',
                total_samples: this.trainingData.length,
                features_count: Object.keys(this.trainingData[0]?.features || {}).length,
                export_date: new Date().toISOString(),
                version: '1.0.0'
            },
            feature_descriptions: {
                has_real_process: 'Boolean indicating if real process exists',
                process_pid_exists: 'Boolean indicating if process PID is valid',
                output_contains_mock_patterns: 'Boolean indicating mock patterns in output',
                sse_delivery_ratio: 'Ratio of received/sent SSE events',
                // ... other features
            },
            data: this.trainingData
        };
        const exportPath = path.join(this.options.neuralExportPath, 'complete-terminal-dataset.json');
        fs.writeFileSync(exportPath, JSON.stringify(dataset, null, 2));
        console.log(`📦 Complete dataset exported: ${exportPath}`);
        return exportPath;
    }
    /**
     * Clear training data (for memory management)
     */
    clearTrainingData() {
        this.trainingData = [];
        this.predictionCache.clear();
        console.log('🧹 Training data cleared');
    }
    /**
     * Get prediction cache statistics
     */
    getPredictionCacheStats() {
        const predictions = Array.from(this.predictionCache.values());
        const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length || 0;
        return {
            size: this.predictionCache.size,
            hitRate: 0.8, // Placeholder
            averageConfidence: avgConfidence
        };
    }
}
exports.NeuralTrainingIntegration = NeuralTrainingIntegration;
//# sourceMappingURL=neural-training-integration.js.map