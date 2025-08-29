/**
 * NLD Real-Time SSE Event Flow Monitor
 *
 * Continuously monitors SSE event broadcasting and terminal command processing
 * to detect anti-patterns in real-time and trigger alerts.
 */
interface SSEEventMetrics {
    eventType: string;
    timestamp: number;
    instanceId: string;
    data?: any;
    processed: boolean;
    latency?: number;
}
interface TerminalCommandMetrics {
    instanceId: string;
    input: string;
    echoTimestamp?: number;
    responseTimestamp?: number;
    success: boolean;
    latency?: number;
}
export declare class RealTimeSSEMonitor {
    private sseEventHistory;
    private terminalCommandHistory;
    private statusChangeHistory;
    private eventHandlerCoverage;
    private isMonitoring;
    private monitoringInterval;
    constructor();
    private initializeEventTypes;
    startMonitoring(): void;
    stopMonitoring(): void;
    private setupEventListeners;
    recordSSEEvent(metrics: SSEEventMetrics): void;
    recordTerminalCommand(instanceId: string, input: string): TerminalCommandMetrics;
    recordTerminalEcho(instanceId: string, input: string): void;
    recordTerminalResponse(instanceId: string, response: string): void;
    recordStatusChange(instanceId: string, oldStatus: string, newStatus: string, sseBroadcastSent?: boolean): void;
    private detectAntiPatterns;
    private detectStatusBroadcastGaps;
    private detectTerminalProcessingGaps;
    private detectEventHandlerGaps;
    private detectEventStreamIssues;
    private cleanupOldMetrics;
    getMetrics(): {
        sseEvents: number;
        terminalCommands: number;
        statusChanges: number;
        eventHandlerCoverage: Record<string, number>;
        recentAntiPatterns: any[];
    };
    generateRealTimeReport(): {
        timestamp: string;
        monitoring: boolean;
        metrics: any;
        antiPatterns: any[];
        recommendations: string[];
    };
    static recordSSEEventStatic(eventType: string, instanceId: string, data: any): void;
    static recordStatusChangeStatic(instanceId: string, oldStatus: string, newStatus: string, sseBroadcastSent: boolean): void;
}
export declare const realTimeSSEMonitor: RealTimeSSEMonitor;
export {};
//# sourceMappingURL=real-time-sse-monitor.d.ts.map