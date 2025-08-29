import { Page } from '@playwright/test';

export interface BrowserCompatibilityReport {
  browserResults: { [browserName: string]: BrowserTestResult };
  deviceResults: { [deviceName: string]: DeviceTestResult };
  overallCompatibilityScore: number;
  platformIssues: PlatformIssue[];
  performanceComparison: PerformanceComparison;
  featureSupport: FeatureSupport;
}

export interface BrowserTestResult {
  browserName: string;
  browserVersion: string;
  engineName: string;
  stormPrevention: boolean;
  performanceScore: number;
  compatibilityIssues: string[];
  testsPassed: number;
  testsTotal: number;
  averageResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface DeviceTestResult {
  deviceName: string;
  viewport: { width: number; height: number };
  stormPrevention: boolean;
  touchCompatibility: number;
  orientationStability: number;
  performanceScore: number;
  testsPassed: number;
  testsTotal: number;
}

export interface PlatformIssue {
  platform: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  workaround?: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  affectedFeatures: string[];
}

export interface PerformanceComparison {
  browserMetrics: { [browserName: string]: BrowserPerformanceMetrics };
  performanceVariance: number;
  fastestBrowser: string;
  slowestBrowser: string;
  memoryEfficiencyRanking: string[];
}

export interface BrowserPerformanceMetrics {
  averageResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  throughput: number;
  errorRate: number;
}

export interface FeatureSupport {
  websocketSupport: { [browserName: string]: boolean };
  eventSourceSupport: { [browserName: string]: boolean };
  performanceAPISupport: { [browserName: string]: boolean };
  webWorkersSupport: { [browserName: string]: boolean };
  modernJSSupport: { [browserName: string]: boolean };
}

export class BrowserCompatibilityTracker {
  private browserResults: Map<string, BrowserTestResult> = new Map();
  private deviceResults: Map<string, DeviceTestResult> = new Map();
  private currentTest: string = '';
  private testStartTime: number = 0;
  private platformIssues: PlatformIssue[] = [];

  async startBrowserTest(browserName: string, engineName: string): Promise<void> {
    this.currentTest = browserName;
    this.testStartTime = Date.now();
    
    if (!this.browserResults.has(browserName)) {
      this.browserResults.set(browserName, {
        browserName,
        browserVersion: 'Unknown',
        engineName,
        stormPrevention: false,
        performanceScore: 0,
        compatibilityIssues: [],
        testsPassed: 0,
        testsTotal: 0,
        averageResponseTime: 0,
        memoryUsage: 0,
        cpuUsage: 0
      });
    }
  }

  async recordBrowserResult(browserName: string, result: {
    stormPrevention: boolean;
    performanceScore: number;
    compatibilityIssues: string[];
  }): Promise<void> {
    const browserResult = this.browserResults.get(browserName);
    if (!browserResult) return;

    browserResult.stormPrevention = result.stormPrevention;
    browserResult.performanceScore = result.performanceScore;
    browserResult.compatibilityIssues.push(...result.compatibilityIssues);
    browserResult.testsTotal++;
    
    if (result.stormPrevention) {
      browserResult.testsPassed++;
    }

    // Record any browser-specific issues
    if (result.compatibilityIssues.length > 0) {
      result.compatibilityIssues.forEach(issue => {
        this.platformIssues.push({
          platform: browserName,
          severity: 'medium',
          description: issue,
          impact: 'low',
          affectedFeatures: ['escape-sequence-prevention']
        });
      });
    }
  }

  async startDeviceTest(deviceName: string): Promise<void> {
    this.currentTest = deviceName;
    this.testStartTime = Date.now();
    
    if (!this.deviceResults.has(deviceName)) {
      this.deviceResults.set(deviceName, {
        deviceName,
        viewport: { width: 0, height: 0 },
        stormPrevention: false,
        touchCompatibility: 0,
        orientationStability: 0,
        performanceScore: 0,
        testsPassed: 0,
        testsTotal: 0
      });
    }
  }

