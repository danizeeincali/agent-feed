/**
 * Neuro-Learning Development (NLD) Preview Monitor
 * Real-time monitoring and analysis of preview generation patterns
 * Focuses on identifying "www." display issues and other failure modes
 */

export interface PreviewFailurePattern {
  id: string;
  timestamp: number;
  url: string;
  failureType: 'url-display' | 'rendering' | 'network' | 'parsing' | 'component-lifecycle';
  failureMode: string;
  expectedBehavior: string;
  actualBehavior: string;
  context: {
    userAgent?: string;
    displayMode: string;
    componentState: any;
    networkTiming: NetworkTiming;
    domState: DOMState;
  };
  patterns: {
    wwwDisplay?: boolean;
    urlTruncation?: boolean;
    thumbnailFailure?: boolean;
    previewCollapse?: boolean;
  };
  rootCause?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reproductionSteps?: string[];
}

export interface NetworkTiming {
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  loadComplete: number;
  errors: string[];
}

export interface DOMState {
  componentMounted: boolean;
  previewVisible: boolean;
  thumbnailLoaded: boolean;
  linkParsed: boolean;
  renderErrors: string[];
}

export interface PreviewMetrics {
  totalRequests: number;
  successRate: number;
  failureRate: number;
  avgLoadTime: number;
  patterns: {
    wwwDisplayIssues: number;
    urlDetectionFailures: number;
    thumbnailFailures: number;
    componentErrors: number;
    networkTimeouts: number;
  };
}

export class PreviewMonitor {
  private patterns: PreviewFailurePattern[] = [];
  private metrics: PreviewMetrics = {
    totalRequests: 0,
    successRate: 0,
    failureRate: 0,
    avgLoadTime: 0,
    patterns: {
      wwwDisplayIssues: 0,
      urlDetectionFailures: 0,
      thumbnailFailures: 0,
      componentErrors: 0,
      networkTimeouts: 0
    }
  };
  private observers: MutationObserver[] = [];
  private performanceObserver: PerformanceObserver | null = null;
  
  constructor() {
    this.initializeMonitoring();
  }

  /**
   * Initialize real-time monitoring systems
   */
  private initializeMonitoring() {
    // Monitor DOM mutations for preview rendering
    this.setupDOMMonitoring();
    
    // Monitor network requests for preview data
    this.setupNetworkMonitoring();
    
    // Monitor component lifecycle events
    this.setupComponentMonitoring();
    
    // Monitor user interactions
    this.setupInteractionMonitoring();
  }

