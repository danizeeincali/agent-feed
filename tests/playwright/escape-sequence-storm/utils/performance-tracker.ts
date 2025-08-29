import { Page } from '@playwright/test';

export interface PerformanceReport {
  maxCPUUsage: number;
  maxMemoryUsage: number;
  averageResponseTime: number;
  frameRate: number;
  networkLatency: number;
  diskIO: number;
  
  // Detailed metrics
  memoryMetrics: MemoryMetrics;
  cpuMetrics: CPUMetrics;
  networkMetrics: NetworkMetrics;
  renderingMetrics: RenderingMetrics;
  
  // Performance timeline
  performanceTimeline: PerformanceSnapshot[];
}

export interface MemoryMetrics {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  memoryGrowthRate: number;
  gcCollections: number;
  memoryLeaks: MemoryLeak[];
}

export interface CPUMetrics {
  averageUsage: number;
  maxUsage: number;
  spikes: CPUSpike[];
  taskDuration: number[];
  mainThreadBlocking: number;
}

export interface NetworkMetrics {
  totalRequests: number;
  failedRequests: number;
  averageLatency: number;
  bandwidth: number;
  connectionErrors: number;
}

export interface RenderingMetrics {
  fps: number;
  frameDrops: number;
  paintTiming: number[];
  layoutThrashing: number;
  renderingTime: number;
}

export interface PerformanceSnapshot {
  timestamp: number;
  memory: number;
  cpu: number;
  network: number;
  rendering: number;
  userInteractions: number;
}

export interface MemoryLeak {
  timestamp: number;
  size: number;
  source: string;
  stackTrace?: string;
}

export interface CPUSpike {
  timestamp: number;
  duration: number;
  usage: number;
  cause?: string;
}

export class PerformanceTracker {
  private page: Page;
  private tracking: boolean = false;
  private startTime: number = 0;
  private snapshots: PerformanceSnapshot[] = [];
  private performanceObserver: any;

  constructor(page: Page) {
    this.page = page;
  }

  async startTracking(): Promise<void> {
    if (this.tracking) return;
    
    this.tracking = true;
    this.startTime = Date.now();
    this.snapshots = [];

    // Inject performance tracking scripts
    await this.injectPerformanceTrackingScript();
    
    // Start collecting snapshots
    await this.startSnapshotCollection();
    
    // Set up performance observer
    await this.setupPerformanceObserver();
  }

  async stopTracking(): Promise<void> {
    if (!this.tracking) return;
    
    this.tracking = false;
    
    // Stop snapshot collection
    await this.stopSnapshotCollection();
    
    // Clean up performance tracking
    await this.cleanupPerformanceTracking();
  }

  async getReport(): Promise<PerformanceReport> {
    const pageMetrics = await this.collectPageMetrics();
    const analysisResults = await this.analyzePerformanceData();
    
    return {
      maxCPUUsage: analysisResults.maxCPU,
      maxMemoryUsage: analysisResults.maxMemory,
      averageResponseTime: analysisResults.avgResponseTime,
      frameRate: analysisResults.frameRate,
      networkLatency: analysisResults.networkLatency,
      diskIO: analysisResults.diskIO,
      
      memoryMetrics: analysisResults.memoryMetrics,
      cpuMetrics: analysisResults.cpuMetrics,
      networkMetrics: analysisResults.networkMetrics,
      renderingMetrics: analysisResults.renderingMetrics,
      
      performanceTimeline: this.snapshots
    };
  }

