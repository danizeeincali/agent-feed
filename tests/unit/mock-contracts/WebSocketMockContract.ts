/**
 * TDD London School Mock Contract for WebSocket External Dependency
 * Defines all interactions and behaviors between components and WebSocket
 */

export interface WebSocketMockContract {
  // Connection lifecycle
  connect: jest.MockedFunction<() => void>;
  disconnect: jest.MockedFunction<() => void>;
  close: jest.MockedFunction<(code?: number, reason?: string) => void>;
  
  // Message handling
  send: jest.MockedFunction<(data: string | ArrayBuffer | Blob | ArrayBufferView) => void>;
  
  // Event handlers (these are properties, not functions)
  onopen: jest.MockedFunction<((this: WebSocket, ev: Event) => any) | null>;
  onclose: jest.MockedFunction<((this: WebSocket, ev: CloseEvent) => any) | null>;
  onmessage: jest.MockedFunction<((this: WebSocket, ev: MessageEvent) => any) | null>;
  onerror: jest.MockedFunction<((this: WebSocket, ev: Event) => any) | null>;
  
  // State properties
  readyState: number;
  url: string;
  protocol: string;
  
  // WebSocket constants
  CONNECTING: number;
  OPEN: number;
  CLOSING: number;
  CLOSED: number;
}

export interface WebSocketManagerMockContract {
  // Connection management
  getConnection: jest.MockedFunction<(terminalId: string) => WebSocket>;
  disconnect: jest.MockedFunction<(terminalId: string) => void>;
  disconnectAll: jest.MockedFunction<() => void>;
  
  // Message handling
  sendMessage: jest.MockedFunction<(terminalId: string, message: any) => void>;
  
  // Event system
  addHandler: jest.MockedFunction<(event: string, handler: (data: any) => void) => void>;
  removeHandler: jest.MockedFunction<(event: string, handler: (data: any) => void) => void>;
  removeAllHandlers: jest.MockedFunction<(event?: string) => void>;
  
  // Stats and monitoring
  getStats: jest.MockedFunction<() => {
    activeConnections: number;
    totalHandlers: number;
    connections: string[];
  }>;
}

export interface WebSocketHookMockContract {
  // Connection state
  connectionState: {
    isConnected: boolean;
    instanceId: string | null;
    terminalId: string | null;
    connectionType: 'none' | 'websocket' | 'polling';
    lastError: string | null;
    connectionAttempts: number;
    lastConnectionTime: number;
  };
  
  // Core methods
  connectToInstance: jest.MockedFunction<(instanceId: string) => Promise<void>>;
  connectToTerminal: jest.MockedFunction<(terminalId: string) => Promise<void>>;
  disconnectFromInstance: jest.MockedFunction<(instanceId?: string) => void>;
  disconnectFromTerminal: jest.MockedFunction<() => void>;
  sendCommand: jest.MockedFunction<(instanceId: string, command: string) => Promise<{success: boolean}>>;
  send: jest.MockedFunction<(input: string) => void>;
  
  // Event handling
  addHandler: jest.MockedFunction<(event: string, handler: (data: any) => void) => void>;
  removeHandler: jest.MockedFunction<(event: string, handler: (data: any) => void) => void>;
  subscribe: jest.MockedFunction<(event: string, handler: (data: any) => void) => void>;
  unsubscribe: jest.MockedFunction<(event: string, handler?: (data: any) => void) => void>;
  
  // Status and health
  isConnected: boolean;
  connectionError: string | null;
  getAllConnections: jest.MockedFunction<() => any>;
  getConnectionHealth: jest.MockedFunction<() => any>;
  testConnection: jest.MockedFunction<(terminalId: string) => Promise<{success: boolean; error?: string}>>;
}

/**
 * Factory function to create WebSocket mock with all expected interactions
 */
