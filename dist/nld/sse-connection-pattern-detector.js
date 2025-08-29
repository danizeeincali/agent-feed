"use strict";
/**
 * NLD (Neuro-Learning Development) - SSE Connection Pattern Detector
 *
 * Specialized in automatically capturing failure patterns when SSE connections
 * fail in coordination scenarios where status broadcasts have 0 connections
 * but terminal streams show 1 connection, causing UI to stay stuck on "starting".
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSEConnectionPatternDetector = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class SSEConnectionPatternDetector {
    patterns = [];
    patternDir;
    isMonitoring = false;
    connectionStates = new Map();
    constructor() {
        this.patternDir = path_1.default.join(__dirname, 'patterns', 'sse-connection-failures');
        this.ensureDirectoryExists();
    }
    ensureDirectoryExists() {
        if (!fs_1.default.existsSync(this.patternDir)) {
            fs_1.default.mkdirSync(this.patternDir, { recursive: true });
        }
    }
    /**
     * Start monitoring for SSE connection failure patterns
     */
    startMonitoring() {
        this.isMonitoring = true;
        console.log('🔍 NLD SSE Connection Pattern Detector: Monitoring started');
    }
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        this.isMonitoring = false;
        console.log('🛑 NLD SSE Connection Pattern Detector: Monitoring stopped');
    }
    /**
     * Detect trigger conditions for pattern capture
     */
    detectTrigger(condition) {
        if (!this.isMonitoring)
            return false;
        const triggers = [
            'status connection zero',
            'terminal connected but status failed',
            'ui stuck on starting',
            'connection coordination failed',
            'mixed connection state detected'
        ];
        const conditionText = JSON.stringify(condition).toLowerCase();
        return triggers.some(trigger => conditionText.includes(trigger.toLowerCase()));
    }
    /**
     * Capture SSE connection failure pattern
     */
    async captureFailurePattern(triggerCondition, contextualInfo, connectionState, uiState, effectiveness) {
        // Classify failure mode based on connection state
        const failureMode = this.classifyFailureMode(connectionState, uiState);
        const pattern = {
            id: `sse-pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            triggerEvent: triggerCondition.type,
            failureMode,
            connectionState: this.normalizeConnectionState(connectionState),
            uiState: {
                instanceStatus: uiState.instanceStatus || 'starting',
                stuck: uiState.stuck || false,
                lastStatusUpdate: uiState.lastStatusUpdate || null,
                connectionType: uiState.connectionType || 'unknown'
            },
            contextualData: {
                originalTask: contextualInfo.task,
                expectedBehavior: contextualInfo.expectedBehavior,
                actualBehavior: contextualInfo.actualBehavior,
                errorMessages: contextualInfo.errorMessages || []
            },
            effectiveness: {
                claudeConfidence: effectiveness?.claudeConfidence || 0.5,
                userSuccessRate: effectiveness?.userSuccessRate || 0.0,
                tddUsed: effectiveness?.tddUsed || false,
                score: this.calculateEffectivenessScore(effectiveness?.claudeConfidence || 0.5, effectiveness?.userSuccessRate || 0.0, effectiveness?.tddUsed || false)
            }
        };
        // Store pattern
        await this.storePattern(pattern);
        this.patterns.push(pattern);
        console.log(`🎯 NLD: Captured SSE connection failure pattern: ${pattern.id}`);
        return pattern;
    }
    /**
     * Classify the type of failure mode based on connection state
     */
    classifyFailureMode(connectionState, uiState) {
        // Status SSE connection not established despite general SSE stream requests
        if (!connectionState.statusSSE?.connected && connectionState.terminalSSE?.connected) {
            return 'status_sse_missing';
        }
        // Status broadcasts have 0 connections
        if (connectionState.statusSSE?.connections === 0) {
            return 'status_broadcast_zero';
        }
        // Terminal input path broken - no forwarding to backend
        if (connectionState.terminalSSE?.connected && !connectionState.inputForwarding) {
            return 'terminal_input_broken';
        }
        // Connection coordination issues between status and terminal streams
        if (connectionState.statusSSE?.connected !== connectionState.terminalSSE?.connected) {
            return 'connection_coordination';
        }
        // Mixed connection state (some connected, some not)
        if (connectionState.mixed || (connectionState.statusSSE?.connected && connectionState.statusSSE?.connections === 0)) {
            return 'mixed_connection_state';
        }
        return 'connection_coordination';
    }
    /**
     * Normalize connection state for consistent storage
     */
    normalizeConnectionState(rawState) {
        return {
            statusSSE: {
                connected: rawState.statusSSE?.connected || false,
                connections: rawState.statusSSE?.connections || 0,
                endpoint: rawState.statusSSE?.endpoint || '/api/status/stream'
            },
            terminalSSE: {
                connected: rawState.terminalSSE?.connected || false,
                connections: rawState.terminalSSE?.connections || 0,
                instanceId: rawState.terminalSSE?.instanceId || null,
                endpoint: rawState.terminalSSE?.endpoint || '/api/claude/instances/{id}/terminal/stream'
            },
            pollingState: {
                active: rawState.pollingState?.active || false,
                instanceId: rawState.pollingState?.instanceId || null
            }
        };
    }
    /**
     * Calculate effectiveness score
     */
    calculateEffectivenessScore(claudeConfidence, userSuccessRate, tddUsed) {
        const tddFactor = tddUsed ? 1.2 : 1.0;
        return (userSuccessRate / Math.max(claudeConfidence, 0.1)) * tddFactor;
    }
    /**
     * Store pattern to file system
     */
    async storePattern(pattern) {
        const filename = `${pattern.id}.json`;
        const filepath = path_1.default.join(this.patternDir, filename);
        try {
            fs_1.default.writeFileSync(filepath, JSON.stringify(pattern, null, 2));
        }
        catch (error) {
            console.error('Failed to store SSE pattern:', error);
        }
    }
    /**
     * Analyze patterns for common failure modes
     */
    analyzePatterns() {
        const analysis = {
            totalPatterns: this.patterns.length,
            failureModes: {},
            commonCauses: [],
            recommendations: []
        };
        // Count failure modes
        this.patterns.forEach(pattern => {
            analysis.failureModes[pattern.failureMode] =
                (analysis.failureModes[pattern.failureMode] || 0) + 1;
        });
        // Identify common causes
        if (analysis.failureModes['status_broadcast_zero'] > 0) {
            analysis.commonCauses.push('Status SSE endpoint has zero active connections');
        }
        if (analysis.failureModes['status_sse_missing'] > 0) {
            analysis.commonCauses.push('Status SSE connection not established despite terminal connection');
        }
        if (analysis.failureModes['connection_coordination'] > 0) {
            analysis.commonCauses.push('Coordination issues between status and terminal streams');
        }
        // Generate recommendations
        analysis.recommendations.push('Implement connection health checks for both status and terminal SSE endpoints');
        analysis.recommendations.push('Add timeout detection for UI stuck in "starting" status');
        analysis.recommendations.push('Create fallback mechanisms when status SSE fails but terminal SSE succeeds');
        analysis.recommendations.push('Implement automatic reconnection with exponential backoff for status SSE');
        return analysis;
    }
    /**
     * Get patterns by failure mode
     */
    getPatternsByFailureMode(failureMode) {
        return this.patterns.filter(pattern => pattern.failureMode === failureMode);
    }
    /**
     * Export patterns for neural training
     */
    exportForNeuralTraining() {
        return {
            trainingData: this.patterns.map(pattern => ({
                input: {
                    failureMode: pattern.failureMode,
                    connectionState: pattern.connectionState,
                    contextualData: pattern.contextualData
                },
                output: {
                    effectiveness: pattern.effectiveness,
                    recommendations: this.generateRecommendationsForPattern(pattern)
                }
            })),
            metadata: {
                totalPatterns: this.patterns.length,
                exportTimestamp: new Date().toISOString(),
                version: '1.0.0'
            }
        };
    }
    generateRecommendationsForPattern(pattern) {
        const recommendations = [];
        switch (pattern.failureMode) {
            case 'status_broadcast_zero':
                recommendations.push('Check status SSE endpoint connection count');
                recommendations.push('Verify status broadcasting is active');
                recommendations.push('Implement status connection recovery');
                break;
            case 'status_sse_missing':
                recommendations.push('Ensure status SSE connection is established alongside terminal SSE');
                recommendations.push('Add status connection validation in frontend');
                recommendations.push('Implement dual-connection monitoring');
                break;
            case 'connection_coordination':
                recommendations.push('Synchronize status and terminal connection states');
                recommendations.push('Add connection state validation');
                recommendations.push('Implement coordinated connection recovery');
                break;
            default:
                recommendations.push('Review connection architecture');
                recommendations.push('Implement comprehensive connection monitoring');
        }
        return recommendations;
    }
    /**
     * Update connection state for monitoring
     */
    updateConnectionState(instanceId, state) {
        this.connectionStates.set(instanceId, {
            ...state,
            timestamp: new Date().toISOString()
        });
    }
    /**
     * Get current connection states
     */
    getConnectionStates() {
        return this.connectionStates;
    }
    /**
     * Load existing patterns from storage
     */
    async loadExistingPatterns() {
        try {
            const files = fs_1.default.readdirSync(this.patternDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            for (const file of jsonFiles) {
                const filepath = path_1.default.join(this.patternDir, file);
                const data = fs_1.default.readFileSync(filepath, 'utf-8');
                const pattern = JSON.parse(data);
                this.patterns.push(pattern);
            }
            console.log(`📚 Loaded ${this.patterns.length} existing SSE connection patterns`);
        }
        catch (error) {
            console.error('Failed to load existing patterns:', error);
        }
    }
}
exports.SSEConnectionPatternDetector = SSEConnectionPatternDetector;
//# sourceMappingURL=sse-connection-pattern-detector.js.map