  async recordDeviceResult(deviceName: string, result: {
    stormPrevention: boolean;
    touchCompatibility: number;
    orientationStability: number;
  }): Promise<void> {
    const deviceResult = this.deviceResults.get(deviceName);
    if (!deviceResult) return;

    deviceResult.stormPrevention = result.stormPrevention;
    deviceResult.touchCompatibility = result.touchCompatibility;
    deviceResult.orientationStability = result.orientationStability;
    deviceResult.testsTotal++;
    
    if (result.stormPrevention) {
      deviceResult.testsPassed++;
    }
  }

  async generateReport(): Promise<BrowserCompatibilityReport> {
    const overallScore = this.calculateOverallCompatibilityScore();
    const performanceComparison = this.generatePerformanceComparison();
    const featureSupport = await this.analyzeFeatureSupport();
    
    return {
      browserResults: Object.fromEntries(this.browserResults),
      deviceResults: Object.fromEntries(this.deviceResults),
      overallCompatibilityScore: overallScore,
      platformIssues: this.platformIssues,
      performanceComparison,
      featureSupport
    };
  }

  async getIssuesReport(): Promise<{
    knownIssues: PlatformIssue[];
    criticalIssues: PlatformIssue[];
    browserSpecificIssues: { [browserName: string]: PlatformIssue[] };
  }> {
    const criticalIssues = this.platformIssues.filter(issue => issue.severity === 'critical');
    const browserSpecificIssues: { [browserName: string]: PlatformIssue[] } = {};
    
    // Group issues by browser
    for (const issue of this.platformIssues) {
      if (!browserSpecificIssues[issue.platform]) {
        browserSpecificIssues[issue.platform] = [];
      }
      browserSpecificIssues[issue.platform].push(issue);
    }
    
    // Add known browser-specific issues
    this.addKnownBrowserIssues();
    
    return {
      knownIssues: this.platformIssues,
      criticalIssues,
      browserSpecificIssues
    };
  }

  async getPerformanceReport(): Promise<{
    browserMetrics: { [browserName: string]: BrowserPerformanceMetrics };
    performanceRanking: string[];
    performanceVariance: number;
  }> {
    const browserMetrics: { [browserName: string]: BrowserPerformanceMetrics } = {};
    
    for (const [browserName, result] of this.browserResults) {
      browserMetrics[browserName] = {
        averageResponseTime: result.averageResponseTime,
        memoryUsage: result.memoryUsage,
        cpuUsage: result.cpuUsage,
        throughput: this.calculateThroughput(result),
        errorRate: this.calculateErrorRate(result)
      };
    }
    
    const performanceRanking = this.rankBrowsersByPerformance(browserMetrics);
    const performanceVariance = this.calculatePerformanceVariance(browserMetrics);
    
    return {
      browserMetrics,
      performanceRanking,
      performanceVariance
    };
  }

  private calculateOverallCompatibilityScore(): number {
    if (this.browserResults.size === 0 && this.deviceResults.size === 0) {
      return 0;
    }
    
    let totalScore = 0;
    let totalTests = 0;
    
    // Browser compatibility score
    for (const result of this.browserResults.values()) {
      const browserScore = result.testsTotal > 0 ? (result.testsPassed / result.testsTotal) : 0;
      totalScore += browserScore * 0.7; // 70% weight for browser tests
      totalTests += 0.7;
    }
    
    // Device compatibility score
    for (const result of this.deviceResults.values()) {
      const deviceScore = result.testsTotal > 0 ? (result.testsPassed / result.testsTotal) : 0;
      totalScore += deviceScore * 0.3; // 30% weight for device tests
      totalTests += 0.3;
    }
    
    return totalTests > 0 ? (totalScore / totalTests) : 0;
  }