export const createWebSocketMock = (overrides: Partial<WebSocketMockContract> = {}): WebSocketMockContract => {
  const defaultMock: WebSocketMockContract = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    close: jest.fn(),
    send: jest.fn(),
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
    readyState: WebSocket.OPEN,
    url: 'ws://localhost:3000/terminal',
    protocol: '',
    CONNECTING: WebSocket.CONNECTING,
    OPEN: WebSocket.OPEN,
    CLOSING: WebSocket.CLOSING,
    CLOSED: WebSocket.CLOSED
  };
  
  return { ...defaultMock, ...overrides };
};

/**
 * Factory function to create WebSocket Manager mock
 */
export const createWebSocketManagerMock = (overrides: Partial<WebSocketManagerMockContract> = {}): WebSocketManagerMockContract => {
  const defaultMock: WebSocketManagerMockContract = {
    getConnection: jest.fn().mockReturnValue(createWebSocketMock()),
    disconnect: jest.fn(),
    disconnectAll: jest.fn(),
    sendMessage: jest.fn(),
    addHandler: jest.fn(),
    removeHandler: jest.fn(),
    removeAllHandlers: jest.fn(),
    getStats: jest.fn().mockReturnValue({
      activeConnections: 1,
      totalHandlers: 3,
      connections: ['test-terminal-id']
    })
  };
  
  return { ...defaultMock, ...overrides };
};

/**
 * Factory function to create WebSocket Hook mock
 */
export const createWebSocketHookMock = (overrides: Partial<WebSocketHookMockContract> = {}): WebSocketHookMockContract => {
  const defaultMock: WebSocketHookMockContract = {
    connectionState: {
      isConnected: false,
      instanceId: null,
      terminalId: null,
      connectionType: 'none',
      lastError: null,
      connectionAttempts: 0,
      lastConnectionTime: 0
    },
    connectToInstance: jest.fn().mockResolvedValue(undefined),
    connectToTerminal: jest.fn().mockResolvedValue(undefined),
    disconnectFromInstance: jest.fn(),
    disconnectFromTerminal: jest.fn(),
    sendCommand: jest.fn().mockResolvedValue({ success: true }),
    send: jest.fn(),
    addHandler: jest.fn(),
    removeHandler: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    isConnected: false,
    connectionError: null,
    getAllConnections: jest.fn().mockReturnValue([]),
    getConnectionHealth: jest.fn().mockReturnValue({ isHealthy: true }),
    testConnection: jest.fn().mockResolvedValue({ success: true })
  };
  
  return { ...defaultMock, ...overrides };
};

/**
 * Mock event simulator for testing interaction patterns
 */
export class WebSocketEventSimulator {
  private handlers: Map<string, Set<(data: any) => void>> = new Map();
  
  addHandler(event: string, handler: (data: any) => void) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }
  
  removeHandler(event: string, handler: (data: any) => void) {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler);
    }
  }
  
  simulateEvent(event: string, data: any) {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach(handler => handler(data));
    }
  }
  
  simulateConnection(terminalId: string) {
    this.simulateEvent('connect', { 
      instanceId: terminalId, 
      terminalId,
      connectionType: 'websocket' 
    });
  }
  
  simulateDisconnection(terminalId: string) {
    this.simulateEvent('disconnect', { 
      instanceId: terminalId, 
      terminalId 
    });
  }
  
  simulateMessage(terminalId: string, output: string) {
    this.simulateEvent('terminal:output', {
      instanceId: terminalId,
      terminalId,
      output,
      parsed: { hasToolCalls: false, segments: [{ type: 'text', content: output }] }
    });
  }
  
  simulateLoading(terminalId: string, message: string, isComplete: boolean = false) {
    this.simulateEvent('loading', {
      instanceId: terminalId,
      terminalId,
      message,
      isComplete
    });
  }
  
  simulatePermissionRequest(terminalId: string, message: string, requestId: string = 'test-req-1') {
    this.simulateEvent('permission_request', {
      instanceId: terminalId,
      terminalId,
      message,
      requestId
    });
  }
  
  simulateError(terminalId: string, error: string) {
    this.simulateEvent('error', {
      instanceId: terminalId,
      error
    });
  }
}