/**
 * NLD Performance Tracker
 * Monitors preview generation performance and identifies bottlenecks
 * Tracks DOM rendering, network requests, and user interactions
 */

export interface PerformanceMetric {
  id: string;
  timestamp: number;
  type: 'network' | 'render' | 'interaction' | 'memory' | 'cpu';
  component: string;
  operation: string;
  duration: number;
  metadata: {
    url?: string;
    size?: number;
    cacheHit?: boolean;
    userAgent?: string;
    sessionId?: string;
  };
  bottlenecks: PerformanceBottleneck[];
}

export interface PerformanceBottleneck {
  type: 'slow-network' | 'dom-thrashing' | 'memory-leak' | 'cpu-intensive' | 'cache-miss';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  recommendation: string;
}

export interface PerformanceProfile {
  component: string;
  averageLoadTime: number;
  p95LoadTime: number;
  errorRate: number;
  cacheHitRate: number;
  memoryUsage: number;
  renderBlocks: number;
  networkRequests: number;
  trends: {
    loadTime: number[]; // Last 100 measurements
    memoryUsage: number[];
    errorRate: number[];
  };
}

export interface PerformanceReport {
  summary: {
    totalRequests: number;
    averagePerformance: number;
    criticalIssues: number;
    improvementOpportunities: string[];
  };
  components: Record<string, PerformanceProfile>;
  bottlenecks: PerformanceBottleneck[];
  recommendations: PerformanceRecommendation[];
}

export interface PerformanceRecommendation {
  issue: string;
  solution: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: string;
  implementation: {
    effort: 'minimal' | 'moderate' | 'significant';
    codeChanges: string;
    testing: string;
  };
}

