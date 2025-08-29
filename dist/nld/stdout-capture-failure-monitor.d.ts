/**
 * NLD Stdout Capture Failure Monitor
 * Real-time detection of stdout capture failures in Claude process spawning
 * Monitors: /workspaces/agent-feed/simple-backend.js createRealClaudeInstance function
 * Generated: 2025-08-27
 */
export interface StdoutCaptureEvent {
    timestamp: string;
    instanceId: string;
    eventType: 'process_spawn' | 'stdout_handler_registered' | 'stdout_data' | 'sse_connection' | 'output_broadcast' | 'failure_detected';
    processId?: number;
    data?: any;
    failurePattern?: string;
}
export interface StdoutCaptureMetrics {
    instanceId: string;
    processSpawnTime?: Date;
    handlerRegistrationTime?: Date;
    firstOutputTime?: Date;
    sseConnectionTime?: Date;
    totalOutputEvents: number;
    failedBroadcasts: number;
    activeConnections: number;
    captureHealthScore: number;
}
export declare class StdoutCaptureFailureMonitor {
    private antiPatternsDB;
    private monitoredInstances;
    private eventLog;
    private isMonitoring;
    private failureDetectionThreshold;
    private outputTimeoutTimer;
    constructor();
    startMonitoring(): void;
    stopMonitoring(): void;
    private setupProcessSpawnHooks;
    private setupSSEConnectionHooks;
    private setupOutputCapturHooks;
    recordProcessSpawn(instanceId: string, processId: number): void;
    recordStdoutHandlerRegistration(instanceId: string): void;
    recordStdoutData(instanceId: string, data: string): void;
    recordSSEConnection(instanceId: string, connectionCount: number): void;
    recordOutputBroadcast(instanceId: string, success: boolean): void;
    private startOutputTimeoutDetection;
    private clearOutputTimeoutDetection;
    private handleOutputTimeout;
    private detectFailurePattern;
    private recordPatternDetection;
    private exportToNeuralTraining;
    private logEvent;
    getInstanceMetrics(instanceId: string): StdoutCaptureMetrics | undefined;
    getAllMetrics(): Map<string, StdoutCaptureMetrics>;
    getFailureReport(): {
        totalInstances: number;
        healthyInstances: number;
        failedInstances: number;
        detectedPatterns: string[];
        avgHealthScore: number;
    };
    getEventHistory(instanceId?: string): StdoutCaptureEvent[];
}
export declare const stdoutCaptureMonitor: StdoutCaptureFailureMonitor;
//# sourceMappingURL=stdout-capture-failure-monitor.d.ts.map