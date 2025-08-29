/**
 * Automated Prevention System - Smart Recovery and Prevention Automation
 *
 * Implements intelligent automated prevention and recovery for Claude process regressions.
 * Integrates with monitoring and detection systems to provide seamless self-healing.
 */
import { RegressionAlert } from './claude-process-regression-monitor';
export interface PreventionAction {
    id: string;
    name: string;
    description: string;
    triggerPatterns: string[];
    executionStrategy: 'immediate' | 'delayed' | 'user_confirmation';
    priority: number;
    implementation: () => Promise<PreventionResult>;
}
export interface PreventionResult {
    success: boolean;
    action: string;
    details: string;
    timestamp: Date;
    backupCreated?: boolean;
    rollbackAvailable?: boolean;
}
export interface RecoveryStrategy {
    id: string;
    name: string;
    applicablePatterns: string[];
    steps: RecoveryStep[];
    rollbackSteps: RecoveryStep[];
    successCriteria: string[];
}
export interface RecoveryStep {
    stepId: string;
    description: string;
    action: () => Promise<StepResult>;
    timeout: number;
    rollbackAction?: () => Promise<StepResult>;
}
export interface StepResult {
    success: boolean;
    message: string;
    data?: any;
    nextStep?: string;
}
export declare class AutomatedPreventionSystem {
    private preventionActions;
    private recoveryStrategies;
    private executionHistory;
    private isActive;
    private preventionQueue;
    private processingInterval?;
    constructor();
    /**
     * Initialize automated prevention actions
     */
    private initializePreventionActions;
    /**
     * Initialize recovery strategies
     */
    private initializeRecoveryStrategies;
    /**
     * Start the automated prevention engine
     */
    startPreventionEngine(): void;
    /**
     * Stop the prevention engine
     */
    stopPreventionEngine(): void;
    /**
     * Subscribe to regression alerts from monitoring system
     */
    private subscribeToAlerts;
    /**
     * Handle incoming regression alert
     */
    handleAlert(alert: RegressionAlert): void;
    /**
     * Find applicable prevention actions for pattern
     */
    private findApplicableActions;
    /**
     * Process prevention queue
     */
    private processPreventionQueue;
    /**
     * Process high priority actions immediately
     */
    private processHighPriorityActions;
    /**
     * Execute prevention action
     */
    private executePreventionAction;
    /**
     * Try recovery strategy for pattern
     */
    private tryRecoveryStrategy;
    /**
     * Execute recovery strategy
     */
    private executeRecoveryStrategy;
    /**
     * Record execution history
     */
    private recordExecutionHistory;
    private stripPrintFlags;
    private forceRealClaude;
    private reinitializeAuthentication;
    private fixDirectoryResolution;
    private recoverProcessSpawning;
    private resetSSEConnections;
    private validateProcessConfiguration;
    private backupConfiguration;
    private identifyPrintFlags;
    private removePrintFlags;
    private restartProcessesClean;
    private restoreConfiguration;
    private enableRealProcessMode;
    private validateClaudeCLI;
    private recreateRealProcesses;
    private allowMockFallback;
    /**
     * Get system status
     */
    getStatus(): any;
    /**
     * Get performance metrics
     */
    private getPerformanceMetrics;
}
export declare const automatedPreventionSystem: AutomatedPreventionSystem;
//# sourceMappingURL=automated-prevention-system.d.ts.map