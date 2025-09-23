/**
 * Performance Monitoring Utility for E2E Tests
 * Tracks page performance metrics and provides detailed reports
 */

import { Page } from '@playwright/test';

export interface PerformanceMetrics {
  pageLoad: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  domContentLoaded: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
}

export interface PerformanceReport {
  startTime: Date;
  endTime: Date;
  duration: number;
  metrics: PerformanceMetrics;
  resourceTimings: Array<{
    name: string;
    duration: number;
    size: number;
    type: string;
  }>;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  warnings: string[];
  recommendations: string[];
}

export class PerformanceMonitor {
  private startTime: Date;
  private page?: Page;
  private warnings: string[] = [];

  constructor() {
    this.startTime = new Date();
  }

  async startMonitoring(page: Page): Promise<void> {
    this.page = page;
    this.startTime = new Date();

    // Inject performance monitoring script
    await page.addInitScript(() => {
      // Store performance data on window object
      (window as any).performanceData = {
        marks: new Map(),
        measures: new Map(),
        observations: []
      };

      // Set up performance observers
      if ('PerformanceObserver' in window) {
        try {
          // Observe paint timings
          const paintObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              (window as any).performanceData.observations.push({
                type: 'paint',
                name: entry.name,
                startTime: entry.startTime,
                duration: entry.duration
              });
            }
          });
          paintObserver.observe({ entryTypes: ['paint'] });

          // Observe largest contentful paint
          const lcpObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              (window as any).performanceData.observations.push({
                type: 'largest-contentful-paint',
                startTime: entry.startTime,
                size: (entry as any).size,
                element: (entry as any).element?.tagName
              });
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          // Observe layout shifts
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              (window as any).performanceData.observations.push({
                type: 'layout-shift',
                value: (entry as any).value,
                hadRecentInput: (entry as any).hadRecentInput
              });
            }
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });

        } catch (error) {
          console.warn('Performance Observer setup failed:', error);
        }
      }
    });

    // Monitor resource loading
    page.on('response', (response) => {
      const url = response.url();
      const status = response.status();

      if (status >= 400) {
        this.warnings.push(`Failed resource: ${url} (${status})`);
      }

      // Track slow responses
      const responseTime = Date.now() - new Date(response.request().timing().requestTime).getTime();
      if (responseTime > 3000) {
        this.warnings.push(`Slow response: ${url} (${responseTime}ms)`);
      }
    });

    // Monitor console errors that might affect performance
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('performance') || text.includes('memory') || text.includes('leak')) {
          this.warnings.push(`Performance-related error: ${text}`);
        }
      }
    });
  }

  async markEvent(name: string): Promise<void> {
    if (!this.page) return;

    await this.page.evaluate((markName) => {
      if ('performance' in window && performance.mark) {
        performance.mark(markName);
        (window as any).performanceData?.marks.set(markName, performance.now());
      }
    }, name);
  }

  async measureInterval(name: string, startMark: string, endMark?: string): Promise<void> {
    if (!this.page) return;

    await this.page.evaluate((measureName, start, end) => {
      if ('performance' in window && performance.measure) {
        try {
          performance.measure(measureName, start, end);
          const measure = performance.getEntriesByName(measureName, 'measure')[0];
          if (measure) {
            (window as any).performanceData?.measures.set(measureName, {
              duration: measure.duration,
              startTime: measure.startTime
            });
          }
        } catch (error) {
          console.warn('Performance measure failed:', error);
        }
      }
    }, name, startMark, endMark);
  }

  async getMemoryUsage(): Promise<any> {
    if (!this.page) return null;

    return await this.page.evaluate(() => {
      if ('performance' in window && (performance as any).memory) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
        };
      }
      return null;
    });
  }

  async generateReport(): Promise<PerformanceReport> {
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();

    if (!this.page) {
      return {
        startTime: this.startTime,
        endTime,
        duration,
        metrics: this.getDefaultMetrics(),
        resourceTimings: [],
        warnings: this.warnings,
        recommendations: []
      };
    }

    // Collect metrics from the page
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      const performanceData = (window as any).performanceData || {};

      // Calculate Core Web Vitals
      const fcp = paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0;

      // Find LCP from observations
      const lcpEntries = performanceData.observations?.filter((obs: any) =>
        obs.type === 'largest-contentful-paint'
      ) || [];
      const lcp = lcpEntries.length > 0 ?
        Math.max(...lcpEntries.map((entry: any) => entry.startTime)) : 0;

      // Calculate CLS
      const clsEntries = performanceData.observations?.filter((obs: any) =>
        obs.type === 'layout-shift' && !obs.hadRecentInput
      ) || [];
      const cls = clsEntries.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

      return {
        pageLoad: navigation.loadEventEnd - navigation.fetchStart,
        firstContentfulPaint: fcp,
        largestContentfulPaint: lcp,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        timeToInteractive: navigation.domInteractive - navigation.fetchStart,
        totalBlockingTime: 0, // Simplified for this implementation
        cumulativeLayoutShift: cls
      };
    });

    // Get resource timings
    const resourceTimings = await this.page.evaluate(() => {
      return performance.getEntriesByType('resource').map((entry: any) => ({
        name: entry.name,
        duration: entry.duration,
        size: entry.transferSize || 0,
        type: entry.initiatorType
      })).filter(resource => resource.duration > 0);
    });

    // Get memory usage
    const memoryUsage = await this.getMemoryUsage();

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, resourceTimings);

    return {
      startTime: this.startTime,
      endTime,
      duration,
      metrics,
      resourceTimings,
      memoryUsage,
      warnings: this.warnings,
      recommendations
    };
  }

  private getDefaultMetrics(): PerformanceMetrics {
    return {
      pageLoad: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      domContentLoaded: 0,
      timeToInteractive: 0,
      totalBlockingTime: 0,
      cumulativeLayoutShift: 0
    };
  }

  private generateRecommendations(
    metrics: PerformanceMetrics,
    resources: Array<{name: string, duration: number, size: number, type: string}>
  ): string[] {
    const recommendations: string[] = [];

    // Page load recommendations
    if (metrics.pageLoad > 3000) {
      recommendations.push('Page load time exceeds 3 seconds. Consider optimizing critical resources.');
    }

    // FCP recommendations
    if (metrics.firstContentfulPaint > 2500) {
      recommendations.push('First Contentful Paint is slow. Optimize above-the-fold content loading.');
    }

    // LCP recommendations
    if (metrics.largestContentfulPaint > 4000) {
      recommendations.push('Largest Contentful Paint is poor. Optimize largest visual element loading.');
    }

    // CLS recommendations
    if (metrics.cumulativeLayoutShift > 0.25) {
      recommendations.push('Cumulative Layout Shift is high. Stabilize visual elements during loading.');
    }

    // Resource size recommendations
    const largeResources = resources.filter(r => r.size > 1024 * 1024); // > 1MB
    if (largeResources.length > 0) {
      recommendations.push(`${largeResources.length} resources are larger than 1MB. Consider optimization.`);
    }

    // Slow resource recommendations
    const slowResources = resources.filter(r => r.duration > 2000);
    if (slowResources.length > 0) {
      recommendations.push(`${slowResources.length} resources are taking longer than 2 seconds to load.`);
    }

    // Too many resources
    if (resources.length > 100) {
      recommendations.push('Page loads many resources. Consider bundling or lazy loading.');
    }

    return recommendations;
  }

  reset(): void {
    this.startTime = new Date();
    this.warnings = [];
  }
}

export default PerformanceMonitor;