/**
 * TDD London School: Mock Factory & Contract Definitions
 * 
 * Centralized mock creation and behavior contracts for consistent testing
 * London School Methodology: Define collaborator contracts through mocks
 */

export interface MockSocketContract {
  id: string;
  connected: boolean;
  emit: jest.Mock;
  on: jest.Mock;
  off: jest.Mock;
  disconnect: jest.Mock;
  removeAllListeners: jest.Mock;
}

export interface MockHTTPSSEContract {
  socket: MockSocketContract | null;
  isConnected: boolean;
  connectionError: string | null;
  lastMessage: any | null;
  connect: jest.Mock;
  disconnect: jest.Mock;
  emit: jest.Mock;
  subscribe: jest.Mock;
  unsubscribe: jest.Mock;
  on: jest.Mock;
  off: jest.Mock;
  startPolling: jest.Mock;
  stopPolling: jest.Mock;
  connectSSE: jest.Mock;
}

export interface InstanceCreationResponse {
  success: boolean;
  instanceId?: string;
  error?: string;
  message?: string;
}

export interface TerminalOutputData {
  output: string;
  instanceId: string;
  processInfo?: any;
  timestamp?: string;
}

export interface ConnectionEventData {
  transport: 'sse' | 'polling' | 'ready';
  instanceId?: string;
  connectionType: 'sse' | 'polling' | 'ready' | 'none';
}

/**
 * Factory for creating mock Socket objects with London School contracts
 */
export class MockSocketFactory {
  static create(overrides: Partial<MockSocketContract> = {}): MockSocketContract {
    const handlerRegistry = new Map<string, Function[]>();

    const mockOn = jest.fn().mockImplementation((event: string, handler: Function) => {
      if (!handlerRegistry.has(event)) {
        handlerRegistry.set(event, []);
      }
      handlerRegistry.get(event)!.push(handler);
    });

    const mockOff = jest.fn().mockImplementation((event: string, handler?: Function) => {
      if (handler) {
        const handlers = handlerRegistry.get(event);
        if (handlers) {
          const index = handlers.indexOf(handler);
          if (index > -1) {
            handlers.splice(index, 1);
          }
        }
      } else {
        handlerRegistry.delete(event);
      }
    });

    const mockEmit = jest.fn().mockImplementation((event: string, data?: any) => {
      // Simulate real socket behavior - emit events to registered handlers
      const handlers = handlerRegistry.get(event);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error(`Mock handler error for ${event}:`, error);
          }
        });
      }
    });

    const mockRemoveAllListeners = jest.fn().mockImplementation((event?: string) => {
      if (event) {
        handlerRegistry.delete(event);
      } else {
        handlerRegistry.clear();
      }
    });

    return {
      id: `mock-socket-${Date.now()}`,
      connected: true,
      emit: mockEmit,
      on: mockOn,
      off: mockOff,
      disconnect: jest.fn(),
      removeAllListeners: mockRemoveAllListeners,
      // Add handler registry for testing purposes
      ...{ _handlerRegistry: handlerRegistry },
      ...overrides,
    };
  }

  /**
   * Create a socket that simulates connection failures
   */
  static createFailingSocket(): MockSocketContract {
    return this.create({
      connected: false,
      emit: jest.fn().mockRejectedValue(new Error('Socket not connected')),
      on: jest.fn(),
      off: jest.fn(),
    });
  }

  /**
   * Create a socket with delayed responses for timing tests
   */
  static createDelayedSocket(delay: number = 100): MockSocketContract {
    const socket = this.create();
    
    const originalEmit = socket.emit;
    socket.emit = jest.fn().mockImplementation((event: string, data?: any) => {
      return new Promise(resolve => {
        setTimeout(() => {
          originalEmit(event, data);
          resolve(undefined);
        }, delay);
      });
    });

    return socket;
  }
}

/**
 * Factory for creating mock useHTTPSSE hooks with behavior contracts
 */
export class MockHTTPSSEFactory {
  static create(overrides: Partial<MockHTTPSSEContract> = {}): MockHTTPSSEContract {
    const mockSocket = MockSocketFactory.create();

    return {
      socket: mockSocket,
      isConnected: true,
      connectionError: null,
      lastMessage: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      emit: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      on: mockSocket.on,
      off: mockSocket.off,
      startPolling: jest.fn(),
      stopPolling: jest.fn(),
      connectSSE: jest.fn(),
      ...overrides,
    };
  }

