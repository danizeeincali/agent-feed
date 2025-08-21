"use strict";
/**
 * NLD (Neuro Learning Development) Connection Learning System
 * Main export file for all NLD components
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NLD_METADATA = exports.NLDDevUtils = exports.DEFAULT_CLAUDE_FLOW_CONFIG = exports.DEFAULT_NEURAL_TRAINING_CONFIG = exports.DEFAULT_PERFORMANCE_MONITOR_CONFIG = exports.DEFAULT_NLD_CONFIG = exports.NLD_VERSION = exports.integrateNLDWithWebSocket = exports.createNLDWebSocketService = exports.NLDWebSocketIntegration = exports.TroubleshootingEngine = exports.NLDPerformanceMonitor = exports.ClaudeFlowIntegration = exports.NeuralConnectionTrainer = exports.AdaptiveConnectionManager = exports.ConnectionLearningDatabase = exports.ConnectionFailureDetector = void 0;
exports.createCompleteNLDSystem = createCompleteNLDSystem;
exports.quickSetupNLD = quickSetupNLD;
exports.checkNLDCompatibility = checkNLDCompatibility;
// Core Components
var connection_failure_detector_1 = require("./connection-failure-detector");
Object.defineProperty(exports, "ConnectionFailureDetector", { enumerable: true, get: function () { return connection_failure_detector_1.ConnectionFailureDetector; } });
var learning_database_1 = require("./learning-database");
Object.defineProperty(exports, "ConnectionLearningDatabase", { enumerable: true, get: function () { return learning_database_1.ConnectionLearningDatabase; } });
var adaptive_connection_manager_1 = require("./adaptive-connection-manager");
Object.defineProperty(exports, "AdaptiveConnectionManager", { enumerable: true, get: function () { return adaptive_connection_manager_1.AdaptiveConnectionManager; } });
var neural_connection_trainer_1 = require("./neural-connection-trainer");
Object.defineProperty(exports, "NeuralConnectionTrainer", { enumerable: true, get: function () { return neural_connection_trainer_1.NeuralConnectionTrainer; } });
var claude_flow_integration_1 = require("./claude-flow-integration");
Object.defineProperty(exports, "ClaudeFlowIntegration", { enumerable: true, get: function () { return claude_flow_integration_1.ClaudeFlowIntegration; } });
var performance_monitor_1 = require("./performance-monitor");
Object.defineProperty(exports, "NLDPerformanceMonitor", { enumerable: true, get: function () { return performance_monitor_1.NLDPerformanceMonitor; } });
var troubleshooting_engine_1 = require("./troubleshooting-engine");
Object.defineProperty(exports, "TroubleshootingEngine", { enumerable: true, get: function () { return troubleshooting_engine_1.TroubleshootingEngine; } });
var websocket_integration_1 = require("./websocket-integration");
Object.defineProperty(exports, "NLDWebSocketIntegration", { enumerable: true, get: function () { return websocket_integration_1.NLDWebSocketIntegration; } });
Object.defineProperty(exports, "createNLDWebSocketService", { enumerable: true, get: function () { return websocket_integration_1.createNLDWebSocketService; } });
Object.defineProperty(exports, "integrateNLDWithWebSocket", { enumerable: true, get: function () { return websocket_integration_1.integrateNLDWithWebSocket; } });
// Utility functions and constants
exports.NLD_VERSION = '1.0.0';
exports.DEFAULT_NLD_CONFIG = {
    enableLearning: true,
    enableAdaptiveRetry: true,
    enablePerformanceMonitoring: true,
    enableTroubleshooting: true,
    fallbackTransports: ['sse', 'polling'],
    circuitBreakerThreshold: 5,
    neuralTrainingEnabled: true
};
exports.DEFAULT_PERFORMANCE_MONITOR_CONFIG = {
    metricsRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
    monitoringIntervalMs: 10000, // 10 seconds
    reportingIntervalMs: 300000, // 5 minutes
    alertingEnabled: true
};
exports.DEFAULT_NEURAL_TRAINING_CONFIG = {
    batchSize: 50,
    learningRate: 0.001,
    epochs: 100,
    validationSplit: 0.2,
    modelType: 'classification',
    featureEngineering: true,
    autoTuning: true
};
exports.DEFAULT_CLAUDE_FLOW_CONFIG = {
    mcpServerUrl: 'ws://localhost:3001/mcp',
    neuralTrainingEnabled: true,
    memoryNamespace: 'nld_connection',
    taskOrchestrationEnabled: true,
    performanceTrackingEnabled: true
};
/**
 * Create a complete NLD system with all components
 */
