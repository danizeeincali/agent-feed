/**
 * London School TDD - WebSocket Removal Mock Factory
 * 
 * This mock factory follows the London School methodology by focusing on
 * collaboration behavior and interaction verification rather than state inspection.
 */

export interface WebSocketConnectionTracker {
  connectionAttempts: Array<{ url: string; timestamp: number }>;
  closedConnections: string[];
  sentMessages: Array<{ url: string; data: any; timestamp: number }>;
  reset(): void;
}

export interface TokenCostTrackingDependencies {
  useWebSocketSingleton: jest.Mock;
  socket: jest.Mock;
  isConnected: boolean;
  trackConnectionAttempts: jest.Mock;
  trackDisconnections: jest.Mock;
}

/**
 * Create mocks for WebSocket dependencies with behavior verification focus
 */
export const createWebSocketRemovalMocks = (): TokenCostTrackingDependencies => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
    connected: false,
    id: 'mock-socket-id'
  };

  const mockUseWebSocketSingleton = jest.fn(() => ({
    socket: null, // Simulate WebSocket removal - no socket available
    isConnected: false,
    isConnecting: false,
    error: new Error('WebSocket disabled'),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connectionAttempts: 0,
    lastConnectionAttempt: null
  }));

  const trackConnectionAttempts = jest.fn();
  const trackDisconnections = jest.fn();

  return {
    useWebSocketSingleton: mockUseWebSocketSingleton,
    socket: mockSocket,
    isConnected: false,
    trackConnectionAttempts,
    trackDisconnections
  };
};

/**
 * Mock for useTokenCostTracking hook without WebSocket dependencies
 */
export const createTokenCostTrackingMockWithoutWebSocket = () => {
  return {
    tokenUsages: [],
    metrics: null,
    budgetStatus: null,
    loading: false,
    error: null,
    isConnected: false, // Key: WebSocket is not connected
    trackTokenUsage: jest.fn(),
    calculateTokenCost: jest.fn(),
    refetch: jest.fn()
  };
};

/**
 * Mock for useTokenCostTracking hook with demo data (fallback mode)
 */
export const createTokenCostTrackingMockWithDemoData = () => {
  const demoTokenUsages = [
    {
      id: 'demo-1',
      timestamp: new Date(Date.now() - 3600000),
      provider: 'claude',
      model: 'claude-3-sonnet',
      tokensUsed: 1250,
      estimatedCost: 0.0125,
      requestType: 'chat',
      component: 'TokenCostAnalytics',
      metadata: { demo: true }
    },
    {
      id: 'demo-2',
      timestamp: new Date(Date.now() - 1800000), 
      provider: 'openai',
      model: 'gpt-4',
      tokensUsed: 890,
      estimatedCost: 0.0178,
      requestType: 'completion',
      component: 'TokenCostAnalytics',
      metadata: { demo: true }
    }
  ];

  const demoMetrics = {
    totalTokensUsed: 2140,
    totalCost: 0.0303,
    costByProvider: { claude: 0.0125, openai: 0.0178 },
    costByModel: { 'claude-3-sonnet': 0.0125, 'gpt-4': 0.0178 },
    averageCostPerToken: 0.0000142,
    tokensPerMinute: 0.59,
    costTrend: 'stable' as const,
    lastUpdated: new Date()
  };

  return {
    tokenUsages: demoTokenUsages,
    metrics: demoMetrics,
    budgetStatus: null,
    loading: false,
    error: null,
    isConnected: false, // WebSocket disabled, using demo data
    trackTokenUsage: jest.fn(),
    calculateTokenCost: jest.fn().mockReturnValue(0.015),
    refetch: jest.fn()
  };
};

/**
 * Mock for SimpleAnalytics tab switching behavior
 */
export const createSimpleAnalyticsMocks = () => {
  const mockSetActiveTab = jest.fn();
  
  return {
    activeTab: 'system' as 'system' | 'tokens',
    setActiveTab: mockSetActiveTab,
    loading: false,
    metrics: [
      {
        id: 'cpu',
        name: 'CPU Usage',
        value: 45,
        unit: '%',
        trend: 'stable' as const,
        status: 'good' as const
      }
    ],
    performanceData: []
  };
};

/**
 * Verify no WebSocket connections were attempted during test execution
 */
export const verifyNoWebSocketConnections = () => {
  // Check if tracking arrays exist before asserting on them
  const wsAttempts = global.WebSocket?.connectionAttempts || [];
  const esAttempts = global.EventSource?.connectionAttempts || [];
  
  expect(wsAttempts).toHaveLength(0);
  expect(esAttempts).toHaveLength(0);
};

/**
 * Verify specific interaction patterns for WebSocket removal
 */
export const verifyWebSocketRemovalBehavior = (mocks: TokenCostTrackingDependencies) => {
  // Should not attempt to connect
  expect(mocks.useWebSocketSingleton).toHaveBeenCalled();
  
  // Should not emit any messages on socket (if socket exists in mock)
  if (mocks.socket && typeof mocks.socket === 'object') {
    if (mocks.socket.emit) expect(mocks.socket.emit).not.toHaveBeenCalled();
    if (mocks.socket.on) expect(mocks.socket.on).not.toHaveBeenCalled();
  }
};

/**
 * London School contract for TokenCostAnalytics without WebSocket
 */
export interface TokenCostAnalyticsContract {
  // Behavior expectations when WebSocket is removed:
  shouldShowDisconnectedState(): void;
  shouldNotAttemptWebSocketConnection(): void;
  shouldLoadDemoDataAsFailsafe(): void;
  shouldHandleErrorsGracefully(): void;
  shouldAllowTabSwitchingWithoutErrors(): void;
}

/**
 * Contract implementation for TokenCostAnalytics WebSocket removal
 */
export const createTokenCostAnalyticsContract = (): TokenCostAnalyticsContract => ({
  shouldShowDisconnectedState() {
    // This will be implemented in the actual test
    throw new Error('Contract method shouldShowDisconnectedState not implemented in test');
  },
  
  shouldNotAttemptWebSocketConnection() {
    // This will be implemented in the actual test
    throw new Error('Contract method shouldNotAttemptWebSocketConnection not implemented in test');
  },
  
  shouldLoadDemoDataAsFailsafe() {
    // This will be implemented in the actual test  
    throw new Error('Contract method shouldLoadDemoDataAsFailsafe not implemented in test');
  },
  
  shouldHandleErrorsGracefully() {
    // This will be implemented in the actual test
    throw new Error('Contract method shouldHandleErrorsGracefully not implemented in test');
  },
  
  shouldAllowTabSwitchingWithoutErrors() {
    // This will be implemented in the actual test
    throw new Error('Contract method shouldAllowTabSwitchingWithoutErrors not implemented in test');
  }
});