/**
 * CORS and Timeout Pattern Detector - NLD System
 * 
 * Specialized detector for CORS issues and timeout patterns
 * with advanced pattern recognition and TDD prevention strategies.
 */

export interface CORSPattern {
  id: string;
  timestamp: number;
  type: 'PREFLIGHT_FAILED' | 'SIMPLE_REQUEST_BLOCKED' | 'CREDENTIALS_ISSUE' | 'METHOD_NOT_ALLOWED' | 'HEADER_BLOCKED';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: {
    origin: string;
    destination: string;
    method: string;
    headers: string[];
    credentials: boolean;
    blockedReason: string;
  };
  browserInfo: {
    userAgent: string;
    version: string;
    corsSupport: boolean;
  };
  tddPrevention: {
    testCases: string[];
    mockStrategies: string[];
    configFixes: string[];
  };
}

export interface TimeoutPattern {
  id: string;
  timestamp: number;
  type: 'REQUEST_TIMEOUT' | 'CONNECTION_TIMEOUT' | 'READ_TIMEOUT' | 'WRITE_TIMEOUT' | 'CUSTOM_TIMEOUT';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: {
    url: string;
    method: string;
    timeoutValue: number;
    actualDuration: number;
    stage: 'connection' | 'request' | 'response' | 'custom';
    retryAttempts: number;
  };
  networkConditions: {
    connectionSpeed: 'fast' | 'slow' | 'unknown';
    latency: number;
    packetLoss: boolean;
  };
  tddPrevention: {
    testCases: string[];
    retryStrategies: string[];
    fallbackApproaches: string[];
  };
}

export class NetworkCORSTimeoutDetector {
  private corsPatterns: Map<string, CORSPattern> = new Map();
  private timeoutPatterns: Map<string, TimeoutPattern> = new Map();
  private connectionMetrics: Map<string, any> = new Map();
  private preflight

Cache: Map<string, any> = new Map();

  constructor() {
    this.initializeCORSDetection();
    this.initializeTimeoutDetection();
    this.setupNetworkConditionMonitoring();
    console.log('🛡️ CORS & Timeout Detector initialized');
  }

  private initializeCORSDetection(): void {
    // Monitor CORS errors in fetch
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const options = args[1] || {};
      
      try {
        // Check for potential CORS issues before making request
        this.analyzePotentialCORSIssue(url, options);
        
        const response = await originalFetch(...args);
        
        // Clear preflight cache on success
        this.updatePreflightCache(url, options.method || 'GET', true);
        
        return response;
      } catch (error: any) {
        if (this.isCORSError(error)) {
          this.captureCORSPattern(url, options, error);
        }
        throw error;
      }
    };