function createCompleteNLDSystem(config = {}) {
    const { webSocketConfig = {}, performanceConfig = {}, neuralConfig = {}, claudeFlowConfig = {} } = config;
    // Create enhanced WebSocket service
    const { service, nldIntegration } = createNLDWebSocketService({
        ...exports.DEFAULT_NLD_CONFIG,
        ...webSocketConfig
    });
    // Initialize performance monitor
    const performanceMonitor = new NLDPerformanceMonitor({
        ...exports.DEFAULT_PERFORMANCE_MONITOR_CONFIG,
        ...performanceConfig
    });
    // Initialize neural trainer
    const neuralTrainer = new NeuralConnectionTrainer({
        ...exports.DEFAULT_NEURAL_TRAINING_CONFIG,
        ...neuralConfig
    });
    // Initialize Claude Flow integration
    const claudeFlowIntegration = new ClaudeFlowIntegration({
        ...exports.DEFAULT_CLAUDE_FLOW_CONFIG,
        ...claudeFlowConfig
    });
    // Initialize learning database
    const learningDatabase = new ConnectionLearningDatabase();
    // Initialize troubleshooting engine
    const troubleshootingEngine = new TroubleshootingEngine(learningDatabase);
    // Start monitoring
    performanceMonitor.startMonitoring();
    return {
        webSocketService: service,
        nldIntegration,
        performanceMonitor,
        neuralTrainer,
        claudeFlowIntegration,
        learningDatabase,
        troubleshootingEngine,
        // Utility methods
        async shutdown() {
            performanceMonitor.stopMonitoring();
            await nldIntegration.shutdown();
            await claudeFlowIntegration.shutdown();
        },
        getSystemStatus() {
            return {
                nld_integration: nldIntegration.getNLDStatus(),
                performance_metrics: performanceMonitor.getDashboardData(),
                connection_health: nldIntegration.getConnectionHealth(),
                system_statistics: nldIntegration.getStatistics()
            };
        },
        async exportAllData() {
            const nldData = await nldIntegration.exportNLDData();
            const neuralModels = await neuralTrainer.exportModels();
            const performanceReport = performanceMonitor.generatePerformanceReport();
            return {
                nld_data: nldData,
                neural_models: neuralModels,
                performance_report: performanceReport,
                exported_at: new Date().toISOString(),
                version: exports.NLD_VERSION
            };
        }
    };
}
/**
 * Quick setup function for basic NLD integration
 */
function quickSetupNLD(options = {}) {
    const { enableAll = true, learningOnly = false, monitoringOnly = false } = options;
    let config;
    if (learningOnly) {
        config = {
            enableLearning: true,
            enableAdaptiveRetry: false,
            enablePerformanceMonitoring: false,
            enableTroubleshooting: false,
            neuralTrainingEnabled: true
        };
    }
    else if (monitoringOnly) {
        config = {
            enableLearning: false,
            enableAdaptiveRetry: false,
            enablePerformanceMonitoring: true,
            enableTroubleshooting: true,
            neuralTrainingEnabled: false
        };
    }
    else {
        config = exports.DEFAULT_NLD_CONFIG;
    }
    return createNLDWebSocketService(config);
}
/**
 * Utility function to check NLD system compatibility
 */
function checkNLDCompatibility() {
    const issues = [];
    const recommendations = [];
    // Check for required APIs
    if (typeof WebSocket === 'undefined') {
        issues.push('WebSocket API not available');
        recommendations.push('Ensure WebSocket support is available in your environment');
    }
    if (typeof EventSource === 'undefined') {
        issues.push('EventSource API not available');
        recommendations.push('Consider using a polyfill for EventSource support');
    }
    if (typeof navigator === 'undefined') {
        issues.push('Navigator API not available');
        recommendations.push('Some network detection features may not work');
    }
    // Check for Node.js specific features
    if (typeof process !== 'undefined') {
        if (!process.hrtime) {
            issues.push('High-resolution time measurement not available');
            recommendations.push('Performance timing may be less accurate');
        }
    }
    return {
        compatible: issues.length === 0,
        issues,
        recommendations
    };
}
/**
 * Development utilities
 */
exports.NLDDevUtils = {
    /**
     * Create mock failure context for testing
     */
    createMockFailureContext(overrides = {}) {
        return {
            connectionType: 'websocket',
            endpoint: 'ws://localhost:8000/ws',
            timestamp: Date.now(),
            networkConditions: {
                connectionType: 'wifi',
                isOnline: true
            },
            clientInfo: {
                userAgent: 'test-agent',
                platform: 'test',
                isMobile: false,
                supportedProtocols: ['websocket']
            },
            errorDetails: {
                code: 'ETIMEDOUT',
                message: 'Connection timeout',
                type: 'timeout'
            },
            attemptHistory: [],
            ...overrides
        };
    },
    /**
     * Create mock connection strategy for testing
     */
    createMockStrategy(overrides = {}) {
        return {
            type: 'exponential-backoff',
            baseDelay: 1000,
            maxDelay: 30000,
            jitter: true,
            maxAttempts: 5,
            ...overrides
        };
    },
    /**
     * Simulate network conditions for testing
     */
    simulateNetworkConditions(type) {
        const conditionsMap = {
            'slow-2g': { latency: 2000, bandwidth: 50 },
            '2g': { latency: 1000, bandwidth: 250 },
            '3g': { latency: 500, bandwidth: 750 },
            '4g': { latency: 100, bandwidth: 10000 },
            'wifi': { latency: 50, bandwidth: 50000 },
            'ethernet': { latency: 10, bandwidth: 100000 }
        };
        const conditions = conditionsMap[type];
        return {
            connectionType: type,
            isOnline: true,
            latency: conditions.latency,
            bandwidth: conditions.bandwidth,
            effectiveType: type
        };
    }
};
// Export version and metadata
exports.NLD_METADATA = {
    version: exports.NLD_VERSION,
    name: 'NLD Connection Learning System',
    description: 'Intelligent connection failure learning and optimization system',
    author: 'Claude Code',
    license: 'MIT',
    repository: 'https://github.com/ruvnet/claude-flow',
    documentation: '/docs/nld-connection-learning-system.md',
    components: [
        'ConnectionFailureDetector',
        'ConnectionLearningDatabase',
        'AdaptiveConnectionManager',
        'NeuralConnectionTrainer',
        'ClaudeFlowIntegration',
        'NLDPerformanceMonitor',
        'TroubleshootingEngine',
        'NLDWebSocketIntegration'
    ],
    features: [
        'Automatic failure pattern detection',
        'Neural learning from connection data',
        'Adaptive retry strategies',
        'Intelligent troubleshooting',
        'Performance monitoring',
        'Claude-flow integration',
        'Real-time optimization',
        'Comprehensive analytics'
    ]
};
//# sourceMappingURL=index.js.map