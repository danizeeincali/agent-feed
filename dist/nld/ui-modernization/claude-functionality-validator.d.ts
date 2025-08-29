/**
 * Claude Functionality Validator
 * Ensures UI changes don't break Claude process spawning and core functionality
 */
import { EventEmitter } from 'events';
export interface ClaudeFunctionality {
    processSpawning: boolean;
    buttonHandlers: boolean;
    instanceCreation: boolean;
    terminalConnection: boolean;
    sseStreaming: boolean;
}
export interface ClaudeValidationResult {
    functionality: keyof ClaudeFunctionality;
    passed: boolean;
    error?: string;
    context?: Record<string, any>;
    timestamp: number;
}
export declare class ClaudeFunctionalityValidator extends EventEmitter {
    private validationResults;
    private lastValidation;
    private validationInterval;
    private criticalFailures;
    constructor();
    private startContinuousValidation;
    runFullValidation(): Promise<ClaudeFunctionality>;
    private validateProcessSpawning;
    private validateButtonHandlers;
    private validateInstanceCreation;
    private validateTerminalConnection;
    private validateSSEStreaming;
    private checkButtonClickHandler;
    private isLoadingState;
    private checkForReactContext;
    private checkForReactHook;
    private recordValidationResult;
    getValidationHistory(): ClaudeValidationResult[];
    getCriticalFailures(): string[];
    getLastValidationTime(): number;
    repairClaudeFunctionality(): Promise<boolean>;
    private restoreButtonHandlers;
    private restoreInstanceCreation;
    private restoreTerminalConnection;
    private simulateClaudeAction;
    generateClaudeHealthReport(): string;
    private generateRecommendations;
    destroy(): void;
}
export declare const claudeFunctionalityValidator: ClaudeFunctionalityValidator;
//# sourceMappingURL=claude-functionality-validator.d.ts.map