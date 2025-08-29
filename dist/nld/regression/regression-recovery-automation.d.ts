/**
 * Regression Recovery Automation - Self-Healing System
 *
 * Advanced self-healing system that automatically recovers from Claude process regressions.
 * Implements intelligent rollback, fallback, and restoration mechanisms.
 */
import { RegressionAlert } from './claude-process-regression-monitor';
export interface RecoveryPlan {
    id: string;
    name: string;
    description: string;
    targetPattern: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    phases: RecoveryPhase[];
    rollbackPlan: RollbackPlan;
    estimatedDuration: number;
    successProbability: number;
}
export interface RecoveryPhase {
    phaseId: string;
    name: string;
    description: string;
    actions: RecoveryAction[];
    dependencies: string[];
    timeoutMs: number;
    rollbackOnFailure: boolean;
}
export interface RecoveryAction {
    actionId: string;
    name: string;
    implementation: () => Promise<RecoveryActionResult>;
    validationCheck: () => Promise<boolean>;
    rollbackAction?: () => Promise<void>;
}
export interface RecoveryActionResult {
    success: boolean;
    message: string;
    data?: any;
    metrics?: any;
    nextPhase?: string;
}
export interface RollbackPlan {
    id: string;
    steps: RollbackStep[];
    safetyChecks: string[];
}
export interface RollbackStep {
    stepId: string;
    description: string;
    action: () => Promise<void>;
    verification: () => Promise<boolean>;
}
export interface RecoveryExecution {
    executionId: string;
    planId: string;
    alert: RegressionAlert;
    startTime: Date;
    endTime?: Date;
    currentPhase: string;
    status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
    phases: PhaseExecution[];
    metrics: ExecutionMetrics;
}
export interface PhaseExecution {
    phaseId: string;
    startTime: Date;
    endTime?: Date;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    actions: ActionExecution[];
}
export interface ActionExecution {
    actionId: string;
    startTime: Date;
    endTime?: Date;
    result?: RecoveryActionResult;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
}
export interface ExecutionMetrics {
    totalDuration: number;
    phasesCompleted: number;
    actionsExecuted: number;
    rollbacksPerformed: number;
    successRate: number;
}
export declare class RegressionRecoveryAutomation {
    private recoveryPlans;
    private activeExecutions;
    private executionHistory;
    private isActive;
    private processingQueue;
    constructor();
    /**
     * Initialize comprehensive recovery plans
     */
    private initializeRecoveryPlans;
    /**
     * Start recovery automation engine
     */
    startRecoveryEngine(): void;
    /**
     * Handle regression alert and initiate recovery
     */
    handleRegressionAlert(alert: RegressionAlert): Promise<string | null>;
    /**
     * Execute recovery plan
     */
    private executeRecoveryPlan;
    /**
     * Execute recovery phase
     */
    private executeRecoveryPhase;
    /**
     * Execute rollback plan
     */
    private executeRollback;
    /**
     * Rollback specific phase
     */
    private rollbackPhase;
    /**
     * Process recovery queue
     */
    private processRecoveryQueue;
    private scanForPrintFlags;
    private validatePrintFlagsDetected;
    private backupProcessConfigurations;
    private validateBackupCreated;
    private cleanupFailedBackup;
    private stripPrintFlagsFromCommands;
    private validateNoPrintFlags;
    private restorePreviousCommands;
    private restartClaudeProcesses;
    private validateProcessesRunning;
    private restoreOriginalProcesses;
    private validateClaudeFunctionality;
    private confirmSystemHealth;
    private findMockClaudeProcesses;
    private validateMockProcessesFound;
    private checkClaudeAuthentication;
    private validateAuthenticationWorking;
    private restoreAuthState;
    private terminateMockProcesses;
    private validateMockProcessesTerminated;
    private restartMockProcesses;
    private spawnRealClaudeProcesses;
    private validateRealProcessesRunning;
    private cleanupFailedRealProcesses;
    /**
     * Get recovery system status
     */
    getStatus(): any;
    private calculateSuccessRate;
    private restoreBackupConfigurations;
    private verifyConfigurationRestored;
    private restoreMockMode;
    private verifyMockModeRestored;
    private diagnoseAuthenticationProblem;
    private validateDiagnosisComplete;
    private resetAuthenticationSystem;
    private validateAuthSystemReset;
    private restoreAuthSystem;
    private restoreAuthenticationState;
    private verifyAuthStateRestored;
}
export declare const regressionRecoveryAutomation: RegressionRecoveryAutomation;
//# sourceMappingURL=regression-recovery-automation.d.ts.map