"use strict";
/**
 * Neural Pattern Trainer
 * Trains neural networks to recognize UI-functionality coupling patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.neuralPatternTrainer = exports.NeuralPatternTrainer = void 0;
const events_1 = require("events");
class NeuralPatternTrainer extends events_1.EventEmitter {
    trainingData = [];
    neuralWeights = new Map();
    featureImportance = new Map();
    accuracyHistory = [];
    lastTrainingTime = 0;
    patternBuffer = [];
    trainingInterval = null;
    constructor() {
        super();
        this.initializeWeights();
        this.setupPeriodicTraining();
        console.log('[NLD] Neural Pattern Trainer initialized');
    }
    initializeWeights() {
        // Initialize neural network weights for pattern recognition
        const features = [
            'domChanges',
            'cssChanges',
            'componentUpdates',
            'styleModifications',
            'buttonHandlerIntact',
            'sseStreamingActive',
            'componentStateConsistent',
            'performanceWithinBudget',
            'timeOfDay',
            'userActivity',
            'systemLoad',
            'previousRegressions'
        ];
        features.forEach(feature => {
            this.neuralWeights.set(feature, Math.random() * 0.1 - 0.05); // Small random weights
            this.featureImportance.set(feature, 0);
        });
        // Set initial importance based on domain knowledge
        this.featureImportance.set('buttonHandlerIntact', 0.9);
        this.featureImportance.set('sseStreamingActive', 0.85);
        this.featureImportance.set('componentStateConsistent', 0.8);
        this.featureImportance.set('domChanges', 0.7);
        this.featureImportance.set('cssChanges', 0.6);
        console.log('[NLD] Neural weights initialized');
    }
    setupPeriodicTraining() {
        // Retrain the model every 10 minutes with accumulated patterns
        this.trainingInterval = setInterval(() => {
            if (this.patternBuffer.length >= 10) {
                this.trainOnPatterns();
            }
        }, 600000); // 10 minutes
        console.log('[NLD] Periodic neural training established');
    }
    captureUIFunctionalityPattern(uiChanges, functionalityState, outcome, severity = 0, recoveryTime = 0) {
        const pattern = {
            id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            patternType: outcome === 'SUCCESS' ? 'UI_CHANGE' :
                outcome === 'RECOVERY' ? 'RECOVERY_SUCCESS' : 'FUNCTIONALITY_BREAK',
            timestamp: Date.now(),
            features: {
                ...uiChanges,
                ...functionalityState,
                timeOfDay: new Date().getHours(),
                userActivity: this.estimateUserActivity(),
                systemLoad: this.estimateSystemLoad(),
                previousRegressions: this.countRecentRegressions()
            },
            outcome,
            severity,
            recoveryTime
        };
        this.patternBuffer.push(pattern);
        this.trainingData.push(pattern);
        // Keep only last 1000 patterns
        if (this.trainingData.length > 1000) {
            this.trainingData = this.trainingData.slice(-1000);
        }
        console.log(`[NLD] Captured UI-functionality pattern: ${outcome} (severity: ${severity})`);
        this.emit('pattern-captured', pattern);
        // Trigger immediate training if we have enough critical patterns
        if (outcome === 'REGRESSION' && severity > 0.7) {
            this.scheduleImmediateTraining();
        }
        return pattern.id;
    }
    predictRegressionRisk(plannedChanges, currentState) {
        const features = {
            ...plannedChanges,
            ...currentState,
            timeOfDay: new Date().getHours(),
            userActivity: this.estimateUserActivity(),
            systemLoad: this.estimateSystemLoad(),
            previousRegressions: this.countRecentRegressions()
        };
        // Calculate regression probability using neural network
        const probability = this.calculateRegressionProbability(features);
        const confidence = this.calculateConfidence(features);
        // Predict specific issues
        const predictedIssues = this.predictSpecificIssues(features, probability);
        // Generate recommendations
        const recommendedActions = this.generateRecommendations(features, probability, predictedIssues);
        // Determine risk level
        const riskLevel = this.determineRiskLevel(probability, confidence);
        const prediction = {
            regressionProbability: probability,
            confidenceScore: confidence,
            predictedIssues,
            recommendedActions,
            riskLevel
        };
        console.log(`[NLD] Regression risk prediction: ${(probability * 100).toFixed(1)}% (${riskLevel})`);
        this.emit('prediction-made', prediction);
        return prediction;
    }
    calculateRegressionProbability(features) {
        let probability = 0;
        let totalWeight = 0;
        // Simple neural network forward pass
        Object.entries(features).forEach(([key, value]) => {
            const weight = this.neuralWeights.get(key) || 0;
            const importance = this.featureImportance.get(key) || 0;
            let normalizedValue;
            if (typeof value === 'boolean') {
                normalizedValue = value ? 1 : 0;
            }
            else if (typeof value === 'number') {
                // Normalize numeric values
                normalizedValue = Math.min(1, Math.max(0, value / 10));
            }
            else {
                normalizedValue = 0;
            }
            probability += weight * normalizedValue * importance;
            totalWeight += importance;
        });
        // Apply sigmoid activation
        const rawProbability = totalWeight > 0 ? probability / totalWeight : 0;
        return 1 / (1 + Math.exp(-rawProbability));
    }
    calculateConfidence(features) {
        // Calculate confidence based on how well our training data covers this scenario
        const similarPatterns = this.findSimilarPatterns(features);
        const coverageScore = Math.min(1, similarPatterns.length / 10); // At least 10 similar patterns for high confidence
        // Factor in recent accuracy
        const recentAccuracy = this.accuracyHistory.slice(-10);
        const accuracyScore = recentAccuracy.length > 0
            ? recentAccuracy.reduce((sum, acc) => sum + acc, 0) / recentAccuracy.length
            : 0.5;
        return (coverageScore + accuracyScore) / 2;
    }
    findSimilarPatterns(features) {
        return this.trainingData.filter(pattern => {
            let similarity = 0;
            let comparisons = 0;
            Object.entries(features).forEach(([key, value]) => {
                const patternValue = pattern.features[key];
                if (patternValue !== undefined) {
                    if (typeof value === 'boolean' && typeof patternValue === 'boolean') {
                        similarity += value === patternValue ? 1 : 0;
                    }
                    else if (typeof value === 'number' && typeof patternValue === 'number') {
                        const difference = Math.abs(value - patternValue);
                        similarity += Math.max(0, 1 - difference / 10); // Assume max difference of 10
                    }
                    comparisons++;
                }
            });
            return comparisons > 0 ? (similarity / comparisons) > 0.8 : false;
        });
    }
    predictSpecificIssues(features, probability) {
        const issues = [];
        // Rule-based prediction for specific issues
        if (!features.buttonHandlerIntact && probability > 0.3) {
            issues.push('Button handlers may break');
        }
        if (!features.sseStreamingActive && probability > 0.4) {
            issues.push('SSE streaming may be disrupted');
        }
        if (!features.componentStateConsistent && probability > 0.3) {
            issues.push('Component state synchronization issues likely');
        }
        if (!features.performanceWithinBudget && probability > 0.5) {
            issues.push('Performance degradation expected');
        }
        if (features.domChanges > 5 && probability > 0.6) {
            issues.push('Extensive DOM changes may break functionality');
        }
        if (features.cssChanges > 10 && probability > 0.4) {
            issues.push('CSS changes may affect UI behavior');
        }
        if (features.previousRegressions > 2 && probability > 0.3) {
            issues.push('History of regressions suggests instability');
        }
        return issues;
    }
    generateRecommendations(features, probability, issues) {
        const recommendations = [];
        if (probability > 0.7) {
            recommendations.push('HIGH RISK: Consider postponing UI changes');
            recommendations.push('Run comprehensive regression tests before deployment');
        }
        if (probability > 0.5) {
            recommendations.push('Implement gradual rollout with monitoring');
            recommendations.push('Prepare rollback procedures');
        }
        if (issues.includes('Button handlers may break')) {
            recommendations.push('Validate all button handlers before UI changes');
            recommendations.push('Test Claude instance creation functionality');
        }
        if (issues.includes('SSE streaming may be disrupted')) {
            recommendations.push('Verify SSE connection stability during changes');
            recommendations.push('Test terminal streaming functionality');
        }
        if (issues.includes('Component state synchronization issues likely')) {
            recommendations.push('Review state management patterns');
            recommendations.push('Test component lifecycle methods');
        }
        if (features.previousRegressions > 1) {
            recommendations.push('Address root causes of previous regressions');
            recommendations.push('Implement stronger testing protocols');
        }
        if (recommendations.length === 0) {
            recommendations.push('Low risk: Proceed with normal testing protocols');
        }
        return recommendations;
    }
    determineRiskLevel(probability, confidence) {
        // Adjust risk level based on both probability and confidence
        const adjustedRisk = probability * confidence;
        if (adjustedRisk > 0.8)
            return 'CRITICAL';
        if (adjustedRisk > 0.6)
            return 'HIGH';
        if (adjustedRisk > 0.3)
            return 'MEDIUM';
        return 'LOW';
    }
    scheduleImmediateTraining() {
        // Schedule training in the next tick to avoid blocking
        setTimeout(() => {
            this.trainOnPatterns();
        }, 0);
    }
    trainOnPatterns() {
        if (this.patternBuffer.length === 0)
            return;
        console.log(`[NLD] Training neural network on ${this.patternBuffer.length} new patterns`);
        const startTime = Date.now();
        // Simple backpropagation training
        this.patternBuffer.forEach(pattern => {
            const prediction = this.calculateRegressionProbability(pattern.features);
            const actualOutcome = pattern.outcome === 'REGRESSION' || pattern.outcome === 'PARTIAL_REGRESSION' ? 1 : 0;
            const error = actualOutcome - prediction;
            const learningRate = 0.01;
            // Update weights based on error
            Object.entries(pattern.features).forEach(([key, value]) => {
                const currentWeight = this.neuralWeights.get(key) || 0;
                const importance = this.featureImportance.get(key) || 0;
                let normalizedValue;
                if (typeof value === 'boolean') {
                    normalizedValue = value ? 1 : 0;
                }
                else if (typeof value === 'number') {
                    normalizedValue = Math.min(1, Math.max(0, value / 10));
                }
                else {
                    normalizedValue = 0;
                }
                const weightUpdate = learningRate * error * normalizedValue * importance;
                this.neuralWeights.set(key, currentWeight + weightUpdate);
            });
        });
        // Calculate training accuracy
        const accuracy = this.calculateTrainingAccuracy();
        this.accuracyHistory.push(accuracy);
        // Keep only last 50 accuracy scores
        if (this.accuracyHistory.length > 50) {
            this.accuracyHistory = this.accuracyHistory.slice(-50);
        }
        this.lastTrainingTime = Date.now();
        const trainingDuration = Date.now() - startTime;
        console.log(`[NLD] Neural training completed: ${accuracy.toFixed(3)} accuracy (${trainingDuration}ms)`);
        // Clear pattern buffer
        this.patternBuffer = [];
        this.emit('training-complete', {
            accuracy,
            trainingDuration,
            patternsProcessed: this.patternBuffer.length
        });
    }
    calculateTrainingAccuracy() {
        if (this.trainingData.length === 0)
            return 0;
        let correctPredictions = 0;
        const testPatterns = this.trainingData.slice(-100); // Test on last 100 patterns
        testPatterns.forEach(pattern => {
            const prediction = this.calculateRegressionProbability(pattern.features);
            const actualOutcome = pattern.outcome === 'REGRESSION' || pattern.outcome === 'PARTIAL_REGRESSION' ? 1 : 0;
            // Consider prediction correct if within 0.3 threshold
            if (Math.abs(prediction - actualOutcome) < 0.3) {
                correctPredictions++;
            }
        });
        return testPatterns.length > 0 ? correctPredictions / testPatterns.length : 0;
    }
    estimateUserActivity() {
        // Simple heuristic based on recent events
        const recentEvents = this.trainingData.filter(p => Date.now() - p.timestamp < 300000); // 5 minutes
        return Math.min(10, recentEvents.length);
    }
    estimateSystemLoad() {
        // Simple heuristic based on performance
        if ('memory' in performance) {
            const memory = performance.memory;
            return Math.min(10, memory.usedJSHeapSize / (10 * 1024 * 1024)); // Normalize to 10MB chunks
        }
        return 5; // Default moderate load
    }
    countRecentRegressions() {
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        return this.trainingData.filter(p => p.timestamp > oneWeekAgo &&
            (p.outcome === 'REGRESSION' || p.outcome === 'PARTIAL_REGRESSION')).length;
    }
    exportTrainingData() {
        const regressionPatterns = this.trainingData.filter(p => p.outcome === 'REGRESSION' || p.outcome === 'PARTIAL_REGRESSION');
        const successPatterns = this.trainingData.filter(p => p.outcome === 'SUCCESS');
        const currentAccuracy = this.accuracyHistory.length > 0
            ? this.accuracyHistory[this.accuracyHistory.length - 1]
            : 0;
        return {
            patterns: [...this.trainingData],
            metadata: {
                totalPatterns: this.trainingData.length,
                successPatterns: successPatterns.length,
                regressionPatterns: regressionPatterns.length,
                accuracyScore: currentAccuracy,
                lastTraining: this.lastTrainingTime
            }
        };
    }
    generateNeuralReport() {
        const trainingData = this.exportTrainingData();
        const recentAccuracy = this.accuracyHistory.slice(-5);
        const avgAccuracy = recentAccuracy.length > 0
            ? recentAccuracy.reduce((sum, acc) => sum + acc, 0) / recentAccuracy.length
            : 0;
        const topFeatures = Array.from(this.featureImportance.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        return `
Neural Pattern Training Report
=============================

Training Data Summary:
- Total Patterns: ${trainingData.metadata.totalPatterns}
- Success Patterns: ${trainingData.metadata.successPatterns}
- Regression Patterns: ${trainingData.metadata.regressionPatterns}
- Success Rate: ${trainingData.metadata.totalPatterns > 0 ?
            (trainingData.metadata.successPatterns / trainingData.metadata.totalPatterns * 100).toFixed(1) : 0}%

Neural Network Performance:
- Current Accuracy: ${(trainingData.metadata.accuracyScore * 100).toFixed(1)}%
- Average Recent Accuracy: ${(avgAccuracy * 100).toFixed(1)}%
- Last Training: ${new Date(trainingData.metadata.lastTraining).toLocaleString()}
- Training History Length: ${this.accuracyHistory.length}

Most Important Features:
${topFeatures.map((feature, index) => `${index + 1}. ${feature[0]}: ${(feature[1] * 100).toFixed(1)}% importance`).join('\n')}

Neural Weights Sample:
${Array.from(this.neuralWeights.entries()).slice(0, 5).map(([key, weight]) => `- ${key}: ${weight.toFixed(4)}`).join('\n')}

Pattern Buffer: ${this.patternBuffer.length} patterns awaiting training

Training Recommendations:
${this.generateTrainingRecommendations()}
`;
    }
    generateTrainingRecommendations() {
        const recommendations = [];
        const accuracy = this.accuracyHistory.length > 0 ? this.accuracyHistory[this.accuracyHistory.length - 1] : 0;
        if (accuracy < 0.7) {
            recommendations.push('- Model accuracy below 70%, collect more training data');
        }
        if (this.trainingData.length < 100) {
            recommendations.push('- Insufficient training data, continue monitoring for more patterns');
        }
        if (this.patternBuffer.length > 20) {
            recommendations.push('- Large pattern buffer, consider more frequent training');
        }
        const regressionRate = this.countRecentRegressions() / Math.max(1, this.trainingData.length);
        if (regressionRate > 0.3) {
            recommendations.push('- High regression rate detected, review UI change processes');
        }
        if (recommendations.length === 0) {
            recommendations.push('✅ Neural network training parameters optimal');
        }
        return recommendations.join('\n');
    }
    destroy() {
        // Stop periodic training
        if (this.trainingInterval) {
            clearInterval(this.trainingInterval);
            this.trainingInterval = null;
        }
        // Clear data
        this.trainingData = [];
        this.patternBuffer = [];
        this.neuralWeights.clear();
        this.featureImportance.clear();
        this.accuracyHistory = [];
        // Remove event listeners
        this.removeAllListeners();
        console.log('[NLD] Neural Pattern Trainer destroyed');
    }
}
exports.NeuralPatternTrainer = NeuralPatternTrainer;
exports.neuralPatternTrainer = new NeuralPatternTrainer();
//# sourceMappingURL=neural-pattern-trainer.js.map