/**
 * Jest setup file for TDD London School Claude Tripling Issue Tests
 * 
 * Configures testing environment and global mocks needed for
 * London School mock-driven testing approach.
 */

import '@testing-library/jest-dom';

// Mock WebSocket globally for all tests
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  public readyState = MockWebSocket.OPEN;
  public url = '';
  public protocol = '';
  
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocol = Array.isArray(protocols) ? protocols[0] : protocols || '';
  }

  send(data: string | ArrayBuffer | Blob | ArrayBufferView): void {
    // Mock implementation - tests will override this
  }

  close(code?: number, reason?: string): void {
    // Mock implementation
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  addEventListener(type: string, listener: EventListener): void {
    // Mock implementation for addEventListener
    if (type === 'open' && typeof listener === 'function') {
      this.onopen = listener as (event: Event) => void;
    } else if (type === 'message' && typeof listener === 'function') {
      this.onmessage = listener as (event: MessageEvent) => void;
    } else if (type === 'close' && typeof listener === 'function') {
      this.onclose = listener as (event: CloseEvent) => void;
    } else if (type === 'error' && typeof listener === 'function') {
      this.onerror = listener as (event: Event) => void;
    }
  }

  removeEventListener(): void {
    // Mock implementation
  }

  // Test helper methods
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { 
        data: typeof data === 'string' ? data : JSON.stringify(data) 
      }));
    }
  }

  simulateError(error?: string): void {
    if (this.onerror) {
      const errorEvent = new Event('error');
      (errorEvent as any).message = error || 'WebSocket error';
      this.onerror(errorEvent);
    }
  }

  simulateClose(code = 1000, reason = 'Normal closure'): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }
}

// Set up global WebSocket mock
(global as any).WebSocket = MockWebSocket;

// Mock EventSource for SSE testing
class MockEventSource {
  public static readonly CONNECTING = 0;
  public static readonly OPEN = 1;
  public static readonly CLOSED = 2;
  
  public readyState = MockEventSource.CONNECTING;
  public url = '';
  
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  
  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }
  
  close(): void {
    this.readyState = MockEventSource.CLOSED;
  }
  
  addEventListener(type: string, listener: EventListener): void {
    if (type === 'open' && typeof listener === 'function') {
      this.onopen = listener as (event: Event) => void;
    } else if (type === 'message' && typeof listener === 'function') {
      this.onmessage = listener as (event: MessageEvent) => void;
    } else if (type === 'error' && typeof listener === 'function') {
      this.onerror = listener as (event: Event) => void;
    }
  }
  
  removeEventListener(): void {
    // Mock implementation
  }
  
  // Test helper methods
  simulateMessage(data: any): void {
    if (this.onmessage && this.readyState === MockEventSource.OPEN) {
      this.onmessage(new MessageEvent('message', { 
        data: typeof data === 'string' ? data : JSON.stringify(data) 
      }));
    }
  }
  
  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

(global as any).EventSource = MockEventSource;

// Mock fetch for API testing
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock window.location for URL testing
delete (window as any).location;
(window as any).location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn()
};

// Global test utilities for TDD London School approach
(global as any).testHelpers = {
  // Create mock handlers map for testing event systems
  createMockEventHandlers: () => new Map<string, Set<(data: any) => void>>(),
  
  // Create mock WebSocket that can be controlled in tests
  createControllableWebSocket: (url: string) => {
    const ws = new MockWebSocket(url);
    return {
      instance: ws,
      simulateOpen: () => ws.simulateOpen(),
      simulateMessage: (data: any) => ws.simulateMessage(data),
      simulateError: (error?: string) => ws.simulateError(error),
      simulateClose: (code?: number, reason?: string) => ws.simulateClose(code, reason)
    };
  },
  
  // Helper to create test message data
  createTestMessage: (overrides: Partial<{
    terminalId: string;
    output: string;
    timestamp: number;
    type: string;
  }> = {}) => ({
    terminalId: 'claude-test123',
    output: 'Test message content',
    timestamp: Date.now(),
    type: 'output',
    ...overrides
  }),
  
  // Helper to create Claude box response
  createClaudeBoxResponse: (content: string) => `
┌────────────────────────────────────────────────────────────────┐
│ ${content.padEnd(62)} │
└────────────────────────────────────────────────────────────────┘`,
  
  // Helper to verify no duplication in text
  verifyNoDuplication: (text: string, searchTerm: string) => {
    const matches = text.match(new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'));
    return (matches || []).length === 1;
  }
};

// Mock performance.now for consistent timing in tests
let mockTime = 0;
(global as any).performance = {
  now: () => {
    mockTime += 1;
    return mockTime;
  }
};

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  mockTime = 0;
  
  // Reset fetch mock to return successful responses by default
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, instances: [] }),
    text: async () => 'OK',
    status: 200,
    statusText: 'OK'
  });
});

// Cleanup after each test
afterEach(() => {
  // Clear any global test state
  if ((window as any).mockHandleWebSocketMessage) {
    delete (window as any).mockHandleWebSocketMessage;
  }
  if ((window as any).addMessage) {
    delete (window as any).addMessage;
  }
});

export {};