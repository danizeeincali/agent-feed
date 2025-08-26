/**
 * NLD Real-Time Endpoint Monitor
 * Automatically detects and analyzes API endpoint calls in real-time
 * Provides pattern recognition for successful vs failed requests
 */

interface EndpointCall {
  id: string;
  timestamp: Date;
  endpoint: string;
  method: string;
  statusCode?: number;
  responseTime?: number;
  success: boolean;
  errorMessage?: string;
  requestBody?: any;
  responseBody?: any;
  source: 'ClaudeInstanceManager' | 'useHTTPSSE' | 'other';
}

interface EndpointPattern {
  endpoint: string;
  method: string;
  successRate: number;
  averageResponseTime: number;
  commonErrors: string[];
  lastSeen: Date;
  callCount: number;
}

class NLDEndpointMonitor {
  private calls: EndpointCall[] = [];
  private patterns: Map<string, EndpointPattern> = new Map();
  private monitoringActive: boolean = false;
  private observers: ((call: EndpointCall) => void)[] = [];

  constructor() {
    this.setupNetworkInterception();
    this.startPatternAnalysis();
  }

  private setupNetworkInterception(): void {
    // Intercept fetch calls
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const startTime = performance.now();
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || 'GET';

      let call: EndpointCall = {
        id: `call-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        endpoint: url,
        method,
        success: false,
        source: this.detectSource(url)
      };

      try {
        const response = await originalFetch(input, init);
        const responseTime = performance.now() - startTime;
        
        call = {
          ...call,
          statusCode: response.status,
          responseTime,
          success: response.ok,
          errorMessage: response.ok ? undefined : `HTTP ${response.status} ${response.statusText}`
        };

        // Try to capture response body for analysis
        if (response.headers.get('content-type')?.includes('application/json')) {
          try {
            const clonedResponse = response.clone();
            call.responseBody = await clonedResponse.json();
          } catch (e) {
            // Ignore JSON parsing errors
          }
        }

        this.recordCall(call);
        return response;
      } catch (error) {
        const responseTime = performance.now() - startTime;
        
        call = {
          ...call,
          responseTime,
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Network error'
        };

        this.recordCall(call);
        throw error;
      }
    };
  }

  private detectSource(url: string): EndpointCall['source'] {
    if (url.includes('/api/claude/instances')) {
      return 'ClaudeInstanceManager';
    } else if (url.includes('/terminal/') || url.includes('/sse')) {
      return 'useHTTPSSE';
    }
    return 'other';
  }

  private recordCall(call: EndpointCall): void {
    this.calls.push(call);
    this.updatePatterns(call);
    this.notifyObservers(call);

    // Keep only last 1000 calls to prevent memory issues
    if (this.calls.length > 1000) {
      this.calls = this.calls.slice(-1000);
    }

    // Log critical failures immediately
    if (!call.success && this.isCriticalEndpoint(call.endpoint)) {
      console.warn('🚨 NLD Critical Endpoint Failure:', {
        endpoint: call.endpoint,
        method: call.method,
        error: call.errorMessage,
        source: call.source,
        timestamp: call.timestamp
      });
    }
  }

  private updatePatterns(call: EndpointCall): void {
    const key = `${call.method} ${call.endpoint}`;
    const existing = this.patterns.get(key);

    if (existing) {
      const newCallCount = existing.callCount + 1;
      const newSuccessCount = existing.successRate * existing.callCount + (call.success ? 1 : 0);
      const newTotalTime = existing.averageResponseTime * existing.callCount + (call.responseTime || 0);

      this.patterns.set(key, {
        ...existing,
        successRate: newSuccessCount / newCallCount,
        averageResponseTime: newTotalTime / newCallCount,
        callCount: newCallCount,
        lastSeen: call.timestamp,
        commonErrors: call.errorMessage && !existing.commonErrors.includes(call.errorMessage) 
          ? [...existing.commonErrors, call.errorMessage]
          : existing.commonErrors
      });
    } else {
      this.patterns.set(key, {
        endpoint: call.endpoint,
        method: call.method,
        successRate: call.success ? 1 : 0,
        averageResponseTime: call.responseTime || 0,
        callCount: 1,
        lastSeen: call.timestamp,
        commonErrors: call.errorMessage ? [call.errorMessage] : []
      });
    }
  }

  private isCriticalEndpoint(endpoint: string): boolean {
    const criticalPatterns = [
      '/api/claude/instances',
      '/api/v1/claude/instances',
      '/terminal/stream',
      '/health'
    ];
    
    return criticalPatterns.some(pattern => endpoint.includes(pattern));
  }

  private startPatternAnalysis(): void {
    setInterval(() => {
      this.analyzePatterns();
    }, 10000); // Analyze every 10 seconds
  }

  private analyzePatterns(): void {
    const criticalFailures = Array.from(this.patterns.values())
      .filter(pattern => this.isCriticalEndpoint(pattern.endpoint))
      .filter(pattern => pattern.successRate < 0.8) // Less than 80% success rate
      .sort((a, b) => a.successRate - b.successRate);

    if (criticalFailures.length > 0) {
      console.warn('📊 NLD Pattern Analysis - Critical Failures Detected:', criticalFailures);
      
      // Emit pattern analysis for NLD training
      this.emitNLDTrainingData({
        timestamp: new Date(),
        type: 'CRITICAL_ENDPOINT_FAILURES',
        patterns: criticalFailures,
        recommendedActions: this.generateRecommendations(criticalFailures)
      });
    }
  }

  private generateRecommendations(failures: EndpointPattern[]): string[] {
    const recommendations: string[] = [];

    for (const failure of failures) {
      if (failure.endpoint.includes('/api/claude/instances') && failure.commonErrors.some(e => e.includes('404'))) {
        recommendations.push('CRITICAL: Add endpoint alias for /api/claude/instances -> /api/v1/claude/instances');
      }
      
      if (failure.averageResponseTime > 5000) {
        recommendations.push(`PERFORMANCE: Optimize ${failure.endpoint} - average response time ${failure.averageResponseTime}ms`);
      }
      
      if (failure.successRate < 0.5) {
        recommendations.push(`RELIABILITY: Fix ${failure.endpoint} - only ${Math.round(failure.successRate * 100)}% success rate`);
      }
    }

    return recommendations;
  }

  private emitNLDTrainingData(data: any): void {
    // In a real implementation, this would send to NLD training system
    console.info('🧠 NLD Training Data Generated:', data);
  }

  // Public API
  public subscribe(callback: (call: EndpointCall) => void): () => void {
    this.observers.push(callback);
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  private notifyObservers(call: EndpointCall): void {
    this.observers.forEach(callback => {
      try {
        callback(call);
      } catch (error) {
        console.error('NLD Monitor observer error:', error);
      }
    });
  }

  public getPatterns(): EndpointPattern[] {
    return Array.from(this.patterns.values());
  }

  public getCriticalFailures(): EndpointPattern[] {
    return Array.from(this.patterns.values())
      .filter(pattern => this.isCriticalEndpoint(pattern.endpoint))
      .filter(pattern => pattern.successRate < 0.9);
  }

  public getRecentCalls(limit: number = 50): EndpointCall[] {
    return this.calls.slice(-limit);
  }

  public generateReport(): {
    summary: any;
    criticalIssues: any[];
    recommendations: string[];
    successPredictions: any;
  } {
    const patterns = this.getPatterns();
    const criticalFailures = this.getCriticalFailures();
    
    return {
      summary: {
        totalCalls: this.calls.length,
        uniqueEndpoints: patterns.length,
        overallSuccessRate: patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length,
        averageResponseTime: patterns.reduce((sum, p) => sum + p.averageResponseTime, 0) / patterns.length
      },
      criticalIssues: criticalFailures.map(failure => ({
        endpoint: failure.endpoint,
        method: failure.method,
        successRate: `${Math.round(failure.successRate * 100)}%`,
        callCount: failure.callCount,
        commonErrors: failure.commonErrors,
        impact: this.assessImpact(failure)
      })),
      recommendations: this.generateRecommendations(criticalFailures),
      successPredictions: {
        currentState: `${Math.round(patterns.reduce((sum, p) => sum + p.successRate, 0) / patterns.length * 100)}% overall success rate`,
        withFixes: this.predictSuccessWithFixes(criticalFailures)
      }
    };
  }

  private assessImpact(failure: EndpointPattern): string {
    if (failure.endpoint.includes('/api/claude/instances') && failure.method === 'POST') {
      return 'HIGH - Blocks all Claude instance creation';
    } else if (failure.endpoint.includes('/api/claude/instances') && failure.method === 'GET') {
      return 'HIGH - Prevents instance list display';
    } else if (failure.endpoint.includes('terminal')) {
      return 'MEDIUM - Affects terminal functionality';
    }
    return 'LOW - Non-critical functionality';
  }

  private predictSuccessWithFixes(failures: EndpointPattern[]): string {
    const highImpactFailures = failures.filter(f => this.assessImpact(f).includes('HIGH'));
    
    if (highImpactFailures.length === 0) {
      return '95% - Minor fixes needed';
    } else if (highImpactFailures.length <= 2) {
      return '85% - Fix critical endpoint paths';
    } else {
      return '60% - Major API contract issues need resolution';
    }
  }

  public startMonitoring(): void {
    this.monitoringActive = true;
    console.info('🔍 NLD Endpoint Monitor activated');
  }

  public stopMonitoring(): void {
    this.monitoringActive = false;
    console.info('🔍 NLD Endpoint Monitor deactivated');
  }
}

// Global instance for use across the application
export const nldEndpointMonitor = new NLDEndpointMonitor();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  nldEndpointMonitor.startMonitoring();
  
  // Add global access for debugging
  (window as any).nldEndpointMonitor = nldEndpointMonitor;
  
  console.info('🚀 NLD Endpoint Monitor initialized - Use window.nldEndpointMonitor for debugging');
}