/**
 * Network Anti-Patterns Database - NLD System
 *
 * Comprehensive database of network failure anti-patterns with
 * classification, prevention strategies, and TDD recommendations.
 */
export interface NetworkAntiPattern {
    id: string;
    name: string;
    category: 'PERFORMANCE' | 'RELIABILITY' | 'SECURITY' | 'MAINTAINABILITY' | 'SCALABILITY';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    symptoms: string[];
    causes: string[];
    impacts: {
        performance: number;
        reliability: number;
        maintainability: number;
        userExperience: number;
    };
    detectionCriteria: {
        metrics: Array<{
            metric: string;
            threshold: number;
            operator: '>' | '<' | '==' | '!=';
        }>;
        patterns: string[];
        timeWindow: number;
    };
    realWorldExamples: Array<{
        context: string;
        manifestation: string;
        resolution: string;
    }>;
    prevention: {
        designPrinciples: string[];
        implementationGuidelines: string[];
        monitoringRequirements: string[];
        testingStrategies: string[];
    };
    remediation: {
        immediateActions: string[];
        shortTermFixes: string[];
        longTermSolutions: string[];
        migrationSteps: string[];
    };
    tddApproach: {
        testTypes: string[];
        testScenarios: string[];
        mockStrategies: string[];
        assertionPatterns: string[];
        continuousValidation: string[];
    };
    relatedPatterns: string[];
    frequency: number;
    confidenceScore: number;
}
export interface AntiPatternRule {
    id: string;
    patternId: string;
    condition: string;
    threshold: any;
    timeWindow: number;
    action: 'LOG' | 'WARN' | 'ALERT' | 'BLOCK';
    message: string;
}
export declare class NetworkAntiPatternsDatabase {
    private patterns;
    private rules;
    private detectedInstances;
    private learningData;
    constructor();
    private initializeBuiltInPatterns;
    private addTimeoutCascadePattern;
    private addConnectionLeakPattern;
    private addDataOverfetchPattern;
    private addRetryStormPattern;
    private addCircuitBreakerBypassPattern;
    private initializeDetectionRules;
    private initializePatternLearning;
    private addAntiPattern;
    private addDetectionRule;
    private analyzePatternTrends;
    private updatePatternConfidence;
    private learnNewPatterns;
    private calculateTrend;
    private getUnclassifiedInstances;
    private clusterInstances;
    private proposeLearnedPattern;
    detectAntiPattern(metrics: Record<string, number>, context: any): string[];
    private evaluateRule;
    private recordDetection;
    getAntiPattern(id: string): NetworkAntiPattern | undefined;
    getAllAntiPatterns(): NetworkAntiPattern[];
    getAntiPatternsByCategory(category: NetworkAntiPattern['category']): NetworkAntiPattern[];
    getAntiPatternsBySeverity(severity: NetworkAntiPattern['severity']): NetworkAntiPattern[];
    getDetectionHistory(patternId: string): any[];
    getPatternStatistics(): any;
    generatePreventionReport(patternIds?: string[]): any;
    exportForNeuralTraining(): any;
    validateDetection(patternId: string, instanceId: string, isValid: boolean): void;
}
//# sourceMappingURL=network-anti-patterns-database.d.ts.map