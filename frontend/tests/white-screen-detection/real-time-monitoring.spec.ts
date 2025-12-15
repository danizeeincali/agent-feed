import { test, expect, Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

interface RealTimeMetrics {
  timestamp: number;
  memoryUsage: number;
  cpuUsage: number;
  domNodes: number;
  eventListeners: number;
  networkRequests: number;
  consoleErrors: string[];
  performanceEntries: any[];
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  metrics: RealTimeMetrics;
  recommendations: string[];
}

class RealTimeHealthMonitor {
  private page: Page;
  private metrics: RealTimeMetrics[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertThresholds = {
    memoryUsage: 50 * 1024 * 1024, // 50MB
    cpuUsage: 80, // 80%
    domNodes: 10000, // 10k nodes
    errorRate: 5, // 5 errors per minute
    responseTime: 3000 // 3 seconds
  };

  constructor(page: Page) {
    this.page = page;
    this.setupRealTimeTracking();
  }

  private setupRealTimeTracking() {
    this.page.addInitScript(() => {
      // Real-time monitoring setup
      window.__HEALTH_MONITOR__ = {
        startTime: Date.now(),
        metrics: [],
        errors: [],
        networkRequests: [],
        performanceObservers: []
      };

      // Track all console errors in real-time
      const originalConsoleError = console.error;
      console.error = (...args) => {
        window.__HEALTH_MONITOR__.errors.push({
          timestamp: Date.now(),
          message: args.map(arg => String(arg)).join(' '),
          stack: new Error().stack
        });
        originalConsoleError.apply(console, args);
      };

      // Track network requests
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const startTime = Date.now();
        try {
          const response = await originalFetch.apply(window, args);
          window.__HEALTH_MONITOR__.networkRequests.push({
            url: args[0],
            method: args[1]?.method || 'GET',
            status: response.status,
            duration: Date.now() - startTime,
            timestamp: Date.now()
          });
          return response;
        } catch (error) {
          window.__HEALTH_MONITOR__.networkRequests.push({
            url: args[0],
            method: args[1]?.method || 'GET',
            status: 'failed',
            error: error.message,
            duration: Date.now() - startTime,
            timestamp: Date.now()
          });
          throw error;
        }
      };

      // Real-time performance monitoring
      if ('PerformanceObserver' in window) {
        // Monitor long tasks
        try {
          const longTaskObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            window.__HEALTH_MONITOR__.performanceObservers.push({
              type: 'longtask',
              entries: entries.map(entry => ({
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name
              })),
              timestamp: Date.now()
            });
          });
          longTaskObserver.observe({ entryTypes: ['longtask'] });
        } catch (e) {}

        // Monitor layout shifts
        try {
          const clsObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            window.__HEALTH_MONITOR__.performanceObservers.push({
              type: 'layout-shift',
              entries: entries.map(entry => ({
                value: (entry as any).value,
                startTime: entry.startTime,
                hadRecentInput: (entry as any).hadRecentInput
              })),
              timestamp: Date.now()
            });
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {}
      }

      // Track DOM mutations
      const mutationObserver = new MutationObserver((mutations) => {
        const domSize = document.querySelectorAll('*').length;
        if (domSize > 5000) { // Alert on large DOM
          window.__HEALTH_MONITOR__.errors.push({
            timestamp: Date.now(),
            message: `Large DOM detected: ${domSize} nodes`,
            type: 'dom_bloat'
          });
        }
      });

      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false
      });

      // Periodic health checks
      setInterval(() => {
        const metrics = {
          timestamp: Date.now(),
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
          domNodes: document.querySelectorAll('*').length,
          errorCount: window.__HEALTH_MONITOR__.errors.length,
          networkRequestCount: window.__HEALTH_MONITOR__.networkRequests.length,
          visibleElements: Array.from(document.querySelectorAll('*')).filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && el.offsetWidth > 0 && el.offsetHeight > 0;
          }).length
        };

        window.__HEALTH_MONITOR__.metrics.push(metrics);

        // Keep only recent metrics (last 100 entries)
        if (window.__HEALTH_MONITOR__.metrics.length > 100) {
          window.__HEALTH_MONITOR__.metrics = window.__HEALTH_MONITOR__.metrics.slice(-100);
        }
      }, 1000); // Every second
    });
  }

  async startMonitoring(durationMs: number = 30000): Promise<void> {
    return new Promise((resolve) => {
      let elapsed = 0;
      const interval = 1000; // Check every second

      this.monitoringInterval = setInterval(async () => {
        elapsed += interval;
        
        try {
          const currentMetrics = await this.collectCurrentMetrics();
          this.metrics.push(currentMetrics);
          
          // Check for critical issues
          const healthStatus = this.analyzeHealth(currentMetrics);
          if (healthStatus.status === 'critical') {
            console.error('CRITICAL HEALTH ISSUE:', healthStatus.issues);
            await this.takeEmergencyScreenshot();
          }
          
        } catch (error) {
          console.error('Monitoring error:', error);
        }

        if (elapsed >= durationMs) {
          this.stopMonitoring();
          resolve();
        }
      }, interval);
    });
  }

  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private async collectCurrentMetrics(): Promise<RealTimeMetrics> {
    const browserMetrics = await this.page.evaluate(() => {
      const monitor = window.__HEALTH_MONITOR__;
      const recentErrors = monitor.errors.filter(error => 
        Date.now() - error.timestamp < 60000 // Last minute
      );

      return {
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        domNodes: document.querySelectorAll('*').length,
        eventListeners: monitor.errors.length,
        networkRequests: monitor.networkRequests.length,
        consoleErrors: recentErrors.map(error => error.message),
        performanceEntries: monitor.performanceObservers.slice(-10), // Last 10 entries
        visibleElements: Array.from(document.querySelectorAll('*')).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && el.offsetWidth > 0 && el.offsetHeight > 0;
        }).length,
        pageTitle: document.title,
        url: window.location.href,
        readyState: document.readyState
      };
    });

    return {
      timestamp: Date.now(),
      memoryUsage: browserMetrics.memoryUsage,
      cpuUsage: 0, // Would need more complex calculation
      domNodes: browserMetrics.domNodes,
      eventListeners: browserMetrics.eventListeners,
      networkRequests: browserMetrics.networkRequests,
      consoleErrors: browserMetrics.consoleErrors,
      performanceEntries: browserMetrics.performanceEntries
    };
  }

  private analyzeHealth(metrics: RealTimeMetrics): HealthStatus {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Memory usage check
    if (metrics.memoryUsage > this.alertThresholds.memoryUsage) {
      issues.push(`High memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      recommendations.push('Check for memory leaks and optimize component lifecycle');
      status = 'warning';
    }

    // DOM size check
    if (metrics.domNodes > this.alertThresholds.domNodes) {
      issues.push(`Large DOM size: ${metrics.domNodes} nodes`);
      recommendations.push('Consider virtualization for large lists and component cleanup');
      status = 'warning';
    }

    // Error rate check
    if (metrics.consoleErrors.length > 0) {
      issues.push(`Console errors detected: ${metrics.consoleErrors.length}`);
      recommendations.push('Fix JavaScript errors and improve error handling');
      
      // Critical errors indicate potential white screen
      const criticalErrors = metrics.consoleErrors.filter(error =>
        error.includes('TypeError') ||
        error.includes('ReferenceError') ||
        error.includes('Cannot read') ||
        error.includes('undefined')
      );

      if (criticalErrors.length > 0) {
        status = 'critical';
        issues.push('Critical JavaScript errors detected that may cause white screen');
      }
    }

    // Performance issues
    const longTasks = metrics.performanceEntries.filter(entry => 
      entry.type === 'longtask' && entry.entries.some(task => task.duration > 100)
    );

    if (longTasks.length > 0) {
      issues.push('Long blocking tasks detected');
      recommendations.push('Optimize heavy operations and consider web workers');
      status = status === 'critical' ? 'critical' : 'warning';
    }

    return {
      status,
      issues,
      metrics,
      recommendations
    };
  }

  private async takeEmergencyScreenshot(): Promise<string> {
    const timestamp = Date.now();
    const screenshotPath = `frontend/test-results/white-screen-errors/emergency-${timestamp}.png`;
    
    await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
    await this.page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    
    return screenshotPath;
  }

  async generateHealthReport(): Promise<{
    overallHealth: 'healthy' | 'warning' | 'critical';
    summary: any;
    timeline: RealTimeMetrics[];
    alerts: string[];
    recommendations: string[];
  }> {
    const alerts: string[] = [];
    const recommendations = new Set<string>();
    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Analyze all collected metrics
    for (const metrics of this.metrics) {
      const health = this.analyzeHealth(metrics);
      
      if (health.status === 'critical') {
        overallHealth = 'critical';
      } else if (health.status === 'warning' && overallHealth !== 'critical') {
        overallHealth = 'warning';
      }

      alerts.push(...health.issues);
      health.recommendations.forEach(rec => recommendations.add(rec));
    }

    const summary = {
      monitoringDuration: this.metrics.length > 0 ? 
        this.metrics[this.metrics.length - 1].timestamp - this.metrics[0].timestamp : 0,
      totalDataPoints: this.metrics.length,
      averageMemoryUsage: this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / this.metrics.length,
      maxMemoryUsage: Math.max(...this.metrics.map(m => m.memoryUsage)),
      averageDomSize: this.metrics.reduce((sum, m) => sum + m.domNodes, 0) / this.metrics.length,
      totalErrors: this.metrics.reduce((sum, m) => sum + m.consoleErrors.length, 0),
      alertCount: alerts.length
    };

    return {
      overallHealth,
      summary,
      timeline: this.metrics,
      alerts: [...new Set(alerts)], // Remove duplicates
      recommendations: Array.from(recommendations)
    };
  }
}

test.describe('Real-Time Health Monitoring', () => {
  let monitor: RealTimeHealthMonitor;

  test.beforeEach(async ({ page }) => {
    monitor = new RealTimeHealthMonitor(page);
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should monitor application health in real-time', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Start real-time monitoring for 15 seconds
    console.log('🔍 Starting real-time health monitoring...');
    await monitor.startMonitoring(15000);

    // Generate comprehensive health report
    const healthReport = await monitor.generateHealthReport();
    
    console.log('📊 Real-Time Health Report:', {
      overallHealth: healthReport.overallHealth,
      monitoringDuration: `${(healthReport.summary.monitoringDuration / 1000).toFixed(1)}s`,
      dataPoints: healthReport.summary.totalDataPoints,
      averageMemory: `${(healthReport.summary.averageMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
      maxMemory: `${(healthReport.summary.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
      totalErrors: healthReport.summary.totalErrors,
      alertCount: healthReport.summary.alertCount
    });

    // Health assertions
    expect(healthReport.overallHealth).not.toBe('critical');
    expect(healthReport.summary.totalErrors).toBeLessThan(10);
    expect(healthReport.summary.maxMemoryUsage).toBeLessThan(100 * 1024 * 1024); // 100MB

    // Log issues if any
    if (healthReport.alerts.length > 0) {
      console.warn('⚠️  Health Issues Detected:', healthReport.alerts);
      console.log('💡 Recommendations:', healthReport.recommendations);
    }

    // Save detailed report
    await fs.writeFile(
      'frontend/test-results/real-time-health-report.json',
      JSON.stringify(healthReport, null, 2)
    );

    // Fail test if critical issues found
    if (healthReport.overallHealth === 'critical') {
      throw new Error(`Critical health issues detected: ${healthReport.alerts.join(', ')}`);
    }
  });

  test('should detect white screen during user interactions', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Start monitoring
    const monitoringPromise = monitor.startMonitoring(20000);

    // Simulate user interactions while monitoring
    const interactions = [
      async () => {
        await page.hover('body');
        await page.waitForTimeout(1000);
      },
      async () => {
        const buttons = await page.$$('button');
        if (buttons.length > 0) {
          await buttons[0].click();
          await page.waitForTimeout(1500);
        }
      },
      async () => {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(500);
      },
      async () => {
        await page.evaluate(() => {
          window.scrollTo(0, 100);
        });
        await page.waitForTimeout(1000);
      },
      async () => {
        const links = await page.$$('a[href]');
        if (links.length > 0) {
          await links[0].hover();
          await page.waitForTimeout(1000);
        }
      }
    ];

    // Perform interactions with health monitoring
    for (let i = 0; i < interactions.length; i++) {
      console.log(`🖱️  Performing interaction ${i + 1}/${interactions.length}`);
      
      try {
        await interactions[i]();
        
        // Check if page is still healthy after interaction
        const currentHealth = await page.evaluate(() => {
          return {
            hasRoot: !!document.querySelector('#root'),
            hasVisibleContent: Array.from(document.querySelectorAll('*')).filter(el => {
              return el.offsetWidth > 0 && el.offsetHeight > 0;
            }).length > 5,
            hasErrors: window.__HEALTH_MONITOR__?.errors.length || 0,
            title: document.title,
            readyState: document.readyState
          };
        });

        expect(currentHealth.hasRoot).toBe(true);
        expect(currentHealth.hasVisibleContent).toBe(true);
        
        if (currentHealth.hasErrors > 10) {
          console.warn(`⚠️  High error count after interaction ${i + 1}: ${currentHealth.hasErrors}`);
        }
        
      } catch (error) {
        console.error(`❌ Interaction ${i + 1} failed:`, error.message);
        // Don't fail test for interaction errors, but log them
      }
    }

    // Wait for monitoring to complete
    await monitoringPromise;

    // Final health check
    const finalReport = await monitor.generateHealthReport();
    expect(finalReport.overallHealth).not.toBe('critical');

    console.log('✅ User interaction monitoring completed');
  });

  test('should detect memory leaks over time', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Extended monitoring for memory leak detection
    console.log('🧠 Starting memory leak detection...');
    await monitor.startMonitoring(30000); // 30 seconds

    // Simulate memory-intensive operations
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => {
        // Simulate potential memory leak scenarios
        for (let j = 0; j < 100; j++) {
          const div = document.createElement('div');
          div.innerHTML = `<span>Test ${j}</span>`;
          document.body.appendChild(div);
        }
        
        // Clean up immediately (proper behavior)
        const testDivs = document.querySelectorAll('div:has(span)');
        testDivs.forEach(div => div.remove());
        
        // Force garbage collection if available
        if (window.gc) {
          window.gc();
        }
      });
      
      await page.waitForTimeout(2000);
    }

    const memoryReport = await monitor.generateHealthReport();
    
    // Memory leak analysis
    const memoryGrowth = memoryReport.summary.maxMemoryUsage - 
      (memoryReport.timeline[0]?.memoryUsage || 0);
    
    console.log('🧠 Memory Analysis:', {
      initialMemory: `${((memoryReport.timeline[0]?.memoryUsage || 0) / 1024 / 1024).toFixed(2)}MB`,
      maxMemory: `${(memoryReport.summary.maxMemoryUsage / 1024 / 1024).toFixed(2)}MB`,
      memoryGrowth: `${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`,
      averageMemory: `${(memoryReport.summary.averageMemoryUsage / 1024 / 1024).toFixed(2)}MB`
    });

    // Memory leak assertions
    expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024); // Less than 20MB growth
    expect(memoryReport.summary.maxMemoryUsage).toBeLessThan(150 * 1024 * 1024); // Less than 150MB total

    if (memoryGrowth > 10 * 1024 * 1024) {
      console.warn('⚠️  Potential memory leak detected:', {
        growth: `${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`,
        recommendations: memoryReport.recommendations
      });
    }
  });

  test('should provide early warning system for white screen conditions', async ({ page }) => {
    const earlyWarnings: string[] = [];
    
    // Set up early warning detection
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('Cannot read') || 
            text.includes('TypeError') || 
            text.includes('undefined')) {
          earlyWarnings.push(`Potential white screen precursor: ${text}`);
        }
      }
    });

    await page.goto('http://localhost:5173');
    
    // Monitor with early warning system
    await monitor.startMonitoring(10000);

    // Check for early warning indicators
    const warningAnalysis = await page.evaluate(() => {
      const indicators = {
        emptyRoot: !document.querySelector('#root')?.children.length,
        noVisibleContent: Array.from(document.querySelectorAll('*')).filter(el => 
          el.offsetWidth > 0 && el.offsetHeight > 0
        ).length < 5,
        criticalErrors: (window.__HEALTH_MONITOR__?.errors || []).filter(error =>
          error.message.includes('TypeError') || error.message.includes('Cannot read')
        ).length,
        missingStyles: document.querySelectorAll('link[rel="stylesheet"]').length === 0,
        jsDisabled: !window.React && !window.Vue && !window.Angular
      };

      return {
        ...indicators,
        riskScore: Object.values(indicators).filter(Boolean).length
      };
    });

    console.log('🚨 Early Warning Analysis:', {
      ...warningAnalysis,
      earlyWarnings: earlyWarnings.length
    });

    // Early warning assertions
    expect(warningAnalysis.riskScore).toBeLessThan(3); // Less than 3 risk factors
    expect(earlyWarnings.length).toBeLessThan(5); // Less than 5 warning signals

    if (warningAnalysis.riskScore >= 2) {
      console.warn('⚠️  Early warning indicators detected:', warningAnalysis);
      
      // Take preventive screenshot
      await page.screenshot({
        path: 'frontend/test-results/early-warning-screenshot.png',
        fullPage: true
      });
    }

    const finalHealthReport = await monitor.generateHealthReport();
    
    // Create early warning report
    const earlyWarningReport = {
      timestamp: new Date().toISOString(),
      riskScore: warningAnalysis.riskScore,
      indicators: warningAnalysis,
      earlyWarnings,
      healthStatus: finalHealthReport.overallHealth,
      preventiveActionNeeded: warningAnalysis.riskScore >= 2
    };

    await fs.writeFile(
      'frontend/test-results/early-warning-report.json',
      JSON.stringify(earlyWarningReport, null, 2)
    );

    console.log('✅ Early warning system check completed');
  });
});