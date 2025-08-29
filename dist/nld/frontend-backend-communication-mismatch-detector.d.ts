/**
 * Frontend-Backend Communication Mismatch Detector for NLD
 * Detects protocol and endpoint mismatches during SSE to WebSocket refactoring
 */
import { EventEmitter } from 'events';
interface CommunicationMismatch {
    id: string;
    timestamp: string;
    type: 'protocol_mismatch' | 'endpoint_mismatch' | 'message_format_mismatch' | 'auth_mismatch' | 'connection_failure';
    frontend: {
        protocol: 'http' | 'ws' | 'wss' | 'sse';
        endpoint: string;
        method?: string;
        expectedFormat: string;
        actualBehavior: string;
        component: string;
        file: string;
    };
    backend: {
        protocol: 'http' | 'ws' | 'wss' | 'sse';
        endpoint: string;
        method?: string;
        expectedFormat: string;
        actualBehavior: string;
        service: string;
    };
    mismatchDescription: string;
    errorMessages: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    impact: string;
    detectionContext: {
        refactoringPhase: string;
        migrationDirection: string;
        userAction: string;
    };
    resolutionStrategy: string;
    preventionTips: string[];
}
interface NetworkTraceEvent {
    timestamp: string;
    type: 'request' | 'response' | 'error' | 'timeout' | 'close';
    url: string;
    method?: string;
    protocol: string;
    status?: number;
    responseTime?: number;
    errorMessage?: string;
    component: string;
}
export declare class FrontendBackendCommunicationMismatchDetector extends EventEmitter {
    private mismatches;
    private networkTraces;
    private readonly dataDir;
    private readonly mismatchesFile;
    private readonly tracesFile;
    private isMonitoring;
    private readonly endpointMappings;
    constructor();
    private ensureDataDirectory;
    private loadExistingData;
    startMonitoring(): void;
    private simulateCommonMismatches;
    private captureCommunicationMismatch;
    private calculateSeverity;
    private generateResolutionStrategy;
    private generatePreventionTips;
    private createNetworkTrace;
    validateEndpointCompatibility(frontendConfig: any, backendConfig: any): boolean;
    private isMessageFormatCompatible;
    simulateNetworkActivity(): void;
    getMismatchesByType(type: CommunicationMismatch['type']): CommunicationMismatch[];
    getMismatchesByComponent(component: string): CommunicationMismatch[];
    getMismatchesBySeverity(severity: CommunicationMismatch['severity']): CommunicationMismatch[];
    getNetworkTracesByComponent(component: string): NetworkTraceEvent[];
    analyzeConnectionPatterns(): any;
    private groupBy;
    private countOccurrences;
    private calculateAverageResponseTime;
    private calculateConnectionSuccessRate;
    exportToNeuralTraining(): string;
    generateMismatchReport(): string;
    private getTopProblematicComponents;
    private getCommonResolutionStrategies;
    private generatePreventionRecommendations;
    private persistData;
    stopMonitoring(): void;
    getAllMismatches(): CommunicationMismatch[];
    getAllNetworkTraces(): NetworkTraceEvent[];
}
export {};
//# sourceMappingURL=frontend-backend-communication-mismatch-detector.d.ts.map