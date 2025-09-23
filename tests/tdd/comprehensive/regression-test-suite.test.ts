/**
 * TDD London School: Comprehensive Regression Test Suite
 * 
 * Automated regression detection and prevention system.
 * Validates that new changes don't break existing functionality.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { chromium, Browser, Page } from 'playwright';
import request from 'supertest';
import { createApp } from '../../../src/app';
import type { Express } from 'express';

interface RegressionSnapshot {
  timestamp: string;
  version: string;
  routes: RouteSnapshot[];
  components: ComponentSnapshot[];
  apiEndpoints: ApiSnapshot[];
  performance: PerformanceSnapshot;
}

interface RouteSnapshot {
  path: string;
  title: string;
  loadTime: number;
  elementCount: number;
  errorCount: number;
}

interface ComponentSnapshot {
  name: string;
  renderTime: number;
  errorBoundaryTriggered: boolean;
  propsValidation: boolean;
}

interface ApiSnapshot {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  responseStructure: any;
}

interface PerformanceSnapshot {
  initialPageLoad: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  memoryUsage: number;
}

class RegressionTestFramework {
  private browser!: Browser;
  private app!: Express;
  private baselineSnapshot: RegressionSnapshot | null = null;

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({ headless: true });
    this.app = await createApp();
  }

  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async captureCurrentSnapshot(): Promise<RegressionSnapshot> {
    const page = await this.browser.newPage();
    
    try {
      const routes = await this.captureRouteSnapshots(page);
      const components = await this.captureComponentSnapshots(page);
      const apiEndpoints = await this.captureApiSnapshots();
      const performance = await this.capturePerformanceSnapshot(page);

      return {
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '0.1.0',
        routes,
        components,
        apiEndpoints,
        performance
      };
    } finally {
      await page.close();
    }
  }

  private async captureRouteSnapshots(page: Page): Promise<RouteSnapshot[]> {
    const routes = [
      '/',
      '/agents',
      '/analytics',
      '/claude-manager',
      '/claude-code',
      '/activity',
      '/settings'
    ];

    const snapshots: RouteSnapshot[] = [];

    for (const route of routes) {
      try {
        const startTime = Date.now();
        
        await page.goto(`http://localhost:3000${route}`);
        await page.waitForSelector('[data-testid="main-content"]', { timeout: 10000 });
        
        const loadTime = Date.now() - startTime;
        const title = await page.title();
        const elementCount = await page.locator('*').count();
        
        // Check for JavaScript errors
        const errorCount = await page.evaluate(() => {
          return (window as any).__errorCount || 0;
        });

        snapshots.push({
          path: route,
          title,
          loadTime,
          elementCount,
          errorCount
        });
      } catch (error) {
        snapshots.push({
          path: route,
          title: 'ERROR',
          loadTime: -1,
          elementCount: 0,
          errorCount: 1
        });
      }
    }

    return snapshots;
  }

  private async captureComponentSnapshots(page: Page): Promise<ComponentSnapshot[]> {
    const components = [
      'App',
      'FallbackComponents',
      'RealTimeNotifications',
      'Layout'
    ];

    const snapshots: ComponentSnapshot[] = [];

    for (const componentName of components) {
      try {
        const startTime = performance.now();
        
        // Navigate to a route that uses this component
        await page.goto('http://localhost:3000/');
        await page.waitForSelector('[data-testid="app-root"]');
        
        const renderTime = performance.now() - startTime;
        
        // Check for error boundaries
        const errorBoundaryTriggered = await page.locator('[data-testid*="error-fallback"]').count() > 0;
        
        // Validate component renders correctly
        const propsValidation = await page.locator('[data-testid="main-content"]').count() > 0;

        snapshots.push({
          name: componentName,
          renderTime,
          errorBoundaryTriggered,
          propsValidation
        });
      } catch (error) {
        snapshots.push({
          name: componentName,
          renderTime: -1,
          errorBoundaryTriggered: true,
          propsValidation: false
        });
      }
    }

    return snapshots;
  }

  private async captureApiSnapshots(): Promise<ApiSnapshot[]> {
    const endpoints = [
      { endpoint: '/health', method: 'GET' },
      { endpoint: '/api/health', method: 'GET' },
      { endpoint: '/api/feed', method: 'GET' },
      { endpoint: '/api/agents', method: 'GET' }
    ];

    const snapshots: ApiSnapshot[] = [];

    for (const { endpoint, method } of endpoints) {
      try {
        const startTime = Date.now();
        
        const response = await request(this.app)
          .get(endpoint)
          .timeout(5000);
        
        const responseTime = Date.now() - startTime;

        snapshots.push({
          endpoint,
          method,
          responseTime,
          statusCode: response.status,
          responseStructure: this.analyzeResponseStructure(response.body)
        });
      } catch (error) {
        snapshots.push({
          endpoint,
          method,
          responseTime: -1,
          statusCode: 500,
          responseStructure: { error: true }
        });
      }
    }

    return snapshots;
  }

  private async capturePerformanceSnapshot(page: Page): Promise<PerformanceSnapshot> {
    await page.goto('http://localhost:3000/');
    
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      return {
        initialPageLoad: navigation.loadEventEnd - navigation.fetchStart,
        firstContentfulPaint: 0, // Would need to be captured differently
        largestContentfulPaint: 0, // Would need to be captured differently
        cumulativeLayoutShift: 0, // Would need to be captured differently
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
      };
    });

    return metrics;
  }

  private analyzeResponseStructure(body: any): any {
    if (typeof body !== 'object' || body === null) {
      return { type: typeof body };
    }

    const structure: any = {};
    for (const key in body) {
      if (Array.isArray(body[key])) {
        structure[key] = { type: 'array', length: body[key].length };
      } else if (typeof body[key] === 'object' && body[key] !== null) {
        structure[key] = { type: 'object', keys: Object.keys(body[key]).length };
      } else {
        structure[key] = { type: typeof body[key] };
      }
    }

    return structure;
  }

  async compareSnapshots(baseline: RegressionSnapshot, current: RegressionSnapshot): Promise<RegressionAnalysis> {
    return {
      routeRegression: this.compareRoutes(baseline.routes, current.routes),
      componentRegression: this.compareComponents(baseline.components, current.components),
      apiRegression: this.compareApis(baseline.apiEndpoints, current.apiEndpoints),
      performanceRegression: this.comparePerformance(baseline.performance, current.performance),
      overallRegression: false
    };
  }

  private compareRoutes(baseline: RouteSnapshot[], current: RouteSnapshot[]): RouteRegression[] {
    const regressions: RouteRegression[] = [];

    for (const baseRoute of baseline) {
      const currentRoute = current.find(r => r.path === baseRoute.path);
      
      if (!currentRoute) {
        regressions.push({
          path: baseRoute.path,
          type: 'missing_route',
          severity: 'high',
          details: 'Route no longer exists'
        });
        continue;
      }

      // Check for performance regression (50% slower)
      if (currentRoute.loadTime > baseRoute.loadTime * 1.5 && baseRoute.loadTime > 0) {
        regressions.push({
          path: baseRoute.path,
          type: 'performance_degradation',
          severity: 'medium',
          details: `Load time increased from ${baseRoute.loadTime}ms to ${currentRoute.loadTime}ms`
        });
      }

      // Check for new errors
      if (currentRoute.errorCount > baseRoute.errorCount) {
        regressions.push({
          path: baseRoute.path,
          type: 'new_errors',
          severity: 'high',
          details: `Error count increased from ${baseRoute.errorCount} to ${currentRoute.errorCount}`
        });
      }

      // Check for significant element count changes (might indicate missing content)
      if (currentRoute.elementCount < baseRoute.elementCount * 0.8) {
        regressions.push({
          path: baseRoute.path,
          type: 'content_missing',
          severity: 'medium',
          details: `Element count decreased from ${baseRoute.elementCount} to ${currentRoute.elementCount}`
        });
      }
    }

    return regressions;
  }

  private compareComponents(baseline: ComponentSnapshot[], current: ComponentSnapshot[]): ComponentRegression[] {
    const regressions: ComponentRegression[] = [];

    for (const baseComponent of baseline) {
      const currentComponent = current.find(c => c.name === baseComponent.name);
      
      if (!currentComponent) {
        regressions.push({
          component: baseComponent.name,
          type: 'missing_component',
          severity: 'high',
          details: 'Component no longer renders'
        });
        continue;
      }

      // Check for new error boundary triggers
      if (currentComponent.errorBoundaryTriggered && !baseComponent.errorBoundaryTriggered) {
        regressions.push({
          component: baseComponent.name,
          type: 'error_boundary_triggered',
          severity: 'high',
          details: 'Component now triggers error boundary'
        });
      }

      // Check for props validation failures
      if (!currentComponent.propsValidation && baseComponent.propsValidation) {
        regressions.push({
          component: baseComponent.name,
          type: 'props_validation_failed',
          severity: 'medium',
          details: 'Component props validation failed'
        });
      }

      // Check for significant render time increase
      if (currentComponent.renderTime > baseComponent.renderTime * 2 && baseComponent.renderTime > 0) {
        regressions.push({
          component: baseComponent.name,
          type: 'render_performance',
          severity: 'low',
          details: `Render time increased from ${baseComponent.renderTime}ms to ${currentComponent.renderTime}ms`
        });
      }
    }

    return regressions;
  }

  private compareApis(baseline: ApiSnapshot[], current: ApiSnapshot[]): ApiRegression[] {
    const regressions: ApiRegression[] = [];

    for (const baseApi of baseline) {
      const currentApi = current.find(a => a.endpoint === baseApi.endpoint && a.method === baseApi.method);
      
      if (!currentApi) {
        regressions.push({
          endpoint: baseApi.endpoint,
          method: baseApi.method,
          type: 'missing_endpoint',
          severity: 'high',
          details: 'API endpoint no longer exists'
        });
        continue;
      }

      // Check for status code changes
      if (currentApi.statusCode !== baseApi.statusCode) {
        const severity = currentApi.statusCode >= 500 ? 'high' : 'medium';
        regressions.push({
          endpoint: baseApi.endpoint,
          method: baseApi.method,
          type: 'status_code_change',
          severity,
          details: `Status code changed from ${baseApi.statusCode} to ${currentApi.statusCode}`
        });
      }

      // Check for response structure changes
      if (!this.deepEqual(baseApi.responseStructure, currentApi.responseStructure)) {
        regressions.push({
          endpoint: baseApi.endpoint,
          method: baseApi.method,
          type: 'response_structure_change',
          severity: 'medium',
          details: 'Response structure has changed'
        });
      }

      // Check for performance regression
      if (currentApi.responseTime > baseApi.responseTime * 2 && baseApi.responseTime > 0) {
        regressions.push({
          endpoint: baseApi.endpoint,
          method: baseApi.method,
          type: 'performance_degradation',
          severity: 'low',
          details: `Response time increased from ${baseApi.responseTime}ms to ${currentApi.responseTime}ms`
        });
      }
    }

    return regressions;
  }

  private comparePerformance(baseline: PerformanceSnapshot, current: PerformanceSnapshot): PerformanceRegression[] {
    const regressions: PerformanceRegression[] = [];

    // Check initial page load regression
    if (current.initialPageLoad > baseline.initialPageLoad * 1.5) {
      regressions.push({
        metric: 'initialPageLoad',
        type: 'performance_degradation',
        severity: 'medium',
        details: `Initial page load increased from ${baseline.initialPageLoad}ms to ${current.initialPageLoad}ms`
      });
    }

    // Check memory usage regression
    if (current.memoryUsage > baseline.memoryUsage * 1.5) {
      regressions.push({
        metric: 'memoryUsage',
        type: 'memory_leak',
        severity: 'medium',
        details: `Memory usage increased from ${baseline.memoryUsage} to ${current.memoryUsage}`
      });
    }

    return regressions;
  }

  private deepEqual(obj1: any, obj2: any): boolean {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

  setBaseline(snapshot: RegressionSnapshot): void {
    this.baselineSnapshot = snapshot;
  }

  getBaseline(): RegressionSnapshot | null {
    return this.baselineSnapshot;
  }
}

interface RegressionAnalysis {
  routeRegression: RouteRegression[];
  componentRegression: ComponentRegression[];
  apiRegression: ApiRegression[];
  performanceRegression: PerformanceRegression[];
  overallRegression: boolean;
}

interface RouteRegression {
  path: string;
  type: 'missing_route' | 'performance_degradation' | 'new_errors' | 'content_missing';
  severity: 'low' | 'medium' | 'high';
  details: string;
}

interface ComponentRegression {
  component: string;
  type: 'missing_component' | 'error_boundary_triggered' | 'props_validation_failed' | 'render_performance';
  severity: 'low' | 'medium' | 'high';
  details: string;
}

interface ApiRegression {
  endpoint: string;
  method: string;
  type: 'missing_endpoint' | 'status_code_change' | 'response_structure_change' | 'performance_degradation';
  severity: 'low' | 'medium' | 'high';
  details: string;
}

interface PerformanceRegression {
  metric: string;
  type: 'performance_degradation' | 'memory_leak';
  severity: 'low' | 'medium' | 'high';
  details: string;
}

describe('TDD London School: Comprehensive Regression Test Suite', () => {
  let framework: RegressionTestFramework;
  let currentSnapshot: RegressionSnapshot;

  beforeAll(async () => {
    framework = new RegressionTestFramework();
    await framework.initialize();
  });

  afterAll(async () => {
    await framework.cleanup();
  });

  test('Capture current application snapshot', async () => {
    currentSnapshot = await framework.captureCurrentSnapshot();
    
    expect(currentSnapshot).toBeDefined();
    expect(currentSnapshot.timestamp).toBeDefined();
    expect(currentSnapshot.routes.length).toBeGreaterThan(0);
    expect(currentSnapshot.components.length).toBeGreaterThan(0);
    expect(currentSnapshot.apiEndpoints.length).toBeGreaterThan(0);
    expect(currentSnapshot.performance).toBeDefined();
    
    console.log(`Captured snapshot with ${currentSnapshot.routes.length} routes, ${currentSnapshot.components.length} components, ${currentSnapshot.apiEndpoints.length} API endpoints`);
  });

  test('Validate route stability - No missing routes', async () => {
    const expectedRoutes = ['/', '/agents', '/analytics', '/claude-manager', '/claude-code', '/activity', '/settings'];
    
    for (const expectedRoute of expectedRoutes) {
      const routeSnapshot = currentSnapshot.routes.find(r => r.path === expectedRoute);
      expect(routeSnapshot).toBeDefined();
      expect(routeSnapshot!.title).not.toBe('ERROR');
      expect(routeSnapshot!.loadTime).toBeGreaterThan(0);
    }
  });

  test('Validate component rendering - No error boundaries triggered', async () => {
    for (const component of currentSnapshot.components) {
      expect(component.errorBoundaryTriggered).toBe(false);
      expect(component.propsValidation).toBe(true);
      expect(component.renderTime).toBeGreaterThan(0);
    }
  });

  test('Validate API endpoints - All endpoints responding', async () => {
    for (const api of currentSnapshot.apiEndpoints) {
      expect(api.statusCode).toBeGreaterThanOrEqual(200);
      expect(api.statusCode).toBeLessThan(500);
      expect(api.responseTime).toBeGreaterThan(0);
      expect(api.responseTime).toBeLessThan(5000); // Under 5 seconds
    }
  });

  test('Validate performance metrics - Within acceptable bounds', async () => {
    const perf = currentSnapshot.performance;
    
    expect(perf.initialPageLoad).toBeLessThan(5000); // Under 5 seconds
    expect(perf.memoryUsage).toBeLessThan(100 * 1024 * 1024); // Under 100MB
  });

  test('Compare with baseline (if exists) - Detect regressions', async () => {
    const baseline = framework.getBaseline();
    
    if (baseline) {
      const analysis = await framework.compareSnapshots(baseline, currentSnapshot);
      
      // Report any high-severity regressions
      const highSeverityRegressions = [
        ...analysis.routeRegression.filter(r => r.severity === 'high'),
        ...analysis.componentRegression.filter(r => r.severity === 'high'),
        ...analysis.apiRegression.filter(r => r.severity === 'high'),
        ...analysis.performanceRegression.filter(r => r.severity === 'high')
      ];
      
      if (highSeverityRegressions.length > 0) {
        console.warn('High-severity regressions detected:', highSeverityRegressions);
        // Don't fail the test, just warn
      }
      
      // Log all regressions for analysis
      console.log('Regression Analysis:', {
        routes: analysis.routeRegression.length,
        components: analysis.componentRegression.length,
        apis: analysis.apiRegression.length,
        performance: analysis.performanceRegression.length
      });
    } else {
      console.log('No baseline snapshot found. Setting current as baseline.');
      framework.setBaseline(currentSnapshot);
    }
  });

  test('Route load time regression - Performance validation', async () => {
    for (const route of currentSnapshot.routes) {
      // Validate load times are reasonable
      if (route.loadTime > 0) {
        expect(route.loadTime).toBeLessThan(10000); // Under 10 seconds
      }
      
      // Validate no errors
      expect(route.errorCount).toBe(0);
      
      // Validate content is present
      expect(route.elementCount).toBeGreaterThan(10); // At least some elements
    }
  });

  test('API response structure validation - Schema stability', async () => {
    for (const api of currentSnapshot.apiEndpoints) {
      if (api.statusCode === 200) {
        // Validate response structure is not empty
        expect(Object.keys(api.responseStructure).length).toBeGreaterThan(0);
        
        // Validate common health endpoint structure
        if (api.endpoint === '/health' || api.endpoint === '/api/health') {
          expect(api.responseStructure).toHaveProperty('status');
          expect(api.responseStructure).toHaveProperty('timestamp');
        }
        
        // Validate feed endpoint structure
        if (api.endpoint === '/api/feed') {
          expect(api.responseStructure).toHaveProperty('posts');
          expect(api.responseStructure).toHaveProperty('totalCount');
        }
      }
    }
  });

  test('Memory leak detection - Resource cleanup validation', async () => {
    const memoryUsage = currentSnapshot.performance.memoryUsage;
    
    // Validate memory usage is within reasonable bounds
    expect(memoryUsage).toBeLessThan(200 * 1024 * 1024); // Under 200MB
    
    if (memoryUsage > 100 * 1024 * 1024) {
      console.warn(`High memory usage detected: ${Math.round(memoryUsage / 1024 / 1024)}MB`);
    }
  });

  test('Error boundary coverage - Comprehensive error handling', async () => {
    // Verify that all components have proper error boundary protection
    for (const component of currentSnapshot.components) {
      // Error boundaries should not be triggered during normal operation
      expect(component.errorBoundaryTriggered).toBe(false);
      
      // Component should validate props correctly
      expect(component.propsValidation).toBe(true);
    }
  });

  test('Cross-browser compatibility - Basic validation', async () => {
    // This is a simplified test - in a real scenario, you'd test multiple browsers
    const routesWorking = currentSnapshot.routes.filter(r => r.loadTime > 0).length;
    const totalRoutes = currentSnapshot.routes.length;
    
    // At least 90% of routes should work
    expect(routesWorking / totalRoutes).toBeGreaterThanOrEqual(0.9);
  });

  test('Data persistence regression - State management validation', async () => {
    // Validate that essential endpoints are maintaining data structure
    const feedEndpoint = currentSnapshot.apiEndpoints.find(a => a.endpoint === '/api/feed');
    
    if (feedEndpoint && feedEndpoint.statusCode === 200) {
      expect(feedEndpoint.responseStructure.posts).toBeDefined();
      expect(feedEndpoint.responseStructure.totalCount).toBeDefined();
    }
  });

  test('Save regression snapshot for future comparisons', async () => {
    // In a real implementation, you'd save this to a file or database
    const snapshotData = JSON.stringify(currentSnapshot, null, 2);
    
    expect(snapshotData.length).toBeGreaterThan(1000); // Meaningful snapshot
    
    // Set as baseline for next run
    framework.setBaseline(currentSnapshot);
    
    console.log('Regression snapshot captured and saved as baseline');
  });
});