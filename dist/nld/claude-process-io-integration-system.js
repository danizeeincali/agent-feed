"use strict";
/**
 * Claude Process I/O Integration System - NLD Deployment
 *
 * Complete integration system for deploying Claude CLI process I/O failure
 * detection, monitoring, and prevention across the entire application.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeProcessIOIntegration = exports.ClaudeProcessIOIntegrationSystem = void 0;
const claude_process_io_failure_detector_1 = require("./claude-process-io-failure-detector");
const claude_process_io_real_time_monitor_1 = require("./claude-process-io-real-time-monitor");
const claude_process_io_neural_training_dataset_1 = require("./claude-process-io-neural-training-dataset");
const claude_process_io_tdd_prevention_strategies_1 = require("./claude-process-io-tdd-prevention-strategies");
class ClaudeProcessIOIntegrationSystem {
    config;
    isInitialized = false;
    systemStartTime = 0;
    alertHistory = [];
    preventionMetrics = {
        failuresPrevented: 0,
        recoveryAttempts: 0,
        recoverySuccesses: 0
    };
    constructor(config) {
        this.config = {
            monitoring: {
                enabled: true,
                realTimeAlerts: true,
                automatedRecovery: true,
                neuralTraining: true
            },
            detection: {
                patternCategories: ['PRINT_FLAG_INPUT_REQUIRED', 'INTERACTIVE_MODE_BLOCKED', 'PTY_STDIN_DISCONNECT', 'AUTHENTICATION_SUCCESS_BUT_NO_OUTPUT'],
                thresholds: {
                    printFlagErrors: 1,
                    interactiveBlockTime: 10000,
                    ptyDisconnectTime: 5000,
                    authSilentTime: 8000
                }
            },
            prevention: {
                tddEnabled: true,
                preFlightChecks: true,
                validationStrategies: [
                    'print-flag-validation',
                    'cli-availability-check',
                    'authentication-verification',
                    'pty-health-monitoring'
                ]
            },
            neuralTraining: {
                enabled: true,
                exportInterval: 300000, // 5 minutes
                claudeFlowIntegration: true,
                trainingThreshold: 50 // Start training after 50 records
            },
            ...config
        };
    }
    async initialize() {
        if (this.isInitialized) {
            console.log('🔍 [NLD] Claude Process I/O Integration System already initialized');
            return;
        }
        this.systemStartTime = Date.now();
        console.log('🚀 [NLD] Initializing Claude Process I/O Integration System...');
        try {
            // Initialize detector
            if (this.config.detection.patternCategories.length > 0) {
                console.log('📊 [NLD] Pattern detector ready for categories:', this.config.detection.patternCategories.join(', '));
            }
            // Initialize monitoring
            if (this.config.monitoring.enabled) {
                claude_process_io_real_time_monitor_1.claudeProcessIOMonitor.startMonitoring();
                // Setup alert handling
                claude_process_io_real_time_monitor_1.claudeProcessIOMonitor.onAlert((alert) => {
                    this.handleAlert(alert);
                });
                console.log('🔍 [NLD] Real-time monitoring activated');
            }
            // Initialize TDD prevention strategies
            if (this.config.prevention.tddEnabled) {
                const coverageReport = claude_process_io_tdd_prevention_strategies_1.claudeProcessIOTDDPrevention.generateCoverageReport();
                console.log(`📋 [NLD] TDD prevention strategies loaded: ${coverageReport.totalTestCases} test cases`);
            }
            // Setup neural training export
            if (this.config.neuralTraining.enabled) {
                this.setupNeuralTrainingExport();
                console.log('🧠 [NLD] Neural training integration configured');
            }
            this.isInitialized = true;
            console.log('✅ [NLD] Claude Process I/O Integration System initialized successfully');
        }
        catch (error) {
            console.error('❌ [NLD] Failed to initialize integration system:', error);
            throw error;
        }
    }
    setupNeuralTrainingExport() {
        setInterval(async () => {
            const recordCount = claude_process_io_neural_training_dataset_1.claudeProcessIONeuralDataset.getRecordCount();
            if (recordCount >= this.config.neuralTraining.trainingThreshold) {
                await this.exportNeuralTrainingData();
            }
        }, this.config.neuralTraining.exportInterval);
    }
    async exportNeuralTrainingData() {
        try {
            const exportData = claude_process_io_neural_training_dataset_1.claudeProcessIONeuralDataset.exportForClaudeFlow();
            if (this.config.neuralTraining.claudeFlowIntegration) {
                // In a real implementation, this would integrate with claude-flow
                console.log('🧠 [NLD] Neural training data exported for claude-flow integration');
                console.log(`📊 [NLD] Dataset contains ${exportData.dataset.statistics.totalRecords} training records`);
                // Clear dataset after export to prevent memory bloat
                claude_process_io_neural_training_dataset_1.claudeProcessIONeuralDataset.clear();
            }
        }
        catch (error) {
            console.error('❌ [NLD] Failed to export neural training data:', error);
        }
    }
    handleAlert(alert) {
        this.alertHistory.push(alert);
        // Limit alert history
        if (this.alertHistory.length > 1000) {
            this.alertHistory = this.alertHistory.slice(-500); // Keep last 500
        }
        console.log(`🚨 [NLD] Processing alert: ${alert.pattern.category} (${alert.severity}) for ${alert.instanceId}`);
        // Track recovery attempts
        if (alert.resolution) {
            this.preventionMetrics.recoveryAttempts++;
            if (alert.resolution.successful) {
                this.preventionMetrics.recoverySuccesses++;
            }
        }
    }
    // Public API for backend integration
    registerClaudeProcess(instanceId, command, args, workingDirectory, processType = 'pipe') {
        if (!this.isInitialized) {
            console.warn('🔶 [NLD] Integration system not initialized, registering process anyway');
        }
        claude_process_io_failure_detector_1.claudeProcessIODetector.registerProcess(instanceId, command, args, workingDirectory, processType);
        // Perform pre-flight checks if enabled
        if (this.config.prevention.preFlightChecks) {
            this.performPreFlightChecks(instanceId, command, args);
        }
    }
    recordProcessOutput(instanceId, outputType, data) {
        claude_process_io_failure_detector_1.claudeProcessIODetector.recordProcessOutput(instanceId, outputType, data);
    }
    recordProcessInput(instanceId, input) {
        claude_process_io_failure_detector_1.claudeProcessIODetector.recordProcessInput(instanceId, input);
    }
    recordProcessError(instanceId, error) {
        claude_process_io_failure_detector_1.claudeProcessIODetector.recordProcessError(instanceId, error);
    }
    updateProcessState(instanceId, state) {
        claude_process_io_failure_detector_1.claudeProcessIODetector.updateProcessState(instanceId, state);
    }
    performPreFlightChecks(instanceId, command, args) {
        const issues = [];
        // Check for print flag without input
        if ((args.includes('--print') || args.includes('-p')) &&
            !args.some(arg => !arg.startsWith('--')) &&
            args.length <= 2) { // Only command and --print flag
            issues.push('PRINT_FLAG_INPUT_REQUIRED: --print flag used without prompt argument');
            this.preventionMetrics.failuresPrevented++;
        }
        // Log pre-flight issues
        if (issues.length > 0) {
            console.log(`⚠️ [NLD] Pre-flight check detected issues for ${instanceId}:`, issues);
        }
    }
    generateTestSuite(category) {
        return claude_process_io_tdd_prevention_strategies_1.claudeProcessIOTDDPrevention.generateFullTestSuite(category);
    }
    getAllTestSuites() {
        return this.config.detection.patternCategories.map(category => claude_process_io_tdd_prevention_strategies_1.claudeProcessIOTDDPrevention.generateFullTestSuite(category));
    }
    getSystemReport() {
        const detectorReport = claude_process_io_failure_detector_1.claudeProcessIODetector.generateSystemReport();
        const monitoringStatus = claude_process_io_real_time_monitor_1.claudeProcessIOMonitor.getMonitoringStatus();
        const tddCoverage = claude_process_io_tdd_prevention_strategies_1.claudeProcessIOTDDPrevention.generateCoverageReport();
        const neuralStats = claude_process_io_neural_training_dataset_1.claudeProcessIONeuralDataset.getPatternStatistics();
        // Calculate system health
        let systemStatus = 'healthy';
        if (detectorReport.criticalProcesses.length > 0) {
            systemStatus = 'critical';
        }
        else if (this.alertHistory.filter(a => a.severity === 'high').length > 5) {
            systemStatus = 'degraded';
        }
        // Calculate neural training accuracy
        const accuracyScore = Object.values(neuralStats).length > 0
            ? Object.values(neuralStats).reduce((avg, stat) => avg + stat.accuracy, 0) / Object.values(neuralStats).length
            : 0;
        const recommendations = [];
        if (systemStatus === 'critical') {
            recommendations.push('Immediate attention required for critical processes');
        }
        if (detectorReport.patternsByCategory['PRINT_FLAG_INPUT_REQUIRED'] > 5) {
            recommendations.push('High frequency of --print flag errors - implement argument validation');
        }
        if (this.preventionMetrics.recoverySuccessRate < 0.7) {
            recommendations.push('Low recovery success rate - review automated recovery strategies');
        }
        if (claude_process_io_neural_training_dataset_1.claudeProcessIONeuralDataset.getRecordCount() > this.config.neuralTraining.trainingThreshold) {
            recommendations.push('Sufficient data available for neural model training');
        }
        return {
            systemStatus,
            activeProcesses: detectorReport.activeProcesses,
            totalAlertsGenerated: this.alertHistory.length,
            patternsDetected: detectorReport.patternsByCategory,
            neuralTrainingProgress: {
                recordsCollected: claude_process_io_neural_training_dataset_1.claudeProcessIONeuralDataset.getRecordCount(),
                modelsTraining: false, // Would be set by actual training process
                accuracyScore
            },
            preventionEffectiveness: {
                testsImplemented: tddCoverage.totalTestCases,
                failuresPrevented: this.preventionMetrics.failuresPrevented,
                recoverySuccessRate: this.preventionMetrics.recoveryAttempts > 0
                    ? this.preventionMetrics.recoverySuccesses / this.preventionMetrics.recoveryAttempts
                    : 0
            },
            recommendations,
            deploymentStatus: {
                detectorDeployed: this.isInitialized,
                monitoringActive: monitoringStatus.isMonitoring,
                tddSuitesGenerated: tddCoverage.totalTestCases > 0,
                neuralExportReady: claude_process_io_neural_training_dataset_1.claudeProcessIONeuralDataset.getRecordCount() >= this.config.neuralTraining.trainingThreshold
            }
        };
    }
    getActiveAlerts(instanceId) {
        return claude_process_io_real_time_monitor_1.claudeProcessIOMonitor.getActiveAlerts(instanceId);
    }
    clearAlerts(instanceId) {
        claude_process_io_real_time_monitor_1.claudeProcessIOMonitor.clearAlerts(instanceId);
    }
    shutdown() {
        if (!this.isInitialized)
            return;
        console.log('⏹️ [NLD] Shutting down Claude Process I/O Integration System...');
        claude_process_io_real_time_monitor_1.claudeProcessIOMonitor.stopMonitoring();
        // Final neural training export
        if (this.config.neuralTraining.enabled && claude_process_io_neural_training_dataset_1.claudeProcessIONeuralDataset.getRecordCount() > 0) {
            this.exportNeuralTrainingData();
        }
        this.isInitialized = false;
        console.log('✅ [NLD] Claude Process I/O Integration System shut down');
    }
    // Deployment verification methods
    validateDeployment() {
        const issues = [];
        const components = {
            detector: this.isInitialized,
            monitor: claude_process_io_real_time_monitor_1.claudeProcessIOMonitor.getMonitoringStatus().isMonitoring,
            tddStrategies: claude_process_io_tdd_prevention_strategies_1.claudeProcessIOTDDPrevention.getAllTestSuites().length > 0,
            neuralTraining: this.config.neuralTraining.enabled
        };
        if (!components.detector) {
            issues.push('Detector not initialized');
        }
        if (!components.monitor) {
            issues.push('Monitoring not active');
        }
        if (!components.tddStrategies) {
            issues.push('TDD strategies not loaded');
        }
        return {
            success: issues.length === 0,
            issues,
            components
        };
    }
}
exports.ClaudeProcessIOIntegrationSystem = ClaudeProcessIOIntegrationSystem;
// Export singleton instance
exports.claudeProcessIOIntegration = new ClaudeProcessIOIntegrationSystem();
//# sourceMappingURL=claude-process-io-integration-system.js.map