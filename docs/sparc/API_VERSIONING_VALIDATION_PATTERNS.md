# API Versioning Validation Patterns

## Overview

This document defines comprehensive validation patterns for ensuring API endpoint consistency across the Agent Feed system, specifically addressing SSE connection path management and versioned API compliance.

## 1. Endpoint Consistency Validation Framework

### 1.1 Validation Categories

```typescript
interface EndpointValidationCategories {
  http: {
    crud: string[];        // Create, Read, Update, Delete operations
    status: string[];      // Health checks, metrics
    management: string[];  // Instance lifecycle operations
  };
  sse: {
    streams: string[];     // Real-time data streams
    management: string[];  // Connection management
  };
  compatibility: {
    legacy: string[];      // Non-versioned endpoints
    versioned: string[];   // Versioned endpoints
  };
}
```

### 1.2 Test Matrix Pattern

```typescript
interface EndpointTestMatrix {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'SSE';
  expectedStatus: number;
  payload?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

const validationMatrix: EndpointTestMatrix[] = [
  // HTTP CRUD Operations
  { endpoint: '/api/v1/claude/instances', method: 'GET', expectedStatus: 200 },
  { endpoint: '/api/v1/claude/instances', method: 'POST', expectedStatus: 201, 
    payload: { command: ['claude'], instanceType: 'default' } },
  { endpoint: '/api/v1/claude/instances/{id}', method: 'GET', expectedStatus: 200 },
  { endpoint: '/api/v1/claude/instances/{id}', method: 'DELETE', expectedStatus: 200 },
  
  // SSE Streams
  { endpoint: '/api/v1/claude/instances/{id}/terminal/stream', method: 'SSE', expectedStatus: 200,
    headers: { 'Accept': 'text/event-stream' }, timeout: 5000 },
  
  // Management Operations
  { endpoint: '/api/v1/claude/instances/{id}/health', method: 'GET', expectedStatus: 200 },
  { endpoint: '/api/v1/claude/instances/{id}/sse/status', method: 'GET', expectedStatus: 200 },
  
  // Legacy Compatibility
  { endpoint: '/api/claude/instances', method: 'GET', expectedStatus: 200 },
  { endpoint: '/api/claude/instances', method: 'POST', expectedStatus: 201 }
];
```

## 2. Automated Validation Implementation

### 2.1 Endpoint Validator Class

```typescript
export class EndpointValidator {
  private baseUrl: string;
  private testResults: Map<string, ValidationResult> = new Map();

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  async validateAll(): Promise<ValidationReport> {
    console.log('🔍 Starting comprehensive endpoint validation...');
    
    const results = await Promise.allSettled(
      validationMatrix.map(test => this.validateEndpoint(test))
    );

    return this.generateReport(results);
  }

  private async validateEndpoint(test: EndpointTestMatrix): Promise<ValidationResult> {
    const startTime = performance.now();
    
    try {
      let result: ValidationResult;

      switch (test.method) {
        case 'SSE':
          result = await this.validateSSEEndpoint(test);
          break;
        default:
          result = await this.validateHTTPEndpoint(test);
          break;
      }

      result.duration = performance.now() - startTime;
      this.testResults.set(test.endpoint, result);
      
      return result;
    } catch (error) {
      const errorResult: ValidationResult = {
        endpoint: test.endpoint,
        method: test.method,
        success: false,
        actualStatus: 0,
        expectedStatus: test.expectedStatus,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: performance.now() - startTime
      };

      this.testResults.set(test.endpoint, errorResult);
      return errorResult;
    }
  }

  private async validateHTTPEndpoint(test: EndpointTestMatrix): Promise<ValidationResult> {
    const url = `${this.baseUrl}${test.endpoint}`;
    
    const requestOptions: RequestInit = {
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        ...test.headers
      }
    };

    if (test.payload && ['POST', 'PUT', 'PATCH'].includes(test.method)) {
      requestOptions.body = JSON.stringify(test.payload);
    }

    const response = await fetch(url, requestOptions);

    return {
      endpoint: test.endpoint,
      method: test.method,
      success: response.status === test.expectedStatus,
      actualStatus: response.status,
      expectedStatus: test.expectedStatus,
      headers: Object.fromEntries(response.headers.entries()),
      responseData: await this.safeParseResponse(response)
    };
  }

  private async validateSSEEndpoint(test: EndpointTestMatrix): Promise<ValidationResult> {
    return new Promise((resolve, reject) => {
      const url = `${this.baseUrl}${test.endpoint}`;
      const eventSource = new EventSource(url);
      const timeout = test.timeout || 5000;

      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          eventSource.close();
        }
      };

      // Success case
      eventSource.onopen = () => {
        cleanup();
        resolve({
          endpoint: test.endpoint,
          method: test.method,
          success: true,
          actualStatus: 200,
          expectedStatus: test.expectedStatus,
          message: 'SSE connection established successfully'
        });
      };

      // Error case
      eventSource.onerror = (error) => {
        cleanup();
        resolve({
          endpoint: test.endpoint,
          method: test.method,
          success: false,
          actualStatus: 0,
          expectedStatus: test.expectedStatus,
          error: 'SSE connection failed',
          rawError: error
        });
      };

      // Timeout
      setTimeout(() => {
        if (!resolved) {
          cleanup();
          resolve({
            endpoint: test.endpoint,
            method: test.method,
            success: false,
            actualStatus: 408,
            expectedStatus: test.expectedStatus,
            error: `SSE connection timeout after ${timeout}ms`
          });
        }
      }, timeout);
    });
  }

  private async safeParseResponse(response: Response): Promise<any> {
    try {
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }

  private generateReport(results: PromiseSettledResult<ValidationResult>[]): ValidationReport {
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    const report: ValidationReport = {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      successful,
      failed,
      successRate: (successful / results.length) * 100,
      results: results.map(r => r.status === 'fulfilled' ? r.value : {
        success: false,
        error: r.reason?.message || 'Test execution failed'
      } as ValidationResult),
      summary: {
        httpTests: results.filter(r => 
          r.status === 'fulfilled' && r.value.method !== 'SSE'
        ).length,
        sseTests: results.filter(r => 
          r.status === 'fulfilled' && r.value.method === 'SSE'
        ).length,
        legacyTests: results.filter(r => 
          r.status === 'fulfilled' && r.value.endpoint?.includes('/api/claude/')
        ).length,
        versionedTests: results.filter(r => 
          r.status === 'fulfilled' && r.value.endpoint?.includes('/api/v1/')
        ).length
      }
    };

    return report;
  }

  getDetailedResults(): ValidationResult[] {
    return Array.from(this.testResults.values());
  }
}

interface ValidationResult {
  endpoint: string;
  method: string;
  success: boolean;
  actualStatus: number;
  expectedStatus: number;
  duration?: number;
  error?: string;
  message?: string;
  headers?: Record<string, string>;
  responseData?: any;
  rawError?: any;
}

interface ValidationReport {
  timestamp: string;
  totalTests: number;
  successful: number;
  failed: number;
  successRate: number;
  results: ValidationResult[];
  summary: {
    httpTests: number;
    sseTests: number;
    legacyTests: number;
    versionedTests: number;
  };
}
```

