/**
 * London School TDD Test Setup
 * Sets up mock-driven testing infrastructure with Jest and Testing Library
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Global mocks for WebSocket and SSE
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock WebSocket
class MockWebSocket {
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState: number = 1; // OPEN

  constructor(public url: string) {
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    // Mock send behavior
  }

  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

global.WebSocket = MockWebSocket as any;

// Mock EventSource
class MockEventSource {
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState: number = 1; // OPEN

  constructor(public url: string) {
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  close() {
    this.readyState = 2; // CLOSED
    if (this.onclose) {
      this.onclose(new Event('close'));
    }
  }

  addEventListener(type: string, listener: EventListener) {
    // Mock event listener
  }

  removeEventListener(type: string, listener: EventListener) {
    // Mock event listener removal
  }
}

global.EventSource = MockEventSource as any;

// Mock fetch
global.fetch = vi.fn();

// Mock performance.now
global.performance = {
  ...global.performance,
  now: vi.fn(() => Date.now())
};

// Mock console to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// London School Mock Contracts
export interface MockContracts {
  WebSocketContract: {
    send: any;
    close: any;
    onopen: any | null;
    onclose: any | null;
    onmessage: any | null;
  };
  
  APIContract: {
    fetch: any;
    response: {
      json: any;
      ok: boolean;
      status: number;
    };
  };

  ClaudeServiceContract: {
    createInstance: any;
    connectToInstance: any;
    sendCommand: any;
    terminateInstance: any;
  };
}

// Mock factory for creating consistent mocks across tests
export const createMockContracts = (): MockContracts => {
  const mockResponse = {
    json: vi.fn(),
    ok: true,
    status: 200,
    text: vi.fn(),
    blob: vi.fn(),
    arrayBuffer: vi.fn(),
    clone: vi.fn(),
    headers: new Headers(),
    redirected: false,
    statusText: 'OK',
    type: 'basic' as ResponseType,
    url: '',
    body: null,
    bodyUsed: false
  };

  return {
    WebSocketContract: {
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onclose: null,
      onmessage: null
    },
    
    APIContract: {
      fetch: vi.fn().mockResolvedValue(mockResponse),
      response: mockResponse as any
    },

    ClaudeServiceContract: {
      createInstance: vi.fn(),
      connectToInstance: vi.fn(),
      sendCommand: vi.fn(),
      terminateInstance: vi.fn()
    }
  };
};

// Test utilities for interaction verification
export const verifyInteractionOrder = (mocks: Array<{ calls: any[][] }>) => {
  const allCalls = mocks.flatMap((mock, mockIndex) => 
    mock.calls.map((call, callIndex) => ({
      mockIndex,
      callIndex,
      call,
      timestamp: Date.now() + mockIndex * 1000 + callIndex
    }))
  ).sort((a, b) => a.timestamp - b.timestamp);

  return allCalls;
};

// Behavior verification helpers
export const expectInteractionPattern = (
  mocks: Record<string, any>,
  expectedPattern: Array<{ mock: string; args?: any[] }>
) => {
  expectedPattern.forEach((expected, index) => {
    const mock = mocks[expected.mock];
    expect(mock).toHaveBeenNthCalledWith(
      index + 1,
      ...(expected.args || [])
    );
  });
};

// Contract validation
export const validateContractCompliance = (
  mock: any,
  contract: {
    input: any;
    output: any;
    sideEffects?: string[];
  }
) => {
  // Validate input contract
  if (contract.input && mock.mock.calls.length > 0) {
    const lastCall = mock.mock.calls[mock.mock.calls.length - 1];
    expect(lastCall[0]).toMatchObject(contract.input);
  }

  // Validate output contract
  if (contract.output) {
    expect(mock).toHaveReturnedWith(
      expect.objectContaining(contract.output)
    );
  }
};

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});