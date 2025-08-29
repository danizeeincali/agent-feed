import { Page } from '@playwright/test';

export interface EscapeSequenceReport {
  stormDetected: boolean;
  escapeSequenceCount: number;
  stormIntensity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  timeToStorm: number | null;
  stormDuration: number;
  
  // Specific storm types
  resizeStormDetected: boolean;
  inputStormDetected: boolean;
  connectionStormDetected: boolean;
  chaosStormDetected: boolean;
  
  // Performance impact
  performanceScore: number;
  memoryCorruption: boolean;
  
  // Event-specific metrics
  resizeEscapeSequences: number;
  inputEscapeSequences: number;
  networkEscapeSequences: number;
  crashEscapeSequences: number;
  
  // Browser compatibility
  compatibilityIssues: string[];
  touchEvents: number;
  orientationChanges: number;
  
  // Detailed analysis
  escapeSequenceTypes: { [type: string]: number };
  temporalDistribution: number[];
  patternAnalysis: {
    repetitivePatterns: number;
    cascadingEffects: number;
    bufferOverflows: number;
  };
}

export class EscapeSequenceMonitor {
  private page: Page;
  private monitoring: boolean = false;
  private startTime: number = 0;
  private stormStartTime: number | null = null;
  private escapeSequenceLog: Array<{
    timestamp: number;
    sequence: string;
    source: string;
    context: any;
  }> = [];

  constructor(page: Page) {
    this.page = page;
  }

  async startMonitoring(): Promise<void> {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.startTime = Date.now();
    this.escapeSequenceLog = [];
    this.stormStartTime = null;

    // Inject monitoring scripts into the page
    await this.injectMonitoringScript();
    
    // Set up console log monitoring
    await this.setupConsoleMonitoring();
    
    // Set up DOM mutation observer
    await this.setupDOMObserver();
    
    // Set up performance monitoring
    await this.setupPerformanceMonitoring();
  }

  async stopMonitoring(): Promise<void> {
    if (!this.monitoring) return;
    
    this.monitoring = false;
    
    // Clean up monitoring scripts
    await this.cleanupMonitoring();
  }

  async getReport(): Promise<EscapeSequenceReport> {
    const currentTime = Date.now();
    const monitoringDuration = currentTime - this.startTime;
    
    // Analyze collected data
    const analysis = await this.analyzeEscapeSequences();
    
    return {
      stormDetected: analysis.stormDetected,
      escapeSequenceCount: this.escapeSequenceLog.length,
      stormIntensity: analysis.stormIntensity,
      timeToStorm: this.stormStartTime ? (this.stormStartTime - this.startTime) : null,
      stormDuration: analysis.stormDuration,
      
      resizeStormDetected: analysis.resizeStormDetected,
      inputStormDetected: analysis.inputStormDetected,
      connectionStormDetected: analysis.connectionStormDetected,
      chaosStormDetected: analysis.chaosStormDetected,
      
      performanceScore: analysis.performanceScore,
      memoryCorruption: analysis.memoryCorruption,
      
      resizeEscapeSequences: analysis.resizeEscapeSequences,
      inputEscapeSequences: analysis.inputEscapeSequences,
      networkEscapeSequences: analysis.networkEscapeSequences,
      crashEscapeSequences: analysis.crashEscapeSequences,
      
      compatibilityIssues: analysis.compatibilityIssues,
      touchEvents: analysis.touchEvents,
      orientationChanges: analysis.orientationChanges,
      
      escapeSequenceTypes: analysis.escapeSequenceTypes,
      temporalDistribution: analysis.temporalDistribution,
      patternAnalysis: analysis.patternAnalysis
    };
  }

