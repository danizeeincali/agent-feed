/**
 * Test Helper Utilities for SSE Endpoint Consistency Testing
 * Provides utilities for URL validation, pattern matching, and test assertions
 */

import { EventSourceMock, FetchMock } from '../mocks/EventSourceMock';
import { EndpointPattern, APIVersionPattern } from '../fixtures/endpointPatterns';

export class URLPatternValidator {
  /**
   * Validates if frontend and backend URLs match
   */
  static validateEndpointMatch(pattern: EndpointPattern, instanceId: string = 'test-123'): boolean {
    const frontendUrl = pattern.frontend.replace('{instanceId}', instanceId);
    const backendUrl = pattern.backend.replace('{instanceId}', instanceId);
    
    return frontendUrl === backendUrl;
  }

  /**
   * Normalizes URLs for comparison
   */
  static normalizeUrl(url: string): string {
    // Remove trailing slashes and normalize path separators
    return url.replace(/\/+$/, '').replace(/\/+/g, '/');
  }

  /**
   * Extracts path from full URL
   */
  static extractPath(fullUrl: string): string {
    try {
      const url = new URL(fullUrl);
      return url.pathname;
    } catch {
      // If not a full URL, assume it's already a path
      return fullUrl;
    }
  }

  /**
   * Validates API versioning consistency
   */
  static validateAPIVersioning(patterns: APIVersionPattern[]): ValidationResult[] {
    return patterns.map(pattern => ({
      version: pattern.version,
      baseUrl: pattern.baseUrl,
      isConsistent: pattern.endpoints.every(endpoint => 
        endpoint.startsWith('/') && !endpoint.includes('//api/')
      ),
      issues: pattern.endpoints.filter(endpoint => 
        endpoint.includes('//api/') || !endpoint.startsWith('/')
      )
    }));
  }
}

export interface ValidationResult {
  version: string;
  baseUrl: string;
  isConsistent: boolean;
  issues: string[];
}

export class SSETestHelper {
  private eventSourceMock: EventSourceMock | null = null;
  private originalEventSource: typeof EventSource;
  private originalFetch: typeof fetch;

  constructor() {
    this.originalEventSource = global.EventSource;
    this.originalFetch = global.fetch;
  }

  /**
   * Set up mocks for testing
   */
  setupMocks(): void {
    // Mock EventSource
    (global as any).EventSource = EventSourceMock;
    
    // Mock fetch
    global.fetch = FetchMock.mockImplementation();
    
    // Reset any existing state
    EventSourceMock.reset();
    FetchMock.reset();
  }

  /**
   * Restore original implementations
   */
  cleanup(): void {
    if (this.eventSourceMock) {
      this.eventSourceMock.close();
      this.eventSourceMock = null;
    }
    
    EventSourceMock.reset();
    FetchMock.reset();
    
    global.EventSource = this.originalEventSource;
    global.fetch = this.originalFetch;
  }

  /**
   * Create a mock SSE connection with specific URL
   */
  createMockSSEConnection(url: string): EventSourceMock {
    this.eventSourceMock = new EventSourceMock(url);
    return this.eventSourceMock;
  }

  /**
   * Simulate successful SSE connection
   */
  simulateSuccessfulConnection(instanceId: string, delay: number = 100): Promise<void> {
    return new Promise((resolve) => {
      if (this.eventSourceMock) {
        setTimeout(() => {
          this.eventSourceMock!.mockOpen();
          this.eventSourceMock!.mockMessage({
            type: 'connected',
            instanceId,
            timestamp: new Date().toISOString()
          });
          resolve();
        }, delay);
      } else {
        resolve();
      }
    });
  }

  /**
   * Simulate connection failure
   */
  simulateConnectionFailure(errorMessage: string = 'Connection failed'): void {
    if (this.eventSourceMock) {
      this.eventSourceMock.mockError(errorMessage);
    }
  }

  /**
   * Get all created EventSource URLs for validation
   */
  getCreatedSSEUrls(): string[] {
    return EventSourceMock.getCreatedUrls();
  }

  /**
   * Get all fetch calls made during test
   */
  getFetchCalls(): Array<{ url: string; options?: RequestInit }> {
    return FetchMock.getCalls();
  }
}

export class EndpointConsistencyTester {
  private helper: SSETestHelper;
  private testResults: TestResult[] = [];

  constructor() {
    this.helper = new SSETestHelper();
  }

