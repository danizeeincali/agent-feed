/**
 * SSE Event Flow Gap Detector
 *
 * Monitors for gaps in SSE event flow where:
 * - Backend sends SSE events but frontend doesn't receive them
 * - Terminal output events are lost in transmission
 * - Connection drops are not properly handled
 * - Event broadcasting fails to reach active connections
 */
import { EventEmitter } from 'events';
interface SSEConnectionState {
    instanceId: string;
    connectionId: string;
    status: 'active' | 'dropped' | 'stale' | 'reconnecting';
    eventsSent: number;
    eventsReceived: number;
    lastActivity: string;
    gapCount: number;
    totalLatency: number;
}
interface EventFlowGap {
    id: string;
    instanceId: string;
    gapType: 'missing_events' | 'connection_drop' | 'broadcast_failure' | 'timeout';
    severity: 'low' | 'medium' | 'high' | 'critical';
    eventsSent: number;
    eventsReceived: number;
    gapSize: number;
    duration: number;
    affectedConnections: string[];
    timestamp: string;
    evidenceScore: number;
    tddfactor: number;
}
export declare class SSEEventFlowGapDetector extends EventEmitter {
    private options;
    private eventFlows;
    private connectionStates;
    private gaps;
    private gapThreshold;
    constructor(options?: {
        logDirectory: string;
        maxEventHistory: number;
        gapDetectionInterval: number;
        connectionTimeout: number;
        realTimeAlert: boolean;
    });
    /**
     * Record an SSE event being sent from backend
     */
    recordEventSent(instanceId: string, eventData: {
        type: string;
        data: any;
        connectionId: string;
        timestamp?: string;
    }): void;
    /**
     * Record an SSE event being received by frontend
     */
    recordEventReceived(instanceId: string, eventData: {
        type: string;
        connectionId: string;
        timestamp?: string;
        latency?: number;
    }): void;
    /**
     * Record connection state change
     */
    recordConnectionStateChange(connectionId: string, instanceId: string, newState: 'active' | 'dropped' | 'stale' | 'reconnecting'): void;
    /**
     * Update connection state for event tracking
     */
    private updateConnectionState;
    /**
     * Start continuous gap detection monitoring
     */
    private startGapDetectionMonitoring;
    /**
     * Detect gaps in event flow for all instances
     */
    private detectEventFlowGaps;
    /**
     * Analyze event flow for specific instance
     */
    private analyzeEventFlowForInstance;
    /**
     * Analyze connection drop for gaps
     */
    private analyzeConnectionDrop;
    /**
     * Detect stale connections that haven't received events recently
     */
    private detectStaleConnections;
    /**
     * Record an event flow gap
     */
    private recordEventFlowGap;
    /**
     * Calculate evidence score for gap
     */
    private calculateEvidenceScore;
    /**
     * Calculate TDD factor
     */
    private calculateTDDFactor;
    /**
     * Export gap for neural training
     */
    private exportForNeuralTraining;
    /**
     * Log gap to file
     */
    private logGap;
    /**
     * Trim old event history to prevent memory leaks
     */
    private trimEventHistory;
    /**
     * Get gap statistics
     */
    getGapStats(): {
        totalGaps: number;
        byType: Record<string, number>;
        bySeverity: Record<string, number>;
        averageGapSize: number;
        averageEvidenceScore: number;
        recentGaps: EventFlowGap[];
    };
    /**
     * Get connection states
     */
    getConnectionStates(): Map<string, SSEConnectionState>;
    /**
     * Cleanup resources for instance
     */
    cleanup(instanceId: string): void;
}
export {};
//# sourceMappingURL=sse-event-flow-gap-detector.d.ts.map