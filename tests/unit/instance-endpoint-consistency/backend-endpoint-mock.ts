/**
 * Backend Endpoint Mocking Infrastructure
 * Simulates the exact current backend behavior for TDD testing
 * 
 * Current Backend State (from server.ts analysis):
 * - Primary endpoints: /api/claude/instances (unversioned)
 * - Redirect endpoints: /api/v1/claude/instances -> /api/claude/instances
 * 
 * Frontend Expectations (from api.ts analysis):
 * - Primary: /api/v1/claude/instances (versioned)
 * - Fallback: /api/claude/instances (unversioned)
 * 
 * This creates the exact mismatch scenario we need to test and fix
 */

export interface MockInstance {
  id: string;
  name: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  pid?: number;
  startTime?: string;
}

export interface MockBackendState {
  instances: MockInstance[];
  connectionCounts: Map<string, number>;
  lastRequestTimestamp: number;
  requestLog: Array<{
    method: string;
    url: string;
    timestamp: number;
    status: number;
    response?: any;
  }>;
}

/**
 * Mock Backend that simulates current server.ts behavior exactly
 */
export class MockBackendServer {
  private state: MockBackendState;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.state = {
      instances: [
        {
          id: 'claude-test-instance-1',
          name: 'Test Claude Instance 1',
          status: 'running',
          pid: 12345,
          startTime: new Date().toISOString()
        },
        {
          id: 'claude-test-instance-2',
          name: 'Test Claude Instance 2',
          status: 'stopped',
          startTime: new Date(Date.now() - 300000).toISOString()
        }
      ],
      connectionCounts: new Map(),
      lastRequestTimestamp: Date.now(),
      requestLog: []
    };
  }

  private logRequest(method: string, url: string, status: number, response?: any) {
    this.state.requestLog.push({
      method,
      url,
      timestamp: Date.now(),
      status,
      response
    });
    this.state.lastRequestTimestamp = Date.now();
  }

  /**
   * Mock the current backend endpoint behavior
   * CRITICAL: This simulates the EXACT current mismatch
   */
  public mockFetch = jest.fn().mockImplementation(async (url: string, options?: RequestInit) => {
    const method = options?.method || 'GET';
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    
    console.log(`🔍 Mock Backend Request: ${method} ${fullUrl}`);

    // CURRENT BACKEND BEHAVIOR: Unversioned endpoints are primary
    
    // ✅ WORKING: Unversioned endpoints (current primary backend endpoints)
    if (fullUrl.includes('/api/claude/instances') && !fullUrl.includes('/api/v1/')) {
      if (method === 'GET' && fullUrl.endsWith('/api/claude/instances')) {
        const response = { instances: this.state.instances, success: true };
        this.logRequest(method, fullUrl, 200, response);
        return {
          ok: true,
          status: 200,
          json: async () => response,
          headers: new Headers({ 'content-type': 'application/json' })
        };
      }
      
      if (method === 'POST' && fullUrl.endsWith('/api/claude/instances')) {
        const body = options?.body ? JSON.parse(options.body as string) : {};
        const newInstance: MockInstance = {
          id: `claude-${Date.now()}`,
          name: body.name || `Claude Instance ${Date.now()}`,
          status: 'starting',
          pid: Math.floor(Math.random() * 10000),
          startTime: new Date().toISOString()
        };
        
        this.state.instances.push(newInstance);
        const response = { instance: newInstance, success: true };
        this.logRequest(method, fullUrl, 201, response);
        return {
          ok: true,
          status: 201,
          json: async () => response,
          headers: new Headers({ 'content-type': 'application/json' })
        };
      }
    }

    // ❌ PROBLEMATIC: Versioned endpoints (what frontend expects as primary)
    // Current backend behavior: Redirects (302) instead of serving directly
    if (fullUrl.includes('/api/v1/claude/instances')) {
      if (method === 'GET' && fullUrl.endsWith('/api/v1/claude/instances')) {
        // Simulate redirect behavior (current backend returns 302)
        const redirectResponse = {
          ok: false, // This causes frontend to fail to fallback
          status: 302,
          headers: new Headers({
            'location': '/api/claude/instances',
            'content-type': 'text/html'
          }),
          json: async () => {
            throw new Error('Unexpected token < in JSON at position 0'); // Typical redirect HTML error
          },
          text: async () => '<html>Redirecting...</html>'
        };
        
        this.logRequest(method, fullUrl, 302, 'redirect');
        console.warn(`🚨 Mock Backend: V1 endpoint returning redirect (current broken behavior)`);
        return redirectResponse;
      }
      
      if (method === 'POST' && fullUrl.endsWith('/api/v1/claude/instances')) {
        // Simulate redirect for POST (this breaks instance creation)
        const redirectResponse = {
          ok: false,
          status: 307, // Temporary redirect that preserves method
          headers: new Headers({
            'location': '/api/claude/instances',
            'content-type': 'text/html'
          }),
          json: async () => {
            throw new Error('Unexpected token < in JSON at position 0');
          }
        };
        
        this.logRequest(method, fullUrl, 307, 'redirect');
        console.error(`💥 Mock Backend: V1 POST redirect breaks instance creation`);
        return redirectResponse;
      }
    }

    // Terminal stream endpoints
    if (fullUrl.includes('/terminal/stream')) {
      const instanceId = this.extractInstanceId(fullUrl);
      if (instanceId) {
        // SSE endpoint behavior
        const response = { success: true, message: 'SSE connection established' };
        this.logRequest(method, fullUrl, 200, response);
        return {
          ok: true,
          status: 200,
          json: async () => response,
          headers: new Headers({ 'content-type': 'text/event-stream' })
        };
      }
    }

    // Default: 404 for unmatched endpoints
    const errorResponse = {
      error: 'Not Found',
      message: `Endpoint not found: ${method} ${fullUrl}`,
      availableEndpoints: [
        '/api/claude/instances',
        '/api/v1/claude/instances (redirects)',
        '/api/claude/instances/:id/terminal/stream'
      ]
    };
    
    this.logRequest(method, fullUrl, 404, errorResponse);
    return {
      ok: false,
      status: 404,
      json: async () => errorResponse,
      headers: new Headers({ 'content-type': 'application/json' })
    };
  });

  private extractInstanceId(url: string): string | null {
    const matches = url.match(/\/instances\/([^\/]+)/);
    return matches ? matches[1] : null;
  }

  /**
   * Get current backend state for test assertions
   */
  public getState(): MockBackendState {
    return { ...this.state };
  }

  /**
   * Get request log for endpoint verification
   */
  public getRequestLog(): MockBackendState['requestLog'] {
    return [...this.state.requestLog];
  }

  /**
   * Reset backend state between tests
   */
  public reset(): void {
    this.state.instances = [
      {
        id: 'claude-test-instance-1',
        name: 'Test Claude Instance 1',
        status: 'running',
        pid: 12345,
        startTime: new Date().toISOString()
      }
    ];
    this.state.connectionCounts.clear();
    this.state.requestLog = [];
    this.mockFetch.mockClear();
  }

  /**
   * Simulate the FIXED backend behavior for "after fix" tests
   */
  public enableFixedBehavior(): void {
    this.mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
      const method = options?.method || 'GET';
      const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
      
      console.log(`✅ Mock Backend (FIXED): ${method} ${fullUrl}`);

      // FIXED BEHAVIOR: Both versioned and unversioned endpoints work
      const isInstancesEndpoint = fullUrl.includes('/claude/instances') && 
                                 (fullUrl.endsWith('/api/claude/instances') || 
                                  fullUrl.endsWith('/api/v1/claude/instances'));

      if (isInstancesEndpoint && method === 'GET') {
        const response = { instances: this.state.instances, success: true };
        this.logRequest(method, fullUrl, 200, response);
        return {
          ok: true,
          status: 200,
          json: async () => response,
          headers: new Headers({ 'content-type': 'application/json' })
        };
      }

      if (isInstancesEndpoint && method === 'POST') {
        const body = options?.body ? JSON.parse(options.body as string) : {};
        const newInstance: MockInstance = {
          id: `claude-${Date.now()}`,
          name: body.name || `Claude Instance ${Date.now()}`,
          status: 'starting',
          pid: Math.floor(Math.random() * 10000),
          startTime: new Date().toISOString()
        };
        
        this.state.instances.push(newInstance);
        const response = { instance: newInstance, success: true };
        this.logRequest(method, fullUrl, 201, response);
        return {
          ok: true,
          status: 201,
          json: async () => response,
          headers: new Headers({ 'content-type': 'application/json' })
        };
      }

      // Terminal endpoints work for both versions
      if (fullUrl.includes('/terminal/stream')) {
        const response = { success: true, message: 'SSE connection established' };
        this.logRequest(method, fullUrl, 200, response);
        return {
          ok: true,
          status: 200,
          json: async () => response,
          headers: new Headers({ 'content-type': 'text/event-stream' })
        };
      }

      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not Found' }),
        headers: new Headers({ 'content-type': 'application/json' })
      };
    });
  }
}

