"use strict";
/**
 * NLD Real-Time SSE Event Flow Monitor
 *
 * Continuously monitors SSE event broadcasting and terminal command processing
 * to detect anti-patterns in real-time and trigger alerts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.realTimeSSEMonitor = exports.RealTimeSSEMonitor = void 0;
const sse_event_flow_anti_patterns_database_1 = require("./sse-event-flow-anti-patterns-database");
class RealTimeSSEMonitor {
    sseEventHistory = [];
    terminalCommandHistory = [];
    statusChangeHistory = [];
    eventHandlerCoverage = new Map();
    isMonitoring = false;
    monitoringInterval = null;
    constructor() {
        this.initializeEventTypes();
    }
    initializeEventTypes() {
        // Track coverage for all expected SSE event types
        const expectedEventTypes = [
            'terminal_output',
            'input_echo',
            'status_update',
            'connected',
            'heartbeat'
        ];
        expectedEventTypes.forEach(type => {
            this.eventHandlerCoverage.set(type, 0);
        });
    }
    startMonitoring() {
        if (this.isMonitoring)
            return;
        console.log('🔍 NLD Real-Time SSE Monitor: Starting event flow monitoring...');
        this.isMonitoring = true;
        // Monitor every 1 second for anti-patterns
        this.monitoringInterval = setInterval(() => {
            this.detectAntiPatterns();
            this.cleanupOldMetrics();
        }, 1000);
        // Set up event listeners for various monitoring points
        this.setupEventListeners();
    }
    stopMonitoring() {
        if (!this.isMonitoring)
            return;
        console.log('🔍 NLD Real-Time SSE Monitor: Stopping monitoring...');
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }
    setupEventListeners() {
        // Monitor SSE events in browser environment
        if (typeof window !== 'undefined') {
            // Hook into EventSource messages
            const originalEventSourceAdd = EventSource.prototype.addEventListener;
            EventSource.prototype.addEventListener = function (type, listener) {
                const wrappedListener = (event) => {
                    // Track SSE event reception
                    if (type === 'message') {
                        try {
                            const data = JSON.parse(event.data);
                            exports.realTimeSSEMonitor.recordSSEEvent({
                                eventType: data.type || 'unknown',
                                timestamp: Date.now(),
                                instanceId: data.instanceId || 'unknown',
                                data: data,
                                processed: false
                            });
                        }
                        catch (error) {
                            console.warn('Failed to parse SSE event for monitoring:', error);
                        }
                    }
                    return listener.call(this, event);
                };
                return originalEventSourceAdd.call(this, type, wrappedListener);
            };
        }
    }
    recordSSEEvent(metrics) {
        this.sseEventHistory.push(metrics);
        // Track event type coverage
        const currentCount = this.eventHandlerCoverage.get(metrics.eventType) || 0;
        this.eventHandlerCoverage.set(metrics.eventType, currentCount + 1);
        // Mark as processed after a delay to detect handling gaps
        setTimeout(() => {
            const event = this.sseEventHistory.find(e => e.timestamp === metrics.timestamp &&
                e.instanceId === metrics.instanceId &&
                e.eventType === metrics.eventType);
            if (event) {
                event.processed = true;
                event.latency = Date.now() - event.timestamp;
            }
        }, 500);
    }
    recordTerminalCommand(instanceId, input) {
        const metrics = {
            instanceId,
            input,
            success: false
        };
        this.terminalCommandHistory.push(metrics);
        return metrics;
    }
    recordTerminalEcho(instanceId, input) {
        const command = this.terminalCommandHistory
            .reverse()
            .find(cmd => cmd.instanceId === instanceId && cmd.input.trim() === input.trim());
        if (command) {
            command.echoTimestamp = Date.now();
        }
    }
    recordTerminalResponse(instanceId, response) {
        const command = this.terminalCommandHistory
            .reverse()
            .find(cmd => cmd.instanceId === instanceId && !cmd.responseTimestamp);
        if (command) {
            command.responseTimestamp = Date.now();
            command.success = true;
            if (command.echoTimestamp) {
                command.latency = command.responseTimestamp - command.echoTimestamp;
            }
        }
    }
    recordStatusChange(instanceId, oldStatus, newStatus, sseBroadcastSent = false) {
        const metrics = {
            instanceId,
            oldStatus,
            newStatus,
            timestamp: Date.now(),
            sseBroadcastSent,
            frontendUpdated: false
        };
        this.statusChangeHistory.push(metrics);
        // Check for frontend update after delay
        setTimeout(() => {
            // This would be set by frontend when UI updates
            // For now, assume frontend updated if SSE broadcast was sent
            metrics.frontendUpdated = sseBroadcastSent;
        }, 1000);
    }
    detectAntiPatterns() {
        this.detectStatusBroadcastGaps();
        this.detectTerminalProcessingGaps();
        this.detectEventHandlerGaps();
        this.detectEventStreamIssues();
    }
    detectStatusBroadcastGaps() {
        const recentStatusChanges = this.statusChangeHistory
            .filter(change => (Date.now() - change.timestamp) < 5000); // Last 5 seconds
        recentStatusChanges.forEach(change => {
            if (!change.sseBroadcastSent) {
                sse_event_flow_anti_patterns_database_1.nldPatternDatabase.recordDetection('SSE_STATUS_BROADCAST_GAP_V1', {
                    instanceId: change.instanceId,
                    statusChange: `${change.oldStatus} -> ${change.newStatus}`,
                    timestamp: change.timestamp,
                    sseBroadcastSent: change.sseBroadcastSent
                });
            }
        });
    }
    detectTerminalProcessingGaps() {
        const recentCommands = this.terminalCommandHistory
            .filter(cmd => cmd.echoTimestamp && (Date.now() - cmd.echoTimestamp) > 2000); // Commands with echo older than 2 seconds
        recentCommands.forEach(cmd => {
            if (!cmd.responseTimestamp) {
                sse_event_flow_anti_patterns_database_1.nldPatternDatabase.recordDetection('TERMINAL_COMMAND_PROCESSING_INCOMPLETE_V1', {
                    instanceId: cmd.instanceId,
                    input: cmd.input,
                    echoTimestamp: cmd.echoTimestamp,
                    responseTimestamp: cmd.responseTimestamp,
                    latencySinceEcho: cmd.echoTimestamp ? Date.now() - cmd.echoTimestamp : null
                });
            }
        });
    }
    detectEventHandlerGaps() {
        const unprocessedEvents = this.sseEventHistory
            .filter(event => (Date.now() - event.timestamp) > 1000 && !event.processed); // Older than 1 second and not processed
        if (unprocessedEvents.length > 0) {
            sse_event_flow_anti_patterns_database_1.nldPatternDatabase.recordDetection('EVENT_HANDLER_REGISTRATION_GAP_V1', {
                unprocessedEvents: unprocessedEvents.length,
                eventTypes: unprocessedEvents.map(e => e.eventType),
                oldestEvent: Math.min(...unprocessedEvents.map(e => e.timestamp))
            });
        }
    }
    detectEventStreamIssues() {
        const recentEvents = this.sseEventHistory
            .filter(event => (Date.now() - event.timestamp) < 10000); // Last 10 seconds
        const unknownEventTypes = recentEvents
            .filter(event => event.eventType === 'unknown' || !this.eventHandlerCoverage.has(event.eventType))
            .map(event => event.eventType);
        if (unknownEventTypes.length > 0) {
            sse_event_flow_anti_patterns_database_1.nldPatternDatabase.recordDetection('SSE_MULTI_EVENT_STREAM_ISSUE_V1', {
                unknownEventTypes: [...new Set(unknownEventTypes)],
                totalUnknownEvents: unknownEventTypes.length,
                knownEventTypes: Array.from(this.eventHandlerCoverage.keys())
            });
        }
    }
    cleanupOldMetrics() {
        const cutoffTime = Date.now() - (5 * 60 * 1000); // Keep last 5 minutes
        this.sseEventHistory = this.sseEventHistory.filter(event => event.timestamp > cutoffTime);
        this.terminalCommandHistory = this.terminalCommandHistory.filter(cmd => !cmd.echoTimestamp || cmd.echoTimestamp > cutoffTime);
        this.statusChangeHistory = this.statusChangeHistory.filter(change => change.timestamp > cutoffTime);
    }
    getMetrics() {
        return {
            sseEvents: this.sseEventHistory.length,
            terminalCommands: this.terminalCommandHistory.length,
            statusChanges: this.statusChangeHistory.length,
            eventHandlerCoverage: Object.fromEntries(this.eventHandlerCoverage),
            recentAntiPatterns: sse_event_flow_anti_patterns_database_1.nldPatternDatabase.getDetectionHistory().slice(0, 5)
        };
    }
    generateRealTimeReport() {
        const metrics = this.getMetrics();
        const antiPatterns = sse_event_flow_anti_patterns_database_1.nldPatternDatabase.getDetectionHistory().slice(0, 10);
        const recommendations = [];
        // Generate specific recommendations based on detected patterns
        if (antiPatterns.some(p => p.patternId === 'SSE_STATUS_BROADCAST_GAP_V1')) {
            recommendations.push("🚨 Add broadcastToInstance() calls after status changes in backend");
        }
        if (antiPatterns.some(p => p.patternId === 'TERMINAL_COMMAND_PROCESSING_INCOMPLETE_V1')) {
            recommendations.push("🚨 Complete terminal command processing pipeline - ensure responses are generated and broadcast");
        }
        if (antiPatterns.some(p => p.patternId === 'EVENT_HANDLER_REGISTRATION_GAP_V1')) {
            recommendations.push("🚨 Add missing SSE event handlers in frontend useHTTPSSE hook");
        }
        if (antiPatterns.some(p => p.patternId === 'SSE_MULTI_EVENT_STREAM_ISSUE_V1')) {
            recommendations.push("🚨 Implement comprehensive event type routing in SSE message handler");
        }
        return {
            timestamp: new Date().toISOString(),
            monitoring: this.isMonitoring,
            metrics,
            antiPatterns,
            recommendations
        };
    }
    // Static methods for global access
    static recordSSEEventStatic(eventType, instanceId, data) {
        if (typeof window !== 'undefined' && window.realTimeSSEMonitor) {
            window.realTimeSSEMonitor.recordSSEEvent({
                eventType,
                timestamp: Date.now(),
                instanceId,
                data,
                processed: false
            });
        }
    }
    static recordStatusChangeStatic(instanceId, oldStatus, newStatus, sseBroadcastSent) {
        if (typeof window !== 'undefined' && window.realTimeSSEMonitor) {
            window.realTimeSSEMonitor.recordStatusChange(instanceId, oldStatus, newStatus, sseBroadcastSent);
        }
    }
}
exports.RealTimeSSEMonitor = RealTimeSSEMonitor;
// Create global instance
exports.realTimeSSEMonitor = new RealTimeSSEMonitor();
// Make available globally for browser environments
if (typeof window !== 'undefined') {
    window.realTimeSSEMonitor = exports.realTimeSSEMonitor;
    window.nldPatternDatabase = sse_event_flow_anti_patterns_database_1.nldPatternDatabase;
}
//# sourceMappingURL=real-time-sse-monitor.js.map