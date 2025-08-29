/**
 * NLD SSE to WebSocket Refactoring Failure Monitor
 * Captures JavaScript errors and refactoring anti-patterns during SSE to WebSocket migration
 */
import { EventEmitter } from 'events';
interface RefactoringFailurePattern {
    id: string;
    timestamp: string;
    errorType: 'ReferenceError' | 'TypeError' | 'SyntaxError' | 'NetworkError' | 'StateError';
    component: string;
    originalCode: string;
    refactoredCode: string;
    errorMessage: string;
    stackTrace: string;
    contextData: {
        migration: 'SSE_TO_WEBSOCKET';
        phase: 'handler_replacement' | 'connection_setup' | 'event_binding' | 'cleanup';
        methodsInvolved: string[];
        dependencies: string[];
    };
    severity: 'low' | 'medium' | 'high' | 'critical';
    patternSignature: string;
}
export declare class SSEWebSocketRefactoringMonitor extends EventEmitter {
    private patterns;
    private readonly dataDir;
    private readonly patternFile;
    private isMonitoring;
    constructor();
    private ensureDataDirectory;
    private loadExistingPatterns;
    startMonitoring(): void;
    private monitorJavaScriptErrors;
    private monitorHandlerReferenceErrors;
    private monitorConnectionMismatches;
    private monitorEventBindingFailures;
    private captureRefactoringFailure;
    private captureJavaScriptReferenceError;
    private captureCommunicationMismatch;
    private captureEventBindingFailure;
    private calculateSeverity;
    private generateOriginalCode;
    private generateRefactoredCode;
    private extractDependencies;
    private generatePatternSignature;
    private persistPatterns;
    getPatterns(): RefactoringFailurePattern[];
    getPatternsByType(errorType: string): RefactoringFailurePattern[];
    getPatternsByComponent(component: string): RefactoringFailurePattern[];
    exportToNeuralTraining(): string;
    private generatePreventionStrategy;
    generateReport(): string;
    private groupBy;
    private generateRecommendations;
    stopMonitoring(): void;
}
export {};
//# sourceMappingURL=sse-websocket-refactoring-failure-monitor.d.ts.map