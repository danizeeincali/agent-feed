/**
 * Simplified Prevention Strategies for Mixed API Versioning Anti-Pattern
 */
export interface TDDPreventionStrategy {
    strategy: string;
    testPattern: string;
    implementation: string[];
    validationRules: string[];
    preventionScore: number;
}
export declare class MixedAPIVersioningPreventionStrategies {
    private readonly strategiesPath;
    constructor();
    /**
     * Generate TDD prevention strategies
     */
    generateTDDPreventionStrategies(): TDDPreventionStrategy[];
    /**
     * Export prevention strategies
     */
    exportPreventionStrategies(): Promise<void>;
    /**
     * Generate test templates (simplified)
     */
    generateTestTemplates(): Promise<void>;
}
export default MixedAPIVersioningPreventionStrategies;
//# sourceMappingURL=mixed-api-versioning-prevention-strategies.d.ts.map