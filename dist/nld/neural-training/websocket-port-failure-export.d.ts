/**
 * Neural Training Export - WebSocket Port Misconfiguration Failure Pattern
 * Generated: 2025-08-29T13:24:51.892Z
 * Pattern ID: websocket-port-mismatch-1756424891
 */
export interface WebSocketPortFailurePattern {
    patternId: string;
    failureType: 'websocket_port_mismatch';
    severity: 'critical';
    features: WebSocketFailureFeatures;
    outcomes: FailureOutcomes;
    preventionStrategies: PreventionStrategy[];
}
export interface WebSocketFailureFeatures {
    hasHardcodedPorts: number;
    usesEnvironmentVariables: number;
    hasPortValidation: number;
    portCoordinationScore: number;
    websocketUrlConstruction: 'naive' | 'validated' | 'dynamic';
    defaultPortStrategy: 'hardcoded' | 'environment' | 'discovery';
    connectionRetryMechanism: boolean;
    healthCheckImplementation: boolean;
    componentCoupling: 'tight' | 'loose';
    configurationSource: 'props' | 'environment' | 'service_discovery';
    errorHandlingRobustness: number;
    testCoverageWebSocket: number;
    integrationTestPresence: boolean;
    multiEnvironmentSupport: boolean;
    portConfigurationValidation: boolean;
}
export interface FailureOutcomes {
    instanceStatus: 'stuck_starting' | 'error' | 'disconnected';
    connectionErrors: string[];
    userExperienceImpact: 'complete_failure' | 'partial_degradation' | 'minor_issues';
    debuggingComplexity: 'trivial' | 'moderate' | 'complex' | 'very_complex';
    timeToResolution: number;
    productionRisk: 'low' | 'medium' | 'high' | 'critical';
}
export interface PreventionStrategy {
    strategyId: string;
    name: string;
    implementationComplexity: 'low' | 'medium' | 'high';
    effectivenessScore: number;
    requiredChanges: string[];
    testRequirements: string[];
}
/**
 * Training Dataset for WebSocket Port Misconfiguration Patterns
 */
export declare const websocketPortFailureTrainingData: WebSocketPortFailurePattern[];
/**
 * Neural Network Features for Failure Prediction
 */
export interface WebSocketFailurePredictionFeatures {
    portHardcodingScore: number;
    configurationCouplingScore: number;
    urlConstructionComplexity: number;
    connectionSuccessRate: number;
    portMismatchFrequency: number;
    environmentConsistencyScore: number;
    testCoverageScore: number;
    integrationTestScore: number;
    documentationScore: number;
}
/**
 * Failure Probability Calculation
 */
export declare function calculateWebSocketFailureProbability(features: WebSocketFailurePredictionFeatures): number;
/**
 * Generate TDD Prevention Test Cases
 */
export declare function generateWebSocketTDDTests(): string[];
/**
 * Export for Claude Flow Neural Training Integration
 */
export declare const claudeFlowNeuralExport: {
    patternType: string;
    trainingData: WebSocketPortFailurePattern[];
    predictionFunction: typeof calculateWebSocketFailureProbability;
    tddTestGenerator: typeof generateWebSocketTDDTests;
    memoryKey: string;
    version: string;
    exportTimestamp: string;
};
//# sourceMappingURL=websocket-port-failure-export.d.ts.map