  /**
   * Create hook mock that simulates SSE connection success
   */
  static createWithSSESuccess(): MockHTTPSSEContract {
    const mock = this.create();
    
    mock.connectSSE = jest.fn().mockImplementation((instanceId: string) => {
      // Simulate successful SSE connection
      setTimeout(() => {
        const connectHandler = (mock.socket as any)?._handlerRegistry?.get('connect')?.[0];
        if (connectHandler) {
          connectHandler({
            transport: 'sse',
            instanceId,
            connectionType: 'sse'
          });
        }
      }, 10);
      
      return Promise.resolve();
    });

    return mock;
  }

  /**
   * Create hook mock that simulates SSE failure → polling fallback
   */
  static createWithSSEFailure(): MockHTTPSSEContract {
    const mock = this.create();
    
    mock.connectSSE = jest.fn().mockImplementation((instanceId: string) => {
      // Simulate SSE failure, trigger polling
      setTimeout(() => {
        mock.startPolling(instanceId);
      }, 10);
      
      return Promise.reject(new Error('SSE connection failed'));
    });

    mock.startPolling = jest.fn().mockImplementation((instanceId: string) => {
      // Simulate successful polling fallback
      setTimeout(() => {
        const connectHandler = (mock.socket as any)?._handlerRegistry?.get('connect')?.[0];
        if (connectHandler) {
          connectHandler({
            transport: 'polling',
            instanceId,
            connectionType: 'polling'
          });
        }
      }, 20);
      
      return Promise.resolve();
    });

    return mock;
  }

  /**
   * Create hook mock that simulates complete connection failure
   */
  static createWithConnectionFailure(): MockHTTPSSEContract {
    return this.create({
      isConnected: false,
      connectionError: 'Failed to establish connection',
      connectSSE: jest.fn().mockRejectedValue(new Error('Connection refused')),
      startPolling: jest.fn().mockRejectedValue(new Error('Polling failed')),
    });
  }
}

/**
 * Factory for creating API response mocks
 */
export class MockAPIFactory {
  /**
   * Create successful instance creation response
   */
  static createInstanceSuccess(instanceId: string = 'claude-TEST-123'): InstanceCreationResponse {
    return {
      success: true,
      instanceId,
      message: 'Instance created successfully',
    };
  }

  /**
   * Create failed instance creation response
   */
  static createInstanceFailure(error: string = 'Creation failed'): InstanceCreationResponse {
    return {
      success: false,
      error,
    };
  }

  /**
   * Create mock fetch implementation for instance management
   */
  static createFetchMock(scenarios: {
    instancesGet?: any;
    instancesPost?: any;
    instancesDelete?: any;
  } = {}) {
    return jest.fn().mockImplementation((url: string, options?: any) => {
      const method = options?.method || 'GET';
      
      if (url.includes('/api/claude/instances')) {
        if (method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(scenarios.instancesGet || {
              success: true,
              instances: [],
            }),
          });
        }
        
        if (method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(scenarios.instancesPost || 
              MockAPIFactory.createInstanceSuccess()
            ),
          });
        }
        
        if (method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(scenarios.instancesDelete || {
              success: true,
              message: 'Instance terminated',
            }),
          });
        }
      }
      
      return Promise.reject(new Error(`Unexpected API call: ${method} ${url}`));
    });
  }
}

/**
 * Contract verification utilities for London School TDD
 */
export class ContractVerifier {
  /**
   * Verify that a mock socket follows the expected contract
   */
  static verifySocketContract(socket: MockSocketContract): void {
    expect(socket.id).toBeDefined();
    expect(typeof socket.connected).toBe('boolean');
    expect(socket.emit).toEqual(expect.any(Function));
    expect(socket.on).toEqual(expect.any(Function));
    expect(socket.off).toEqual(expect.any(Function));
    expect(socket.disconnect).toEqual(expect.any(Function));
    expect(socket.removeAllListeners).toEqual(expect.any(Function));
  }

