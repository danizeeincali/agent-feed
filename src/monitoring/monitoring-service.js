const os = require('os');
const fs = require('fs');
const { execSync } = require('child_process');

class MonitoringService {
  constructor(options = {}) {
    this.db = options.db;
    this.collectInterval = options.collectInterval || 10000; // 10 seconds default
    this.maxHistoryPoints = options.maxHistoryPoints || 100;

    this.metrics = {
      timestamp: Date.now(),
      system: {},
      database: {},
      api: {
        totalRequests: 0,
        requestsPerSecond: 0,
        errors: 0,
        errorRate: 0,
        endpoints: {},
        statusCodes: {},
        responseTimePercentiles: {}
      },
      business: {
        activeAgents: 0,
        totalPosts: 0,
        custom: {}
      }
    };

    this.history = [];
    this.intervalId = null;
    this.startTime = Date.now();
    this.lastCpuUsage = process.cpuUsage();
    this.lastCheckTime = Date.now();

    // API tracking
    this.requests = [];
    this.requestWindow = 60000; // 1 minute window
  }

  start() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.collectMetrics().catch(err => {
        console.error('Error collecting metrics:', err);
      });
    }, this.collectInterval);

    // Initial collection
    this.collectMetrics().catch(err => {
      console.error('Error in initial metrics collection:', err);
    });
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async collectMetrics() {
    const timestamp = Date.now();

    // Collect system metrics
    this.metrics.system = await this.collectSystemMetrics();

    // Collect database metrics
    this.metrics.database = await this.collectDatabaseMetrics();

    // Update API metrics
    this.updateApiMetrics();

    // Collect business metrics
    this.metrics.business = await this.collectBusinessMetrics();

    this.metrics.timestamp = timestamp;

    // Store in history
    this.history.push({
      timestamp,
      cpu: this.metrics.system.cpu.usage,
      memory: this.metrics.system.memory.usedPercentage,
      disk: this.metrics.system.disk.usedPercentage,
      requests: this.metrics.api.totalRequests,
      errors: this.metrics.api.errors
    });

    // Limit history size
    if (this.history.length > this.maxHistoryPoints) {
      this.history.shift();
    }

    return this.metrics;
  }

  async collectSystemMetrics() {
    const cpuUsage = this.calculateCpuUsage();
    const memoryUsage = this.calculateMemoryUsage();
    const diskUsage = this.calculateDiskUsage();
    const processMetrics = this.getProcessMetrics();

    return {
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      memory: memoryUsage,
      disk: diskUsage,
      process: processMetrics,
      platform: os.platform(),
      hostname: os.hostname(),
      uptime: os.uptime()
    };
  }

  calculateCpuUsage() {
    const currentUsage = process.cpuUsage(this.lastCpuUsage);
    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastCheckTime;

    // Calculate CPU percentage
    const totalUsage = (currentUsage.user + currentUsage.system) / 1000; // Convert to ms
    const percentage = (totalUsage / timeDiff) * 100;

    this.lastCpuUsage = process.cpuUsage();
    this.lastCheckTime = currentTime;

    return Math.min(Math.max(percentage, 0), 100);
  }

  calculateMemoryUsage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      usedPercentage: (usedMemory / totalMemory) * 100
    };
  }

  calculateDiskUsage() {
    try {
      // Try to get disk usage for the current directory
      const df = execSync('df -k .').toString();
      const lines = df.split('\n');
      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/);
        const total = parseInt(parts[1]) * 1024; // Convert KB to bytes
        const used = parseInt(parts[2]) * 1024;
        const available = parseInt(parts[3]) * 1024;

        return {
          total,
          used,
          free: available,
          usedPercentage: (used / total) * 100
        };
      }
    } catch (error) {
      // Fallback if df command fails
    }

    // Default fallback
    return {
      total: 0,
      used: 0,
      free: 0,
      usedPercentage: 0
    };
  }

  getProcessMetrics() {
    const memUsage = process.memoryUsage();

    return {
      uptime: process.uptime(),
      memoryUsage: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      },
      pid: process.pid
    };
  }

  async collectDatabaseMetrics() {
    if (!this.db) {
      return {
        connected: false
      };
    }

    try {
      const isOpen = this.db.open;
      const isReadOnly = this.db.readonly;

      // Get table counts
      const tables = {};
      try {
        const tableNames = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();

        for (const { name } of tableNames) {
          try {
            const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${name}`).get();
            tables[name] = result.count;
          } catch (err) {
            tables[name] = 0;
          }
        }
      } catch (err) {
        // Ignore table query errors
      }

      // Basic query performance metrics
      const startTime = Date.now();
      try {
        this.db.prepare('SELECT 1').get();
      } catch (err) {
        // Ignore
      }
      const queryTime = Date.now() - startTime;

      return {
        connected: isOpen,
        readOnly: isReadOnly,
        tables,
        queryCount: 0, // Would need instrumentation
        avgQueryTime: queryTime
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  async collectBusinessMetrics() {
    const business = {
      activeAgents: 0,
      totalPosts: 0,
      custom: { ...this.metrics.business.custom }
    };

    if (this.db) {
      try {
        // Count active agents
        const agentResult = this.db.prepare("SELECT COUNT(*) as count FROM agents WHERE status = 'active'").get();
        business.activeAgents = agentResult.count;
      } catch (err) {
        // Table might not exist
      }

      try {
        // Count total posts
        const postResult = this.db.prepare('SELECT COUNT(*) as count FROM posts').get();
        business.totalPosts = postResult.count;
      } catch (err) {
        // Table might not exist
      }
    }

    return business;
  }

  recordRequest(endpoint, method, statusCode, responseTime) {
    const now = Date.now();

    // Clean old requests outside the window
    this.requests = this.requests.filter(r => r.timestamp > now - this.requestWindow);

    // Add new request
    this.requests.push({
      endpoint,
      method,
      statusCode,
      responseTime,
      timestamp: now
    });

    // Update totals
    this.metrics.api.totalRequests++;

    // Track status codes
    const statusKey = statusCode.toString();
    this.metrics.api.statusCodes[statusKey] = (this.metrics.api.statusCodes[statusKey] || 0) + 1;

    // Track errors (4xx and 5xx)
    if (statusCode >= 400) {
      this.metrics.api.errors++;
    }

    // Track by endpoint
    if (!this.metrics.api.endpoints[endpoint]) {
      this.metrics.api.endpoints[endpoint] = {
        count: 0,
        totalResponseTime: 0,
        avgResponseTime: 0,
        errors: 0,
        methods: {}
      };
    }

    const endpointMetrics = this.metrics.api.endpoints[endpoint];
    endpointMetrics.count++;
    endpointMetrics.totalResponseTime += responseTime;
    endpointMetrics.avgResponseTime = endpointMetrics.totalResponseTime / endpointMetrics.count;

    if (statusCode >= 400) {
      endpointMetrics.errors++;
    }

    // Track by method
    if (!endpointMetrics.methods[method]) {
      endpointMetrics.methods[method] = 0;
    }
    endpointMetrics.methods[method]++;

    // Update calculated metrics
    this.updateApiMetrics();
  }

  updateApiMetrics() {
    const now = Date.now();
    const recentRequests = this.requests.filter(r => r.timestamp > now - this.requestWindow);

    // Calculate requests per second
    if (recentRequests.length > 0) {
      const oldestRequest = Math.min(...recentRequests.map(r => r.timestamp));
      const windowSeconds = (now - oldestRequest) / 1000;
      this.metrics.api.requestsPerSecond = windowSeconds > 0 ? recentRequests.length / windowSeconds : 0;
    } else {
      this.metrics.api.requestsPerSecond = 0;
    }

    // Calculate error rate - use total metrics, not just recent
    if (this.metrics.api.totalRequests > 0) {
      this.metrics.api.errorRate = (this.metrics.api.errors / this.metrics.api.totalRequests) * 100;
    } else {
      this.metrics.api.errorRate = 0;
    }

    // Calculate response time percentiles
    if (recentRequests.length > 0) {
      const sortedTimes = recentRequests.map(r => r.responseTime).sort((a, b) => a - b);

      this.metrics.api.responseTimePercentiles = {
        p50: this.getPercentile(sortedTimes, 50),
        p90: this.getPercentile(sortedTimes, 90),
        p95: this.getPercentile(sortedTimes, 95),
        p99: this.getPercentile(sortedTimes, 99)
      };
    } else {
      this.metrics.api.responseTimePercentiles = {
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0
      };
    }
  }

  getPercentile(sortedArray, percentile) {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  recordCustomMetric(name, value) {
    this.metrics.business.custom[name] = value;
  }

  getMetrics() {
    return { ...this.metrics };
  }

  getPrometheusMetrics() {
    let output = '';

    // System metrics
    output += '# HELP system_cpu_usage CPU usage percentage\n';
    output += '# TYPE system_cpu_usage gauge\n';
    output += `system_cpu_usage ${this.metrics.system.cpu?.usage || 0}\n\n`;

    output += '# HELP system_memory_used_bytes Memory used in bytes\n';
    output += '# TYPE system_memory_used_bytes gauge\n';
    output += `system_memory_used_bytes ${this.metrics.system.memory?.used || 0}\n\n`;

    output += '# HELP system_memory_total_bytes Total memory in bytes\n';
    output += '# TYPE system_memory_total_bytes gauge\n';
    output += `system_memory_total_bytes ${this.metrics.system.memory?.total || 0}\n\n`;

    output += '# HELP system_disk_used_bytes Disk space used in bytes\n';
    output += '# TYPE system_disk_used_bytes gauge\n';
    output += `system_disk_used_bytes ${this.metrics.system.disk?.used || 0}\n\n`;

    // API metrics
    output += '# HELP api_requests_total Total API requests\n';
    output += '# TYPE api_requests_total counter\n';
    output += `api_requests_total ${this.metrics.api.totalRequests}\n\n`;

    output += '# HELP api_errors_total Total API errors\n';
    output += '# TYPE api_errors_total counter\n';
    output += `api_errors_total ${this.metrics.api.errors}\n\n`;

    output += '# HELP api_error_rate API error rate percentage\n';
    output += '# TYPE api_error_rate gauge\n';
    output += `api_error_rate ${this.metrics.api.errorRate}\n\n`;

    // Endpoint metrics
    output += '# HELP api_response_time_ms Response time by endpoint in milliseconds\n';
    output += '# TYPE api_response_time_ms gauge\n';
    for (const [endpoint, metrics] of Object.entries(this.metrics.api.endpoints)) {
      for (const [method, count] of Object.entries(metrics.methods)) {
        output += `api_response_time_ms{endpoint="${endpoint}",method="${method}"} ${metrics.avgResponseTime}\n`;
      }
    }
    output += '\n';

    // Business metrics
    output += '# HELP business_active_agents Number of active agents\n';
    output += '# TYPE business_active_agents gauge\n';
    output += `business_active_agents ${this.metrics.business.activeAgents}\n\n`;

    output += '# HELP business_total_posts Total number of posts\n';
    output += '# TYPE business_total_posts gauge\n';
    output += `business_total_posts ${this.metrics.business.totalPosts}\n\n`;

    // Custom business metrics
    for (const [name, value] of Object.entries(this.metrics.business.custom)) {
      output += `# HELP business_${name} Custom business metric\n`;
      output += `# TYPE business_${name} gauge\n`;
      output += `business_${name} ${value}\n\n`;
    }

    return output;
  }

  getHealth() {
    const checks = {
      database: {
        status: this.metrics.database.connected ? 'healthy' : 'unhealthy',
        message: this.metrics.database.connected ? 'Connected' : 'Disconnected'
      },
      memory: {
        status: this.metrics.system.memory?.usedPercentage < 90 ? 'healthy' : 'unhealthy',
        message: `${this.metrics.system.memory?.usedPercentage?.toFixed(2)}% used`
      },
      cpu: {
        status: this.metrics.system.cpu?.usage < 90 ? 'healthy' : 'unhealthy',
        message: `${this.metrics.system.cpu?.usage?.toFixed(2)}% usage`
      },
      disk: {
        status: this.metrics.system.disk?.usedPercentage < 90 ? 'healthy' : 'unhealthy',
        message: `${this.metrics.system.disk?.usedPercentage?.toFixed(2)}% used`
      }
    };

    const unhealthyChecks = Object.values(checks).filter(c => c.status === 'unhealthy');
    const status = unhealthyChecks.length === 0 ? 'healthy' :
                   unhealthyChecks.length <= 1 ? 'degraded' : 'unhealthy';

    return {
      status,
      checks,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime
    };
  }

  getHistoricalStats() {
    const dataPoints = this.history.length;

    if (dataPoints === 0) {
      return {
        dataPoints: 0,
        timeRange: { start: null, end: null },
        cpuHistory: [],
        memoryHistory: [],
        diskHistory: [],
        trends: {}
      };
    }

    const timeRange = {
      start: this.history[0].timestamp,
      end: this.history[this.history.length - 1].timestamp
    };

    const cpuHistory = this.history.map(h => ({ timestamp: h.timestamp, value: h.cpu }));
    const memoryHistory = this.history.map(h => ({ timestamp: h.timestamp, value: h.memory }));
    const diskHistory = this.history.map(h => ({ timestamp: h.timestamp, value: h.disk }));

    // Calculate trends
    const trends = {
      cpu: this.calculateTrend(cpuHistory.map(h => h.value)),
      memory: this.calculateTrend(memoryHistory.map(h => h.value)),
      disk: this.calculateTrend(diskHistory.map(h => h.value))
    };

    return {
      dataPoints,
      timeRange,
      cpuHistory,
      memoryHistory,
      diskHistory,
      requestHistory: this.history.map(h => ({ timestamp: h.timestamp, value: h.requests })),
      errorHistory: this.history.map(h => ({ timestamp: h.timestamp, value: h.errors })),
      trends
    };
  }

  calculateTrend(values) {
    if (values.length < 2) return 'stable';

    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;

    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'increasing' : 'decreasing';
  }
}

module.exports = MonitoringService;
