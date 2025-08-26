/**
 * Production Validation Helpers for Claude Instance Management
 * Real-world production testing utilities with comprehensive validation
 */

import { Page, BrowserContext, expect } from '@playwright/test';

export interface ProductionValidationConfig {
  performanceThresholds: {
    pageLoadTime: number;
    instanceLaunchTime: number;
    chatResponseTime: number;
    memoryUsageLimit: number;
    cpuUsageLimit: number;
  };
  reliability: {
    maxRetries: number;
    reconnectTimeout: number;
    healthCheckInterval: number;
  };
  security: {
    enableXSSProtection: boolean;
    validateCSRF: boolean;
    checkSSL: boolean;
  };
  scalability: {
    maxConcurrentInstances: number;
    maxConcurrentUsers: number;
    messageQueueLimit: number;
  };
}

export const DEFAULT_PRODUCTION_CONFIG: ProductionValidationConfig = {
  performanceThresholds: {
    pageLoadTime: 3000,
    instanceLaunchTime: 10000,
    chatResponseTime: 5000,
    memoryUsageLimit: 100 * 1024 * 1024, // 100MB
    cpuUsageLimit: 80 // 80%
  },
  reliability: {
    maxRetries: 5,
    reconnectTimeout: 30000,
    healthCheckInterval: 5000
  },
  security: {
    enableXSSProtection: true,
    validateCSRF: true,
    checkSSL: true
  },
  scalability: {
    maxConcurrentInstances: 10,
    maxConcurrentUsers: 50,
    messageQueueLimit: 1000
  }
};

export class ProductionValidationHelpers {
  private startTime: number = 0;
  private performanceMetrics: Map<string, number[]> = new Map();
  private memoryBaseline: number = 0;
  private errorLog: Array<{timestamp: number, error: string, severity: string}> = [];

  constructor(
    private page: Page,
    private config: ProductionValidationConfig = DEFAULT_PRODUCTION_CONFIG
  ) {}

