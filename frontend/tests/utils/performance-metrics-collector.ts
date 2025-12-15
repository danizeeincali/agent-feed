import { Page, test } from '@playwright/test';

export interface PerformanceMetrics {
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  totalBlockingTime: number;
  timeToInteractive: number;
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  resourceCounts: {
    total: number;
    images: number;
    scripts: number;
    stylesheets: number;
    xhr: number;
  };
  networkTiming: {
    dns: number;
    tcp: number;
    ssl: number;
    download: number;
  };
}

export class PerformanceMetricsCollector {
  private page: Page;
  private metrics: PerformanceMetrics[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  async startCollection(): Promise<void> {
    // Enable performance monitoring
    const client = await this.page.context().newCDPSession(this.page);
    await client.send('Performance.enable');
    await client.send('Runtime.enable');
  }

  async collectMetrics(label: string = 'default'): Promise<PerformanceMetrics> {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      const resourceEntries = performance.getEntriesByType('resource');
      
      // Core Web Vitals
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
      
      // Calculate load time
      const loadTime = navigation.loadEventEnd - navigation.fetchStart;
      
      // Memory usage (if available)
      const memory = (performance as any).memory || {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0
      };
      
      // Resource counts
      const resourceCounts = {
        total: resourceEntries.length,
        images: resourceEntries.filter(r => r.initiatorType === 'img').length,
        scripts: resourceEntries.filter(r => r.initiatorType === 'script').length,
        stylesheets: resourceEntries.filter(r => r.initiatorType === 'link').length,
        xhr: resourceEntries.filter(r => r.initiatorType === 'xmlhttprequest').length,
      };
      
      // Network timing
      const networkTiming = {
        dns: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp: navigation.connectEnd - navigation.connectStart,
        ssl: navigation.connectEnd - navigation.secureConnectionStart,
        download: navigation.responseEnd - navigation.responseStart,
      };
      
      return {
        loadTime,
        firstContentfulPaint: fcp,
        largestContentfulPaint: 0, // Would need observer for LCP
        cumulativeLayoutShift: 0, // Would need observer for CLS
        firstInputDelay: 0, // Would need observer for FID
        totalBlockingTime: 0, // Calculated metric
        timeToInteractive: navigation.domInteractive - navigation.fetchStart,
        memoryUsage: memory,
        resourceCounts,
        networkTiming,
      };
    });

    // Get additional metrics from CDP
    try {
      const client = await this.page.context().newCDPSession(this.page);
      const performanceMetrics = await client.send('Performance.getMetrics');
      
      // Extract useful metrics
      const metricsMap = new Map(performanceMetrics.metrics.map(m => [m.name, m.value]));
      
      metrics.totalBlockingTime = metricsMap.get('ScriptDuration') || 0;
      metrics.largestContentfulPaint = metricsMap.get('LargestContentfulPaint') || 0;
      
    } catch (error) {
      console.warn('Could not collect CDP performance metrics:', error);
    }

