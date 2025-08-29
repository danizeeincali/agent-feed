/**
 * NLD SSE Integration Gap Monitor
 *
 * Monitors the critical gap between implemented helper functions
 * and their actual integration with live SSE endpoints
 */
import { EventEmitter } from 'events';
export declare class SSEIntegrationGapMonitor extends EventEmitter {
    private gapPatterns;
    private codebaseAnalysis;
    private monitoringActive;
    private storageDir;
    constructor(storageDir?: string);
    private startMonitoring;
    /**
     * Analyze codebase for integration gaps between helpers and endpoints
     */
    private analyzeCodebaseIntegration;
    private findSSEHelperFunctions;
    private findSSEEndpoints;
    private checkIntegrationGaps;
    private monitorRuntimeIntegration;
    private detectRuntimeGaps;
    private recordIntegrationGap;
    private persistGapPattern;
    /**
     * Export TDD prevention strategies based on detected gaps
     */
    exportTDDPreventionStrategies(): void;
    /**
     * Get monitoring statistics
     */
    getGapAnalysisStats(): {
        total_gaps_detected: number;
        critical_gaps: number;
        helper_not_integrated: number;
        endpoint_bypasses: number;
        average_integration_score: number;
    };
    stopMonitoring(): void;
}
export declare const sseIntegrationGapMonitor: SSEIntegrationGapMonitor;
//# sourceMappingURL=sse-integration-gap-monitor.d.ts.map