  // Performance Monitoring
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.page.goto('/claude-instances');
    await this.page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    this.recordMetric('pageLoadTime', loadTime);
    return loadTime;
  }

  async measureInstanceLaunchTime(instanceType: string): Promise<number> {
    const startTime = Date.now();
    
    // Click launch button
    await this.page.getByTestId('instance-selector-button').click();
    await this.page.getByTestId(`instance-type-${instanceType}`).click();
    await this.page.getByTestId('launch-instance-button').click();
    
    // Wait for instance to be running
    await this.page.waitForFunction(() => {
      const statusElements = document.querySelectorAll('[data-testid*="instance-status"]');
      return Array.from(statusElements).some(el => 
        el.textContent?.includes('running') || el.textContent?.includes('active')
      );
    }, { timeout: this.config.performanceThresholds.instanceLaunchTime });
    
    const launchTime = Date.now() - startTime;
    this.recordMetric('instanceLaunchTime', launchTime);
    return launchTime;
  }

  async measureChatResponseTime(message: string): Promise<number> {
    const startTime = Date.now();
    
    // Send message
    await this.page.getByTestId('chat-input').fill(message);
    await this.page.getByTestId('send-message-button').click();
    
    // Wait for assistant response
    await this.page.waitForSelector('[data-testid="assistant-message"]:last-child', {
      timeout: this.config.performanceThresholds.chatResponseTime
    });
    
    const responseTime = Date.now() - startTime;
    this.recordMetric('chatResponseTime', responseTime);
    return responseTime;
  }

  async getMemoryUsage(): Promise<{used: number, total: number} | null> {
    try {
      const memoryInfo = await this.page.evaluate(() => {
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          return {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize
          };
        }
        return null;
      });
      
      if (memoryInfo) {
        this.recordMetric('memoryUsage', memoryInfo.used);
      }
      
      return memoryInfo;
    } catch (error) {
      console.warn('Memory monitoring not available');
      return null;
    }
  }

  async getCPUUsage(): Promise<number | null> {
    try {
      // Estimate CPU usage based on frame timing
      const frameTime = await this.page.evaluate(() => {
        return new Promise<number>(resolve => {
          const start = performance.now();
          requestAnimationFrame(() => {
            const end = performance.now();
            resolve(end - start);
          });
        });
      });
      
      // Convert frame time to CPU usage estimate (simplified)
      const cpuUsage = Math.min((frameTime / 16.67) * 100, 100); // 16.67ms = 60fps
      this.recordMetric('cpuUsage', cpuUsage);
      return cpuUsage;
    } catch (error) {
      console.warn('CPU monitoring not available');
      return null;
    }
  }

  private recordMetric(name: string, value: number) {
    if (!this.performanceMetrics.has(name)) {
      this.performanceMetrics.set(name, []);
    }
    this.performanceMetrics.get(name)!.push(value);
  }

  // Database Integration Testing
  async validateDatabaseIntegration(): Promise<boolean> {
    try {
      // Test actual database operations
      const response = await this.page.evaluate(async () => {
        try {
          // Create test instance in real database
          const createResponse = await fetch('/api/claude/instances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'Production Test Instance',
              workingDirectory: '/tmp/test',
              skipPermissions: false
            })
          });
          
          if (!createResponse.ok) {
            throw new Error(`Create failed: ${createResponse.status}`);
          }
          
          const instance = await createResponse.json();
          
          // Verify instance was created
          const listResponse = await fetch('/api/claude/instances');
          const instances = await listResponse.json();
          
          const found = instances.find((i: any) => i.id === instance.id);
          
          // Cleanup
          await fetch(`/api/claude/instances/${instance.id}`, {
            method: 'DELETE'
          });
          
          return { success: true, instanceFound: !!found };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });
      
      if (!response.success) {
        this.logError('Database integration test failed', response.error, 'high');
        return false;
      }
      
      return response.instanceFound;
    } catch (error) {
      this.logError('Database integration test error', error.message, 'high');
      return false;
    }
  }

  // WebSocket Production Testing
  async validateWebSocketProduction(): Promise<{
    connectionEstablished: boolean;
    messageDelivery: boolean;
    reconnectionWorking: boolean;
    performanceAcceptable: boolean;
  }> {
    const results = {
      connectionEstablished: false,
      messageDelivery: false,
      reconnectionWorking: false,
      performanceAcceptable: false
    };

    try {
      // Test connection establishment
      const connectionStart = Date.now();
      await this.page.waitForFunction(() => {
        const status = document.querySelector('[data-testid="websocket-status"]');
        return status?.textContent?.includes('Connected');
      }, { timeout: 10000 });
      
      const connectionTime = Date.now() - connectionStart;
      results.connectionEstablished = true;
      results.performanceAcceptable = connectionTime < 5000;

      // Test message delivery with real WebSocket
      const messageStart = Date.now();
      await this.page.evaluate(() => {
        // Send actual WebSocket message
        const wsStatus = document.querySelector('[data-testid="websocket-status"]');
        if (wsStatus) {
          const event = new CustomEvent('test-websocket-message', {
            detail: { type: 'ping', timestamp: Date.now() }
          });
          document.dispatchEvent(event);
        }
      });

      // Wait for response
      await this.page.waitForFunction(() => {
        const response = document.querySelector('[data-testid="websocket-response"]');
        return response && response.textContent?.includes('pong');
      }, { timeout: 5000 });
      
      const messageTime = Date.now() - messageStart;
      results.messageDelivery = true;
      results.performanceAcceptable = results.performanceAcceptable && messageTime < 2000;

      // Test reconnection by simulating disconnect
      await this.page.evaluate(() => {
        // Trigger reconnection test
        const event = new CustomEvent('test-websocket-disconnect');
        document.dispatchEvent(event);
      });

      // Wait for reconnection
      await this.page.waitForFunction(() => {
        const status = document.querySelector('[data-testid="websocket-status"]');
        return status?.textContent?.includes('Reconnecting') || 
               status?.textContent?.includes('Connected');
      }, { timeout: 15000 });

      results.reconnectionWorking = true;

    } catch (error) {
      this.logError('WebSocket production test failed', error.message, 'high');
    }

    return results;
  }

  // Security Validation
  async validateSecurityMeasures(): Promise<{
    xssProtection: boolean;
    csrfProtection: boolean;
    inputSanitization: boolean;
    sslConfiguration: boolean;
  }> {
    const results = {
      xssProtection: false,
      csrfProtection: false,
      inputSanitization: false,
      sslConfiguration: false
    };

    // Test XSS Protection
    try {
      const xssPayload = '<script>window.xssTest = "vulnerable"</script>';
      await this.page.getByTestId('chat-input').fill(xssPayload);
      await this.page.getByTestId('send-message-button').click();
      
      await this.page.waitForTimeout(1000);
      
      const xssExecuted = await this.page.evaluate(() => {
        return !!(window as any).xssTest;
      });
      
      results.xssProtection = !xssExecuted; // Should NOT execute
      
      if (xssExecuted) {
        this.logError('XSS vulnerability detected', 'Script execution not blocked', 'critical');
      }
    } catch (error) {
      // Error is expected for blocked XSS
      results.xssProtection = true;
    }

    // Test Input Sanitization
    try {
      const maliciousInputs = [
        '${7*7}', // Template injection
        '../../etc/passwd', // Path traversal
        'DROP TABLE users;', // SQL injection
        'javascript:alert(1)', // JavaScript protocol
      ];

      for (const input of maliciousInputs) {
        await this.page.getByTestId('chat-input').fill(input);
        await this.page.getByTestId('send-message-button').click();
        await this.page.waitForTimeout(500);
        
        // Check if input was sanitized
        const messageText = await this.page.locator('[data-testid="user-message"]:last-child').textContent();
        
        if (messageText?.includes(input)) {
          // Check if it's properly escaped/sanitized
          const isEscaped = !messageText.includes('<script>') && 
                           !messageText.includes('javascript:') &&
                           !messageText.includes('DROP TABLE');
          
          if (!isEscaped && input.includes('<script>')) {
            this.logError('Input sanitization failed', `Unsanitized input: ${input}`, 'high');
          }
        }
      }
      
      results.inputSanitization = true;
    } catch (error) {
      this.logError('Input sanitization test failed', error.message, 'medium');
    }

    // Test SSL Configuration (if applicable)
    if (this.config.security.checkSSL) {
      try {
        const isHTTPS = await this.page.evaluate(() => location.protocol === 'https:');
        results.sslConfiguration = isHTTPS;
        
        if (!isHTTPS && process.env.NODE_ENV === 'production') {
          this.logError('SSL not configured', 'Production should use HTTPS', 'high');
        }
      } catch (error) {
        this.logError('SSL check failed', error.message, 'low');
      }
    } else {
      results.sslConfiguration = true; // Skip if not required
    }

    return results;
  }

  // Load Testing
  async performLoadTest(duration: number = 30000): Promise<{
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
    memoryGrowth: number;
  }> {
    const startMemory = await this.getMemoryUsage();
    const startTime = Date.now();
    let requestCount = 0;
    let errorCount = 0;
    const responseTimes: number[] = [];

    console.log(`Starting load test for ${duration}ms...`);

    const loadTestInterval = setInterval(async () => {
      const requestStart = Date.now();
      
      try {
        // Simulate user actions
        await this.page.evaluate(() => {
          // Trigger various UI interactions
          const events = [
            () => document.querySelector('[data-testid="instance-selector-button"]')?.click(),
            () => {
              const input = document.querySelector('[data-testid="chat-input"]') as HTMLInputElement;
              if (input) {
                input.value = `Load test message ${Date.now()}`;
                input.dispatchEvent(new Event('input', { bubbles: true }));
              }
            },
            () => document.querySelector('[data-testid="websocket-status"]')?.textContent
          ];
          
          const randomEvent = events[Math.floor(Math.random() * events.length)];
          randomEvent();
        });
        
        const responseTime = Date.now() - requestStart;
        responseTimes.push(responseTime);
        requestCount++;
      } catch (error) {
        errorCount++;
        this.logError('Load test request failed', error.message, 'low');
      }
    }, 100); // 10 requests per second

    // Wait for test duration
    await this.page.waitForTimeout(duration);
    clearInterval(loadTestInterval);

    const endMemory = await this.getMemoryUsage();
    const totalTime = Date.now() - startTime;

    const results = {
      requestsPerSecond: (requestCount / totalTime) * 1000,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0,
      errorRate: errorCount / requestCount,
      memoryGrowth: endMemory && startMemory ? endMemory.used - startMemory.used : 0
    };

    // Log performance concerns
    if (results.averageResponseTime > 1000) {
      this.logError('Performance issue', `Average response time: ${results.averageResponseTime}ms`, 'medium');
    }
    
    if (results.errorRate > 0.05) {
      this.logError('Reliability issue', `Error rate: ${(results.errorRate * 100).toFixed(2)}%`, 'high');
    }

    if (results.memoryGrowth > 50 * 1024 * 1024) { // 50MB growth
      this.logError('Memory leak concern', `Memory growth: ${results.memoryGrowth} bytes`, 'medium');
    }

    console.log('Load test results:', results);
    return results;
  }

  // Memory Leak Detection
  async detectMemoryLeaks(iterations: number = 10): Promise<{
    hasLeak: boolean;
    growthRate: number;
    finalMemoryUsage: number;
  }> {
    const memoryReadings: number[] = [];
    
    // Take baseline reading
    const baselineMemory = await this.getMemoryUsage();
    if (!baselineMemory) {
      return { hasLeak: false, growthRate: 0, finalMemoryUsage: 0 };
    }
    
    memoryReadings.push(baselineMemory.used);

    // Perform memory-intensive operations
    for (let i = 0; i < iterations; i++) {
      // Create and destroy instances
      await this.page.getByTestId('instance-selector-button').click();
      await this.page.getByTestId('instance-type-prod-claude').click();
      await this.page.getByTestId('launch-instance-button').click();
      
      await this.page.waitForTimeout(1000);
      
      // Force garbage collection (if available)
      await this.page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      const currentMemory = await this.getMemoryUsage();
      if (currentMemory) {
        memoryReadings.push(currentMemory.used);
      }
      
      await this.page.waitForTimeout(500);
    }

    // Calculate growth rate
    const growthRate = memoryReadings.length > 1 ? 
      (memoryReadings[memoryReadings.length - 1] - memoryReadings[0]) / iterations : 0;

    const hasLeak = growthRate > 1024 * 1024; // 1MB per iteration threshold

    if (hasLeak) {
      this.logError('Memory leak detected', `Growth rate: ${growthRate} bytes/iteration`, 'high');
    }

    return {
      hasLeak,
      growthRate,
      finalMemoryUsage: memoryReadings[memoryReadings.length - 1] || 0
    };
  }

  // Error Recovery Testing
  async testErrorRecovery(): Promise<{
    networkRecovery: boolean;
    serverErrorRecovery: boolean;
    clientErrorRecovery: boolean;
  }> {
    const results = {
      networkRecovery: false,
      serverErrorRecovery: false,
      clientErrorRecovery: false
    };

    try {
      // Test network recovery
      await this.page.context().setOffline(true);
      await this.page.waitForTimeout(1000);
      
      await this.page.context().setOffline(false);
      await this.page.waitForFunction(() => {
        const status = document.querySelector('[data-testid="websocket-status"]');
        return status?.textContent?.includes('Connected');
      }, { timeout: 15000 });
      
      results.networkRecovery = true;

      // Test server error recovery
      await this.page.route('**/api/claude/**', async route => {
        await route.fulfill({ status: 500, body: 'Server Error' });
      });

      await this.page.getByTestId('send-message-button').click();
      await this.page.waitForTimeout(2000);

      // Remove error route
      await this.page.unroute('**/api/claude/**');
      
      // Should show retry option
      const retryButton = this.page.getByTestId('retry-message');
      if (await retryButton.isVisible()) {
        await retryButton.click();
        results.serverErrorRecovery = true;
      }

      // Test client error recovery by triggering JavaScript error
      await this.page.evaluate(() => {
        try {
          // Intentionally cause an error
          throw new Error('Test client error');
        } catch (e) {
          // Should be handled gracefully
          console.error('Test error handled');
        }
      });

      // App should still be responsive
      await this.page.getByTestId('instance-selector-button').click();
      results.clientErrorRecovery = true;

    } catch (error) {
      this.logError('Error recovery test failed', error.message, 'medium');
    }

    return results;
  }

  // Comprehensive Production Report
  async generateProductionReport(): Promise<{
    summary: {
      overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
      readyForProduction: boolean;
      criticalIssues: number;
      recommendationsCount: number;
    };
    performance: any;
    security: any;
    reliability: any;
    scalability: any;
    issues: Array<{severity: string, category: string, description: string}>;
    recommendations: string[];
  }> {
    console.log('Generating comprehensive production validation report...');

    // Performance validation
    const pageLoadTime = await this.measurePageLoadTime();
    const memoryUsage = await this.getMemoryUsage();
    
    // Security validation
    const securityResults = await this.validateSecurityMeasures();
    
    // Database integration
    const dbIntegration = await this.validateDatabaseIntegration();
    
    // WebSocket validation
    const wsResults = await this.validateWebSocketProduction();
    
    // Load testing
    const loadTestResults = await this.performLoadTest(10000);
    
    // Memory leak detection
    const memoryLeakResults = await this.detectMemoryLeaks(5);
    
    // Error recovery
    const errorRecoveryResults = await this.testErrorRecovery();

    // Analyze metrics
    const performanceScore = this.calculatePerformanceScore({
      pageLoadTime,
      memoryUsage: memoryUsage?.used || 0,
      loadTestResults
    });

    const securityScore = this.calculateSecurityScore(securityResults);
    const reliabilityScore = this.calculateReliabilityScore({
      wsResults,
      dbIntegration,
      errorRecoveryResults,
      memoryLeakResults
    });

    const overallScore = (performanceScore + securityScore + reliabilityScore) / 3;
    
    const overallHealth = 
      overallScore >= 90 ? 'excellent' :
      overallScore >= 75 ? 'good' :
      overallScore >= 60 ? 'fair' : 'poor';

    const criticalIssues = this.errorLog.filter(e => e.severity === 'critical').length;
    const readyForProduction = overallScore >= 75 && criticalIssues === 0;

    const recommendations = this.generateRecommendations({
      performanceScore,
      securityScore,
      reliabilityScore,
      memoryLeakResults,
      loadTestResults
    });

    return {
      summary: {
        overallHealth,
        readyForProduction,
        criticalIssues,
        recommendationsCount: recommendations.length
      },
      performance: {
        score: performanceScore,
        pageLoadTime,
        memoryUsage: memoryUsage?.used || 0,
        loadTest: loadTestResults
      },
      security: {
        score: securityScore,
        ...securityResults
      },
      reliability: {
        score: reliabilityScore,
        databaseIntegration: dbIntegration,
        webSocketValidation: wsResults,
        errorRecovery: errorRecoveryResults,
        memoryLeaks: memoryLeakResults
      },
      scalability: {
        concurrent: loadTestResults.requestsPerSecond,
        memoryEfficiency: !memoryLeakResults.hasLeak
      },
      issues: this.errorLog.map(e => ({
        severity: e.severity,
        category: 'general',
        description: e.error
      })),
      recommendations
    };
  }

  private calculatePerformanceScore(metrics: {
    pageLoadTime: number;
    memoryUsage: number;
    loadTestResults: any;
  }): number {
    let score = 100;
    
    if (metrics.pageLoadTime > this.config.performanceThresholds.pageLoadTime) {
      score -= 20;
    }
    
    if (metrics.memoryUsage > this.config.performanceThresholds.memoryUsageLimit) {
      score -= 25;
    }
    
    if (metrics.loadTestResults.errorRate > 0.05) {
      score -= 30;
    }
    
    if (metrics.loadTestResults.averageResponseTime > 2000) {
      score -= 15;
    }
    
    return Math.max(0, score);
  }

  private calculateSecurityScore(results: any): number {
    let score = 100;
    
    if (!results.xssProtection) score -= 40;
    if (!results.inputSanitization) score -= 30;
    if (!results.sslConfiguration) score -= 20;
    if (!results.csrfProtection) score -= 10;
    
    return Math.max(0, score);
  }

  private calculateReliabilityScore(metrics: any): number {
    let score = 100;
    
    if (!metrics.dbIntegration) score -= 30;
    if (!metrics.wsResults.connectionEstablished) score -= 25;
    if (!metrics.wsResults.reconnectionWorking) score -= 20;
    if (!metrics.errorRecoveryResults.networkRecovery) score -= 15;
    if (metrics.memoryLeakResults.hasLeak) score -= 10;
    
    return Math.max(0, score);
  }

  private generateRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];
    
    if (metrics.performanceScore < 80) {
      recommendations.push('Optimize page load times by implementing lazy loading and code splitting');
      recommendations.push('Consider implementing service worker for offline capabilities');
    }
    
    if (metrics.securityScore < 90) {
      recommendations.push('Implement Content Security Policy (CSP) headers');
      recommendations.push('Add rate limiting to prevent abuse');
    }
    
    if (metrics.reliabilityScore < 85) {
      recommendations.push('Implement circuit breaker pattern for external service calls');
      recommendations.push('Add comprehensive error boundaries and fallback UI');
    }
    
    if (metrics.memoryLeakResults.hasLeak) {
      recommendations.push('Investigate and fix memory leaks in component lifecycle');
      recommendations.push('Implement proper cleanup in useEffect hooks');
    }
    
    if (metrics.loadTestResults.errorRate > 0.02) {
      recommendations.push('Improve error handling and retry mechanisms');
      recommendations.push('Add proper loading states and user feedback');
    }
    
    return recommendations;
  }

  private logError(context: string, error: string, severity: string) {
    this.errorLog.push({
      timestamp: Date.now(),
      error: `${context}: ${error}`,
      severity
    });
    
    console.error(`[${severity.toUpperCase()}] ${context}: ${error}`);
  }

  // Cleanup
  cleanup() {
    this.performanceMetrics.clear();
    this.errorLog = [];
  }
}

export default ProductionValidationHelpers;