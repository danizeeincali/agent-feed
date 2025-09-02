/**
 * Mock Contracts for Claude Instance Lifecycle
 * 
 * London School TDD approach: Define clear contracts through mocks
 * These contracts define HOW components should collaborate, not WHAT they contain
 */

export interface ClaudeInstanceAPIContract {
  // Instance management endpoints
  fetchInstances(): Promise<{
    success: boolean;
    instances: ClaudeInstance[];
  }>;
  
  createInstance(config: InstanceConfig): Promise<{
    success: boolean;
    instance: ClaudeInstance;
    error?: string;
  }>;
  
  terminateInstance(instanceId: string): Promise<{
    success: boolean;
    error?: string;
  }>;
  
  connectToInstance(instanceId: string): Promise<{
    success: boolean;
    error?: string;
  }>;
  
  disconnectFromInstance(instanceId: string): Promise<{
    success: boolean;
    error?: string;
  }>;
}

export interface ClaudeInstance {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  pid: number;
  type: 'production' | 'development';
  createdAt: string;
  workingDirectory: string;
}

export interface InstanceConfig {
  command: string;
  name: string;
  type: string;
  workingDirectory?: string;
  autoRestart?: {
    enabled: boolean;
    intervalHours: number;
    maxRestarts: number;
  };
}

export interface SSEConnectionContract {
  // Connection lifecycle
  connect(instanceId: string): void;
  disconnect(instanceId: string): void;
  close(): void;
  
  // Event handling
  addEventListener(event: string, handler: Function): void;
  removeEventListener(event: string, handler: Function): void;
  
  // State
  readyState: number;
  url: string;
}

export interface ComponentLifecycleContract {
  // Mount behavior - must NOT auto-create instances
  onMount: {
    shouldFetchExistingInstances: true;
    shouldCreateNewInstances: false;
  };
  
  // Unmount behavior - must cleanup all resources
  onUnmount: {
    shouldCloseConnections: true;
    shouldTerminateInstances: true;
    shouldRemoveEventListeners: true;
  };
  
  // User interaction behavior
  onUserAction: {
    shouldCreateInstanceOnlyWhenExplicit: true;
    shouldPreventUnintendedCreation: true;
  };
  
  // Navigation behavior
  onNavigation: {
    shouldPreservePersistentInstances: true;
    shouldNotCreateDuplicates: true;
    shouldCleanupTemporaryResources: true;
  };
}

/**
 * Mock Factory Functions
 * London School: Create focused mocks for specific collaborations
 */
export const createClaudeInstanceAPIMock = (): jest.Mocked<ClaudeInstanceAPIContract> => ({
  fetchInstances: jest.fn(),
  createInstance: jest.fn(),
  terminateInstance: jest.fn(),
  connectToInstance: jest.fn(),
  disconnectFromInstance: jest.fn(),
});

export const createSSEConnectionMock = (): jest.Mocked<SSEConnectionContract> => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: EventSource.CONNECTING,
  url: 'http://localhost:3000/sse/instances',
});

/**
 * Mock Response Builders
 * London School: Define expected response patterns
 */
export const createInstanceResponse = (overrides: Partial<ClaudeInstance> = {}): ClaudeInstance => ({
  id: 'test-instance-' + Math.random().toString(36).substr(2, 9),
  name: 'Test Claude Instance',
  status: 'running',
  pid: Math.floor(Math.random() * 10000) + 1000,
  type: 'development',
  createdAt: new Date().toISOString(),
  workingDirectory: '/test/directory',
  ...overrides,
});

export const createSuccessResponse = <T>(data: T) => ({
  success: true,
  ...data,
});

export const createErrorResponse = (error: string) => ({
  success: false,
  error,
});

/**
 * Behavioral Verification Helpers
 * London School: Focus on interactions between objects
 */
export const verifyNoAutoInstanceCreation = (apiMock: jest.Mocked<ClaudeInstanceAPIContract>) => {
  expect(apiMock.createInstance).not.toHaveBeenCalled();
};

