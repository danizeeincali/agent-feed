"use strict";
/**
 * NLD WebSocket Integration
 * Integrates NLD connection learning with existing WebSocket systems
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NLDWebSocketIntegration = void 0;
exports.createNLDWebSocketService = createNLDWebSocketService;
exports.integrateNLDWithWebSocket = integrateNLDWithWebSocket;
const events_1 = require("events");
const websocket_1 = require("../../frontend/src/services/websocket");
const connection_failure_detector_1 = require("./connection-failure-detector");
const adaptive_connection_manager_1 = require("./adaptive-connection-manager");
const claude_flow_integration_1 = require("./claude-flow-integration");
const performance_monitor_1 = require("./performance-monitor");
const troubleshooting_engine_1 = require("./troubleshooting-engine");
class NLDWebSocketIntegration extends events_1.EventEmitter {
    originalWebSocketService;
    failureDetector;
    adaptiveManager;
    claudeFlowIntegration;
    performanceMonitor;
    troubleshootingEngine;
    config;
    connectionAttempts = new Map();
    lastConnectionContext = null;
    constructor(webSocketService, config) {
        super();
        this.originalWebSocketService = webSocketService;
        this.config = config;
        this.initializeNLDComponents();
        this.enhanceWebSocketService();
        this.setupEventHandlers();
    }
    /**
     * Initialize NLD components
     */
    initializeNLDComponents() {
        // Initialize failure detector
        this.failureDetector = new connection_failure_detector_1.ConnectionFailureDetector();
        // Initialize adaptive connection manager
        this.adaptiveManager = new adaptive_connection_manager_1.AdaptiveConnectionManager({
            endpoints: ['ws://localhost:8000/ws'],
            protocols: ['websocket', 'sse', 'polling'],
            fallbackChain: this.config.fallbackTransports,
            learningEnabled: this.config.enableLearning,
            neuralModeEnabled: this.config.neuralTrainingEnabled,
            circuitBreakerEnabled: true
        });
        // Initialize Claude Flow integration
        this.claudeFlowIntegration = new claude_flow_integration_1.ClaudeFlowIntegration({
            mcpServerUrl: 'ws://localhost:3001/mcp',
            neuralTrainingEnabled: this.config.neuralTrainingEnabled,
            memoryNamespace: 'nld_websocket',
            taskOrchestrationEnabled: true,
            performanceTrackingEnabled: this.config.enablePerformanceMonitoring
        });
        // Initialize performance monitor
        if (this.config.enablePerformanceMonitoring) {
            this.performanceMonitor = new performance_monitor_1.NLDPerformanceMonitor({
                metricsRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
                monitoringIntervalMs: 10000, // 10 seconds
                reportingIntervalMs: 300000, // 5 minutes
                alertingEnabled: true
            });
            this.performanceMonitor.startMonitoring();
        }
        // Initialize troubleshooting engine
        if (this.config.enableTroubleshooting) {
            this.troubleshootingEngine = new troubleshooting_engine_1.TroubleshootingEngine(this.adaptiveManager['learningDatabase']);
        }
    }
    /**
     * Enhance the existing WebSocket service with NLD capabilities
     */
    enhanceWebSocketService() {
        // Store original methods
        const originalConnect = this.originalWebSocketService.connect.bind(this.originalWebSocketService);
        const originalSend = this.originalWebSocketService.send.bind(this.originalWebSocketService);
        const originalDisconnect = this.originalWebSocketService.disconnect.bind(this.originalWebSocketService);
        // Enhanced connect method
        this.originalWebSocketService.connect = async () => {
            const startTime = Date.now();
            const connectionId = this.generateConnectionId();
            try {
                if (this.config.enableAdaptiveRetry) {
                    // Use adaptive connection manager
                    const result = await this.adaptiveManager.connect(this.originalWebSocketService['url'] || 'ws://localhost:8000/ws', { connectionId, timeout: 10000 });
                    this.recordConnectionSuccess(connectionId, startTime, result);
                }
                else {
                    // Use original connection method
                    await originalConnect();
                    this.recordConnectionSuccess(connectionId, startTime, {
                        success: true,
                        duration: Date.now() - startTime,
                        strategy: { type: 'immediate', baseDelay: 0, maxDelay: 0, jitter: false, maxAttempts: 1 },
                        fallbacksUsed: [],
                        learningApplied: false
                    });
                }
            }
            catch (error) {
                await this.handleConnectionFailure(connectionId, startTime, error);
                throw error;
            }
        };
        // Enhanced send method
        this.originalWebSocketService.send = (type, data) => {
            const enhancedMessage = {
                type,
                data,
                timestamp: new Date().toISOString(),
                nld_metadata: {
                    connection_attempt: this.connectionAttempts.get('current') || 1,
                    strategy_used: 'standard',
                    learning_applied: this.config.enableLearning,
                    performance_metrics: this.getRealtimeMetrics()
                }
            };
            // Record message performance
            if (this.config.enablePerformanceMonitoring) {
                this.performanceMonitor.recordMetric('connection', 'message_sent', 1, { type, data_size: JSON.stringify(data).length });
            }
            originalSend(type, data);
            this.emit('messageSent', enhancedMessage);
        };
        // Enhanced disconnect method
        this.originalWebSocketService.disconnect = () => {
            // Record disconnection metrics
            if (this.config.enablePerformanceMonitoring) {
                this.performanceMonitor.recordMetric('connection', 'disconnection', 1, { graceful: true });
            }
            originalDisconnect();
            this.emit('disconnected', { timestamp: Date.now(), graceful: true });
        };
    }
    /**
     * Set up event handlers for NLD components
     */
    setupEventHandlers() {
        // Failure detector events
        this.failureDetector.on('patternDetected', (data) => {
            this.emit('nldPatternDetected', data);
            if (this.config.enableTroubleshooting) {
                this.generateTroubleshootingSuggestions(data.context);
            }
        });
        // Adaptive manager events
        this.adaptiveManager.on('connectionSuccess', (data) => {
            this.emit('nldConnectionSuccess', data);
        });
        this.adaptiveManager.on('connectionFailure', (data) => {
            this.emit('nldConnectionFailure', data);
        });
        // Performance monitor events
        if (this.performanceMonitor) {
            this.performanceMonitor.on('alertGenerated', (alert) => {
                this.emit('nldAlert', alert);
            });
            this.performanceMonitor.on('reportGenerated', (report) => {
                this.emit('nldPerformanceReport', report);
            });
        }
        // Claude Flow integration events
        this.claudeFlowIntegration.on('neuralTrained', (data) => {
            this.emit('nldNeuralTrained', data);
        });
        this.claudeFlowIntegration.on('memoryStored', (data) => {
            this.emit('nldMemoryStored', data);
        });
    }
    /**
     * Get real-time connection metrics
     */
    getRealtimeMetrics() {
        if (!this.config.enablePerformanceMonitoring)
            return null;
        return this.performanceMonitor.getDashboardData();
    }
    /**
     * Get connection health status
     */
    getConnectionHealth() {
        const health = this.adaptiveManager.getConnectionHealth('ws://localhost:8000/ws');
        const performanceMetrics = this.config.enablePerformanceMonitoring
            ? this.performanceMonitor.getDashboardData()
            : null;
        return {
            connection_health: health,
            performance_metrics: performanceMetrics,
            nld_status: this.claudeFlowIntegration.getNLDStatus(),
            learning_enabled: this.config.enableLearning,
            adaptive_retry_enabled: this.config.enableAdaptiveRetry
        };
    }
    /**
     * Generate troubleshooting suggestions for current issues
     */
    async generateTroubleshootingSuggestions(context) {
        if (!this.config.enableTroubleshooting || !this.troubleshootingEngine) {
            return { error: 'Troubleshooting not enabled' };
        }
        const troubleshootingContext = context || this.lastConnectionContext;
        if (!troubleshootingContext) {
            return { error: 'No connection context available' };
        }
        const suggestions = await this.troubleshootingEngine.generateSuggestions({
            context: troubleshootingContext,
            urgency: 'medium'
        });
        this.emit('troubleshootingSuggestions', suggestions);
        return suggestions;
    }
    /**
     * Train neural patterns from recent connection data
     */
    async trainNeuralPatterns() {
        if (!this.config.neuralTrainingEnabled) {
            console.warn('Neural training not enabled');
            return;
        }
        await this.claudeFlowIntegration.trainNeuralPatterns();
        this.emit('neuralTrainingTriggered', { timestamp: Date.now() });
    }
    /**
     * Export NLD data for analysis
     */
    async exportNLDData() {
        const claudeFlowData = await this.claudeFlowIntegration.exportNLDData();
        const performanceData = this.config.enablePerformanceMonitoring
            ? this.performanceMonitor.generatePerformanceReport()
            : null;
        return {
            metadata: {
                exported_at: new Date().toISOString(),
                websocket_integration: true,
                config: this.config
            },
            claude_flow_data: claudeFlowData,
            performance_data: performanceData,
            connection_attempts: Object.fromEntries(this.connectionAttempts),
            last_connection_context: this.lastConnectionContext
        };
    }
    /**
     * Update NLD configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        // Update component configurations
        this.adaptiveManager.updateConfig({
            learningEnabled: this.config.enableLearning,
            neuralModeEnabled: this.config.neuralTrainingEnabled,
            fallbackChain: this.config.fallbackTransports
        });
        this.claudeFlowIntegration.updateConfig({
            neuralTrainingEnabled: this.config.neuralTrainingEnabled,
            performanceTrackingEnabled: this.config.enablePerformanceMonitoring
        });
        this.emit('configUpdated', this.config);
    }
    /**
     * Get WebSocket integration statistics
     */
    getStatistics() {
        const adaptiveStats = this.adaptiveManager.getPerformanceAnalytics();
        const performanceStats = this.config.enablePerformanceMonitoring
            ? this.performanceMonitor.getDashboardData()
            : null;
        return {
            adaptive_connection_stats: adaptiveStats,
            performance_stats: performanceStats,
            total_connection_attempts: Array.from(this.connectionAttempts.values())
                .reduce((sum, attempts) => sum + attempts, 0),
            nld_components_active: {
                failure_detector: !!this.failureDetector,
                adaptive_manager: !!this.adaptiveManager,
                claude_flow_integration: !!this.claudeFlowIntegration,
                performance_monitor: !!this.performanceMonitor,
                troubleshooting_engine: !!this.troubleshootingEngine
            },
            config: this.config
        };
    }
    /**
     * Shutdown NLD integration
     */
    async shutdown() {
        try {
            // Stop performance monitoring
            if (this.performanceMonitor) {
                this.performanceMonitor.stopMonitoring();
            }
            // Shutdown Claude Flow integration
            await this.claudeFlowIntegration.shutdown();
            // Clean up event listeners
            this.removeAllListeners();
            this.emit('nldShutdown', { timestamp: Date.now() });
        }
        catch (error) {
            console.error('Error during NLD WebSocket integration shutdown:', error);
            this.emit('nldShutdownError', error);
        }
    }
    async recordConnectionSuccess(connectionId, startTime, result) {
        const duration = Date.now() - startTime;
        // Update connection attempts
        const attempts = this.connectionAttempts.get(connectionId) || 0;
        this.connectionAttempts.set(connectionId, attempts + 1);
        this.connectionAttempts.set('current', attempts + 1);
        // Record performance metrics
        if (this.config.enablePerformanceMonitoring) {
            this.performanceMonitor.recordMetric('connection', 'success', 1, { duration, strategy: result.strategy?.type, learning_applied: result.learningApplied });
            this.performanceMonitor.recordMetric('connection', 'response_time', duration, { strategy: result.strategy?.type });
        }
        this.emit('connectionSuccess', {
            connectionId,
            duration,
            result,
            timestamp: Date.now()
        });
    }
    async handleConnectionFailure(connectionId, startTime, error) {
        const duration = Date.now() - startTime;
        // Update connection attempts
        const attempts = this.connectionAttempts.get(connectionId) || 0;
        this.connectionAttempts.set(connectionId, attempts + 1);
        // Create failure context
        const context = {
            connectionType: 'websocket',
            endpoint: this.originalWebSocketService['url'] || 'ws://localhost:8000/ws',
            timestamp: Date.now(),
            networkConditions: {
                connectionType: 'unknown',
                isOnline: navigator.onLine
            },
            clientInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                isMobile: /Mobile|Android|iOS/.test(navigator.userAgent),
                supportedProtocols: ['websocket', 'sse', 'polling']
            },
            errorDetails: {
                code: error.code || 'unknown',
                message: error.message || 'Unknown error',
                type: this.classifyError(error),
                stack: error.stack
            },
            attemptHistory: []
        };
        this.lastConnectionContext = context;
        // Record failure with detector
        if (this.config.enableLearning) {
            this.failureDetector.captureFailure(context);
        }
        // Record performance metrics
        if (this.config.enablePerformanceMonitoring) {
            this.performanceMonitor.recordMetric('connection', 'failure', 1, {
                duration,
                error_type: context.errorDetails.type,
                attempts: attempts + 1
            });
        }
        this.emit('connectionFailure', {
            connectionId,
            duration,
            error,
            context,
            attempts: attempts + 1,
            timestamp: Date.now()
        });
    }
    classifyError(error) {
        if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout'))
            return 'timeout';
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED')
            return 'network';
        if (error.code === 1002 || error.code === 1003)
            return 'protocol';
        if (error.code === 401 || error.code === 403)
            return 'auth';
        if (error.code >= 500)
            return 'server';
        return 'unknown';
    }
    generateConnectionId() {
        return `ws_conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.NLDWebSocketIntegration = NLDWebSocketIntegration;
/**
 * Factory function to create enhanced WebSocket service with NLD integration
 */
function createNLDWebSocketService(config = {}) {
    const defaultConfig = {
        enableLearning: true,
        enableAdaptiveRetry: true,
        enablePerformanceMonitoring: true,
        enableTroubleshooting: true,
        fallbackTransports: ['sse', 'polling'],
        circuitBreakerThreshold: 5,
        neuralTrainingEnabled: true
    };
    const finalConfig = { ...defaultConfig, ...config };
    // Import the existing WebSocket service
    const webSocketService = new websocket_1.WebSocketService();
    // Create NLD integration
    const nldIntegration = new NLDWebSocketIntegration(webSocketService, finalConfig);
    return {
        service: webSocketService,
        nldIntegration
    };
}
/**
 * Utility function to integrate NLD with existing WebSocket service
 */
async function integrateNLDWithWebSocket(existingService, config = {}) {
    const defaultConfig = {
        enableLearning: true,
        enableAdaptiveRetry: true,
        enablePerformanceMonitoring: true,
        enableTroubleshooting: true,
        fallbackTransports: ['sse', 'polling'],
        circuitBreakerThreshold: 5,
        neuralTrainingEnabled: true
    };
    const finalConfig = { ...defaultConfig, ...config };
    const nldIntegration = new NLDWebSocketIntegration(existingService, finalConfig);
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    return nldIntegration;
}
//# sourceMappingURL=websocket-integration.js.map