/**
 * NLD Pattern Deployment Script
 *
 * Orchestrates the deployment of SSE endpoint mismatch pattern detection,
 * neural training data export, and comprehensive pattern analysis storage.
 */
export declare class NLDPatternDeploymentOrchestrator {
    private projectPath;
    constructor(projectPath?: string);
    /**
     * Deploy complete NLD analysis for SSE endpoint mismatch patterns
     */
    deployCompleteAnalysis(): Promise<void>;
    /**
     * Update anti-patterns database with detected patterns
     */
    private updateAntiPatternsDatabase;
    /**
     * Generate comprehensive analysis report
     */
    private generateComprehensiveReport;
    /**
     * Export training dataset for claude-flow integration
     */
    private exportForClaudeFlowTraining;
}
export { NLDPatternDeploymentOrchestrator };
//# sourceMappingURL=nld-pattern-deployment-script.d.ts.map