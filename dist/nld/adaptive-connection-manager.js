"use strict";
/**
 * NLD Adaptive Connection Manager
 * Implements intelligent connection strategies based on learned patterns
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdaptiveConnectionManager = void 0;
const events_1 = require("events");
const connection_failure_detector_1 = require("./connection-failure-detector");
const learning_database_1 = require("./learning-database");
class AdaptiveConnectionManager extends events_1.EventEmitter {
    failureDetector;
    learningDatabase;
    activeConnections = new Map();
    connectionHealth = new Map();
    circuitBreakers = new Map();
    config;
    constructor(config) {
        super();
        this.config = config;
        this.failureDetector = new connection_failure_detector_1.ConnectionFailureDetector();
        this.learningDatabase = new learning_database_1.ConnectionLearningDatabase();
        this.setupEventHandlers();
        this.initializeCircuitBreakers();
    }
    /**
     * Establish connection with adaptive strategy
     */
    async connect(endpoint, options = {}) {
        const connectionId = this.generateConnectionId(endpoint);
        const startTime = Date.now();
        try {
            // Get optimal strategy based on learned patterns
            const strategy = await this.getOptimalStrategy(endpoint, options);
            // Check circuit breaker
            const circuitBreaker = this.circuitBreakers.get(endpoint);
            if (circuitBreaker && circuitBreaker.isOpen()) {
                throw new Error(`Circuit breaker open for ${endpoint}`);
            }
            // Attempt connection with adaptive strategy
            const result = await this.attemptConnectionWithStrategy(endpoint, strategy, options, connectionId);
            // Update learning data on success
            if (result.success) {
                await this.recordSuccess(endpoint, strategy, result.duration, connectionId);
                circuitBreaker?.recordSuccess();
            }
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            // Record failure for learning
            await this.recordFailure(endpoint, error, duration, options, connectionId);
            // Update circuit breaker
            const circuitBreaker = this.circuitBreakers.get(endpoint);
            circuitBreaker?.recordFailure();
            // Attempt fallback if configured
            if (this.config.fallbackChain.length > 0) {
                return await this.attemptFallback(endpoint, error, options, connectionId);
            }
            throw error;
        }
    }
    /**
     * Get connection health status
     */
    getConnectionHealth(endpoint) {
        return this.connectionHealth.get(endpoint) || {
            isHealthy: false,
            latency: 0,
            successRate: 0,
            lastSuccess: 0,
            failureCount: 0,
            circuitState: 'closed'
        };
    }
    /**
     * Get intelligent troubleshooting suggestions
     */
    async getTroubleshootingSuggestions(endpoint, error) {
        const context = await this.buildFailureContext(endpoint, error);
        return this.failureDetector.getTroubleshootingSuggestions(context);
    }
    /**
     * Get performance analytics
     */
    getPerformanceAnalytics() {
        const detectorMetrics = this.failureDetector.getPerformanceMetrics();
        const databaseMetrics = this.learningDatabase.getPerformanceAnalytics();
        return {
            ...detectorMetrics,
            ...databaseMetrics,
            activeConnections: this.activeConnections.size,
            healthyEndpoints: Array.from(this.connectionHealth.values())
                .filter(h => h.isHealthy).length,
            circuitBreakersOpen: Array.from(this.circuitBreakers.values())
                .filter(cb => cb.isOpen()).length
        };
    }
    /**
     * Train neural patterns from recent data
     */
    async trainNeuralPatterns() {
        if (!this.config.neuralModeEnabled)
            return;
        const trainingData = await this.learningDatabase.exportNeuralTrainingData();
        this.emit('neuralTraining', {
            type: 'connection_patterns',
            data: trainingData
        });
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.emit('configUpdated', this.config);
    }
    async getOptimalStrategy(endpoint, options) {
        if (!this.config.learningEnabled) {
            return this.getDefaultStrategy();
        }
        const context = await this.buildConnectionContext(endpoint, options);
        return await this.learningDatabase.getOptimalStrategy(context);
    }
    async attemptConnectionWithStrategy(endpoint, strategy, options, connectionId) {
        const fallbacksUsed = [];
        let lastError;
        for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
            try {
                const startTime = Date.now();
                const connection = await this.establishConnection(endpoint, options, attempt);
                const duration = Date.now() - startTime;
                this.activeConnections.set(connectionId, connection);
                return {
                    success: true,
                    duration,
                    strategy,
                    fallbacksUsed,
                    learningApplied: this.config.learningEnabled
                };
            }
            catch (error) {
                lastError = error;
                if (attempt < strategy.maxAttempts) {
                    const delay = this.calculateDelay(strategy, attempt);
                    await this.sleep(delay);
                }
            }
        }
        throw lastError;
    }
    async attemptFallback(endpoint, originalError, options, connectionId) {
        const fallbacksUsed = [];
        for (const fallback of this.config.fallbackChain) {
            try {
                const startTime = Date.now();
                const connection = await this.establishFallbackConnection(fallback, endpoint, options);
                const duration = Date.now() - startTime;
                this.activeConnections.set(connectionId, connection);
                fallbacksUsed.push(fallback);
                return {
                    success: true,
                    duration,
                    strategy: this.getDefaultStrategy(),
                    fallbacksUsed,
                    learningApplied: this.config.learningEnabled
                };
            }
            catch (fallbackError) {
                fallbacksUsed.push(fallback);
                console.warn(`Fallback ${fallback} failed:`, fallbackError);
            }
        }
        throw originalError;
    }
    async establishConnection(endpoint, options, attempt) {
        // Implementation depends on connection type
        if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) {
            return this.establishWebSocketConnection(endpoint, options, attempt);
        }
        else if (options.protocol === 'sse') {
            return this.establishSSEConnection(endpoint, options, attempt);
        }
        else if (options.protocol === 'polling') {
            return this.establishPollingConnection(endpoint, options, attempt);
        }
        else {
            return this.establishHttpConnection(endpoint, options, attempt);
        }
    }
    async establishWebSocketConnection(endpoint, options, attempt) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(endpoint);
            const timeout = setTimeout(() => {
                ws.close();
                reject(new Error(`WebSocket connection timeout on attempt ${attempt}`));
            }, options.timeout || 10000);
            ws.onopen = () => {
                clearTimeout(timeout);
                resolve(ws);
            };
            ws.onerror = (error) => {
                clearTimeout(timeout);
                reject(error);
            };
        });
    }
    async establishSSEConnection(endpoint, options, attempt) {
        return new Promise((resolve, reject) => {
            const eventSource = new EventSource(endpoint);
            const timeout = setTimeout(() => {
                eventSource.close();
                reject(new Error(`SSE connection timeout on attempt ${attempt}`));
            }, options.timeout || 10000);
            eventSource.onopen = () => {
                clearTimeout(timeout);
                resolve(eventSource);
            };
            eventSource.onerror = (error) => {
                clearTimeout(timeout);
                eventSource.close();
                reject(error);
            };
        });
    }
    async establishPollingConnection(endpoint, options, attempt) {
        // Implement polling connection
        return { type: 'polling', endpoint, active: true };
    }
    async establishHttpConnection(endpoint, options, attempt) {
        const response = await fetch(endpoint, {
            ...options,
            timeout: options.timeout || 10000
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
    }
    async establishFallbackConnection(fallback, endpoint, options) {
        const fallbackOptions = { ...options, protocol: fallback };
        return this.establishConnection(endpoint, fallbackOptions, 1);
    }
    calculateDelay(strategy, attempt) {
        let delay;
        switch (strategy.type) {
            case 'exponential-backoff':
                delay = strategy.baseDelay * Math.pow(2, attempt - 1);
                break;
            case 'linear-backoff':
                delay = strategy.baseDelay * attempt;
                break;
            case 'fibonacci':
                delay = strategy.baseDelay * this.fibonacci(attempt);
                break;
            default:
                delay = strategy.baseDelay;
        }
        delay = Math.min(delay, strategy.maxDelay);
        if (strategy.jitter) {
            delay += Math.random() * 1000;
        }
        return delay;
    }
    fibonacci(n) {
        if (n <= 1)
            return 1;
        return this.fibonacci(n - 1) + this.fibonacci(n - 2);
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async recordSuccess(endpoint, strategy, duration, connectionId) {
        // Update connection health
        const health = this.connectionHealth.get(endpoint) || this.createDefaultHealth();
        health.isHealthy = true;
        health.latency = (health.latency + duration) / 2;
        health.lastSuccess = Date.now();
        health.successRate = Math.min(1.0, health.successRate + 0.1);
        this.connectionHealth.set(endpoint, health);
        // Record in learning database
        if (this.config.learningEnabled) {
            await this.learningDatabase.storeSuccessfulRecovery(connectionId, strategy, duration);
        }
        this.emit('connectionSuccess', { endpoint, strategy, duration });
    }
    async recordFailure(endpoint, error, duration, options, connectionId) {
        // Update connection health
        const health = this.connectionHealth.get(endpoint) || this.createDefaultHealth();
        health.isHealthy = false;
        health.failureCount++;
        health.successRate = Math.max(0.0, health.successRate - 0.1);
        this.connectionHealth.set(endpoint, health);
        // Record in learning database
        if (this.config.learningEnabled) {
            const context = await this.buildFailureContext(endpoint, error, options);
            await this.failureDetector.captureFailure(context);
        }
        this.emit('connectionFailure', { endpoint, error, duration });
    }
    async buildConnectionContext(endpoint, options) {
        return {
            connectionType: this.determineConnectionType(endpoint, options),
            endpoint,
            networkConditions: await this.getNetworkConditions(),
            clientInfo: this.getClientInfo()
        };
    }
    async buildFailureContext(endpoint, error, options = {}) {
        return {
            connectionType: this.determineConnectionType(endpoint, options),
            endpoint,
            timestamp: Date.now(),
            networkConditions: await this.getNetworkConditions(),
            clientInfo: this.getClientInfo(),
            errorDetails: {
                code: error.code || 'unknown',
                message: error.message || 'Unknown error',
                type: this.classifyError(error),
                stack: error.stack
            },
            attemptHistory: []
        };
    }
    determineConnectionType(endpoint, options) {
        if (options.protocol)
            return options.protocol;
        if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://'))
            return 'websocket';
        return 'http';
    }
    async getNetworkConditions() {
        // Implementation would get actual network conditions
        return {
            connectionType: 'unknown',
            isOnline: navigator.onLine
        };
    }
    getClientInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            isMobile: /Mobile|Android|iOS/.test(navigator.userAgent),
            supportedProtocols: ['websocket', 'sse', 'polling', 'http']
        };
    }
    classifyError(error) {
        if (error.code === 'ETIMEDOUT' || error.message.includes('timeout'))
            return 'timeout';
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED')
            return 'network';
        if (error.code === 401 || error.code === 403)
            return 'auth';
        if (error.code >= 500)
            return 'server';
        return 'unknown';
    }
    createDefaultHealth() {
        return {
            isHealthy: false,
            latency: 0,
            successRate: 0,
            lastSuccess: 0,
            failureCount: 0,
            circuitState: 'closed'
        };
    }
    getDefaultStrategy() {
        return {
            type: 'exponential-backoff',
            baseDelay: 1000,
            maxDelay: 30000,
            jitter: true,
            maxAttempts: 5
        };
    }
    generateConnectionId(endpoint) {
        return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${endpoint.replace(/[^\w]/g, '_')}`;
    }
    setupEventHandlers() {
        this.failureDetector.on('patternDetected', (data) => {
            this.emit('patternDetected', data);
        });
        this.learningDatabase.on('patternStored', (data) => {
            this.emit('learningUpdated', data);
        });
    }
    initializeCircuitBreakers() {
        this.config.endpoints.forEach(endpoint => {
            this.circuitBreakers.set(endpoint, new CircuitBreaker({
                failureThreshold: 5,
                recoveryTimeout: 60000
            }));
        });
    }
}
exports.AdaptiveConnectionManager = AdaptiveConnectionManager;
// Circuit breaker implementation
class CircuitBreaker {
    config;
    failureCount = 0;
    lastFailureTime = 0;
    state = 'closed';
    constructor(config) {
        this.config = config;
    }
    isOpen() {
        if (this.state === 'open') {
            if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
                this.state = 'half-open';
                return false;
            }
            return true;
        }
        return false;
    }
    recordSuccess() {
        this.failureCount = 0;
        this.state = 'closed';
    }
    recordFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.config.failureThreshold) {
            this.state = 'open';
        }
    }
}
//# sourceMappingURL=adaptive-connection-manager.js.map