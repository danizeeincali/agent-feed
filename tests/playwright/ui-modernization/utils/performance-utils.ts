import { Page, Locator } from '@playwright/test';

/**
 * Performance and Animation Testing Utilities
 * 
 * Utilities for measuring performance, testing animation smoothness,
 * and validating UI responsiveness in Claude Instance Manager.
 */

export interface PerformanceMetrics {
  loadTime: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  totalBlockingTime: number;
}

export interface AnimationMetrics {
  duration: number;
  frameRate: number;
  droppedFrames: number;
  smoothness: 'smooth' | 'choppy' | 'blocked';
}

export interface ResponsivenessMetrics {
  buttonClickTime: number;
  inputResponseTime: number;
  pageNavigationTime: number;
  domContentLoadedTime: number;
}

/**
 * Performance Measurement Utilities
 */
export class PerformanceUtils {
  private page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Initialize performance monitoring
   */
  async initializePerformanceMonitoring() {
    await this.page.addInitScript(() => {
      // Store performance data
      (window as any).performanceData = {
        navigationStart: performance.timeOrigin,
        marks: new Map(),
        measures: new Map(),
        animationFrames: [],
        interactions: []
      };
      
      // Override requestAnimationFrame to track animation performance
      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = (callback) => {
        const frameTime = performance.now();
        (window as any).performanceData.animationFrames.push(frameTime);
        return originalRAF(callback);
      };
      
      // Track user interactions
      ['click', 'input', 'keydown', 'touchstart'].forEach(eventType => {
        document.addEventListener(eventType, (event) => {
          (window as any).performanceData.interactions.push({
            type: eventType,
            timestamp: performance.now(),
            target: event.target?.tagName || 'unknown'
          });
        }, { passive: true });
      });
      
      // Track performance marks
      const originalMark = performance.mark;
      performance.mark = (name: string) => {
        (window as any).performanceData.marks.set(name, performance.now());
        return originalMark(name);
      };
      
      // Track performance measures
      const originalMeasure = performance.measure;
      performance.measure = (name: string, startMark?: string, endMark?: string) => {
        const result = originalMeasure(name, startMark, endMark);
        (window as any).performanceData.measures.set(name, {
          duration: result.duration,
          startTime: result.startTime
        });
        return result;
      };
    });
  }
  
  /**
   * Measure page load performance
   */
  async measurePageLoadPerformance(): Promise<PerformanceMetrics> {
    const performanceData = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        loadTime: navigation.loadEventEnd - navigation.navigationStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
      };
    });
    
    // Get Web Vitals if available
    const webVitals = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {
          largestContentfulPaint: 0,
          cumulativeLayoutShift: 0,
          firstInputDelay: 0,
          totalBlockingTime: 0
        };
        
        // Try to get LCP
        if ('PerformanceObserver' in window) {
          try {
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const lastEntry = entries[entries.length - 1];
              vitals.largestContentfulPaint = lastEntry.startTime;
            }).observe({ entryTypes: ['largest-contentful-paint'] });
          } catch (e) {}
          
          try {
            new PerformanceObserver((list) => {
              let clsValue = 0;
              for (const entry of list.getEntries()) {
                if (!(entry as any).hadRecentInput) {
                  clsValue += (entry as any).value;
                }
              }
              vitals.cumulativeLayoutShift = clsValue;
            }).observe({ entryTypes: ['layout-shift'] });
          } catch (e) {}
        }
        
        // Resolve after a short delay to collect some data
        setTimeout(() => resolve(vitals), 1000);
      });
    });
    
    return {
      loadTime: performanceData.loadTime,
      firstPaint: performanceData.firstPaint,
      firstContentfulPaint: performanceData.firstContentfulPaint,
      largestContentfulPaint: (webVitals as any).largestContentfulPaint,
      cumulativeLayoutShift: (webVitals as any).cumulativeLayoutShift,
      firstInputDelay: (webVitals as any).firstInputDelay,
      totalBlockingTime: (webVitals as any).totalBlockingTime
    };
  }
  
  /**
   * Measure button click responsiveness
   */
  async measureButtonClickResponsiveness(button: Locator): Promise<number> {
    await this.page.evaluate(() => {
      performance.mark('button-click-start');
    });
    
    await button.click();
    
    // Wait for visual feedback (disabled state or other change)
    await this.page.waitForTimeout(50);
    
    const responseTime = await this.page.evaluate(() => {
      performance.mark('button-click-end');
      performance.measure('button-click-time', 'button-click-start', 'button-click-end');
      
      const measure = performance.getEntriesByName('button-click-time')[0];
      return measure.duration;
    });
    
    return responseTime;
  }
  
  /**
   * Measure input field responsiveness
   */
  async measureInputResponsiveness(input: Locator, text: string): Promise<number> {
    await this.page.evaluate(() => {
      performance.mark('input-start');
    });
    
    await input.fill(text);
    
    const responseTime = await this.page.evaluate(() => {
      performance.mark('input-end');
      performance.measure('input-time', 'input-start', 'input-end');
      
      const measure = performance.getEntriesByName('input-time')[0];
      return measure.duration;
    });
    
    return responseTime;
  }
  
  /**
   * Measure page navigation performance
   */
  async measureNavigationPerformance(navigationFn: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await navigationFn();
    
    // Wait for page to be ready
    await this.page.waitForLoadState('domcontentloaded');
    
    return Date.now() - startTime;
  }
  
  /**
   * Get comprehensive responsiveness metrics
   */
  async getResponsivenessMetrics(): Promise<ResponsivenessMetrics> {
    const performanceData = await this.page.evaluate(() => {
      const data = (window as any).performanceData;
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        domContentLoadedTime: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        interactions: data.interactions || [],
        measures: Array.from(data.measures.entries()) || []
      };
    });
    
    // Calculate average interaction response times
    const buttonClickTimes = performanceData.measures
      .filter(([name]: [string, any]) => name.includes('button-click'))
      .map(([, data]: [string, any]) => data.duration);
    
    const inputTimes = performanceData.measures
      .filter(([name]: [string, any]) => name.includes('input'))
      .map(([, data]: [string, any]) => data.duration);
    
    const navigationTimes = performanceData.measures
      .filter(([name]: [string, any]) => name.includes('navigation'))
      .map(([, data]: [string, any]) => data.duration);
    
    return {
      buttonClickTime: buttonClickTimes.length > 0 ? 
        buttonClickTimes.reduce((a, b) => a + b, 0) / buttonClickTimes.length : 0,
      inputResponseTime: inputTimes.length > 0 ? 
        inputTimes.reduce((a, b) => a + b, 0) / inputTimes.length : 0,
      pageNavigationTime: navigationTimes.length > 0 ? 
        navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length : 0,
      domContentLoadedTime: performanceData.domContentLoadedTime
    };
  }
}