  private async injectMonitoringScript(): Promise<void> {
    await this.page.addInitScript(() => {
      // Global monitoring state
      (window as any).__escapeSequenceMonitor = {
        sequences: [],
        startTime: Date.now(),
        config: {
          stormThreshold: 50, // sequences per second
          bufferSize: 10000,
          samplingRate: 1.0
        }
      };

      // Intercept console methods that might contain escape sequences
      const originalMethods = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info
      };

      Object.keys(originalMethods).forEach(method => {
        (console as any)[method] = function(...args: any[]) {
          const monitor = (window as any).__escapeSequenceMonitor;
          if (monitor) {
            const stringArgs = args.map(arg => String(arg));
            const combinedText = stringArgs.join(' ');
            
            // Check for escape sequences
            const escapeSequences = combinedText.match(/\x1b\[[0-9;]*[A-Za-z]/g) || [];
            
            escapeSequences.forEach(sequence => {
              monitor.sequences.push({
                timestamp: Date.now(),
                sequence: sequence,
                source: 'console',
                method: method,
                context: { args: stringArgs }
              });
            });
          }
          
          (originalMethods as any)[method].apply(console, args);
        };
      });

      // Monitor terminal/stdout content
      const originalWrite = document.write;
      document.write = function(content: string) {
        const monitor = (window as any).__escapeSequenceMonitor;
        if (monitor) {
          const escapeSequences = content.match(/\x1b\[[0-9;]*[A-Za-z]/g) || [];
          
          escapeSequences.forEach(sequence => {
            monitor.sequences.push({
              timestamp: Date.now(),
              sequence: sequence,
              source: 'document.write',
              context: { content: content.substring(0, 100) }
            });
          });
        }
        
        originalWrite.call(document, content);
      };

      // Monitor WebSocket messages for escape sequences
      const originalWebSocket = window.WebSocket;
      window.WebSocket = class extends WebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);
          
          const originalOnMessage = this.onmessage;
          this.addEventListener('message', (event) => {
            const monitor = (window as any).__escapeSequenceMonitor;
            if (monitor && typeof event.data === 'string') {
              const escapeSequences = event.data.match(/\x1b\[[0-9;]*[A-Za-z]/g) || [];
              
              escapeSequences.forEach(sequence => {
                monitor.sequences.push({
                  timestamp: Date.now(),
                  sequence: sequence,
                  source: 'websocket',
                  context: { 
                    url: url.toString(),
                    messageSize: event.data.length 
                  }
                });
              });
            }
          });
        }
      };

      // Monitor SSE (Server-Sent Events)
      const originalEventSource = window.EventSource;
      window.EventSource = class extends EventSource {
        constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
          super(url, eventSourceInitDict);
          
          this.addEventListener('message', (event) => {
            const monitor = (window as any).__escapeSequenceMonitor;
            if (monitor && event.data) {
              const escapeSequences = event.data.match(/\x1b\[[0-9;]*[A-Za-z]/g) || [];
              
              escapeSequences.forEach(sequence => {
                monitor.sequences.push({
                  timestamp: Date.now(),
                  sequence: sequence,
                  source: 'eventsource',
                  context: { 
                    url: url.toString(),
                    eventType: event.type 
                  }
                });
              });
            }
          });
        }
      };

      // Monitor fetch responses
      const originalFetch = window.fetch;
      window.fetch = async function(...args: any[]) {
        const response = await originalFetch.apply(window, args);
        const clonedResponse = response.clone();
        
        try {
          const text = await clonedResponse.text();
          const monitor = (window as any).__escapeSequenceMonitor;
          
          if (monitor) {
            const escapeSequences = text.match(/\x1b\[[0-9;]*[A-Za-z]/g) || [];
            
            escapeSequences.forEach(sequence => {
              monitor.sequences.push({
                timestamp: Date.now(),
                sequence: sequence,
                source: 'fetch',
                context: { 
                  url: args[0],
                  status: response.status 
                }
              });
            });
          }
        } catch (error) {
          // Ignore parsing errors
        }
        
        return response;
      };

      // Performance and resource monitoring
      (window as any).__performanceMetrics = {
        memoryUsage: [],
        cpuUsage: [],
        renderingMetrics: []
      };

      // Collect performance metrics periodically
      setInterval(() => {
        const metrics = (window as any).__performanceMetrics;
        if (metrics && (window as any).performance.memory) {
          metrics.memoryUsage.push({
            timestamp: Date.now(),
            used: (window as any).performance.memory.usedJSHeapSize,
            total: (window as any).performance.memory.totalJSHeapSize,
            limit: (window as any).performance.memory.jsHeapSizeLimit
          });
        }
        
        // Collect rendering metrics
        if ((window as any).performance.getEntriesByType) {
          const paintMetrics = (window as any).performance.getEntriesByType('paint');
          metrics.renderingMetrics.push({
            timestamp: Date.now(),
            paintMetrics: paintMetrics.length
          });
        }
      }, 1000);
    });
  }

