/**
 * Claude Output Parser Guardian - NLD Pattern Detection System
 * Prevents Claude output parsing failures and ANSI escape sequence issues
 */
export interface ClaudeOutputFailure {
    failureId: string;
    failureType: 'CLAUDE_OUTPUT_PARSING_FAILURE' | 'ANSI_ESCAPE_RENDERING' | 'BOX_DRAWING_DISPLAY' | 'MESSAGE_FORMAT_CORRUPTION';
    rawContent: string;
    expectedFormat: 'chat_bubble' | 'code_block' | 'terminal_output' | 'structured_data';
    detectedAt: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    parseAttempts: number;
    fallbackUsed: boolean;
    details: {
        ansiSequences: string[];
        boxDrawingChars: boolean;
        jsonParseError: boolean;
        unicodeIssues: boolean;
        lengthTruncation: boolean;
    };
}
export interface ParsingStrategy {
    strategyName: string;
    priority: number;
    pattern: RegExp;
    handler: (content: string) => string;
    fallback?: (content: string) => string;
}
declare class ClaudeOutputParserGuardian {
    private failureHistory;
    private parsingStrategies;
    private ansiEscapeRegex;
    private boxDrawingRegex;
    private codeBlockRegex;
    private terminalPromptRegex;
    private readonly MAX_PARSE_ATTEMPTS;
    private readonly TRUNCATION_THRESHOLD;
    constructor();
    /**
     * Initialize parsing strategies in priority order
     */
    private initializeParsingStrategies;
    /**
     * Main parsing function with failure detection and recovery
     */
    parseClaudeOutput(rawContent: string, expectedFormat?: 'chat_bubble' | 'code_block' | 'terminal_output' | 'structured_data'): {
        parsedContent: string;
        success: boolean;
        failureDetected: ClaudeOutputFailure | null;
        strategiesUsed: string[];
    };
    /**
     * Detect parsing issues in raw content
     */
    private detectParsingIssues;
    /**
     * Clean ANSI escape sequences
     */
    private cleanAnsiEscapes;
    /**
     * Preserve ANSI as readable text (fallback)
     */
    private preserveAnsiAsText;
    /**
     * Convert box drawing characters to Unicode equivalents
     */
    private convertBoxDrawing;
    /**
     * Replace box drawing with ASCII (fallback)
     */
    private replaceBoxDrawingWithAscii;
    /**
     * Format code blocks properly
     */
    private formatCodeBlocks;
    /**
     * Preserve code as plaintext (fallback)
     */
    private preserveCodeAsPlaintext;
    /**
     * Parse terminal output format
     */
    private parseTerminalOutput;
    /**
     * Wrap terminal output (fallback)
     */
    private wrapTerminalOutput;
    /**
     * Normalize Unicode characters
     */
    private normalizeUnicode;
    /**
     * Replace problematic Unicode with safe alternatives
     */
    private replaceUnicodeWithSafe;
    /**
     * Validate parsed output
     */
    private validateParsedOutput;
    /**
     * Create failure record
     */
    private createFailureRecord;
    /**
     * Calculate failure severity
     */
    private calculateSeverity;
    /**
     * Determine failure type based on details
     */
    private determineFailureType;
    /**
     * Record failure for neural training
     */
    private recordFailure;
    /**
     * Apply emergency fallback parsing
     */
    private applyEmergencyFallback;
    /**
     * Export neural training data
     */
    private exportNeuralTrainingData;
    /**
     * Calculate recent failure rate
     */
    private calculateRecentFailureRate;
    /**
     * Get parsing statistics
     */
    getParsingStatistics(): {
        totalFailures: number;
        failuresByType: Record<string, number>;
        averageSeverity: string;
        recentFailureRate: number;
    };
    /**
     * Clear failure history
     */
    clearHistory(): void;
}
export default ClaudeOutputParserGuardian;
//# sourceMappingURL=claude-output-parser-guardian.d.ts.map