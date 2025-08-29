/**
 * NLD UI Regression Monitor
 * Detects when UI modernization breaks existing Claude functionality
 */
import { EventEmitter } from 'events';
export interface UIRegressionPattern {
    id: string;
    type: 'CLAUDE_FUNCTIONALITY_REGRESSION' | 'SSE_STREAMING_DISRUPTION' | 'BUTTON_INTERACTION_DEGRADATION' | 'COMPONENT_STATE_DESYNC' | 'PERFORMANCE_DEGRADATION';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    detectionCriteria: {
        selector?: string;
        event?: string;
        threshold?: number;
        condition?: string;
    };
    affectedComponents: string[];
    rollbackAction?: () => Promise<void>;
}
export interface UIRegressionEvent {
    pattern: UIRegressionPattern;
    timestamp: number;
    context: {
        component: string;
        operation: string;
        state: Record<string, any>;
        errorDetails?: string;
    };
    userImpact: string;
    recoveryStatus: 'PENDING' | 'IN_PROGRESS' | 'RECOVERED' | 'FAILED';
}
export declare class UIRegressionMonitor extends EventEmitter {
    private patterns;
    private activeMonitors;
    private regressionEvents;
    private observers;
    private performanceObserver?;
    constructor();
    private initializePatterns;
    registerPattern(pattern: UIRegressionPattern): void;
    private startMonitoring;
    private setupDOMMonitoring;
    private setupPerformanceMonitoring;
    private setupEventMonitoring;
    private setupSSEMonitoring;
    private setupStateMonitoring;
    private validateButtonFunctionality;
    private hasRecentClaudeActivity;
    private getRecentConsoleLogs;
    detectRegression(patternId: string, context: any): void;
    private assessUserImpact;
    private initiateAutoRecovery;
    private restoreClaudeFunctionality;
    private restoreSSEFunctionality;
    private restoreButtonFunctionality;
    private restoreStateSynchronization;
    private restorePerformance;
    private reattachClaudeHandlers;
    private simulateClaudeLaunch;
    getRegressionHistory(): UIRegressionEvent[];
    getActivePatterns(): UIRegressionPattern[];
    generateReport(): string;
    destroy(): void;
}
export declare const uiRegressionMonitor: UIRegressionMonitor;
//# sourceMappingURL=ui-regression-monitor.d.ts.map