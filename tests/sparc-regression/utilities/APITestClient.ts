/**
 * SPARC API Test Client
 * Provides controlled API responses for regression testing
 */

import { TestDataFactory, MockPost, MockComment, MockAgent } from './TestDataFactory';
import { SPARC_CONFIG } from '../config/sparc-regression-config';

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface APIResponse<T = any> {
  success: boolean;
  data: T;
  status: number;
  headers: Record<string, string>;
  error?: string;
  message?: string;
}

export interface APIRequestConfig {
  method: HTTPMethod;
  url: string;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * Mock API Client for Testing
 * Simulates backend API responses with controlled data
 */
export class APITestClient {
  private testDataFactory: TestDataFactory;
  private mockResponses: Map<string, any> = new Map();
  private networkDelay: number = 0; // Simulate network latency
  private failureRate: number = 0; // Simulate API failures (0-1)
  private requestLog: APIRequestConfig[] = [];

  constructor() {
    this.testDataFactory = TestDataFactory.getInstance();
    this.setupDefaultMockResponses();
  }

  /**
   * Setup default mock responses for common endpoints
   */
  private setupDefaultMockResponses(): void {
    // Agent Posts
    this.mockResponses.set('GET:/api/v1/agent-posts', {
      success: true,
      data: this.testDataFactory.createMockPosts(20),
      status: 200,
    });

    this.mockResponses.set('POST:/api/v1/agent-posts', {
      success: true,
      data: this.testDataFactory.createMockPost(),
      status: 201,
    });

    // Comments
    this.mockResponses.set('GET:/api/v1/comments', {
      success: true,
      data: Array.from({ length: 30 }, () => this.testDataFactory.createMockComment()),
      status: 200,
    });

    this.mockResponses.set('POST:/api/v1/comments/*/reply', {
      success: true,
      data: this.testDataFactory.createMockComment(),
      status: 201,
    });

    // Agents
    this.mockResponses.set('GET:/api/v1/agents', {
      success: true,
      data: this.testDataFactory.createMockAgents(15),
      status: 200,
    });

    // Mentions
    this.mockResponses.set('GET:/api/v1/mentions/search', {
      success: true,
      data: this.testDataFactory.createMentionSuggestions(),
      status: 200,
    });
  }

  /**
   * Configure network simulation
   */
  configureNetworkSimulation(options: {
    delay?: number;
    failureRate?: number;
  }): void {
    if (options.delay !== undefined) {
      this.networkDelay = options.delay;
    }
    if (options.failureRate !== undefined) {
      this.failureRate = Math.max(0, Math.min(1, options.failureRate));
    }
  }

  /**
   * Set custom mock response for specific endpoint
   */
  setMockResponse(method: HTTPMethod, endpoint: string, response: Partial<APIResponse>): void {
    const key = `${method}:${endpoint}`;
    this.mockResponses.set(key, {
      success: true,
      status: 200,
      headers: {},
      ...response,
    });
  }

  /**
   * Simulate API request
   */
  async request<T = any>(config: APIRequestConfig): Promise<APIResponse<T>> {
    // Log request for debugging
    this.requestLog.push({ ...config });

    // Simulate network delay
    if (this.networkDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.networkDelay));
    }

    // Simulate network failures
    if (Math.random() < this.failureRate) {
      return {
        success: false,
        data: null,
        status: 500,
        headers: {},
        error: 'Network simulation failure',
        message: 'Simulated network error for testing',
      };
    }

    // Find mock response
    const key = `${config.method}:${config.url}`;
    let mockResponse = this.mockResponses.get(key);

    // Try wildcard matching for parameterized routes
    if (!mockResponse) {
      for (const [mockKey, response] of this.mockResponses.entries()) {
        if (this.matchesWildcardRoute(mockKey, key)) {
          mockResponse = response;
          break;
        }
      }
    }

