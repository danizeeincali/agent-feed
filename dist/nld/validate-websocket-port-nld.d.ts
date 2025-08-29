/**
 * WebSocket Port Failure NLD Validation & Demonstration
 * Validates the captured failure pattern and demonstrates neural training integration
 */
interface ValidationResult {
    patternDetected: boolean;
    neuralTrainingReady: boolean;
    tddStrategiesGenerated: boolean;
    effectivenessScore: number;
    recommendations: string[];
}
/**
 * Main NLD Validation Function
 */
export declare function validateWebSocketPortNLD(): Promise<ValidationResult>;
/**
 * Demonstrate Neural Training Integration
 */
export declare function demonstrateNeuralTraining(): Promise<void>;
/**
 * Export NLD Validation Summary Report
 */
export declare function generateValidationReport(result: ValidationResult): string;
export {};
//# sourceMappingURL=validate-websocket-port-nld.d.ts.map