/**
 * Create and configure mock backend for tests
 */
export function createMockBackend(baseUrl?: string): MockBackendServer {
  return new MockBackendServer(baseUrl);
}

/**
 * Test utilities for endpoint validation
 */
export const EndpointTestUtils = {
  /**
   * Validate that a URL matches expected pattern
   */
  validateEndpointPattern(url: string, expectedPattern: RegExp): boolean {
    return expectedPattern.test(url);
  },

  /**
   * Extract endpoint version from URL
   */
  getEndpointVersion(url: string): string | null {
    const versionMatch = url.match(/\/api\/(v\d+)\//);
    return versionMatch ? versionMatch[1] : null;
  },

  /**
   * Check if endpoint is versioned
   */
  isVersionedEndpoint(url: string): boolean {
    return url.includes('/api/v');
  },

  /**
   * Generate expected endpoint URLs for testing
   */
  generateExpectedEndpoints(baseUrl: string, instanceId?: string) {
    const base = baseUrl.replace(/\/$/, '');
    
    return {
      // Primary (versioned) endpoints that frontend expects to work
      primary: {
        instances: `${base}/api/v1/claude/instances`,
        instanceDetail: instanceId ? `${base}/api/v1/claude/instances/${instanceId}` : null,
        terminalStream: instanceId ? `${base}/api/v1/claude/instances/${instanceId}/terminal/stream` : null,
        terminalInput: instanceId ? `${base}/api/v1/claude/instances/${instanceId}/terminal/input` : null,
      },
      // Fallback (unversioned) endpoints
      fallback: {
        instances: `${base}/api/claude/instances`,
        instanceDetail: instanceId ? `${base}/api/claude/instances/${instanceId}` : null,
        terminalStream: instanceId ? `${base}/api/claude/instances/${instanceId}/terminal/stream` : null,
        terminalInput: instanceId ? `${base}/api/claude/instances/${instanceId}/terminal/input` : null,
      }
    };
  }
};