  /**
   * Setup DOM monitoring for preview elements
   */
  private setupDOMMonitoring() {
    if (typeof window === 'undefined') return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Monitor preview components
              if (element.matches('[data-preview-url]') || element.classList.contains('link-preview')) {
                this.analyzePreviewElement(element);
              }
              
              // Monitor for "www." display issues
              if (element.textContent?.includes('www.') && 
                  !element.getAttribute('href')?.startsWith('http')) {
                this.captureWWWDisplayIssue(element);
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'href', 'data-preview-url']
    });

    this.observers.push(observer);
  }

  /**
   * Setup network monitoring for preview requests
   */
  private setupNetworkMonitoring() {
    if (typeof window === 'undefined') return;

    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const [url] = args;
      
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        
        // Check if this is a preview-related request
        if (this.isPreviewRequest(url.toString())) {
          this.recordNetworkMetrics(url.toString(), startTime, endTime, response.ok);
        }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        if (this.isPreviewRequest(url.toString())) {
          this.recordNetworkFailure(url.toString(), startTime, endTime, error as Error);
        }
        throw error;
      }
    };

    // Monitor XMLHttpRequest
    const originalXHR = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      const startTime = performance.now();
      
      this.addEventListener('loadend', () => {
        const endTime = performance.now();
        if (typeof url === 'string' && this.isPreviewRequest?.(url)) {
          // Record XHR metrics
        }
      });
      
      return originalXHR.call(this, method, url, ...rest);
    };
  }

  /**
   * Setup component lifecycle monitoring
   */
  private setupComponentMonitoring() {
    // Hook into React component lifecycle if available
    if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      
      hook.onCommitFiberRoot = (id: number, root: any) => {
        // Monitor component renders related to previews
        this.analyzeReactRender(root);
      };
    }

    // Monitor component errors
    window.addEventListener('error', (event) => {
      if (event.filename?.includes('preview') || event.message?.includes('preview')) {
        this.captureComponentError(event);
      }
    });

    // Monitor unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.toString().includes('preview')) {
        this.capturePromiseRejection(event);
      }
    });
  }

  /**
   * Setup user interaction monitoring
   */
  private setupInteractionMonitoring() {
    if (typeof window === 'undefined') return;

    // Monitor clicks on preview elements
    document.addEventListener('click', (event) => {
      const target = event.target as Element;
      if (target.closest('.link-preview') || target.matches('[data-preview-url]')) {
        this.recordInteraction('click', target, event);
      }
    });

    // Monitor hover events for preview expansion
    document.addEventListener('mouseover', (event) => {
      const target = event.target as Element;
      if (target.closest('.preview-collapsed') || target.matches('.preview-thumbnail')) {
        this.recordInteraction('hover', target, event);
      }
    });
  }

  /**
   * Analyze preview element for failure patterns
   */
  private analyzePreviewElement(element: Element) {
    const url = element.getAttribute('data-preview-url') || 
                element.querySelector('a')?.href || '';
    
    if (!url) return;

    const pattern: Partial<PreviewFailurePattern> = {
      id: this.generatePatternId(),
      timestamp: Date.now(),
      url,
      context: {
        displayMode: element.getAttribute('data-display-mode') || 'card',
        componentState: this.extractComponentState(element),
        networkTiming: this.getNetworkTiming(url),
        domState: this.analyzeDOMState(element)
      },
      patterns: {}
    };

    // Check for "www." display issues
    const textContent = element.textContent || '';
    if (textContent.includes('www.') && !url.startsWith('http://www.') && !url.startsWith('https://www.')) {
      pattern.patterns!.wwwDisplay = true;
      pattern.failureType = 'url-display';
      pattern.failureMode = 'showing-www-prefix-incorrectly';
      pattern.expectedBehavior = 'Display clean URL without www prefix';
      pattern.actualBehavior = 'Displaying www prefix when not present in original URL';
      pattern.severity = 'medium';
    }

    // Check for URL truncation issues
    if (textContent.length > 0 && textContent.length < url.length * 0.5) {
      pattern.patterns!.urlTruncation = true;
      pattern.failureType = 'url-display';
      pattern.failureMode = 'excessive-url-truncation';
      pattern.severity = 'low';
    }

    // Check for thumbnail loading failures
    const thumbnail = element.querySelector('img');
    if (thumbnail && (thumbnail.getAttribute('src') === '' || thumbnail.classList.contains('error'))) {
      pattern.patterns!.thumbnailFailure = true;
      pattern.failureType = 'rendering';
      pattern.failureMode = 'thumbnail-load-failure';
      pattern.severity = 'medium';
    }

    // Check for preview collapse issues
    if (element.classList.contains('collapsed') && element.scrollHeight > element.clientHeight) {
      pattern.patterns!.previewCollapse = true;
      pattern.failureType = 'component-lifecycle';
      pattern.failureMode = 'preview-collapse-malfunction';
      pattern.severity = 'low';
    }

    // Store pattern if any issues found
    if (Object.values(pattern.patterns!).some(Boolean)) {
      this.patterns.push(pattern as PreviewFailurePattern);
      this.updateMetrics();
      this.analyzeRootCause(pattern as PreviewFailurePattern);
    }
  }

  /**
   * Capture specific "www." display issues
   */
  private captureWWWDisplayIssue(element: Element) {
    const pattern: PreviewFailurePattern = {
      id: this.generatePatternId(),
      timestamp: Date.now(),
      url: element.textContent || '',
      failureType: 'url-display',
      failureMode: 'www-prefix-display-error',
      expectedBehavior: 'Display URL as provided without adding www prefix',
      actualBehavior: 'Incorrectly displaying www prefix',
      context: {
        displayMode: 'text',
        componentState: this.extractComponentState(element),
        networkTiming: { requestStart: 0, responseStart: 0, responseEnd: 0, loadComplete: 0, errors: [] },
        domState: this.analyzeDOMState(element)
      },
      patterns: {
        wwwDisplay: true
      },
      severity: 'medium'
    };

    this.patterns.push(pattern);
    this.updateMetrics();
    this.analyzeRootCause(pattern);
  }

  /**
   * Analyze root cause of failure patterns
   */
  private analyzeRootCause(pattern: PreviewFailurePattern) {
    const reproductionSteps: string[] = [];

    if (pattern.patterns.wwwDisplay) {
      // Analyze www display issue root cause
      const url = pattern.url;
      
      if (!url.startsWith('http://www.') && !url.startsWith('https://www.')) {
        pattern.rootCause = 'URL parsing logic incorrectly adds www prefix during display formatting';
        reproductionSteps.push(
          '1. Parse a URL without www prefix (e.g., https://example.com)',
          '2. Render in preview component',
          '3. Observe incorrect www. prefix in displayed text',
          '4. Check URL parsing and formatting logic'
        );
      } else {
        pattern.rootCause = 'URL display component showing raw www prefix instead of clean format';
        reproductionSteps.push(
          '1. Parse a URL with www prefix',
          '2. Apply URL cleaning/formatting',
          '3. Display should show clean version without www',
          '4. Actual behavior shows raw www prefix'
        );
      }
    }

    if (pattern.patterns.thumbnailFailure) {
      pattern.rootCause = pattern.rootCause ? 
        pattern.rootCause + ' + Thumbnail loading failure due to CORS or network issues' :
        'Thumbnail loading failure - check image proxy and CORS configuration';
      reproductionSteps.push(
        '1. Attempt to load preview thumbnail',
        '2. Check network requests for image loading',
        '3. Verify CORS headers and proxy configuration'
      );
    }

    if (pattern.patterns.previewCollapse) {
      pattern.rootCause = pattern.rootCause ?
        pattern.rootCause + ' + Preview collapse mechanism not working correctly' :
        'Preview collapse UI state management issue - check CSS and JavaScript logic';
      reproductionSteps.push(
        '1. Load preview in collapsed state',
        '2. Attempt to expand/collapse',
        '3. Check CSS classes and state management'
      );
    }

    pattern.reproductionSteps = reproductionSteps;
  }

  /**
   * Extract component state from DOM element
   */
  private extractComponentState(element: Element): any {
    return {
      classes: Array.from(element.classList),
      attributes: Array.from(element.attributes).reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {} as Record<string, string>),
      dimensions: element.getBoundingClientRect(),
      visible: element.offsetParent !== null,
      computedStyle: window.getComputedStyle(element)
    };
  }

  /**
   * Analyze DOM state for preview component
   */
  private analyzeDOMState(element: Element): DOMState {
    return {
      componentMounted: element.isConnected,
      previewVisible: element.offsetParent !== null,
      thumbnailLoaded: element.querySelector('img')?.complete || false,
      linkParsed: element.querySelector('a')?.href !== undefined,
      renderErrors: this.detectRenderErrors(element)
    };
  }

  /**
   * Detect render errors in element
   */
  private detectRenderErrors(element: Element): string[] {
    const errors: string[] = [];
    
    // Check for empty required content
    if (element.classList.contains('link-preview') && !element.textContent?.trim()) {
      errors.push('Empty preview content');
    }

    // Check for broken images
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      if (img.src === '' || img.classList.contains('error')) {
        errors.push('Broken image: ' + img.src);
      }
    });

    // Check for malformed URLs
    const links = element.querySelectorAll('a');
    links.forEach(link => {
      try {
        new URL(link.href);
      } catch {
        errors.push('Malformed URL: ' + link.href);
      }
    });

    return errors;
  }

  /**
   * Record network metrics for preview requests
   */
  private recordNetworkMetrics(url: string, startTime: number, endTime: number, success: boolean) {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successRate = (this.metrics.successRate * (this.metrics.totalRequests - 1) + 1) / this.metrics.totalRequests;
    } else {
      this.metrics.failureRate = (this.metrics.failureRate * (this.metrics.totalRequests - 1) + 1) / this.metrics.totalRequests;
    }

    const loadTime = endTime - startTime;
    this.metrics.avgLoadTime = (this.metrics.avgLoadTime * (this.metrics.totalRequests - 1) + loadTime) / this.metrics.totalRequests;
  }

  /**
   * Record network failure
   */
  private recordNetworkFailure(url: string, startTime: number, endTime: number, error: Error) {
    this.metrics.patterns.networkTimeouts++;
    
    const pattern: PreviewFailurePattern = {
      id: this.generatePatternId(),
      timestamp: Date.now(),
      url,
      failureType: 'network',
      failureMode: 'request-timeout-or-error',
      expectedBehavior: 'Successful network request for preview data',
      actualBehavior: `Network error: ${error.message}`,
      context: {
        displayMode: 'unknown',
        componentState: {},
        networkTiming: {
          requestStart: startTime,
          responseStart: 0,
          responseEnd: endTime,
          loadComplete: endTime,
          errors: [error.message]
        },
        domState: {
          componentMounted: false,
          previewVisible: false,
          thumbnailLoaded: false,
          linkParsed: false,
          renderErrors: [error.message]
        }
      },
      patterns: {},
      severity: 'high'
    };

    this.patterns.push(pattern);
  }

  /**
   * Check if URL is preview-related request
   */
  private isPreviewRequest(url: string): boolean {
    return url.includes('/api/preview') || 
           url.includes('link-preview') ||
           url.includes('og-image') ||
           url.includes('thumbnail');
  }

  /**
   * Generate unique pattern ID
   */
  private generatePatternId(): string {
    return `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update metrics based on current patterns
   */
  private updateMetrics() {
    this.metrics.patterns = {
      wwwDisplayIssues: this.patterns.filter(p => p.patterns.wwwDisplay).length,
      urlDetectionFailures: this.patterns.filter(p => p.failureType === 'parsing').length,
      thumbnailFailures: this.patterns.filter(p => p.patterns.thumbnailFailure).length,
      componentErrors: this.patterns.filter(p => p.failureType === 'component-lifecycle').length,
      networkTimeouts: this.patterns.filter(p => p.failureType === 'network').length
    };
  }

  /**
   * Get network timing for URL
   */
  private getNetworkTiming(url: string): NetworkTiming {
    const entries = performance.getEntriesByName(url, 'navigation') as PerformanceNavigationTiming[];
    const entry = entries[0];
    
    if (entry) {
      return {
        requestStart: entry.requestStart,
        responseStart: entry.responseStart,
        responseEnd: entry.responseEnd,
        loadComplete: entry.loadEventEnd,
        errors: []
      };
    }

    return {
      requestStart: 0,
      responseStart: 0,
      responseEnd: 0,
      loadComplete: 0,
      errors: []
    };
  }

  /**
   * Record user interaction with preview
   */
  private recordInteraction(type: string, element: Element, event: Event) {
    // Record interaction patterns for UX analysis
    console.log(`Preview interaction: ${type}`, {
      element: element.tagName,
      classes: Array.from(element.classList),
      timestamp: Date.now(),
      eventType: event.type
    });
  }

  /**
   * Analyze React component render
   */
  private analyzeReactRender(root: any) {
    // Hook into React render cycles to monitor preview components
    // This would be implemented based on React DevTools hook API
  }

  /**
   * Capture component error
   */
  private captureComponentError(event: ErrorEvent) {
    const pattern: PreviewFailurePattern = {
      id: this.generatePatternId(),
      timestamp: Date.now(),
      url: window.location.href,
      failureType: 'component-lifecycle',
      failureMode: 'javascript-error',
      expectedBehavior: 'Component renders without errors',
      actualBehavior: `JavaScript error: ${event.message}`,
      context: {
        displayMode: 'unknown',
        componentState: {},
        networkTiming: { requestStart: 0, responseStart: 0, responseEnd: 0, loadComplete: 0, errors: [event.message] },
        domState: {
          componentMounted: false,
          previewVisible: false,
          thumbnailLoaded: false,
          linkParsed: false,
          renderErrors: [event.message]
        }
      },
      patterns: {},
      severity: 'high',
      reproductionSteps: [
        '1. Load page with preview component',
        '2. Trigger component render',
        `3. JavaScript error occurs: ${event.message}`,
        '4. Check component lifecycle and error handling'
      ]
    };

    this.patterns.push(pattern);
    this.metrics.patterns.componentErrors++;
  }

  /**
   * Capture promise rejection
   */
  private capturePromiseRejection(event: PromiseRejectionEvent) {
    const pattern: PreviewFailurePattern = {
      id: this.generatePatternId(),
      timestamp: Date.now(),
      url: window.location.href,
      failureType: 'network',
      failureMode: 'promise-rejection',
      expectedBehavior: 'Async operations complete successfully',
      actualBehavior: `Promise rejected: ${event.reason}`,
      context: {
        displayMode: 'unknown',
        componentState: {},
        networkTiming: { requestStart: 0, responseStart: 0, responseEnd: 0, loadComplete: 0, errors: [String(event.reason)] },
        domState: {
          componentMounted: false,
          previewVisible: false,
          thumbnailLoaded: false,
          linkParsed: false,
          renderErrors: [String(event.reason)]
        }
      },
      patterns: {},
      severity: 'medium'
    };

    this.patterns.push(pattern);
    this.updateMetrics();
  }

  /**
   * Get current failure patterns
   */
  public getPatterns(): PreviewFailurePattern[] {
    return [...this.patterns];
  }

  /**
   * Get current metrics
   */
  public getMetrics(): PreviewMetrics {
    return { ...this.metrics };
  }

  /**
   * Export patterns for neural training
   */
  public exportPatternsForTraining(): any {
    return {
      patterns: this.patterns,
      metrics: this.metrics,
      timestamp: Date.now(),
      version: '1.0.0'
    };
  }

  /**
   * Clear patterns (for memory management)
   */
  public clearPatterns(olderThan?: number) {
    const cutoff = olderThan || (Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    this.patterns = this.patterns.filter(p => p.timestamp > cutoff);
  }

  /**
   * Cleanup monitoring
   */
  public destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
  }
}

// Global instance
export const previewMonitor = new PreviewMonitor();