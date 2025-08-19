/**
 * Comprehensive Metrics Collector for Production Monitoring
 * Real-time system metrics collection with Prometheus integration
 */
import { EventEmitter } from 'events';
import * as client from 'prom-client';
export interface SystemMetrics {
    timestamp: number;
    cpu: {
        usage: number;
        cores: number;
        loadAverage: number[];
    };
    memory: {
        total: number;
        used: number;
        free: number;
        heapUsed: number;
        heapTotal: number;
    };
    network: {
        bytesIn: number;
        bytesOut: number;
        packetsIn: number;
        packetsOut: number;
        connections: number;
    };
    disk: {
        usage: number;
        readOps: number;
        writeOps: number;
        readBytes: number;
        writeBytes: number;
    };
    application: {
        requestsPerSecond: number;
        responseTime: number;
        errorRate: number;
        activeUsers: number;
        queueLength: number;
    };
}
export interface MetricThreshold {
    name: string;
    value: number;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
}
export declare class MetricsCollector extends EventEmitter {
    private collectInterval;
    private metrics;
    private thresholds;
    private prometheusRegistry;
    private isCollecting;
    private cpuUsageGauge;
    private memoryUsageGauge;
    private networkIOGauge;
    private diskIOGauge;
    private applicationMetricsGauge;
    private requestDurationHistogram;
    private errorCounter;
    constructor();
    private setupPrometheusMetrics;
    private setupDefaultThresholds;
    startCollection(intervalMs?: number): Promise<void>;
    stopCollection(): void;
    collectSystemMetrics(): Promise<SystemMetrics>;
    private collectCPUMetrics;
    private collectMemoryMetrics;
    private collectNetworkMetrics;
    private collectDiskMetrics;
    private collectApplicationMetrics;
    private updatePrometheusMetrics;
    private checkThresholds;
    private evaluateThreshold;
    addThreshold(threshold: MetricThreshold): void;
    removeThreshold(name: string): boolean;
    getMetrics(): string;
    recordRequest(method: string, route: string, statusCode: number, duration: number): void;
    recordError(type: string, severity: string): void;
    getRegistry(): client.Registry;
    isActive(): boolean;
    getThresholds(): Map<string, MetricThreshold>;
}
export default MetricsCollector;
//# sourceMappingURL=metrics-collector.d.ts.map