    // Default response if no mock found
    if (!mockResponse) {
      console.warn(`No mock response found for ${key}`);
      mockResponse = {
        success: false,
        data: null,
        status: 404,
        headers: {},
        error: 'Not Found',
        message: `No mock response configured for ${key}`,
      };
    }

    return {
      headers: {},
      ...mockResponse,
    };
  }

  /**
   * Match wildcard routes (e.g., /api/comments/*/reply)
   */
  private matchesWildcardRoute(pattern: string, actual: string): boolean {
    const patternRegex = pattern.replace(/\*/g, '[^/]+');
    return new RegExp(`^${patternRegex}$`).test(actual);
  }

  /**
   * Convenience methods for common HTTP verbs
   */
  async get<T = any>(url: string, config?: Omit<APIRequestConfig, 'method' | 'url'>): Promise<APIResponse<T>> {
    return this.request<T>({ method: 'GET', url, ...config });
  }

  async post<T = any>(url: string, data?: any, config?: Omit<APIRequestConfig, 'method' | 'url' | 'data'>): Promise<APIResponse<T>> {
    return this.request<T>({ method: 'POST', url, data, ...config });
  }

  async put<T = any>(url: string, data?: any, config?: Omit<APIRequestConfig, 'method' | 'url' | 'data'>): Promise<APIResponse<T>> {
    return this.request<T>({ method: 'PUT', url, data, ...config });
  }

  async delete<T = any>(url: string, config?: Omit<APIRequestConfig, 'method' | 'url'>): Promise<APIResponse<T>> {
    return this.request<T>({ method: 'DELETE', url, ...config });
  }

  /**
   * Get request history for test assertions
   */
  getRequestLog(): APIRequestConfig[] {
    return [...this.requestLog];
  }

  /**
   * Clear request log
   */
  clearRequestLog(): void {
    this.requestLog = [];
  }

  /**
   * Reset client state
   */
  reset(): void {
    this.clearRequestLog();
    this.networkDelay = 0;
    this.failureRate = 0;
    this.setupDefaultMockResponses();
  }

  /**
   * Create API client with specific scenario configuration
   */
  static createForScenario(scenario: 'success' | 'slow' | 'failure' | 'partial-failure'): APITestClient {
    const client = new APITestClient();
    
    switch (scenario) {
      case 'slow':
        client.configureNetworkSimulation({ delay: 2000 });
        break;
      case 'failure':
        client.configureNetworkSimulation({ failureRate: 1.0 });
        break;
      case 'partial-failure':
        client.configureNetworkSimulation({ failureRate: 0.3 });
        break;
      default:
        // 'success' - default configuration
        break;
    }
    
    return client;
  }
}

/**
 * Mock WebSocket Client for real-time testing
 */
export class MockWebSocketClient {
  private eventListeners: Map<string, Function[]> = new Map();
  private isConnected: boolean = false;
  private connectionDelay: number = 100;

  constructor() {
    // Simulate connection after delay
    setTimeout(() => {
      this.isConnected = true;
      this.emit('open', {});
    }, this.connectionDelay);
  }

  /**
   * Add event listener
   */
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  /**
   * Send message (simulated)
   */
  send(data: any): void {
    if (!this.isConnected) {
      throw new Error('WebSocket not connected');
    }
    // In real implementation, this would send to server
    console.log('Mock WebSocket send:', data);
  }

  /**
   * Simulate receiving message
   */
  simulateMessage(type: string, data: any): void {
    if (this.isConnected) {
      this.emit('message', {
        data: JSON.stringify({ type, data })
      });
    }
  }

  /**
   * Simulate connection close
   */
  simulateClose(): void {
    this.isConnected = false;
    this.emit('close', { code: 1000, reason: 'Normal closure' });
  }

  /**
   * Get connection status
   */
  get readyState(): number {
    return this.isConnected ? 1 : 0; // CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3
  }

  /**
   * Close connection
   */
  close(): void {
    this.simulateClose();
  }
}

// Export singleton instances for convenience
export const apiTestClient = new APITestClient();
export const createMockWebSocket = () => new MockWebSocketClient();