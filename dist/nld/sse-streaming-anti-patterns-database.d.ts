/**
 * Comprehensive SSE Streaming Anti-Patterns Database
 * Centralized database of all SSE streaming anti-patterns and their characteristics
 * Part of NLD (Neuro-Learning Development) system
 */
import { EventEmitter } from 'events';
import SSEBufferAccumulationDetector from './sse-buffer-accumulation-detector';
import SSEEventHandlerDuplicationAnalyzer from './sse-event-handler-duplication-analyzer';
import OutputBufferManagementFailurePatterns from './output-buffer-management-failure-patterns';
import FrontendMessageStateAccumulationDetector from './frontend-message-state-accumulation-detector';
interface AntiPatternDefinition {
    id: string;
    name: string;
    category: 'buffer_management' | 'event_handling' | 'frontend_state' | 'connection_management' | 'parser_corruption';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    technicalCause: string;
    manifestation: string[];
    detectionCriteria: {
        primaryIndicators: string[];
        secondaryIndicators: string[];
        thresholds: {
            [key: string]: number;
        };
    };
    preventionStrategies: {
        immediate: string[];
        longTerm: string[];
        testingApproach: string;
    };
    realWorldExamples: {
        scenario: string;
        frequency: 'rare' | 'occasional' | 'common' | 'frequent';
        impact: string;
        resolution: string;
    }[];
    relatedPatterns: string[];
    references: {
        documentation: string[];
        codeExamples: string[];
        testCases: string[];
    };
}
interface AntiPatternInstance {
    instanceId: string;
    antiPatternId: string;
    detectedAt: string;
    instanceData: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
    context: {
        environment: string;
        componentName?: string;
        instanceName?: string;
        userAction?: string;
    };
    resolution?: {
        method: string;
        timeToResolve: number;
        effectiveness: number;
        notes: string;
    };
}
interface DatabaseStatistics {
    totalAntiPatterns: number;
    totalInstances: number;
    severityBreakdown: {
        [key: string]: number;
    };
    categoryBreakdown: {
        [key: string]: number;
    };
    frequencyAnalysis: {
        [key: string]: number;
    };
    trendAnalysis: {
        increasingPatterns: string[];
        decreasingPatterns: string[];
        stablePatterns: string[];
    };
}
export declare class SSEStreamingAntiPatternsDatabase extends EventEmitter {
    private antiPatterns;
    private instances;
    private databaseDir;
    private bufferDetector?;
    private handlerAnalyzer?;
    private bufferFailureAnalyzer?;
    private frontendDetector?;
    private tddStrategies?;
    private neuralExporter?;
    constructor(databaseDir: string);
    /**
     * Initialize NLD analyzers
     */
    initializeAnalyzers(bufferDetector: SSEBufferAccumulationDetector, handlerAnalyzer: SSEEventHandlerDuplicationAnalyzer, bufferFailureAnalyzer: OutputBufferManagementFailurePatterns, frontendDetector: FrontendMessageStateAccumulationDetector): void;
    /**
     * Initialize comprehensive anti-pattern definitions
     */
    private initializeAntiPatternDefinitions;
    /**
     * Setup event listeners for real-time pattern detection
     */
    private setupPatternDetectionListeners;
    /**
     * Record a new anti-pattern instance
     */
    recordAntiPatternInstance(instance: AntiPatternInstance): void;
    /**
     * Get anti-pattern definition by ID
     */
    getAntiPattern(id: string): AntiPatternDefinition | undefined;
    /**
     * Get all anti-pattern definitions
     */
    getAllAntiPatterns(): AntiPatternDefinition[];
    /**
     * Get anti-patterns by category
     */
    getAntiPatternsByCategory(category: AntiPatternDefinition['category']): AntiPatternDefinition[];
    /**
     * Get anti-patterns by severity
     */
    getAntiPatternsBySeverity(severity: AntiPatternDefinition['severity']): AntiPatternDefinition[];
    /**
     * Get all recorded instances
     */
    getAllInstances(): AntiPatternInstance[];
    /**
     * Get instances by anti-pattern ID
     */
    getInstancesByAntiPattern(antiPatternId: string): AntiPatternInstance[];
    /**
     * Get database statistics
     */
    getDatabaseStatistics(): DatabaseStatistics;
    /**
     * Generate comprehensive anti-patterns report
     */
    generateComprehensiveReport(): string;
    /**
     * Export database in JSON format
     */
    exportDatabase(): {
        antiPatterns: AntiPatternDefinition[];
        instances: AntiPatternInstance[];
        statistics: DatabaseStatistics;
    };
    /**
     * Generate prevention checklist for development teams
     */
    generatePreventionChecklist(): {
        [category: string]: string[];
    };
    /**
     * Ensure database directory exists
     */
    private ensureDatabaseDirectory;
    /**
     * Load existing instances from storage
     */
    private loadExistingInstances;
    /**
     * Persist instances to storage
     */
    private persistInstances;
}
export default SSEStreamingAntiPatternsDatabase;
//# sourceMappingURL=sse-streaming-anti-patterns-database.d.ts.map