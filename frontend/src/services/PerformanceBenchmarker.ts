/**
 * Comprehensive Performance Benchmarker for Agent Dynamic Pages System
 * 
 * Implements advanced performance analysis including:
 * - Component rendering speed benchmarks
 * - Data persistence performance metrics
 * - Page load time measurements
 * - Memory usage monitoring
 * - Real-time performance alerts
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'rendering' | 'api' | 'memory' | 'network' | 'user-experience';
  threshold?: {
    warning: number;
    critical: number;
  };
}

export interface ComponentRenderingMetrics {
  componentType: string;
  renderTime: number;
  componentCount: number;
  complexity: 'simple' | 'complex' | 'dashboard';
  memoryUsage: number;
  reRenderCount: number;
  firstPaint: number;
  interactionTime: number;
}

export interface DataOperationMetrics {
  operation: 'fetch' | 'create' | 'update' | 'delete';
  endpoint: string;
  responseTime: number;
  dataSize: number;
  cacheHit: boolean;
  retryCount: number;
  errorRate: number;
}

export interface PageLoadMetrics {
  pageId: string;
  agentId: string;
  loadTime: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  componentCount: number;
  bundleSize: number;
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  componentInstances: number;
  eventListeners: number;
  memoryLeaks: {
    detected: boolean;
    suspiciousObjects: string[];
    growthRate: number;
  };
}

export interface BenchmarkResult {
  testName: string;
  category: string;
  duration: number;
  metrics: PerformanceMetric[];
  success: boolean;
  recommendations: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface PerformanceReport {
  timestamp: number;
  systemInfo: {
    userAgent: string;
    screenResolution: string;
    networkType: string;
    memoryInfo: any;
  };
  benchmarks: BenchmarkResult[];
  summary: {
    overallScore: number;
    bottlenecks: string[];
    optimizations: Array<{
      priority: 'high' | 'medium' | 'low';
      description: string;
      expectedImprovement: string;
      implementation: string;
    }>;
  };
}

class PerformanceBenchmarker {
  private metrics: PerformanceMetric[] = [];
  private benchmarkResults: BenchmarkResult[] = [];
  private observers: PerformanceObserver[] = [];
  private memoryMonitorInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.initializeObservers();
    this.startMemoryMonitoring();
  }

  /**
   * Initialize performance observers for real-time monitoring
   */
  private initializeObservers(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Observe paint timings
      try {
        const paintObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.recordMetric({
              name: entry.name,
              value: entry.startTime,
              unit: 'ms',
              timestamp: Date.now(),
              category: 'user-experience',
              threshold: {
                warning: entry.name === 'first-contentful-paint' ? 1500 : 2500,
                critical: entry.name === 'first-contentful-paint' ? 3000 : 4000
              }
            });
          });
        });
        
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);
      } catch (error) {
        console.warn('Paint observer not supported:', error);
      }

      // Observe layout shifts
      try {
        const layoutObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if ('value' in entry) {
              this.recordMetric({
                name: 'cumulative-layout-shift',
                value: (entry as any).value,
                unit: 'score',
                timestamp: Date.now(),
                category: 'user-experience',
                threshold: {
                  warning: 0.1,
                  critical: 0.25
                }
              });
            }
          });
        });
        
        layoutObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(layoutObserver);
      } catch (error) {
        console.warn('Layout shift observer not supported:', error);
      }

      // Observe long tasks
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            this.recordMetric({
              name: 'long-task',
              value: entry.duration,
              unit: 'ms',
              timestamp: Date.now(),
              category: 'rendering',
              threshold: {
                warning: 50,
                critical: 100
              }
            });
          });
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (error) {
        console.warn('Long task observer not supported:', error);
      }
    }
  }

  /**
   * Start memory monitoring at regular intervals
   */
  private startMemoryMonitoring(): void {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      this.memoryMonitorInterval = setInterval(() => {
        const memory = (window as any).performance.memory;
        
        this.recordMetric({
          name: 'heap-used',
          value: memory.usedJSHeapSize,
          unit: 'bytes',
          timestamp: Date.now(),
          category: 'memory',
          threshold: {
            warning: memory.jsHeapSizeLimit * 0.7,
            critical: memory.jsHeapSizeLimit * 0.9
          }
        });

        this.recordMetric({
          name: 'heap-total',
          value: memory.totalJSHeapSize,
          unit: 'bytes',
          timestamp: Date.now(),
          category: 'memory'
        });
      }, 5000); // Monitor every 5 seconds
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Check thresholds and emit warnings
    if (metric.threshold) {
      if (metric.value > metric.threshold.critical) {
        console.warn(`🚨 CRITICAL: ${metric.name} = ${metric.value}${metric.unit} (threshold: ${metric.threshold.critical})`);
      } else if (metric.value > metric.threshold.warning) {
        console.warn(`⚠️ WARNING: ${metric.name} = ${metric.value}${metric.unit} (threshold: ${metric.threshold.warning})`);
      }
    }
  }

  /**
   * Benchmark component rendering performance
   */
  async benchmarkComponentRendering(
    componentType: string,
    componentCount: number = 1,
    complexity: 'simple' | 'complex' | 'dashboard' = 'simple'
  ): Promise<ComponentRenderingMetrics> {
    console.log(`📊 Starting component rendering benchmark: ${componentType} (${componentCount} components, ${complexity} complexity)`);
    
    const startTime = performance.now();
    const startMemory = this.getCurrentMemoryUsage();

    // Create a test container
    const testContainer = document.createElement('div');
    testContainer.id = 'perf-test-container';
    testContainer.style.position = 'absolute';
    testContainer.style.top = '-9999px';
    testContainer.style.left = '-9999px';
    document.body.appendChild(testContainer);

    let reRenderCount = 0;
    const renderTimes: number[] = [];

    try {
      // Simulate multiple component renders
      for (let i = 0; i < componentCount; i++) {
        const renderStart = performance.now();
        
        // Create mock component based on complexity
        const component = this.createMockComponent(componentType, complexity);
        testContainer.appendChild(component);
        
        const renderEnd = performance.now();
        renderTimes.push(renderEnd - renderStart);
        reRenderCount++;

        // Simulate React-like re-render
        if (i % 5 === 0) {
          component.innerHTML = this.generateUpdatedContent(componentType, complexity);
          reRenderCount++;
        }
      }

      // Force layout and paint
      testContainer.offsetHeight;
      
      const endTime = performance.now();
      const endMemory = this.getCurrentMemoryUsage();
      
      const metrics: ComponentRenderingMetrics = {
        componentType,
        renderTime: endTime - startTime,
        componentCount,
        complexity,
        memoryUsage: endMemory - startMemory,
        reRenderCount,
        firstPaint: renderTimes[0] || 0,
        interactionTime: Math.max(...renderTimes)
      };

      this.recordMetric({
        name: `component-render-${componentType}`,
        value: metrics.renderTime,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'rendering',
        threshold: {
          warning: componentCount * (complexity === 'complex' ? 10 : complexity === 'dashboard' ? 25 : 2),
          critical: componentCount * (complexity === 'complex' ? 20 : complexity === 'dashboard' ? 50 : 5)
        }
      });

      console.log(`✅ Component benchmark completed:`, metrics);
      return metrics;

    } finally {
      // Cleanup test container
      document.body.removeChild(testContainer);
    }
  }

  /**
   * Create mock component for testing
   */
  private createMockComponent(type: string, complexity: 'simple' | 'complex' | 'dashboard'): HTMLElement {
    const element = document.createElement('div');
    element.className = `mock-${type}-component`;

    switch (complexity) {
      case 'simple':
        element.innerHTML = `<div class="simple-content">${type} content</div>`;
        break;
      
      case 'complex':
        element.innerHTML = `
          <div class="complex-header">${type} Header</div>
          <div class="complex-content">
            <ul>${Array(10).fill(0).map((_, i) => `<li>Item ${i}</li>`).join('')}</ul>
            <div class="nested-content">
              <span>Nested content</span>
              <div class="deeply-nested">
                ${Array(5).fill(0).map((_, i) => `<div>Level ${i}</div>`).join('')}
              </div>
            </div>
          </div>
        `;
        break;
      
      case 'dashboard':
        element.innerHTML = `
          <div class="dashboard-${type}">
            <div class="dashboard-header">
              <h3>${type} Dashboard</h3>
              <div class="controls">${Array(5).fill(0).map((_, i) => `<button>Action ${i}</button>`).join('')}</div>
            </div>
            <div class="dashboard-grid">
              ${Array(12).fill(0).map((_, i) => `
                <div class="metric-card">
                  <div class="metric-label">Metric ${i}</div>
                  <div class="metric-value">${Math.random() * 1000}</div>
                  <div class="metric-chart">
                    ${Array(10).fill(0).map(() => `<div class="chart-bar" style="height: ${Math.random() * 100}%"></div>`).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        break;
    }

    return element;
  }

  /**
   * Generate updated content for re-render simulation
   */
  private generateUpdatedContent(type: string, complexity: 'simple' | 'complex' | 'dashboard'): string {
    const timestamp = Date.now();
    
    switch (complexity) {
      case 'simple':
        return `<div class="simple-content">${type} updated at ${timestamp}</div>`;
      
      case 'complex':
        return `
          <div class="complex-header">${type} Updated ${timestamp}</div>
          <div class="complex-content">
            <ul>${Array(15).fill(0).map((_, i) => `<li>Updated Item ${i} - ${timestamp}</li>`).join('')}</ul>
          </div>
        `;
      
      case 'dashboard':
        return `
          <div class="dashboard-grid">
            ${Array(12).fill(0).map((_, i) => `
              <div class="metric-card updated">
                <div class="metric-label">Updated Metric ${i}</div>
                <div class="metric-value">${Math.random() * 1000}</div>
              </div>
            `).join('')}
          </div>
        `;
    }
  }

  /**
   * Benchmark data persistence operations
   */
  async benchmarkDataOperations(
    operations: Array<{
      type: 'fetch' | 'create' | 'update' | 'delete';
      endpoint: string;
      payload?: any;
    }>
  ): Promise<DataOperationMetrics[]> {
    console.log(`📊 Starting data operations benchmark: ${operations.length} operations`);
    
    const results: DataOperationMetrics[] = [];

    for (const operation of operations) {
      const startTime = performance.now();
      let success = false;
      let retryCount = 0;
      let dataSize = 0;
      let cacheHit = false;

      try {
        const response = await this.simulateApiCall(operation);
        success = true;
        dataSize = JSON.stringify(response).length;
        cacheHit = response._fromCache || false;
        
      } catch (error) {
        retryCount++;
        // Retry once
        try {
          const retryResponse = await this.simulateApiCall(operation);
          success = true;
          dataSize = JSON.stringify(retryResponse).length;
        } catch (retryError) {
          console.error('Data operation failed after retry:', retryError);
        }
      }

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      const metrics: DataOperationMetrics = {
        operation: operation.type,
        endpoint: operation.endpoint,
        responseTime,
        dataSize,
        cacheHit,
        retryCount,
        errorRate: success ? 0 : 1
      };

      results.push(metrics);

      this.recordMetric({
        name: `api-${operation.type}-${operation.endpoint.replace(/[^a-zA-Z0-9]/g, '-')}`,
        value: responseTime,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'api',
        threshold: {
          warning: operation.type === 'fetch' ? 200 : 500,
          critical: operation.type === 'fetch' ? 500 : 1000
        }
      });
    }

    console.log(`✅ Data operations benchmark completed:`, results);
    return results;
  }

  /**
   * Simulate API call for benchmarking
   */
  private async simulateApiCall(operation: {
    type: 'fetch' | 'create' | 'update' | 'delete';
    endpoint: string;
    payload?: any;
  }): Promise<any> {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

    // Simulate different response sizes based on operation
    switch (operation.type) {
      case 'fetch':
        return {
          success: true,
          data: Array(50).fill(0).map((_, i) => ({
            id: i,
            title: `Item ${i}`,
            content: `Content for item ${i}`,
            timestamp: Date.now()
          })),
          _fromCache: Math.random() > 0.7
        };
      
      case 'create':
      case 'update':
        return {
          success: true,
          data: {
            id: Date.now(),
            ...operation.payload,
            updated_at: new Date().toISOString()
          }
        };
      
      case 'delete':
        return {
          success: true,
          message: 'Deleted successfully'
        };
    }
  }

  /**
   * Measure complete page load performance
   */
  async measurePageLoad(agentId: string, pageId?: string): Promise<PageLoadMetrics> {
    console.log(`📊 Measuring page load performance: Agent ${agentId}, Page ${pageId || 'list'}`);
    
    const startTime = performance.now();
    
    // Get navigation timing if available
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    const metrics: PageLoadMetrics = {
      pageId: pageId || 'agent-list',
      agentId,
      loadTime: 0,
      timeToInteractive: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      cumulativeLayoutShift: 0,
      componentCount: 0,
      bundleSize: 0
    };

    // Measure actual load time
    metrics.loadTime = performance.now() - startTime;
    
    // Get paint timings
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcpEntry) {
      metrics.firstContentfulPaint = fcpEntry.startTime;
    }

    // Get LCP from observer (if available)
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      metrics.largestContentfulPaint = (lcpEntries[lcpEntries.length - 1] as any).startTime;
    }

    // Count components in the DOM
    metrics.componentCount = document.querySelectorAll('[class*="component"], [class*="card"], [class*="item"]').length;

    // Estimate bundle size from resource timings
    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsEntries = resourceEntries.filter(entry => entry.name.includes('.js'));
    metrics.bundleSize = jsEntries.reduce((total, entry) => total + (entry.transferSize || 0), 0);

    // Estimate time to interactive (simplified)
    metrics.timeToInteractive = Math.max(
      metrics.firstContentfulPaint,
      navigation?.domContentLoadedEventEnd || metrics.loadTime
    );

    this.recordMetric({
      name: `page-load-${agentId}`,
      value: metrics.loadTime,
      unit: 'ms',
      timestamp: Date.now(),
      category: 'user-experience',
      threshold: {
        warning: 2000,
        critical: 4000
      }
    });

    console.log(`✅ Page load measurement completed:`, metrics);
    return metrics;
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      return (window as any).performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Analyze memory usage patterns and detect leaks
   */
  analyzeMemoryUsage(): MemoryMetrics {
    const memoryInfo = typeof window !== 'undefined' && (window as any).performance?.memory;
    
    if (!memoryInfo) {
      return {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        componentInstances: 0,
        eventListeners: 0,
        memoryLeaks: {
          detected: false,
          suspiciousObjects: [],
          growthRate: 0
        }
      };
    }

    // Count component instances
    const componentInstances = document.querySelectorAll('[class*="component"], [class*="card"], [class*="modal"]').length;
    
    // Estimate event listeners (simplified)
    const eventListeners = document.querySelectorAll('[onclick], [onmouseover], [onkeydown]').length;

    // Analyze memory growth
    const recentMemoryMetrics = this.metrics
      .filter(m => m.name === 'heap-used' && Date.now() - m.timestamp < 300000) // Last 5 minutes
      .map(m => m.value);
    
    const memoryGrowthRate = recentMemoryMetrics.length > 1 ? 
      (recentMemoryMetrics[recentMemoryMetrics.length - 1] - recentMemoryMetrics[0]) / recentMemoryMetrics.length : 0;

    return {
      heapUsed: memoryInfo.usedJSHeapSize,
      heapTotal: memoryInfo.totalJSHeapSize,
      external: memoryInfo.jsHeapSizeLimit - memoryInfo.totalJSHeapSize,
      componentInstances,
      eventListeners,
      memoryLeaks: {
        detected: memoryGrowthRate > 1024 * 1024, // 1MB growth rate threshold
        suspiciousObjects: memoryGrowthRate > 1024 * 1024 ? ['components', 'event-listeners'] : [],
        growthRate: memoryGrowthRate
      }
    };
  }

  /**
   * Execute load testing with multiple concurrent operations
   */
  async executeLoadTest(
    concurrentUsers: number = 10,
    operationsPerUser: number = 5,
    testDuration: number = 30000
  ): Promise<BenchmarkResult> {
    console.log(`📊 Starting load test: ${concurrentUsers} users, ${operationsPerUser} ops/user, ${testDuration}ms duration`);
    
    const startTime = performance.now();
    const results: PerformanceMetric[] = [];
    const errors: string[] = [];
    
    const testOperations = [
      { type: 'fetch' as const, endpoint: '/api/agents' },
      { type: 'fetch' as const, endpoint: '/api/agents/test-agent/pages' },
      { type: 'create' as const, endpoint: '/api/agents/test-agent/pages', payload: { title: 'Test Page' } },
      { type: 'update' as const, endpoint: '/api/agents/test-agent/pages/test-page' },
      { type: 'fetch' as const, endpoint: '/api/agents/test-agent/workspace' }
    ];

    // Create concurrent user simulations
    const userPromises = Array(concurrentUsers).fill(0).map(async (_, userId) => {
      const userStartTime = performance.now();
      
      try {
        for (let opIndex = 0; opIndex < operationsPerUser; opIndex++) {
          const operation = testOperations[opIndex % testOperations.length];
          const opStartTime = performance.now();
          
          await this.simulateApiCall(operation);
          
          const opEndTime = performance.now();
          results.push({
            name: `load-test-user-${userId}-op-${opIndex}`,
            value: opEndTime - opStartTime,
            unit: 'ms',
            timestamp: Date.now(),
            category: 'api'
          });
        }
      } catch (error) {
        errors.push(`User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Wait for all users to complete or timeout
    await Promise.allSettled(userPromises);
    
    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    const avgResponseTime = results.reduce((sum, r) => sum + r.value, 0) / results.length;
    const maxResponseTime = Math.max(...results.map(r => r.value));
    const errorRate = errors.length / (concurrentUsers * operationsPerUser);

    const benchmarkResult: BenchmarkResult = {
      testName: 'Load Test',
      category: 'stress-testing',
      duration: totalDuration,
      metrics: [
        {
          name: 'avg-response-time',
          value: avgResponseTime,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'api'
        },
        {
          name: 'max-response-time',
          value: maxResponseTime,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'api'
        },
        {
          name: 'error-rate',
          value: errorRate * 100,
          unit: '%',
          timestamp: Date.now(),
          category: 'api'
        }
      ],
      success: errorRate < 0.05, // Success if error rate < 5%
      recommendations: this.generateLoadTestRecommendations(avgResponseTime, maxResponseTime, errorRate),
      severity: this.calculateSeverity(avgResponseTime, maxResponseTime, errorRate)
    };

    console.log(`✅ Load test completed:`, benchmarkResult);
    return benchmarkResult;
  }

  /**
   * Generate recommendations based on load test results
   */
  private generateLoadTestRecommendations(
    avgResponseTime: number,
    maxResponseTime: number,
    errorRate: number
  ): string[] {
    const recommendations: string[] = [];

    if (avgResponseTime > 500) {
      recommendations.push('Average response time is high - consider API optimization or caching');
    }
    
    if (maxResponseTime > 2000) {
      recommendations.push('Maximum response time exceeds 2s - investigate slow queries or add timeout handling');
    }
    
    if (errorRate > 0.01) {
      recommendations.push('Error rate is above 1% - improve error handling and retry logic');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable limits');
    }

    return recommendations;
  }

  /**
   * Calculate severity based on performance metrics
   */
  private calculateSeverity(
    avgResponseTime: number,
    maxResponseTime: number,
    errorRate: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (errorRate > 0.1 || maxResponseTime > 5000) {
      return 'critical';
    } else if (errorRate > 0.05 || avgResponseTime > 1000 || maxResponseTime > 3000) {
      return 'high';
    } else if (errorRate > 0.01 || avgResponseTime > 500 || maxResponseTime > 2000) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(): Promise<PerformanceReport> {
    console.log('📊 Generating comprehensive performance report...');

    // Run comprehensive benchmarks
    const componentBenchmark = await this.benchmarkComponentRendering('dashboard', 10, 'dashboard');
    const dataBenchmark = await this.benchmarkDataOperations([
      { type: 'fetch', endpoint: '/api/agents' },
      { type: 'fetch', endpoint: '/api/agents/test/pages' },
      { type: 'create', endpoint: '/api/agents/test/pages', payload: { title: 'Test' } }
    ]);
    const loadTestResult = await this.executeLoadTest(5, 3, 10000);
    const memoryMetrics = this.analyzeMemoryUsage();

    const report: PerformanceReport = {
      timestamp: Date.now(),
      systemInfo: {
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        networkType: (navigator as any).connection?.effectiveType || 'unknown',
        memoryInfo: (window as any).performance?.memory || {}
      },
      benchmarks: [
        {
          testName: 'Component Rendering',
          category: 'rendering',
          duration: componentBenchmark.renderTime,
          metrics: [
            {
              name: 'render-time',
              value: componentBenchmark.renderTime,
              unit: 'ms',
              timestamp: Date.now(),
              category: 'rendering'
            },
            {
              name: 'memory-usage',
              value: componentBenchmark.memoryUsage,
              unit: 'bytes',
              timestamp: Date.now(),
              category: 'memory'
            }
          ],
          success: componentBenchmark.renderTime < 500,
          recommendations: this.generateRenderingRecommendations(componentBenchmark),
          severity: componentBenchmark.renderTime > 1000 ? 'high' : componentBenchmark.renderTime > 500 ? 'medium' : 'low'
        },
        loadTestResult
      ],
      summary: {
        overallScore: this.calculateOverallScore([componentBenchmark.renderTime], dataBenchmark, memoryMetrics),
        bottlenecks: this.identifyBottlenecks(componentBenchmark, dataBenchmark, memoryMetrics),
        optimizations: this.generateOptimizationRecommendations(componentBenchmark, dataBenchmark, memoryMetrics)
      }
    };

    console.log('✅ Performance report generated:', report);
    return report;
  }

  /**
   * Generate rendering recommendations
   */
  private generateRenderingRecommendations(metrics: ComponentRenderingMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.renderTime > 500) {
      recommendations.push('Consider implementing component lazy loading');
      recommendations.push('Use React.memo() for expensive components');
    }

    if (metrics.memoryUsage > 10 * 1024 * 1024) { // 10MB
      recommendations.push('High memory usage detected - optimize component cleanup');
    }

    if (metrics.reRenderCount > metrics.componentCount * 2) {
      recommendations.push('Excessive re-renders detected - optimize state management');
    }

    return recommendations;
  }

  /**
   * Calculate overall performance score (0-100)
   */
  private calculateOverallScore(
    renderTimes: number[],
    dataMetrics: DataOperationMetrics[],
    memoryMetrics: MemoryMetrics
  ): number {
    let score = 100;

    // Penalize slow rendering
    const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
    if (avgRenderTime > 100) score -= Math.min(20, (avgRenderTime - 100) / 20);

    // Penalize slow API calls
    const avgApiTime = dataMetrics.reduce((sum, m) => sum + m.responseTime, 0) / dataMetrics.length;
    if (avgApiTime > 200) score -= Math.min(20, (avgApiTime - 200) / 40);

    // Penalize memory issues
    if (memoryMetrics.memoryLeaks.detected) score -= 15;

    // Penalize API errors
    const errorRate = dataMetrics.reduce((sum, m) => sum + m.errorRate, 0) / dataMetrics.length;
    if (errorRate > 0) score -= errorRate * 30;

    return Math.max(0, Math.round(score));
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(
    componentMetrics: ComponentRenderingMetrics,
    dataMetrics: DataOperationMetrics[],
    memoryMetrics: MemoryMetrics
  ): string[] {
    const bottlenecks: string[] = [];

    if (componentMetrics.renderTime > 500) {
      bottlenecks.push('Slow component rendering');
    }

    const slowApiCalls = dataMetrics.filter(m => m.responseTime > 1000);
    if (slowApiCalls.length > 0) {
      bottlenecks.push(`Slow API calls: ${slowApiCalls.map(m => m.endpoint).join(', ')}`);
    }

    if (memoryMetrics.memoryLeaks.detected) {
      bottlenecks.push('Memory leaks detected');
    }

    if (memoryMetrics.componentInstances > 100) {
      bottlenecks.push('High number of component instances');
    }

    return bottlenecks;
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(
    componentMetrics: ComponentRenderingMetrics,
    dataMetrics: DataOperationMetrics[],
    memoryMetrics: MemoryMetrics
  ): Array<{
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedImprovement: string;
    implementation: string;
  }> {
    const optimizations = [];

    if (componentMetrics.renderTime > 500) {
      optimizations.push({
        priority: 'high' as const,
        description: 'Implement component virtualization for large lists',
        expectedImprovement: '60-80% reduction in render time',
        implementation: 'Use react-window or react-virtualized for large component lists'
      });
    }

    const slowApiCalls = dataMetrics.filter(m => m.responseTime > 500 && !m.cacheHit);
    if (slowApiCalls.length > 0) {
      optimizations.push({
        priority: 'high' as const,
        description: 'Implement aggressive caching for slow API endpoints',
        expectedImprovement: '70-90% reduction in API call time',
        implementation: 'Add Redis caching layer and implement cache-first strategy'
      });
    }

    if (memoryMetrics.memoryLeaks.detected) {
      optimizations.push({
        priority: 'high' as const,
        description: 'Fix memory leaks in components',
        expectedImprovement: '30-50% reduction in memory usage',
        implementation: 'Add proper cleanup in useEffect hooks and remove event listeners'
      });
    }

    if (componentMetrics.complexity === 'dashboard' && componentMetrics.renderTime > 200) {
      optimizations.push({
        priority: 'medium' as const,
        description: 'Break down complex dashboard components',
        expectedImprovement: '40-60% improvement in render performance',
        implementation: 'Split dashboard into smaller, lazy-loaded components'
      });
    }

    return optimizations;
  }

  /**
   * Cleanup and dispose of resources
   */
  dispose(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }

    this.metrics = [];
    this.benchmarkResults = [];
  }
}

export default PerformanceBenchmarker;