    // Monitor CORS errors in XMLHttpRequest
    const originalXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(...args: any[]) {
      this.addEventListener('error', (event) => {
        if (this.status === 0 && this.readyState === 4) {
          // Likely CORS error
          this.captureCORSPattern(this._url, { method: this._method }, new Error('CORS error'));
        }
      }.bind(this));

      return originalXHRSend.call(this, ...args);
    };
  }

  private initializeTimeoutDetection(): void {
    // Monitor timeout errors in fetch with AbortController
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const startTime = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      const options = args[1] || {};
      
      // Set up timeout detection
      const timeoutId = this.setupTimeoutDetection(url, options, startTime);
      
      try {
        const response = await originalFetch(...args);
        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        const duration = performance.now() - startTime;
        
        if (this.isTimeoutError(error) || error.name === 'AbortError') {
          this.captureTimeoutPattern(url, options, duration, error);
        }
        throw error;
      }
    };

    // Monitor XMLHttpRequest timeouts
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
      this._method = method;
      this._url = typeof url === 'string' ? url : url.href;
      this._startTime = performance.now();
      
      this.addEventListener('timeout', () => {
        const duration = performance.now() - this._startTime;
        this.captureTimeoutPattern(this._url, { method }, duration, new Error('XMLHttpRequest timeout'));
      }.bind(this));

      return originalXHROpen.call(this, method, url, ...args);
    };
  }

  private setupNetworkConditionMonitoring(): void {
    // Monitor connection speed using Navigation Timing API
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.connectionMetrics.set('effectiveType', connection.effectiveType);
      this.connectionMetrics.set('downlink', connection.downlink);
      this.connectionMetrics.set('rtt', connection.rtt);

      connection.addEventListener('change', () => {
        this.connectionMetrics.set('effectiveType', connection.effectiveType);
        this.connectionMetrics.set('downlink', connection.downlink);
        this.connectionMetrics.set('rtt', connection.rtt);
      });
    }
  }

  private analyzePotentialCORSIssue(url: string, options: RequestInit): void {
    const origin = window.location.origin;
    const destination = new URL(url, window.location.href).origin;

    // Check if cross-origin
    if (origin !== destination) {
      const method = options.method || 'GET';
      const hasCustomHeaders = this.hasCustomHeaders(options.headers);
      const hasCredentials = options.credentials === 'include';

      // Check if preflight is required
      if (this.requiresPreflight(method, options.headers, hasCredentials)) {
        this.trackPreflightRequest(destination, method, options);
      }

      // Warn about potential issues
      if (hasCredentials && !this.isPreflightCached(destination, method)) {
        console.warn(`🚨 [NLD] Potential CORS credentials issue for ${url}`);
      }
    }
  }

  private captureCORSPattern(url: string, options: RequestInit, error: Error): void {
    const origin = window.location.origin;
    const destination = new URL(url, window.location.href).origin;
    
    const pattern: CORSPattern = {
      id: `cors_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: this.classifyCORSError(error, options),
      severity: this.calculateCORSSeverity(error, options),
      details: {
        origin,
        destination,
        method: options.method || 'GET',
        headers: this.extractHeaders(options.headers),
        credentials: options.credentials === 'include',
        blockedReason: error.message
      },
      browserInfo: {
        userAgent: navigator.userAgent,
        version: this.getBrowserVersion(),
        corsSupport: this.checkCORSSupport()
      },
      tddPrevention: {
        testCases: this.generateCORSTestCases(url, options, error),
        mockStrategies: this.generateCORSMockStrategies(url, options),
        configFixes: this.generateCORSConfigFixes(url, options, error)
      }
    };

    this.corsPatterns.set(pattern.id, pattern);
    this.logCORSPattern(pattern);
  }

  private captureTimeoutPattern(url: string, options: RequestInit, duration: number, error: Error): void {
    const pattern: TimeoutPattern = {
      id: `timeout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: this.classifyTimeoutError(error, options),
      severity: this.calculateTimeoutSeverity(duration, options),
      details: {
        url,
        method: options.method || 'GET',
        timeoutValue: this.extractTimeoutValue(options),
        actualDuration: duration,
        stage: this.determineTimeoutStage(error, duration),
        retryAttempts: this.getRetryAttempts(url)
      },
      networkConditions: {
        connectionSpeed: this.assessConnectionSpeed(),
        latency: this.connectionMetrics.get('rtt') || 0,
        packetLoss: this.detectPacketLoss(duration)
      },
      tddPrevention: {
        testCases: this.generateTimeoutTestCases(url, options, duration),
        retryStrategies: this.generateRetryStrategies(url, options, duration),
        fallbackApproaches: this.generateTimeoutFallbacks(url, options)
      }
    };

    this.timeoutPatterns.set(pattern.id, pattern);
    this.logTimeoutPattern(pattern);
  }

  private isCORSError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('cors') ||
           message.includes('cross-origin') ||
           message.includes('access-control') ||
           (error.name === 'TypeError' && message.includes('fetch'));
  }

  private isTimeoutError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('timeout') ||
           error.name === 'AbortError' ||
           error.name === 'TimeoutError';
  }

  private classifyCORSError(error: Error, options: RequestInit): CORSPattern['type'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('preflight')) return 'PREFLIGHT_FAILED';
    if (message.includes('method')) return 'METHOD_NOT_ALLOWED';
    if (message.includes('header')) return 'HEADER_BLOCKED';
    if (message.includes('credentials')) return 'CREDENTIALS_ISSUE';
    
    return 'SIMPLE_REQUEST_BLOCKED';
  }

  private classifyTimeoutError(error: Error, options: RequestInit): TimeoutPattern['type'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('connection')) return 'CONNECTION_TIMEOUT';
    if (message.includes('read')) return 'READ_TIMEOUT';
    if (message.includes('write')) return 'WRITE_TIMEOUT';
    if (error.name === 'AbortError') return 'CUSTOM_TIMEOUT';
    
    return 'REQUEST_TIMEOUT';
  }

  private calculateCORSSeverity(error: Error, options: RequestInit): CORSPattern['severity'] {
    if (options.credentials === 'include') return 'critical';
    if (options.method && !['GET', 'POST', 'HEAD'].includes(options.method)) return 'high';
    if (this.hasCustomHeaders(options.headers)) return 'medium';
    return 'low';
  }

  private calculateTimeoutSeverity(duration: number, options: RequestInit): TimeoutPattern['severity'] {
    if (duration > 30000) return 'critical'; // 30+ seconds
    if (duration > 15000) return 'high';     // 15+ seconds
    if (duration > 5000) return 'medium';    // 5+ seconds
    return 'low';
  }

  private hasCustomHeaders(headers: any): boolean {
    if (!headers) return false;
    
    const customHeaders = Object.keys(headers).filter(header => {
      const lowerHeader = header.toLowerCase();
      return !['accept', 'accept-language', 'content-language', 'content-type'].includes(lowerHeader);
    });
    
    return customHeaders.length > 0;
  }

  private requiresPreflight(method: string, headers: any, hasCredentials: boolean): boolean {
    // Non-simple methods require preflight
    if (!['GET', 'HEAD', 'POST'].includes(method)) return true;
    
    // Custom headers require preflight
    if (this.hasCustomHeaders(headers)) return true;
    
    // Content-Type beyond simple values requires preflight
    if (headers && headers['content-type']) {
      const contentType = headers['content-type'].toLowerCase();
      const simpleContentTypes = [
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'text/plain'
      ];
      if (!simpleContentTypes.some(type => contentType.includes(type))) {
        return true;
      }
    }
    
    return false;
  }

  private trackPreflightRequest(destination: string, method: string, options: RequestInit): void {
    const key = `${destination}_${method}`;
    this.preflightCache.set(key, {
      timestamp: Date.now(),
      options,
      successful: false
    });
  }

  private isPreflightCached(destination: string, method: string): boolean {
    const key = `${destination}_${method}`;
    const cached = this.preflightCache.get(key);
    
    if (!cached) return false;
    
    // Consider cached for 5 minutes
    return cached.successful && (Date.now() - cached.timestamp < 300000);
  }

  private updatePreflightCache(url: string, method: string, successful: boolean): void {
    const destination = new URL(url, window.location.href).origin;
    const key = `${destination}_${method}`;
    
    if (this.preflightCache.has(key)) {
      this.preflightCache.get(key)!.successful = successful;
    }
  }

  private setupTimeoutDetection(url: string, options: RequestInit, startTime: number): NodeJS.Timeout {
    const timeoutValue = this.extractTimeoutValue(options);
    
    return setTimeout(() => {
      const duration = performance.now() - startTime;
      console.warn(`🕐 [NLD] Request timeout detected: ${url} (${duration}ms)`);
    }, timeoutValue + 1000); // Add buffer to detect actual timeouts
  }

  private extractTimeoutValue(options: RequestInit): number {
    // Try to extract timeout from AbortSignal or default to 30 seconds
    if (options.signal && 'timeout' in (options.signal as any)) {
      return (options.signal as any).timeout;
    }
    return 30000; // Default 30 seconds
  }

  private extractHeaders(headers: any): string[] {
    if (!headers) return [];
    
    if (headers instanceof Headers) {
      const result: string[] = [];
      headers.forEach((value, name) => {
        result.push(`${name}: ${value}`);
      });
      return result;
    }
    
    if (typeof headers === 'object') {
      return Object.entries(headers).map(([key, value]) => `${key}: ${value}`);
    }
    
    return [];
  }

  private getBrowserVersion(): string {
    const userAgent = navigator.userAgent;
    const matches = userAgent.match(/(chrome|firefox|safari|edge|opera)\/(\d+)/i);
    return matches ? `${matches[1]} ${matches[2]}` : 'unknown';
  }

  private checkCORSSupport(): boolean {
    return typeof XMLHttpRequest !== 'undefined' && 'withCredentials' in new XMLHttpRequest();
  }

  private determineTimeoutStage(error: Error, duration: number): TimeoutPattern['details']['stage'] {
    if (duration < 1000) return 'connection';
    if (duration < 5000) return 'request';
    if (duration < 15000) return 'response';
    return 'custom';
  }

  private getRetryAttempts(url: string): number {
    // Track retry attempts for the same URL
    const attempts = this.timeoutPatterns.size && 
      Array.from(this.timeoutPatterns.values())
        .filter(p => p.details.url === url && p.timestamp > Date.now() - 60000)
        .length;
    return attempts;
  }

  private assessConnectionSpeed(): 'fast' | 'slow' | 'unknown' {
    const effectiveType = this.connectionMetrics.get('effectiveType');
    if (!effectiveType) return 'unknown';
    
    return ['4g', 'fast-2g'].includes(effectiveType) ? 'fast' : 'slow';
  }

  private detectPacketLoss(duration: number): boolean {
    const rtt = this.connectionMetrics.get('rtt') || 0;
    // Heuristic: if actual duration is much longer than expected RTT
    return duration > rtt * 10;
  }

  private generateCORSTestCases(url: string, options: RequestInit, error: Error): string[] {
    const tests = [
      'Test CORS preflight request handling',
      'Test cross-origin request with credentials',
      'Test custom headers in cross-origin requests',
      'Test OPTIONS request response headers',
      'Test CORS error handling and fallbacks'
    ];

    // Add specific tests based on error type
    if (options.credentials === 'include') {
      tests.push('Test CORS with credentials configuration');
    }

    if (this.hasCustomHeaders(options.headers)) {
      tests.push('Test custom headers allowlist configuration');
    }

    return tests;
  }

  private generateCORSMockStrategies(url: string, options: RequestInit): string[] {
    return [
      'Mock successful CORS preflight responses',
      'Mock CORS error scenarios for error handling',
      'Mock different browser CORS behaviors',
      'Use development proxy to avoid CORS in testing',
      'Mock server responses with proper CORS headers'
    ];
  }

  private generateCORSConfigFixes(url: string, options: RequestInit, error: Error): string[] {
    const fixes = [
      'Add proper Access-Control-Allow-Origin headers',
      'Configure Access-Control-Allow-Methods',
      'Set Access-Control-Allow-Headers for custom headers',
      'Enable Access-Control-Allow-Credentials if needed'
    ];

    if (options.credentials === 'include') {
      fixes.push('Configure server to handle credentials properly');
    }

    return fixes;
  }

  private generateTimeoutTestCases(url: string, options: RequestInit, duration: number): string[] {
    return [
      'Test request timeout scenarios',
      'Test timeout error handling',
      'Test retry mechanism with exponential backoff',
      'Test graceful degradation on timeout',
      'Test user feedback during slow requests',
      'Test cancel/abort functionality',
      'Test different network conditions'
    ];
  }

  private generateRetryStrategies(url: string, options: RequestInit, duration: number): string[] {
    return [
      'Implement exponential backoff retry',
      'Add circuit breaker pattern',
      'Use retry with jitter to avoid thundering herd',
      'Implement request deduplication',
      'Add timeout escalation (shorter to longer)',
      'Use different endpoints as fallbacks'
    ];
  }

  private generateTimeoutFallbacks(url: string, options: RequestInit): string[] {
    return [
      'Implement offline-first approach',
      'Cache previous successful responses',
      'Show cached content while retrying',
      'Provide manual retry button',
      'Implement graceful degradation',
      'Use background sync for non-critical requests'
    ];
  }

  private logCORSPattern(pattern: CORSPattern): void {
    console.log(`🚨 [NLD CORS] ${pattern.type} detected:`, {
      severity: pattern.severity,
      origin: pattern.details.origin,
      destination: pattern.details.destination,
      method: pattern.details.method,
      reason: pattern.details.blockedReason
    });
  }

  private logTimeoutPattern(pattern: TimeoutPattern): void {
    console.log(`⏰ [NLD Timeout] ${pattern.type} detected:`, {
      severity: pattern.severity,
      url: pattern.details.url,
      duration: `${pattern.details.actualDuration.toFixed(0)}ms`,
      expected: `${pattern.details.timeoutValue}ms`,
      stage: pattern.details.stage
    });
  }

  // Public API
  public getCORSPatterns(): CORSPattern[] {
    return Array.from(this.corsPatterns.values());
  }

  public getTimeoutPatterns(): TimeoutPattern[] {
    return Array.from(this.timeoutPatterns.values());
  }

  public getCORSMetrics(): any {
    const patterns = this.getCORSPatterns();
    return {
      total: patterns.length,
      byType: this.groupBy(patterns, 'type'),
      bySeverity: this.groupBy(patterns, 'severity'),
      mostProblematicOrigins: this.getMostProblematicOrigins(patterns),
      preventionCoverage: this.calculatePreventionCoverage(patterns)
    };
  }

  public getTimeoutMetrics(): any {
    const patterns = this.getTimeoutPatterns();
    return {
      total: patterns.length,
      byType: this.groupBy(patterns, 'type'),
      bySeverity: this.groupBy(patterns, 'severity'),
      averageDuration: this.calculateAverageDuration(patterns),
      slowestEndpoints: this.getSlowestEndpoints(patterns),
      preventionCoverage: this.calculateTimeoutPreventionCoverage(patterns)
    };
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = item[key];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private getMostProblematicOrigins(patterns: CORSPattern[]): Array<{ origin: string; count: number }> {
    const counts = patterns.reduce((acc, pattern) => {
      const origin = pattern.details.destination;
      acc[origin] = (acc[origin] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([origin, count]) => ({ origin, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private calculatePreventionCoverage(patterns: CORSPattern[]): number {
    const withPrevention = patterns.filter(p => p.tddPrevention.testCases.length > 0).length;
    return patterns.length > 0 ? withPrevention / patterns.length : 0;
  }

  private calculateAverageDuration(patterns: TimeoutPattern[]): number {
    if (patterns.length === 0) return 0;
    const total = patterns.reduce((sum, p) => sum + p.details.actualDuration, 0);
    return total / patterns.length;
  }

  private getSlowestEndpoints(patterns: TimeoutPattern[]): Array<{ url: string; avgDuration: number }> {
    const durations = patterns.reduce((acc, pattern) => {
      const url = pattern.details.url;
      if (!acc[url]) acc[url] = [];
      acc[url].push(pattern.details.actualDuration);
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(durations)
      .map(([url, times]) => ({
        url,
        avgDuration: times.reduce((sum, time) => sum + time, 0) / times.length
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10);
  }

  private calculateTimeoutPreventionCoverage(patterns: TimeoutPattern[]): number {
    const withPrevention = patterns.filter(p => p.tddPrevention.retryStrategies.length > 0).length;
    return patterns.length > 0 ? withPrevention / patterns.length : 0;
  }

  public exportForNeuralTraining(): any {
    return {
      corsPatterns: this.getCORSPatterns(),
      timeoutPatterns: this.getTimeoutPatterns(),
      metrics: {
        cors: this.getCORSMetrics(),
        timeout: this.getTimeoutMetrics()
      },
      networkConditions: Object.fromEntries(this.connectionMetrics),
      timestamp: Date.now(),
      version: '1.0.0'
    };
  }
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  (window as any).NLD_CORSTimeoutDetector = new NetworkCORSTimeoutDetector();
}