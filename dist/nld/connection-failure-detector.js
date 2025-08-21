"use strict";
/**
 * NLD Connection Failure Pattern Detection System
 * Captures failure patterns and contexts for neural learning
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionFailureDetector = void 0;
const events_1 = require("events");
class ConnectionFailureDetector extends events_1.EventEmitter {
    patterns = new Map();
    activeConnections = new Map();
    networkMonitor;
    patternAnalyzer;
    constructor() {
        super();
        this.networkMonitor = new NetworkMonitor();
        this.patternAnalyzer = new PatternAnalyzer();
        this.setupNetworkMonitoring();
    }
    /**
     * Capture connection failure event
     */
    captureFailure(context) {
        const patternKey = this.generatePatternKey(context);
        // Update or create pattern
        const existingPattern = this.patterns.get(patternKey);
        if (existingPattern) {
            existingPattern.frequency++;
            existingPattern.contexts.push(context);
            existingPattern.lastSeen = Date.now();
            existingPattern.trend = this.calculateTrend(existingPattern);
        }
        else {
            const newPattern = {
                id: this.generatePatternId(),
                pattern: patternKey,
                frequency: 1,
                contexts: [context],
                successfulStrategies: [],
                recommendations: [],
                severity: this.calculateSeverity(context),
                lastSeen: Date.now(),
                trend: 'stable'
            };
            this.patterns.set(patternKey, newPattern);
        }
        // Emit pattern detection event
        this.emit('patternDetected', {
            pattern: this.patterns.get(patternKey),
            context
        });
        // Store for neural training
        this.storeForNeuralTraining(context, this.patterns.get(patternKey));
    }
    /**
     * Capture successful recovery
     */
    captureRecovery(connectionId, recoveryContext) {
        const attempts = this.activeConnections.get(connectionId);
        if (attempts && attempts.length > 0) {
            const lastAttempt = attempts[attempts.length - 1];
            const patternKey = this.generatePatternKeyFromAttempt(lastAttempt);
            const pattern = this.patterns.get(patternKey);
            if (pattern) {
                pattern.successfulStrategies.push(lastAttempt.strategy);
                pattern.recommendations = this.generateRecommendations(pattern);
                this.emit('recoveryLearned', {
                    pattern,
                    recoveryContext,
                    strategy: lastAttempt.strategy
                });
            }
        }
    }
    /**
     * Get adaptive retry strategy based on learned patterns
     */
    getAdaptiveStrategy(context) {
        const patternKey = this.generatePatternKey(context);
        const pattern = this.patterns.get(patternKey);
        if (pattern && pattern.successfulStrategies.length > 0) {
            // Return most successful strategy
            return this.selectBestStrategy(pattern.successfulStrategies);
        }
        // Return default adaptive strategy based on network conditions
        return this.getDefaultStrategy(context.networkConditions);
    }
    /**
     * Get intelligent troubleshooting suggestions
     */
    getTroubleshootingSuggestions(context) {
        const suggestions = [];
        // Network-based suggestions
        if (context.networkConditions.latency && context.networkConditions.latency > 1000) {
            suggestions.push('High latency detected. Consider increasing timeout values.');
        }
        if (context.networkConditions.connectionType === 'slow-2g') {
            suggestions.push('Slow network detected. Switch to polling transport.');
        }
        // Error-specific suggestions
        switch (context.errorDetails.type) {
            case 'timeout':
                suggestions.push('Configure exponential backoff with jitter for timeout errors.');
                break;
            case 'network':
                suggestions.push('Implement progressive fallback: WebSocket → SSE → Polling.');
                break;
            case 'protocol':
                suggestions.push('Check WebSocket upgrade headers and protocol compatibility.');
                break;
            case 'auth':
                suggestions.push('Verify authentication tokens and refresh mechanisms.');
                break;
        }
        // Pattern-based suggestions
        const patternKey = this.generatePatternKey(context);
        const pattern = this.patterns.get(patternKey);
        if (pattern) {
            suggestions.push(...pattern.recommendations);
        }
        return suggestions;
    }
    /**
     * Get connection performance metrics
     */
    getPerformanceMetrics() {
        const totalFailures = Array.from(this.patterns.values())
            .reduce((sum, pattern) => sum + pattern.frequency, 0);
        const criticalPatterns = Array.from(this.patterns.values())
            .filter(p => p.severity === 'critical').length;
        const trendsIncreasing = Array.from(this.patterns.values())
            .filter(p => p.trend === 'increasing').length;
        return {
            totalFailures,
            uniquePatterns: this.patterns.size,
            criticalPatterns,
            trendsIncreasing,
            networkConditions: this.networkMonitor.getCurrentConditions(),
            lastAnalysis: Date.now()
        };
    }
    setupNetworkMonitoring() {
        this.networkMonitor.on('conditionChange', (conditions) => {
            this.emit('networkConditionChange', conditions);
        });
    }
    generatePatternKey(context) {
        return `${context.connectionType}_${context.errorDetails.type}_${context.networkConditions.connectionType}`;
    }
    generatePatternKeyFromAttempt(attempt) {
        return `attempt_${attempt.strategy.type}_${attempt.error?.type || 'unknown'}`;
    }
    generatePatternId() {
        return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    calculateSeverity(context) {
        if (context.attemptHistory.length > 5)
            return 'critical';
        if (context.errorDetails.type === 'auth')
            return 'high';
        if (context.networkConditions.connectionType === 'slow-2g')
            return 'medium';
        return 'low';
    }
    calculateTrend(pattern) {
        const recentContexts = pattern.contexts.slice(-10);
        if (recentContexts.length < 3)
            return 'stable';
        const recent = recentContexts.slice(-3).length;
        const older = recentContexts.slice(-6, -3).length;
        if (recent > older * 1.5)
            return 'increasing';
        if (recent < older * 0.5)
            return 'decreasing';
        return 'stable';
    }
    selectBestStrategy(strategies) {
        // Implement strategy selection based on success rates
        return strategies[0]; // Simplified
    }
    getDefaultStrategy(conditions) {
        if (!conditions) {
            return {
                type: 'exponential-backoff',
                baseDelay: 1000,
                maxDelay: 30000,
                jitter: true,
                maxAttempts: 5
            };
        }
        switch (conditions.connectionType) {
            case 'slow-2g':
            case '2g':
                return {
                    type: 'linear-backoff',
                    baseDelay: 5000,
                    maxDelay: 60000,
                    jitter: true,
                    maxAttempts: 3
                };
            default:
                return {
                    type: 'exponential-backoff',
                    baseDelay: 1000,
                    maxDelay: 30000,
                    jitter: true,
                    maxAttempts: 5
                };
        }
    }
    generateRecommendations(pattern) {
        const recommendations = [];
        if (pattern.severity === 'critical') {
            recommendations.push('Critical pattern detected. Consider circuit breaker implementation.');
        }
        if (pattern.trend === 'increasing') {
            recommendations.push('Increasing failure trend. Review infrastructure capacity.');
        }
        return recommendations;
    }
    storeForNeuralTraining(context, pattern) {
        // Store data for neural network training
        this.emit('neuralTrainingData', {
            type: 'connection_failure',
            context,
            pattern,
            timestamp: Date.now()
        });
    }
}
exports.ConnectionFailureDetector = ConnectionFailureDetector;
// Supporting classes
class NetworkMonitor extends events_1.EventEmitter {
    getCurrentConditions() {
        // Implementation would monitor actual network conditions
        return {
            connectionType: 'wifi',
            isOnline: navigator.onLine
        };
    }
}
class PatternAnalyzer {
}
//# sourceMappingURL=connection-failure-detector.js.map