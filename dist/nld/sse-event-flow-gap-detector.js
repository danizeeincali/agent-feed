"use strict";
/**
 * SSE Event Flow Gap Detector
 *
 * Monitors for gaps in SSE event flow where:
 * - Backend sends SSE events but frontend doesn't receive them
 * - Terminal output events are lost in transmission
 * - Connection drops are not properly handled
 * - Event broadcasting fails to reach active connections
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
exports.SSEEventFlowGapDetector = void 0;
const events_1 = require("events");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class SSEEventFlowGapDetector extends events_1.EventEmitter {
    options;
    eventFlows = new Map(); // instanceId -> events
    connectionStates = new Map(); // connectionId -> state
    gaps = new Map();
    gapThreshold = 0.7; // If less than 70% events reach frontend, it's a gap
    constructor(options = {
        logDirectory: '/workspaces/agent-feed/src/nld/patterns/terminal-pipe-failures',
        maxEventHistory: 5000,
        gapDetectionInterval: 1000, // Check for gaps every second
        connectionTimeout: 30000, // 30 seconds
        realTimeAlert: true
    }) {
        super();
        this.options = options;
        // Start gap detection monitoring
        this.startGapDetectionMonitoring();
    }
    /**
     * Record an SSE event being sent from backend
     */
    recordEventSent(instanceId, eventData) {
        const eventFlow = {
            instanceId,
            eventType: eventData.type,
            sent: true,
            received: false,
            timestamp: eventData.timestamp || new Date().toISOString(),
            data: eventData.data,
            connectionId: eventData.connectionId
        };
        if (!this.eventFlows.has(instanceId)) {
            this.eventFlows.set(instanceId, []);
        }
        this.eventFlows.get(instanceId).push(eventFlow);
        // Update connection state
        this.updateConnectionState(eventData.connectionId, instanceId, 'sent');
        // Trim old events
        this.trimEventHistory(instanceId);
    }
    /**
     * Record an SSE event being received by frontend
     */
    recordEventReceived(instanceId, eventData) {
        const events = this.eventFlows.get(instanceId) || [];
        // Find matching sent event
        const matchingEvent = events
            .slice()
            .reverse()
            .find(e => e.eventType === eventData.type &&
            e.connectionId === eventData.connectionId &&
            e.sent &&
            !e.received);
        if (matchingEvent) {
            matchingEvent.received = true;
            matchingEvent.latency = eventData.latency ||
                (new Date().getTime() - new Date(matchingEvent.timestamp).getTime());
        }
        else {
            // Event received without being sent (possible race condition or error)
            console.warn(`🚨 SSE Event received without matching sent event: ${eventData.type} on ${instanceId}`);
        }
        // Update connection state
        this.updateConnectionState(eventData.connectionId, instanceId, 'received');
    }
    /**
     * Record connection state change
     */
    recordConnectionStateChange(connectionId, instanceId, newState) {
        const state = this.connectionStates.get(connectionId);
        if (state) {
            state.status = newState;
            state.lastActivity = new Date().toISOString();
        }
        else {
            this.connectionStates.set(connectionId, {
                instanceId,
                connectionId,
                status: newState,
                eventsSent: 0,
                eventsReceived: 0,
                lastActivity: new Date().toISOString(),
                gapCount: 0,
                totalLatency: 0
            });
        }
        // If connection dropped, analyze for gaps
        if (newState === 'dropped') {
            this.analyzeConnectionDrop(connectionId, instanceId);
        }
    }
    /**
     * Update connection state for event tracking
     */
    updateConnectionState(connectionId, instanceId, eventType) {
        let state = this.connectionStates.get(connectionId);
        if (!state) {
            state = {
                instanceId,
                connectionId,
                status: 'active',
                eventsSent: 0,
                eventsReceived: 0,
                lastActivity: new Date().toISOString(),
                gapCount: 0,
                totalLatency: 0
            };
            this.connectionStates.set(connectionId, state);
        }
        if (eventType === 'sent') {
            state.eventsSent++;
        }
        else {
            state.eventsReceived++;
        }
        state.lastActivity = new Date().toISOString();
    }
    /**
     * Start continuous gap detection monitoring
     */
    startGapDetectionMonitoring() {
        setInterval(() => {
            this.detectEventFlowGaps();
            this.detectStaleConnections();
        }, this.options.gapDetectionInterval);
    }
    /**
     * Detect gaps in event flow for all instances
     */
    detectEventFlowGaps() {
        for (const [instanceId, events] of this.eventFlows.entries()) {
            this.analyzeEventFlowForInstance(instanceId, events);
        }
    }
    /**
     * Analyze event flow for specific instance
     */
    analyzeEventFlowForInstance(instanceId, events) {
        const recentEvents = events.slice(-100); // Analyze last 100 events
        if (recentEvents.length < 10)
            return; // Need minimum events for analysis
        const sentEvents = recentEvents.filter(e => e.sent);
        const receivedEvents = recentEvents.filter(e => e.received);
        const receiptRatio = receivedEvents.length / sentEvents.length;
        // Gap detected: less than threshold of events are being received
        if (receiptRatio < this.gapThreshold) {
            this.recordEventFlowGap(instanceId, {
                gapType: 'missing_events',
                severity: receiptRatio < 0.3 ? 'critical' : receiptRatio < 0.5 ? 'high' : 'medium',
                eventsSent: sentEvents.length,
                eventsReceived: receivedEvents.length,
                gapSize: sentEvents.length - receivedEvents.length,
                affectedConnections: [...new Set(sentEvents.map(e => e.connectionId))]
            });
        }
        // Check for broadcast failures (events sent but none received on any connection)
        const broadcastEvents = sentEvents.filter(e => !e.received &&
            (new Date().getTime() - new Date(e.timestamp).getTime()) > 5000); // 5 second timeout
        if (broadcastEvents.length > 5) { // Multiple events not reaching any connection
            this.recordEventFlowGap(instanceId, {
                gapType: 'broadcast_failure',
                severity: 'high',
                eventsSent: broadcastEvents.length,
                eventsReceived: 0,
                gapSize: broadcastEvents.length,
                affectedConnections: [...new Set(broadcastEvents.map(e => e.connectionId))]
            });
        }
    }
    /**
     * Analyze connection drop for gaps
     */
    analyzeConnectionDrop(connectionId, instanceId) {
        const state = this.connectionStates.get(connectionId);
        if (!state)
            return;
        const gapSize = state.eventsSent - state.eventsReceived;
        if (gapSize > 5) { // Significant number of events lost during connection
            this.recordEventFlowGap(instanceId, {
                gapType: 'connection_drop',
                severity: gapSize > 20 ? 'high' : 'medium',
                eventsSent: state.eventsSent,
                eventsReceived: state.eventsReceived,
                gapSize,
                affectedConnections: [connectionId]
            });
        }
    }
    /**
     * Detect stale connections that haven't received events recently
     */
    detectStaleConnections() {
        const now = Date.now();
        for (const [connectionId, state] of this.connectionStates.entries()) {
            const lastActivity = new Date(state.lastActivity).getTime();
            const inactiveTime = now - lastActivity;
            if (inactiveTime > this.options.connectionTimeout && state.status === 'active') {
                state.status = 'stale';
                // Analyze if events were still being sent to stale connection
                const recentEvents = this.eventFlows.get(state.instanceId) || [];
                const staleEvents = recentEvents.filter(e => e.connectionId === connectionId &&
                    new Date(e.timestamp).getTime() > lastActivity);
                if (staleEvents.length > 0) {
                    this.recordEventFlowGap(state.instanceId, {
                        gapType: 'timeout',
                        severity: 'medium',
                        eventsSent: staleEvents.length,
                        eventsReceived: 0,
                        gapSize: staleEvents.length,
                        affectedConnections: [connectionId]
                    });
                }
            }
        }
    }
    /**
     * Record an event flow gap
     */
    recordEventFlowGap(instanceId, gapData) {
        const gapId = `gap-${instanceId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const gap = {
            id: gapId,
            instanceId,
            gapType: gapData.gapType || 'missing_events',
            severity: gapData.severity || 'medium',
            eventsSent: gapData.eventsSent || 0,
            eventsReceived: gapData.eventsReceived || 0,
            gapSize: gapData.gapSize || 0,
            duration: 0, // Could be calculated from event timestamps
            affectedConnections: gapData.affectedConnections || [],
            timestamp: new Date().toISOString(),
            evidenceScore: this.calculateEvidenceScore(gapData),
            tddfactor: this.calculateTDDFactor(gapData.gapType || 'missing_events')
        };
        this.gaps.set(gapId, gap);
        // Update connection gap counts
        gap.affectedConnections.forEach(connectionId => {
            const state = this.connectionStates.get(connectionId);
            if (state) {
                state.gapCount++;
            }
        });
        // Export for neural training
        this.exportForNeuralTraining(gap);
        // Real-time alert
        if (this.options.realTimeAlert && gap.severity === 'critical') {
            this.emit('criticalGap', gap);
        }
        // Log gap
        this.logGap(gap);
        console.log(`🚨 NLD: SSE Event Flow Gap detected - ${gap.gapType} (${gap.severity})`);
        console.log(`   Instance: ${instanceId}`);
        console.log(`   Gap Size: ${gap.gapSize} events`);
        console.log(`   Evidence Score: ${gap.evidenceScore}`);
        console.log(`   Affected Connections: ${gap.affectedConnections.length}`);
    }
    /**
     * Calculate evidence score for gap
     */
    calculateEvidenceScore(gapData) {
        let score = 0.5; // Base score
        const gapRatio = (gapData.gapSize || 0) / (gapData.eventsSent || 1);
        score += gapRatio * 0.3; // Higher gap ratio = higher evidence
        if (gapData.gapType === 'broadcast_failure')
            score += 0.2;
        if (gapData.gapType === 'connection_drop')
            score += 0.15;
        const connectionCount = gapData.affectedConnections?.length || 1;
        if (connectionCount > 1)
            score += 0.1; // Multiple connections affected
        return Math.min(score, 1.0);
    }
    /**
     * Calculate TDD factor
     */
    calculateTDDFactor(gapType) {
        const tddFactors = {
            'missing_events': 0.8, // Event flow tests would catch
            'connection_drop': 0.6, // Connection handling tests
            'broadcast_failure': 0.9, // Broadcasting tests would catch
            'timeout': 0.7 // Timeout tests would catch
        };
        return tddFactors[gapType] || 0.5;
    }
    /**
     * Export gap for neural training
     */
    exportForNeuralTraining(gap) {
        const trainingData = {
            pattern_type: 'sse_event_flow_gap',
            gap_type: gap.gapType,
            severity: gap.severity,
            evidence_score: gap.evidenceScore,
            tdd_factor: gap.tddfactor,
            features: {
                gap_ratio: gap.gapSize / gap.eventsSent,
                connection_count: gap.affectedConnections.length,
                is_broadcast_failure: gap.gapType === 'broadcast_failure',
                is_connection_drop: gap.gapType === 'connection_drop',
                gap_size: gap.gapSize
            },
            timestamp: gap.timestamp,
            instance_id: gap.instanceId
        };
        const exportPath = path.join(this.options.logDirectory, 'sse-gap-neural-training.jsonl');
        fs.appendFileSync(exportPath, JSON.stringify(trainingData) + '\n');
    }
    /**
     * Log gap to file
     */
    logGap(gap) {
        const logPath = path.join(this.options.logDirectory, 'sse-event-flow-gaps.json');
        try {
            let existingGaps = [];
            if (fs.existsSync(logPath)) {
                const logContent = fs.readFileSync(logPath, 'utf-8');
                existingGaps = JSON.parse(logContent);
            }
            existingGaps.push(gap);
            // Keep only last 1000 gaps
            if (existingGaps.length > 1000) {
                existingGaps = existingGaps.slice(-1000);
            }
            fs.writeFileSync(logPath, JSON.stringify(existingGaps, null, 2));
        }
        catch (error) {
            console.error('Failed to log SSE gap:', error);
        }
    }
    /**
     * Trim old event history to prevent memory leaks
     */
    trimEventHistory(instanceId) {
        const events = this.eventFlows.get(instanceId);
        if (events && events.length > this.options.maxEventHistory) {
            this.eventFlows.set(instanceId, events.slice(-this.options.maxEventHistory));
        }
    }
    /**
     * Get gap statistics
     */
    getGapStats() {
        const gaps = Array.from(this.gaps.values());
        const byType = gaps.reduce((acc, g) => {
            acc[g.gapType] = (acc[g.gapType] || 0) + 1;
            return acc;
        }, {});
        const bySeverity = gaps.reduce((acc, g) => {
            acc[g.severity] = (acc[g.severity] || 0) + 1;
            return acc;
        }, {});
        const avgGapSize = gaps.reduce((sum, g) => sum + g.gapSize, 0) / gaps.length || 0;
        const avgEvidence = gaps.reduce((sum, g) => sum + g.evidenceScore, 0) / gaps.length || 0;
        return {
            totalGaps: gaps.length,
            byType,
            bySeverity,
            averageGapSize: avgGapSize,
            averageEvidenceScore: avgEvidence,
            recentGaps: gaps.slice(-20)
        };
    }
    /**
     * Get connection states
     */
    getConnectionStates() {
        return new Map(this.connectionStates);
    }
    /**
     * Cleanup resources for instance
     */
    cleanup(instanceId) {
        this.eventFlows.delete(instanceId);
        // Remove connection states for this instance
        for (const [connectionId, state] of this.connectionStates.entries()) {
            if (state.instanceId === instanceId) {
                this.connectionStates.delete(connectionId);
            }
        }
    }
}
exports.SSEEventFlowGapDetector = SSEEventFlowGapDetector;
//# sourceMappingURL=sse-event-flow-gap-detector.js.map