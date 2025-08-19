"use strict";
/**
 * Comprehensive Metrics Collector for Production Monitoring
 * Real-time system metrics collection with Prometheus integration
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = void 0;
const events_1 = require("events");
const client = __importStar(require("prom-client"));
class MetricsCollector extends events_1.EventEmitter {
    collectInterval = null;
    metrics = new Map();
    thresholds = new Map();
    prometheusRegistry;
    isCollecting = false;
    // Prometheus metrics
    cpuUsageGauge;
    memoryUsageGauge;
    networkIOGauge;
    diskIOGauge;
    applicationMetricsGauge;
    requestDurationHistogram;
    errorCounter;
    constructor() {
        super();
        this.prometheusRegistry = new client.Registry();
        this.setupPrometheusMetrics();
        this.setupDefaultThresholds();
    }
    setupPrometheusMetrics() {
        // CPU metrics
        this.cpuUsageGauge = new client.Gauge({
            name: 'system_cpu_usage_percent',
            help: 'CPU usage percentage',
            labelNames: ['type'],
            registers: [this.prometheusRegistry]
        });
        // Memory metrics
        this.memoryUsageGauge = new client.Gauge({
            name: 'system_memory_bytes',
            help: 'Memory usage in bytes',
            labelNames: ['type'],
            registers: [this.prometheusRegistry]
        });
        // Network I/O metrics
        this.networkIOGauge = new client.Gauge({
            name: 'system_network_bytes_total',
            help: 'Network I/O in bytes',
            labelNames: ['direction'],
            registers: [this.prometheusRegistry]
        });
        // Disk I/O metrics
        this.diskIOGauge = new client.Gauge({
            name: 'system_disk_operations_total',
            help: 'Disk operations',
            labelNames: ['type'],
            registers: [this.prometheusRegistry]
        });
        // Application metrics
        this.applicationMetricsGauge = new client.Gauge({
            name: 'application_metrics',
            help: 'Application performance metrics',
            labelNames: ['metric'],
            registers: [this.prometheusRegistry]
        });
        // Request duration histogram
        this.requestDurationHistogram = new client.Histogram({
            name: 'http_request_duration_seconds',
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [0.1, 0.5, 1, 2, 5, 10],
            registers: [this.prometheusRegistry]
        });
        // Error counter
        this.errorCounter = new client.Counter({
            name: 'application_errors_total',
            help: 'Total number of application errors',
            labelNames: ['type', 'severity'],
            registers: [this.prometheusRegistry]
        });
        // Register default Node.js metrics
        client.collectDefaultMetrics({ register: this.prometheusRegistry });
    }
    setupDefaultThresholds() {
        const defaultThresholds = [
            {
                name: 'cpu_usage_high',
                value: 80,
                operator: 'gt',
                severity: 'high',
                description: 'CPU usage above 80%'
            },
            {
                name: 'cpu_usage_critical',
                value: 95,
                operator: 'gt',
                severity: 'critical',
                description: 'CPU usage above 95%'
            },
            {
                name: 'memory_usage_high',
                value: 80,
                operator: 'gt',
                severity: 'high',
                description: 'Memory usage above 80%'
            },
            {
                name: 'memory_usage_critical',
                value: 95,
                operator: 'gt',
                severity: 'critical',
                description: 'Memory usage above 95%'
            },
            {
                name: 'error_rate_high',
                value: 5,
                operator: 'gt',
                severity: 'high',
                description: 'Error rate above 5%'
            },
            {
                name: 'response_time_high',
                value: 2000,
                operator: 'gt',
                severity: 'medium',
                description: 'Response time above 2 seconds'
            }
        ];
        defaultThresholds.forEach(threshold => {
            this.thresholds.set(threshold.name, threshold);
        });
    }
    async startCollection(intervalMs = 5000) {
        if (this.isCollecting) {
            console.log('Metrics collection already started');
            return;
        }
        this.isCollecting = true;
        console.log(`Starting metrics collection with ${intervalMs}ms interval`);
        this.collectInterval = setInterval(async () => {
            try {
                const metrics = await this.collectSystemMetrics();
                this.updatePrometheusMetrics(metrics);
                this.checkThresholds(metrics);
                this.emit('metrics', metrics);
            }
            catch (error) {
                console.error('Error collecting metrics:', error);
                this.emit('error', error);
            }
        }, intervalMs);
        // Initial collection
        try {
            const initialMetrics = await this.collectSystemMetrics();
            this.updatePrometheusMetrics(initialMetrics);
            this.emit('metrics', initialMetrics);
        }
        catch (error) {
            console.error('Error in initial metrics collection:', error);
        }
    }
    stopCollection() {
        if (this.collectInterval) {
            clearInterval(this.collectInterval);
            this.collectInterval = null;
        }
        this.isCollecting = false;
        console.log('Metrics collection stopped');
    }
    async collectSystemMetrics() {
        const timestamp = Date.now();
        return {
            timestamp,
            cpu: await this.collectCPUMetrics(),
            memory: await this.collectMemoryMetrics(),
            network: await this.collectNetworkMetrics(),
            disk: await this.collectDiskMetrics(),
            application: await this.collectApplicationMetrics()
        };
    }
    async collectCPUMetrics() {
        const cpus = require('os').cpus();
        const loadAvg = require('os').loadavg();
        // Calculate CPU usage
        let totalIdle = 0;
        let totalTick = 0;
        cpus.forEach((cpu) => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });
        const idle = totalIdle / cpus.length;
        const total = totalTick / cpus.length;
        const usage = 100 - ~~(100 * idle / total);
        return {
            usage,
            cores: cpus.length,
            loadAverage: loadAvg
        };
    }
    async collectMemoryMetrics() {
        const os = require('os');
        const process = require('process');
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsage = process.memoryUsage();
        return {
            total: totalMemory,
            used: usedMemory,
            free: freeMemory,
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal
        };
    }
    async collectNetworkMetrics() {
        // In a real implementation, you would use system APIs or libraries
        // For demonstration, returning mock data
        return {
            bytesIn: Math.floor(Math.random() * 1000000),
            bytesOut: Math.floor(Math.random() * 1000000),
            packetsIn: Math.floor(Math.random() * 10000),
            packetsOut: Math.floor(Math.random() * 10000),
            connections: Math.floor(Math.random() * 100)
        };
    }
    async collectDiskMetrics() {
        // In a real implementation, you would use system APIs or libraries
        // For demonstration, returning mock data
        return {
            usage: Math.floor(Math.random() * 100),
            readOps: Math.floor(Math.random() * 1000),
            writeOps: Math.floor(Math.random() * 1000),
            readBytes: Math.floor(Math.random() * 1000000),
            writeBytes: Math.floor(Math.random() * 1000000)
        };
    }
    async collectApplicationMetrics() {
        // In a real implementation, these would come from your application
        return {
            requestsPerSecond: Math.floor(Math.random() * 1000),
            responseTime: Math.floor(Math.random() * 1000),
            errorRate: Math.random() * 10,
            activeUsers: Math.floor(Math.random() * 10000),
            queueLength: Math.floor(Math.random() * 100)
        };
    }
    updatePrometheusMetrics(metrics) {
        // Update CPU metrics
        this.cpuUsageGauge.labels('total').set(metrics.cpu.usage);
        this.cpuUsageGauge.labels('cores').set(metrics.cpu.cores);
        // Update memory metrics
        this.memoryUsageGauge.labels('total').set(metrics.memory.total);
        this.memoryUsageGauge.labels('used').set(metrics.memory.used);
        this.memoryUsageGauge.labels('free').set(metrics.memory.free);
        this.memoryUsageGauge.labels('heap_used').set(metrics.memory.heapUsed);
        // Update network metrics
        this.networkIOGauge.labels('in').set(metrics.network.bytesIn);
        this.networkIOGauge.labels('out').set(metrics.network.bytesOut);
        // Update disk metrics
        this.diskIOGauge.labels('read').set(metrics.disk.readOps);
        this.diskIOGauge.labels('write').set(metrics.disk.writeOps);
        // Update application metrics
        this.applicationMetricsGauge.labels('requests_per_second').set(metrics.application.requestsPerSecond);
        this.applicationMetricsGauge.labels('response_time').set(metrics.application.responseTime);
        this.applicationMetricsGauge.labels('error_rate').set(metrics.application.errorRate);
        this.applicationMetricsGauge.labels('active_users').set(metrics.application.activeUsers);
    }
    checkThresholds(metrics) {
        const alerts = [];
        // Check CPU thresholds
        for (const [name, threshold] of this.thresholds) {
            if (name.includes('cpu_usage')) {
                if (this.evaluateThreshold(metrics.cpu.usage, threshold)) {
                    alerts.push({ threshold, value: metrics.cpu.usage });
                }
            }
        }
        // Check memory thresholds
        const memoryUsagePercent = (metrics.memory.used / metrics.memory.total) * 100;
        for (const [name, threshold] of this.thresholds) {
            if (name.includes('memory_usage')) {
                if (this.evaluateThreshold(memoryUsagePercent, threshold)) {
                    alerts.push({ threshold, value: memoryUsagePercent });
                }
            }
        }
        // Check application thresholds
        for (const [name, threshold] of this.thresholds) {
            if (name.includes('error_rate')) {
                if (this.evaluateThreshold(metrics.application.errorRate, threshold)) {
                    alerts.push({ threshold, value: metrics.application.errorRate });
                }
            }
            if (name.includes('response_time')) {
                if (this.evaluateThreshold(metrics.application.responseTime, threshold)) {
                    alerts.push({ threshold, value: metrics.application.responseTime });
                }
            }
        }
        // Emit alerts
        if (alerts.length > 0) {
            this.emit('alert', alerts);
        }
    }
    evaluateThreshold(value, threshold) {
        switch (threshold.operator) {
            case 'gt': return value > threshold.value;
            case 'lt': return value < threshold.value;
            case 'gte': return value >= threshold.value;
            case 'lte': return value <= threshold.value;
            case 'eq': return value === threshold.value;
            default: return false;
        }
    }
    addThreshold(threshold) {
        this.thresholds.set(threshold.name, threshold);
        console.log(`Added threshold: ${threshold.name}`);
    }
    removeThreshold(name) {
        return this.thresholds.delete(name);
    }
    getMetrics() {
        return this.prometheusRegistry.metrics();
    }
    recordRequest(method, route, statusCode, duration) {
        this.requestDurationHistogram.labels(method, route, statusCode.toString()).observe(duration);
    }
    recordError(type, severity) {
        this.errorCounter.labels(type, severity).inc();
    }
    getRegistry() {
        return this.prometheusRegistry;
    }
    isActive() {
        return this.isCollecting;
    }
    getThresholds() {
        return new Map(this.thresholds);
    }
}
exports.MetricsCollector = MetricsCollector;
exports.default = MetricsCollector;
//# sourceMappingURL=metrics-collector.js.map