/**
 * React Component Refactoring Anti-Patterns Database
 * Captures and analyzes common anti-patterns during SSE to WebSocket refactoring
 */
interface ReactRefactoringAntiPattern {
    id: string;
    name: string;
    description: string;
    component: string;
    antiPatternCode: string;
    correctCode: string;
    symptoms: string[];
    causes: string[];
    consequences: string[];
    detectionRules: string[];
    prevention: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    frequency: number;
    category: 'hooks' | 'lifecycle' | 'state' | 'props' | 'effects' | 'handlers' | 'refs';
    refactoringContext: {
        from: 'SSE' | 'EventSource' | 'HTTP';
        to: 'WebSocket' | 'SSE' | 'HTTP';
        migration: string;
        phase: string;
    };
    realWorldExample: {
        project: string;
        file: string;
        lineRange: string;
        impact: string;
    };
    metadata: {
        firstDetected: string;
        lastSeen: string;
        affectedComponents: string[];
        relatedPatterns: string[];
    };
}
export declare class ReactRefactoringAntiPatternsDatabase {
    private patterns;
    private readonly dataDir;
    private readonly patternsFile;
    constructor();
    private ensureDataDirectory;
    private initializeDatabase;
    private initializeDefaultPatterns;
    addPattern(pattern: Omit<ReactRefactoringAntiPattern, 'id' | 'metadata'>): void;
    updatePatternFrequency(patternId: string): void;
    getPatternsByCategory(category: ReactRefactoringAntiPattern['category']): ReactRefactoringAntiPattern[];
    getPatternsBySeverity(severity: ReactRefactoringAntiPattern['severity']): ReactRefactoringAntiPattern[];
    getPatternsByComponent(component: string): ReactRefactoringAntiPattern[];
    getFrequentPatterns(minFrequency?: number): ReactRefactoringAntiPattern[];
    searchPatterns(query: string): ReactRefactoringAntiPattern[];
    exportToNeuralTraining(): string;
    generateAntiPatternsReport(): string;
    private getPatternSummary;
    private groupBy;
    private analyzeMigrationRisks;
    private generateRecommendations;
    private compileDetectionRules;
    private persistPatterns;
    getAllPatterns(): ReactRefactoringAntiPattern[];
}
export {};
//# sourceMappingURL=react-component-refactoring-anti-patterns-database.d.ts.map