    this.metrics.push({ ...metrics, label } as any);
    return metrics;
  }

  async collectWebVitals(): Promise<{ lcp: number; fid: number; cls: number; fcp: number; ttfb: number }> {
    return await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {
          lcp: 0,
          fid: 0,
          cls: 0,
          fcp: 0,
          ttfb: 0
        };

        // First Contentful Paint
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        vitals.fcp = fcpEntry ? fcpEntry.startTime : 0;

        // Time to First Byte
        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        vitals.ttfb = navigationEntry.responseStart - navigationEntry.requestStart;

        // For LCP, FID, CLS we would need PerformanceObserver
        // This is a simplified version for demo purposes
        setTimeout(() => resolve(vitals), 1000);
      });
    });
  }

  async measurePageLoad(url: string): Promise<PerformanceMetrics> {
    const startTime = Date.now();
    
    await this.page.goto(url, { waitUntil: 'networkidle' });
    
    const endTime = Date.now();
    const metrics = await this.collectMetrics(`page-load-${url}`);
    
    // Add actual measured load time
    metrics.loadTime = endTime - startTime;
    
    return metrics;
  }

  async measureInteraction(action: () => Promise<void>, label: string): Promise<number> {
    const startTime = Date.now();
    await action();
    const endTime = Date.now();
    
    return endTime - startTime;
  }

  async generatePerformanceReport(): Promise<string> {
    const report = {
      timestamp: new Date().toISOString(),
      totalMeasurements: this.metrics.length,
      averageLoadTime: this.metrics.reduce((sum, m) => sum + m.loadTime, 0) / this.metrics.length,
      averageFCP: this.metrics.reduce((sum, m) => sum + m.firstContentfulPaint, 0) / this.metrics.length,
      averageMemoryUsage: this.metrics.reduce((sum, m) => sum + m.memoryUsage.usedJSHeapSize, 0) / this.metrics.length,
      measurements: this.metrics,
      summary: {
        fastLoads: this.metrics.filter(m => m.loadTime < 2000).length,
        slowLoads: this.metrics.filter(m => m.loadTime > 5000).length,
        memoryIssues: this.metrics.filter(m => m.memoryUsage.usedJSHeapSize > 50 * 1024 * 1024).length,
      }
    };

    return JSON.stringify(report, null, 2);
  }

  async collectResourceTiming(): Promise<any[]> {
    return await this.page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      return resources.map(resource => ({
        name: resource.name,
        size: (resource as any).transferSize || 0,
        duration: resource.duration,
        type: (resource as any).initiatorType,
        startTime: resource.startTime,
        responseEnd: resource.responseEnd,
      }));
    });
  }

  async measureMemoryUsage(): Promise<any> {
    return await this.page.evaluate(() => {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        };
      }
      return null;
    });
  }

  async collectNetworkMetrics(): Promise<any> {
    const client = await this.page.context().newCDPSession(this.page);
    
    try {
      await client.send('Network.enable');
      
      const resourceTypes = {
        document: 0,
        stylesheet: 0,
        image: 0,
        script: 0,
        xhr: 0,
        other: 0,
      };
      
      let totalBytes = 0;
      let totalRequests = 0;
      
      client.on('Network.responseReceived', (params) => {
        const type = params.type.toLowerCase();
        if (type in resourceTypes) {
          resourceTypes[type as keyof typeof resourceTypes]++;
        } else {
          resourceTypes.other++;
        }
        totalRequests++;
      });
      
      client.on('Network.loadingFinished', (params) => {
        totalBytes += params.encodedDataLength;
      });
      
      // Wait for a moment to collect network events
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        totalRequests,
        totalBytes,
        resourceTypes,
      };
    } catch (error) {
      console.warn('Could not collect network metrics:', error);
      return null;
    } finally {
      await client.detach();
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return this.metrics;
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  async exportMetrics(filePath: string): Promise<void> {
    const fs = require('fs');
    const report = await this.generatePerformanceReport();
    fs.writeFileSync(filePath, report);
  }
}

// Helper function for test integration
export async function withPerformanceMetrics(
  page: Page,
  testFn: (collector: PerformanceMetricsCollector) => Promise<void>
): Promise<PerformanceMetrics[]> {
  const collector = new PerformanceMetricsCollector(page);
  await collector.startCollection();
  await testFn(collector);
  return collector.getMetrics();
}

// Performance test helpers
export const performanceHelpers = {
  async waitForPageLoad(page: Page, timeout = 30000): Promise<number> {
    const startTime = Date.now();
    await page.waitForLoadState('networkidle', { timeout });
    return Date.now() - startTime;
  },

  async measureActionDuration(action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    return Date.now() - startTime;
  },

  async checkPerformanceBudget(metrics: PerformanceMetrics, budget: Partial<PerformanceMetrics>): Promise<boolean> {
    const checks = [];
    
    if (budget.loadTime) {
      checks.push(metrics.loadTime <= budget.loadTime);
    }
    
    if (budget.firstContentfulPaint) {
      checks.push(metrics.firstContentfulPaint <= budget.firstContentfulPaint);
    }
    
    if (budget.memoryUsage?.usedJSHeapSize) {
      checks.push(metrics.memoryUsage.usedJSHeapSize <= budget.memoryUsage.usedJSHeapSize);
    }
    
    return checks.every(check => check);
  },

  async generatePerformanceReport(metrics: PerformanceMetrics[]): Promise<string> {
    const avgLoadTime = metrics.reduce((sum, m) => sum + m.loadTime, 0) / metrics.length;
    const avgFCP = metrics.reduce((sum, m) => sum + m.firstContentfulPaint, 0) / metrics.length;
    const avgMemory = metrics.reduce((sum, m) => sum + m.memoryUsage.usedJSHeapSize, 0) / metrics.length;
    
    return `
Performance Report
==================
Total Measurements: ${metrics.length}
Average Load Time: ${avgLoadTime.toFixed(2)}ms
Average First Contentful Paint: ${avgFCP.toFixed(2)}ms
Average Memory Usage: ${(avgMemory / 1024 / 1024).toFixed(2)}MB

Performance Budget Compliance:
- Load Time < 3000ms: ${metrics.filter(m => m.loadTime < 3000).length}/${metrics.length}
- FCP < 2000ms: ${metrics.filter(m => m.firstContentfulPaint < 2000).length}/${metrics.length}
- Memory < 50MB: ${metrics.filter(m => m.memoryUsage.usedJSHeapSize < 50 * 1024 * 1024).length}/${metrics.length}
`;
  }
};