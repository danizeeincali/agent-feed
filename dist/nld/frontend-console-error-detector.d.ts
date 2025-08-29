/**
 * Frontend Console Error Detector for NLD
 * Monitors JavaScript console errors during SSE to WebSocket refactoring
 */
import { EventEmitter } from 'events';
interface ConsoleError {
    id: string;
    timestamp: string;
    type: 'error' | 'warn' | 'log' | 'info' | 'debug';
    message: string;
    source: string;
    line?: number;
    column?: number;
    stack?: string;
    context: {
        url: string;
        userAgent: string;
        component?: string;
        action?: string;
    };
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'refactoring' | 'network' | 'runtime' | 'syntax' | 'reference';
}
interface RefactoringErrorSignature {
    pattern: string;
    frequency: number;
    components: string[];
    errorMessages: string[];
    lastSeen: string;
    severity: string;
}
export declare class FrontendConsoleErrorDetector extends EventEmitter {
    private errors;
    private errorSignatures;
    private readonly dataDir;
    private readonly errorsFile;
    private readonly signaturesFile;
    private isMonitoring;
    private readonly refactoringPatterns;
    constructor();
    private ensureDataDirectory;
    private loadExistingData;
    startMonitoring(): void;
    private simulateRefactoringErrors;
    captureConsoleError(errorData: Partial<ConsoleError> & {
        component?: string;
        action?: string;
    }): void;
    private calculateSeverity;
    private categorizeError;
    private updateErrorSignature;
    private generateErrorSignature;
    private persistErrors;
    getErrorsByCategory(category: string): ConsoleError[];
    getErrorsBySeverity(severity: string): ConsoleError[];
    getErrorsByComponent(component: string): ConsoleError[];
    getFrequentErrorSignatures(minFrequency?: number): RefactoringErrorSignature[];
    exportToNeuralTraining(): string;
    private groupBy;
    private isRefactoringError;
    private generatePreventionStrategy;
    generateConsoleErrorReport(): string;
    private generateConsoleRecommendations;
    stopMonitoring(): void;
}
export {};
//# sourceMappingURL=frontend-console-error-detector.d.ts.map