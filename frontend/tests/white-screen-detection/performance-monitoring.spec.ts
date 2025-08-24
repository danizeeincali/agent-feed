import { test, expect, Page } from '@playwright/test';

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  memoryUsage?: any;
  cpuUsage?: any;
  networkRequests: number;
  failedRequests: number;
}

interface InfiniteLoopDetection {
  detected: boolean;
  stackTraces: string[];
  highCpuPeriods: number[];
  excessiveUpdates: boolean;
  memoryLeaks: boolean;
}

class PerformanceMonitor {
  private page: Page;
  private performanceEntries: any[] = [];
  private memorySnapshots: any[] = [];
  private cpuUsageData: number[] = [];

  constructor(page: Page) {
    this.page = page;
    this.setupPerformanceTracking();
  }

  private setupPerformanceTracking() {
    // Track long tasks
    this.page.addInitScript(() => {
      window.__PERFORMANCE_DATA__ = {
        longTasks: [],
        memorySnapshots: [],
        stackOverflows: [],
        infiniteLoops: [],
        highCpuPeriods: []
      };

      // Monitor long tasks (blocking operations)
      if ('PerformanceObserver' in window) {
        try {
          const longTaskObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
              if (entry.duration > 50) { // Tasks longer than 50ms
                window.__PERFORMANCE_DATA__.longTasks.push({
                  duration: entry.duration,
                  startTime: entry.startTime,
                  name: entry.name
                });
              }
            });
          });
          
          longTaskObserver.observe({ entryTypes: ['longtask'] });
        } catch (e) {
          console.warn('Long task monitoring not supported');
        }
      }

      // Monitor memory usage
      if ('memory' in performance) {
        setInterval(() => {
          const memory = (performance as any).memory;
          window.__PERFORMANCE_DATA__.memorySnapshots.push({
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit,
            timestamp: Date.now()
          });
        }, 1000);
      }

      // Detect potential infinite loops through stack overflow detection
      const originalError = Error;
      Error = function(...args) {
        const error = new originalError(...args);
        if (error.stack && error.stack.includes('Maximum call stack')) {
          window.__PERFORMANCE_DATA__.stackOverflows.push({
            message: error.message,
            stack: error.stack,
            timestamp: Date.now()
          });
        }
        return error;
      } as any;

      // Monitor excessive DOM updates
      let domUpdateCount = 0;
      const originalAppendChild = Node.prototype.appendChild;
      const originalRemoveChild = Node.prototype.removeChild;
      
      Node.prototype.appendChild = function(...args) {
        domUpdateCount++;
        return originalAppendChild.apply(this, args);
      };
      
      Node.prototype.removeChild = function(...args) {
        domUpdateCount++;
        return originalRemoveChild.apply(this, args);
      };

      // Check for excessive DOM updates every second
      setInterval(() => {
        if (domUpdateCount > 100) { // More than 100 DOM updates per second
          window.__PERFORMANCE_DATA__.infiniteLoops.push({
            type: 'excessive_dom_updates',
            count: domUpdateCount,
            timestamp: Date.now()
          });
        }
        domUpdateCount = 0;
      }, 1000);
    });
  }

  async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      const resourceEntries = performance.getEntriesByType('resource');

      // Web Vitals
      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0;
      const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
      
      // Get LCP if available
      let largestContentfulPaint = 0;
      if ('PerformanceObserver' in window) {
        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            largestContentfulPaint = lastEntry?.startTime || 0;
          }).observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {}
      }

      const memoryUsage = (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null;

      const failedRequests = resourceEntries.filter((entry: any) => 
        entry.transferSize === 0 && entry.decodedBodySize === 0
      ).length;

      return {
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        firstPaint,
        firstContentfulPaint,
        largestContentfulPaint,
        cumulativeLayoutShift: 0, // Would need CLS observer
        firstInputDelay: 0, // Would need FID observer
        memoryUsage,
        networkRequests: resourceEntries.length,
        failedRequests
      };
    });

    return metrics as PerformanceMetrics;
  }

  async detectInfiniteLoops(): Promise<InfiniteLoopDetection> {
    // Wait for potential issues to manifest
    await this.page.waitForTimeout(5000);

    const loopDetection = await this.page.evaluate(() => {
      const data = window.__PERFORMANCE_DATA__;
      
      return {
        detected: data.stackOverflows.length > 0 || 
                 data.infiniteLoops.length > 0 || 
                 data.longTasks.some(task => task.duration > 5000),
        stackTraces: data.stackOverflows.map(so => so.stack),
        highCpuPeriods: data.longTasks.filter(task => task.duration > 1000).map(task => task.duration),
        excessiveUpdates: data.infiniteLoops.some(loop => loop.type === 'excessive_dom_updates'),
        memoryLeaks: data.memorySnapshots.length > 1 && 
                    data.memorySnapshots[data.memorySnapshots.length - 1].used > 
                    data.memorySnapshots[0].used * 2 // Memory doubled
      };
    });

    return loopDetection as InfiniteLoopDetection;
  }

  async monitorCpuUsage(duration: number = 5000): Promise<number[]> {
    const cpuData: number[] = [];
    const startTime = Date.now();
    
    while (Date.now() - startTime < duration) {
      const beforeTime = performance.now();
      await this.page.waitForTimeout(100);
      const afterTime = performance.now();
      
      // Rough CPU usage estimation based on setTimeout accuracy
      const expectedTime = 100;
      const actualTime = afterTime - beforeTime;
      const cpuUsage = Math.max(0, (actualTime - expectedTime) / expectedTime * 100);
      
      cpuData.push(cpuUsage);
    }
    
    return cpuData;
  }

  async checkMemoryLeaks(): Promise<{
    hasLeaks: boolean;
    initialMemory: number;
    finalMemory: number;
    leakSize: number;
    snapshots: any[];
  }> {
    const memoryData = await this.page.evaluate(() => {
      const snapshots = window.__PERFORMANCE_DATA__.memorySnapshots;
      
      if (snapshots.length < 2) {
        return {
          hasLeaks: false,
          initialMemory: 0,
          finalMemory: 0,
          leakSize: 0,
          snapshots: []
        };
      }
      
      const initial = snapshots[0].used;
      const final = snapshots[snapshots.length - 1].used;
      const leakSize = final - initial;
      
      return {
        hasLeaks: leakSize > 10 * 1024 * 1024, // 10MB threshold
        initialMemory: initial,
        finalMemory: final,
        leakSize,
        snapshots: snapshots.slice(-5) // Last 5 snapshots
      };
    });

    return memoryData;
  }
}

