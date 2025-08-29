/**
 * WebSocket TDD Prevention Strategies
 * 
 * Test-Driven Development strategies to prevent WebSocket dependency failures
 * based on TokenCostAnalytics failure pattern analysis.
 * 
 * Created: 2025-01-27
 * Purpose: Provide TDD patterns to prevent WebSocket anti-patterns before they occur
 */

import { websocketFailurePatterns, ComponentDependencyMap } from './websocket-failure-patterns-database';

export interface TDDPreventionStrategy {
  patternId: string;
  strategyName: string;
  description: string;
  testFirst: string;
  implementation: string;
  refactoringSafety: string;
  exampleTest: string;
  exampleImplementation: string;
  continuousIntegrationChecks: string[];
  preventionCheckpoints: string[];
}

/**
 * Comprehensive TDD prevention strategies for WebSocket anti-patterns
 */
export const websocketTDDPreventionStrategies: TDDPreventionStrategy[] = [
  {
    patternId: 'WSF-001',
    strategyName: 'Mock Detection TDD Pattern',
    description: 'Write tests first to detect mock WebSocket implementations and ensure proper fallback behavior',
    testFirst: `
// RED: Write failing test first
describe('TokenCostAnalytics WebSocket Detection', () => {
  it('should detect mock WebSocket and implement fallback', () => {
    // Arrange - Mock the WebSocket hook
    jest.mocked(useWebSocketSingleton).mockReturnValue({
      socket: { id: 'http-sse-mock-123' },
      isConnected: true
    });
    
    // Act
    const { result } = renderHook(() => useTokenCostTracking());
    
    // Assert - Should detect mock and use fallback
    expect(result.current.isMockMode).toBe(true);
    expect(result.current.fallbackActive).toBe(true);
    expect(mockHttpAPI.trackTokenUsage).toHaveBeenCalled();
  });
});
    `,
    implementation: `
// GREEN: Implement minimum code to pass test
export const useTokenCostTracking = (config) => {
  const { socket, isConnected } = useWebSocketSingleton(config);
  
  // TDD: Mock detection logic
  const isMockSocket = socket?.id?.includes('http-sse') || socket?.id?.includes('mock');
  const realConnection = isConnected && !isMockSocket;
  
  // TDD: Fallback strategy
  const [fallbackActive, setFallbackActive] = useState(!realConnection);
  
  const trackTokenUsage = useCallback(async (usage) => {
    if (realConnection) {
      socket.emit('token-usage', usage);
    } else {
      setFallbackActive(true);
      await httpAPI.trackTokenUsage(usage); // Fallback
    }
  }, [realConnection, socket]);
  
  return {
    isMockMode: isMockSocket,
    fallbackActive,
    trackTokenUsage
  };
};
    `,
    refactoringSafety: `
// REFACTOR: Extract detection logic and improve test coverage
class WebSocketMockDetector {
  static isMock(socket: any): boolean {
    return socket?.id?.includes('http-sse') || 
           socket?.id?.includes('mock') ||
           typeof socket?.emit === 'function' && socket.emit.toString().includes('console.log');
  }
  
  static shouldUseFallback(socket: any, isConnected: boolean): boolean {
    return !isConnected || this.isMock(socket);
  }
}
    `,
    exampleTest: `
describe('WebSocket Mock Detection TDD', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should identify real WebSocket connection', () => {
    mockUseWebSocketSingleton.mockReturnValue({
      socket: { id: 'real-socket-456', emit: jest.fn() },
      isConnected: true
    });
    
    const { result } = renderHook(() => useTokenCostTracking());
    
    expect(result.current.isMockMode).toBe(false);
    expect(result.current.fallbackActive).toBe(false);
  });
  
  it('should identify mock by console.log in emit function', () => {
    const mockEmit = jest.fn().mockImplementation(() => {
      console.log('Mock emit called');
    });
    
    mockUseWebSocketSingleton.mockReturnValue({
      socket: { id: 'socket-123', emit: mockEmit },
      isConnected: true
    });
    
    const { result } = renderHook(() => useTokenCostTracking());
    
    expect(result.current.isMockMode).toBe(true);
  });
});
    `,
    exampleImplementation: `
export const useTokenCostTracking = (config) => {
  const webSocketState = useWebSocketSingleton(config);
  const mockDetector = useMemo(() => new WebSocketMockDetector(), []);
  
  const connectionAnalysis = useMemo(() => ({
    isMock: mockDetector.isMock(webSocketState.socket),
    shouldUseFallback: mockDetector.shouldUseFallback(webSocketState.socket, webSocketState.isConnected),
    connectionType: mockDetector.isMock(webSocketState.socket) ? 'mock' : 'real'
  }), [webSocketState, mockDetector]);
  
  return {
    ...webSocketState,
    ...connectionAnalysis,
    fallbackActive: connectionAnalysis.shouldUseFallback
  };
};
    `,
    continuousIntegrationChecks: [
      'Test mock detection logic in CI',
      'Verify fallback mechanisms work',
      'Check for console.log statements in production builds',
      'Validate HTTP API fallback endpoints exist'
    ],
    preventionCheckpoints: [
      'Before adding WebSocket dependency: Write test for fallback first',
      'During implementation: Ensure mock detection works',
      'Before deployment: Verify fallback API endpoints',
      'Post-deployment: Monitor fallback usage metrics'
    ]
  },

  {
    patternId: 'WSF-002',
    strategyName: 'HTTP Fallback TDD Pattern',
    description: 'Test-driven approach to ensure HTTP polling fallback when WebSocket real-time updates fail',
    testFirst: `
// RED: Write failing test for HTTP fallback
describe('Real-time Update Fallback', () => {
  it('should implement HTTP polling when WebSocket unavailable', async () => {
    // Arrange - WebSocket unavailable
    mockUseWebSocketSingleton.mockReturnValue({
      socket: null,
      isConnected: false
    });
    
    mockFetchTokenUsageData.mockResolvedValue([
      { id: '1', timestamp: new Date(), tokensUsed: 100 }
    ]);
    
    // Act
    const { result } = renderHook(() => useTokenCostTracking());
    
    // Assert - Should use HTTP polling
    await waitFor(() => {
      expect(mockFetchTokenUsageData).toHaveBeenCalled();
      expect(result.current.tokenUsages.length).toBeGreaterThan(0);
    });
  });
  
  it('should stop HTTP polling when WebSocket becomes available', async () => {
    const { result, rerender } = renderHook(
      ({ connected }) => {
        mockUseWebSocketSingleton.mockReturnValue({
          socket: connected ? { on: jest.fn() } : null,
          isConnected: connected
        });
        return useTokenCostTracking();
      },
      { initialProps: { connected: false } }
    );
    
    // Initially should poll
    await waitFor(() => {
      expect(mockFetchTokenUsageData).toHaveBeenCalled();
    });
    
    // When WebSocket connects, should stop polling
    rerender({ connected: true });
    
    jest.clearAllMocks();
    await new Promise(resolve => setTimeout(resolve, 6000)); // Wait beyond polling interval
    
    expect(mockFetchTokenUsageData).not.toHaveBeenCalled();
  });
});
    `,
    implementation: `
// GREEN: Implement HTTP polling fallback
export const useTokenCostTracking = (config) => {
  const { socket, isConnected } = useWebSocketSingleton(config);
  const [tokenUsages, setTokenUsages] = useState([]);
  const pollingIntervalRef = useRef(null);
  
  // TDD: HTTP polling when WebSocket unavailable
  useEffect(() => {
    if (isConnected && socket && !isMockSocket(socket)) {
      // Use WebSocket
      socket.on('token-usage-update', handleTokenUpdate);
      
      // Clear any existing polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    } else {
      // Fallback to HTTP polling
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const data = await fetchTokenUsageData();
          setTokenUsages(data);
        } catch (error) {
          console.error('HTTP polling failed:', error);
        }
      }, 5000);
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isConnected, socket]);
  
  return { tokenUsages };
};
    `,
    refactoringSafety: `
// REFACTOR: Extract polling strategy
class DataFetchingStrategy {
  constructor(private webSocketState: any) {}
  
  async startDataFetching(onUpdate: (data: any) => void) {
    if (this.shouldUseWebSocket()) {
      return this.startWebSocketUpdates(onUpdate);
    } else {
      return this.startHttpPolling(onUpdate);
    }
  }
  
  private shouldUseWebSocket(): boolean {
    return this.webSocketState.isConnected && 
           !WebSocketMockDetector.isMock(this.webSocketState.socket);
  }
  
  private startWebSocketUpdates(onUpdate: (data: any) => void) {
    this.webSocketState.socket.on('token-usage-update', onUpdate);
    return () => this.webSocketState.socket.off('token-usage-update', onUpdate);
  }
  
  private startHttpPolling(onUpdate: (data: any) => void) {
    const interval = setInterval(async () => {
      const data = await fetchTokenUsageData();
      onUpdate(data);
    }, 5000);
    
    return () => clearInterval(interval);
  }
}
    `,
    exampleTest: `
describe('Data Fetching Strategy TDD', () => {
  it('should choose WebSocket for real connections', async () => {
    const mockOnUpdate = jest.fn();
    const strategy = new DataFetchingStrategy({
      isConnected: true,
      socket: { on: jest.fn(), off: jest.fn() }
    });
    
    await strategy.startDataFetching(mockOnUpdate);
    
    expect(strategy.webSocketState.socket.on).toHaveBeenCalledWith('token-usage-update', mockOnUpdate);
  });
  
  it('should choose HTTP polling for mock connections', async () => {
    const mockOnUpdate = jest.fn();
    const strategy = new DataFetchingStrategy({
      isConnected: true,
      socket: { id: 'http-sse-mock' }
    });
    
    jest.spyOn(strategy, 'startHttpPolling');
    
    await strategy.startDataFetching(mockOnUpdate);
    
    expect(strategy.startHttpPolling).toHaveBeenCalled();
  });
});
    `,
    exampleImplementation: `
export const useTokenCostTracking = (config) => {
  const webSocketState = useWebSocketSingleton(config);
  const [tokenUsages, setTokenUsages] = useState([]);
  const strategyRef = useRef(null);
  const cleanupRef = useRef(null);
  
  useEffect(() => {
    strategyRef.current = new DataFetchingStrategy(webSocketState);
    
    const handleUpdate = (data) => setTokenUsages(data);
    
    strategyRef.current.startDataFetching(handleUpdate)
      .then(cleanup => {
        cleanupRef.current = cleanup;
      });
    
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [webSocketState.isConnected, webSocketState.socket]);
  
  return { tokenUsages };
};
    `,
    continuousIntegrationChecks: [
      'Test HTTP fallback endpoints exist and work',
      'Verify polling stops when WebSocket connects',
      'Check polling interval is reasonable',
      'Test error handling in HTTP polling'
    ],
    preventionCheckpoints: [
      'Before removing WebSocket: Implement and test HTTP fallback',
      'During development: Test connection state transitions',
      'Before deployment: Verify fallback API performance',
      'Post-deployment: Monitor HTTP vs WebSocket usage'
    ]
  },

  {
    patternId: 'WSF-003',
    strategyName: 'Context State Management TDD Pattern',
    description: 'Test-driven approach to manage WebSocket context state transitions and mock implementations',
    testFirst: `
// RED: Write failing test for context state management
describe('WebSocket Context State Management', () => {
  it('should provide consistent context values during mock transition', () => {
    const TestConsumer = () => {
      const { isConnected, isMockMode, socket } = useWebSocketSingletonContext();
      return (
        <div>
          <span data-testid="connected">{isConnected ? 'connected' : 'disconnected'}</span>
          <span data-testid="mock">{isMockMode ? 'mock' : 'real'}</span>
          <span data-testid="socket-id">{socket?.id}</span>
        </div>
      );
    };
    
    const { getByTestId, rerender } = render(
      <WebSocketSingletonProvider config={{ mockMode: true }}>
        <TestConsumer />
      </WebSocketSingletonProvider>
    );
    
    // Should show honest mock state
    expect(getByTestId('connected')).toHaveTextContent('disconnected');
    expect(getByTestId('mock')).toHaveTextContent('mock');
    expect(getByTestId('socket-id')).toHaveTextContent('http-sse');
  });
  
  it('should provide alternative data sources when in mock mode', () => {
    const TestConsumer = () => {
      const { notifications, systemStats, alternativeDataSource } = useWebSocketSingletonContext();
      return (
        <div>
          <span data-testid="notifications">{notifications.length}</span>
          <span data-testid="has-stats">{systemStats ? 'yes' : 'no'}</span>
          <span data-testid="has-alternative">{alternativeDataSource ? 'yes' : 'no'}</span>
        </div>
      );
    };
    
    render(
      <WebSocketSingletonProvider config={{ mockMode: true }}>
        <TestConsumer />
      </WebSocketSingletonProvider>
    );
    
    expect(getByTestId('notifications')).not.toHaveTextContent('0');
    expect(getByTestId('has-stats')).toHaveTextContent('yes');
    expect(getByTestId('has-alternative')).toHaveTextContent('yes');
  });
});
    `,
    implementation: `
// GREEN: Implement honest context state management
export const WebSocketSingletonProvider: React.FC<WebSocketSingletonProviderProps> = ({ 
  children, 
  config = {} 
}) => {
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    isMockMode: config.mockMode || false
  });
  
  // TDD: Honest context values
  const contextValue = useMemo(() => {
    if (connectionState.isMockMode) {
      return {
        socket: { id: 'http-sse-mock-' + Date.now() },
        isConnected: false, // Honest about mock status
        isMockMode: true,
        notifications: generateDemoNotifications(),
        systemStats: generateDemoStats(),
        alternativeDataSource: new HttpApiDataSource()
      };
    }
    
    // Real connection state
    return {
      socket: realSocket,
      isConnected: connectionState.isConnected,
      isMockMode: false,
      notifications: realNotifications,
      systemStats: realStats,
      alternativeDataSource: null
    };
  }, [connectionState]);
  
  return (
    <WebSocketSingletonContext.Provider value={contextValue}>
      {children}
    </WebSocketSingletonContext.Provider>
  );
};
    `,
    refactoringSafety: `
// REFACTOR: Extract context state factory
class WebSocketContextFactory {
  static createMockContext(): WebSocketSingletonContextValue {
    return {
      socket: { id: \`http-sse-mock-\${Date.now()}\` },
      isConnected: false,
      isMockMode: true,
      notifications: DemoDataGenerator.notifications(),
      systemStats: DemoDataGenerator.systemStats(),
      alternativeDataSource: new HttpApiDataSource(),
      // ... other mock values
    };
  }
  
  static createRealContext(webSocketState: any): WebSocketSingletonContextValue {
    return {
      socket: webSocketState.socket,
      isConnected: webSocketState.isConnected,
      isMockMode: false,
      notifications: webSocketState.notifications,
      systemStats: webSocketState.systemStats,
      alternativeDataSource: null,
      // ... other real values
    };
  }
}
    `,
    exampleTest: `
describe('Context State Factory TDD', () => {
  it('should create consistent mock context', () => {
    const mockContext = WebSocketContextFactory.createMockContext();
    
    expect(mockContext.isConnected).toBe(false);
    expect(mockContext.isMockMode).toBe(true);
    expect(mockContext.socket.id).toContain('http-sse-mock');
    expect(mockContext.alternativeDataSource).toBeInstanceOf(HttpApiDataSource);
  });
  
  it('should create real context from WebSocket state', () => {
    const realWebSocketState = {
      socket: { id: 'real-123' },
      isConnected: true,
      notifications: [],
      systemStats: null
    };
    
    const realContext = WebSocketContextFactory.createRealContext(realWebSocketState);
    
    expect(realContext.isConnected).toBe(true);
    expect(realContext.isMockMode).toBe(false);
    expect(realContext.alternativeDataSource).toBeNull();
  });
});
    `,
    exampleImplementation: `
export const WebSocketSingletonProvider: React.FC<WebSocketSingletonProviderProps> = ({ 
  children, 
  config = {} 
}) => {
  const webSocketState = useWebSocketConnection(config);
  const contextFactory = useMemo(() => new WebSocketContextFactory(), []);
  
  const contextValue = useMemo(() => {
    if (config.mockMode || WebSocketMockDetector.isMock(webSocketState.socket)) {
      return contextFactory.createMockContext();
    }
    return contextFactory.createRealContext(webSocketState);
  }, [webSocketState, config.mockMode, contextFactory]);
  
  return (
    <WebSocketSingletonContext.Provider value={contextValue}>
      {children}
    </WebSocketSingletonContext.Provider>
  );
};
    `,
    continuousIntegrationChecks: [
      'Test context provider with mock configuration',
      'Verify alternative data sources work',
      'Check context state consistency',
      'Test consumer component compatibility'
    ],
    preventionCheckpoints: [
      'Before context changes: Test all consumer components',
      'During development: Verify state transitions',
      'Before deployment: Test mock/real mode switching',
      'Post-deployment: Monitor context usage patterns'
    ]
  },

  {
    patternId: 'WSF-004',
    strategyName: 'Specialized Error Boundary TDD Pattern',
    description: 'Test-driven approach to create WebSocket-specific error boundaries with recovery mechanisms',
    testFirst: `
// RED: Write failing test for WebSocket error boundary
describe('WebSocket Error Boundary', () => {
  it('should detect and handle WebSocket-specific errors', () => {
    const ThrowWebSocketError = () => {
      throw new Error('useWebSocketSingleton connection failed');
    };
    
    const { getByText, getByTestId } = render(
      <WebSocketErrorBoundary>
        <ThrowWebSocketError />
      </WebSocketErrorBoundary>
    );
    
    expect(getByText(/websocket.*unavailable/i)).toBeInTheDocument();
    expect(getByTestId('websocket-retry-button')).toBeInTheDocument();
    expect(getByText(/cached data/i)).toBeInTheDocument();
  });
  
  it('should provide different UI for WebSocket vs generic errors', () => {
    const ThrowGenericError = () => {
      throw new Error('Generic component error');
    };
    
    const { queryByText, queryByTestId } = render(
      <WebSocketErrorBoundary>
        <ThrowGenericError />
      </WebSocketErrorBoundary>
    );
    
    // Should fall back to generic error handling
    expect(queryByText(/websocket.*unavailable/i)).not.toBeInTheDocument();
    expect(queryByTestId('websocket-retry-button')).not.toBeInTheDocument();
  });
});
    `,
    implementation: `
// GREEN: Implement specialized WebSocket error boundary
export class WebSocketErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorType: null };
  }
  
  static getDerivedStateFromError(error) {
    const isWebSocketError = error.message.includes('WebSocket') || 
                            error.message.includes('useWebSocketSingleton') ||
                            error.stack?.includes('WebSocketSingleton');
    
    return {
      hasError: true,
      errorType: isWebSocketError ? 'websocket' : 'generic'
    };
  }
  
  componentDidCatch(error, errorInfo) {
    if (this.state.errorType === 'websocket') {
      console.log('WebSocket-specific error caught:', error);
      // Could report to WebSocket-specific error tracking
    }
  }
  
  render() {
    if (this.state.hasError) {
      if (this.state.errorType === 'websocket') {
        return (
          <div className="websocket-error-fallback" data-testid="websocket-error-fallback">
            <h3>WebSocket Connection Unavailable</h3>
            <p>Real-time features are temporarily unavailable. Using cached data.</p>
            <button 
              data-testid="websocket-retry-button"
              onClick={() => this.setState({ hasError: false, errorType: null })}
            >
              Retry Connection
            </button>
          </div>
        );
      }
      
      // Generic error fallback
      return <div>Something went wrong.</div>;
    }
    
    return this.props.children;
  }
}
    `,
    refactoringSafety: `
// REFACTOR: Extract error classification and recovery
class ErrorClassifier {
  static classifyError(error: Error): 'websocket' | 'network' | 'generic' {
    if (this.isWebSocketError(error)) return 'websocket';
    if (this.isNetworkError(error)) return 'network';
    return 'generic';
  }
  
  static isWebSocketError(error: Error): boolean {
    return error.message.includes('WebSocket') || 
           error.message.includes('useWebSocketSingleton') ||
           error.stack?.includes('WebSocketSingleton') ||
           error.name === 'WebSocketConnectionError';
  }
  
  static getRecoveryStrategy(errorType: string): RecoveryStrategy {
    switch (errorType) {
      case 'websocket':
        return new WebSocketRecoveryStrategy();
      case 'network':
        return new NetworkRecoveryStrategy();
      default:
        return new GenericRecoveryStrategy();
    }
  }
}
    `,
    exampleTest: `
describe('Error Classification TDD', () => {
  it('should classify WebSocket errors correctly', () => {
    const wsError = new Error('useWebSocketSingleton connection failed');
    const networkError = new Error('Network request failed');
    const genericError = new Error('Component failed to render');
    
    expect(ErrorClassifier.classifyError(wsError)).toBe('websocket');
    expect(ErrorClassifier.classifyError(networkError)).toBe('network');
    expect(ErrorClassifier.classifyError(genericError)).toBe('generic');
  });
  
  it('should provide appropriate recovery strategy', () => {
    const wsRecovery = ErrorClassifier.getRecoveryStrategy('websocket');
    const networkRecovery = ErrorClassifier.getRecoveryStrategy('network');
    
    expect(wsRecovery).toBeInstanceOf(WebSocketRecoveryStrategy);
    expect(networkRecovery).toBeInstanceOf(NetworkRecoveryStrategy);
  });
});
    `,
    exampleImplementation: `
export class EnhancedWebSocketErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      errorType: null, 
      recoveryStrategy: null,
      canRecover: false
    };
  }
  
  static getDerivedStateFromError(error) {
    const errorType = ErrorClassifier.classifyError(error);
    const recoveryStrategy = ErrorClassifier.getRecoveryStrategy(errorType);
    
    return {
      hasError: true,
      errorType,
      recoveryStrategy,
      canRecover: recoveryStrategy.canRecover()
    };
  }
  
  handleRecovery = () => {
    if (this.state.canRecover && this.state.recoveryStrategy) {
      this.state.recoveryStrategy.recover()
        .then(() => {
          this.setState({ hasError: false, errorType: null });
        })
        .catch(console.error);
    }
  };
  
  render() {
    if (this.state.hasError) {
      return this.state.recoveryStrategy.renderFallbackUI({
        onRecover: this.handleRecovery,
        canRecover: this.state.canRecover
      });
    }
    
    return this.props.children;
  }
}
    `,
    continuousIntegrationChecks: [
      'Test error boundary with different error types',
      'Verify recovery mechanisms work',
      'Check fallback UI accessibility',
      'Test error reporting integration'
    ],
    preventionCheckpoints: [
      'Before adding WebSocket dependency: Add specialized error boundary',
      'During development: Test error scenarios',
      'Before deployment: Verify error recovery works',
      'Post-deployment: Monitor error boundary activation'
    ]
  },

  {
    patternId: 'WSF-005',
    strategyName: 'Demo Mode Indication TDD Pattern',
    description: 'Test-driven approach to clearly distinguish demo data from real data in UI',
    testFirst: `
// RED: Write failing test for demo mode indication
describe('Demo Mode Indication', () => {
  it('should prominently display demo mode when WebSocket unavailable', () => {
    mockUseWebSocketSingleton.mockReturnValue({
      socket: null,
      isConnected: false
    });
    
    const { getByTestId, getByText } = render(<TokenCostAnalytics />);
    
    expect(getByTestId('demo-mode-banner')).toBeVisible();
    expect(getByText(/demo mode/i)).toBeVisible();
    expect(getByText(/sample data/i)).toBeInTheDocument();
    expect(getByText(/real-time updates.*unavailable/i)).toBeInTheDocument();
  });
  
  it('should hide demo mode indication when WebSocket connected', () => {
    mockUseWebSocketSingleton.mockReturnValue({
      socket: { id: 'real-socket' },
      isConnected: true
    });
    
    const { queryByTestId } = render(<TokenCostAnalytics />);
    
    expect(queryByTestId('demo-mode-banner')).not.toBeInTheDocument();
  });
  
  it('should make demo data visually distinct from real data', () => {
    mockUseWebSocketSingleton.mockReturnValue({
      socket: null,
      isConnected: false
    });
    
    const { container } = render(<TokenCostAnalytics />);
    
    const demoElements = container.querySelectorAll('[data-demo="true"]');
    expect(demoElements.length).toBeGreaterThan(0);
    
    demoElements.forEach(element => {
      expect(element).toHaveClass('demo-data');
    });
  });
});
    `,
    implementation: `
// GREEN: Implement prominent demo mode indication
export const TokenCostAnalytics = ({ ... }) => {
  const { isConnected, socket } = useWebSocketSingleton();
  const isMockMode = !isConnected || socket?.id?.includes('http-sse');
  const [tokenUsages, setTokenUsages] = useState([]);
  
  useEffect(() => {
    if (isMockMode) {
      const demoData = generateDemoTokenUsages();
      setTokenUsages(demoData);
    }
  }, [isMockMode]);
  
  return (
    <div>
      {/* TDD: Prominent demo mode banner */}
      {isMockMode && (
        <div 
          data-testid="demo-mode-banner"
          className="demo-mode-banner bg-amber-100 border border-amber-300 rounded-lg p-4 mb-6"
        >
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-amber-600 mr-2" />
            <strong className="text-amber-800">DEMO MODE:</strong>
            <span className="ml-2 text-amber-700">
              This is sample data for demonstration purposes. 
              Real-time updates are currently unavailable.
            </span>
          </div>
        </div>
      )}
      
      {/* TDD: Demo data styling */}
      <div className={isMockMode ? 'demo-data-container' : ''}>
        {tokenUsages.map(usage => (
          <div 
            key={usage.id}
            data-demo={isMockMode}
            className={isMockMode ? 'demo-data' : ''}
          >
            {/* Token usage display */}
          </div>
        ))}
      </div>
    </div>
  );
};
    `,
    refactoringSafety: `
// REFACTOR: Extract demo mode management
class DemoModeManager {
  constructor(private webSocketState: any) {}
  
  isDemoMode(): boolean {
    return !this.webSocketState.isConnected || 
           this.webSocketState.socket?.id?.includes('http-sse') ||
           this.webSocketState.socket?.id?.includes('mock');
  }
  
  getDemoData(): any[] {
    return DemoDataGenerator.tokenUsages();
  }
  
  getDemoBannerProps() {
    return {
      'data-testid': 'demo-mode-banner',
      className: 'demo-mode-banner bg-amber-100 border border-amber-300 rounded-lg p-4 mb-6',
      role: 'alert',
      'aria-live': 'polite'
    };
  }
  
  getDataContainerProps(isDemoMode: boolean) {
    return {
      className: isDemoMode ? 'demo-data-container' : '',
      'data-mode': isDemoMode ? 'demo' : 'live'
    };
  }
}
    `,
    exampleTest: `
describe('Demo Mode Manager TDD', () => {
  it('should detect demo mode correctly', () => {
    const mockWebSocketState = {
      isConnected: true,
      socket: { id: 'http-sse-mock-123' }
    };
    
    const manager = new DemoModeManager(mockWebSocketState);
    
    expect(manager.isDemoMode()).toBe(true);
  });
  
  it('should provide demo data when in demo mode', () => {
    const manager = new DemoModeManager({ isConnected: false });
    
    const demoData = manager.getDemoData();
    
    expect(Array.isArray(demoData)).toBe(true);
    expect(demoData.length).toBeGreaterThan(0);
  });
  
  it('should provide correct styling props', () => {
    const manager = new DemoModeManager({ isConnected: false });
    
    const bannerProps = manager.getDemoBannerProps();
    const containerProps = manager.getDataContainerProps(true);
    
    expect(bannerProps['data-testid']).toBe('demo-mode-banner');
    expect(containerProps['data-mode']).toBe('demo');
  });
});
    `,
    exampleImplementation: `
export const TokenCostAnalytics = (props) => {
  const webSocketState = useWebSocketSingleton();
  const demoModeManager = useMemo(() => new DemoModeManager(webSocketState), [webSocketState]);
  const isDemoMode = demoModeManager.isDemoMode();
  
  const [tokenUsages, setTokenUsages] = useState([]);
  
  useEffect(() => {
    if (isDemoMode) {
      setTokenUsages(demoModeManager.getDemoData());
    } else {
      // Load real data
      fetchRealTokenUsages().then(setTokenUsages);
    }
  }, [isDemoMode, demoModeManager]);
  
  return (
    <div>
      {isDemoMode && (
        <div {...demoModeManager.getDemoBannerProps()}>
          <DemoModeBanner />
        </div>
      )}
      
      <div {...demoModeManager.getDataContainerProps(isDemoMode)}>
        <TokenUsagesList 
          usages={tokenUsages} 
          isDemoMode={isDemoMode}
        />
      </div>
    </div>
  );
};
    `,
    continuousIntegrationChecks: [
      'Test demo mode banner visibility',
      'Verify demo data styling',
      'Check accessibility of demo mode indicators',
      'Test demo/real mode transitions'
    ],
    preventionCheckpoints: [
      'Before adding demo data: Test visibility of demo indicators',
      'During development: Verify demo data is clearly marked',
      'Before deployment: Test user can distinguish demo vs real',
      'Post-deployment: Monitor user confusion reports'
    ]
  }
];

