/**
 * NLD Terminal Pipe Failure Detector
 * Automatically detects when frontend shows mock/hardcoded responses instead of real Claude process output
 *
 * Failure Pattern Analysis:
 * - Backend: "⌨️ Forwarding input to Claude claude-2511: hello" (working)
 * - Frontend: Shows "[RESPONSE] Claude Code session started" (mock/hardcoded)
 * - Real Claude stdout/stderr: Not reaching frontend terminal
 * - Input forwarding: Works but output streaming broken
 */
import { EventEmitter } from 'events';
export interface TerminalPipeFailurePattern {
    id: string;
    timestamp: Date;
    failureType: 'mock_response' | 'pipe_disconnection' | 'sse_stream_broken' | 'output_not_forwarded';
    instanceId: string;
    expectedOutput: string;
    actualOutput: string;
    inputForwarded: boolean;
    outputReceived: boolean;
    sseConnected: boolean;
    processRunning: boolean;
    backendLogs: string[];
    frontendLogs: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    metadata: {
        processInfo?: {
            pid?: number;
            status?: string;
            workingDirectory?: string;
            command?: string;
        };
        connectionInfo?: {
            sseConnections?: number;
            activeConnections?: number;
            connectionType?: string;
        };
        systemInfo?: {
            memoryUsage?: NodeJS.MemoryUsage;
            cpuLoad?: number;
            nodeVersion?: string;
        };
    };
}
export interface NLDTerminalPipeDetectorConfig {
    detectionInterval: number;
    patternRetentionDays: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enableRealTimeMonitoring: boolean;
    storageDirectory: string;
    mockResponsePatterns: string[];
    expectedOutputPatterns: string[];
}
export declare class NLDTerminalPipeFailureDetector extends EventEmitter {
    private config;
    private detectedPatterns;
    private monitoringInterval;
    private storageFile;
    constructor(config?: Partial<NLDTerminalPipeDetectorConfig>);
    private ensureStorageDirectory;
    private loadExistingPatterns;
    private savePatterns;
    startMonitoring(): void;
    stopMonitoring(): void;
    private performDetection;
    private detectMockResponses;
    private scanForMockResponsePatterns;
    private detectSSEStreamBreakdown;
    private scanForSSEStreamIssues;
    private detectOutputPipeDisconnection;
    private scanForOutputPipeIssues;
    private recordFailurePattern;
    private generatePatternId;
    private cleanupOldPatterns;
    getFailurePatterns(filterType?: TerminalPipeFailurePattern['failureType']): TerminalPipeFailurePattern[];
    getFailureStatistics(): {
        total: number;
        byType: Record<TerminalPipeFailurePattern['failureType'], number>;
        bySeverity: Record<TerminalPipeFailurePattern['severity'], number>;
        recentFailures: number;
    };
    private log;
    detectFailureForInstance(instanceId: string, expectedOutput: string, actualOutput: string): Promise<void>;
    destroy(): void;
}
export declare const terminalPipeFailureDetector: NLDTerminalPipeFailureDetector;
//# sourceMappingURL=terminal-pipe-failure-detector.d.ts.map