/**
 * Animation Testing Utilities
 */
export class AnimationUtils {
  private page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Test animation smoothness
   */
  async testAnimationSmoothness(
    trigger: () => Promise<void>,
    expectedDuration: number = 300
  ): Promise<AnimationMetrics> {
    // Reset animation frame tracking
    await this.page.evaluate(() => {
      (window as any).performanceData.animationFrames = [];
    });
    
    const startTime = Date.now();
    
    // Trigger animation
    await trigger();
    
    // Wait for expected animation duration + buffer
    await this.page.waitForTimeout(expectedDuration + 100);
    
    const endTime = Date.now();
    const actualDuration = endTime - startTime;
    
    // Get animation frame data
    const frameData = await this.page.evaluate(() => {
      return (window as any).performanceData.animationFrames || [];
    });
    
    // Calculate frame rate and smoothness
    let frameRate = 0;
    let droppedFrames = 0;
    let smoothness: 'smooth' | 'choppy' | 'blocked' = 'smooth';
    
    if (frameData.length > 1) {
      const totalAnimationTime = frameData[frameData.length - 1] - frameData[0];
      frameRate = (frameData.length - 1) / (totalAnimationTime / 1000);
      
      // Calculate frame intervals to detect dropped frames
      const frameIntervals = [];
      for (let i = 1; i < frameData.length; i++) {
        frameIntervals.push(frameData[i] - frameData[i - 1]);
      }
      
      // Count frames that took longer than 16.67ms (60fps)
      droppedFrames = frameIntervals.filter(interval => interval > 33).length; // Allow up to 30fps
      
      // Determine smoothness
      if (frameRate < 15) {
        smoothness = 'blocked';
      } else if (frameRate < 30 || droppedFrames > frameData.length * 0.2) {
        smoothness = 'choppy';
      }
    }
    
    return {
      duration: actualDuration,
      frameRate,
      droppedFrames,
      smoothness
    };
  }
  
  /**
   * Test hover animation performance
   */
  async testHoverAnimation(element: Locator): Promise<AnimationMetrics> {
    return await this.testAnimationSmoothness(async () => {
      await element.hover();
      await this.page.waitForTimeout(200); // Allow hover transition
    }, 200);
  }
  
  /**
   * Test loading animation performance
   */
  async testLoadingAnimation(element: Locator): Promise<AnimationMetrics> {
    return await this.testAnimationSmoothness(async () => {
      // Assuming element shows loading animation when clicked
      await element.click();
    }, 1000);
  }
  
  /**
   * Disable animations for consistent testing
   */
  async disableAnimations() {
    await this.page.addInitScript(() => {
      const style = document.createElement('style');
      style.textContent = `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `;
      document.head.appendChild(style);
    });
  }
  
  /**
   * Enable reduced motion for accessibility testing
   */
  async enableReducedMotion() {
    await this.page.emulateMedia({ reducedMotion: 'reduce' });
  }
}

/**
 * Memory and Resource Monitoring
 */