  private generatePerformanceComparison(): PerformanceComparison {
    const browserMetrics: { [browserName: string]: BrowserPerformanceMetrics } = {};
    
    for (const [browserName, result] of this.browserResults) {
      browserMetrics[browserName] = {
        averageResponseTime: result.averageResponseTime,
        memoryUsage: result.memoryUsage,
        cpuUsage: result.cpuUsage,
        throughput: this.calculateThroughput(result),
        errorRate: this.calculateErrorRate(result)
      };
    }
    
    const performanceVariance = this.calculatePerformanceVariance(browserMetrics);
    const { fastest, slowest } = this.findPerformanceExtremes(browserMetrics);
    const memoryRanking = this.rankByMemoryEfficiency(browserMetrics);
    
    return {
      browserMetrics,
      performanceVariance,
      fastestBrowser: fastest,
      slowestBrowser: slowest,
      memoryEfficiencyRanking: memoryRanking
    };
  }

  private async analyzeFeatureSupport(): Promise<FeatureSupport> {
    // This would typically be collected during test execution
    // For now, return a default structure
    const browsers = Array.from(this.browserResults.keys());
    
    const featureSupport: FeatureSupport = {
      websocketSupport: {},
      eventSourceSupport: {},
      performanceAPISupport: {},
      webWorkersSupport: {},
      modernJSSupport: {}
    };
    
    for (const browser of browsers) {
      // Assume modern browsers support these features
      featureSupport.websocketSupport[browser] = true;
      featureSupport.eventSourceSupport[browser] = true;
      featureSupport.performanceAPISupport[browser] = !browser.includes('IE');
      featureSupport.webWorkersSupport[browser] = true;
      featureSupport.modernJSSupport[browser] = !browser.includes('IE');
    }
    
    return featureSupport;
  }

  private calculateThroughput(result: BrowserTestResult): number {
    // Calculate operations per second
    return result.testsTotal > 0 ? (result.testsPassed / (result.averageResponseTime / 1000)) : 0;
  }

  private calculateErrorRate(result: BrowserTestResult): number {
    return result.testsTotal > 0 ? ((result.testsTotal - result.testsPassed) / result.testsTotal) : 0;
  }

  private calculatePerformanceVariance(metrics: { [browserName: string]: BrowserPerformanceMetrics }): number {
    const responseTimes = Object.values(metrics).map(m => m.averageResponseTime);
    if (responseTimes.length < 2) return 0;
    
    const mean = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / responseTimes.length;
    
    return variance / mean; // Coefficient of variation
  }

  private findPerformanceExtremes(metrics: { [browserName: string]: BrowserPerformanceMetrics }): {
    fastest: string;
    slowest: string;
  } {
    let fastest = '';
    let slowest = '';
    let fastestTime = Infinity;
    let slowestTime = 0;
    
    for (const [browserName, metric] of Object.entries(metrics)) {
      if (metric.averageResponseTime < fastestTime) {
        fastestTime = metric.averageResponseTime;
        fastest = browserName;
      }
      
      if (metric.averageResponseTime > slowestTime) {
        slowestTime = metric.averageResponseTime;
        slowest = browserName;
      }
    }
    
    return { fastest, slowest };
  }

  private rankByMemoryEfficiency(metrics: { [browserName: string]: BrowserPerformanceMetrics }): string[] {
    return Object.entries(metrics)
      .sort(([, a], [, b]) => a.memoryUsage - b.memoryUsage)
      .map(([browserName]) => browserName);
  }

  private rankBrowsersByPerformance(metrics: { [browserName: string]: BrowserPerformanceMetrics }): string[] {
    // Rank by composite score: lower response time and memory usage is better
    return Object.entries(metrics)
      .map(([browserName, metric]) => ({
        browser: browserName,
        score: metric.averageResponseTime + (metric.memoryUsage / 1024 / 1024) // Response time + MB memory
      }))
      .sort((a, b) => a.score - b.score)
      .map(item => item.browser);
  }

