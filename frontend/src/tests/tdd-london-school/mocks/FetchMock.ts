/**
 * Fetch Mock for HTTP POST Testing - London School TDD Approach
 * Provides comprehensive mocking capabilities for HTTP requests
 */

import { jest } from '@jest/globals';

export interface MockResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  delay?: number;
  shouldFail?: boolean;
  failureReason?: string;
}

export interface FetchMockConfig {
  baseUrl?: string;
  defaultDelay?: number;
  defaultHeaders?: Record<string, string>;
  enableRequestCapture?: boolean;
  enableNetworkSimulation?: boolean;
}

export interface CapturedRequest {
  url: string;
  init?: RequestInit;
  timestamp: number;
  method: string;
  headers: Record<string, string>;
  body: any;
}

export class MockFetchResponse implements Response {
  public readonly body: ReadableStream<Uint8Array> | null;
  public readonly bodyUsed: boolean = false;
  public readonly headers: Headers;
  public readonly ok: boolean;
  public readonly redirected: boolean = false;
  public readonly status: number;
  public readonly statusText: string;
  public readonly type: ResponseType = 'basic';
  public readonly url: string;

  private mockResponseData: MockResponse;
  private responseText: string;

  constructor(mockResponse: MockResponse, url: string) {
    this.mockResponseData = mockResponse;
    this.status = mockResponse.status;
    this.statusText = mockResponse.statusText;
    this.ok = mockResponse.status >= 200 && mockResponse.status < 300;
    this.url = url;
    
    this.headers = new Headers(mockResponse.headers);
    this.responseText = typeof mockResponse.body === 'string' 
      ? mockResponse.body 
      : JSON.stringify(mockResponse.body);
    
    // Mock ReadableStream - simplified for testing
    this.body = null; // Not implementing full stream for testing purposes
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return new TextEncoder().encode(this.responseText).buffer;
  }

  async blob(): Promise<Blob> {
    return new Blob([this.responseText]);
  }

  async formData(): Promise<FormData> {
    throw new Error('FormData not implemented in mock');
  }

  async json(): Promise<any> {
    try {
      return JSON.parse(this.responseText);
    } catch {
      throw new Error('Invalid JSON in mock response');
    }
  }

  async text(): Promise<string> {
    return this.responseText;
  }

  clone(): Response {
    return new MockFetchResponse(this.mockResponseData, this.url);
  }
}

export class FetchMock {
  private responses: Map<string, MockResponse[]> = new Map();
  private defaultResponse: MockResponse = {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/json' },
    body: {}
  };
  private capturedRequests: CapturedRequest[] = [];
  private config: FetchMockConfig;
  
  // Jest Mock Functions for London School Verification
  public fetchMock = jest.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
  public requestCaptureMock = jest.fn<(request: CapturedRequest) => void>();
  public responseDeliveryMock = jest.fn<(url: string, response: MockResponse) => void>();
  public networkErrorMock = jest.fn<(url: string, error: Error) => void>();

  constructor(config: FetchMockConfig = {}) {
    this.config = {
      defaultDelay: 0,
      defaultHeaders: { 'Content-Type': 'application/json' },
      enableRequestCapture: true,
      enableNetworkSimulation: false,
      ...config
    };
  }

  // London School - Mock Configuration and Setup
  public mockResponse(urlPattern: string | RegExp, response: MockResponse): void {
    const key = urlPattern.toString();
    if (!this.responses.has(key)) {
      this.responses.set(key, []);
    }
    this.responses.get(key)!.push(response);
  }

  public mockSuccessResponse(urlPattern: string | RegExp, body: any, headers?: Record<string, string>): void {
    this.mockResponse(urlPattern, {
      status: 200,
      statusText: 'OK',
      headers: { ...this.config.defaultHeaders, ...headers },
      body
    });
  }

  public mockErrorResponse(urlPattern: string | RegExp, status: number, body?: any): void {
    this.mockResponse(urlPattern, {
      status,
      statusText: this.getStatusText(status),
      headers: this.config.defaultHeaders!,
      body: body || { error: `HTTP ${status}` }
    });
  }

  public mockNetworkError(urlPattern: string | RegExp, reason: string = 'Network Error'): void {
    this.mockResponse(urlPattern, {
      status: 0,
      statusText: '',
      headers: {},
      body: null,
      shouldFail: true,
      failureReason: reason
    });
  }

  public mockSlowResponse(urlPattern: string | RegExp, body: any, delay: number): void {
    this.mockResponse(urlPattern, {
      status: 200,
      statusText: 'OK',
      headers: this.config.defaultHeaders!,
      body,
      delay
    });
  }

  // London School - Main Mock Implementation
  public async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';
    const headers = this.extractHeaders(init?.headers);
    const body = this.extractBody(init?.body);

    // Capture request for verification
    if (this.config.enableRequestCapture) {
      const capturedRequest: CapturedRequest = {
        url,
        init,
        timestamp: Date.now(),
        method,
        headers,
        body
      };
      this.capturedRequests.push(capturedRequest);
      this.requestCaptureMock(capturedRequest);
    }

    // Find matching response
    const mockResponse = this.findMatchingResponse(url);
    
    // Simulate network delay
    const delay = mockResponse?.delay || this.config.defaultDelay || 0;
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Handle network failures
    if (mockResponse?.shouldFail) {
      const error = new Error(mockResponse.failureReason || 'Network Error');
      this.networkErrorMock(url, error);
      throw error;
    }

    // Create and return mock response
    const response = mockResponse || this.defaultResponse;
    this.responseDeliveryMock(url, response);
    this.fetchMock(input, init);