### 2.2 Continuous Validation Integration

```typescript
export class ContinuousValidator {
  private validator: EndpointValidator;
  private intervalId: NodeJS.Timeout | null = null;
  private results: ValidationReport[] = [];

  constructor(baseUrl?: string) {
    this.validator = new EndpointValidator(baseUrl);
  }

  startContinuous(intervalMs: number = 300000): void { // 5 minutes default
    console.log(`🔄 Starting continuous validation every ${intervalMs}ms`);
    
    this.intervalId = setInterval(async () => {
      const report = await this.validator.validateAll();
      this.results.push(report);
      
      console.log(`📊 Validation Report: ${report.successful}/${report.totalTests} passed (${report.successRate.toFixed(1)}%)`);
      
      if (report.failed > 0) {
        console.warn(`⚠️ ${report.failed} endpoints failed validation`);
        this.handleFailures(report);
      }
      
      // Keep only last 24 hours of results
      const cutoff = Date.now() - (24 * 60 * 60 * 1000);
      this.results = this.results.filter(r => 
        new Date(r.timestamp).getTime() > cutoff
      );
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Continuous validation stopped');
    }
  }

  private handleFailures(report: ValidationReport): void {
    const failures = report.results.filter(r => !r.success);
    
    failures.forEach(failure => {
      console.error(`❌ ${failure.method} ${failure.endpoint} - ${failure.error || 'Unknown error'}`);
      
      // Trigger alerting system
      this.sendAlert({
        endpoint: failure.endpoint,
        method: failure.method,
        error: failure.error,
        timestamp: report.timestamp
      });
    });
  }

  private sendAlert(failure: any): void {
    // Integration with monitoring/alerting system
    console.log(`🚨 ALERT: Endpoint failure detected`, failure);
  }

  getHealthReport(): any {
    if (this.results.length === 0) {
      return { status: 'no-data', message: 'No validation results available' };
    }

    const latest = this.results[this.results.length - 1];
    const trend = this.calculateTrend();

    return {
      status: latest.successRate >= 95 ? 'healthy' : latest.successRate >= 80 ? 'degraded' : 'unhealthy',
      currentSuccessRate: latest.successRate,
      trend,
      lastValidation: latest.timestamp,
      totalValidations: this.results.length
    };
  }

  private calculateTrend(): 'improving' | 'stable' | 'degrading' {
    if (this.results.length < 2) return 'stable';

    const recent = this.results.slice(-5); // Last 5 results
    const rates = recent.map(r => r.successRate);
    
    const firstHalf = rates.slice(0, Math.floor(rates.length / 2));
    const secondHalf = rates.slice(Math.floor(rates.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    
    if (diff > 5) return 'improving';
    if (diff < -5) return 'degrading';
    return 'stable';
  }
}
```

