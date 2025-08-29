/**
 * NLD Deployment Orchestrator
 * Coordinates all NLD monitoring components for SSE to WebSocket refactoring failure capture
 */
import { EventEmitter } from 'events';
interface NLDDeploymentStatus {
    orchestratorId: string;
    deploymentTime: string;
    components: {
        refactoringMonitor: {
            status: 'active' | 'inactive' | 'error';
            patternsDetected: number;
        };
        consoleErrorDetector: {
            status: 'active' | 'inactive' | 'error';
            errorsDetected: number;
        };
        antiPatternsDatabase: {
            status: 'active' | 'inactive' | 'error';
            patternsLoaded: number;
        };
        communicationMismatchDetector: {
            status: 'active' | 'inactive' | 'error';
            mismatchesDetected: number;
        };
        realTimeMonitor: {
            status: 'active' | 'inactive' | 'error';
            sessionsActive: number;
        };
    };
    metrics: {
        totalPatternsCaptured: number;
        totalErrorsDetected: number;
        totalMismatchesFound: number;
        neuralDataExports: number;
        systemHealth: 'healthy' | 'warning' | 'critical';
    };
    refactoringSession: {
        active: boolean;
        sessionId?: string;
        type?: string;
        duration?: string;
        componentsMonitored: string[];
    };
    alerts: Array<{
        level: 'info' | 'warning' | 'error' | 'critical';
        message: string;
        timestamp: string;
        source: string;
    }>;
}
export declare class NLDDeploymentOrchestrator extends EventEmitter {
    private orchestratorId;
    private deploymentTime;
    private refactoringMonitor;
    private consoleErrorDetector;
    private antiPatternsDatabase;
    private communicationMismatchDetector;
    private realTimeMonitor;
    private deploymentStatus;
    private isDeployed;
    private readonly dataDir;
    private readonly statusFile;
    constructor();
    private initializeComponents;
    private setupComponentEventListeners;
    private initializeDeploymentStatus;
    deployNLD(): Promise<void>;
    startRefactoringSession(type: string, components: string[]): string;
    endRefactoringSession(status?: 'completed' | 'failed' | 'paused'): void;
    captureUserFeedback(feedback: {
        component: string;
        issue: string;
        resolution?: string;
        success: boolean;
    }): void;
    private ensureDataDirectory;
    private updateComponentStatus;
    private updateMetrics;
    private countNeuralExports;
    private calculateSystemHealth;
    private updateRefactoringSession;
    private calculateDuration;
    private handleAlert;
    exportAllNeuralTrainingData(): string[];
    generateComprehensiveReport(): string;
    private calculateUptime;
    private generateComponentReport;
    private identifyProblematicComponents;
    private identifyCommonFailurePatterns;
    private calculateRefactoringSuccessRate;
    private generateSystemRecommendations;
    private assessDataQuality;
    private assessTrainingDataVolume;
    private assessPatternDiversity;
    private calculateReadinessScore;
    private generateActionItems;
    private persistStatus;
    getDeploymentStatus(): NLDDeploymentStatus;
    shutdown(): void;
}
export {};
//# sourceMappingURL=nld-deployment-orchestrator.d.ts.map