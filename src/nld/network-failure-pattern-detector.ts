/**
 * Network Failure Pattern Detector - NLD System
 * 
 * Captures and analyzes network error patterns from frontend console logs,
 * failed requests, CORS issues, timeouts, and endpoint mismatches.
 * 
 * This system builds a comprehensive database of network failure patterns
 * for neural training and future prevention.
 */

export interface NetworkFailurePattern {
  id: string;
  timestamp: number;
  errorType: 'NETWORK_ERROR' | 'CORS' | 'TIMEOUT' | 'ENDPOINT_MISMATCH' | 'AUTH_FAILURE' | 'SERVER_ERROR';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: {
    url?: string;
    method?: string;
    statusCode?: number;
    responseTime?: number;
    userAgent?: string;
    referer?: string;
  };
  errorDetails: {
    message: string;
    stack?: string;
    consoleErrors: string[];
    networkLogs: string[];
  };
  patterns: {
    isRecurring: boolean;
    frequency: number;
    relatedErrors: string[];
    preventionStrategies: string[];
  };
  tddImpact: {
    wouldTddPrevent: boolean;
    testingGap: string;
    recommendedTests: string[];
  };
}

export interface NetworkPatternMetrics {
  totalFailures: number;
  failuresByType: Record<string, number>;
  averageResponseTime: number;
  peakFailureHours: number[];
  mostFailedEndpoints: Array<{ endpoint: string; count: number }>;
  corsFailureRate: number;
  timeoutRate: number;
}

export class NetworkFailurePatternDetector {
  private patterns: Map<string, NetworkFailurePattern> = new Map();
  private metrics: NetworkPatternMetrics;
  private consoleObserver: MutationObserver | null = null;
  private networkInterceptor: any = null;

  constructor() {
    this.metrics = {
      totalFailures: 0,
      failuresByType: {},
      averageResponseTime: 0,
      peakFailureHours: [],
      mostFailedEndpoints: [],
      corsFailureRate: 0,
      timeoutRate: 0
    };

    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Monitor console errors
    this.interceptConsoleErrors();
    
    // Monitor fetch requests
    this.interceptNetworkRequests();
    
    // Monitor WebSocket connections
    this.interceptWebSocketConnections();
    
    // Monitor unhandled promise rejections
    this.interceptPromiseRejections();

    console.log('🔍 Network Failure Pattern Detector initialized');
  }

