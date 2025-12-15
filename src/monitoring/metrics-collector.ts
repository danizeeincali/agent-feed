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

export class MetricsCollector extends EventEmitter {
  private collectInterval: NodeJS.Timeout | null = null;
  private metrics: Map<string, any> = new Map();
  private thresholds: Map<string, MetricThreshold> = new Map();
  private prometheusRegistry: client.Registry;
  private isCollecting = false;

  // Prometheus metrics
  private cpuUsageGauge: client.Gauge<string>;
  private memoryUsageGauge: client.Gauge<string>;
  private networkIOGauge: client.Gauge<string>;
  private diskIOGauge: client.Gauge<string>;
  private applicationMetricsGauge: client.Gauge<string>;
  private requestDurationHistogram: client.Histogram<string>;
  private errorCounter: client.Counter<string>;

  constructor() {
    super();
    this.prometheusRegistry = new client.Registry();
    this.setupPrometheusMetrics();
    this.setupDefaultThresholds();
  }

  private setupPrometheusMetrics(): void {
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

  private setupDefaultThresholds(): void {
    const defaultThresholds: MetricThreshold[] = [
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

  public async startCollection(intervalMs: number = 5000): Promise<void> {
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
      } catch (error) {
        console.error('Error collecting metrics:', error);
        this.emit('error', error);
      }
    }, intervalMs);

    // Initial collection
    try {
      const initialMetrics = await this.collectSystemMetrics();
      this.updatePrometheusMetrics(initialMetrics);
      this.emit('metrics', initialMetrics);
    } catch (error) {
      console.error('Error in initial metrics collection:', error);
    }
  }

  public stopCollection(): void {
    if (this.collectInterval) {
      clearInterval(this.collectInterval);
      this.collectInterval = null;
    }
    this.isCollecting = false;
    console.log('Metrics collection stopped');
  }

  public async collectSystemMetrics(): Promise<SystemMetrics> {
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

  private async collectCPUMetrics(): Promise<SystemMetrics['cpu']> {
    const cpus = require('os').cpus();
    const loadAvg = require('os').loadavg();
    
    // Calculate CPU usage
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu: any) => {
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

  private async collectMemoryMetrics(): Promise<SystemMetrics['memory']> {
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

  private async collectNetworkMetrics(): Promise<SystemMetrics['network']> {
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

  private async collectDiskMetrics(): Promise<SystemMetrics['disk']> {
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

  private async collectApplicationMetrics(): Promise<SystemMetrics['application']> {
    // In a real implementation, these would come from your application
    return {
      requestsPerSecond: Math.floor(Math.random() * 1000),
      responseTime: Math.floor(Math.random() * 1000),
      errorRate: Math.random() * 10,
      activeUsers: Math.floor(Math.random() * 10000),
      queueLength: Math.floor(Math.random() * 100)
    };
  }

  private updatePrometheusMetrics(metrics: SystemMetrics): void {
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

  private checkThresholds(metrics: SystemMetrics): void {
    const alerts: Array<{threshold: MetricThreshold, value: number}> = [];

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

  private evaluateThreshold(value: number, threshold: MetricThreshold): boolean {
    switch (threshold.operator) {
      case 'gt': return value > threshold.value;
      case 'lt': return value < threshold.value;
      case 'gte': return value >= threshold.value;
      case 'lte': return value <= threshold.value;
      case 'eq': return value === threshold.value;
      default: return false;
    }
  }

  public addThreshold(threshold: MetricThreshold): void {
    this.thresholds.set(threshold.name, threshold);
    console.log(`Added threshold: ${threshold.name}`);
  }

  public removeThreshold(name: string): boolean {
    return this.thresholds.delete(name);
  }

  public getMetrics(): string {
    return this.prometheusRegistry.metrics();
  }

  public recordRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.requestDurationHistogram.labels(method, route, statusCode.toString()).observe(duration);
  }

  public recordError(type: string, severity: string): void {
    this.errorCounter.labels(type, severity).inc();
  }

  public getRegistry(): client.Registry {
    return this.prometheusRegistry;
  }

  public isActive(): boolean {
    return this.isCollecting;
  }

  public getThresholds(): Map<string, MetricThreshold> {
    return new Map(this.thresholds);
  }
}

export default MetricsCollector;