## 3. Integration Testing Patterns

### 3.1 End-to-End SSE Flow Validation

```typescript
describe('SSE Connection End-to-End Validation', () => {
  let validator: EndpointValidator;

  beforeEach(() => {
    validator = new EndpointValidator('http://localhost:3000');
  });

  test('Complete SSE connection flow', async () => {
    // 1. Create instance
    const createResult = await validator.validateEndpoint({
      endpoint: '/api/v1/claude/instances',
      method: 'POST',
      expectedStatus: 201,
      payload: { command: ['claude'], instanceType: 'default' }
    });
    
    expect(createResult.success).toBe(true);
    const instanceId = createResult.responseData?.instanceId;
    expect(instanceId).toBeDefined();

    // 2. Validate SSE connection
    const sseResult = await validator.validateEndpoint({
      endpoint: `/api/v1/claude/instances/${instanceId}/terminal/stream`,
      method: 'SSE',
      expectedStatus: 200,
      timeout: 10000
    });
    
    expect(sseResult.success).toBe(true);

    // 3. Send command
    const commandResult = await validator.validateEndpoint({
      endpoint: `/api/v1/claude/instances/${instanceId}/terminal/input`,
      method: 'POST',
      expectedStatus: 200,
      payload: { input: 'echo "test"\n' }
    });
    
    expect(commandResult.success).toBe(true);

    // 4. Clean up
    await validator.validateEndpoint({
      endpoint: `/api/v1/claude/instances/${instanceId}`,
      method: 'DELETE',
      expectedStatus: 200
    });
  });

  test('API versioning consistency', async () => {
    const report = await validator.validateAll();
    
    // All versioned endpoints should work
    const versionedResults = report.results.filter(r => 
      r.endpoint.includes('/api/v1/')
    );
    
    const versionedSuccessRate = versionedResults.filter(r => r.success).length / versionedResults.length;
    expect(versionedSuccessRate).toBeGreaterThanOrEqual(0.95);

    // Legacy endpoints should maintain compatibility
    const legacyResults = report.results.filter(r => 
      r.endpoint.includes('/api/claude/')
    );
    
    const legacySuccessRate = legacyResults.filter(r => r.success).length / legacyResults.length;
    expect(legacySuccessRate).toBeGreaterThanOrEqual(0.95);
  });
});
```

## 4. Production Monitoring Integration

### 4.1 Health Check Endpoint

```typescript
// Add to server.ts
app.get('/api/v1/health/endpoints', async (req, res) => {
  const validator = new EndpointValidator('http://localhost:3000');
  const report = await validator.validateAll();
  
  res.json({
    status: report.successRate >= 95 ? 'healthy' : 'degraded',
    successRate: report.successRate,
    timestamp: report.timestamp,
    details: report.summary,
    failedEndpoints: report.results.filter(r => !r.success).map(r => ({
      endpoint: r.endpoint,
      method: r.method,
      error: r.error
    }))
  });
});
```

### 4.2 Alerting Configuration

```typescript
interface AlertConfig {
  thresholds: {
    errorRate: number;      // Alert if error rate > 5%
    responseTime: number;   // Alert if avg response time > 2000ms
    sseConnectionFails: number; // Alert if SSE connection fails > 3 times
  };
  channels: {
    slack?: string;
    email?: string[];
    webhook?: string;
  };
}

class AlertingSystem {
  constructor(private config: AlertConfig) {}

  async checkAndAlert(report: ValidationReport): Promise<void> {
    const errorRate = (report.failed / report.totalTests) * 100;
    
    if (errorRate > this.config.thresholds.errorRate) {
      await this.sendAlert({
        type: 'high-error-rate',
        message: `Endpoint validation error rate: ${errorRate.toFixed(1)}%`,
        details: report
      });
    }

    const sseFailures = report.results.filter(r => 
      r.method === 'SSE' && !r.success
    );

    if (sseFailures.length > 0) {
      await this.sendAlert({
        type: 'sse-connection-failure',
        message: `SSE connections failing: ${sseFailures.length} endpoints`,
        details: sseFailures
      });
    }
  }

  private async sendAlert(alert: any): Promise<void> {
    console.log('🚨 ALERT:', alert.message);
    // Implement actual alerting logic
  }
}
```

## 5. Usage Examples

### 5.1 Development Usage

```bash
# Run one-time validation
npm run validate-endpoints

# Start continuous monitoring
npm run validate-endpoints:watch

# Generate validation report
npm run validate-endpoints:report
```

### 5.2 CI/CD Integration

```yaml
# .github/workflows/endpoint-validation.yml
name: Endpoint Validation

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate-endpoints:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Start server
        run: npm start &
      - name: Wait for server
        run: npx wait-on http://localhost:3000
      - name: Validate endpoints
        run: npm run validate-endpoints
```

This comprehensive validation framework ensures API endpoint consistency and provides early detection of SSE connection issues across the Agent Feed system.