test.describe('Performance and Infinite Loop Detection', () => {
  let monitor: PerformanceMonitor;

  test.beforeEach(async ({ page }) => {
    monitor = new PerformanceMonitor(page);
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should meet performance benchmarks', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    const navigationTime = Date.now() - startTime;
    const metrics = await monitor.collectPerformanceMetrics();
    
    console.log('Performance Metrics:', {
      navigationTime,
      ...metrics
    });

    // Performance assertions
    expect(navigationTime).toBeLessThan(10000); // 10 second max
    expect(metrics.loadTime).toBeLessThan(8000); // 8 second max load
    expect(metrics.domContentLoaded).toBeLessThan(5000); // 5 second max DOM ready
    expect(metrics.firstContentfulPaint).toBeLessThan(3000); // 3 second max FCP
    expect(metrics.failedRequests).toBeLessThan(3); // Allow few failed requests
    
    // Memory usage checks
    if (metrics.memoryUsage) {
      expect(metrics.memoryUsage.used).toBeLessThan(100 * 1024 * 1024); // 100MB max
      console.log('Memory Usage:', {
        used: `${(metrics.memoryUsage.used / 1024 / 1024).toFixed(2)}MB`,
        total: `${(metrics.memoryUsage.total / 1024 / 1024).toFixed(2)}MB`
      });
    }
  });

  test('should detect infinite loops and blocking operations', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Monitor for blocking operations
    const loopDetection = await monitor.detectInfiniteLoops();
    
    console.log('Infinite Loop Detection:', loopDetection);
    
    // Assertions
    expect(loopDetection.detected).toBe(false);
    expect(loopDetection.stackTraces.length).toBe(0);
    expect(loopDetection.excessiveUpdates).toBe(false);
    expect(loopDetection.memoryLeaks).toBe(false);
    
    // Check for reasonable CPU usage
    const highCpuCount = loopDetection.highCpuPeriods.filter(period => period > 2000).length;
    expect(highCpuCount).toBeLessThan(2); // Allow max 1 high CPU period
    
    if (loopDetection.detected) {
      console.error('BLOCKING OPERATIONS DETECTED:');
      console.error('Stack Traces:', loopDetection.stackTraces);
      console.error('High CPU Periods:', loopDetection.highCpuPeriods);
      
      // Take diagnostic screenshot
      await page.screenshot({
        path: 'frontend/test-results/infinite-loop-detection.png',
        fullPage: true
      });
    }
  });

  test('should monitor CPU usage during interaction', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Perform various interactions while monitoring CPU
    const interactions = [
      () => page.hover('body'),
      () => page.click('button').catch(() => {}), // Ignore if no button
      () => page.keyboard.press('Tab'),
      () => page.mouse.move(100, 100),
      () => page.evaluate(() => window.scrollTo(0, 100))
    ];

    for (const interaction of interactions) {
      const beforeCpu = performance.now();
      await interaction();
      await page.waitForTimeout(500);
      const afterCpu = performance.now();
      
      const interactionTime = afterCpu - beforeCpu;
      expect(interactionTime).toBeLessThan(1000); // Interactions should be responsive
    }
    
    // Monitor overall CPU usage
    const cpuUsage = await monitor.monitorCpuUsage(3000);
    const averageCpu = cpuUsage.reduce((sum, cpu) => sum + cpu, 0) / cpuUsage.length;
    const maxCpu = Math.max(...cpuUsage);
    
    console.log('CPU Usage Stats:', {
      average: averageCpu.toFixed(2),
      max: maxCpu.toFixed(2),
      samples: cpuUsage.length
    });
    
    expect(averageCpu).toBeLessThan(50); // Average CPU usage under 50%
    expect(maxCpu).toBeLessThan(90); // Max CPU usage under 90%
  });

  test('should detect memory leaks', async ({ page }) => {
    await page.goto('http://localhost:5173');
    
    // Allow time for memory tracking
    await page.waitForTimeout(10000);
    
    // Perform memory-intensive operations
    await page.evaluate(() => {
      // Simulate user interactions that might cause leaks
      for (let i = 0; i < 100; i++) {
        const event = new Event('click');
        document.dispatchEvent(event);
      }
    });
    
    await page.waitForTimeout(5000);
    
    const memoryAnalysis = await monitor.checkMemoryLeaks();
    
    console.log('Memory Analysis:', {
      hasLeaks: memoryAnalysis.hasLeaks,
      initialMemory: `${(memoryAnalysis.initialMemory / 1024 / 1024).toFixed(2)}MB`,
      finalMemory: `${(memoryAnalysis.finalMemory / 1024 / 1024).toFixed(2)}MB`,
      leakSize: `${(memoryAnalysis.leakSize / 1024 / 1024).toFixed(2)}MB`
    });
    
    expect(memoryAnalysis.hasLeaks).toBe(false);
    
    if (memoryAnalysis.hasLeaks) {
      console.error('MEMORY LEAK DETECTED:');
      console.error(`Leak Size: ${(memoryAnalysis.leakSize / 1024 / 1024).toFixed(2)}MB`);
      console.error('Memory Snapshots:', memoryAnalysis.snapshots);
    }
  });

  test('should handle stress testing without blocking', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Stress test with rapid interactions
    const stressTestStart = Date.now();
    
    for (let i = 0; i < 50; i++) {
      await Promise.all([
        page.hover(`body`).catch(() => {}),
        page.evaluate(() => {
          // Rapid DOM queries
          document.querySelectorAll('*');
          document.getElementsByTagName('div');
        }),
        page.waitForTimeout(10)
      ]);
      
      // Check if page is still responsive
      if (i % 10 === 0) {
        const isResponsive = await page.evaluate(() => {
          const start = Date.now();
          // Simple CPU test
          let count = 0;
          while (Date.now() - start < 50) {
            count++;
          }
          return count > 1000; // Should be able to do simple operations
        });
        
        expect(isResponsive).toBe(true);
      }
    }
    
    const stressTestDuration = Date.now() - stressTestStart;
    console.log(`Stress test completed in ${stressTestDuration}ms`);
    
    // Stress test shouldn't take too long
    expect(stressTestDuration).toBeLessThan(30000); // 30 seconds max
    
    // Check final state
    const finalLoopDetection = await monitor.detectInfiniteLoops();
    expect(finalLoopDetection.detected).toBe(false);
  });

  test('should monitor network performance and failures', async ({ page }) => {
    const networkRequests: any[] = [];
    const failedRequests: any[] = [];

    // Track all network requests
    page.on('request', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    });

    page.on('requestfailed', (request) => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()?.errorText,
        timestamp: Date.now()
      });
    });

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    console.log('Network Performance:', {
      totalRequests: networkRequests.length,
      failedRequests: failedRequests.length,
      failureRate: (failedRequests.length / networkRequests.length * 100).toFixed(2) + '%'
    });

    // Network performance assertions
    expect(networkRequests.length).toBeGreaterThan(0);
    expect(failedRequests.length).toBeLessThan(networkRequests.length * 0.1); // Less than 10% failure rate
    
    if (failedRequests.length > 0) {
      console.log('Failed Requests:', failedRequests);
    }
  });
});

// Additional test for real-world scenarios
test.describe('Real-world Performance Scenarios', () => {
  test('should handle multiple tabs simulation', async ({ page, context }) => {
    // Open multiple pages to simulate tab switching
    const pages = [page];
    
    for (let i = 1; i < 3; i++) {
      const newPage = await context.newPage();
      pages.push(newPage);
    }

    // Load same app in multiple tabs
    await Promise.all(
      pages.map(p => p.goto('http://localhost:5173'))
    );

    // Wait for all to load
    await Promise.all(
      pages.map(p => p.waitForLoadState('networkidle'))
    );

    // Switch between tabs (focus simulation)
    for (const p of pages) {
      await p.bringToFront();
      await p.waitForTimeout(1000);
      
      // Verify each tab is still functional
      const isResponsive = await p.evaluate(() => {
        return document.querySelector('#root') !== null &&
               document.readyState === 'complete';
      });
      
      expect(isResponsive).toBe(true);
    }

    // Close additional pages
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close();
    }
  });
});