/**
 * Claude Process I/O Neural Training Dataset - NLD System
 *
 * Generates comprehensive training datasets for neural network learning
 * of Claude CLI process I/O failure patterns and prevention strategies.
 */
import { ClaudeProcessIOMetrics, ClaudeProcessIOErrorPattern } from './claude-process-io-failure-detector';
export interface ClaudeProcessIONeuralRecord {
    recordId: string;
    timestamp: number;
    sessionContext: {
        instanceId: string;
        command: string;
        args: string[];
        workingDirectory: string;
        processType: 'pty' | 'pipe';
        environmentContext: Record<string, any>;
    };
    inputFeatures: {
        hasPromptArgument: number;
        hasPrintFlag: number;
        hasSkipPermissions: number;
        hasInteractiveFlag: number;
        argumentCount: number;
        processType: number;
        spawnTime: number;
        initializationDuration: number;
        stdinInputs: number;
        stdoutOutputs: number;
        stderrOutputs: number;
        interactivePrompts: number;
        silentDuration: number;
        lastActivityAge: number;
        stdinConnected: number;
        stdoutActive: number;
        stderrActive: number;
        authenticationSucceeded: number;
        authenticationTime: number;
    };
    outputLabels: {
        printFlagInputRequired: number;
        interactiveModeBlocked: number;
        ptyStdinDisconnect: number;
        authSuccessNoOutput: number;
        healthScore: number;
        recoveryProbability: number;
    };
    actualOutcome: {
        patternDetected: ClaudeProcessIOErrorPattern['category'] | null;
        resolutionSuccessful: boolean;
        recoveryStrategy: string | null;
        finalProcessState: ClaudeProcessIOMetrics['processState'];
    };
    trainingMetadata: {
        datasetVersion: string;
        featureVersion: string;
        labelQuality: 'high' | 'medium' | 'low';
        userFeedback?: 'correct' | 'incorrect' | 'partial';
    };
}
export interface ClaudeProcessIONeuralDataset {
    datasetId: string;
    version: string;
    createdAt: number;
    records: ClaudeProcessIONeuralRecord[];
    statistics: {
        totalRecords: number;
        successfulProcesses: number;
        failedProcesses: number;
        patternDistribution: Record<string, number>;
        featureRanges: Record<string, {
            min: number;
            max: number;
            avg: number;
        }>;
    };
    neuralArchitectureSpec: {
        inputFeatures: number;
        hiddenLayers: number[];
        outputNeurons: number;
        activationFunction: string;
        lossFunction: string;
        optimizationStrategy: string;
    };
}
export declare class ClaudeProcessIONeuralTrainingDataset {
    private records;
    private featureNormalizers;
    private currentDatasetVersion;
    addProcessSession(metrics: ClaudeProcessIOMetrics, patterns: ClaudeProcessIOErrorPattern[], actualOutcome: ClaudeProcessIONeuralRecord['actualOutcome'], userFeedback?: 'correct' | 'incorrect' | 'partial'): void;
    private createNeuralRecord;
    private calculatePatternProbability;
    private calculateHealthScore;
    private updateFeatureNormalizers;
    normalizeRecord(record: ClaudeProcessIONeuralRecord): ClaudeProcessIONeuralRecord;
    generateDataset(): ClaudeProcessIONeuralDataset;
    exportForClaudeFlow(): {
        dataset: ClaudeProcessIONeuralDataset;
        claudeFlowConfig: {
            modelType: 'process-io-failure-prediction';
            trainingParams: Record<string, any>;
            validationSplit: number;
            epochs: number;
        };
    };
    clear(): void;
    getRecordCount(): number;
    getPatternStatistics(): Record<string, {
        count: number;
        accuracy: number;
    }>;
}
export declare const claudeProcessIONeuralDataset: ClaudeProcessIONeuralTrainingDataset;
//# sourceMappingURL=claude-process-io-neural-training-dataset.d.ts.map