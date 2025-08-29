/**
 * Component State Desync Detector
 * Monitors React component state consistency during UI modernization
 */
import { EventEmitter } from 'events';
export interface ComponentState {
    componentId: string;
    componentName: string;
    state: Record<string, any>;
    props: Record<string, any>;
    lastUpdate: number;
    renderCount: number;
    errorCount: number;
}
export interface StateDesyncEvent {
    type: 'state_mismatch' | 'props_mismatch' | 'render_error' | 'lifecycle_error' | 'hook_error';
    componentId: string;
    componentName: string;
    timestamp: number;
    details: {
        expected?: any;
        actual?: any;
        error?: string;
        phase?: string;
    };
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
export interface HookUsage {
    hookName: string;
    componentId: string;
    callOrder: number;
    dependencies: any[];
    lastResult: any;
    errorCount: number;
}
export declare class ComponentStateTracker extends EventEmitter {
    private componentStates;
    private stateHistory;
    private desyncEvents;
    private hookUsages;
    private renderCycles;
    private reactDevToolsHook;
    private mutationObserver;
    constructor();
    private initializeReactMonitoring;
    private setupReactDevToolsMonitoring;
    private setupAlternativeReactMonitoring;
    private setupDOMMonitoring;
    private startStateConsistencyChecks;
    private analyzeRenderCommit;
    private walkFiberTree;
    private extractComponentInfo;
    private getComponentName;
    private generateComponentId;
    private extractState;
    private extractProps;
    private incrementRenderCount;
    private trackComponentState;
    private compareStates;
    private detectStateChanges;
    private isUnexpectedStateChange;
    private isCriticalStateChange;
    private deepEqual;
    private runStateConsistencyCheck;
    private checkHookRuleViolations;
    private arraysEqual;
    private findReactKey;
    private checkForUnexpectedUnmount;
    private validateComponentStateConsistency;
    private recordDesyncEvent;
    private attemptStateRecovery;
    getComponentStates(): Map<string, ComponentState>;
    getDesyncEvents(count?: number): StateDesyncEvent[];
    generateStateHealthReport(): string;
    private generateStateSyncRecommendations;
    destroy(): void;
}
export declare const componentStateTracker: ComponentStateTracker;
//# sourceMappingURL=component-state-tracker.d.ts.map