/**
 * API Endpoint Mismatch Analyzer - NLD System
 *
 * Detects and analyzes API endpoint mismatches, version conflicts,
 * and frontend-backend API contract violations.
 */
export interface EndpointMismatch {
    id: string;
    timestamp: number;
    type: 'NOT_FOUND' | 'VERSION_MISMATCH' | 'METHOD_NOT_ALLOWED' | 'SCHEMA_MISMATCH' | 'PARAMETER_MISMATCH';
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: {
        requestedUrl: string;
        expectedUrl?: string;
        method: string;
        statusCode: number;
        requestPayload?: any;
        responsePayload?: any;
        headers: Record<string, string>;
    };
    apiContract: {
        expectedSchema?: any;
        actualSchema?: any;
        missingFields: string[];
        extraFields: string[];
        typeConflicts: Array<{
            field: string;
            expected: string;
            actual: string;
        }>;
    };
    versionInfo: {
        frontendVersion?: string;
        backendVersion?: string;
        apiVersion?: string;
        compatibility: 'compatible' | 'incompatible' | 'unknown';
    };
    tddPrevention: {
        contractTests: string[];
        mockStrategies: string[];
        migrationSteps: string[];
        validationRules: string[];
    };
}
export interface APIMapping {
    pattern: string;
    method: string;
    expectedResponse: any;
    versions: string[];
    deprecated: boolean;
    alternativeEndpoints: string[];
}
export declare class APIEndpointMismatchAnalyzer {
    private mismatches;
    private apiMappings;
    private endpointHitCount;
    private schemaCache;
    private versionHeaders;
    constructor();
    private initializeAPIMapping;
    private initializeRequestInterception;
    private initializeSchemaValidation;
    private trackEndpointUsage;
    private analyzeResponse;
    private analyzeNetworkError;
    private analyzeXHRResponse;
    private analyzeXHRError;
    private captureEndpointMismatch;
    private normalizeUrl;
    private findAlternativeEndpoints;
    private isUrlSimilar;
    private extractAllowedMethods;
    private checkVersionMismatch;
    private validateResponseSchema;
    private getExpectedSchema;
    private performSchemaValidation;
    private getDataType;
    private generateSchemaFromData;
    private extractVersionFromRequest;
    private extractVersionFromResponse;
    private extractResponseHeaders;
    private findExpectedUrl;
    private calculateUrlSimilarity;
    private calculateSeverity;
    private getFrontendVersion;
    private getBackendVersion;
    private getAPIVersion;
    private assessVersionCompatibility;
    private generateContractTests;
    private generateMockStrategies;
    private generateMigrationSteps;
    private generateValidationRules;
    private loadAPISchemas;
    private logMismatch;
    getMismatches(): EndpointMismatch[];
    getMismatchMetrics(): any;
    private groupBy;
    private getMostProblematicEndpoints;
    private getVersionCompatibilityStats;
    exportForNeuralTraining(): any;
    getRecommendations(): Array<{
        type: string;
        priority: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        action: string;
    }>;
}
//# sourceMappingURL=api-endpoint-mismatch-analyzer.d.ts.map