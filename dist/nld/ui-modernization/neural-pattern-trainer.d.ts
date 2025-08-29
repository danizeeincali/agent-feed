/**
 * Neural Pattern Trainer
 * Trains neural networks to recognize UI-functionality coupling patterns
 */
import { EventEmitter } from 'events';
export interface UIFunctionalityPattern {
    id: string;
    patternType: 'UI_CHANGE' | 'FUNCTIONALITY_BREAK' | 'RECOVERY_SUCCESS' | 'REGRESSION_PATTERN';
    timestamp: number;
    features: {
        domChanges: number;
        cssChanges: number;
        componentUpdates: number;
        styleModifications: number;
        buttonHandlerIntact: boolean;
        sseStreamingActive: boolean;
        componentStateConsistent: boolean;
        performanceWithinBudget: boolean;
        timeOfDay: number;
        userActivity: number;
        systemLoad: number;
        previousRegressions: number;
    };
    outcome: 'SUCCESS' | 'REGRESSION' | 'PARTIAL_REGRESSION' | 'RECOVERY';
    severity: number;
    recoveryTime: number;
}
export interface NeuralTrainingData {
    patterns: UIFunctionalityPattern[];
    metadata: {
        totalPatterns: number;
        successPatterns: number;
        regressionPatterns: number;
        accuracyScore: number;
        lastTraining: number;
    };
}
export interface PredictionResult {
    regressionProbability: number;
    confidenceScore: number;
    predictedIssues: string[];
    recommendedActions: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
export declare class NeuralPatternTrainer extends EventEmitter {
    private trainingData;
    private neuralWeights;
    private featureImportance;
    private accuracyHistory;
    private lastTrainingTime;
    private patternBuffer;
    private trainingInterval;
    constructor();
    private initializeWeights;
    private setupPeriodicTraining;
    captureUIFunctionalityPattern(uiChanges: {
        domChanges: number;
        cssChanges: number;
        componentUpdates: number;
        styleModifications: number;
    }, functionalityState: {
        buttonHandlerIntact: boolean;
        sseStreamingActive: boolean;
        componentStateConsistent: boolean;
        performanceWithinBudget: boolean;
    }, outcome: 'SUCCESS' | 'REGRESSION' | 'PARTIAL_REGRESSION' | 'RECOVERY', severity?: number, recoveryTime?: number): string;
    predictRegressionRisk(plannedChanges: {
        domChanges: number;
        cssChanges: number;
        componentUpdates: number;
        styleModifications: number;
    }, currentState: {
        buttonHandlerIntact: boolean;
        sseStreamingActive: boolean;
        componentStateConsistent: boolean;
        performanceWithinBudget: boolean;
    }): PredictionResult;
    private calculateRegressionProbability;
    private calculateConfidence;
    private findSimilarPatterns;
    private predictSpecificIssues;
    private generateRecommendations;
    private determineRiskLevel;
    private scheduleImmediateTraining;
    private trainOnPatterns;
    private calculateTrainingAccuracy;
    private estimateUserActivity;
    private estimateSystemLoad;
    private countRecentRegressions;
    exportTrainingData(): NeuralTrainingData;
    generateNeuralReport(): string;
    private generateTrainingRecommendations;
    destroy(): void;
}
export declare const neuralPatternTrainer: NeuralPatternTrainer;
//# sourceMappingURL=neural-pattern-trainer.d.ts.map