  private async setupConsoleMonitoring(): Promise<void> {
    this.page.on('console', (msg) => {
      const text = msg.text();
      const escapeSequences = text.match(/\x1b\[[0-9;]*[A-Za-z]/g) || [];
      
      if (escapeSequences.length > 0) {
        const timestamp = Date.now();
        
        escapeSequences.forEach(sequence => {
          this.escapeSequenceLog.push({
            timestamp,
            sequence,
            source: 'page-console',
            context: { type: msg.type(), text }
          });
        });
        
        // Check for storm conditions
        this.checkForStorm(timestamp);
      }
    });
  }

  private async setupDOMObserver(): Promise<void> {
    await this.page.evaluate(() => {
      const monitor = (window as any).__escapeSequenceMonitor;
      if (!monitor) return;

      // Watch for DOM mutations that might indicate escape sequence output
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.TEXT_NODE && node.textContent) {
                const escapeSequences = node.textContent.match(/\x1b\[[0-9;]*[A-Za-z]/g) || [];
                
                escapeSequences.forEach(sequence => {
                  monitor.sequences.push({
                    timestamp: Date.now(),
                    sequence: sequence,
                    source: 'dom-mutation',
                    context: { 
                      nodeType: 'text',
                      parentTag: node.parentElement?.tagName 
                    }
                  });
                });
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });

      (window as any).__domObserver = observer;
    });
  }

  private async setupPerformanceMonitoring(): Promise<void> {
    // Monitor page performance metrics
    this.page.on('metrics', (metrics) => {
      // Track performance degradation that might indicate escape sequence storms
      const jsHeapUsedSize = metrics.JSHeapUsedSize;
      const timestamp = Date.now();
      
      // Check for memory spikes that could indicate buffer overflow
      if (jsHeapUsedSize && jsHeapUsedSize > 100 * 1024 * 1024) { // > 100MB
        this.escapeSequenceLog.push({
          timestamp,
          sequence: 'MEMORY_SPIKE',
          source: 'performance',
          context: { jsHeapUsedSize }
        });
      }
    });
  }

  private checkForStorm(timestamp: number): void {
    const recentWindow = 1000; // 1 second
    const stormThreshold = 50; // sequences per second
    
    const recentSequences = this.escapeSequenceLog.filter(
      log => timestamp - log.timestamp < recentWindow
    );
    
    if (recentSequences.length >= stormThreshold && !this.stormStartTime) {
      this.stormStartTime = timestamp;
    }
  }

  private async analyzeEscapeSequences(): Promise<any> {
    const pageData = await this.page.evaluate(() => {
      const monitor = (window as any).__escapeSequenceMonitor;
      const metrics = (window as any).__performanceMetrics;
      
      return {
        sequences: monitor?.sequences || [],
        performanceMetrics: metrics || {},
        browserInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language
        }
      };
    });

    // Combine page data with locally collected data
    const allSequences = [...this.escapeSequenceLog, ...pageData.sequences];
    
    // Analyze storm detection
    const stormDetected = this.detectStorm(allSequences);
    const stormIntensity = this.calculateStormIntensity(allSequences);
    const stormDuration = this.calculateStormDuration(allSequences);
    
    // Analyze specific storm types
    const stormTypes = this.analyzeStormTypes(allSequences);
    
    // Calculate performance impact
    const performanceScore = this.calculatePerformanceScore(pageData.performanceMetrics);
    const memoryCorruption = this.detectMemoryCorruption(pageData.performanceMetrics);
    
    // Categorize escape sequences
    const escapeSequenceTypes = this.categorizeEscapeSequences(allSequences);
    
    // Temporal analysis
    const temporalDistribution = this.analyzeTemporalDistribution(allSequences);
    
    // Pattern analysis
    const patternAnalysis = this.analyzePatterns(allSequences);
    
    // Browser compatibility analysis
    const compatibilityIssues = this.analyzeCompatibility(pageData.browserInfo, allSequences);