  private addKnownBrowserIssues(): void {
    // Add known browser-specific issues
    const knownIssues: PlatformIssue[] = [
      {
        platform: 'firefox',
        severity: 'low',
        description: 'Firefox may have slight differences in terminal rendering with certain escape sequences',
        workaround: 'Use standardized ANSI escape sequences',
        impact: 'low',
        affectedFeatures: ['terminal-display']
      },
      {
        platform: 'webkit',
        severity: 'medium',
        description: 'Safari/WebKit may handle rapid DOM updates differently affecting terminal scrolling',
        workaround: 'Implement throttling for rapid updates',
        impact: 'medium',
        affectedFeatures: ['terminal-scrolling', 'performance']
      },
      {
        platform: 'chromium',
        severity: 'low',
        description: 'Chrome DevTools may show additional console messages during development',
        workaround: 'Filter development messages in production',
        impact: 'low',
        affectedFeatures: ['debugging']
      }
    ];
    
    // Only add issues for browsers that were actually tested
    for (const issue of knownIssues) {
      if (this.browserResults.has(issue.platform)) {
        this.platformIssues.push(issue);
      }
    }
  }

  // Utility methods for collecting browser information during tests
  async collectBrowserInfo(page: Page): Promise<{
    userAgent: string;
    browserName: string;
    browserVersion: string;
    engineName: string;
  }> {
    return await page.evaluate(() => {
      const userAgent = navigator.userAgent;
      let browserName = 'unknown';
      let browserVersion = 'unknown';
      let engineName = 'unknown';
      
      // Detect browser
      if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) {
        browserName = 'chrome';
        engineName = 'blink';
        const match = userAgent.match(/Chrome\/([0-9.]+)/);
        if (match) browserVersion = match[1];
      } else if (userAgent.includes('Firefox')) {
        browserName = 'firefox';
        engineName = 'gecko';
        const match = userAgent.match(/Firefox\/([0-9.]+)/);
        if (match) browserVersion = match[1];
      } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        browserName = 'safari';
        engineName = 'webkit';
        const match = userAgent.match(/Version\/([0-9.]+)/);
        if (match) browserVersion = match[1];
      } else if (userAgent.includes('Edge')) {
        browserName = 'edge';
        engineName = 'blink';
        const match = userAgent.match(/Edge\/([0-9.]+)/);
        if (match) browserVersion = match[1];
      }
      
      return {
        userAgent,
        browserName,
        browserVersion,
        engineName
      };
    });
  }

  async collectPerformanceMetrics(page: Page): Promise<{
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  }> {
    return await page.evaluate(() => {
      const performanceData = (window as any).__performanceTracker?.metrics || {};
      
      return {
        responseTime: performanceData.averageResponseTime || 0,
        memoryUsage: (window as any).performance?.memory?.usedJSHeapSize || 0,
        cpuUsage: 0 // Cannot measure actual CPU in browser
      };
    });
  }

  async recordBrowserPerformance(page: Page, browserName: string): Promise<void> {
    const perfMetrics = await this.collectPerformanceMetrics(page);
    const browserResult = this.browserResults.get(browserName);
    
    if (browserResult) {
      browserResult.averageResponseTime = perfMetrics.responseTime;
      browserResult.memoryUsage = perfMetrics.memoryUsage;
      browserResult.cpuUsage = perfMetrics.cpuUsage;
    }
  }

  // Method to check if a specific browser/feature combination is problematic
  hasBrowserIssue(browserName: string, feature: string): boolean {
    return this.platformIssues.some(issue => 
      issue.platform === browserName && 
      issue.affectedFeatures.includes(feature)
    );
  }

  // Method to get browser-specific workarounds
  getBrowserWorkarounds(browserName: string): string[] {
    return this.platformIssues
      .filter(issue => issue.platform === browserName && issue.workaround)
      .map(issue => issue.workaround!);
  }

  // Method to reset tracking state
  reset(): void {
    this.browserResults.clear();
    this.deviceResults.clear();
    this.platformIssues = [];
    this.currentTest = '';
    this.testStartTime = 0;
  }
}

export default BrowserCompatibilityTracker;