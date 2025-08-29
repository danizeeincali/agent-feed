/**
 * Real-Time Refactoring Monitor for NLD
 * Monitors live refactoring activities and captures failure patterns in real-time
 */
import { EventEmitter } from 'events';
interface RefactoringSession {
    id: string;
    startTime: string;
    endTime?: string;
    type: 'SSE_TO_WEBSOCKET' | 'WEBSOCKET_TO_SSE' | 'HTTP_TO_WEBSOCKET' | 'GENERAL_REFACTORING';
    components: string[];
    status: 'active' | 'completed' | 'failed' | 'paused';
    metrics: {
        errorsDetected: number;
        patternsFound: number;
        componentsAffected: number;
        severity: 'low' | 'medium' | 'high' | 'critical';
    };
    failurePatterns: string[];
    recoveryActions: string[];
}
interface RealTimeEvent {
    id: string;
    timestamp: string;
    type: 'error' | 'warning' | 'pattern' | 'recovery' | 'success';
    source: 'console' | 'refactor_monitor' | 'anti_patterns' | 'user_feedback';
    data: any;
    sessionId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    context: {
        component?: string;
        file?: string;
        line?: number;
        refactoringPhase?: string;
    };
}
export declare class RealTimeRefactoringMonitor extends EventEmitter {
    private refactoringMonitor;
    private consoleDetector;
    private antiPatternsDb;
    private currentSession;
    private sessions;
    private realTimeEvents;
    private readonly dataDir;
    private readonly sessionsFile;
    private readonly eventsFile;
    private isMonitoring;
    constructor();
    private ensureDataDirectory;
    private loadExistingData;
    private setupEventListeners;
    startRefactoringSession(type: RefactoringSession['type'], components: string[]): string;
    endRefactoringSession(status?: 'completed' | 'failed' | 'paused'): void;
    private startMonitoring;
    private stopMonitoring;
    private handleRealTimeEvent;
    private getSeverityLevel;
    captureUserFeedback(feedback: {
        component: string;
        issue: string;
        resolution?: string;
        success: boolean;
    }): void;
    getActiveSession(): RefactoringSession | null;
    getSessionHistory(): RefactoringSession[];
    getRealTimeEvents(sessionId?: string, limit?: number): RealTimeEvent[];
    getEventsByComponent(component: string): RealTimeEvent[];
    getEventsBySeverity(severity: RealTimeEvent['severity']): RealTimeEvent[];
    generateRealTimeReport(): string;
    private calculateSessionDuration;
    private calculateErrorRate;
    private findMostAffectedComponent;
    private getSessionSeverityDistribution;
    private analyzeErrorTrends;
    private analyzePatternFrequency;
    private getMostCommonErrorTypes;
    private getRecentSeverityTrend;
    private generateRealTimeRecommendations;
    private calculateRecentErrorRate;
    exportAllNeuralTrainingData(): string[];
    private calculateSessionSuccessRate;
    private getCommonFailurePatterns;
    private getRecoveryStrategies;
    private calculateComponentRiskScores;
    private persistData;
}
export {};
//# sourceMappingURL=real-time-refactoring-monitor.d.ts.map