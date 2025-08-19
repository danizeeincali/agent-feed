/**
 * Advanced Performance Analyzer with Real-time Optimization
 * Bottleneck detection, trend analysis, and performance optimization
 */
import { EventEmitter } from 'events';
import { SystemMetrics } from './metrics-collector';
export interface PerformanceBottleneck {
    id: string;
    type: 'cpu' | 'memory' | 'network' | 'disk' | 'application';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    impact: number;
    recommendation: string;
    autoFixAvailable: boolean;
    detectedAt: number;
    persistentFor: number;
}
export interface PerformanceTrend {
    metric: string;
    direction: 'improving' | 'degrading' | 'stable';
    rate: number;
    confidence: number;
    prediction: {
        nextHour: number;
        nextDay: number;
        trend: 'up' | 'down' | 'stable';
    };
}
export interface OptimizationRecommendation {
    id: string;
    type: 'scaling' | 'configuration' | 'resource' | 'application';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    description: string;
    expectedImpact: string;
    implementation: {
        automatic: boolean;
        steps: string[];
        estimatedTime: number;
        rollbackPlan: string[];
    };
    cost: {
        computational: number;
        financial: number;
        risk: number;
    };
}
export declare class PerformanceAnalyzer extends EventEmitter {
    private metricsHistory;
    private bottlenecks;
    private trends;
    private optimizations;
    private analysisInterval;
    private isAnalyzing;
    private readonly maxHistorySize;
    private readonly trendWindow;
    constructor();
    startAnalysis(intervalMs?: number): void;
    stopAnalysis(): void;
    addMetrics(metrics: SystemMetrics): void;
    private performAnalysis;
    private detectBottlenecks;
    private detectCPUBottleneck;
    private detectMemoryBottleneck;
    private detectNetworkBottleneck;
    private detectDiskBottleneck;
    private detectApplicationBottleneck;
    private analyzeTrends;
    private analyzeCPUTrend;
    private analyzeMemoryTrend;
    private analyzeApplicationTrend;
    private calculateDetailedTrend;
    private generateOptimizations;
    private createOptimizationForBottleneck;
    private createProactiveOptimization;
    private calculateTrend;
    private calculateMemoryGrowthRate;
    private calculatePersistence;
    getBottlenecks(): PerformanceBottleneck[];
    getTrends(): PerformanceTrend[];
    getOptimizations(): OptimizationRecommendation[];
    getMetricsHistory(): SystemMetrics[];
    clearHistory(): void;
    isActive(): boolean;
}
export default PerformanceAnalyzer;
//# sourceMappingURL=performance-analyzer.d.ts.map