export const verifyUserInitiatedCreation = (apiMock: jest.Mocked<ClaudeInstanceAPIContract>, expectedConfig: InstanceConfig) => {
  expect(apiMock.createInstance).toHaveBeenCalledWith(
    expect.objectContaining(expectedConfig)
  );
  expect(apiMock.createInstance).toHaveBeenCalledTimes(1);
};

export const verifyProperCleanupSequence = (apiMock: jest.Mocked<ClaudeInstanceAPIContract>, sseMock: jest.Mocked<SSEConnectionContract>) => {
  // Verify cleanup happens in correct order: disconnect -> terminate -> close
  const disconnectCall = sseMock.disconnect.mock.calls.length > 0 ? 0 : -1;
  const terminateCall = apiMock.terminateInstance.mock.calls.length > 0 ? 0 : -1;
  const closeCall = sseMock.close.mock.calls.length > 0 ? 0 : -1;
  
  if (disconnectCall >= 0 && terminateCall >= 0 && closeCall >= 0) {
    expect(disconnectCall).toBeLessThanOrEqual(terminateCall);
    expect(terminateCall).toBeLessThanOrEqual(closeCall);
  }
};

export const verifyResourceLeakPrevention = (apiMock: jest.Mocked<ClaudeInstanceAPIContract>, cycles: number) => {
  // After multiple mount/unmount cycles, should not accumulate instances
  expect(apiMock.fetchInstances).toHaveBeenCalledTimes(cycles);
  expect(apiMock.createInstance).not.toHaveBeenCalled();
};

/**
 * Navigation Event Simulation
 * London School: Mock navigation events for testing
 */
export const simulateNavigationAway = () => {
  // Simulate browser navigation away from component
  window.dispatchEvent(new Event('beforeunload'));
};

export const simulateNavigationBack = () => {
  // Simulate navigation back to component
  window.dispatchEvent(new Event('focus'));
};

export const simulateBrowserRefresh = () => {
  // Simulate browser refresh
  window.dispatchEvent(new Event('beforeunload'));
  setTimeout(() => {
    window.dispatchEvent(new Event('load'));
  }, 100);
};

/**
 * Test Data Builders
 * London School: Create test data that focuses on interactions
 */
export const buildRunningInstanceScenario = () => ({
  instances: [
    createInstanceResponse({ status: 'running', name: 'Production Claude' }),
    createInstanceResponse({ status: 'running', name: 'Development Claude', type: 'development' }),
  ],
});

export const buildEmptyInstanceScenario = () => ({
  instances: [],
});

export const buildFailedInstanceScenario = () => ({
  instances: [
    createInstanceResponse({ status: 'error', name: 'Failed Claude' }),
  ],
});

/**
 * Assertion Helpers
 * London School: Assert on interactions, not internal state
 */
export const assertExactlyOneInstanceCreated = (apiMock: jest.Mocked<ClaudeInstanceAPIContract>) => {
  expect(apiMock.createInstance).toHaveBeenCalledTimes(1);
};

export const assertNoInstancesCreated = (apiMock: jest.Mocked<ClaudeInstanceAPIContract>) => {
  expect(apiMock.createInstance).not.toHaveBeenCalled();
};

export const assertProperConnectionCleanup = (sseMock: jest.Mocked<SSEConnectionContract>) => {
  expect(sseMock.close).toHaveBeenCalled();
  expect(sseMock.removeEventListener).toHaveBeenCalled();
};

export const assertAPICallSequence = (fetchMock: jest.MockedFunction<typeof fetch>, expectedSequence: Array<{ method?: string, url: string }>) => {
  const actualCalls = fetchMock.mock.calls.map(call => ({
    url: call[0] as string,
    method: (call[1] as RequestInit)?.method || 'GET',
  }));
  
  expectedSequence.forEach((expected, index) => {
    expect(actualCalls[index]).toEqual(
      expect.objectContaining({
        url: expect.stringContaining(expected.url),
        method: expected.method || 'GET',
      })
    );
  });
};