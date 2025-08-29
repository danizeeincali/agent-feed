/**
 * NLD Neural Training Export System
 *
 * Exports SSE buffer storm failure patterns for claude-flow neural training
 * Focuses on "claimed success vs actual failure" patterns for TDD improvement
 */
export declare class NeuralTrainingExportSystem {
    private exportDir;
    constructor(exportDir?: string);
    private ensureExportDirectory;
    /**
     * Export comprehensive neural training dataset for SSE buffer storm patterns
     */
    exportSSEBufferStormDataset(): Promise<string>;
    /**
     * Export TDD prevention database for future reference
     */
    exportTDDPreventionDatabase(): string;
    /**
     * Get export statistics
     */
    getExportStats(): {
        export_directory: string;
        datasets_available: string[];
        neural_training_ready: boolean;
        claude_flow_compatible: boolean;
        tdd_improvement_factor: string;
        pattern_detection_accuracy_target: number;
    };
}
export declare const neuralTrainingExportSystem: NeuralTrainingExportSystem;
//# sourceMappingURL=neural-training-export-system.d.ts.map