/**
 * TDD Checklist Generator
 * Generates comprehensive TDD checklists for WebSocket dependency management
 */
export function generateTDDChecklist(patternIds: string[]): string[] {
  const checklist: string[] = [];
  
  patternIds.forEach(patternId => {
    const strategy = websocketTDDPreventionStrategies.find(s => s.patternId === patternId);
    if (strategy) {
      checklist.push(`## ${strategy.strategyName}`);
      checklist.push('### Prevention Checkpoints:');
      strategy.preventionCheckpoints.forEach(checkpoint => {
        checklist.push(`- [ ] ${checkpoint}`);
      });
      checklist.push('### CI Checks:');
      strategy.continuousIntegrationChecks.forEach(check => {
        checklist.push(`- [ ] ${check}`);
      });
      checklist.push('');
    }
  });
  
  return checklist;
}

/**
 * TDD Test Suite Generator
 * Generates complete test suites for WebSocket anti-pattern prevention
 */
export function generateTDDTestSuite(componentName: string): string {
  return `
describe('${componentName} WebSocket Dependency TDD Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Mock Detection (WSF-001)', () => {
    ${websocketTDDPreventionStrategies[0].exampleTest}
  });

  describe('HTTP Fallback (WSF-002)', () => {
    ${websocketTDDPreventionStrategies[1].exampleTest}
  });

  describe('Context State Management (WSF-003)', () => {
    ${websocketTDDPreventionStrategies[2].exampleTest}
  });

  describe('Error Boundary Handling (WSF-004)', () => {
    ${websocketTDDPreventionStrategies[3].exampleTest}
  });

  describe('Demo Mode Indication (WSF-005)', () => {
    ${websocketTDDPreventionStrategies[4].exampleTest}
  });
});
  `;
}

export default {
  strategies: websocketTDDPreventionStrategies,
  generateTDDChecklist,
  generateTDDTestSuite
};