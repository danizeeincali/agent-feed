/**
 * NLD Network Deployment Validator - System Validation and Reporting
 *
 * Validates the complete NLD (Neuro-Learning Development) system deployment
 * for network failure pattern detection and generates comprehensive reports.
 */
export interface NLDComponentHealth {
    componentId: string;
    name: string;
    status: 'healthy' | 'degraded' | 'failed' | 'not_initialized';
    version: string;
    uptime: number;
    metrics: {
        patternsDetected: number;
        accuracy: number;
        responseTime: number;
        memoryUsage: number;
        errorRate: number;
    };
    capabilities: string[];
    dependencies: string[];
    issues: Array<{
        severity: 'low' | 'medium' | 'high' | 'critical';
        message: string;
        recommendation: string;
    }>;
}
export interface NLDSystemHealth {
    overall: 'healthy' | 'degraded' | 'critical' | 'failed';
    score: number;
    components: NLDComponentHealth[];
    integration: {
        dataFlow: 'healthy' | 'partial' | 'broken';
        neuralTraining: 'active' | 'limited' | 'inactive';
        tddCoverage: number;
        patternAccuracy: number;
    };
    performance: {
        averageDetectionTime: number;
        systemResponseTime: number;
        memoryFootprint: number;
        throughput: number;
    };
    recommendations: Array<{
        priority: 'low' | 'medium' | 'high' | 'critical';
        category: string;
        description: string;
        action: string;
        estimatedImpact: number;
    }>;
}
export interface NLDDeploymentReport {
    timestamp: number;
    version: string;
    deploymentId: string;
    systemHealth: NLDSystemHealth;
    patternAnalysis: {
        totalPatternsDetected: number;
        patternsByType: Record<string, number>;
        confidenceScores: Record<string, number>;
        trendAnalysis: any;
    };
    neuralTraining: {
        modelsGenerated: number;
        trainingAccuracy: number;
        datasetSize: number;
        exportedDatasets: number;
    };
    tddIntegration: {
        strategiesDeployed: number;
        testCoverage: number;
        preventionEffectiveness: number;
        implementationGaps: string[];
    };
    recommendations: {
        immediate: string[];
        shortTerm: string[];
        longTerm: string[];
    };
    nextSteps: string[];
}
export declare class NLDNetworkDeploymentValidator {
    private components;
    private healthHistory;
    private deploymentId;
    private version;
    constructor();
    private initializeComponents;
    validateDeployment(): Promise<NLDDeploymentReport>;
    private assessSystemHealth;
    private validateNetworkDetector;
    private validateRealTimeMonitor;
    private validateCORSTimeoutDetector;
    private validateAPIAnalyzer;
    private validateCommunicationAnalyzer;
    private validateNeuralExporter;
    private validateAntiPatternsDB;
    private validateTDDStrategies;
    private assessIntegration;
    private assessDataFlow;
    private assessNeuralTraining;
    private assessTDDCoverage;
    private assessPatternAccuracy;
    private assessPerformance;
    private calculateOverallScore;
    private determineOverallStatus;
    private analyzePatterns;
    private validateNeuralTraining;
    private validateTDDIntegration;
    private createFailedComponent;
    private identifyDetectorIssues;
    private identifyMonitorIssues;
    private identifyCORSTimeoutIssues;
    private identifyAPIAnalyzerIssues;
    private identifyCommunicationIssues;
    private identifyNeuralExporterIssues;
    private identifyAntiPatternsDBIssues;
    private identifyTDDStrategiesIssues;
    private generateSystemRecommendations;
    private generateRecommendations;
    private generateNextSteps;
    private analyzeTrends;
    private identifyImplementationGaps;
    private estimateMemoryUsage;
    private recordHealthHistory;
    private logValidationResults;
    generateFullReport(): Promise<NLDDeploymentReport>;
    getHealthHistory(): Array<{
        timestamp: number;
        health: NLDSystemHealth;
    }>;
    quickHealthCheck(): Promise<{
        status: string;
        score: number;
        criticalIssues: number;
    }>;
}
//# sourceMappingURL=nld-network-deployment-validator.d.ts.map