export class ResourceUtils {
  private page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  /**
   * Monitor memory usage during operations
   */
  async monitorMemoryUsage(operation: () => Promise<void>): Promise<{
    beforeMemory: any,
    afterMemory: any,
    memoryIncrease: number
  }> {
    // Get initial memory
    const beforeMemory = await this.page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });
    
    // Perform operation
    await operation();
    
    // Force garbage collection if possible
    await this.page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });
    
    // Get final memory
    const afterMemory = await this.page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null;
    });
    
    const memoryIncrease = afterMemory && beforeMemory ? 
      afterMemory.usedJSHeapSize - beforeMemory.usedJSHeapSize : 0;
    
    return {
      beforeMemory,
      afterMemory,
      memoryIncrease
    };
  }
  
  /**
   * Monitor network requests during operation
   */
  async monitorNetworkRequests(operation: () => Promise<void>): Promise<{
    requestCount: number,
    totalSize: number,
    averageResponseTime: number,
    failedRequests: number
  }> {
    const requests: Array<{
      url: string,
      method: string,
      status: number,
      size: number,
      responseTime: number
    }> = [];
    
    // Monitor requests
    this.page.on('request', request => {
      (request as any).startTime = Date.now();
    });
    
    this.page.on('response', response => {
      const request = response.request();
      const responseTime = Date.now() - ((request as any).startTime || Date.now());
      
      requests.push({
        url: response.url(),
        method: request.method(),
        status: response.status(),
        size: parseInt(response.headers()['content-length'] || '0'),
        responseTime
      });
    });
    
    // Perform operation
    await operation();
    
    // Calculate metrics
    const totalSize = requests.reduce((sum, req) => sum + req.size, 0);
    const averageResponseTime = requests.length > 0 ? 
      requests.reduce((sum, req) => sum + req.responseTime, 0) / requests.length : 0;
    const failedRequests = requests.filter(req => req.status >= 400).length;
    
    return {
      requestCount: requests.length,
      totalSize,
      averageResponseTime,
      failedRequests
    };
  }
}

/**
 * Comprehensive Performance Test Suite
 */
export class PerformanceTestSuite {
  private performanceUtils: PerformanceUtils;
  private animationUtils: AnimationUtils;
  private resourceUtils: ResourceUtils;
  
  constructor(page: Page) {
    this.performanceUtils = new PerformanceUtils(page);
    this.animationUtils = new AnimationUtils(page);
    this.resourceUtils = new ResourceUtils(page);
  }
  
  /**
   * Run complete performance test suite
   */
  async runCompletePerformanceTest() {
    await this.performanceUtils.initializePerformanceMonitoring();
    
    const results = {
      pageLoad: await this.performanceUtils.measurePageLoadPerformance(),
      responsiveness: await this.performanceUtils.getResponsivenessMetrics(),
      memory: null as any,
      network: null as any
    };
    
    // Memory test
    results.memory = await this.resourceUtils.monitorMemoryUsage(async () => {
      // Simulate typical user interactions
      await this.performanceUtils.page.waitForTimeout(1000);
    });
    
    // Network test
    results.network = await this.resourceUtils.monitorNetworkRequests(async () => {
      await this.performanceUtils.page.reload();
      await this.performanceUtils.page.waitForLoadState('domcontentloaded');
    });
    
    return results;
  }
  
  /**
   * Validate performance meets professional standards
   */
  validatePerformanceStandards(metrics: any): { passed: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Page load performance standards
    if (metrics.pageLoad.loadTime > 3000) {
      issues.push(`Page load time too slow: ${metrics.pageLoad.loadTime}ms`);
    }
    
    if (metrics.pageLoad.firstContentfulPaint > 1500) {
      issues.push(`First Contentful Paint too slow: ${metrics.pageLoad.firstContentfulPaint}ms`);
    }
    
    // Responsiveness standards
    if (metrics.responsiveness.buttonClickTime > 100) {
      issues.push(`Button response too slow: ${metrics.responsiveness.buttonClickTime}ms`);
    }
    
    if (metrics.responsiveness.inputResponseTime > 50) {
      issues.push(`Input response too slow: ${metrics.responsiveness.inputResponseTime}ms`);
    }
    
    // Memory standards
    if (metrics.memory.memoryIncrease > 50 * 1024 * 1024) { // 50MB
      issues.push(`Memory increase too high: ${metrics.memory.memoryIncrease / 1024 / 1024}MB`);
    }
    
    // Network standards
    if (metrics.network.averageResponseTime > 1000) {
      issues.push(`Network response too slow: ${metrics.network.averageResponseTime}ms`);
    }
    
    if (metrics.network.failedRequests > 0) {
      issues.push(`Failed network requests: ${metrics.network.failedRequests}`);
    }
    
    return {
      passed: issues.length === 0,
      issues
    };
  }
}

export {
  PerformanceUtils,
  AnimationUtils,
  ResourceUtils
};
