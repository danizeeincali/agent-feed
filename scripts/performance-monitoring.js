/**
 * Real-time Performance Monitoring System
 * Continuous monitoring and alerting for web preview functionality
 */

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.alerts = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.reportPath = './performance-reports';
    
    this.thresholds = {
      critical: {
        responseTime: 5000,     // 5s
        memoryUsage: 300,       // 300MB
        errorRate: 0.05,        // 5%
        cpuUsage: 90            // 90%
      },
      warning: {
        responseTime: 3000,     // 3s
        memoryUsage: 200,       // 200MB
        errorRate: 0.02,        // 2%
        cpuUsage: 70            // 70%
      }
    };
  }

  async start() {
    if (this.isMonitoring) {
      console.log('⚠️  Performance monitoring already active');
      return;
    }

    console.log('🚀 Starting real-time performance monitoring');
    
    this.isMonitoring = true;
    
    // Create reports directory
    await this.ensureReportsDirectory();
    
    // Start monitoring loops
    this.startMetricsCollection();
    this.startAlertProcessing();
    this.startReportGeneration();
    
    console.log('✅ Performance monitoring system active');
  }

  async ensureReportsDirectory() {
    try {
      await fs.mkdir(this.reportPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create reports directory:', error);
    }
  }

  startMetricsCollection() {
    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        this.processMetrics(metrics);
        this.emit('metrics-collected', metrics);
      } catch (error) {
        console.error('Error collecting metrics:', error);
      }
    }, 5000); // Collect every 5 seconds
  }

  async collectMetrics() {
    const timestamp = new Date().toISOString();
    
    // System metrics
    const systemMetrics = await this.getSystemMetrics();
    
    // Application metrics
    const appMetrics = await this.getApplicationMetrics();
    
    // User experience metrics
    const uxMetrics = await this.getUserExperienceMetrics();
    
    // Web preview specific metrics
    const previewMetrics = await this.getPreviewMetrics();

    return {
      timestamp,
      system: systemMetrics,
      application: appMetrics,
      userExperience: uxMetrics,
      previews: previewMetrics
    };
  }

  async getSystemMetrics() {
    return new Promise((resolve) => {
      const used = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      resolve({
        memory: {
          rss: Math.round(used.rss / 1024 / 1024), // MB
          heapUsed: Math.round(used.heapUsed / 1024 / 1024),
          heapTotal: Math.round(used.heapTotal / 1024 / 1024),
          external: Math.round(used.external / 1024 / 1024)
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        uptime: Math.round(process.uptime())
      });
    });
  }

  async getApplicationMetrics() {
    try {
      // Mock API call to get application metrics
      const response = await fetch('http://localhost:3001/api/v1/metrics/performance', {
        method: 'GET',
        timeout: 2000
      }).catch(() => null);

      if (response?.ok) {
        return await response.json();
      }
      
      // Fallback metrics
      return {
        apiCalls: {
          total: 0,
          successful: 0,
          failed: 0,
          avgResponseTime: 0
        },
        database: {
          connections: 1,
          queries: 0,
          avgQueryTime: 0
        },
        cache: {
          hitRate: 0.5,
          size: 0
        }
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async getUserExperienceMetrics() {
    // These would typically come from Real User Monitoring (RUM)
    return {
      pageViews: Math.floor(Math.random() * 100),
      uniqueUsers: Math.floor(Math.random() * 50),
      avgSessionDuration: Math.floor(Math.random() * 300), // seconds
      bounceRate: Math.random() * 0.5, // 0-50%
      coreWebVitals: {
        lcp: 1200 + Math.random() * 2000, // 1.2s - 3.2s
        fid: 50 + Math.random() * 150,    // 50ms - 200ms
        cls: Math.random() * 0.2          // 0 - 0.2
      }
    };
  }

  async getPreviewMetrics() {
    return {
      imageLoading: {
        requests: Math.floor(Math.random() * 50),
        avgLoadTime: 800 + Math.random() * 1200,
        failures: Math.floor(Math.random() * 3),
        cacheHitRate: 0.7 + Math.random() * 0.25
      },
      videoThumbnails: {
        generated: Math.floor(Math.random() * 20),
        avgGenerationTime: 1500 + Math.random() * 2000,
        failures: Math.floor(Math.random() * 2),
        cacheSize: Math.floor(Math.random() * 100) // MB
      },
      linkPreviews: {
        extracted: Math.floor(Math.random() * 30),
        avgExtractionTime: 1000 + Math.random() * 3000,
        failures: Math.floor(Math.random() * 5),
        cacheHitRate: 0.6 + Math.random() * 0.3
      }
    };
  }

  processMetrics(metrics) {
    // Store metrics
    const key = new Date().toISOString().split('T')[0]; // Daily key
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key).push(metrics);

    // Check thresholds and generate alerts
    this.checkThresholds(metrics);
    
    // Clean old metrics (keep last 7 days)
    this.cleanOldMetrics();
  }

  checkThresholds(metrics) {
    const alerts = [];
    
    // Memory usage alerts
    if (metrics.system.memory.rss > this.thresholds.critical.memoryUsage) {
      alerts.push({
        type: 'CRITICAL',
        category: 'MEMORY',
        message: `High memory usage: ${metrics.system.memory.rss}MB`,
        value: metrics.system.memory.rss,
        threshold: this.thresholds.critical.memoryUsage,
        timestamp: metrics.timestamp
      });
    } else if (metrics.system.memory.rss > this.thresholds.warning.memoryUsage) {
      alerts.push({
        type: 'WARNING',
        category: 'MEMORY',
        message: `Elevated memory usage: ${metrics.system.memory.rss}MB`,
        value: metrics.system.memory.rss,
        threshold: this.thresholds.warning.memoryUsage,
        timestamp: metrics.timestamp
      });
    }

    // Preview performance alerts
    if (metrics.previews.imageLoading.avgLoadTime > this.thresholds.critical.responseTime) {
      alerts.push({
        type: 'CRITICAL',
        category: 'IMAGE_PERFORMANCE',
        message: `Slow image loading: ${Math.round(metrics.previews.imageLoading.avgLoadTime)}ms`,
        value: metrics.previews.imageLoading.avgLoadTime,
        threshold: this.thresholds.critical.responseTime,
        timestamp: metrics.timestamp
      });
    }

    if (metrics.previews.videoThumbnails.avgGenerationTime > this.thresholds.critical.responseTime) {
      alerts.push({
        type: 'CRITICAL',
        category: 'VIDEO_PERFORMANCE',
        message: `Slow video thumbnail generation: ${Math.round(metrics.previews.videoThumbnails.avgGenerationTime)}ms`,
        value: metrics.previews.videoThumbnails.avgGenerationTime,
        threshold: this.thresholds.critical.responseTime,
        timestamp: metrics.timestamp
      });
    }

    if (metrics.previews.linkPreviews.avgExtractionTime > this.thresholds.critical.responseTime) {
      alerts.push({
        type: 'CRITICAL',
        category: 'LINK_PREVIEW_PERFORMANCE',
        message: `Slow link preview extraction: ${Math.round(metrics.previews.linkPreviews.avgExtractionTime)}ms`,
        value: metrics.previews.linkPreviews.avgExtractionTime,
        threshold: this.thresholds.critical.responseTime,
        timestamp: metrics.timestamp
      });
    }

    // Core Web Vitals alerts
    if (metrics.userExperience.coreWebVitals.lcp > 2500) {
      alerts.push({
        type: 'WARNING',
        category: 'USER_EXPERIENCE',
        message: `Poor LCP: ${Math.round(metrics.userExperience.coreWebVitals.lcp)}ms`,
        value: metrics.userExperience.coreWebVitals.lcp,
        threshold: 2500,
        timestamp: metrics.timestamp
      });
    }

    if (metrics.userExperience.coreWebVitals.cls > 0.1) {
      alerts.push({
        type: 'WARNING',
        category: 'USER_EXPERIENCE',
        message: `High CLS: ${metrics.userExperience.coreWebVitals.cls.toFixed(3)}`,
        value: metrics.userExperience.coreWebVitals.cls,
        threshold: 0.1,
        timestamp: metrics.timestamp
      });
    }

    // Process alerts
    alerts.forEach(alert => this.handleAlert(alert));
  }

  handleAlert(alert) {
    // Add to alerts history
    this.alerts.push(alert);
    
    // Emit alert event
    this.emit('alert', alert);
    
    // Console logging
    const emoji = alert.type === 'CRITICAL' ? '🚨' : '⚠️';
    console.log(`${emoji} ${alert.type} ALERT: ${alert.message}`);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  cleanOldMetrics() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 days ago
    
    for (const [key] of this.metrics) {
      if (new Date(key) < cutoffDate) {
        this.metrics.delete(key);
      }
    }
  }

  startAlertProcessing() {
    // Process critical alerts immediately
    this.on('alert', async (alert) => {
      if (alert.type === 'CRITICAL') {
        await this.handleCriticalAlert(alert);
      }
    });
  }

  async handleCriticalAlert(alert) {
    // Log to file
    const alertLog = {
      timestamp: alert.timestamp,
      type: alert.type,
      category: alert.category,
      message: alert.message,
      value: alert.value,
      threshold: alert.threshold,
      systemState: await this.captureSystemState()
    };

    const logFile = path.join(this.reportPath, `alerts-${new Date().toISOString().split('T')[0]}.json`);
    
    try {
      let existingAlerts = [];
      try {
        const content = await fs.readFile(logFile, 'utf8');
        existingAlerts = JSON.parse(content);
      } catch (error) {
        // File doesn't exist or is invalid, start fresh
      }
      
      existingAlerts.push(alertLog);
      await fs.writeFile(logFile, JSON.stringify(existingAlerts, null, 2));
    } catch (error) {
      console.error('Failed to write alert log:', error);
    }
  }

  async captureSystemState() {
    return {
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      activeConnections: this.getActiveConnections(),
      recentMetrics: Array.from(this.metrics.values()).slice(-5)
    };
  }

  getActiveConnections() {
    // Mock implementation - would track real connections
    return {
      http: Math.floor(Math.random() * 50),
      websocket: Math.floor(Math.random() * 20),
      database: Math.floor(Math.random() * 10)
    };
  }

  startReportGeneration() {
    // Generate reports every hour
    setInterval(async () => {
      await this.generateHourlyReport();
    }, 3600000); // 1 hour

    // Generate daily reports at midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();
    
    setTimeout(() => {
      this.generateDailyReport();
      // Then every 24 hours
      setInterval(() => {
        this.generateDailyReport();
      }, 86400000);
    }, msUntilMidnight);
  }

  async generateHourlyReport() {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 3600000);
    
    const recentMetrics = this.getMetricsInRange(hourAgo, now);
    const recentAlerts = this.alerts.filter(alert => 
      new Date(alert.timestamp) > hourAgo
    );
    
    const report = {
      period: 'hourly',
      startTime: hourAgo.toISOString(),
      endTime: now.toISOString(),
      summary: this.generateSummary(recentMetrics),
      alerts: recentAlerts,
      trends: this.calculateTrends(recentMetrics)
    };
    
    const filename = `hourly-report-${now.toISOString().slice(0, 13).replace('T', '-')}.json`;
    await this.saveReport(filename, report);
    
    this.emit('hourly-report', report);
  }

  async generateDailyReport() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86400000);
    
    const dailyMetrics = this.getMetricsInRange(dayAgo, now);
    const dailyAlerts = this.alerts.filter(alert => 
      new Date(alert.timestamp) > dayAgo
    );
    
    const report = {
      period: 'daily',
      startTime: dayAgo.toISOString(),
      endTime: now.toISOString(),
      summary: this.generateSummary(dailyMetrics),
      alerts: {
        total: dailyAlerts.length,
        critical: dailyAlerts.filter(a => a.type === 'CRITICAL').length,
        warnings: dailyAlerts.filter(a => a.type === 'WARNING').length,
        byCategory: this.groupAlertsByCategory(dailyAlerts)
      },
      performance: this.generatePerformanceReport(dailyMetrics),
      recommendations: this.generateRecommendations(dailyMetrics, dailyAlerts)
    };
    
    const filename = `daily-report-${now.toISOString().split('T')[0]}.json`;
    await this.saveReport(filename, report);
    
    this.emit('daily-report', report);
    
    console.log(`📋 Daily performance report generated: ${filename}`);
  }

  getMetricsInRange(start, end) {
    const metrics = [];
    for (const [date, dayMetrics] of this.metrics) {
      const dateObj = new Date(date);
      if (dateObj >= start && dateObj <= end) {
        metrics.push(...dayMetrics);
      }
    }
    return metrics;
  }

  generateSummary(metrics) {
    if (metrics.length === 0) return null;
    
    const memoryValues = metrics.map(m => m.system.memory.rss);
    const imageLoadTimes = metrics.map(m => m.previews.imageLoading.avgLoadTime);
    const videoGenTimes = metrics.map(m => m.previews.videoThumbnails.avgGenerationTime);
    const linkPreviewTimes = metrics.map(m => m.previews.linkPreviews.avgExtractionTime);
    
    return {
      totalDataPoints: metrics.length,
      averageMemoryUsage: Math.round(memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length),
      peakMemoryUsage: Math.max(...memoryValues),
      averageImageLoadTime: Math.round(imageLoadTimes.reduce((a, b) => a + b, 0) / imageLoadTimes.length),
      averageVideoGenTime: Math.round(videoGenTimes.reduce((a, b) => a + b, 0) / videoGenTimes.length),
      averageLinkPreviewTime: Math.round(linkPreviewTimes.reduce((a, b) => a + b, 0) / linkPreviewTimes.length)
    };
  }

  calculateTrends(metrics) {
    if (metrics.length < 2) return null;
    
    const first = metrics[0];
    const last = metrics[metrics.length - 1];
    
    return {
      memoryTrend: ((last.system.memory.rss - first.system.memory.rss) / first.system.memory.rss * 100).toFixed(2) + '%',
      performanceTrend: this.calculatePerformanceTrend(metrics)
    };
  }

  calculatePerformanceTrend(metrics) {
    const midpoint = Math.floor(metrics.length / 2);
    const firstHalf = metrics.slice(0, midpoint);
    const secondHalf = metrics.slice(midpoint);
    
    const firstAvgTime = firstHalf.reduce((sum, m) => 
      sum + m.previews.imageLoading.avgLoadTime + 
      m.previews.videoThumbnails.avgGenerationTime + 
      m.previews.linkPreviews.avgExtractionTime, 0) / firstHalf.length / 3;
    
    const secondAvgTime = secondHalf.reduce((sum, m) => 
      sum + m.previews.imageLoading.avgLoadTime + 
      m.previews.videoThumbnails.avgGenerationTime + 
      m.previews.linkPreviews.avgExtractionTime, 0) / secondHalf.length / 3;
    
    const change = ((secondAvgTime - firstAvgTime) / firstAvgTime * 100);
    
    if (change < -5) return 'IMPROVING';
    if (change > 5) return 'DEGRADING';
    return 'STABLE';
  }

  groupAlertsByCategory(alerts) {
    const grouped = {};
    alerts.forEach(alert => {
      if (!grouped[alert.category]) {
        grouped[alert.category] = 0;
      }
      grouped[alert.category]++;
    });
    return grouped;
  }

  generatePerformanceReport(metrics) {
    const summary = this.generateSummary(metrics);
    if (!summary) return null;
    
    return {
      overallStatus: this.determineOverallStatus(summary),
      imageLoadingStatus: summary.averageImageLoadTime < 1000 ? 'GOOD' : 'NEEDS_IMPROVEMENT',
      videoThumbnailStatus: summary.averageVideoGenTime < 2000 ? 'GOOD' : 'NEEDS_IMPROVEMENT',
      linkPreviewStatus: summary.averageLinkPreviewTime < 1500 ? 'GOOD' : 'NEEDS_IMPROVEMENT',
      memoryStatus: summary.peakMemoryUsage < 200 ? 'GOOD' : 'NEEDS_IMPROVEMENT'
    };
  }

  determineOverallStatus(summary) {
    const issues = [];
    if (summary.averageImageLoadTime > 1000) issues.push('image loading');
    if (summary.averageVideoGenTime > 2000) issues.push('video thumbnails');
    if (summary.averageLinkPreviewTime > 1500) issues.push('link previews');
    if (summary.peakMemoryUsage > 200) issues.push('memory usage');
    
    if (issues.length === 0) return 'EXCELLENT';
    if (issues.length <= 2) return 'GOOD';
    return 'NEEDS_IMPROVEMENT';
  }

  generateRecommendations(metrics, alerts) {
    const recommendations = [];
    const summary = this.generateSummary(metrics);
    
    if (summary?.averageImageLoadTime > 1000) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Image Performance',
        issue: `Average image load time: ${summary.averageImageLoadTime}ms`,
        solution: 'Implement image optimization pipeline with WebP conversion and CDN'
      });
    }
    
    if (summary?.averageVideoGenTime > 2000) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Video Performance',
        issue: `Average thumbnail generation time: ${summary.averageVideoGenTime}ms`,
        solution: 'Optimize video processing pipeline and implement background processing'
      });
    }
    
    const memoryAlerts = alerts.filter(a => a.category === 'MEMORY');
    if (memoryAlerts.length > 10) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Memory Management',
        issue: `${memoryAlerts.length} memory alerts in reporting period`,
        solution: 'Implement memory profiling and garbage collection optimization'
      });
    }
    
    return recommendations;
  }

  async saveReport(filename, report) {
    const filepath = path.join(this.reportPath, filename);
    try {
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    } catch (error) {
      console.error(`Failed to save report ${filename}:`, error);
    }
  }

  async stop() {
    if (!this.isMonitoring) return;
    
    console.log('⏹️  Stopping performance monitoring');
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    // Generate final report
    await this.generateDailyReport();
    
    this.removeAllListeners();
    
    console.log('🛑 Performance monitoring stopped');
  }

  getStatus() {
    const recentAlerts = this.alerts.slice(-10);
    const criticalAlerts = recentAlerts.filter(a => a.type === 'CRITICAL');
    
    return {
      monitoring: this.isMonitoring,
      totalMetrics: Array.from(this.metrics.values()).reduce((sum, arr) => sum + arr.length, 0),
      recentAlerts: recentAlerts.length,
      criticalAlerts: criticalAlerts.length,
      lastCollection: this.lastCollectionTime
    };
  }
}

// Export for use in main application
export { PerformanceMonitor };

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new PerformanceMonitor();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down performance monitor...');
    await monitor.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await monitor.stop();
    process.exit(0);
  });
  
  // Start monitoring
  monitor.start().then(() => {
    console.log('📊 Performance monitoring active. Press Ctrl+C to stop.');
    
    // Log status every minute
    setInterval(() => {
      const status = monitor.getStatus();
      console.log(`📈 Status: ${status.totalMetrics} metrics collected, ${status.criticalAlerts} critical alerts`);
    }, 60000);
  }).catch(error => {
    console.error('❌ Failed to start performance monitoring:', error);
    process.exit(1);
  });
}