/**
 * React Hook Regression Prevention Strategies
 * Comprehensive prevention system for React hook side-effect bugs
 * Based on NLD analysis of TokenCostAnalytics rate limiting fix
 */
export interface PreventionStrategy {
    id: string;
    name: string;
    category: 'static-analysis' | 'runtime-detection' | 'code-patterns' | 'testing-strategies' | 'tooling';
    description: string;
    implementation: {
        technique: string;
        codeExample: string;
        tooling: string[];
        automationLevel: 'manual' | 'semi-automated' | 'fully-automated';
    };
    applicablePatterns: string[];
    preventionEffectiveness: number;
    implementationCost: 'low' | 'medium' | 'high';
    maintenanceCost: 'low' | 'medium' | 'high';
    metadata: Record<string, any>;
}
export interface RegressionPreventionConfig {
    enableStaticAnalysis: boolean;
    enableRuntimeDetection: boolean;
    enableCodePatterns: boolean;
    enableTestingStrategies: boolean;
    enableToolingIntegration: boolean;
    minEffectiveness: number;
    maxImplementationCost: 'low' | 'medium' | 'high';
}
export declare class ReactHookRegressionPreventionSystem {
    private strategies;
    private config;
    constructor(config?: Partial<RegressionPreventionConfig>);
    /**
     * Generate comprehensive prevention strategies
     */
    generatePreventionStrategies(): Promise<PreventionStrategy[]>;
    /**
     * Generate static analysis prevention strategies
     */
    private generateStaticAnalysisStrategies;
    /**
     * Generate runtime detection prevention strategies
     */
    private generateRuntimeDetectionStrategies;
    /**
     * Generate code pattern prevention strategies
     */
    private generateCodePatternStrategies;
    /**
     * Generate testing prevention strategies
     */
    private generateTestingStrategies;
    /**
     * Generate tooling integration prevention strategies
     */
    private generateToolingIntegrationStrategies;
    /**
     * Helper methods
     */
    private isCostAcceptable;
    private calculateAverageEffectiveness;
    /**
     * Export prevention strategies
     */
    exportStrategies(workingDirectory: string): Promise<void>;
    /**
     * Get prevention strategies
     */
    getStrategies(): PreventionStrategy[];
    /**
     * Get strategies by category
     */
    getStrategiesByCategory(category: PreventionStrategy['category']): PreventionStrategy[];
}
/**
 * Global prevention system instance
 */
export declare const reactHookRegressionPreventionSystem: ReactHookRegressionPreventionSystem;
//# sourceMappingURL=react-hook-regression-prevention-strategies.d.ts.map