export class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];
  private profiles: Map<string, PerformanceProfile> = new Map();
  private observer: PerformanceObserver | null = null;
  private memoryTracker: NodeJS.Timer | null = null;
  private startTime = performance.now();
  
  constructor() {
    this.initializeTracking();
  }

  /**
   * Initialize performance tracking
   */
  private initializeTracking() {
    if (typeof window === 'undefined') return;

    // Track navigation and resource timing
    this.setupResourceTracking();
    
    // Track DOM mutations and render performance
    this.setupRenderTracking();
    
    // Track memory usage
    this.setupMemoryTracking();
    
    // Track user interactions
    this.setupInteractionTracking();

    // Track Core Web Vitals
    this.setupWebVitalsTracking();
  }

  /**
   * Setup resource loading tracking
   */
  private setupResourceTracking() {
    if (!('PerformanceObserver' in window)) return;

    this.observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (this.isPreviewRelated(entry.name)) {
          this.recordMetric({
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'network',
            component: this.getComponentName(entry.name),
            operation: 'resource-load',
            duration: entry.duration,
            metadata: {
              url: entry.name,
              size: (entry as any).transferSize || 0,
              cacheHit: (entry as any).transferSize === 0
            },
            bottlenecks: this.analyzeResourceBottlenecks(entry)
          });
        }
      });
    });

    this.observer.observe({ entryTypes: ['resource', 'navigation', 'measure'] });
  }

  /**
   * Setup render performance tracking
   */
  private setupRenderTracking() {
    if (!('PerformanceObserver' in window)) return;

    // Track Long Tasks that might block rendering
    const longTaskObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.recordMetric({
          id: this.generateId(),
          timestamp: Date.now(),
          type: 'render',
          component: 'main-thread',
          operation: 'long-task',
          duration: entry.duration,
          metadata: {
            sessionId: this.getSessionId()
          },
          bottlenecks: [{
            type: 'cpu-intensive',
            severity: entry.duration > 100 ? 'high' : 'medium',
            description: `Main thread blocked for ${entry.duration}ms`,
            impact: 'Renders may be delayed, causing poor user experience',
            recommendation: 'Break up long tasks or use Web Workers'
          }]
        });
      });
    });

    longTaskObserver.observe({ entryTypes: ['longtask'] });

    // Track paint timing
    const paintObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name === 'first-contentful-paint' || entry.name === 'largest-contentful-paint') {
          this.recordMetric({
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'render',
            component: 'viewport',
            operation: entry.name,
            duration: entry.startTime,
            metadata: {
              sessionId: this.getSessionId()
            },
            bottlenecks: this.analyzePaintBottlenecks(entry)
          });
        }
      });
    });

    paintObserver.observe({ entryTypes: ['paint'] });
  }

  /**
   * Setup memory usage tracking
   */
  private setupMemoryTracking() {
    if (!('performance' in window) || !('memory' in performance)) return;

    this.memoryTracker = setInterval(() => {
      const memory = (performance as any).memory;
      
      this.recordMetric({
        id: this.generateId(),
        timestamp: Date.now(),
        type: 'memory',
        component: 'application',
        operation: 'memory-usage',
        duration: 0,
        metadata: {
          size: memory.usedJSHeapSize,
          sessionId: this.getSessionId()
        },
        bottlenecks: this.analyzeMemoryBottlenecks(memory)
      });
    }, 5000); // Check every 5 seconds
  }

  /**
   * Setup interaction tracking
   */
  private setupInteractionTracking() {
    // Track clicks on preview elements
    document.addEventListener('click', (event) => {
      const target = event.target as Element;
      if (this.isPreviewElement(target)) {
        const startTime = performance.now();
        
        // Measure time to visual feedback
        requestAnimationFrame(() => {
          const duration = performance.now() - startTime;
          
          this.recordMetric({
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'interaction',
            component: 'preview',
            operation: 'click-response',
            duration,
            metadata: {
              url: target.getAttribute('data-url') || '',
              sessionId: this.getSessionId()
            },
            bottlenecks: duration > 100 ? [{
              type: 'dom-thrashing',
              severity: 'medium',
              description: `Click response took ${duration}ms`,
              impact: 'Poor user experience due to slow interaction feedback',
              recommendation: 'Optimize DOM updates and use CSS transforms'
            }] : []
          });
        });
      }
    });

    // Track hover interactions for preview expansion
    document.addEventListener('mouseover', (event) => {
      const target = event.target as Element;
      if (this.isPreviewElement(target)) {
        const startTime = performance.now();
        
        // Measure expansion time
        const checkExpansion = () => {
          if (target.classList.contains('expanded')) {
            const duration = performance.now() - startTime;
            
            this.recordMetric({
              id: this.generateId(),
              timestamp: Date.now(),
              type: 'interaction',
              component: 'preview',
              operation: 'hover-expand',
              duration,
              metadata: {
                sessionId: this.getSessionId()
              },
              bottlenecks: duration > 200 ? [{
                type: 'dom-thrashing',
                severity: 'medium',
                description: `Preview expansion took ${duration}ms`,
                impact: 'Slow hover feedback affects user experience',
                recommendation: 'Pre-load expanded content or use CSS-only animations'
              }] : []
            });
          } else {
            // Check again in next frame
            requestAnimationFrame(checkExpansion);
          }
        };
        
        requestAnimationFrame(checkExpansion);
      }
    });
  }

  /**
   * Setup Web Vitals tracking
   */
  private setupWebVitalsTracking() {
    // Track Cumulative Layout Shift
    let cumulativeLayoutShift = 0;
    
    const layoutShiftObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (!(entry as any).hadRecentInput) {
          cumulativeLayoutShift += (entry as any).value;
          
          this.recordMetric({
            id: this.generateId(),
            timestamp: Date.now(),
            type: 'render',
            component: 'layout',
            operation: 'layout-shift',
            duration: (entry as any).value,
            metadata: {
              sessionId: this.getSessionId()
            },
            bottlenecks: (entry as any).value > 0.1 ? [{
              type: 'dom-thrashing',
              severity: 'high',
              description: `Layout shift detected: ${(entry as any).value}`,
              impact: 'Visual instability affects user experience',
              recommendation: 'Reserve space for dynamic content and use CSS transforms'
            }] : []
          });
        }
      });
    });

    layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
  }

  /**
   * Record performance metric
   */
  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    this.updateProfile(metric);
    
    // Keep only last 1000 metrics for memory management
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Update component performance profile
   */
  private updateProfile(metric: PerformanceMetric) {
    let profile = this.profiles.get(metric.component);
    
    if (!profile) {
      profile = {
        component: metric.component,
        averageLoadTime: 0,
        p95LoadTime: 0,
        errorRate: 0,
        cacheHitRate: 0,
        memoryUsage: 0,
        renderBlocks: 0,
        networkRequests: 0,
        trends: {
          loadTime: [],
          memoryUsage: [],
          errorRate: []
        }
      };
      this.profiles.set(metric.component, profile);
    }

    // Update metrics based on type
    switch (metric.type) {
      case 'network':
        profile.networkRequests++;
        profile.trends.loadTime.push(metric.duration);
        if (metric.metadata.cacheHit) {
          profile.cacheHitRate = (profile.cacheHitRate * (profile.networkRequests - 1) + 1) / profile.networkRequests;
        }
        break;
        
      case 'memory':
        profile.memoryUsage = metric.metadata.size || 0;
        profile.trends.memoryUsage.push(profile.memoryUsage);
        break;
        
      case 'render':
        if (metric.bottlenecks.length > 0) {
          profile.renderBlocks++;
        }
        break;
    }

    // Update averages
    if (profile.trends.loadTime.length > 0) {
      profile.averageLoadTime = profile.trends.loadTime.reduce((a, b) => a + b, 0) / profile.trends.loadTime.length;
      profile.p95LoadTime = this.calculatePercentile(profile.trends.loadTime, 0.95);
    }

    // Keep trends manageable
    if (profile.trends.loadTime.length > 100) {
      profile.trends.loadTime = profile.trends.loadTime.slice(-100);
      profile.trends.memoryUsage = profile.trends.memoryUsage.slice(-100);
      profile.trends.errorRate = profile.trends.errorRate.slice(-100);
    }
  }

  /**
   * Analyze resource loading bottlenecks
   */
  private analyzeResourceBottlenecks(entry: PerformanceEntry): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    const resourceEntry = entry as PerformanceResourceTiming;

    // Slow network
    if (entry.duration > 2000) {
      bottlenecks.push({
        type: 'slow-network',
        severity: entry.duration > 5000 ? 'critical' : 'high',
        description: `Resource took ${entry.duration}ms to load`,
        impact: 'Slow resource loading delays preview rendering',
        recommendation: 'Optimize images, use CDN, or implement lazy loading'
      });
    }

    // DNS resolution time
    if (resourceEntry.domainLookupEnd - resourceEntry.domainLookupStart > 100) {
      bottlenecks.push({
        type: 'slow-network',
        severity: 'medium',
        description: 'DNS resolution is slow',
        impact: 'DNS delays affect initial connection time',
        recommendation: 'Use DNS prefetching or a faster DNS provider'
      });
    }

    // SSL negotiation time
    if (resourceEntry.connectEnd - resourceEntry.connectStart > 200) {
      bottlenecks.push({
        type: 'slow-network',
        severity: 'medium',
        description: 'SSL handshake is slow',
        impact: 'SSL negotiation delays resource loading',
        recommendation: 'Optimize SSL configuration or use connection keep-alive'
      });
    }

    return bottlenecks;
  }

  /**
   * Analyze paint timing bottlenecks
   */
  private analyzePaintBottlenecks(entry: PerformanceEntry): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];

    if (entry.name === 'first-contentful-paint' && entry.startTime > 2000) {
      bottlenecks.push({
        type: 'dom-thrashing',
        severity: 'high',
        description: `First Contentful Paint delayed to ${entry.startTime}ms`,
        impact: 'Users see blank page for too long',
        recommendation: 'Optimize critical rendering path and reduce render-blocking resources'
      });
    }

    if (entry.name === 'largest-contentful-paint' && entry.startTime > 2500) {
      bottlenecks.push({
        type: 'dom-thrashing',
        severity: 'high',
        description: `Largest Contentful Paint delayed to ${entry.startTime}ms`,
        impact: 'Main content loads slowly',
        recommendation: 'Optimize largest content element loading and reduce layout shifts'
      });
    }

    return bottlenecks;
  }

  /**
   * Analyze memory usage bottlenecks
   */
  private analyzeMemoryBottlenecks(memory: any): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];
    const usedMB = memory.usedJSHeapSize / (1024 * 1024);
    const totalMB = memory.totalJSHeapSize / (1024 * 1024);
    const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);

    // High memory usage
    if (usedMB > 50) {
      bottlenecks.push({
        type: 'memory-leak',
        severity: usedMB > 100 ? 'critical' : 'high',
        description: `High memory usage: ${usedMB.toFixed(1)}MB`,
        impact: 'High memory usage may cause performance degradation',
        recommendation: 'Check for memory leaks and optimize component cleanup'
      });
    }

    // Memory usage approaching limit
    if (usedMB / limitMB > 0.8) {
      bottlenecks.push({
        type: 'memory-leak',
        severity: 'critical',
        description: `Memory usage near limit: ${(usedMB/limitMB*100).toFixed(1)}%`,
        impact: 'Application may crash due to memory exhaustion',
        recommendation: 'Immediate memory optimization required'
      });
    }

    return bottlenecks;
  }

  /**
   * Check if entry is preview-related
   */
  private isPreviewRelated(name: string): boolean {
    return name.includes('preview') || 
           name.includes('thumbnail') || 
           name.includes('og-image') ||
           name.includes('link-data');
  }

  /**
   * Get component name from resource URL
   */
  private getComponentName(url: string): string {
    if (url.includes('preview')) return 'link-preview';
    if (url.includes('thumbnail')) return 'thumbnail';
    if (url.includes('og-image')) return 'og-preview';
    return 'unknown';
  }

  /**
   * Check if element is preview-related
   */
  private isPreviewElement(element: Element): boolean {
    return element.closest('.link-preview') !== null ||
           element.classList.contains('preview') ||
           element.hasAttribute('data-preview-url');
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index];
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get session ID
   */
  private getSessionId(): string {
    if (typeof sessionStorage !== 'undefined') {
      let sessionId = sessionStorage.getItem('nld-session-id');
      if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('nld-session-id', sessionId);
      }
      return sessionId;
    }
    return 'no-session';
  }

  /**
   * Generate performance report
   */
  public generateReport(): PerformanceReport {
    const profiles = Array.from(this.profiles.values());
    const allBottlenecks = this.metrics.flatMap(m => m.bottlenecks);
    
    return {
      summary: {
        totalRequests: this.metrics.length,
        averagePerformance: this.calculateOverallPerformance(),
        criticalIssues: allBottlenecks.filter(b => b.severity === 'critical').length,
        improvementOpportunities: this.getTopImprovements()
      },
      components: Object.fromEntries(
        profiles.map(p => [p.component, p])
      ),
      bottlenecks: this.getTopBottlenecks(),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallPerformance(): number {
    const profiles = Array.from(this.profiles.values());
    if (profiles.length === 0) return 100;

    let score = 100;
    
    profiles.forEach(profile => {
      // Reduce score for slow load times
      if (profile.averageLoadTime > 1000) score -= 10;
      if (profile.p95LoadTime > 2000) score -= 15;
      
      // Reduce score for high error rate
      score -= profile.errorRate * 20;
      
      // Reduce score for render blocks
      if (profile.renderBlocks > 5) score -= 10;
    });

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get top improvement opportunities
   */
  private getTopImprovements(): string[] {
    const improvements: string[] = [];
    const profiles = Array.from(this.profiles.values());

    profiles.forEach(profile => {
      if (profile.averageLoadTime > 1000) {
        improvements.push(`Optimize ${profile.component} loading time (current: ${profile.averageLoadTime.toFixed(0)}ms)`);
      }
      
      if (profile.cacheHitRate < 0.7) {
        improvements.push(`Improve ${profile.component} caching (current hit rate: ${(profile.cacheHitRate*100).toFixed(0)}%)`);
      }
      
      if (profile.renderBlocks > 3) {
        improvements.push(`Reduce ${profile.component} render blocking (current: ${profile.renderBlocks} blocks)`);
      }
    });

    return improvements.slice(0, 5);
  }

  /**
   * Get top bottlenecks by frequency
   */
  private getTopBottlenecks(): PerformanceBottleneck[] {
    const bottleneckMap = new Map<string, {bottleneck: PerformanceBottleneck, count: number}>();
    
    this.metrics.forEach(metric => {
      metric.bottlenecks.forEach(bottleneck => {
        const key = `${bottleneck.type}-${bottleneck.description}`;
        const existing = bottleneckMap.get(key);
        
        if (existing) {
          existing.count++;
        } else {
          bottleneckMap.set(key, { bottleneck, count: 1 });
        }
      });
    });

    return Array.from(bottleneckMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(item => item.bottleneck);
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];
    const bottlenecks = this.getTopBottlenecks();

    // Network optimization
    const networkBottlenecks = bottlenecks.filter(b => b.type === 'slow-network');
    if (networkBottlenecks.length > 0) {
      recommendations.push({
        issue: 'Slow network requests affecting preview loading',
        solution: 'Implement image optimization and lazy loading',
        priority: 'high',
        estimatedImpact: 'Reduce load times by 30-50%',
        implementation: {
          effort: 'moderate',
          codeChanges: `
// Add lazy loading for preview images
<img 
  src={thumbnailUrl} 
  loading="lazy" 
  onError={handleImageError}
  style={{ aspectRatio: '16/9' }}
/>

// Implement progressive image loading
const useProgressiveImage = (src: string) => {
  const [imgSrc, setImgSrc] = useState(lowResSrc);
  
  useEffect(() => {
    const img = new Image();
    img.onload = () => setImgSrc(src);
    img.src = src;
  }, [src]);
  
  return imgSrc;
};
          `,
          testing: 'Test with slow network throttling to verify improvements'
        }
      });
    }

    // Memory optimization
    const memoryBottlenecks = bottlenecks.filter(b => b.type === 'memory-leak');
    if (memoryBottlenecks.length > 0) {
      recommendations.push({
        issue: 'High memory usage in preview components',
        solution: 'Implement proper cleanup and memory management',
        priority: 'high',
        estimatedImpact: 'Reduce memory usage by 40-60%',
        implementation: {
          effort: 'moderate',
          codeChanges: `
// Add cleanup in useEffect
useEffect(() => {
  return () => {
    // Cancel ongoing requests
    abortController.abort();
    // Clear timers
    clearTimeout(timeoutId);
    // Remove event listeners
    element.removeEventListener('click', handler);
  };
}, []);

// Use WeakMap for component references
const componentCache = new WeakMap();
          `,
          testing: 'Monitor memory usage with DevTools and test component unmounting'
        }
      });
    }

    // DOM optimization
    const domBottlenecks = bottlenecks.filter(b => b.type === 'dom-thrashing');
    if (domBottlenecks.length > 0) {
      recommendations.push({
        issue: 'DOM updates causing render blocking',
        solution: 'Optimize DOM manipulation and use CSS transforms',
        priority: 'medium',
        estimatedImpact: 'Improve interaction response by 50-70%',
        implementation: {
          effort: 'significant',
          codeChanges: `
// Use CSS transforms instead of layout changes
.preview-expand {
  transform: scale(1.1);
  transition: transform 0.2s ease;
}

// Batch DOM updates
const updatePreview = useCallback((updates: PreviewUpdate[]) => {
  // Batch updates in single render cycle
  setPreviewData(current => ({
    ...current,
    ...updates.reduce((acc, update) => ({ ...acc, ...update }), {})
  }));
}, []);
          `,
          testing: 'Use React DevTools Profiler to measure render performance'
        }
      });
    }

    return recommendations;
  }

  /**
   * Get current metrics
   */
  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get component profiles
   */
  public getProfiles(): Map<string, PerformanceProfile> {
    return new Map(this.profiles);
  }

  /**
   * Export data for neural training
   */
  public exportForTraining(): any {
    return {
      metrics: this.metrics,
      profiles: Object.fromEntries(this.profiles),
      timestamp: Date.now(),
      sessionDuration: performance.now() - this.startTime,
      version: '1.0.0'
    };
  }

  /**
   * Cleanup tracking
   */
  public destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    if (this.memoryTracker) {
      clearInterval(this.memoryTracker);
      this.memoryTracker = null;
    }
  }
}

// Export singleton instance
export const performanceTracker = new PerformanceTracker();