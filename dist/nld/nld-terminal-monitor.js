"use strict";
/**
 * NLD Terminal Monitor
 *
 * Main orchestrator for terminal pipe failure detection
 * Coordinates all NLD components and provides real-time monitoring
 * Integrates with existing backend systems to monitor actual Claude processes
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
exports.NLDTerminalMonitor = void 0;
const events_1 = require("events");
const terminal_pipe_failure_detector_1 = require("./terminal-pipe-failure-detector");
const sse_event_flow_gap_detector_1 = require("./sse-event-flow-gap-detector");
const terminal_anti_patterns_database_1 = require("./terminal-anti-patterns-database");
const tdd_terminal_prevention_strategies_1 = require("./tdd-terminal-prevention-strategies");
const neural_training_integration_1 = require("./neural-training-integration");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class NLDTerminalMonitor extends events_1.EventEmitter {
    options;
    pipeFailureDetector;
    sseGapDetector;
    antiPatternsDB;
    tddStrategies;
    neuralIntegration;
    activeSessions = new Map();
    isMonitoring = false;
    constructor(options = {
        logDirectory: '/workspaces/agent-feed/src/nld/patterns/terminal-pipe-failures',
        reportInterval: 60000, // 1 minute
        alertThreshold: 3, // Alert after 3 critical failures
        enableRealTimeAlerts: true,
        enableNeuralPrediction: true,
        autoGenerateTests: true
    }) {
        super();
        this.options = options;
        this.initializeComponents();
        this.setupEventHandlers();
    }
    /**
     * Initialize all NLD components
     */
    initializeComponents() {
        this.pipeFailureDetector = new terminal_pipe_failure_detector_1.TerminalPipeFailureDetector({
            logDirectory: this.options.logDirectory,
            realTimeAlert: this.options.enableRealTimeAlerts
        });
        this.sseGapDetector = new sse_event_flow_gap_detector_1.SSEEventFlowGapDetector({
            logDirectory: this.options.logDirectory,
            realTimeAlert: this.options.enableRealTimeAlerts
        });
        this.antiPatternsDB = new terminal_anti_patterns_database_1.TerminalAntiPatternsDatabase({
            logDirectory: this.options.logDirectory
        });
        this.tddStrategies = new tdd_terminal_prevention_strategies_1.TDDTerminalPreventionStrategies({
            logDirectory: this.options.logDirectory,
            generateTestFiles: this.options.autoGenerateTests
        });
        this.neuralIntegration = new neural_training_integration_1.NeuralTrainingIntegration({
            logDirectory: this.options.logDirectory,
            enablePrediction: this.options.enableNeuralPrediction
        });
        console.log('🚀 NLD Terminal Monitor initialized with all components');
    }
    /**
     * Setup event handlers between components
     */
    setupEventHandlers() {
        // Pipe failure detection events
        this.pipeFailureDetector.on('criticalFailure', (failure) => {
            this.handleCriticalFailure(failure);
        });
        // SSE gap detection events
        this.sseGapDetector.on('criticalGap', (gap) => {
            this.handleSSEGap(gap);
        });
        // Neural training events
        this.neuralIntegration.on('trainingDataRecorded', (data) => {
            console.log(`🧠 Neural training data recorded: ${data.labels.failure_type}`);
        });
        // Start periodic reporting
        if (this.options.reportInterval > 0) {
            this.startPeriodicReporting();
        }
    }
    /**
     * Start monitoring a Claude instance
     */
    startMonitoring(instanceId, processInfo) {
        const sessionId = `nld-${instanceId}-${Date.now()}`;
        const session = {
            sessionId,
            instanceId,
            startTime: new Date(),
            processInfo,
            stats: {
                outputEvents: 0,
                sseEventsSent: 0,
                sseEventsReceived: 0,
                failuresDetected: 0,
                predictionsGenerated: 0
            }
        };
        this.activeSessions.set(sessionId, session);
        this.isMonitoring = true;
        console.log(`📊 NLD monitoring started for instance ${instanceId}`);
        console.log(`   Session ID: ${sessionId}`);
        console.log(`   Process: ${processInfo.command} (PID: ${processInfo.pid})`);
        console.log(`   Working Directory: ${processInfo.workingDirectory}`);
        // Generate prediction for this instance
        if (this.options.enableNeuralPrediction) {
            this.generateFailurePrediction(sessionId, processInfo);
        }
        this.emit('monitoringStarted', { sessionId, instanceId, processInfo });
        return sessionId;
    }
    /**
     * Monitor real process output
     */
    monitorProcessOutput(sessionId, outputData) {
        const session = this.activeSessions.get(sessionId);
        if (!session)
            return;
        session.stats.outputEvents++;
        // Monitor with pipe failure detector
        this.pipeFailureDetector.monitorRealProcessOutput(outputData.instanceId, {
            pid: outputData.pid,
            stdout: outputData.stdout || '',
            stderr: outputData.stderr || '',
            workingDirectory: outputData.workingDirectory,
            command: outputData.command
        });
        // Check for anti-patterns
        const output = (outputData.stdout || '') + (outputData.stderr || '');
        const detectedPatterns = this.antiPatternsDB.detectAntiPatterns(output, {
            processRunning: true,
            workingDirectory: outputData.workingDirectory
        });
        // Record patterns for neural training
        if (detectedPatterns.length > 0) {
            detectedPatterns.forEach(({ pattern, confidence }) => {
                this.neuralIntegration.recordFailurePattern(sessionId, {
                    type: pattern.category,
                    severity: pattern.severity,
                    instanceId: outputData.instanceId,
                    realProcessData: outputData,
                    tddfactor: pattern.tddfactor,
                    evidenceScore: confidence
                }, {
                    instanceType: 'unknown', // Could be inferred
                    command: outputData.command
                });
            });
        }
    }
    /**
     * Monitor frontend display output
     */
    monitorFrontendDisplay(sessionId, displayData) {
        const session = this.activeSessions.get(sessionId);
        if (!session)
            return;
        // Monitor with pipe failure detector
        this.pipeFailureDetector.monitorFrontendDisplay(displayData.instanceId, displayData);
        // Check for mock data patterns
        const detectedPatterns = this.antiPatternsDB.detectAntiPatterns(displayData.output, {
            responseType: displayData.responseType,
            workingDirectory: displayData.workingDirectory
        });
        if (detectedPatterns.length > 0) {
            session.stats.failuresDetected++;
            console.log(`🚨 NLD: Frontend anti-patterns detected in session ${sessionId}`);
            detectedPatterns.forEach(({ pattern, confidence }) => {
                console.log(`   - ${pattern.name} (confidence: ${confidence})`);
            });
        }
    }
    /**
     * Monitor SSE events
     */
    monitorSSEEvent(sessionId, eventData) {
        const session = this.activeSessions.get(sessionId);
        if (!session)
            return;
        if (eventData.sent) {
            session.stats.sseEventsSent++;
        }
        if (eventData.received) {
            session.stats.sseEventsReceived++;
        }
        // Monitor with SSE gap detector
        this.sseGapDetector.recordEventSent(eventData.instanceId, {
            type: eventData.type,
            data: eventData.data,
            connectionId: eventData.connectionId
        });
        if (eventData.received) {
            this.sseGapDetector.recordEventReceived(eventData.instanceId, {
                type: eventData.type,
                connectionId: eventData.connectionId
            });
        }
    }
    /**
     * Generate failure prediction for instance
     */
    async generateFailurePrediction(sessionId, processInfo) {
        const session = this.activeSessions.get(sessionId);
        if (!session)
            return;
        try {
            const features = {
                has_real_process: true,
                process_pid_exists: processInfo.pid > 0,
                stdout_handler_attached: true, // Assume true for now
                stderr_handler_attached: true,
                working_directory_correct: processInfo.workingDirectory.startsWith('/workspaces/agent-feed')
            };
            const prediction = await this.neuralIntegration.predictFailure(features);
            session.stats.predictionsGenerated++;
            if (prediction.failure_probability > 0.7) {
                console.log(`⚠️ NLD: High failure probability for session ${sessionId}`);
                console.log(`   Predicted Type: ${prediction.predicted_failure_type}`);
                console.log(`   Probability: ${prediction.failure_probability}`);
                console.log(`   Preventive Actions:`, prediction.preventive_actions);
                this.emit('highFailureRisk', { sessionId, prediction });
            }
        }
        catch (error) {
            console.error('Failed to generate failure prediction:', error);
        }
    }
    /**
     * Handle critical failure
     */
    handleCriticalFailure(failure) {
        console.log(`🚨 NLD: Critical terminal pipe failure detected!`);
        console.log(`   Type: ${failure.failureType}`);
        console.log(`   Instance: ${failure.instanceId}`);
        console.log(`   Evidence Score: ${failure.evidenceScore}`);
        // Find related session
        const relatedSession = Array.from(this.activeSessions.values())
            .find(s => s.instanceId === failure.instanceId);
        if (relatedSession) {
            relatedSession.stats.failuresDetected++;
        }
        // Generate immediate TDD recommendations
        const strategies = this.tddStrategies.getStrategiesForFailure(failure.failureType);
        console.log(`💡 TDD Prevention Strategies:`, strategies.map(s => s.name));
        this.emit('criticalFailureDetected', { failure, strategies });
    }
    /**
     * Handle SSE event flow gaps
     */
    handleSSEGap(gap) {
        console.log(`🚨 NLD: SSE Event Flow Gap detected!`);
        console.log(`   Type: ${gap.gapType}`);
        console.log(`   Gap Size: ${gap.gapSize} events`);
        console.log(`   Affected Connections: ${gap.affectedConnections.length}`);
        this.emit('sseGapDetected', gap);
    }
    /**
     * Generate comprehensive NLD report
     */
    generateReport(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const pipeStats = this.pipeFailureDetector.getFailureStats();
        const gapStats = this.sseGapDetector.getGapStats();
        const antiPatternStats = this.antiPatternsDB.getStatistics();
        const neuralStats = this.neuralIntegration.getTrainingStats();
        const report = {
            sessionId,
            timestamp: new Date().toISOString(),
            summary: {
                totalFailures: pipeStats.totalFailures + gapStats.totalGaps,
                criticalFailures: pipeStats.bySeverity.critical || 0,
                preventionOpportunities: this.calculatePreventionOpportunities(pipeStats),
                neuralPredictionAccuracy: neuralStats.modelMetrics.accuracy
            },
            detectedPatterns: this.summarizeDetectedPatterns(pipeStats, gapStats),
            recommendations: {
                immediateActions: this.generateImmediateActions(pipeStats, gapStats),
                tddStrategies: this.generateTDDRecommendations(pipeStats),
                neuralInsights: this.generateNeuralInsights(neuralStats)
            },
            effectiveness: {
                tddFactor: pipeStats.averageTDDFactor,
                preventionSuccess: this.calculatePreventionSuccess(session),
                patternDetectionAccuracy: pipeStats.averageEvidenceScore
            }
        };
        // Save report to file
        this.saveReport(report);
        return report;
    }
    /**
     * Helper methods for report generation
     */
    calculatePreventionOpportunities(stats) {
        return Object.entries(stats.byType)
            .filter(([_, count]) => count > 0)
            .length;
    }
    summarizeDetectedPatterns(pipeStats, gapStats) {
        const patterns = [];
        for (const [type, count] of Object.entries(pipeStats.byType)) {
            if (count > 0) {
                patterns.push({
                    pattern: type,
                    confidence: 0.8, // Simplified
                    severity: 'medium',
                    prevention: `TDD strategies available for ${type}`
                });
            }
        }
        for (const [type, count] of Object.entries(gapStats.byType)) {
            if (count > 0) {
                patterns.push({
                    pattern: `sse_${type}`,
                    confidence: 0.7,
                    severity: 'high',
                    prevention: `Event flow monitoring for ${type}`
                });
            }
        }
        return patterns;
    }
    generateImmediateActions(pipeStats, gapStats) {
        const actions = [];
        if (pipeStats.bySeverity.critical > 0) {
            actions.push('Review critical pipe connection failures immediately');
        }
        if (gapStats.averageGapSize > 10) {
            actions.push('Investigate SSE event delivery issues');
        }
        if (pipeStats.byType.mock_data_detected > 0) {
            actions.push('Remove mock data from production terminal displays');
        }
        return actions;
    }
    generateTDDRecommendations(pipeStats) {
        const recommendations = [];
        if (pipeStats.averageTDDFactor < 0.7) {
            recommendations.push('Increase TDD coverage for terminal pipe functionality');
        }
        recommendations.push('Implement contract tests for process output validation');
        recommendations.push('Add integration tests for SSE event flow');
        return recommendations;
    }
    generateNeuralInsights(neuralStats) {
        const insights = [];
        insights.push(`Model accuracy: ${(neuralStats.modelMetrics.accuracy * 100).toFixed(1)}%`);
        insights.push(`Training samples: ${neuralStats.totalSamples}`);
        if (neuralStats.averageTDDFactor > 0.8) {
            insights.push('High TDD factor indicates good prevention potential');
        }
        return insights;
    }
    calculatePreventionSuccess(session) {
        if (session.stats.failuresDetected === 0)
            return 1.0;
        return 1.0 - (session.stats.failuresDetected / session.stats.outputEvents);
    }
    /**
     * Save report to file
     */
    saveReport(report) {
        const reportPath = path.join(this.options.logDirectory, `nld-report-${report.sessionId}-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`📋 NLD report saved: ${reportPath}`);
    }
    /**
     * Start periodic reporting
     */
    startPeriodicReporting() {
        setInterval(() => {
            this.activeSessions.forEach((session, sessionId) => {
                try {
                    const report = this.generateReport(sessionId);
                    this.emit('periodicReport', report);
                }
                catch (error) {
                    console.error(`Failed to generate periodic report for ${sessionId}:`, error);
                }
            });
        }, this.options.reportInterval);
    }
    /**
     * Stop monitoring a session
     */
    stopMonitoring(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session)
            return;
        // Generate final report
        const finalReport = this.generateReport(sessionId);
        // Cleanup
        this.pipeFailureDetector.cleanup(session.instanceId);
        this.sseGapDetector.cleanup(session.instanceId);
        this.activeSessions.delete(sessionId);
        console.log(`📊 NLD monitoring stopped for session ${sessionId}`);
        this.emit('monitoringStopped', { sessionId, finalReport });
    }
    /**
     * Get current monitoring status
     */
    getStatus() {
        const totalFailures = Array.from(this.activeSessions.values())
            .reduce((sum, s) => sum + s.stats.failuresDetected, 0);
        const totalPredictions = Array.from(this.activeSessions.values())
            .reduce((sum, s) => sum + s.stats.predictionsGenerated, 0);
        let systemHealth = 'healthy';
        if (totalFailures > 10)
            systemHealth = 'critical';
        else if (totalFailures > 3)
            systemHealth = 'warning';
        return {
            isMonitoring: this.isMonitoring,
            activeSessions: this.activeSessions.size,
            totalFailures,
            totalPredictions,
            systemHealth
        };
    }
    /**
     * Export all NLD data for analysis
     */
    exportData() {
        const exportData = {
            timestamp: new Date().toISOString(),
            activeSessions: Object.fromEntries(this.activeSessions),
            pipeFailureStats: this.pipeFailureDetector.getFailureStats(),
            sseGapStats: this.sseGapDetector.getGapStats(),
            antiPatternStats: this.antiPatternsDB.getStatistics(),
            neuralStats: this.neuralIntegration.getTrainingStats(),
            status: this.getStatus()
        };
        const exportPath = path.join(this.options.logDirectory, `nld-export-${Date.now()}.json`);
        fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
        console.log(`📦 NLD data exported: ${exportPath}`);
        return exportPath;
    }
}
exports.NLDTerminalMonitor = NLDTerminalMonitor;
//# sourceMappingURL=nld-terminal-monitor.js.map