"use strict";
/**
 * NLD SSE Integration System
 *
 * Integrates the NLD pattern detection system with the existing SSE implementation
 * Provides validation of the NLD system with current SSE connection state
 * Creates hooks for real-time pattern detection and learning
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NLDSSEIntegrationSystem = void 0;
const sse_connection_pattern_detector_1 = require("./sse-connection-pattern-detector");
const real_time_sse_failure_monitor_1 = require("./real-time-sse-failure-monitor");
const sse_anti_patterns_database_1 = require("./sse-anti-patterns-database");
const neural_training_export_system_1 = require("./neural-training-export-system");
const tdd_sse_prevention_strategies_1 = require("./tdd-sse-prevention-strategies");
class NLDSSEIntegrationSystem {
    patternDetector;
    failureMonitor;
    antiPatternsDB;
    neuralExportSystem;
    tddStrategies;
    isIntegrated = false;
    validationResults = null;
    constructor() {
        this.patternDetector = new sse_connection_pattern_detector_1.SSEConnectionPatternDetector();
        this.failureMonitor = new real_time_sse_failure_monitor_1.RealTimeSSEFailureMonitor();
        this.antiPatternsDB = new sse_anti_patterns_database_1.SSEAntiPatternsDatabase();
        this.neuralExportSystem = new neural_training_export_system_1.NeuralTrainingExportSystem();
        this.tddStrategies = new tdd_sse_prevention_strategies_1.TDDSSEPreventionStrategies();
        this.setupIntegrationHooks();
    }
    /**
     * Initialize the NLD system integration
     */
    async initialize() {
        console.log('🚀 Initializing NLD SSE Integration System...');
        // Start pattern detection and monitoring
        this.patternDetector.startMonitoring();
        this.failureMonitor.startMonitoring();
        // Load existing patterns for learning
        await this.patternDetector.loadExistingPatterns();
        this.isIntegrated = true;
        console.log('✅ NLD SSE Integration System initialized successfully');
        // Perform initial validation
        await this.validateWithCurrentState();
    }
    /**
     * Setup integration hooks with existing SSE implementation
     */
    setupIntegrationHooks() {
        // Hook into connection events
        this.failureMonitor.on('failure_alert', (alert) => {
            this.handleFailureAlert(alert);
        });
        this.failureMonitor.on('auto_recovery', (recovery) => {
            this.handleAutoRecovery(recovery);
        });
        this.failureMonitor.on('alert_resolved', (alert) => {
            this.handleAlertResolved(alert);
        });
    }
    /**
     * Validate NLD system with current SSE connection state
     */
    async validateWithCurrentState() {
        console.log('🔍 Validating NLD system with current SSE connection state...');
        if (!this.isIntegrated) {
            await this.initialize();
        }
        // Get current connection metrics
        const connectionMetrics = this.failureMonitor.getAllConnectionMetrics();
        const activeAlerts = this.failureMonitor.getActiveAlerts();
        const monitoringReport = this.failureMonitor.generateReport();
        // Analyze patterns
        const patternAnalysis = this.patternDetector.analyzePatterns();
        const antiPatternAnalytics = this.antiPatternsDB.getAnalytics();
        // Generate validation result
        this.validationResults = {
            systemStatus: this.determineSystemStatus(activeAlerts, connectionMetrics),
            detectedPatterns: this.summarizeDetectedPatterns(),
            connectionHealth: this.assessConnectionHealth(connectionMetrics),
            recommendations: this.generateRecommendations(activeAlerts, patternAnalysis),
            neuralInsights: await this.generateNeuralInsights(connectionMetrics),
            metrics: {
                totalInstances: connectionMetrics.size,
                activeAlerts: activeAlerts.length,
                patternsCaptured: patternAnalysis.totalPatterns,
                preventionEffectiveness: antiPatternAnalytics.avgPreventionEffectiveness
            }
        };
        console.log(`📊 Validation complete - System Status: ${this.validationResults.systemStatus}`);
        console.log(`🎯 Captured ${this.validationResults.metrics.patternsCaptured} patterns, ${this.validationResults.metrics.activeAlerts} active alerts`);
        return this.validationResults;
    }
    /**
     * Hook for integrating with useHTTPSSE hook
     */
    createSSEHooks() {
        return {
            onConnectionEvent: (instanceId, eventType, data) => {
                // Report event to failure monitor
                this.failureMonitor.reportSSEEvent(instanceId, eventType, data);
                // Detect potential trigger conditions
                const triggerCondition = {
                    type: this.mapEventToTriggerType(eventType),
                    data: { eventType, data, instanceId },
                    source: 'useHTTPSSE'
                };
                if (this.patternDetector.detectTrigger(triggerCondition)) {
                    this.handleTriggerDetected(triggerCondition, instanceId);
                }
            },
            onUIStateChange: (instanceId, status) => {
                // Report UI state change
                this.failureMonitor.reportUIState(instanceId, status);
            },
            onUserFeedback: async (feedback, context) => {
                // Capture user feedback for pattern learning
                if (this.isFailureFeedback(feedback)) {
                    await this.captureUserFailurePattern(feedback, context);
                }
            }
        };
    }
    /**
     * Manual trigger for pattern detection
     */
    async triggerPatternDetection(instanceId, scenario, context) {
        const triggerCondition = {
            type: 'manual_trigger',
            data: { scenario, context, instanceId },
            source: 'manual'
        };
        if (this.patternDetector.detectTrigger(triggerCondition)) {
            await this.handleTriggerDetected(triggerCondition, instanceId);
        }
    }
    /**
     * Export neural training data
     */
    async exportNeuralTrainingData() {
        console.log('🧠 Exporting neural training data...');
        return await this.neuralExportSystem.exportTrainingDataset();
    }
    /**
     * Get TDD implementation guidance
     */
    getTDDGuidance() {
        return {
            criticalTests: this.tddStrategies.getTestSuitesByPriority('critical').map(s => s.name),
            implementationChecklist: this.tddStrategies.generateImplementationChecklist(),
            mockingUtilities: this.tddStrategies.generateMockingUtilities()
        };
    }
    /**
     * Get comprehensive system report
     */
    generateSystemReport() {
        return {
            validation: this.validationResults,
            antiPatterns: this.antiPatternsDB.generateReport(),
            tddGuidance: this.getTDDGuidance(),
            monitoringStats: this.failureMonitor.generateReport()
        };
    }
    // Private helper methods
    handleFailureAlert(alert) {
        console.log(`🚨 NLD Integration: Handling failure alert ${alert.id}`);
        // Trigger pattern capture for this alert
        this.patternDetector.captureFailurePattern({
            type: 'status_connection_zero',
            data: alert,
            source: 'RealTimeSSEFailureMonitor'
        }, {
            task: `SSE Connection Management for ${alert.instanceId}`,
            expectedBehavior: 'Stable SSE connections with working status updates',
            actualBehavior: alert.description,
            errorMessages: [alert.description]
        }, alert.metrics, alert.metrics.uiState, {
            claudeConfidence: 0.9,
            userSuccessRate: 0.1,
            tddUsed: false
        });
    }
    handleAutoRecovery(recovery) {
        console.log(`🔧 NLD Integration: Auto-recovery triggered for ${recovery.instanceId}`);
        // Log recovery attempt for learning
        // This data helps train the neural network on what recovery actions work
    }
    handleAlertResolved(alert) {
        console.log(`✅ NLD Integration: Alert resolved ${alert.id} in ${alert.resolutionTime}ms`);
        // Update pattern learning with resolution data
    }
    mapEventToTriggerType(eventType) {
        switch (eventType) {
            case 'status_disconnected':
            case 'status_connected':
                return 'status_connection_zero';
            case 'terminal_connected':
                return 'terminal_connection_established';
            default:
                return 'manual_trigger';
        }
    }
    async handleTriggerDetected(triggerCondition, instanceId) {
        console.log(`🎯 NLD Integration: Trigger detected for ${instanceId}: ${triggerCondition.type}`);
        const connectionMetrics = this.failureMonitor.getConnectionMetrics(instanceId);
        if (connectionMetrics) {
            await this.patternDetector.captureFailurePattern(triggerCondition, {
                task: `SSE Connection Management`,
                expectedBehavior: 'Stable connection coordination',
                actualBehavior: `Trigger: ${triggerCondition.type}`,
                errorMessages: []
            }, connectionMetrics, connectionMetrics.uiState);
        }
    }
    isFailureFeedback(feedback) {
        const failureKeywords = ['failed', 'broken', 'stuck', 'not working', 'error'];
        return failureKeywords.some(keyword => feedback.toLowerCase().includes(keyword));
    }
    async captureUserFailurePattern(feedback, context) {
        // Capture user-reported failures for learning
        console.log(`👤 NLD Integration: User feedback captured: ${feedback}`);
    }
    determineSystemStatus(activeAlerts, connectionMetrics) {
        const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical').length;
        const highAlerts = activeAlerts.filter(a => a.severity === 'high').length;
        if (criticalAlerts > 0)
            return 'critical';
        if (highAlerts > 2 || activeAlerts.length > 5)
            return 'warning';
        return 'healthy';
    }
    summarizeDetectedPatterns() {
        // Get recent patterns from detector
        const analysis = this.patternDetector.analyzePatterns();
        return Object.entries(analysis.failureModes).map(([type, count]) => ({
            patternId: `pattern-${type}`,
            severity: this.mapFailureModeToSeverity(type),
            description: `${count} occurrences of ${type.replace(/_/g, ' ')}`,
            timestamp: new Date().toISOString()
        }));
    }
    assessConnectionHealth(connectionMetrics) {
        let statusHealthy = 0, terminalHealthy = 0, synchronized = 0;
        let total = connectionMetrics.size;
        if (total === 0) {
            return { statusSSE: 'healthy', terminalSSE: 'healthy', coordination: 'synchronized' };
        }
        for (const metrics of connectionMetrics.values()) {
            if (metrics.statusSSE.connected && metrics.statusSSE.connectionCount > 0)
                statusHealthy++;
            if (metrics.terminalSSE.connected && metrics.terminalSSE.connectionCount > 0)
                terminalHealthy++;
            if (metrics.statusSSE.connected === metrics.terminalSSE.connected)
                synchronized++;
        }
        return {
            statusSSE: statusHealthy / total > 0.8 ? 'healthy' : statusHealthy / total > 0.5 ? 'degraded' : 'failed',
            terminalSSE: terminalHealthy / total > 0.8 ? 'healthy' : terminalHealthy / total > 0.5 ? 'degraded' : 'failed',
            coordination: synchronized / total > 0.9 ? 'synchronized' : synchronized / total > 0.7 ? 'drift' : 'desynchronized'
        };
    }
    generateRecommendations(activeAlerts, patternAnalysis) {
        const immediate = [];
        const preventive = [];
        const tddImplementation = [];
        // Immediate actions based on active alerts
        if (activeAlerts.some(a => a.type === 'status_broadcast_zero')) {
            immediate.push('Restart status SSE connections for affected instances');
            immediate.push('Verify status broadcasting mechanism is active');
        }
        if (activeAlerts.some(a => a.type === 'ui_stuck_starting')) {
            immediate.push('Force status refresh for stuck instances');
            immediate.push('Implement status polling fallback');
        }
        // Preventive measures
        preventive.push('Implement connection health monitoring');
        preventive.push('Add connection establishment order validation');
        preventive.push('Create automatic recovery mechanisms');
        // TDD implementation
        tddImplementation.push('Implement connection order validation tests');
        tddImplementation.push('Add status update timeout tests');
        tddImplementation.push('Create connection state synchronization tests');
        return { immediate, preventive, tddImplementation };
    }
    async generateNeuralInsights(connectionMetrics) {
        const predictions = [];
        for (const [instanceId, metrics] of connectionMetrics.entries()) {
            // Simple heuristic-based predictions (would use actual neural network in production)
            let probability = 0;
            let failureType = 'none';
            if (metrics.uiState.status === 'starting' && metrics.uiState.stuckDuration > 10000) {
                probability = 0.8;
                failureType = 'ui_stuck_starting';
            }
            else if (metrics.statusSSE.connectionCount === 0 && metrics.terminalSSE.connectionCount > 0) {
                probability = 0.9;
                failureType = 'status_broadcast_zero';
            }
            else if (!metrics.statusSSE.connected && metrics.terminalSSE.connected) {
                probability = 0.7;
                failureType = 'status_sse_missing';
            }
            if (probability > 0.5) {
                predictions.push({
                    instanceId,
                    probability,
                    failureType,
                    recommendedActions: this.antiPatternsDB.getRecoveryActions(failureType)
                });
            }
        }
        return { failurePredictions: predictions };
    }
    mapFailureModeToSeverity(failureMode) {
        const severityMap = {
            'status_broadcast_zero': 'critical',
            'status_sse_missing': 'high',
            'ui_stuck_starting': 'high',
            'connection_coordination': 'medium',
            'terminal_input_broken': 'medium'
        };
        return severityMap[failureMode] || 'medium';
    }
}
exports.NLDSSEIntegrationSystem = NLDSSEIntegrationSystem;
//# sourceMappingURL=nld-sse-integration.js.map