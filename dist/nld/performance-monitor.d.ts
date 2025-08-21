/**
 * NLD Performance Monitor
 * Tracks and analyzes performance metrics for connection learning system
 */
import { EventEmitter } from 'events';
export interface PerformanceMetric {
    id: string;
    timestamp: number;
    type: 'connection' | 'learning' | 'neural' | 'system';
    category: string;
    value: number;
    metadata: any;
    tags: string[];
}
export interface PerformanceThreshold {
    metric: string;
    warning: number;
    critical: number;
    direction: 'above' | 'below';
}
export interface PerformanceAlert {
    id: string;
    timestamp: number;
    severity: 'warning' | 'critical';
    metric: string;
    current_value: number;
    threshold: number;
    message: string;
    recommendations: string[];
}
export interface PerformanceTrend {
    metric: string;
    direction: 'increasing' | 'decreasing' | 'stable';
    rate: number;
    confidence: number;
    prediction: number;
}
export interface PerformanceReport {
    timestamp: number;
    duration: number;
    summary: {
        total_metrics: number;
        alerts_generated: number;
        trends_identified: number;
        overall_health: number;
    };
    key_metrics: {
        [key: string]: number;
    };
    trends: PerformanceTrend[];
    alerts: PerformanceAlert[];
    recommendations: string[];
}
export declare class NLDPerformanceMonitor extends EventEmitter {
    private config;
    private metrics;
    private thresholds;
    private alerts;
    private isMonitoring;
    private monitoringInterval;
    private reportingInterval;
    constructor(config: {
        metricsRetentionMs: number;
        monitoringIntervalMs: number;
        reportingIntervalMs: number;
        alertingEnabled: boolean;
    });
    /**
     * Start performance monitoring
     */
    startMonitoring(): void;
    /**
     * Stop performance monitoring
     */
    stopMonitoring(): void;
    /**
     * Record a performance metric
     */
    recordMetric(type: 'connection' | 'learning' | 'neural' | 'system', category: string, value: number, metadata?: any, tags?: string[]): void;
    /**
     * Set performance threshold
     */
    setThreshold(metric: string, threshold: PerformanceThreshold): void;
    /**
     * Get current metrics for a category
     */
    getMetrics(type?: string, category?: string, timeRange?: number): PerformanceMetric[];
    /**
     * Get performance trends
     */
    getTrends(timeRange?: number): PerformanceTrend[];
    /**
     * Get active alerts
     */
    getActiveAlerts(): PerformanceAlert[];
    /**
     * Generate comprehensive performance report
     */
    generatePerformanceReport(duration?: number): PerformanceReport;
    /**
     * Get real-time dashboard data
     */
    getDashboardData(): any;
    private setupDefaultThresholds;
    private collectSystemMetrics;
    private analyzeThresholds;
    private checkThreshold;
    private cleanupOldMetrics;
    private getRecentMetrics;
    private calculateTrend;
    private calculateKeyMetrics;
    private calculateOverallHealth;
    private generateRecommendations;
    private getThresholdRecommendations;
    private calculateSuccessRate;
    private calculateLearningEfficiency;
    private getNeuralTrainingProgress;
    private calculateSystemHealth;
    private countMetricsByCategory;
    private generateMetricId;
    private generateAlertId;
}
//# sourceMappingURL=performance-monitor.d.ts.map