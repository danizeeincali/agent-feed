import { Page, Browser } from '@playwright/test';

/**
 * Performance Monitor Utility
 * Tracks and analyzes performance metrics during E2E tests
 */
export class PerformanceMonitor {
  private page: Page;
  private metrics: PerformanceMetric[] = [];
  private memorySnapshots: MemorySnapshot[] = [];
  private networkRequests: NetworkRequest[] = [];
  private startTime: number = 0;

  constructor(page: Page) {
    this.page = page;
    this.setupNetworkMonitoring();
  }

  async startMonitoring(testName: string) {
    this.startTime = Date.now();
    this.metrics = [];
    this.memorySnapshots = [];
    this.networkRequests = [];

    console.log(`🔍 Starting performance monitoring for: ${testName}`);
    
    // Start collecting Web Vitals
    await this.collectWebVitals();
    
    // Start memory monitoring
    await this.startMemoryMonitoring();
    
    // Record initial state
    await this.takeMemorySnapshot('test-start');
  }

  async stopMonitoring(testName: string): Promise<PerformanceReport> {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;

    // Take final memory snapshot
    await this.takeMemorySnapshot('test-end');

    // Collect final metrics
    const finalWebVitals = await this.collectWebVitals();
    
    const report: PerformanceReport = {
      testName,
      duration: totalDuration,
      webVitals: finalWebVitals,
      networkRequests: this.networkRequests,
      memorySnapshots: this.memorySnapshots,
      metrics: this.metrics,
      summary: this.generateSummary()
    };

    console.log(`✅ Performance monitoring completed for: ${testName}`);
    console.log(`📊 Duration: ${totalDuration}ms`);
    
    return report;
  }

  private setupNetworkMonitoring() {
    this.page.on('request', (request) => {
      this.networkRequests.push({
        type: 'request',
        url: request.url(),
        method: request.method(),
        timestamp: Date.now(),
        resourceType: request.resourceType(),
        size: 0
      });
    });

    this.page.on('response', (response) => {
      const request = this.networkRequests.find(req => 
        req.url === response.url() && req.type === 'request'
      );
      
      this.networkRequests.push({
        type: 'response',
        url: response.url(),
        method: response.request().method(),
        timestamp: Date.now(),
        resourceType: response.request().resourceType(),
        status: response.status(),
        size: parseInt(response.headers()['content-length'] || '0'),
        duration: request ? Date.now() - request.timestamp : 0
      });
    });
  }

  async collectWebVitals(): Promise<WebVitals> {
    const vitals = await this.page.evaluate(() => {
      return new Promise<WebVitals>((resolve) => {
        // Collect Core Web Vitals
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals: Partial<WebVitals> = {};

          entries.forEach((entry) => {
            switch (entry.name) {
              case 'first-contentful-paint':
                vitals.FCP = entry.startTime;
                break;
              case 'largest-contentful-paint':
                vitals.LCP = entry.startTime;
                break;
              case 'first-input-delay':
                vitals.FID = entry.processingStart - entry.startTime;
                break;
              case 'cumulative-layout-shift':
                vitals.CLS = entry.value;
                break;
            }
          });

          // Calculate Time to Interactive (TTI)
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            vitals.TTI = navigation.loadEventEnd - navigation.fetchStart;
            vitals.TTFB = navigation.responseStart - navigation.fetchStart;
          }

          resolve(vitals as WebVitals);
        });

        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });

        // Fallback timeout
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          resolve({
            FCP: 0,
            LCP: 0,
            FID: 0,
            CLS: 0,
            TTI: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
            TTFB: navigation ? navigation.responseStart - navigation.fetchStart : 0
          });
        }, 3000);
      });
    });

    return vitals;
  }

  async startMemoryMonitoring() {
    // Monitor memory usage every 5 seconds
    const memoryInterval = setInterval(async () => {
      await this.takeMemorySnapshot(`runtime-${Date.now()}`);
    }, 5000);

    // Store interval reference for cleanup
    (this.page as any)._memoryInterval = memoryInterval;
  }

  async takeMemorySnapshot(label: string): Promise<void> {
    try {
      const cdpSession = await this.page.context().newCDPSession(this.page);
      
      // Force garbage collection
      await cdpSession.send('Runtime.runIfWaitingForDebugger');
      
      // Get heap usage
      const heapUsage = await cdpSession.send('Runtime.getHeapUsage');
      
      const snapshot: MemorySnapshot = {
        label,
        timestamp: Date.now(),
        heapUsed: heapUsage.usedSize,
        heapTotal: heapUsage.totalSize,
        heapLimit: heapUsage.totalSize // Approximate
      };

      this.memorySnapshots.push(snapshot);
      
      await cdpSession.detach();
    } catch (error) {
      console.warn('Could not take memory snapshot:', error.message);
    }
  }

  async measureActionPerformance<T>(
    actionName: string,
    action: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    
    try {
      const result = await action();
      const duration = Date.now() - startTime;
      
      this.metrics.push({
        name: actionName,
        duration,
        timestamp: Date.now(),
        success: true
      });

      console.log(`⚡ ${actionName}: ${duration}ms`);
      
      return { result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.metrics.push({
        name: actionName,
        duration,
        timestamp: Date.now(),
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  async measurePageLoad(url: string): Promise<PageLoadMetrics> {
    const startTime = Date.now();
    
    // Navigate and measure
    const response = await this.page.goto(url, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    // Collect detailed timing
    const timing = await this.page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.fetchStart,
        loadComplete: perfData.loadEventEnd - perfData.fetchStart,
        firstByte: perfData.responseStart - perfData.fetchStart,
        domInteractive: perfData.domInteractive - perfData.fetchStart
      };
    });

    return {
      url,
      statusCode: response?.status() || 0,
      loadTime,
      ...timing
    };
  }

  async measureAPIEndpoint(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any): Promise<APIPerformanceMetrics> {
    const startTime = Date.now();
    
    try {
      const response = await this.page.request[method.toLowerCase() as 'get'](url, {
        data: method !== 'GET' ? data : undefined
      });
      
      const duration = Date.now() - startTime;
      
      return {
        url,
        method,
        duration,
        statusCode: response.status(),
        success: response.ok(),
        size: parseInt(response.headers()['content-length'] || '0')
      };
    } catch (error) {
      return {
        url,
        method,
        duration: Date.now() - startTime,
        statusCode: 0,
        success: false,
        error: error.message
      };
    }
  }

  private generateSummary(): PerformanceSummary {
    const totalRequests = this.networkRequests.filter(req => req.type === 'response').length;
    const failedRequests = this.networkRequests.filter(req => 
      req.type === 'response' && req.status && req.status >= 400
    ).length;
    
    const avgResponseTime = this.networkRequests
      .filter(req => req.type === 'response' && req.duration)
      .reduce((sum, req) => sum + (req.duration || 0), 0) / totalRequests || 0;

    const memoryGrowth = this.memorySnapshots.length > 1 
      ? this.memorySnapshots[this.memorySnapshots.length - 1].heapUsed - this.memorySnapshots[0].heapUsed
      : 0;

    const avgActionTime = this.metrics.length > 0
      ? this.metrics.reduce((sum, metric) => sum + metric.duration, 0) / this.metrics.length
      : 0;

    return {
      totalNetworkRequests: totalRequests,
      failedRequests,
      avgResponseTime,
      memoryGrowth,
      avgActionTime,
      slowestAction: this.metrics.sort((a, b) => b.duration - a.duration)[0]?.name || 'none'
    };
  }

  async generateReport(): Promise<string> {
    const report = await this.stopMonitoring('manual-report');
    
    const reportContent = `
# Performance Report

## Test Duration
${report.duration}ms

## Web Vitals
- First Contentful Paint (FCP): ${report.webVitals.FCP?.toFixed(2)}ms
- Largest Contentful Paint (LCP): ${report.webVitals.LCP?.toFixed(2)}ms
- First Input Delay (FID): ${report.webVitals.FID?.toFixed(2)}ms
- Cumulative Layout Shift (CLS): ${report.webVitals.CLS?.toFixed(4)}
- Time to Interactive (TTI): ${report.webVitals.TTI?.toFixed(2)}ms
- Time to First Byte (TTFB): ${report.webVitals.TTFB?.toFixed(2)}ms

## Network Performance
- Total Requests: ${report.summary.totalNetworkRequests}
- Failed Requests: ${report.summary.failedRequests}
- Average Response Time: ${report.summary.avgResponseTime?.toFixed(2)}ms

## Memory Usage
- Memory Growth: ${(report.summary.memoryGrowth / 1024 / 1024).toFixed(2)} MB

## Action Performance
- Average Action Time: ${report.summary.avgActionTime?.toFixed(2)}ms
- Slowest Action: ${report.summary.slowestAction}
`;

    return reportContent;
  }

  cleanup() {
    // Clear monitoring interval
    if ((this.page as any)._memoryInterval) {
      clearInterval((this.page as any)._memoryInterval);
    }
  }
}

// Type definitions
export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface MemorySnapshot {
  label: string;
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
}

export interface NetworkRequest {
  type: 'request' | 'response';
  url: string;
  method: string;
  timestamp: number;
  resourceType: string;
  status?: number;
  size?: number;
  duration?: number;
}

export interface WebVitals {
  FCP: number; // First Contentful Paint
  LCP: number; // Largest Contentful Paint
  FID: number; // First Input Delay
  CLS: number; // Cumulative Layout Shift
  TTI: number; // Time to Interactive
  TTFB: number; // Time to First Byte
}

export interface PageLoadMetrics {
  url: string;
  statusCode: number;
  loadTime: number;
  domContentLoaded: number;
  loadComplete: number;
  firstByte: number;
  domInteractive: number;
}

export interface APIPerformanceMetrics {
  url: string;
  method: string;
  duration: number;
  statusCode: number;
  success: boolean;
  size?: number;
  error?: string;
}

export interface PerformanceSummary {
  totalNetworkRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  memoryGrowth: number;
  avgActionTime: number;
  slowestAction: string;
}

export interface PerformanceReport {
  testName: string;
  duration: number;
  webVitals: WebVitals;
  networkRequests: NetworkRequest[];
  memorySnapshots: MemorySnapshot[];
  metrics: PerformanceMetric[];
  summary: PerformanceSummary;
}