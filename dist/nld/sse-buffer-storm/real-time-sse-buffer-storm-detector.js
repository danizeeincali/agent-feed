"use strict";
/**
 * NLD Real-Time SSE Buffer Storm Detector
 *
 * Detects critical failure pattern: SSE endpoints sending full buffer
 * instead of incremental data, causing massive message duplication storms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sseBufferStormDetector = exports.RealTimeSSEBufferStormDetector = void 0;
const events_1 = require("events");
const fs_1 = require("fs");
const path_1 = require("path");
class RealTimeSSEBufferStormDetector extends events_1.EventEmitter {
    messageBuffer = new Map();
    positionTracking = new Map();
    duplicateCounters = new Map();
    patternDatabase = [];
    monitoringActive = false;
    storageDir;
    constructor(storageDir = '/workspaces/agent-feed/src/nld/sse-buffer-storm/patterns') {
        super();
        this.storageDir = storageDir;
        this.setupMonitoring();
    }
    setupMonitoring() {
        this.monitoringActive = true;
        // Monitor for buffer accumulation storms every 100ms
        setInterval(() => {
            if (this.monitoringActive) {
                this.detectBufferStorms();
            }
        }, 100);
        // Analyze position tracking failures every 500ms
        setInterval(() => {
            if (this.monitoringActive) {
                this.analyzePositionTracking();
            }
        }, 500);
        // Check for integration gaps every 1000ms
        setInterval(() => {
            if (this.monitoringActive) {
                this.detectIntegrationGaps();
            }
        }, 1000);
    }
    /**
     * Monitor SSE message for buffer storm patterns
     */
    captureSSEMessage(message) {
        const endpoint = message.endpoint;
        // Initialize tracking for new endpoints
        if (!this.messageBuffer.has(endpoint)) {
            this.messageBuffer.set(endpoint, []);
            this.positionTracking.set(endpoint, 0);
            this.duplicateCounters.set(endpoint, 0);
        }
        const buffer = this.messageBuffer.get(endpoint);
        buffer.push(message);
        // Keep buffer size manageable (last 1000 messages)
        if (buffer.length > 1000) {
            buffer.shift();
        }
        // Detect immediate duplication
        this.detectImmediateDuplication(endpoint, message);
    }
    detectImmediateDuplication(endpoint, message) {
        const buffer = this.messageBuffer.get(endpoint);
        const recentMessages = buffer.slice(-10); // Check last 10 messages
        const duplicateCount = recentMessages.filter(msg => msg.data === message.data && msg.id !== message.id).length;
        if (duplicateCount > 3) {
            this.duplicateCounters.set(endpoint, (this.duplicateCounters.get(endpoint) || 0) + duplicateCount);
            if (duplicateCount > 5) {
                this.recordBufferStormPattern(endpoint, 'BUFFER_REPLAY_LOOP', 'CRITICAL', {
                    bufferSize: buffer.length,
                    duplicateCount,
                    positionAdvancement: false,
                    integrationGap: true
                });
            }
        }
    }
    detectBufferStorms() {
        for (const [endpoint, buffer] of this.messageBuffer.entries()) {
            if (buffer.length < 10)
                continue;
            const recentMessages = buffer.slice(-50);
            const uniqueMessages = new Set(recentMessages.map(m => m.data));
            const duplicateRatio = 1 - (uniqueMessages.size / recentMessages.length);
            // CRITICAL: More than 70% duplicate content indicates buffer storm
            if (duplicateRatio > 0.7) {
                const duplicateCount = this.duplicateCounters.get(endpoint) || 0;
                this.recordBufferStormPattern(endpoint, 'BUFFER_REPLAY_LOOP', 'CRITICAL', {
                    bufferSize: buffer.length,
                    duplicateCount: duplicateCount + Math.floor(recentMessages.length * duplicateRatio),
                    positionAdvancement: false,
                    integrationGap: true
                });
                this.emit('bufferStormDetected', {
                    endpoint,
                    duplicateRatio,
                    bufferSize: buffer.length,
                    severity: 'CRITICAL'
                });
            }
        }
    }
    analyzePositionTracking() {
        for (const [endpoint, currentPosition] of this.positionTracking.entries()) {
            const buffer = this.messageBuffer.get(endpoint);
            if (!buffer || buffer.length < 5)
                continue;
            const recentMessages = buffer.slice(-10);
            const positionsAdvancing = recentMessages.some(msg => msg.position !== undefined && msg.position > currentPosition);
            if (!positionsAdvancing && recentMessages.length > 5) {
                this.recordBufferStormPattern(endpoint, 'POSITION_TRACKING_FAILURE', 'HIGH', {
                    bufferSize: buffer.length,
                    duplicateCount: this.duplicateCounters.get(endpoint) || 0,
                    positionAdvancement: false,
                    integrationGap: true
                });
                this.emit('positionTrackingFailure', {
                    endpoint,
                    currentPosition,
                    messagesWithoutAdvancement: recentMessages.length
                });
            }
        }
    }
    detectIntegrationGaps() {
        // Detect when helper functions exist but aren't integrated with actual SSE endpoints
        for (const [endpoint, buffer] of this.messageBuffer.entries()) {
            if (buffer.length < 20)
                continue;
            const recentMessages = buffer.slice(-20);
            const hasIncrementalData = recentMessages.some(msg => msg.data.includes('"incremental":true') || msg.data.includes('"position":'));
            const hasFullBufferData = recentMessages.some(msg => msg.data.length > 5000 || msg.data.includes('"full_buffer":true'));
            // Integration gap: receiving full buffers when incremental expected
            if (hasFullBufferData && !hasIncrementalData) {
                this.recordBufferStormPattern(endpoint, 'INTEGRATION_GAP', 'CRITICAL', {
                    bufferSize: buffer.length,
                    duplicateCount: this.duplicateCounters.get(endpoint) || 0,
                    positionAdvancement: false,
                    integrationGap: true
                });
                this.emit('integrationGapDetected', {
                    endpoint,
                    pattern: 'Helper functions not integrated with actual SSE endpoints',
                    severity: 'CRITICAL'
                });
            }
        }
    }
    recordBufferStormPattern(endpoint, antiPatternType, severity, details) {
        const pattern = {
            id: `sse-buffer-storm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            endpoint,
            bufferSize: details.bufferSize,
            duplicateCount: details.duplicateCount,
            positionAdvancement: details.positionAdvancement,
            integrationGap: details.integrationGap,
            severity,
            antiPatternType,
            trainingData: {
                claimedSolution: "Implemented SSE incremental output with position tracking",
                actualFailure: "Helper functions not integrated with actual SSE endpoints causing full buffer replay",
                tddFactor: 0.2, // Low TDD - solution not tested with real integration
                effectivenessScore: 0.1 // Very low effectiveness due to integration gap
            }
        };
        this.patternDatabase.push(pattern);
        this.persistPattern(pattern);
        this.emit('patternDetected', pattern);
    }
    persistPattern(pattern) {
        const patternFile = (0, path_1.join)(this.storageDir, 'sse-buffer-storm-patterns.jsonl');
        (0, fs_1.appendFileSync)(patternFile, JSON.stringify(pattern) + '\n', { flag: 'a' });
    }
    /**
     * Export neural training dataset for claude-flow
     */
    exportNeuralTrainingDataset() {
        const trainingData = {
            patterns: this.patternDatabase,
            antiPatternSignatures: [
                {
                    name: 'SSE_BUFFER_REPLAY_LOOP',
                    indicators: ['duplicate_ratio > 0.7', 'position_not_advancing', 'full_buffer_sent'],
                    severity: 'CRITICAL',
                    tddPreventionStrategy: 'Test SSE endpoints with real streaming data, not isolated helpers'
                },
                {
                    name: 'IMPLEMENTATION_INTEGRATION_GAP',
                    indicators: ['helper_functions_exist', 'not_called_by_endpoints', 'claimed_success'],
                    severity: 'CRITICAL',
                    tddPreventionStrategy: 'Integration tests must validate actual endpoint behavior'
                }
            ],
            effectiveness_analysis: {
                low_tdd_factor_correlation: this.patternDatabase.filter(p => p.trainingData.tddFactor < 0.3).length,
                integration_gap_patterns: this.patternDatabase.filter(p => p.integrationGap).length,
                total_critical_failures: this.patternDatabase.filter(p => p.severity === 'CRITICAL').length
            },
            neural_training_export: {
                format: 'claude-flow-neural',
                version: '2.0.0',
                timestamp: Date.now(),
                ready_for_training: true
            }
        };
        const exportFile = (0, path_1.join)(this.storageDir, 'neural-training-export.json');
        (0, fs_1.writeFileSync)(exportFile, JSON.stringify(trainingData, null, 2));
        console.log(`[NLD] Neural training dataset exported: ${exportFile}`);
        console.log(`[NLD] Total patterns captured: ${this.patternDatabase.length}`);
        console.log(`[NLD] Critical failures: ${trainingData.effectiveness_analysis.total_critical_failures}`);
    }
    /**
     * Get current monitoring statistics
     */
    getMonitoringStats() {
        return {
            endpointsMonitored: this.messageBuffer.size,
            totalPatternsDetected: this.patternDatabase.length,
            criticalPatterns: this.patternDatabase.filter(p => p.severity === 'CRITICAL').length,
            integrationGaps: this.patternDatabase.filter(p => p.integrationGap).length,
            averageTDDFactor: this.patternDatabase.length > 0
                ? this.patternDatabase.reduce((sum, p) => sum + p.trainingData.tddFactor, 0) / this.patternDatabase.length
                : 0
        };
    }
    stopMonitoring() {
        this.monitoringActive = false;
    }
    startMonitoring() {
        this.monitoringActive = true;
    }
}
exports.RealTimeSSEBufferStormDetector = RealTimeSSEBufferStormDetector;
// Export singleton instance for immediate use
exports.sseBufferStormDetector = new RealTimeSSEBufferStormDetector();
//# sourceMappingURL=real-time-sse-buffer-storm-detector.js.map