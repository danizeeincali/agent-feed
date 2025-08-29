/**
 * SSE Streaming Guardian
 * Monitors and protects SSE streaming functionality during UI modernization
 */
import { EventEmitter } from 'events';
export interface SSEConnectionHealth {
    isConnected: boolean;
    connectionType: 'sse' | 'polling' | 'none';
    lastMessageTime: number;
    messageCount: number;
    errorCount: number;
    latency: number;
}
export interface SSEStreamingEvent {
    type: 'connection' | 'message' | 'error' | 'disruption';
    timestamp: number;
    data: any;
    instanceId?: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
export declare class SSEStreamingGuardian extends EventEmitter {
    private connectionHealth;
    private streamingEvents;
    private monitoringInterval;
    private disruptionDetectionTimeout;
    private activeConnections;
    private messageCounters;
    constructor();
    private startStreamingMonitoring;
    private setupEventSourceMonitoring;
    registerConnection(instanceId: string): void;
    unregisterConnection(instanceId: string): void;
    private updateConnectionHealth;
    private updateMessageCount;
    private updateLastMessageTime;
    private incrementErrorCount;
    private checkStreamingHealth;
    private detectStreamingDisruptions;
    private hasRecentDOMChanges;
    private recordStreamingEvent;
    attemptStreamingRecovery(instanceId: string): Promise<boolean>;
    private forceConnectionReestablishment;
    getStreamingHealth(): Map<string, SSEConnectionHealth>;
    getRecentEvents(count?: number): SSEStreamingEvent[];
    getActiveConnections(): string[];
    generateStreamingReport(): string;
    private generateRecoveryRecommendations;
    destroy(): void;
}
export declare const sseStreamingGuardian: SSEStreamingGuardian;
//# sourceMappingURL=sse-streaming-guardian.d.ts.map