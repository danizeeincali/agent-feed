/**
 * NLD Regression Prevention System - Complete Export Module
 *
 * Comprehensive Claude process regression prevention system with:
 * - Real-time pattern detection
 * - Automated prevention and recovery
 * - Neural network training
 * - CI/CD integration
 * - Performance monitoring
 */
export { claudeProcessRegressionMonitor, ClaudeProcessRegressionPattern, ClaudeProcessEvent, RegressionAlert } from './claude-process-regression-monitor';
export { regressionPatternDetector, PatternDetectionResult, PatternSignature, BehavioralPattern } from './regression-pattern-detector';
export { automatedPreventionSystem, PreventionAction, PreventionResult, RecoveryStrategy } from './automated-prevention-system';
export { regressionRecoveryAutomation, RecoveryPlan, RecoveryPhase, RecoveryExecution } from './regression-recovery-automation';
export { neuralTrainingBaseline, BaselineConfiguration, ClaudeProcessBaseline, AuthenticationBaseline, DirectoryBaseline, SSEConnectionBaseline, ProcessSpawningBaseline, NeuralSignature } from './neural-training-baseline';
export { neuralTrainingExport, NeuralTrainingDataset, TrainingRecord, ValidationRecord, FeatureDefinition, LabelDefinition } from './neural-training-export';
export { monitoringDashboard, DashboardMetrics, RealTimeStats, PatternDetectionStats, SystemHealthStats, DashboardAlert } from './monitoring-dashboard';
export { failureScenarioDatabase, FailureScenario, FailureCategory, TriggerCondition, Symptom, DetectionSignature, OccurrenceRecord } from './failure-scenario-database';
export { cicdIntegration, PipelineStage, PipelineValidation, ValidationResult, PipelineExecution, CICDConfiguration } from './cicd-integration';
export { nldSystemValidator, NLDSystemStatus, ComponentStatus, SystemPerformanceMetrics, ValidationSuite } from './nld-system-validator';
/**
 * Initialize complete NLD regression prevention system
 */
export declare function initializeNLDSystem(): Promise<boolean>;
/**
 * Get complete system status
 */
export declare function getNLDSystemStatus(): Promise<any>;
/**
 * Export all training data for neural networks
 */
export declare function exportNeuralTrainingData(): Promise<any>;
/**
 * Run CI/CD pipeline validation
 */
export declare function runCICDValidation(): Promise<any>;
/**
 * Generate comprehensive system report
 */
export declare function generateSystemReport(): Promise<any>;
declare const _default: {
    initialize: typeof initializeNLDSystem;
    getStatus: typeof getNLDSystemStatus;
    exportTrainingData: typeof exportNeuralTrainingData;
    runValidation: typeof runCICDValidation;
    generateReport: typeof generateSystemReport;
};
export default _default;
//# sourceMappingURL=index.d.ts.map