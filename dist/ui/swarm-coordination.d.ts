/**
 * Adaptive Swarm Coordination System for UI Modernization
 * Intelligent orchestration of UI development agents with regression protection
 */
export interface SwarmAgent {
    id: string;
    type: AgentType;
    role: string;
    capabilities: string[];
    status: 'idle' | 'active' | 'busy' | 'error';
    specialization: ComponentType;
}
export type AgentType = 'ui-component-specialist' | 'styling-integration-specialist' | 'chat-interface-specialist' | 'testing-validation-specialist' | 'performance-optimization-specialist';
export type ComponentType = 'button' | 'message-list' | 'message-input' | 'chat-interface' | 'styling' | 'testing' | 'performance';
export interface UIModernizationTask {
    id: string;
    component: ComponentType;
    priority: 'high' | 'medium' | 'low';
    dependencies: string[];
    requirements: {
        claudablePatterns: boolean;
        regressionSafety: boolean;
        performanceOptimized: boolean;
        accessibilityCompliant: boolean;
    };
}
export interface SwarmCoordinator {
    topology: 'adaptive' | 'hierarchical' | 'mesh';
    agents: SwarmAgent[];
    tasks: UIModernizationTask[];
    spawnAgent(type: AgentType, role: string, capabilities: string[]): Promise<SwarmAgent>;
    assignTask(agentId: string, task: UIModernizationTask): Promise<void>;
    coordinateParallelDevelopment(tasks: UIModernizationTask[]): Promise<void>;
    adaptTopology(workloadPattern: string): void;
    resolveConflicts(conflicts: ComponentConflict[]): Promise<void>;
    validateRegressionSafety(component: string): Promise<boolean>;
    trackAgentPerformance(agentId: string, metrics: PerformanceMetrics): void;
    optimizeTaskAllocation(): void;
}
export interface ComponentConflict {
    component: string;
    conflictType: 'styling' | 'functionality' | 'integration';
    agents: string[];
    resolution: 'merge' | 'priority' | 'redesign';
}
export interface PerformanceMetrics {
    taskCompletionTime: number;
    codeQualityScore: number;
    regressionTestsPassed: number;
    userExperienceScore: number;
}
export declare const CLAUDABLE_PATTERNS: {
    colors: {
        primary: string;
        secondary: string;
        error: string;
        background: string;
    };
    spacing: {
        container: string;
        component: string;
        group: string;
    };
    typography: {
        primary: string;
        secondary: string;
        emphasis: string;
    };
    interactivity: {
        button: string;
        input: string;
        disabled: string;
    };
    layout: {
        flex: string;
        grid: string;
        responsive: string;
    };
    animations: {
        smooth: string;
        bounce: string;
        fade: string;
    };
};
export declare const SWARM_CONFIG: {
    maxAgents: number;
    topology: "adaptive";
    agentAllocation: {
        'ui-component-specialist': number;
        'styling-integration-specialist': number;
        'chat-interface-specialist': number;
        'testing-validation-specialist': number;
        'performance-optimization-specialist': number;
    };
    taskPriorities: {
        'regression-safety': string;
        'claudable-styling': string;
        'performance-optimization': string;
        'accessibility-compliance': string;
        'modern-interactions': string;
    };
    coordinationProtocols: {
        conflictResolution: string;
        dependencyManagement: string;
        qualityAssurance: string;
        regressionTesting: string;
    };
};
/**
 * Adaptive UI Modernization Swarm Coordinator
 * Orchestrates parallel UI development with intelligent conflict resolution
 */
export declare class AdaptiveUISwarmCoordinator implements SwarmCoordinator {
    topology: 'adaptive' | 'hierarchical' | 'mesh';
    agents: SwarmAgent[];
    tasks: UIModernizationTask[];
    private performanceMetrics;
    private conflictHistory;
    spawnAgent(type: AgentType, role: string, capabilities: string[]): Promise<SwarmAgent>;
    assignTask(agentId: string, task: UIModernizationTask): Promise<void>;
    coordinateParallelDevelopment(tasks: UIModernizationTask[]): Promise<void>;
    adaptTopology(workloadPattern: string): void;
    resolveConflicts(conflicts: ComponentConflict[]): Promise<void>;
    validateRegressionSafety(component: string): Promise<boolean>;
    trackAgentPerformance(agentId: string, metrics: PerformanceMetrics): void;
    optimizeTaskAllocation(): void;
    private mapRoleToComponent;
    private sortTasksByPriority;
    private optimizeTaskAllocationInternal;
    private executeTask;
    private mergeConflictingChanges;
    private applyPriorityResolution;
    private triggerRedesign;
    private runRegressionTests;
    private checkPerformanceRegression;
    private validateFunctionality;
}
export declare const uiSwarmCoordinator: AdaptiveUISwarmCoordinator;
//# sourceMappingURL=swarm-coordination.d.ts.map