  private async injectPerformanceTrackingScript(): Promise<void> {
    await this.page.addInitScript(() => {
      (window as any).__performanceTracker = {
        metrics: {
          memory: [],
          cpu: [],
          network: [],
          rendering: [],
          interactions: [],
          errors: []
        },
        config: {
          sampleRate: 100, // ms
          maxSamples: 10000,
          trackingEnabled: true
        },
        
        // Memory tracking
        trackMemory: () => {
          const tracker = (window as any).__performanceTracker;
          if (!tracker.config.trackingEnabled) return;
          
          if ((window as any).performance.memory) {
            const memInfo = (window as any).performance.memory;
            tracker.metrics.memory.push({
              timestamp: Date.now(),
              used: memInfo.usedJSHeapSize,
              total: memInfo.totalJSHeapSize,
              limit: memInfo.jsHeapSizeLimit
            });
            
            // Limit memory samples to prevent memory growth
            if (tracker.metrics.memory.length > tracker.config.maxSamples) {
              tracker.metrics.memory = tracker.metrics.memory.slice(-tracker.config.maxSamples / 2);
            }
          }
        },
        
        // CPU/Task tracking through timing
        trackCPU: () => {
          const tracker = (window as any).__performanceTracker;
          if (!tracker.config.trackingEnabled) return;
          
          const start = performance.now();
          
          // Simulate CPU measurement through task timing
          requestIdleCallback((deadline) => {
            const timeRemaining = deadline.timeRemaining();
            const estimatedCPU = Math.max(0, 100 - (timeRemaining / 16.67) * 100); // Rough estimate
            
            tracker.metrics.cpu.push({
              timestamp: Date.now(),
              usage: estimatedCPU,
              taskDuration: performance.now() - start
            });
          });
        },
        
        // Network tracking
        trackNetwork: (url: string, startTime: number, endTime: number, success: boolean) => {
          const tracker = (window as any).__performanceTracker;
          if (!tracker.config.trackingEnabled) return;
          
          tracker.metrics.network.push({
            timestamp: startTime,
            url,
            duration: endTime - startTime,
            success
          });
        },
        
        // Rendering tracking
        trackRendering: () => {
          const tracker = (window as any).__performanceTracker;
          if (!tracker.config.trackingEnabled) return;
          
          if ((window as any).performance.getEntriesByType) {
            const paintEntries = (window as any).performance.getEntriesByType('paint');
            const navigationEntries = (window as any).performance.getEntriesByType('navigation');
            
            tracker.metrics.rendering.push({
              timestamp: Date.now(),
              paintEntries: paintEntries.length,
              navigationTime: navigationEntries.length > 0 ? navigationEntries[0].loadEventEnd : 0
            });
          }
        },
        
        // Interaction tracking
        trackInteraction: (type: string, duration: number) => {
          const tracker = (window as any).__performanceTracker;
          if (!tracker.config.trackingEnabled) return;
          
          tracker.metrics.interactions.push({
            timestamp: Date.now(),
            type,
            duration
          });
        },
        
        // Error tracking
        trackError: (error: Error, source: string) => {
          const tracker = (window as any).__performanceTracker;
          tracker.metrics.errors.push({
            timestamp: Date.now(),
            message: error.message,
            source,
            stack: error.stack
          });
        }
      };

      // Override fetch to track network performance
      const originalFetch = window.fetch;
      window.fetch = async function(...args: any[]) {
        const tracker = (window as any).__performanceTracker;
        const startTime = Date.now();
        
        try {
          const response = await originalFetch.apply(window, args);
          const endTime = Date.now();
          
          tracker.trackNetwork(args[0], startTime, endTime, response.ok);
          
          return response;
        } catch (error) {
          const endTime = Date.now();
          tracker.trackNetwork(args[0], startTime, endTime, false);
          throw error;
        }
      };

      // Override XMLHttpRequest
      const originalXHROpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(...args: any[]) {
        const tracker = (window as any).__performanceTracker;
        const startTime = Date.now();
        
        this.addEventListener('loadend', () => {
          const endTime = Date.now();
          tracker.trackNetwork(args[1], startTime, endTime, this.status < 400);
        });
        
        return originalXHROpen.apply(this, args);
      };

      // Track user interactions
      ['click', 'keypress', 'scroll', 'resize'].forEach(eventType => {
        document.addEventListener(eventType, (event) => {
          const tracker = (window as any).__performanceTracker;
          const startTime = Date.now();
          
          requestAnimationFrame(() => {
            const duration = Date.now() - startTime;
            tracker.trackInteraction(eventType, duration);
          });
        }, { passive: true });
      });

      // Track errors
      window.addEventListener('error', (event) => {
        const tracker = (window as any).__performanceTracker;
        tracker.trackError(event.error, 'global');
      });

      window.addEventListener('unhandledrejection', (event) => {
        const tracker = (window as any).__performanceTracker;
        tracker.trackError(new Error(event.reason), 'promise');
      });

      // Start periodic tracking
      setInterval(() => {
        const tracker = (window as any).__performanceTracker;
        tracker.trackMemory();
        tracker.trackCPU();
        tracker.trackRendering();
      }, 100); // Every 100ms
    });
  }

