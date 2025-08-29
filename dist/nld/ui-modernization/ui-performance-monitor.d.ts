/**
 * UI Performance Monitor
 * Detects performance degradation during UI modernization
 */
import { EventEmitter } from 'events';
export interface PerformanceMetrics {
    renderTime: number;
    paintTime: number;
    layoutTime: number;
    memoryUsage: number;
    cpuUsage: number;
    fps: number;
    interactionDelay: number;
    bundleSize: number;
}
export interface PerformanceEvent {
    type: 'render_slow' | 'memory_leak' | 'layout_thrash' | 'interaction_lag' | 'fps_drop' | 'bundle_bloat';
    timestamp: number;
    metrics: Partial<PerformanceMetrics>;
    component?: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    userImpact: string;
}
export interface PerformanceBudget {
    maxRenderTime: number;
    maxMemoryUsage: number;
    minFPS: number;
    maxInteractionDelay: number;
    maxBundleSize: number;
}
export declare class UIPerformanceMonitor extends EventEmitter {
    private performanceEvents;
    private performanceObserver;
    private memoryObserver;
    private fpsMonitor;
    private interactionMonitor;
    private currentMetrics;
    private performanceBudget;
    private baselineMetrics;
    constructor(budget?: Partial<PerformanceBudget>);
    private initializePerformanceMonitoring;
    private setupPerformanceObserver;
    private setupMemoryMonitoring;
    private setupFPSMonitoring;
    private setupInteractionMonitoring;
    private captureBaselineMetrics;
    private processPerformanceEntry;
    private processMeasureEntry;
    private processNavigationEntry;
    private processPaintEntry;
    private processLayoutShiftEntry;
    private processLCPEntry;
    private extractComponentFromMeasureName;
    private getComponentName;
    private recordPerformanceEvent;
    private attemptPerformanceOptimization;
    private optimizeMemoryUsage;
    private optimizeRenderPerformance;
    private optimizeFPS;
    private optimizeInteractions;
    private optimizeLayout;
    getCurrentMetrics(): PerformanceMetrics;
    getBaselineMetrics(): PerformanceMetrics | null;
    getPerformanceEvents(count?: number): PerformanceEvent[];
    getPerformanceDegradation(): Partial<PerformanceMetrics> | null;
    generatePerformanceReport(): string;
    private generateOptimizationRecommendations;
    destroy(): void;
}
export declare const uiPerformanceMonitor: UIPerformanceMonitor;
//# sourceMappingURL=ui-performance-monitor.d.ts.map