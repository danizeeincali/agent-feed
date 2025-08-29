"use strict";
/**
 * Output Buffer Management Failure Patterns Documentation
 * Documents and analyzes output buffer management failures in SSE streaming
 * Part of NLD (Neuro-Learning Development) system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutputBufferManagementFailurePatterns = void 0;
const events_1 = require("events");
const fs_1 = require("fs");
const path_1 = require("path");
class OutputBufferManagementFailurePatterns extends events_1.EventEmitter {
    bufferFailures = [];
    parserFailures = [];
    streamingFailures = [];
    patternStorage;
    bufferMonitoring = new Map();
    constructor(storageDir) {
        super();
        this.patternStorage = (0, path_1.join)(storageDir, 'output-buffer-failure-patterns.json');
        this.loadExistingPatterns();
        console.log('📊 Output Buffer Management Failure Pattern Analyzer initialized');
    }
    /**
     * Document buffer overflow failure pattern
     */
    documentBufferOverflowFailure(instanceId, bufferType, currentSize, capacity, triggerCondition, stackTrace) {
        const bufferState = {
            size: currentSize,
            position: currentSize,
            capacity,
            lastWrite: new Date().toISOString(),
            lastRead: '',
            overflowCount: 1,
            underflowCount: 0
        };
        const pattern = {
            patternId: `buffer-overflow-${instanceId}-${Date.now()}`,
            instanceId,
            failureType: 'overflow',
            bufferType: bufferType,
            bufferState,
            failureDetails: {
                triggerCondition,
                reproducibilityRate: this.calculateReproducibilityRate(instanceId, 'overflow'),
                impactSeverity: currentSize > capacity * 2 ? 'critical' : 'high',
                affectedConnections: 1,
                dataLoss: true
            },
            technicalCause: `Buffer size ${currentSize} exceeded capacity ${capacity}`,
            manifestation: 'Messages lost, memory allocation failures, system instability',
            detectedAt: new Date().toISOString(),
            stackTrace
        };
        this.recordBufferFailure(pattern);
        console.error(`💥 Buffer Overflow Failure: ${bufferType} buffer ${currentSize}/${capacity} bytes`);
    }
    /**
     * Document buffer position reset failure
     */
    documentPositionResetFailure(instanceId, bufferType, expectedPosition, actualPosition, content) {
        const bufferState = {
            size: content.length,
            position: actualPosition,
            capacity: content.length,
            lastWrite: new Date().toISOString(),
            lastRead: new Date().toISOString(),
            overflowCount: 0,
            underflowCount: 1
        };
        const pattern = {
            patternId: `position-reset-${instanceId}-${Date.now()}`,
            instanceId,
            failureType: 'position_reset',
            bufferType: bufferType,
            bufferState,
            failureDetails: {
                triggerCondition: `Position reset from ${expectedPosition} to ${actualPosition}`,
                reproducibilityRate: this.calculateReproducibilityRate(instanceId, 'position_reset'),
                impactSeverity: 'critical',
                affectedConnections: 999, // Affects all connections
                dataLoss: false
            },
            technicalCause: 'Buffer read/write position tracking failure causing replay from beginning',
            manifestation: '1000+ duplicate messages streamed to frontend',
            detectedAt: new Date().toISOString()
        };
        this.recordBufferFailure(pattern);
        console.error(`🔄 Position Reset Failure: Expected ${expectedPosition}, got ${actualPosition}`);
    }
    /**
     * Document Claude output parser failure
     */
    documentClaudeOutputParserFailure(instanceId, parserState, inputSize, inputContent, outputSize, outputContent, errorStage, errorType, errorMessage) {
        const failure = {
            patternId: `parser-failure-${instanceId}-${Date.now()}`,
            instanceId,
            parserState: parserState,
            inputBuffer: {
                size: inputSize,
                content: inputContent.substring(0, 500),
                lastPosition: inputSize
            },
            outputBuffer: {
                size: outputSize,
                content: outputContent.substring(0, 500),
                writePosition: outputSize,
                readPosition: 0
            },
            processingFailure: {
                stage: errorStage,
                errorType: errorType,
                errorMessage
            },
            detectedAt: new Date().toISOString()
        };
        this.parserFailures.push(failure);
        this.persistPatterns();
        console.error(`🤖 Claude Parser Failure: ${errorType} in ${errorStage} - ${errorMessage}`);
    }
    /**
     * Document SSE streaming failure
     */
    documentSSEStreamingFailure(instanceId, streamingStage, failureMode, connectionStats, messageStats) {
        const failure = {
            patternId: `sse-streaming-${instanceId}-${Date.now()}`,
            instanceId,
            streamingStage: streamingStage,
            failureMode: failureMode,
            connectionDetails: {
                totalConnections: connectionStats.total,
                activeConnections: connectionStats.active,
                zombieConnections: connectionStats.zombie,
                failedBroadcasts: connectionStats.failed
            },
            messageDetails: {
                totalMessages: messageStats.total,
                duplicateMessages: messageStats.duplicates,
                corruptedMessages: messageStats.corrupted,
                lostMessages: messageStats.lost
            },
            detectedAt: new Date().toISOString()
        };
        this.streamingFailures.push(failure);
        this.persistPatterns();
        console.error(`🌊 SSE Streaming Failure: ${failureMode} in ${streamingStage}`);
    }
    /**
     * Analyze buffer state changes over time
     */
    analyzeBufferStateProgression(instanceId, currentState) {
        const previousState = this.bufferMonitoring.get(instanceId);
        if (previousState) {
            // Check for suspicious state changes
            if (currentState.position < previousState.position &&
                currentState.size === previousState.size) {
                // Position reset without size change - classic replay bug
                this.documentPositionResetFailure(instanceId, 'parser_buffer', previousState.position, currentState.position, 'Buffer content unchanged');
            }
            if (currentState.size > currentState.capacity) {
                // Buffer overflow detected
                this.documentBufferOverflowFailure(instanceId, 'instance_buffer', currentState.size, currentState.capacity, 'Buffer size exceeded capacity during write operation');
            }
        }
        this.bufferMonitoring.set(instanceId, { ...currentState });
    }
    /**
     * Identify memory leak patterns in buffer management
     */
    identifyMemoryLeakPatterns() {
        const instanceBufferSizes = new Map();
        // Collect buffer sizes over time for each instance
        this.bufferFailures.forEach(failure => {
            if (!instanceBufferSizes.has(failure.instanceId)) {
                instanceBufferSizes.set(failure.instanceId, []);
            }
            instanceBufferSizes.get(failure.instanceId).push(failure.bufferState.size);
        });
        // Identify instances with consistently growing buffer sizes
        instanceBufferSizes.forEach((sizes, instanceId) => {
            if (sizes.length >= 5) {
                const isGrowing = sizes.every((size, index) => index === 0 || size >= sizes[index - 1]);
                if (isGrowing && sizes[sizes.length - 1] > sizes[0] * 2) {
                    const pattern = {
                        patternId: `memory-leak-${instanceId}-${Date.now()}`,
                        instanceId,
                        failureType: 'memory_leak',
                        bufferType: 'global_output',
                        bufferState: {
                            size: sizes[sizes.length - 1],
                            position: sizes[sizes.length - 1],
                            capacity: sizes[0],
                            lastWrite: new Date().toISOString(),
                            lastRead: '',
                            overflowCount: sizes.length,
                            underflowCount: 0
                        },
                        failureDetails: {
                            triggerCondition: 'Continuously growing buffer size without cleanup',
                            reproducibilityRate: 100,
                            impactSeverity: 'critical',
                            affectedConnections: 1,
                            dataLoss: false
                        },
                        technicalCause: 'Buffer not being cleared or reset, accumulating data over time',
                        manifestation: 'Memory usage growth, eventual system instability',
                        detectedAt: new Date().toISOString()
                    };
                    this.recordBufferFailure(pattern);
                    console.error(`🧟 Memory Leak Pattern: Instance ${instanceId} buffer grew from ${sizes[0]} to ${sizes[sizes.length - 1]} bytes`);
                }
            }
        });
    }
    /**
     * Calculate reproducibility rate for failure types
     */
    calculateReproducibilityRate(instanceId, failureType) {
        const sameTypeFailures = this.bufferFailures.filter(f => f.instanceId === instanceId && f.failureType === failureType);
        // Higher count = higher reproducibility
        return Math.min(sameTypeFailures.length * 20, 100);
    }
    /**
     * Record buffer failure pattern
     */
    recordBufferFailure(pattern) {
        this.bufferFailures.push(pattern);
        this.persistPatterns();
        this.emit('bufferFailureDetected', pattern);
    }
    /**
     * Get detected buffer failures
     */
    getBufferFailures() {
        return [...this.bufferFailures];
    }
    /**
     * Get parser failures
     */
    getParserFailures() {
        return [...this.parserFailures];
    }
    /**
     * Get streaming failures
     */
    getStreamingFailures() {
        return [...this.streamingFailures];
    }
    /**
     * Get failure statistics
     */
    getFailureStatistics() {
        const bufferStats = {};
        const parserStats = {};
        const streamingStats = {};
        let criticalFailures = 0;
        this.bufferFailures.forEach(failure => {
            bufferStats[failure.failureType] = (bufferStats[failure.failureType] || 0) + 1;
            if (failure.failureDetails.impactSeverity === 'critical') {
                criticalFailures++;
            }
        });
        this.parserFailures.forEach(failure => {
            parserStats[failure.processingFailure.errorType] = (parserStats[failure.processingFailure.errorType] || 0) + 1;
        });
        this.streamingFailures.forEach(failure => {
            streamingStats[failure.failureMode] = (streamingStats[failure.failureMode] || 0) + 1;
        });
        return {
            bufferFailures: bufferStats,
            parserFailures: parserStats,
            streamingFailures: streamingStats,
            totalFailures: this.bufferFailures.length + this.parserFailures.length + this.streamingFailures.length,
            criticalFailures
        };
    }
    /**
     * Load existing patterns from storage
     */
    loadExistingPatterns() {
        try {
            if ((0, fs_1.existsSync)(this.patternStorage)) {
                const data = (0, fs_1.readFileSync)(this.patternStorage, 'utf8');
                const parsed = JSON.parse(data);
                this.bufferFailures = parsed.bufferFailures || [];
                this.parserFailures = parsed.parserFailures || [];
                this.streamingFailures = parsed.streamingFailures || [];
                console.log(`📂 Loaded ${this.bufferFailures.length + this.parserFailures.length + this.streamingFailures.length} existing buffer failure patterns`);
            }
        }
        catch (error) {
            console.error('Failed to load existing patterns:', error);
        }
    }
    /**
     * Persist patterns to storage
     */
    persistPatterns() {
        try {
            const data = {
                bufferFailures: this.bufferFailures,
                parserFailures: this.parserFailures,
                streamingFailures: this.streamingFailures,
                lastUpdated: new Date().toISOString()
            };
            (0, fs_1.writeFileSync)(this.patternStorage, JSON.stringify(data, null, 2));
        }
        catch (error) {
            console.error('Failed to persist patterns:', error);
        }
    }
    /**
     * Clear all patterns (for testing)
     */
    clearPatterns() {
        this.bufferFailures = [];
        this.parserFailures = [];
        this.streamingFailures = [];
        this.bufferMonitoring.clear();
    }
    /**
     * Generate comprehensive buffer management failure report
     */
    generateFailureReport() {
        const stats = this.getFailureStatistics();
        const critical = this.bufferFailures.filter(f => f.failureDetails.impactSeverity === 'critical');
        let report = '=== Output Buffer Management Failure Analysis Report ===\n\n';
        report += `📊 FAILURE STATISTICS:\n`;
        report += `- Total Failures: ${stats.totalFailures}\n`;
        report += `- Critical Failures: ${stats.criticalFailures}\n`;
        report += `- Buffer Failures: ${Object.values(stats.bufferFailures).reduce((a, b) => a + b, 0)}\n`;
        report += `- Parser Failures: ${Object.values(stats.parserFailures).reduce((a, b) => a + b, 0)}\n`;
        report += `- Streaming Failures: ${Object.values(stats.streamingFailures).reduce((a, b) => a + b, 0)}\n\n`;
        if (critical.length > 0) {
            report += `🚨 CRITICAL BUFFER FAILURES (${critical.length}):\n`;
            critical.forEach(failure => {
                report += `- ${failure.failureType}: ${failure.technicalCause}\n`;
                report += `  Instance: ${failure.instanceId}\n`;
                report += `  Manifestation: ${failure.manifestation}\n`;
                report += `  Buffer State: ${failure.bufferState.size}/${failure.bufferState.capacity} bytes\n\n`;
            });
        }
        const parserFailures = this.parserFailures.filter(f => f.processingFailure.errorType === 'infinite_loop');
        if (parserFailures.length > 0) {
            report += `🤖 CLAUDE PARSER INFINITE LOOPS (${parserFailures.length}):\n`;
            parserFailures.forEach(failure => {
                report += `- Instance ${failure.instanceId}: ${failure.processingFailure.errorMessage}\n`;
                report += `  Input Buffer: ${failure.inputBuffer.size} bytes\n`;
                report += `  Output Buffer: ${failure.outputBuffer.size} bytes\n\n`;
            });
        }
        const streamFailures = this.streamingFailures.filter(f => f.failureMode === 'broadcast_storm');
        if (streamFailures.length > 0) {
            report += `🌊 SSE BROADCAST STORMS (${streamFailures.length}):\n`;
            streamFailures.forEach(failure => {
                report += `- Instance ${failure.instanceId}: ${failure.messageDetails.duplicateMessages} duplicate messages\n`;
                report += `  Connections: ${failure.connectionDetails.totalConnections} total, ${failure.connectionDetails.zombieConnections} zombie\n\n`;
            });
        }
        return report;
    }
}
exports.OutputBufferManagementFailurePatterns = OutputBufferManagementFailurePatterns;
exports.default = OutputBufferManagementFailurePatterns;
//# sourceMappingURL=output-buffer-management-failure-patterns.js.map