    return {
      stormDetected,
      stormIntensity,
      stormDuration,
      ...stormTypes,
      performanceScore,
      memoryCorruption,
      escapeSequenceTypes,
      temporalDistribution,
      patternAnalysis,
      compatibilityIssues,
      touchEvents: this.countEventType(allSequences, 'touch'),
      orientationChanges: this.countEventType(allSequences, 'orientation'),
      resizeEscapeSequences: this.countSourceType(allSequences, 'resize'),
      inputEscapeSequences: this.countSourceType(allSequences, 'input'),
      networkEscapeSequences: this.countSourceType(allSequences, 'network'),
      crashEscapeSequences: this.countSourceType(allSequences, 'crash')
    };
  }

  private detectStorm(sequences: any[]): boolean {
    if (sequences.length === 0) return false;
    
    const windowSize = 1000; // 1 second windows
    const stormThreshold = 20; // sequences per second
    
    // Check for any 1-second window with high sequence density
    const timestamps = sequences.map(s => s.timestamp).sort((a, b) => a - b);
    
    for (let i = 0; i < timestamps.length; i++) {
      const windowStart = timestamps[i];
      const windowEnd = windowStart + windowSize;
      
      const windowSequences = timestamps.filter(t => t >= windowStart && t < windowEnd);
      
      if (windowSequences.length >= stormThreshold) {
        return true;
      }
    }
    
    return false;
  }

  private calculateStormIntensity(sequences: any[]): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (sequences.length === 0) return 'none';
    
    const maxRate = this.calculateMaxSequenceRate(sequences);
    
    if (maxRate < 10) return 'none';
    if (maxRate < 25) return 'low';
    if (maxRate < 50) return 'medium';
    if (maxRate < 100) return 'high';
    return 'critical';
  }

  private calculateMaxSequenceRate(sequences: any[]): number {
    if (sequences.length < 2) return 0;
    
    const windowSize = 1000; // 1 second
    let maxRate = 0;
    
    const timestamps = sequences.map(s => s.timestamp).sort((a, b) => a - b);
    
    for (let i = 0; i < timestamps.length; i++) {
      const windowStart = timestamps[i];
      const windowEnd = windowStart + windowSize;
      
      const windowCount = timestamps.filter(t => t >= windowStart && t < windowEnd).length;
      maxRate = Math.max(maxRate, windowCount);
    }
    
    return maxRate;
  }

  private calculateStormDuration(sequences: any[]): number {
    if (!this.stormStartTime || sequences.length === 0) return 0;
    
    const lastSequenceTime = Math.max(...sequences.map(s => s.timestamp));
    return lastSequenceTime - this.stormStartTime;
  }

  private analyzeStormTypes(sequences: any[]): any {
    return {
      resizeStormDetected: this.detectSpecificStorm(sequences, 'resize'),
      inputStormDetected: this.detectSpecificStorm(sequences, 'input'),
      connectionStormDetected: this.detectSpecificStorm(sequences, 'websocket', 'eventsource'),
      chaosStormDetected: this.detectChaosStorm(sequences)
    };
  }

  private detectSpecificStorm(sequences: any[], ...sources: string[]): boolean {
    const relevantSequences = sequences.filter(s => sources.includes(s.source));
    return this.detectStorm(relevantSequences);
  }

  private detectChaosStorm(sequences: any[]): boolean {
    // Chaos storm is detected by high variety of sources in short time
    const windowSize = 5000; // 5 seconds
    const sourceVarietyThreshold = 4; // Different sources
    
    if (sequences.length < sourceVarietyThreshold) return false;
    
    const timestamps = sequences.map(s => s.timestamp).sort((a, b) => a - b);
    
    for (let i = 0; i < timestamps.length; i++) {
      const windowStart = timestamps[i];
      const windowEnd = windowStart + windowSize;
      
      const windowSequences = sequences.filter(s => s.timestamp >= windowStart && s.timestamp < windowEnd);
      const uniqueSources = new Set(windowSequences.map(s => s.source));
      
      if (uniqueSources.size >= sourceVarietyThreshold) {
        return true;
      }
    }
    
    return false;
  }

  private calculatePerformanceScore(metrics: any): number {
    // Calculate performance score based on memory usage trends
    if (!metrics.memoryUsage || metrics.memoryUsage.length < 2) return 100;
    
    const memoryGrowth = this.calculateMemoryGrowthRate(metrics.memoryUsage);
    const renderingImpact = this.calculateRenderingImpact(metrics.renderingMetrics);
    
    // Score from 0-100, where 100 is perfect performance
    let score = 100;
    
    // Penalize excessive memory growth
    score -= Math.min(memoryGrowth * 10, 50);
    
    // Penalize rendering issues
    score -= Math.min(renderingImpact * 20, 30);
    
    return Math.max(score, 0);
  }

  private calculateMemoryGrowthRate(memoryMetrics: any[]): number {
    if (memoryMetrics.length < 2) return 0;
    
    const first = memoryMetrics[0];
    const last = memoryMetrics[memoryMetrics.length - 1];
    
    const growthRate = (last.used - first.used) / first.used;
    return Math.max(growthRate, 0);
  }

  private calculateRenderingImpact(renderingMetrics: any[]): number {
    // Simplified rendering impact calculation
    return renderingMetrics ? Math.min(renderingMetrics.length / 100, 1) : 0;
  }

  private detectMemoryCorruption(metrics: any): boolean {
    // Detect potential memory corruption through unusual patterns
    if (!metrics.memoryUsage) return false;
    
    return metrics.memoryUsage.some((metric: any) => 
      metric.used > metric.limit * 0.9 // Using >90% of heap limit
    );
  }

  private categorizeEscapeSequences(sequences: any[]): { [type: string]: number } {
    const categories: { [type: string]: number } = {};
    
    sequences.forEach(s => {
      // Categorize escape sequences by their function
      const sequence = s.sequence;
      
      if (sequence.includes('[H') || sequence.includes('[f')) {
        categories['cursor_position'] = (categories['cursor_position'] || 0) + 1;
      } else if (sequence.includes('[A') || sequence.includes('[B') || sequence.includes('[C') || sequence.includes('[D')) {
        categories['cursor_movement'] = (categories['cursor_movement'] || 0) + 1;
      } else if (sequence.includes('[J') || sequence.includes('[K')) {
        categories['clear_screen'] = (categories['clear_screen'] || 0) + 1;
      } else if (sequence.includes('[m')) {
        categories['color_formatting'] = (categories['color_formatting'] || 0) + 1;
      } else {
        categories['other'] = (categories['other'] || 0) + 1;
      }
    });
    
    return categories;
  }

  private analyzeTemporalDistribution(sequences: any[]): number[] {
    // Analyze distribution of escape sequences over time (in 1-second buckets)
    if (sequences.length === 0) return [];
    
    const timestamps = sequences.map(s => s.timestamp);
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    const duration = maxTime - minTime;
    
    const bucketCount = Math.min(Math.ceil(duration / 1000), 60); // Max 60 buckets (1 minute)
    const buckets = new Array(bucketCount).fill(0);
    
    sequences.forEach(s => {
      const bucketIndex = Math.floor((s.timestamp - minTime) / (duration / bucketCount));
      if (bucketIndex >= 0 && bucketIndex < bucketCount) {
        buckets[bucketIndex]++;
      }
    });
    
    return buckets;
  }

  private analyzePatterns(sequences: any[]): any {
    return {
      repetitivePatterns: this.countRepetitivePatterns(sequences),
      cascadingEffects: this.countCascadingEffects(sequences),
      bufferOverflows: this.countBufferOverflows(sequences)
    };
  }

  private countRepetitivePatterns(sequences: any[]): number {
    // Count sequences that repeat rapidly (same sequence within 100ms)
    let repetitive = 0;
    
    for (let i = 1; i < sequences.length; i++) {
      const current = sequences[i];
      const previous = sequences[i - 1];
      
      if (current.sequence === previous.sequence && 
          (current.timestamp - previous.timestamp) < 100) {
        repetitive++;
      }
    }
    
    return repetitive;
  }

  private countCascadingEffects(sequences: any[]): number {
    // Count sequences that might cause cascading effects
    return sequences.filter(s => 
      s.source === 'resize' || s.source === 'scroll' || s.source === 'focus'
    ).length;
  }

  private countBufferOverflows(sequences: any[]): number {
    // Count potential buffer overflow indicators
    return sequences.filter(s => 
      s.sequence.includes('MEMORY_SPIKE') || s.context?.bufferOverflow
    ).length;
  }

  private analyzeCompatibility(browserInfo: any, sequences: any[]): string[] {
    const issues: string[] = [];
    
    // Check for browser-specific escape sequence handling issues
    if (browserInfo.userAgent.includes('Firefox') && sequences.length > 100) {
      issues.push('High escape sequence count detected in Firefox - potential rendering issues');
    }
    
    if (browserInfo.userAgent.includes('Safari') && sequences.some(s => s.sequence.includes('[m'))) {
      issues.push('Color formatting escape sequences in Safari - may not render correctly');
    }
    
    return issues;
  }

  private countEventType(sequences: any[], eventType: string): number {
    return sequences.filter(s => s.context?.eventType === eventType).length;
  }

  private countSourceType(sequences: any[], sourceType: string): number {
    return sequences.filter(s => s.source.includes(sourceType)).length;
  }

  private async cleanupMonitoring(): Promise<void> {
    await this.page.evaluate(() => {
      // Clean up monitoring objects
      delete (window as any).__escapeSequenceMonitor;
      delete (window as any).__performanceMetrics;
      
      // Clean up DOM observer
      if ((window as any).__domObserver) {
        (window as any).__domObserver.disconnect();
        delete (window as any).__domObserver;
      }
    });
  }
}

export default EscapeSequenceMonitor;