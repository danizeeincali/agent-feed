/**
 * Automated Recovery and Rollback System
 * Automatically recovers from UI modernization failures and rolls back problematic changes
 */
import { EventEmitter } from 'events';
export interface RecoverySnapshot {
    id: string;
    timestamp: number;
    description: string;
    domSnapshot: string;
    styleSnapshot: string;
    componentStates: any[];
    functionalityStatus: any;
    performanceMetrics: any;
    confidence: number;
}
export interface RecoveryAction {
    id: string;
    type: 'ROLLBACK' | 'REPAIR' | 'RESTART' | 'RELOAD';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    execute: () => Promise<boolean>;
    validate: () => Promise<boolean>;
    estimatedTime: number;
    successProbability: number;
}
export interface RecoveryAttempt {
    id: string;
    timestamp: number;
    trigger: string;
    actions: RecoveryAction[];
    status: 'IN_PROGRESS' | 'SUCCESS' | 'PARTIAL' | 'FAILED';
    duration: number;
    details: {
        before: any;
        after: any;
        issues: string[];
        resolved: string[];
    };
}
export declare class AutomatedRecoverySystem extends EventEmitter {
    private snapshots;
    private recoveryAttempts;
    private recoveryActions;
    private isRecoveryInProgress;
    private snapshotInterval;
    private lastSnapshot;
    constructor();
    private initializeRecoveryActions;
    private setupAutomaticSnapshots;
    private integrateWithNLDSystems;
    createSnapshot(trigger: string, description: string): string;
    private captureDOMSnapshot;
    private captureStyleSnapshot;
    private captureComponentStates;
    private captureFunctionalityStatus;
    private capturePerformanceMetrics;
    private calculateSnapshotConfidence;
    private getElementSelector;
    private getElementAttributes;
    triggerRecovery(trigger: string, context: any): Promise<boolean>;
    private selectRecoveryActions;
    private findLastGoodSnapshot;
    private restoreSnapshot;
    private captureSystemState;
    private savePreReloadState;
    getRecoveryHistory(): RecoveryAttempt[];
    getSnapshots(): Map<string, RecoverySnapshot>;
    generateRecoveryReport(): string;
    private generateRecoveryRecommendations;
    destroy(): void;
}
export declare const automatedRecoverySystem: AutomatedRecoverySystem;
//# sourceMappingURL=automated-recovery-system.d.ts.map