  private async startSnapshotCollection(): Promise<void> {
    const collectSnapshot = async (): Promise<void> => {
      if (!this.tracking) return;
      
      const snapshot = await this.page.evaluate(() => {
        const tracker = (window as any).__performanceTracker;
        const timestamp = Date.now();
        
        return {
          timestamp,
          memory: tracker.metrics.memory.length > 0 ? tracker.metrics.memory[tracker.metrics.memory.length - 1].used : 0,
          cpu: tracker.metrics.cpu.length > 0 ? tracker.metrics.cpu[tracker.metrics.cpu.length - 1].usage : 0,
          network: tracker.metrics.network.length,
          rendering: tracker.metrics.rendering.length,
          userInteractions: tracker.metrics.interactions.length
        };
      });
      
      this.snapshots.push(snapshot);
      
      // Limit snapshots to prevent memory growth
      if (this.snapshots.length > 1000) {
        this.snapshots = this.snapshots.slice(-500);
      }
      
      // Schedule next snapshot
      setTimeout(collectSnapshot, 500); // Every 500ms
    };
    
    collectSnapshot();
  }

  private async stopSnapshotCollection(): Promise<void> {
    // Snapshot collection will stop automatically when this.tracking becomes false
  }

  private async setupPerformanceObserver(): Promise<void> {
    await this.page.evaluate(() => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const tracker = (window as any).__performanceTracker;
          
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
              tracker.metrics.rendering.push({
                timestamp: Date.now(),
                type: entry.entryType,
                duration: entry.duration,
                startTime: entry.startTime
              });
            }
          }
        });
        
        try {
          observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
          (window as any).__performanceObserver = observer;
        } catch (error) {
          console.warn('PerformanceObserver not supported:', error);
        }
      }
    });
  }

  private async collectPageMetrics(): Promise<any> {
    return await this.page.evaluate(() => {
      const tracker = (window as any).__performanceTracker;
      return {
        memory: tracker.metrics.memory,
        cpu: tracker.metrics.cpu,
        network: tracker.metrics.network,
        rendering: tracker.metrics.rendering,
        interactions: tracker.metrics.interactions,
        errors: tracker.metrics.errors
      };
    });
  }

  private async analyzePerformanceData(): Promise<any> {
    const pageMetrics = await this.collectPageMetrics();
    
    // Analyze memory metrics
    const memoryMetrics = this.analyzeMemoryMetrics(pageMetrics.memory);
    
    // Analyze CPU metrics
    const cpuMetrics = this.analyzeCPUMetrics(pageMetrics.cpu);
    
    // Analyze network metrics
    const networkMetrics = this.analyzeNetworkMetrics(pageMetrics.network);
    
    // Analyze rendering metrics
    const renderingMetrics = this.analyzeRenderingMetrics(pageMetrics.rendering);
    
    return {
      maxCPU: cpuMetrics.maxUsage,
      maxMemory: memoryMetrics.maxUsage,
      avgResponseTime: networkMetrics.averageLatency,
      frameRate: renderingMetrics.fps,
      networkLatency: networkMetrics.averageLatency,
      diskIO: 0, // Browser cannot measure disk I/O directly
      
      memoryMetrics,
      cpuMetrics,
      networkMetrics,
      renderingMetrics
    };
  }

  private analyzeMemoryMetrics(memoryData: any[]): MemoryMetrics {
    if (memoryData.length === 0) {
      return {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        memoryGrowthRate: 0,
        gcCollections: 0,
        memoryLeaks: []
      };
    }
    
    const latest = memoryData[memoryData.length - 1];
    const first = memoryData[0];
    
    // Calculate growth rate
    const growthRate = memoryData.length > 1 ? 
      (latest.used - first.used) / (latest.timestamp - first.timestamp) : 0;
    
    // Detect potential memory leaks (sustained growth)
    const leaks = this.detectMemoryLeaks(memoryData);
    
    // Count GC collections (memory drops)
    const gcCollections = this.countGCCollections(memoryData);
    
    return {
      usedJSHeapSize: latest.used,
      totalJSHeapSize: latest.total,
      jsHeapSizeLimit: latest.limit,
      memoryGrowthRate: growthRate,
      gcCollections,
      memoryLeaks: leaks
    };
  }

  private analyzeCPUMetrics(cpuData: any[]): CPUMetrics {
    if (cpuData.length === 0) {
      return {
        averageUsage: 0,
        maxUsage: 0,
        spikes: [],
        taskDuration: [],
        mainThreadBlocking: 0
      };
    }
    
    const usages = cpuData.map(d => d.usage);
    const taskDurations = cpuData.map(d => d.taskDuration);
    
    const averageUsage = usages.reduce((a, b) => a + b, 0) / usages.length;
    const maxUsage = Math.max(...usages);
    
    // Detect CPU spikes
    const spikes = this.detectCPUSpikes(cpuData);
    
    // Calculate main thread blocking
    const mainThreadBlocking = taskDurations.filter(d => d > 50).length; // Tasks > 50ms
    
    return {
      averageUsage,
      maxUsage,
      spikes,
      taskDuration: taskDurations,
      mainThreadBlocking
    };
  }

  private analyzeNetworkMetrics(networkData: any[]): NetworkMetrics {
    if (networkData.length === 0) {
      return {
        totalRequests: 0,
        failedRequests: 0,
        averageLatency: 0,
        bandwidth: 0,
        connectionErrors: 0
      };
    }
    
    const totalRequests = networkData.length;
    const failedRequests = networkData.filter(d => !d.success).length;
    const durations = networkData.map(d => d.duration);
    const averageLatency = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    return {
      totalRequests,
      failedRequests,
      averageLatency,
      bandwidth: 0, // Cannot calculate bandwidth from available data
      connectionErrors: failedRequests
    };
  }

  private analyzeRenderingMetrics(renderingData: any[]): RenderingMetrics {
    const fps = this.calculateFPS();
    
    return {
      fps,
      frameDrops: fps < 50 ? 1 : 0, // Rough estimation
      paintTiming: renderingData.map(d => d.navigationTime).filter(t => t > 0),
      layoutThrashing: 0, // Would need more specific tracking
      renderingTime: renderingData.length > 0 ? renderingData[renderingData.length - 1].navigationTime : 0
    };
  }

  private detectMemoryLeaks(memoryData: any[]): MemoryLeak[] {
    const leaks: MemoryLeak[] = [];
    
    // Simple leak detection: sustained growth over time
    if (memoryData.length < 10) return leaks;
    
    const windowSize = 10;
    for (let i = windowSize; i < memoryData.length; i++) {
      const window = memoryData.slice(i - windowSize, i);
      const growth = window[window.length - 1].used - window[0].used;
      
      if (growth > 5 * 1024 * 1024) { // > 5MB growth in window
        leaks.push({
          timestamp: window[window.length - 1].timestamp,
          size: growth,
          source: 'unknown'
        });
      }
    }
    
    return leaks;
  }

  private countGCCollections(memoryData: any[]): number {
    let gcCount = 0;
    
    for (let i = 1; i < memoryData.length; i++) {
      const previous = memoryData[i - 1];
      const current = memoryData[i];
      
      // GC detected if memory usage drops significantly
      if (previous.used - current.used > 1024 * 1024) { // > 1MB drop
        gcCount++;
      }
    }
    
    return gcCount;
  }

  private detectCPUSpikes(cpuData: any[]): CPUSpike[] {
    const spikes: CPUSpike[] = [];
    const spikeThreshold = 80; // 80% CPU usage
    
    for (const data of cpuData) {
      if (data.usage > spikeThreshold) {
        spikes.push({
          timestamp: data.timestamp,
          duration: data.taskDuration,
          usage: data.usage
        });
      }
    }
    
    return spikes;
  }

  private calculateFPS(): number {
    // Rough FPS calculation based on requestAnimationFrame timing
    // This is a simplified version - real FPS would require more sophisticated tracking
    return 60; // Default assumption, would need actual frame timing
  }

  private async cleanupPerformanceTracking(): Promise<void> {
    await this.page.evaluate(() => {
      // Stop performance tracking
      if ((window as any).__performanceTracker) {
        (window as any).__performanceTracker.config.trackingEnabled = false;
      }
      
      // Disconnect performance observer
      if ((window as any).__performanceObserver) {
        (window as any).__performanceObserver.disconnect();
        delete (window as any).__performanceObserver;
      }
      
      // Clean up tracking data
      delete (window as any).__performanceTracker;
    });
  }
}

export default PerformanceTracker;