  private interceptConsoleErrors(): void {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      this.analyzeConsoleError('error', args);
    };

    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      this.analyzeConsoleError('warn', args);
    };
  }

  private interceptNetworkRequests(): void {
    // Intercept fetch requests
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const method = args[1]?.method || 'GET';

      try {
        const response = await originalFetch(...args);
        const responseTime = performance.now() - startTime;

        if (!response.ok) {
          this.captureNetworkFailure({
            url,
            method,
            statusCode: response.status,
            responseTime,
            errorType: this.classifyStatusCode(response.status),
            message: `HTTP ${response.status}: ${response.statusText}`
          });
        }

        return response;
      } catch (error: any) {
        const responseTime = performance.now() - startTime;
        this.captureNetworkFailure({
          url,
          method,
          responseTime,
          errorType: this.classifyNetworkError(error),
          message: error.message,
          stack: error.stack
        });
        throw error;
      }
    };

    // Intercept XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
      this._method = method;
      this._url = typeof url === 'string' ? url : url.href;
      this._startTime = performance.now();
      return originalXHROpen.call(this, method, url, ...args);
    };

    XMLHttpRequest.prototype.send = function(...args: any[]) {
      this.addEventListener('error', () => {
        const responseTime = performance.now() - this._startTime;
        this.captureNetworkFailure({
          url: this._url,
          method: this._method,
          responseTime,
          errorType: 'NETWORK_ERROR',
          message: 'XMLHttpRequest network error'
        });
      }.bind(this));

      this.addEventListener('timeout', () => {
        const responseTime = performance.now() - this._startTime;
        this.captureNetworkFailure({
          url: this._url,
          method: this._method,
          responseTime,
          errorType: 'TIMEOUT',
          message: 'XMLHttpRequest timeout'
        });
      }.bind(this));

      return originalXHRSend.call(this, ...args);
    };
  }

  private interceptWebSocketConnections(): void {
    const originalWebSocket = window.WebSocket;
    window.WebSocket = class extends originalWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        
        const wsUrl = typeof url === 'string' ? url : url.href;
        
        this.addEventListener('error', (event) => {
          this.captureNetworkFailure({
            url: wsUrl,
            method: 'WS_CONNECT',
            errorType: 'NETWORK_ERROR',
            message: 'WebSocket connection error'
          });
        }.bind(this));

        this.addEventListener('close', (event) => {
          if (event.code !== 1000) { // Not normal closure
            this.captureNetworkFailure({
              url: wsUrl,
              method: 'WS_CLOSE',
              statusCode: event.code,
              errorType: 'NETWORK_ERROR',
              message: `WebSocket closed abnormally: ${event.reason || 'No reason'}`
            });
          }
        }.bind(this));
      }
    } as any;
  }

  private interceptPromiseRejections(): void {
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      if (this.isNetworkError(error)) {
        this.captureNetworkFailure({
          errorType: 'NETWORK_ERROR',
          message: error?.message || 'Unhandled network error',
          stack: error?.stack
        });
      }
    });
  }

  private analyzeConsoleError(level: 'error' | 'warn', args: any[]): void {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');

    // Check for network-related console errors
    const networkPatterns = [
      /network error/i,
      /cors/i,
      /failed to fetch/i,
      /timeout/i,
      /connection refused/i,
      /endpoint.*not found/i,
      /api.*error/i,
      /websocket.*error/i
    ];

    if (networkPatterns.some(pattern => pattern.test(message))) {
      this.captureNetworkFailure({
        errorType: this.classifyConsoleError(message),
        message,
        consoleLevel: level
      });
    }
  }

  private captureNetworkFailure(details: any): void {
    const pattern: NetworkFailurePattern = {
      id: `net_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      errorType: details.errorType || 'NETWORK_ERROR',
      severity: this.calculateSeverity(details),
      context: {
        url: details.url,
        method: details.method,
        statusCode: details.statusCode,
        responseTime: details.responseTime,
        userAgent: navigator.userAgent,
        referer: document.referrer
      },
      errorDetails: {
        message: details.message,
        stack: details.stack,
        consoleErrors: this.getRecentConsoleErrors(),
        networkLogs: this.getRecentNetworkLogs()
      },
      patterns: {
        isRecurring: this.checkIfRecurring(details),
        frequency: this.calculateFrequency(details),
        relatedErrors: this.findRelatedErrors(details),
        preventionStrategies: this.generatePreventionStrategies(details)
      },
      tddImpact: {
        wouldTddPrevent: this.assessTddPrevention(details),
        testingGap: this.identifyTestingGap(details),
        recommendedTests: this.generateTestRecommendations(details)
      }
    };

    this.patterns.set(pattern.id, pattern);
    this.updateMetrics(pattern);
    this.logPattern(pattern);
  }

  private classifyStatusCode(status: number): NetworkFailurePattern['errorType'] {
    if (status >= 400 && status < 500) {
      if (status === 401 || status === 403) return 'AUTH_FAILURE';
      if (status === 404) return 'ENDPOINT_MISMATCH';
      return 'NETWORK_ERROR';
    }
    if (status >= 500) return 'SERVER_ERROR';
    return 'NETWORK_ERROR';
  }

  private classifyNetworkError(error: any): NetworkFailurePattern['errorType'] {
    const message = error?.message?.toLowerCase() || '';
    
    if (message.includes('cors')) return 'CORS';
    if (message.includes('timeout')) return 'TIMEOUT';
    if (message.includes('auth')) return 'AUTH_FAILURE';
    if (message.includes('endpoint') || message.includes('not found')) return 'ENDPOINT_MISMATCH';
    
    return 'NETWORK_ERROR';
  }

  private classifyConsoleError(message: string): NetworkFailurePattern['errorType'] {
    const msg = message.toLowerCase();
    
    if (msg.includes('cors')) return 'CORS';
    if (msg.includes('timeout')) return 'TIMEOUT';
    if (msg.includes('endpoint') || msg.includes('not found')) return 'ENDPOINT_MISMATCH';
    if (msg.includes('auth')) return 'AUTH_FAILURE';
    
    return 'NETWORK_ERROR';
  }

  private calculateSeverity(details: any): NetworkFailurePattern['severity'] {
    // Critical: Auth failures, CORS issues that block functionality
    if (details.errorType === 'AUTH_FAILURE' || details.errorType === 'CORS') {
      return 'critical';
    }
    
    // High: Server errors, timeouts
    if (details.errorType === 'SERVER_ERROR' || details.errorType === 'TIMEOUT') {
      return 'high';
    }
    
    // Medium: Endpoint mismatches
    if (details.errorType === 'ENDPOINT_MISMATCH') {
      return 'medium';
    }
    
    return 'low';
  }

  private checkIfRecurring(details: any): boolean {
    const similarErrors = Array.from(this.patterns.values()).filter(pattern => {
      return pattern.errorType === details.errorType &&
             pattern.context.url === details.url &&
             pattern.timestamp > Date.now() - (30 * 60 * 1000); // Last 30 minutes
    });

    return similarErrors.length > 2;
  }

  private calculateFrequency(details: any): number {
    const similarErrors = Array.from(this.patterns.values()).filter(pattern => {
      return pattern.errorType === details.errorType &&
             pattern.context.url === details.url;
    });

    return similarErrors.length;
  }

  private findRelatedErrors(details: any): string[] {
    const related = Array.from(this.patterns.values())
      .filter(pattern => 
        pattern.timestamp > Date.now() - (10 * 60 * 1000) && // Last 10 minutes
        (pattern.context.url === details.url || pattern.errorType === details.errorType)
      )
      .map(pattern => pattern.id)
      .slice(0, 5);

    return related;
  }

  private generatePreventionStrategies(details: any): string[] {
    const strategies: string[] = [];

    switch (details.errorType) {
      case 'CORS':
        strategies.push('Add CORS headers to backend');
        strategies.push('Use proxy configuration in development');
        strategies.push('Implement preflight request handling');
        break;
      
      case 'TIMEOUT':
        strategies.push('Implement request timeout handling');
        strategies.push('Add retry mechanism with exponential backoff');
        strategies.push('Use loading states to improve UX');
        break;
      
      case 'ENDPOINT_MISMATCH':
        strategies.push('Implement API versioning');
        strategies.push('Add endpoint validation');
        strategies.push('Use OpenAPI/Swagger for API contracts');
        break;
      
      case 'AUTH_FAILURE':
        strategies.push('Implement token refresh mechanism');
        strategies.push('Add proper authentication flow');
        strategies.push('Handle 401/403 responses gracefully');
        break;
    }

    return strategies;
  }

  private assessTddPrevention(details: any): boolean {
    // TDD could prevent many network issues through:
    // - Integration tests for API endpoints
    // - Mock testing for network failures
    // - Contract testing for API agreements
    return ['ENDPOINT_MISMATCH', 'AUTH_FAILURE'].includes(details.errorType);
  }

  private identifyTestingGap(details: any): string {
    switch (details.errorType) {
      case 'CORS':
        return 'Missing CORS integration tests';
      case 'TIMEOUT':
        return 'Missing timeout handling tests';
      case 'ENDPOINT_MISMATCH':
        return 'Missing API contract tests';
      case 'AUTH_FAILURE':
        return 'Missing authentication flow tests';
      default:
        return 'Missing network error handling tests';
    }
  }

  private generateTestRecommendations(details: any): string[] {
    const tests: string[] = [];

    switch (details.errorType) {
      case 'CORS':
        tests.push('Test CORS preflight requests');
        tests.push('Verify cross-origin request headers');
        break;
      
      case 'TIMEOUT':
        tests.push('Test request timeout scenarios');
        tests.push('Verify timeout error handling');
        tests.push('Test retry mechanism');
        break;
      
      case 'ENDPOINT_MISMATCH':
        tests.push('Test API endpoint existence');
        tests.push('Validate request/response contracts');
        tests.push('Test 404 error handling');
        break;
      
      case 'AUTH_FAILURE':
        tests.push('Test authentication token validation');
        tests.push('Test unauthorized request handling');
        tests.push('Test token refresh flow');
        break;
    }

    return tests;
  }

  private isNetworkError(error: any): boolean {
    if (!error) return false;
    
    const message = error.message?.toLowerCase() || '';
    const stack = error.stack?.toLowerCase() || '';
    
    const networkKeywords = [
      'network', 'fetch', 'cors', 'timeout', 'connection',
      'endpoint', 'api', 'http', 'websocket', 'xhr'
    ];
    
    return networkKeywords.some(keyword => 
      message.includes(keyword) || stack.includes(keyword)
    );
  }

  private getRecentConsoleErrors(): string[] {
    // This would need to be implemented with actual console log capture
    return [];
  }

  private getRecentNetworkLogs(): string[] {
    // This would capture recent network request logs
    return [];
  }

  private updateMetrics(pattern: NetworkFailurePattern): void {
    this.metrics.totalFailures++;
    this.metrics.failuresByType[pattern.errorType] = 
      (this.metrics.failuresByType[pattern.errorType] || 0) + 1;
    
    if (pattern.context.responseTime) {
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime + pattern.context.responseTime) / 2;
    }

    // Update endpoint failure tracking
    if (pattern.context.url) {
      const existing = this.metrics.mostFailedEndpoints.find(e => e.endpoint === pattern.context.url);
      if (existing) {
        existing.count++;
      } else {
        this.metrics.mostFailedEndpoints.push({ endpoint: pattern.context.url, count: 1 });
      }
      
      this.metrics.mostFailedEndpoints.sort((a, b) => b.count - a.count);
      this.metrics.mostFailedEndpoints = this.metrics.mostFailedEndpoints.slice(0, 10);
    }
  }

  private logPattern(pattern: NetworkFailurePattern): void {
    console.log(`🚨 [NLD] Network Failure Captured:`, {
      type: pattern.errorType,
      severity: pattern.severity,
      url: pattern.context.url,
      message: pattern.errorDetails.message,
      tddPrevention: pattern.tddImpact.wouldTddPrevent
    });
  }

  // Public API
  public getPatterns(): NetworkFailurePattern[] {
    return Array.from(this.patterns.values());
  }

  public getMetrics(): NetworkPatternMetrics {
    return { ...this.metrics };
  }

  public exportForNeuralTraining(): any {
    return {
      patterns: this.getPatterns(),
      metrics: this.getMetrics(),
      timestamp: Date.now(),
      version: '1.0.0'
    };
  }

  public getPatternsForTDD(): Array<{
    pattern: NetworkFailurePattern;
    testSuggestions: string[];
    preventionStrategy: string;
  }> {
    return this.getPatterns()
      .filter(p => p.tddImpact.wouldTddPrevent)
      .map(pattern => ({
        pattern,
        testSuggestions: pattern.tddImpact.recommendedTests,
        preventionStrategy: pattern.patterns.preventionStrategies.join(', ')
      }));
  }
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  (window as any).NLD_NetworkDetector = new NetworkFailurePatternDetector();
}