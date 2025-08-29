/**
 * SSE Endpoint Mismatch Pattern Detector
 *
 * Captures and analyzes the API endpoint path version mismatch pattern
 * where SSE connections fail while REST endpoints work due to inconsistent
 * API versioning between frontend and backend endpoints.
 *
 * Pattern: "API Endpoint Path Version Mismatch"
 * - Symptom: SSE connections fail while REST endpoints work
 * - Root Cause: Inconsistent API versioning between frontend and backend endpoints
 * - Detection: Mixed /api/ and /api/v1/ paths in same application
 * - Classification: Integration bug causing partial functionality failure
 */
export interface EndpointMismatchPattern {
    id: string;
    timestamp: string;
    pattern: 'api_endpoint_path_version_mismatch';
    severity: 'high' | 'medium' | 'low';
    sseEndpoints: EndpointInfo[];
    restEndpoints: EndpointInfo[];
    versioningInconsistencies: VersioningInconsistency[];
    applicationContext: {
        frontend: {
            baseUrl: string;
            sseConnections: SSEConnectionAttempt[];
            restRequests: RESTRequest[];
        };
        backend: {
            routes: RouteDefinition[];
            middleware: string[];
        };
    };
    riskAssessment: {
        failureProbability: number;
        impactScore: number;
        detectionConfidence: number;
        businessImpact: string[];
    };
    preventionStrategies: PreventionStrategy[];
    neuralTrainingFeatures: NeuralTrainingFeature[];
}
export interface EndpointInfo {
    path: string;
    method: string;
    version?: string;
    location: {
        file: string;
        lineNumber: number;
    };
    usage: 'sse' | 'rest' | 'websocket';
    status: 'working' | 'failing' | 'unknown';
}
export interface VersioningInconsistency {
    type: 'path_mismatch' | 'version_gap' | 'protocol_mismatch';
    frontendPath: string;
    backendPath: string;
    severity: number;
    evidence: string[];
}
export interface SSEConnectionAttempt {
    url: string;
    timestamp: string;
    status: 'success' | 'failure' | 'timeout';
    error?: string;
    retryCount: number;
}
export interface RESTRequest {
    url: string;
    method: string;
    timestamp: string;
    status: number;
    responseTime: number;
}
export interface RouteDefinition {
    path: string;
    method: string;
    handler: string;
    middleware: string[];
    version?: string;
}
export interface PreventionStrategy {
    strategy: string;
    description: string;
    implementation: string;
    effectiveness: number;
    testPattern: string;
}
export interface NeuralTrainingFeature {
    feature: string;
    value: number;
    importance: number;
    category: 'detection' | 'classification' | 'prevention';
}
/**
 * Main pattern detector for SSE endpoint mismatches
 */
export declare class SSEEndpointMismatchDetector {
    private patterns;
    private patternStoragePath;
    constructor(storagePath?: string);
    /**
     * Detect endpoint mismatch patterns in codebase
     */
    detectEndpointMismatches(projectPath?: string): Promise<EndpointMismatchPattern[]>;
    /**
     * Extract SSE endpoint usage from frontend code
     */
    private extractSSEEndpoints;
    /**
     * Extract REST endpoint usage from frontend code
     */
    private extractRESTEndpoints;
    /**
     * Extract backend route definitions
     */
    private extractBackendRoutes;
    /**
     * Analyze versioning inconsistencies between endpoints
     */
    private analyzeVersioningInconsistencies;
    /**
     * Create comprehensive endpoint mismatch pattern
     */
    private createEndpointMismatchPattern;
    /**
     * Calculate failure probability based on inconsistencies
     */
    private calculateFailureProbability;
    /**
     * Calculate impact score
     */
    private calculateImpactScore;
    /**
     * Calculate detection confidence
     */
    private calculateDetectionConfidence;
    /**
     * Calculate overall severity
     */
    private calculateSeverity;
    /**
     * Assess business impact
     */
    private assessBusinessImpact;
    /**
     * Generate prevention strategies
     */
    private generatePreventionStrategies;
    /**
     * Extract neural training features
     */
    private extractNeuralTrainingFeatures;
    /**
     * Generate mock SSE connection attempts for analysis
     */
    private generateMockSSEAttempts;
    /**
     * Generate mock REST requests for analysis
     */
    private generateMockRESTRequests;
    /**
     * Load existing patterns from storage
     */
    private loadExistingPatterns;
    /**
     * Save pattern to storage
     */
    private savePattern;
    /**
     * Get all detected patterns
     */
    getAllPatterns(): EndpointMismatchPattern[];
    /**
     * Get pattern by ID
     */
    getPattern(id: string): EndpointMismatchPattern | undefined;
    /**
     * Generate analysis report
     */
    generateAnalysisReport(): any;
    /**
     * Generate global recommendations based on all patterns
     */
    private generateGlobalRecommendations;
}
export declare const sseEndpointMismatchDetector: SSEEndpointMismatchDetector;
//# sourceMappingURL=sse-endpoint-mismatch-pattern-detector.d.ts.map