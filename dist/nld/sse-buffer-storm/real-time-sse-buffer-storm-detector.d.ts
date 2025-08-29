/**
 * NLD Real-Time SSE Buffer Storm Detector
 *
 * Detects critical failure pattern: SSE endpoints sending full buffer
 * instead of incremental data, causing massive message duplication storms
 */
import { EventEmitter } from 'events';
interface SSEMessage {
    id: string;
    data: string;
    timestamp: number;
    endpoint: string;
    position?: number;
}
export declare class RealTimeSSEBufferStormDetector extends EventEmitter {
    private messageBuffer;
    private positionTracking;
    private duplicateCounters;
    private patternDatabase;
    private monitoringActive;
    private storageDir;
    constructor(storageDir?: string);
    private setupMonitoring;
    /**
     * Monitor SSE message for buffer storm patterns
     */
    captureSSEMessage(message: SSEMessage): void;
    private detectImmediateDuplication;
    private detectBufferStorms;
    private analyzePositionTracking;
    private detectIntegrationGaps;
    private recordBufferStormPattern;
    private persistPattern;
    /**
     * Export neural training dataset for claude-flow
     */
    exportNeuralTrainingDataset(): void;
    /**
     * Get current monitoring statistics
     */
    getMonitoringStats(): {
        endpointsMonitored: number;
        totalPatternsDetected: number;
        criticalPatterns: number;
        integrationGaps: number;
        averageTDDFactor: number;
    };
    stopMonitoring(): void;
    startMonitoring(): void;
}
export declare const sseBufferStormDetector: RealTimeSSEBufferStormDetector;
export {};
//# sourceMappingURL=real-time-sse-buffer-storm-detector.d.ts.map