  /**
   * Verify that a mock useHTTPSSE hook follows the expected contract
   */
  static verifyHTTPSSEContract(hook: MockHTTPSSEContract): void {
    expect(typeof hook.isConnected).toBe('boolean');
    expect(hook.connectionError === null || typeof hook.connectionError === 'string').toBe(true);
    expect(hook.connect).toEqual(expect.any(Function));
    expect(hook.disconnect).toEqual(expect.any(Function));
    expect(hook.emit).toEqual(expect.any(Function));
    expect(hook.on).toEqual(expect.any(Function));
    expect(hook.off).toEqual(expect.any(Function));
    expect(hook.connectSSE).toEqual(expect.any(Function));
    expect(hook.startPolling).toEqual(expect.any(Function));
    expect(hook.stopPolling).toEqual(expect.any(Function));
  }

  /**
   * Verify terminal output data contract
   */
  static verifyTerminalOutputContract(data: TerminalOutputData): void {
    expect(typeof data.output).toBe('string');
    expect(typeof data.instanceId).toBe('string');
    expect(data.instanceId).toBeTruthy();
  }

  /**
   * Verify connection event data contract
   */
  static verifyConnectionEventContract(data: ConnectionEventData): void {
    expect(['sse', 'polling', 'ready']).toContain(data.transport);
    expect(['sse', 'polling', 'ready', 'none']).toContain(data.connectionType);
  }
}

/**
 * Test scenario builders for complex workflows
 */
export class ScenarioBuilder {
  /**
   * Build a complete success scenario
   */
  static buildSuccessScenario(instanceId: string = 'claude-SUCCESS-123') {
    return {
      fetchMock: MockAPIFactory.createFetchMock({
        instancesPost: MockAPIFactory.createInstanceSuccess(instanceId),
        instancesGet: {
          success: true,
          instances: [{
            id: instanceId,
            name: 'Test Instance',
            status: 'running',
            pid: 12345,
          }],
        },
      }),
      httpsseHook: MockHTTPSSEFactory.createWithSSESuccess(),
    };
  }

  /**
   * Build a failure → retry → success scenario
   */
  static buildRetryScenario(instanceId: string = 'claude-RETRY-123') {
    let attemptCount = 0;
    
    const fetchMock = jest.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST') {
        attemptCount++;
        if (attemptCount === 1) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve(MockAPIFactory.createInstanceFailure('Server busy')),
          });
        } else {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(MockAPIFactory.createInstanceSuccess(instanceId)),
          });
        }
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, instances: [] }),
      });
    });

    return {
      fetchMock,
      httpsseHook: MockHTTPSSEFactory.createWithSSESuccess(),
    };
  }

  /**
   * Build SSE failure → polling fallback scenario
   */
  static buildFallbackScenario(instanceId: string = 'claude-FALLBACK-123') {
    return {
      fetchMock: MockAPIFactory.createFetchMock({
        instancesPost: MockAPIFactory.createInstanceSuccess(instanceId),
      }),
      httpsseHook: MockHTTPSSEFactory.createWithSSEFailure(),
    };
  }
}

/**
 * Helper for waiting for mock calls in tests
 */
export class MockCallWaiter {
  /**
   * Wait for a specific number of calls on a mock
   */
  static async waitForCalls(
    mock: jest.Mock, 
    expectedCalls: number, 
    timeout: number = 1000
  ): Promise<void> {
    const startTime = Date.now();
    
    while (mock.mock.calls.length < expectedCalls) {
      if (Date.now() - startTime > timeout) {
        throw new Error(
          `Mock expected ${expectedCalls} calls but got ${mock.mock.calls.length} after ${timeout}ms`
        );
      }
      
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * Wait for a mock to be called with specific arguments
   */
  static async waitForCallWithArgs(
    mock: jest.Mock,
    expectedArgs: any[],
    timeout: number = 1000
  ): Promise<void> {
    const startTime = Date.now();
    
    while (true) {
      const matchingCall = mock.mock.calls.find(call => 
        call.length === expectedArgs.length &&
        call.every((arg, index) => 
          JSON.stringify(arg) === JSON.stringify(expectedArgs[index])
        )
      );
      
      if (matchingCall) {
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        throw new Error(
          `Mock never called with expected args ${JSON.stringify(expectedArgs)} after ${timeout}ms`
        );
      }
      
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}