  /**
   * Test endpoint pattern consistency
   */
  async testEndpointPattern(pattern: EndpointPattern, baseUrl: string = 'http://localhost:3000'): Promise<TestResult> {
    const instanceId = 'test-instance-' + Date.now();
    
    // Set up mocks
    this.helper.setupMocks();
    
    try {
      // Test frontend URL construction
      const frontendUrl = `${baseUrl}${pattern.frontend.replace('{instanceId}', instanceId)}`;
      const backendUrl = `${baseUrl}${pattern.backend.replace('{instanceId}', instanceId)}`;
      
      // Create SSE connection with frontend URL
      const sseConnection = this.helper.createMockSSEConnection(frontendUrl);
      
      // Check if URLs match
      const urlsMatch = URLPatternValidator.normalizeUrl(URLPatternValidator.extractPath(frontendUrl)) === 
                       URLPatternValidator.normalizeUrl(URLPatternValidator.extractPath(backendUrl));
      
      const result: TestResult = {
        pattern: pattern.name,
        frontendUrl,
        backendUrl,
        urlsMatch,
        expectedToMatch: pattern.shouldMatch,
        testPassed: urlsMatch === pattern.shouldMatch,
        error: null
      };

      this.testResults.push(result);
      return result;
      
    } catch (error) {
      const result: TestResult = {
        pattern: pattern.name,
        frontendUrl: 'ERROR',
        backendUrl: 'ERROR',
        urlsMatch: false,
        expectedToMatch: pattern.shouldMatch,
        testPassed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.testResults.push(result);
      return result;
    } finally {
      this.helper.cleanup();
    }
  }

  /**
   * Test URL construction with different scenarios
   */
  async testURLConstruction(baseUrl: string, instanceId: string, expectedPath: string, currentPath: string): Promise<URLConstructionResult> {
    const fullExpectedUrl = `${baseUrl}${expectedPath}`;
    const fullCurrentUrl = `${baseUrl}${currentPath}`;
    
    return {
      baseUrl,
      instanceId,
      expectedUrl: fullExpectedUrl,
      currentUrl: fullCurrentUrl,
      pathsMatch: URLPatternValidator.extractPath(fullExpectedUrl) === URLPatternValidator.extractPath(fullCurrentUrl),
      normalizedExpected: URLPatternValidator.normalizeUrl(fullExpectedUrl),
      normalizedCurrent: URLPatternValidator.normalizeUrl(fullCurrentUrl)
    };
  }

  /**
   * Get all test results
   */
  getTestResults(): TestResult[] {
    return [...this.testResults];
  }

  /**
   * Reset test results
   */
  resetResults(): void {
    this.testResults = [];
  }
}

export interface TestResult {
  pattern: string;
  frontendUrl: string;
  backendUrl: string;
  urlsMatch: boolean;
  expectedToMatch: boolean;
  testPassed: boolean;
  error: string | null;
}

export interface URLConstructionResult {
  baseUrl: string;
  instanceId: string;
  expectedUrl: string;
  currentUrl: string;
  pathsMatch: boolean;
  normalizedExpected: string;
  normalizedCurrent: string;
}

export class MockInstanceManager {
  private instances: Map<string, MockInstance> = new Map();
  
  /**
   * Create a mock Claude instance
   */
  createInstance(id: string, status: 'starting' | 'running' | 'stopped' | 'error' = 'starting'): MockInstance {
    const instance: MockInstance = {
      id,
      name: `Claude Instance ${id}`,
      status,
      pid: status === 'running' ? Math.floor(Math.random() * 10000) + 1000 : undefined,
      startTime: new Date(),
      endpoints: this.generateEndpoints(id)
    };
    
    this.instances.set(id, instance);
    return instance;
  }
  
  /**
   * Get instance by ID
   */
  getInstance(id: string): MockInstance | undefined {
    return this.instances.get(id);
  }
  
  /**
   * Update instance status
   */
  updateInstanceStatus(id: string, status: MockInstance['status']): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.status = status;
      if (status === 'running' && !instance.pid) {
        instance.pid = Math.floor(Math.random() * 10000) + 1000;
      } else if (status === 'stopped') {
        instance.pid = undefined;
      }
    }
  }
  
  /**
   * Generate endpoints for instance
   */
  private generateEndpoints(instanceId: string): InstanceEndpoints {
    return {
      terminalStream: `/api/claude/instances/${instanceId}/terminal/stream`,
      terminalInput: `/api/claude/instances/${instanceId}/terminal/input`,
      terminalPoll: `/api/v1/claude/instances/${instanceId}/terminal/poll`,
      status: `/api/claude/instances/${instanceId}`,
      sseStatus: `/api/v1/claude/instances/${instanceId}/sse/status`
    };
  }
  
  /**
   * Clear all instances
   */
  clear(): void {
    this.instances.clear();
  }
  
  /**
   * Get all instances
   */
  getAllInstances(): MockInstance[] {
    return Array.from(this.instances.values());
  }
}

export interface MockInstance {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid?: number;
  startTime: Date;
  endpoints: InstanceEndpoints;
}

export interface InstanceEndpoints {
  terminalStream: string;
  terminalInput: string;
  terminalPoll: string;
  status: string;
  sseStatus: string;
}

export default {
  URLPatternValidator,
  SSETestHelper,
  EndpointConsistencyTester,
  MockInstanceManager
};