    return new MockFetchResponse(response, url);
  }

  // London School - Request Verification Methods
  public getRequestHistory(): CapturedRequest[] {
    return [...this.capturedRequests];
  }

  public getRequestsTo(urlPattern: string | RegExp): CapturedRequest[] {
    return this.capturedRequests.filter(request => 
      this.matchesPattern(request.url, urlPattern)
    );
  }

  public getLastRequest(): CapturedRequest | undefined {
    return this.capturedRequests[this.capturedRequests.length - 1];
  }

  public getRequestWithBody(expectedBody: any): CapturedRequest | undefined {
    return this.capturedRequests.find(request => 
      JSON.stringify(request.body) === JSON.stringify(expectedBody)
    );
  }

  public clearHistory(): void {
    this.capturedRequests = [];
    this.fetchMock.mockClear();
    this.requestCaptureMock.mockClear();
    this.responseDeliveryMock.mockClear();
    this.networkErrorMock.mockClear();
  }

  // London School - Mock Interaction Verification
  public getInteractionHistory() {
    return {
      fetch: this.fetchMock.mock.calls,
      requestCapture: this.requestCaptureMock.mock.calls,
      responseDelivery: this.responseDeliveryMock.mock.calls,
      networkError: this.networkErrorMock.mock.calls
    };
  }

  // Helper Methods
  private findMatchingResponse(url: string): MockResponse | undefined {
    for (const [pattern, responses] of this.responses) {
      if (this.matchesPattern(url, pattern)) {
        return responses.shift(); // Return and remove first matching response
      }
    }
    return undefined;
  }

  private matchesPattern(url: string, pattern: string | RegExp): boolean {
    if (typeof pattern === 'string') {
      return url.includes(pattern) || pattern === '*';
    }
    return pattern.test(url);
  }

  private extractHeaders(headers?: HeadersInit): Record<string, string> {
    if (!headers) return {};
    
    if (headers instanceof Headers) {
      const result: Record<string, string> = {};
      headers.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }
    
    if (Array.isArray(headers)) {
      const result: Record<string, string> = {};
      headers.forEach(([key, value]) => {
        result[key] = value;
      });
      return result;
    }
    
    return headers as Record<string, string>;
  }

  private extractBody(body?: BodyInit): any {
    if (!body) return null;
    if (typeof body === 'string') {
      try {
        return JSON.parse(body);
      } catch {
        return body;
      }
    }
    return body;
  }

  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable'
    };
    return statusTexts[status] || 'Unknown Status';
  }
}

// London School - Factory for Creating Configured Mocks
export class FetchMockFactory {
  public static createSuccessMock(config?: FetchMockConfig): FetchMock {
    const mock = new FetchMock(config);
    mock.mockSuccessResponse('*', { success: true });
    return mock;
  }

  public static createErrorMock(status: number = 500, config?: FetchMockConfig): FetchMock {
    const mock = new FetchMock(config);
    mock.mockErrorResponse('*', status);
    return mock;
  }

  public static createSlowMock(delay: number = 2000, config?: FetchMockConfig): FetchMock {
    const mock = new FetchMock(config);
    mock.mockSlowResponse('*', { success: true }, delay);
    return mock;
  }

  public static createNetworkErrorMock(config?: FetchMockConfig): FetchMock {
    const mock = new FetchMock(config);
    mock.mockNetworkError('*', 'Network connection failed');
    return mock;
  }

  public static createTerminalMock(config?: FetchMockConfig): FetchMock {
    const mock = new FetchMock(config);
    
    // Mock terminal connection endpoint
    mock.mockSuccessResponse('/api/terminal/connect', {
      success: true,
      terminalId: 'mock-terminal-123',
      sessionId: 'mock-session-456'
    });
    
    // Mock command execution endpoint
    mock.mockSuccessResponse('/api/terminal/command', {
      success: true,
      output: 'Command executed successfully',
      timestamp: Date.now()
    });
    
    // Mock terminal status endpoint
    mock.mockSuccessResponse('/api/terminal/status', {
      status: 'connected',
      terminalId: 'mock-terminal-123',
      isActive: true
    });
    
    return mock;
  }
}

// London School - Mock Contract Verification Helpers
export const createFetchContract = () => ({
  shouldMakeRequest: (mock: FetchMock, url: string, method: string = 'POST') => {
    const requests = mock.getRequestsTo(url);
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe(method);
  },

  shouldSendRequestWithBody: (mock: FetchMock, url: string, expectedBody: any) => {
    const request = mock.getRequestWithBody(expectedBody);
    expect(request).toBeDefined();
    expect(request!.url).toMatch(url);
  },

  shouldMakeRequestsInOrder: (mock: FetchMock, expectedUrls: string[]) => {
    const requests = mock.getRequestHistory();
    expect(requests).toHaveLength(expectedUrls.length);
    
    requests.forEach((request, index) => {
      expect(request.url).toMatch(expectedUrls[index]);
    });
  },

  shouldIncludeHeaders: (mock: FetchMock, url: string, expectedHeaders: Record<string, string>) => {
    const requests = mock.getRequestsTo(url);
    expect(requests).toHaveLength(1);
    
    Object.entries(expectedHeaders).forEach(([key, value]) => {
      expect(requests[0].headers[key]).toBe(value);
    });
  },

  shouldRetry: (mock: FetchMock, url: string, expectedAttempts: number) => {
    const requests = mock.getRequestsTo(url);
    expect(requests).toHaveLength(expectedAttempts);
  }
});